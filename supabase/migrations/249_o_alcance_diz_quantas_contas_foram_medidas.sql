-- 249 · O elo "alcançar" passa a dizer quantas contas foram medidas naquele dia
--
-- O QUE EU VI NA TELA, 15 minutos depois de a publicar: "alcançar subiu 74%". Audiência não cresce 74%
-- em sete dias. Fui medir e são DOIS artefatos, nenhum deles crescimento:
--
--   1. **A medição mudou de tamanho.** O censo cobria 8 contas em 03/11 e cobre 22 hoje. Comparar o
--      total de hoje com o de duas semanas atrás é comparar cestas diferentes e chamar a diferença de
--      resultado.
--   2. **Nem toda conta é medida todo dia.** 16/11 deu 2.681, 17/11 deu 2.181, 18/11 deu 2.713 — uma
--      oscilação de 500 seguidores de um dia para o outro, que é conta faltando no censo, não gente
--      saindo e voltando.
--
-- A view passa a emitir, junto do total, **quantas contas entraram naquele dia**. Com isso a tela
-- recusa a comparação quando a cesta muda, em vez de mostrar uma seta verde que não quer dizer nada.
-- O número continua aparecendo; o que não aparece é a conclusão falsa em cima dele.

begin;

drop view if exists public.v_marketing_cadeia_dia;

create view public.v_marketing_cadeia_dia with (security_invoker = true) as
with publicacoes(dia, n) as (
  select (published_at at time zone 'America/Sao_Paulo')::date, count(*)::numeric
    from mkt.publications where published_at is not null and published_at <= now() group by 1
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
), censo as (
  select dia, sum(seguidores)::numeric as n, count(*)::numeric as contas
    from (select distinct on (brand_id, platform, dia) dia, brand_id, platform, seguidores
            from mkt.audiencia_diaria order by brand_id, platform, dia, id desc) x
   group by dia
)
select dia, 'produzir'::text as elo, 'publicacoes'::text as medida, 'fluxo'::text as natureza, n from publicacoes
union all select dia, 'alcancar',   'seguidores',  'estoque', n      from censo
union all select dia, 'alcancar',   'contas',      'estoque', contas from censo
union all select dia, 'captar',     'leads',       'fluxo',   n from leads
union all select dia, 'prospectar', 'disparos',    'fluxo',   n from disparos
union all select dia, 'vender',     'vendas',      'fluxo',   n from vendas
union all select dia, 'vender',     'receita_brl', 'fluxo',   n from receita;

comment on view public.v_marketing_cadeia_dia is
  'Cadeia por dia (BRT). `natureza` separa fluxo (soma-se) de estoque (censo: vale o último valor). '
  'O elo alcancar traz tambem a medida `contas`: quantas contas entraram no censo daquele dia — sem '
  'isso, crescimento da medicao passa por crescimento de audiencia.';

grant select on public.v_marketing_cadeia_dia to authenticated;

do $$
declare v_n int; v_contas_hoje numeric; v_contas_antes numeric;
begin
  select count(*) into v_n from public.v_marketing_cadeia_dia
   where dia > (now() at time zone 'America/Sao_Paulo')::date;
  if v_n > 0 then raise exception 'PROVA 1 FALHOU: % dia(s) no futuro', v_n; end if;

  -- 2. A medida nova existe e é maior que zero onde há censo.
  select n into v_contas_hoje from public.v_marketing_cadeia_dia
   where elo='alcancar' and medida='contas' order by dia desc limit 1;
  if coalesce(v_contas_hoje, 0) <= 0 then
    raise exception 'PROVA 2 FALHOU: o censo não diz quantas contas mediu';
  end if;

  -- 3. A cesta MUDOU mesmo — é o que justifica esta migration existir. Se um dia parar de mudar,
  --    esta prova falha e alguém relê a regra em vez de a carregar por inércia.
  select n into v_contas_antes from public.v_marketing_cadeia_dia
   where elo='alcancar' and medida='contas' and dia <= (now() at time zone 'America/Sao_Paulo')::date - 14
   order by dia desc limit 1;
  if v_contas_antes is not null and v_contas_antes = v_contas_hoje then
    raise exception 'PROVA 3: a cobertura do censo parou de mudar (% contas nos dois pontos) — reveja se a recusa de comparar ainda faz sentido', v_contas_hoje;
  end if;

  -- 4. Seguidores e contas andam juntos: todo dia com total tem também a contagem de contas.
  select count(*) into v_n from (
    select dia from public.v_marketing_cadeia_dia where elo='alcancar' and medida='seguidores'
    except
    select dia from public.v_marketing_cadeia_dia where elo='alcancar' and medida='contas') x;
  if v_n > 0 then raise exception 'PROVA 4 FALHOU: % dia(s) com total e sem cobertura', v_n; end if;

  raise notice 'as 4 provas passaram (hoje % contas, há 14 dias %)', v_contas_hoje, v_contas_antes;
end $$;

commit;
