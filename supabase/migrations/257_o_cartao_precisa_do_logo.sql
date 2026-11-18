-- 257 · O cartão do controle precisa do logo, como o da aba Marcas
--
-- Ordem do dono (18/11, 16h31): a aba Publicações passa a usar **o mesmo cartão** da aba Marcas, e
-- aquele cartão começa pelo logo da marca. A view do fôlego não trazia, e sem ele o cartão seria
-- "parecido", não igual — que é exatamente a diferença que o dono apontou ao parar a obra.
drop view if exists public.v_mkt_estoque_marca;
create view public.v_mkt_estoque_marca with (security_invoker = true) as
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
  b2.logo_url,
  coalesce(f.na_fila, 0) as na_fila,
  coalesce(bi.artes_prontas, 0) as artes_prontas,
  coalesce(f.publicadas_7d, 0) as publicadas_7d,
  round(coalesce(f.publicadas_7d, 0) / 7.0, 2) as ritmo_medido,
  f.ultima_marcada,
  case when coalesce(f.publicadas_7d, 0) > 0 then 'medido' else null end as ritmo_de,
  greatest(0, ((f.ultima_marcada at time zone 'America/Sao_Paulo')::date
               - (now() at time zone 'America/Sao_Paulo')::date))::numeric as dias_marcados,
  case when coalesce(f.publicadas_7d, 0) > 0
       then round(coalesce(bi.artes_prontas, 0) / (coalesce(f.publicadas_7d, 0) / 7.0), 1)
       else null end as dias_biblioteca,
  case when coalesce(f.publicadas_7d, 0) > 0
       then round(greatest(0, ((f.ultima_marcada at time zone 'America/Sao_Paulo')::date
                               - (now() at time zone 'America/Sao_Paulo')::date))::numeric
                  + coalesce(bi.artes_prontas, 0) / (coalesce(f.publicadas_7d, 0) / 7.0), 1)
       else null end as dias_de_estoque
from marcas m
left join fila f on f.marca = m.marca
left join biblioteca bi on bi.marca = m.marca
left join mkt.brands b2 on b2.code = m.marca
where coalesce(f.na_fila,0) + coalesce(bi.artes_prontas,0) + coalesce(f.publicadas_7d,0) > 0;

grant select on public.v_mkt_estoque_marca to authenticated;

do $$
begin
  if not exists (select 1 from information_schema.columns
                  where table_schema='public' and table_name='v_mkt_estoque_marca' and column_name='logo_url') then
    raise exception 'PROVA FALHOU: a view não entrega o logo';
  end if;
  raise notice 'ok';
end $$;
