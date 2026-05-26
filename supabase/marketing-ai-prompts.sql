-- ============================================================
-- Marketing Fase 3: AI Prompt Templates
-- ============================================================
-- Tabela de templates de prompt para IAs externas (ChatGPT, Midjourney,
-- DALL-E, Sora, ElevenLabs, Suno, etc). Travas de marca (tom, paleta,
-- restrições, persona) ficam em JSONB e são injetadas em todo render.
-- Frontend chama public.marketing_render_prompt(template_id, post_id?, idea_id?, extra_vars?)
-- e recebe { rendered_prompt, ai_target, output_hint, vars_used }.
-- ============================================================

-- ─── Tabela ───
CREATE TABLE IF NOT EXISTS marketing.ai_prompt_templates (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code          text UNIQUE NOT NULL,
  name          text NOT NULL,
  category      text NOT NULL,          -- 'text' | 'image' | 'video' | 'audio' | 'music'
  ai_target     text NOT NULL,          -- 'chatgpt' | 'claude' | 'midjourney' | 'dalle' | 'gemini' | 'sora' | 'runway' | 'elevenlabs' | 'suno' | 'generic'
  description   text,
  prompt_template text NOT NULL,
  output_hint   text,
  locks         jsonb NOT NULL DEFAULT '{}'::jsonb,
  placeholders  text[] NOT NULL DEFAULT '{}',
  pillar_id     uuid REFERENCES marketing.content_pillars(id) ON DELETE SET NULL,
  is_active     boolean DEFAULT true,
  sort_order    int DEFAULT 0,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now(),
  deleted_at    timestamptz
);

CREATE INDEX IF NOT EXISTS idx_ai_prompts_category ON marketing.ai_prompt_templates(category) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_prompts_target ON marketing.ai_prompt_templates(ai_target) WHERE deleted_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_prompts_active ON marketing.ai_prompt_templates(is_active) WHERE deleted_at IS NULL;

ALTER TABLE marketing.ai_prompt_templates ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS ai_prompts_staff_read ON marketing.ai_prompt_templates;
CREATE POLICY ai_prompts_staff_read ON marketing.ai_prompt_templates
  FOR SELECT TO authenticated
  USING (public.is_staff());

DROP POLICY IF EXISTS ai_prompts_staff_write ON marketing.ai_prompt_templates;
CREATE POLICY ai_prompts_staff_write ON marketing.ai_prompt_templates
  FOR ALL TO authenticated
  USING (public.is_staff())
  WITH CHECK (public.is_staff());

-- ─── View pública para leitura ───
CREATE OR REPLACE VIEW public.v_marketing_ai_prompts AS
SELECT
  t.id,
  t.code,
  t.name,
  t.category,
  t.ai_target,
  t.description,
  t.prompt_template,
  t.output_hint,
  t.locks,
  t.placeholders,
  t.pillar_id,
  p.code  AS pillar_code,
  p.name  AS pillar_name,
  p.color AS pillar_color,
  t.is_active,
  t.sort_order,
  t.created_at,
  t.updated_at
FROM marketing.ai_prompt_templates t
LEFT JOIN marketing.content_pillars p ON p.id = t.pillar_id
WHERE t.deleted_at IS NULL
ORDER BY t.category, t.sort_order, t.name;

GRANT SELECT ON public.v_marketing_ai_prompts TO authenticated;

-- ─── RPC: renderizar prompt para um post/idea ───
-- Substitui {placeholders} no template usando dados do post + locks + extra vars.
DROP FUNCTION IF EXISTS public.marketing_render_prompt(uuid, uuid, uuid, jsonb);
CREATE OR REPLACE FUNCTION public.marketing_render_prompt(
  p_template_id uuid,
  p_post_id     uuid DEFAULT NULL,
  p_idea_id     uuid DEFAULT NULL,
  p_extra_vars  jsonb DEFAULT '{}'::jsonb
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_template     marketing.ai_prompt_templates%ROWTYPE;
  v_vars         jsonb := '{}'::jsonb;
  v_rendered     text;
  v_key          text;
  v_value        text;
  v_post         record;
  v_idea         record;
  v_pillar       record;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  SELECT * INTO v_template
  FROM marketing.ai_prompt_templates
  WHERE id = p_template_id AND deleted_at IS NULL;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'template_not_found';
  END IF;

  -- Locks do template entram primeiro (defaults da marca)
  v_vars := v_template.locks;

  -- Se houver post, extrair dados úteis
  IF p_post_id IS NOT NULL THEN
    SELECT cp.*, p.code AS pcode, p.name AS pname, p.color AS pcolor, p.description AS pdesc
      INTO v_post
    FROM marketing.content_calendar cp
    LEFT JOIN marketing.content_pillars p ON p.id = cp.pillar_id
    WHERE cp.id = p_post_id;

    IF FOUND THEN
      v_vars := v_vars
        || jsonb_build_object(
          'hook',           COALESCE(v_post.hook, ''),
          'copy_full',      COALESCE(v_post.copy_full, ''),
          'cta',            COALESCE(v_post.cta, ''),
          'posting_brief',  COALESCE(v_post.posting_brief, ''),
          'platform',       COALESCE(v_post.platform, ''),
          'content_type',   COALESCE(v_post.content_type, ''),
          'platforms',      COALESCE(array_to_string(v_post.platforms, ', '), ''),
          'hashtags',       COALESCE(array_to_string(v_post.hashtags, ' '), ''),
          'pillar_code',    COALESCE(v_post.pcode, ''),
          'pillar_name',    COALESCE(v_post.pname, ''),
          'pillar_color',   COALESCE(v_post.pcolor, ''),
          'pillar_description', COALESCE(v_post.pdesc, ''),
          'scheduled_date', COALESCE(v_post.scheduled_date::text, ''),
          'scheduled_time', COALESCE(v_post.scheduled_time::text, '')
        );
    END IF;
  END IF;

  -- Se houver idea (sem post), pegar dados da idea
  IF p_idea_id IS NOT NULL AND p_post_id IS NULL THEN
    SELECT ci.*, p.code AS pcode, p.name AS pname, p.color AS pcolor, p.description AS pdesc
      INTO v_idea
    FROM marketing.content_ideas ci
    LEFT JOIN marketing.content_pillars p ON p.id = ci.pillar_id
    WHERE ci.id = p_idea_id;

    IF FOUND THEN
      v_vars := v_vars
        || jsonb_build_object(
          'hook',               COALESCE(v_idea.hook, ''),
          'narrative',          COALESCE(v_idea.narrative, ''),
          'target_audience',    COALESCE(v_idea.target_audience, ''),
          'suggested_format',   COALESCE(v_idea.suggested_format, ''),
          'cta',                COALESCE(v_idea.cta_suggestion, ''),
          'pillar_code',        COALESCE(v_idea.pcode, ''),
          'pillar_name',        COALESCE(v_idea.pname, ''),
          'pillar_color',       COALESCE(v_idea.pcolor, ''),
          'pillar_description', COALESCE(v_idea.pdesc, '')
        );
    END IF;
  END IF;

  -- Se template tem pillar fixo e nenhum post/idea forneceu, pegar dele
  IF v_template.pillar_id IS NOT NULL AND NOT (v_vars ? 'pillar_name') THEN
    SELECT * INTO v_pillar FROM marketing.content_pillars WHERE id = v_template.pillar_id;
    IF FOUND THEN
      v_vars := v_vars
        || jsonb_build_object(
          'pillar_code',        v_pillar.code,
          'pillar_name',        v_pillar.name,
          'pillar_color',       v_pillar.color,
          'pillar_description', COALESCE(v_pillar.description, '')
        );
    END IF;
  END IF;

  -- Extra vars manuais sobrescrevem tudo
  v_vars := v_vars || COALESCE(p_extra_vars, '{}'::jsonb);

  -- Renderizar substituindo {key} pelos valores
  v_rendered := v_template.prompt_template;
  FOR v_key, v_value IN SELECT * FROM jsonb_each_text(v_vars) LOOP
    v_rendered := replace(v_rendered, '{' || v_key || '}', COALESCE(v_value, ''));
  END LOOP;

  RETURN jsonb_build_object(
    'template_id',     v_template.id,
    'template_code',   v_template.code,
    'template_name',   v_template.name,
    'category',        v_template.category,
    'ai_target',       v_template.ai_target,
    'output_hint',     v_template.output_hint,
    'rendered_prompt', v_rendered,
    'vars_used',       v_vars
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_render_prompt TO authenticated, service_role;

-- ─── RPC: criar/atualizar template (admin) ───
DROP FUNCTION IF EXISTS public.marketing_upsert_prompt_template(jsonb);
CREATE OR REPLACE FUNCTION public.marketing_upsert_prompt_template(p_patch jsonb)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
DECLARE
  v_id uuid;
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;

  IF p_patch ? 'id' AND (p_patch->>'id') IS NOT NULL THEN
    v_id := (p_patch->>'id')::uuid;
    UPDATE marketing.ai_prompt_templates SET
      code            = COALESCE(p_patch->>'code', code),
      name            = COALESCE(p_patch->>'name', name),
      category        = COALESCE(p_patch->>'category', category),
      ai_target       = COALESCE(p_patch->>'ai_target', ai_target),
      description     = CASE WHEN p_patch ? 'description' THEN p_patch->>'description' ELSE description END,
      prompt_template = COALESCE(p_patch->>'prompt_template', prompt_template),
      output_hint     = CASE WHEN p_patch ? 'output_hint' THEN p_patch->>'output_hint' ELSE output_hint END,
      locks           = CASE WHEN p_patch ? 'locks' THEN p_patch->'locks' ELSE locks END,
      placeholders    = CASE WHEN p_patch ? 'placeholders' THEN
                          ARRAY(SELECT jsonb_array_elements_text(p_patch->'placeholders'))
                        ELSE placeholders END,
      pillar_id       = CASE WHEN p_patch ? 'pillar_id' THEN NULLIF(p_patch->>'pillar_id','')::uuid ELSE pillar_id END,
      is_active       = COALESCE((p_patch->>'is_active')::boolean, is_active),
      sort_order      = COALESCE((p_patch->>'sort_order')::int, sort_order),
      updated_at      = now()
    WHERE id = v_id;
  ELSE
    INSERT INTO marketing.ai_prompt_templates
      (code, name, category, ai_target, description, prompt_template, output_hint, locks, placeholders, pillar_id, is_active, sort_order)
    VALUES (
      p_patch->>'code',
      p_patch->>'name',
      p_patch->>'category',
      p_patch->>'ai_target',
      p_patch->>'description',
      p_patch->>'prompt_template',
      p_patch->>'output_hint',
      COALESCE(p_patch->'locks', '{}'::jsonb),
      COALESCE(ARRAY(SELECT jsonb_array_elements_text(p_patch->'placeholders')), '{}'::text[]),
      NULLIF(p_patch->>'pillar_id','')::uuid,
      COALESCE((p_patch->>'is_active')::boolean, true),
      COALESCE((p_patch->>'sort_order')::int, 0)
    )
    RETURNING id INTO v_id;
  END IF;

  RETURN v_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_upsert_prompt_template TO authenticated, service_role;

-- ─── RPC: soft-delete ───
DROP FUNCTION IF EXISTS public.marketing_delete_prompt_template(uuid);
CREATE OR REPLACE FUNCTION public.marketing_delete_prompt_template(p_id uuid)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, marketing
AS $$
BEGIN
  IF NOT public.is_staff() THEN
    RAISE EXCEPTION 'access_denied';
  END IF;
  UPDATE marketing.ai_prompt_templates SET deleted_at = now() WHERE id = p_id AND deleted_at IS NULL;
  RETURN FOUND;
END;
$$;

GRANT EXECUTE ON FUNCTION public.marketing_delete_prompt_template TO authenticated, service_role;

-- ============================================================
-- SEED: 12 templates iniciais
-- ============================================================
-- Locks padrão da marca Ótica Sem Improviso
-- (injetados em todo prompt para garantir consistência)

-- Limpar seeds anteriores (re-rodável)
DELETE FROM marketing.ai_prompt_templates WHERE code IN (
  'chatgpt-instagram-feed',
  'chatgpt-reel-roteiro',
  'chatgpt-carrossel-10-slides',
  'chatgpt-email-lista',
  'chatgpt-whatsapp-1msg',
  'midjourney-capa-quadrada',
  'midjourney-story-vertical',
  'midjourney-infografico',
  'dalle-capa-quadrada',
  'sora-reel-balcao-30s',
  'elevenlabs-voiceover-reel',
  'suno-trilha-reel'
);

-- ─── TEXTO / ChatGPT ───

INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, placeholders, locks, sort_order)
VALUES
('chatgpt-instagram-feed',
 'Post Instagram (feed)',
 'text', 'chatgpt',
 'Copy curta para feed do Instagram, com hook + corpo + CTA.',
$$Você é copywriter da {brand_name}, uma ótica gerida por {persona}.

TOM DE VOZ (obrigatório): {brand_voice}
RESTRIÇÕES (NUNCA quebrar): {brand_restrictions}
PILAR EDITORIAL: {pillar_name} — {pillar_description}

TAREFA: escreva 1 post de feed para Instagram a partir do hook abaixo.

HOOK: {hook}
BRIEF: {posting_brief}
CTA pretendido: {cta}

FORMATO DE SAÍDA:
1) Hook (1 linha, igual ou aprimorado)
2) Corpo (3 a 5 linhas, sem hype, conversado)
3) CTA final (1 linha)
4) 6 hashtags relevantes (incluir #OticaSemImproviso)

Não use emojis em excesso (no máx. 2). Não prometa cura, milagre, ou IA tutora.$$,
 'Post Instagram pronto pra colar no Buffer/Meta',
 ARRAY['hook','posting_brief','cta','pillar_name','pillar_description','brand_name','brand_voice','brand_restrictions','persona'],
 '{
   "brand_name": "Ótica Sem Improviso",
   "persona": "Taty (optometrista, dona da ótica)",
   "brand_voice": "Calmo, prático, direto. Sem hype, sem promessa de milagre. Fala como quem atende balcão há 10 anos.",
   "brand_restrictions": "NUNCA prometer cura de doença ocular. NUNCA dizer que IA substitui exame médico. NUNCA mencionar Clearix como protagonista (somos B2C, Clearix é interno). NUNCA usar linguagem de coach (segredo, virada de chave, mentor)."
 }'::jsonb,
 10),

('chatgpt-reel-roteiro',
 'Reel — roteiro 30s',
 'text', 'chatgpt',
 'Roteiro de Reel de até 30 segundos com cortes e overlay.',
$$Você é roteirista de Reels da {brand_name} ({persona}, optometrista).

TOM: {brand_voice}
RESTRIÇÕES: {brand_restrictions}
PILAR: {pillar_name}

TAREFA: escreva roteiro de Reel (até 30s) com base no hook.

HOOK: {hook}
BRIEF: {posting_brief}
CTA: {cta}

FORMATO DE SAÍDA (em blocos):
[0-3s]  Hook visual + fala
[3-12s] Desenvolvimento (1 dado prático, demonstrável no balcão)
[12-22s] Mini-história ou exemplo concreto
[22-28s] CTA verbal
[28-30s] Frame final com {brand_name}

Para cada bloco, indicar: AÇÃO (o que aparece) + FALA (texto literal) + OVERLAY (texto na tela).
A fala deve caber natural em até 30s (cerca de 70 palavras totais).$$,
 'Roteiro pronto para gravar no balcão',
 ARRAY['hook','posting_brief','cta','pillar_name','brand_name','brand_voice','brand_restrictions','persona'],
 '{
   "brand_name": "Ótica Sem Improviso",
   "persona": "Taty (optometrista, dona da ótica)",
   "brand_voice": "Calmo, prático, direto. Sem hype. Fala como atendente experiente de balcão.",
   "brand_restrictions": "Nunca prometer cura. Nunca substituir exame médico. Nunca usar tom de coach. Nunca citar Clearix."
 }'::jsonb,
 20),

('chatgpt-carrossel-10-slides',
 'Carrossel Instagram (10 slides)',
 'text', 'chatgpt',
 'Roteiro de carrossel de 10 slides para Instagram, com texto por slide.',
$$Você é designer-copywriter da {brand_name}.

TOM: {brand_voice}
RESTRIÇÕES: {brand_restrictions}
PILAR: {pillar_name} — {pillar_description}

TAREFA: criar carrossel de 10 slides para Instagram.

HOOK: {hook}
BRIEF: {posting_brief}
CTA: {cta}

ESTRUTURA OBRIGATÓRIA:
Slide 1: capa com hook (máx. 8 palavras grandes)
Slide 2: contexto / dor (1 frase + 1 detalhe)
Slides 3-8: desenvolvimento (1 ideia por slide, máx. 25 palavras)
Slide 9: resumo em bullets (3-5 pontos)
Slide 10: CTA + assinatura {brand_name}

Para cada slide retornar:
- TÍTULO (texto grande)
- TEXTO DE APOIO (texto menor, opcional)
- OBSERVAÇÃO PARA DESIGNER (cor de fundo, ícone sugerido)

Paleta da marca: {palette}.$$,
 'Carrossel pronto para diagramar no Canva',
 ARRAY['hook','posting_brief','cta','pillar_name','pillar_description','brand_name','brand_voice','brand_restrictions','palette'],
 '{
   "brand_name": "Ótica Sem Improviso",
   "brand_voice": "Calmo, prático, sem hype. Fala de balcão.",
   "brand_restrictions": "Sem promessa de cura. Sem coach. Sem Clearix protagonista.",
   "palette": "Primário #0A0A0A (preto), Secundário #06B6D4 (ciano), Apoio #F59E0B (amber), Fundo #FAFAFA (off-white)"
 }'::jsonb,
 30),

('chatgpt-email-lista',
 'Email para lista (newsletter)',
 'text', 'chatgpt',
 'Email curto e direto para lista de clientes da ótica.',
$$Você é responsável pelo email marketing da {brand_name} ({persona}).

TOM: {brand_voice}
RESTRIÇÕES: {brand_restrictions}
PILAR: {pillar_name}

TAREFA: escrever email para a lista de clientes.

HOOK / ASSUNTO BASE: {hook}
BRIEF: {posting_brief}
CTA: {cta}

FORMATO DE SAÍDA:
- ASSUNTO (máx. 50 caracteres, sem emoji)
- PRÉ-CABEÇALHO (máx. 90 caracteres)
- CORPO (3 a 5 parágrafos curtos, conversado, 2ª pessoa)
- CTA (1 linha + link placeholder {link_cta})
- ASSINATURA (Taty + {brand_name})

Não usar saudações vazias ("Olá querido cliente"). Comece pelo conteúdo.$$,
 'Email pronto para colar no Mailchimp/Brevo',
 ARRAY['hook','posting_brief','cta','pillar_name','brand_name','brand_voice','brand_restrictions','persona','link_cta'],
 '{
   "brand_name": "Ótica Sem Improviso",
   "persona": "Taty",
   "brand_voice": "Calmo, prático, conversado. Sem hype.",
   "brand_restrictions": "Sem promessa de cura. Sem linguagem de coach.",
   "link_cta": "{link_cta}"
 }'::jsonb,
 40),

('chatgpt-whatsapp-1msg',
 'WhatsApp — 1 mensagem curta',
 'text', 'chatgpt',
 'Mensagem única de WhatsApp (máx. 4 linhas) para enviar a contato/lead.',
$$Você é {persona}, dona da {brand_name}, escrevendo no WhatsApp da ótica.

TOM: {brand_voice}
RESTRIÇÕES: {brand_restrictions}
PILAR: {pillar_name}

TAREFA: escrever 1 mensagem curta de WhatsApp (máx. 4 linhas) baseada no hook.

HOOK: {hook}
BRIEF: {posting_brief}
CTA: {cta}

REGRAS:
- Máximo 4 linhas, frases curtas.
- Começar com o nome da pessoa só se {customer_name} estiver presente.
- Sem áudio, sem figurinha, sem "Oi sumida(o)".
- Termina com pergunta aberta OU CTA direto.$$,
 'Mensagem pronta para colar no WhatsApp Business',
 ARRAY['hook','posting_brief','cta','pillar_name','brand_name','brand_voice','brand_restrictions','persona','customer_name'],
 '{
   "brand_name": "Ótica Sem Improviso",
   "persona": "Taty",
   "brand_voice": "Calma, atendente experiente, fala de balcão.",
   "brand_restrictions": "Sem hype, sem promessa, sem coach. Sem fingir intimidade.",
   "customer_name": ""
 }'::jsonb,
 50);

-- ─── IMAGEM / Midjourney + DALL-E ───

INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, placeholders, locks, sort_order)
VALUES
('midjourney-capa-quadrada',
 'Midjourney — capa quadrada (Instagram)',
 'image', 'midjourney',
 'Imagem quadrada 1:1 para feed do Instagram.',
$$Editorial photo of a real optometry shop counter detail related to: "{hook}". Pillar: {pillar_name}.
Mood: calm, practical, sober, no hype, no coaching aesthetic. Real human hands, no AI-perfect skin.
Color palette inspired by {palette}. Soft window light, mid-morning. Shallow depth of field.
Composition: rule of thirds, leave top-right empty for text overlay.
No text in image. No watermarks. No logos. No fashion-model glamour.
--ar 1:1 --style raw --v 6.1 --stylize 200$$,
 'Cole no Midjourney v6.1; ajuste --seed se quiser reproduzir.',
 ARRAY['hook','pillar_name','palette'],
 '{
   "palette": "deep neutrals, off-white #FAFAFA, soft cyan accent #06B6D4, warm amber accent #F59E0B"
 }'::jsonb,
 60),

('midjourney-story-vertical',
 'Midjourney — story vertical (9:16)',
 'image', 'midjourney',
 'Imagem vertical 9:16 para Stories/Reels capa.',
$$Vertical editorial photo for Instagram Story, theme: "{hook}". Pillar: {pillar_name}.
Real optometry shop scene, natural light, no posed models. Hands and objects, not faces unless required.
Calm, practical mood. No glamour, no hype, no clinical sterility either — warm and human.
Palette: {palette}. Leave bottom 25% empty for text + CTA overlay.
No text in image. No logos. No watermarks.
--ar 9:16 --style raw --v 6.1 --stylize 180$$,
 'Story vertical 1080x1920 — cole no Midjourney.',
 ARRAY['hook','pillar_name','palette'],
 '{
   "palette": "deep neutrals, off-white, soft cyan, warm amber"
 }'::jsonb,
 70),

('midjourney-infografico',
 'Midjourney — base infográfica',
 'image', 'midjourney',
 'Fundo/base visual para infográfico (carrossel ou post explicativo).',
$$Minimal editorial illustration background for an educational infographic about: "{hook}". Pillar: {pillar_name}.
Style: clean, flat with subtle grain, single-focus subject, lots of negative space.
Palette strict: {palette}. No people. No faces. No text.
Composition: centered subject (a glasses lens, an eye-test card, a frame detail), 40% negative space around for typography.
--ar 1:1 --style raw --v 6.1 --stylize 100$$,
 'Use como background pra colar dados/texto no Canva.',
 ARRAY['hook','pillar_name','palette'],
 '{
   "palette": "#0A0A0A black, #06B6D4 cyan accent, #FAFAFA background. No gradients."
 }'::jsonb,
 80),

('dalle-capa-quadrada',
 'DALL-E 3 — capa quadrada',
 'image', 'dalle',
 'Versão DALL-E 3 da capa quadrada (caso prefira ao Midjourney).',
$$Editorial 1:1 photograph of a real optometry counter, capturing a detail related to: "{hook}".
Pillar context: {pillar_name}.
Mood: calm, sober, practical. Real human hands (not faces). Soft window light, slight grain.
Palette inspired by {palette}. Empty space top-right for caption overlay.
Strict no-go: no text, no logos, no fashion-model glamour, no AI-perfect skin, no over-saturation.$$,
 'Cole no ChatGPT/DALL-E (modelo gpt-image-1 ou DALL-E 3).',
 ARRAY['hook','pillar_name','palette'],
 '{
   "palette": "deep neutrals, off-white, soft cyan accent, warm amber accent"
 }'::jsonb,
 90);

-- ─── VÍDEO / Sora ───

INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, placeholders, locks, sort_order)
VALUES
('sora-reel-balcao-30s',
 'Sora — Reel 30s balcão',
 'video', 'sora',
 'Geração de vídeo curto (até 30s) em ambiente de ótica.',
$$Short cinematic Reel (up to 30 seconds, vertical 9:16), theme: "{hook}". Pillar: {pillar_name}.
Setting: real optometry shop, calm, mid-morning light. Show: hands selecting a frame, lens being polished, eye-test card on counter. No faces required.
Camera: handheld, smooth, eye-level. 2 cuts maximum.
Mood: practical, warm, sober. No music in generation (will be added later). No on-screen text.
Avoid: glamour shots, slow-mo of model faces, hype editing, neon, fake clinical sterility.
Palette: deep neutrals + soft cyan accent.
Aspect ratio: 9:16. Duration: 25-30 seconds.$$,
 'Cole no Sora; ajuste duração no painel.',
 ARRAY['hook','pillar_name'],
 '{}'::jsonb,
 100);

-- ─── ÁUDIO / ElevenLabs ───

INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, placeholders, locks, sort_order)
VALUES
('elevenlabs-voiceover-reel',
 'ElevenLabs — voiceover Reel',
 'audio', 'elevenlabs',
 'Texto pronto para virar narração de Reel (locução até 30s, ~70 palavras).',
$$VOZ: feminina, brasileira, calma, sem afetação radialista. Estilo "atendente experiente de balcão".
RITMO: pausado (cerca de 140 palavras/minuto). Pausas naturais entre frases.
TEXTO (a ler literalmente, sem improviso):

{hook}.

{posting_brief}

{cta}

ENTONAÇÃO: descer no final de cada frase. CTA com leve ênfase, sem grito.
EVITAR: voz robótica, voz de coach, voz de comercial de TV anos 90.$$,
 'Cole o TEXTO no ElevenLabs com voz feminina BR (ex.: "Camila").',
 ARRAY['hook','posting_brief','cta'],
 '{}'::jsonb,
 110);

-- ─── MÚSICA / Suno ───

INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, placeholders, locks, sort_order)
VALUES
('suno-trilha-reel',
 'Suno — trilha instrumental Reel',
 'music', 'suno',
 'Trilha instrumental curta (até 30s) para fundo de Reel.',
$$Instrumental background track for a 30s Instagram Reel about: "{hook}". Pillar mood: {pillar_name}.
Genre: warm lo-fi / acoustic chill / soft indie folk. NO vocals. NO lyrics.
Tempo: 80-95 BPM. Calm, hopeful, practical mood. Not corporate, not epic, not hype.
Instrumentation: light acoustic guitar, soft pad, subtle percussion (brush or finger snaps). No big drops.
Duration: 30 seconds. End with a soft fade-out.
Avoid: EDM build-ups, dubstep, cinematic trailer drums, "wellness retreat" pan flutes.$$,
 'Cole no Suno (modo Custom + Instrumental ON).',
 ARRAY['hook','pillar_name'],
 '{}'::jsonb,
 120);

-- Reload PostgREST
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- Verificação
-- SELECT code, category, ai_target, name FROM marketing.ai_prompt_templates ORDER BY sort_order;
-- SELECT public.marketing_render_prompt(
--   (SELECT id FROM marketing.ai_prompt_templates WHERE code = 'chatgpt-instagram-feed'),
--   NULL,
--   (SELECT id FROM marketing.content_ideas LIMIT 1),
--   '{}'::jsonb
-- );
-- ============================================================
