-- ============================================================
-- 071 — registra a verificacao do dominio mellooticas.com.br no Meta
-- ============================================================
-- O dono informou em 15/08 que mellooticas.com.br esta verificado no Meta,
-- na BM "Oticas Taty Mello".
--
-- Por que ATUALIZA a linha existente em vez de criar uma nova: `ops.contas_servicos`
-- e a tabela do agente do digiai_mkt (R-032), e o vocabulario dela ja esta
-- estabelecido — os `servico` em uso sao meta_bm, meta_pixel, rede_facebook,
-- rede_instagram, rede_linkedin, rede_tiktok, rede_x. Criar um `meta_dominio_verificado`
-- seria inventar taxonomia na tabela de outro dono.
--
-- Verificacao de dominio e atributo da relacao dominio<->BM, entao mora no `obs`
-- da BM que o verificou. Se o dono quiser verificacoes de dominio como linha de
-- primeira classe, isso e decisao de schema do agente dono da tabela.
-- ============================================================

UPDATE ops.contas_servicos
SET obs = concat_ws(E'\n',
      NULLIF(obs, ''),
      'Dominio verificado: mellooticas.com.br (informado pelo dono em 2026-08-15). '
      || 'O site tambem esta em company.seo_sites (migration 070) com GSC, Bing, '
      || 'Cloudflare zone 138436f1a5… e IndexNow no ar.'),
    ultima_verificacao = now(),
    ultimo_detalhe = 'Dominio mellooticas.com.br verificado nesta BM',
    updated_at = now()
WHERE servico = 'meta_bm'
  AND identificador = 'Oticas Taty Mello';

NOTIFY pgrst, 'reload schema';
