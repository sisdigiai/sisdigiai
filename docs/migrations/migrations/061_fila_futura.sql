-- ============================================================
-- 061 — A fila passa a olhar para frente
-- ============================================================
-- Decisao do dono (2026-08-14): "nossa fila vai ser futura e nao passada, para
-- liberar tudo de uma vez". A execucao de verdade comeca segunda, 17/08/2026.
--
-- Problema: as 8 tarefas da Fase 2 tinham datas de junho e julho. A ordem do dia
-- nascia acusando — "atrasado ha 56 dias", "prazo vencido ha 11 dias". Atraso
-- passado nao e informacao acionavel: e culpa. O que muda o dia e saber o que
-- vence, nao ha quanto tempo se falhou.
--
-- Duas mudancas:
--   1) A corrente da Fase 2 e reagendada a partir de 17/08, respeitando a
--      dependencia real (reuniao -> demo -> fechar -> onboarding -> medir).
--      O decision gate de 30/09 e mantido: e a data que o dono se deu.
--   2) O gerador passa a falar em prazo ("vence em X dias", "vence hoje"), e
--      so diz "vencido" quando o item ja passou da data NOVA.
-- ============================================================

-- ─── 1) Reagendamento da corrente, a partir da segunda ───
UPDATE ops.roadmap_tasks SET target_date = DATE '2026-08-19', updated_at = now()
 WHERE phase_number = 2 AND display_order = 1 AND completed_at IS NULL;  -- 1a reuniao (qua)

UPDATE ops.roadmap_tasks SET target_date = DATE '2026-08-20', updated_at = now()
 WHERE phase_number = 2 AND display_order = 3 AND completed_at IS NULL;  -- abordar oticas quentes (paralelo)

UPDATE ops.roadmap_tasks SET target_date = DATE '2026-08-24', updated_at = now()
 WHERE phase_number = 2 AND display_order = 2 AND completed_at IS NULL;  -- pitch/demo ao 1o prospect

UPDATE ops.roadmap_tasks SET target_date = DATE '2026-09-01', updated_at = now()
 WHERE phase_number = 2 AND display_order = 4 AND completed_at IS NULL;  -- fechar 1a otica

UPDATE ops.roadmap_tasks SET target_date = DATE '2026-09-04', updated_at = now()
 WHERE phase_number = 2 AND display_order = 5 AND completed_at IS NULL;  -- onboarding < 30 min

UPDATE ops.roadmap_tasks SET target_date = DATE '2026-09-15', updated_at = now()
 WHERE phase_number = 2 AND display_order = 6 AND completed_at IS NULL;  -- documentar uso real

UPDATE ops.roadmap_tasks SET target_date = DATE '2026-09-22', updated_at = now()
 WHERE phase_number = 2 AND display_order = 7 AND completed_at IS NULL;  -- NPS

-- display_order 8 (decision gate, 30/09) fica: e o compromisso que o dono se deu.

UPDATE ops.roadmap_phases
SET notes = concat_ws(E'\n\n', notes,
      '2026-08-14 — corrente reagendada a partir de 17/08/2026 (inicio real da execucao). '
      'As datas antigas (jun/jul) so produziam acusacao de atraso, que nao e acionavel. '
      'O decision gate de 30/09 foi mantido: e o compromisso do dono, e encurtar o prazo '
      'seria trocar honestidade por conforto.'),
    updated_at = now()
WHERE phase_number = 2;

-- ─── 2) O gerador fala em prazo, nao em culpa ───
CREATE OR REPLACE FUNCTION public.fn_gerar_ordem_do_dia(p_dia date DEFAULT current_date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops, mkt, finance
AS $$
DECLARE
  v_fase   integer;
  v_n      integer := 0;
  v_travas integer;
  v_teto   constant integer := 5;
BEGIN
  DELETE FROM ops.ordem_do_dia WHERE dia = p_dia AND estado = 'aberto';

  SELECT phase_number INTO v_fase
    FROM ops.roadmap_phases
   WHERE started_at IS NOT NULL AND completed_at IS NULL
   ORDER BY phase_number LIMIT 1;

  SELECT count(*) INTO v_travas
    FROM ops.pendencias_humanas
   WHERE deleted_at IS NULL AND status = 'aberta' AND severidade = 1;

  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref)
  SELECT p_dia, 'trava', row_number() OVER (ORDER BY p.prazo NULLS LAST, p.created_at),
         p.titulo,
         coalesce(p.porque, '') ||
           CASE
             WHEN p.prazo IS NULL THEN ''
             WHEN p.prazo < p_dia  THEN ' Passou do prazo em ' || to_char(p.prazo, 'DD/MM') || '.'
             WHEN p.prazo = p_dia  THEN ' Vence hoje.'
             ELSE ' Vence em ' || (p.prazo - p_dia) || ' dias.'
           END,
         'humano', 'pendencia', p.id, p.fonte
    FROM ops.pendencias_humanas p
   WHERE p.deleted_at IS NULL AND p.status = 'aberta' AND p.severidade = 1
   ORDER BY p.prazo NULLS LAST, p.created_at
   LIMIT v_teto
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;

  IF v_travas > v_teto THEN
    INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
    VALUES (p_dia, 'trava', 99,
      '+' || (v_travas - v_teto) || ' travas fora da ordem de hoje',
      'A ordem mostra as ' || v_teto || ' mais urgentes de ' || v_travas || ' pendencias severidade 1. '
      'Se essa fila nao encurtar, o teto vira represa — vale reclassificar ou resolver em lote.',
      'humano', 'pendencia', 'ops.pendencias_humanas')
    ON CONFLICT (dia, bloco, titulo) DO NOTHING;
  END IF;

  -- GATE: o elo da vez, falando em prazo
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref)
  SELECT p_dia, 'gate', 1, t.title,
         'Fase ' || v_fase || ': elo ' ||
         (SELECT count(*) FROM ops.roadmap_tasks y
           WHERE y.phase_number = v_fase AND y.deleted_at IS NULL AND y.completed_at IS NOT NULL) + 1 ||
         ' de ' ||
         (SELECT count(*) FROM ops.roadmap_tasks x WHERE x.phase_number = v_fase AND x.deleted_at IS NULL) ||
         '. ' ||
         CASE
           WHEN t.target_date IS NULL   THEN 'Sem data marcada.'
           WHEN t.target_date < p_dia   THEN 'Passou do prazo em ' || to_char(t.target_date, 'DD/MM') || '.'
           WHEN t.target_date = p_dia   THEN 'Vence hoje.'
           ELSE 'Vence em ' || (t.target_date - p_dia) || ' dias (' || to_char(t.target_date, 'DD/MM') || ').'
         END ||
         ' As demais tarefas da fase dependem desta.',
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
