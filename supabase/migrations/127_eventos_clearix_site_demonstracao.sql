-- 127 — eventos da landing clearix.app.br no catálogo (visita e pedido de demonstração)
--
-- ⚠ NÃO APLICADA. Nomes PROPOSTOS ao orquestrador do eco Clearix em 15/09/2026 (despacho
--    Cockpit/comercial/_DESPACHO_2026-09-15_RECEBER_INTERESSADOS.md §3.1) — aplicar só depois do
--    "aceito" dele e com a palavra do dono. Aditiva: 2 linhas em analytics.events_catalog.
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
  select count(*) into n from analytics.events_catalog where code in ('clearix_site_visit', 'clearix_demo_solicitada');
  if n > 0 then raise exception '% código(s) clearix-site já no catálogo — a 127 já foi aplicada?', n; end if;

  select count(*) into n from pg_constraint
   where conrelid = 'analytics.events_log'::regclass and conname = 'events_log_event_code_fkey';
  if n <> 1 then raise exception 'A FK events_log → events_catalog não é a medida.'; end if;
end $$;

insert into analytics.events_catalog
  (code, funnel_stage, description, meta_pixel_event, tiktok_pixel_event, ga4_event, product, sort_order)
values
  ('clearix_site_visit', 'awareness',
   'Visitante chegou na landing clearix.app.br (1x por carregamento). utm_campaign = variante do A/B, utm_content = lead_id quando veio do link da prospecção. Keyless first-party, zero PII. Migration 127.',
   null, null, null, 'clearix-site', 90),
  ('clearix_demo_solicitada', 'consideration',
   'Formulário "Agendar 20 minutos de demonstração" ENVIADO com sucesso (não o clique). Mesmos UTM. O pedido em si (contato) vai por outro caminho e cria/atualiza o lead. Migration 127.',
   null, null, null, 'clearix-site', 100);

do $$
declare n int;
begin
  select count(*) into n from public.v_analytics_funnel_summary
   where product = 'clearix-site' and event_code in ('clearix_site_visit', 'clearix_demo_solicitada');
  if n <> 2 then raise exception 'Os 2 códigos não aparecem em v_analytics_funnel_summary (achei %).', n; end if;

  select count(*) into n from public.v_analytics_funnel_summary where product in ('osi', 'clearix-calc', 'osi-leitor') and event_code like 'clearix_site%';
  if n > 0 then raise exception 'Código do site caiu em outro produto.'; end if;

  select count(*) into n from analytics.events_catalog where product = 'clearix-site' and description like '%' || chr(65533) || '%';
  if n > 0 then raise exception 'U+FFFD na descrição.'; end if;
end $$;

commit;

-- PROVAS (depois da 127 E do deploy da events-ingest)
--   a) POST clearix_demo_solicitada com utm_content = um uuid → ok, inserted 1;
--   b) POST clearix_site_visit com utm_content que não é uuid → grava com utm_content nulo
--      (a edge não guarda texto livre nesse campo para eventos do site);
--   c) código inventado → bad_code.
