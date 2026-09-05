-- ============================================================
-- 088 — View publica de finance.aportes (o painel passa a mostrar quem financiou o caixa)
-- ============================================================
-- Contexto: a 082 criou `finance.aportes` (aporte de CAIXA — investimento /
-- emprestimo / devolucao), distinta do aporte intelectual (nao-caixa). Sem view,
-- a tela Financeiro continuava mostrando "Resultado de caixa -R$ 17k" sem dizer
-- de onde veio o dinheiro que bancou o gasto (DESPACHO InfinitePay §6).
--
-- O schema `finance` NAO esta exposto no PostgREST e segue assim (carrega
-- expenses e snapshots — AGENTS.md §6, lista vermelha). Padrao da casa para
-- leitura do app: view em `public` (v_finance_*), como 052 e 053.
--
-- security_invoker = true e CORRETO aqui (conferido antes de aplicar, licao da
-- 084): `finance.aportes` ja concede SELECT a `authenticated` e tem RLS
-- (`aportes_le`: is_super_admin()). A view executa com os direitos de quem
-- chama, entao a RLS da tabela continua valendo — so super_admin le.
-- ============================================================

CREATE OR REPLACE VIEW public.v_finance_aportes AS
SELECT
  a.id,
  a.data,
  a.origem,
  a.valor_brl,
  a.natureza,
  a.observacao,
  a.created_at
FROM finance.aportes a
WHERE a.deleted_at IS NULL
ORDER BY a.data DESC, a.created_at DESC;

COMMENT ON VIEW public.v_finance_aportes IS
  'Leitura do app: aportes de CAIXA (finance.aportes) sem soft-deletados. Nunca somar com aporte intelectual (expenses.kind=aporte_intelectual / founder_time), que e nao-caixa.';

ALTER VIEW public.v_finance_aportes SET (security_invoker = true);
-- Default privileges do schema public dao ALL a authenticated em objeto novo;
-- o app so le. Revoga tudo e concede apenas SELECT (visto no banco ao aplicar).
REVOKE ALL ON public.v_finance_aportes FROM anon, authenticated, PUBLIC;
GRANT SELECT ON public.v_finance_aportes TO authenticated;

NOTIFY pgrst, 'reload schema';
