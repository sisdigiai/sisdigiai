-- RPC em public pra edge functions checarem se credential existe sem expor schema company via PostgREST.
-- SECURITY DEFINER: roda com privilégios do dono da função (postgres), bypassa RLS.
-- Retorna só campos seguros — vault_secret_id permanece dentro de company.

CREATE OR REPLACE FUNCTION public.fn_marketing_credential_status(p_provider text)
RETURNS TABLE (
  id uuid,
  label text,
  last_sync_at timestamptz,
  last_sync_status text
)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public, company
AS $$
  SELECT id, label, last_sync_at, last_sync_status
  FROM company.api_credentials
  WHERE provider = p_provider
    AND deleted_at IS NULL
  LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.fn_marketing_credential_status(text) TO authenticated, service_role;

COMMENT ON FUNCTION public.fn_marketing_credential_status(text) IS
  'Edge functions marketing-sync-* chamam isto pra checar se há credencial cadastrada sem expor company schema via PostgREST. Retorna só campos não sensíveis.';
