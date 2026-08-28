-- ============================================================
-- 082 — `empresa_slug` na view do inventário
-- ============================================================
-- A `v_ops_contas_servicos` não expunha a empresa dona do ativo. Isso passou a doer com
-- a chegada da Polá Petit: o inventário virou multiempresa (digiai, mello e suas 4 lojas,
-- mello-matriz, lancaster, pulso, pessoal, nipo, polapetit) e a tela não tinha como dizer
-- de quem é cada linha. Sem isso, "Polá Petit" e "Óticas Taty Mello - Perus" ficam
-- indistinguíveis de qualquer outro ativo numa lista de 70+.
--
-- Só acrescenta coluna. Nada removido, nada renomeado — a ordem das existentes é
-- preservada para não quebrar quem já lê a view.
-- ============================================================

CREATE OR REPLACE VIEW public.v_ops_contas_servicos
WITH (security_invoker = true) AS
SELECT
  id,
  servico,
  identificador,
  conta_dona,
  navegador,
  produtos,
  plano,
  custo_mensal,
  moeda,
  vencimento_dia,
  renova_em,
  secret_ref,
  status,
  ultima_verificacao,
  ultimo_detalhe,
  dono_humano,
  url_painel,
  obs,
  CASE
    WHEN renova_em IS NOT NULL THEN renova_em - CURRENT_DATE
    ELSE NULL::integer
  END AS dias_para_renovar,
  ultima_verificacao IS NULL OR ultima_verificacao < (now() - '3 days'::interval) AS verificacao_velha,
  empresa_slug,
  categoria,
  situacao
FROM ops.contas_servicos
WHERE ativo
ORDER BY (status = ANY (ARRAY['quebrado'::text, 'pausado'::text, 'atencao'::text])) DESC,
         empresa_slug, servico, identificador;

REVOKE ALL ON public.v_ops_contas_servicos FROM anon;
GRANT SELECT ON public.v_ops_contas_servicos TO authenticated;

NOTIFY pgrst, 'reload schema';
