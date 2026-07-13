-- ============================================================
-- 047 — p_notes na captura de lead (form do clearix-site)
-- ============================================================
-- O form de demonstração do clearix.app.br envia campos que a landing OSI
-- não tinha: "quantas lojas" + mensagem livre. Vão para a coluna `notes`
-- que já existe em marketing.landing_leads.
--
-- Recria fn_capture_landing_lead com p_notes DEFAULT NULL (drop da
-- assinatura antiga de 13 args para não criar overload ambíguo no PostgREST).
-- Comportamento no upsert: nota nova prevalece; sem nota nova, preserva a antiga.
-- ============================================================

DROP FUNCTION IF EXISTS public.fn_capture_landing_lead(text,text,text,text,text,text,text,text,text,text,text,text,text);

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
  p_user_agent   text DEFAULT NULL,
  p_notes        text DEFAULT NULL
) RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_email text := NULLIF(lower(trim(p_email)), '');
  v_phone_digits text := NULLIF(regexp_replace(COALESCE(p_whatsapp, ''), '[^0-9]', '', 'g'), '');
  v_phone_e164 text;
  v_notes text := NULLIF(left(trim(COALESCE(p_notes, '')), 2000), '');
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
      consent_text, user_agent, notes
    ) VALUES (
      COALESCE(NULLIF(trim(p_product), ''), 'osi'),
      NULLIF(trim(p_name), ''),
      v_email,
      v_phone_e164,
      v_phone_e164,
      left(p_source_url, 500), left(p_session_id, 64),
      left(p_utm_source, 120), left(p_utm_medium, 120), left(p_utm_campaign, 120),
      left(p_utm_content, 120), left(p_utm_term, 120),
      left(p_consent_text, 500), left(p_user_agent, 300), v_notes
    )
    ON CONFLICT (product, lower(email)) WHERE email IS NOT NULL
    DO UPDATE SET
      name        = COALESCE(EXCLUDED.name, marketing.landing_leads.name),
      phone_e164  = COALESCE(EXCLUDED.phone_e164, marketing.landing_leads.phone_e164),
      notes       = COALESCE(EXCLUDED.notes, marketing.landing_leads.notes),
      updated_at  = now()
    RETURNING id INTO v_id;
  ELSE
    INSERT INTO marketing.landing_leads (
      product, name, phone_e164, wa_phone_legacy,
      source_url, session_id,
      utm_source, utm_medium, utm_campaign, utm_content, utm_term,
      consent_text, user_agent, notes
    ) VALUES (
      COALESCE(NULLIF(trim(p_product), ''), 'osi'),
      NULLIF(trim(p_name), ''),
      v_phone_e164,
      v_phone_e164,
      left(p_source_url, 500), left(p_session_id, 64),
      left(p_utm_source, 120), left(p_utm_medium, 120), left(p_utm_campaign, 120),
      left(p_utm_content, 120), left(p_utm_term, 120),
      left(p_consent_text, 500), left(p_user_agent, 300), v_notes
    )
    ON CONFLICT (product, phone_e164) WHERE phone_e164 IS NOT NULL AND email IS NULL
    DO UPDATE SET
      name       = COALESCE(EXCLUDED.name, marketing.landing_leads.name),
      notes      = COALESCE(EXCLUDED.notes, marketing.landing_leads.notes),
      updated_at = now()
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_capture_landing_lead(text,text,text,text,text,text,text,text,text,text,text,text,text,text) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_capture_landing_lead(text,text,text,text,text,text,text,text,text,text,text,text,text,text) TO service_role;

NOTIFY pgrst, 'reload schema';
