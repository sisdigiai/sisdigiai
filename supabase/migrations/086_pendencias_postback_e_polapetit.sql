-- ============================================================
-- 086 — pendências humanas: postbacks de venda e Polá Petit
-- ============================================================
-- Registra na fila do dono o que estava vivendo só em conversa entre agentes.
-- `ops.pendencias_humanas` com `severidade = 1` é o que a `fn_gerar_ordem_do_dia`
-- puxa para a ordem do dia — por isso a severidade aqui não é opinião, é roteamento.
--
-- ── POR QUE O POSTBACK É SEVERIDADE 1 ──
-- Eu já sabia que Hotmart e Kiwify nunca foram chamados pelos fornecedores: 27 dias,
-- um único evento em cada, ambos com payload `{}` vazio e sem assinatura, de IP
-- residencial — teste manual, não o fornecedor.
--
-- O que eu NÃO sabia, e o agente do digiai_mkt devolveu hoje, é a consequência que
-- transforma isso de lacuna em dano ativo:
--
--   o ciclo de aprendizado deles (`mkt.content_weights`) ajusta formato e gatilho pelo
--   que performa — e como venda nunca chega, ele aprende com ALCANCE e ENGAJAMENTO,
--   que é o que existe. Não está incompleto: está OTIMIZANDO PARA O PROXY ERRADO.
--   Carrossel que dá alcance e não vende sobe de peso; reel que vende pouco mas vende
--   desce. Vinte e sete dias já enviesaram os pesos em uso.
--
-- Ou seja: o custo não para de correr enquanto ninguém registra a URL. Cada dia sem
-- postback não é só um dia sem medir — é um dia treinando o motor a errar.
--
-- E torna inexequível a regra que o próprio plano editorial da OSI declara —
-- "sucesso na OSI não é alcance, é movimento no funil". Está escrito como escolha e
-- hoje é dependência externa.
--
-- ── AS TRÊS DA POLÁ PETIT SÃO SEVERIDADE 2 ──
-- Bloqueiam a marca nova, não o motor da empresa. Ficam fora da ordem do dia até
-- alguém promovê-las, o que é o comportamento certo para marca em ensaio.
--
-- Idempotente por título: rodar de novo não duplica.
-- ============================================================

INSERT INTO ops.pendencias_humanas (titulo, porque, severidade, area, fonte, status)
SELECT v.titulo, v.porque, v.severidade, v.area, v.fonte, 'aberta'
FROM (VALUES
  ('Registrar as URLs de postback do Hotmart e do Kiwify',
   'Os dois endpoints estão no ar (hotmart-webhook v25, kiwify-webhook v23) com segredo '
   || 'configurado e tabelas prontas, e em 27 dias nenhum dos dois recebeu uma chamada real '
   || 'do fornecedor. Uma venda do OSI hoje não seria registrada em lugar nenhum. Pior: como '
   || 'venda nunca chega, o ciclo de aprendizado do MKT (mkt.content_weights) aprende por '
   || 'alcance e engajamento e está otimizando para o proxy errado — conteúdo que alcança e '
   || 'não vende sobe de peso. Cada dia sem postback treina o motor a errar. É colar uma URL '
   || 'no painel de cada fornecedor.',
   1, 'vendas', 'digiai + digiai_mkt, 2026-08-28'),

  ('Autorizar o app do Meta na BM da Polá Petit (803929703137082)',
   'Os 2 tokens Meta existentes pertencem a outras BMs. Conectar a conta à Página dentro do '
   || 'BM não concede acesso ao app — são autorizações diferentes. Sem esse passo o '
   || 'sync-metricas não coleta nada da Polá Petit: é o pré-requisito de todo o analytics '
   || 'dela. O secret precisa se chamar META_TOKEN_POLAPETIT; com outro nome o publicador cai '
   || 'no token da OSI por fallback e a falha aparece como erro de permissão no BM errado.',
   2, 'polapetit', 'aviso do digiai_mkt, 2026-08-28'),

  ('Comprar o domínio polapetit.com.br',
   'Deixou de ser questão de marca: a API do Google Business Profile exige site listado no '
   || 'perfil como requisito de elegibilidade, e hoje a landing vive em polapetit.netlify.app. '
   || 'Sem domínio próprio o pedido de acesso à API fica frágil ou é negado.',
   2, 'polapetit', 'verificado na doc do Google, 2026-08-28'),

  ('Instalar o pixel 1792075898806171 na landing da Polá Petit',
   'Criado em 27/08 e nunca instalado: existe no Meta e não recebe evento nenhum. É a mesma '
   || 'situação dos 4 pixels de Mello e Lancaster que mostram "não há dados conectados" — '
   || 'criado não é o mesmo que coletando.',
   2, 'polapetit', 'aviso do digiai_mkt, 2026-08-28')
) AS v(titulo, porque, severidade, area, fonte)
WHERE NOT EXISTS (
  SELECT 1 FROM ops.pendencias_humanas p
  WHERE p.titulo = v.titulo AND p.deleted_at IS NULL
);

NOTIFY pgrst, 'reload schema';
