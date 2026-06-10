-- Cron diário pras 3 edge functions marketing-sync-*.
-- pg_cron agenda; pg_net chama HTTP. Anon key fica no Vault (secret 'supabase_anon_key').
--
-- IMPORTANTE: secret 'supabase_anon_key' precisa ser criado SEPARADAMENTE via:
--   SELECT vault.create_secret('<ANON_KEY>', 'supabase_anon_key', '...');
-- (anon key é pública mas centralizar no vault evita hardcode na função.)

CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Helper: chama uma edge function pelo nome usando anon key do Vault.
-- timeout_milliseconds := 60000 porque GSC faz 4 chamadas API + 1 sitemap = ~10s
CREATE OR REPLACE FUNCTION public.fn_call_edge_function(p_name text)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, vault, net
AS $$
DECLARE
  v_key text;
  v_request_id bigint;
BEGIN
  SELECT decrypted_secret INTO v_key
    FROM vault.decrypted_secrets
    WHERE name = 'supabase_anon_key'
    LIMIT 1;

  IF v_key IS NULL THEN
    RAISE EXCEPTION 'supabase_anon_key não encontrado no vault.secrets';
  END IF;

  SELECT net.http_post(
    url := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/' || p_name,
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key,
      'apikey', v_key
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 60000
  ) INTO v_request_id;

  RETURN v_request_id;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_call_edge_function(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_call_edge_function(text) TO service_role;

COMMENT ON FUNCTION public.fn_call_edge_function(text) IS
  'Chama uma edge function via net.http_post lendo anon key do Vault. Usado pelo pg_cron pra sync diário.';

-- Cron diário: 09:00 UTC = 06:00 BRT
-- Idempotente: cron.schedule atualiza job de mesmo nome.
SELECT cron.schedule(
  'marketing-sync-daily',
  '0 9 * * *',
  $cron$
    SELECT public.fn_call_edge_function('marketing-sync-gsc');
    SELECT public.fn_call_edge_function('marketing-sync-bing');
    SELECT public.fn_call_edge_function('marketing-sync-cloudflare');
  $cron$
);
