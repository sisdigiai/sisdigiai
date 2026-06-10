-- Seed dos 2 prompts "Cavalo de Troia equipe" — framing pra DONO de ótica comprar
-- o material OSI como "treinamento de equipe" e não como "curso pra ele".
-- Resolve M4.9 da RECONCILIACAO_marketing_2026-05-31.md (plano-mestre §8,
-- plano-de-largada §11): ângulo transversal aos 7 pilares editoriais,
-- aplicável a qualquer ideia que queira usar esse framing.

INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, locks, placeholders, is_active, sort_order)
VALUES
  (
    'cavalo-troia-reel-equipe',
    'Cavalo de Troia · Reel para dono treinar equipe',
    'text',
    'chatgpt',
    'Reel direcionado ao DONO de ótica enquadrando o produto OSI como material de treinamento da equipe — não como curso pra ele. Quebra resistência "eu já sei vender" deslocando o foco pra "minha equipe precisa disso" (plano-mestre §8, plano-de-largada §11).',
    E'Crie um roteiro de Reel de 30s direcionado ao DONO/GERENTE de ótica.\n\nÂngulo "Cavalo de Troia":\n- O dono é o comprador, mas o material é pra equipe.\n- Não posicione como "curso pra você" — posicione como "material pra você treinar sua equipe sem perder tempo".\n- Tira a defesa do dono ("eu já sei vender") porque a compra é pra resolver problema da equipe.\n\nEstrutura:\n1. Hook (0-3s): dor com a equipe ("seu vendedor ainda não sabe responder isso?")\n2. Promessa (3-10s): "compra uma vez, treina pra sempre"\n3. Mecanismo (10-22s): "manual visual em PDF + 5 movimentos + acesso 90 dias na Nexus"\n4. CTA (22-30s): "link no perfil — checkout Hotmart, R$ 48,50 lançamento"\n\nRegras:\n- Falar com o DONO, não com o vendedor\n- Evitar tom de "curso" — chamar de "material" ou "manual"\n- Mencionar que ele pode usar em reunião de 30min com a equipe\n- Sem hype, sem promessa inflada\n- CTA pra marketplace, não pra landing',
    'Roteiro com timestamps 0-3-10-22-30s, falas literais, anotação visual mínima.',
    '{"angle": "cavalo_de_troia", "marketplace_first": true, "no_hype": true, "no_curso_generico": true, "audience": "dono_otica"}'::jsonb,
    ARRAY[]::text[],
    true,
    50
  ),
  (
    'cavalo-troia-carrossel-equipe',
    'Cavalo de Troia · Carrossel para dono usar com equipe',
    'text',
    'chatgpt',
    'Carrossel 10 slides com framing "treinamento de equipe em 30min/semana" usando OSI. Dono compra, monta sessão semanal, treina a galera (plano-mestre §8).',
    E'Crie um carrossel Instagram de 10 slides direcionado ao DONO de ótica enquadrando OSI como material de treinamento da equipe.\n\nSlide 1 (capa): Hook visual + título "Treine sua equipe de ótica em 30min por semana"\nSlide 2: Dor — "Você responde objeção sozinho enquanto sua equipe trava"\nSlide 3: Realidade — "Não é a equipe, é a falta de manual"\nSlide 4: O que é — "Manual visual + 5 Movimentos do método OSI"\nSlide 5: Como usar — "Dia 1: leem o PDF. Dia 7: 30min de role-play. Dia 14: ajustam no balcão real"\nSlide 6: Movimento 1 (resumo 1 linha)\nSlide 7: Movimentos 2-3 (resumo)\nSlide 8: Movimentos 4-5 (resumo)\nSlide 9: O que vem dentro + Nexus 90d como complemento\nSlide 10: CTA — "Link no perfil. Checkout Hotmart. R$ 48,50 lançamento."\n\nRegras:\n- Linguagem direta com DONO, sem chavão\n- Cada slide carrega 1 ideia clara\n- Posicionar como MATERIAL DE TREINAMENTO, não curso\n- Clearix sutil, sem empurrar\n- CTA único no fim, pra marketplace',
    'Texto de cada slide (1-3 linhas máx), com observação visual simples (ícone/cor sugerida).',
    '{"angle": "cavalo_de_troia", "marketplace_first": true, "no_hype": true, "no_curso_generico": true, "audience": "dono_otica"}'::jsonb,
    ARRAY[]::text[],
    true,
    51
  )
ON CONFLICT (code) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  prompt_template = EXCLUDED.prompt_template,
  output_hint = EXCLUDED.output_hint,
  locks = EXCLUDED.locks,
  is_active = EXCLUDED.is_active,
  sort_order = EXCLUDED.sort_order,
  updated_at = now();
