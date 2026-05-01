-- Migration 008: Finanças — snapshot mensal, custos de infra, receita por produto

-- Snapshot mensal consolidado (um registro por mês)
CREATE TABLE company.financial_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  month date NOT NULL,               -- primeiro dia do mês (ex: '2026-04-01')
  -- Receita
  mrr_total_brl numeric(14,2) NOT NULL DEFAULT 0,
  receita_unica_brl numeric(14,2) NOT NULL DEFAULT 0,
  -- Custos
  custo_infra_brl numeric(14,2) NOT NULL DEFAULT 0,
  custo_ferramentas_brl numeric(14,2) NOT NULL DEFAULT 0,
  custo_pessoas_brl numeric(14,2) NOT NULL DEFAULT 0,
  custo_outros_brl numeric(14,2) NOT NULL DEFAULT 0,
  custo_total_brl numeric(14,2) GENERATED ALWAYS AS (
    custo_infra_brl + custo_ferramentas_brl + custo_pessoas_brl + custo_outros_brl
  ) STORED,
  -- Capital e runway
  saldo_conta_pj_brl numeric(14,2),
  investimento_acumulado_brl numeric(14,2),
  -- Base de clientes
  clientes_pagantes integer NOT NULL DEFAULT 0,
  clientes_trial integer NOT NULL DEFAULT 0,
  leads_qualificados integer NOT NULL DEFAULT 0,
  demos_agendadas integer NOT NULL DEFAULT 0,
  -- Notas
  observacoes text,
  fechado_em timestamptz,            -- quando o snapshot foi "fechado" definitivamente
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES iam.users(id),
  UNIQUE (month)
);

ALTER TABLE company.financial_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY fsnap_staff_all ON company.financial_snapshots FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON company.financial_snapshots
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

CREATE TRIGGER audit_fsnap AFTER INSERT OR UPDATE OR DELETE ON company.financial_snapshots
  FOR EACH ROW EXECUTE FUNCTION iam.tg_audit_log();

-- ========== Custos de infra detalhados por produto/serviço/mês ==========
CREATE TABLE finance.infra_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,          -- 'clearix','nexus','lumina','pulso','polapetit','nipo_school','qual_foto','digiai_app'
  service text NOT NULL,             -- 'Supabase','Vercel','OpenAI','ElevenLabs',...
  month date NOT NULL,
  cost_brl numeric(12,2) NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id),
  UNIQUE (product_id, service, month)
);

CREATE INDEX idx_infra_month ON finance.infra_costs(month);
CREATE INDEX idx_infra_product ON finance.infra_costs(product_id);

ALTER TABLE finance.infra_costs ENABLE ROW LEVEL SECURITY;

CREATE POLICY infra_staff_all ON finance.infra_costs FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON finance.infra_costs
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();

-- ========== Receita por produto/mês ==========
CREATE TABLE finance.revenue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  month date NOT NULL,
  mrr_brl numeric(12,2) NOT NULL DEFAULT 0,
  active_subscriptions integer NOT NULL DEFAULT 0,
  new_subscriptions integer NOT NULL DEFAULT 0,
  churn_count integer NOT NULL DEFAULT 0,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  created_by uuid REFERENCES iam.users(id),
  UNIQUE (product_id, month)
);

CREATE INDEX idx_revenue_month ON finance.revenue(month);
CREATE INDEX idx_revenue_product ON finance.revenue(product_id);

ALTER TABLE finance.revenue ENABLE ROW LEVEL SECURITY;

CREATE POLICY revenue_staff_all ON finance.revenue FOR ALL
  USING (public.is_staff()) WITH CHECK (public.is_staff());

CREATE TRIGGER set_updated_at BEFORE UPDATE ON finance.revenue
  FOR EACH ROW EXECUTE FUNCTION public.tg_set_updated_at();
