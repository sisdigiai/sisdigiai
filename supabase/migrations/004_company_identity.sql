-- Migration 004: Cadastro da identidade legal da empresa
-- Tabela singleton: sempre 1 linha (ou 0). Corresponde à aba "Identidade Legal" do form.

CREATE TABLE company.identity (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Dados básicos
  razao_social text,
  nome_fantasia text DEFAULT 'DIGIAI',
  cnpj text,
  inscricao_estadual text,
  inscricao_municipal text,
  forma_juridica text CHECK (forma_juridica IN ('MEI','LTDA','EIRELI','SA','SLU','outro') OR forma_juridica IS NULL),
  natureza_juridica text,
  data_abertura date,
  capital_social numeric(14,2),
  -- Endereço
  endereco_logradouro text,
  endereco_numero text,
  endereco_complemento text,
  endereco_bairro text,
  endereco_cep text,
  endereco_cidade text,
  endereco_uf text,
  -- Regime tributário
  regime_tributario text CHECK (regime_tributario IN ('simples_nacional','lucro_presumido','lucro_real','mei') OR regime_tributario IS NULL),
  simples_anexo text,
  aliquota_estimada numeric(5,2),
  -- CNAEs (armazenados como array de objetos)
  cnae_principal_codigo text,
  cnae_principal_descricao text,
  cnaes_secundarios jsonb NOT NULL DEFAULT '[]'::jsonb,
  -- Certificado digital
  certificado_digital_tipo text CHECK (certificado_digital_tipo IN ('A1','A3','nao_possui') OR certificado_digital_tipo IS NULL),
  certificado_digital_vencimento date,
  -- Representante legal
  representante_nome text,
  representante_cpf text,
  representante_rg text,
  representante_email text,
  -- Metadados
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id),
  updated_by uuid REFERENCES iam.users(id)
);

-- Constraint: só pode existir 1 registro ativo
CREATE UNIQUE INDEX idx_company_identity_singleton
  ON company.identity ((deleted_at IS NULL))
  WHERE deleted_at IS NULL;

ALTER TABLE company.identity ENABLE ROW LEVEL SECURITY;

CREATE POLICY identity_staff_all ON company.identity FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON company.identity
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_identity AFTER INSERT OR UPDATE OR DELETE ON company.identity
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ========== Sócios (tabela filha) ==========
CREATE TABLE company.partners (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_id uuid NOT NULL REFERENCES company.identity(id) ON DELETE CASCADE,
  nome text NOT NULL,
  cpf text NOT NULL,
  percent_cotas numeric(5,2) NOT NULL,
  papel text NOT NULL DEFAULT 'socio' CHECK (papel IN ('socio','socio_administrador','administrador_nao_socio')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

ALTER TABLE company.partners ENABLE ROW LEVEL SECURITY;

CREATE POLICY partners_staff_all ON company.partners FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON company.partners
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_partners AFTER INSERT OR UPDATE OR DELETE ON company.partners
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();
