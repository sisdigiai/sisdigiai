-- 247 · A cadeia por dia, para a central poder comparar período com período
--
-- POR QUÊ: a `v_marketing_cadeia` entrega números de janela fixa (7 dias, 30 dias) já somados. Para a
-- central mostrar "o período escolhido e o anterior do mesmo tamanho", a app precisa da série, não do
-- total — senão eu teria de pedir ao banco uma vez por janela e por elo, e inventar aritmética em cima
-- de somas prontas.
--
-- DUAS NATUREZAS DIFERENTES, e a view diz qual é cada uma:
--   · **fluxo** (`publicacoes`, `leads`, `disparos`, `vendas`, `receita_brl`): soma-se no período;
--   · **estoque** (`seguidores`): é um censo, NÃO se soma. Somar sete dias de censo daria sete vezes a
--     audiência. No período vale o ÚLTIMO valor, e a coluna `natureza` existe para ninguém errar isso
--     depois de eu sair desta tela.
--
-- `security_invoker` e sem PII: só contagem por dia (R-043, R-044).

begin;

drop view if exists public.v_marketing_cadeia_dia;

create view public.v_marketing_cadeia_dia with (security_invoker = true) as
with publicacoes(dia, n) as (
  select (published_at at time zone 'America/Sao_Paulo')::date as dia, count(*)::numeric as n
    from mkt.publications
   where published_at is not null and published_at <= now()
   group by 1
), leads(dia, n) as (
  select (created_at at time zone 'America/Sao_Paulo')::date, count(*)::numeric
    from marketing.landing_leads group by 1
), disparos(dia, n) as (
  select (enviado_em at time zone 'America/Sao_Paulo')::date, count(*)::numeric
    from mkt.osi_disparos where enviado_em is not null group by 1
), vendas(dia, n) as (
  select (created_at at time zone 'America/Sao_Paulo')::date, count(*)::numeric
    from marketing.hotmart_sales group by 1
), receita(dia, n) as (
  select (created_at at time zone 'America/Sao_Paulo')::date,
         (coalesce(sum(price_value_cents), 0) / 100.0)::numeric
    from marketing.hotmart_sales group by 1
), seguidores(dia, n) as (
  -- Um censo por marca e plataforma por dia; aqui soma-se entre contas do MESMO dia, nunca entre dias.
  select dia, sum(seguidores)::numeric
    from (select distinct on (brand_id, platform, dia) dia, brand_id, platform, seguidores
            from mkt.audiencia_diaria order by brand_id, platform, dia, id desc) x
   group by dia
)
select dia, 'produzir'::text as elo, 'publicacoes'::text as medida, 'fluxo'::text as natureza, n from publicacoes
union all select dia, 'alcancar',   'seguidores',  'estoque', n from seguidores
union all select dia, 'captar',     'leads',       'fluxo',   n from leads
union all select dia, 'prospectar', 'disparos',    'fluxo',   n from disparos
union all select dia, 'vender',     'vendas',      'fluxo',   n from vendas
union all select dia, 'vender',     'receita_brl', 'fluxo',   n from receita;

comment on view public.v_marketing_cadeia_dia is
  'Cadeia de resultados por dia (BRT), para comparar períodos. `natureza` separa fluxo (soma-se) de '
  'estoque (censo: no período vale o último valor, nunca a soma).';

grant select on public.v_marketing_cadeia_dia to authenticated;

do $$
declare v_n int; v_hoje numeric; v_vista numeric;
begin
  -- 1. Invoker e fechada a visitante.
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname='v_marketing_cadeia_dia'
                    and array_to_string(c.reloptions,',') like '%security_invoker=true%') then
    raise exception 'PROVA 1 FALHOU: não é security_invoker';
  end if;
  if has_table_privilege('anon', 'public.v_marketing_cadeia_dia', 'select') then
    raise exception 'PROVA 1 FALHOU: anon lê a cadeia';
  end if;

  -- 2. NENHUM dia no futuro. Agendado não conta como publicado — foi o defeito da página de hoje.
  select count(*) into v_n from public.v_marketing_cadeia_dia
   where dia > (now() at time zone 'America/Sao_Paulo')::date;
  if v_n > 0 then raise exception 'PROVA 2 FALHOU: % dia(s) no futuro', v_n; end if;

  -- 3. A série não perde nem duplica nada: somada inteira, dá exatamente o total publicado.
  --    (Comparar com `posts_7d` da view antiga seria comparar janelas diferentes — ela usa 7x24h
  --    corridas e esta série é por dia de calendário BRT. A primeira versão desta prova fazia isso e
  --    acusava 141 contra 150; o erro era da prova, não da view.)
  select sum(n) into v_vista from public.v_marketing_cadeia_dia where elo='produzir';
  select count(*) into v_n from mkt.publications where published_at is not null and published_at <= now();
  if coalesce(v_vista,0) <> v_n then
    raise exception 'PROVA 3 FALHOU: a série soma % e o banco tem % publicadas', v_vista, v_n;
  end if;

  -- 4. O censo de seguidores NÃO é somável entre dias: a soma do período tem de passar MUITO do
  --    valor de um dia só, e é por isso que `natureza` existe.
  select sum(n) into v_vista from public.v_marketing_cadeia_dia
   where elo='alcancar' and dia > (now() at time zone 'America/Sao_Paulo')::date - 7;
  select seguidores into v_hoje from public.v_marketing_cadeia;
  if v_hoje > 0 and v_vista <= v_hoje then
    raise exception 'PROVA 4 FALHOU: o censo parece somável, e a armadilha deixa de ser visível';
  end if;

  raise notice 'as 4 provas passaram';
end $$;

commit;
