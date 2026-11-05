-- 215 · "não existe" e "existe e não mede" param de sair pelo mesmo lugar
--
-- POR QUE EXISTE: em 05/11 eu dei alarme ao dono de duas landings "no ar sem pixel". Não estavam no ar:
-- `visaoparasuzano` e `lancaster-multifocal` devolvem HTTP 200 com o corpo "Página não encontrada" — são
-- rascunhos, e um slug que eu inventei na hora devolve a mesma coisa. Eu tratei o CÓDIGO como prova e não
-- olhei o CORPO. O conserto no medidor (scripts/medir-pixel.mjs) já distingue os dois casos; esta migration
-- é o resto do caminho: sem coluna, o script sabia e a casa esquecia na primeira gravação.
--
-- As duas leituras pedem ações OPOSTAS: página que não existe se publica (ou se apaga o anúncio que aponta
-- para ela); página que existe e não mede recebe pixel. Chamar rascunho de "vitrine cega" manda instalar
-- pixel em página que ninguém vê, e esconde que há verba apontada para "não encontrada".
--
-- E consertando, achei o defeito maior, meu também, de ontem: a landing que eu medi em 04/11 está gravada
-- em ops.pixel_medicao e NUNCA chegou à tela — `v_ops_pixels` nasce de company.digital_assets, logo só
-- enxerga os 31 sites do inventário. Eu reportei "as landings entraram no retrato" e isso era verdade na
-- tabela e falso na tela que o dono lê. Aqui a view passa a listar também o que foi medido e não é site do
-- inventário, com a origem escrita (`fonte`).
--
-- 404 DE VERDADE NÃO ENTRA NESTA COLUNA. Site do inventário que responde 404 é "fora do ar" — é alarme, e
-- alarme alto: deveria existir e não existe. `pagina_inexistente` é só o soft-404: 200 com a página de
-- "não encontrada" do próprio host.
begin;

alter table ops.pixel_medicao
  add column if not exists pagina_inexistente boolean not null default false;

comment on column ops.pixel_medicao.pagina_inexistente is
  '215: soft-404 — a URL respondeu 200 com a MESMA página de "não encontrada" que uma sonda inventada no '
  'mesmo host (rascunho ou slug errado). Não é "existe e não mede". 404 de verdade fica em http_code.';

-- A gravação passa a carregar a coluna. `coalesce(...,false)` porque retrato antigo e medição de raiz não
-- mandam a chave, e ausência ali significa "a sonda não se aplica", nunca "não existe".
create or replace function ops.fn_registrar_pixel_medicao(p jsonb)
returns integer
language sql
security definer
set search_path = ''
as $$
  insert into ops.pixel_medicao (url, http_code, meta_pixel_id, tiktok, ga_gtm, clarity, fonte, obs,
                                 pagina_inexistente)
  select x->>'url', (x->>'http_code')::int, nullif(x->>'meta_pixel_id',''),
         coalesce((x->>'tiktok')::boolean, false), nullif(x->>'ga_gtm',''),
         coalesce((x->>'clarity')::boolean, false),
         coalesce(x->>'fonte', 'scripts/medir-pixel.mjs'), nullif(x->>'obs',''),
         coalesce((x->>'pagina_inexistente')::boolean, false)
    from jsonb_array_elements(p) x
  returning 1;
$$;

-- Coluna nova entra no FIM da lista: `create or replace view` não reordena nem insere coluna no meio
-- (a 211 recusou com 42P16 quando eu tentei pôr a coluna onde ela se lê melhor).
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
  -- Medido e não é site do inventário: hoje são as landings de loja do Clearix, lidas do sitemap público.
  -- O critério é "não está no inventário", não "o texto da fonte começa com sitemap": landing nova, host
  -- novo ou linha de falha aparecem sozinhos, sem ninguém lembrar de mexer aqui.
  select u.* from ultima u
   where not exists (select 1 from company.digital_assets d
                      where d.deleted_at is null and d.categoria = 'site' and d.valor = u.url)
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
       -- O nome útil de uma landing é o slug; se não houver caminho, o host.
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
  '158/215: por página pública — pixel declarado no inventário × pixel encontrado no ar. Além dos sites '
  'ativos de company.digital_assets, lista o que foi medido e não é site do inventário (as landings de '
  'loja do Clearix, do sitemap público), com a origem em `fonte`. Rascunho com soft-404 aparece como '
  '"página não existe", nunca como vitrine cega: publicar e instalar pixel são ações opostas.';

do $$
declare vd text;
begin
  if has_table_privilege('anon', 'ops.pixel_medicao', 'select')
  or has_table_privilege('anon', 'public.v_ops_pixels', 'select')
  or has_function_privilege('authenticated', 'ops.fn_registrar_pixel_medicao(jsonb)', 'execute') then
    raise exception 'PROVA_215_FALHOU: anon/authenticated com acesso indevido.';
  end if;

  -- 1. nenhum site do inventário se perdeu no caminho da união. Por conjunto, não por contagem: com linha
  -- repetida no inventário (app.clearix.app.br entra duas vezes) a contagem fecharia com site faltando.
  if exists (select 1 from company.digital_assets d
              where d.deleted_at is null and d.categoria = 'site' and d.status = 'ativo'
                and not exists (select 1 from public.v_ops_pixels p where p.url = d.valor)) then
    raise exception 'PROVA_215_FALHOU: a view perdeu site do inventario';
  end if;

  -- 2. a landing medida em 04/11, que estava gravada e invisível, agora aparece
  if not exists (select 1 from public.v_ops_pixels
                  where url = 'https://lojas.clearix.app.br/lancaster-suzano'
                    and veredito = 'landing com pixel no ar') then
    raise exception 'PROVA_215_FALHOU: a landing publicada nao chegou a tela com o pixel que ela tem';
  end if;

  -- 3. o que importa: soft-404 NÃO pode ser lido como vitrine cega. Linha sintética, desfeita no fim.
  begin
    perform ops.fn_registrar_pixel_medicao(
      '[{"url":"https://lojas.clearix.app.br/prova-215-rascunho","http_code":200,'
      '"pagina_inexistente":true,"fonte":"prova 215","obs":"linha de prova, desfeita"}]'::jsonb);
    select veredito into vd from public.v_ops_pixels
     where url = 'https://lojas.clearix.app.br/prova-215-rascunho';
    if vd is null then
      raise exception 'PROVA_215_FALHOU: rascunho medido nao chegou a view';
    end if;
    if vd like 'vitrine cega%' then
      raise exception 'PROVA_215_FALHOU: rascunho lido como vitrine cega — o defeito de 05/11 de volta';
    end if;
    if vd not like 'rascunho%' then
      raise exception 'PROVA_215_FALHOU: veredito inesperado para rascunho: %', vd;
    end if;
    -- controle positivo do contrário: sem a marca, a mesma URL sem pixel TEM de ser vitrine cega
    perform ops.fn_registrar_pixel_medicao(
      '[{"url":"https://lojas.clearix.app.br/prova-215-viva","http_code":200,"fonte":"prova 215"}]'::jsonb);
    select veredito into vd from public.v_ops_pixels
     where url = 'https://lojas.clearix.app.br/prova-215-viva';
    if vd not like 'vitrine cega%' then
      raise exception 'PROVA_215_FALHOU: landing viva sem pixel deixou de ser vitrine cega: %', vd;
    end if;
    raise exception 'PROVA_215_OK';
  exception when others then
    if sqlerrm <> 'PROVA_215_OK' then raise; end if;
  end;

  if exists (select 1 from ops.pixel_medicao where fonte = 'prova 215') then
    raise exception 'PROVA_215_FALHOU: linha de prova ficou gravada';
  end if;
end $$;

commit;
