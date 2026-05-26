-- ============================================================
-- Marketing — Captador de Depoimentos (testimonials)
-- ============================================================
-- Form público (/osi/depoimento) onde vendedor preenche história
-- + venda gerada. Grava com status=pending. Staff revisa, aprova
-- e promove a card pronto pra ideia do banco.
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing.testimonials (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name           text NOT NULL,
  optica_name         text,
  city                text,
  state               text,
  whatsapp            text,
  whatsapp_consent    boolean DEFAULT false,
  hook_applied        text,
  story               text NOT NULL,
  sale_value_cents    int,
  photo_url           text,
  rating              int CHECK (rating BETWEEN 1 AND 5),
  status              text NOT NULL DEFAULT 'pending'
                      CHECK (status IN ('pending','approved','rejected','used','spam')),
  source              text NOT NULL DEFAULT 'public_form'
                      CHECK (source IN ('public_form','manual','imported')),
  hotmart_transaction text,
  promoted_idea_id    uuid REFERENCES marketing.content_ideas(id) ON DELETE SET NULL,
  reviewer_notes      text,
  reviewed_at         timestamptz,
  reviewed_by         uuid,
  metadata            jsonb DEFAULT '{}'::jsonb,
  ip_address          text,
  user_agent          text,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  deleted_at          timestamptz
);

CREATE INDEX IF NOT EXISTS idx_testim_status ON marketing.testimonials(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_testim_created ON marketing.testimonials(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_testim_hotmart ON marketing.testimonials(hotmart_transaction) WHERE hotmart_transaction IS NOT NULL;

ALTER TABLE marketing.testimonials ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS testim_staff_read ON marketing.testimonials;
CREATE POLICY testim_staff_read ON marketing.testimonials
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS testim_staff_write ON marketing.testimonials;
CREATE POLICY testim_staff_write ON marketing.testimonials
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ─── View admin ───
CREATE OR REPLACE VIEW public.v_marketing_testimonials AS
SELECT
  t.*,
  ci.hook AS promoted_idea_hook
FROM marketing.testimonials t
LEFT JOIN marketing.content_ideas ci ON ci.id = t.promoted_idea_id
WHERE t.deleted_at IS NULL
ORDER BY
  CASE t.status WHEN 'pending' THEN 0 WHEN 'approved' THEN 1 WHEN 'used' THEN 2 ELSE 3 END,
  t.created_at DESC;

GRANT SELECT ON public.v_marketing_testimonials TO authenticated;

-- ─── RPC pública: qualquer um pode submeter (rate-limit aplicado no front + IP) ───
-- IMPORTANTE: SECURITY DEFINER + GRANT TO anon — sem is_staff() check.
DROP FUNCTION IF EXISTS public.marketing_submit_testimonial(jsonb);
CREATE OR REPLACE FUNCTION public.marketing_submit_testimonial(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_id   uuid;
  v_name text;
  v_story text;
BEGIN
  v_name  := trim(COALESCE(p_payload->>'full_name', ''));
  v_story := trim(COALESCE(p_payload->>'story', ''));

  -- Validações mínimas no banco (defesa em profundidade)
  IF length(v_name) < 2 THEN
    RAISE EXCEPTION 'invalid_name';
  END IF;
  IF length(v_story) < 20 THEN
    RAISE EXCEPTION 'story_too_short';
  END IF;
  IF length(v_story) > 4000 THEN
    RAISE EXCEPTION 'story_too_long';
  END IF;

  INSERT INTO marketing.testimonials (
    full_name, optica_name, city, state,
    whatsapp, whatsapp_consent,
    hook_applied, story, sale_value_cents,
    photo_url, rating, source,
    hotmart_transaction, ip_address, user_agent,
    metadata
  ) VALUES (
    v_name,
    NULLIF(trim(COALESCE(p_payload->>'optica_name','')), ''),
    NULLIF(trim(COALESCE(p_payload->>'city','')), ''),
    NULLIF(trim(COALESCE(p_payload->>'state','')), ''),
    NULLIF(trim(COALESCE(p_payload->>'whatsapp','')), ''),
    COALESCE((p_payload->>'whatsapp_consent')::boolean, false),
    NULLIF(trim(COALESCE(p_payload->>'hook_applied','')), ''),
    v_story,
    NULLIF((p_payload->>'sale_value_cents')::int, 0),
    NULLIF(trim(COALESCE(p_payload->>'photo_url','')), ''),
    NULLIF((p_payload->>'rating')::int, 0),
    'public_form',
    NULLIF(trim(COALESCE(p_payload->>'hotmart_transaction','')), ''),
    p_payload->>'ip_address',
    p_payload->>'user_agent',
    jsonb_build_object('submitted_at', now())
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_submit_testimonial TO anon, authenticated, service_role;

-- ─── RPC staff: revisar (approve/reject/spam) ───
DROP FUNCTION IF EXISTS public.marketing_review_testimonial(uuid, text, text);
CREATE OR REPLACE FUNCTION public.marketing_review_testimonial(
  p_id     uuid,
  p_status text,
  p_notes  text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  IF p_status NOT IN ('pending','approved','rejected','used','spam') THEN
    RAISE EXCEPTION 'invalid_status';
  END IF;

  UPDATE marketing.testimonials SET
    status         = p_status,
    reviewer_notes = COALESCE(p_notes, reviewer_notes),
    reviewed_at    = now(),
    reviewed_by    = auth.uid(),
    updated_at     = now()
  WHERE id = p_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_review_testimonial TO authenticated, service_role;

-- ─── RPC staff: promover depoimento → ideia no banco ───
DROP FUNCTION IF EXISTS public.marketing_promote_testimonial_to_idea(uuid, uuid);
CREATE OR REPLACE FUNCTION public.marketing_promote_testimonial_to_idea(
  p_id        uuid,
  p_pillar_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_t        record;
  v_pillar   uuid;
  v_idea_id  uuid;
  v_hook     text;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT * INTO v_t FROM marketing.testimonials WHERE id = p_id AND deleted_at IS NULL;
  IF NOT FOUND THEN RAISE EXCEPTION 'testimonial_not_found'; END IF;

  -- Já promovido?
  IF v_t.promoted_idea_id IS NOT NULL THEN
    RETURN v_t.promoted_idea_id;
  END IF;

  -- Pilar default: 'autoridade' (depoimento é prova social/autoridade)
  v_pillar := p_pillar_id;
  IF v_pillar IS NULL THEN
    SELECT id INTO v_pillar FROM marketing.content_pillars
    WHERE code = 'autoridade' AND is_active LIMIT 1;
  END IF;

  v_hook := 'Depoimento real: ' || v_t.full_name
            || COALESCE(' (' || v_t.optica_name || ')', '')
            || ' aplicou o método';

  INSERT INTO marketing.content_ideas
    (pillar_id, hook, narrative, suggested_format, notes, metadata, status)
  VALUES (
    v_pillar,
    v_hook,
    v_t.story,
    'depoimento (carrossel ou reel)',
    CASE WHEN v_t.sale_value_cents IS NOT NULL
         THEN 'Venda relatada: R$ ' || (v_t.sale_value_cents / 100.0)::text
         ELSE NULL END,
    jsonb_build_object('testimonial_id', p_id, 'source_full_name', v_t.full_name),
    'available'
  )
  RETURNING id INTO v_idea_id;

  UPDATE marketing.testimonials SET
    promoted_idea_id = v_idea_id,
    status           = CASE WHEN status = 'approved' THEN 'used' ELSE status END,
    updated_at       = now()
  WHERE id = p_id;

  RETURN v_idea_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_promote_testimonial_to_idea TO authenticated, service_role;

-- ─── Stats simples pra mostrar contadores ───
CREATE OR REPLACE VIEW public.v_marketing_testimonials_stats AS
SELECT
  COUNT(*) FILTER (WHERE status = 'pending')   AS pending,
  COUNT(*) FILTER (WHERE status = 'approved')  AS approved,
  COUNT(*) FILTER (WHERE status = 'used')      AS used,
  COUNT(*) FILTER (WHERE status = 'rejected')  AS rejected,
  COUNT(*) FILTER (WHERE status = 'spam')      AS spam,
  COUNT(*)                                      AS total
FROM marketing.testimonials
WHERE deleted_at IS NULL;

GRANT SELECT ON public.v_marketing_testimonials_stats TO authenticated;

NOTIFY pgrst, 'reload schema';
