-- 173 — os sete eventos da loja Mello no catálogo, e o buraco do workers.dev fechado
--
-- ✔ APLICADA em 05/10/2026 às 15:30:25 BRT, reensaiada antes; edge `events-ingest` redeployada na mesma leva.
--   PROVA NA BORDA, com chamada real: evento de `mellooticas.com.br` → {"inserted":1}; o MESMO evento vindo de
--   `abc123-mello-ecommerce.sisdigiai.workers.dev` → {"inserted":0,"errors":["origem_preview"]}. As duas
--   linhas de prova foram apagadas.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: o dono aprovou a medição própria (sem cookie) na loja; o agente do Ecommerce confirmou os
--   códigos e o produto `mello-loja` em 05/10. A loja grava no banco do digiai, como todo site da casa —
--   "resultado sempre no digiai" (dono, 15/09) e ADR-0001 (o banco do Clearix fica isolado).
--
-- OS DOIS LADOS NA MESMA LEVA: código de evento precisa existir aqui (chave estrangeira do events_log) **e**
--   na allowlist dentro da edge `events-ingest`. Faltando um, a borda recusa calado e o site sobe medindo
--   nada — foi o que quase aconteceu com o site institucional em 28/09. Esta migration e o deploy da edge
--   andam juntos; a prova no fim exige os dois.
--
-- O BURACO DO WORKERS.DEV: a edge já recusava `localhost`, preview da Netlify e `*.pages.dev` para não contar
--   agente conferindo deploy como visitante. A loja migrou para Cloudflare Worker em 02/10 e as prévias dela
--   vivem em `<hash>-mello-ecommerce.sisdigiai.workers.dev` — que passava. Entra na mesma recusa. Produção é
--   `mellooticas.com.br`, então nada de real se perde.
--
-- METADATA COMBINADA, sem PII: `loja_compra` leva {valor_centavos, moeda}; `loja_produto_visto` e
--   `loja_carrinho` levam {sku}. Nenhum identifica pessoa.
--
-- O `analytics_product` do ativo também entra: sem ele a tela de pixels não sabe que os eventos da loja são
--   da loja, e o e-commerce continuaria aparecendo como "só pixel de terceiro" mesmo medindo.

begin;

do $$
begin
  if exists (select 1 from analytics.events_catalog where product = 'mello-loja') then
    raise exception 'os eventos da loja ja existem — a 173 ja foi aplicada?';
  end if;
end $$;

insert into analytics.events_catalog (code, funnel_stage, description, product, sort_order, meta_pixel_event, ga4_event)
values
  ('loja_visit',          'awareness',    'Visita a qualquer página da loja, com utm_* da origem.',            'mello-loja', 10, 'PageView',          'page_view'),
  ('loja_produto_visto',  'consideration','Página de produto aberta; metadata.sku diz qual.',                   'mello-loja', 20, 'ViewContent',       'view_item'),
  ('loja_carrinho',       'consideration','Produto adicionado ao carrinho; metadata.sku diz qual.',             'mello-loja', 30, 'AddToCart',         'add_to_cart'),
  ('loja_checkout',       'consideration','Checkout iniciado.',                                                 'mello-loja', 40, 'InitiateCheckout',  'begin_checkout'),
  ('loja_lead',           'consideration','Formulário de contato enviado na loja.',                             'mello-loja', 50, 'Lead',              'generate_lead'),
  ('loja_newsletter',     'consideration','Cadastro na newsletter (é o que gera o cupom de 10%).',              'mello-loja', 60, 'Subscribe',         'sign_up'),
  ('loja_compra',         'conversion',   'Compra concluída; metadata {valor_centavos, moeda}. Sem PII.',       'mello-loja', 70, 'Purchase',          'purchase');

update company.digital_assets
   set analytics_product = 'mello-loja', updated_at = now()
 where deleted_at is null and valor = 'https://mellooticas.com.br';

do $$
declare v_n int;
begin
  select count(*) into v_n from analytics.events_catalog where product = 'mello-loja' and is_active;
  if v_n <> 7 then raise exception 'PROVA_173_FALHOU: % codigos, esperava 7', v_n; end if;

  if (select analytics_product from company.digital_assets
       where deleted_at is null and valor = 'https://mellooticas.com.br') <> 'mello-loja' then
    raise exception 'PROVA_173_FALHOU: o ativo nao aponta para o produto de analytics';
  end if;

  -- a view de pixels tem de continuar enxergando a loja, agora com caminho para a medição própria
  if not exists (select 1 from public.v_ops_pixels
                  where url = 'https://mellooticas.com.br' and meta_no_ar = '1897105824592837') then
    raise exception 'PROVA_173_FALHOU: a loja sumiu da tela de pixels';
  end if;

  -- nenhum código novo pode colidir com os que já existem (a allowlist da edge é lista única)
  if (select count(*) from analytics.events_catalog group by code having count(*) > 1 limit 1) is not null then
    raise exception 'PROVA_173_FALHOU: codigo repetido no catalogo';
  end if;
end $$;

commit;
