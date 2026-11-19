-- ============================================================
-- 265 — "semana completa" no resultado de negócio conta ficha-dia, não dia
-- Banco: o da casa (hswyopqvnolqpmprqvzh). Depende da 263, aplicada hoje.
--
-- O DEFEITO, e ele era meu: `semana_completa` comparava `count(distinct dia)` com `7 * fichas`. A Mello tem
-- quatro fichas, então a conta pedia 28 **dias distintos** numa semana de 7 — impossível. Resultado: **toda
-- semana aparecia como "incompleta"** na tela, inclusive as que têm todos os dias de todas as fichas.
--
-- E A PROVA PASSOU, porque era cega: ela só verificava "nenhuma semana completa mentindo sobre estar
-- completa". Com nada nunca completo, não havia o que mentir. Prova que só olha um lado da porta não prova
-- que a porta fecha. A prova nova exige **as duas coisas ao mesmo tempo**: ao menos uma semana passada
-- completa e ao menos uma incompleta (a corrente, que ainda está acontecendo).
--
-- Conserto: cada linha de `gbp_metricas_dia` é uma ficha num dia, então a semana cheia tem
-- `7 × fichas` linhas. É `count(*)`, não `count(distinct dia)`.
-- Achado ao abrir a tela em produção, não em teste nenhum: o número estava certo, o rótulo é que mentia.
-- Ensaio: FEITO (rollback) + 2 sabotagens.
-- ============================================================
begin;

do $$ begin
  if to_regclass('public.v_mkt_negocio_semana') is null then raise exception 'a 263 não está aplicada'; end if;
end $$;

create or replace view public.v_mkt_negocio_semana with (security_invoker = true) as
with gbp as (
  select b.code as marca, b.name as marca_nome, b.accent_hex,
         date_trunc('week', g.dia)::date as semana,
         count(distinct g.location_id) as fichas,
         count(distinct g.dia) as dias_medidos,
         count(*) as ficha_dias,                    -- cada linha é uma ficha num dia: é isto que fecha a semana
         sum(g.aparicoes) as aparicoes, sum(g.ligacoes) as ligacoes,
         sum(g.cliques_site) as cliques_site, sum(g.rotas) as rotas
    from mkt.gbp_metricas_dia g join mkt.brands b on b.id = g.brand_id
   group by 1, 2, 3, 4
),
esforco as (
  select b.code as marca, date_trunc('week', (p.published_at at time zone 'America/Sao_Paulo')::date)::date as semana,
         count(*) as publicacoes
    from mkt.publications p join mkt.brands b on b.id = p.brand_id
   where p.published_at is not null and p.published_at <= now()
   group by 1, 2
)
select g.marca, g.marca_nome, g.accent_hex, g.semana, g.fichas, g.dias_medidos,
       g.aparicoes, g.ligacoes, g.cliques_site, g.rotas,
       coalesce(e.publicacoes, 0) as publicacoes,
       (g.ficha_dias = 7 * g.fichas) as semana_completa,
       g.ficha_dias
  from gbp g left join esforco e on e.marca = g.marca and e.semana = g.semana
 where mkt.pode_ver_marca(g.marca);

comment on view public.v_mkt_negocio_semana is
  'O resultado de negócio do painel do Google por semana e por marca — aparições, ligações, cliques e pedidos de rota — com o esforço de publicação da mesma semana ao lado. `semana_completa` conta FICHA-DIA (7 × fichas linhas), não dias distintos: marca com quatro fichas nunca teria 28 dias numa semana de 7. ATENÇÃO: o Google mede por ficha e por dia, não por post — isto NÃO atribui resultado a peça nenhuma.';

revoke all on public.v_mkt_negocio_semana from public, anon;
grant select on public.v_mkt_negocio_semana to authenticated, service_role;

-- 2-a) a prova que a anterior não era: tem de existir semana completa E semana incompleta
do $$ declare n_completas int; n_incompletas int; begin
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select count(*) filter (where semana_completa), count(*) filter (where not semana_completa)
    into n_completas, n_incompletas
    from public.v_mkt_negocio_semana;
  if n_completas = 0 then
    raise exception 'nenhuma semana se declarou completa: a régua continua impossível de satisfazer';
  end if;
  if n_incompletas = 0 then
    raise exception 'toda semana se declarou completa, inclusive a corrente: a régua não exige nada';
  end if;
  -- e o rótulo tem de bater com a contagem, linha a linha
  if exists (select 1 from public.v_mkt_negocio_semana where semana_completa <> (ficha_dias = 7 * fichas)) then
    raise exception 'o rótulo de semana completa não bate com a contagem de ficha-dia';
  end if;
  -- a semana corrente não pode estar completa: ela ainda está acontecendo
  if exists (select 1 from public.v_mkt_negocio_semana
              where semana = date_trunc('week', (now() at time zone 'America/Sao_Paulo')::date)::date and semana_completa) then
    raise exception 'a semana que ainda está correndo se declarou completa';
  end if;
  reset role;
end $$;

-- 2-b) uma marca com mais de uma ficha também consegue fechar a semana (era o caso que o defeito matava)
do $$ declare n int; begin
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select count(*) into n from public.v_mkt_negocio_semana where fichas > 1 and semana_completa;
  reset role;
  if n = 0 then
    raise exception 'nenhuma marca de várias fichas fechou semana: o defeito da 263 continua de pé';
  end if;
end $$;

commit;

-- Sabotagens conferidas (as duas morderam):
--   a) voltar a `dias_medidos = 7 * fichas`  → 2-a: "nenhuma semana se declarou completa"
--   b) `semana_completa` sempre verdadeiro   → 2-a: "toda semana se declarou completa, inclusive a corrente"
--
-- Reversão: aplicar o corpo da view como estava na 263 — e voltar a dizer que toda semana está incompleta.
