-- 148 — passo 3 do estado automático dos apps: sinais de deploy medidos na nuvem a cada 30 min
--
-- ✔ APLICADA em 22/09/2026 às 07:52:49 BRT (job 49), com a palavra do dono neste canal ("próximo da fila"), reensaiada antes.
--   Edge sinais-deploy v1 (verify_jwt true). Provas: anon 401 (com e sem header de cron); app de prova com 3 urls → repo
--   do GitHub fora, app.digiai.app.br 200 build fe96fdc, url inexistente sem resposta → ok false, degrau 1; sem a url
--   quebrada → ok true, v_ops_apps_estado degrau 2 "medido: no ar". App e sinais de prova apagados (ops.apps 0, sinais 0).
--
-- (Escrita como NÃO APLICADA.)
--
-- CONTRATO: docs/contrato-estado-automatico-dos-apps-2026-09-16.md, item E / passo 3. Sem segredo novo: o cron usa o
--   marketing_sync_cron_secret que já está no vault (125) e a edge sinais-deploy confere pelo mesmo portão das
--   marketing-sync-* (cron com segredo, ou staff validado no Auth + is_staff()).
--
-- O QUE CRIA: public.run_sinais_deploy() (só postgres/service_role) + job pg_cron 'sinais-deploy' em 7 e 37 de cada hora
--   (fora do minuto cheio de outros jobs). A edge lê ops.apps (ativo) e grava 1 sinal 'deploy' por app via
--   ops.fn_registrar_sinal_app (140). A view v_ops_apps_estado já consome: degrau 2 = deploy ok há menos de 2 h.
--
-- LIMITE HONESTO: em 22/09 ops.apps tem 0 linhas — as fichas entram pelo runner local (passo 4, espera o segredo do
--   dono). Até lá o job roda e responde "ops.apps vazia"; não mede nada e não inventa app.

begin;

do $$
begin
  if to_regprocedure('public.run_sinais_deploy()') is not null or exists (select 1 from cron.job where jobname = 'sinais-deploy') then
    raise exception 'run_sinais_deploy ou job sinais-deploy ja existe — a 148 ja foi aplicada?';
  end if;
end $$;

create function public.run_sinais_deploy()
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_anon text; v_cron text; v_id bigint;
begin
  select decrypted_secret into v_anon from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;
  select decrypted_secret into v_cron from vault.decrypted_secrets where name = 'marketing_sync_cron_secret' limit 1;
  -- sem segredo não dispara: um POST sem header seria recusado lá e pareceria medição falha
  if v_anon is null or v_cron is null then
    raise exception 'run_sinais_deploy: supabase_anon_key ou marketing_sync_cron_secret ausente no vault';
  end if;
  select net.http_post(
    url := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/sinais-deploy',
    body := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json', 'Authorization', 'Bearer ' || v_anon,
                                  'x-marketing-sync-cron', v_cron),
    timeout_milliseconds := 60000
  ) into v_id;
  return v_id;
end;
$$;
comment on function public.run_sinais_deploy() is
  '148: dispara a edge sinais-deploy (passo 3 do estado automático dos apps). Retorna o id do pedido em net._http_response.';
revoke all on function public.run_sinais_deploy() from public, anon, authenticated;
grant execute on function public.run_sinais_deploy() to service_role;

select cron.schedule('sinais-deploy', '7,37 * * * *', 'select public.run_sinais_deploy();');

do $$
begin
  if has_function_privilege('anon', 'public.run_sinais_deploy()', 'execute')
  or has_function_privilege('authenticated', 'public.run_sinais_deploy()', 'execute') then
    raise exception 'anon/authenticated disparam a medicao.';
  end if;
  if not exists (select 1 from cron.job where jobname = 'sinais-deploy' and schedule = '7,37 * * * *' and active) then
    raise exception 'job sinais-deploy nao ficou ativo.';
  end if;
end $$;

commit;
