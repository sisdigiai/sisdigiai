-- ============================================================
-- 085 — a categoria do Google da Polá Petit não pegou
-- ============================================================
-- Achado do agente do digiai_mkt, devolvido em 28/08 sem que ninguém perguntasse:
--
--   painel de administração ... "Serviços para festas infantis"  (aplicada)
--   busca pública ............. "Fornecedor de Brindes"          (é o que o cliente vê)
--
-- Ele tinha reportado a correção como feita porque conferiu no PAINEL, não no
-- RESULTADO. Voltou para desdizer por conta própria — e essa é a distinção que
-- importa registrar: painel de administração é intenção, busca pública é efeito. Para
-- categoria do Google, só o segundo conta, porque é o que decide em qual busca o
-- negócio aparece.
--
-- "Fornecedor de Brindes" para um negócio de decoração e buffet de festa infantil não
-- é um detalhe de catálogo: é a categoria errada guiando a descoberta local inteira.
--
-- Este app NÃO havia registrado "categoria corrigida" em lugar nenhum — conferido antes
-- de escrever. Então não há registro otimista a desfazer, só um achado a guardar.
--
-- Reconferência no público prometida por eles em 24h (29/08).
-- ============================================================

UPDATE ops.contas_servicos
SET obs = concat_ws(E'\n',
      NULLIF(obs, ''),
      E'[categoria divergente 2026-08-28] O painel mostra "Serviços para festas infantis"\n'
      || E'aplicada; a busca pública mostra "Fornecedor de Brindes". A categoria não pegou.\n'
      || E'Achado do agente do digiai_mkt, que havia reportado a correção como feita porque\n'
      || E'conferiu no painel e não no resultado — e voltou para desdizer sozinho.\n'
      || E'Categoria errada guia a descoberta local inteira: "Fornecedor de Brindes" não\n'
      || E'aparece nas buscas de quem procura decoração e buffet de festa infantil.\n'
      || E'Reconferência no público prometida para 29/08.'),
    status = 'atencao',
    ultimo_detalhe = 'Categoria do Google não pegou: painel diz festas infantis, busca pública diz Fornecedor de Brindes',
    ultima_verificacao = now(),
    updated_at = now()
WHERE servico = 'google_business_profile'
  AND identificador = 'Polá Petit';

NOTIFY pgrst, 'reload schema';
