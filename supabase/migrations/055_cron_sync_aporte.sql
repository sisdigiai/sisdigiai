-- ============================================================
-- 055 — cron diario da sincronizacao do aporte
-- ============================================================
-- Mesmo padrao do `mkt-tick-diario`: pg_cron dispara net.http_post na edge do
-- proprio projeto, com o Bearer saindo do vault (nunca hardcoded na migration).
--
-- Cadencia: diaria de madrugada. O agente do Finance observou que o dado so muda
-- quando entra extrato novo — e importacao e ato manual e esporadico. Como o
-- upsert e idempotente, rodar todo dia nao custa: reescreve as mesmas linhas e
-- avanca `sincronizado_em`. Semanal bastaria; diario da margem sem risco.
-- ============================================================

SELECT cron.schedule(
  'sync-aporte-diario',
  '20 4 * * *',
  $$
  select net.http_post(
    url := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/sync-aporte-digiai',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (
        select decrypted_secret from vault.decrypted_secrets where name = 'supabase_anon_key'
      )
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 30000
  );
  $$
);
