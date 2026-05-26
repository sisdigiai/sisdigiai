-- ============================================================
-- Marketing — Bulk Schedule (Planejador de agenda em massa)
-- ============================================================
-- Distribui as ideias do banco em N semanas no calendário,
-- 5×/sem (seg a sex), seguindo estratégia OSI Fase 1→2→3.
-- Cada post nasce com TODAS as plataformas ativas pré-selecionadas
-- (estratégia "inundação orgânica" — uma ideia adapta pra todo canal).
-- ============================================================

-- ─── 1. Pre-config: adicionar Threads + WhatsApp Broadcast ───
INSERT INTO marketing.platforms
  (code, name, parent_platform, color, formats, copy_char_limit, sort_order, is_active)
VALUES
  ('threads', 'Threads', 'meta', '#FFFFFF',
   '[{"name":"post","w":1080,"h":1080,"aspect":"1:1"}]'::jsonb,
   500, 11, true),
  ('whatsapp_broadcast', 'WhatsApp Broadcast', 'whatsapp', '#25D366',
   '[{"name":"texto","w":0,"h":0,"aspect":"text"}]'::jsonb,
   1024, 12, true)
ON CONFLICT (code) DO UPDATE SET is_active = true;

-- Garantir que tudo está ativo
UPDATE marketing.platforms SET is_active = true;

-- ─── 2. RPC: bulk_schedule ───
DROP FUNCTION IF EXISTS public.marketing_bulk_schedule(date, int, int, text[], boolean);
CREATE OR REPLACE FUNCTION public.marketing_bulk_schedule(
  p_start_date  date,
  p_weeks       int DEFAULT 12,
  p_per_week    int DEFAULT 5,
  p_channels    text[] DEFAULT NULL,
  p_dry_run     boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_total            int;
  v_active_channels  text[];
  v_chosen_ideas     uuid[];
  v_dates            date[];
  v_idx              int;
  v_post_id          uuid;
  v_idea             record;
  v_date             date;
  v_created          int := 0;
  v_by_pillar        jsonb;
  v_result_posts     jsonb := '[]'::jsonb;
  v_content_type     text;
  v_week_num         int;
  v_pillars_for_week text[];
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF p_weeks < 1 OR p_weeks > 52 THEN
    RAISE EXCEPTION 'weeks_out_of_range';
  END IF;
  IF p_per_week < 1 OR p_per_week > 7 THEN
    RAISE EXCEPTION 'per_week_out_of_range';
  END IF;

  -- Canais default = todos ativos
  IF p_channels IS NULL OR cardinality(p_channels) = 0 THEN
    SELECT array_agg(code ORDER BY sort_order) INTO v_active_channels
    FROM marketing.platforms WHERE is_active;
  ELSE
    v_active_channels := p_channels;
  END IF;

  v_total := p_weeks * p_per_week;

  -- Gera datas (segunda a sexta), pulando finais de semana
  WITH RECURSIVE date_series AS (
    SELECT p_start_date AS d, 0 AS n
    UNION ALL
    SELECT d + 1, n + 1 FROM date_series WHERE n < v_total * 3
  ),
  weekdays AS (
    SELECT d, ROW_NUMBER() OVER (ORDER BY d) AS rn
    FROM date_series WHERE EXTRACT(DOW FROM d) BETWEEN 1 AND 5
    LIMIT v_total
  )
  SELECT array_agg(d ORDER BY rn) INTO v_dates FROM weekdays;

  v_chosen_ideas := ARRAY[]::uuid[];

  FOR v_idx IN 1..v_total LOOP
    v_date := v_dates[v_idx];
    v_week_num := ((v_idx - 1) / p_per_week) + 1;

    v_pillars_for_week := CASE
      WHEN v_week_num <= 8  THEN ARRAY['dor', 'conversa', 'valor']
      WHEN v_week_num <= 16 THEN ARRAY['valor', 'metodo', 'conversa']
      ELSE                       ARRAY['autoridade', 'metodo', 'oferta', 'comunidade']
    END;

    -- Pega ideia preferindo pilares da fase, evitando duplicar
    SELECT i.id AS idea_id, i.pillar_id, i.suggested_format, i.hook, i.narrative
      INTO v_idea
    FROM marketing.content_ideas i
    LEFT JOIN marketing.content_pillars p ON p.id = i.pillar_id
    WHERE i.status = 'available' AND i.deleted_at IS NULL
      AND NOT (i.id = ANY(v_chosen_ideas))
      AND p.code = ANY(v_pillars_for_week)
    ORDER BY array_position(v_pillars_for_week, p.code) NULLS LAST, RANDOM()
    LIMIT 1;

    -- Fallback: qualquer available
    IF v_idea.idea_id IS NULL THEN
      SELECT i.id, i.pillar_id, i.suggested_format, i.hook, i.narrative
        INTO v_idea
      FROM marketing.content_ideas i
      WHERE i.status = 'available' AND i.deleted_at IS NULL
        AND NOT (i.id = ANY(v_chosen_ideas))
      ORDER BY RANDOM() LIMIT 1;
    END IF;

    EXIT WHEN v_idea.idea_id IS NULL;  -- acabou ideias

    v_chosen_ideas := v_chosen_ideas || v_idea.idea_id;

    v_content_type := CASE
      WHEN lower(COALESCE(v_idea.suggested_format,'')) LIKE '%reel%'      THEN 'reel'
      WHEN lower(COALESCE(v_idea.suggested_format,'')) LIKE '%carrossel%' THEN 'carrossel'
      WHEN lower(COALESCE(v_idea.suggested_format,'')) LIKE '%story%'     THEN 'story'
      WHEN lower(COALESCE(v_idea.suggested_format,'')) LIKE '%v%deo%'     THEN 'video'
      WHEN lower(COALESCE(v_idea.suggested_format,'')) LIKE '%depoimento%' THEN 'carrossel'
      WHEN lower(COALESCE(v_idea.suggested_format,'')) LIKE '%email%'     THEN 'email'
      ELSE                                                                      'post'
    END;

    IF NOT p_dry_run THEN
      INSERT INTO marketing.content_calendar
        (scheduled_date, idea_id, pillar_id, content_type, platforms, hook, narrative, status)
      VALUES
        (v_date, v_idea.idea_id, v_idea.pillar_id, v_content_type,
         v_active_channels, v_idea.hook, v_idea.narrative, 'planned')
      RETURNING id INTO v_post_id;

      UPDATE marketing.content_ideas SET status = 'scheduled' WHERE id = v_idea.idea_id;
    END IF;

    v_created := v_created + 1;
    v_result_posts := v_result_posts || jsonb_build_object(
      'date',         v_date,
      'idea_id',      v_idea.idea_id,
      'content_type', v_content_type,
      'hook',         left(v_idea.hook, 60)
    );
  END LOOP;

  -- Stats por pilar
  SELECT jsonb_object_agg(p.code, x.cnt) INTO v_by_pillar
  FROM (
    SELECT i.pillar_id, COUNT(*) AS cnt
    FROM unnest(v_chosen_ideas) WITH ORDINALITY t(id, ord)
    JOIN marketing.content_ideas i ON i.id = t.id
    GROUP BY i.pillar_id
  ) x
  JOIN marketing.content_pillars p ON p.id = x.pillar_id;

  RETURN jsonb_build_object(
    'posts_created', v_created,
    'dry_run',       p_dry_run,
    'first_date',    v_dates[1],
    'last_date',     CASE WHEN v_created > 0 THEN v_dates[v_created] ELSE NULL END,
    'by_pillar',     COALESCE(v_by_pillar, '{}'::jsonb),
    'channels',      v_active_channels,
    'channels_count', cardinality(v_active_channels),
    'preview',       CASE WHEN p_dry_run THEN v_result_posts ELSE NULL::jsonb END
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_bulk_schedule TO authenticated, service_role;

-- ─── 3. RPC: reverter agendamento (limpar planned vazios) ───
DROP FUNCTION IF EXISTS public.marketing_unschedule_planned(date);
CREATE OR REPLACE FUNCTION public.marketing_unschedule_planned(p_from_date date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_ideas_freed int;
  v_posts_deleted int;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  -- Libera ideias de volta pra "available" (só as que estão linkadas a posts planned)
  WITH freed AS (
    UPDATE marketing.content_ideas SET status = 'available', updated_at = now()
    WHERE id IN (
      SELECT idea_id FROM marketing.content_calendar
      WHERE status = 'planned'
        AND deleted_at IS NULL
        AND idea_id IS NOT NULL
        AND (p_from_date IS NULL OR scheduled_date >= p_from_date)
    )
    AND status = 'scheduled'
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_ideas_freed FROM freed;

  -- Soft-delete dos posts planned (mantém histórico)
  WITH deleted AS (
    UPDATE marketing.content_calendar SET deleted_at = now()
    WHERE status = 'planned'
      AND deleted_at IS NULL
      AND (p_from_date IS NULL OR scheduled_date >= p_from_date)
    RETURNING 1
  )
  SELECT COUNT(*) INTO v_posts_deleted FROM deleted;

  RETURN jsonb_build_object('ideas_freed', v_ideas_freed, 'posts_deleted', v_posts_deleted);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_unschedule_planned TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
