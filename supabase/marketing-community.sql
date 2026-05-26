-- ============================================================
-- Marketing — Comunidade OSI (membros vindos do Hotmart)
-- ============================================================
-- Cada venda aprovada vira um community_member automaticamente.
-- Aba admin pra ver/segmentar/escrever WhatsApp/marcar VIP.
-- Trigger no marketing_ingest_hotmart_event garante criação auto.
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing.community_members (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name             text NOT NULL,
  email                 text NOT NULL,
  whatsapp              text,
  city                  text,
  state                 text,
  -- vindo do Hotmart
  hotmart_transaction   text UNIQUE,
  hotmart_sale_id       uuid REFERENCES marketing.hotmart_sales(id) ON DELETE SET NULL,
  joined_at             timestamptz DEFAULT now(),
  -- segmentação
  status                text NOT NULL DEFAULT 'active'
                        CHECK (status IN ('active','inactive','vip','blocked','refunded')),
  tier                  text NOT NULL DEFAULT 'bronze'
                        CHECK (tier IN ('bronze','prata','ouro','vip')),
  -- engajamento
  last_active_at        timestamptz,
  testimonials_count    int DEFAULT 0,
  -- atribuição (de onde veio)
  utm_source            text,
  utm_medium            text,
  utm_campaign          text,
  attributed_post_id    uuid REFERENCES marketing.content_calendar(id) ON DELETE SET NULL,
  attributed_pillar_id  uuid REFERENCES marketing.content_pillars(id) ON DELETE SET NULL,
  -- consent / contato
  whatsapp_consent      boolean DEFAULT false,
  email_consent         boolean DEFAULT true,
  -- meta
  notes                 text,
  metadata              jsonb DEFAULT '{}'::jsonb,
  created_at            timestamptz DEFAULT now(),
  updated_at            timestamptz DEFAULT now(),
  deleted_at            timestamptz
);

CREATE INDEX IF NOT EXISTS idx_comm_email      ON marketing.community_members(lower(email)) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comm_status     ON marketing.community_members(status) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comm_tier       ON marketing.community_members(tier) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_comm_joined     ON marketing.community_members(joined_at DESC);
CREATE INDEX IF NOT EXISTS idx_comm_pillar     ON marketing.community_members(attributed_pillar_id) WHERE attributed_pillar_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_comm_active     ON marketing.community_members(last_active_at DESC NULLS LAST);

ALTER TABLE marketing.community_members ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS community_staff_all ON marketing.community_members;
CREATE POLICY community_staff_all ON marketing.community_members
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ─── View admin (com info de pilar atribuído) ───
CREATE OR REPLACE VIEW public.v_marketing_community AS
SELECT
  m.*,
  p.code  AS pillar_code,
  p.name  AS pillar_name,
  p.color AS pillar_color,
  cp.hook AS attributed_post_hook,
  cp.scheduled_date AS attributed_post_date,
  s.price_value_cents AS hotmart_value_cents,
  s.commission_cents AS hotmart_commission_cents
FROM marketing.community_members m
LEFT JOIN marketing.content_pillars p ON p.id = m.attributed_pillar_id
LEFT JOIN marketing.content_calendar cp ON cp.id = m.attributed_post_id
LEFT JOIN marketing.hotmart_sales s ON s.id = m.hotmart_sale_id
WHERE m.deleted_at IS NULL
ORDER BY m.joined_at DESC;

GRANT SELECT ON public.v_marketing_community TO authenticated;

-- ─── Stats da comunidade ───
CREATE OR REPLACE VIEW public.v_marketing_community_stats AS
SELECT
  COUNT(*) AS total,
  COUNT(*) FILTER (WHERE status = 'active') AS active,
  COUNT(*) FILTER (WHERE status = 'vip') AS vip,
  COUNT(*) FILTER (WHERE status = 'inactive') AS inactive,
  COUNT(*) FILTER (WHERE status = 'refunded') AS refunded,
  COUNT(*) FILTER (WHERE joined_at >= NOW() - INTERVAL '7 days') AS new_last_7d,
  COUNT(*) FILTER (WHERE joined_at >= NOW() - INTERVAL '30 days') AS new_last_30d,
  COUNT(*) FILTER (WHERE last_active_at >= NOW() - INTERVAL '30 days') AS active_last_30d,
  COUNT(*) FILTER (WHERE whatsapp_consent) AS whatsapp_optin,
  COUNT(*) FILTER (WHERE email_consent) AS email_optin,
  COUNT(*) FILTER (WHERE attributed_post_id IS NOT NULL) AS attributed_to_post,
  MIN(joined_at) AS first_member_at,
  MAX(joined_at) AS last_member_at
FROM marketing.community_members
WHERE deleted_at IS NULL;

GRANT SELECT ON public.v_marketing_community_stats TO authenticated;

-- ─── RPC: criar member (chamada pelo ingest do webhook) ───
DROP FUNCTION IF EXISTS public.marketing_upsert_community_member(uuid);
CREATE OR REPLACE FUNCTION public.marketing_upsert_community_member(p_sale_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_sale record;
  v_member_id uuid;
BEGIN
  SELECT * INTO v_sale FROM marketing.hotmart_sales WHERE id = p_sale_id;
  IF NOT FOUND THEN
    RETURN NULL;
  END IF;

  -- Upsert por hotmart_transaction
  INSERT INTO marketing.community_members
    (full_name, email, whatsapp, hotmart_transaction, hotmart_sale_id,
     status, tier,
     utm_source, utm_medium, utm_campaign,
     attributed_post_id, attributed_pillar_id,
     metadata)
  VALUES (
    COALESCE(v_sale.buyer_name, 'Sem nome'),
    lower(COALESCE(v_sale.buyer_email, 'sem-email@local')),
    v_sale.buyer_phone,
    v_sale.hotmart_transaction,
    v_sale.id,
    CASE
      WHEN v_sale.status IN ('refunded','chargeback','cancelled') THEN 'refunded'
      WHEN v_sale.status IN ('approved','complete') THEN 'active'
      ELSE 'inactive'
    END,
    'bronze',
    v_sale.utm_source, v_sale.utm_medium, v_sale.utm_campaign,
    v_sale.attributed_post_id, v_sale.attributed_pillar_id,
    jsonb_build_object('source','hotmart_webhook', 'created_via', 'auto')
  )
  ON CONFLICT (hotmart_transaction) DO UPDATE SET
    status = CASE
      WHEN EXCLUDED.status = 'refunded' THEN 'refunded'
      ELSE marketing.community_members.status
    END,
    updated_at = now()
  RETURNING id INTO v_member_id;

  RETURN v_member_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_upsert_community_member TO authenticated, service_role;

-- ─── Modificar ingest_hotmart_event pra criar member auto ───
-- Re-define pra incluir chamada do upsert_community_member no final
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
  v_member_id     uuid;
  v_transaction   text;
  v_status        text;
BEGIN
  SELECT * INTO v_raw FROM marketing.hotmart_events_raw WHERE id = p_raw_id;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'raw_not_found');
  END IF;

  v_payload      := v_raw.payload;
  v_data         := COALESCE(v_payload->'data', v_payload);
  v_buyer        := v_data->'buyer';
  v_product      := v_data->'product';
  v_purchase     := v_data->'purchase';
  v_affiliations := v_data->'affiliations';
  v_commissions  := v_data->'commissions';
  v_tracking     := v_purchase->'tracking';

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

  -- NOVO: cria/atualiza member da comunidade auto (só se aprovado/complete)
  IF v_status IN ('approved','complete') THEN
    v_member_id := public.marketing_upsert_community_member(v_sale_id);
  ELSIF v_status IN ('refunded','chargeback','cancelled') THEN
    -- Marca member como refunded se já existe
    UPDATE marketing.community_members SET
      status = 'refunded', updated_at = now()
    WHERE hotmart_transaction = v_transaction;
  END IF;

  UPDATE marketing.hotmart_events_raw SET
    processed = true, processed_at = now(), process_error = NULL
  WHERE id = p_raw_id;

  RETURN jsonb_build_object(
    'sale_id', v_sale_id,
    'member_id', v_member_id,
    'transaction', v_transaction,
    'status', v_status
  );

EXCEPTION WHEN OTHERS THEN
  UPDATE marketing.hotmart_events_raw SET
    processed = true, process_error = SQLERRM, processed_at = now()
  WHERE id = p_raw_id;
  RETURN jsonb_build_object('error', SQLERRM);
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_ingest_hotmart_event TO authenticated, service_role;

-- ─── RPC: update member (admin actions) ───
DROP FUNCTION IF EXISTS public.marketing_update_community_member(uuid, jsonb);
CREATE OR REPLACE FUNCTION public.marketing_update_community_member(p_id uuid, p_patch jsonb)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  UPDATE marketing.community_members SET
    status            = COALESCE(p_patch->>'status', status),
    tier              = COALESCE(p_patch->>'tier', tier),
    whatsapp          = CASE WHEN p_patch ? 'whatsapp' THEN p_patch->>'whatsapp' ELSE whatsapp END,
    whatsapp_consent  = COALESCE((p_patch->>'whatsapp_consent')::boolean, whatsapp_consent),
    email_consent     = COALESCE((p_patch->>'email_consent')::boolean, email_consent),
    notes             = CASE WHEN p_patch ? 'notes' THEN p_patch->>'notes' ELSE notes END,
    last_active_at    = CASE WHEN p_patch ? 'mark_active' THEN now() ELSE last_active_at END,
    city              = CASE WHEN p_patch ? 'city' THEN p_patch->>'city' ELSE city END,
    state             = CASE WHEN p_patch ? 'state' THEN p_patch->>'state' ELSE state END,
    updated_at        = now()
  WHERE id = p_id AND deleted_at IS NULL;

  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_update_community_member TO authenticated, service_role;

-- ─── RPC: criar member manual (sem Hotmart, ex: convidado) ───
DROP FUNCTION IF EXISTS public.marketing_create_community_member(jsonb);
CREATE OR REPLACE FUNCTION public.marketing_create_community_member(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  INSERT INTO marketing.community_members (
    full_name, email, whatsapp, city, state,
    status, tier, whatsapp_consent, email_consent, notes, metadata
  ) VALUES (
    p_payload->>'full_name',
    lower(p_payload->>'email'),
    NULLIF(p_payload->>'whatsapp',''),
    NULLIF(p_payload->>'city',''),
    NULLIF(p_payload->>'state',''),
    COALESCE(p_payload->>'status','active'),
    COALESCE(p_payload->>'tier','bronze'),
    COALESCE((p_payload->>'whatsapp_consent')::boolean, false),
    COALESCE((p_payload->>'email_consent')::boolean, true),
    NULLIF(p_payload->>'notes',''),
    jsonb_build_object('source','manual', 'created_via', 'admin')
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_create_community_member TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
