-- Migration 031: módulo Comercial (era stub) — CRM enxuto de pipeline.
-- Aplicada via MCP em 2026-06-02. Registro versionado.
-- Tabela de leads/oportunidades por estágio; leitura via view; escrita via RPC SECURITY DEFINER (is_staff).

create table if not exists ops.commercial_leads (
  id uuid primary key default gen_random_uuid(),
  name text,
  company text not null,
  product text,                                   -- clearix/osi/academy/outro
  stage text not null default 'lead',             -- lead/contato/demo/piloto/cliente/perdido
  source text,
  contact text,
  value_brl numeric(12,2),
  owner text,
  next_step text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table ops.commercial_leads enable row level security;
drop policy if exists commercial_staff_all on ops.commercial_leads;
create policy commercial_staff_all on ops.commercial_leads for all
  using (public.is_staff()) with check (public.is_staff());
drop trigger if exists set_updated_at on ops.commercial_leads;
create trigger set_updated_at before update on ops.commercial_leads
  for each row execute function public.tg_set_updated_at();

create or replace view public.v_commercial_leads as
  select id, name, company, product, stage, source, contact, value_brl, owner, next_step, notes, created_at, updated_at
  from ops.commercial_leads
  where deleted_at is null
  order by created_at desc;
grant select on public.v_commercial_leads to anon, authenticated;

create or replace function public.fn_upsert_commercial_lead(p_lead jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'public','ops'
as $function$
declare v_id uuid;
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  v_id := nullif(p_lead->>'id','')::uuid;
  if v_id is null then
    insert into ops.commercial_leads (name, company, product, stage, source, contact, value_brl, owner, next_step, notes)
    values (p_lead->>'name', p_lead->>'company', p_lead->>'product',
            coalesce(nullif(p_lead->>'stage',''),'lead'), p_lead->>'source', p_lead->>'contact',
            nullif(p_lead->>'value_brl','')::numeric, p_lead->>'owner', p_lead->>'next_step', p_lead->>'notes')
    returning id into v_id;
  else
    update ops.commercial_leads set
      name = p_lead->>'name', company = p_lead->>'company', product = p_lead->>'product',
      stage = coalesce(nullif(p_lead->>'stage',''),'lead'), source = p_lead->>'source',
      contact = p_lead->>'contact', value_brl = nullif(p_lead->>'value_brl','')::numeric,
      owner = p_lead->>'owner', next_step = p_lead->>'next_step', notes = p_lead->>'notes'
    where id = v_id;
  end if;
  return v_id;
end;
$function$;
grant execute on function public.fn_upsert_commercial_lead(jsonb) to authenticated;

create or replace function public.fn_delete_commercial_lead(p_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public','ops'
as $function$
begin
  if not public.is_staff() then raise exception 'not_staff'; end if;
  update ops.commercial_leads set deleted_at = now() where id = p_id;
end;
$function$;
grant execute on function public.fn_delete_commercial_lead(uuid) to authenticated;

insert into ops.commercial_leads (company, name, product, stage, source, notes)
select 'Grupo Mello Óticas', 'Junior / Gilberto', 'clearix', 'cliente', 'interno',
       'Cliente real âncora do Clearix (tenant 6292c9f0). 10 lojas, base migrada desde 2020.'
where not exists (select 1 from ops.commercial_leads where company = 'Grupo Mello Óticas');
