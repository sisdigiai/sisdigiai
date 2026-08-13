-- ============================================================
-- 052 — View publica de finance.revenue (conserta 406 no Financeiro)
-- ============================================================
-- Bug encontrado 2026-08-13: financeStore.listRevenue() chamava
-- supabase.schema('finance').from('revenue'). O schema `finance` NAO esta na
-- lista de schemas expostos do PostgREST (public, graphql_public, marketing,
-- company, ops, mkt, mello_fabrica, mello_medicao) — resposta 406, engolida
-- pelo `if (error) return []`. Efeito: grafico de MRR sempre vazio, sem
-- distinguir "sem receita" de "query quebrada".
--
-- Correcao pela via da casa: view em `public` (padrao v_finance_*), e NAO
-- expor o schema `finance` inteiro — ele carrega expenses/snapshots, que sao
-- dado sensivel (AGENTS.md §6, lista vermelha).
--
-- security_invoker = true: a RLS de finance.revenue (policy revenue_staff_all,
-- is_staff()) continua valendo para quem consulta. Sem RLS nova.
-- ============================================================

CREATE OR REPLACE VIEW public.v_finance_revenue AS
SELECT
  r.id,
  r.month,
  r.product_id,
  p.name AS product_name,
  r.mrr_brl,
  r.one_time_brl,
  r.active_subscriptions,
  r.new_subscriptions,
  r.churn_count,
  r.sales_count,
  r.refund_count,
  r.notes
FROM finance.revenue r
LEFT JOIN finance.products p ON p.id = r.product_id
WHERE r.deleted_at IS NULL
ORDER BY r.month DESC, r.product_id;

ALTER VIEW public.v_finance_revenue SET (security_invoker = true);
REVOKE ALL ON public.v_finance_revenue FROM anon;
GRANT SELECT ON public.v_finance_revenue TO authenticated;

NOTIFY pgrst, 'reload schema';
