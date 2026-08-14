-- ============================================================
-- 058 — O gerador da ordem do dia
-- ============================================================
-- Regra de ouro: a ordem tem que ser CURTA. Se listar os 194 itens abertos,
-- reproduz o problema que veio resolver. Por isso ha teto por bloco, e o
-- criterio de corte e explicito:
--
--   trava   — TODAS as pendencias severidade 1 (deveriam ser poucas; se forem
--             muitas, o problema e real e precisa aparecer inteiro)
--   gate    — SO o primeiro elo aberto da fase atual + ate 2 criticos do backlog.
--             As 8 tarefas da Fase 2 sao uma corrente: mostrar as 5 atrasadas
--             sugere 5 problemas quando ha 1, e as outras esperam por ele.
--   maquina — o que rodou sozinho nas ultimas 24h; o dono so confere.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_gerar_ordem_do_dia(p_dia date DEFAULT current_date)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops, mkt, finance
AS $$
DECLARE
  v_fase   integer;
  v_n      integer := 0;
BEGIN
  -- nao regenera o que ja foi trabalhado hoje
  DELETE FROM ops.ordem_do_dia WHERE dia = p_dia AND estado = 'aberto';

  SELECT phase_number INTO v_fase
    FROM ops.roadmap_phases
   WHERE started_at IS NOT NULL AND completed_at IS NULL
   ORDER BY phase_number LIMIT 1;

  -- ── TRAVA: o que apaga a empresa ──
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref)
  SELECT p_dia, 'trava', row_number() OVER (ORDER BY p.prazo NULLS LAST, p.created_at),
         p.titulo,
         coalesce(p.porque, '') ||
           CASE WHEN p.prazo IS NOT NULL AND p.prazo < p_dia
                THEN ' Prazo vencido ha ' || (p_dia - p.prazo) || ' dias.' ELSE '' END,
         'humano', 'pendencia', p.id, p.fonte
    FROM ops.pendencias_humanas p
   WHERE p.deleted_at IS NULL AND p.status = 'aberta' AND p.severidade = 1
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;

  -- ── GATE: o elo unico que destrava a fase ──
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

  -- ── MAQUINA: o que rodou sozinho ──
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
  SELECT p_dia, 'maquina', 1,
         'Custo de infra sincronizado do Finance',
         'Espelho da conta 7.4: ' || count(*) || ' linhas, R$ ' ||
         -- to_char usa o lc_numeric do servidor (en_US): troca manual para pt-BR
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

REVOKE EXECUTE ON FUNCTION public.fn_gerar_ordem_do_dia(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_gerar_ordem_do_dia(date) TO authenticated, service_role;

-- ─── Semente: as travas severidade 1 que hoje so vivem em markdown ───
INSERT INTO ops.pendencias_humanas (titulo, porque, severidade, area, prazo, fonte)
SELECT * FROM (VALUES
  ('Apagar o repositorio mellooticas/normalizacao_clientes no GitHub',
   'A branch padrao tem 718 arquivos com dado real de cliente; o clientes_lookup.csv sozinho traz nome, CPF e telefone de 12.368 pessoas. Repo e privado, entao a exposicao esta contida — mas o dado nao deveria estar la. Irreversivel, por isso e humano.',
   1::smallint, 'lgpd', NULL::date, 'Cockpit/pendencias-humano.md'),
  ('Restaurar o qual-foto',
   'Marcado como URGENTE com prazo final em 03/08/2026 e segue aberto.',
   1::smallint, 'infra', DATE '2026-08-03', 'Cockpit/pendencias-humano.md'),
  ('Decidir o destino da R-020 (helper de credencial git)',
   'A regra manda todo app ter scripts/git-credential-env.sh + .env com GITHUB_TOKEN. A varredura de 13/08 mostrou que esse padrao causou bloqueio total de push e espalhou 8 arquivos .env com token em texto puro. Regra dura so muda por decisao do dono (ADR).',
   1::smallint, 'governanca', NULL::date, 'Cockpit/pendencias-humano.md')
) AS v(titulo, porque, severidade, area, prazo, fonte)
WHERE NOT EXISTS (SELECT 1 FROM ops.pendencias_humanas WHERE titulo = v.titulo);

NOTIFY pgrst, 'reload schema';
