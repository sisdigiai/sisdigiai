-- 184 — lote 2c: policy nas 3 tabelas do ops que ninguém lia, e as 3 views que elas travavam viram invoker
--
-- ✔ APLICADA em 05/10/2026 às 16:50:43 BRT, reensaiada antes. Depois: 26 → **23** donas, 0 por anon.
--   Falta a conferência na tela do dono: **Placar e Mapa**.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: achado da 183 (RLS ligada com ZERO policies em ops.scorecard_entries, ops.scorecard_metrics
--   e ops.bairro_coordenada) + delegação do Orquestrador Geral em 05/10: escrita em `ops` é dele, e ele
--   delegou esta para não haver dois escritores na mesma cadeia de migrations.
--
-- O ESTADO ABSURDO QUE ISTO CONSERTA: as três tinham RLS ligada e policy nenhuma. RLS sem policy não é
--   "aberto", é **fechado para todos** — nem o dono lia. As views que as usam só funcionavam porque eram
--   donas (`postgres` tem BYPASSRLS). Ou seja: a proteção estava ligada, não protegia nada de útil, e
--   impedia qualquer view honesta de existir sobre elas. Virar invoker antes desta migration teria esvaziado
--   o Placar e os pontos aproximados do mapa — calados.
--
-- MOLDE: igual a `contas_servicos_staff_select` (migration 072 em diante) — policy de SELECT para
--   `authenticated` com `using (is_staff())`, mais o `grant select` na MESMA migration. Grant sem policy e
--   policy sem grant falham de formas diferentes e igualmente silenciosas; é por isso que andam juntos.
--
-- `ops.bairro_coordenada` JÁ TEM grant — só faltava a policy. As outras duas faltavam as duas coisas.
--
-- AS 3 VIEWS SAEM DA COLUNA (B) PARA A (A), e os comentários da 183 (que diziam "fica DEFINER porque a base
--   não tem policy") são reescritos. Comentário que descreve um estado que deixou de existir mente.
--
-- O QUE PROVO E O QUE NÃO PROVO, igual aos lotes anteriores:
--   PROVO: anon é NEGADO (sem grant); `authenticated` sem papel lê ZERO; e o conteúdo visto como dona é o
--     mesmo de antes (não perdi linha pelo caminho).
--   NÃO PROVO: que a sessão do dono lê. `set role` não carrega JWT, logo `is_staff()` responde false para
--     qualquer papel que eu finja. Por construção: ele é `super_admin` ativo em `iam.users` com `auth_id`
--     casando, e `is_staff()` aceita super_admin. A conferência na tela é dele (R-005) — Placar e Mapa.
--
--   DESFAZER: drop policy <nome> on <tabela>; revoke select ... ; alter view ... set (security_invoker=false);

begin;

do $$
declare v_pol int;
begin
  select count(*) into v_pol from pg_policies
   where schemaname='ops' and tablename in ('scorecard_entries','scorecard_metrics','bairro_coordenada');
  if v_pol <> 0 then
    raise exception 'as 3 tabelas ja tem policy (%) — a 184 ja foi aplicada?', v_pol;
  end if;

  -- a premissa do achado: RLS tem de estar LIGADA nas três. Se estiver desligada, o problema é outro e esta
  -- migration estaria pondo policy onde ela não é lida.
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
       where n.nspname='ops' and c.relname in ('scorecard_entries','scorecard_metrics','bairro_coordenada')
         and c.relrowsecurity) <> 3 then
    raise exception 'alguma das 3 nao tem RLS ligada — rever o achado antes de por policy';
  end if;

  if not exists (select 1 from iam.users where email='junior@oticastatymello.com.br'
                   and role='super_admin' and status='active' and deleted_at is null and auth_id is not null) then
    raise exception 'a linha do dono no iam.users nao esta como eu medi — parar antes de filtrar as telas dele';
  end if;
end $$;

create policy scorecard_entries_staff_select on ops.scorecard_entries
  for select to authenticated using (is_staff());
grant select on ops.scorecard_entries to authenticated;

create policy scorecard_metrics_staff_select on ops.scorecard_metrics
  for select to authenticated using (is_staff());
grant select on ops.scorecard_metrics to authenticated;

create policy bairro_coordenada_staff_select on ops.bairro_coordenada
  for select to authenticated using (is_staff());
-- (o grant desta já existia; é o único caso dos três em que só a policy faltava)

alter view public.v_ops_scorecard             set (security_invoker = true);
alter view public.v_ops_frescor               set (security_invoker = true);
alter view public.v_ops_cobertura_aproximada  set (security_invoker = true);

comment on view public.v_ops_scorecard is
  '184: security_invoker. As bases ops.scorecard_entries e _metrics ganharam policy de staff e grant nesta '
  'mesma migration — antes tinham RLS ligada com ZERO policies, o que travava qualquer view honesta sobre '
  'elas. Substitui o comentário da 183, que descrevia o estado anterior.';
comment on view public.v_ops_frescor is
  '184: security_invoker. Lê 5 fontes; a que faltava era ops.scorecard_entries, que ganhou policy e grant '
  'nesta migration. Substitui o comentário da 183.';
comment on view public.v_ops_cobertura_aproximada is
  '184: security_invoker. ops.bairro_coordenada tinha grant mas nenhuma policy; ganhou a de staff aqui. '
  'Substitui o comentário da 183.';

do $$
declare v_dona_sc int; v_dona_cob int; v_sem int; v_n int; v_erro text;
begin
  -- a) como dona (postgres), o conteúdo continua lá: não perdi linha ao mexer na RLS
  select count(*) into v_dona_sc  from public.v_ops_scorecard;
  select count(*) into v_dona_cob from public.v_ops_cobertura_aproximada;
  if v_dona_sc = 0 or v_dona_cob = 0 then
    raise exception 'PROVA_184_FALHOU: placar=% mapa=% — esvaziei o que devia preservar', v_dona_sc, v_dona_cob;
  end if;

  -- b) authenticated SEM papel lê zero. É o efeito que se quer: antes lia tudo, porque a view era dona.
  set local role authenticated;
  select count(*) into v_sem from public.v_ops_scorecard;
  reset role;
  if v_sem <> 0 then
    raise exception 'PROVA_184_FALHOU: sessao sem papel le % de % no placar', v_sem, v_dona_sc;
  end if;

  set local role authenticated;
  select count(*) into v_sem from public.v_ops_cobertura_aproximada;
  reset role;
  if v_sem <> 0 then
    raise exception 'PROVA_184_FALHOU: sessao sem papel ainda le % pontos do mapa', v_sem;
  end if;

  -- c) nenhuma das 3 da erro de PERMISSAO para authenticated (o 403 que o ensaio da 183 achou). Zero linha
  --    e permitido; erro nao e. Se levantar, derruba a migration.
  set local role authenticated;
  perform count(*) from public.v_ops_frescor;
  reset role;

  -- d) anon e NEGADO nas tres tabelas novas — e nas views tambem
  if pg_catalog.has_table_privilege('anon','ops.scorecard_entries','select')
  or pg_catalog.has_table_privilege('anon','ops.scorecard_metrics','select')
  or pg_catalog.has_table_privilege('anon','ops.bairro_coordenada','select') then
    raise exception 'PROVA_184_FALHOU: abri alguma das 3 tabelas para anon';
  end if;
  if (select count(*) from ops.v_views_sem_invoker where legivel_por_anon) <> 0 then
    raise exception 'PROVA_184_FALHOU: apareceu view dona legivel por anon';
  end if;

  -- e) as 3 sairam da lista de donas, e as 3 policies existem
  if exists (select 1 from ops.v_views_sem_invoker
              where view in ('v_ops_scorecard','v_ops_frescor','v_ops_cobertura_aproximada')) then
    raise exception 'PROVA_184_FALHOU: alguma das 3 views continua dona';
  end if;
  select count(*) into v_n from pg_policies
   where schemaname='ops' and tablename in ('scorecard_entries','scorecard_metrics','bairro_coordenada')
     and cmd='SELECT';
  if v_n <> 3 then raise exception 'PROVA_184_FALHOU: esperava 3 policies e achei %', v_n; end if;

  -- f) e os comentarios velhos da 183 nao sobraram dizendo o contrario do que agora e verdade
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where n.nspname='public'
                and c.relname in ('v_ops_scorecard','v_ops_frescor','v_ops_cobertura_aproximada')
                and obj_description(c.oid,'pg_class') ilike '%fica DEFINER%') then
    raise exception 'PROVA_184_FALHOU: sobrou comentario dizendo que a view fica dona';
  end if;

  select count(*) into v_n from ops.v_views_sem_invoker;
  if v_n <> 23 then raise exception 'PROVA_184_FALHOU: esperava 23 donas restantes e achei %', v_n; end if;
end $$;

commit;
