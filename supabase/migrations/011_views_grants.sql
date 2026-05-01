-- Migration 011: Views v_* em public + grants/revokes
-- Padrão: schemas privados não expostos via PostgREST. Só views em public.

-- ========== Views ==========
CREATE OR REPLACE VIEW public.v_company_identity AS
SELECT * FROM company.identity WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_company_partners AS
SELECT * FROM company.partners WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_company_contacts AS
SELECT * FROM company.contacts WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_company_digital_assets AS
SELECT * FROM company.digital_assets WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_company_tools AS
SELECT * FROM company.tools WHERE deleted_at IS NULL;

CREATE OR REPLACE VIEW public.v_company_financial_snapshots AS
SELECT * FROM company.financial_snapshots ORDER BY month DESC;

CREATE OR REPLACE VIEW public.v_company_legal_status AS
SELECT * FROM company.legal_status;

CREATE OR REPLACE VIEW public.v_backlog_items AS
SELECT * FROM ops.backlog_items WHERE deleted_at IS NULL ORDER BY priority, created_at;

CREATE OR REPLACE VIEW public.v_decisions AS
SELECT * FROM ops.decisions WHERE deleted_at IS NULL ORDER BY decided_at DESC;

CREATE OR REPLACE VIEW public.v_milestones AS
SELECT * FROM ops.milestones WHERE deleted_at IS NULL ORDER BY phase, target_date;

CREATE OR REPLACE VIEW public.v_infra_costs AS
SELECT * FROM finance.infra_costs WHERE deleted_at IS NULL ORDER BY month DESC, product_id;

CREATE OR REPLACE VIEW public.v_revenue AS
SELECT * FROM finance.revenue WHERE deleted_at IS NULL ORDER BY month DESC, product_id;

CREATE OR REPLACE VIEW public.v_audit_logs AS
SELECT * FROM iam.audit_logs ORDER BY created_at DESC LIMIT 1000;

-- ========== Revokes obrigatórios ==========
-- anon não acessa NADA
REVOKE ALL ON SCHEMA iam FROM anon;
REVOKE ALL ON SCHEMA ops FROM anon;
REVOKE ALL ON SCHEMA metrics FROM anon;
REVOKE ALL ON SCHEMA finance FROM anon;
REVOKE ALL ON SCHEMA commercial FROM anon;
REVOKE ALL ON SCHEMA company FROM anon;
REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon;

-- authenticated precisa de USAGE nos schemas (para ver views que referenciam)
GRANT USAGE ON SCHEMA iam TO authenticated;
GRANT USAGE ON SCHEMA ops TO authenticated;
GRANT USAGE ON SCHEMA metrics TO authenticated;
GRANT USAGE ON SCHEMA finance TO authenticated;
GRANT USAGE ON SCHEMA commercial TO authenticated;
GRANT USAGE ON SCHEMA company TO authenticated;

-- authenticated só pode fazer SELECT/INSERT/UPDATE/DELETE nas tabelas privadas
-- (RLS garante isolamento por is_staff())
GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA iam TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA ops TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA finance TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA company TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA metrics TO authenticated;

-- Views em public
GRANT SELECT ON public.v_company_identity TO authenticated;
GRANT SELECT ON public.v_company_partners TO authenticated;
GRANT SELECT ON public.v_company_contacts TO authenticated;
GRANT SELECT ON public.v_company_digital_assets TO authenticated;
GRANT SELECT ON public.v_company_tools TO authenticated;
GRANT SELECT ON public.v_company_financial_snapshots TO authenticated;
GRANT SELECT ON public.v_company_legal_status TO authenticated;
GRANT SELECT ON public.v_backlog_items TO authenticated;
GRANT SELECT ON public.v_decisions TO authenticated;
GRANT SELECT ON public.v_milestones TO authenticated;
GRANT SELECT ON public.v_infra_costs TO authenticated;
GRANT SELECT ON public.v_revenue TO authenticated;
GRANT SELECT ON public.v_audit_logs TO authenticated;

-- Sequences (para INSERT com default)
GRANT USAGE ON ALL SEQUENCES IN SCHEMA iam TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA ops TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA finance TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA company TO authenticated;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA metrics TO authenticated;
