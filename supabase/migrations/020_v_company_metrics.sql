-- View pública pra company.metrics — frontend lê via PostgREST sem expor schema company.
-- RLS aplicada pela tabela base (metrics_staff_read).

CREATE OR REPLACE VIEW public.v_company_metrics AS
SELECT
  id, source, metric_type, metric_key,
  value_numeric, value_text, metadata,
  period, period_start, period_end,
  collected_at, created_at
FROM company.metrics;

GRANT SELECT ON public.v_company_metrics TO authenticated;

COMMENT ON VIEW public.v_company_metrics IS
  'Espelho público de company.metrics pra frontend. RLS herdada da tabela base (metrics_staff_read).';
