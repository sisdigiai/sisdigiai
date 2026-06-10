-- Refina os 3 prompts brand-identity inseridos em 029 com ancoragens visuais mais fortes,
-- safe-zones do Meta mobile, e adiciona 4º prompt: brand mark isolado (logo transparente).
-- Cada output_hint vira checklist de QC explícito.
-- Cross-ref: Cockpit/sessoes/META_setup_2026-06-02.md

UPDATE marketing.ai_prompt_templates
SET prompt_template = $$
Editorial brand mark for {brand_name} — essence: "{brand_essence}".

CORE VISUAL: {logo_concept}
  - The lens shape is a single perfect circle (no glasses arms, no frame, no temples — only the lens).
  - Filled with a smooth RADIAL gradient: electric cyan #06B6D4 at the centre, deep navy #0A2540 at the edge.
  - A very subtle catch-light highlight at the upper-left rim (10° to 30° arc) suggesting glass clarity.
  - Background: solid warm cream #FAF7F0, completely flat, no texture, no noise on the bg.

PALETTE STRICT (these three hex codes, nothing else): #0A2540, #06B6D4, #FAF7F0.
No neon. No rainbow. No glitter. No additional accent colors.

MOOD: sober, confident, methodical. No hype, no coaching aesthetic, no fitness energy.

COMPOSITION:
  - Subject perfectly centered.
  - 25% padding on all 4 sides — Meta crops avatars to circles, anything inside the outer ring may be cut.
  - The lens itself occupies 55-60% of the frame (not bigger, not smaller).

STYLE: minimal vector aesthetic, clean lines, very subtle grain. NOT photorealistic, NOT 3D-render.

HARD NO: no text, no letters, no numbers, no real human faces or hands, no watermarks, no extra logos.

--ar 1:1 --style raw --v 6.1 --stylize 100
$$,
    output_hint = $$
SAVE: 1080×1080 PNG in <repo>/docs/divulgacao/<marca>/avatar-facebook-v1.png.

QC CHECKLIST (rejeite e re-roll se):
  [ ] Aparece qualquer texto, letra ou número na imagem
  [ ] Aparece arma/haste de óculos (deveria ser só a lente)
  [ ] Paleta tem cores fora dos 3 hex (#0A2540, #06B6D4, #FAF7F0)
  [ ] Subject está descentralizado ou perto demais da borda (Meta vai cortar no círculo)
  [ ] Fundo tem textura/ruído (deveria ser flat #FAF7F0)
  [ ] Visual é fotorrealista ou 3D-render (deveria ser minimal vector)
  [ ] Aparecem rostos ou mãos de pessoas
$$,
    updated_at = now()
WHERE code = 'midjourney-brand-avatar-facebook';

UPDATE marketing.ai_prompt_templates
SET prompt_template = $$
Wide editorial cover image for the Facebook Page of {brand_name} — essence: "{brand_essence}".

LAYOUT (CRITICAL — Meta cropping zones):
  - 1640×856 base. Subject must sit in the LEFT 35% of the frame.
  - LEFT BOTTOM CORNER 270×270 area: keep visually CALM (the Page avatar overlays here on desktop).
  - RIGHT 60%: low-contrast, soft, breathable — UI buttons (Like, Message, Share) overlay here on mobile.
  - CENTER STRIP (vertical, columns 35-65%): can hold a horizontal gradient transition.

SUBJECT (left third):
  - A slow editorial still-life detail from a real eyewear shop counter.
  - Pick ONE of: a pair of frames being polished on a microfiber cloth, OR a vintage eye-test card propped against a lens case, OR a single eyewear frame lying open on a wood counter under window light.
  - NEVER include faces of real people. Hands (forearms only, no faces) are OK but optional.

LIGHT: soft mid-morning window light from upper-left. Slight directional warmth.
DEPTH OF FIELD: shallow, subject sharp, background gently blurred.

PALETTE STRICT: deep navy #0A2540 (background tones, shadow) + electric cyan #06B6D4 (subtle accent on lens reflection ONLY) + warm cream #FAF7F0 (paper, counter surface, ambient light).
No reds, no greens, no other accent colors. The cyan is a WHISPER, not a SHOUT — appears only as a thin rim-light on glass.

MOOD: methodical, sober, warm-but-not-cute. Real, lived-in shop. NOT stock-photo perfection, NOT studio-clinical.

HARD NO: no text, no logos visible in the scene (no brand names on frames, eye-cards, packaging), no fashion-model glamour, no AI-perfect skin/surfaces, no watermarks.

--ar 16:9 --style raw --v 6.1 --stylize 150
$$,
    output_hint = $$
SAVE: 1640×856 PNG in <repo>/docs/divulgacao/<marca>/cover-facebook-v1.png.
TEST: preview no FB desktop AND mobile (URLs: facebook.com/<page>?_rdr) antes de aprovar.

QC CHECKLIST (rejeite e re-roll se):
  [ ] Subject está no lado direito ou central (deveria ficar no left 35%)
  [ ] Canto inferior esquerdo 270×270 tem detalhe forte (vai brigar com o avatar overlay)
  [ ] Aparece qualquer texto/letra em frames, eye-card, embalagens
  [ ] Aparecem rostos completos de pessoas
  [ ] Cyan está dominante (deveria ser whisper-only — só rim-light)
  [ ] Visual parece stock-photo perfeito demais (deveria parecer real/lived-in)
  [ ] Há cores fora da paleta #0A2540/#06B6D4/#FAF7F0
  [ ] Foto parece estúdio clínico (deveria ter calor de loja real)
$$,
    updated_at = now()
WHERE code = 'midjourney-brand-cover-facebook';

UPDATE marketing.ai_prompt_templates
SET prompt_template = $$
Editorial visual identity mark for {brand_name} Instagram profile — essence: "{brand_essence}".

This is a VARIATION of the Facebook avatar (same brand, different platform mood):
  - Same brand mark concept ({logo_concept}) — the circular lens with cyan-to-navy radial gradient.
  - BUT here, instead of flat cream background, the mark sits over a subtly out-of-focus warm-toned background suggesting an eyewear shop (defocused frames on a shelf, soft window glow).

CORE MARK: identical lens shape and gradient as the Facebook avatar — keep visual family.

BACKGROUND (subtle, important):
  - Heavily out-of-focus (f/1.8 equivalent blur).
  - Suggests an optometry shop interior: warm wood tones, defocused frames row, soft window light.
  - Color tones still anchored to palette: cream/navy tones, never going outside #0A2540 / #06B6D4 / #FAF7F0 family.
  - The mark should sit at 100% opacity, sharp; the background at maybe 40% visible / 60% bokeh wash.

PALETTE STRICT: #0A2540, #06B6D4, #FAF7F0. Plus warm wood neutrals (#D4B896 to #8B6F47 range) ONLY in the defocused background.

MOOD: same sober/methodical family as FB avatar, but more emotional, more "feed-worthy", more atmospheric.

COMPOSITION: mark perfectly centered, 25% safe padding. Mark occupies 50% of frame (slightly smaller than FB version, to let the atmosphere breathe).

HARD NO: no text, no real human faces, no neon, no hype lighting, no watermarks. The two avatars (FB + IG) must clearly read as the SAME BRAND when seen side-by-side.

--ar 1:1 --style raw --v 6.1 --stylize 180
$$,
    output_hint = $$
SAVE: 1080×1080 PNG in <repo>/docs/divulgacao/<marca>/avatar-instagram-v1.png.

QC CHECKLIST (rejeite e re-roll se):
  [ ] Mark visual diferente do avatar-facebook-v1 (deve ser MESMO brand mark, só background diferente)
  [ ] Background não sugere loja de óticas (deveria evocar shelf de frames, window light)
  [ ] Background não está borrado o suficiente (f/1.8 blur — sem detalhes nítidos atrás)
  [ ] Cores fora de #0A2540/#06B6D4/#FAF7F0 + warm wood (#D4B896-#8B6F47)
  [ ] Mark muito pequeno ou muito grande (deve ocupar ~50% do frame)
  [ ] Aparece texto, rostos, ou logos extras

QC FINAL CROSS-PLATFORM:
  [ ] Pôe FB-avatar e IG-avatar lado a lado em escala real: passam como "mesma marca"? Se não, re-roll.
$$,
    updated_at = now()
WHERE code = 'midjourney-brand-avatar-instagram';

-- Prompt extra: brand mark isolado (transparent PNG) pra uso em outras peças (assinaturas email, slides, watermark de PDF, papel timbrado, etc).
INSERT INTO marketing.ai_prompt_templates
  (code, name, category, ai_target, description, prompt_template, output_hint, placeholders, is_active, sort_order)
VALUES
  ('midjourney-brand-mark-isolated',
   'Midjourney — brand mark isolado (transparent-ready, multi-uso)',
   'image', 'midjourney',
   'Brand mark sozinho, sem fundo, pra ser recortado e reusado em assinaturas email, slides, watermark de PDF, papel timbrado, etc. Salva em PNG e depois remove fundo no Photoshop/Photopea/remove.bg.',
   $$
Isolated brand mark for {brand_name} — essence: "{brand_essence}".

ONLY the brand mark: {logo_concept}
  - Single perfect circle (lens).
  - Smooth radial gradient: cyan #06B6D4 at centre, navy #0A2540 at rim.
  - Subtle catch-light at upper-left rim.
  - Mark only — nothing else in the frame.

BACKGROUND: flat pure white #FFFFFF (will be keyed out to transparent in post).

PALETTE STRICT in mark: #0A2540 + #06B6D4 + small white highlight #FFFFFF for the catch-light.

COMPOSITION: mark dead-center, 40% padding all sides (extra padding for clean key-out).

STYLE: ultra-clean vector, sharp edges, NO grain, NO texture, NO photographic feel. Looks like an SVG export.

HARD NO: no background pattern, no shadow under the mark (we'll add later if needed), no text, no border ring, no frame around it.

--ar 1:1 --style raw --v 6.1 --stylize 50
$$,
   $$
SAVE: 1024×1024 PNG. Pós-processar em remove.bg ou Photopea pra remover #FFFFFF → alpha transparente.
Output final: <repo>/docs/divulgacao/<marca>/brand-mark-transparent.png.

QC CHECKLIST:
  [ ] Mark é idêntico em forma ao usado nos avatares FB/IG
  [ ] Fundo é #FFFFFF puro, flat, sem gradiente (chave alpha vai funcionar limpa)
  [ ] Não tem grain/texture (deveria parecer vetor)
  [ ] Não tem sombra debaixo
  [ ] Não tem texto, borda, ou frame extra
  [ ] Após remoção de fundo, fica clean nos cantos (sem halo branco)
$$,
   ARRAY['brand_name', 'brand_essence', 'logo_concept'],
   true, 103)
ON CONFLICT (code) DO UPDATE
  SET prompt_template = EXCLUDED.prompt_template,
      output_hint = EXCLUDED.output_hint,
      updated_at = now();
