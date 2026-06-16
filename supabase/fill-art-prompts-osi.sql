-- Preenche art_prompt + art_filename dos posts de imagem futuros (OSI).
-- Card estático = osi_card_post_texto; carrossel = variante 5 lâminas. Identidade OSI.
-- Reels ficam de fora (vídeo, dependem da Taty). Aditivo; não toca posting_brief/copy_full.

WITH base AS (
  SELECT id, scheduled_date, hook, copy_full, content_type, platforms,
    -- slug do hook (sem acento, alfanumérico, 40 chars)
    left(trim(both '-' from regexp_replace(
      lower(translate(hook,
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
      '[^a-z0-9]+', '-', 'g')), 40) AS slug,
    -- sublinha: 2ª frase do copy (fallback: início)
    left(coalesce(
      nullif(trim(split_part(regexp_replace(copy_full, E'\\n+', ' ', 'g'), '. ', 2)), ''),
      trim(regexp_replace(copy_full, E'\\n+', ' ', 'g'))
    ), 140) AS sublinha,
    CASE
      WHEN content_type ILIKE '%reel%' OR 'instagram_reels' = ANY(platforms) THEN 'reel'
      WHEN content_type ILIKE '%carrossel%' OR 'instagram_carrossel' = ANY(platforms) THEN 'carrossel'
      WHEN platform = 'linkedin' THEN 'linkedin'
      ELSE 'card'
    END AS tipo
  FROM marketing.content_calendar
  WHERE deleted_at IS NULL AND scheduled_date >= current_date AND status IN ('ready','planned')
)
UPDATE marketing.content_calendar c SET
  art_filename = b.scheduled_date || '_osi-' || b.slug || '.png',
  art_prompt =
'Square social media card, 1080x1080 px, for "Ótica Sem Improviso" — Brazilian training brand for optical-shop sales teams, led by mentor Tatiana Camargo. Warm editorial identity: cream background (#FDFBF7) with a subtle sand frame (#E6E0D5); deep teal-green (#406863) for the headline block/accents; terracotta (#C86D58) for ONE highlight word or underline; dark text for body. NO stock photos, NO people, NO 3D. Bold high-contrast headline; clean body; generous margins; warm and human, NOT corporate-tech.

Layout top to bottom:
1. Small label, uppercase, letter-spaced, teal: "ÓTICA SEM IMPROVISO"
2. Headline (large, bold, teal, with the key word highlighted in terracotta): "' || b.hook || '"
3. Supporting line (short, dark gray): "' || b.sublinha || '"
4. Footer bar in teal (#406863) with cream text: "Método dos 5 Movimentos · por Tatiana Camargo"

All visible text in Brazilian Portuguese EXACTLY as provided (accents correct). High contrast, readable on mobile.

[ Salvar como: ' || b.scheduled_date || '_osi-' || b.slug || '.png  →  pasta docs/divulgacao/artes/ ]',
  updated_at = now()
FROM base b
WHERE c.id = b.id AND b.tipo = 'card';

WITH base AS (
  SELECT id, scheduled_date, hook, copy_full, content_type, platforms,
    left(trim(both '-' from regexp_replace(
      lower(translate(hook,
        'áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ',
        'aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC')),
      '[^a-z0-9]+', '-', 'g')), 40) AS slug,
    CASE
      WHEN content_type ILIKE '%reel%' OR 'instagram_reels' = ANY(platforms) THEN 'reel'
      WHEN content_type ILIKE '%carrossel%' OR 'instagram_carrossel' = ANY(platforms) THEN 'carrossel'
      WHEN platform = 'linkedin' THEN 'linkedin'
      ELSE 'card'
    END AS tipo
  FROM marketing.content_calendar
  WHERE deleted_at IS NULL AND scheduled_date >= current_date AND status IN ('ready','planned')
)
UPDATE marketing.content_calendar c SET
  art_filename = b.scheduled_date || '_osi-carrossel-' || b.slug || '.png',
  art_prompt =
'Instagram carousel — 5 square slides, 1080x1080 px each, for "Ótica Sem Improviso" (Brazilian optical-shop sales training by mentor Tatiana Camargo). Warm editorial identity: cream #FDFBF7 + sand #E6E0D5 frame, deep teal #406863, terracotta #C86D58 highlight. NO stock photos, NO people, NO 3D. Consistent template across all 5 slides; bold readable type; teal footer bar "Método dos 5 Movimentos · por Tatiana Camargo".

Slide 1 (capa): big headline "' || b.hook || '"
Slides 2 a 4: quebrar a ideia em 3 passos práticos de balcão (frases curtas, 1 por slide).
Slide 5 (CTA): "Salva e manda pra equipe. Link na bio."

Use the post copy below as source for slides 2-4 (split into 3 short ideas):
"' || left(regexp_replace(coalesce(b.copy_full,''), E'\\n+', ' ', 'g'), 600) || '"

All text in Brazilian Portuguese (accents correct). Save 5 PNGs: ' || b.scheduled_date || '_osi-carrossel-' || b.slug || '_01..05.png em docs/divulgacao/artes/',
  updated_at = now()
FROM base b
WHERE c.id = b.id AND b.tipo = 'carrossel';

SELECT
  count(*) FILTER (WHERE art_prompt IS NOT NULL) AS com_prompt,
  count(*) FILTER (WHERE art_prompt IS NULL) AS sem_prompt
FROM marketing.content_calendar
WHERE deleted_at IS NULL AND scheduled_date >= current_date AND status IN ('ready','planned');
