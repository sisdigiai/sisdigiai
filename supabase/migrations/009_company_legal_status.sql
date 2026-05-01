-- Migration 009: Status legal (LGPD, contratos, ToS, DPO)

-- Singleton: 1 registro com status atual
CREATE TABLE company.legal_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  -- DPO
  dpo_nomeado boolean NOT NULL DEFAULT false,
  dpo_nome text,
  dpo_email text,
  dpo_telefone text,
  dpo_nomeado_em date,
  -- Políticas publicadas
  politica_privacidade_publicada boolean NOT NULL DEFAULT false,
  politica_privacidade_url text,
  politica_privacidade_versao text,
  politica_privacidade_publicada_em date,
  -- ToS
  tos_publicado boolean NOT NULL DEFAULT false,
  tos_url text,
  tos_versao text,
  tos_publicado_em date,
  -- MSA / DPA templates
  msa_template_pronto boolean NOT NULL DEFAULT false,
  msa_template_url text,
  dpa_template_pronto boolean NOT NULL DEFAULT false,
  dpa_template_url text,
  -- Advogado revisor
  advogado_revisao_feita boolean NOT NULL DEFAULT false,
  advogado_revisao_data date,
  advogado_contato_id uuid REFERENCES company.contacts(id),
  -- Checklist LGPD
  registro_operacoes_tratamento boolean NOT NULL DEFAULT false,
  canal_titular_ativo boolean NOT NULL DEFAULT false,
  plano_incidentes_pronto boolean NOT NULL DEFAULT false,
  criptografia_repouso boolean NOT NULL DEFAULT false,
  criptografia_transito boolean NOT NULL DEFAULT true,
  controle_acesso_minimo_privilegio boolean NOT NULL DEFAULT false,
  backup_definido boolean NOT NULL DEFAULT false,
  treinamento_lgpd_time boolean NOT NULL DEFAULT false,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES iam.users(id)
);

CREATE UNIQUE INDEX idx_legal_status_singleton ON company.legal_status ((true));

ALTER TABLE company.legal_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY legal_staff_all ON company.legal_status FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON company.legal_status
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_legal AFTER INSERT OR UPDATE OR DELETE ON company.legal_status
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();
