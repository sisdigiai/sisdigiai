-- ============================================================
-- 076 — estado real do SEO no Google e ausência do Analytics
-- ============================================================
-- Levantado no navegador em 2026-08-16, na conta sisdigiai@gmail.com.
--
-- DESFAZ UMA SUSPEITA MINHA, ANTES QUE VIRE TAREFA ERRADA: eu vinha tratando o
-- SEO como "morto há 54 dias". Os sitemaps das 3 propriedades estão vivos e foram
-- lidos pelo Google entre 13 e 16/08. O que morreu foi a TELA no app que mostrava
-- isso — o Google nunca parou. Consertar a tela é o trabalho; o canal não está quebrado.
--
-- O QUE ESTÁ DE FATO RUIM É O TAMANHO E O RETORNO:
--
--   propriedade            sitemap  páginas  cliques  impressões  posição  CTR
--   digiai.app.br          ok       15       2        281         8,2      0,7%
--   clearix.app.br         ok        5       2         33        26,2      6,1%
--   mellooticas.com.br     ok        6       0         16        14,3      0%
--
-- Somando tudo: 4 cliques em ~3 meses. O canal existe, está tecnicamente saudável
-- e não entrega nada ainda. Isso é coerente com empresa em pré-lançamento — é
-- cold start, não otimização — e serve de linha de base para medir depois.
--
-- Dois sinais que valem leitura separada:
--   · digiai.app.br está em posição 8,2 com CTR de 0,7%. Posição de primeira página
--     com CTR desse tamanho normalmente aponta título/descrição que não convidam
--     ao clique, não falta de ranking. É a única das 3 onde há o que otimizar hoje.
--   · clearix.app.br está em 26,2 — página 3, invisível na prática. E é o produto-
--     âncora. Não adianta mexer em CTR do que ninguém vê; ali o problema é ranking.
--   · mellooticas.com.br é e-commerce com 6 páginas no sitemap. Catálogo não está
--     indexado. É o maior potencial de crescimento e o mais barato de corrigir.
--
-- GOOGLE ANALYTICS: nenhuma propriedade. A conta cai na tela de criação. O
-- inventário já dizia "(nenhuma propriedade)" e está certo.
--
-- RECOMENDAÇÃO EXPLÍCITA DE NÃO FAZER: não criar GA agora. O app já tem medição
-- própria no schema `analytics`, que é a que respondeu quantos usos a Clearix Calc
-- teve e quantos checkouts o OSI teve. Ligar GA criaria uma segunda contagem dos
-- mesmos fatos — exatamente o problema que já custou caro aqui (o inventário do
-- Meta contava ativo emprestado como próprio, e o Dashboard mostrou queda de 94,6%
-- no burn que era mês incompleto). Se faltar medida, abrir view na fonte que já existe.
--
-- TIKTOK: o Business Center não está logado neste navegador e eu não faço login
-- com credencial do dono. As 3 contas, o app de dev e o pixel D8HQ7JJC77U8POE06IQG
-- seguem sem verificação — precisam do dono abrir a sessão.
--
-- Só UPDATE em linha existente (R-032). Idempotente pelo marcador [estado-real].
-- ============================================================

UPDATE ops.contas_servicos
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(obs, ''), '[estado-real', 1), E'\n '), ''),
      E'[estado-real 2026-08-16] São 3 propriedades, não 1 — todas em sisdigiai@gmail.com\n' ||
      E'e espelhadas em company.seo_sites:\n' ||
      E'  digiai.app.br ...... sitemap-index lido 13/08, 15 páginas · 2 cliques, 281 impr., pos 8,2, CTR 0,7%\n' ||
      E'  clearix.app.br ..... sitemap-index lido 14/08,  5 páginas · 2 cliques,  33 impr., pos 26,2, CTR 6,1%\n' ||
      E'  mellooticas.com.br . sitemap lido 16/08,        6 páginas · 0 cliques,  16 impr., pos 14,3\n' ||
      E'Sitemaps VIVOS — a suspeita de "SEO morto há 54 dias" era da tela do app, não do Google.\n' ||
      E'4 cliques em ~3 meses somando os 3. Linha de base registrada.'),
    ultimo_detalhe = '3 propriedades ativas; sitemaps lidos entre 13 e 16/08; 4 cliques no total',
    ultima_verificacao = now(),
    updated_at = now()
WHERE servico = 'google_search_console';

UPDATE ops.contas_servicos
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(obs, ''), '[estado-real', 1), E'\n '), ''),
      E'[estado-real 2026-08-16] Confirmado zero propriedades — a conta cai na tela de criação.\n' ||
      E'Recomendação: NÃO criar. O schema `analytics` do digiai já mede o funil de negócio;\n' ||
      E'GA seria uma segunda contagem dos mesmos fatos, e contagem duplicada aqui já mentiu antes.'),
    ultimo_detalhe = 'Zero propriedades — e a recomendação é manter assim',
    ultima_verificacao = now(),
    updated_at = now()
WHERE servico = 'google_analytics';

UPDATE ops.contas_servicos
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(obs, ''), '[estado-real', 1), E'\n '), ''),
      E'[estado-real 2026-08-16] Não verificado: o TikTok Business Center não está logado\n' ||
      E'no navegador e a sessão depende do dono. Segue sem conferência de estado.'),
    ultima_verificacao = now(),
    updated_at = now()
WHERE servico IN ('rede_tiktok', 'tiktok_dev', 'tiktok_pixel');

NOTIFY pgrst, 'reload schema';
