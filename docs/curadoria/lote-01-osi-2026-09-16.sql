-- Lote 1 · Ótica Sem Improviso — gravar e aprovar (roda quem tem a curadoria: Orquestrador Geral)
--
-- Uso: trocar <APROVADA_POR> pela palavra do dono (quem, onde, quando — ex.: 'Gilberto, canal do Geral, 17/09/2026 09:12')
--      e rodar INTEIRO numa transação (service_role ou postgres). Fonte do texto: lote-01-osi-2026-09-16.md.
-- A aprovação recusa o LOTE INTEIRO se uma ideia falhar na régua (marketing.fn_ideia_problemas) e diz qual e por quê.
-- Ensaiado pelo app digiai em 16/09/2026 ~21:20 com rollback: 9 gravadas, 9 aprovadas, 9 na v_mkt_pauta_curada.

begin;

do $$
begin
  if exists (select 1 from marketing.content_ideas where metadata->>'lote' = 'osi-01') then
    raise exception 'lote osi-01 ja foi gravado.';
  end if;
  if not exists (select 1 from public.v_mkt_fatos where chave = 'osi_oferta' and fresco and publico) then
    raise exception 'fato osi_oferta nao esta fresco e publico — as vagas 4, 5 e 9 cairiam na regua.';
  end if;
end $$;

insert into marketing.content_ideas
  (status, marca, pilar, titulo, hook, narrative, cta_suggestion, movimento, dor_gatilho, etapa_funil,
   suggested_format, fato_ids, prioridade, metadata)
values
  ('available', 'osi', 'metodo de balcao na pratica', 'Você atende ou você reage?',
   'Se o seu atendimento começa com "pois não?", ele já começou no automático.',
   'O cliente entra, o vendedor dispara a frase de sempre, o cliente aponta uma armação, o vendedor responde o preço — e a venda vira cotação. Sair do automático não é decorar outro script: é o vendedor quebrar o próprio piloto antes de falar. Três micro-ações para o próximo atendimento: abrir com uma observação em vez de "pois não?", olhar nos olhos antes de olhar a armação, e fazer uma pergunta antes de mostrar qualquer produto. A peça para aí: ler o cliente é o Movimento 2.',
   'Esse é o Movimento 1 de 5. O método completo está no link da bio.',
   'Sair do Automático', 'atendimento no improviso', 'atrair (autoridade social)',
   'carrossel (6 slides) + reels', '{}', 1,
   '{"lote":"osi-01","vaga":1,"semana":1,"origem":["28140f03"]}'),

  ('available', 'osi', 'metodo de balcao na pratica', '"Vou dar uma pesquisada" começa antes de ele falar',
   'O cliente que diz "vou pesquisar" quase sempre avisou antes. Faltou a pergunta.',
   'Comparar em outra ótica é o que o cliente faz quando não sentiu que alguém entendeu o caso dele. Ler o cliente é técnica: perguntar para que é o óculos, como é a rotina, o que incomodou no último; reparar na armação que ele pegou primeiro e no que trouxe na mão. Com poucas perguntas úteis, a conversa sai de "quanto custa" para "o que resolve pra você". A peça não entra em como defender preço — isso é o Movimento 4.',
   'Movimento 2 de 5. As perguntas estão no método — link na bio.',
   'Ler o Cliente', 'cliente que compara em outras óticas', 'atrair (autoridade social)',
   'carrossel + reels', '{}', 1,
   '{"lote":"osi-01","vaga":2,"semana":2,"origem":["f037471f","e495afb4"]}'),

  ('available', 'osi', 'metodo de balcao na pratica', 'Indicar com critério, não no chute',
   'Quando você trava na hora de indicar a lente, o cliente sente — e trava junto.',
   'A insegurança aparece de dois jeitos: opção demais ("tem essa, essa e essa") ou a mais barata por medo de errar. Indicar com segurança é traduzir o técnico para a língua do cliente e justificar pela rotina que ele contou: "pelo que você me falou do computador o dia inteiro, eu indicaria esta, por isto". Indicação com motivo transmite critério; três opções soltas transmitem dúvida. Sem prometer resultado de lente e sem citar marca de lente.',
   'Movimento 3 de 5. O passo a passo para indicar sem travar está no método — link na bio.',
   'Indicar com Segurança', 'método dos 5 Movimentos', 'capturar (landing landingoticasemimproviso.netlify.app)',
   'carrossel + reels', '{}', 2,
   '{"lote":"osi-01","vaga":3,"semana":3,"origem":["09d2bc29","47161067"]}'),

  ('available', 'osi', 'erros que custam venda', 'O desconto que ninguém pediu',
   'Você dá desconto antes de o cliente pedir? Então quem tem medo do preço é você.',
   'O desconto-reflexo nasce quando o preço aparece antes do valor: o vendedor fala o número, vê a cara do cliente e já corta. Sustentar valor é inverter a ordem — primeiro amarrar o que resolve, com o que o próprio cliente contou, e só depois o preço. E quando vier o "tá caro", responder com o que ele perde levando menos, não com um número menor. A peça não mostra preço nem comparação de valor.',
   'Movimento 4 de 5. No Ótica Sem Improviso você leva o método e o apoio no Nexus para aplicar — link na bio.',
   'Sustentar Valor', 'desconto-reflexo (dar desconto antes do cliente pedir)', 'converter (checkout)',
   'reels + carrossel', array[(select id from mkt.fatos where chave = 'osi_oferta')], 2,
   '{"lote":"osi-01","vaga":4,"semana":4,"origem":["71515d65","30e9d29b","cc1589ba"]}'),

  ('available', 'osi', 'metodo de balcao na pratica', 'O orçamento não sumiu. Ele esfriou.',
   'Mandou o orçamento no WhatsApp e veio "vou pensar"? Não foi o preço — foi a mensagem.',
   'Foto de armação e valor, soltos, viram comparação; o cliente some porque não tem nada ali que lembre a conversa. Retomar com contexto é voltar ao que ele contou no balcão ("aquela dor de cabeça no fim do dia melhorou?") e propor um próximo passo com dia e hora — sem cobrança e sem "e aí, decidiu?". É o Movimento mais concreto e fecha o arco dos cinco.',
   'São os 5 Movimentos: manual para imprimir, app para estudar no celular e apoio no Nexus incluído — link na bio.',
   'WhatsApp que Converte', 'orçamento que some no WhatsApp', 'converter (checkout)',
   'carrossel + reels', array[(select id from mkt.fatos where chave = 'osi_oferta')], 2,
   '{"lote":"osi-01","vaga":5,"semana":5,"origem":["53e7e7c1","85c67167","10235d5d","dc001324"]}'),

  ('available', 'osi', 'bastidores do metodo (prova)', 'Por que eu parei de ensinar script',
   'Script decorado funciona até o cliente sair do roteiro — e ele sempre sai.',
   'A Taty conta, em primeira pessoa, por que o Ótica Sem Improviso é um método visual de balcão e não mais um script: atendendo, ela aprendeu que o vendedor precisa de direção, não de fala pronta — por isso cada Movimento é uma postura que serve para qualquer conversa. Responde à objeção "já tentei script e não funcionou". Rosto e voz dela, de verdade.',
   'Conheça os 5 Movimentos — link na bio.',
   null, 'método dos 5 Movimentos', 'atrair (autoridade social)',
   'reels (Taty falando) + story', '{}', 2,
   '{"lote":"osi-01","vaga":6,"semana":2,"origem":["43be5c24","f9bd3941","c3c49b24"]}'),

  ('available', 'osi', 'erros que custam venda', 'Quando o cliente entra perguntando "quanto custa?"',
   'Ele perguntou o preço antes de você abrir a boca. E você respondeu.',
   'Só a cena, sem ensinar método — a peça existe para a pessoa se reconhecer. O cliente pergunta o preço na porta, o vendedor responde o número, o cliente agradece e sai para comparar. O erro não é o cliente perguntar: é o atendimento começar pela última pergunta. A virada fica para os Movimentos.',
   'Se essa cena é do seu balcão, os 5 Movimentos são pra você — link na bio.',
   null, 'atendimento no improviso', 'atrair (autoridade social)',
   'reels', '{}', 3,
   '{"lote":"osi-01","vaga":7,"semana":1,"origem":["1984c864","79a0c4c6"]}'),

  ('available', 'osi', 'bastidores do metodo (prova)', 'Um atendimento de verdade, do meu balcão',
   'Esse caso aconteceu no meu balcão — e é por causa dele que o método é assim.',
   'A Taty conta um atendimento real do balcão dela, sem nome nem dado do cliente (LGPD), e mostra qual Movimento estava em jogo e o que mudou na conversa. A ideia define a forma; o caso é o que ela contar na gravação — a curadoria não escreve caso, para não inventar. Ocupa a vaga do depoimento até existir comprador real com consentimento.',
   'O método por trás desse atendimento está no link da bio.',
   null, 'método dos 5 Movimentos', 'atrair (autoridade social)',
   'reels (Taty falando) + story', '{}', 3,
   '{"lote":"osi-01","vaga":8,"semana":4,"origem":["b2604677"]}'),

  ('available', 'osi', 'convite direto pra turma', 'O que vem no Ótica Sem Improviso',
   'Compra única: o método inteiro para o seu balcão, com apoio no Nexus incluído.',
   'O que vem: manual em PDF para imprimir, app leitor para estudar no celular e apoio no Nexus incluído; depois, continuidade opcional. Garantia de 7 dias, na Hotmart e na Kiwify. Prazo do apoio e preço não ficam no texto guardado: vêm do fato osi_oferta, lido na hora de gerar.',
   'Garanta o seu no link da bio.',
   null, 'método dos 5 Movimentos', 'capturar (landing landingoticasemimproviso.netlify.app)',
   'carrossel + story', array[(select id from mkt.fatos where chave = 'osi_oferta')], 3,
   '{"lote":"osi-01","vaga":9,"semana":5,"origem":["6b1dac80","1342e740","066a6b53"]}');

-- aprovação: validade de 30 dias, alinhada à revisão mensal da folha
select marketing.fn_aprovar_ideias(
  array(select id from marketing.content_ideas where metadata->>'lote' = 'osi-01' order by (metadata->>'vaga')::int),
  '<APROVADA_POR>',
  date '2026-10-16'
) as aprovadas;

do $$
begin
  if (select count(*) from public.v_mkt_pauta_curada where ideia_id in
        (select id from marketing.content_ideas where metadata->>'lote' = 'osi-01')) <> 9 then
    raise exception 'as 9 ideias do lote nao estao todas na pauta.';
  end if;
  if exists (select 1 from marketing.content_ideas where metadata->>'lote' = 'osi-01' and aprovada_por ~ '^<') then
    raise exception 'troque <APROVADA_POR> pela palavra do dono antes de rodar.';
  end if;
end $$;

commit;
