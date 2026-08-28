-- ============================================================
-- 084 — conserta a view do inventário que EU quebrei na 082
-- ============================================================
-- A 082 recriou `v_ops_contas_servicos` com `security_invoker = true`, copiando o
-- padrão da casa sem conferir se ESTA view o usava. Ela não usava: `reloptions` era
-- nulo, ou seja, rodava com os direitos do dono.
--
-- Consequência imediata, vista na tela em produção:
--     "Não foi possível ler o inventário: permission denied for table contas_servicos"
--
-- Porque `ops.contas_servicos` só concede SELECT a `postgres` e `service_role` —
-- `authenticated` nunca teve grant direto, e nem deve ter: é justamente a view que
-- filtra `ativo` e serve de contrato de leitura.
--
-- Com `security_invoker = true` a view passou a executar com as permissões de quem
-- chama, e o usuário logado não tem nenhuma sobre a tabela. Sem a opção, executa com
-- as do dono, que é o desenho original e o que funcionava.
--
-- Por que não resolvi dando GRANT em `ops.contas_servicos` para `authenticated`:
-- seria abrir a tabela inteira, incluindo linhas inativas e `secret_ref`, para
-- contornar um problema que eu mesmo criei. A view existe para ser a fronteira.
--
-- Lição registrada: padrão da casa se confirma antes de aplicar. `security_invoker`
-- não é decoração — muda quem executa a consulta, e as views irmãs desta divergem
-- justamente porque leem tabelas com grants diferentes.
-- ============================================================

CREATE OR REPLACE VIEW public.v_ops_contas_servicos AS
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

-- `CREATE OR REPLACE` mantém reloptions anteriores; remove explicitamente.
ALTER VIEW public.v_ops_contas_servicos RESET (security_invoker);

REVOKE ALL ON public.v_ops_contas_servicos FROM anon;
GRANT SELECT ON public.v_ops_contas_servicos TO authenticated;

NOTIFY pgrst, 'reload schema';
