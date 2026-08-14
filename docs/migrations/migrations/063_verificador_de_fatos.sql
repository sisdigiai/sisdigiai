-- ============================================================
-- 063 — Frota, agente 1: o verificador de fatos
-- ============================================================
-- Problema: 5 dos 10 fatos publicaveis de mkt.fatos estao vencidos, e fato
-- vencido = IA do MKT silenciada naquele numero. Ficam meses assim porque
-- reverificar e trabalho manual que ninguem lembra de fazer.
--
-- Duas decisoes de desenho que importam:
--
-- 1) A medicao mora em `ops`, NAO em `mkt`. A tabela mkt.fatos e do agente do
--    digiai_mkt (R-032) — eu meco e reporto; renovar ou reescrever o fato e
--    decisao dele. Alterar a tabela dele por fora seria repetir o incidente que
--    criou a R-032.
--
-- 2) O agente NAO reescreve o texto do fato. Ele mede a fonte e da um veredito:
--    `confirmado` (o numero do texto ainda se sustenta), `divergente` (mudou o
--    suficiente para o texto ficar errado) ou `nao_verificavel` (a fonte exige
--    humano, como o YouTube Studio). Agente que reescreve copy de marketing
--    sozinho e agente que inventa — e a R-011 proibe publicar.
--
-- Um caso real ja mostra por que o veredito precisa poder PIORAR o fato: o fato
-- "22 pecas nos ultimos 7 dias" foi verificado em 01/08; hoje a esteira publicou
-- 2 na semana, porque ficou 11 dias parada. Reverificar as vezes expoe queda —
-- e esconder isso seria a mentira que este painel existe para nao contar.
-- ============================================================

CREATE TABLE IF NOT EXISTS ops.fato_medicao (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  fato_id     uuid NOT NULL,
  chave       text,
  fonte       text,
  valor_texto numeric,        -- o que o fato afirma hoje (mkt.fatos.valor_numerico)
  valor_medido numeric,       -- o que a fonte diz agora
  veredito    text NOT NULL,  -- confirmado | divergente | nao_verificavel
  detalhe     text,
  medido_em   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT fato_veredito_valido
    CHECK (veredito IN ('confirmado','divergente','nao_verificavel'))
);

CREATE INDEX IF NOT EXISTS idx_fato_medicao_fato ON ops.fato_medicao(fato_id, medido_em DESC);

ALTER TABLE ops.fato_medicao ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS fato_medicao_staff ON ops.fato_medicao;
CREATE POLICY fato_medicao_staff ON ops.fato_medicao
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
GRANT SELECT, INSERT ON ops.fato_medicao TO authenticated;

-- Ultima medicao de cada fato, com o estado de validade do proprio fato
CREATE OR REPLACE VIEW public.v_ops_fatos_verificados AS
SELECT DISTINCT ON (f.id)
  f.id            AS fato_id,
  f.chave,
  f.fato,
  f.valor_numerico,
  f.verificado_em,
  f.validade_dias,
  (current_date - f.verificado_em) > f.validade_dias AS vencido,
  m.valor_medido,
  m.veredito,
  m.detalhe,
  m.medido_em
FROM mkt.fatos f
LEFT JOIN ops.fato_medicao m ON m.fato_id = f.id
WHERE f.publico
ORDER BY f.id, m.medido_em DESC NULLS LAST;

ALTER VIEW public.v_ops_fatos_verificados SET (security_invoker = true);
REVOKE ALL ON public.v_ops_fatos_verificados FROM anon;
GRANT SELECT ON public.v_ops_fatos_verificados TO authenticated;

-- Grava a medicao (so service_role: quem escreve e o agente, nao a tela)
CREATE OR REPLACE FUNCTION public.fn_registrar_medicao_fato(p_linhas jsonb)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops
AS $$
DECLARE v_n integer;
BEGIN
  IF p_linhas IS NULL OR jsonb_typeof(p_linhas) <> 'array' THEN
    RAISE EXCEPTION 'p_linhas precisa ser um array jsonb';
  END IF;

  INSERT INTO ops.fato_medicao (fato_id, chave, fonte, valor_texto, valor_medido, veredito, detalhe)
  SELECT (l->>'fato_id')::uuid, l->>'chave', l->>'fonte',
         NULLIF(l->>'valor_texto','')::numeric,
         NULLIF(l->>'valor_medido','')::numeric,
         l->>'veredito', l->>'detalhe'
    FROM jsonb_array_elements(p_linhas) AS l;

  GET DIAGNOSTICS v_n = ROW_COUNT;
  RETURN v_n;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_registrar_medicao_fato(jsonb) FROM PUBLIC, anon, authenticated;
GRANT  EXECUTE ON FUNCTION public.fn_registrar_medicao_fato(jsonb) TO service_role;

NOTIFY pgrst, 'reload schema';
