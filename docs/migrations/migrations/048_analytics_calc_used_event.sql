-- Habilita o evento `calc_used` no catálogo de analytics do funil.
-- Origem: Clearix Calc (app clearix_calc) — isca pública/PWA que dispara telemetria
-- first-party keyless na edge events-ingest (ADR-0036/ADR-0041), item C7 do funil.
-- Sem `calc_used` no catálogo, a FK analytics.events_log.event_code rejeita o insert.
-- Aditivo e idempotente — não altera os 5 eventos canônicos do OSI.

INSERT INTO analytics.events_catalog
  (code, funnel_stage, description, meta_pixel_event, tiktok_pixel_event, ga4_event, product, sort_order)
VALUES
  ('calc_used',
   'awareness',
   'Ótica usou uma calculadora da Clearix Calc (isca). Disparado quando um resultado válido aparece. metadata: { calc_slug, calc_label }. Keyless first-party via events-ingest.',
   'ViewContent',
   'ViewContent',
   'select_content',
   'clearix-calc', 60)
ON CONFLICT (code) DO UPDATE
  SET funnel_stage = EXCLUDED.funnel_stage,
      description  = EXCLUDED.description,
      product      = EXCLUDED.product,
      updated_at   = now();
