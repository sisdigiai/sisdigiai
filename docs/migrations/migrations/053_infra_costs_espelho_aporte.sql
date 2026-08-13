-- ============================================================
-- 053 — finance.infra_costs recebe o espelho do aporte 7.4 do Finance
-- ============================================================
-- O espelho vem da edge `espelho-aporte-digiai` do crm_erp (view agregada
-- v_espelho_aporte_digiai, sem PII). A tabela nao comportava o dado inteiro:
-- sobrava so `notes` como campo livre, e enfiar 4 informacoes estruturadas num
-- texto e como se perde dado.
--
-- `parcial` e a coluna que mais importa: o extrato da InfinitePay vai ate dia 12,
-- entao agosto tem 11 lancamentos contra 37 de julho. Sem essa marca o painel
-- mostraria QUEDA DE 83% no custo de infra — conclusao errada que viraria decisao.
--
-- `conta_pagadora` entra na chave unica: Supabase pago pela conta DIGIAI e pela
-- conta da otica no mesmo mes sao duas linhas legitimas; sem isso uma sobrescreve
-- a outra silenciosamente.
--
-- Tabela esta VAZIA (0 linhas) — nenhum dado em risco.
-- ============================================================

ALTER TABLE finance.infra_costs
  ADD COLUMN IF NOT EXISTS conta_pagadora  text,
  ADD COLUMN IF NOT EXISTS lancamentos     integer,
  ADD COLUMN IF NOT EXISTS parcial         boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS extrato_ate     date,
  ADD COLUMN IF NOT EXISTS sincronizado_em timestamptz;

COMMENT ON COLUMN finance.infra_costs.parcial IS
  'Mes ainda nao coberto pelo extrato de origem. NUNCA usar linha parcial em comparativo mes a mes.';
COMMENT ON COLUMN finance.infra_costs.conta_pagadora IS
  'Conta que pagou: DIGIAI ou Lancaster/otica. Vem do sufixo da descricao do extrato, nao de campo estruturado.';
COMMENT ON COLUMN finance.infra_costs.sincronizado_em IS
  'Quando o espelho foi sincronizado. Valor BRUTO: cashback/reembolso (~0,9%) nao abatidos.';

ALTER TABLE finance.infra_costs
  DROP CONSTRAINT IF EXISTS infra_costs_product_id_service_month_key;

ALTER TABLE finance.infra_costs
  ADD CONSTRAINT infra_costs_produto_servico_mes_conta_key
  UNIQUE (product_id, service, month, conta_pagadora);

-- View publica (o schema `finance` nao esta exposto no PostgREST — ver migration 052)
CREATE OR REPLACE VIEW public.v_finance_infra_costs AS
SELECT
  c.id, c.product_id, c.service, c.month, c.cost_brl,
  c.conta_pagadora, c.lancamentos, c.parcial, c.extrato_ate,
  c.sincronizado_em, c.notes
FROM finance.infra_costs c
WHERE c.deleted_at IS NULL
ORDER BY c.month DESC, c.cost_brl DESC;

ALTER VIEW public.v_finance_infra_costs SET (security_invoker = true);
REVOKE ALL ON public.v_finance_infra_costs FROM anon;
GRANT SELECT ON public.v_finance_infra_costs TO authenticated;

NOTIFY pgrst, 'reload schema';
