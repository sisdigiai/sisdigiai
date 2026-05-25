-- ╔════════════════════════════════════════════════════════════════╗
-- ║  Marketing — Fase 2 (operação completa)                        ║
-- ║  Adiciona: copy completa, brief, artes, plataformas multi,    ║
-- ║           materiais de afiliados, cadastro de afiliados,      ║
-- ║           performance tracking, RPCs auxiliares                ║
-- ╚════════════════════════════════════════════════════════════════╝

-- ════════════════════════════════════════════════════════════════════
-- FASE A: expandir marketing.content_calendar
-- ════════════════════════════════════════════════════════════════════

ALTER TABLE marketing.content_calendar
  ADD COLUMN IF NOT EXISTS platforms              text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS copy_full              text,
  ADD COLUMN IF NOT EXISTS arts                   jsonb    DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS posting_brief          text,
  ADD COLUMN IF NOT EXISTS responsible_producer   text,
  ADD COLUMN IF NOT EXISTS responsible_publisher  text,
  ADD COLUMN IF NOT EXISTS tools_used             text[]   DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS reach                  int,
  ADD COLUMN IF NOT EXISTS impressions            int,
  ADD COLUMN IF NOT EXISTS likes                  int,
  ADD COLUMN IF NOT EXISTS comments               int,
  ADD COLUMN IF NOT EXISTS shares                 int,
  ADD COLUMN IF NOT EXISTS saves                  int,
  ADD COLUMN IF NOT EXISTS link_clicks            int,
  ADD COLUMN IF NOT EXISTS conversions            int;

COMMENT ON COLUMN marketing.content_calendar.platforms     IS 'Códigos de plataformas: instagram_feed, instagram_reels, instagram_stories, tiktok, etc.';
COMMENT ON COLUMN marketing.content_calendar.copy_full     IS 'Copy completa pronta para colar (texto final, com quebras e emojis)';
COMMENT ON COLUMN marketing.content_calendar.arts          IS 'Array de objetos [{type, format, url, label}] — links externos (Canva, Drive)';
COMMENT ON COLUMN marketing.content_calendar.posting_brief IS 'Brief criativo / ideia inicial para quem produz';
COMMENT ON COLUMN marketing.content_calendar.tools_used    IS 'Lista de ferramentas usadas: Canva, CapCut, Photoshop, etc.';

-- ════════════════════════════════════════════════════════════════════
-- FASE B: marketing.platforms (lookup)
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing.platforms (
  code              text PRIMARY KEY,
  name              text NOT NULL,
  parent_platform   text,
  icon              text,
  color             text,
  formats           jsonb NOT NULL DEFAULT '[]'::jsonb,
  copy_char_limit   int,
  hashtag_limit     int,
  notes             text,
  sort_order        int NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE marketing.platforms ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_platforms_read ON marketing.platforms;
CREATE POLICY marketing_platforms_read ON marketing.platforms FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS marketing_platforms_staff_all ON marketing.platforms;
CREATE POLICY marketing_platforms_staff_all ON marketing.platforms FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

INSERT INTO marketing.platforms (code, name, parent_platform, icon, color, formats, copy_char_limit, hashtag_limit, sort_order) VALUES
  ('instagram_feed',    'Instagram Feed',     'instagram', 'Instagram',  '#E4405F',
   '[{"name":"Quadrado","w":1080,"h":1080,"aspect":"1:1"},{"name":"Retrato","w":1080,"h":1350,"aspect":"4:5"}]'::jsonb, 2200, 30, 1),
  ('instagram_reels',   'Instagram Reels',    'instagram', 'Film',       '#E4405F',
   '[{"name":"Vertical","w":1080,"h":1920,"aspect":"9:16"}]'::jsonb, 2200, 30, 2),
  ('instagram_stories', 'Instagram Stories',  'instagram', 'Circle',     '#E4405F',
   '[{"name":"Vertical","w":1080,"h":1920,"aspect":"9:16"}]'::jsonb, 0, 10, 3),
  ('instagram_carrossel','Instagram Carrossel','instagram','Layers',     '#E4405F',
   '[{"name":"Quadrado","w":1080,"h":1080,"aspect":"1:1","slides":"2-10"}]'::jsonb, 2200, 30, 4),
  ('tiktok',            'TikTok',             'tiktok',    'Music',      '#000000',
   '[{"name":"Vertical","w":1080,"h":1920,"aspect":"9:16"}]'::jsonb, 2200, 0, 5),
  ('youtube_shorts',    'YouTube Shorts',     'youtube',   'Youtube',    '#FF0000',
   '[{"name":"Vertical","w":1080,"h":1920,"aspect":"9:16","duration_max":60}]'::jsonb, 5000, 15, 6),
  ('facebook_feed',     'Facebook Feed',      'facebook',  'Facebook',   '#1877F2',
   '[{"name":"Quadrado","w":1080,"h":1080,"aspect":"1:1"},{"name":"Paisagem","w":1200,"h":630,"aspect":"1.91:1"}]'::jsonb, 63206, 0, 7),
  ('linkedin',          'LinkedIn',           'linkedin',  'Linkedin',   '#0A66C2',
   '[{"name":"Quadrado","w":1200,"h":1200,"aspect":"1:1"}]'::jsonb, 3000, 3, 8),
  ('whatsapp_status',   'WhatsApp Status',    'whatsapp',  'MessageCircle','#25D366',
   '[{"name":"Vertical","w":1080,"h":1920,"aspect":"9:16"}]'::jsonb, 0, 0, 9),
  ('email',             'Email',              'email',     'Mail',       '#6366F1',
   '[{"name":"Header","w":600,"h":200,"aspect":"3:1"}]'::jsonb, 0, 0, 10)
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name, formats = EXCLUDED.formats, sort_order = EXCLUDED.sort_order;

CREATE OR REPLACE VIEW public.v_marketing_platforms AS
  SELECT * FROM marketing.platforms WHERE is_active = true ORDER BY sort_order;
GRANT SELECT ON public.v_marketing_platforms TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- FASE C: marketing.affiliate_materials
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing.affiliate_materials (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pillar_id         uuid REFERENCES marketing.content_pillars(id) ON DELETE SET NULL,
  type              text NOT NULL,
  title             text NOT NULL,
  description       text,
  copy_short        text,
  copy_medium       text,
  copy_long         text,
  art_urls          jsonb NOT NULL DEFAULT '[]'::jsonb,
  platforms         text[] DEFAULT '{}',
  preview_url       text,
  downloads_count   int  NOT NULL DEFAULT 0,
  is_active         boolean NOT NULL DEFAULT true,
  notes             text,
  metadata          jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  created_by        uuid
);

CREATE INDEX IF NOT EXISTS idx_affmat_pillar    ON marketing.affiliate_materials(pillar_id);
CREATE INDEX IF NOT EXISTS idx_affmat_type      ON marketing.affiliate_materials(type);
CREATE INDEX IF NOT EXISTS idx_affmat_active    ON marketing.affiliate_materials(is_active);

ALTER TABLE marketing.affiliate_materials ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS marketing_affmat_staff_all ON marketing.affiliate_materials;
CREATE POLICY marketing_affmat_staff_all ON marketing.affiliate_materials FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE OR REPLACE VIEW public.v_marketing_affiliate_materials AS
  SELECT m.*, p.code as pillar_code, p.name as pillar_name, p.color as pillar_color
  FROM marketing.affiliate_materials m
  LEFT JOIN marketing.content_pillars p ON p.id = m.pillar_id
  WHERE m.deleted_at IS NULL
  ORDER BY m.created_at DESC;
GRANT SELECT ON public.v_marketing_affiliate_materials TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- FASE D: marketing.affiliates + downloads
-- ════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS marketing.affiliates (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name                text NOT NULL,
  email                    text NOT NULL,
  whatsapp                 text,
  instagram_handle         text,
  city                     text,
  state                    text,
  status                   text NOT NULL DEFAULT 'pending',
  tier                     text NOT NULL DEFAULT 'bronze',
  joined_at                timestamptz NOT NULL DEFAULT now(),
  total_sales              int  NOT NULL DEFAULT 0,
  total_commission_cents   bigint NOT NULL DEFAULT 0,
  affiliate_link_hotmart   text,
  affiliate_link_kiwify    text,
  notes                    text,
  metadata                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz NOT NULL DEFAULT now(),
  deleted_at               timestamptz,
  created_by               uuid
);

CREATE UNIQUE INDEX IF NOT EXISTS uniq_affiliates_email_active
  ON marketing.affiliates(LOWER(email)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_affiliates_status ON marketing.affiliates(status);
CREATE INDEX IF NOT EXISTS idx_affiliates_tier   ON marketing.affiliates(tier);

CREATE TABLE IF NOT EXISTS marketing.affiliate_downloads (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id   uuid NOT NULL REFERENCES marketing.affiliates(id) ON DELETE CASCADE,
  material_id    uuid NOT NULL REFERENCES marketing.affiliate_materials(id) ON DELETE CASCADE,
  downloaded_at  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_affdl_affiliate ON marketing.affiliate_downloads(affiliate_id);

ALTER TABLE marketing.affiliates          ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.affiliate_downloads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS marketing_aff_staff_all  ON marketing.affiliates;
DROP POLICY IF EXISTS marketing_affdl_staff_all ON marketing.affiliate_downloads;

CREATE POLICY marketing_aff_staff_all   ON marketing.affiliates          FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
CREATE POLICY marketing_affdl_staff_all ON marketing.affiliate_downloads FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE OR REPLACE VIEW public.v_marketing_affiliates AS
  SELECT a.*, ROUND(a.total_commission_cents::numeric / 100, 2) AS total_commission_brl
  FROM marketing.affiliates a
  WHERE a.deleted_at IS NULL
  ORDER BY a.total_sales DESC, a.created_at DESC;
GRANT SELECT ON public.v_marketing_affiliates TO authenticated;

-- ════════════════════════════════════════════════════════════════════
-- RPCs Fase A (atualizar create/update calendar para suportar novos campos)
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marketing_create_calendar_post(
  p_scheduled_date date,
  p_scheduled_time time DEFAULT NULL,
  p_idea_id uuid DEFAULT NULL,
  p_pillar_id uuid DEFAULT NULL,
  p_platform text DEFAULT NULL,         -- legacy (single)
  p_platforms text[] DEFAULT NULL,      -- novo (multi)
  p_content_type text DEFAULT NULL,
  p_hook text DEFAULT NULL,
  p_narrative text DEFAULT NULL,
  p_copy_full text DEFAULT NULL,
  p_posting_brief text DEFAULT NULL,
  p_cta text DEFAULT NULL,
  p_hashtags text[] DEFAULT NULL,
  p_arts jsonb DEFAULT NULL,
  p_media_external_url text DEFAULT NULL,
  p_tools_used text[] DEFAULT NULL,
  p_responsible_producer text DEFAULT NULL,
  p_responsible_publisher text DEFAULT NULL,
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
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  INSERT INTO marketing.content_calendar
    (scheduled_date, scheduled_time, idea_id, pillar_id, platform, platforms, content_type,
     hook, narrative, copy_full, posting_brief, cta, hashtags, arts, media_external_url,
     tools_used, responsible_producer, responsible_publisher, status, notes)
  VALUES
    (p_scheduled_date, p_scheduled_time, p_idea_id, p_pillar_id, p_platform,
     COALESCE(p_platforms, '{}'), p_content_type,
     p_hook, p_narrative, p_copy_full, p_posting_brief, p_cta,
     COALESCE(p_hashtags, '{}'), COALESCE(p_arts, '[]'::jsonb), p_media_external_url,
     COALESCE(p_tools_used, '{}'), p_responsible_producer, p_responsible_publisher,
     p_status, p_notes)
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_create_calendar_post TO authenticated, service_role;

-- Update já é genérico via jsonb patch; precisa só estender o COALESCE no marketing_update_calendar_post.
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
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  UPDATE marketing.content_calendar SET
    scheduled_date         = COALESCE((p_patch->>'scheduled_date')::date, scheduled_date),
    scheduled_time         = CASE WHEN p_patch ? 'scheduled_time' THEN (p_patch->>'scheduled_time')::time ELSE scheduled_time END,
    pillar_id              = CASE WHEN p_patch ? 'pillar_id' THEN NULLIF(p_patch->>'pillar_id','')::uuid ELSE pillar_id END,
    platform               = CASE WHEN p_patch ? 'platform' THEN p_patch->>'platform' ELSE platform END,
    platforms              = CASE WHEN p_patch ? 'platforms' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'platforms')) ELSE platforms END,
    content_type           = CASE WHEN p_patch ? 'content_type' THEN p_patch->>'content_type' ELSE content_type END,
    hook                   = CASE WHEN p_patch ? 'hook' THEN p_patch->>'hook' ELSE hook END,
    narrative              = CASE WHEN p_patch ? 'narrative' THEN p_patch->>'narrative' ELSE narrative END,
    copy_full              = CASE WHEN p_patch ? 'copy_full' THEN p_patch->>'copy_full' ELSE copy_full END,
    posting_brief          = CASE WHEN p_patch ? 'posting_brief' THEN p_patch->>'posting_brief' ELSE posting_brief END,
    cta                    = CASE WHEN p_patch ? 'cta' THEN p_patch->>'cta' ELSE cta END,
    hashtags               = CASE WHEN p_patch ? 'hashtags' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'hashtags')) ELSE hashtags END,
    arts                   = CASE WHEN p_patch ? 'arts' THEN p_patch->'arts' ELSE arts END,
    media_external_url     = CASE WHEN p_patch ? 'media_external_url' THEN p_patch->>'media_external_url' ELSE media_external_url END,
    tools_used             = CASE WHEN p_patch ? 'tools_used' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'tools_used')) ELSE tools_used END,
    responsible_producer   = CASE WHEN p_patch ? 'responsible_producer' THEN p_patch->>'responsible_producer' ELSE responsible_producer END,
    responsible_publisher  = CASE WHEN p_patch ? 'responsible_publisher' THEN p_patch->>'responsible_publisher' ELSE responsible_publisher END,
    status                 = COALESCE(p_patch->>'status', status),
    published_at           = CASE WHEN p_patch ? 'published_at' THEN (p_patch->>'published_at')::timestamptz ELSE published_at END,
    published_url          = CASE WHEN p_patch ? 'published_url' THEN p_patch->>'published_url' ELSE published_url END,
    reach                  = CASE WHEN p_patch ? 'reach' THEN (p_patch->>'reach')::int ELSE reach END,
    impressions            = CASE WHEN p_patch ? 'impressions' THEN (p_patch->>'impressions')::int ELSE impressions END,
    likes                  = CASE WHEN p_patch ? 'likes' THEN (p_patch->>'likes')::int ELSE likes END,
    comments               = CASE WHEN p_patch ? 'comments' THEN (p_patch->>'comments')::int ELSE comments END,
    shares                 = CASE WHEN p_patch ? 'shares' THEN (p_patch->>'shares')::int ELSE shares END,
    saves                  = CASE WHEN p_patch ? 'saves' THEN (p_patch->>'saves')::int ELSE saves END,
    link_clicks            = CASE WHEN p_patch ? 'link_clicks' THEN (p_patch->>'link_clicks')::int ELSE link_clicks END,
    conversions            = CASE WHEN p_patch ? 'conversions' THEN (p_patch->>'conversions')::int ELSE conversions END,
    performance_data       = COALESCE((p_patch->'performance_data')::jsonb, performance_data),
    notes                  = CASE WHEN p_patch ? 'notes' THEN p_patch->>'notes' ELSE notes END,
    updated_at             = now()
  WHERE id = p_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_update_calendar_post TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════
-- RPCs Fase C (affiliate_materials)
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marketing_create_material(
  p_type text,
  p_title text,
  p_pillar_id uuid DEFAULT NULL,
  p_description text DEFAULT NULL,
  p_copy_short text DEFAULT NULL,
  p_copy_medium text DEFAULT NULL,
  p_copy_long text DEFAULT NULL,
  p_art_urls jsonb DEFAULT NULL,
  p_platforms text[] DEFAULT NULL,
  p_preview_url text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketing
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;
  INSERT INTO marketing.affiliate_materials
    (pillar_id, type, title, description, copy_short, copy_medium, copy_long, art_urls, platforms, preview_url, notes)
  VALUES
    (p_pillar_id, p_type, p_title, p_description, p_copy_short, p_copy_medium, p_copy_long,
     COALESCE(p_art_urls, '[]'::jsonb), COALESCE(p_platforms, '{}'), p_preview_url, p_notes)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.marketing_create_material TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.marketing_update_material(p_id uuid, p_patch jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;
  UPDATE marketing.affiliate_materials SET
    pillar_id     = CASE WHEN p_patch ? 'pillar_id' THEN NULLIF(p_patch->>'pillar_id','')::uuid ELSE pillar_id END,
    type          = COALESCE(p_patch->>'type', type),
    title         = COALESCE(p_patch->>'title', title),
    description   = CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
    copy_short    = CASE WHEN p_patch ? 'copy_short' THEN p_patch->>'copy_short' ELSE copy_short END,
    copy_medium   = CASE WHEN p_patch ? 'copy_medium' THEN p_patch->>'copy_medium' ELSE copy_medium END,
    copy_long     = CASE WHEN p_patch ? 'copy_long' THEN p_patch->>'copy_long' ELSE copy_long END,
    art_urls      = CASE WHEN p_patch ? 'art_urls' THEN p_patch->'art_urls' ELSE art_urls END,
    platforms     = CASE WHEN p_patch ? 'platforms' THEN ARRAY(SELECT jsonb_array_elements_text(p_patch->'platforms')) ELSE platforms END,
    preview_url   = CASE WHEN p_patch ? 'preview_url' THEN p_patch->>'preview_url' ELSE preview_url END,
    is_active     = COALESCE((p_patch->>'is_active')::boolean, is_active),
    notes         = CASE WHEN p_patch ? 'notes' THEN p_patch->>'notes' ELSE notes END,
    metadata      = COALESCE((p_patch->'metadata')::jsonb, metadata),
    updated_at    = now()
  WHERE id = p_id AND deleted_at IS NULL;
  RETURN FOUND;
END; $$;
GRANT EXECUTE ON FUNCTION public.marketing_update_material TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.marketing_track_material_download(p_material_id uuid, p_affiliate_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketing
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;
  INSERT INTO marketing.affiliate_downloads (affiliate_id, material_id)
  VALUES (p_affiliate_id, p_material_id)
  RETURNING id INTO new_id;
  UPDATE marketing.affiliate_materials SET downloads_count = downloads_count + 1, updated_at = now()
  WHERE id = p_material_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.marketing_track_material_download TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════
-- RPCs Fase D (affiliates)
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marketing_create_affiliate(
  p_full_name text,
  p_email text,
  p_whatsapp text DEFAULT NULL,
  p_instagram_handle text DEFAULT NULL,
  p_city text DEFAULT NULL,
  p_state text DEFAULT NULL,
  p_status text DEFAULT 'pending',
  p_tier text DEFAULT 'bronze',
  p_affiliate_link_hotmart text DEFAULT NULL,
  p_affiliate_link_kiwify text DEFAULT NULL,
  p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketing
AS $$
DECLARE new_id uuid;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;
  INSERT INTO marketing.affiliates
    (full_name, email, whatsapp, instagram_handle, city, state, status, tier,
     affiliate_link_hotmart, affiliate_link_kiwify, notes)
  VALUES
    (p_full_name, LOWER(p_email), p_whatsapp, p_instagram_handle, p_city, p_state, p_status, p_tier,
     p_affiliate_link_hotmart, p_affiliate_link_kiwify, p_notes)
  RETURNING id INTO new_id;
  RETURN new_id;
END; $$;
GRANT EXECUTE ON FUNCTION public.marketing_create_affiliate TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.marketing_update_affiliate(p_id uuid, p_patch jsonb)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;
  UPDATE marketing.affiliates SET
    full_name              = COALESCE(p_patch->>'full_name', full_name),
    email                  = COALESCE(LOWER(p_patch->>'email'), email),
    whatsapp               = CASE WHEN p_patch ? 'whatsapp' THEN p_patch->>'whatsapp' ELSE whatsapp END,
    instagram_handle       = CASE WHEN p_patch ? 'instagram_handle' THEN p_patch->>'instagram_handle' ELSE instagram_handle END,
    city                   = CASE WHEN p_patch ? 'city' THEN p_patch->>'city' ELSE city END,
    state                  = CASE WHEN p_patch ? 'state' THEN p_patch->>'state' ELSE state END,
    status                 = COALESCE(p_patch->>'status', status),
    tier                   = COALESCE(p_patch->>'tier', tier),
    total_sales            = COALESCE((p_patch->>'total_sales')::int, total_sales),
    total_commission_cents = COALESCE((p_patch->>'total_commission_cents')::bigint, total_commission_cents),
    affiliate_link_hotmart = CASE WHEN p_patch ? 'affiliate_link_hotmart' THEN p_patch->>'affiliate_link_hotmart' ELSE affiliate_link_hotmart END,
    affiliate_link_kiwify  = CASE WHEN p_patch ? 'affiliate_link_kiwify'  THEN p_patch->>'affiliate_link_kiwify'  ELSE affiliate_link_kiwify END,
    notes                  = CASE WHEN p_patch ? 'notes' THEN p_patch->>'notes' ELSE notes END,
    metadata               = COALESCE((p_patch->'metadata')::jsonb, metadata),
    updated_at             = now()
  WHERE id = p_id AND deleted_at IS NULL;
  RETURN FOUND;
END; $$;
GRANT EXECUTE ON FUNCTION public.marketing_update_affiliate TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════
-- FASE E: RPC kit de boas-vindas (retorna materiais ativos)
-- ════════════════════════════════════════════════════════════════════

CREATE OR REPLACE FUNCTION public.marketing_get_affiliate_kit(p_affiliate_id uuid)
RETURNS TABLE (
  material_id uuid,
  type text,
  title text,
  copy_short text,
  copy_medium text,
  copy_long text,
  art_urls jsonb,
  platforms text[],
  pillar_name text,
  pillar_color text,
  already_downloaded boolean
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;
  RETURN QUERY
  SELECT
    m.id, m.type, m.title, m.copy_short, m.copy_medium, m.copy_long,
    m.art_urls, m.platforms, p.name, p.color,
    EXISTS (SELECT 1 FROM marketing.affiliate_downloads d
            WHERE d.affiliate_id = p_affiliate_id AND d.material_id = m.id) AS already_downloaded
  FROM marketing.affiliate_materials m
  LEFT JOIN marketing.content_pillars p ON p.id = m.pillar_id
  WHERE m.is_active = true AND m.deleted_at IS NULL
  ORDER BY m.created_at DESC;
END; $$;
GRANT EXECUTE ON FUNCTION public.marketing_get_affiliate_kit TO authenticated, service_role;

-- ════════════════════════════════════════════════════════════════════
-- SEED: 8 materiais iniciais para afiliados
-- ════════════════════════════════════════════════════════════════════

WITH p AS (SELECT code, id FROM marketing.content_pillars)
INSERT INTO marketing.affiliate_materials (pillar_id, type, title, description, copy_short, copy_medium, copy_long, platforms, is_active) VALUES

((SELECT id FROM p WHERE code='oferta'),
 'banner', 'Banner principal — Ótica Sem Improviso (Quadrado 1080)',
 'Banner quadrado para feed do Instagram, Facebook ou anúncio',
 'Pare de atender no improviso. Manual visual + app + 90 dias de apoio. R$ 48,50.',
 'Manual visual de atendimento para quem trabalha em ótica. PDF + app + 90 dias na Nexus. Lançamento R$ 48,50.',
 'Ótica Sem Improviso: o manual visual prático para vendedor, atendente e consultor que querem vender melhor sem depender de improviso. PDF para imprimir + app no celular + 90 dias de apoio complementar na Nexus. Lançamento por R$ 48,50 (50% off do preço de R$ 97).',
 ARRAY['instagram_feed','facebook_feed'], true),

((SELECT id FROM p WHERE code='oferta'),
 'banner', 'Banner Story — Ótica Sem Improviso (1080x1920)',
 'Banner vertical para Stories e Reels',
 'Pare de atender no improviso 🎯 Link na bio.',
 'Manual visual + app + 90 dias de apoio. Lançamento R$ 48,50. Link na bio.',
 'O método que tira você do atendimento no improviso e te coloca no controle do balcão e do WhatsApp. Pacote completo: manual PDF + app + 90 dias na Nexus. Lançamento por R$ 48,50. Link na bio.',
 ARRAY['instagram_stories','instagram_reels','whatsapp_status','tiktok'], true),

((SELECT id FROM p WHERE code='dor'),
 'post_copy', 'Copy: "tá caro" sem argumento',
 'Texto pronto para post de feed (pilar Dor)',
 'Cliente diz "tá caro" — e você não tem nem 1 argumento pronto. Conhece?',
 'Cliente diz "tá caro" — e você não tem nem 1 argumento pronto. Acontece comigo todo dia. Por isso comecei a estudar atendimento de ótica com método. Comenta "QUERO" e te mando o link.',
 'Cliente diz "tá caro" — e você não tem nem 1 argumento pronto. Quem trabalha em ótica conhece essa cena. Você até treinou produto, sabe a diferença de cada lente, mas na hora de sustentar valor, trava. Não é falta de informação — é falta de método. Comenta "QUERO" que eu te mando o link do material que mudou meu jogo no balcão.',
 ARRAY['instagram_feed','facebook_feed','linkedin'], true),

((SELECT id FROM p WHERE code='valor'),
 'reel', 'Reel: 3 perguntas que mudam a venda',
 'Roteiro de Reel de 30 segundos para o pilar Valor',
 '3 perguntas que mudam a conversa de venda no balcão 👇',
 '3 perguntas que mudam a conversa de venda no balcão 👇 Salva e usa amanhã.',
 'Roteiro: (0-3s) Hook "3 perguntas que mudam a venda no balcão" / (3-10s) #1 "Pra que você usa óculos hoje?" / (10-17s) #2 "O que mais te incomoda no seu atual?" / (17-24s) #3 "Se eu te mostrar uma opção que resolve isso, faz sentido?" / (24-30s) CTA "Salva e usa amanhã. Link na bio pro método completo." Mostra você falando frente câmera, com texto na tela em cada pergunta.',
 ARRAY['instagram_reels','tiktok','youtube_shorts'], true),

((SELECT id FROM p WHERE code='conversa'),
 'carrossel', 'Carrossel: WhatsApp que retoma sem ser chato',
 'Carrossel 6 slides para Feed Instagram',
 'WhatsApp que retoma cliente que sumiu — sem parecer cobrança.',
 'WhatsApp: 4 mensagens curtas que destravam orçamento parado. Salva e adapta.',
 'Slides do carrossel: (1) Capa "WhatsApp que retoma sem ser chato" / (2) "Mensagem 1: Oi [nome], lembrei de você por causa da [observação real]." / (3) "Mensagem 2: Você comentou que precisava resolver [problema X]. Posso te mandar uma opção?" / (4) "Mensagem 3: Se não fizer sentido agora, sem problema. Posso te chamar quando tiver novidade." / (5) "Mensagem 4: Resposta dela: você reagende e mantém a conversa viva." / (6) CTA "Salva. Link na bio pro método completo."',
 ARRAY['instagram_carrossel','linkedin'], true),

((SELECT id FROM p WHERE code='oferta'),
 'email', 'Email de afiliado — apresentação do material',
 'Texto pronto para o afiliado enviar para a própria lista',
 'O método de atendimento que faltava pra você vender mais.',
 'Oi! Conheci um material que mudou meu jeito de atender na ótica e quis te indicar.',
 E'Oi!\n\nVocê trabalha no balcão de ótica ou conhece alguém que trabalha? Então essa indicação é pra você.\n\nO Ótica Sem Improviso é o manual visual prático que ensina vendedor, atendente e consultor a vender melhor — sem depender de improviso. Em vez de "tentar lembrar o discurso", você aplica um método de 5 movimentos que cabe em qualquer atendimento.\n\nO pacote tem: PDF visual + app no celular + 90 dias de apoio complementar na Nexus (uma plataforma onde você revisa o método e tira dúvidas com o Doug, um veterano de balcão).\n\nNo lançamento sai por R$ 48,50 (50% off do preço cheio de R$ 97).\n\nLink: [SEU_LINK_AFILIADO]\n\nAbraço',
 ARRAY['email'], true),

((SELECT id FROM p WHERE code='oferta'),
 'whatsapp_msg', 'WhatsApp do afiliado — 1º contato',
 'Texto pronto para enviar via WhatsApp pessoal/lista',
 'Oi! Tem um material novo de atendimento de ótica que tá ajudando muita gente. R$ 48,50. Quer o link?',
 'Oi! Conheci um material novo de atendimento pra quem trabalha em ótica. PDF + app + 90 dias de apoio. Lançamento R$ 48,50. Quer que eu te mande o link?',
 E'Oi! Tudo bem?\n\nQuero te indicar um material novo que tô vendo dar resultado pra gente que trabalha em ótica.\n\nSe chama Ótica Sem Improviso — é o manual visual de atendimento pra quem quer vender melhor sem depender de improviso. Tem o PDF pra ler, o app pra estudar pelo celular e 90 dias de apoio na Nexus (com o Doug, um veterano de balcão que tira dúvidas).\n\nTá em lançamento por R$ 48,50 (preço normal vai pra R$ 97).\n\nLink: [SEU_LINK]\n\nSe fizer sentido, dá uma olhada!',
 ARRAY['whatsapp_status'], true),

((SELECT id FROM p WHERE code='autoridade'),
 'reel', 'Reel: Quem é a Taty (autoridade)',
 'Roteiro de Reel de 45s apresentando a autoridade do método',
 'Quem é a Taty: 40+ anos de balcão, sem nunca ter parado.',
 'Quem é a Taty: 40+ anos de balcão. Conhece o método que ela ensina?',
 'Roteiro: (0-5s) Hook "Quem é a Taty?" sobre foto/vídeo dela atendendo / (5-15s) "Ela trabalhou 40 anos no balcão da Mello Óticas, sem nunca ter parado." / (15-25s) "Atendeu literalmente milhares de clientes — e foi de balcão a referência interna em vendas e treinamento." / (25-35s) "Hoje colocou tudo isso num manual prático: o Ótica Sem Improviso." / (35-45s) CTA "Conhece? Link na bio pro método dela." Use B-rolls do balcão real ou fotos.',
 ARRAY['instagram_reels','tiktok','youtube_shorts'], true);

-- ════════════════════════════════════════════════════════════════════
-- FIM
-- ════════════════════════════════════════════════════════════════════
SELECT 'OK marketing fase 2' AS result;
