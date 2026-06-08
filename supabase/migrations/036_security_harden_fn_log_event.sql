-- A1 (segurança) — aplicada em produção via MCP 2026-06-08.
-- fn_log_event só deve ser chamada pela edge function events-ingest (SERVICE_ROLE).
-- Recriar com cap de metadata (defense-in-depth contra abuso / PII de terceiro injetada).
-- NOTA: o revoke de 'anon' aqui NÃO bastou (funções herdam EXECUTE de PUBLIC) — ver 037.

create or replace function public.fn_log_event(
  p_event_code text, p_product text default null, p_session_id text default null,
  p_url text default null, p_utm_source text default null, p_utm_medium text default null,
  p_utm_campaign text default null, p_utm_content text default null, p_utm_term text default null,
  p_metadata jsonb default '{}'::jsonb, p_user_agent text default null
) returns uuid language plpgsql security definer set search_path to 'analytics','public' as $function$
declare v_id uuid; v_meta jsonb := coalesce(p_metadata, '{}'::jsonb);
begin
  if pg_column_size(v_meta) > 4096 then
    v_meta := jsonb_build_object('_truncated', true);
  end if;
  insert into analytics.events_log
    (event_code, product, session_id, url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, metadata, user_agent)
  values
    (p_event_code, p_product, p_session_id, p_url, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term, v_meta, p_user_agent)
  returning id into v_id;
  return v_id;
end $function$;

revoke execute on function public.fn_log_event(text,text,text,text,text,text,text,text,text,jsonb,text) from anon;
