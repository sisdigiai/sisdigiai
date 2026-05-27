-- =====================================================================
-- Módulo Marketing & SEO — credenciais (Supabase Vault) + cache de métricas
-- =====================================================================
-- Edge functions sincronizam dados de GSC / Bing Webmaster / Cloudflare.
-- Credenciais guardadas como ponteiro pra vault.secrets (encriptado).
-- Métricas em cache curto consumido pelo frontend.

-- ---------------------------------------------------------------------
-- company.api_credentials — ponteiros pra Vault
-- ---------------------------------------------------------------------

CREATE TABLE company.api_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  provider text NOT NULL CHECK (provider IN ('google_search_console','bing_webmaster','cloudflare')),
  credential_type text NOT NULL CHECK (credential_type IN ('oauth_refresh_token','api_key','api_token','oauth_client_secret')),
  vault_secret_id uuid NOT NULL,
  label text,
  scope text,
  expires_at timestamptz,
  last_used_at timestamptz,
  last_sync_at timestamptz,
  last_sync_status text CHECK (last_sync_status IN ('ok','error','partial')),
  last_sync_error text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id)
);

CREATE INDEX idx_api_cred_provider ON company.api_credentials(provider);
CREATE UNIQUE INDEX uq_api_cred_provider_label_active
  ON company.api_credentials(provider, COALESCE(label, ''))
  WHERE deleted_at IS NULL;

-- Sem policies pra authenticated/anon: só service_role acessa (bypass RLS).
ALTER TABLE company.api_credentials ENABLE ROW LEVEL SECURITY;

CREATE TRIGGER set_updated_at BEFORE UPDATE ON company.api_credentials
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_api_credentials AFTER INSERT OR UPDATE OR DELETE ON company.api_credentials
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

COMMENT ON TABLE company.api_credentials IS
  'Ponteiros para credenciais de APIs externas (GSC, Bing, Cloudflare). Valor encriptado em vault.secrets. Acesso restrito ao service_role (sem policies para authenticated).';

COMMENT ON COLUMN company.api_credentials.vault_secret_id IS
  'UUID em vault.secrets. Edge function lê valor via: SELECT decrypted_secret FROM vault.decrypted_secrets WHERE id = vault_secret_id;';

-- ---------------------------------------------------------------------
-- company.metrics — cache de métricas
-- ---------------------------------------------------------------------

CREATE TABLE company.metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL CHECK (source IN ('gsc','bing','cloudflare','indexnow','sitemap')),
  metric_type text NOT NULL,
  metric_key text,
  value_numeric numeric,
  value_text text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  period text NOT NULL CHECK (period IN ('24h','7d','30d','realtime','all_time')),
  period_start date,
  period_end date,
  collected_at timestamptz NOT NULL DEFAULT now(),
  raw_response jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_metrics_lookup
  ON company.metrics(source, metric_type, period, collected_at DESC);
CREATE INDEX idx_metrics_collected ON company.metrics(collected_at DESC);

ALTER TABLE company.metrics ENABLE ROW LEVEL SECURITY;

CREATE POLICY metrics_staff_read ON company.metrics FOR SELECT
  USING (public.is_staff());

COMMENT ON TABLE company.metrics IS
  'Cache curto de métricas vindas de APIs externas (GSC/Bing/Cloudflare/IndexNow/sitemap). Leitura: staff. Escrita: service_role (edge functions).';
COMMENT ON COLUMN company.metrics.raw_response IS
  'Payload bruto da API. Limpeza recomendada: TRUNCATE em registros > 30 dias (R-023 retenção mínima).';
