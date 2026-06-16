-- 044: recria v_marketing_calendar com c.* (expõe TODAS as colunas da tabela).
-- A view tinha lista fixa antiga (sem platforms/copy_full/arts/posting_brief/art_prompt...).
-- c.* torna a view auto-atualizável conforme a tabela cresce. security_invoker mantido.

DROP VIEW IF EXISTS public.v_marketing_calendar;

CREATE VIEW public.v_marketing_calendar AS
  SELECT c.*,
         p.code  AS pillar_code,
         p.name  AS pillar_name,
         p.color AS pillar_color,
         p.icon  AS pillar_icon
  FROM marketing.content_calendar c
  LEFT JOIN marketing.content_pillars p ON p.id = c.pillar_id
  WHERE c.deleted_at IS NULL
  ORDER BY c.scheduled_date, c.scheduled_time;

ALTER VIEW public.v_marketing_calendar SET (security_invoker = true);
REVOKE ALL ON public.v_marketing_calendar FROM anon, public;
GRANT SELECT ON public.v_marketing_calendar TO authenticated;
