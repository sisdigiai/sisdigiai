-- ============================================================
-- 073 — mapa real das contas de anúncio nas 9 BMs do Meta
-- ============================================================
-- Segunda passada do levantamento de 2026-08-15, lendo
-- business.facebook.com/latest/settings/ad_accounts de cada BM.
--
-- O INVENTÁRIO ANTERIOR SOMAVA 12 CONTAS DE ANÚNCIO. EXISTEM 5.
-- O número antigo veio do card do seletor de BM, que conta a mesma conta
-- várias vezes: OTM_TOTAL pertence à Matriz e aparece emprestada em outras
-- duas BMs, sendo contada em cada uma. As 5 contas reais são:
--   DIGIAI_FULL      — BM Digiai
--   OTM_TOTAL        — BM Matriz (120204931561890280), emprestada a Mello e Lancaster
--   OTM_GERAL        — BM São Mateus
--   SAO_MATEUS_OTM   — BM São Mateus       ⚠ DESABILITADA (forma de pagamento)
--   SUZANO_OL        — BM Lancaster        ⚠ DESABILITADA (forma de pagamento)
--
-- Onde cada BM foi conferida com carga completa: quando a lista voltou vazia,
-- a leitura foi refeita e confirmada pelo texto "Nenhuma conta de anúncios
-- adicionada" da própria Meta — vazio verificado, não vazio por página não ter
-- carregado. Perus, Rio Pequeno, Suzano e Pulso são zero de verdade.
--
-- O QUE ISSO MUDA NA DECISÃO DE CONSOLIDAR (072 dizia que Matriz não tinha nada):
-- a Matriz não tem Página nenhuma, mas é DONA da conta de anúncio principal.
-- Ela é a BM do dinheiro. E três das cinco BMs de loja — Perus, Rio Pequeno e
-- Suzano — não têm conta de anúncio alguma: são cascas com uma Página cada.
-- São elas as candidatas seguras a encerrar, porque mover só Página não descarta
-- histórico de gasto. Matriz e São Mateus, não: têm gasto atrelado.
--
-- Só UPDATE em linhas existentes (R-032, tabela do agente do digiai_mkt).
-- Nenhuma coluna nova, nenhum `servico` novo, nenhuma linha nova.
-- WHERE por `empresa_slug` (ASCII), idempotente pelo marcador [mapa-ads].
-- ============================================================

WITH mapa(slug, bloco) AS (
  VALUES
  ('digiai',
   E'[mapa-ads 2026-08-15] Própria: DIGIAI_FULL (1 pessoa, 0 partners). Nenhuma emprestada.'),

  ('mello',
   E'[mapa-ads 2026-08-15] Nenhuma própria. Usa OTM_TOTAL emprestada da BM Matriz (2 pessoas).'),

  ('pulso',
   E'[mapa-ads 2026-08-15] Nenhuma conta de anúncio — confirmado pelo estado vazio da Meta. Publica orgânico.'),

  ('lancaster',
   E'[mapa-ads 2026-08-15] Própria: SUZANO_OL — ⚠ DESABILITADA por forma de pagamento.\n' ||
   E'Também usa OTM_TOTAL emprestada da Matriz.'),

  ('mello-matriz',
   E'[mapa-ads 2026-08-15] Própria: OTM_TOTAL (120204931561890280), 1 pessoa, 2 partners.\n' ||
   E'É a conta de anúncio principal do grupo Mello — emprestada às BMs Oticas Taty Mello e Lancaster.\n' ||
   E'Sem Página própria + com a conta que gasta: esta BM é o centro financeiro, não a Matriz de conteúdo.'),

  ('mello-perus',
   E'[mapa-ads 2026-08-15] Nenhuma conta de anúncio — "Nenhuma conta de anúncios adicionada".\n' ||
   E'Inventário anterior registrava 2. Casca: só a Página.'),

  ('mello-rio-pequeno',
   E'[mapa-ads 2026-08-15] Nenhuma conta de anúncio — estado vazio confirmado. Casca: só a Página.'),

  ('mello-suzano',
   E'[mapa-ads 2026-08-15] Nenhuma conta de anúncio — estado vazio confirmado. Casca: só a Página.'),

  ('mello-sao-mateus',
   E'[mapa-ads 2026-08-15] Duas próprias: OTM_GERAL (2 pessoas) e SAO_MATEUS_OTM\n' ||
   E'(⚠ DESABILITADA por forma de pagamento). Única BM de loja com conta de anúncio própria.')
)
UPDATE ops.contas_servicos c
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(c.obs, ''), '[mapa-ads', 1), E'\n '), ''),
      m.bloco),
    ultima_verificacao = now(),
    updated_at = now()
FROM mapa m
WHERE c.servico = 'meta_bm'
  AND c.empresa_slug = m.slug;

NOTIFY pgrst, 'reload schema';
