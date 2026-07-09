-- ============================================================
-- 040 — Roll-up de receita: marketing.hotmart_sales → finance.revenue
-- ============================================================
-- Fecha o gap "finance.revenue vazia": toda venda de infoproduto
-- (Hotmart e Kiwify, ambas na tabela canônica marketing.hotmart_sales)
-- vira receita mensal por produto em finance.revenue, automaticamente.
--
-- 1. Produto 'osi' entra no catálogo finance.products
--    (+ conserto de mojibake no nome do easyidiomas).
-- 2. finance.revenue ganha colunas de venda avulsa:
--    one_time_brl, sales_count, refund_count (MRR continua pra SaaS).
-- 3. marketing.product_finance_map — mapeia product_id da plataforma
--    → finance.products.id (Hotmart 7611033/B105515825 → osi).
-- 4. public.fn_revenue_rebuild(p_month) — recalcula a partir das vendas
--    com status approved/complete; transações de teste HP-FAKE% ficam fora.
-- 5. Trigger em marketing.hotmart_sales mantém o roll-up sempre atual.
-- ============================================================

-- ─── 1. Catálogo de produtos ───
INSERT INTO finance.products (id, name, notes)
VALUES ('osi', 'Ótica Sem Improviso (DIGIAI Academy)',
        'Infoproduto: manual 5 Movimentos + app leitor + 90d de apoio. Vendido via Hotmart/Kiwify.')
ON CONFLICT (id) DO NOTHING;

UPDATE finance.products
SET name = 'Easy Idiomas — SaaS escolas de idiomas'
WHERE id = 'easyidiomas' AND name LIKE '%�%';

-- ─── 2. Colunas de venda avulsa em finance.revenue ───
ALTER TABLE finance.revenue
  ADD COLUMN IF NOT EXISTS one_time_brl numeric NOT NULL DEFAULT 0 CHECK (one_time_brl >= 0),
  ADD COLUMN IF NOT EXISTS sales_count  integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS refund_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN finance.revenue.one_time_brl IS
  'Receita bruta de vendas avulsas aprovadas no mês (infoprodutos). MRR fica em mrr_brl.';

-- ─── 3. Mapa plataforma → produto finance ───
CREATE TABLE IF NOT EXISTS marketing.product_finance_map (
  platform_product_id text PRIMARY KEY,
  finance_product_id  text NOT NULL REFERENCES finance.products(id),
  created_at          timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE marketing.product_finance_map ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS product_map_staff_read ON marketing.product_finance_map;
CREATE POLICY product_map_staff_read ON marketing.product_finance_map
  FOR SELECT TO authenticated USING (public.is_staff());

INSERT INTO marketing.product_finance_map (platform_product_id, finance_product_id) VALUES
  ('7611033',    'osi'),   -- Hotmart product.id real
  ('B105515825', 'osi')    -- id usado em registros de teste/legado
ON CONFLICT (platform_product_id) DO NOTHING;

-- ─── 4. Rebuild do roll-up ───
CREATE OR REPLACE FUNCTION public.fn_revenue_rebuild(p_month date DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing, finance
AS $$
DECLARE
  v_upserted int := 0;
  v_unmapped text[];
BEGIN
  -- produtos de plataforma sem mapeamento (pra não sumir receita em silêncio)
  SELECT array_agg(DISTINCT s.product_id) INTO v_unmapped
  FROM marketing.hotmart_sales s
  LEFT JOIN marketing.product_finance_map m ON m.platform_product_id = s.product_id
  WHERE m.platform_product_id IS NULL
    AND s.product_name NOT ILIKE '%improviso%'
    AND s.hotmart_transaction NOT LIKE 'HP-FAKE%';

  -- zera linhas automáticas no escopo (mês que ficou sem venda volta a 0)
  UPDATE finance.revenue r SET
    one_time_brl = 0, sales_count = 0, refund_count = 0, updated_at = now()
  WHERE r.notes = 'auto: fn_revenue_rebuild'
    AND (p_month IS NULL OR r.month = p_month);

  WITH sales AS (
    SELECT
      COALESCE(m.finance_product_id,
               CASE WHEN s.product_name ILIKE '%improviso%' THEN 'osi' END) AS product_id,
      date_trunc('month', s.purchase_date)::date AS month,
      s.status,
      s.price_value_cents
    FROM marketing.hotmart_sales s
    LEFT JOIN marketing.product_finance_map m ON m.platform_product_id = s.product_id
    WHERE s.hotmart_transaction NOT LIKE 'HP-FAKE%'
      AND (p_month IS NULL OR date_trunc('month', s.purchase_date)::date = p_month)
  ),
  agg AS (
    SELECT product_id, month,
      COALESCE(sum(price_value_cents) FILTER (WHERE status IN ('approved','complete')), 0) / 100.0 AS one_time_brl,
      count(*) FILTER (WHERE status IN ('approved','complete'))   AS sales_count,
      count(*) FILTER (WHERE status IN ('refunded','chargeback')) AS refund_count
    FROM sales
    WHERE product_id IS NOT NULL
    GROUP BY product_id, month
  ),
  up AS (
    INSERT INTO finance.revenue (product_id, month, one_time_brl, sales_count, refund_count, notes)
    SELECT product_id, month, one_time_brl, sales_count, refund_count, 'auto: fn_revenue_rebuild'
    FROM agg
    ON CONFLICT (product_id, month) DO UPDATE SET
      one_time_brl = EXCLUDED.one_time_brl,
      sales_count  = EXCLUDED.sales_count,
      refund_count = EXCLUDED.refund_count,
      updated_at   = now()
    RETURNING 1
  )
  SELECT count(*) INTO v_upserted FROM up;

  RETURN jsonb_build_object(
    'months_upserted', v_upserted,
    'unmapped_platform_products', COALESCE(v_unmapped, '{}')
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_revenue_rebuild(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_revenue_rebuild(date) TO service_role, authenticated;

-- ─── 5. Trigger: venda entrou/mudou → roll-up do mês recalcula ───
CREATE OR REPLACE FUNCTION marketing.trg_sales_revenue_rollup()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  PERFORM public.fn_revenue_rebuild(date_trunc('month', COALESCE(NEW.purchase_date, now()))::date);
  IF TG_OP = 'UPDATE'
     AND date_trunc('month', OLD.purchase_date) IS DISTINCT FROM date_trunc('month', NEW.purchase_date) THEN
    PERFORM public.fn_revenue_rebuild(date_trunc('month', OLD.purchase_date)::date);
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_revenue_rollup ON marketing.hotmart_sales;
CREATE TRIGGER trg_revenue_rollup
AFTER INSERT OR UPDATE OF status, price_value_cents, purchase_date ON marketing.hotmart_sales
FOR EACH ROW EXECUTE FUNCTION marketing.trg_sales_revenue_rollup();

-- primeira carga
SELECT public.fn_revenue_rebuild();

NOTIFY pgrst, 'reload schema';
