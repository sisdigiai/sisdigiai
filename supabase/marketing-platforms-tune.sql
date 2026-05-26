-- ============================================================
-- Tune das plataformas + 3 redes novas (Pinterest, Telegram, Kwai)
-- ============================================================
-- Fixes:
--  - Threads cor #FFFFFF → #000000 (sumia no dark mode)
--  - TikTok hashtag_limit 0 → 5 (média recomendada)
--  - Facebook hashtag_limit 0 → 3
--  - Threads/WhatsApp/Email: normalizar nulls para 0
--
-- Adições:
--  - Pinterest (visual evergreen, público feminino 25-45)
--  - Telegram canal (alternativa ao WhatsApp Broadcast, sem limite)
--  - Kwai (TikTok brasileiro, forte no interior — vendedor de ótica
--    de cidade pequena vive lá)
--
-- Também aplica backfill: adiciona as 3 novas plataformas em todos
-- os posts com status='planned' já existentes (estratégia "inundação"
-- continua válida pra agenda já gerada).
-- ============================================================

-- Fix issues
UPDATE marketing.platforms SET color = '#000000' WHERE code = 'threads';
UPDATE marketing.platforms SET hashtag_limit = 5 WHERE code = 'tiktok';
UPDATE marketing.platforms SET hashtag_limit = 3 WHERE code = 'facebook_feed';
UPDATE marketing.platforms SET hashtag_limit = 0
  WHERE code IN ('threads', 'whatsapp_broadcast', 'whatsapp_status', 'email');

-- Adiciona 3 redes novas
INSERT INTO marketing.platforms
  (code, name, parent_platform, color, formats, copy_char_limit, hashtag_limit, sort_order, is_active, notes)
VALUES
  ('pinterest', 'Pinterest', 'pinterest', '#BD081C',
   '[{"name":"pin","w":1000,"h":1500,"aspect":"2:3"},{"name":"video_pin","w":1080,"h":1920,"aspect":"9:16","duration_max":60}]'::jsonb,
   500, 20, 13, true,
   'Visual evergreen. Pin vive meses no feed. Ideal pra antes/depois, combos, looks.'),

  ('telegram_canal', 'Telegram (canal)', 'telegram', '#26A5E4',
   '[{"name":"texto_imagem","w":0,"h":0,"aspect":"flex"}]'::jsonb,
   4096, 0, 14, true,
   'Canal de broadcast sem limite de assinantes. Bom pra reunir afiliados e comunidade.'),

  ('kwai', 'Kwai', 'kwai', '#FF6600',
   '[{"name":"reel","w":1080,"h":1920,"aspect":"9:16","duration_max":60}]'::jsonb,
   500, 5, 15, true,
   'Concorrente do TikTok com força no interior do BR. Reusa o reel do TikTok.')
ON CONFLICT (code) DO UPDATE SET
  color           = EXCLUDED.color,
  copy_char_limit = EXCLUDED.copy_char_limit,
  hashtag_limit   = EXCLUDED.hashtag_limit,
  is_active       = true,
  notes           = EXCLUDED.notes;

-- Backfill: adiciona as 3 novas nas agendas já planejadas
UPDATE marketing.content_calendar
SET platforms = (
  SELECT array_agg(DISTINCT p ORDER BY p)
  FROM unnest(platforms || ARRAY['pinterest','telegram_canal','kwai']) AS p
)
WHERE status = 'planned' AND deleted_at IS NULL
  AND NOT (platforms @> ARRAY['pinterest','telegram_canal','kwai']);

NOTIFY pgrst, 'reload schema';
