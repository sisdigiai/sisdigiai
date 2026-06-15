-- 042: Central de Postagens — fundação de dados (ADR-0039, F0)
-- Tabelas de métricas/status de contas sociais + registry de contas Meta.
-- Aditivo: não toca em content_calendar nem social_updates.
-- Aplicada via Management API (fora do ledger, como as demais do schema marketing).

-- ── Registry de contas (data-driven pra edge function de sync) ──
-- account_code casa com CONTAS_SOCIAIS de src/modules/marketing/Redes.tsx
CREATE TABLE IF NOT EXISTS marketing.social_accounts (
  account_code        text PRIMARY KEY,
  display_name        text NOT NULL,
  platform            text NOT NULL CHECK (platform IN ('instagram','facebook','linkedin','tiktok','youtube')),
  camada              text NOT NULL CHECK (camada IN ('pessoal','digiai','osi')),
  meta_ig_user_id     text,            -- IG User ID numérico (ex: 17841...)
  meta_page_id        text,            -- Facebook Page ID (MBS asset id)
  meta_business_id    text,            -- BM portfólio (Digiai = 1330524481742986)
  public_url          text,
  metrics_enabled     boolean NOT NULL DEFAULT false,  -- liga quando F1 (token) estiver pronto
  notes               text,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ── Série de métricas por post (snapshot diário, idempotente) ──
CREATE TABLE IF NOT EXISTS marketing.post_metrics (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  calendar_post_id    uuid REFERENCES marketing.content_calendar(id) ON DELETE SET NULL,
  account_code        text NOT NULL,
  external_post_id    text NOT NULL,          -- media id / post id do Meta
  platform            text NOT NULL,
  permalink           text,
  captured_on         date NOT NULL DEFAULT current_date,
  impressions         integer,
  reach               integer,
  likes               integer,
  comments            integer,
  shares              integer,
  saves               integer,
  video_views         integer,
  link_clicks         integer,
  raw                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_code, external_post_id, captured_on)
);
CREATE INDEX IF NOT EXISTS post_metrics_account_idx ON marketing.post_metrics (account_code, captured_on DESC);
CREATE INDEX IF NOT EXISTS post_metrics_calendar_idx ON marketing.post_metrics (calendar_post_id) WHERE calendar_post_id IS NOT NULL;

-- ── Status de conta (placar de seguidores, snapshot diário) ──
CREATE TABLE IF NOT EXISTS marketing.account_status (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code        text NOT NULL,
  platform            text NOT NULL,
  followers           integer,
  follows             integer,
  media_count         integer,
  captured_on         date NOT NULL DEFAULT current_date,
  raw                 jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at          timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_code, captured_on)
);
CREATE INDEX IF NOT EXISTS account_status_account_idx ON marketing.account_status (account_code, captured_on DESC);

-- ── RLS (padrão da casa: leitura authenticated; escrita só service_role/edge) ──
ALTER TABLE marketing.social_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.post_metrics    ENABLE ROW LEVEL SECURITY;
ALTER TABLE marketing.account_status  ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_accounts_read ON marketing.social_accounts;
CREATE POLICY social_accounts_read ON marketing.social_accounts FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS post_metrics_read ON marketing.post_metrics;
CREATE POLICY post_metrics_read ON marketing.post_metrics FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS account_status_read ON marketing.account_status;
CREATE POLICY account_status_read ON marketing.account_status FOR SELECT TO authenticated USING (true);

-- ── Views públicas (security_invoker — padrão mig 035, nunca anon) ──
CREATE OR REPLACE VIEW public.v_marketing_social_accounts AS
  SELECT account_code, display_name, platform, camada, meta_ig_user_id, meta_page_id,
         meta_business_id, public_url, metrics_enabled, notes, updated_at
  FROM marketing.social_accounts;

CREATE OR REPLACE VIEW public.v_marketing_post_metrics AS
  SELECT id, calendar_post_id, account_code, external_post_id, platform, permalink,
         captured_on, impressions, reach, likes, comments, shares, saves,
         video_views, link_clicks, created_at
  FROM marketing.post_metrics;

CREATE OR REPLACE VIEW public.v_marketing_account_status AS
  SELECT id, account_code, platform, followers, follows, media_count, captured_on, created_at
  FROM marketing.account_status;

ALTER VIEW public.v_marketing_social_accounts SET (security_invoker = true);
ALTER VIEW public.v_marketing_post_metrics     SET (security_invoker = true);
ALTER VIEW public.v_marketing_account_status   SET (security_invoker = true);

REVOKE ALL ON public.v_marketing_social_accounts, public.v_marketing_post_metrics, public.v_marketing_account_status FROM anon, public;
GRANT SELECT ON public.v_marketing_social_accounts, public.v_marketing_post_metrics, public.v_marketing_account_status TO authenticated;
GRANT USAGE ON SCHEMA marketing TO authenticated;
GRANT SELECT ON marketing.social_accounts, marketing.post_metrics, marketing.account_status TO authenticated;

-- ── Seed do registry (IDs Meta conhecidos da sessão META 2026-06-02; o resto a F1 completa) ──
INSERT INTO marketing.social_accounts (account_code, display_name, platform, camada, meta_ig_user_id, meta_page_id, meta_business_id, public_url, notes)
VALUES
  ('osi_instagram','@oticasemimproviso','instagram','osi','17841422939800023','1079807541890310','1330524481742986','https://instagram.com/oticasemimproviso/','IG user id confirmado na sessão META 02/06'),
  ('osi_facebook','Página Óticas Sem Improviso','facebook','osi',NULL,'1079807541890310','1330524481742986','https://facebook.com/profile.php?id=61590241545549','Page MBS id'),
  ('digiai_instagram','@_digiai','instagram','digiai',NULL,NULL,'1330524481742986','https://instagram.com/_digiai','IG user id a preencher na F1 (via /me/accounts)'),
  ('digiai_facebook','Página DIGIAI','facebook','digiai',NULL,NULL,'1330524481742986','https://facebook.com/61586695274933','Page MBS id a preencher na F1')
ON CONFLICT (account_code) DO NOTHING;
