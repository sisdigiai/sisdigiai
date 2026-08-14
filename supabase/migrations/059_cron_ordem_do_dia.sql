-- ============================================================
-- 059 — A ordem do dia passa a nascer e sair sozinha
-- ============================================================
-- Ordem dos horarios (todos em UTC — o pg_cron do Supabase nao usa America/Sao_Paulo):
--   04:20 UTC (01:20 BRT) — sync-aporte-diario ja existente (migration 055)
--   04:40 UTC (01:40 BRT) — gera a ordem, ja com o custo do dia sincronizado
--   04:50 UTC (01:50 BRT) — empurra as obrigacoes humanas para a agenda no GJ
--
-- A geracao vem DEPOIS do sync de proposito: o bloco "maquina" da ordem cita o
-- espelho de custo, e citar numero de ontem seria comecar o dia mentindo.
--
-- O push e idempotente (fn_importar_evento do GJ faz upsert por origem+ref),
-- entao repetir nao duplica evento — atualiza.
-- ============================================================

SELECT cron.schedule(
  'ordem-do-dia-gerar',
  '40 4 * * *',
  $$ select public.fn_gerar_ordem_do_dia(); $$
);

SELECT cron.schedule(
  'ordem-do-dia-push',
  '50 4 * * *',
  $$
  select net.http_post(
    url := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/push-ordem-gj',
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
