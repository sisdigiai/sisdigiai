-- 186 — sai o grant de escrita em view para `authenticated`; as 4 que furavam a RLS fecham
--
-- ✔ APLICADA em 05/10/2026 às 18:00:04 BRT, reensaiada antes (e o ensaio recusou DUAS versões minhas: a
--   guarda do `anon` sem filtro de schema e a constante 46 copiada de censo com definição diferente).
--   Medido depois: atualizáveis-e-donas **4 → 0**; atualizáveis-invoker **46, intactas**; grant inútil em view
--   não atualizável **49 → 0**.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: eu sugeri ao Geral, ao achar na 185 que as duas do cofre tinham INSERT/UPDATE/DELETE/TRUNCATE
--   para `authenticated`, que valia uma passada geral. Ele mediu (só leitura) e devolveu o retrato. Medi de
--   novo por mim antes de agir, e **o meu primeiro agregado deu zero onde o detalhado dá 4** — bug meu:
--   `reloptions` nulo faz `not (null ilike '%security_invoker%')` virar NULL, e a linha não conta. Fica
--   escrito porque é a terceira vez que um NULL ou um escape me engana nesta varredura.
--
-- O RETRATO, conferido nas duas contas:
--   99 views com grant de escrita para `authenticated` · **0 para `anon`**
--   ├─ 50 são atualizáveis de fato (`information_schema.views.is_updatable = YES`)
--   │   ├─ **4 são atualizáveis E rodam como dona** ← o furo: por elas um logado escreveria na tabela-base
--   │   │   passando por cima da RLS, porque a view usa os poderes do dono (`postgres`, com BYPASSRLS).
--   │   └─ 46 são atualizáveis e invoker → ficam como estão: a RLS da base é aplicada na escrita.
--   └─ 49 não são atualizáveis (têm JOIN, agregação ou DISTINCT) → o grant é errado mas inofensivo: o
--       Postgres recusa a escrita antes de olhar permissão. Saem por higiene, não por risco.
--
-- AS 4 QUE IMPORTAM: `v_ops_plataformas`, `v_ops_servicos`, `v_playbooks`, `v_telao_pendencias`.
--   Medido no código antes de revogar: **todas são lidas, nenhuma é escrita.** `plataformas.ts` e
--   `Diagnostico.tsx` do Telão fazem `select=*`; `Pendencias.tsx` faz `select=servico,...`; o
--   `playbookStore.ts` do digiai faz `.select('*')`. Nenhum `.insert`, `.update`, `.upsert` ou `.delete`
--   em nenhum repo. Tirar o grant de escrita não tira funcionalidade de ninguém.
--
-- POR QUE REVOGAR E NÃO VIRAR INVOKER nestas 4: invoker resolveria a escrita, mas 3 delas são definer **de
--   propósito** (o Telão mostra o agregado da casa, e `v_playbooks` não pode ser invoker porque
--   `authenticated` não tem grant em `ops.playbooks` — R-044, achado na 183). Virar invoker esvaziaria ou
--   quebraria telas. Revogar a escrita fecha o furo sem tocar na leitura, que é o que elas existem para dar.
--
-- SEM EXPOSIÇÃO HOJE: 1 usuário no banco, cadastro desligado. Isto é aperto preventivo.
--
-- `service_role` NÃO É TOCADO: webhooks e ingest escrevem por ele. A prova confere.

begin;

-- Retrato das atualizáveis-invoker ANTES de mexer, para o controle positivo comparar contra medição e não
-- contra constante. A 1.ª versão desta migration cravava "46" e a prova falhou dizendo 45 — e o erro era a
-- constante, não o efeito: eu a copiei de um censo que contava `truncate` no teste de escrita, enquanto a
-- prova testava só insert/update/delete. Uma view com só `truncate` concedido entra num conjunto e não no
-- outro. Número copiado de consulta com definição diferente não é prova, é coincidência esperada.
create temp table _186_invoker_antes on commit drop as
select n.nspname as sch, c.relname as nome
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  join information_schema.views iv on iv.table_schema=n.nspname and iv.table_name=c.relname
 where c.relkind='v' and iv.is_updatable='YES'
   and c.reloptions::text ilike '%security_invoker%'
   and (pg_catalog.has_table_privilege('authenticated', c.oid, 'insert')
     or pg_catalog.has_table_privilege('authenticated', c.oid, 'update')
     or pg_catalog.has_table_privilege('authenticated', c.oid, 'delete'));

do $$
declare v_4 int; v_49 int;
begin
  select count(*) into v_4
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join information_schema.views iv on iv.table_schema=n.nspname and iv.table_name=c.relname
   where c.relkind='v' and iv.is_updatable='YES'
     and (c.reloptions is null or not (c.reloptions::text ilike '%security_invoker%'))
     and (pg_catalog.has_table_privilege('authenticated', c.oid, 'insert')
       or pg_catalog.has_table_privilege('authenticated', c.oid, 'update')
       or pg_catalog.has_table_privilege('authenticated', c.oid, 'delete'));
  if v_4 = 0 then raise exception 'nenhuma view atualizavel e dona com escrita — a 186 ja foi aplicada?'; end if;
  if v_4 <> 4 then raise exception 'esperava 4 atualizaveis e donas e achei % — conferir antes', v_4; end if;

  -- e que nenhuma escrita chegue por `anon`, que seria outro problema e maior.
  --
  -- O ENSAIO ME PEGOU AQUI: escrevi esta guarda sem filtro de schema e ela disparou em
  -- `pg_catalog.pg_settings`, que tem UPDATE para `anon`. Fui ver: é do **próprio Postgres** — a view tem
  -- regra que chama `set_config`, e o grant é para PUBLIC por desenho; só deixa a sessão mudar GUC dela
  -- mesma, o que ela já faz com `SET`. Não é furo nosso e mexer em catálogo do sistema seria pior que o
  -- problema. A guarda passa a olhar os schemas da casa, que é o que ela queria dizer desde o início —
  -- e o motivo fica escrito, para ninguém "consertar" o pg_settings depois.
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where c.relkind='v'
                and n.nspname in ('public','analytics','mkt','ops','company','finance','marketing',
                                  'billing','iam')
                and (pg_catalog.has_table_privilege('anon', c.oid, 'insert')
                  or pg_catalog.has_table_privilege('anon', c.oid, 'update')
                  or pg_catalog.has_table_privilege('anon', c.oid, 'delete'))) then
    raise exception 'ha view nossa com escrita para anon — parar e tratar isso primeiro';
  end if;
end $$;

-- 1) as 4 do furo, nomeadas, porque merecem ser lidas uma a uma em vez de sumirem num laço
revoke insert, update, delete, truncate on public.v_ops_plataformas  from authenticated;
revoke insert, update, delete, truncate on public.v_ops_servicos     from authenticated;
revoke insert, update, delete, truncate on public.v_playbooks        from authenticated;
revoke insert, update, delete, truncate on public.v_telao_pendencias from authenticated;

-- 2) as não atualizáveis, em lote. Não pode quebrar nada: o Postgres recusa escrita em view com JOIN,
--    agregação ou DISTINCT antes de consultar permissão. É higiene — grant que não serve confunde quem audita.
do $$
declare r record; v_n int := 0;
begin
  for r in
    select n.nspname as sch, c.relname as nome
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
      join information_schema.views iv on iv.table_schema=n.nspname and iv.table_name=c.relname
     where c.relkind='v' and iv.is_updatable <> 'YES'
       and n.nspname in ('public','analytics','mkt','ops','company','finance','marketing','billing','iam')
       and (pg_catalog.has_table_privilege('authenticated', c.oid, 'insert')
         or pg_catalog.has_table_privilege('authenticated', c.oid, 'update')
         or pg_catalog.has_table_privilege('authenticated', c.oid, 'delete')
         or pg_catalog.has_table_privilege('authenticated', c.oid, 'truncate'))
  loop
    execute format('revoke insert, update, delete, truncate on %I.%I from authenticated', r.sch, r.nome);
    v_n := v_n + 1;
  end loop;
  raise notice '186: grant de escrita revogado em % views nao atualizaveis', v_n;
end $$;

do $$
declare v_n int; v_46 int; v_sr int; v_perdidas text;
begin
  -- a) as 4 fecharam
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where n.nspname='public'
                and c.relname in ('v_ops_plataformas','v_ops_servicos','v_playbooks','v_telao_pendencias')
                and (pg_catalog.has_table_privilege('authenticated', c.oid, 'insert')
                  or pg_catalog.has_table_privilege('authenticated', c.oid, 'update')
                  or pg_catalog.has_table_privilege('authenticated', c.oid, 'delete')
                  or pg_catalog.has_table_privilege('authenticated', c.oid, 'truncate'))) then
    raise exception 'PROVA_186_FALHOU: sobrou escrita em alguma das 4';
  end if;

  -- b) nenhuma view atualizável e dona com escrita restou, em schema nenhum
  select count(*) into v_n
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
    join information_schema.views iv on iv.table_schema=n.nspname and iv.table_name=c.relname
   where c.relkind='v' and iv.is_updatable='YES'
     and (c.reloptions is null or not (c.reloptions::text ilike '%security_invoker%'))
     and (pg_catalog.has_table_privilege('authenticated', c.oid, 'insert')
       or pg_catalog.has_table_privilege('authenticated', c.oid, 'update')
       or pg_catalog.has_table_privilege('authenticated', c.oid, 'delete'));
  if v_n <> 0 then raise exception 'PROVA_186_FALHOU: ainda ha % atualizavel e dona com escrita', v_n; end if;

  -- c) CONTROLE POSITIVO (R-043 §4-A): provar que fechou não é provar que não fechei demais.
  --    As atualizáveis-invoker TÊM de continuar escrevendo — por elas é que telas escrevem, e a RLS da base
  --    é aplicada na escrita. Comparo contra o retrato tirado no início desta transação, NOME POR NOME, e
  --    não contra número: se alguma sumir, a migration diz QUAL, e não só que a conta não fecha.
  select string_agg(a.sch||'.'||a.nome, ', ' order by a.sch, a.nome) into v_perdidas
    from _186_invoker_antes a
   where not exists (
     select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
      where n.nspname=a.sch and c.relname=a.nome
        and (pg_catalog.has_table_privilege('authenticated', c.oid, 'insert')
          or pg_catalog.has_table_privilege('authenticated', c.oid, 'update')
          or pg_catalog.has_table_privilege('authenticated', c.oid, 'delete')));
  if v_perdidas is not null then
    raise exception 'PROVA_186_FALHOU: tirei escrita de view invoker atualizavel: %', v_perdidas;
  end if;

  -- e o retrato não pode ter vindo vazio, senão esta prova não prova nada
  select count(*) into v_46 from _186_invoker_antes;
  if v_46 < 30 then
    raise exception 'PROVA_186_FALHOU: o retrato do inicio tem so % linhas — a prova estaria cega', v_46;
  end if;

  -- d) a LEITURA das 4 continua: é para isso que elas existem
  if not (pg_catalog.has_table_privilege('authenticated','public.v_ops_plataformas','select')
      and pg_catalog.has_table_privilege('authenticated','public.v_ops_servicos','select')
      and pg_catalog.has_table_privilege('authenticated','public.v_playbooks','select')
      and pg_catalog.has_table_privilege('authenticated','public.v_telao_pendencias','select')) then
    raise exception 'PROVA_186_FALHOU: tirei a leitura junto com a escrita';
  end if;
  if (select count(*) from public.v_ops_plataformas) = 0
  or (select count(*) from public.v_telao_pendencias) = 0 then
    raise exception 'PROVA_186_FALHOU: alguma das 4 parou de devolver linha';
  end if;

  -- e) `service_role` intacto: webhook do Mercado Pago, ingest de eventos e sync escrevem por ele
  select count(*) into v_sr
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where c.relkind='v' and n.nspname='public'
     and c.relname in ('v_ops_plataformas','v_ops_servicos','v_playbooks','v_telao_pendencias')
     and pg_catalog.has_table_privilege('service_role', c.oid, 'insert');
  if v_sr <> 4 then
    raise exception 'PROVA_186_FALHOU: mexi no service_role (% de 4) — webhooks escrevem por ele', v_sr;
  end if;

  -- f) e continua ninguém escrevendo por `anon` nas views da casa (pg_catalog.pg_settings é do Postgres,
  --    explicado na guarda de entrada)
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where c.relkind='v'
                and n.nspname in ('public','analytics','mkt','ops','company','finance','marketing',
                                  'billing','iam')
                and (pg_catalog.has_table_privilege('anon', c.oid, 'insert')
                  or pg_catalog.has_table_privilege('anon', c.oid, 'update')
                  or pg_catalog.has_table_privilege('anon', c.oid, 'delete'))) then
    raise exception 'PROVA_186_FALHOU: apareceu escrita para anon em view nossa';
  end if;
end $$;

commit;
