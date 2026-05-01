-- Migration 007: Inventário de ferramentas pagas (stack operacional)

CREATE TABLE company.tools (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,                -- ex: "Supabase", "Vercel", "OpenAI"
  categoria text NOT NULL CHECK (categoria IN (
    'infraestrutura','ia','email','financeiro','crm','marketing',
    'juridico','colaboracao','design','monitoramento','outro'
  )),
  owner_product text,                -- qual produto usa (pode ser 'digiai' ou null para uso geral)
  plano text,                        -- 'Free', 'Pro', 'Team', 'Enterprise'
  custo_mensal_brl numeric(10,2),
  custo_anual_brl numeric(10,2),
  moeda text NOT NULL DEFAULT 'BRL' CHECK (moeda IN ('BRL','USD','EUR')),
  data_inicio date,
  proximo_vencimento date,
  renovacao_automatica boolean DEFAULT true,
  url_dashboard text,
  email_conta text,                  -- qual email está cadastrado na ferramenta
  contato_suporte text,
  status text NOT NULL DEFAULT 'ativo' CHECK (status IN ('ativo','avaliando','cancelado','congelado')),
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id)
);

CREATE INDEX idx_tools_categoria ON company.tools(categoria);
CREATE INDEX idx_tools_status ON company.tools(status);
CREATE INDEX idx_tools_vencimento ON company.tools(proximo_vencimento);

ALTER TABLE company.tools ENABLE ROW LEVEL SECURITY;

CREATE POLICY tools_staff_all ON company.tools FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON company.tools
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_tools AFTER INSERT OR UPDATE OR DELETE ON company.tools
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();
