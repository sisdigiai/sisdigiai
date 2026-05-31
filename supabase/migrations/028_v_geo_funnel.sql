-- M4.7 da RECONCILIACAO_marketing_2026-05-31.md
-- Cidade-foco "efeito caracol" (plano-mestre §1: Suzano → região → BR → mundo).
-- Agrega community_members + affiliates + testimonials por cidade/estado.

CREATE OR REPLACE VIEW marketing.v_geo_funnel AS
WITH base AS (
  SELECT
    NULLIF(TRIM(city), '') AS city,
    NULLIF(UPPER(TRIM(state)), '') AS state,
    'community' AS source
  FROM marketing.community_members
  WHERE deleted_at IS NULL
  UNION ALL
  SELECT NULLIF(TRIM(city), ''), NULLIF(UPPER(TRIM(state)), ''), 'affiliate'
  FROM marketing.affiliates
  WHERE deleted_at IS NULL
  UNION ALL
  SELECT NULLIF(TRIM(city), ''), NULLIF(UPPER(TRIM(state)), ''), 'testimonial'
  FROM marketing.testimonials
  WHERE deleted_at IS NULL
)
SELECT
  COALESCE(city, '(sem cidade)') AS city,
  COALESCE(state, '—') AS state,
  COUNT(*) FILTER (WHERE source = 'community') AS community_count,
  COUNT(*) FILTER (WHERE source = 'affiliate') AS affiliate_count,
  COUNT(*) FILTER (WHERE source = 'testimonial') AS testimonial_count,
  COUNT(*) AS total
FROM base
GROUP BY COALESCE(city, '(sem cidade)'), COALESCE(state, '—')
ORDER BY total DESC, city;

CREATE OR REPLACE VIEW public.v_marketing_geo_funnel AS
SELECT * FROM marketing.v_geo_funnel;

GRANT SELECT ON public.v_marketing_geo_funnel TO authenticated;

COMMENT ON VIEW marketing.v_geo_funnel IS
  'Cidade-foco "efeito caracol" (plano-mestre §1). Agrega community_members + affiliates + testimonials por cidade/estado.';
COMMENT ON VIEW public.v_marketing_geo_funnel IS
  'Espelho público de marketing.v_geo_funnel pro frontend (padrão das views v_marketing_*).';
