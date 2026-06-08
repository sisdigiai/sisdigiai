-- A1 (correção) — aplicada em produção via MCP 2026-06-08.
-- O revoke de 'anon' (036) não bastou: funções herdam EXECUTE de PUBLIC, e anon é membro
-- de PUBLIC. Revogar de public/anon/authenticated e conceder só a service_role (a edge
-- events-ingest, que usa SUPABASE_SERVICE_ROLE_KEY). Verificado: anon_exec=false, service_exec=true.
revoke execute on function public.fn_log_event(text,text,text,text,text,text,text,text,text,jsonb,text) from public, anon, authenticated;
grant execute on function public.fn_log_event(text,text,text,text,text,text,text,text,text,jsonb,text) to service_role;
