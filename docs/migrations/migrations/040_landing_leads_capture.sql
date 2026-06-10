-- ============================================================
-- 040 — Captura de leads da landing OSI (marketing.landing_leads)
-- ============================================================
-- Gap crítico detectado 2026-06-09: a landing tinha tracking de eventos
-- mas ZERO captura de contato — visitante que não compra desaparece.
--
-- Pipeline: landing (form) → edge fn lead-capture (keyless, service_role)
--           → RPC fn_capture_landing_lead → marketing.landing_leads
--
-- R-013: tabela de pessoa → schema de identidade obrigatório
-- (digiai_user_uuid + wa_* + phone_e164). Sem tenant_id: app interno
-- single-tenant (mesmo padrão da 038/commercial_leads).
-- LGPD: opt-in registrado (consent_text + consent_at + user_agent).
-- ============================================================

CREATE TABLE IF NOT EXISTS marketing.landing_leads (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  digiai_user_uuid  uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  product           text NOT NULL DEFAULT 'osi',
  name              text,
  email             text,
  phone_e164        text,
  wa_bsuid          text,
  wa_username       text,
  wa_phone_legacy   text,
  -- origem / atribuição
  source_url        text,
  session_id        text,
  utm_source        text,
  utm_medium        text,
  utm_campaign      text,
  utm_content       text,
  utm_term          text,
  -- consentimento LGPD (registro do opt-in)
  consent_text      text,
  consent_at        timestamptz NOT NULL DEFAULT now(),
  user_agent        text,
  -- gestão
  status            text NOT NULL DEFAULT 'novo',   -- novo | contactado | comprou | descartado
  notes             text,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  deleted_at        timestamptz,
  lgpd_request_at   timestamptz,
  anonymized_at     timestamptz,
  CONSTRAINT landing_lead_tem_identificador
    CHECK (email IS NOT NULL OR phone_e164 IS NOT NULL OR wa_bsuid IS NOT NULL)
);

-- dedup: mesmo email no mesmo produto = mesma pessoa (upsert no RPC)
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_leads_product_email
  ON marketing.landing_leads(product, lower(email)) WHERE email IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_landing_leads_product_phone
  ON marketing.landing_leads(product, phone_e164) WHERE phone_e164 IS NOT NULL AND email IS NULL;
CREATE INDEX IF NOT EXISTS idx_landing_leads_created ON marketing.landing_leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_landing_leads_status  ON marketing.landing_leads(status);

ALTER TABLE marketing.landing_leads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS landing_leads_staff_read ON marketing.landing_leads;
CREATE POLICY landing_leads_staff_read ON marketing.landing_leads
  FOR SELECT TO authenticated USING (public.is_staff());

DROP POLICY IF EXISTS landing_leads_staff_update ON marketing.landing_leads;
CREATE POLICY landing_leads_staff_update ON marketing.landing_leads
  FOR UPDATE TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());

GRANT SELECT, UPDATE ON marketing.landing_leads TO authenticated;

-- ─── RPC de captura (só service_role — chamada pela edge fn lead-capture) ───
CREATE OR REPLACE FUNCTION public.fn_capture_landing_lead(
  p_product      text,
  p_name         text,
  p_email        text,
  p_whatsapp     text,
  p_source_url   text DEFAULT NULL,
  p_session_id   text DEFAULT NULL,
  p_utm_source   text DEFAULT NULL,
  p_utm_medium   text DEFAULT NULL,
  p_utm_campaign text DEFAULT NULL,
  p_utm_content  text DEFAULT NULL,
  p_utm_term     text DEFAULT NULL,
  p_consent_text text DEFAULT NULL,
  p_user_agent   text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_email text := NULLIF(lower(trim(p_email)), '');
  v_phone_digits text := NULLIF(regexp_replace(COALESCE(p_whatsapp, ''), '[^0-9]', '', 'g'), '');
  v_phone_e164 text;
  v_id uuid;
BEGIN
  IF v_email IS NULL AND v_phone_digits IS NULL THEN
    RAISE EXCEPTION 'lead_sem_identificador';
  END IF;
  IF v_email IS NOT NULL AND v_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' THEN
    RAISE EXCEPTION 'email_invalido';
  END IF;

  -- normaliza BR: 10-11 dígitos = nacional sem DDI
  IF v_phone_digits IS NOT NULL THEN
    v_phone_e164 := CASE
      WHEN length(v_phone_digits) BETWEEN 10 AND 11 THEN '+55' || v_phone_digits
      WHEN length(v_phone_digits) BETWEEN 12 AND 15 THEN '+' || v_phone_digits
      ELSE NULL
    END;
  END IF;

  IF v_email IS NULL AND v_phone_e164 IS NULL THEN
    RAISE EXCEPTION 'whatsapp_invalido';
  END IF;

  IF v_email IS NOT NULL THEN
    INSERT INTO marketing.landing_leads (
      product, name, email, phone_e164, wa_phone_legacy,
      source_url, session_id,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      consent_text, user_agent
    ) VALUES (
      COALESCE(NULLIF(trim(p_product), ''), 'osi'),
      NULLIF(trim(p_name), ''),
      v_email,
      v_phone_e164,
      v_phone_e164,
      left(p_source_url, 500), left(p_session_id, 64),
      left(p_utm_source, 120), left(p_utm_medium, 120), left(p_utm_campaign, 120),
      left(p_utm_content, 120), left(p_utm_term, 120),
      left(p_consent_text, 500), left(p_user_agent, 300)
    )
    ON CONFLICT (product, lower(email)) WHERE email IS NOT NULL
    DO UPDATE SET
      name        = COALESCE(EXCLUDED.name, marketing.landing_leads.name),
      phone_e164  = COALESCE(EXCLUDED.phone_e164, marketing.landing_leads.phone_e164),
      updated_at  = now()
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO marketing.landing_leads (
      product, name, phone_e164, wa_phone_legacy,
      source_url, session_id,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      consent_text, user_agent
    ) VALUES (
      COALESCE(NULLIF(trim(p_product), ''), 'osi'),
      NULLIF(trim(p_name), ''),
      v_phone_e164,
      v_phone_e164,
      left(p_source_url, 500), left(p_session_id, 64),
      left(p_utm_source, 120), left(p_utm_medium, 120), left(p_utm_campaign, 120),
      left(p_utm_content, 120), left(p_utm_term, 120),
      left(p_consent_text, 500), left(p_user_agent, 300)
    )
    ON CONFLICT (product, phone_e164) WHERE phone_e164 IS NOT NULL AND email IS NULL
    DO UPDATE SET
      name       = COALESCE(EXCLUDED.name, marketing.landing_leads.name),
      updated_at = now()
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_capture_landing_lead(text,text,text,text,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_capture_landing_lead(text,text,text,text,text,text,text,text,text,text,text,text,text) TO service_role;

-- ─── View pro app (staff, security_invoker — padrão 035) ───
CREATE OR REPLACE VIEW public.v_marketing_landing_leads AS
SELECT
  id, digiai_user_uuid, product, name, email, phone_e164,
  source_url, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
  status, notes, created_at, updated_at
FROM marketing.landing_leads
WHERE deleted_at IS NULL AND anonymized_at IS NULL
ORDER BY created_at DESC;

ALTER VIEW public.v_marketing_landing_leads SET (security_invoker = true);
REVOKE ALL ON public.v_marketing_landing_leads FROM anon;
GRANT SELECT ON public.v_marketing_landing_leads TO authenticated;

NOTIFY pgrst, 'reload schema';
