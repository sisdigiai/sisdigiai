-- ============================================================
-- 069 — Placar da tela Hoje + a sentinela passa a vigiar SEO
-- ============================================================
-- PARTE 1 — o placar. A consolidacao da Fase F funde Visao, Semana, Roadmap,
-- Lista Mestra e Backlog na tela Hoje. Os 4 KPIs da Visao viram 4 numeros, e a
-- serie de MRR fica (decisao do dono em 15/08) — mas como sparkline dentro do
-- placar, nao como bloco proprio desenhando uma reta em zero.
--
-- PARTE 2 — SEO. Descoberto em 15/08: o modulo MarketingSEO NAO existe mais no
-- app (nao esta em src/modules nem roteado), mas a infra continua viva —
-- company.seo_sites com 2 dominios ativos e as edges marketing-sync-*. Cloudflare
-- e Bing entregaram dado hoje; GSC e sitemap pararam em 22/06, quase 2 meses, e
-- ninguem percebeu porque a tela que mostraria isso deixou de existir.
-- Mesmo padrao do dia inteiro: motor roda, painel nao olha, silencio vira normal.
-- ============================================================

CREATE OR REPLACE VIEW public.v_ops_placar_hoje AS
WITH fase AS (
  SELECT phase_number, nome, metrica_unica
    FROM ops.roadmap_phases
   WHERE started_at IS NOT NULL AND completed_at IS NULL
   ORDER BY phase_number LIMIT 1
), elo AS (
  SELECT t.title, t.target_date,
         (SELECT count(*) FROM ops.roadmap_tasks x
           WHERE x.phase_number = t.phase_number AND x.deleted_at IS NULL) AS total,
         (SELECT count(*) FROM ops.roadmap_tasks y
           WHERE y.phase_number = t.phase_number AND y.deleted_at IS NULL
             AND y.completed_at IS NOT NULL) + 1 AS numero
    FROM ops.roadmap_tasks t, fase f
   WHERE t.phase_number = f.phase_number AND t.deleted_at IS NULL AND t.completed_at IS NULL
   ORDER BY t.target_date NULLS LAST, t.display_order LIMIT 1
), dinheiro AS (
  SELECT
    (SELECT COALESCE(sum(mrr_brl + one_time_brl), 0) FROM finance.revenue)                 AS caixa,
    -- media dos 3 ULTIMOS meses fechados, nao de todos: a media historica e
    -- diluida pelos meses baratos do inicio e subestima o gasto de hoje.
    -- Mesmo criterio da aba Infra, para as duas telas nao discordarem.
    (SELECT COALESCE(avg(t), 0) FROM (
        SELECT sum(cost_brl) t FROM finance.infra_costs WHERE NOT parcial
         GROUP BY month ORDER BY month DESC LIMIT 3
     ) x)                                                                                  AS custo_mes,
    (SELECT count(*)::int FROM ops.commercial_leads
      WHERE stage = 'cliente' AND deleted_at IS NULL
        AND company !~* 'mello|lancaster|digiai')                                          AS pagantes
)
SELECT
  f.phase_number                                   AS fase,
  f.nome                                           AS fase_nome,
  f.metrica_unica                                  AS metrica,
  e.title                                          AS elo_titulo,
  e.numero                                         AS elo_numero,
  e.total                                          AS elo_total,
  e.target_date                                    AS elo_prazo,
  (e.target_date - current_date)                   AS elo_dias,
  d.caixa, d.custo_mes, d.pagantes,
  (SELECT gate_cumprido FROM public.fn_gate_evidencia())    AS gate_ok,
  (SELECT veredito      FROM public.fn_gate_evidencia())    AS gate_veredito,
  -- serie de MRR para o sparkline (decisao: mantido)
  (SELECT COALESCE(json_agg(json_build_object('mes', to_char(s.month,'MM/YY'), 'mrr', s.mrr_total_brl)
                            ORDER BY s.month), '[]'::json)
     FROM (SELECT month, mrr_total_brl FROM company.financial_snapshots
            ORDER BY month DESC LIMIT 12) s)       AS mrr_serie
FROM fase f
LEFT JOIN elo e ON true
CROSS JOIN dinheiro d;

ALTER VIEW public.v_ops_placar_hoje SET (security_invoker = true);
REVOKE ALL ON public.v_ops_placar_hoje FROM anon;
GRANT SELECT ON public.v_ops_placar_hoje TO authenticated;

-- ─── PARTE 2: a sentinela passa a olhar SEO ───
CREATE OR REPLACE FUNCTION public.fn_sentinela_seo()
RETURNS TABLE (gravidade text, achado text, detalhe text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, company
AS $$
  SELECT 'media',
         'Fonte de SEO parada: ' || m.source,
         'Sem dado novo ha ' || (current_date - max(m.created_at)::date) || ' dias em '
         || (SELECT count(*) FROM company.seo_sites WHERE active) || ' site(s) ativo(s). '
         || 'A coleta e automatica; se parou, o dominio pode estar caindo de indexacao sem aviso.'
    FROM company.metrics m
   WHERE m.source IN ('gsc','bing','cloudflare','sitemap')
   GROUP BY m.source
  HAVING (current_date - max(m.created_at)::date) > 7;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_sentinela_seo() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_sentinela_seo() TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.fn_ordem_sentinela_seo(p_dia date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops
AS $$
BEGIN
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
  SELECT p_dia, 'maquina', 7, 'Sentinela: ' || s.achado, s.detalhe,
         'humano', 'sentinela', 'company.metrics'
    FROM public.fn_sentinela_seo() s
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_ordem_sentinela_seo(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_ordem_sentinela_seo(date) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
