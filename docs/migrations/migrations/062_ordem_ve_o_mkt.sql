-- ============================================================
-- 062 — O bloco Maquina passa a enxergar o MKT
-- ============================================================
-- Em 2026-08-14 o agente do MKT consertou a fila (o CHECK do banco nao aceitava
-- 'atrasado', entao a coleira de frescor falhava calada e 104 jobs represados
-- ocupavam os slots) e o motor voltou a publicar depois de 11 dias parado.
--
-- O cerebro nao viu nada disso: o bloco "maquina" so olhava custo e fatos. Um
-- painel que diz "o que rodou sozinho" e nao percebe 11 dias sem publicacao nao
-- esta vigiando — esta decorando.
--
-- Passa a reportar publicacao, e o silencio vira alerta: sem peca ha mais de
-- 48h, o item aparece dizendo isso em vez de sumir por falta de dado.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_ordem_bloco_mkt(p_dia date)
RETURNS TABLE (titulo text, porque text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, mkt
AS $$
  WITH p AS (
    SELECT max(created_at) AS ultima,
           count(*) FILTER (WHERE created_at > now() - interval '24 hours') AS d1,
           count(*) FILTER (WHERE created_at > now() - interval '7 days')   AS d7
      FROM mkt.publications
  ), f AS (
    SELECT count(*) FILTER (WHERE status = 'atrasado')  AS atrasados,
           count(*) FILTER (WHERE status = 'erro')      AS erros
      FROM mkt.publish_jobs
  )
  SELECT
    CASE
      WHEN p.ultima IS NULL OR p.ultima < now() - interval '48 hours'
        THEN 'MKT sem publicar ha ' ||
             coalesce((extract(epoch FROM now() - p.ultima) / 3600)::int::text || 'h', 'muito tempo')
      ELSE 'MKT publicou ' || p.d1 || ' peca(s) em 24h'
    END,
    CASE
      WHEN p.ultima IS NULL OR p.ultima < now() - interval '48 hours'
        THEN 'A esteira deveria publicar todo dia. Silencio prolongado ja aconteceu por falha muda '
             || '(fila travada em 2026-08-03, 11 dias parada). Conferir o painel de robos do MKT.'
      ELSE p.d7 || ' na semana. Ultima em ' || to_char(p.ultima, 'DD/MM HH24:MI') || '. '
           || 'Fila: ' || f.atrasados || ' atrasado(s), ' || f.erros || ' com erro.'
    END
  FROM p, f;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_ordem_bloco_mkt(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_ordem_bloco_mkt(date) TO authenticated, service_role;

-- ─── liga no gerador, como 3o item do bloco maquina ───
CREATE OR REPLACE FUNCTION public.fn_ordem_maquina_mkt(p_dia date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops
AS $$
BEGIN
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
  SELECT p_dia, 'maquina', 3, m.titulo, m.porque, 'maquina', 'funil', 'mkt.publications'
    FROM public.fn_ordem_bloco_mkt(p_dia) m
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_ordem_maquina_mkt(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_ordem_maquina_mkt(date) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
