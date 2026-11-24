-- "Não consegui ler" não pode se parecer com "precisa de gente" (23/11/2026).
--
-- O verificador de fatos roda todo dia às 4h30 e grava um veredito por fato público. Ele tinha três
-- vereditos, e faltava o mais importante dos três. Medido hoje, antes de escrever uma linha:
--
--   · A `v_espelho_pulso` responde **401 permission denied** desde 08/09/2026 — o anon do Pulso foi
--     revogado naquele dia porque a view carrega custo e receita. A function continuou batendo na
--     porta antiga, com uma chave literal no código que é exatamente a chave revogada (a variável
--     `PULSO_ANON_KEY` nunca existiu no projeto). O `catch` engolia o 401 e o fato caía no ramo
--     final: *"a fonte exige verificação humana"*. Dois fatos do Pulso estavam assim, parados há
--     109 e 84 dias, parecendo trabalho de gente que ninguém fez — e eram leitura de máquina.
--
--   · A contagem de `mkt.publications` era lida sem olhar o erro, e `?? 0` virava zero. A série
--     prova o degrau: 14, 8, 8 e **zero todo dia desde 08/09**, com o texto *"Caiu — a esteira
--     ficou parada"*. A tabela tem **2.114 linhas em 7 dias**, medido hoje. Era alarme falso, e do
--     tipo que se acredita, porque vinha com número.
--
-- Vazio nunca é zero, e porta fechada nunca é tarefa humana. O quarto veredito existe para a tela
-- poder dizer a diferença — e para ninguém "resolver" à mão o que é só uma porta errada.
alter table ops.fato_medicao drop constraint if exists fato_medicao_veredito_check;
alter table ops.fato_medicao add constraint fato_medicao_veredito_check
  check (veredito in ('confirmado', 'divergente', 'fonte_inacessivel', 'nao_verificavel'));

comment on column ops.fato_medicao.veredito is
  'confirmado = a fonte sustenta o número (±15%); divergente = a fonte mede outra coisa; '
  'fonte_inacessivel = a fonte É de máquina e não respondeu (porta errada, chave velha, rota fora '
  'do ar) — NÃO é trabalho humano; nao_verificavel = a fonte exige gente, por natureza.';
