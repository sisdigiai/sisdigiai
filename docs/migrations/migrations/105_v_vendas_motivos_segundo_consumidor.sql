-- 105 — a view de motivos passa a ter DOIS consumidores, e o comentário diz isso
--
-- Só comentário. Zero mudança de comportamento, zero DDL de estrutura.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE ACONTECEU, E POR QUE NÃO CRIEI UMA VIEW NOVA
-- ═══════════════════════════════════════════════════════════════════════════
-- Ia escrever `public.v_motivos_perda` para o módulo Comercial do digiai ler a
-- lista. Antes de escrever, procurei — e `public.v_vendas_motivos` já existia
-- (criada em 09/09 para a tela /vendas do digiai_mkt), com exatamente a mesma
-- definição que eu ia escrever: `chave, rotulo, ordem` de ops.motivos_perda
-- onde ativo, ordenado por ordem, grant só a authenticated.
--
-- Duas views sobre a mesma tabela não quebram nada no dia em que nascem. Quebram
-- no dia em que alguém muda uma delas — acrescenta um filtro, troca a ordem,
-- passa a excluir um motivo — e a outra tela continua a mostrar a lista antiga.
-- Aí as duas telas discordam sobre o que é um motivo válido, e ninguém reclama,
-- porque cada uma está certa em relação à sua própria view.
--
-- Então o front do digiai passou a ler `v_vendas_motivos`. O que esta migration
-- faz é a única parte que sobra: o comentário dizia "Consumidor único: /vendas",
-- e isso deixou de ser verdade no momento em que liguei a segunda tela. Comentário
-- de objeto compartilhado que mente sobre quem o usa é o que faz alguém achar que
-- pode mudá-lo à vontade.
--
-- ⚠ O NOME CONTINUA ERRADO e eu não o corrijo: `v_vendas_motivos` soa da tela
--    /vendas, mas a lista é de domínio e serve as duas. Renomear partiria a tela
--    do digiai_mkt, que não é minha (R-032). Fica registado aqui como dívida, para
--    quem for dono das duas telas decidir num passo só.

begin;

comment on view public.v_vendas_motivos is
  'Motivos de perda ATIVOS (ops.motivos_perda where ativo, ordem = a ordem em que o dono os falou, não frequência esperada). DEFINER DE PROPÓSITO (20260909_12): authenticated não tem grant em ops.motivos_perda, e com invoker a chamada virava "permission denied" — que a tela mostrava como "a view não existe". É lista de domínio: rótulos genéricos, sem dado de pessoa, tabela sem RLS a preservar. A trava é o GRANT (só authenticated), não o invoker. CONSUMIDORES (2, desde a 105): a tela /vendas do digiai_mkt e o módulo Comercial do digiai. Mudar filtro, ordem ou colunas aqui muda AS DUAS — falar com os dois donos antes. O nome sugere uma tela só e é dívida conhecida; renomear parte o digiai_mkt.';

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVA
-- ═══════════════════════════════════════════════════════════════════════════
--   a) pg_get_viewdef antes e depois é IDÊNTICO (é comentário, não redefinição);
--   b) obj_description passa a citar os dois consumidores;
--   c) has_table_privilege('anon', ..., 'select') continua FALSE — a 105 não
--      toca em grant nenhum, e este é o controlo de que não toquei.
