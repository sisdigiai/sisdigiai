-- 090 — fecha leitura SEM LOGIN em 13 views de public (2026-09-06)
-- Achado pelo Agent do DIGIAI MKT durante a auditoria de regras da casa; reproduzido pelo
-- orquestrador geral por chamada real com a anon key (HTTP 200 nas 13, v_ops_cofre 1108 bytes).
-- Causa: views sem security_invoker (rodam como dono, ignoram RLS) + grant padrão do schema
-- public (anon herda ALL). Consumidores verificados: só o app digiai, que lê com sessão
-- (authenticated) desde 27/08 — nada lê estas views com anon fora do app.
-- Escopo deliberado: só anon e PUBLIC. O grant de escrita de authenticated nas 145 views é o
-- portão 16 da ordem do dia (decisão do dono, executor = orquestrador do app) e NÃO é tocado aqui.
-- security_invoker fica para decisão do dono (mudaria o que cada papel enxerga).
-- Idempotente: revoke/grant repetidos não erram.
do $$
declare v text;
begin
  foreach v in array array[
    'v_ops_cofre','v_ops_cofre_resumo','v_meeting_sessions','v_billing_mrr','v_billing_overdue',
    'v_billing_subscriptions','v_proposals','v_marketing_hotmart_sales','v_marketing_outreach',
    'v_marketplace_webhook_status','v_ops_scorecard','v_ops_scorecard_auto','v_playbooks'
  ] loop
    if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
               where n.nspname='public' and c.relname=v and c.relkind='v') then
      execute format('revoke all on public.%I from public', v);
      execute format('revoke all on public.%I from anon', v);
      execute format('grant select on public.%I to service_role', v);
    end if;
  end loop;
end $$;
