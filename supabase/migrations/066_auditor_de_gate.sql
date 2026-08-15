-- ============================================================
-- 066 — Frota, agente 2: o auditor de gate (e a Fase G, o laco fechando)
-- ============================================================
-- O incidente que originou isto: as Fases 0 e 1 foram fechadas no mesmo dia,
-- 18/06/2026, e a Fase 1 nunca teve `decision_gate_met_at` preenchido. A metrica
-- era "20 alunos pagantes (>= R$ 2.000 MRR)" e o dado dizia ZERO vendas. O app
-- deixou passar porque fechar fase era um UPDATE como qualquer outro.
--
-- Duas partes:
--
-- 1) EVIDENCIA — fn_gate_evidencia() mede a metrica da fase atual contra o dado
--    real (receita, assinantes, clientes pagantes que nao sejam do proprio grupo).
--    O painel passa a saber, sozinho, se a fase pode fechar.
--
-- 2) TRAVA — trigger que RECUSA marcar completed_at sem gate cumprido. Tem duas
--    saidas honestas, e so duas: gate batido (decision_gate_met_at preenchido) ou
--    descontinuacao declarada por escrito nas notas. Fechar no silencio deixa de
--    ser possivel.
--
-- A trava e deliberadamente chata. Foi o silencio que custou 56 dias de execucao
-- sobre um alicerce que nao existia.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_gate_evidencia(p_fase integer DEFAULT NULL)
RETURNS TABLE (
  fase            integer,
  metrica         text,
  clientes_pagantes integer,
  receita_brl     numeric,
  assinantes      integer,
  gate_cumprido   boolean,
  veredito        text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, ops, finance, billing
AS $$
  WITH alvo AS (
    SELECT phase_number, metrica_unica
      FROM ops.roadmap_phases
     WHERE phase_number = COALESCE(p_fase, (
             SELECT min(phase_number) FROM ops.roadmap_phases
              WHERE started_at IS NOT NULL AND completed_at IS NULL))
  ), medido AS (
    SELECT
      -- cliente pagante de verdade: exclui o proprio grupo (validacao de
      -- cliente-zero nao e validacao de mercado)
      (SELECT count(*)::int FROM ops.commercial_leads
        WHERE stage = 'cliente' AND deleted_at IS NULL
          AND company !~* 'mello|lancaster|digiai')                    AS clientes,
      (SELECT COALESCE(sum(mrr_brl + one_time_brl), 0) FROM finance.revenue) AS receita,
      (SELECT count(*)::int FROM billing.subscribers)                  AS assin
  )
  SELECT a.phase_number, a.metrica_unica, m.clientes, m.receita, m.assin,
         (m.clientes > 0 OR m.receita > 0 OR m.assin > 0),
         CASE
           WHEN m.clientes > 0 OR m.receita > 0 OR m.assin > 0
             THEN 'Gate sustentado pelo dado: ' || m.clientes || ' cliente(s) externo(s), R$ '
                  || translate(to_char(m.receita, 'FM999G999D00'), ',.', '.,') || ' de receita, '
                  || m.assin || ' assinante(s).'
           ELSE 'Gate NAO sustentado: zero cliente externo, zero receita, zero assinante. '
                || 'A metrica da fase e "' || a.metrica_unica || '".'
         END
    FROM alvo a, medido m;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_gate_evidencia(integer) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_gate_evidencia(integer) TO authenticated, service_role;

-- ─── A trava: fase nao fecha no silencio ───
CREATE OR REPLACE FUNCTION ops.fn_trava_fechamento_de_fase()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- so age quando a fase esta SENDO fechada agora
  IF NEW.completed_at IS NOT NULL AND OLD.completed_at IS NULL THEN
    IF NEW.decision_gate_met_at IS NULL
       AND COALESCE(NEW.notes, '') !~* 'DESCONTINUADA POR DECISAO' THEN
      RAISE EXCEPTION USING
        ERRCODE = 'check_violation',
        MESSAGE = 'Fase ' || NEW.phase_number || ' nao pode ser fechada sem gate.',
        DETAIL  = 'A metrica e: ' || COALESCE(NEW.metrica_unica, '(sem metrica)'),
        HINT    = 'Ou preencha decision_gate_met_at (o dado sustenta o fechamento), '
               || 'ou escreva "DESCONTINUADA POR DECISAO" nas notas explicando por que '
               || 'a fase deixa de existir. Foi assim que a Fase 1 fechou com 0 de 20 '
               || 'alunos pagantes em 18/06/2026.';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_trava_fechamento_de_fase ON ops.roadmap_phases;
CREATE TRIGGER trg_trava_fechamento_de_fase
  BEFORE UPDATE ON ops.roadmap_phases
  FOR EACH ROW EXECUTE FUNCTION ops.fn_trava_fechamento_de_fase();

-- ─── O auditor entra na ordem do dia ───
CREATE OR REPLACE FUNCTION public.fn_ordem_maquina_gate(p_dia date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops
AS $$
BEGIN
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
  SELECT p_dia, 'maquina', 5,
         CASE WHEN g.gate_cumprido
              THEN 'Gate da Fase ' || g.fase || ': sustentado pelo dado'
              ELSE 'Gate da Fase ' || g.fase || ': ainda nao sustentado' END,
         g.veredito || ' O fechamento da fase esta travado no banco ate isto mudar.',
         'maquina', 'gate', 'ops.roadmap_phases'
    FROM public.fn_gate_evidencia() g
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_ordem_maquina_gate(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_ordem_maquina_gate(date) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
