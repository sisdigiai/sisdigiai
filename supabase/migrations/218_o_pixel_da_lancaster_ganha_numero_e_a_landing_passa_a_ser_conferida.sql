-- 218 — O pixel da Lancaster ganha número, e a landing passa a ser conferida (pedido do dono em 06/11/2026).
--
-- O QUE ESTAVA ERRADO, em duas camadas:
--
-- (1) A DECLARAÇÃO NÃO TINHA NÚMERO. `ops.contas_servicos` guardava o pixel da Lancaster como
--     `identificador = 'pixel_lancaster'` — que é o NOME do pixel no Gerenciador de Eventos, não o id. A
--     comparação "declarado × no ar" só aceita identificador numérico (`^[0-9]{14,16}$`), então aquela
--     linha nunca era conferida contra nada. Pior: foi em cima dessa confusão que eu acusei o Marketing de
--     ter trocado o pixel por engano, em 05/11, e tive de desdizer. Nome no campo do número não é detalhe
--     de cadastro: é uma comparação que não roda e ninguém vê não rodando.
--     Decisão do dono (05/11): a declaração carrega nome, número ou os dois. Aqui ela carrega os dois — o
--     número no identificador, porque é o que a máquina compara, e o nome no obs, porque é o que a pessoa
--     procura no Gerenciador.
--
-- (2) A COMPARAÇÃO NÃO RODAVA PARA LANDING NENHUMA. As landings de loja entram em `v_ops_pixels` pelo
--     segundo lado do UNION, e lá `meta_declarado` era `null::text` fixo — constante, não medição. O
--     veredito da landing conseguia dizer "tem pixel no ar" e nunca "é o pixel certo", que é a pergunta
--     que decide gasto com anúncio. Zero escrito à mão passa por zero medido; o mesmo defeito do
--     `eventos_proprios_30d` nessa mesma linha, que continua 0 fixo (a landing não manda evento para o
--     `fn_log_event` — item em aberto com o Marketing, e NÃO é o que esta migration resolve).
--
-- PROCEDÊNCIA DO NÚMERO (R-046: número que decide dinheiro vem com origem e data):
--   · 576159047194101 está NO AR na landing `lojas.clearix.app.br/lancaster-suzano`, lido hoje
--     (06/11/2026) pelo medidor da casa na chave `meta_pixel_id` do payload da própria página — fonte que
--     NOMEIA o número como id de pixel, não número solto em bundle.
--   · Quem o nomeia como "pixel_lancaster", do portfólio Lancaster e ligado à conta de anúncios SUZANO_OL,
--     é a medição do Marketing do Clearix de 05/11/2026, feita no Chrome do dono (sessoes/2026-11-05-marketing.md).
--   · NÃO foi conferido pela API da Meta, e isso fica escrito: os dois tokens da casa (META_TOKEN_OL, do
--     usuário de sistema "Publicador Lancaster", e META_TOKEN_DIGIAI_OSI) são de publicação e devolvem
--     "#100 Missing Permission" para leitura de pixel. Quem fecha essa conta é o Gerenciador de Eventos,
--     no navegador do dono, ou um token com ads_read — que a casa não tem hoje.
--
-- O QUE ESTA MIGRATION NÃO FAZ: não diz que o pixel está RECEBENDO evento. Pixel instalado atrás de
-- consentimento só dispara depois do aceite, e o último número conhecido de eventos é 0 (Marketing, 05/11).
-- "Instalado" e "coletando" são dois estados, e tratá-los como um foi erro meu antes.

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- PARTE 1 — a declaração ganha o número (e mantém o nome)

update ops.contas_servicos
   set identificador = '576159047194101',
       conta_dona = 'Portfólio Lancaster (nome do portfólio; id não conferido pela casa)',
       obs = 'Pixel "pixel_lancaster" (nome no Gerenciador de Eventos) = 576159047194101. '
          || 'Instalado na landing lojas.clearix.app.br/lancaster-suzano, ATRÁS DO CONSENTIMENTO: só dispara PageView depois do aceite. '
          || 'Ligado à conta de anúncios SUZANO_OL; 0 eventos na vida até 05/11/2026. '
          || 'Procedência: número lido no ar pelo medidor da casa em 06/11/2026 (chave meta_pixel_id da própria página); '
          || 'nome, portfólio e conta de anúncios pela medição do Marketing do Clearix em 05/11/2026, no Chrome do dono. '
          || 'NÃO conferido pela API da Meta: META_TOKEN_OL é token de publicação e devolve #100 Missing Permission para ler pixel. '
          || 'Antes desta linha o identificador era o texto "pixel_lancaster", e por isso a comparação declarado x no ar nunca rodou (migration 218). '
          || '1245855382929653 ("Happy Birthday Shirt") esteve no ar na mesma landing até 13:02 BRT de 05/11 e NÃO é do portfólio Lancaster — '
          || 'era pixel apenas compartilhado com a conta; foi o Marketing que trocou, e foi certo trocar.',
       updated_at = now()
 where servico = 'meta_pixel'
   and identificador = 'pixel_lancaster';

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- PARTE 2 — a comparação passa a valer para as landings

create or replace view public.v_ops_pixels
with (security_invoker = true) as
 with sites as (
         select digital_assets.rotulo,
            digital_assets.valor as url,
            digital_assets.owner_product,
            digital_assets.provider,
            digital_assets.mede_visitante,
            digital_assets.analytics_product
           from company.digital_assets
          where digital_assets.deleted_at is null and digital_assets.categoria = 'site'::text and digital_assets.status = 'ativo'::text
        ), ultima as (
         select distinct on (pixel_medicao.url) pixel_medicao.url,
            pixel_medicao.medido_em,
            pixel_medicao.http_code,
            pixel_medicao.meta_pixel_id,
            pixel_medicao.tiktok,
            pixel_medicao.ga_gtm,
            pixel_medicao.clarity,
            pixel_medicao.pagina_inexistente,
            pixel_medicao.fonte
           from ops.pixel_medicao
          order by pixel_medicao.url, pixel_medicao.medido_em desc
        ), propria as (
         select events_humanos.product,
            count(*) as n30,
            max(events_humanos.created_at) as ultimo
           from analytics.events_humanos
          where events_humanos.created_at > (now() - '30 days'::interval)
          group by events_humanos.product
        ), declarado as (
         select unnest(contas_servicos.produtos) as produto,
            contas_servicos.servico,
            contas_servicos.identificador
           from ops.contas_servicos
          where contas_servicos.ativo and (contas_servicos.servico = any (array['meta_pixel'::text, 'tiktok_pixel'::text]))
        ), fora as (
         select u.url,
            u.medido_em,
            u.http_code,
            u.meta_pixel_id,
            u.tiktok,
            u.ga_gtm,
            u.clarity,
            u.pagina_inexistente,
            u.fonte
           from ultima u
          where not (exists ( select 1
                   from company.digital_assets d
                  where d.deleted_at is null and d.categoria = 'site'::text and d.valor = u.url)) and u.medido_em >= ((( select max(pixel_medicao.medido_em) as max
                   from ops.pixel_medicao)) - '01:00:00'::interval)
        )
 select s.rotulo as site,
    s.url,
    s.owner_product as produto,
    s.provider,
    s.mede_visitante,
    u.medido_em,
    u.http_code,
    u.meta_pixel_id as meta_no_ar,
    u.tiktok as tiktok_no_ar,
    u.ga_gtm,
    u.clarity,
    coalesce(p.n30, 0::bigint)::integer as eventos_proprios_30d,
    p.ultimo as evento_proprio_em,
    ( select string_agg(d.identificador, ', '::text order by d.identificador) as string_agg
           from declarado d
          where d.produto = s.owner_product and d.servico = 'meta_pixel'::text and d.identificador ~ '^[0-9]{14,16}$'::text) as meta_declarado,
    ( select string_agg(d.identificador, ', '::text order by d.identificador) as string_agg
           from declarado d
          where d.produto = s.owner_product and d.servico = 'tiktok_pixel'::text) as tiktok_declarado,
        case
            when u.medido_em is null then 'nunca medido'::text
            when u.pagina_inexistente then 'rascunho · página não existe (soft-404)'::text
            when coalesce(u.http_code, 0) >= 400 then ('site fora do ar ('::text || u.http_code) || ')'::text
            when u.meta_pixel_id is not null and not (exists ( select 1
               from declarado d
              where d.produto = s.owner_product and d.servico = 'meta_pixel'::text and d.identificador = u.meta_pixel_id)) then 'pixel no ar que o inventário não conhece'::text
            when coalesce(p.n30, 0::bigint) > 0 and (u.meta_pixel_id is not null or u.tiktok) then 'medição própria + pixel'::text
            when coalesce(p.n30, 0::bigint) > 0 then 'mede por conta própria'::text
            when u.meta_pixel_id is not null or u.tiktok or u.ga_gtm is not null or u.clarity then 'só pixel de terceiro'::text
            when s.mede_visitante then 'vitrine cega — entra visitante e ninguém conta'::text
            else 'app com login · não mede visitante'::text
        end as veredito,
    coalesce(u.pagina_inexistente, false) as pagina_inexistente,
    u.fonte
   from sites s
     left join ultima u on u.url = s.url
     left join propria p on p.product = s.analytics_product
union all
 select coalesce(nullif(regexp_replace(f.url, '^https?://[^/]+/?'::text, ''::text), ''::text), regexp_replace(f.url, '^https?://([^/]+).*$'::text, '\1'::text)) as site,
    f.url,
        case
            when f.url ~~ '%clearix.app.br%'::text then 'clearix'::text
            else null::text
        end as produto,
    null::text as provider,
    f.url !~~ '%sitemap.xml'::text as mede_visitante,
    f.medido_em,
    f.http_code,
    f.meta_pixel_id as meta_no_ar,
    f.tiktok as tiktok_no_ar,
    f.ga_gtm,
    f.clarity,
    0 as eventos_proprios_30d,
    null::timestamp with time zone as evento_proprio_em,
    -- 218: aqui havia `null::text` FIXO, e por isso nenhuma landing era conferida.
    -- A landing não tem produto no inventário (ela é do eco; a casa confere, não é dona), então a
    -- comparação é pelo caminho inverso ao do primeiro lado do UNION: em vez de "o que se declara para
    -- este produto", pergunta-se "o número que está no ar é declarado em algum lugar, e para quem".
    -- O "para quem" vem junto DE PROPÓSITO: landing da Lancaster carregando pixel declarado para `mello`
    -- casaria como "declarado" e passaria por certo. Com o produto escrito ao lado, a pessoa vê
    -- `576159047194101 (lancaster)` e enxerga a troca de marca de relance — o que a coluna sozinha esconderia.
    ( select string_agg(distinct d.identificador || ' (' || d.produto || ')', ', '::text)
           from declarado d
          where d.servico = 'meta_pixel'::text and d.identificador = f.meta_pixel_id) as meta_declarado,
    null::text as tiktok_declarado,
        case
            when f.url ~~ '%sitemap.xml'::text then 'lista de landings não lida — retrato sem landing por falha, não por ausência'::text
            when f.pagina_inexistente then 'rascunho · página não existe (soft-404)'::text
            when coalesce(f.http_code, 0) >= 400 then ('landing fora do ar ('::text || f.http_code) || ')'::text
            -- Mesma frase do primeiro lado do UNION a propósito: "pixel no ar que o inventário não conhece"
            -- já é o alarme que a tela pinta de aviso, e dois nomes para o mesmo estado dividiriam a leitura.
            when f.meta_pixel_id is not null and not (exists ( select 1
               from declarado d
              where d.servico = 'meta_pixel'::text and d.identificador = f.meta_pixel_id)) then 'pixel no ar que o inventário não conhece'::text
            when f.meta_pixel_id is not null then 'landing com pixel declarado'::text
            when f.tiktok or f.ga_gtm is not null or f.clarity then 'só pixel de terceiro'::text
            else 'vitrine cega — entra visitante e ninguém conta'::text
        end as veredito,
    f.pagina_inexistente,
    f.fonte
   from fora f;

grant select on public.v_ops_pixels to authenticated;

-- ─────────────────────────────────────────────────────────────────────────────────────────────────────
-- PROVA 1 — a declaração da Lancaster tem número E nome, e o texto antigo não ficou para trás.
do $$
declare r record;
begin
  select identificador, obs into r from ops.contas_servicos
   where servico = 'meta_pixel' and 'lancaster' = any(produtos);
  if r is null then
    raise exception 'PROVA_218_FALHOU: nao existe declaracao de meta_pixel para lancaster';
  end if;
  if r.identificador <> '576159047194101' then
    raise exception 'PROVA_218_FALHOU: identificador da lancaster e % (esperado 576159047194101)', r.identificador;
  end if;
  if r.obs not like '%pixel_lancaster%' then
    raise exception 'PROVA_218_FALHOU: o nome do pixel nao ficou no obs — a decisao do dono era carregar nome E numero';
  end if;
end $$;

-- PROVA 2 — nenhuma declaração de meta_pixel ficou com identificador não numérico. Uma linha dessas é uma
-- comparação que não roda e não avisa; é exatamente o estado que esta migration existe para encerrar.
-- (tiktok_pixel fica de fora: id do TikTok é alfanumérico de verdade, ex. D8HQ7JJC77U8POE06IQG.)
do $$
declare n int; quais text;
begin
  select count(*), string_agg(identificador, ', ') into n, quais from ops.contas_servicos
   where ativo and servico = 'meta_pixel' and identificador !~ '^[0-9]{14,16}$';
  if n > 0 then
    raise exception 'PROVA_218_FALHOU: % declaracao(oes) de meta_pixel sem numero: %', n, quais;
  end if;
end $$;

-- PROVA 3 — a landing da Lancaster agora é CONFERIDA: o que está no ar aparece como declarado, com a marca
-- ao lado, e o veredito deixa de ser o genérico "landing com pixel no ar".
do $$
declare r record;
begin
  select meta_no_ar, meta_declarado, veredito into r from public.v_ops_pixels
   where url = 'https://lojas.clearix.app.br/lancaster-suzano';
  if r is null then
    raise exception 'PROVA_218_FALHOU: a landing da lancaster nao aparece na view (medicao de hoje nao entrou?)';
  end if;
  if r.meta_no_ar <> '576159047194101' then
    raise exception 'PROVA_218_FALHOU: no ar na landing esta % (esperado 576159047194101)', r.meta_no_ar;
  end if;
  if r.meta_declarado is null then
    raise exception 'PROVA_218_FALHOU: a comparacao continua nao rodando para a landing (meta_declarado nulo)';
  end if;
  if r.meta_declarado not like '%(lancaster)%' then
    raise exception 'PROVA_218_FALHOU: meta_declarado nao diz de que marca e o pixel (%)', r.meta_declarado;
  end if;
  if r.veredito <> 'landing com pixel declarado' then
    raise exception 'PROVA_218_FALHOU: veredito da landing e "%" (esperado "landing com pixel declarado")', r.veredito;
  end if;
end $$;

-- PROVA 4 — a PROVA 3 não passou de graça. Ela só vale se "declarado" for uma comparação de verdade, e não
-- um filtro que casa com qualquer número. Esta prova confere a premissa: o pixel que estava no ar ontem
-- (1245855382929653) NÃO é declarado em lugar nenhum da casa, logo cairia no veredito de alarme.
-- Limite honesto: ela testa a condição, não a view inteira rodando sobre uma landing com esse número —
-- para isso eu teria de escrever medição falsa na tabela, e inventar medição para provar medidor é o
-- avesso do que esta migration defende.
do $$
declare v text;
begin
  select case
           when exists (select 1 from ops.contas_servicos
                         where ativo and servico = 'meta_pixel' and identificador = '1245855382929653')
             then 'landing com pixel declarado' else 'pixel no ar que o inventário não conhece'
         end into v;
  if v <> 'pixel no ar que o inventário não conhece' then
    raise exception 'PROVA_218_FALHOU: 1245855382929653 aparece como declarado no inventario — ou a prova nao testa nada';
  end if;
end $$;
