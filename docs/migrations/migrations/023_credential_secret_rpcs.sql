-- RPCs pra edge functions lerem/gravarem secrets do Vault sem expor schema vault/company via PostgREST.
-- Restritas a service_role (NUNCA authenticated/anon — secrets não vão pro frontend).

-- Ler valor decifrado de uma credencial
CREATE OR REPLACE FUNCTION public.fn_get_credential_secret(p_provider text, p_label text)
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, company, vault
AS $$
  SELECT ds.decrypted_secret
  FROM company.api_credentials ac
  JOIN vault.decrypted_secrets ds ON ds.id = ac.vault_secret_id
  WHERE ac.provider = p_provider
    AND ac.label = p_label
    AND ac.deleted_at IS NULL
  ORDER BY ac.created_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.fn_get_credential_secret(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_get_credential_secret(text, text) TO service_role;

-- Gravar/atualizar credencial (upsert por provider+label, soft-delete a antiga)
CREATE OR REPLACE FUNCTION public.fn_set_credential_service(
  p_provider text, p_credential_type text, p_value text,
  p_label text, p_scope text DEFAULT NULL, p_notes text DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, company, vault
AS $$
DECLARE
  v_secret_id uuid;
  v_cred_id uuid;
  v_name text;
BEGIN
  UPDATE company.api_credentials SET deleted_at = now()
    WHERE provider = p_provider AND label = p_label AND deleted_at IS NULL;

  v_name := p_provider || '_' || p_credential_type || '_' || p_label || '_' || substr(gen_random_uuid()::text, 1, 8);
  v_secret_id := vault.create_secret(p_value, v_name, COALESCE(p_notes, ''));

  INSERT INTO company.api_credentials (provider, credential_type, vault_secret_id, label, scope, notes)
  VALUES (p_provider, p_credential_type, v_secret_id, p_label, p_scope, p_notes)
  RETURNING id INTO v_cred_id;

  RETURN v_cred_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_set_credential_service(text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_set_credential_service(text, text, text, text, text, text) TO service_role;

-- Atualizar status de sync de um provider
CREATE OR REPLACE FUNCTION public.fn_mark_sync(p_provider text, p_status text, p_error text DEFAULT NULL)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public, company
AS $$
  UPDATE company.api_credentials
  SET last_sync_at = now(), last_sync_status = p_status, last_sync_error = p_error, last_used_at = now()
  WHERE provider = p_provider AND deleted_at IS NULL;
$$;

REVOKE ALL ON FUNCTION public.fn_mark_sync(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_mark_sync(text, text, text) TO service_role;
