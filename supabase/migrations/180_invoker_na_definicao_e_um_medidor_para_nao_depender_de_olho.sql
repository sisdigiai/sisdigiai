-- 180 — o invoker volta DENTRO da definição da view, e a casa ganha um medidor
--
-- ✔ APLICADA em 05/10/2026 às 16:24:32 BRT, reensaiada antes. Medido depois: `events_humanos` com
--   `security_invoker=true` na definição; as três views da 177 (funnel_daily, funnel_summary, v_ops_pixels)
--   continuam invoker — não foram recriadas depois. `ops.v_views_sem_invoker` lista **36**, 1 legível por anon.
--
-- (Escrita como NÃO APLICADA.)
--
-- O ERRO, QUE FOI MEU E FOI O MESMO DUAS VEZES: a 177 pôs `security_invoker` em `analytics.events_humanos`
--   por `alter view ... set (...)`. Uma hora depois a 178 fez `create or replace view` para somar o filtro de
--   teste — e **`create or replace view` zera as reloptions que não estão na própria cláusula `with`**. A view
--   voltou a rodar como dona (postgres, que tem BYPASSRLS neste banco) e o log voltou a abrir para qualquer
--   `authenticated`, com sessão, url e `utm_content` — que carrega `lead_id`.
--
-- QUEM ACHOU: o agente do MKT, medindo `reloptions` às 16h20. Pela SEGUNDA vez foi o olho dele, não o meu.
--   Na primeira eu disse "toda view nova nasce invoker" e cumpri — e então quebrei por um caminho que a frase
--   não cobria. A frase certa é mais estreita: **`with (security_invoker = true)` vai na definição, sempre,
--   em toda recriação**, porque `alter view` depois é uma opção que a próxima recriação apaga em silêncio.
--
-- POR QUE UM MEDIDOR, e não só o conserto: duas vezes seguidas o defeito foi achado por alguém olhando. Isso
--   não é controle, é sorte com testemunha. `ops.v_views_sem_invoker` passa a listar toda view legível por
--   `anon`/`authenticated` nos schemas da casa que roda como dona — e a prova desta migration usa a própria
--   lista. Ela não lê dado nenhum: só nome de view e reloption do catálogo.
--
-- O QUE A LISTA JÁ MOSTRA, e NÃO é consertado aqui: **37 de 194** views estão sem invoker, uma delas legível
--   por `anon` (`public.v_telao_afericao`). Conserto só a que eu quebrei hoje. As outras 36 são anteriores a
--   mim, cada uma precisa ser lida antes (view de contrato sem PII que agrega entre tenants pode ser definer
--   DE PROPÓSITO — virar invoker esvaziaria a tela). Vai como achado para o dono e para o agente de segurança,
--   com a lista na mão. Consertar 36 views no escuro trocaria um vazamento por 36 telas vazias.

begin;

do $$
begin
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where n.nspname='analytics' and c.relname='events_humanos'
                and c.reloptions::text ilike '%security_invoker%') then
    raise exception 'events_humanos ja esta invoker — a 180 ja foi aplicada?';
  end if;
end $$;

-- 1) o conserto: o invoker vai na DEFINIÇÃO, não em alter depois
create or replace view analytics.events_humanos
  with (security_invoker = true) as
  select * from analytics.events_log
   where automatico is not true and teste is not true;

comment on view analytics.events_humanos is
  '175/178/180: events_log sem robô (automatico) e sem teste declarado (teste), RESPEITANDO A RLS do log '
  '(security_invoker na própria definição — alter view depois é apagado pela próxima recriação). Responde '
  '"quanta gente fazendo coisa de verdade". Log cru: events_log.';

-- 2) o medidor, para o próximo erro deste tipo ser achado por máquina e não por olho
create or replace view ops.v_views_sem_invoker
  with (security_invoker = true) as
  select n.nspname                                              as schema,
         c.relname                                              as view,
         pg_catalog.has_table_privilege('anon', c.oid, 'select') as legivel_por_anon,
         coalesce(array_to_string(c.reloptions, ', '), '(nenhuma)') as reloptions,
         obj_description(c.oid, 'pg_class')                      as comentario
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where c.relkind = 'v'
     and n.nspname in ('public','analytics','mkt','ops','company','finance','marketing')
     and (pg_catalog.has_table_privilege('anon', c.oid, 'select')
       or pg_catalog.has_table_privilege('authenticated', c.oid, 'select'))
     and (c.reloptions is null or not (c.reloptions::text ilike '%security_invoker%'))
   order by pg_catalog.has_table_privilege('anon', c.oid, 'select') desc, 1, 2;

comment on view ops.v_views_sem_invoker is
  '180: view legível pelo app que roda como DONA (postgres tem BYPASSRLS aqui) — a RLS não a protege. '
  'Nem toda linha é defeito: view de contrato que agrega entre tenants pode ser definer de propósito, mas '
  'então precisa de filtro explícito escrito nela (R-043). Linha com legivel_por_anon = true é prioridade. '
  'Não lê dado: só catálogo.';

grant select on ops.v_views_sem_invoker to authenticated;

do $$
declare v_opts text; v_sem int; v_anon int; v_antes int;
begin
  -- a) a view que eu quebrei está consertada, e consertada na DEFINIÇÃO
  select array_to_string(reloptions, ',') into v_opts
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='analytics' and c.relname='events_humanos';
  if v_opts is null or v_opts not ilike '%security_invoker%' then
    raise exception 'PROVA_180_FALHOU: events_humanos continua sem invoker (%)', coalesce(v_opts,'null');
  end if;
  if v_opts ilike '%security_invoker=false%' or v_opts ilike '%security_invoker=off%' then
    raise exception 'PROVA_180_FALHOU: invoker gravado como falso (%)', v_opts;
  end if;

  -- b) ela sumiu da lista do medidor — que é o teste de que o medidor mede
  if exists (select 1 from ops.v_views_sem_invoker where schema='analytics' and view='events_humanos') then
    raise exception 'PROVA_180_FALHOU: consertei a view e o medidor nao percebeu';
  end if;

  -- c) CONTROLE POSITIVO (R-043 §4-A): o medidor não pode estar vazio por estar quebrado. As 36 que eu NÃO
  --    conserto têm de continuar aparecendo, e a legível por anon tem de estar entre elas.
  select count(*), count(*) filter (where legivel_por_anon) into v_sem, v_anon from ops.v_views_sem_invoker;
  if v_sem < 30 then
    raise exception 'PROVA_180_FALHOU: o medidor achou só % — media 37 antes, ele esta cego', v_sem;
  end if;
  if v_anon < 1 then
    raise exception 'PROVA_180_FALHOU: a view legivel por anon (v_telao_afericao) desapareceu da lista';
  end if;

  -- d) e o filtro não se perdeu no caminho: a recriação mantém robô e teste fora
  if exists (select 1 from analytics.events_humanos where automatico or teste) then
    raise exception 'PROVA_180_FALHOU: a recriacao perdeu o filtro de robo/teste';
  end if;

  raise notice '180: % views sem invoker, % delas legiveis por anon — achado para o dono', v_sem, v_anon;
end $$;

commit;
