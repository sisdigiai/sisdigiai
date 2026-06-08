-- === Segurança LGPD (art. 46) — travar a camada de dados interna ao staff ===
-- Aplicada em produção via Management API/MCP em 2026-06-08.
--
-- Contexto: 64 views em public.* estavam GRANT a anon em modo *definer* (bypassam RLS),
-- e 53 delas com INSERT/UPDATE/DELETE/TRUNCATE — expondo leads (PII), finanças (R$547k),
-- iam.users e credenciais de infra a qualquer um com a anon key (que viaja no bundle).
-- As base tables JÁ tinham RLS is_staff(); o vazamento eram as VIEWS (definer bypassa RLS).
--
-- Fix: security_invoker=true (as views passam a respeitar a RLS do invocador) + revogar
-- anon + grant SELECT ao authenticated nas views e base tables (RLS is_staff filtra p/ staff).
-- O app exige login (gate em App.tsx) e escreve via RPCs guardadas por is_staff(); rotas
-- públicas (/osi, /osi/depoimento) não leem views. Verificado: Financeiro logado lê tudo;
-- anon_grants_remaining=0; security_invoker_on=64.

-- 1) events_catalog era a única base table sem RLS — habilitar (catálogo, staff-only)
alter table analytics.events_catalog enable row level security;
drop policy if exists events_catalog_staff_read on analytics.events_catalog;
create policy events_catalog_staff_read on analytics.events_catalog
  for select using (is_staff());

-- 2) authenticated precisa de USAGE no schema + SELECT na base table (RLS is_staff filtra)
--    para as views security_invoker funcionarem quando o staff logado consulta.
do $$
declare s text; t record;
begin
  foreach s in array array['academy','ops','company','finance','marketing','iam','analytics'] loop
    execute format('grant usage on schema %I to authenticated', s);
  end loop;
  for t in
    select n.nspname sch, c.relname tbl
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where c.relkind in ('r','p') and c.relrowsecurity = true
      and n.nspname in ('academy','ops','company','finance','marketing','iam','analytics')
  loop
    execute format('grant select on %I.%I to authenticated', t.sch, t.tbl);
  end loop;
end $$;

-- 3) Todas as views public.*: security_invoker + revogar anon + grant authenticated SELECT
do $$
declare v record;
begin
  for v in select table_name from information_schema.views where table_schema='public' loop
    execute format('alter view public.%I set (security_invoker = true)', v.table_name);
    execute format('revoke all on public.%I from anon', v.table_name);
    execute format('grant select on public.%I to authenticated', v.table_name);
  end loop;
end $$;
