-- 124 — os gatilhos do leitor OSI entram no catálogo de eventos
--
-- ⚠ NÃO APLICADA. Aditiva: 2 linhas em analytics.events_catalog, nenhuma escrita em
--    events_log. Pedido do Orquestrador Geral (14/09/2026) para o desenho aprovado
--    `otica_sem_improviso/_DESENHO_2026-09-14_GATILHOS_LEITOR.md`.
--
-- ORDEM: aplicar ANTES do deploy da edge `events-ingest` que aceita os códigos novos.
--   analytics.events_log.event_code tem FK para analytics.events_catalog(code). Com a
--   edge nova e sem estas linhas, o POST passa no filtro, o insert falha na FK, e a
--   edge responde `ok: true` com o erro escondido em `errors` — o leitor acharia que
--   mediu e não mediu nada.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE product = 'osi-leitor', e não 'osi'
-- ═══════════════════════════════════════════════════════════════════════════
-- O card "Funil de conversão · first-party" do FluxoOSI lê
-- v_analytics_funnel_summary com product = 'osi' e mostra "N eventos" somando TODAS
-- as linhas desse produto, com o texto "Eventos reais da landing OSI". A view agrupa
-- pelo product do CATÁLOGO. Com 'osi', cada visualização de gatilho dentro do leitor
-- (quem já comprou) inflaria o total de eventos da landing. Com 'osi-leitor' ficam
-- fora do card da landing — como a Calc ficou com 'clearix-calc' (048). O leitor
-- pode mandar product 'osi' no payload: isso vai para events_log.product e não muda
-- em que card o evento aparece.
--
-- Pixels (meta/tiktok/ga4) ficam nulos de propósito: o leitor não dispara pixel, e
-- estas colunas descrevem o mapeamento para pixel.

begin;

do $$
declare n int;
begin
  select count(*) into n from analytics.events_catalog
   where code in ('reader_gatilho_view', 'reader_gatilho_click');
  if n > 0 then
    raise exception '% código(s) do leitor já estão no catálogo — a 124 já foi aplicada?', n;
  end if;

  select count(*) into n from pg_constraint
   where conrelid = 'analytics.events_log'::regclass and conname = 'events_log_event_code_fkey';
  if n <> 1 then
    raise exception 'A FK events_log → events_catalog não é a medida em 14/09; a ordem desta migration pode já não importar — medir.';
  end if;
end $$;

insert into analytics.events_catalog
  (code, funnel_stage, description, meta_pixel_event, tiktok_pixel_event, ga4_event, product, sort_order)
values
  ('reader_gatilho_view', 'retention',
   'Gatilho do leitor OSI apareceu na tela para o leitor (comprador). utm_content = id do gatilho (g1…g4, e1, e2), validado na edge events-ingest. Keyless first-party, zero PII (R-013/ADR-0036). Migration 124.',
   null, null, null, 'osi-leitor', 70),
  ('reader_gatilho_click', 'retention',
   'Leitor clicou num gatilho do leitor OSI (destino nexus / clearix_calc / clearix / venda_osi, na utm_campaign). utm_content = id do gatilho (g1…g4, e1, e2). Keyless first-party, zero PII. Migration 124.',
   null, null, null, 'osi-leitor', 80);

do $$
declare n int;
begin
  select count(*) into n from public.v_analytics_funnel_summary
   where product = 'osi-leitor' and event_code in ('reader_gatilho_view', 'reader_gatilho_click');
  if n <> 2 then
    raise exception 'Os 2 códigos não aparecem em v_analytics_funnel_summary como osi-leitor (encontrei %).', n;
  end if;

  -- o card da landing não ganhou linha
  select count(*) into n from public.v_analytics_funnel_summary
   where product = 'osi' and event_code like 'reader_%';
  if n > 0 then
    raise exception 'Código do leitor caiu no produto osi — inflaria o total de eventos da landing.';
  end if;

  select count(*) into n from analytics.events_catalog
   where code like 'reader_gatilho_%' and description like '%' || chr(65533) || '%';
  if n > 0 then raise exception 'U+FFFD na descrição.'; end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS (depois da 124 E do deploy da edge)
-- ═══════════════════════════════════════════════════════════════════════════
--   a) POST {events:[{event_code:'reader_gatilho_click', utm_content:'g1',
--      session_id:'prova-124', product:'osi'}]} → ok, inserted 1, errors [];
--   b) POST com event_code inventado → errors ['bad_code:…'], inserted 0;
--   c) POST reader_gatilho_click sem gatilho, ou com gatilho fora do desenho →
--      errors ['bad_gatilho:…'], inserted 0;
--   d) a linha da prova (a) existe com utm_content 'g1'. É uma linha de teste num log
--      real: sai por delete com session_id = 'prova-124', que é do dono decidir.
