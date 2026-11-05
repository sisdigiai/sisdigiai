-- 216 · corrige a 215, aplicada 20 minutos antes: "não está no inventário" pegou a HISTÓRIA
--
-- O QUE ACONTECEU: a 215 passou a listar na tela o que foi medido e não é site do inventário, para a
-- landing de loja deixar de ficar gravada e invisível. O critério pegou largo: trouxe 25 URLs do retrato de
-- 05/10 — os endereços `*.netlify.app` que os apps do Clearix usavam ANTES de mudar para `*.clearix.app.br`
-- (migration 169). Vinte e quatro delas apareceram como "vitrine cega — entra visitante e ninguém conta".
--
-- É exatamente o defeito que eu estava consertando, de novo pela minha mão: endereço morto lido como
-- página viva que não mede. Alguém olharia a tela e mandaria instalar pixel em 24 sites que não existem.
-- A 215 provou o que eu tinha imaginado (rascunho não é vitrine cega) e não provou o que eu não tinha
-- imaginado — por isso a prova aqui é por LISTA do que não pode aparecer, não por contagem.
--
-- CRITÉRIO CERTO: não é "nunca entrou no inventário", é "a varredura de agora passou por aqui". Medição
-- antiga continua na tabela, que é retrato histórico; a tela mostra o que foi visto na última passada.
-- A janela de 1 hora cobre varredura partida em dois pedaços (cada corrida grava tudo com o mesmo
-- `medido_em`, mas não quero que uma corrida em duas chamadas suma pela metade) e não alcança o retrato
-- anterior, que é de meses.
begin;

create or replace view public.v_ops_pixels
with (security_invoker = true) as
with sites as (
  select rotulo, valor as url, owner_product, provider, mede_visitante, analytics_product
    from company.digital_assets
   where deleted_at is null and categoria = 'site' and status = 'ativo'
), ultima as (
  select distinct on (url) url, medido_em, http_code, meta_pixel_id, tiktok, ga_gtm, clarity,
         pagina_inexistente, fonte
    from ops.pixel_medicao order by url, medido_em desc
), propria as (
  select product, count(*) as n30, max(created_at) as ultimo
    from analytics.events_humanos where created_at > now() - interval '30 days' group by product
), declarado as (
  select unnest(produtos) as produto, servico, identificador
    from ops.contas_servicos
   where ativo and servico in ('meta_pixel', 'tiktok_pixel')
), fora as (
  select u.* from ultima u
   where not exists (select 1 from company.digital_assets d
                      where d.deleted_at is null and d.categoria = 'site' and d.valor = u.url)
     and u.medido_em >= (select max(medido_em) from ops.pixel_medicao) - interval '1 hour'
)
select s.rotulo as site, s.url, s.owner_product as produto, s.provider, s.mede_visitante,
       u.medido_em, u.http_code,
       u.meta_pixel_id as meta_no_ar, u.tiktok as tiktok_no_ar, u.ga_gtm, u.clarity,
       coalesce(p.n30, 0)::integer as eventos_proprios_30d, p.ultimo as evento_proprio_em,
       (select string_agg(d.identificador, ', ' order by d.identificador) from declarado d
         where d.produto = s.owner_product and d.servico = 'meta_pixel'
           and d.identificador ~ '^[0-9]{14,16}$')                          as meta_declarado,
       (select string_agg(d.identificador, ', ' order by d.identificador) from declarado d
         where d.produto = s.owner_product and d.servico = 'tiktok_pixel')  as tiktok_declarado,
       case
         when u.medido_em is null                     then 'nunca medido'
         when u.pagina_inexistente                    then 'rascunho · página não existe (soft-404)'
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
       end as veredito,
       coalesce(u.pagina_inexistente, false) as pagina_inexistente,
       u.fonte
  from sites s
  left join ultima u on u.url = s.url
  left join propria p on p.product = s.analytics_product
union all
select
       coalesce(nullif(regexp_replace(f.url, '^https?://[^/]+/?', ''), ''),
                regexp_replace(f.url, '^https?://([^/]+).*$', '\1'))        as site,
       f.url,
       case when f.url like '%clearix.app.br%' then 'clearix' end           as produto,
       null::text                                                          as provider,
       f.url not like '%sitemap.xml'                                        as mede_visitante,
       f.medido_em, f.http_code,
       f.meta_pixel_id as meta_no_ar, f.tiktok as tiktok_no_ar, f.ga_gtm, f.clarity,
       -- Zero aqui é medição, não lacuna: nenhum evento da casa vem do host da landing (medido em 05/11,
       -- 0 de 1.789). Quem conta a visita dela é o eco, no banco do Clearix, que esta casa não lê.
       0::integer                                                          as eventos_proprios_30d,
       null::timestamptz                                                   as evento_proprio_em,
       null::text                                                          as meta_declarado,
       null::text                                                          as tiktok_declarado,
       case
         when f.url like '%sitemap.xml'               then 'lista de landings não lida — retrato sem landing por falha, não por ausência'
         when f.pagina_inexistente                    then 'rascunho · página não existe (soft-404)'
         when coalesce(f.http_code, 0) >= 400         then 'landing fora do ar (' || f.http_code || ')'
         when f.meta_pixel_id is not null or f.tiktok or f.ga_gtm is not null or f.clarity
                                                      then 'landing com pixel no ar'
         else 'vitrine cega — entra visitante e ninguém conta'
       end                                                                 as veredito,
       f.pagina_inexistente,
       f.fonte
  from fora f;

comment on view public.v_ops_pixels is
  '158/215/216: por página pública — pixel declarado no inventário × pixel encontrado no ar. Lista os sites '
  'ativos de company.digital_assets e, além deles, o que a ÚLTIMA varredura mediu e não é site do '
  'inventário (as landings de loja do Clearix, do sitemap público), com a origem em `fonte`. Rascunho com '
  'soft-404 aparece como "página não existe", nunca como vitrine cega. Endereço de retrato antigo não '
  'volta à tela: a tabela é história, a tela é o que foi visto na última passada.';

do $$
declare n int; vd text;
begin
  -- 1. nenhum site do inventário se perdeu (por conjunto: há URL repetida no inventário)
  if exists (select 1 from company.digital_assets d
              where d.deleted_at is null and d.categoria = 'site' and d.status = 'ativo'
                and not exists (select 1 from public.v_ops_pixels p where p.url = d.valor)) then
    raise exception 'PROVA_216_FALHOU: a view perdeu site do inventario';
  end if;

  -- 2. o defeito da 215, nomeado: endereço do retrato de 05/10 não pode aparecer
  select count(*) into n from public.v_ops_pixels p
   where p.url like '%.netlify.app' and not exists (
     select 1 from company.digital_assets d
      where d.deleted_at is null and d.categoria = 'site' and d.status = 'ativo' and d.valor = p.url);
  if n > 0 then
    raise exception 'PROVA_216_FALHOU: % endereco(s) de retrato antigo de volta na tela', n;
  end if;

  -- 3. e a landing de verdade, que é o motivo de tudo isto, continua na tela com o pixel que ela tem
  if not exists (select 1 from public.v_ops_pixels
                  where url = 'https://lojas.clearix.app.br/lancaster-suzano'
                    and veredito = 'landing com pixel no ar'
                    and fonte = 'sitemap lojas.clearix.app.br') then
    raise exception 'PROVA_216_FALHOU: a landing publicada saiu da tela junto com a historia';
  end if;

  -- 4. rascunho continua não sendo vitrine cega (a prova da 215 vale aqui também, com linha desfeita)
  begin
    perform ops.fn_registrar_pixel_medicao(
      '[{"url":"https://lojas.clearix.app.br/prova-216-rascunho","http_code":200,'
      '"pagina_inexistente":true,"fonte":"prova 216"}]'::jsonb);
    select veredito into vd from public.v_ops_pixels
     where url = 'https://lojas.clearix.app.br/prova-216-rascunho';
    if vd is null or vd not like 'rascunho%' then
      raise exception 'PROVA_216_FALHOU: veredito de rascunho quebrou: %', coalesce(vd, '(ausente)');
    end if;
    raise exception 'PROVA_216_OK';
  exception when others then
    if sqlerrm <> 'PROVA_216_OK' then raise; end if;
  end;

  if exists (select 1 from ops.pixel_medicao where fonte = 'prova 216') then
    raise exception 'PROVA_216_FALHOU: linha de prova ficou gravada';
  end if;
end $$;

commit;
