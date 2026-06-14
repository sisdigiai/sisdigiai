-- === 044 — Cron marketing-sync-daily (prometido na UI, nunca criado) ===
-- Aplicada em produção via Management API em 2026-06-14.
--
-- Contexto: MarketingSEO.tsx anuncia "sincronização automática via cron
-- marketing-sync-daily (09:00 UTC / 06:00 BRT)", mas cron.job estava VAZIO —
-- por isso as métricas de SEO ficavam 3–8 dias paradas. Este migration cria o cron.
--
-- Auth: invoca as edge fns de sync com a ANON key (publishable — não é segredo;
-- já viaja no bundle do browser). O gateway exige SÓ `Authorization: Bearer <jwt>`
-- — incluir o header `apikey` junto faz o pg_net receber UNAUTHORIZED_INVALID_JWT_FORMAT.
-- pg_net (net.http_post) é fire-and-forget; resultado em net._http_response.
--
-- NOTA: __ANON_PUBLISHABLE_KEY__ é substituída pela anon key real no apply (não
-- commitada). Cobre cloudflare + bing + gsc; gsc pode retornar 500 até a credencial
-- OAuth do Google ser renovada (R-021) — sem efeito sobre cloudflare/bing.

create or replace function public.run_marketing_sync_daily()
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  base text := 'https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/';
  fn text;
begin
  foreach fn in array array['marketing-sync-cloudflare','marketing-sync-bing','marketing-sync-gsc'] loop
    perform net.http_post(
      url     := base || fn,
      body    := '{}'::jsonb,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer __ANON_PUBLISHABLE_KEY__'
      ),
      timeout_milliseconds := 30000
    );
  end loop;
end
$fn$;

-- idempotente: remove agendamento anterior de mesmo nome, se houver
select cron.unschedule('marketing-sync-daily') from cron.job where jobname = 'marketing-sync-daily';

select cron.schedule('marketing-sync-daily', '0 9 * * *', $$select public.run_marketing_sync_daily();$$);
