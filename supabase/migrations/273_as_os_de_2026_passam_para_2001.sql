-- ============================================================
-- 273 — as OS de 2026 passam de 2.004 para 2.001 (PREPARADA, TRAVADA NA FOLHA)
--
-- Saiu da 272 em 25/11, a pedido do Geral, e por um motivo que é o mesmo que eu já tinha escrito:
-- **a folha única tem trava neste número** até o eco gravar em arquivo a consulta e o resultado,
-- conferidos pelo Vendas (prazo qui 26/11 12h). Gravar aqui antes disso poria no gerador do MKT um
-- número ainda em medição. A comissão, que não depende da trava, seguiu sozinha na 272.
--
-- DUAS PALAVRAS, NÃO UMA: além da palavra do dono no canal deste app, esta migration espera o
-- "trava tirada" do Geral, que é quem guarda a folha. Só as duas juntas liberam.
--
-- ─────────────────────────────────────────────────────────────────────────────
-- SEGUNDA PARTE, do mesmo turno: AS OS DE 2026 SÃO 1.999, NÃO 2.004.
--
-- TRÊS NÚMEROS NO MESMO DIA, e é por isso que este comentário é longo:
--   · 24/11 — **2.004** (eco). Entrou na 271, escrita por mim.
--   · 25/11 18h11 — **1.999** (eco): "o 2.004 contava venda cancelada", tirando por `status`.
--   · 25/11 18h36 — **2.001** (eco, corrigindo a própria correção). **O Vendas, que é o dono do
--     cancelamento, fixou a régua da casa: venda cancelada é `deleted_at IS NULL AND is_cancelled
--     IS TRUE`, nunca `status`.** O 2.004 contava 3 canceladas; o 1.999 tirava também 2 pedidos que
--     só tinham `status = 'cancelled'` — e esses são venda de verdade.
-- Nascidas no balcão, pela mesma régua: **1.992 de 2.001** (o 1.995 durou 26 minutos).
--
-- O 1.999 chegou a estar preparado aqui e NÃO foi aplicado, porque a palavra do dono não tinha
-- chegado. Foi sorte de calendário, não método — e a lição fica: **número que muda duas vezes em
-- meia hora não é número, é medição em curso.** Quem aplicar isto confere a folha única antes: ela
-- é o portão do número público (CLAUDE.md §5), e foi ela que me disse qual dos três vale.
--
-- A régua vai escrita na `fonte` dos dois fatos, porque o próximo que remedir precisa saber **por
-- qual critério** o número foi feito — foi a falta disso que produziu as três leituras.
--
-- O que NÃO muda: a repartição 1.494 / 493 / 8 / 9 foi medida sobre 2.004 e não foi refeita sem as
-- canceladas — por isso ela continua fora de qualquer frase, como já estava, e o `uso_restrito` do
-- fato de OS segue dizendo que "no dia da venda" é proibido.
--
-- ============================================================
begin;
-- ── as OS de 2026: 2.004 → 2.001 ──────────────────────────────────────────────
do $$ declare n int; begin
  select count(*) into n from mkt.fatos
   where chave in ('clearix_os_2026','digiai_prova_operacao') and valor_numerico = 2004;
  if n <> 2 then raise exception 'esperava os dois fatos de OS em 2004, achei % — alguem ja reescreveu', n; end if;
end $$;

update mkt.fatos set
  fato = 'Em 2026, 2.001 OS na loja viva da rede da casa; 1.992 nasceram no balcão, não por carga (medido em 24/11/2026).',
  valor_numerico = 2001,
  fonte = 'folha única · Remedição de 24/11/2026, corrigida em 25/11 18h36 (eco, crm_erp, sales_finance.orders) · RÉGUA DA CASA, fixada pelo Vendas em 25/11: venda cancelada é "deleted_at IS NULL AND is_cancelled IS TRUE", nunca por status — o 2.004 contava 3 canceladas e o 1.999 tirava 2 vendas de verdade que só tinham status cancelled · "no dia da venda" nunca foi literal: o critério, de setembro e de hoje, é "criada até 2 dias depois da data da venda", que só separa balcão de carga.',
  updated_at = now()
where chave = 'clearix_os_2026';

update mkt.fatos set
  fato = 'A DIGIAI opera o próprio varejo óptico dentro do Clearix: uma rede da casa, com 1 loja vendendo todo dia e 2.001 OS em 2026 (medido em 24/11/2026).',
  valor_numerico = 2001,
  fonte = 'folha única · Remedição de 24/11/2026, corrigida em 25/11 18h36 (eco) · RÉGUA DA CASA, fixada pelo Vendas em 25/11: venda cancelada é "deleted_at IS NULL AND is_cancelled IS TRUE", nunca por status.',
  updated_at = now()
where chave = 'digiai_prova_operacao';

-- ── a conferência ─────────────────────────────────────────────────────────────
do $$ begin
  -- nenhum dos dois números mortos do dia sobrevive, e o novo diz "das 2.001"
  -- nenhum dos dois números mortos do dia sobrevive, e a régua ficou escrita
  if exists (select 1 from mkt.fatos where fato like '%2.004%' or fato like '%1.999%'
              or fato like '%1.995 nasceram%' or valor_numerico in (2004, 1999)) then
    raise exception 'um numero morto do dia (2.004 ou 1.999/1.995) ainda esta em algum fato'; end if;
  if (select count(*) from mkt.fatos where valor_numerico = 2001 and ativo) <> 2 then
    raise exception 'esperava os dois fatos de OS em 2.001 e ativos, achei %',
      (select count(*) from mkt.fatos where valor_numerico = 2001 and ativo); end if;
  if not exists (select 1 from mkt.fatos where chave='clearix_os_2026' and fato like '%1.992 nasceram no balcão%') then
    raise exception 'o fato das OS perdeu a parte que diz o que o criterio separa'; end if;
  if (select count(*) from mkt.fatos where fonte like '%RÉGUA DA CASA%' and valor_numerico = 2001) <> 2 then
    raise exception 'a regua do cancelamento nao ficou escrita na fonte dos dois'; end if;
end $$;

commit;

-- Reversão: `Cockpit/controle/volta-fato-comissao-2026-11-25.sql` (segunda metade do arquivo, com o
-- estado 2.004 das duas linhas, lido do banco antes de qualquer escrita). Nenhum delete.
