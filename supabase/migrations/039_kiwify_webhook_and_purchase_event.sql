-- ============================================================
-- 039 — Webhook Kiwify (vendas) + evento purchase_approved no funil
-- ============================================================
-- 1. marketing.hotmart_sales ganha coluna platform ('hotmart'|'kiwify')
--    → Kiwify entra no MESMO pipeline de stats/atribuição (views já existentes
--      v_marketing_hotmart_stats / v_marketing_post_sales cobrem as duas).
-- 2. marketing.kiwify_events_raw — audit log espelhando hotmart_events_raw.
-- 3. RPC marketing_ingest_kiwify_event — parseia payload Kiwify e upserta.
-- 4. Ingest (Hotmart E Kiwify) agora loga purchase_approved em
--    analytics.events_log via fn_log_event — o estágio de conversão do funil
--    era seed-only e nunca recebia eventos (gap detectado 2026-06-09).
--
-- Payload Kiwify (webhook v1): order_id, webhook_event_type, order_status,
-- Product{product_id,product_name}, Customer{full_name,email,mobile,CPF},
-- Commissions{charge_amount(centavos),my_commission(centavos)},
-- TrackingParameters{utm_*}, payment_method, installments, approved_date.
-- Assinatura: ?signature=<hex> = HMAC-SHA1(body, token) — validada na edge fn.
-- ============================================================

-- ─── 1. Plataforma na tabela de vendas ───
ALTER TABLE marketing.hotmart_sales
  ADD COLUMN IF NOT EXISTS platform text NOT NULL DEFAULT 'hotmart';

COMMENT ON COLUMN marketing.hotmart_sales.platform IS
  'Marketplace de origem: hotmart | kiwify. Tabela mantém o nome legado; é a tabela canônica de vendas de infoproduto.';

-- ─── 2. Audit log Kiwify ───
CREATE TABLE IF NOT EXISTS marketing.kiwify_events_raw (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  received_at        timestamptz NOT NULL DEFAULT now(),
  event_type         text,                -- webhook_event_type: 'order_approved', 'order_refunded', etc
  kiwify_order_id    text,
  product_id         text,
  signature_ok       boolean,
  signature_provided text,
  payload            jsonb NOT NULL,
  source_ip          text,
  processed          boolean DEFAULT false,
  process_error      text,
  processed_at       timestamptz
);

CREATE INDEX IF NOT EXISTS idx_kiwify_raw_received    ON marketing.kiwify_events_raw(received_at DESC);
CREATE INDEX IF NOT EXISTS idx_kiwify_raw_unprocessed ON marketing.kiwify_events_raw(processed) WHERE processed = false;
CREATE INDEX IF NOT EXISTS idx_kiwify_raw_order       ON marketing.kiwify_events_raw(kiwify_order_id);

ALTER TABLE marketing.kiwify_events_raw ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS kiwify_raw_staff_read ON marketing.kiwify_events_raw;
CREATE POLICY kiwify_raw_staff_read ON marketing.kiwify_events_raw
  FOR SELECT TO authenticated USING (public.is_staff());

-- ─── 3. Helper: loga purchase_approved no funil (1x por transação) ───
CREATE OR REPLACE FUNCTION public.marketing_log_purchase_event(
  p_transaction text, p_platform text, p_value_cents int,
  p_utm_source text, p_utm_medium text, p_utm_campaign text,
  p_utm_content text, p_utm_term text
) RETURNS void
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, analytics
AS $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM analytics.events_log
    WHERE event_code = 'purchase_approved'
      AND metadata->>'transaction' = p_transaction
  ) THEN
    RETURN;
  END IF;
  PERFORM public.fn_log_event(
    p_event_code   => 'purchase_approved',
    p_product      => 'osi',
    p_session_id   => NULL,
    p_url          => NULL,
    p_utm_source   => p_utm_source,
    p_utm_medium   => p_utm_medium,
    p_utm_campaign => p_utm_campaign,
    p_utm_content  => p_utm_content,
    p_utm_term     => p_utm_term,
    p_metadata     => jsonb_build_object(
      'transaction', p_transaction,
      'platform', p_platform,
      'value_cents', p_value_cents
    ),
    p_user_agent   => 'server-side/webhook'
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marketing_log_purchase_event(text,text,int,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.marketing_log_purchase_event(text,text,int,text,text,text,text,text) TO service_role;

-- ─── 4. RPC: ingere venda da Kiwify (chamada pela edge fn kiwify-webhook) ───
CREATE OR REPLACE FUNCTION public.marketing_ingest_kiwify_event(p_raw_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_raw         record;
  v_payload     jsonb;
  v_customer    jsonb;
  v_product     jsonb;
  v_commissions jsonb;
  v_tracking    jsonb;
  v_sale_id     uuid;
  v_order_id    text;
  v_status      text;
  v_value_cents int;
BEGIN
  SELECT * INTO v_raw FROM marketing.kiwify_events_raw WHERE id = p_raw_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'raw_not_found');
  END IF;

  v_payload     := v_raw.payload;
  v_customer    := v_payload->'Customer';
  v_product     := v_payload->'Product';
  v_commissions := v_payload->'Commissions';
  v_tracking    := v_payload->'TrackingParameters';

  v_order_id := v_payload->>'order_id';
  IF v_order_id IS NULL THEN
    UPDATE marketing.kiwify_events_raw SET
      processed = true, process_error = 'no_order_id', processed_at = now()
    WHERE id = p_raw_id;
    RETURN jsonb_build_object('error', 'no_order_id');
  END IF;

  -- Map status Kiwify → mesmo enum-like do pipeline Hotmart
  v_status := lower(COALESCE(v_payload->>'order_status', v_raw.event_type, 'unknown'));
  v_status := CASE
    WHEN v_status IN ('paid', 'approved', 'order_approved') THEN 'approved'
    WHEN v_status IN ('waiting_payment', 'billet_created', 'pix_created') THEN 'pending'
    WHEN v_status IN ('refunded', 'order_refunded') THEN 'refunded'
    WHEN v_status IN ('chargedback', 'chargeback') THEN 'chargeback'
    WHEN v_status IN ('refused', 'order_rejected', 'canceled', 'cancelled') THEN 'cancelled'
    ELSE v_status
  END;

  -- Kiwify manda valores já em centavos (charge_amount int)
  v_value_cents := COALESCE(
    (v_commissions->>'charge_amount')::int,
    (v_commissions->>'product_base_price')::int
  );

  INSERT INTO marketing.hotmart_sales (
    platform, hotmart_transaction, product_id, product_name, status,
    buyer_name, buyer_email, buyer_phone, buyer_doc,
    price_value_cents, price_currency,
    commission_cents, affiliate_code, affiliate_name,
    payment_type, installments, purchase_date,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    metadata
  ) VALUES (
    'kiwify',
    v_order_id,
    COALESCE(v_product->>'product_id', v_raw.product_id, 'unknown'),
    v_product->>'product_name',
    v_status,
    v_customer->>'full_name',
    lower(v_customer->>'email'),
    COALESCE(v_customer->>'mobile', v_customer->>'phone'),
    COALESCE(v_customer->>'CPF', v_customer->>'cpf'),
    v_value_cents,
    'BRL',
    NULLIF((v_commissions->>'my_commission')::int, 0),
    NULL,  -- afiliados Kiwify não usados neste produto
    NULL,
    v_payload->>'payment_method',
    NULLIF(v_payload->>'installments', '')::int,
    COALESCE(
      NULLIF(v_payload->>'approved_date', '')::timestamptz,
      NULLIF(v_payload->>'created_at', '')::timestamptz,
      v_raw.received_at
    ),
    v_tracking->>'utm_source',
    v_tracking->>'utm_medium',
    v_tracking->>'utm_campaign',
    v_tracking->>'utm_content',
    v_tracking->>'utm_term',
    jsonb_build_object('parsed_at', now(), 'kiwify_raw_id', p_raw_id)
  )
  ON CONFLICT (hotmart_transaction) DO UPDATE SET
    status           = EXCLUDED.status,
    commission_cents = COALESCE(EXCLUDED.commission_cents, marketing.hotmart_sales.commission_cents),
    updated_at       = now()
  RETURNING id INTO v_sale_id;

  PERFORM public.marketing_attribute_hotmart_sale(v_sale_id);

  IF v_status = 'approved' THEN
    PERFORM public.marketing_log_purchase_event(
      v_order_id, 'kiwify', v_value_cents,
      v_tracking->>'utm_source', v_tracking->>'utm_medium',
      v_tracking->>'utm_campaign', v_tracking->>'utm_content', v_tracking->>'utm_term'
    );
  END IF;

  UPDATE marketing.kiwify_events_raw SET
    processed = true, processed_at = now(), process_error = NULL
  WHERE id = p_raw_id;

  RETURN jsonb_build_object('sale_id', v_sale_id, 'order_id', v_order_id, 'status', v_status);

EXCEPTION WHEN OTHERS THEN
  UPDATE marketing.kiwify_events_raw SET
    processed = true, process_error = SQLERRM, processed_at = now()
  WHERE id = p_raw_id;
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.marketing_ingest_kiwify_event(uuid) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.marketing_ingest_kiwify_event(uuid) TO service_role;

-- ─── 5. Hotmart ingest também passa a logar purchase_approved no funil ───
-- (recria só o trecho final: após atribuir, loga o evento)
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
  v_value_cents   int;
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

  v_value_cents := COALESCE(
    ((v_purchase->'price'->>'value')::numeric * 100)::int,
    ((v_data->'price'->>'value')::numeric * 100)::int,
    NULL
  );

  INSERT INTO marketing.hotmart_sales (
    platform, hotmart_transaction, product_id, product_name, status,
    buyer_name, buyer_email, buyer_phone, buyer_doc,
    price_value_cents, price_currency,
    commission_cents, affiliate_code, affiliate_name,
    payment_type, installments, purchase_date,
    utm_source, utm_medium, utm_campaign, utm_content, utm_term,
    raw_event_id, metadata
  ) VALUES (
    'hotmart',
    v_transaction,
    COALESCE(v_product->>'id', v_raw.product_id, 'unknown'),
    v_product->>'name',
    v_status,
    v_buyer->>'name',
    lower(v_buyer->>'email'),
    v_buyer->>'phone',
    v_buyer->>'document',
    v_value_cents,
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

  PERFORM public.marketing_attribute_hotmart_sale(v_sale_id);

  IF v_status IN ('approved', 'complete') THEN
    PERFORM public.marketing_log_purchase_event(
      v_transaction, 'hotmart', v_value_cents,
      v_tracking->>'source', v_tracking->>'medium',
      v_tracking->>'campaign', v_tracking->>'content', v_tracking->>'term'
    );
  END IF;

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

NOTIFY pgrst, 'reload schema';
