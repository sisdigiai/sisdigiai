-- 041: log temporal de atualizações de redes sociais (Marketing → aba Redes)
-- Doc canônico das travas: D:\projetos\Cockpit\social\redes-sociais.md
-- account_code referencia o cadastro travado em código (src/modules/marketing/Redes.tsx)
-- ⚠️ Pendente de aplicação: requer SUPABASE_TOKEN (Management API) válido — 401 em 2026-06-10.

CREATE TABLE IF NOT EXISTS marketing.social_updates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_code  text NOT NULL,
  update_type   text NOT NULL CHECK (update_type IN ('post','perfil','bio','capa','config','campanha','outro')),
  title         text NOT NULL,
  url           text,
  notes         text,
  happened_on   date NOT NULL DEFAULT current_date,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS social_updates_account_idx ON marketing.social_updates (account_code, happened_on DESC);

ALTER TABLE marketing.social_updates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS social_updates_read ON marketing.social_updates;
CREATE POLICY social_updates_read ON marketing.social_updates
  FOR SELECT TO authenticated USING (true);

CREATE OR REPLACE VIEW public.v_marketing_social_updates AS
  SELECT id, account_code, update_type, title, url, notes, happened_on, created_at
  FROM marketing.social_updates;

GRANT SELECT ON public.v_marketing_social_updates TO authenticated;

CREATE OR REPLACE FUNCTION public.marketing_log_social_update(
  p_account_code text,
  p_update_type  text,
  p_title        text,
  p_url          text DEFAULT NULL,
  p_notes        text DEFAULT NULL,
  p_happened_on  date DEFAULT NULL
) RETURNS uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = marketing, public
AS $$
  INSERT INTO marketing.social_updates (account_code, update_type, title, url, notes, happened_on)
  VALUES (p_account_code, p_update_type, p_title, p_url, p_notes, COALESCE(p_happened_on, current_date))
  RETURNING id;
$$;

REVOKE EXECUTE ON FUNCTION public.marketing_log_social_update(text, text, text, text, text, date) FROM public, anon;
GRANT EXECUTE ON FUNCTION public.marketing_log_social_update(text, text, text, text, text, date) TO authenticated;
