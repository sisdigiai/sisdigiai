-- Migration 030: persistência do workspace do Funil OSI (antes localStorage-only).
-- Aplicada via MCP em 2026-06-02. Registro versionado.
-- JSONB singleton: o FunnelWorkspace inteiro (assumptions+actuals+guides+creatives+automation+tasks)
-- num blob. Leitura via view; escrita via RPC SECURITY DEFINER (is_staff). localStorage vira cache.

create table if not exists ops.funnel_workspace (
  key text primary key,
  workspace jsonb not null,
  version int not null default 1,
  updated_at timestamptz not null default now(),
  updated_by uuid
);

alter table ops.funnel_workspace enable row level security;
drop policy if exists funnel_ws_staff_all on ops.funnel_workspace;
create policy funnel_ws_staff_all on ops.funnel_workspace for all
  using (public.is_staff()) with check (public.is_staff());
drop trigger if exists set_updated_at on ops.funnel_workspace;
create trigger set_updated_at before update on ops.funnel_workspace
  for each row execute function public.tg_set_updated_at();

create or replace view public.v_funnel_workspace as
  select key, workspace, version, updated_at from ops.funnel_workspace;
grant select on public.v_funnel_workspace to anon, authenticated;

create or replace function public.fn_save_funnel_workspace(p_key text, p_workspace jsonb)
returns void
language plpgsql
security definer
set search_path to 'public','ops'
as $function$
begin
  if not public.is_staff() then
    raise exception 'not_staff';
  end if;
  insert into ops.funnel_workspace (key, workspace, version, updated_at)
  values (coalesce(nullif(p_key,''),'osi'), p_workspace, 1, now())
  on conflict (key) do update
    set workspace = excluded.workspace, updated_at = now();
end;
$function$;
grant execute on function public.fn_save_funnel_workspace(text, jsonb) to authenticated;
