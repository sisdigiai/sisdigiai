-- ============================================================
-- 080 — estado real dos canais de venda: cinco estados, não dois
-- ============================================================
-- CORREÇÃO DE UM ERRO MEU, DE ONTEM. A `v_vendas_canais` da migration 079 tinha
-- só dois estados: 'ativo' e 'sem integracao'. Isso rotulou o Hotmart como "sem
-- integração", que manda o dono construir algo já construído.
--
-- O QUE EU CONFERI DEPOIS, e por isso a correção:
--   · edge function `hotmart-webhook` .... ACTIVE, versão 25
--   · segredo `HOTMART_HOTTOK` ........... configurado
--   · `marketing.hotmart_sales` .......... existe, 0 linhas
--   · `marketing.hotmart_events_raw` ..... 1 evento, 01/08 20:35:04
-- E esse único evento NÃO veio do Hotmart: payload `{}` vazio, nenhum cabeçalho de
-- assinatura, IP residencial brasileiro. Foi teste manual — o `billing.mp_events_raw`
-- registrou 2 eventos às 20:35:06 do mesmo dia, dois segundos depois. Mesma sessão
-- de teste batendo em todos os webhooks em sequência.
--
-- Conclusão: do nosso lado o cano está inteiro. Falta a URL de postback registrada no
-- painel do Hotmart — coisa de dois minutos, que ninguém faria se a tela dissesse
-- "sem integração" e sugerisse desenvolvimento.
--
-- "Zero venda" tem causas diferentes que pedem ações opostas, e um painel que as
-- funde é pior que um painel vazio:
--   nunca chamado ......... falta configurar o postback no painel do fornecedor
--   assinatura rejeitada .. o segredo divergiu; conferir HOTTOK/token
--   só teste manual ....... alguém bateu no endpoint, o fornecedor não
--   recebendo sem venda ... o cano funciona e ninguém comprou
--   ativo ................. tem venda
--
-- Só views. Nenhuma tabela alterada.
-- ============================================================

-- DROP antes do CREATE: `CREATE OR REPLACE VIEW` não renomeia coluna, e
-- `pagamentos_reais` virou `vendas_reais` — o nome antigo dizia "pagamento" onde o
-- conceito é venda, e no Hotmart pagamento e venda não são a mesma coisa. A tela é
-- atualizada no mesmo push; o contrato muda nos dois lados junto.
DROP VIEW IF EXISTS public.v_vendas_canais;

CREATE VIEW public.v_vendas_canais
WITH (security_invoker = true) AS

WITH base AS (
  -- MercadoPago: recorrência. Venda real = pagamento com paid_at.
  SELECT
    'mercadopago'::text AS canal,
    'Recorrência: Clearix, digiai, nexus, Lumina, easyidiomas'::text AS cobre,
    (SELECT count(*) FROM billing.payments WHERE paid_at IS NOT NULL) AS vendas,
    (SELECT count(*) FROM billing.mp_events_raw) AS eventos,
    (SELECT count(*) FROM billing.mp_events_raw WHERE signature_ok) AS eventos_validos,
    (SELECT max(received_at) FROM billing.mp_events_raw) AS ultimo_evento,
    (SELECT count(*) FROM billing.subscribers WHERE deleted_at IS NULL) AS assinantes

  UNION ALL

  -- Hotmart: avulso / infoproduto (OSI).
  SELECT
    'hotmart',
    'Avulso: OSI e infoprodutos (marketplace-first)',
    (SELECT count(*) FROM marketing.hotmart_sales),
    (SELECT count(*) FROM marketing.hotmart_events_raw),
    (SELECT count(*) FROM marketing.hotmart_events_raw WHERE signature_ok),
    (SELECT max(received_at) FROM marketing.hotmart_events_raw),
    NULL::bigint

  UNION ALL

  -- Kiwify: segundo marketplace. Não tem tabela de vendas própria ainda — só raw.
  SELECT
    'kiwify',
    'Avulso: segundo marketplace (sem tabela de vendas própria)',
    0,
    (SELECT count(*) FROM marketing.kiwify_events_raw),
    (SELECT count(*) FROM marketing.kiwify_events_raw WHERE signature_ok),
    (SELECT max(received_at) FROM marketing.kiwify_events_raw),
    NULL::bigint
)
SELECT
  canal,
  cobre,
  vendas         AS vendas_reais,
  eventos        AS eventos_recebidos,
  eventos_validos,
  ultimo_evento,
  assinantes,
  CASE WHEN ultimo_evento IS NULL THEN NULL
       ELSE (current_date - ultimo_evento::date) END AS dias_desde_evento,
  -- Recência importa: cano que validou uma chamada há 16 dias e calou desde nao esta
  -- "recebendo". Sem esse corte, um teste manual antigo faz o painel jurar que o cano
  -- esta vivo — que e exatamente o erro que a audiencia do MKT cometeu por 39 dias.
  CASE
    WHEN vendas > 0                                                    THEN 'ativo'
    WHEN eventos_validos > 0 AND current_date - ultimo_evento::date <= 7
                                                                       THEN 'recebendo sem venda'
    WHEN eventos_validos > 0                                           THEN 'validou uma vez, silencioso desde'
    WHEN eventos > 0                                                   THEN 'so teste manual'
    ELSE                                                                    'nunca chamado'
  END AS estado,
  CASE
    WHEN vendas > 0                                                    THEN NULL
    WHEN eventos_validos > 0 AND current_date - ultimo_evento::date <= 7
                                                                       THEN 'Cano funcionando. Ninguém comprou ainda.'
    WHEN eventos_validos > 0                                           THEN 'Autenticou uma chamada e nunca mais recebeu. Conferir se o postback segue ativo no painel do fornecedor.'
    WHEN eventos > 0                                                   THEN 'Endpoint no ar e o fornecedor nunca chamou de verdade. Registrar a URL de postback no painel dele.'
    ELSE                                                                    'Nenhuma chamada registrada. Conferir se a URL de postback está no painel do fornecedor.'
  END AS pendencia
FROM base
ORDER BY vendas DESC, canal;

REVOKE ALL ON public.v_vendas_canais FROM anon;
GRANT SELECT ON public.v_vendas_canais TO authenticated;

NOTIFY pgrst, 'reload schema';
