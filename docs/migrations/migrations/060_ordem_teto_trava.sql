-- ============================================================
-- 060 — Teto no bloco Trava, e o que ficou de fora aparece
-- ============================================================
-- As 137 pendencias humanas sairam do markdown e viraram dado (2026-08-14).
-- Com elas, o bloco "trava" passou de 3 para 13 itens — e uma ordem do dia de
-- 13 travas volta a ser a lista de 194 que ela veio resolver.
--
-- Teto de 5, priorizando prazo vencido. E o excedente NAO some em silencio:
-- entra uma linha dizendo quantas ficaram de fora. Corte escondido faz o painel
-- parecer que cobriu tudo quando nao cobriu.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_gerar_ordem_do_dia(p_dia date DEFAULT current_date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops, mkt, finance
AS $$
DECLARE
  v_fase    integer;
  v_n       integer := 0;
  v_travas  integer;
  v_teto    constant integer := 5;
BEGIN
  DELETE FROM ops.ordem_do_dia WHERE dia = p_dia AND estado = 'aberto';

  SELECT phase_number INTO v_fase
    FROM ops.roadmap_phases
   WHERE started_at IS NOT NULL AND completed_at IS NULL
   ORDER BY phase_number LIMIT 1;

  SELECT count(*) INTO v_travas
    FROM ops.pendencias_humanas
   WHERE deleted_at IS NULL AND status = 'aberta' AND severidade = 1;

  -- ── TRAVA: as 5 mais urgentes ──
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref)
  SELECT p_dia, 'trava', row_number() OVER (ORDER BY p.prazo NULLS LAST, p.created_at),
         p.titulo,
         coalesce(p.porque, '') ||
           CASE WHEN p.prazo IS NOT NULL AND p.prazo < p_dia
                THEN ' Prazo vencido ha ' || (p_dia - p.prazo) || ' dias.' ELSE '' END,
         'humano', 'pendencia', p.id, p.fonte
    FROM ops.pendencias_humanas p
   WHERE p.deleted_at IS NULL AND p.status = 'aberta' AND p.severidade = 1
   ORDER BY p.prazo NULLS LAST, p.created_at
   LIMIT v_teto
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;

  -- o que ficou de fora aparece como item, nao some
  IF v_travas > v_teto THEN
    INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
    VALUES (p_dia, 'trava', 99,
      '+' || (v_travas - v_teto) || ' travas fora da ordem de hoje',
      'A ordem mostra as ' || v_teto || ' mais urgentes de ' || v_travas || ' pendencias severidade 1. '
      'Se essa fila nao encurtar, o teto vira represa — vale reclassificar ou resolver em lote.',
      'humano', 'pendencia', 'ops.pendencias_humanas')
    ON CONFLICT (dia, bloco, titulo) DO NOTHING;
  END IF;

  -- ── GATE ──
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref)
  SELECT p_dia, 'gate', 1, t.title,
         'Fase ' || v_fase || ': primeiro elo aberto de ' ||
         (SELECT count(*) FROM ops.roadmap_tasks x WHERE x.phase_number = v_fase AND x.deleted_at IS NULL) ||
         ' tarefas encadeadas' ||
         CASE WHEN t.target_date < p_dia THEN ', atrasado ha ' || (p_dia - t.target_date) || ' dias' ELSE '' END ||
         '. As demais esperam por este.',
         'humano', 'roadmap', t.id, 'Fase ' || v_fase
    FROM ops.roadmap_tasks t
   WHERE t.phase_number = v_fase AND t.deleted_at IS NULL AND t.completed_at IS NULL
   ORDER BY t.target_date NULLS LAST, t.display_order
   LIMIT 1
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;

  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref)
  SELECT p_dia, 'gate', 1 + row_number() OVER (ORDER BY b.due_date NULLS LAST, b.created_at),
         b.title,
         coalesce(nullif(btrim(b.blocker), ''), 'Critico no backlog (P1), area ' || coalesce(b.area, 'geral') || '.'),
         'humano', 'backlog', b.id, b.area
    FROM ops.backlog_items b
   WHERE b.deleted_at IS NULL AND b.priority = 1
     AND b.status IN ('pending','in_progress','blocked')
   ORDER BY b.due_date NULLS LAST, b.created_at
   LIMIT 2
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;

  -- ── MAQUINA ──
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
  SELECT p_dia, 'maquina', 1,
         'Custo de infra sincronizado do Finance',
         'Espelho da conta 7.4: ' || count(*) || ' linhas, R$ ' ||
         translate(to_char(sum(cost_brl), 'FM999G999D00'), ',.', '.,') || ' acumulado, extrato ate ' ||
         to_char(max(extrato_ate), 'DD/MM'),
         'maquina', 'funil', 'finance.infra_costs'
    FROM finance.infra_costs
   WHERE sincronizado_em > now() - interval '36 hours'
  HAVING count(*) > 0
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;

  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
  SELECT p_dia, 'maquina', 2,
         'Fatos publicaveis: ' || count(*) FILTER (WHERE current_date - verificado_em > validade_dias) || ' vencidos',
         'Fato vencido = IA do MKT silenciada nesse numero. ' ||
         count(*) FILTER (WHERE current_date - verificado_em <= validade_dias) || ' de ' || count(*) ||
         ' seguem frescos.',
         'maquina', 'funil', 'mkt.fatos'
    FROM mkt.fatos
   WHERE publico
  HAVING count(*) FILTER (WHERE current_date - verificado_em > validade_dias) > 0
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;

  SELECT count(*) INTO v_n FROM ops.ordem_do_dia WHERE dia = p_dia;
  RETURN v_n;
END;
$$;

NOTIFY pgrst, 'reload schema';
