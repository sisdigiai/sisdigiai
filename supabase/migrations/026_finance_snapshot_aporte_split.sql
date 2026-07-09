-- ============================================================
-- 026_finance_snapshot_aporte_split
-- Saúde de dados (2026-06-08): o painel mostrava "investido R$ 547.293" (aporte
-- inflado antigo R$ 532k) e "burn ~R$ 45k/mês" — mas o burn de CAIXA real é
-- ~R$ 1-3k/mês; o resto sempre foi sweat equity (não-caixa).
--
-- Esta migration:
--  1) separa o aporte intelectual (não-caixa) do custo de caixa nos snapshots;
--  2) corrige rpc_finance_snapshot_rebuild (não misturar aporte no custo +
--     recalcular investimento_acumulado, que a fn antiga nem tocava);
--  3) lança o aporte de mai/2026 (fundador segue trabalhando — continua a
--     metodologia R$ 18.200 personnel + R$ 5.833,33 IP);
--  4) reconstrói TODOS os snapshots a partir da verdade (finance.expenses).
--
-- Junho/2026 NÃO recebe aporte aqui (mês em curso, dia 8) — lançar no fechamento.
-- O número final vai pra contabilidade → alinhar com a Konsep depois.
-- ============================================================

-- 1) coluna não-caixa (sweat equity separado do burn)
alter table company.financial_snapshots
  add column if not exists aporte_intelectual_brl numeric not null default 0;

-- 2) aporte de maio/2026 (espelha o padrão de abr/26; idempotente)
insert into finance.expenses (product_id, vendor_id, category, kind, description, month, amount_brl)
select 'clearix', '9709f327-b976-4c59-84d0-871e2dba6ac3', 'personnel', 'aporte_intelectual',
       'Mão de Obra Fundador — CTO/CPO/Dev (Mai/26)', date '2026-05-01', 18200.00
where not exists (select 1 from finance.expenses
  where month=date '2026-05-01' and kind='aporte_intelectual' and category='personnel' and deleted_at is null);

insert into finance.expenses (product_id, vendor_id, category, kind, description, month, amount_brl)
select 'clearix', '9709f327-b976-4c59-84d0-871e2dba6ac3', 'other', 'aporte_intelectual',
       'IP Fundador — Motor de Lentes + Metodologia (Mai/26)', date '2026-05-01', 5833.33
where not exists (select 1 from finance.expenses
  where month=date '2026-05-01' and kind='aporte_intelectual' and category='other' and deleted_at is null);

-- 3) rebuild fn corrigida: custo_* = SÓ CAIXA; aporte em coluna própria; acumulado = caixa+aporte até o mês
create or replace function public.rpc_finance_snapshot_rebuild(p_month date default date_trunc('month', current_date)::date)
returns void language plpgsql security definer
set search_path to 'public','finance','company' as $function$
declare
  v_infra numeric; v_ferr numeric; v_pess numeric; v_outros numeric;
  v_aporte numeric; v_mrr numeric; v_acum numeric;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;

  select coalesce(sum(amount_brl),0) into v_infra  from finance.expenses
    where month=p_month and deleted_at is null and kind<>'aporte_intelectual' and category in ('infra_cloud');
  select coalesce(sum(amount_brl),0) into v_ferr   from finance.expenses
    where month=p_month and deleted_at is null and kind<>'aporte_intelectual' and category in ('ai_api','dev_tools','integrations_sector');
  select coalesce(sum(amount_brl),0) into v_pess   from finance.expenses
    where month=p_month and deleted_at is null and kind<>'aporte_intelectual' and category in ('personnel');
  select coalesce(sum(amount_brl),0) into v_outros from finance.expenses
    where month=p_month and deleted_at is null and kind<>'aporte_intelectual'
      and category not in ('infra_cloud','ai_api','dev_tools','integrations_sector','personnel');
  select coalesce(sum(amount_brl),0) into v_aporte from finance.expenses
    where month=p_month and deleted_at is null and kind='aporte_intelectual';
  select coalesce(sum(mrr_brl),0)    into v_mrr    from finance.revenue
    where month=p_month and deleted_at is null;
  select coalesce(sum(amount_brl),0) into v_acum   from finance.expenses
    where month<=p_month and deleted_at is null;

  insert into company.financial_snapshots
    (month, mrr_total_brl, custo_infra_brl, custo_ferramentas_brl, custo_pessoas_brl,
     custo_outros_brl, aporte_intelectual_brl, investimento_acumulado_brl)
  values (p_month, v_mrr, v_infra, v_ferr, v_pess, v_outros, v_aporte, v_acum)
  on conflict (month) do update set
    mrr_total_brl=excluded.mrr_total_brl,
    custo_infra_brl=excluded.custo_infra_brl,
    custo_ferramentas_brl=excluded.custo_ferramentas_brl,
    custo_pessoas_brl=excluded.custo_pessoas_brl,
    custo_outros_brl=excluded.custo_outros_brl,
    aporte_intelectual_brl=excluded.aporte_intelectual_brl,
    investimento_acumulado_brl=excluded.investimento_acumulado_brl,
    updated_at=now();
end; $function$;

-- 4) reconstruir TODOS os meses (inline; roda como postgres na migration, sem o guard is_staff)
do $$
declare m date;
begin
  for m in select distinct month from finance.expenses where deleted_at is null order by 1 loop
    insert into company.financial_snapshots
      (month, mrr_total_brl, custo_infra_brl, custo_ferramentas_brl, custo_pessoas_brl,
       custo_outros_brl, aporte_intelectual_brl, investimento_acumulado_brl)
    select m,
      coalesce((select sum(mrr_brl) from finance.revenue where month=m and deleted_at is null),0),
      coalesce(sum(amount_brl) filter (where category='infra_cloud' and kind<>'aporte_intelectual'),0),
      coalesce(sum(amount_brl) filter (where category in ('ai_api','dev_tools','integrations_sector') and kind<>'aporte_intelectual'),0),
      coalesce(sum(amount_brl) filter (where category='personnel' and kind<>'aporte_intelectual'),0),
      coalesce(sum(amount_brl) filter (where category not in ('infra_cloud','ai_api','dev_tools','integrations_sector','personnel') and kind<>'aporte_intelectual'),0),
      coalesce(sum(amount_brl) filter (where kind='aporte_intelectual'),0),
      coalesce((select sum(amount_brl) from finance.expenses where month<=m and deleted_at is null),0)
    from finance.expenses where month=m and deleted_at is null
    on conflict (month) do update set
      mrr_total_brl=excluded.mrr_total_brl,
      custo_infra_brl=excluded.custo_infra_brl,
      custo_ferramentas_brl=excluded.custo_ferramentas_brl,
      custo_pessoas_brl=excluded.custo_pessoas_brl,
      custo_outros_brl=excluded.custo_outros_brl,
      aporte_intelectual_brl=excluded.aporte_intelectual_brl,
      investimento_acumulado_brl=excluded.investimento_acumulado_brl,
      updated_at=now();
  end loop;
end $$;
