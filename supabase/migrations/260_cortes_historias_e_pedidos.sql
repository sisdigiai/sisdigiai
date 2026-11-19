-- ============================================================
-- APLICADA em 18/11/2026 pelo agente do app digiai (ensaio com rollback + 4 sabotagens antes) — cortes, 3.ª migration: a base de histórias (o índice no banco) e o pedido de capítulo
-- Banco: o da casa (hswyopqvnolqpmprqvzh). Depende da 1.ª e da 2.ª, aplicadas em 16 e 17/11/2026.
-- Pedido/decisão: dono, canal do DIGIAI Cortes, 17/11/2026: "cada agent que incluiu informações do seu app no
--   cockpit, tem que atualizar com as datas do problema o que resolvemos e tudo, assim tendo isso no banco,
--   incluímos a IA para montar tudo"; e, sobre o desenho (docs/MODELO-historias-e-videos.md): "É esse, segue".
--   Em 18/11/2026, 19h50, mesmo canal: perguntei "Monto no app a esteira de capítulos, a tela de ideias e o botão
--   de pedir o capítulo 2?", tendo escrito antes que isso depende desta migration e que ela pede o pode dele;
--   ele respondeu "Sim, monta". APLICAR é do agente dono do banco (app digiai), com o ensaio dele.
-- O que é: a verdade de cada história é o arquivo em Cockpit/bastidores/<domínio>/historias/. Esta tabela é a
--   cópia que a tela publicada e a montagem leem. Quem copia é o motor local (motor/historias.py), pela função
--   cortes-gravar do servidor (padrão: Cockpit/Harness/padrao-processo-local-grava-no-banco.md).
-- O que NÃO vem para o banco: o "Registro completo" da história (fica só no arquivo).
-- O pedido de capítulo: o dono escolhe as histórias na tela publicada e pede. O banco confere que é ele e que cada
--   história existe, está liberada, não foi usada e não está em outro pedido aberto. O motor lê os pedidos abertos
--   pela função do servidor e devolve o andamento (em roteiro, virou episódio). Cancelar é só do dono.
-- Ensaio: FEITO em 18/11/2026 (rollback). Quatro sabotagens conferidas: sem conferir liberada, portao do dono
--   caido, motor lendo pedido cancelado, e a 3-d frouxa. As provas 3-f a 3-i sao do agente do app digiai.
-- Regras: [x] R-044 tabela no schema do domínio, public só view e RPC  [x] R-043 view invoker; RPC invoker com
--   portão de papel explícito e coalesce  [x] R-037 leitura pela equipe decidida no banco (is_staff)
--   [x] grant de função nova na mesma migration  [x] sem PII (não há tabela de pessoa; `pedido_por` é o auth.uid()
--   e não sai na view)  [x] reversão escrita abaixo
-- A função do servidor (cortes-gravar) ganha três ações, que são do app digiai:
--   {"acao":"historias","historias":[...]}                        → rpc cortes_gravar_historias({p: {historias}})
--   {"acao":"pedidos"}                                            → rpc cortes_ler_pedidos()
--   {"acao":"pedido","id":"...","estado":"...","episodio":"..."}  → rpc cortes_gravar_pedido({p: {id, estado, episodio}})
-- ============================================================
begin;

-- 1) Trava de entrada
do $$ begin
  if to_regclass('cortes.episodios') is null or to_regprocedure('public.cortes_gravar_episodio(jsonb)') is null then
    raise exception 'a 1.ª e a 2.ª migration do cortes não estão aplicadas';
  end if;
  if to_regclass('cortes.historias') is not null or to_regclass('cortes.pedidos') is not null then
    raise exception 'cortes.historias ou cortes.pedidos já existe';
  end if;
  if to_regprocedure('public.current_role_code()') is null then
    raise exception 'falta public.current_role_code()';
  end if;
  if to_regprocedure('public.is_staff()') is null then
    raise exception 'falta o portão da casa (is_staff)';
  end if;
end $$;

-- 2) Obra
create table cortes.historias (
  id                 text primary key,                        -- clearix-2026-11-13-01
  dominio            text not null check (dominio in ('clearix', 'geral')),
  apps               text[] not null default '{}',
  titulo             text not null,
  estado             text not null,                           -- aberto, corrigido, aplicado, regra_em_uso, contestado...
  data_do_fato       date,
  data_do_problema   date,                                    -- quando começou
  data_da_descoberta date,                                    -- quando alguém viu
  data_do_conserto   date,                                    -- nulo enquanto está aberta
  gancho             text not null default '',
  fato               text not null default '',
  conserto           text not null default '',
  aprendizado        text not null default '',
  numeros_no_ar      text not null default '',
  nao_vai_ao_ar      text not null default '',
  fonte              text not null default '',
  rende              text[] not null default '{}',
  liberada           boolean not null default false,          -- o sim de quem confere o domínio (eco ou Geral)
  completa           boolean not null default false,          -- as datas, em ordem, e a fonte
  falta              text[] not null default '{}',            -- o que falta para ser completa, em frases
  pronta_para_video  boolean not null default false,
  usado_em           text not null default '',
  arquivo            text not null,                           -- caminho no Cockpit: é lá que a verdade mora
  marca              text not null,                           -- impressão digital do arquivo
  criado_em          timestamptz not null default now(),
  atualizado_em      timestamptz not null default now(),
  check (data_do_problema is null or data_da_descoberta is null or data_do_problema <= data_da_descoberta),
  check (data_da_descoberta is null or data_do_conserto is null or data_da_descoberta <= data_do_conserto)
);
create index historias_fila_idx on cortes.historias (pronta_para_video, data_do_conserto);
comment on table cortes.historias is
  'Índice das histórias dos bastidores. A verdade é o arquivo em Cockpit/bastidores; esta tabela é cópia feita pelo motor do DIGIAI Cortes.';

alter table cortes.historias enable row level security;
create policy equipe_le on cortes.historias for select to authenticated using (public.is_staff());
grant select on cortes.historias to authenticated;
grant all on cortes.historias to service_role;      -- o grant da 1.ª só cobriu as tabelas daquele dia

create view public.v_cortes_historias with (security_invoker = true) as
  select h.id, h.dominio, h.apps, h.titulo, h.estado, h.data_do_fato, h.data_do_problema, h.data_da_descoberta,
         h.data_do_conserto, h.gancho, h.fato, h.conserto, h.aprendizado, h.numeros_no_ar, h.nao_vai_ao_ar, h.fonte,
         h.rende, h.liberada, h.completa, h.falta, h.pronta_para_video, h.usado_em, h.arquivo, h.atualizado_em
    from cortes.historias h;
revoke all on public.v_cortes_historias from public, anon;
grant select on public.v_cortes_historias to authenticated, service_role;

-- a escrita: só a chave de serviço (a função cortes-gravar do servidor). Uma chamada leva a base inteira e pode
-- ser repetida. História que sumiu dos arquivos não é apagada aqui: apagar é decisão de gente.
create function public.cortes_gravar_historias(p jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare h jsonb; n int := 0;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'sem permissão para gravar no cortes' using errcode = '42501';
  end if;
  for h in select * from jsonb_array_elements(coalesce(nullif(p -> 'historias', 'null'::jsonb), '[]'::jsonb)) loop
    if coalesce(h ->> 'id', '') = '' or coalesce(h ->> 'titulo', '') = '' or coalesce(h ->> 'arquivo', '') = ''
       or coalesce(h ->> 'marca', '') = '' or coalesce(h ->> 'dominio', '') not in ('clearix', 'geral') then
      raise exception 'história sem id, titulo, arquivo, marca ou domínio';
    end if;
    insert into cortes.historias as t (id, dominio, apps, titulo, estado, data_do_fato, data_do_problema, data_da_descoberta,
        data_do_conserto, gancho, fato, conserto, aprendizado, numeros_no_ar, nao_vai_ao_ar, fonte, rende, liberada,
        completa, falta, pronta_para_video, usado_em, arquivo, marca)
    values (h ->> 'id', h ->> 'dominio',
            array(select jsonb_array_elements_text(nullif(h -> 'apps', 'null'::jsonb))),
            h ->> 'titulo', coalesce(h ->> 'estado', 'sem_estado'),
            (h ->> 'data_do_fato')::date, (h ->> 'data_do_problema')::date, (h ->> 'data_da_descoberta')::date,
            (h ->> 'data_do_conserto')::date,
            coalesce(h ->> 'gancho', ''), coalesce(h ->> 'fato', ''), coalesce(h ->> 'conserto', ''),
            coalesce(h ->> 'aprendizado', ''), coalesce(h ->> 'numeros_no_ar', ''), coalesce(h ->> 'nao_vai_ao_ar', ''),
            coalesce(h ->> 'fonte', ''),
            array(select jsonb_array_elements_text(nullif(h -> 'rende', 'null'::jsonb))),
            coalesce((h ->> 'liberada')::boolean, false), coalesce((h ->> 'completa')::boolean, false),
            array(select jsonb_array_elements_text(nullif(h -> 'falta', 'null'::jsonb))),
            coalesce((h ->> 'pronta_para_video')::boolean, false), coalesce(h ->> 'usado_em', ''),
            h ->> 'arquivo', h ->> 'marca')
    on conflict (id) do update
      set dominio = excluded.dominio, apps = excluded.apps, titulo = excluded.titulo, estado = excluded.estado,
          data_do_fato = excluded.data_do_fato, data_do_problema = excluded.data_do_problema,
          data_da_descoberta = excluded.data_da_descoberta, data_do_conserto = excluded.data_do_conserto,
          gancho = excluded.gancho, fato = excluded.fato, conserto = excluded.conserto, aprendizado = excluded.aprendizado,
          numeros_no_ar = excluded.numeros_no_ar, nao_vai_ao_ar = excluded.nao_vai_ao_ar, fonte = excluded.fonte,
          rende = excluded.rende, liberada = excluded.liberada, completa = excluded.completa, falta = excluded.falta,
          pronta_para_video = excluded.pronta_para_video, usado_em = excluded.usado_em, arquivo = excluded.arquivo,
          marca = excluded.marca,
          atualizado_em = case when t.marca is distinct from excluded.marca then now() else t.atualizado_em end;
    n := n + 1;
  end loop;
  return jsonb_build_object('historias', n);
end $$;

revoke all on function public.cortes_gravar_historias(jsonb) from public, anon, authenticated;
grant execute on function public.cortes_gravar_historias(jsonb) to service_role;

-- 2-b) O pedido de capítulo
create table cortes.pedidos (
  id              uuid primary key default gen_random_uuid(),
  historias       text[] not null check (cardinality(historias) between 1 and 12),   -- ids de cortes.historias
  observacao      text not null default '',
  estado          text not null default 'pedido' check (estado in ('pedido', 'em_roteiro', 'virou_episodio', 'cancelado')),
  episodio_codigo text,                                   -- preenchido pelo motor quando o pedido vira episódio
  pedido_por      uuid not null,                          -- auth.uid() de quem pediu, gravado pela função
  pedido_em       timestamptz not null default now(),
  atualizado_em   timestamptz not null default now(),
  check (estado <> 'virou_episodio' or coalesce(episodio_codigo, '') <> '')
);
create index pedidos_abertos_idx on cortes.pedidos (estado, pedido_em);
comment on table cortes.pedidos is
  'Pedido de capítulo feito pelo dono na tela do DIGIAI Cortes: as histórias escolhidas. O motor lê e devolve o andamento.';

alter table cortes.pedidos enable row level security;
create policy equipe_le on cortes.pedidos for select to authenticated using (public.is_staff());
grant select on cortes.pedidos to authenticated;
grant all on cortes.pedidos to service_role;

create view public.v_cortes_pedidos with (security_invoker = true) as
  select p.id, p.historias, p.observacao, p.estado, p.episodio_codigo, p.pedido_em, p.atualizado_em
    from cortes.pedidos p;
revoke all on public.v_cortes_pedidos from public, anon;
grant select on public.v_cortes_pedidos to authenticated, service_role;

-- o pedido: só o dono, conferido aqui dentro (o mesmo portão de cortes_decidir)
create function public.cortes_pedir_capitulo(p_historias text[], p_observacao text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ids text[]; v_ruim text; v_id uuid;
begin
  if coalesce(public.current_role_code(), '') <> 'super_admin' then
    raise exception 'só o dono pede capítulo' using errcode = '42501';
  end if;
  select coalesce(array_agg(distinct x), '{}') into v_ids from unnest(coalesce(p_historias, '{}')) x where coalesce(btrim(x), '') <> '';
  if cardinality(v_ids) < 1 or cardinality(v_ids) > 12 then
    raise exception 'escolha de 1 a 12 histórias';
  end if;
  select x into v_ruim from unnest(v_ids) x
   where not exists (select 1 from cortes.historias h where h.id = x and h.liberada and h.usado_em = '') limit 1;
  if v_ruim is not null then
    raise exception 'a história % não existe, não está liberada ou já foi usada', v_ruim;
  end if;
  select x into v_ruim from unnest(v_ids) x
   where exists (select 1 from cortes.pedidos q where q.estado in ('pedido', 'em_roteiro') and x = any (q.historias)) limit 1;
  if v_ruim is not null then
    raise exception 'a história % já está em outro pedido aberto', v_ruim;
  end if;
  insert into cortes.pedidos (historias, observacao, pedido_por)
  values (v_ids, coalesce(btrim(p_observacao), ''), auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'historias', cardinality(v_ids));
end $$;

-- cancelar: só o dono, e só enquanto o motor não começou o roteiro
create function public.cortes_cancelar_pedido(p_id uuid)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  if coalesce(public.current_role_code(), '') <> 'super_admin' then
    raise exception 'só o dono cancela o pedido' using errcode = '42501';
  end if;
  update cortes.pedidos set estado = 'cancelado', atualizado_em = now() where id = p_id and estado = 'pedido';
  get diagnostics v_n = row_count;
  if v_n = 0 then
    raise exception 'pedido não existe ou o roteiro já começou';
  end if;
  return jsonb_build_object('id', p_id, 'estado', 'cancelado');
end $$;

revoke all on function public.cortes_pedir_capitulo(text[], text), public.cortes_cancelar_pedido(uuid) from public, anon;
grant execute on function public.cortes_pedir_capitulo(text[], text), public.cortes_cancelar_pedido(uuid) to authenticated;

-- o lado do motor: só a chave de serviço (a função cortes-gravar). Lê os pedidos abertos e devolve o andamento.
-- O motor não cancela nem reabre pedido cancelado: cancelar é do dono.
create function public.cortes_ler_pedidos()
returns jsonb language plpgsql security invoker set search_path = '' as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'sem permissão para ler os pedidos do cortes' using errcode = '42501';
  end if;
  return jsonb_build_object('pedidos', coalesce((
    select jsonb_agg(jsonb_build_object('id', q.id, 'historias', q.historias, 'observacao', q.observacao, 'estado', q.estado,
                                        'episodio_codigo', q.episodio_codigo, 'pedido_em', q.pedido_em) order by q.pedido_em)
      from cortes.pedidos q where q.estado in ('pedido', 'em_roteiro')), '[]'::jsonb));
end $$;

create function public.cortes_gravar_pedido(p jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare v_n int;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'sem permissão para gravar no cortes' using errcode = '42501';
  end if;
  if coalesce(p ->> 'estado', '') not in ('em_roteiro', 'virou_episodio') then
    raise exception 'o motor só marca em_roteiro ou virou_episodio';
  end if;
  if p ->> 'estado' = 'virou_episodio' and coalesce(p ->> 'episodio', '') = '' then
    raise exception 'virou_episodio pede o código do episódio';
  end if;
  update cortes.pedidos
     set estado = p ->> 'estado', episodio_codigo = coalesce(nullif(p ->> 'episodio', ''), episodio_codigo), atualizado_em = now()
   where id = (p ->> 'id')::uuid and estado in ('pedido', 'em_roteiro');
  get diagnostics v_n = row_count;
  return jsonb_build_object('gravado', v_n = 1);
end $$;

revoke all on function public.cortes_ler_pedidos(), public.cortes_gravar_pedido(jsonb) from public, anon, authenticated;
grant execute on function public.cortes_ler_pedidos(), public.cortes_gravar_pedido(jsonb) to service_role;

-- 3) Provas (o que o SQL alcança; a prova por chamada real é depois de aplicar)
-- 3-a) visitante e logado não gravam; visitante não lê
do $$ declare papel text; negou boolean; begin
  foreach papel in array array['authenticated', 'anon'] loop
    execute format('set local role %I', papel);
    perform set_config('request.jwt.claims', format('{"sub":"00000000-0000-0000-0000-0000000000aa","role":"%s"}', papel), true);
    negou := false;
    begin perform public.cortes_gravar_historias('{"historias":[]}'::jsonb); exception when insufficient_privilege then negou := true; end;
    if not negou then raise exception 'cortes_gravar_historias abriu para %', papel; end if;
    reset role;
  end loop;
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  negou := false;
  begin perform 1 from public.v_cortes_historias limit 1; exception when insufficient_privilege then negou := true; end;
  if not negou then raise exception 'v_cortes_historias abriu para visitante'; end if;
  reset role;
end $$;

-- 3-b) a chave de serviço grava, repetir não duplica, mudar o arquivo atualiza; logado sem papel de equipe não lê nada
do $$ declare carga jsonb; n int; begin
  carga := '{"historias":[{"id":"prova-2026-01-01-01","dominio":"geral","apps":["prova"],"titulo":"prova","estado":"corrigido",
             "data_do_problema":"2026-01-01","data_da_descoberta":"2026-01-02","data_do_conserto":"2026-01-03",
             "fato":"f","rende":["corte"],"liberada":true,"completa":true,"falta":[],"pronta_para_video":true,
             "arquivo":"bastidores/geral/historias/prova.md","marca":"m1"}]}'::jsonb;
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.cortes_gravar_historias(carga);
  perform public.cortes_gravar_historias(jsonb_set(carga, '{historias,0,marca}', '"m2"'));
  reset role;
  if (select count(*) from cortes.historias where id = 'prova-2026-01-01-01') <> 1 then
    raise exception 'repetir a gravação duplicou a história';
  end if;
  if (select marca from cortes.historias where id = 'prova-2026-01-01-01') <> 'm2' then
    raise exception 'a história não foi atualizada';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"00000000-0000-0000-0000-0000000000aa","role":"authenticated"}', true);
  select count(*) into n from public.v_cortes_historias;
  reset role;
  if n <> 0 then raise exception 'logado sem papel de equipe leu % história(s)', n; end if;
  delete from cortes.historias where id = 'prova-2026-01-01-01';      -- rascunho da própria transação
end $$;

-- 3-c) data fora de ordem é recusada pelo banco
do $$ declare negou boolean := false; begin
  begin
    insert into cortes.historias (id, dominio, titulo, estado, data_do_problema, data_da_descoberta, arquivo, marca)
    values ('prova-2026-01-01-02', 'geral', 'prova', 'aberto', '2026-01-05', '2026-01-02', 'x', 'm');
  exception when check_violation then negou := true; end;
  if not negou then raise exception 'o banco aceitou descoberta antes do problema'; end if;
end $$;

-- 3-d) pedido: visitante e logado sem papel de dono não pedem nem cancelam; logado não lê nem grava pelo lado do motor
do $$ declare papel text; negou boolean; begin
  foreach papel in array array['authenticated', 'anon'] loop
    execute format('set local role %I', papel);
    perform set_config('request.jwt.claims', format('{"sub":"00000000-0000-0000-0000-0000000000aa","role":"%s"}', papel), true);
    negou := false;
    begin perform public.cortes_pedir_capitulo(array['x']); exception when insufficient_privilege then negou := true; end;
    if not negou then raise exception 'cortes_pedir_capitulo abriu para %', papel; end if;
    negou := false;
    begin perform public.cortes_cancelar_pedido('00000000-0000-0000-0000-0000000000bb'); exception when insufficient_privilege then negou := true; end;
    if not negou then raise exception 'cortes_cancelar_pedido abriu para %', papel; end if;
    negou := false;
    begin perform public.cortes_ler_pedidos(); exception when insufficient_privilege then negou := true; end;
    if not negou then raise exception 'cortes_ler_pedidos abriu para %', papel; end if;
    negou := false;
    begin perform public.cortes_gravar_pedido('{"id":"00000000-0000-0000-0000-0000000000bb","estado":"em_roteiro"}'::jsonb); exception when insufficient_privilege then negou := true; end;
    if not negou then raise exception 'cortes_gravar_pedido abriu para %', papel; end if;
    reset role;
  end loop;
end $$;

-- 3-e) o caminho inteiro do pedido, com linhas de prova apagadas no fim (rascunho da própria transação):
--      o motor lê o pedido aberto, marca em roteiro e virou episódio; não reabre o cancelado; virou_episodio pede código
do $$ declare v_id uuid; v_cancelado uuid; r jsonb; negou boolean := false; begin
  insert into cortes.pedidos (historias, pedido_por) values (array['prova-a'], '00000000-0000-0000-0000-0000000000aa') returning id into v_id;
  insert into cortes.pedidos (historias, estado, pedido_por) values (array['prova-b'], 'cancelado', '00000000-0000-0000-0000-0000000000aa') returning id into v_cancelado;
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  r := public.cortes_ler_pedidos();
  if not exists (select 1 from jsonb_array_elements(r -> 'pedidos') x where x ->> 'id' = v_id::text) then
    raise exception 'o motor não leu o pedido aberto';
  end if;
  if exists (select 1 from jsonb_array_elements(r -> 'pedidos') x where x ->> 'id' = v_cancelado::text) then
    raise exception 'o motor leu pedido cancelado';
  end if;
  if (public.cortes_gravar_pedido(jsonb_build_object('id', v_cancelado, 'estado', 'em_roteiro')) ->> 'gravado')::boolean then
    raise exception 'o motor reabriu pedido cancelado';
  end if;
  begin perform public.cortes_gravar_pedido(jsonb_build_object('id', v_id, 'estado', 'virou_episodio'));
  exception when others then negou := true; end;
  if not negou then raise exception 'virou_episodio passou sem o código do episódio'; end if;
  perform public.cortes_gravar_pedido(jsonb_build_object('id', v_id, 'estado', 'em_roteiro'));
  perform public.cortes_gravar_pedido(jsonb_build_object('id', v_id, 'estado', 'virou_episodio', 'episodio', 'PROVA99'));
  reset role;
  if (select estado || '|' || episodio_codigo from cortes.pedidos where id = v_id) <> 'virou_episodio|PROVA99' then
    raise exception 'o andamento do pedido não foi gravado';
  end if;
  delete from cortes.pedidos where id in (v_id, v_cancelado);
end $$;

-- 3-f) PROVA QUE O SQL NÃO ALCANÇA SEM O DONO: cortes_pedir_capitulo aceitando o pedido dele e recusando história
--      usada, não liberada ou já em pedido aberto. Depende de public.current_role_code() = 'super_admin', que vem
--      da sessão dele. O agente do banco decide como ensaiar (o mesmo limite de cortes_decidir, na 2.ª migration).

-- ============================================================
-- Provas que o DIGIAI Cortes não alcançou (3-f) + uma que faltava, feitas pelo agente do banco.
-- O portão de cortes_pedir_capitulo é public.current_role_code() = 'super_admin', e current_role_code()
-- lê SÓ auth.uid() em iam.users (conferido: nenhuma das duas funções olha session_user). Então dá para
-- ensaiar o caminho do dono com o uid dele dentro de uma transação que termina em rollback — é ensaio,
-- não é agir no lugar dele.
-- ============================================================

-- 3-f) o caminho do dono: aceita a história boa e recusa as três ruins
do $$
declare v_dono text := '2956f8d9-f161-4333-a962-96eab02600fe';
        r jsonb; v_id uuid; negou boolean; msg text;
begin
  insert into cortes.historias (id, dominio, titulo, estado, arquivo, marca, liberada, usado_em) values
    ('prova-f-boa',      'geral', 'boa',      'corrigido', 'a', 'm', true,  ''),
    ('prova-f-travada',  'geral', 'travada',  'corrigido', 'a', 'm', false, ''),
    ('prova-f-usada',    'geral', 'usada',    'corrigido', 'a', 'm', true,  'ECO01'),
    ('prova-f-segunda',  'geral', 'segunda',  'corrigido', 'a', 'm', true,  '');

  set local role authenticated;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_dono), true);

  if coalesce(public.current_role_code(), '') <> 'super_admin' then
    raise exception 'o ensaio não está na pele do dono (current_role_code = %)', public.current_role_code();
  end if;

  -- aceita a boa
  r := public.cortes_pedir_capitulo(array['prova-f-boa'], '  ensaio  ');
  v_id := (r ->> 'id')::uuid;
  if v_id is null or (r ->> 'historias')::int <> 1 then raise exception 'o dono não conseguiu pedir capítulo: %', r; end if;

  -- recusa a travada
  negou := false;
  begin perform public.cortes_pedir_capitulo(array['prova-f-travada']);
  exception when others then negou := true; msg := sqlerrm; end;
  if not negou then raise exception 'passou história NÃO liberada'; end if;
  if msg not like '%prova-f-travada%' then raise exception 'o erro não nomeia a história travada: %', msg; end if;

  -- recusa a já usada
  negou := false;
  begin perform public.cortes_pedir_capitulo(array['prova-f-usada']); exception when others then negou := true; end;
  if not negou then raise exception 'passou história já usada em episódio'; end if;

  -- recusa a que já está em pedido aberto
  negou := false;
  begin perform public.cortes_pedir_capitulo(array['prova-f-boa']); exception when others then negou := true; end;
  if not negou then raise exception 'a mesma história entrou em dois pedidos abertos'; end if;

  -- recusa a lista inteira quando UMA é ruim (não grava as boas pela metade)
  negou := false;
  begin perform public.cortes_pedir_capitulo(array['prova-f-segunda', 'prova-f-travada']); exception when others then negou := true; end;
  if not negou then raise exception 'lista com uma ruim passou'; end if;
  reset role;
  if exists (select 1 from cortes.pedidos where 'prova-f-segunda' = any (historias)) then
    raise exception 'gravou meio pedido: a história boa da lista recusada entrou';
  end if;

  -- a observação vem limpa, e o uid de quem pediu é o dele
  if (select observacao from cortes.pedidos where id = v_id) <> 'ensaio' then
    raise exception 'a observação não foi limpa nas pontas';
  end if;
  if (select pedido_por::text from cortes.pedidos where id = v_id) <> v_dono then
    raise exception 'pedido_por não é quem pediu';
  end if;

  -- cancelar: o dono cancela o pedido novo; depois de o roteiro começar, não
  set local role authenticated;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_dono), true);
  perform public.cortes_cancelar_pedido(v_id);
  reset role;
  if (select estado from cortes.pedidos where id = v_id) <> 'cancelado' then
    raise exception 'o dono não conseguiu cancelar'; end if;

  insert into cortes.pedidos (historias, estado, pedido_por) values (array['prova-f-boa'], 'em_roteiro', v_dono::uuid) returning id into v_id;
  set local role authenticated;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_dono), true);
  negou := false;
  begin perform public.cortes_cancelar_pedido(v_id); exception when others then negou := true; end;
  reset role;
  if not negou then raise exception 'cancelou pedido com roteiro já começado'; end if;

  delete from cortes.pedidos where pedido_por = v_dono::uuid;
  delete from cortes.historias where id like 'prova-f-%';
end $$;

-- 3-g) a marca é o que diz "mudou": gravar igual NÃO mexe em atualizado_em (o motor conta com isso)
do $$ declare carga jsonb; t1 timestamptz; t2 timestamptz; begin
  carga := '{"historias":[{"id":"prova-g","dominio":"geral","titulo":"t","arquivo":"a","marca":"m1","fato":"f"}]}'::jsonb;
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.cortes_gravar_historias(carga);
  reset role;
  select atualizado_em into t1 from cortes.historias where id = 'prova-g';
  perform pg_sleep(0.05);
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.cortes_gravar_historias(carga);                                   -- igual
  perform public.cortes_gravar_historias(jsonb_set(carga, '{historias,0,titulo}', '"outro titulo"'));  -- muda o texto, não a marca
  reset role;
  select atualizado_em into t2 from cortes.historias where id = 'prova-g';
  if t2 is distinct from t1 then raise exception 'gravar sem mudar a marca mexeu em atualizado_em'; end if;
  if (select titulo from cortes.historias where id = 'prova-g') <> 'outro titulo' then
    raise exception 'o título não foi gravado'; end if;
  delete from cortes.historias where id = 'prova-g';
end $$;

-- 3-h) sabotagem da própria prova: se o portão do dono fosse frouxo, 3-f teria de falhar.
--      Aqui eu confiro que um logado QUE NÃO É o dono não passa — hoje não existe outro usuário ativo
--      no iam.users, então este é o caso real de "qualquer outra pessoa".
do $$ declare negou boolean := false; begin
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  if public.current_role_code() is not null then
    raise exception 'uid desconhecido recebeu papel: %', public.current_role_code(); end if;
  begin perform public.cortes_pedir_capitulo(array['prova-f-boa']); exception when others then negou := true; end;
  reset role;
  if not negou then raise exception 'quem não é o dono pediu capítulo'; end if;
end $$;

-- 3-i) "recusou" não basta: tem de ser O PORTÃO que recusou.
--      A prova 3-d só olha o código insufficient_privilege. Com o portão do dono caído, quem reclamava era a
--      conferência da história ("a história x não existe"), e a prova não via o buraco — morria por outro motivo.
--      Aqui eu exijo o código E a frase, e com uma história boa na mão, para que nada mais tenha do que reclamar.
do $$ declare v_estado text; v_msg text; begin
  insert into cortes.historias (id, dominio, titulo, estado, arquivo, marca, liberada)
  values ('prova-i-boa', 'geral', 'boa', 'corrigido', 'a', 'm', true);

  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_estado := null;
  begin perform public.cortes_pedir_capitulo(array['prova-i-boa']);
  exception when others then v_estado := sqlstate; v_msg := sqlerrm; end;
  reset role;
  if v_estado is null then raise exception 'quem não é o dono pediu capítulo com história boa na mão'; end if;
  if v_estado <> '42501' or v_msg not like '%só o dono pede capítulo%' then
    raise exception 'recusou, mas não foi o portão do dono: % / %', v_estado, v_msg;
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_estado := null;
  begin perform public.cortes_cancelar_pedido(gen_random_uuid());
  exception when others then v_estado := sqlstate; v_msg := sqlerrm; end;
  reset role;
  if v_estado <> '42501' or v_msg not like '%só o dono cancela%' then
    raise exception 'o cancelar recusou por outro motivo: % / %', v_estado, v_msg;
  end if;

  delete from cortes.historias where id = 'prova-i-boa';
end $$;

commit;

-- Reversão (na ordem inversa):
--   drop function public.cortes_gravar_pedido(jsonb);
--   drop function public.cortes_ler_pedidos();
--   drop function public.cortes_cancelar_pedido(uuid);
--   drop function public.cortes_pedir_capitulo(text[], text);
--   drop view public.v_cortes_pedidos;
--   drop table cortes.pedidos;        -- leva junto a política equipe_le, os grants e o índice pedidos_abertos_idx
--   drop function public.cortes_gravar_historias(jsonb);
--   drop view public.v_cortes_historias;
--   drop table cortes.historias;      -- leva junto a política equipe_le, os grants e o índice historias_fila_idx
