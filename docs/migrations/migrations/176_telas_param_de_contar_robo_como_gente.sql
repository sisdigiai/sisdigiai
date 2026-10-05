-- 176 — as minhas telas passam a ler o log sem os automáticos
--
-- ✔ APLICADA em 05/10/2026 às 15:54:54 BRT, reensaiada antes. Depois: clearix-site 386 eventos de gente em
--   30 dias (eu havia reportado 399 ao dono, sem desconto), OSI 132, digiai-site 47, loja 0.
--
-- (Escrita como NÃO APLICADA.)
--
-- CONTINUAÇÃO DA 175, que marcou 57 eventos de navegador automático no histórico. Marcar não basta: enquanto
--   as views lerem `events_log` cru, o robô continua virando número na tela. Aqui as **minhas** três passam a
--   ler `analytics.events_humanos`.
--
-- O QUE NÃO TOCO, de propósito: `v_mkt_calc_uso`, `v_mkt_calc_campanhas`, `v_mkt_calc_funil`,
--   `v_mkt_funil_leads` e `v_mkt_osi_dias` são do MKT e também leem o log cru. Trocar view de outro agente
--   sem ele saber quebra a confiança que faz este arranjo funcionar — mandei a lista para ele.
--
-- EFEITO MEDIDO (05/10): osi perde 38 eventos de 253 (15%), clearix-site perde 16 de 459, clearix-calc perde
--   3 de 63, digiai-site não perde nenhum. Os números das telas CAEM, e caem porque estavam errados.

begin;

do $$
begin
  if (select pg_get_viewdef('public.v_analytics_funnel_daily'::regclass, true)) ilike '%events_humanos%' then
    raise exception 'as views ja leem events_humanos — a 176 ja foi aplicada?';
  end if;
end $$;

create or replace view public.v_analytics_funnel_daily as
select product, event_code, occurred_at::date as day, count(*) as n
  from analytics.events_humanos
 where occurred_at >= now() - interval '90 days'
 group by product, event_code, (occurred_at::date);

create or replace view public.v_analytics_funnel_summary as
select c.product, c.code as event_code, c.funnel_stage, c.sort_order,
       count(l.id) filter (where l.occurred_at >= now() - interval '7 days')  as n_7d,
       count(l.id) filter (where l.occurred_at >= now() - interval '30 days') as n_30d,
       count(l.id)                                                            as n_total,
       max(l.occurred_at)                                                     as last_at
  from analytics.events_catalog c
  left join analytics.events_humanos l
    on l.event_code = c.code
   and (l.product is null or l.product = c.product or c.product like (l.product || '-%'))
   and analytics.fn_origem_real(l.url, l.utm_campaign)
 where c.is_active
 group by c.product, c.code, c.funnel_stage, c.sort_order;

-- v_ops_pixels: o "mede por conta própria" não pode ser sustentado por robô
create or replace view public.v_ops_pixels
with (security_invoker = true) as
with sites as (
  select rotulo, valor as url, owner_product, provider, mede_visitante, analytics_product
    from company.digital_assets
   where deleted_at is null and categoria = 'site' and status = 'ativo'
), ultima as (
  select distinct on (url) url, medido_em, http_code, meta_pixel_id, tiktok, ga_gtm, clarity
    from ops.pixel_medicao order by url, medido_em desc
), propria as (
  select product, count(*) n30, max(created_at) ultimo
    from analytics.events_humanos
   where created_at > now() - interval '30 days'
   group by product
), declarado as (
  select unnest(produtos) as produto, servico, identificador
    from ops.contas_servicos
   where ativo and servico in ('meta_pixel', 'tiktok_pixel')
)
select s.rotulo as site, s.url, s.owner_product as produto, s.provider, s.mede_visitante,
       u.medido_em, u.http_code,
       u.meta_pixel_id as meta_no_ar, u.tiktok as tiktok_no_ar, u.ga_gtm, u.clarity,
       coalesce(p.n30, 0)::int as eventos_proprios_30d, p.ultimo as evento_proprio_em,
       (select string_agg(d.identificador, ', ' order by d.identificador) from declarado d
         where d.produto = s.owner_product and d.servico = 'meta_pixel'
           and d.identificador ~ '^[0-9]{14,16}$')                          as meta_declarado,
       (select string_agg(d.identificador, ', ' order by d.identificador) from declarado d
         where d.produto = s.owner_product and d.servico = 'tiktok_pixel')  as tiktok_declarado,
       case
         when u.medido_em is null                     then 'nunca medido'
         when coalesce(u.http_code, 0) >= 400         then 'site fora do ar (' || u.http_code || ')'
         when u.meta_pixel_id is not null and not exists (
                select 1 from declarado d where d.produto = s.owner_product
                 and d.servico = 'meta_pixel' and d.identificador = u.meta_pixel_id)
                                                      then 'pixel no ar que o inventário não conhece'
         when coalesce(p.n30, 0) > 0 and (u.meta_pixel_id is not null or u.tiktok)
                                                      then 'medição própria + pixel'
         when coalesce(p.n30, 0) > 0                  then 'mede por conta própria'
         when u.meta_pixel_id is not null or u.tiktok or u.ga_gtm is not null or u.clarity
                                                      then 'só pixel de terceiro'
         when s.mede_visitante                        then 'vitrine cega — entra visitante e ninguém conta'
         else 'app com login · não mede visitante'
       end as veredito
  from sites s
  left join ultima u on u.url = s.url
  left join propria p on p.product = s.analytics_product;

revoke all on public.v_ops_pixels from public, anon;
grant select on public.v_ops_pixels to authenticated, service_role;

do $$
declare v_osi_antes int; v_osi_depois int;
begin
  select count(*) into v_osi_antes from analytics.events_log where product='osi';
  select coalesce(sum(n_total),0) into v_osi_depois from public.v_analytics_funnel_summary where product='osi';
  if v_osi_antes <= v_osi_depois then
    raise exception 'PROVA_176_FALHOU: o funil da osi nao caiu (% antes, % depois) — nao filtrou', v_osi_antes, v_osi_depois;
  end if;

  if (select pg_get_viewdef('public.v_ops_pixels'::regclass, true)) not ilike '%events_humanos%' then
    raise exception 'PROVA_176_FALHOU: v_ops_pixels continua lendo o log cru';
  end if;
  if has_table_privilege('anon', 'public.v_ops_pixels', 'select')
  or not has_table_privilege('authenticated', 'public.v_ops_pixels', 'select') then
    raise exception 'PROVA_176_FALHOU: grant saiu do lugar';
  end if;

  -- a loja ainda nao tem evento de gente: o veredito dela nao pode dizer que mede sozinha
  if (select veredito from public.v_ops_pixels where url='https://mellooticas.com.br') <> 'só pixel de terceiro' then
    raise exception 'PROVA_176_FALHOU: a loja aparece medindo com zero evento humano';
  end if;
end $$;

commit;
