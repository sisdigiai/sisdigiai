-- 043: prompt de arte por post + nome de arquivo sugerido (Central de Postagens).
-- Campo novo no calendário pra cada post carregar seu prompt pronto pra copiar/colar no GPT,
-- e o nome de arquivo padrão pra salvar na pasta de artes. Aditivo, não toca posting_brief.

ALTER TABLE marketing.content_calendar ADD COLUMN IF NOT EXISTS art_prompt   text;
ALTER TABLE marketing.content_calendar ADD COLUMN IF NOT EXISTS art_filename text;

-- views v_marketing_calendar já fazem SELECT * (security_invoker) — os campos novos entram sozinhos.
