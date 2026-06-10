-- Schema analytics + catalog dos 5 eventos canônicos do funil OSI + log de eventos disparados.
-- Cross-ref: academy.product_checklist_items 'Mapear eventos minimos de analytics' (FluxoOSI FASE 0 item 3).
-- Eventos canônicos cobrem todo o funil: landing → checkout → compra → onboarding Nexus.

CREATE SCHEMA IF NOT EXISTS analytics;

CREATE TABLE IF NOT EXISTS analytics.events_catalog (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code            text NOT NULL UNIQUE,           -- ex: 'landing_visit', 'click_checkout'
  funnel_stage    text NOT NULL,                  -- ex: 'awareness', 'consideration', 'conversion', 'retention'
  description     text NOT NULL,
  meta_pixel_event   text,                        -- ex: 'PageView', 'AddToCart', 'InitiateCheckout', 'Purchase'
  tiktok_pixel_event text,                        -- ex: 'ViewContent', 'AddToCart', 'InitiateCheckout', 'CompletePayment'
  ga4_event       text,                           -- ex: 'page_view', 'add_to_cart', 'begin_checkout', 'purchase'
  product         text,                           -- ex: 'osi', 'clearix' (filtro multi-produto)
  is_active       boolean NOT NULL DEFAULT true,
  sort_order      integer NOT NULL DEFAULT 0,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE analytics.events_catalog IS
  'Catálogo canônico de eventos do funil (cross-product). Cada evento mapeia 1:N para Meta Pixel, TikTok Pixel e GA4. R-013 compatível: sem PII.';

CREATE TABLE IF NOT EXISTS analytics.events_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_code      text NOT NULL REFERENCES analytics.events_catalog(code) ON UPDATE CASCADE,
  product         text,                           -- preenchido pelo front (consistência com catalog)
  occurred_at     timestamptz NOT NULL DEFAULT now(),
  session_id      text,                           -- UUID anônimo (não PII)
  url             text,                           -- página onde evento foi disparado
  utm_source      text,
  utm_medium      text,
  utm_campaign    text,
  utm_content     text,
  utm_term        text,
  metadata        jsonb DEFAULT '{}'::jsonb,      -- contexto extra (revenue, currency etc)
  user_agent      text,                           -- truncado pra análise device, sem fingerprint
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE analytics.events_log IS
  'Log append-only de eventos disparados. R-013 compatível: session_id anônimo, sem email/CPF/IP guardado.';

CREATE INDEX IF NOT EXISTS idx_events_log_event_occurred
  ON analytics.events_log(event_code, occurred_at DESC);

CREATE INDEX IF NOT EXISTS idx_events_log_session
  ON analytics.events_log(session_id) WHERE session_id IS NOT NULL;

-- View pública (frontend pode ler agregado, pgRLS controla rows)
CREATE OR REPLACE VIEW public.v_analytics_events_catalog AS
  SELECT id, code, funnel_stage, description, meta_pixel_event, tiktok_pixel_event, ga4_event, product, is_active, sort_order
  FROM analytics.events_catalog
  WHERE is_active = true;

GRANT SELECT ON public.v_analytics_events_catalog TO anon, authenticated;

-- RPC pra logar eventos do front (SECURITY DEFINER pra escapar RLS)
CREATE OR REPLACE FUNCTION public.fn_log_event(
  p_event_code  text,
  p_product     text DEFAULT NULL,
  p_session_id  text DEFAULT NULL,
  p_url         text DEFAULT NULL,
  p_utm_source  text DEFAULT NULL,
  p_utm_medium  text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content text DEFAULT NULL,
  p_utm_term    text DEFAULT NULL,
  p_metadata    jsonb DEFAULT '{}'::jsonb,
  p_user_agent  text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = analytics, public
AS $$
DECLARE
  v_id uuid;
BEGIN
  INSERT INTO analytics.events_log
    (event_code, product, session_id, url, utm_source, utm_medium, utm_campaign, utm_content, utm_term, metadata, user_agent)
  VALUES
    (p_event_code, p_product, p_session_id, p_url, p_utm_source, p_utm_medium, p_utm_campaign, p_utm_content, p_utm_term,
     COALESCE(p_metadata, '{}'::jsonb), p_user_agent)
  RETURNING id INTO v_id;
  RETURN v_id;
END $$;

GRANT EXECUTE ON FUNCTION public.fn_log_event TO anon, authenticated;

-- Seed dos 5 eventos canônicos do funil OSI (alinhado plano-de-largada §8 + checklist analytics)
INSERT INTO analytics.events_catalog
  (code, funnel_stage, description, meta_pixel_event, tiktok_pixel_event, ga4_event, product, sort_order)
VALUES
  ('landing_visit',
   'awareness',
   'Visitante chegou na landing OSI (qualquer rota /). Disparado on mount via useEffect.',
   'PageView',
   'ViewContent',
   'page_view',
   'osi', 10),

  ('click_checkout',
   'consideration',
   'Visitante clicou no CTA "Quero o material" (qualquer botão que aponta pra Hotmart).',
   'AddToCart',
   'AddToCart',
   'add_to_cart',
   'osi', 20),

  ('checkout_started',
   'consideration',
   'Visitante chegou na página de checkout do Hotmart (detectado via referrer + URL Hotmart).',
   'InitiateCheckout',
   'InitiateCheckout',
   'begin_checkout',
   'osi', 30),

  ('purchase_approved',
   'conversion',
   'Compra aprovada (webhook Hotmart → hotmart_events_raw → este log). Dispara server-side pra evitar bloqueador adblock.',
   'Purchase',
   'CompletePayment',
   'purchase',
   'osi', 40),

  ('first_login_nexus',
   'retention',
   'Comprador fez primeiro login no Nexus (cross-DB via view). Marca ativação do produto.',
   'CompleteRegistration',
   'CompleteRegistration',
   'sign_up',
   'osi', 50)
ON CONFLICT (code) DO UPDATE
  SET funnel_stage = EXCLUDED.funnel_stage,
      description = EXCLUDED.description,
      meta_pixel_event = EXCLUDED.meta_pixel_event,
      tiktok_pixel_event = EXCLUDED.tiktok_pixel_event,
      ga4_event = EXCLUDED.ga4_event,
      updated_at = now();

-- Marca checklist como done
UPDATE academy.product_checklist_items
SET done = true,
    updated_at = now()
WHERE area = 'analytics'
  AND title ILIKE '%Mapear eventos minimos%'
  AND done = false;
