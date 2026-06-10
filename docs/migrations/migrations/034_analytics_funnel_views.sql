-- First-party funnel: RLS em events_log + views agregadas pro app.
-- A ingestão já existe (fn_log_event SECURITY DEFINER, migration 032) e a tabela/catalog tb.
-- Aqui só: (1) trancar leitura direta da tabela por RLS, (2) expor agregados não-PII via views públicas.
-- Cross-ref: FluxoOSI "Conversões (first-party)" + plano-de-largada §8 analytics.

-- (1) RLS: leitura só staff. Escrita continua via fn_log_event (SECURITY DEFINER) / service_role (bypassa RLS).
ALTER TABLE analytics.events_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS events_log_staff_read ON analytics.events_log;
CREATE POLICY events_log_staff_read ON analytics.events_log
  FOR SELECT USING (public.is_staff());

-- (2a) Resumo por evento (7d / 30d / total) — base do card do Funil OSI.
-- LEFT JOIN no catálogo garante que todo evento ativo apareça mesmo com 0 disparos.
CREATE OR REPLACE VIEW public.v_analytics_funnel_summary AS
  SELECT
    c.product,
    c.code                                                                AS event_code,
    c.funnel_stage,
    c.sort_order,
    COUNT(l.id) FILTER (WHERE l.occurred_at >= now() - interval '7 days')  AS n_7d,
    COUNT(l.id) FILTER (WHERE l.occurred_at >= now() - interval '30 days') AS n_30d,
    COUNT(l.id)                                                           AS n_total,
    MAX(l.occurred_at)                                                    AS last_at
  FROM analytics.events_catalog c
  LEFT JOIN analytics.events_log l ON l.event_code = c.code
  WHERE c.is_active
  GROUP BY c.product, c.code, c.funnel_stage, c.sort_order;

COMMENT ON VIEW public.v_analytics_funnel_summary IS
  'Agregado não-PII por evento do catálogo (7d/30d/total). Lido pelo card Conversões do Funil OSI.';

-- (2b) Série diária 90d — base de gráfico futuro.
CREATE OR REPLACE VIEW public.v_analytics_funnel_daily AS
  SELECT
    product,
    event_code,
    occurred_at::date AS day,
    COUNT(*)          AS n
  FROM analytics.events_log
  WHERE occurred_at >= now() - interval '90 days'
  GROUP BY product, event_code, occurred_at::date;

COMMENT ON VIEW public.v_analytics_funnel_daily IS
  'Série diária não-PII (90d) por evento. Base de gráfico de funil.';

-- Só staff logado lê (não anon). São contagens agregadas, sem session-level.
GRANT SELECT ON public.v_analytics_funnel_summary TO authenticated;
GRANT SELECT ON public.v_analytics_funnel_daily   TO authenticated;
