-- RPC pra cadastrar credenciais sem expor valor pra cliente.
-- Cria secret no Vault + INSERT em company.api_credentials atomicamente.
-- SECURITY DEFINER: roda como dono (postgres), bypassa RLS de api_credentials.
-- Restrita a staff (is_staff()) — anon não chama.

CREATE OR REPLACE FUNCTION public.fn_marketing_register_credential(
  p_provider         text,
  p_credential_type  text,
  p_value            text,
  p_label            text DEFAULT NULL,
  p_scope            text DEFAULT NULL,
  p_notes            text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, company, vault
AS $$
DECLARE
  v_secret_id  uuid;
  v_cred_id    uuid;
  v_secret_name text;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'permission_denied: staff only';
  END IF;

  IF p_value IS NULL OR length(p_value) < 8 THEN
    RAISE EXCEPTION 'invalid_value: too short';
  END IF;

  v_secret_name := p_provider || '_' || p_credential_type || '_' || COALESCE(p_label, gen_random_uuid()::text);

  v_secret_id := vault.create_secret(p_value, v_secret_name, COALESCE(p_notes, 'Cadastrado via fn_marketing_register_credential'));

  INSERT INTO company.api_credentials (provider, credential_type, vault_secret_id, label, scope, notes)
  VALUES (p_provider, p_credential_type, v_secret_id, p_label, p_scope, p_notes)
  RETURNING id INTO v_cred_id;

  RETURN v_cred_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_marketing_register_credential(text, text, text, text, text, text) TO authenticated;

COMMENT ON FUNCTION public.fn_marketing_register_credential(text, text, text, text, text, text) IS
  'Cadastra credencial: cria secret no Vault + INSERT em company.api_credentials. Restrita a staff. Retorna id do credential criado.';
