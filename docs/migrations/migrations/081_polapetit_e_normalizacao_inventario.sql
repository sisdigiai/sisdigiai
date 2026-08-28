-- ============================================================
-- 081 — Polá Petit no inventário + normalização do vocabulário
-- ============================================================
-- Origem: `digiai_mkt/_AVISO_AO_DIGIAI_2026-08-28_polapetit_e_tick.md`.
--
-- Desde a ORDEM 2 (17/08), `ops.*` é escrito pelo `digiai` e lido pelo `digiai_mkt`.
-- Registrar ativo de empresa passou a ser tarefa desta casa — é o que esta migration faz.
--
-- ── PARTE 1 — o vocabulário rachou, e é preciso consertar antes de crescer ──
--
-- As linhas criadas para o P4 entraram com nomes NOVOS para conceitos que já tinham nome:
--     facebook_page  (4)  ao lado de  rede_facebook         (6)
--     instagram      (5)  ao lado de  rede_instagram        (5)
--     search_console (2)  ao lado de  google_search_console (1)
--
-- Não são ativos duplicados — são os mesmos conceitos sob dois nomes. O efeito é o mesmo
-- do `Programações Gerais` vs `Programacoes Gerais` que já corrigimos: quem filtra por um
-- não vê o outro, e a tela de Inventário joga 11 linhas em "Outros" por não reconhecer
-- os nomes novos.
--
-- Parte da culpa é minha: o despacho do P4 nomeava o `servico` alvo em cada seção, mas eu
-- o escrevi quando a tabela era do MKT, sem poder para fixar vocabulário. Agora tenho.
--
-- Nenhuma colisão de UNIQUE(servico, identificador): conferido linha a linha antes.
--
-- ── PARTE 2 — `empresa_slug` das lojas veio como `digiai` ──
-- Páginas e Instagrams das 4 lojas Mello e o @pulsoprojects entraram com `empresa_slug`
-- = 'digiai'. Isso quebra o agrupamento por empresa: a loja de Perus não é da DIGIAI.
-- Os pixels seguem a mesma correção — cada um pertence à BM que o criou.
--
-- ── PARTE 3 — `navegador` rachou de novo, com grafias novas ──
-- A normalização anterior resolveu as duas que apontei, e nasceram outras duas:
-- `DIGIAI` ao lado de `empresa DIGIAI`. Corrigida aqui.
-- `Pessoal` (1 linha, tiktok_dev sandbox) NÃO foi mexida: pode ser o `Chrome Junior` ou
-- outro perfil, e eu não tenho evidência. Adivinhar aqui repetiria o erro que este
-- inventário já cometeu — fica marcada para o dono confirmar.
--
-- ── PARTE 4 — Polá Petit ──
-- Rebranding de Taty Mello Festas (12 anos, Suzano/SP). A marca existe em `mkt.brands`
-- desde 27/08 com `ativo=false` e `ensaio=true` (trava do dono: "publicações ainda não").
-- `mkt.accounts` tem ZERO linhas dela — existe como marca, não como conta medível.
-- Os ativos abaixo vêm do aviso do MKT e ficam registrados para não se perderem.
-- ============================================================

-- ── PARTE 1 — um nome por conceito ──
UPDATE ops.contas_servicos SET servico = 'rede_facebook'         WHERE servico = 'facebook_page';
UPDATE ops.contas_servicos SET servico = 'rede_instagram'        WHERE servico = 'instagram';
UPDATE ops.contas_servicos SET servico = 'google_search_console' WHERE servico = 'search_console';

-- Identificadores das Páginas eram ambíguos: "Suzano" podia ser a loja Mello ou a
-- Óticas Lancaster Suzano, que também existe. Nome completo remove a dúvida.
UPDATE ops.contas_servicos SET identificador = 'Óticas Taty Mello - Perus'       WHERE servico='rede_facebook' AND identificador='Perus';
UPDATE ops.contas_servicos SET identificador = 'Óticas Taty Mello - Rio Pequeno' WHERE servico='rede_facebook' AND identificador='Rio Pequeno';
UPDATE ops.contas_servicos SET identificador = 'Óticas Taty Mello - São Mateus'  WHERE servico='rede_facebook' AND identificador='Sao Mateus';
UPDATE ops.contas_servicos SET identificador = 'Óticas Taty Mello - Suzano'      WHERE servico='rede_facebook' AND identificador='Suzano';

-- ── PARTE 2 — cada ativo sob a empresa que o possui ──
UPDATE ops.contas_servicos SET empresa_slug='mello-perus'
  WHERE identificador IN ('Óticas Taty Mello - Perus','@oticastatymelloperus');
UPDATE ops.contas_servicos SET empresa_slug='mello-rio-pequeno'
  WHERE identificador IN ('Óticas Taty Mello - Rio Pequeno','@oticastatymelloriopequeno');
UPDATE ops.contas_servicos SET empresa_slug='mello-sao-mateus'
  WHERE identificador IN ('Óticas Taty Mello - São Mateus','@oticastatymellosaomateus');
UPDATE ops.contas_servicos SET empresa_slug='mello-suzano'
  WHERE identificador IN ('Óticas Taty Mello - Suzano','@oticastatymellosuzano');
UPDATE ops.contas_servicos SET empresa_slug='pulso'
  WHERE servico='rede_instagram' AND identificador='@pulsoprojects';

UPDATE ops.contas_servicos SET empresa_slug='mello'
  WHERE servico='meta_pixel' AND identificador IN ('landing_page','pixel_landing_page');
UPDATE ops.contas_servicos SET empresa_slug='mello-matriz'
  WHERE servico='meta_pixel' AND identificador='Pixel de OTM_TOTAL';
UPDATE ops.contas_servicos SET empresa_slug='lancaster'
  WHERE servico='meta_pixel' AND identificador='pixel_lancaster';

-- ── PARTE 3 — navegador ──
UPDATE ops.contas_servicos SET navegador='empresa DIGIAI' WHERE navegador='DIGIAI';

UPDATE ops.contas_servicos
SET obs = concat_ws(E'\n', NULLIF(obs,''),
      '[navegador a confirmar 2026-08-28] Perfil "Pessoal" existe só nesta linha. Pode ser o '
      || 'mesmo "Chrome Junior" das demais contas pessoais, mas não há evidência — não foi '
      || 'unificado por isso.')
WHERE navegador='Pessoal';

-- ── PARTE 4 — ativos da Polá Petit ──
INSERT INTO ops.contas_servicos
  (servico, identificador, empresa_slug, categoria, status, situacao, navegador, ativo, ultimo_detalhe, obs)
VALUES
  ('meta_bm', 'Taty Mello - Assessoria', 'polapetit', 'business_manager', 'atencao', 'ativa', 'empresa DIGIAI', true,
   'BM da Polá Petit — o app do Meta ainda NÃO foi autorizado nela',
   E'BM 803929703137082. Guarda a Página, o Instagram, a conta de anúncios 275190395019982\n'
   || E'(renomeada para "Polá Petit") e o pixel da marca.\n'
   || E'PENDÊNCIA DO DONO: os 2 tokens Meta existentes pertencem a OUTRAS BMs (um cobre\n'
   || E'digiai/osi, outro mello/lancaster). Conectar a conta à Página dentro do BM não concede\n'
   || E'acesso ao app — são autorizações diferentes. Sem esse passo o sync-metricas não coleta\n'
   || E'NADA da Polá Petit. É o pré-requisito de todo o analytics dela.'),

  ('rede_facebook', 'Polá Petit', 'polapetit', 'rede_social', 'ok', 'ativa', 'empresa DIGIAI', true,
   'Página com 4,5 mil seguidores e 4,8 estrelas em 51 avaliações',
   E'Página 411169915680711, na BM Taty Mello - Assessoria.\n'
   || E'O 4,8 com 51 avaliações é VERDADEIRO — mas é do Facebook. Sempre nomear a fonte:\n'
   || E'a nota do Google é outra (4,4 com 7 avaliações).'),

  ('rede_instagram', '@polapetit_', 'polapetit', 'rede_social', 'ok', 'ativa', 'empresa DIGIAI', true,
   'Marca-mãe, 1.675 seguidores, conta verificada',
   'IG 17841401927234544. Linha de Decoração — é a conta principal do guarda-chuva Polá Petit.'),

  ('rede_instagram', '@atelietatymello', 'polapetit', 'rede_social', 'ok', 'ativa', 'empresa DIGIAI', true,
   'Linha Ateliê, 1.360 seguidores e 425 posts',
   'Mantém o nome Taty Mello. A marca Taty Mello passa a ser ORIGEM, não marca ativa.'),

  ('rede_instagram', '@acervopolapetit', 'polapetit', 'rede_social', 'atencao', 'ativa', 'empresa DIGIAI', true,
   'Linha Locação/Acervo, apenas 59 seguidores',
   'A menor das três contas do guarda-chuva.'),

  ('meta_pixel', '1792075898806171', 'polapetit', 'ads', 'pausado', 'ativa', 'empresa DIGIAI', true,
   'Criado em 27/08 e AINDA NÃO INSTALADO na landing',
   E'Pixel existe no Meta e não recebe evento nenhum porque não está na página.\n'
   || E'Mesma situação dos 4 pixels de Mello e Lancaster: criado não é o mesmo que coletando.\n'
   || E'Landing: polapetit.netlify.app. O domínio .com.br NÃO foi comprado.'),

  ('google_business_profile', 'Polá Petit', 'polapetit', 'rede_social', 'atencao', 'ativa', 'empresa DIGIAI', true,
   'Perfil ativo com 257 interações e 4,4 estrelas em 7 avaliações',
   E'Perfil já existe e foi renomeado para "Polá Petit".\n'
   || E'ATENÇÃO: a landing publica "4,9 estrelas no Google" — é FALSO. O real é 4,4 com 7 avaliações.\n'
   || E'ACESSO À API NÃO VERIFICADO: o MKT levanta que a família Business Profile não é\n'
   || E'self-service e exigiria pedido aprovado no Google Cloud. Marcado como hipótese, não\n'
   || E'como fato — não montar cronograma em cima antes de conferir.')
ON CONFLICT (servico, identificador) DO UPDATE SET
  empresa_slug   = EXCLUDED.empresa_slug,
  categoria      = EXCLUDED.categoria,
  status         = EXCLUDED.status,
  navegador      = EXCLUDED.navegador,
  ultimo_detalhe = EXCLUDED.ultimo_detalhe,
  obs            = EXCLUDED.obs,
  updated_at     = now();

-- O catálogo grafa "PolaPetit"; a marca é "Polá Petit".
UPDATE finance.products
SET name = 'Polá Petit — decoração, buffet, ateliê e locação',
    notes = 'Rebranding de Taty Mello Festas (Suzano/SP) decidido em 27/08/2026. Taty Mello vira origem, não marca ativa.'
WHERE id = 'polapetit';

NOTIFY pgrst, 'reload schema';
