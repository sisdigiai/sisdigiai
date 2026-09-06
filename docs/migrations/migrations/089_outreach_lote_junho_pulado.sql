-- ============================================================
-- 089 — Esteira de outreach: o lote de junho/julho vira 'pulado' (dado, reversivel)
-- ============================================================
-- Diagnostico (orquestrador, 05/09, ordem noturna): marketing.outreach_schedule
-- NUNCA teve motor — sem cron, sem edge function; o app so le a view e mostra o
-- alerta "esteira parada". Os 14 'enviado' (22-23/06) foram marcados por SQL na
-- epoca; os 113 'agendado' (18/06 -> 25/07) + 1 followup foram carga sem ninguem
-- para enviar. Parou porque o humano parou. O plano dos 259
-- (docs/comercial/plano-259-2026-09-05.md) substitui o lote com toque manual por
-- desenho. Para o alerta parar de gritar 114 vencidos que ninguem vai enviar,
-- o lote vira 'pulado' (valor permitido pelo CHECK; 'cancelado' nao existe).
-- Reversao: update ... set status='agendado' where notes like '%[05/09 pulado]%'.
update marketing.outreach_schedule
   set status = 'pulado',
       notes = coalesce(notes,'') || ' [05/09 pulado] lote de carga sem motor de envio; substituido pelo plano dos 259 (toque manual)'
 where status = 'agendado' and scheduled_date < current_date;
