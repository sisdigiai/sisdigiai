-- 252 · Marca sem nada não ocupa lugar na tela
--
-- A Lousa traz duas grafias para a mesma marca (`mello` e `mello óticas`), e a segunda chegava à tela
-- como um cartão vazio: 0 na fila, 0 artes, 0 publicadas, "sem ritmo". Cartão que não diz nada ocupa o
-- lugar de um que diz — e o dono lê a tela de cima para baixo.
--
-- A regra é estreita de propósito: sai **só** quem não tem absolutamente nada nos três números. Marca
-- parada que publicou esta semana, ou que tem arte na biblioteca, continua aparecendo — parar é
-- justamente o que se precisa de ver.
create or replace view public.v_mkt_estoque_marca with (security_invoker = true) as
with fila as (
  select marca,
         count(*) filter (where estado in ('agendado','planejado','no_planner','rascunho') and quando >= now())::int as na_fila,
         count(*) filter (where estado = 'publicado' and quando > now() - interval '7 days')::int                     as publicadas_7d,
         max(quando) filter (where estado in ('agendado','planejado','no_planner','rascunho') and quando >= now())    as ultima_marcada
    from public.v_lousa group by 1
), biblioteca as (
  select b.code as marca, count(*)::int as artes_prontas
    from mkt.assets a join mkt.brands b on b.id = a.brand_id
   where a.status = 'a_postar' group by 1
), marcas as (select marca from fila union select marca from biblioteca)
select
  m.marca,
  coalesce(b2.name, initcap(m.marca)) as marca_nome,
  b2.accent_hex,
  coalesce(f.na_fila, 0) as na_fila,
  coalesce(bi.artes_prontas, 0) as artes_prontas,
  coalesce(f.publicadas_7d, 0) as publicadas_7d,
  round(coalesce(f.publicadas_7d, 0) / 7.0, 2) as ritmo_medido,
  f.ultima_marcada,
  case when coalesce(f.publicadas_7d, 0) > 0 then 'medido' else null end as ritmo_de,
  case when coalesce(f.publicadas_7d, 0) > 0
       then round(coalesce(f.na_fila, 0) / (coalesce(f.publicadas_7d, 0) / 7.0), 1)
       else null end as dias_de_estoque
from marcas m
left join fila f on f.marca = m.marca
left join biblioteca bi on bi.marca = m.marca
left join mkt.brands b2 on b2.code = m.marca
where coalesce(f.na_fila,0) + coalesce(bi.artes_prontas,0) + coalesce(f.publicadas_7d,0) > 0;

do $$
begin
  if exists (select 1 from public.v_mkt_estoque_marca
              where na_fila = 0 and artes_prontas = 0 and publicadas_7d = 0) then
    raise exception 'PROVA FALHOU: cartão vazio voltou à tela';
  end if;
  -- E quem tem alguma coisa continua: o filtro não pode varrer marca parada que ainda publica.
  if not exists (select 1 from public.v_mkt_estoque_marca where marca = 'lancaster') then
    raise exception 'PROVA FALHOU: o filtro levou uma marca com movimento';
  end if;
  raise notice 'provas ok';
end $$;
