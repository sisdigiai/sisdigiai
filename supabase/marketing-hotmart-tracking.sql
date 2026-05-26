-- ============================================================
-- Marketing — Tracking Hotmart (vendas + atribuição UTM)
-- ============================================================
-- Recebe webhook do Hotmart, grava raw event (audit), parseia em
-- marketing.hotmart_sales, e atribui ao post via UTM.
--
-- Convenção UTM (gerada pelo PostDrawer):
--   utm_source   = 'osi' (sempre)
--   utm_medium   = platform (ex: 'instagram', 'tiktok')
--   utm_campaign = pillar_code (ex: 'dor', 'valor')
--   utm_content  = post:<calendar_post_id>
--   utm_term     = (opcional) variation/hook slug
-- ============================================================

-- ─── 1. Audit log: tudo que o Hotmart manda, na lata ───
CREATE TABLE IF NOT EXISTS marketing.hotmart_events_raw (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at     timestamptz NOT NULL DEFAULT now(),
  event_type      text,                -- 'PURCHASE_COMPLETE', 'PURCHASE_APPROVED', etc
  hotmart_id      text,                -- id no Hotmart (transaction)
  product_id      text,                -- ex: 'B105515825'
  signature_ok    boolean,             -- HOTTOK validou?
  signature_provided text,             -- valor recebido pra debug
  payload         jsonb NOT NULL,      -- corpo inteiro do webhook
  source_ip       text,
  processed       boolean DEFAULT false,
  process_error   text,
  processed_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_hotmart_raw_received ON marketing.hotmart_events_raw(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_hotmart_raw_unprocessed ON marketing.hotmart_events_raw(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_hotmart_raw_hotmart_id ON marketing.hotmart_events_raw(hotmart_id);

ALTER TABLE marketing.hotmart_events_raw ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hotmart_raw_staff_read ON marketing.hotmart_events_raw;
CREATE POLICY hotmart_raw_staff_read ON marketing.hotmart_events_raw
  FOR SELECT TO authenticated USING (public.is_staff());

-- ─── 2. Vendas parseadas (1 row por venda confirmada) ───
CREATE TABLE IF NOT EXISTS marketing.hotmart_sales (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  hotmart_transaction   text UNIQUE NOT NULL,
  product_id            text NOT NULL,
  product_name          text,
  status                text NOT NULL,            -- 'approved' | 'complete' | 'cancelled' | 'refunded' | 'chargeback'
  buyer_name            text,
  buyer_email           text,
  buyer_phone           text,
  buyer_doc             text,
  price_value_cents     int,
  price_currency        text DEFAULT 'BRL',
  commission_cents      int,
  affiliate_code        text,                      -- HOTMART_AFFILIATE_ID (se veio por afiliado)
  affiliate_name        text,
  payment_type          text,                      -- 'credit_card' | 'pix' | 'boleto' | etc
  installments          int,
  purchase_date         timestamptz,
  -- Atribuição
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,                      -- pillar_code
  utm_content           text,                      -- 'post:<uuid>'
  utm_term              text,
  attributed_post_id    uuid REFERENCES marketing.content_calendar(id) ON DELETE SET NULL,
  attributed_pillar_id  uuid REFERENCES marketing.content_pillars(id)  ON DELETE SET NULL,
  attribution_method    text,                      -- 'utm_content' | 'utm_campaign' | 'affiliate' | 'manual' | 'none'
  -- meta
  raw_event_id          uuid REFERENCES marketing.hotmart_events_raw(id) ON DELETE SET NULL,
  metadata              jsonb DEFAULT '{}'::jsonb,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_hotmart_sales_status ON marketing.hotmart_sales(status);
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_post   ON marketing.hotmart_sales(attributed_post_id) WHERE attributed_post_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_pillar ON marketing.hotmart_sales(attributed_pillar_id) WHERE attributed_pillar_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_affiliate ON marketing.hotmart_sales(affiliate_code) WHERE affiliate_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_date   ON marketing.hotmart_sales(purchase_date DESC);
CREATE INDEX IF NOT EXISTS idx_hotmart_sales_email  ON marketing.hotmart_sales(buyer_email);

ALTER TABLE marketing.hotmart_sales ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS hotmart_sales_staff_read ON marketing.hotmart_sales;
CREATE POLICY hotmart_sales_staff_read ON marketing.hotmart_sales
  FOR SELECT TO authenticated USING (public.is_staff());

-- ─── 3. UTMs por post (cache do que o PostDrawer gera) ───
ALTER TABLE marketing.content_calendar
  ADD COLUMN IF NOT EXISTS utm_slug text;  -- slug pra usar como utm_term (opcional, default vazio)

-- ─── 4. View: vendas atribuídas por post (pra UI) ───
CREATE OR REPLACE VIEW public.v_marketing_post_sales AS
SELECT
  cp.id                            AS post_id,
  cp.scheduled_date,
  cp.hook,
  cp.platform,
  cp.platforms,
  cp.pillar_id,
  p.code                           AS pillar_code,
  p.name                           AS pillar_name,
  p.color                          AS pillar_color,
  COUNT(s.id) FILTER (WHERE s.status IN ('approved','complete'))      AS sales_count,
  COALESCE(SUM(s.price_value_cents) FILTER (WHERE s.status IN ('approved','complete')), 0) AS revenue_cents,
  COALESCE(SUM(s.commission_cents) FILTER (WHERE s.status IN ('approved','complete')), 0) AS commission_cents,
  COUNT(s.id) FILTER (WHERE s.status = 'refunded')      AS refunds_count,
  COUNT(s.id) FILTER (WHERE s.status = 'chargeback')    AS chargebacks_count,
  COUNT(s.id) FILTER (WHERE s.affiliate_code IS NOT NULL) AS affiliate_sales_count
FROM marketing.content_calendar cp
LEFT JOIN marketing.content_pillars p ON p.id = cp.pillar_id
LEFT JOIN marketing.hotmart_sales s   ON s.attributed_post_id = cp.id
WHERE cp.deleted_at IS NULL
GROUP BY cp.id, cp.scheduled_date, cp.hook, cp.platform, cp.platforms, cp.pillar_id,
         p.code, p.name, p.color;

GRANT SELECT ON public.v_marketing_post_sales TO authenticated;

-- ─── 5. View: ranking de hooks/pilares (sub-aba Validação) ───
CREATE OR REPLACE VIEW public.v_marketing_validation_ranking AS
SELECT
  p.code                           AS pillar_code,
  p.name                           AS pillar_name,
  p.color                          AS pillar_color,
  COUNT(DISTINCT cp.id)            AS posts_count,
  COUNT(s.id) FILTER (WHERE s.status IN ('approved','complete')) AS sales_count,
  COALESCE(SUM(s.price_value_cents) FILTER (WHERE s.status IN ('approved','complete')), 0) AS revenue_cents,
  CASE
    WHEN COUNT(DISTINCT cp.id) > 0
    THEN ROUND(COUNT(s.id) FILTER (WHERE s.status IN ('approved','complete'))::numeric / COUNT(DISTINCT cp.id), 2)
    ELSE 0
  END AS sales_per_post
FROM marketing.content_pillars p
LEFT JOIN marketing.content_calendar cp ON cp.pillar_id = p.id AND cp.deleted_at IS NULL
LEFT JOIN marketing.hotmart_sales s     ON s.attributed_post_id = cp.id
WHERE p.is_active
GROUP BY p.id, p.code, p.name, p.color
ORDER BY revenue_cents DESC NULLS LAST;

GRANT SELECT ON public.v_marketing_validation_ranking TO authenticated;

-- ─── 6. RPC: atribuir venda a post via UTM (chamada pela Edge Function) ───
DROP FUNCTION IF EXISTS public.marketing_attribute_hotmart_sale(uuid);
CREATE OR REPLACE FUNCTION public.marketing_attribute_hotmart_sale(p_sale_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_sale       record;
  v_post_id    uuid;
  v_pillar_id  uuid;
  v_method     text;
  v_post_uuid_text text;
BEGIN
  SELECT * INTO v_sale FROM marketing.hotmart_sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'sale_not_found');
  END IF;

  -- 1. Tenta por utm_content = 'post:<uuid>'
  IF v_sale.utm_content IS NOT NULL AND v_sale.utm_content LIKE 'post:%' THEN
    v_post_uuid_text := substring(v_sale.utm_content FROM 6);
    BEGIN
      v_post_id := v_post_uuid_text::uuid;
      v_method  := 'utm_content';
    EXCEPTION WHEN OTHERS THEN
      v_post_id := NULL;
    END;
  END IF;

  -- 2. Fallback: por utm_campaign = pillar_code (atribui ao pilar, não ao post)
  IF v_post_id IS NULL AND v_sale.utm_campaign IS NOT NULL THEN
    SELECT id INTO v_pillar_id FROM marketing.content_pillars
    WHERE code = v_sale.utm_campaign AND is_active LIMIT 1;
    IF v_pillar_id IS NOT NULL THEN
      v_method := 'utm_campaign';
    END IF;
  END IF;

  -- Resolve pillar via post se ainda não setado
  IF v_post_id IS NOT NULL AND v_pillar_id IS NULL THEN
    SELECT pillar_id INTO v_pillar_id FROM marketing.content_calendar WHERE id = v_post_id;
  END IF;

  -- 3. Fallback: afiliado (não atribui post, mas marca como tracked)
  IF v_post_id IS NULL AND v_pillar_id IS NULL AND v_sale.affiliate_code IS NOT NULL THEN
    v_method := 'affiliate';
  END IF;

  IF v_method IS NULL THEN
    v_method := 'none';
  END IF;

  UPDATE marketing.hotmart_sales SET
    attributed_post_id   = v_post_id,
    attributed_pillar_id = v_pillar_id,
    attribution_method   = v_method,
    updated_at           = now()
  WHERE id = p_sale_id;

  RETURN jsonb_build_object(
    'sale_id',    p_sale_id,
    'post_id',    v_post_id,
    'pillar_id',  v_pillar_id,
    'method',     v_method
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_attribute_hotmart_sale TO authenticated, service_role;

-- ─── 7. RPC: ingere venda do Hotmart (chamada pela Edge Function) ───
-- Parseia payload Hotmart, grava em hotmart_sales, atribui via UTM.
DROP FUNCTION IF EXISTS public.marketing_ingest_hotmart_event(uuid);
CREATE OR REPLACE FUNCTION public.marketing_ingest_hotmart_event(p_raw_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_raw           record;
  v_payload       jsonb;
  v_data          jsonb;
  v_buyer         jsonb;
  v_product       jsonb;
  v_purchase      jsonb;
  v_affiliations  jsonb;
  v_commissions   jsonb;
  v_tracking      jsonb;
  v_sale_id       uuid;
  v_transaction   text;
  v_status        text;
BEGIN
  SELECT * INTO v_raw FROM marketing.hotmart_events_raw WHERE id = p_raw_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'raw_not_found');
  END IF;

  v_payload := v_raw.payload;
  v_data    := COALESCE(v_payload->'data', v_payload);
  v_buyer       := v_data->'buyer';
  v_product     := v_data->'product';
  v_purchase    := v_data->'purchase';
  v_affiliations := v_data->'affiliations';
  v_commissions := v_data->'commissions';
  v_tracking    := v_purchase->'tracking';

  v_transaction := COALESCE(v_purchase->>'transaction', v_data->>'transaction');
  IF v_transaction IS NULL THEN
    UPDATE marketing.hotmart_events_raw SET
      processed = true, process_error = 'no_transaction_id', processed_at = now()
    WHERE id = p_raw_id;
    RETURN jsonb_build_object('error', 'no_transaction_id');
  END IF;

  -- Map status Hotmart → nosso enum-like
  v_status := lower(COALESCE(v_purchase->>'status', v_raw.event_type, 'unknown'));
  v_status := CASE
    WHEN v_status IN ('approved', 'purchase_approved') THEN 'approved'
    WHEN v_status IN ('complete', 'completed', 'purchase_complete') THEN 'complete'
    WHEN v_status IN ('canceled', 'cancelled', 'purchase_canceled') THEN 'cancelled'
    WHEN v_status IN ('refunded', 'purchase_refunded') THEN 'refunded'
    WHEN v_status IN ('chargeback', 'purchase_chargeback') THEN 'chargeback'
    WHEN v_status IN ('billet_printed') THEN 'pending'
    ELSE v_status
  END;

  -- Upsert
  INSERT INTO marketing.hotmart_sales (
    hotmart_transaction, product_id, product_name, status,
    buyer_name, buyer_email, buyer_phone, buyer_doc,
    price_value_cents, price_currency,
    commission_cents, affiliate_code, affiliate_name,
    payment_type, installments, purchase_date,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    raw_event_id, metadata
  ) VALUES (
    v_transaction,
    COALESCE(v_product->>'id', v_raw.product_id, 'unknown'),
    v_product->>'name',
    v_status,
    v_buyer->>'name',
    lower(v_buyer->>'email'),
    v_buyer->>'phone',
    v_buyer->>'document',
    -- valor em centavos: Hotmart manda em float (BRL). Multiplica por 100.
    COALESCE(
      ((v_purchase->'price'->>'value')::numeric * 100)::int,
      ((v_data->'price'->>'value')::numeric * 100)::int,
      NULL
    ),
    COALESCE(v_purchase->'price'->>'currency_value', v_data->'price'->>'currency_value', 'BRL'),
    COALESCE(((v_commissions->0->>'value')::numeric * 100)::int, NULL),
    v_affiliations->0->>'code',
    v_affiliations->0->>'name',
    v_purchase->'payment'->>'type',
    (v_purchase->'payment'->>'installments_number')::int,
    COALESCE(
      (v_purchase->>'approved_date')::timestamptz,
      (v_purchase->>'order_date')::timestamptz,
      v_raw.received_at
    ),
    v_tracking->>'source',
    v_tracking->>'medium',
    v_tracking->>'campaign',
    v_tracking->>'content',
    v_tracking->>'term',
    p_raw_id,
    jsonb_build_object('parsed_at', now())
  )
  ON CONFLICT (hotmart_transaction) DO UPDATE SET
    status            = EXCLUDED.status,
    commission_cents  = COALESCE(EXCLUDED.commission_cents, marketing.hotmart_sales.commission_cents),
    updated_at        = now()
  RETURNING id INTO v_sale_id;

  -- Atribui
  PERFORM public.marketing_attribute_hotmart_sale(v_sale_id);

  -- Marca raw como processado
  UPDATE marketing.hotmart_events_raw SET
    processed = true, processed_at = now(), process_error = NULL
  WHERE id = p_raw_id;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'transaction', v_transaction, 'status', v_status);

EXCEPTION WHEN OTHERS THEN
  UPDATE marketing.hotmart_events_raw SET
    processed = true, process_error = SQLERRM, processed_at = now()
  WHERE id = p_raw_id;
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_ingest_hotmart_event TO authenticated, service_role;

-- ─── 8. RPC: reprocessar evento raw (debug / replay) ───
DROP FUNCTION IF EXISTS public.marketing_reprocess_hotmart_event(uuid);
CREATE OR REPLACE FUNCTION public.marketing_reprocess_hotmart_event(p_raw_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  RETURN public.marketing_ingest_hotmart_event(p_raw_id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_reprocess_hotmart_event TO authenticated, service_role;

-- ─── 9. View geral de stats (dashboard topo da aba Validação) ───
CREATE OR REPLACE VIEW public.v_marketing_hotmart_stats AS
SELECT
  COUNT(*) FILTER (WHERE status IN ('approved','complete')) AS sales_total,
  COALESCE(SUM(price_value_cents) FILTER (WHERE status IN ('approved','complete')), 0) AS revenue_cents_total,
  COUNT(*) FILTER (WHERE status = 'refunded') AS refunds_total,
  COUNT(*) FILTER (WHERE status = 'chargeback') AS chargebacks_total,
  COUNT(*) FILTER (WHERE status IN ('approved','complete') AND attributed_post_id IS NOT NULL) AS attributed_sales,
  COUNT(*) FILTER (WHERE status IN ('approved','complete') AND attributed_post_id IS NULL AND attribution_method = 'affiliate') AS affiliate_only_sales,
  COUNT(*) FILTER (WHERE status IN ('approved','complete') AND attribution_method = 'none') AS unattributed_sales,
  COUNT(*) FILTER (WHERE status IN ('approved','complete') AND affiliate_code IS NOT NULL) AS affiliate_sales,
  COUNT(DISTINCT affiliate_code) FILTER (WHERE affiliate_code IS NOT NULL) AS unique_affiliates,
  COUNT(DISTINCT buyer_email) AS unique_buyers,
  MAX(purchase_date) FILTER (WHERE status IN ('approved','complete')) AS last_sale_at
FROM marketing.hotmart_sales;

GRANT SELECT ON public.v_marketing_hotmart_stats TO authenticated;

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificação rápida (rode após aplicar):
-- SELECT * FROM public.v_marketing_hotmart_stats;
-- SELECT * FROM public.v_marketing_validation_ranking;
-- ============================================================
