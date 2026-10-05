-- 177 — a view que eu criei ontem furava a RLS; e as duas do funil davam INSERT/DELETE ao usuário logado
--
-- ✔ APLICADA em 05/10/2026 às 15:59:12 BRT, reensaiada antes. Estado: events_humanos, funnel_daily e
--   funnel_summary invoker, só com SELECT para authenticated, anon sem nada; e as três continuam abrindo
--   para authenticated (controle positivo passou).
--
-- (Escrita como NÃO APLICADA.)
--
-- ACHADO PELO MKT, em 05/10, e é R-043 — a mesma regra que eu venho cobrando dos outros o dia inteiro:
--   criei `analytics.events_humanos` na 175 **sem `security_invoker`**. `analytics.events_log` tem RLS que só
--   deixa staff ler; a view, sendo de dono, passa por cima: qualquer `authenticated` com SELECT nela veria o
--   log inteiro — sessão, url e `utm_content`, que na landing do Clearix carrega o **id do lead**.
--   Por isso ele preferiu filtrar dentro das views dele a trocar a fonte: trocar herdaria a abertura.
--
-- E AO MEDIR, ACHEI PIOR: `v_analytics_funnel_daily` e `v_analytics_funnel_summary` (anteriores a mim) são de
--   dono E têm **INSERT, UPDATE, DELETE, TRUNCATE** concedidos a `authenticated`. Escrita em view agregada
--   falharia na prática, mas grant que não deveria existir é porta que ninguém lembra de fechar depois.
--
-- POR QUE ISSO NÃO É TEÓRICO, mesmo com um usuário só: hoje `iam.users` tem uma linha, o dono, super_admin.
--   O portão não pode depender de a casa ter um morador. No dia em que entrar o primeiro usuário de equipe —
--   e a régua de entitlements existe justamente para isso — a abertura já estaria lá, feita por mim.
--
-- CONTROLE POSITIVO (R-043 §4-A, a regra que nasceu do meu erro na 158): não basta provar que fecha. As três
--   views precisam continuar ABRINDO para authenticated depois de virarem invoker. Conferido antes: staff tem
--   SELECT em events_log, events_catalog e events_humanos, e EXECUTE em fn_origem_real — então a tela não
--   quebra. A prova no fim exige isso explicitamente.

begin;

do $$
begin
  if (select option_value from pg_options_to_table(
        (select reloptions from pg_class c join pg_namespace n on n.oid=c.relnamespace
          where n.nspname='analytics' and c.relname='events_humanos'))
       where option_name='security_invoker') in ('true','on') then
    raise exception 'events_humanos ja e invoker — a 177 ja foi aplicada?';
  end if;
end $$;

alter view analytics.events_humanos set (security_invoker = true);
alter view public.v_analytics_funnel_daily set (security_invoker = true);
alter view public.v_analytics_funnel_summary set (security_invoker = true);

-- tela de leitura não escreve: tira o que nunca deveria estar lá
revoke all on public.v_analytics_funnel_daily from authenticated, anon;
revoke all on public.v_analytics_funnel_summary from authenticated, anon;
grant select on public.v_analytics_funnel_daily to authenticated, service_role;
grant select on public.v_analytics_funnel_summary to authenticated, service_role;
revoke all on analytics.events_humanos from anon;
grant select on analytics.events_humanos to authenticated, service_role;

do $$
declare v_modo text; v_n int;
begin
  foreach v_modo in array array['analytics.events_humanos','public.v_analytics_funnel_daily','public.v_analytics_funnel_summary']
  loop
    if (select coalesce((select option_value from pg_options_to_table(c.reloptions) where option_name='security_invoker'),'nao')
          from pg_class c where c.oid = v_modo::regclass) not in ('true','on') then
      raise exception 'PROVA_177_FALHOU: % nao ficou invoker', v_modo;
    end if;
  end loop;

  -- escrita não pode sobrar em tela de leitura
  if has_table_privilege('authenticated','public.v_analytics_funnel_daily','insert')
  or has_table_privilege('authenticated','public.v_analytics_funnel_summary','delete') then
    raise exception 'PROVA_177_FALHOU: sobrou grant de escrita na view de leitura';
  end if;
  if has_table_privilege('anon','analytics.events_humanos','select') then
    raise exception 'PROVA_177_FALHOU: anon le os eventos';
  end if;

  -- CONTROLE POSITIVO: as tres tem de ABRIR como authenticated, senao eu fechei a tela junto com o buraco
  begin
    set local role authenticated;
    perform 1 from analytics.events_humanos limit 1;
    perform 1 from public.v_analytics_funnel_daily limit 1;
    perform 1 from public.v_analytics_funnel_summary limit 1;
    reset role;
  exception when insufficient_privilege then
    reset role;
    raise exception 'PROVA_177_FALHOU: authenticated apanha permission denied — fechei a tela junto';
  end;
end $$;

commit;
