-- ============================================================
-- 084 — Fecha EXECUTE de anon/PUBLIC nas funcoes de ESCRITA e de credencial do banco digiai
-- ============================================================
-- Contexto: 02-04/09 o agente do app provou que funcoes SECURITY DEFINER de
-- escrita executavam para chamador ANONIMO (fn_mark_sync devolvia 204 e
-- sobrescrevia last_sync_status de todas as credenciais). Licao do crm_erp
-- (31/08): grant via PUBLIC (=X no proacl) faz "revoke from anon" ser no-op —
-- por isso aqui se revoga de anon E de PUBLIC, e se concede explicitamente a
-- quem deve chamar. Metodo (runbook): (a) chamada viva ANTES — anon executou
-- marketing_get_post_promotion com HTTP 200 em 05/09 01h; (b) revoke de anon e
-- PUBLIC + grant explicito; (c) chamada viva DEPOIS (esperado: 42501/401).
--
-- Quem chama o que (grep nos apps, 05/09):
--   digiai/src (app com LOGIN, sessao authenticated): fn_*, marketing_*, rpc_finance_*, billing_upsert_subscriber
--   digiai/supabase/functions (service_role): fn_mark_sync, fn_get_credential_secret, fn_replace_metrics,
--     fn_set_credential_service, fn_sync_infra_costs, fn_registrar_medicao_fato, fn_log_event, fn_importar_evento, fn_capture_landing_lead
--   digiai_mkt (app com login + workers service_role): mkt_*, fn_marcar_vencidos
-- FICAM ABERTAS (nao tocadas aqui): helpers de RLS (is_*, current_*, pode_ver_*,
--   require_auth, contexto_privilegiado, exigir_admin, enforce_r011,
--   garantir_status_diario, product_from), trigger functions (tg_*/trg_*),
--   rls_auto_enable, tg_set_updated_at, e TRES possivelmente publicas por
--   formulario (marketing_submit_testimonial, marketing_add_challenge_participation,
--   marketing_track_material_download) — decisao do dono se sao publicas.

do $$
declare
  r record;
  -- so service_role: credencial, segredo, seed, chamada de edge, ingestao de webhook, sync
  so_service text[] := array[
    'fn_mark_sync','fn_get_credential_secret','fn_set_credential_service',
    'fn_marketing_register_credential','fn_marketing_credential_status',
    'company_seed_digiai_missing','company_seed_digital_assets_full','company_seed_extras_v1',
    'fn_call_edge_function','billing_ingest_mp_event','run_marketing_sync_daily',
    'fn_replace_metrics','marketing_ingest_hotmart_event','marketing_reprocess_hotmart_event',
    'recompute_dunning'
  ];
  -- authenticated (app logado) + service_role
  app_e_service text[] := array[
    'billing_upsert_subscriber',
    'fn_delete_commercial_lead','fn_delete_meeting','fn_delete_playbook','fn_delete_proposal',
    'fn_log_meeting','fn_marcar_vencidos','fn_mark_proposal_sent','fn_save_funnel_workspace',
    'fn_update_landing_lead_status','fn_upsert_commercial_lead','fn_upsert_playbook','fn_upsert_proposal',
    'marketing_attribute_hotmart_sale','marketing_bulk_schedule','marketing_create_affiliate',
    'marketing_create_calendar_post','marketing_create_challenge','marketing_create_community_member',
    'marketing_create_idea','marketing_create_material','marketing_delete_affiliate_payout',
    'marketing_delete_post_output','marketing_delete_prompt_template','marketing_finalize_challenge',
    'marketing_get_affiliate_hotmart_link','marketing_get_affiliate_kit','marketing_get_post_promotion',
    'marketing_promote_post_to_material','marketing_promote_testimonial_to_idea',
    'marketing_register_affiliate_payout','marketing_render_prompt','marketing_review_testimonial',
    'marketing_save_post_output','marketing_schedule_idea','marketing_unschedule_planned',
    'marketing_update_affiliate','marketing_update_calendar_post','marketing_update_challenge',
    'marketing_update_community_member','marketing_update_idea','marketing_update_material',
    'marketing_update_participation','marketing_upsert_community_member','marketing_upsert_prompt_template',
    'mkt_agendar_sequencia','mkt_confirmar_publicacao','mkt_enfileirar_publicacao',
    'mkt_ingerir_ideias_digiai','mkt_ingerir_roteiros_digiai','mkt_registrar_conta','mkt_set_ideia_status',
    'rpc_finance_add_expense','rpc_finance_add_subscription','rpc_finance_close_subscription',
    'rpc_finance_register_month_from_subscriptions','rpc_finance_snapshot_rebuild',
    'rpc_finance_soft_delete_expense','rpc_finance_total_by_category','rpc_finance_total_by_product',
    'rpc_finance_upsert_founder_time'
  ];
  n_service int := 0; n_app int := 0;
begin
  for r in
    select p.oid::regprocedure as fn, p.proname
      from pg_proc p join pg_namespace n on n.oid = p.pronamespace
     where n.nspname in ('public','mkt','billing') and p.prokind = 'f'
       and (p.proname = any(so_service) or p.proname = any(app_e_service))
  loop
    execute format('revoke execute on function %s from public', r.fn);
    execute format('revoke execute on function %s from anon', r.fn);
    execute format('grant execute on function %s to service_role', r.fn);
    if r.proname = any(app_e_service) then
      execute format('grant execute on function %s to authenticated', r.fn);
      n_app := n_app + 1;
    else
      execute format('revoke execute on function %s from authenticated', r.fn);
      n_service := n_service + 1;
    end if;
  end loop;
  raise notice 'revogadas de anon/PUBLIC: % so service_role, % app+service', n_service, n_app;
end $$;

-- Conferencia (deve devolver 0 linhas com anon_exec=true entre as fechadas)
select p.oid::regprocedure as fn, has_function_privilege('anon', p.oid, 'EXECUTE') as anon_exec,
       has_function_privilege('authenticated', p.oid, 'EXECUTE') as auth_exec,
       has_function_privilege('service_role', p.oid, 'EXECUTE') as service_exec
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
 where n.nspname in ('public','mkt','billing') and p.prokind = 'f'
   and p.proname in ('fn_mark_sync','fn_get_credential_secret','billing_upsert_subscriber','marketing_get_post_promotion','rpc_finance_add_expense','mkt_set_ideia_status')
 order by 1;
