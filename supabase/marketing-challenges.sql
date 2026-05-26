-- ============================================================
-- Marketing — Desafios mensais por Movimento (gamificação OSI)
-- ============================================================
-- Lança desafio (ex: "Essa semana, aplica o Movimento 3 e me conta o que mudou")
-- Vendedor participa, submete prova (texto + foto/vídeo), admin escolhe vencedores.
-- Ranking dispara mecânica viral: vendedor que ganhou posta → atrai mais vendedor.
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing.challenges (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text UNIQUE NOT NULL,
  name                text NOT NULL,
  description         text,
  movement            int CHECK (movement BETWEEN 1 AND 5),
  -- Período
  start_date          date,
  end_date            date,
  -- Estado
  status              text NOT NULL DEFAULT 'draft'
                      CHECK (status IN ('draft','active','closed','cancelled')),
  -- Mecânica
  prize_description   text,
  rules               text,
  max_participants    int,
  -- Hashtag oficial do desafio (pra busca cross-rede)
  hashtag             text,
  -- Meta
  banner_url          text,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  closed_at           timestamptz,
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_chal_status ON marketing.challenges(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_chal_movement ON marketing.challenges(movement);
CREATE INDEX IF NOT EXISTS idx_chal_dates ON marketing.challenges(start_date, end_date);

ALTER TABLE marketing.challenges ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS challenges_staff_all ON marketing.challenges;
CREATE POLICY challenges_staff_all ON marketing.challenges
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ─── Participações ───
CREATE TABLE IF NOT EXISTS marketing.challenge_participations (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id        uuid NOT NULL REFERENCES marketing.challenges(id) ON DELETE CASCADE,
  member_id           uuid REFERENCES marketing.community_members(id) ON DELETE SET NULL,
  -- Pra participações sem membro cadastrado (ainda)
  participant_name    text,
  participant_email   text,
  participant_whatsapp text,
  -- Engagement
  joined_at           timestamptz DEFAULT now(),
  submission_text     text,
  submission_url      text,
  submission_at       timestamptz,
  status              text NOT NULL DEFAULT 'registered'
                      CHECK (status IN ('registered','submitted','winner','runner_up','disqualified')),
  -- Métricas
  sales_amount_cents  int,
  score               numeric(8,2),
  ranking             int,
  prize_awarded       text,
  notes               text,
  metadata            jsonb DEFAULT '{}'::jsonb,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  UNIQUE (challenge_id, member_id)
);

CREATE INDEX IF NOT EXISTS idx_part_chal ON marketing.challenge_participations(challenge_id);
CREATE INDEX IF NOT EXISTS idx_part_status ON marketing.challenge_participations(status);
CREATE INDEX IF NOT EXISTS idx_part_score ON marketing.challenge_participations(score DESC NULLS LAST);

ALTER TABLE marketing.challenge_participations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS part_staff_all ON marketing.challenge_participations;
CREATE POLICY part_staff_all ON marketing.challenge_participations
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ─── Views ───
CREATE OR REPLACE VIEW public.v_marketing_challenges AS
SELECT
  c.*,
  COUNT(p.id) AS participants_count,
  COUNT(p.id) FILTER (WHERE p.status = 'submitted') AS submissions_count,
  COUNT(p.id) FILTER (WHERE p.status IN ('winner','runner_up')) AS winners_count,
  SUM(p.sales_amount_cents) AS total_sales_cents
FROM marketing.challenges c
LEFT JOIN marketing.challenge_participations p ON p.challenge_id = c.id
WHERE c.deleted_at IS NULL
GROUP BY c.id
ORDER BY
  CASE c.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 WHEN 'closed' THEN 2 ELSE 3 END,
  c.start_date DESC NULLS LAST;

GRANT SELECT ON public.v_marketing_challenges TO authenticated;

CREATE OR REPLACE VIEW public.v_marketing_challenge_leaderboard AS
SELECT
  p.id,
  p.challenge_id,
  c.name AS challenge_name,
  c.movement AS challenge_movement,
  p.member_id,
  COALESCE(m.full_name, p.participant_name) AS participant_name,
  COALESCE(m.email, p.participant_email) AS participant_email,
  COALESCE(m.whatsapp, p.participant_whatsapp) AS participant_whatsapp,
  m.city, m.state,
  p.status,
  p.submission_text,
  p.submission_url,
  p.submission_at,
  p.sales_amount_cents,
  p.score,
  p.ranking,
  p.prize_awarded,
  p.joined_at
FROM marketing.challenge_participations p
JOIN marketing.challenges c ON c.id = p.challenge_id
LEFT JOIN marketing.community_members m ON m.id = p.member_id
WHERE c.deleted_at IS NULL
ORDER BY c.start_date DESC NULLS LAST,
         p.ranking ASC NULLS LAST,
         p.score DESC NULLS LAST,
         p.joined_at;

GRANT SELECT ON public.v_marketing_challenge_leaderboard TO authenticated;

-- ─── Stats topo aba ───
CREATE OR REPLACE VIEW public.v_marketing_challenges_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'active') AS active,
  COUNT(*) FILTER (WHERE status = 'draft') AS draft,
  COUNT(*) FILTER (WHERE status = 'closed') AS closed,
  COUNT(*) FILTER (WHERE status = 'cancelled') AS cancelled,
  (SELECT COUNT(*) FROM marketing.challenge_participations) AS total_participations,
  (SELECT COUNT(*) FROM marketing.challenge_participations WHERE status IN ('winner','runner_up')) AS total_winners
FROM marketing.challenges
WHERE deleted_at IS NULL;

GRANT SELECT ON public.v_marketing_challenges_stats TO authenticated;

-- ─── RPCs ───
DROP FUNCTION IF EXISTS public.marketing_create_challenge(jsonb);
CREATE OR REPLACE FUNCTION public.marketing_create_challenge(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  INSERT INTO marketing.challenges
    (code, name, description, movement, start_date, end_date, status,
     prize_description, rules, max_participants, hashtag, banner_url)
  VALUES (
    COALESCE(NULLIF(p_payload->>'code',''),
             'desafio-' || to_char(now(), 'YYYY-MM') || '-mov' || COALESCE(p_payload->>'movement','x')),
    p_payload->>'name',
    NULLIF(p_payload->>'description',''),
    NULLIF(p_payload->>'movement','')::int,
    NULLIF(p_payload->>'start_date','')::date,
    NULLIF(p_payload->>'end_date','')::date,
    COALESCE(p_payload->>'status', 'draft'),
    NULLIF(p_payload->>'prize_description',''),
    NULLIF(p_payload->>'rules',''),
    NULLIF((p_payload->>'max_participants')::int, 0),
    NULLIF(p_payload->>'hashtag',''),
    NULLIF(p_payload->>'banner_url','')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_create_challenge TO authenticated, service_role;

DROP FUNCTION IF EXISTS public.marketing_update_challenge(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.marketing_update_challenge(p_id uuid, p_patch jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  UPDATE marketing.challenges SET
    name              = COALESCE(p_patch->>'name', name),
    description       = CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
    movement          = COALESCE(NULLIF(p_patch->>'movement','')::int, movement),
    start_date        = COALESCE(NULLIF(p_patch->>'start_date','')::date, start_date),
    end_date          = COALESCE(NULLIF(p_patch->>'end_date','')::date, end_date),
    status            = COALESCE(p_patch->>'status', status),
    prize_description = CASE WHEN p_patch ? 'prize_description' THEN p_patch->>'prize_description' ELSE prize_description END,
    rules             = CASE WHEN p_patch ? 'rules' THEN p_patch->>'rules' ELSE rules END,
    max_participants  = COALESCE(NULLIF(p_patch->>'max_participants','')::int, max_participants),
    hashtag           = CASE WHEN p_patch ? 'hashtag' THEN p_patch->>'hashtag' ELSE hashtag END,
    banner_url        = CASE WHEN p_patch ? 'banner_url' THEN p_patch->>'banner_url' ELSE banner_url END,
    closed_at         = CASE WHEN p_patch->>'status' = 'closed' THEN now() ELSE closed_at END,
    updated_at        = now()
  WHERE id = p_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_update_challenge TO authenticated, service_role;

-- Adicionar participação (admin escolhe membro da comunidade)
DROP FUNCTION IF EXISTS public.marketing_add_challenge_participation(jsonb);
CREATE OR REPLACE FUNCTION public.marketing_add_challenge_participation(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  INSERT INTO marketing.challenge_participations
    (challenge_id, member_id, participant_name, participant_email, participant_whatsapp)
  VALUES (
    (p_payload->>'challenge_id')::uuid,
    NULLIF(p_payload->>'member_id','')::uuid,
    NULLIF(p_payload->>'participant_name',''),
    NULLIF(p_payload->>'participant_email',''),
    NULLIF(p_payload->>'participant_whatsapp','')
  )
  ON CONFLICT (challenge_id, member_id) DO UPDATE SET updated_at = now()
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_add_challenge_participation TO authenticated, service_role;

-- Update participation (submissão, score, ranking, status)
DROP FUNCTION IF EXISTS public.marketing_update_participation(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.marketing_update_participation(p_id uuid, p_patch jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  UPDATE marketing.challenge_participations SET
    submission_text    = CASE WHEN p_patch ? 'submission_text' THEN p_patch->>'submission_text' ELSE submission_text END,
    submission_url     = CASE WHEN p_patch ? 'submission_url' THEN p_patch->>'submission_url' ELSE submission_url END,
    submission_at      = CASE WHEN p_patch ? 'submission_text' AND submission_at IS NULL THEN now() ELSE submission_at END,
    status             = COALESCE(p_patch->>'status', status),
    sales_amount_cents = COALESCE(NULLIF((p_patch->>'sales_amount_cents'),'')::int, sales_amount_cents),
    score              = COALESCE(NULLIF((p_patch->>'score'),'')::numeric, score),
    ranking            = COALESCE(NULLIF((p_patch->>'ranking'),'')::int, ranking),
    prize_awarded      = CASE WHEN p_patch ? 'prize_awarded' THEN p_patch->>'prize_awarded' ELSE prize_awarded END,
    notes              = CASE WHEN p_patch ? 'notes' THEN p_patch->>'notes' ELSE notes END,
    updated_at         = now()
  WHERE id = p_id;

  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_update_participation TO authenticated, service_role;

-- Finalizar: marca top 3 por score como winner/runner_up, fecha o desafio
DROP FUNCTION IF EXISTS public.marketing_finalize_challenge(uuid);
CREATE OR REPLACE FUNCTION public.marketing_finalize_challenge(p_id uuid)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE v_count int := 0;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  WITH ranked AS (
    SELECT id,
           ROW_NUMBER() OVER (ORDER BY score DESC NULLS LAST, submission_at ASC NULLS LAST) AS rk
    FROM marketing.challenge_participations
    WHERE challenge_id = p_id AND status = 'submitted'
  )
  UPDATE marketing.challenge_participations p SET
    ranking = r.rk,
    status = CASE WHEN r.rk = 1 THEN 'winner' WHEN r.rk <= 3 THEN 'runner_up' ELSE p.status END,
    updated_at = now()
  FROM ranked r
  WHERE p.id = r.id;

  GET DIAGNOSTICS v_count = ROW_COUNT;

  UPDATE marketing.challenges SET status='closed', closed_at=now(), updated_at=now()
  WHERE id = p_id;

  RETURN jsonb_build_object('ranked', v_count);
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_finalize_challenge TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
