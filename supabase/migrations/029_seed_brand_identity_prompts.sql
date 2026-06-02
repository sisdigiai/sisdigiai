-- Prompts MJ canônicos para identidade visual institucional de marcas DIGIAI Academy.
-- Parametrizados com {brand_name}, {brand_essence}, {palette}, {logo_concept} para reuso multi-marca.
-- R-014/ADR-0034: paletas seguem tema da marca específica (Sem Improviso, Polapetit, NipoSchool, etc).
-- Cross-ref: Cockpit/sessoes/META_setup_2026-06-02.md

INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, placeholders, is_active, sort_order)
VALUES
  ('midjourney-brand-avatar-facebook',
   'Midjourney — avatar da Página Facebook (1:1 crop-safe circular)',
   'image', 'midjourney',
   'Avatar de marca para foto de perfil da Página Facebook. Circular-crop safe (Meta exibe em círculo). Tamanho exportado 1080×1080, mas componha pensando no recorte redondo do FB.',
   'Editorial brand mark for {brand_name} — essence: "{brand_essence}".
Visual concept: {logo_concept}, centered in the frame, isolated on a clean background.
Palette strict (use only these): {palette}. No neon, no rainbow, no glitter.
Mood: sober, confident, methodical, no hype, no coaching aesthetic.
Composition: subject perfectly centered, 25% padding on all sides so circular crop does not cut anything important.
Style: minimal, flat with subtle texture, slight grain. Vector-clean lines.
No text. No photographs of real people or faces. No watermarks. No logos other than the brand mark itself.
--ar 1:1 --style raw --v 6.1 --stylize 100',
   '1080×1080 PNG/JPG. Salva em /docs/divulgacao/<marca>/avatar-facebook-v1.png. Confere recorte circular antes de subir.',
   ARRAY['brand_name', 'brand_essence', 'palette', 'logo_concept'],
   true, 100),

  ('midjourney-brand-cover-facebook',
   'Midjourney — capa da Página Facebook (16:9 com safe-zone)',
   'image', 'midjourney',
   'Capa institucional horizontal da Página FB. Recomendado 1640×856 (Meta exibe 1640×924 desktop / corta laterais no mobile). Use safe-zone central de 820×312 para evitar cortes.',
   'Wide editorial cover image for the Facebook Page of {brand_name} — essence: "{brand_essence}".
Composition: horizontal banner, the main visual subject sits ON THE LEFT THIRD; KEEP the right 60% calm and low-contrast so Meta UI elements (profile photo overlay, page name, CTA buttons) do not clash.
Palette strict: {palette}. Subtle gradient transitions allowed, no harsh contrast jumps.
Subject: an evocative scene tied to {brand_essence} — for an eyewear training brand, this could be a slow editorial detail of a real optometry counter (hands adjusting frames, lens cloth, eye-test card) shot with soft window light. NEVER faces of real people; only hands and objects.
Mood: methodical, sober, warm-but-not-cute. Real, lived-in space. No stock-photo perfection.
No text. No logos visible in the scene. No watermarks. No fashion-model glamour.
--ar 16:9 --style raw --v 6.1 --stylize 150',
   '1640×856 PNG/JPG. Salva em /docs/divulgacao/<marca>/cover-facebook-v1.png. Testa preview no FB mobile + desktop antes de aprovar.',
   ARRAY['brand_name', 'brand_essence', 'palette'],
   true, 101),

  ('midjourney-brand-avatar-instagram',
   'Midjourney — avatar Instagram (1:1, variação do FB)',
   'image', 'midjourney',
   'Avatar Instagram. Pode ser idêntico ao FB OU uma variação mais editorial/menos icônica (IG é mais visual, FB mais corporate). Aqui geramos a variação editorial — combine com o avatar FB pra coerência.',
   'Editorial visual identity mark for {brand_name} Instagram profile — essence: "{brand_essence}".
Variation of {logo_concept} but rendered more atmospheric: soft-focus background hint of the brand context (eyewear shop, training room), with the brand mark holding the centre.
Palette strict: {palette}. Atmospheric depth allowed (gradient, soft bokeh) but no neon or hype.
Mood: same family as Facebook avatar — sober, methodical — but more emotional, more "feed-worthy".
Composition: subject centered, generous breathing room for circular crop. Subtle grain.
No text. No real human faces. No watermarks. Visual consistency with Facebook avatar is critical (same palette, same mark essence).
--ar 1:1 --style raw --v 6.1 --stylize 180',
   '1080×1080 PNG/JPG. Salva em /docs/divulgacao/<marca>/avatar-instagram-v1.png. Compara lado-a-lado com avatar-facebook-v1 antes de aprovar — devem parecer da mesma família.',
   ARRAY['brand_name', 'brand_essence', 'palette', 'logo_concept'],
   true, 102)
ON CONFLICT (code) DO UPDATE
  SET name = EXCLUDED.name,
      description = EXCLUDED.description,
      prompt_template = EXCLUDED.prompt_template,
      output_hint = EXCLUDED.output_hint,
      placeholders = EXCLUDED.placeholders,
      sort_order = EXCLUDED.sort_order,
      updated_at = now();
