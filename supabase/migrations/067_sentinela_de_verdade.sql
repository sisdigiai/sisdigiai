-- ============================================================
-- 067 — Frota, agente 3: a sentinela de verdade
-- ============================================================
-- Os agentes 1 e 2 vigiam dominios especificos (fatos publicaveis, gate de fase).
-- Este vigia o painel contra si mesmo: procura numero que nao bate entre fontes,
-- espelho que parou de sincronizar e rotina que deixou de rodar.
--
-- Nasceu de um dia inteiro achando exatamente isso: o Dashboard mostrando queda
-- de 94,6% no burn que era junho incompleto; tres representacoes do mesmo custo
-- discordando entre si; um espelho parado 13 dias com a agenda parecendo viva.
-- Todos silenciosos. Nenhum apareceu como erro — apareceram como numero bonito.
--
-- Cada achado tem gravidade e diz o que fazer. A sentinela NAO conserta: ela
-- acusa. Consertar sozinho o que ela nao entende seria como o incidente da R-032.
-- ============================================================

CREATE OR REPLACE FUNCTION public.fn_sentinela_verdade()
RETURNS TABLE (gravidade text, achado text, detalhe text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, ops, mkt, finance, company
AS $$
  -- 1) Espelho de custo parado
  SELECT 'alta', 'Espelho de custo parado',
         'Ultima sincronizacao ha ' ||
         extract(day FROM now() - max(sincronizado_em))::int || ' dia(s). O cron das 04:20 '
         || 'deveria rodar diariamente — se parou, o custo da tela e de outro mes.'
    FROM finance.infra_costs
   HAVING max(sincronizado_em) < now() - interval '36 hours'

  UNION ALL
  -- 2) As duas fontes de custo discordando
  SELECT 'alta', 'Custo de infra em duas fontes divergentes',
         'Assinaturas somam R$ ' || translate(to_char(s.mensal, 'FM999G999D00'), ',.', '.,')
         || '/mes; o espelho do Finance mostra R$ ' || translate(to_char(e.mensal, 'FM999G999D00'), ',.', '.,')
         || '/mes de media nos meses fechados. Diferenca de ' || round(abs(e.mensal - s.mensal) / nullif(s.mensal,0) * 100)
         || '%. Uma das duas esta errada na tela do dono.'
    FROM (SELECT COALESCE(sum(monthly_amount_brl),0) mensal FROM finance.subscriptions WHERE ended_on IS NULL) s,
         (SELECT COALESCE(avg(t),0) mensal FROM (
            SELECT sum(cost_brl) t FROM finance.infra_costs WHERE NOT parcial GROUP BY month
          ) x) e
   WHERE s.mensal > 0 AND e.mensal > 0
     AND abs(e.mensal - s.mensal) / s.mensal > 0.4

  UNION ALL
  -- 3) Base de despesas envelhecida (o extrato e a fonte da verdade)
  SELECT 'media', 'Despesas sem importacao recente',
         'Ultimo lancamento inserido ha ' || (current_date - max(created_at)::date) || ' dias. '
         || 'Total Investido e Burn de Caixa saem daqui — numero velho vira decisao errada.'
    FROM finance.expenses
   WHERE deleted_at IS NULL
   HAVING (current_date - max(created_at)::date) > 30

  UNION ALL
  -- 4) Fato publicavel divergindo da fonte (agente 1 mediu; a sentinela cobra)
  SELECT 'media', 'Fato publicavel divergente da fonte',
         count(*) || ' fato(s) com numero que a fonte nao sustenta mais. '
         || 'Enquanto nao for renovado ou reescrito pelo MKT, a IA fica silenciada neles.'
    FROM public.v_ops_fatos_verificados
   WHERE veredito = 'divergente'
  HAVING count(*) > 0

  UNION ALL
  -- 5) A ordem do dia nao nasceu
  SELECT 'alta', 'Ordem do dia nao gerada hoje',
         'Nenhum item para ' || current_date || '. O cron das 04:40 falhou, e o dono abriu '
         || 'o painel sem ordem — que e o mesmo que nao ter painel.'
   -- so cobra DEPOIS do horario do cron (04:40 UTC), senao acusa todo dia entre
   -- a virada do dia e a madrugada, quando a ausencia e legitima
   WHERE now()::time > TIME '06:00'
     AND NOT EXISTS (SELECT 1 FROM ops.ordem_do_dia WHERE dia = current_date)

  UNION ALL
  -- 6) Fila de travas represada
  SELECT 'media', 'Fila de travas represada',
         count(*) || ' pendencias severidade 1 abertas. A ordem so mostra 5 por dia — '
         || 'acima de 8 o teto vira represa e o resto nunca chega na tela.'
    FROM ops.pendencias_humanas
   WHERE deleted_at IS NULL AND status = 'aberta' AND severidade = 1
  HAVING count(*) > 8;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_sentinela_verdade() FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_sentinela_verdade() TO authenticated, service_role;

-- ─── A sentinela entra na ordem: achado de gravidade alta vira TRAVA ───
CREATE OR REPLACE FUNCTION public.fn_ordem_sentinela(p_dia date)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, ops
AS $$
BEGIN
  INSERT INTO ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref)
  SELECT p_dia,
         CASE WHEN s.gravidade = 'alta' THEN 'trava' ELSE 'maquina' END,
         CASE WHEN s.gravidade = 'alta' THEN 50 ELSE 6 END,
         'Sentinela: ' || s.achado,
         s.detalhe,
         'humano', 'sentinela', 'fn_sentinela_verdade'
    FROM public.fn_sentinela_verdade() s
  ON CONFLICT (dia, bloco, titulo) DO NOTHING;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.fn_ordem_sentinela(date) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.fn_ordem_sentinela(date) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
