-- 192 — o funil passa a contar gente, não clique repetido; e as duas views param de ter a regra escrita duas vezes
--
-- ✔ APLICADA em 06/10/2026 às 09:55:32 BRT, reensaiada antes — e o ensaio recusou **três** versões minhas:
--   a guarda do vão (eu afirmara 1→5 medindo só um produto), a expectativa da OSI (3, de simulação sem o
--   filtro de origem; já era 1) e o helper com a regra de produto como FILTRO, que apagava as visitas do
--   Clearix. Card do Clearix depois: visitas 211, **CTA 1, WhatsApp 1, demo 1**, zero nos 7 dias.
--
-- (Escrita como NÃO APLICADA.)
--
-- O QUE DERRUBOU A MINHA PRÓPRIA MANCHETE: eu disse ao dono e escrevi na pauta das dores que **67 pessoas
--   clicaram no WhatsApp do Clearix e só 1 pediu demo**, e concluí que o gargalo era *depois do clique*. O
--   Geral mediu e me corrigiu. Confirmei por mim:
--     · **66 dos 68 cliques são de 28/09, entre 04:40:20 e 04:52:30 BRT**, em **6 sessões**, sem UTM;
--     · as sessões humanas têm **1** clique cada; as automatizadas têm 4, 5, 5, 6, 6, 7, 9, 10, 18 e 20 — e
--       **nenhuma sessão no banco tem 2 ou 3**. O corte é limpo, com folga dos dois lados.
--       (Eu primeiro afirmei que o vão ia de 1 a 5, porque medi só o produto `clearix-site`. A guarda de
--       entrada desta migration me barrou: existe uma sessão com **4** cliques em `click_checkout`. O vão
--       real é 1 → 4, e o limiar de 3 continua certo — fica dentro do vão e pega a de 4, que é da mesma
--       rajada. A guarda passou a afirmar o que é verdade, e não o que eu supunha.)
--   Era verificação automatizada da landing na página publicada. O filtro de user-agent da events-ingest não
--   pega, porque o agente se apresenta como navegador normal.
--
--   **O gargalo não é depois do clique. É que quase ninguém clica.** Corrijo a resposta 3 em
--   `Cockpit/comercial/dores-2026-10/app-digiai.md` no mesmo turno.
--
-- POR QUE A REGRA NÃO PODE SER UM LIMIAR ÚNICO: `clearix_site_visit` tem uma sessão com **94** visitas, e
--   isso pode ser gente navegando; `loja_produto_visto` repete legitimamente (várias peças numa visita).
--   Vinte cliques no botão do WhatsApp, não. E o catálogo **não tinha** como distinguir os dois: `funnel_stage`
--   põe `loja_produto_visto` e `clearix_whatsapp_click` no mesmo "consideration".
--
-- ENTÃO A DISTINÇÃO VAI PARA O CATÁLOGO, não para um `where` dentro da view: coluna `unico_por_sessao`. Quem
--   cadastra o código declara se ele pode repetir numa sessão. Lista dentro de view envelhece calada; a do
--   catálogo o próximo código é obrigado a enfrentar. Mesma lição da 188 (`produtos_aceitos`).
--
-- A REGRA, em duas partes que ganham o lugar:
--   1. código `unico_por_sessao` **conta uma vez por sessão** — é a agregação correta para um clique, e não
--      precisa de número mágico;
--   2. sessão com **3 ou mais** eventos desse código é **automatizada** e não conta nada. Três cliques no
--      mesmo botão numa sessão não é gente; o 3 não é palpite, é o meio do vão entre 1 (humanos) e 5 (rajada).
--
-- ANTES → DEPOIS, medido (eventos → sessões de gente):
--   clearix-site · clearix_whatsapp_click    67 → **1**   (6 sessões descartadas)
--   clearix-site · click_checkout            14 → **1**   (2 descartadas)
--   clearix-site · clearix_cta_click         12 → **1**   (2 descartadas)
--   clearix-site · clearix_demo_solicitada    1 → **1**   (0)
--   osi · click_checkout                      3 → **3**   (0)  ← controle: a OSI não é tocada
--
--   O funil real da landing do Clearix passa a ser: ~205 sessões de visita → **1 clique em CTA, 1 no
--   WhatsApp, 1 em checkout, 1 demo**. Uma pessoa interessada na história toda.
--
-- E EU CORRIJO UM ERRO MEU DE 40 MINUTOS ATRÁS: a 190 pôs na `funnel_daily` a regex de preview **copiada da
--   129**, quando já existia `analytics.fn_origem_real(url, utm_campaign)`, usada pela `summary` e mais rica —
--   ela também exclui preview de DEPLOY (`<hash>--site.netlify.app`, `*.pages.dev`) e campanha `teste.`, e
--   descarta linha sem url. No cabeçalho da 190 eu escrevi que "reescrever de cabeça uma regra que já existe
--   é como se inventa divergência", e foi o que eu fiz. As duas views passam a usar o ajudante.
--   **Consequências declaradas, as duas medidas uma a uma:** saem da `daily` 2 visitas de
--   `clearix-site.pages.dev` (preview de deploy da landing, que a minha regex deixava passar) — as visitas
--   reais do Clearix vão de 99 para **97**; e a linha do leitor sem url sai da `daily` — ela já estava fora da `summary`
--   desde que o ajudante existe, e evento sem url não tem origem que se possa afirmar. A prova da 190 exigia
--   o contrário; esta troca é deliberada e não um efeito colateral.
--
-- UMA FONTE, NÃO DUAS: a regra do funil passa a viver em `analytics.eventos_de_funil`, e as duas views de
--   contrato só agregam. Não é abstração a mais — é o conserto do que causou a divergência de hoje: a mesma
--   regra estava escrita em dois lugares e os dois saíram de sincronia. A `summary` continua agrupando pelo
--   produto do CATÁLOGO e a `daily` pelo do LOG, então o helper carrega os dois.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='analytics' and table_name='events_catalog'
                and column_name='unico_por_sessao') then
    raise exception 'unico_por_sessao ja existe — a 192 ja foi aplicada?';
  end if;
  -- A PREMISSA DO CORTE: o limiar 3 so e honesto se nenhuma sessao tiver 2 ou 3 — e so entao ele separa
  -- "gente" de "robo" sem adivinhar. Esta guarda ja me barrou uma vez (eu afirmara o vao de 1 a 5 medindo
  -- apenas clearix-site, e existe uma sessao com 4). Se amanha aparecer sessao com 2 ou 3, o vao fechou e o
  -- numero precisa ser repensado em vez de reaplicado.
  if exists (
    select 1 from (
      select count(*) as n from analytics.events_log
       where event_code in ('clearix_whatsapp_click', 'clearix_cta_click', 'clearix_demo_solicitada',
             'click_checkout', 'click_brinde_calc', 'click_whatsapp_suporte', 'digiai_cta_click',
             'lead_capture_submit', 'loja_checkout', 'loja_lead', 'loja_newsletter', 'loja_compra',
             'purchase_approved', 'first_login_nexus')
       group by session_id, event_code) t
     where n in (2, 3)) then
    raise exception 'ja existe sessao com 2 ou 3 cliques — o vao fechou, repensar o limiar antes de aplicar';
  end if;
end $$;

alter table analytics.events_catalog
  add column unico_por_sessao boolean not null default false;

comment on column analytics.events_catalog.unico_por_sessao is
  '192: verdadeiro quando o evento NÃO pode repetir numa sessão de gente — clique num alvo único (WhatsApp, '
  'CTA, checkout, formulário). Falso para o que repete por natureza: visita de página, peça vista na loja, '
  'item no carrinho, uso da calculadora, gatilho do leitor. Para os verdadeiros, o funil conta uma vez por '
  'sessão e descarta sessão com 3+ (é robô). Quem cadastra código novo declara isto aqui, e não num where '
  'dentro de view — lista dentro de view envelhece calada.';

update analytics.events_catalog set unico_por_sessao = true
 where code in ('clearix_whatsapp_click', 'clearix_cta_click', 'clearix_demo_solicitada',
                'click_checkout', 'click_brinde_calc', 'click_whatsapp_suporte',
                'digiai_cta_click', 'lead_capture_submit',
                'loja_checkout', 'loja_lead', 'loja_newsletter', 'loja_compra',
                'purchase_approved', 'first_login_nexus');

-- a regra do funil, em um lugar só
create or replace view analytics.eventos_de_funil
  with (security_invoker = true) as
 with base as (
   select l.id,
          coalesce(l.session_id, l.id::text) as sessao,   -- sem sessão: cada linha é a sua, senão o
          l.occurred_at,                                  -- row_number() colapsaria linhas sem relação
          l.product        as produto_log,
          -- A regra de produto da 129 entra como COLUNA, não como filtro — e isso é o ponto delicado desta
          -- migration. Se o helper filtrasse por ela, rotear a `daily` por aqui apagaria as 99 visitas reais
          -- da landing do Clearix, que foi exatamente o que eu me recusei a fazer na 190 uma hora antes.
          -- Nula quando a família não casa: a `summary` junta por esta coluna e naturalmente as exclui (a
          -- regra da 129, preservada); a `daily` agrupa pelo produto do LOG e as mantém (a decisão da 190,
          -- preservada). Uma fonte, duas perguntas, sem nenhuma das duas cedendo.
          case when l.product is null
                 or l.product = c.product
                 or c.product like l.product || '-%'
               then c.product end as produto_catalogo,
          c.code           as event_code,
          c.funnel_stage,
          c.sort_order,
          c.unico_por_sessao,
          count(*)      over (partition by coalesce(l.session_id, l.id::text), c.code) as n_na_sessao,
          row_number()  over (partition by coalesce(l.session_id, l.id::text), c.code
                              order by l.occurred_at, l.id)                            as ordem_na_sessao
     from analytics.events_humanos l
     join analytics.events_catalog c
       on c.code = l.event_code
    where c.is_active
      and analytics.fn_origem_real(l.url, l.utm_campaign))
 select id, sessao, occurred_at, produto_log, produto_catalogo, event_code, funnel_stage, sort_order
   from base
  where not unico_por_sessao                                  -- repete por natureza: conta todos
     or (n_na_sessao < 3 and ordem_na_sessao = 1);             -- clique único: 1 por sessão, e não de robô

comment on view analytics.eventos_de_funil is
  '192: as linhas que o funil pode contar. Sai de events_humanos (sem robô 175, sem teste 178), passa por '
  'analytics.fn_origem_real (sem preview local nem de deploy, sem campanha teste.) e aplica unico_por_sessao: '
  'clique de alvo único conta 1 por sessão, e sessão com 3+ do mesmo clique é descartada (foi assim que 66 '
  'cliques automatizados de 28/09 contavam como demanda). Carrega produto do LOG e do CATÁLOGO porque a '
  'v_analytics_funnel_daily agrupa por um e a _summary pelo outro.';

grant select on analytics.eventos_de_funil to authenticated;

create or replace view public.v_analytics_funnel_summary
  with (security_invoker = true) as
 select c.product,
    c.code as event_code,
    c.funnel_stage,
    c.sort_order,
    count(e.id) filter (where e.occurred_at >= (now() - '7 days'::interval))  as n_7d,
    count(e.id) filter (where e.occurred_at >= (now() - '30 days'::interval)) as n_30d,
    count(e.id) as n_total,
    max(e.occurred_at) as last_at
   from analytics.events_catalog c
     left join analytics.eventos_de_funil e
       on e.event_code = c.code and e.produto_catalogo = c.product
  where c.is_active
  group by c.product, c.code, c.funnel_stage, c.sort_order;

comment on view public.v_analytics_funnel_summary is
  '192: funil por código, agrupado pelo produto do CATÁLOGO (a daily usa o do LOG). Para código '
  'unico_por_sessao, n_total/n_7d/n_30d contam SESSÕES, não eventos — é a conta certa para um clique, e foi '
  'o que fez 67 "cliques no WhatsApp" virarem 1 pessoa. Para os outros, contam eventos, como sempre. '
  'LEFT JOIN de propósito: código ativo sem evento aparece com 0 em vez de desaparecer da tela.';

create or replace view public.v_analytics_funnel_daily
  with (security_invoker = true) as
 select produto_log as product,
    event_code,
    (occurred_at at time zone 'America/Sao_Paulo')::date as day,
    count(*) as n
   from analytics.eventos_de_funil
  where occurred_at >= (now() - '90 days'::interval)
  group by produto_log, event_code, ((occurred_at at time zone 'America/Sao_Paulo')::date);

comment on view public.v_analytics_funnel_daily is
  '190/192: funil por dia (BRT), janela de 90 dias, agrupado pelo produto do LOG — é o que atribui a visita '
  'ao site onde ela aconteceu. Desde a 192 compartilha a regra com a _summary por analytics.eventos_de_funil, '
  'em vez de repetir o filtro: a 190 havia copiado a regex da 129 e ficou mais frouxa que a irmã, que já '
  'usava fn_origem_real.';

do $$
declare v_n int; v_desc int; v_opts text;
begin
  -- a) as duas views continuam invoker e legíveis
  for v_opts in
    select coalesce(array_to_string(c.reloptions, ','), 'NULO')
      from pg_class c join pg_namespace n on n.oid=c.relnamespace
     where (n.nspname='public' and c.relname in ('v_analytics_funnel_summary','v_analytics_funnel_daily'))
        or (n.nspname='analytics' and c.relname='eventos_de_funil')
  loop
    if v_opts not ilike '%security_invoker%' then
      raise exception 'PROVA_192_FALHOU: view sem invoker (%)', v_opts;
    end if;
  end loop;
  if not pg_catalog.has_table_privilege('authenticated','public.v_analytics_funnel_summary','select')
  or not pg_catalog.has_table_privilege('authenticated','public.v_analytics_funnel_daily','select')
  or not pg_catalog.has_table_privilege('authenticated','analytics.eventos_de_funil','select') then
    raise exception 'PROVA_192_FALHOU: perdi grant em alguma das tres';
  end if;

  -- b) O NÚMERO QUE MOTIVOU TUDO: o card do site do Clearix passa de 67 para 1
  select n_total into v_n from public.v_analytics_funnel_summary
   where product='clearix-site' and event_code='clearix_whatsapp_click';
  if v_n <> 1 then
    raise exception 'PROVA_192_FALHOU: whatsapp_click deu % e eu medi 1', v_n;
  end if;
  select n_total into v_n from public.v_analytics_funnel_summary
   where product='clearix-site' and event_code='clearix_cta_click';
  if v_n <> 1 then raise exception 'PROVA_192_FALHOU: cta_click deu % e eu medi 1', v_n; end if;

  -- c) CONTROLE POSITIVO (R-043 §4-A): não basta cair, tem de cair só o que é robô.
  --    c1) a OSI nao e tocada — click_checkout dela tem de continuar 1.
  --        (Eu havia escrito 3 aqui, de uma simulacao que NAO aplicava fn_origem_real; o valor real antes
  --        desta migration ja era 1. Foi este controle que me mostrou o erro, e ele fica como estava: se a
  --        OSI mudar, a migration cai.)
  select n_total into v_n from public.v_analytics_funnel_summary
   where product='osi' and event_code='click_checkout';
  if v_n <> 1 then
    raise exception 'PROVA_192_FALHOU: a OSI mudou (click_checkout %, esperava 1) — cortei dado legitimo', v_n;
  end if;
  --    c2) a demo real continua contando: se a regra a tivesse levado, eu teria apagado a unica conversao
  select n_total into v_n from public.v_analytics_funnel_summary
   where product='clearix-site' and event_code='clearix_demo_solicitada';
  if v_n <> 1 then
    raise exception 'PROVA_192_FALHOU: a demo real sumiu (%) — a regra comeu a conversao', v_n;
  end if;
  --    c3) visita NÃO é unico_por_sessao: a sessão com 94 visitas continua inteira
  select n_total into v_n from public.v_analytics_funnel_summary
   where product='clearix-site' and event_code='clearix_site_visit';
  if v_n < 200 then
    raise exception 'PROVA_192_FALHOU: a visita caiu para % — a regra pegou evento que repete por natureza', v_n;
  end if;
  --    c4) e código ativo sem evento continua aparecendo com 0, não desaparecendo
  if not exists (select 1 from public.v_analytics_funnel_summary
                  where product='osi' and event_code='purchase_approved' and n_total = 0) then
    raise exception 'PROVA_192_FALHOU: codigo sem evento desapareceu da tela em vez de mostrar 0';
  end if;

  -- d) CONTROLE QUE ME SALVOU: a daily tem de continuar com as 99 visitas da landing do Clearix sob
  --    `clearix-site`. A 1a versao deste helper usava a regra de produto como FILTRO, e elas desapareciam —
  --    o mesmo apagamento que eu recusei na 190. A regra virou COLUNA por causa deste teste.
  select sum(n)::int into v_n from public.v_analytics_funnel_daily
   where product='clearix-site' and event_code='landing_visit';
  --    Sao 97 e nao as 99 da 190: o ajudante tambem exclui preview de DEPLOY, e as 2 que saem agora sao de
  --    `clearix-site.pages.dev` — conferido uma a uma, nao estimado. Preview de deploy e agente conferindo.
  if coalesce(v_n, 0) <> 97 then
    raise exception 'PROVA_192_FALHOU: a daily ficou com % visitas do Clearix e eu medi 97 — apaguei historia real',
      coalesce(v_n, 0);
  end if;

  -- e) as sessões descartadas são as 6 da rajada de 28/09, e não outras
  select count(distinct session_id) into v_desc from analytics.events_log
   where event_code='clearix_whatsapp_click'
     and (occurred_at at time zone 'America/Sao_Paulo')::date = date '2026-09-28';
  if v_desc <> 6 then
    raise exception 'PROVA_192_FALHOU: esperava 6 sessoes em 28/09 e achei %', v_desc;
  end if;

  -- f) e authenticated consulta as tres sem erro de permissao
  set local role authenticated;
  perform count(*) from public.v_analytics_funnel_summary;
  perform count(*) from public.v_analytics_funnel_daily;
  perform count(*) from analytics.eventos_de_funil;
  reset role;
end $$;

commit;
