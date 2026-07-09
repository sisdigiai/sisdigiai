-- ============================================================
-- 027_investment_cockpit_foundation
-- Fundação do "Cockpit do Investimento" (2026-06-08).
-- (a) company.investment_config — parâmetros editáveis: valor do aporte mensal
--     (pró-labore figurado do fundador) + custo de time humano equivalente
--     (camada 3 ILUSTRATIVA, alavancagem dos agentes — nunca soma no fiscal).
-- (b) rpc_ensure_monthly_aporte(p_month) — lança o aporte do mês se faltar
--     (idempotente) e reconstrói o snapshot. Resolve o esquecimento mai/jun.
-- ============================================================

-- (a) config singleton (staff-only)
create table if not exists company.investment_config (
  id smallint primary key default 1,
  aporte_personnel_brl numeric not null default 18200.00,   -- mão de obra fundador (CTO/CPO/Dev)
  aporte_ip_brl numeric not null default 5833.33,           -- IP / metodologia
  equivalent_team_monthly_brl numeric not null default 45000.00, -- camada 3: time humano equivalente (ilustrativo)
  auto_aporte_enabled boolean not null default true,
  updated_at timestamptz not null default now(),
  constraint investment_config_singleton check (id = 1)
);

insert into company.investment_config (id) values (1) on conflict (id) do nothing;

alter table company.investment_config enable row level security;
drop policy if exists investment_config_staff_all on company.investment_config;
create policy investment_config_staff_all on company.investment_config
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

-- view pública (padrão da casa: frontend lê via v_*)
create or replace view public.v_company_investment_config
  with (security_invoker = true) as
  select id, aporte_personnel_brl, aporte_ip_brl, equivalent_team_monthly_brl, auto_aporte_enabled, updated_at
  from company.investment_config;
grant select on public.v_company_investment_config to authenticated;

-- (b) lançar o aporte do mês (idempotente) + rebuild do snapshot
create or replace function public.rpc_ensure_monthly_aporte(p_month date default date_trunc('month', current_date)::date)
returns jsonb language plpgsql security definer
set search_path to 'public','finance','company' as $function$
declare
  v_p numeric; v_ip numeric; v_enabled boolean; v_vendor uuid; v_created int := 0;
begin
  if not public.is_staff() then raise exception 'Acesso negado'; end if;
  select aporte_personnel_brl, aporte_ip_brl, auto_aporte_enabled
    into v_p, v_ip, v_enabled from company.investment_config where id=1;
  if not coalesce(v_enabled, true) then
    return jsonb_build_object('ok', false, 'reason', 'auto_aporte_desligado');
  end if;
  select id into v_vendor from finance.vendors where slug='aporte-fundador';

  insert into finance.expenses (product_id, vendor_id, category, kind, description, month, amount_brl)
  select 'clearix', v_vendor, 'personnel', 'aporte_intelectual',
         'Mão de Obra Fundador — CTO/CPO/Dev ('||to_char(p_month,'MM/YYYY')||')', p_month, v_p
  where not exists (select 1 from finance.expenses
    where month=p_month and kind='aporte_intelectual' and category='personnel' and deleted_at is null);
  get diagnostics v_created = row_count;

  insert into finance.expenses (product_id, vendor_id, category, kind, description, month, amount_brl)
  select 'clearix', v_vendor, 'other', 'aporte_intelectual',
         'IP Fundador — Motor de Lentes + Metodologia ('||to_char(p_month,'MM/YYYY')||')', p_month, v_ip
  where not exists (select 1 from finance.expenses
    where month=p_month and kind='aporte_intelectual' and category='other' and deleted_at is null);
  get diagnostics v_created = v_created + row_count;

  perform public.rpc_finance_snapshot_rebuild(p_month);
  return jsonb_build_object('ok', true, 'month', p_month, 'linhas_criadas', v_created);
end; $function$;

grant execute on function public.rpc_ensure_monthly_aporte(date) to authenticated;
