-- ============================================================
-- 057 — Fase B: a ordem do dia (o app deixa de ser lugar que se consulta)
-- ============================================================
-- Problema: o trabalho da empresa vive em 3 lugares que nao se falam —
-- ops.roadmap_tasks (8 abertas), ops.backlog_items (49 abertos) e o arquivo
-- Cockpit/pendencias-humano.md (137 abertos). 194 itens, 3 esquemas de
-- prioridade independentes, e nenhum deles sabe da existencia dos outros.
-- Nenhuma lista consegue responder "o que eu faco agora?".
--
-- Desenho: a ordem IMPOE, nao sugere. Item so sai da lista cumprido ou
-- justificado — e a justificativa vira registro. Sem isso o app volta a ser
-- mural.
--
-- Blocos, em ordem que nao e estetica:
--   trava   = o que apaga a empresa se ignorado (LGPD, billing, prazo vencido)
--   gate    = o que destrava a fase atual
--   maquina = o que ja rodou sozinho; voce so confere
-- ============================================================

-- ─── Pendencias humanas viram dado (hoje vivem so em markdown) ───
CREATE TABLE IF NOT EXISTS ops.pendencias_humanas (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  titulo       text NOT NULL,
  porque       text,
  severidade   smallint NOT NULL DEFAULT 2,   -- 1 = apaga a empresa, 2 = importante, 3 = quando der
  area         text,
  prazo        date,
  fonte        text,                          -- de onde veio (ex.: Cockpit/pendencias-humano.md)
  status       text NOT NULL DEFAULT 'aberta', -- aberta | resolvida | descartada
  resolvida_em timestamptz,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  deleted_at   timestamptz,
  CONSTRAINT pendencia_severidade_valida CHECK (severidade BETWEEN 1 AND 3),
  CONSTRAINT pendencia_status_valido CHECK (status IN ('aberta','resolvida','descartada'))
);

ALTER TABLE ops.pendencias_humanas ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS pendencias_staff_all ON ops.pendencias_humanas;
CREATE POLICY pendencias_staff_all ON ops.pendencias_humanas
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
GRANT SELECT, INSERT, UPDATE ON ops.pendencias_humanas TO authenticated;

-- ─── A ordem do dia ───
CREATE TABLE IF NOT EXISTS ops.ordem_do_dia (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dia            date NOT NULL DEFAULT current_date,
  bloco          text NOT NULL,               -- trava | gate | maquina
  posicao        smallint NOT NULL DEFAULT 0,
  titulo         text NOT NULL,
  porque         text,                        -- a razao aparece junto da ordem, sempre
  dono           text NOT NULL DEFAULT 'humano',  -- humano | maquina
  origem_tipo    text NOT NULL,               -- roadmap | backlog | pendencia | funil | gate
  origem_id      uuid,
  origem_ref     text,
  estado         text NOT NULL DEFAULT 'aberto',  -- aberto | cumprido | justificado
  justificativa  text,
  cumprido_em    timestamptz,
  gerado_em      timestamptz NOT NULL DEFAULT now(),
  created_at     timestamptz NOT NULL DEFAULT now(),
  updated_at     timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT ordem_bloco_valido  CHECK (bloco IN ('trava','gate','maquina')),
  CONSTRAINT ordem_dono_valido   CHECK (dono IN ('humano','maquina')),
  CONSTRAINT ordem_estado_valido CHECK (estado IN ('aberto','cumprido','justificado')),
  -- a ordem impoe: so sai justificada COM justificativa escrita
  CONSTRAINT ordem_justificativa_obrigatoria
    CHECK (estado <> 'justificado' OR (justificativa IS NOT NULL AND length(btrim(justificativa)) > 3)),
  CONSTRAINT ordem_sem_duplicata UNIQUE (dia, bloco, titulo)
);

CREATE INDEX IF NOT EXISTS idx_ordem_dia ON ops.ordem_do_dia(dia DESC, bloco, posicao);

ALTER TABLE ops.ordem_do_dia ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ordem_staff_all ON ops.ordem_do_dia;
CREATE POLICY ordem_staff_all ON ops.ordem_do_dia
  FOR ALL TO authenticated USING (public.is_staff()) WITH CHECK (public.is_staff());
GRANT SELECT, INSERT, UPDATE ON ops.ordem_do_dia TO authenticated;

-- ─── Views publicas (schema `ops` esta exposto; mantemos o padrao v_*) ───
CREATE OR REPLACE VIEW public.v_ops_ordem_do_dia AS
SELECT id, dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref,
       estado, justificativa, cumprido_em, gerado_em
FROM ops.ordem_do_dia
ORDER BY dia DESC,
         CASE bloco WHEN 'trava' THEN 1 WHEN 'gate' THEN 2 ELSE 3 END,
         posicao;

ALTER VIEW public.v_ops_ordem_do_dia SET (security_invoker = true);
REVOKE ALL ON public.v_ops_ordem_do_dia FROM anon;
GRANT SELECT ON public.v_ops_ordem_do_dia TO authenticated;

CREATE OR REPLACE VIEW public.v_ops_pendencias_humanas AS
SELECT id, titulo, porque, severidade, area, prazo, fonte, status
FROM ops.pendencias_humanas
WHERE deleted_at IS NULL
ORDER BY severidade, prazo NULLS LAST;

ALTER VIEW public.v_ops_pendencias_humanas SET (security_invoker = true);
REVOKE ALL ON public.v_ops_pendencias_humanas FROM anon;
GRANT SELECT ON public.v_ops_pendencias_humanas TO authenticated;

-- ─── Fechar item: cumprir ou justificar (a unica saida) ───
CREATE OR REPLACE FUNCTION public.fn_ordem_fechar(
  p_id            uuid,
  p_estado        text,
  p_justificativa text DEFAULT NULL
) RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'sem permissao';
  END IF;
  IF p_estado NOT IN ('cumprido','justificado') THEN
    RAISE EXCEPTION 'estado deve ser cumprido ou justificado';
  END IF;
  IF p_estado = 'justificado' AND (p_justificativa IS NULL OR length(btrim(p_justificativa)) <= 3) THEN
    RAISE EXCEPTION 'justificar exige escrever o motivo';
  END IF;

  UPDATE ops.ordem_do_dia
     SET estado        = p_estado,
         justificativa = CASE WHEN p_estado = 'justificado' THEN p_justificativa ELSE justificativa END,
         cumprido_em   = now(),
         updated_at    = now()
   WHERE id = p_id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_ordem_fechar(uuid,text,text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_ordem_fechar(uuid,text,text) TO authenticated;

NOTIFY pgrst, 'reload schema';
