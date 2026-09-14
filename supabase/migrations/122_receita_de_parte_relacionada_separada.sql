-- 122 — receita de parte relacionada ganha nome próprio antes de existir
--
-- ⚠ NÃO APLICADA. Estrutura sem dado: 0 linhas mudam hoje (finance.revenue tem 0).
--    Muda duas funções e duas views que a casa lê todo dia (gate da fase, placar),
--    por isso só com a palavra do dono. É pré-requisito da 123 (Lancaster cliente-zero,
--    portão 113) e não depende da decisão de preço dela.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ANTES DE LANÇAR QUALQUER RECEITA DA LANCASTER — medido em 14/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
-- O desenho (Cockpit/desenho-lancaster-cliente-zero-2026-09-11.md §4, trava 4) pede a
-- receita de parte relacionada "separada da de mercado" e propõe separá-la por
-- `notes`. Medi quem lê finance.revenue, e `notes` não separa nada:
--
--   public.fn_gate_evidencia() ....... receita = sum(mrr + one_time) de TODA a tabela
--                                      (nem deleted_at filtra). gate_cumprido =
--                                      clientes > 0 OR receita > 0 OR assinantes > 0.
--   ops.roadmap_phases, fase 2 ........ "Clearix Pilot", métrica "1 otica pagando o
--                                      Clearix (primeira receita recorrente real)".
--   fn_ordem_maquina_gate (cron 04:40)  escreve na ordem do dia "Gate da Fase 2:
--                                      sustentado pelo dado" quando o gate vira.
--   public.v_ops_placar_hoje .......... `caixa` = mesma soma, sem filtro; `gate_ok`.
--                                      Lida pelo ordemStore (15.561 chamadas
--                                      authenticated nestas views desde 31/07).
--
-- Uma linha de R$ 2.197 da Lancaster, só com `notes`, faria a ordem do dia dizer na
-- manhã seguinte "Gate da Fase 2: sustentado pelo dado — 0 cliente(s) externo(s),
-- R$ 15.379,00 de receita". O próprio fn_gate_evidencia já exclui o grupo na contagem
-- de clientes ("validacao de cliente-zero nao e validacao de mercado") — mas não na
-- receita. A trava de fechamento (ops.fn_trava_fechamento_de_fase) exige
-- decision_gate_met_at preenchido à mão, então a fase não FECHARIA sozinha; o que
-- mentiria é o veredito que o dono lê todo dia.
--
-- E há um segundo obstáculo, de chave: `revenue_product_id_month_key` é
-- UNIQUE (product_id, month). A Lancaster e um primeiro cliente externo do Clearix no
-- mesmo mês não caberiam em duas linhas — teriam de ser somados numa só, e aí nenhum
-- filtro os separa mais. fn_revenue_rebuild usa ON CONFLICT (product_id, month).
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE MUDA
-- ═══════════════════════════════════════════════════════════════════════════
--   1. finance.revenue.parte_relacionada boolean not null default false;
--      unique passa a (product_id, month, parte_relacionada).
--   2. fn_revenue_rebuild: ON CONFLICT na chave nova, grava parte_relacionada = false,
--      e o "zera linhas automáticas" não toca em linha de parte relacionada.
--      (Hoje: 0 vendas reais em marketing.hotmart_sales; 0 chamadas registadas.)
--   3. fn_gate_evidencia: receita = só de mercado (not parte_relacionada) e não apagada.
--      O veredito passa a dizer "receita de mercado": com a Lancaster lançada, a tela
--      Financeiro mostraria receita e o placar "zero receita" — as duas certas, e a
--      frase a parecer contradizer a outra. (Nenhum código compara o texto; o Hoje.tsx
--      tem rótulo próprio.)
--   4. v_ops_placar_hoje.caixa: idem. Mesmas colunas, mesma ordem.
--   5. v_finance_revenue: ganha `parte_relacionada` NO FIM (create or replace só
--      acrescenta; ver 107/42P16), para a tela Financeiro poder rotular.
--   6. finance.aportes.natureza aceita 'encontro_de_contas' (o desenho §5 diz "sem
--      tabela nova" — mas o CHECK atual só aceita investimento/emprestimo/devolucao).
--
-- O QUE NÃO MUDA, de propósito:
--   • v_telao_financeiro e rpc_finance_snapshot_rebuild continuam a somar TODO o MRR.
--     Receita de parte relacionada faturada é receita; o que não pode é contar como
--     validação de mercado. Se o dono quiser o telão separado, é outra migration.
--   • ops.commercial_leads: a exclusão por nome ('mello|lancaster|digiai') fica.
--
-- EFEITO NO FRONT HOJE: nenhum número muda (0 linhas de receita). O placar continua
-- "Gate NAO sustentado"; a tabela de aportes continua com as 2 linhas.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA PRÉ — o que vou substituir é o que medi (md5 de 14/09/2026)
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  select count(*) into n from finance.revenue;
  if n <> 0 then
    raise exception 'finance.revenue tem % linha(s) — a 122 foi escrita com a tabela vazia; medir de novo.', n;
  end if;

  if (select md5(prosrc) from pg_proc where oid = 'public.fn_revenue_rebuild(date)'::regprocedure) <> '88dd19e747e10bc117300f39005beb06'
  or (select md5(prosrc) from pg_proc where oid = 'public.fn_gate_evidencia(integer)'::regprocedure) <> 'a6e8a53212d7a609bd145255fb3586b0'
  or md5(pg_get_viewdef('public.v_ops_placar_hoje'::regclass)) <> 'cd71eedd5c24ff51a855096ebc53e76c'
  or md5(pg_get_viewdef('public.v_finance_revenue'::regclass)) <> '7fbe59504325569bd5d0aefe441dbd66' then
    raise exception 'fn_revenue_rebuild, fn_gate_evidencia, v_ops_placar_hoje ou v_finance_revenue mudou desde 14/09 — esta migration substituiria a versão nova pela minha cópia da velha.';
  end if;

  select count(*) into n from pg_constraint
   where conrelid = 'finance.revenue'::regclass and conname = 'revenue_product_id_month_key';
  if n <> 1 then
    raise exception 'revenue_product_id_month_key não existe — a chave já não é a medida.';
  end if;

  select count(*) into n from pg_constraint
   where conrelid = 'finance.aportes'::regclass and conname = 'aportes_natureza_check'
     and pg_get_constraintdef(oid) = 'CHECK ((natureza = ANY (ARRAY[''investimento''::text, ''emprestimo''::text, ''devolucao''::text])))';
  if n <> 1 then
    raise exception 'aportes_natureza_check não é o medido em 14/09.';
  end if;
end $$;

-- 1 ─────────────────────────────────────────────────────────────────────────
alter table finance.revenue add column parte_relacionada boolean not null default false;
comment on column finance.revenue.parte_relacionada is
  'Receita de empresa do mesmo dono (cliente-zero). Conta como receita; NAO conta como validacao de mercado (fn_gate_evidencia, v_ops_placar_hoje.caixa). Migration 122.';

alter table finance.revenue drop constraint revenue_product_id_month_key;
alter table finance.revenue add constraint revenue_product_month_parte_key
  unique (product_id, month, parte_relacionada);

-- 2 ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_revenue_rebuild(p_month date DEFAULT NULL::date)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'marketing', 'finance'
AS $function$
DECLARE
  v_upserted int := 0;
  v_unmapped text[];
BEGIN
  -- produtos de plataforma sem mapeamento (pra não sumir receita em silêncio)
  SELECT array_agg(DISTINCT s.product_id) INTO v_unmapped
  FROM marketing.hotmart_sales s
  LEFT JOIN marketing.product_finance_map m ON m.platform_product_id = s.product_id
  WHERE m.platform_product_id IS NULL
    AND s.product_name NOT ILIKE '%improviso%'
    AND s.hotmart_transaction NOT LIKE 'HP-FAKE%';

  -- zera linhas automáticas no escopo (mês que ficou sem venda volta a 0)
  -- venda de marketplace é sempre de mercado: a linha de parte relacionada não é dela
  UPDATE finance.revenue r SET
    one_time_brl = 0, sales_count = 0, refund_count = 0, updated_at = now()
  WHERE r.notes = 'auto: fn_revenue_rebuild'
    AND NOT r.parte_relacionada
    AND (p_month IS NULL OR r.month = p_month);

  WITH sales AS (
    SELECT
      COALESCE(m.finance_product_id,
               CASE WHEN s.product_name ILIKE '%improviso%' THEN 'osi' END) AS product_id,
      date_trunc('month', s.purchase_date)::date AS month,
      s.status,
      s.price_value_cents
    FROM marketing.hotmart_sales s
    LEFT JOIN marketing.product_finance_map m ON m.platform_product_id = s.product_id
    WHERE s.hotmart_transaction NOT LIKE 'HP-FAKE%'
      AND (p_month IS NULL OR date_trunc('month', s.purchase_date)::date = p_month)
  ),
  agg AS (
    SELECT product_id, month,
      COALESCE(sum(price_value_cents) FILTER (WHERE status IN ('approved','complete')), 0) / 100.0 AS one_time_brl,
      count(*) FILTER (WHERE status IN ('approved','complete'))   AS sales_count,
      count(*) FILTER (WHERE status IN ('refunded','chargeback')) AS refund_count
    FROM sales
    WHERE product_id IS NOT NULL
    GROUP BY product_id, month
  ),
  up AS (
    INSERT INTO finance.revenue (product_id, month, one_time_brl, sales_count, refund_count, notes, parte_relacionada)
    SELECT product_id, month, one_time_brl, sales_count, refund_count, 'auto: fn_revenue_rebuild', false
    FROM agg
    ON CONFLICT (product_id, month, parte_relacionada) DO UPDATE SET
      one_time_brl = EXCLUDED.one_time_brl,
      sales_count  = EXCLUDED.sales_count,
      refund_count = EXCLUDED.refund_count,
      updated_at   = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_upserted FROM up;

  RETURN jsonb_build_object(
    'months_upserted', v_upserted,
    'unmapped_platform_products', COALESCE(v_unmapped, '{}')
  );
END;
$function$;

-- 3 ─────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_gate_evidencia(p_fase integer DEFAULT NULL::integer)
 RETURNS TABLE(fase integer, metrica text, clientes_pagantes integer, receita_brl numeric, assinantes integer, gate_cumprido boolean, veredito text)
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public', 'ops', 'finance', 'billing'
AS $function$
  WITH alvo AS (
    SELECT phase_number, metrica_unica
      FROM ops.roadmap_phases
     WHERE phase_number = COALESCE(p_fase, (
             SELECT min(phase_number) FROM ops.roadmap_phases
              WHERE started_at IS NOT NULL AND completed_at IS NULL))
  ), medido AS (
    SELECT
      -- cliente pagante de verdade: exclui o proprio grupo (validacao de
      -- cliente-zero nao e validacao de mercado)
      (SELECT count(*)::int FROM ops.commercial_leads
        WHERE stage = 'cliente' AND deleted_at IS NULL
          AND company !~* 'mello|lancaster|digiai')                    AS clientes,
      -- a mesma regra na receita (122): parte relacionada nao sustenta gate
      (SELECT COALESCE(sum(mrr_brl + one_time_brl), 0) FROM finance.revenue
        WHERE deleted_at IS NULL AND NOT parte_relacionada)            AS receita,
      (SELECT count(*)::int FROM billing.subscribers)                  AS assin
  )
  SELECT a.phase_number, a.metrica_unica, m.clientes, m.receita, m.assin,
         (m.clientes > 0 OR m.receita > 0 OR m.assin > 0),
         CASE
           WHEN m.clientes > 0 OR m.receita > 0 OR m.assin > 0
             THEN 'Gate sustentado pelo dado: ' || m.clientes || ' cliente(s) externo(s), R$ '
                  || translate(to_char(m.receita, 'FM999G999D00'), ',.', '.,') || ' de receita de mercado, '
                  || m.assin || ' assinante(s).'
           ELSE 'Gate NAO sustentado: zero cliente externo, zero receita de mercado, zero assinante. '
                || 'A metrica da fase e "' || a.metrica_unica || '".'
         END
    FROM alvo a, medido m;
$function$;

-- 4 ─────────────────────────────────────────────────────────────────────────
create or replace view public.v_ops_placar_hoje with (security_invoker = true) as
 WITH fase AS (
         SELECT roadmap_phases.phase_number,
            roadmap_phases.nome,
            roadmap_phases.metrica_unica
           FROM ops.roadmap_phases
          WHERE roadmap_phases.started_at IS NOT NULL AND roadmap_phases.completed_at IS NULL
          ORDER BY roadmap_phases.phase_number
         LIMIT 1
        ), elo AS (
         SELECT t.title,
            t.target_date,
            ( SELECT count(*) AS count
                   FROM ops.roadmap_tasks x
                  WHERE x.phase_number = t.phase_number AND x.deleted_at IS NULL) AS total,
            (( SELECT count(*) AS count
                   FROM ops.roadmap_tasks y
                  WHERE y.phase_number = t.phase_number AND y.deleted_at IS NULL AND y.completed_at IS NOT NULL)) + 1 AS numero
           FROM ops.roadmap_tasks t,
            fase f_1
          WHERE t.phase_number = f_1.phase_number AND t.deleted_at IS NULL AND t.completed_at IS NULL
          ORDER BY t.target_date, t.display_order
         LIMIT 1
        ), dinheiro AS (
         SELECT ( SELECT COALESCE(sum(revenue.mrr_brl + revenue.one_time_brl), 0::numeric) AS "coalesce"
                   FROM finance.revenue
                  WHERE revenue.deleted_at IS NULL AND NOT revenue.parte_relacionada) AS caixa,
            ( SELECT COALESCE(avg(x.t), 0::numeric) AS "coalesce"
                   FROM ( SELECT sum(infra_costs.cost_brl) AS t
                           FROM finance.infra_costs
                          WHERE NOT infra_costs.parcial
                          GROUP BY infra_costs.month
                          ORDER BY infra_costs.month DESC
                         LIMIT 3) x) AS custo_mes,
            ( SELECT count(*)::integer AS count
                   FROM ops.commercial_leads
                  WHERE commercial_leads.stage = 'cliente'::text AND commercial_leads.deleted_at IS NULL AND commercial_leads.company !~* 'mello|lancaster|digiai'::text) AS pagantes
        )
 SELECT f.phase_number AS fase,
    f.nome AS fase_nome,
    f.metrica_unica AS metrica,
    e.title AS elo_titulo,
    e.numero AS elo_numero,
    e.total AS elo_total,
    e.target_date AS elo_prazo,
    e.target_date - CURRENT_DATE AS elo_dias,
    d.caixa,
    d.custo_mes,
    d.pagantes,
    ( SELECT fn_gate_evidencia.gate_cumprido
           FROM fn_gate_evidencia() fn_gate_evidencia(fase, metrica, clientes_pagantes, receita_brl, assinantes, gate_cumprido, veredito)) AS gate_ok,
    ( SELECT fn_gate_evidencia.veredito
           FROM fn_gate_evidencia() fn_gate_evidencia(fase, metrica, clientes_pagantes, receita_brl, assinantes, gate_cumprido, veredito)) AS gate_veredito,
    ( SELECT COALESCE(json_agg(json_build_object('mes', to_char(s.month::timestamp with time zone, 'MM/YY'::text), 'mrr', s.mrr_total_brl) ORDER BY s.month), '[]'::json) AS "coalesce"
           FROM ( SELECT financial_snapshots.month,
                    financial_snapshots.mrr_total_brl
                   FROM company.financial_snapshots
                  ORDER BY financial_snapshots.month DESC
                 LIMIT 12) s) AS mrr_serie
   FROM fase f
     LEFT JOIN elo e ON true
     CROSS JOIN dinheiro d;

-- 5 ─────────────────────────────────────────────────────────────────────────
create or replace view public.v_finance_revenue with (security_invoker = true) as
 SELECT r.id,
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
    r.notes,
    r.parte_relacionada
   FROM finance.revenue r
     LEFT JOIN finance.products p ON p.id = r.product_id
  WHERE r.deleted_at IS NULL
  ORDER BY r.month DESC, r.product_id;

-- 6 ─────────────────────────────────────────────────────────────────────────
alter table finance.aportes drop constraint aportes_natureza_check;
alter table finance.aportes add constraint aportes_natureza_check
  check (natureza = any (array['investimento', 'emprestimo', 'devolucao', 'encontro_de_contas']));

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA PÓS — o comportamento, não só o catálogo
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int; v_receita numeric; v_gate boolean; v_caixa numeric;
begin
  -- A chave nova aceita as duas linhas que a velha recusava, e recusa a duplicada.
  -- Tudo dentro de um bloco que se desfaz: nenhuma destas linhas fica.
  begin
    insert into finance.revenue (product_id, month, mrr_brl, notes, parte_relacionada)
      values ('clearix', '2099-01-01', 100, 'prova 122', true);
    insert into finance.revenue (product_id, month, mrr_brl, notes, parte_relacionada)
      values ('clearix', '2099-01-01', 7, 'prova 122', false);

    select receita_brl, gate_cumprido into v_receita, v_gate from public.fn_gate_evidencia();
    if v_receita <> 7 or not v_gate then
      raise exception 'PROVA_122_FALHOU gate: receita=% (esperava 7, só a de mercado) gate=%', v_receita, v_gate;
    end if;
    select caixa into v_caixa from public.v_ops_placar_hoje;
    if v_caixa <> 7 then
      raise exception 'PROVA_122_FALHOU placar: caixa=% (esperava 7)', v_caixa;
    end if;
    select count(*) into n from public.v_finance_revenue where notes = 'prova 122' and parte_relacionada;
    if n <> 1 then
      raise exception 'PROVA_122_FALHOU v_finance_revenue não mostra parte_relacionada.';
    end if;

    begin
      insert into finance.revenue (product_id, month, mrr_brl, notes, parte_relacionada)
        values ('clearix', '2099-01-01', 1, 'prova 122', true);
      raise exception 'PROVA_122_FALHOU a chave aceitou duas linhas de parte relacionada no mesmo mês.';
    exception when unique_violation then null;
    end;

    -- o ON CONFLICT do rebuild compila contra a chave nova (sem vendas, não insere nada)
    perform public.fn_revenue_rebuild('2099-01-01');

    raise exception 'PROVA_122_OK';
  exception when others then
    if sqlerrm <> 'PROVA_122_OK' then raise; end if;
  end;

  select count(*) into n from finance.revenue where notes = 'prova 122';
  if n <> 0 then raise exception 'As linhas de prova ficaram na tabela.'; end if;

  select gate_cumprido into v_gate from public.fn_gate_evidencia();
  if v_gate then raise exception 'O gate virou com a tabela vazia.'; end if;

  -- invoker e grants sobrevivem ao replace (lição da 106/108)
  select count(*) into n from pg_class
   where oid in ('public.v_ops_placar_hoje'::regclass, 'public.v_finance_revenue'::regclass)
     and reloptions @> array['security_invoker=true'];
  if n <> 2 then raise exception 'Uma das views perdeu security_invoker.'; end if;

  execute 'set local role authenticated';
  perform caixa, gate_ok, gate_veredito from public.v_ops_placar_hoje;
  perform parte_relacionada, mrr_brl, notes from public.v_finance_revenue;
  execute 'reset role';

  select count(*) into n from pg_constraint
   where conrelid = 'finance.aportes'::regclass and conname = 'aportes_natureza_check'
     and pg_get_constraintdef(oid) like '%encontro_de_contas%';
  if n <> 1 then raise exception 'aportes_natureza_check sem encontro_de_contas.'; end if;
end $$;

notify pgrst, 'reload schema';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS (depois de aplicar)
-- ═══════════════════════════════════════════════════════════════════════════
--   a) a trava pós fez a prova de comportamento numa sub-transação desfeita;
--   b) placar do Hoje e ordem do dia continuam "Gate NAO sustentado", caixa 0;
--   c) tela Financeiro e telão de aportes sem mudança (2 aportes, 0 receita).
