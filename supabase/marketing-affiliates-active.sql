-- ============================================================
-- Marketing — Programa de Afiliados ATIVO (links + cálculo comissão + payouts)
-- ============================================================
-- Hotmart já tem sistema próprio de afiliados (cada afiliado tem código).
-- O webhook traz affiliations[].code que vai pra hotmart_sales.affiliate_code.
-- Aqui amarramos esse código ao nosso afiliado, calculamos comissão acumulada
-- e registramos pagamentos.
-- ============================================================

-- ─── Colunas faltantes em marketing.affiliates ───
ALTER TABLE marketing.affiliates
  ADD COLUMN IF NOT EXISTS hotmart_code text UNIQUE,
  ADD COLUMN IF NOT EXISTS commission_rate_percent numeric(5,2) DEFAULT 30.00,
  ADD COLUMN IF NOT EXISTS commission_paid_cents bigint DEFAULT 0,
  ADD COLUMN IF NOT EXISTS first_sale_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sale_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_affiliates_hotmart_code
  ON marketing.affiliates(hotmart_code) WHERE hotmart_code IS NOT NULL AND deleted_at IS NULL;

-- ─── Tabela payouts ───
CREATE TABLE IF NOT EXISTS marketing.affiliate_payouts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_id    uuid NOT NULL REFERENCES marketing.affiliates(id) ON DELETE CASCADE,
  amount_cents    bigint NOT NULL CHECK (amount_cents > 0),
  payout_date     date NOT NULL DEFAULT CURRENT_DATE,
  method          text CHECK (method IN ('pix','transfer','manual','hotmart')) DEFAULT 'pix',
  reference       text,
  notes           text,
  metadata        jsonb DEFAULT '{}'::jsonb,
  created_at      timestamptz DEFAULT now(),
  created_by      uuid
);

CREATE INDEX IF NOT EXISTS idx_payouts_affiliate ON marketing.affiliate_payouts(affiliate_id);
CREATE INDEX IF NOT EXISTS idx_payouts_date ON marketing.affiliate_payouts(payout_date DESC);

ALTER TABLE marketing.affiliate_payouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS payouts_staff_all ON marketing.affiliate_payouts;
CREATE POLICY payouts_staff_all ON marketing.affiliate_payouts
  FOR ALL TO authenticated
  USING (public.is_staff()) WITH CHECK (public.is_staff());

-- ─── Trigger: atualiza totals em affiliates quando venda muda ───
CREATE OR REPLACE FUNCTION marketing.tg_update_affiliate_totals()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = marketing, public
AS $$
DECLARE
  v_affiliate_id uuid;
BEGIN
  -- Identifica afiliado pelo hotmart_code
  IF COALESCE(NEW.affiliate_code, OLD.affiliate_code) IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT id INTO v_affiliate_id
  FROM marketing.affiliates
  WHERE hotmart_code = COALESCE(NEW.affiliate_code, OLD.affiliate_code)
    AND deleted_at IS NULL
  LIMIT 1;

  IF v_affiliate_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Recalcula totals
  UPDATE marketing.affiliates a SET
    total_sales = (
      SELECT COUNT(*) FROM marketing.hotmart_sales s
      WHERE s.affiliate_code = a.hotmart_code AND s.status IN ('approved','complete')
    ),
    total_commission_cents = (
      SELECT COALESCE(SUM(s.commission_cents), 0) FROM marketing.hotmart_sales s
      WHERE s.affiliate_code = a.hotmart_code AND s.status IN ('approved','complete')
    ),
    first_sale_at = (
      SELECT MIN(s.purchase_date) FROM marketing.hotmart_sales s
      WHERE s.affiliate_code = a.hotmart_code AND s.status IN ('approved','complete')
    ),
    last_sale_at = (
      SELECT MAX(s.purchase_date) FROM marketing.hotmart_sales s
      WHERE s.affiliate_code = a.hotmart_code AND s.status IN ('approved','complete')
    ),
    updated_at = now()
  WHERE id = v_affiliate_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS affiliate_totals_on_sale ON marketing.hotmart_sales;
CREATE TRIGGER affiliate_totals_on_sale
AFTER INSERT OR UPDATE OF status, commission_cents, affiliate_code ON marketing.hotmart_sales
FOR EACH ROW
EXECUTE FUNCTION marketing.tg_update_affiliate_totals();

-- ─── View dashboard: afiliados com totais + saldo devido ───
CREATE OR REPLACE VIEW public.v_marketing_affiliates_dashboard AS
SELECT
  a.*,
  COALESCE(po.total_paid, 0) AS commission_paid_total_cents,
  COALESCE(a.total_commission_cents, 0) - COALESCE(po.total_paid, 0) AS commission_due_cents,
  po.last_payout_at,
  po.payouts_count
FROM marketing.affiliates a
LEFT JOIN (
  SELECT affiliate_id,
         SUM(amount_cents) AS total_paid,
         MAX(payout_date) AS last_payout_at,
         COUNT(*) AS payouts_count
  FROM marketing.affiliate_payouts
  GROUP BY affiliate_id
) po ON po.affiliate_id = a.id
WHERE a.deleted_at IS NULL
ORDER BY a.total_sales DESC NULLS LAST, a.created_at DESC;

GRANT SELECT ON public.v_marketing_affiliates_dashboard TO authenticated;

-- ─── View leaderboard top afiliados ───
CREATE OR REPLACE VIEW public.v_marketing_affiliates_leaderboard AS
SELECT
  ROW_NUMBER() OVER (ORDER BY a.total_commission_cents DESC NULLS LAST, a.total_sales DESC NULLS LAST) AS rank,
  a.id, a.full_name, a.email, a.whatsapp,
  a.tier, a.status,
  a.hotmart_code,
  a.total_sales, a.total_commission_cents,
  a.first_sale_at, a.last_sale_at
FROM marketing.affiliates a
WHERE a.deleted_at IS NULL
  AND a.status IN ('active','top')
  AND a.total_sales > 0
LIMIT 50;

GRANT SELECT ON public.v_marketing_affiliates_leaderboard TO authenticated;

-- ─── View stats topo ───
CREATE OR REPLACE VIEW public.v_marketing_affiliates_stats AS
SELECT
  COUNT(*) AS total_affiliates,
  COUNT(*) FILTER (WHERE status = 'active') AS active,
  COUNT(*) FILTER (WHERE status = 'top') AS top,
  COUNT(*) FILTER (WHERE status = 'pending') AS pending,
  COUNT(*) FILTER (WHERE total_sales > 0) AS with_sales,
  COALESCE(SUM(total_sales), 0) AS sales_total,
  COALESCE(SUM(total_commission_cents), 0) AS commission_total_cents,
  COALESCE((SELECT SUM(amount_cents) FROM marketing.affiliate_payouts), 0) AS commission_paid_cents,
  COALESCE(SUM(total_commission_cents), 0) - COALESCE((SELECT SUM(amount_cents) FROM marketing.affiliate_payouts), 0) AS commission_due_total_cents
FROM marketing.affiliates
WHERE deleted_at IS NULL;

GRANT SELECT ON public.v_marketing_affiliates_stats TO authenticated;

-- ─── RPC: gera link Hotmart com ap=code ───
DROP FUNCTION IF EXISTS public.marketing_get_affiliate_hotmart_link(uuid);
CREATE OR REPLACE FUNCTION public.marketing_get_affiliate_hotmart_link(p_affiliate_id uuid)
RETURNS text
LANGUAGE plpgsql STABLE
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_code text;
  v_base text := 'https://go.hotmart.com/B105515825L';
BEGIN
  SELECT hotmart_code INTO v_code FROM marketing.affiliates WHERE id = p_affiliate_id;
  IF v_code IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN v_base || '?ap=' || v_code || '&dp=1';
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_get_affiliate_hotmart_link TO authenticated, service_role;

-- ─── RPC: registrar payout ───
DROP FUNCTION IF EXISTS public.marketing_register_affiliate_payout(jsonb);
CREATE OR REPLACE FUNCTION public.marketing_register_affiliate_payout(p_payload jsonb)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE v_id uuid;
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;

  INSERT INTO marketing.affiliate_payouts
    (affiliate_id, amount_cents, payout_date, method, reference, notes, created_by)
  VALUES (
    (p_payload->>'affiliate_id')::uuid,
    ((p_payload->>'amount_cents')::numeric)::bigint,
    COALESCE((p_payload->>'payout_date')::date, CURRENT_DATE),
    COALESCE(p_payload->>'method', 'pix'),
    NULLIF(p_payload->>'reference',''),
    NULLIF(p_payload->>'notes',''),
    auth.uid()
  )
  RETURNING id INTO v_id;

  RETURN v_id;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_register_affiliate_payout TO authenticated, service_role;

-- ─── RPC: deletar payout (correção) ───
DROP FUNCTION IF EXISTS public.marketing_delete_affiliate_payout(uuid);
CREATE OR REPLACE FUNCTION public.marketing_delete_affiliate_payout(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN RAISE EXCEPTION 'access_denied'; END IF;
  DELETE FROM marketing.affiliate_payouts WHERE id = p_id;
  RETURN FOUND;
END;
$$;
GRANT EXECUTE ON FUNCTION public.marketing_delete_affiliate_payout TO authenticated, service_role;

-- ─── View: payouts por afiliado ───
CREATE OR REPLACE VIEW public.v_marketing_affiliate_payouts AS
SELECT p.*, a.full_name AS affiliate_name, a.email AS affiliate_email
FROM marketing.affiliate_payouts p
JOIN marketing.affiliates a ON a.id = p.affiliate_id
ORDER BY p.payout_date DESC, p.created_at DESC;

GRANT SELECT ON public.v_marketing_affiliate_payouts TO authenticated;

NOTIFY pgrst, 'reload schema';
