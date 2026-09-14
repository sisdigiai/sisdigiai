-- 125 — as marketing-sync-* deixam de obedecer a qualquer portador da chave anon
--
-- ⚠ NÃO APLICADA. Pedido do Orquestrador Geral (14/09/2026), prioridade: o fecho tem de
--    vir ANTES de o dono reautorizar o GSC (portão 130).
--
-- ORDEM: 125 aplicada → deploy das três edges do mesmo commit.
--   Com a 125 e as edges velhas: nada muda (as velhas ignoram o header novo).
--   Com as edges novas sem a 125: o cron das 09:00 UTC é recusado (401) — o botão da
--   tela, com sessão de staff, continua a funcionar.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O BURACO, medido em 14/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
-- marketing-sync-cloudflare, -bing e -gsc usam por dentro a própria service_role e não
-- conferem quem chama. verify_jwt=true só exige UM JWT válido — e a chave anon é um JWT
-- válido, pública por desenho (bundle do app; 4 arquivos do repo público). Qualquer um
-- dispara os syncs (cota das APIs + DELETE/INSERT em company.metrics). E a -gsc tem o
-- modo action:"exchange_code", que grava um refresh_token novo via
-- fn_set_credential_service: com o client_id da casa (público na URL de consentimento)
-- e a própria conta Google, um anônimo SUBSTITUI a credencial GSC da DIGIAI.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O PORTÃO (nas três edges, commit deste arquivo)
-- ═══════════════════════════════════════════════════════════════════════════
--   sync ............ cron (header x-marketing-sync-cron = segredo do vault) OU staff
--   exchange_code ... SÓ staff
--   staff = JWT de usuário validado no Auth (auth.getUser, não decode local) E
--           public.is_staff() verdadeiro no banco, chamado com o JWT dele (R-037).
--   A anon key falha no getUser. Qualquer erro fecha (401/403), nunca abre.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE NINGUÉM DIGITA SEGREDO
-- ═══════════════════════════════════════════════════════════════════════════
-- O pedido previa um secret de edge para o dono digitar. Não é preciso: as duas pontas
-- que conferem o segredo já têm acesso ao vault — o cron (SQL, security definer) e as
-- edges (service_role, pela RPC abaixo). O valor nasce aqui, aleatório (32 bytes), e
-- nenhum humano nem agente o vê: nada a copiar, nada a vazar num chat, nada a rodar
-- fora de sincronia entre dois lugares. Rodar = vault.update_secret; as duas pontas
-- leem o novo na chamada seguinte.
-- E a chave anon do cabeçalho Authorization sai do corpo da função: passa a ser lida
-- de vault 'supabase_anon_key' (medido: igual à que está hoje no corpo).

begin;

do $$
declare n int;
begin
  select count(*) into n from vault.secrets where name = 'marketing_sync_cron_secret';
  if n > 0 then
    raise exception 'marketing_sync_cron_secret já existe no vault — a 125 já foi aplicada?';
  end if;

  -- a anon do vault é a mesma do corpo atual: trocar a fonte não muda o que o gateway recebe
  if (select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key')
     is distinct from substring((select prosrc from pg_proc where oid = 'public.run_marketing_sync_daily()'::regprocedure) from 'Bearer ([A-Za-z0-9._-]+)') then
    raise exception 'vault supabase_anon_key difere da chave no corpo de run_marketing_sync_daily — conferir antes.';
  end if;

  select count(*) into n from cron.job
   where jobname = 'marketing-sync-daily' and command ~ 'run_marketing_sync_daily\(\)';
  if n <> 1 then
    raise exception 'cron marketing-sync-daily não é o medido (select public.run_marketing_sync_daily()).';
  end if;
end $$;

select vault.create_secret(
  encode(extensions.gen_random_bytes(32), 'hex'),
  'marketing_sync_cron_secret',
  'Header x-marketing-sync-cron: o cron run_marketing_sync_daily manda, as edges marketing-sync-* conferem (migration 125). Ninguém digita; rodar com vault.update_secret.'
);

create or replace function public.fn_marketing_sync_cron_secret()
returns text
language sql
stable
security definer
set search_path = public, vault
as $$
  select decrypted_secret from vault.decrypted_secrets where name = 'marketing_sync_cron_secret' limit 1;
$$;
-- default privileges do schema public dão EXECUTE a anon e authenticated: tirar de propósito
revoke all on function public.fn_marketing_sync_cron_secret() from public, anon, authenticated;
grant execute on function public.fn_marketing_sync_cron_secret() to service_role;

create or replace function public.run_marketing_sync_daily()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  base text := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/';
  fn text;
  v_anon text;
  v_cron text;
begin
  select decrypted_secret into v_anon from vault.decrypted_secrets where name = 'supabase_anon_key' limit 1;
  select decrypted_secret into v_cron from vault.decrypted_secrets where name = 'marketing_sync_cron_secret' limit 1;
  -- sem segredo não dispara: um POST sem header seria recusado lá e pareceria sync falho
  if v_anon is null or v_cron is null then
    raise exception 'run_marketing_sync_daily: supabase_anon_key ou marketing_sync_cron_secret ausente no vault';
  end if;

  foreach fn in array array['marketing-sync-cloudflare','marketing-sync-bing','marketing-sync-gsc'] loop
    perform net.http_post(
      url := base || fn,
      body := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_anon,
        'x-marketing-sync-cron', v_cron
      ),
      timeout_milliseconds := 30000
    );
  end loop;
end
$fn$;

do $$
declare n int;
begin
  select count(*) into n from vault.decrypted_secrets
   where name = 'marketing_sync_cron_secret' and length(decrypted_secret) = 64;
  if n <> 1 then raise exception 'segredo do cron não ficou no vault com 64 hex.'; end if;

  if has_function_privilege('anon', 'public.fn_marketing_sync_cron_secret()', 'execute')
  or has_function_privilege('authenticated', 'public.fn_marketing_sync_cron_secret()', 'execute') then
    raise exception 'anon ou authenticated consegue ler o segredo do cron.';
  end if;
  if not has_function_privilege('service_role', 'public.fn_marketing_sync_cron_secret()', 'execute') then
    raise exception 'service_role não consegue ler o segredo — as edges recusariam o cron.';
  end if;

  -- o replace mantém o ACL da 084 (sem anon/authenticated)
  if has_function_privilege('anon', 'public.run_marketing_sync_daily()', 'execute')
  or has_function_privilege('authenticated', 'public.run_marketing_sync_daily()', 'execute') then
    raise exception 'run_marketing_sync_daily ficou executável por anon/authenticated.';
  end if;

  -- nenhuma chave literal no corpo
  select count(*) into n from pg_proc
   where oid = 'public.run_marketing_sync_daily()'::regprocedure and prosrc ~ 'eyJ[A-Za-z0-9_-]{10,}';
  if n > 0 then raise exception 'Ainda há JWT literal no corpo de run_marketing_sync_daily.'; end if;

  if (select public.fn_marketing_sync_cron_secret()) is distinct from
     (select decrypted_secret from vault.decrypted_secrets where name = 'marketing_sync_cron_secret') then
    raise exception 'A RPC não devolve o mesmo segredo que o cron manda.';
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS (depois da 125 E do deploy das três edges)
-- ═══════════════════════════════════════════════════════════════════════════
--   a) POST com a anon e sem header → 401 nao_autorizado nas três (antes: sync corria);
--   b) POST {action:"exchange_code"} com a anon → 401, e company.api_credentials do GSC
--      com o mesmo vault_secret_id de antes (o 403 do cron nesse modo é só por código:
--      o segredo não sai do vault para ser testado de fora);
--   c) select public.run_marketing_sync_daily() → em net._http_response, cloudflare e
--      bing 200 e gsc 500 invalid_grant (até o dono reautorizar) — NÃO 401;
--   d) botão da tela SEO com a sessão do dono → sync corre (staff).
