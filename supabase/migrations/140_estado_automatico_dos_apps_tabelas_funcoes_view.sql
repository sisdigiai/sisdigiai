-- 140 — estado automático dos apps: tabelas, funções de ingestão e a view que as telas vão ler (passo 2 do contrato)
--
-- ⛔ RASCUNHO PARA LEITURA DO ORQUESTRADOR GERAL. NÃO APLICADA. Depois da leitura, palavra do dono neste canal.
--
-- CONTRATO: docs/contrato-estado-automatico-dos-apps-2026-09-16.md, com as decisões do Geral de 16/09:
--   • medido × declarado, os dois com validade;
--   • portão SÓ fecha por entrada na seção "Fechados" de Cockpit/portoes-abertos.md — ausência não é prova; o que sumir
--     do índice sem entrada em Fechados vira "sumiu_do_indice" (reconfirmar), nunca fechado, nunca apagado;
--   • decisão só o dono fecha/revoga, por arquivo datado (Cockpit/decisoes/AAAA-MM-DD-slug.md);
--   • ficha declarada de cada app = Cockpit/Apps/<app>/ficha.md (já existem 20), mantida pelo agente de cada app;
--   • runner local nesta máquina, 30 min, um segredo só; sinais de deploy por cron na nuvem.
--
-- O QUE ESTA MIGRATION CRIA:
--   ops.apps            — ficha declarada por app, com declarado_em + validade_dias
--   ops.apps_sinais     — o que a máquina mede (repo, deploy), um registro por medição
--   colunas em ops.decisions e ops.pendencias_humanas para a fonte datada e o estado no índice
--   ops.fn_registrar_decisao · ops.fn_sincronizar_portoes · ops.fn_atualizar_ficha_app · ops.fn_registrar_sinal_app
--     (só service_role; quem chama é a edge estado-ingest do passo 4 e o cron do passo 3)
--   public.v_ops_apps_estado    — o que Portfólio/Lista Mestra/Mapa vão ler (passo 5)
--   public.v_ops_reconfirmar    — o que a Hoje vai ler para os itens "reconfirmar" (ligação no gerador: passo 5)
--
-- O QUE NÃO FAZ: não carrega as fichas (carga inicial = arquivo separado, gerado da constante de Portfolio.tsx com a data
--   de verificação de julho); não muda fn_gerar_ordem_do_dia; não mexe em nenhuma linha existente de decisions/pendencias.

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if to_regclass('ops.apps') is not null or to_regclass('ops.apps_sinais') is not null then
    raise exception 'ops.apps ja existe — a 140 ja foi aplicada?';
  end if;
  if exists (select 1 from information_schema.columns where table_schema='ops' and table_name='pendencias_humanas' and column_name='indice_estado') then
    raise exception 'pendencias_humanas ja tem indice_estado.';
  end if;
  -- a semente (passo 1) grava portões com fonte 'Cockpit/portoes-abertos.md#NN' antes desta migration; o índice único
  -- abaixo exige que não haja fonte repetida — a primeira sincronização adota essas linhas (upsert por fonte).
  if exists (select fonte from ops.pendencias_humanas where fonte like 'Cockpit/portoes-abertos.md#%' group by fonte having count(*) > 1) then
    raise exception 'ha portao do indice gravado em duplicidade — limpar antes do indice unico.';
  end if;
end $$;

-- ── ficha declarada ───────────────────────────────────────────────────────────
create table ops.apps (
  slug              text primary key,
  nome              text not null,
  tier              text,
  tagline           text,
  funcao            text,
  proximo           text,
  bloqueio          text,
  maturidade        text check (maturidade in ('ideia', 'protótipo', 'em uso interno', 'em uso externo', 'à venda')),
  urls              jsonb not null default '[]'::jsonb,
  repo_path         text,
  ficha_fonte       text not null,                        -- Cockpit/Apps/<app>/ficha.md
  eventos_product   text[] not null default '{}',         -- valores de analytics.events_log.product deste app
  vendas_fonte      text check (vendas_fonte in ('v_vendas_clearix', 'hotmart_sales')),   -- nulo = "nenhuma"
  degrau_declarado  smallint check (degrau_declarado between 1 and 5),  -- só quando a prova não está neste banco
  degrau_fonte      text,
  declarado_em      date not null,
  validade_dias     integer not null default 30 check (validade_dias between 1 and 180),
  ativo             boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),
  constraint apps_degrau_com_fonte check (degrau_declarado is null or degrau_fonte is not null)
);
comment on table ops.apps is 'Ficha declarada de cada app (fonte: Cockpit/Apps/<app>/ficha.md), com validade. Escrita só por ops.fn_atualizar_ficha_app. Migration 140.';

-- ── o que a máquina mede ──────────────────────────────────────────────────────
create table ops.apps_sinais (
  id         bigserial primary key,
  slug       text not null references ops.apps(slug) on update cascade,
  tipo       text not null check (tipo in ('repo', 'deploy')),
  ok         boolean not null,
  medido_em  timestamptz not null default now(),
  dados      jsonb not null default '{}'::jsonb   -- repo: commit, branch, push_em_dia, dirty · deploy: url, http, build
);
create index apps_sinais_ultimo on ops.apps_sinais (slug, tipo, medido_em desc);
comment on table ops.apps_sinais is 'Sinais medidos por máquina (repo pelo runner local, deploy pelo cron). Nunca digitados. Migration 140.';

alter table ops.apps enable row level security;
alter table ops.apps_sinais enable row level security;
create policy apps_staff_select on ops.apps for select using (is_staff());
create policy apps_sinais_staff_select on ops.apps_sinais for select using (is_staff());
revoke all on ops.apps, ops.apps_sinais from anon;
grant select on ops.apps, ops.apps_sinais to authenticated;

-- ── decisões e portões: fonte datada e estado no índice ───────────────────────
alter table ops.decisions
  add column fonte_arquivo  text,
  add column quem           text,
  add column onde           text,
  add column palavra        text,
  add column apps           text[] not null default '{}',
  add column valida_ate     date,
  add column revogada_em    date,
  add column revogada_fonte text;
create unique index decisions_fonte_arquivo_uq on ops.decisions (fonte_arquivo) where fonte_arquivo is not null;

alter table ops.pendencias_humanas
  add column numero              text,
  add column dono_acao           text,
  add column prova_para_fechar   text,
  add column indice_estado       text check (indice_estado in ('no_indice', 'fechado', 'sumiu_do_indice')),
  add column visto_no_indice_em  timestamptz,
  add column fechado_em          date,
  add column fechado_prova       text,
  add column fechado_fonte       text;
create unique index pendencias_fonte_indice_uq on ops.pendencias_humanas (fonte) where fonte like 'Cockpit/portoes-abertos.md#%';

-- ── ingestão: decisão ─────────────────────────────────────────────────────────
create or replace function ops.fn_registrar_decisao(p jsonb)
returns uuid
language plpgsql
security definer
set search_path to 'ops', 'public'
as $function$
declare v_id uuid;
begin
  if coalesce(p->>'fonte_arquivo', '') !~ '^Cockpit/decisoes/[0-9]{4}-[0-9]{2}-[0-9]{2}-[a-z0-9-]+\.md$' then
    raise exception 'fonte_arquivo precisa ser Cockpit/decisoes/AAAA-MM-DD-slug.md';
  end if;
  if coalesce(p->>'titulo','') = '' or coalesce(p->>'decisao','') = '' or coalesce(p->>'data','') = ''
  or coalesce(p->>'quem','') = '' or coalesce(p->>'onde','') = '' or coalesce(p->>'palavra','') = '' then
    raise exception 'decisao sem titulo, decisao, data, quem, onde ou palavra textual — nao se registra decisao sem a palavra.';
  end if;

  insert into ops.decisions (title, context, decision, tags, decided_at, fonte_arquivo, quem, onde, palavra, apps, valida_ate,
                             revogada_em, revogada_fonte)
  values (p->>'titulo', p->>'contexto', p->>'decisao',
          coalesce(array(select jsonb_array_elements_text(p->'tags')), '{}'),
          (p->>'data')::date, p->>'fonte_arquivo', p->>'quem', p->>'onde', p->>'palavra',
          coalesce(array(select jsonb_array_elements_text(p->'apps')), '{}'),
          nullif(p->>'valida_ate','')::date, nullif(p->>'revogada_em','')::date, nullif(p->>'revogada_fonte',''))
  on conflict (fonte_arquivo) where fonte_arquivo is not null do update
     set title = excluded.title, context = excluded.context, decision = excluded.decision, tags = excluded.tags,
         decided_at = excluded.decided_at, quem = excluded.quem, onde = excluded.onde, palavra = excluded.palavra,
         apps = excluded.apps, valida_ate = excluded.valida_ate,
         revogada_em = coalesce(excluded.revogada_em, ops.decisions.revogada_em),
         revogada_fonte = coalesce(excluded.revogada_fonte, ops.decisions.revogada_fonte),
         updated_at = now()
  returning id into v_id;
  return v_id;
end;
$function$;

-- ── ingestão: portões (retrato inteiro do índice a cada leitura) ──────────────
create or replace function ops.fn_sincronizar_portoes(p_abertos jsonb, p_fechados jsonb, p_lido_em timestamptz)
returns jsonb
language plpgsql
security definer
set search_path to 'ops', 'public'
as $function$
declare
  v_no_indice_antes int;
  v_abertos int := jsonb_array_length(coalesce(p_abertos, '[]'::jsonb));
  v_novos int := 0; v_atualizados int := 0; v_fechados int := 0; v_sumiram int := 0; v_n int;
  v_inserido boolean;
  r jsonb;
begin
  -- parse quebrado não pode "sumir" com o índice inteiro: recusa retrato vazio ou que perca mais da metade de uma vez
  select count(*) into v_no_indice_antes from ops.pendencias_humanas where indice_estado = 'no_indice';
  if v_abertos = 0 then
    raise exception 'retrato do indice sem nenhum portao aberto — parse quebrado? nada foi gravado.';
  end if;
  if v_no_indice_antes > 0 and v_abertos < v_no_indice_antes / 2 then
    raise exception 'retrato com % abertos contra % no indice — queda de mais da metade de uma vez; conferir o parse.', v_abertos, v_no_indice_antes;
  end if;

  for r in select * from jsonb_array_elements(p_abertos) loop
    if coalesce(r->>'numero','') = '' or coalesce(r->>'titulo','') = '' then
      raise exception 'portao sem numero ou titulo: %', r;
    end if;
    insert into ops.pendencias_humanas (titulo, porque, severidade, area, fonte, status, numero, dono_acao, prova_para_fechar,
                                        indice_estado, visto_no_indice_em)
    values (r->>'titulo', r->>'porque', coalesce((r->>'severidade')::int, 2), r->>'area',
            'Cockpit/portoes-abertos.md#' || (r->>'numero'), 'aberta', r->>'numero', r->>'dono_acao', r->>'prova_para_fechar',
            'no_indice', p_lido_em)
    on conflict (fonte) where fonte like 'Cockpit/portoes-abertos.md#%' do update
       set titulo = excluded.titulo, porque = excluded.porque, severidade = excluded.severidade, area = excluded.area,
           dono_acao = excluded.dono_acao, prova_para_fechar = excluded.prova_para_fechar,
           indice_estado = case when ops.pendencias_humanas.indice_estado = 'fechado' then 'fechado' else 'no_indice' end,
           visto_no_indice_em = p_lido_em, updated_at = now()
    returning (xmax = 0) into v_inserido;
    if v_inserido then v_novos := v_novos + 1; else v_atualizados := v_atualizados + 1; end if;
  end loop;

  for r in select * from jsonb_array_elements(coalesce(p_fechados, '[]'::jsonb)) loop
    if coalesce(r->>'numero','') = '' or coalesce(r->>'data','') = '' or coalesce(r->>'prova','') = '' then
      raise exception 'fechamento sem numero, data ou prova: % — fechado so com prova.', r;
    end if;
    update ops.pendencias_humanas
       set status = 'resolvida', resolvida_em = (r->>'data')::date, indice_estado = 'fechado',
           fechado_em = (r->>'data')::date, fechado_prova = r->>'prova', fechado_fonte = r->>'fonte', updated_at = now()
     where fonte = 'Cockpit/portoes-abertos.md#' || (r->>'numero') and indice_estado is distinct from 'fechado';
    get diagnostics v_n := row_count;
    v_fechados := v_fechados + v_n;
  end loop;

  update ops.pendencias_humanas p
     set indice_estado = 'sumiu_do_indice', updated_at = now()
   where p.indice_estado = 'no_indice'
     and p.visto_no_indice_em < p_lido_em;
  get diagnostics v_sumiram := row_count;

  return jsonb_build_object('novos', v_novos, 'atualizados', v_atualizados, 'fechados', v_fechados, 'sumiram_do_indice', v_sumiram);
end;
$function$;

-- ── ingestão: ficha e sinal ───────────────────────────────────────────────────
create or replace function ops.fn_atualizar_ficha_app(p jsonb)
returns text
language plpgsql
security definer
set search_path to 'ops', 'public'
as $function$
begin
  if coalesce(p->>'slug','') !~ '^[a-z0-9_-]+$' or coalesce(p->>'nome','') = ''
  or coalesce(p->>'ficha_fonte','') !~ '^Cockpit/Apps/[^/]+/ficha\.md$' or coalesce(p->>'declarado_em','') = '' then
    raise exception 'ficha sem slug valido, nome, ficha_fonte (Cockpit/Apps/<app>/ficha.md) ou declarado_em.';
  end if;
  insert into ops.apps (slug, nome, tier, tagline, funcao, proximo, bloqueio, maturidade, urls, repo_path, ficha_fonte,
                        eventos_product, vendas_fonte, degrau_declarado, degrau_fonte, declarado_em, validade_dias)
  values (p->>'slug', p->>'nome', p->>'tier', p->>'tagline', p->>'funcao', p->>'proximo', p->>'bloqueio',
          nullif(p->>'maturidade',''), coalesce(p->'urls', '[]'::jsonb), p->>'repo_path', p->>'ficha_fonte',
          coalesce(array(select x from jsonb_array_elements_text(case jsonb_typeof(p->'eventos_product') when 'array' then p->'eventos_product' when 'string' then jsonb_build_array(p->'eventos_product') else '[]'::jsonb end) x where x not in ('', 'nenhum')), '{}'), nullif(nullif(p->>'vendas_fonte',''), 'nenhuma'),
          nullif(p->>'degrau_declarado','')::smallint, nullif(p->>'degrau_fonte',''),
          (p->>'declarado_em')::date, coalesce(nullif(p->>'validade_dias','')::int, 30))
  on conflict (slug) do update
     set nome = excluded.nome, tier = excluded.tier, tagline = excluded.tagline, funcao = excluded.funcao,
         proximo = excluded.proximo, bloqueio = excluded.bloqueio, maturidade = excluded.maturidade, urls = excluded.urls,
         repo_path = excluded.repo_path, ficha_fonte = excluded.ficha_fonte, eventos_product = excluded.eventos_product,
         vendas_fonte = excluded.vendas_fonte, degrau_declarado = excluded.degrau_declarado, degrau_fonte = excluded.degrau_fonte,
         declarado_em = excluded.declarado_em, validade_dias = excluded.validade_dias, updated_at = now();
  return p->>'slug';
end;
$function$;

create or replace function ops.fn_registrar_sinal_app(p jsonb)
returns bigint
language plpgsql
security definer
set search_path to 'ops', 'public'
as $function$
declare v_id bigint;
begin
  if coalesce(p->>'tipo','') not in ('repo','deploy') or p->>'ok' is null or coalesce(p->>'slug','') = '' then
    raise exception 'sinal sem slug, tipo (repo|deploy) ou ok.';
  end if;
  insert into ops.apps_sinais (slug, tipo, ok, medido_em, dados)
  values (p->>'slug', p->>'tipo', (p->>'ok')::boolean, coalesce(nullif(p->>'medido_em','')::timestamptz, now()), coalesce(p->'dados', '{}'::jsonb))
  returning id into v_id;
  return v_id;
end;
$function$;

revoke all on function ops.fn_registrar_decisao(jsonb)                          from public, anon, authenticated;
revoke all on function ops.fn_sincronizar_portoes(jsonb, jsonb, timestamptz)    from public, anon, authenticated;
revoke all on function ops.fn_atualizar_ficha_app(jsonb)                        from public, anon, authenticated;
revoke all on function ops.fn_registrar_sinal_app(jsonb)                        from public, anon, authenticated;
grant execute on function ops.fn_registrar_decisao(jsonb)                       to service_role;
grant execute on function ops.fn_sincronizar_portoes(jsonb, jsonb, timestamptz) to service_role;
grant execute on function ops.fn_atualizar_ficha_app(jsonb)                     to service_role;
grant execute on function ops.fn_registrar_sinal_app(jsonb)                     to service_role;

-- ── a view das telas ──────────────────────────────────────────────────────────
-- degrau: 5 só declarado (escala) · 4 venda de mercado registrada · 3 evento nos últimos 30 dias, ou uso declarado válido
--         (quando a prova de uso mora fora deste banco, ex.: Clearix no crm_erp) · 2 deploy respondendo nas últimas 2 h ·
--         1 existe. Cada degrau diz de onde veio (degrau_por).
create view public.v_ops_apps_estado
with (security_invoker = on) as
with hoje as (select (now() at time zone 'America/Sao_Paulo')::date as d),
dep as (
  select distinct on (slug) slug, ok, medido_em, dados from ops.apps_sinais where tipo = 'deploy' order by slug, medido_em desc
),
rep as (
  select distinct on (slug) slug, ok, medido_em, dados from ops.apps_sinais where tipo = 'repo' order by slug, medido_em desc
),
ev as (
  select a.slug, count(l.id) as eventos_30d
    from ops.apps a
    left join analytics.events_log l
      on l.product = any (a.eventos_product) and l.occurred_at > now() - interval '30 days'
     and coalesce(l.session_id, '') not ilike 'teste%' and coalesce(l.utm_medium, '') !~* '^teste'
     and coalesce(l.utm_campaign, '') !~* '^teste\.'   -- palavra reservada do contrato de link
   group by a.slug
),
ven as (
  select a.slug,
         case a.vendas_fonte
           -- v_vendas_clearix já exclui billing.subscribers.teste (migration 130); hotmart_sales_teste nunca entra
           when 'v_vendas_clearix' then (select count(*) from public.v_vendas_clearix)
           when 'hotmart_sales'    then (select count(*) from marketing.hotmart_sales
                                          where status = 'approved' and coalesce(utm_campaign, '') !~* '^teste\.')
           else 0 end as vendas_mercado
    from ops.apps a
)
select a.slug, a.nome, a.tier, a.tagline, a.funcao, a.proximo, a.bloqueio, a.maturidade, a.urls,
       a.ficha_fonte, a.declarado_em, a.declarado_em + a.validade_dias as declaracao_valida_ate,
       (select d from hoje) > a.declarado_em + a.validade_dias as declaracao_vencida,
       dep.ok as deploy_ok, dep.dados->>'build' as deploy_build, dep.medido_em as deploy_medido_em,
       coalesce(dep.medido_em < now() - interval '2 hours', true) as deploy_sem_sinal_recente,
       rep.dados->>'commit' as repo_commit, (rep.dados->>'push_em_dia')::boolean as repo_push_em_dia, rep.medido_em as repo_medido_em,
       ev.eventos_30d, ven.vendas_mercado,
       case
         when a.degrau_declarado = 5 and (select d from hoje) <= a.declarado_em + a.validade_dias then 5
         when ven.vendas_mercado > 0 then 4
         when ev.eventos_30d > 0 then 3
         when a.degrau_declarado = 3 and (select d from hoje) <= a.declarado_em + a.validade_dias then 3
         when dep.ok and dep.medido_em > now() - interval '2 hours' then 2
         else 1
       end as degrau,
       case
         when a.degrau_declarado = 5 and (select d from hoje) <= a.declarado_em + a.validade_dias then 'declarado: ' || a.degrau_fonte
         when ven.vendas_mercado > 0 then 'medido: ' || ven.vendas_mercado || ' venda(s) de mercado'
         when ev.eventos_30d > 0 then 'medido: ' || ev.eventos_30d || ' eventos em 30 dias'
         when a.degrau_declarado = 3 and (select d from hoje) <= a.declarado_em + a.validade_dias then 'declarado: ' || a.degrau_fonte
         when dep.ok and dep.medido_em > now() - interval '2 hours' then 'medido: no ar'
         else 'sem sinal'
       end as degrau_por
  from ops.apps a
  left join dep on dep.slug = a.slug
  left join rep on rep.slug = a.slug
  left join ev  on ev.slug  = a.slug
  left join ven on ven.slug = a.slug
 where a.ativo;

-- o que precisa de reconfirmação humana (a Hoje passa a ler no passo 5)
create view public.v_ops_reconfirmar
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
     and (now() at time zone 'America/Sao_Paulo')::date > d.valida_ate;

revoke all on public.v_ops_apps_estado, public.v_ops_reconfirmar from public, anon;
grant select on public.v_ops_apps_estado, public.v_ops_reconfirmar to authenticated, service_role;

-- ── provas de comportamento, desfeitas na hora ────────────────────────────────
do $$
declare v jsonb;
begin
  begin
    perform ops.fn_atualizar_ficha_app(jsonb_build_object(
      'slug', 'prova_140', 'nome', 'Prova 140', 'ficha_fonte', 'Cockpit/Apps/prova_140/ficha.md',
      'maturidade', 'protótipo', 'eventos_product', 'prova-140', 'vendas_fonte', 'hotmart_sales',
      'declarado_em', (now() at time zone 'America/Sao_Paulo')::date - 40, 'validade_dias', 30));

    -- teste nunca conta como uso: sessão teste*, utm_medium teste*, utm_campaign "teste."
    insert into analytics.events_log (event_code, product, session_id, utm_medium, utm_campaign, occurred_at) values
      ('landing_visit', 'prova-140', 'teste-140', null, null, now()),
      ('landing_visit', 'prova-140', 's1', 'teste-eco', null, now()),
      ('landing_visit', 'prova-140', 's2', 'prospeccao', 'teste.compra_teste.v1', now());
    if (select eventos_30d from public.v_ops_apps_estado where slug = 'prova_140') <> 0 then
      raise exception 'PROVA_140_FALHOU: evento de teste contou como uso';
    end if;
    insert into analytics.events_log (event_code, product, session_id, occurred_at) values ('landing_visit', 'prova-140', 's3', now());
    if (select eventos_30d from public.v_ops_apps_estado where slug = 'prova_140') <> 1
    or (select degrau from public.v_ops_apps_estado where slug = 'prova_140') <> 3 then
      raise exception 'PROVA_140_FALHOU: evento real nao virou uso (degrau 3)';
    end if;

    -- venda: compra-teste nunca conta (o gatilho da 131 desvia "teste." para hotmart_sales_teste; o filtro da view é a
    -- segunda camada); venda de mercado aprovada leva ao degrau 4
    insert into marketing.hotmart_sales (hotmart_transaction, product_id, status, utm_campaign)
    values ('PROVA140TESTE', 'prova', 'approved', 'teste.compra_teste.v1');
    if (select vendas_mercado from public.v_ops_apps_estado where slug = 'prova_140') <> (select count(*) from marketing.hotmart_sales where status = 'approved' and coalesce(utm_campaign,'') !~* '^teste\.')
    or exists (select 1 from marketing.hotmart_sales where hotmart_transaction = 'PROVA140TESTE') then
      raise exception 'PROVA_140_FALHOU: compra-teste chegou em hotmart_sales ou contou como venda';
    end if;

    -- ficha declarada há 40 dias com validade 30 → vencida e na lista de reconfirmar
    if not (select declaracao_vencida from public.v_ops_apps_estado where slug = 'prova_140')
    or not exists (select 1 from public.v_ops_reconfirmar where tipo = 'ficha_vencida' and ref = 'prova_140') then
      raise exception 'PROVA_140_FALHOU: ficha vencida nao aparece para reconfirmar';
    end if;

    -- portões: fecha só com prova; sumido não fecha; parse vazio recusa
    v := ops.fn_sincronizar_portoes(
      '[{"numero":"9001","titulo":"Portao prova A","severidade":1},{"numero":"9002","titulo":"Portao prova B","severidade":2}]'::jsonb,
      '[]'::jsonb, now() - interval '1 minute');
    v := ops.fn_sincronizar_portoes('[{"numero":"9001","titulo":"Portao prova A","severidade":1}]'::jsonb,
      '[{"numero":"9001","data":"2026-09-16","prova":"prova do ensaio","fonte":"ensaio 140"}]'::jsonb, now());
    if (select indice_estado from ops.pendencias_humanas where fonte = 'Cockpit/portoes-abertos.md#9002') <> 'sumiu_do_indice'
    or (select status from ops.pendencias_humanas where fonte = 'Cockpit/portoes-abertos.md#9002') <> 'aberta'
    or (select indice_estado from ops.pendencias_humanas where fonte = 'Cockpit/portoes-abertos.md#9001') <> 'fechado' then
      raise exception 'PROVA_140_FALHOU: portao sumido fechou, ou fechado com prova nao fechou';
    end if;

    raise exception 'PROVA_140_OK';
  exception
    when others then
      if sqlerrm <> 'PROVA_140_OK' then raise; end if;
  end;
end $$;

do $$
begin
  begin
    perform ops.fn_sincronizar_portoes('[]'::jsonb, '[]'::jsonb, now());
    raise exception 'PROVA_140_FALHOU: retrato vazio foi aceito';
  exception
    when others then
      if sqlerrm not like 'retrato do indice sem nenhum portao aberto%' then raise; end if;
  end;
  begin
    perform ops.fn_registrar_decisao('{"fonte_arquivo":"Cockpit/decisoes/2026-09-16-prova.md","titulo":"x","decisao":"y","data":"2026-09-16","quem":"dono","onde":"canal"}'::jsonb);
    raise exception 'PROVA_140_FALHOU: decisao sem palavra foi aceita';
  exception
    when others then
      if sqlerrm not like 'decisao sem titulo, decisao, data, quem, onde ou palavra%' then raise; end if;
  end;
end $$;

commit;
