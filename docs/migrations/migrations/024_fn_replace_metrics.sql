-- Substitui (delete + insert) métricas de um source. Edge functions chamam após sync.
CREATE OR REPLACE FUNCTION public.fn_replace_metrics(p_source text, p_rows jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, company
AS $$
DECLARE v_count integer;
BEGIN
  DELETE FROM company.metrics WHERE source = p_source;
  INSERT INTO company.metrics
    (source, metric_type, metric_key, value_numeric, value_text, metadata, period, period_start, period_end, collected_at)
  SELECT
    p_source,
    r->>'metric_type',
    r->>'metric_key',
    NULLIF(r->>'value_numeric','')::numeric,
    r->>'value_text',
    COALESCE(r->'metadata', '{}'::jsonb),
    r->>'period',
    NULLIF(r->>'period_start','')::date,
    NULLIF(r->>'period_end','')::date,
    now()
  FROM jsonb_array_elements(p_rows) AS r;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  RETURN v_count;
END;
$$;

REVOKE ALL ON FUNCTION public.fn_replace_metrics(text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.fn_replace_metrics(text, jsonb) TO service_role;
