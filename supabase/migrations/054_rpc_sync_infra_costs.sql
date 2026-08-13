-- ============================================================
-- 054 — RPC de gravacao do espelho de aporte em finance.infra_costs
-- ============================================================
-- A edge sync-aporte-digiai tentou `supabase.schema('finance').upsert(...)` e
-- levou "Invalid schema: finance" — o mesmo motivo do 406 da migration 052: o
-- schema `finance` NAO esta exposto no PostgREST, e o cliente supabase-js dentro
-- da edge fala PostgREST como qualquer outro.
--
-- Continuamos NAO expondo o schema (ele carrega expenses e snapshots, dado
-- sensivel). Caminho de escrita = RPC SECURITY DEFINER em `public`, mesmo padrao
-- de fn_capture_landing_lead: so service_role executa.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_sync_infra_costs(p_linhas jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, finance
AS $$
DECLARE
  v_n integer;
BEGIN
  IF p_linhas IS NULL OR jsonb_typeof(p_linhas) <> 'array' THEN
    RAISE EXCEPTION 'p_linhas precisa ser um array jsonb';
  END IF;

  INSERT INTO finance.infra_costs (
    product_id, service, month, cost_brl,
    conta_pagadora, lancamentos, parcial, extrato_ate, sincronizado_em, notes
  )
  SELECT
    l->>'product_id',
    l->>'service',
    (l->>'month')::date,
    (l->>'cost_brl')::numeric,
    l->>'conta_pagadora',
    NULLIF(l->>'lancamentos', '')::integer,
    COALESCE((l->>'parcial')::boolean, false),
    NULLIF(l->>'extrato_ate', '')::date,
    NULLIF(l->>'sincronizado_em', '')::timestamptz,
    l->>'notes'
  FROM jsonb_array_elements(p_linhas) AS l
  ON CONFLICT (product_id, service, month, conta_pagadora) DO UPDATE SET
    cost_brl        = EXCLUDED.cost_brl,
    lancamentos     = EXCLUDED.lancamentos,
    parcial         = EXCLUDED.parcial,
    extrato_ate     = EXCLUDED.extrato_ate,
    sincronizado_em = EXCLUDED.sincronizado_em,
    notes           = EXCLUDED.notes,
    updated_at      = now();

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_sync_infra_costs(jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_sync_infra_costs(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
