-- ============================================================
-- RPC: promove um post do calendário → material de afiliado
-- ============================================================
-- Pega copy_full + hook + posting_brief + arts + platforms do post
-- e cria registro em marketing.affiliate_materials. Marca em metadata
-- para evitar duplicar. Idempotente: se já promovido, devolve o existente.
-- ============================================================

DROP FUNCTION IF EXISTS public.marketing_promote_post_to_material(uuid);
CREATE OR REPLACE FUNCTION public.marketing_promote_post_to_material(p_post_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_post         record;
  v_existing_id  uuid;
  v_new_id       uuid;
  v_type         text;
  v_title        text;
  v_art_urls     jsonb;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT * INTO v_post
  FROM marketing.content_calendar
  WHERE id = p_post_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'post_not_found';
  END IF;

  -- Já foi promovido antes?
  SELECT id INTO v_existing_id
  FROM marketing.affiliate_materials
  WHERE (metadata->>'source_post_id') = p_post_id::text
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_existing_id IS NOT NULL THEN
    RETURN jsonb_build_object(
      'material_id',      v_existing_id,
      'already_promoted', true
    );
  END IF;

  -- Mapeia content_type → material type
  v_type := CASE lower(COALESCE(v_post.content_type, ''))
    WHEN 'reel'      THEN 'reel'
    WHEN 'carrossel' THEN 'carrossel'
    WHEN 'story'     THEN 'story'
    WHEN 'video'     THEN 'video'
    WHEN 'email'     THEN 'email'
    WHEN 'whatsapp'  THEN 'whatsapp_msg'
    ELSE                 'post_copy'
  END;

  v_title := COALESCE(NULLIF(trim(v_post.hook), ''), 'Material a partir de post sem hook');

  -- arts (CalendarArt[]) → art_urls (jsonb[]). Normaliza shape.
  v_art_urls := COALESCE(
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'format',     COALESCE(a->>'format', a->>'type', ''),
          'url',        COALESCE(a->>'url', ''),
          'dimensions', COALESCE(a->>'format', ''),
          'label',      COALESCE(a->>'label', a->>'type', '')
        )
      )
      FROM jsonb_array_elements(COALESCE(v_post.arts, '[]'::jsonb)) a
      WHERE COALESCE(a->>'url', '') <> ''
    ),
    '[]'::jsonb
  );

  INSERT INTO marketing.affiliate_materials
    (pillar_id, type, title, description, copy_short, copy_medium, copy_long,
     art_urls, platforms, is_active, notes, metadata)
  VALUES (
    v_post.pillar_id,
    v_type,
    v_title,
    NULLIF(v_post.posting_brief, ''),
    NULLIF(v_post.hook, ''),
    COALESCE(NULLIF(v_post.copy_full, ''), v_post.hook),
    CASE
      WHEN NULLIF(v_post.posting_brief,'') IS NOT NULL AND NULLIF(v_post.copy_full,'') IS NOT NULL
        THEN v_post.copy_full || E'\n\n---\nBRIEF DO POST:\n' || v_post.posting_brief
      ELSE COALESCE(NULLIF(v_post.copy_full,''), v_post.hook)
    END,
    v_art_urls,
    COALESCE(v_post.platforms, ARRAY[]::text[]),
    true,
    v_post.notes,
    jsonb_build_object(
      'source_post_id',        p_post_id::text,
      'source_scheduled_date', v_post.scheduled_date::text,
      'source_pillar_code',    (SELECT code FROM marketing.content_pillars WHERE id = v_post.pillar_id),
      'promoted_at',           now()
    )
  )
  RETURNING id INTO v_new_id;

  RETURN jsonb_build_object(
    'material_id',      v_new_id,
    'already_promoted', false
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_promote_post_to_material TO authenticated, service_role;

-- ─── RPC auxiliar: dado um post, retorna material_id se já promovido (ou null) ───
-- Útil pra UI mostrar "Já promovido" sem listar todos os materiais.
DROP FUNCTION IF EXISTS public.marketing_get_post_promotion(uuid);
CREATE OR REPLACE FUNCTION public.marketing_get_post_promotion(p_post_id uuid)
RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, marketing
AS $$
  SELECT id FROM marketing.affiliate_materials
  WHERE (metadata->>'source_post_id') = p_post_id::text
    AND deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_get_post_promotion TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
