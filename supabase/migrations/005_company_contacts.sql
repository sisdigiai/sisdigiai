-- Migration 005: Contatos profissionais (contador, advogado, consultores)

CREATE TABLE company.contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('contador','advogado_tech','advogado_lgpd','consultor_tributario','consultor_tecnico','outro')),
  nome text NOT NULL,
  empresa text,
  email text,
  telefone text,
  whatsapp text,
  custo_mensal_brl numeric(10,2),
  custo_hora_brl numeric(10,2),
  modelo_cobranca text CHECK (modelo_cobranca IN ('mensal','hora','projeto','sob_demanda') OR modelo_cobranca IS NULL),
  observacoes text,
  ativo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id)
);

CREATE INDEX idx_contacts_tipo ON company.contacts(tipo);
CREATE INDEX idx_contacts_ativo ON company.contacts(ativo);

ALTER TABLE company.contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY contacts_staff_all ON company.contacts FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON company.contacts
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_contacts AFTER INSERT OR UPDATE OR DELETE ON company.contacts
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();
