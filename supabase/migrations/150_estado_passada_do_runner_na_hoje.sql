-- 150 — o que o runner recusa ou não encontra deixa de morrer no log e vira item da tela Hoje
--
-- ✔ APLICADA em 23/09/2026 às 21:05:22 BRT, com a palavra do dono neste canal ("pôr as sobras na tela Hoje"),
--   reensaiada antes. Edge estado-ingest v2 + runner enviando a passada. Medido depois: passada das 21:06 com
--   17 fichas e 7 não declarados; ordem do dia de 23/09 foi de 8 para 15 itens e ganhou "7 app(s) sem ficha
--   declarada — invisiveis no Portfolio" (visto na tela Hoje com o login do dono).
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE: o runner do Cockpit (passo 4) lê 24 fichas e manda 16. As outras 8 somem em silêncio —
--   7 sem o bloco de frontmatter ("não declarado") e 1 recusada por valor inválido (editora, maturidade
--   "incubação"). Isso só aparecia em Cockpit/scripts/estado-runner.log, que ninguém abre. Retrato sem
--   as ausências mente por omissão: o Portfólio mostra 16 apps como se fossem todos.
--
-- O QUE CRIA:
--   ops.estado_passada          — um retrato por passada do runner (nao_declarados, recusadas, contagens)
--   ops.fn_registrar_passada(p) — só service_role; quem chama é a edge estado-ingest
--   v_ops_reconfirmar           — ganha 3 tipos: app_nao_declarado, ficha_recusada, runner_parado
--   fn_ordem_maquina_reconfirmar— passa a rotular os 6 tipos (antes só 3; o resto caía no rótulo de decisão)
--
-- "runner_parado" é o oposto do silêncio: se a última passada tem mais de 2 h (máquina desligada, tarefa
--   quebrada, segredo trocado), a Hoje diz isso em vez de mostrar um retrato velho como se fosse de hoje.
--
-- Medido antes (23/09 ~18h BRT): v_ops_reconfirmar = 0 linhas; runner na passada das 18:00 com
--   7 não declarados e 1 recusada.

begin;

do $$
begin
  if to_regclass('ops.estado_passada') is not null then
    raise exception 'ops.estado_passada ja existe — a 150 ja foi aplicada?';
  end if;
  if md5(pg_get_viewdef('public.v_ops_reconfirmar'::regclass)) <> '9f0e82c2b20e80969617a49d6e5878bd' then
    raise exception 'v_ops_reconfirmar mudou desde 23/09 — conferir antes.';
  end if;
  if md5(pg_get_functiondef('public.fn_ordem_maquina_reconfirmar(date)'::regprocedure)) <> '8cb10090f16065420827cca5f6cd9228' then
    raise exception 'fn_ordem_maquina_reconfirmar mudou desde 23/09 — conferir antes.';
  end if;
end $$;

create table ops.estado_passada (
  id               bigserial primary key,
  medido_em        timestamptz not null default now(),
  fichas           integer not null default 0,
  nao_declarados   text[]  not null default '{}',
  recusadas        text[]  not null default '{}'
);
comment on table ops.estado_passada is
  '150: retrato de cada passada do runner local (passo 4). Guarda o que NÃO entrou — ausência também é dado.';
create index estado_passada_ultima on ops.estado_passada (medido_em desc);
alter table ops.estado_passada enable row level security;
create policy estado_passada_staff_select on ops.estado_passada for select using (is_staff());
revoke all on ops.estado_passada from anon;
grant select on ops.estado_passada to authenticated;

create function ops.fn_registrar_passada(p jsonb)
returns bigint
language sql
security definer
set search_path = ''
as $$
  insert into ops.estado_passada (fichas, nao_declarados, recusadas)
  values (coalesce((p->>'fichas')::int, 0),
          coalesce(array(select jsonb_array_elements_text(p->'nao_declarados')), '{}'),
          coalesce(array(select jsonb_array_elements_text(p->'recusadas')), '{}'))
  returning id;
$$;
revoke all on function ops.fn_registrar_passada(jsonb) from public, anon, authenticated;
grant execute on function ops.fn_registrar_passada(jsonb) to service_role;

create or replace view public.v_ops_reconfirmar
with (security_invoker = on) as
  select 'ficha_vencida'::text as tipo, a.slug as ref, a.nome as titulo,
         'Ficha declarada em ' || to_char(a.declarado_em, 'DD/MM') || ', validade de ' || a.validade_dias || ' dias. Fonte: ' || a.ficha_fonte as porque
    from ops.apps a
   where a.ativo and (now() at time zone 'America/Sao_Paulo')::date > a.declarado_em + a.validade_dias
  union all
  select 'portao_sumiu_do_indice', p.numero, p.titulo,
         'Saiu de Cockpit/portoes-abertos.md sem entrada em Fechados. Visto pela última vez em '
         || to_char(p.visto_no_indice_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.'
    from ops.pendencias_humanas p
   where p.indice_estado = 'sumiu_do_indice' and p.deleted_at is null
  union all
  select 'decisao_vencida', d.fonte_arquivo, d.title,
         'Validade até ' || to_char(d.valida_ate, 'DD/MM') || '. Decisão do dono: reconfirmar ou revogar por arquivo.'
    from ops.decisions d
   where d.valida_ate is not null and d.revogada_em is null and d.deleted_at is null
     and (now() at time zone 'America/Sao_Paulo')::date > d.valida_ate
  -- 150: o que o runner não conseguiu trazer na última passada
  union all
  select 'app_nao_declarado', x.app, x.app,
         'Cockpit/Apps/' || x.app || '/ficha.md existe mas não tem o bloco de frontmatter que o runner lê — '
         || 'o app não aparece no Portfólio nem tem estado medido.'
    from (select unnest(u.nao_declarados) as app from (select * from ops.estado_passada order by medido_em desc limit 1) u) x
  union all
  select 'ficha_recusada', split_part(x.motivo, ':', 1), split_part(x.motivo, ':', 1),
         'Ficha recusada pelo runner: ' || x.motivo || '. Valor fora do padrão — corrigir na ficha.'
    from (select unnest(u.recusadas) as motivo from (select * from ops.estado_passada order by medido_em desc limit 1) u) x
  union all
  select 'runner_parado', 'estado-runner', 'Runner do estado dos apps parado',
         'Última passada em ' || to_char(u.medido_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
         || ' (deveria ser a cada 30 min). Enquanto isso, ficha e repo na tela são retrato velho.'
    from (select * from ops.estado_passada order by medido_em desc limit 1) u
   where u.medido_em < now() - interval '2 hours';

create or replace function public.fn_ordem_maquina_reconfirmar(p_dia date)
returns void
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
begin
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia, 'maquina', 6 + row_number() over (order by r.tipo),
         case r.tipo
           when 'ficha_vencida'          then 'Reconfirmar: ' || count(*) || ' ficha(s) de app vencida(s)'
           when 'portao_sumiu_do_indice' then 'Reconfirmar: ' || count(*) || ' portao(oes) sumiu(ram) do indice'
           when 'decisao_vencida'        then 'Reconfirmar: ' || count(*) || ' decisao(oes) vencida(s)'
           when 'app_nao_declarado'      then count(*) || ' app(s) sem ficha declarada — invisiveis no Portfolio'
           when 'ficha_recusada'         then count(*) || ' ficha(s) recusada(s) pelo runner'
           else                               'Runner do estado dos apps parado'
         end,
         case r.tipo
           when 'ficha_vencida'          then 'O agente de cada app reescreve a ficha (Cockpit/Apps/<app>/ficha.md) com data nova. '
           when 'portao_sumiu_do_indice' then 'Saiu de Cockpit/portoes-abertos.md sem entrada em Fechados: o Geral fecha com prova ou devolve ao indice. '
           when 'decisao_vencida'        then 'So o dono reconfirma ou revoga, por arquivo datado em Cockpit/decisoes/. '
           when 'app_nao_declarado'      then 'Ficha sem o bloco de frontmatter: o app existe no disco e nao existe na tela. '
           when 'ficha_recusada'         then 'Valor fora do padrao na ficha (maturidade, vendas_fonte, degrau ou validade). '
           else                               'Maquina desligada, tarefa quebrada ou segredo trocado: '
         end || 'Quais: ' || string_agg(r.titulo, '; ' order by r.titulo) filter (where r.rn <= 5)
           || case when count(*) > 5 then ' (+' || (count(*) - 5) || ')' else '' end || '.',
         'humano', 'reconfirmar', 'public.v_ops_reconfirmar', clock_timestamp()
    from (select v.*, row_number() over (partition by v.tipo order by v.titulo) as rn from public.v_ops_reconfirmar v) r
   group by r.tipo
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';
end;
$function$;

do $$
declare v_n int;
begin
  if has_table_privilege('anon', 'ops.estado_passada', 'select')
  or has_function_privilege('anon', 'ops.fn_registrar_passada(jsonb)', 'execute')
  or has_function_privilege('authenticated', 'ops.fn_registrar_passada(jsonb)', 'execute') then
    raise exception 'anon/authenticated escrevem ou leem a passada indevidamente.';
  end if;
  begin
    perform ops.fn_registrar_passada(jsonb_build_object('fichas', 16,
      'nao_declarados', jsonb_build_array('prova_150_app'),
      'recusadas', jsonb_build_array('prova_150_ficha: maturidade "x"')));
    if (select count(*) from public.v_ops_reconfirmar where tipo = 'app_nao_declarado' and ref = 'prova_150_app') <> 1
    or (select count(*) from public.v_ops_reconfirmar where tipo = 'ficha_recusada' and ref = 'prova_150_ficha') <> 1 then
      raise exception 'PROVA_150_FALHOU: passada nao virou item de reconfirmar';
    end if;
    if exists (select 1 from public.v_ops_reconfirmar where tipo = 'runner_parado') then
      raise exception 'PROVA_150_FALHOU: passada de agora nao pode ser "runner parado"';
    end if;
    perform public.fn_gerar_ordem_do_dia('2099-01-02');
    select count(*) into v_n from ops.ordem_do_dia
     where dia = '2099-01-02' and (titulo like '%sem ficha declarada%' or titulo like '%recusada(s) pelo runner%');
    if v_n <> 2 then raise exception 'PROVA_150_FALHOU: esperava 2 itens novos na ordem, veio %', v_n; end if;
    raise exception 'PROVA_150_OK';
  exception when others then
    if sqlerrm <> 'PROVA_150_OK' then raise; end if;
  end;
end $$;

commit;
