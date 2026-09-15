-- 127 — eventos da landing clearix.app.br no catálogo (visita e pedido de demonstração)
--
-- ⚠ NÃO APLICADA. Nomes ACEITOS pelo orquestrador do eco Clearix em 15/09/2026, com dois eventos
--    acrescentados por ele (whatsapp_click e cta_click; despacho
--    Cockpit/comercial/_DESPACHO_2026-09-15_RECEBER_INTERESSADOS.md §3.1). Aplicar com a palavra do
--    dono. Aditiva: 4 linhas em analytics.events_catalog. A branch da landing já emite os 4 e deixa
--    de mandar landing_visit/click_checkout — por isso a 127 tem de subir com os 4, ou o cta_click
--    é recusado.
--    (O Agent da landing propôs prospect_link_open/demo_request_submit; o eco decidiu por estes.)
--
-- ⚠ ACHADO, medido em 15/09: o site do Clearix manda HOJE `landing_visit` (134) e `click_checkout`
--    (13) com product 'clearix-site' no payload. No catálogo esses códigos são product 'osi', e
--    v_analytics_funnel_summary agrupa pelo produto do CATÁLOGO: o card "Funil de conversão ·
--    first-party" da tela OSI soma as visitas do site do Clearix como se fossem da landing da OSI.
--    Com a troca para clearix_site_visit o erro para daqui em diante; as 147 linhas antigas ficam
--    (dado real) — a leitura do card OSI precisa filtrar events_log.product (outro portão).
--
-- ORDEM: 127 ANTES do deploy da events-ingest do mesmo commit (a FK de events_log recusa código
--   fora do catálogo, e a edge responde ok:true com o erro em `errors` — lição da 124).
--
-- product = 'clearix-site' (não 'clearix'): o card de funil do FluxoOSI filtra por product; o
-- site é um produto de catálogo à parte, como 'clearix-calc' (048) e 'osi-leitor' (124).
--
-- Contrato do link (despacho §1): utm_campaign = variante '<oferta>.<template_id>.<versao>',
-- utm_content = lead_id. Sem PII no evento: o pedido de demonstração (nome/telefone) é outro
-- caminho, que cria/atualiza o lead em ops.commercial_leads.

begin;

do $$
declare n int;
begin
  select count(*) into n from analytics.events_catalog where code in ('clearix_site_visit', 'clearix_demo_solicitada', 'clearix_whatsapp_click', 'clearix_cta_click');
  if n > 0 then raise exception '% código(s) clearix-site já no catálogo — a 127 já foi aplicada?', n; end if;

  select count(*) into n from pg_constraint
   where conrelid = 'analytics.events_log'::regclass and conname = 'events_log_event_code_fkey';
  if n <> 1 then raise exception 'A FK events_log → events_catalog não é a medida.'; end if;
end $$;

insert into analytics.events_catalog
  (code, funnel_stage, description, meta_pixel_event, tiktok_pixel_event, ga4_event, product, sort_order)
values
  ('clearix_site_visit', 'awareness',
   'Página vista na landing clearix.app.br (1 por troca de caminho: o site usa ClientRouter). utm_campaign = variante do A/B, utm_content = lead_id quando veio do link da prospecção. Keyless first-party, zero PII. Migration 127.',
   null, null, null, 'clearix-site', 90),
  ('clearix_demo_solicitada', 'consideration',
   'Formulário "Agendar 20 minutos de demonstração" ENVIADO com sucesso (depois do ok do lead-capture, não o clique). Mesmos UTM. metadata {destino, cta_id, texto, lojas, funcao, prospeccao, lead_id_desconhecido} — sem nome/telefone/e-mail. O pedido em si vai pelo lead-capture e se liga ao lead (128). Migration 127.',
   null, null, null, 'clearix-site', 100),
  ('clearix_whatsapp_click', 'consideration',
   'Clique no link/botão de WhatsApp da landing clearix.app.br (caminho de conversão; botão hoje desligado por D2 até o dono definir o número). Mesmos UTM, zero PII. Migration 127.',
   null, null, null, 'clearix-site', 95),
  ('clearix_cta_click', 'consideration',
   'Clique num CTA interno da landing (hero, oferta, faq, final, faixa do topo, Hub, calculadora). metadata {destino, cta_id, texto}, sem PII. Substitui o click_checkout que o site mandava com product clearix-site. Migration 127.',
   null, null, null, 'clearix-site', 92);

do $$
declare n int;
begin
  select count(*) into n from public.v_analytics_funnel_summary
   where product = 'clearix-site' and event_code in ('clearix_site_visit', 'clearix_demo_solicitada', 'clearix_whatsapp_click', 'clearix_cta_click');
  if n <> 4 then raise exception 'Os 4 códigos não aparecem em v_analytics_funnel_summary (achei %).', n; end if;

  select count(*) into n from public.v_analytics_funnel_summary where product in ('osi', 'clearix-calc', 'osi-leitor') and event_code like 'clearix\_%';
  if n > 0 then raise exception 'Código do site caiu em outro produto.'; end if;

  select count(*) into n from analytics.events_catalog where product = 'clearix-site' and description like '%' || chr(65533) || '%';
  if n > 0 then raise exception 'U+FFFD na descrição.'; end if;
end $$;

commit;

-- PROVAS (depois da 127 E do deploy da events-ingest)
--   0) POST com url http://localhost:... → errors ['origem_local'], inserted 0 (qualquer código);
--   a) POST clearix_demo_solicitada com utm_content = um uuid → ok, inserted 1;
--   b) POST clearix_site_visit com utm_content que não é uuid → grava com utm_content nulo
--      (a edge não guarda texto livre nesse campo para eventos do site);
--   c) código inventado → bad_code;
--   d) clearix_cta_click com metadata {destino, cta_id, texto} → ok, inserted 1.
