-- 123 — Lancaster cliente-zero: assinatura retroativa do Clearix Completo + encontro de contas
--
-- ⚠ NÃO APLICADA, e NÃO APLICÁVEL como está: os dois números de decisão abaixo estão
--    NULOS de propósito e a trava recusa enquanto estiverem. Portão 113 (desenho
--    Cockpit/desenho-lancaster-cliente-zero-2026-09-11.md). Dado real de dinheiro.
--
-- ORDEM:
--   1. 126 aplicada (substituiu a 122: parte_relacionada em receita e assinantes; gate e placar só contam mercado).
--   2. Dono decide: PREÇO mensal do Completo e DATA de início (10/03 ou 01/04/2026).
--   3. Contador valida a forma (portão 74): NF de serviço, compensação ou pagamento.
--   4. Front da tela Financeiro com o rótulo de 'encontro_de_contas' no ar (ver §4) —
--      senão a linha nova aparece com etiqueta vazia.
--   5. Preencher o bloco DECISÃO, conferir a tabela §2 com o número escolhido, aplicar.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §1 — O CRÉDITO DA LOJA, medido em 14/09/2026 (finance.infra_costs, conta Lancaster)
-- ═══════════════════════════════════════════════════════════════════════════
--   ago/25 363,72 · set 549,48 · out 686,57 · nov 1.062,27 · dez 1.174,07
--   jan/26 615,31 · fev 719,45 ................................. 5.170,87  antes do uso
--   mar/26 1.390,51 · abr 3.181,35 · mai 2.801,09 · jun 3.513,38 . 10.886,33  em uso
--   total pago pela loja ....................................... 16.057,20
--   (jul/26 3.544,04 e ago/26 591,79 parcial: conta DIGIAI — não entram.)
-- O desenho arredondou para 16.056; o banco dá 16.057,20. Vale o banco.
-- ⚠ Toda a infra da loja está como product_id 'compartilhado': pagou a infra da DIGIAI
--   inteira (digiai, mkt, etc.), não só o Clearix dela. Continua a ser crédito dela; só
--   não é "o custo de servir a si mesma" que o desenho §3 sugere.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §2 — OS NÚMEROS PARA O DONO ESCOLHER (meses cheios até set/26; crédito 16.057,20)
-- ═══════════════════════════════════════════════════════════════════════════
--   cenário  preço/mês   início 10/03 (7 meses)            início 01/04 (6 meses)
--                        assinatura   saldo                assinatura   saldo
--   A        1.499,00    10.493,00    5.564,20 loja credora  8.994,00   7.063,20 loja credora
--   B        2.197,00    15.379,00      678,20 loja credora 13.182,00   2.875,20 loja credora
--   C        3.490,00    24.430,00    8.372,80 loja DEVE    20.940,00   4.882,80 loja DEVE
-- A = Crescimento (não cabe: 10 lojas > 8). B = Crescimento + R$ 349 por loja além de 8
-- (proposta do Geral). C = R$ 349 por loja. Março conta cheio a partir de 10/03, como no
-- desenho; pro rata (22/31) daria março = 71 % do preço — é decisão, não arredondamento.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §3 — O QUE A MIGRATION GRAVA
-- ═══════════════════════════════════════════════════════════════════════════
--   finance.revenue: 1 linha por mês, do mês de início a set/26, product 'clearix',
--     mrr_brl = preço, active_subscriptions 1, new_subscriptions 1 só no 1.º mês,
--     parte_relacionada = true, notes "cliente-zero (parte relacionada) ...".
--   finance.aportes: 1 linha natureza 'encontro_de_contas', valor = min(assinatura,
--     crédito) — o que se compensou —, e a observação com crédito, assinatura e saldo
--     (e quem deve a quem, se o saldo inverter). O resto do crédito não vira linha: fica
--     no infra_costs, onde já está, até o contador dizer como se acerta.
--   De out/2026 em diante não é daqui: fatura mensal loja → DIGIAI.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- §4 — O QUE MUDA NA TELA (antes → depois), com o cenário B e início 10/03
-- ═══════════════════════════════════════════════════════════════════════════
--   Hoje (placar) / ordem do dia ... "Gate NAO sustentado" → igual (126 exclui).
--   Financeiro, receita ............ 0 linhas → 7 linhas Clearix R$ 2.197 (mar–set).
--                                    O front ainda não lê parte_relacionada: as linhas
--                                    aparecem sem rótulo de parte relacionada.
--   Financeiro, aportes ............ 2 linhas → 3; a nova com natureza sem rótulo
--                                    (NATUREZA_LABEL não conhece encontro_de_contas) —
--                                    o líquido de caixa (4.710) não muda: soma por natureza.
--   Telão Financeiro ............... MRR 0 → R$ 2.197 em abr–set (últimos 6 meses), SEM
--                                    separar parte relacionada (a 126 não mexe no telão).
--   Telão Aportes .................. aparece a linha com rótulo cru "encontro_de_contas";
--                                    herói (investimento − devolução) não muda.
--   Snapshots (company.financial_snapshots) só mudam quando alguém correr
--   rpc_finance_snapshot_rebuild — e aí o mrr_total inclui a Lancaster.

begin;

create temp table _decisao on commit drop as
select
  null::numeric as preco_mensal_brl,   -- ex.: 2197.00 (cenário B)
  null::date    as inicio             -- 2026-03-01 (uso desde 10/03) ou 2026-04-01
;

do $$
declare
  v_preco numeric; v_inicio date; v_credito numeric; n int;
begin
  select preco_mensal_brl, inicio into v_preco, v_inicio from _decisao;
  if v_preco is null or v_inicio is null then
    raise exception 'DECISAO_EM_ABERTO: preço mensal do Completo e mês de início ainda não foram preenchidos pelo dono.';
  end if;
  if v_inicio not in (date '2026-03-01', date '2026-04-01') then
    raise exception 'Início % fora do desenho (mar ou abr/2026).', v_inicio;
  end if;
  if v_preco <= 0 then
    raise exception 'Preço inválido: %.', v_preco;
  end if;

  select count(*) into n from information_schema.columns
   where table_schema = 'finance' and table_name = 'revenue' and column_name = 'parte_relacionada';
  if n <> 1 then raise exception 'A 126 não está aplicada — sem ela esta receita viraria o gate da fase 2.'; end if;

  select count(*) into n from finance.revenue where parte_relacionada;
  if n > 0 then raise exception 'Já há % linha(s) de parte relacionada — a 123 já foi aplicada?', n; end if;

  select count(*) into n from finance.aportes where natureza = 'encontro_de_contas' and deleted_at is null;
  if n > 0 then raise exception 'Já há encontro de contas lançado.'; end if;

  -- o crédito é recalculado da fonte, não copiado deste cabeçalho
  select sum(cost_brl) into v_credito from finance.infra_costs
   where deleted_at is null and conta_pagadora = 'Lancaster/otica';
  if v_credito <> 16057.20 then
    raise exception 'Crédito da loja em infra_costs é % (medido 16.057,20 em 14/09) — a tabela §2 já não vale; medir de novo.', v_credito;
  end if;
end $$;

insert into finance.revenue
  (product_id, month, mrr_brl, active_subscriptions, new_subscriptions, notes, parte_relacionada)
select 'clearix', m::date, d.preco_mensal_brl, 1, case when m::date = d.inicio then 1 else 0 end,
       'cliente-zero (parte relacionada): Grupo Mello/Lancaster, pacote Completo, assinatura retroativa — migration 123. Nao e validacao de mercado.',
       true
  from _decisao d, generate_series(d.inicio, date '2026-09-01', interval '1 month') m;

insert into finance.aportes (data, origem, valor_brl, natureza, observacao)
select current_date,
       'Lancaster/otica (Grupo Mello) — encontro de contas com a assinatura Clearix',
       least(a.assinatura, c.credito),
       'encontro_de_contas',
       'Credito da loja: R$ ' || to_char(c.credito, 'FM999990.00') || ' (infra paga ago/25-jun/26, finance.infra_costs conta Lancaster). '
       || 'Assinatura retroativa Clearix Completo: ' || a.meses || ' x R$ ' || to_char(d.preco_mensal_brl, 'FM999990.00')
       || ' = R$ ' || to_char(a.assinatura, 'FM999990.00') || ' (' || to_char(d.inicio, 'MM/YYYY') || ' a 09/2026). '
       || case when c.credito >= a.assinatura
               then 'Saldo R$ ' || to_char(c.credito - a.assinatura, 'FM999990.00') || ' a favor da loja.'
               else 'Saldo R$ ' || to_char(a.assinatura - c.credito, 'FM999990.00') || ' devido pela loja a DIGIAI.' end
       || ' Forma (NF/compensacao) conforme contador, portao 74. Migration 123.'
  from _decisao d,
       lateral (select count(*)::int meses, sum(mrr_brl) assinatura from finance.revenue where parte_relacionada) a,
       lateral (select sum(cost_brl) credito from finance.infra_costs where deleted_at is null and conta_pagadora = 'Lancaster/otica') c;

do $$
declare n int; v_esperado int; v_gate boolean; v_obs text;
begin
  select case inicio when date '2026-03-01' then 7 else 6 end into v_esperado from _decisao;
  select count(*) into n from finance.revenue
   where parte_relacionada and product_id = 'clearix' and mrr_brl = (select preco_mensal_brl from _decisao);
  if n <> v_esperado then raise exception 'Esperava % meses de assinatura, gravei %.', v_esperado, n; end if;

  select count(*) into n from finance.revenue where parte_relacionada and new_subscriptions = 1;
  if n <> 1 then raise exception 'new_subscriptions = 1 devia estar só no mês de início.'; end if;

  -- o que a 126 prometeu: nada disto sustenta o gate
  select gate_cumprido into v_gate from public.fn_gate_evidencia();
  if v_gate then raise exception 'O gate da fase virou com receita de parte relacionada — a 126 não está a funcionar.'; end if;
  select count(*) into n from public.v_ops_placar_hoje where caixa <> 0;
  if n > 0 then raise exception 'O placar passou a mostrar caixa com receita de parte relacionada.'; end if;

  select observacao into v_obs from finance.aportes where natureza = 'encontro_de_contas' and deleted_at is null;
  if v_obs is null or v_obs !~ 'Credito da loja: R\$ 16057\.20' then
    raise exception 'Observação do encontro de contas não traz o crédito medido.';
  end if;
  if v_obs like '%' || chr(65533) || '%' then raise exception 'U+FFFD na observação.'; end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS (depois de aplicar)
-- ═══════════════════════════════════════════════════════════════════════════
--   a) v_finance_revenue: N linhas clearix parte_relacionada, soma = assinatura da §2;
--   b) v_finance_aportes: a linha do encontro, valor = min(assinatura, crédito);
--   c) ordem do dia do dia seguinte: "Gate da Fase 2: ainda nao sustentado";
--   d) telões e Financeiro como na §4.
