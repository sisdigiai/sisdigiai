-- ============================================================
-- 083 — resposta verificada sobre a API do Google Business Profile
-- ============================================================
-- O aviso do MKT (28/08) levantou que a família Business Profile não seria
-- self-service e marcou explicitamente como NÃO VERIFICADO, pedindo que a gente
-- conferisse antes de virar cronograma. Conferido na documentação oficial do Google
-- (developers.google.com/my-business/content/prereqs) em 2026-08-28.
--
-- A HIPÓTESE DELES ESTAVA CERTA. Não é self-service: exige formulário de acesso
-- aprovado pelo Google, na modalidade "Application for Basic API Access", com o
-- número do projeto do Google Cloud.
--
-- E há dois requisitos de elegibilidade que mudam o prazo, não só o processo:
--   1. gerenciar um perfil VERIFICADO e ativo há 60 dias ou mais;
--   2. ter um SITE listado no perfil.
--
-- O item 2 é o que trava hoje: o domínio polapetit.com.br não foi comprado e a
-- landing vive em polapetit.netlify.app. Dá para listar a URL do Netlify, mas para
-- um perfil comercial que vai pedir acesso de API é frágil — comprar o domínio deixa
-- de ser estética e vira pré-requisito de integração.
--
-- COMO CONFERIR SE JÁ FOI APROVADO, sem depender de e-mail: a cota do projeto no
-- Google Cloud responde — 0 QPM significa não aprovado, 300 QPM significa aprovado.
-- ============================================================

UPDATE ops.contas_servicos
SET obs = concat_ws(E'\n',
      NULLIF(obs, ''),
      E'[gbp-api verificado 2026-08-28] A hipótese do MKT estava CERTA: a API do Business\n'
      || E'Profile NÃO é self-service. Exige formulário aprovado pelo Google ("Application for\n'
      || E'Basic API Access"), informando o número do projeto do Google Cloud.\n'
      || E'Dois requisitos de elegibilidade:\n'
      || E'  1. perfil verificado e ativo há 60+ dias;\n'
      || E'  2. site listado no perfil.\n'
      || E'O requisito 2 é o que trava agora: polapetit.com.br não foi comprado e a landing\n'
      || E'está em polapetit.netlify.app. Comprar o domínio deixa de ser estética e vira\n'
      || E'pré-requisito da integração.\n'
      || E'Para saber se já foi aprovado sem esperar e-mail: a cota do projeto no Google Cloud\n'
      || E'mostra 0 QPM quando não aprovado e 300 QPM quando aprovado.'),
    ultimo_detalhe = 'API exige aprovação do Google; trava atual é o site no perfil (domínio não comprado)',
    ultima_verificacao = now(),
    updated_at = now()
WHERE servico = 'google_business_profile'
  AND identificador = 'Polá Petit';

NOTIFY pgrst, 'reload schema';
