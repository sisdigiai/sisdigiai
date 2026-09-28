-- 160 — corrige um veredito que enganava, e abre o catálogo para o site institucional medir
--
-- ✔ APLICADA em 28/09/2026 às 16:04:00 BRT, reensaiada antes. Edge events-ingest redeployada com os dois códigos
--   novos. Provado com visita real a digiai.app.br: o evento chegou com utm_*, e a primeira versão do script
--   gravou DUAS linhas no mesmo milissegundo (carga + astro:page-load) — corrigido, 2ª visita gravou uma só.
--   As 3 linhas de prova foram apagadas depois (eram minhas, da mesma entrega).
--
-- (Escrita como NÃO APLICADA.)
--
-- O ERRO QUE ESTA MIGRATION CONSERTA: a 159 chamou clearix.app.br de "vitrine cega". É falso. A landing do
--   Clearix grava 429 eventos próprios em analytics.events_log, 399 nos últimos 30 dias, o último de hoje —
--   pelo clearix-attrib.js, keyless e sem PII (ADR-0036/0041). O que falta lá é pixel de TERCEIRO. Olhar só
--   Meta/TikTok/GA e concluir "cega" é exatamente o tipo de meia-verdade que esta casa não deixa na tela:
--   quem lesse decidiria instalar tracking onde já se mede.
--
-- O QUE MUDA NO VEREDITO: passa a existir "mede por conta própria" e "própria + pixel". Cega de verdade é só
--   quem não tem nenhuma das duas. Medido em 28/09: clearix-site 399 eventos/30d, osi 144, clearix-calc 2
--   (parada desde 16/09); digiai.app.br, e-commerce Mello e Nipo School sem nenhum evento.
--
-- POR QUE A COLUNA NOVA: o site é identificado por URL e o evento por `product` ('clearix-site', 'osi'…).
--   Sem dizer qual é qual, a view teria de adivinhar por parecença de nome — e adivinhação vira número errado.
--
-- CÓDIGOS NOVOS (digiai-site): o dono mandou instalar medição em digiai.app.br. O evento só entra se existir
--   no catálogo (chave estrangeira) E na allowlist da edge events-ingest — os dois lados sobem juntos; código
--   no catálogo sem allowlist é recusa silenciosa na borda.

begin;

do $$
begin
  if exists (select 1 from analytics.events_catalog where code = 'digiai_site_visit') then
    raise exception 'os codigos do site DIGIAI ja existem — a 160 ja foi aplicada?';
  end if;
end $$;

insert into analytics.events_catalog (code, funnel_stage, description, product, sort_order, meta_pixel_event, ga4_event)
values
  ('digiai_site_visit', 'awareness',     'Visita ao site institucional digiai.app.br, com utm_* da origem.', 'digiai-site', 10, 'PageView', 'page_view'),
  ('digiai_cta_click',  'consideration', 'Clique em CTA do site institucional (metadata.cta_id diz qual).',   'digiai-site', 20, null, null);

alter table company.digital_assets add column analytics_product text;
comment on column company.digital_assets.analytics_product is
  '160: qual `product` de analytics.events_log pertence a este site. Nulo = o site não manda evento próprio.';

update company.digital_assets set analytics_product = case valor
    when 'https://clearix.app.br'                        then 'clearix-site'
    when 'https://landingoticasemimproviso.netlify.app'  then 'osi'
    when 'https://digiai.app.br'                         then 'digiai-site'
  end
 where deleted_at is null and categoria = 'site'
   and valor in ('https://clearix.app.br', 'https://landingoticasemimproviso.netlify.app', 'https://digiai.app.br');

drop view public.v_ops_pixels;

create view public.v_ops_pixels
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
    from analytics.events_log
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
comment on view public.v_ops_pixels is
  '158/159/160: por site — medição própria (analytics.events_log) e pixel de terceiro encontrado no ar, ao lado do que o inventário declara.';

do $$
declare v_clearix text; v_cegas int;
begin
  select veredito into v_clearix from public.v_ops_pixels where url = 'https://clearix.app.br';
  if v_clearix <> 'mede por conta própria' then
    raise exception 'PROVA_160_FALHOU: clearix.app.br continua com veredito "%"', v_clearix;
  end if;

  if (select veredito from public.v_ops_pixels where url = 'https://landingoticasemimproviso.netlify.app')
     <> 'medição própria + pixel' then
    raise exception 'PROVA_160_FALHOU: a landing da OSI mede dos dois jeitos e a view nao disse isso';
  end if;

  -- cegas de verdade agora: digiai.app.br, e-commerce Mello e Nipo School (Polá Petit tem pixel, sem própria)
  select count(*) into v_cegas from public.v_ops_pixels where veredito like 'vitrine cega%';
  if v_cegas <> 3 then raise exception 'PROVA_160_FALHOU: % vitrines cegas, esperava 3', v_cegas; end if;

  if (select count(*) from analytics.events_catalog where product = 'digiai-site' and is_active) <> 2 then
    raise exception 'PROVA_160_FALHOU: os codigos do site DIGIAI nao entraram no catalogo';
  end if;
end $$;

commit;
