-- ============================================================
-- 077 — credenciais testadas e redes conferidas pelo Meta
-- ============================================================
-- Fecha a varredura de 2026-08-16. Aqui o método foi testar a credencial de
-- verdade contra a API, não olhar se ela existe no .env. Credencial que existe e
-- não funciona é pior do que credencial ausente: ela passa a impressão de que o
-- caminho está pronto.
--
-- RESULTADO DOS TESTES:
--   telegram_bot ... VIVO. @digiai_sentinela_bot, id 8999867640, nome "DIGIAI Sentinela".
--   github ......... MORTO. GITHUB_TOKEN_1 responde 401 Bad credentials.
--   openai ......... SEM CREDENCIAL. Não há chave em nenhum .env do workspace.
--   netlify ........ SEM CREDENCIAL.
--   hotmart ........ SEM CREDENCIAL.
--
-- O caso da OpenAI muda um plano em aberto: a frota de agents foi desenhada
-- contando com a API do GPT como apoio. Não existe chave guardada. Ou o dono
-- providencia uma, ou a frota nasce só com o que já está pago e funcionando.
-- Melhor descobrir agora do que na hora de ligar.
--
-- O caso do GitHub importa porque o deploy depende de push, e um token morto no
-- .env é a diferença entre "o pipeline está pronto" e "o pipeline não roda".
--
-- REDES: as contas abaixo foram conferidas na varredura das 9 BMs do Meta, cada
-- uma dentro da BM que a possui. @gjuniorsax é a exceção — não aparece em nenhuma
-- BM, o que é esperado para conta pessoal, mas significa que ela está fora de
-- qualquer governança de empresa.
--
-- Só UPDATE em linhas existentes (R-032). Idempotente pelo marcador [estado-real].
-- ============================================================

WITH cred(serv, det, bloco) AS (
  VALUES
  ('telegram_bot', 'VIVO — testado na API em 2026-08-16',
   E'[estado-real 2026-08-16] Testado via getMe: responde. @digiai_sentinela_bot,\n' ||
   E'id 8999867640, nome "DIGIAI Sentinela". Token em digiai/.env funcionando.'),
  ('github', 'MORTO — GITHUB_TOKEN_1 responde 401',
   E'[estado-real 2026-08-16] GITHUB_TOKEN_1 (digiai/.env) responde 401 Bad credentials.\n' ||
   E'As 4 contas não puderam ser conferidas. Como deploy depende de push, token morto\n' ||
   E'aqui é a diferença entre pipeline pronto e pipeline que não roda. Precisa ser reemitido.'),
  ('openai', 'SEM CREDENCIAL — nenhuma chave no workspace',
   E'[estado-real 2026-08-16] Nenhuma chave da OpenAI em nenhum .env do workspace.\n' ||
   E'Relevante porque a frota de agents foi desenhada contando com a API do GPT como\n' ||
   E'apoio. Ou o dono providencia chave, ou a frota nasce só com o que já está pago.'),
  ('netlify', 'SEM CREDENCIAL para verificar',
   E'[estado-real 2026-08-16] Sem token no workspace — estado não verificável daqui.'),
  ('hotmart', 'SEM CREDENCIAL para verificar',
   E'[estado-real 2026-08-16] Sem credencial no workspace — segue "(a confirmar)".')
)
UPDATE ops.contas_servicos c
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(c.obs, ''), '[estado-real', 1), E'\n '), ''),
      cr.bloco),
    ultimo_detalhe = cr.det,
    ultima_verificacao = now(),
    updated_at = now()
FROM cred cr
WHERE c.servico = cr.serv;

WITH redes(ident, bloco) AS (
  VALUES
  ('@_digiai',                E'[estado-real 2026-08-16] Conferida na BM Digiai. 1 acesso total, 2 parciais.'),
  ('@oticasemimproviso',      E'[estado-real 2026-08-16] Conferida na BM Digiai. 3 acessos totais.'),
  ('@melloticas',             E'[estado-real 2026-08-16] Conferida na BM Oticas Taty Mello. 2 parciais e 2 PARTNERS\n' ||
                              E'externos (Automattic e Solutions Engineering Team) alcançam esta conta.'),
  ('@oticaslancastersuzano',  E'[estado-real 2026-08-16] Conferida na BM Óticas Lancaster - Suzano. 2 totais, 2 parciais, 2 partners.'),
  ('@gjuniorsax',             E'[estado-real 2026-08-16] NÃO aparece em nenhuma das 9 BMs. Esperado para conta\n' ||
                              E'pessoal, mas significa que está fora de qualquer governança de empresa.')
)
UPDATE ops.contas_servicos c
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(c.obs, ''), '[estado-real', 1), E'\n '), ''),
      r.bloco),
    ultima_verificacao = now(),
    updated_at = now()
FROM redes r
WHERE c.servico = 'rede_instagram'
  AND c.identificador = r.ident;

NOTIFY pgrst, 'reload schema';
