-- ============================================================
-- 079 — vendas dos produtos DIGIAI: fluxo de eventos, não total do dia
-- ============================================================
-- Escopo: SÓ os produtos da própria DIGIAI (Clearix, OSI, digiai, nexus, Lumina,
-- easyidiomas, qualfoto, e futura assinatura do Limelight). Varejo óptico NÃO entra
-- aqui — vive no banco do Clearix, que este app deliberadamente não lê (ADR-0001 /
-- R-009). Lancaster e Mello são base de autoridade de conteúdo, não fonte de venda.
--
-- POR QUE EVENTO E NÃO TOTAL: em recorrência contínua — e o dono decidiu que não
-- será venda estilo lançamento — um único número "vendas de hoje" mistura três
-- coisas que decidem diferente:
--     assinatura nova .... MRR novo. É crescimento.
--     renovação .......... caixa de MRR que já existia. NÃO é crescimento.
--     cancelamento ....... MRR saindo.
-- Um dia com 20 renovações e 0 assinaturas novas, somado, parece excelente. É um dia
-- sem venda. Essa é a mesma doença das duas contagens que custou caro esta semana,
-- só com outro rosto. Então a view devolve o EVENTO classificado, e a tela soma.
--
-- DUAS NATUREZAS, DOIS CANOS:
--   · recorrência (Clearix, digiai, nexus, Lumina, Limelight, easyidiomas) chega pelo
--     MercadoPago — `billing.*`, que existe e está pronto.
--   · avulso (OSI é infoproduto, marketplace-first) chega pelo Hotmart/Kiwify —
--     `v_marketing_hotmart_sales`, que hoje tem 0 linhas e NENHUMA integração ligada.
--
-- O produto do lado Hotmart fica NULO de propósito. Não existe mapa
-- product_name → finance.products testado, e inventar um faria a primeira venda real
-- ser atribuída errado em silêncio. Nulo com o nome de origem preservado força a
-- lacuna a aparecer na tela no dia em que o cano ligar.
--
-- ESTADO HOJE, medido antes de escrever: billing.subscribers 0 linhas,
-- billing.payments 1 linha que é TESTE (mp_payment_id '123456', tudo nulo, sem
-- assinante), mp_events_raw 2 linhas. Ou seja: zero venda real. O filtro
-- `paid_at IS NOT NULL` exclui a linha de teste — tela de vendas que conta seed como
-- receita é pior que tela vazia.
--
-- LIMITE CONHECIDO, registrado em vez de escondido: não existe histórico de status de
-- assinante. A data do cancelamento é aproximada por coalesce(deleted_at, updated_at).
-- Se a precisão do churn diário passar a importar, isso pede tabela de eventos de
-- assinatura — não dá para derivar do estado atual.
-- ============================================================

CREATE OR REPLACE VIEW public.v_vendas_eventos
WITH (security_invoker = true) AS

-- Recorrência via MercadoPago. Primeira cobrança do assinante = venda nova;
-- as seguintes = renovação. Comparar com `started_on` sozinho não serve: assinante
-- migrado tem started_on antigo e primeira cobrança recente.
WITH primeira AS (
  SELECT subscriber_id, min(paid_at) AS primeiro_pago
  FROM billing.payments
  WHERE paid_at IS NOT NULL AND subscriber_id IS NOT NULL
  GROUP BY subscriber_id
)
SELECT
  p.paid_at::date                        AS dia,
  s.product                              AS produto,
  pr.name                                AS produto_nome,
  CASE WHEN p.paid_at = f.primeiro_pago THEN 'nova' ELSE 'renovacao' END AS tipo,
  p.amount_brl                           AS valor,
  'mercadopago'                          AS canal,
  s.plan_name                            AS plano,
  s.name                                 AS cliente,
  p.status                               AS status_origem,
  NULL::text                             AS produto_nome_origem
FROM billing.payments p
JOIN primeira f  ON f.subscriber_id = p.subscriber_id
JOIN billing.subscribers s ON s.id = p.subscriber_id
LEFT JOIN finance.products pr ON pr.id = s.product
WHERE p.paid_at IS NOT NULL
  AND s.deleted_at IS NULL

UNION ALL

-- Avulso via Hotmart. `produto` fica nulo até existir mapa testado; o nome de origem
-- viaja em `produto_nome_origem` para a tela poder mostrar "não mapeado".
SELECT
  h.purchase_date::date,
  NULL::text,
  NULL::text,
  'avulsa',
  h.price_value_cents / 100.0,
  'hotmart',
  NULL::text,
  h.buyer_name,
  h.status,
  h.product_name
FROM public.v_marketing_hotmart_sales h
WHERE h.purchase_date IS NOT NULL

UNION ALL

-- Cancelamento: MRR saindo, com valor negativo para somar direto no líquido do dia.
SELECT
  coalesce(s.deleted_at, s.updated_at)::date,
  s.product,
  pr.name,
  'cancelamento',
  -1 * coalesce(s.plan_amount_brl, 0),
  'mercadopago',
  s.plan_name,
  s.name,
  s.status,
  NULL::text
FROM billing.subscribers s
LEFT JOIN finance.products pr ON pr.id = s.product
WHERE (s.status IN ('cancelado', 'cancelled', 'canceled') OR s.deleted_at IS NOT NULL)
  AND coalesce(s.deleted_at, s.updated_at) IS NOT NULL;

REVOKE ALL ON public.v_vendas_eventos FROM anon;
GRANT SELECT ON public.v_vendas_eventos TO authenticated;

-- ── Estado dos canos de venda: conectado, sem integração, ou só teste ──
-- Existe para a tela nunca mostrar zero onde a resposta certa é "não conectado".
-- Canal sem integração exibindo R$ 0 convida a concluir que não vendeu, quando a
-- verdade é que não haveria como saber.
CREATE OR REPLACE VIEW public.v_vendas_canais
WITH (security_invoker = true) AS
SELECT
  'mercadopago'::text AS canal,
  'Recorrência (Clearix, digiai, nexus, Lumina, easyidiomas)'::text AS cobre,
  (SELECT count(*) FROM billing.payments WHERE paid_at IS NOT NULL) AS pagamentos_reais,
  (SELECT count(*) FROM billing.subscribers WHERE deleted_at IS NULL) AS assinantes,
  CASE
    WHEN (SELECT count(*) FROM billing.payments WHERE paid_at IS NOT NULL) > 0 THEN 'ativo'
    WHEN (SELECT count(*) FROM billing.mp_events_raw) > 0 THEN 'ligado sem venda'
    ELSE 'sem integracao'
  END AS estado
UNION ALL
SELECT
  'hotmart',
  'Avulso / infoproduto (OSI)',
  (SELECT count(*) FROM public.v_marketing_hotmart_sales),
  NULL,
  CASE WHEN (SELECT count(*) FROM public.v_marketing_hotmart_sales) > 0
       THEN 'ativo' ELSE 'sem integracao' END;

REVOKE ALL ON public.v_vendas_canais FROM anon;
GRANT SELECT ON public.v_vendas_canais TO authenticated;

NOTIFY pgrst, 'reload schema';
