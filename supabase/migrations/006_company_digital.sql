-- Migration 006: Identidade digital (domínios, emails, redes sociais, sites)

CREATE TABLE company.digital_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  categoria text NOT NULL CHECK (categoria IN (
    'dominio','email_corporativo','site','landing_page',
    'linkedin','instagram','youtube','tiktok','twitter','github','outro'
  )),
  rotulo text NOT NULL,              -- ex: "Domínio DIGIAI principal", "Instagram Clearix"
  valor text,                        -- URL, handle, domínio
  owner_product text,                -- 'digiai', 'clearix', 'nexus', etc.
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','a_registrar','registrado_sem_uso','arquivado')),
  provider text,                     -- Cloudflare, Google Workspace, etc.
  custo_mensal_brl numeric(10,2),
  custo_anual_brl numeric(10,2),
  vencimento date,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id)
);

CREATE INDEX idx_digital_categoria ON company.digital_assets(categoria);
CREATE INDEX idx_digital_product ON company.digital_assets(owner_product);
CREATE INDEX idx_digital_status ON company.digital_assets(status);

ALTER TABLE company.digital_assets ENABLE ROW LEVEL SECURITY;

CREATE POLICY digital_staff_all ON company.digital_assets FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON company.digital_assets
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_digital AFTER INSERT OR UPDATE OR DELETE ON company.digital_assets
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();
