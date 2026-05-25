-- Corrigir encoding das ideias e pilares do schema marketing
-- Apaga tudo e reinsere com UTF-8 correto

DELETE FROM marketing.content_ideas;
DELETE FROM marketing.content_pillars;

-- ─── PILARES ───
INSERT INTO marketing.content_pillars (code, name, description, color, icon, sort_order) VALUES
  ('dor',        'Dor real do balcão',         'Situações que o vendedor de ótica vive todo dia: cliente que só pergunta preço, orçamento que esfria no WhatsApp, indicação que não convence.', '#C86D58', 'Flame',         1),
  ('valor',      'O que muda na prática',      'Mostra o resultado concreto de mudar a forma de atender, indicar e responder. Antes / depois sem hype.',                                          '#3A7D5C', 'TrendingUp',    2),
  ('conversa',   'Diálogos e roleplays',       'Trechos de conversa de balcão / WhatsApp ilustrando como conduzir, perguntar, sustentar valor, responder objeção.',                              '#9E8632', 'MessageCircle', 3),
  ('metodo',     'O método (5 Movimentos)',    'Recortes dos 5 Movimentos: sair do automático, ler o cliente, indicar com segurança, sustentar valor, WhatsApp que converte.',                  '#2C5A7E', 'Target',        4),
  ('autoridade', 'Bastidor e autoridade',      'Quem é a Taty, por que o método existe, decisões de produto, prova social, casos.',                                                              '#406863', 'ShieldCheck',   5),
  ('oferta',     'Oferta direta',              'CTAs para checkout (Hotmart/Kiwify), promoções de lançamento, escassez genuína (só quando real).',                                              '#128C7E', 'Tag',           6),
  ('comunidade', 'Comunidade e continuidade',  'Vida pós-compra: Nexus 90 dias, depoimentos de aluno, perguntas respondidas, próximos passos.',                                                  '#C9A45E', 'Users',         7);

-- ─── IDEAS ───
WITH p AS (SELECT code, id FROM marketing.content_pillars)
INSERT INTO marketing.content_ideas (pillar_id, hook, suggested_format, target_audience, cta_suggestion) VALUES

-- DOR (18)
((SELECT id FROM p WHERE code='dor'), 'Quando o cliente entra perguntando "quanto custa?" antes de você abrir a boca', 'reel', 'vendedor de balcão', 'Salva esse vídeo'),
((SELECT id FROM p WHERE code='dor'), 'O orçamento que você mandou ontem no WhatsApp e ele simplesmente sumiu', 'carrossel', 'vendedor de balcão', 'Marca alguém que vive isso'),
((SELECT id FROM p WHERE code='dor'), '3 sinais de que o atendimento já nasceu morto antes do cliente abrir a boca', 'carrossel', 'vendedor de balcão', 'Quantos você fez hoje?'),
((SELECT id FROM p WHERE code='dor'), 'Por que você dá desconto antes mesmo do cliente pedir', 'reel', 'vendedor de balcão', 'Conta nos comentários'),
((SELECT id FROM p WHERE code='dor'), 'Indicar a lente errada pra fechar venda hoje e perder o cliente pra sempre', 'post', 'vendedor de balcão', 'Compartilha'),
((SELECT id FROM p WHERE code='dor'), 'O cliente compara seu preço com a internet e você fica sem resposta', 'reel', 'vendedor de balcão', 'Te ajudo no próximo post'),
((SELECT id FROM p WHERE code='dor'), 'Aquela cena: "vou pensar e te aviso" — e some pra sempre', 'reel', 'vendedor de balcão', 'Salva pra revisitar'),
((SELECT id FROM p WHERE code='dor'), 'Quando o gerente cobra meta e você não sabe por onde começar a virar', 'post', 'gestor de ótica', 'Conta sua realidade'),
((SELECT id FROM p WHERE code='dor'), 'Vendedor de ótica que decora discurso vs vendedor que entende o cliente', 'carrossel', 'vendedor de balcão', 'Em qual você se vê?'),
((SELECT id FROM p WHERE code='dor'), 'Quando o atendimento começa solto e termina em "vou olhar mais umas opções"', 'reel', 'vendedor de balcão', 'Comenta um'),
((SELECT id FROM p WHERE code='dor'), 'O cliente trava na hora de decidir e você também trava junto', 'post', 'vendedor de balcão', 'Salva pra próxima'),
((SELECT id FROM p WHERE code='dor'), 'A reunião de segunda em que ninguém sabe explicar por que vendeu pouco', 'reel', 'gestor de ótica', 'Marca seu gerente'),
((SELECT id FROM p WHERE code='dor'), 'Por que aquela ótica do shopping vende mais barato e você não consegue baixar', 'carrossel', 'gestor de ótica', 'O que mais incomoda?'),
((SELECT id FROM p WHERE code='dor'), 'Quando você manda 5 fotos no WhatsApp e o cliente responde "obrigada, vou pensar"', 'reel', 'vendedor de balcão', 'Faz isso?'),
((SELECT id FROM p WHERE code='dor'), 'A frustração de treinar a equipe toda semana e nada mudar no balcão', 'post', 'gestor de ótica', 'Compartilha com seu time'),
((SELECT id FROM p WHERE code='dor'), 'Aquele cliente que parecia certo e desistiu na hora do fechamento', 'reel', 'vendedor de balcão', 'Por que acha que aconteceu?'),
((SELECT id FROM p WHERE code='dor'), 'Cliente que compra a lente mais barata e volta reclamando que não enxerga bem', 'post', 'vendedor de balcão', 'Você indica ou empurra?'),
((SELECT id FROM p WHERE code='dor'), 'Quando o cliente diz "tá caro" e você não tem nem 1 argumento pronto', 'reel', 'vendedor de balcão', 'Te conto 3 no próximo'),

-- VALOR (16)
((SELECT id FROM p WHERE code='valor'), '3 perguntas que mudam a conversa de venda no balcão', 'carrossel', 'vendedor de balcão', 'Salva e usa amanhã'),
((SELECT id FROM p WHERE code='valor'), 'Como falar de preço SEM começar pelo preço', 'reel', 'vendedor de balcão', 'Testa essa semana'),
((SELECT id FROM p WHERE code='valor'), 'O que muda quando você ouve o cliente antes de mostrar produto', 'post', 'vendedor de balcão', 'Conta o antes e depois'),
((SELECT id FROM p WHERE code='valor'), '4 perfis de cliente — qual você atende mal e nem sabe', 'carrossel', 'vendedor de balcão', 'Salva pra estudar'),
((SELECT id FROM p WHERE code='valor'), 'A diferença entre indicar lente e empurrar lente', 'reel', 'vendedor de balcão', 'Em qual lado você está?'),
((SELECT id FROM p WHERE code='valor'), 'O ROI de uma boa anamnese: tempo, ticket médio e recompra', 'carrossel', 'gestor de ótica', 'Salva pra mostrar pro time'),
((SELECT id FROM p WHERE code='valor'), 'Por que o WhatsApp bem usado vale mais que 3 vendedores no balcão', 'reel', 'gestor de ótica', 'Concorda?'),
((SELECT id FROM p WHERE code='valor'), 'Como retomar um orçamento perdido sem parecer chato', 'post', 'vendedor de balcão', 'Salva o script'),
((SELECT id FROM p WHERE code='valor'), 'A frase que faz o cliente parar de comparar preço e começar a confiar em você', 'reel', 'vendedor de balcão', 'Testa e me conta'),
((SELECT id FROM p WHERE code='valor'), 'Atendimento de 7 minutos que fecha vs atendimento de 30 minutos que esfria', 'carrossel', 'vendedor de balcão', 'Qual é o seu?'),
((SELECT id FROM p WHERE code='valor'), 'O segredo de quem sustenta valor: a ordem certa das perguntas', 'reel', 'vendedor de balcão', 'Salva pra revisitar'),
((SELECT id FROM p WHERE code='valor'), 'Como transformar "vou pensar" em "vou levar" sem pressionar', 'post', 'vendedor de balcão', 'Compartilha com a equipe'),
((SELECT id FROM p WHERE code='valor'), 'O que mudou nas minhas vendas quando parei de mostrar produto e comecei a perguntar', 'reel', 'vendedor de balcão', 'Conta a sua mudança'),
((SELECT id FROM p WHERE code='valor'), 'Diagnóstico em 5 perguntas: cliente perfeito vs cliente que vai sumir', 'carrossel', 'vendedor de balcão', 'Salva pra usar'),
((SELECT id FROM p WHERE code='valor'), 'Atendimento bom não é o mais simpático — é o que conduz', 'post', 'vendedor de balcão', 'Concorda?'),
((SELECT id FROM p WHERE code='valor'), 'Quando você para de "vender lente" e começa a "resolver problema", o ticket sobe', 'reel', 'vendedor de balcão', 'Bora testar?'),

-- CONVERSA (14)
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente diz "tá caro" — o que você responde?', 'reel', 'vendedor de balcão', 'Comenta sua resposta'),
((SELECT id FROM p WHERE code='conversa'), 'WhatsApp: como retomar um cliente que sumiu há 5 dias', 'carrossel', 'vendedor de balcão', 'Salva esse modelo'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente quer só o exame — você abre a porta pra venda?', 'reel', 'vendedor de balcão', 'Comenta como faz'),
((SELECT id FROM p WHERE code='conversa'), 'Antes/depois: a mesma resposta no WhatsApp do jeito errado e do jeito certo', 'carrossel', 'vendedor de balcão', 'Qual você usa?'),
((SELECT id FROM p WHERE code='conversa'), 'A pergunta de abertura que muda o tom do atendimento todo', 'reel', 'vendedor de balcão', 'Testa essa semana'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente que pergunta preço de tudo antes de testar', 'reel', 'vendedor de balcão', 'Comenta como faz'),
((SELECT id FROM p WHERE code='conversa'), 'Como falar de antirreflexo sem ser técnico demais', 'post', 'vendedor de balcão', 'Salva o jeito certo'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente acompanhado — quem você atende primeiro?', 'reel', 'vendedor de balcão', 'O que faria?'),
((SELECT id FROM p WHERE code='conversa'), '4 mensagens curtas no WhatsApp que destravam um orçamento parado', 'carrossel', 'vendedor de balcão', 'Salva e adapta'),
((SELECT id FROM p WHERE code='conversa'), 'A frase de fechamento que respeita o cliente mas pede a decisão', 'reel', 'vendedor de balcão', 'Decora essa'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente que quer só armação — você fala da lente quando?', 'reel', 'vendedor de balcão', 'Comenta seu jeito'),
((SELECT id FROM p WHERE code='conversa'), 'Como responder "vou comparar em outras óticas" sem ficar passivo', 'post', 'vendedor de balcão', 'Salva e treina'),
((SELECT id FROM p WHERE code='conversa'), 'A diferença entre "posso ajudar?" e a abertura que prende o cliente', 'reel', 'vendedor de balcão', 'Salva pra estudar'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente que esquece o que tinha conversado e volta semana depois', 'reel', 'vendedor de balcão', 'Como retoma?'),

-- MÉTODO (14)
((SELECT id FROM p WHERE code='metodo'), 'Os 5 Movimentos que separam vendedor mediano de top de ótica', 'carrossel', 'vendedor de balcão', 'Salva os 5'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 1: sair do atendimento automático em 3 passos', 'reel', 'vendedor de balcão', 'Treina hoje'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 2: ler o cliente em menos de 1 minuto', 'reel', 'vendedor de balcão', 'Compartilha com o time'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 3: indicar com segurança, não com sorte', 'carrossel', 'vendedor de balcão', 'Salva o checklist'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 4: sustentar valor sem precisar dar desconto', 'reel', 'vendedor de balcão', 'Testa essa'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 5: o WhatsApp que retoma, reage e converte', 'reel', 'vendedor de balcão', 'Salva o método'),
((SELECT id FROM p WHERE code='metodo'), 'Diagnóstico rápido: você atende no improviso ou no método?', 'post', 'vendedor de balcão', 'Faz o teste'),
((SELECT id FROM p WHERE code='metodo'), 'A jornada do cliente na ótica em 7 etapas — onde você perde mais', 'carrossel', 'gestor de ótica', 'Onde sua loja vaza?'),
((SELECT id FROM p WHERE code='metodo'), 'Os 4 perfis de cliente — e a indicação certa pra cada um', 'carrossel', 'vendedor de balcão', 'Salva pra aplicar'),
((SELECT id FROM p WHERE code='metodo'), '3 erros de indicação que parecem inofensivos e custam venda', 'post', 'vendedor de balcão', 'Faz alguns?'),
((SELECT id FROM p WHERE code='metodo'), 'Plano de 72 horas pra mudar como você atende a partir de segunda', 'carrossel', 'vendedor de balcão', 'Aceita o desafio?'),
((SELECT id FROM p WHERE code='metodo'), 'Mapa de objeções: as 6 mais comuns e como responder cada uma', 'carrossel', 'vendedor de balcão', 'Salva pra revisar'),
((SELECT id FROM p WHERE code='metodo'), 'A diferença entre vender produto e conduzir decisão', 'reel', 'vendedor de balcão', 'Qual é o seu modo?'),
((SELECT id FROM p WHERE code='metodo'), 'A regra dos 3 sins antes do preço — funciona em 8 de cada 10 atendimentos', 'reel', 'vendedor de balcão', 'Testa e me conta'),

-- AUTORIDADE (12)
((SELECT id FROM p WHERE code='autoridade'), 'Quem é a Taty: 40+ anos de balcão sem nunca ter parado', 'reel', 'vendedor de balcão', 'Conhece a Taty?'),
((SELECT id FROM p WHERE code='autoridade'), 'Por que decidi colocar 40 anos de balcão num PDF de 35 páginas', 'post', 'vendedor de balcão', 'Faz sentido pra você?'),
((SELECT id FROM p WHERE code='autoridade'), 'O atendimento da Taty: 3 cenas reais que viraram lição no método', 'carrossel', 'vendedor de balcão', 'Salva pra estudar'),
((SELECT id FROM p WHERE code='autoridade'), 'Como nasceu o Ótica Sem Improviso — a história em 1 minuto', 'reel', 'vendedor de balcão', 'Compartilha'),
((SELECT id FROM p WHERE code='autoridade'), 'O que aprendi em 4 décadas atrás do balcão que ninguém ensina em curso', 'post', 'vendedor de balcão', 'Comenta'),
((SELECT id FROM p WHERE code='autoridade'), 'A bronca da Taty pra quem vende lente "no chute"', 'reel', 'vendedor de balcão', 'Já tomou essa?'),
((SELECT id FROM p WHERE code='autoridade'), 'A frase da Taty que mudou a forma como eu fecho venda', 'post', 'vendedor de balcão', 'Qual é a sua frase?'),
((SELECT id FROM p WHERE code='autoridade'), 'Depoimento: como o método mudou o atendimento de uma ótica de bairro', 'reel', 'vendedor de balcão', 'Quer fazer parte?'),
((SELECT id FROM p WHERE code='autoridade'), 'Por que o método não promete "vender mais" e sim "vender melhor"', 'post', 'gestor de ótica', 'Concorda?'),
((SELECT id FROM p WHERE code='autoridade'), 'O método não é teoria de curso — é prática validada em balcão de verdade', 'reel', 'vendedor de balcão', 'Salva e compartilha'),
((SELECT id FROM p WHERE code='autoridade'), 'A diferença entre quem vende ótica e quem entende ótica', 'post', 'vendedor de balcão', 'Você é qual dos 2?'),
((SELECT id FROM p WHERE code='autoridade'), 'O que a Taty ensina que nenhum representante de ótica te conta', 'carrossel', 'vendedor de balcão', 'Quer saber?'),

-- OFERTA (12)
((SELECT id FROM p WHERE code='oferta'), 'Ótica Sem Improviso: PDF + app + 90 dias de apoio. R$ 97. (50% off no lançamento)', 'post', 'vendedor de balcão', 'Quero o método'),
((SELECT id FROM p WHERE code='oferta'), 'Por que R$ 48,50 paga 1 venda recuperada no WhatsApp', 'reel', 'vendedor de balcão', 'Vale o teste?'),
((SELECT id FROM p WHERE code='oferta'), 'O que vem com o manual Ótica Sem Improviso: lista completa', 'carrossel', 'vendedor de balcão', 'Garante o teu'),
((SELECT id FROM p WHERE code='oferta'), 'PDF profissional pra imprimir + app pra estudar no celular + Nexus 90 dias', 'reel', 'vendedor de balcão', 'Quero acessar'),
((SELECT id FROM p WHERE code='oferta'), 'Onde comprar: link na bio', 'story', 'vendedor de balcão', 'Link na bio'),
((SELECT id FROM p WHERE code='oferta'), 'Lançamento: condição especial pra quem entra na 1ª turma', 'reel', 'vendedor de balcão', 'Aproveita'),
((SELECT id FROM p WHERE code='oferta'), 'Comparação: 1 curso longo de R$ 1.500 vs 1 manual de R$ 97 que entrega o método', 'carrossel', 'vendedor de balcão', 'O que prefere?'),
((SELECT id FROM p WHERE code='oferta'), 'Acesso imediato: você compra hoje e começa amanhã na loja', 'post', 'vendedor de balcão', 'Pega o método'),
((SELECT id FROM p WHERE code='oferta'), 'Pra equipe: pacote pra ótica que quer treinar até 5 vendedores', 'reel', 'gestor de ótica', 'Fala com a gente'),
((SELECT id FROM p WHERE code='oferta'), 'Garantia: 7 dias pra testar. Se não fizer sentido, devolve o dinheiro', 'post', 'vendedor de balcão', 'Sem risco'),
((SELECT id FROM p WHERE code='oferta'), 'O Hotmart processou: você recebe acesso em segundos', 'story', 'vendedor de balcão', 'Compra aqui'),
((SELECT id FROM p WHERE code='oferta'), 'Última semana de lançamento — depois o preço vai subir', 'reel', 'vendedor de balcão', 'Garante agora'),

-- COMUNIDADE (12)
((SELECT id FROM p WHERE code='comunidade'), 'O que tem dentro da Nexus: como são os 90 dias depois da compra', 'carrossel', 'comprador novo', 'Salva pra revisitar'),
((SELECT id FROM p WHERE code='comunidade'), 'Conhece o Doug: o veterano de balcão que tira suas dúvidas dentro do app', 'reel', 'comprador novo', 'Apresenta o Doug'),
((SELECT id FROM p WHERE code='comunidade'), 'A dúvida que mais aparece na Nexus na primeira semana', 'post', 'comprador novo', 'É a sua também?'),
((SELECT id FROM p WHERE code='comunidade'), 'Tela do app: como navegar pelos 5 módulos sem se perder', 'reel', 'comprador novo', 'Salva o tour'),
((SELECT id FROM p WHERE code='comunidade'), 'Os 8 workshops práticos que entram após você ler os módulos', 'carrossel', 'comprador novo', 'Qual mais te interessa?'),
((SELECT id FROM p WHERE code='comunidade'), 'Como a Taty entra na Nexus: respostas dela ao vivo nos primeiros 30 dias', 'reel', 'comprador novo', 'Vai estar lá?'),
((SELECT id FROM p WHERE code='comunidade'), 'Depoimento: 1 semana de Nexus mudou meu atendimento no balcão', 'reel', 'vendedor de balcão', 'Vem fazer parte'),
((SELECT id FROM p WHERE code='comunidade'), 'O que você ganha além do PDF: lista detalhada do que tem na Nexus', 'carrossel', 'comprador novo', 'Vale a pena?'),
((SELECT id FROM p WHERE code='comunidade'), 'Como pedir ajuda ao Doug quando travar no balcão real', 'reel', 'comprador novo', 'Conta um caso'),
((SELECT id FROM p WHERE code='comunidade'), 'Os 5 Movimentos virando rotina: como nossos alunos aplicam', 'carrossel', 'comprador novo', 'Faz parte?'),
((SELECT id FROM p WHERE code='comunidade'), 'O que muda nas suas vendas 30, 60 e 90 dias depois de aplicar o método', 'reel', 'comprador novo', 'Vamos juntos?'),
((SELECT id FROM p WHERE code='comunidade'), 'Como sair da Nexus depois de 90 dias com método interiorizado, não dependente de app', 'post', 'comprador novo', 'É o que queremos');
