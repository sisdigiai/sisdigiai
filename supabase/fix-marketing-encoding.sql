-- Corrigir encoding das ideias e pilares do schema marketing
-- Apaga tudo e reinsere com UTF-8 correto

DELETE FROM marketing.content_ideas;
DELETE FROM marketing.content_pillars;

-- â”€â”€â”€ PILARES â”€â”€â”€
INSERT INTO marketing.content_pillars (code, name, description, color, icon, sort_order) VALUES
  ('dor',        'Dor real do balcÃ£o',         'SituaÃ§Ãµes que o vendedor de Ã³tica vive todo dia: cliente que sÃ³ pergunta preÃ§o, orÃ§amento que esfria no WhatsApp, indicaÃ§Ã£o que nÃ£o convence.', '#C86D58', 'Flame',         1),
  ('valor',      'O que muda na prÃ¡tica',      'Mostra o resultado concreto de mudar a forma de atender, indicar e responder. Antes / depois sem hype.',                                          '#3A7D5C', 'TrendingUp',    2),
  ('conversa',   'DiÃ¡logos e roleplays',       'Trechos de conversa de balcÃ£o / WhatsApp ilustrando como conduzir, perguntar, sustentar valor, responder objeÃ§Ã£o.',                              '#9E8632', 'MessageCircle', 3),
  ('metodo',     'O mÃ©todo (5 Movimentos)',    'Recortes dos 5 Movimentos: sair do automÃ¡tico, ler o cliente, indicar com seguranÃ§a, sustentar valor, WhatsApp que converte.',                  '#2C5A7E', 'Target',        4),
  ('autoridade', 'Bastidor e autoridade',      'Quem Ã© a Taty, por que o mÃ©todo existe, decisÃµes de produto, prova social, casos.',                                                              '#406863', 'ShieldCheck',   5),
  ('oferta',     'Oferta direta',              'CTAs para checkout (Hotmart/Kiwify), promoÃ§Ãµes de lanÃ§amento, escassez genuÃ­na (sÃ³ quando real).',                                              '#128C7E', 'Tag',           6),
  ('comunidade', 'Comunidade e continuidade',  'Vida pÃ³s-compra: Nexus 90 dias, depoimentos de aluno, perguntas respondidas, prÃ³ximos passos.',                                                  '#C9A45E', 'Users',         7);

-- â”€â”€â”€ IDEAS â”€â”€â”€
WITH p AS (SELECT code, id FROM marketing.content_pillars)
INSERT INTO marketing.content_ideas (pillar_id, hook, suggested_format, target_audience, cta_suggestion) VALUES

-- DOR (18)
((SELECT id FROM p WHERE code='dor'), 'Quando o cliente entra perguntando "quanto custa?" antes de vocÃª abrir a boca', 'reel', 'vendedor de balcÃ£o', 'Salva esse vÃ­deo'),
((SELECT id FROM p WHERE code='dor'), 'O orÃ§amento que vocÃª mandou ontem no WhatsApp e ele simplesmente sumiu', 'carrossel', 'vendedor de balcÃ£o', 'Marca alguÃ©m que vive isso'),
((SELECT id FROM p WHERE code='dor'), '3 sinais de que o atendimento jÃ¡ nasceu morto antes do cliente abrir a boca', 'carrossel', 'vendedor de balcÃ£o', 'Quantos vocÃª fez hoje?'),
((SELECT id FROM p WHERE code='dor'), 'Por que vocÃª dÃ¡ desconto antes mesmo do cliente pedir', 'reel', 'vendedor de balcÃ£o', 'Conta nos comentÃ¡rios'),
((SELECT id FROM p WHERE code='dor'), 'Indicar a lente errada pra fechar venda hoje e perder o cliente pra sempre', 'post', 'vendedor de balcÃ£o', 'Compartilha'),
((SELECT id FROM p WHERE code='dor'), 'O cliente compara seu preÃ§o com a internet e vocÃª fica sem resposta', 'reel', 'vendedor de balcÃ£o', 'Te ajudo no prÃ³ximo post'),
((SELECT id FROM p WHERE code='dor'), 'Aquela cena: "vou pensar e te aviso" â€” e some pra sempre', 'reel', 'vendedor de balcÃ£o', 'Salva pra revisitar'),
((SELECT id FROM p WHERE code='dor'), 'Quando o gerente cobra meta e vocÃª nÃ£o sabe por onde comeÃ§ar a virar', 'post', 'gestor de Ã³tica', 'Conta sua realidade'),
((SELECT id FROM p WHERE code='dor'), 'Vendedor de Ã³tica que decora discurso vs vendedor que entende o cliente', 'carrossel', 'vendedor de balcÃ£o', 'Em qual vocÃª se vÃª?'),
((SELECT id FROM p WHERE code='dor'), 'Quando o atendimento comeÃ§a solto e termina em "vou olhar mais umas opÃ§Ãµes"', 'reel', 'vendedor de balcÃ£o', 'Comenta um'),
((SELECT id FROM p WHERE code='dor'), 'O cliente trava na hora de decidir e vocÃª tambÃ©m trava junto', 'post', 'vendedor de balcÃ£o', 'Salva pra prÃ³xima'),
((SELECT id FROM p WHERE code='dor'), 'A reuniÃ£o de segunda em que ninguÃ©m sabe explicar por que vendeu pouco', 'reel', 'gestor de Ã³tica', 'Marca seu gerente'),
((SELECT id FROM p WHERE code='dor'), 'Por que aquela Ã³tica do shopping vende mais barato e vocÃª nÃ£o consegue baixar', 'carrossel', 'gestor de Ã³tica', 'O que mais incomoda?'),
((SELECT id FROM p WHERE code='dor'), 'Quando vocÃª manda 5 fotos no WhatsApp e o cliente responde "obrigada, vou pensar"', 'reel', 'vendedor de balcÃ£o', 'Faz isso?'),
((SELECT id FROM p WHERE code='dor'), 'A frustraÃ§Ã£o de treinar a equipe toda semana e nada mudar no balcÃ£o', 'post', 'gestor de Ã³tica', 'Compartilha com seu time'),
((SELECT id FROM p WHERE code='dor'), 'Aquele cliente que parecia certo e desistiu na hora do fechamento', 'reel', 'vendedor de balcÃ£o', 'Por que acha que aconteceu?'),
((SELECT id FROM p WHERE code='dor'), 'Cliente que compra a lente mais barata e volta reclamando que nÃ£o enxerga bem', 'post', 'vendedor de balcÃ£o', 'VocÃª indica ou empurra?'),
((SELECT id FROM p WHERE code='dor'), 'Quando o cliente diz "tÃ¡ caro" e vocÃª nÃ£o tem nem 1 argumento pronto', 'reel', 'vendedor de balcÃ£o', 'Te conto 3 no prÃ³ximo'),

-- VALOR (16)
((SELECT id FROM p WHERE code='valor'), '3 perguntas que mudam a conversa de venda no balcÃ£o', 'carrossel', 'vendedor de balcÃ£o', 'Salva e usa amanhÃ£'),
((SELECT id FROM p WHERE code='valor'), 'Como falar de preÃ§o SEM comeÃ§ar pelo preÃ§o', 'reel', 'vendedor de balcÃ£o', 'Testa essa semana'),
((SELECT id FROM p WHERE code='valor'), 'O que muda quando vocÃª ouve o cliente antes de mostrar produto', 'post', 'vendedor de balcÃ£o', 'Conta o antes e depois'),
((SELECT id FROM p WHERE code='valor'), '4 perfis de cliente â€” qual vocÃª atende mal e nem sabe', 'carrossel', 'vendedor de balcÃ£o', 'Salva pra estudar'),
((SELECT id FROM p WHERE code='valor'), 'A diferenÃ§a entre indicar lente e empurrar lente', 'reel', 'vendedor de balcÃ£o', 'Em qual lado vocÃª estÃ¡?'),
((SELECT id FROM p WHERE code='valor'), 'O ROI de uma boa anamnese: tempo, ticket mÃ©dio e recompra', 'carrossel', 'gestor de Ã³tica', 'Salva pra mostrar pro time'),
((SELECT id FROM p WHERE code='valor'), 'Por que o WhatsApp bem usado vale mais que 3 vendedores no balcÃ£o', 'reel', 'gestor de Ã³tica', 'Concorda?'),
((SELECT id FROM p WHERE code='valor'), 'Como retomar um orÃ§amento perdido sem parecer chato', 'post', 'vendedor de balcÃ£o', 'Salva o script'),
((SELECT id FROM p WHERE code='valor'), 'A frase que faz o cliente parar de comparar preÃ§o e comeÃ§ar a confiar em vocÃª', 'reel', 'vendedor de balcÃ£o', 'Testa e me conta'),
((SELECT id FROM p WHERE code='valor'), 'Atendimento de 7 minutos que fecha vs atendimento de 30 minutos que esfria', 'carrossel', 'vendedor de balcÃ£o', 'Qual Ã© o seu?'),
((SELECT id FROM p WHERE code='valor'), 'O segredo de quem sustenta valor: a ordem certa das perguntas', 'reel', 'vendedor de balcÃ£o', 'Salva pra revisitar'),
((SELECT id FROM p WHERE code='valor'), 'Como transformar "vou pensar" em "vou levar" sem pressionar', 'post', 'vendedor de balcÃ£o', 'Compartilha com a equipe'),
((SELECT id FROM p WHERE code='valor'), 'O que mudou nas minhas vendas quando parei de mostrar produto e comecei a perguntar', 'reel', 'vendedor de balcÃ£o', 'Conta a sua mudanÃ§a'),
((SELECT id FROM p WHERE code='valor'), 'DiagnÃ³stico em 5 perguntas: cliente perfeito vs cliente que vai sumir', 'carrossel', 'vendedor de balcÃ£o', 'Salva pra usar'),
((SELECT id FROM p WHERE code='valor'), 'Atendimento bom nÃ£o Ã© o mais simpÃ¡tico â€” Ã© o que conduz', 'post', 'vendedor de balcÃ£o', 'Concorda?'),
((SELECT id FROM p WHERE code='valor'), 'Quando vocÃª para de "vender lente" e comeÃ§a a "resolver problema", o ticket sobe', 'reel', 'vendedor de balcÃ£o', 'Bora testar?'),

-- CONVERSA (14)
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente diz "tÃ¡ caro" â€” o que vocÃª responde?', 'reel', 'vendedor de balcÃ£o', 'Comenta sua resposta'),
((SELECT id FROM p WHERE code='conversa'), 'WhatsApp: como retomar um cliente que sumiu hÃ¡ 5 dias', 'carrossel', 'vendedor de balcÃ£o', 'Salva esse modelo'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente quer sÃ³ o exame â€” vocÃª abre a porta pra venda?', 'reel', 'vendedor de balcÃ£o', 'Comenta como faz'),
((SELECT id FROM p WHERE code='conversa'), 'Antes/depois: a mesma resposta no WhatsApp do jeito errado e do jeito certo', 'carrossel', 'vendedor de balcÃ£o', 'Qual vocÃª usa?'),
((SELECT id FROM p WHERE code='conversa'), 'A pergunta de abertura que muda o tom do atendimento todo', 'reel', 'vendedor de balcÃ£o', 'Testa essa semana'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente que pergunta preÃ§o de tudo antes de testar', 'reel', 'vendedor de balcÃ£o', 'Comenta como faz'),
((SELECT id FROM p WHERE code='conversa'), 'Como falar de antirreflexo sem ser tÃ©cnico demais', 'post', 'vendedor de balcÃ£o', 'Salva o jeito certo'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente acompanhado â€” quem vocÃª atende primeiro?', 'reel', 'vendedor de balcÃ£o', 'O que faria?'),
((SELECT id FROM p WHERE code='conversa'), '4 mensagens curtas no WhatsApp que destravam um orÃ§amento parado', 'carrossel', 'vendedor de balcÃ£o', 'Salva e adapta'),
((SELECT id FROM p WHERE code='conversa'), 'A frase de fechamento que respeita o cliente mas pede a decisÃ£o', 'reel', 'vendedor de balcÃ£o', 'Decora essa'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente que quer sÃ³ armaÃ§Ã£o â€” vocÃª fala da lente quando?', 'reel', 'vendedor de balcÃ£o', 'Comenta seu jeito'),
((SELECT id FROM p WHERE code='conversa'), 'Como responder "vou comparar em outras Ã³ticas" sem ficar passivo', 'post', 'vendedor de balcÃ£o', 'Salva e treina'),
((SELECT id FROM p WHERE code='conversa'), 'A diferenÃ§a entre "posso ajudar?" e a abertura que prende o cliente', 'reel', 'vendedor de balcÃ£o', 'Salva pra estudar'),
((SELECT id FROM p WHERE code='conversa'), 'Roleplay: cliente que esquece o que tinha conversado e volta semana depois', 'reel', 'vendedor de balcÃ£o', 'Como retoma?'),

-- MÃ‰TODO (14)
((SELECT id FROM p WHERE code='metodo'), 'Os 5 Movimentos que separam vendedor mediano de top de Ã³tica', 'carrossel', 'vendedor de balcÃ£o', 'Salva os 5'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 1: sair do atendimento automÃ¡tico em 3 passos', 'reel', 'vendedor de balcÃ£o', 'Treina hoje'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 2: ler o cliente em menos de 1 minuto', 'reel', 'vendedor de balcÃ£o', 'Compartilha com o time'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 3: indicar com seguranÃ§a, nÃ£o com sorte', 'carrossel', 'vendedor de balcÃ£o', 'Salva o checklist'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 4: sustentar valor sem precisar dar desconto', 'reel', 'vendedor de balcÃ£o', 'Testa essa'),
((SELECT id FROM p WHERE code='metodo'), 'Movimento 5: o WhatsApp que retoma, reage e converte', 'reel', 'vendedor de balcÃ£o', 'Salva o mÃ©todo'),
((SELECT id FROM p WHERE code='metodo'), 'DiagnÃ³stico rÃ¡pido: vocÃª atende no improviso ou no mÃ©todo?', 'post', 'vendedor de balcÃ£o', 'Faz o teste'),
((SELECT id FROM p WHERE code='metodo'), 'A jornada do cliente na Ã³tica em 7 etapas â€” onde vocÃª perde mais', 'carrossel', 'gestor de Ã³tica', 'Onde sua loja vaza?'),
((SELECT id FROM p WHERE code='metodo'), 'Os 4 perfis de cliente â€” e a indicaÃ§Ã£o certa pra cada um', 'carrossel', 'vendedor de balcÃ£o', 'Salva pra aplicar'),
((SELECT id FROM p WHERE code='metodo'), '3 erros de indicaÃ§Ã£o que parecem inofensivos e custam venda', 'post', 'vendedor de balcÃ£o', 'Faz alguns?'),
((SELECT id FROM p WHERE code='metodo'), 'Plano de 72 horas pra mudar como vocÃª atende a partir de segunda', 'carrossel', 'vendedor de balcÃ£o', 'Aceita o desafio?'),
((SELECT id FROM p WHERE code='metodo'), 'Mapa de objeÃ§Ãµes: as 6 mais comuns e como responder cada uma', 'carrossel', 'vendedor de balcÃ£o', 'Salva pra revisar'),
((SELECT id FROM p WHERE code='metodo'), 'A diferenÃ§a entre vender produto e conduzir decisÃ£o', 'reel', 'vendedor de balcÃ£o', 'Qual Ã© o seu modo?'),
((SELECT id FROM p WHERE code='metodo'), 'A regra dos 3 sins antes do preÃ§o â€” funciona em 8 de cada 10 atendimentos', 'reel', 'vendedor de balcÃ£o', 'Testa e me conta'),

-- AUTORIDADE (12)
((SELECT id FROM p WHERE code='autoridade'), 'Quem Ã© a Taty: 25 anos de balcÃ£o sem nunca ter parado', 'reel', 'vendedor de balcÃ£o', 'Conhece a Taty?'),
((SELECT id FROM p WHERE code='autoridade'), 'Por que decidi colocar 25 anos de balcÃ£o num PDF de 35 pÃ¡ginas', 'post', 'vendedor de balcÃ£o', 'Faz sentido pra vocÃª?'),
((SELECT id FROM p WHERE code='autoridade'), 'O atendimento da Taty: 3 cenas reais que viraram liÃ§Ã£o no mÃ©todo', 'carrossel', 'vendedor de balcÃ£o', 'Salva pra estudar'),
((SELECT id FROM p WHERE code='autoridade'), 'Como nasceu o Ã“tica Sem Improviso â€” a histÃ³ria em 1 minuto', 'reel', 'vendedor de balcÃ£o', 'Compartilha'),
((SELECT id FROM p WHERE code='autoridade'), 'O que aprendi em 4 dÃ©cadas atrÃ¡s do balcÃ£o que ninguÃ©m ensina em curso', 'post', 'vendedor de balcÃ£o', 'Comenta'),
((SELECT id FROM p WHERE code='autoridade'), 'A bronca da Taty pra quem vende lente "no chute"', 'reel', 'vendedor de balcÃ£o', 'JÃ¡ tomou essa?'),
((SELECT id FROM p WHERE code='autoridade'), 'A frase da Taty que mudou a forma como eu fecho venda', 'post', 'vendedor de balcÃ£o', 'Qual Ã© a sua frase?'),
((SELECT id FROM p WHERE code='autoridade'), 'Depoimento: como o mÃ©todo mudou o atendimento de uma Ã³tica de bairro', 'reel', 'vendedor de balcÃ£o', 'Quer fazer parte?'),
((SELECT id FROM p WHERE code='autoridade'), 'Por que o mÃ©todo nÃ£o promete "vender mais" e sim "vender melhor"', 'post', 'gestor de Ã³tica', 'Concorda?'),
((SELECT id FROM p WHERE code='autoridade'), 'O mÃ©todo nÃ£o Ã© teoria de curso â€” Ã© prÃ¡tica validada em balcÃ£o de verdade', 'reel', 'vendedor de balcÃ£o', 'Salva e compartilha'),
((SELECT id FROM p WHERE code='autoridade'), 'A diferenÃ§a entre quem vende Ã³tica e quem entende Ã³tica', 'post', 'vendedor de balcÃ£o', 'VocÃª Ã© qual dos 2?'),
((SELECT id FROM p WHERE code='autoridade'), 'O que a Taty ensina que nenhum representante de Ã³tica te conta', 'carrossel', 'vendedor de balcÃ£o', 'Quer saber?'),

-- OFERTA (12)
((SELECT id FROM p WHERE code='oferta'), 'Ã“tica Sem Improviso: PDF + app + 90 dias de apoio. R$ 97. (50% off no lanÃ§amento)', 'post', 'vendedor de balcÃ£o', 'Quero o mÃ©todo'),
((SELECT id FROM p WHERE code='oferta'), 'Por que R$ 48,50 paga 1 venda recuperada no WhatsApp', 'reel', 'vendedor de balcÃ£o', 'Vale o teste?'),
((SELECT id FROM p WHERE code='oferta'), 'O que vem com o manual Ã“tica Sem Improviso: lista completa', 'carrossel', 'vendedor de balcÃ£o', 'Garante o teu'),
((SELECT id FROM p WHERE code='oferta'), 'PDF profissional pra imprimir + app pra estudar no celular + Nexus 90 dias', 'reel', 'vendedor de balcÃ£o', 'Quero acessar'),
((SELECT id FROM p WHERE code='oferta'), 'Onde comprar: link na bio', 'story', 'vendedor de balcÃ£o', 'Link na bio'),
((SELECT id FROM p WHERE code='oferta'), 'LanÃ§amento: condiÃ§Ã£o especial pra quem entra na 1Âª turma', 'reel', 'vendedor de balcÃ£o', 'Aproveita'),
((SELECT id FROM p WHERE code='oferta'), 'ComparaÃ§Ã£o: 1 curso longo de R$ 1.500 vs 1 manual de R$ 97 que entrega o mÃ©todo', 'carrossel', 'vendedor de balcÃ£o', 'O que prefere?'),
((SELECT id FROM p WHERE code='oferta'), 'Acesso imediato: vocÃª compra hoje e comeÃ§a amanhÃ£ na loja', 'post', 'vendedor de balcÃ£o', 'Pega o mÃ©todo'),
((SELECT id FROM p WHERE code='oferta'), 'Pra equipe: pacote pra Ã³tica que quer treinar atÃ© 5 vendedores', 'reel', 'gestor de Ã³tica', 'Fala com a gente'),
((SELECT id FROM p WHERE code='oferta'), 'Garantia: 7 dias pra testar. Se nÃ£o fizer sentido, devolve o dinheiro', 'post', 'vendedor de balcÃ£o', 'Sem risco'),
((SELECT id FROM p WHERE code='oferta'), 'O Hotmart processou: vocÃª recebe acesso em segundos', 'story', 'vendedor de balcÃ£o', 'Compra aqui'),
((SELECT id FROM p WHERE code='oferta'), 'Ãšltima semana de lanÃ§amento â€” depois o preÃ§o vai subir', 'reel', 'vendedor de balcÃ£o', 'Garante agora'),

-- COMUNIDADE (12)
((SELECT id FROM p WHERE code='comunidade'), 'O que tem dentro da Nexus: como sÃ£o os 90 dias depois da compra', 'carrossel', 'comprador novo', 'Salva pra revisitar'),
((SELECT id FROM p WHERE code='comunidade'), 'Conhece o Doug: o veterano de balcÃ£o que tira suas dÃºvidas dentro do app', 'reel', 'comprador novo', 'Apresenta o Doug'),
((SELECT id FROM p WHERE code='comunidade'), 'A dÃºvida que mais aparece na Nexus na primeira semana', 'post', 'comprador novo', 'Ã‰ a sua tambÃ©m?'),
((SELECT id FROM p WHERE code='comunidade'), 'Tela do app: como navegar pelos 5 mÃ³dulos sem se perder', 'reel', 'comprador novo', 'Salva o tour'),
((SELECT id FROM p WHERE code='comunidade'), 'Os 8 workshops prÃ¡ticos que entram apÃ³s vocÃª ler os mÃ³dulos', 'carrossel', 'comprador novo', 'Qual mais te interessa?'),
((SELECT id FROM p WHERE code='comunidade'), 'Como a Taty entra na Nexus: respostas dela ao vivo nos primeiros 30 dias', 'reel', 'comprador novo', 'Vai estar lÃ¡?'),
((SELECT id FROM p WHERE code='comunidade'), 'Depoimento: 1 semana de Nexus mudou meu atendimento no balcÃ£o', 'reel', 'vendedor de balcÃ£o', 'Vem fazer parte'),
((SELECT id FROM p WHERE code='comunidade'), 'O que vocÃª ganha alÃ©m do PDF: lista detalhada do que tem na Nexus', 'carrossel', 'comprador novo', 'Vale a pena?'),
((SELECT id FROM p WHERE code='comunidade'), 'Como pedir ajuda ao Doug quando travar no balcÃ£o real', 'reel', 'comprador novo', 'Conta um caso'),
((SELECT id FROM p WHERE code='comunidade'), 'Os 5 Movimentos virando rotina: como nossos alunos aplicam', 'carrossel', 'comprador novo', 'Faz parte?'),
((SELECT id FROM p WHERE code='comunidade'), 'O que muda nas suas vendas 30, 60 e 90 dias depois de aplicar o mÃ©todo', 'reel', 'comprador novo', 'Vamos juntos?'),
((SELECT id FROM p WHERE code='comunidade'), 'Como sair da Nexus depois de 90 dias com mÃ©todo interiorizado, nÃ£o dependente de app', 'post', 'comprador novo', 'Ã‰ o que queremos');
