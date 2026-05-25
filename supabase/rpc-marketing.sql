-- ─── RPCs para o módulo Marketing ───
-- Permitem INSERT/UPDATE em marketing.* sem precisar do schema exposto no PostgREST.
-- Frontend chama via supabase.rpc('marketing_*', { ... }).

-- ─── Criar nova ideia ───
CREATE OR REPLACE FUNCTION public.marketing_create_idea(
  p_pillar_id uuid,
  p_hook text,
  p_narrative text DEFAULT NULL,
  p_target_audience text DEFAULT NULL,
  p_suggested_format text DEFAULT NULL,
  p_cta_suggestion text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  INSERT INTO marketing.content_ideas
    (pillar_id, hook, narrative, target_audience, suggested_format, cta_suggestion, notes)
  VALUES
    (p_pillar_id, p_hook, p_narrative, p_target_audience, p_suggested_format, p_cta_suggestion, p_notes)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_create_idea TO authenticated, service_role;

-- ─── Atualizar ideia (patch parcial via jsonb) ───
CREATE OR REPLACE FUNCTION public.marketing_update_idea(
  p_id uuid,
  p_patch jsonb
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

  UPDATE marketing.content_ideas SET
    pillar_id        = COALESCE((p_patch->>'pillar_id')::uuid, pillar_id),
    hook             = COALESCE(p_patch->>'hook', hook),
    narrative        = CASE WHEN p_patch ? 'narrative' THEN p_patch->>'narrative' ELSE narrative END,
    target_audience  = CASE WHEN p_patch ? 'target_audience' THEN p_patch->>'target_audience' ELSE target_audience END,
    suggested_format = CASE WHEN p_patch ? 'suggested_format' THEN p_patch->>'suggested_format' ELSE suggested_format END,
    cta_suggestion   = CASE WHEN p_patch ? 'cta_suggestion' THEN p_patch->>'cta_suggestion' ELSE cta_suggestion END,
    status           = COALESCE(p_patch->>'status', status),
    used_count       = COALESCE((p_patch->>'used_count')::int, used_count),
    last_used_at     = CASE WHEN p_patch ? 'last_used_at' THEN (p_patch->>'last_used_at')::timestamptz ELSE last_used_at END,
    notes            = CASE WHEN p_patch ? 'notes' THEN p_patch->>'notes' ELSE notes END,
    metadata         = COALESCE((p_patch->'metadata')::jsonb, metadata),
    updated_at       = now()
  WHERE id = p_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_update_idea TO authenticated, service_role;

-- ─── Criar post no calendário ───
CREATE OR REPLACE FUNCTION public.marketing_create_calendar_post(
  p_scheduled_date date,
  p_scheduled_time time DEFAULT NULL,
  p_idea_id uuid DEFAULT NULL,
  p_pillar_id uuid DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_hook text DEFAULT NULL,
  p_narrative text DEFAULT NULL,
  p_cta text DEFAULT NULL,
  p_hashtags text[] DEFAULT NULL,
  p_media_external_url text DEFAULT NULL,
  p_status text DEFAULT 'planned',
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  new_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  INSERT INTO marketing.content_calendar
    (scheduled_date, scheduled_time, idea_id, pillar_id, platform, content_type,
     hook, narrative, cta, hashtags, media_external_url, status, notes)
  VALUES
    (p_scheduled_date, p_scheduled_time, p_idea_id, p_pillar_id, p_platform, p_content_type,
     p_hook, p_narrative, p_cta, p_hashtags, p_media_external_url, p_status, p_notes)
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_create_calendar_post TO authenticated, service_role;

-- ─── Atualizar post do calendário (patch parcial via jsonb) ───
CREATE OR REPLACE FUNCTION public.marketing_update_calendar_post(
  p_id uuid,
  p_patch jsonb
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

  UPDATE marketing.content_calendar SET
    scheduled_date     = COALESCE((p_patch->>'scheduled_date')::date, scheduled_date),
    scheduled_time     = CASE WHEN p_patch ? 'scheduled_time' THEN (p_patch->>'scheduled_time')::time ELSE scheduled_time END,
    pillar_id          = CASE WHEN p_patch ? 'pillar_id' THEN (p_patch->>'pillar_id')::uuid ELSE pillar_id END,
    platform           = CASE WHEN p_patch ? 'platform' THEN p_patch->>'platform' ELSE platform END,
    content_type       = CASE WHEN p_patch ? 'content_type' THEN p_patch->>'content_type' ELSE content_type END,
    hook               = CASE WHEN p_patch ? 'hook' THEN p_patch->>'hook' ELSE hook END,
    narrative          = CASE WHEN p_patch ? 'narrative' THEN p_patch->>'narrative' ELSE narrative END,
    cta                = CASE WHEN p_patch ? 'cta' THEN p_patch->>'cta' ELSE cta END,
    hashtags           = CASE WHEN p_patch ? 'hashtags' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'hashtags')) ELSE hashtags END,
    media_external_url = CASE WHEN p_patch ? 'media_external_url' THEN p_patch->>'media_external_url' ELSE media_external_url END,
    status             = COALESCE(p_patch->>'status', status),
    published_at       = CASE WHEN p_patch ? 'published_at' THEN (p_patch->>'published_at')::timestamptz ELSE published_at END,
    published_url      = CASE WHEN p_patch ? 'published_url' THEN p_patch->>'published_url' ELSE published_url END,
    performance_data   = COALESCE((p_patch->'performance_data')::jsonb, performance_data),
    notes              = CASE WHEN p_patch ? 'notes' THEN p_patch->>'notes' ELSE notes END,
    updated_at         = now()
  WHERE id = p_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_update_calendar_post TO authenticated, service_role;

-- ─── Agendar uma ideia (atomic: cria post + marca idea como scheduled) ───
CREATE OR REPLACE FUNCTION public.marketing_schedule_idea(
  p_idea_id uuid,
  p_scheduled_date date,
  p_platform text DEFAULT NULL,
  p_content_type text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_idea marketing.content_ideas%ROWTYPE;
  new_post_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT * INTO v_idea FROM marketing.content_ideas WHERE id = p_idea_id AND deleted_at IS NULL;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'idea_not_found';
  END IF;

  -- Cria post no calendário
  INSERT INTO marketing.content_calendar
    (scheduled_date, idea_id, pillar_id, platform, content_type, hook, cta, status, notes)
  VALUES
    (p_scheduled_date, p_idea_id, v_idea.pillar_id, p_platform,
     COALESCE(p_content_type, v_idea.suggested_format),
     v_idea.hook, v_idea.cta_suggestion, 'planned', p_notes)
  RETURNING id INTO new_post_id;

  -- Marca idea como scheduled
  UPDATE marketing.content_ideas
  SET status       = 'scheduled',
      used_count   = used_count + 1,
      last_used_at = now(),
      updated_at   = now()
  WHERE id = p_idea_id;

  RETURN new_post_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_schedule_idea TO authenticated, service_role;
