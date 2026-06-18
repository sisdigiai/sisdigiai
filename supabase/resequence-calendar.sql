-- Re-sequência da agenda OSI (2026-06-18): feed contínuo + reels parkados.
-- Nada é deletado; só re-datado/re-status. Não toca posts publicados nem passados.

-- 1) PARKAR os reels: viram backlog 'planned' marcado (dependem da Taty gravar).
UPDATE marketing.content_calendar
SET status = 'planned',
    notes = COALESCE(notes,'') || CASE WHEN COALESCE(notes,'') LIKE '%aguardando gravação Taty%' THEN '' ELSE ' [REEL · aguardando gravação Taty]' END,
    updated_at = now()
WHERE deleted_at IS NULL AND status IN ('ready','planned') AND scheduled_date >= '2026-06-18'
  AND (content_type ILIKE '%reel%' OR 'instagram_reels' = ANY(platforms));

-- 2) RE-SEQUENCIAR os posts de feed (card + carrossel) em dias úteis consecutivos a partir de 18/06.
WITH weekdays AS (
  SELECT d::date AS dia, row_number() OVER (ORDER BY d) AS rn
  FROM generate_series('2026-06-18'::date, '2026-12-31'::date, '1 day') d
  WHERE extract(dow FROM d) NOT IN (0,6)            -- exclui sáb(6)/dom(0)
),
feed AS (
  SELECT id, row_number() OVER (ORDER BY scheduled_date, created_at) AS rn
  FROM marketing.content_calendar
  WHERE deleted_at IS NULL AND scheduled_date >= '2026-06-18'
    AND status IN ('ready','planned')
    AND platform IS DISTINCT FROM 'linkedin'
    AND NOT (content_type ILIKE '%reel%' OR 'instagram_reels' = ANY(platforms))
)
UPDATE marketing.content_calendar c
SET scheduled_date = w.dia, status = 'ready', updated_at = now()
FROM feed f JOIN weekdays w ON w.rn = f.rn
WHERE c.id = f.id;
