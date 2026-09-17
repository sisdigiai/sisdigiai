-- 134 — três eventos first-party novos da landing OSI; checkout_started sai do catálogo
--
-- ✔ APLICADA em 17/09/2026 às 00:21:42 BRT, com a palavra do dono neste canal ("temos que aplicar todas as migrations em nosso banco todo"),
--   reensaiada contra o banco do dia antes. Medido depois: 3 eventos novos ativos; checkout_started inativo. events-ingest AINDA NÃO publicada.
--
-- (Escrita como NÃO APLICADA.)
-- ⛔ NÃO APLICADA. Pede a palavra do dono neste canal.
--
-- DE ONDE VEM: pedido do agente da OSI (steward), aprovado pelo Orquestrador Geral em 16/09. O catálogo
--   de eventos é do digiai.
--
-- O QUE MUDA:
--   • entram 3 códigos para product = 'osi', first-party e SEM pixel (meta/tiktok/ga4 nulos):
--       click_brinde_calc       — clique no brinde Clearix Calc (#calc)
--       click_whatsapp_suporte  — clique no WhatsApp de suporte
--       lead_capture_submit     — envio do formulário lead-capture
--     Todos em funnel_stage 'consideration': o catálogo só usa awareness / consideration / conversion /
--     retention, e 'conversion' aqui é compra. Deixar um lead como "conversion" faria o funil somar lead
--     com venda. sort_order 22/24/26: depois do click_checkout (20).
--   • checkout_started fica is_active = false (não apaga: a FK de analytics.events_log aponta para o code).
--     É código morto, medido em 16/09:
--       - 0 linhas em analytics.events_log, desde sempre;
--       - nenhuma função, view ou cron do banco cita o código;
--       - hotmart-webhook e kiwify-webhook não o gravam (só purchase_approved, server-side);
--       - no cliente da OSI existe só no tipo (tracker.ts) e em dois mapas de pixel — nada chama.
--     O checkout é da Hotmart, fora do nosso domínio: não há como a landing saber que ele começou.
--
-- EFEITO NO FRONT:
--   • o card de funil do Marketing (v_analytics_funnel_summary, só is_active) ganha 3 linhas zeradas e
--     perde a do checkout_started (que era 0).
--   • a tela Fluxo OSI (FluxoOSI.tsx) desenha 4 quadros FIXOS e um é "Checkout iniciado": continua
--     mostrando 0 até o front trocar esse quadro — fica para quando a landing ligar os eventos novos.
--
-- CÓDIGO QUE ANDA JUNTO (mesmo commit, deploy da edge só depois desta migration):
--   supabase/functions/events-ingest — os 3 códigos entram na allowlist e checkout_started sai.
--   A ordem importa: a allowlist aceitar um código antes do catálogo tê-lo faria fn_log_event falhar na FK.

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from analytics.events_catalog
              where code in ('click_brinde_calc','click_whatsapp_suporte','lead_capture_submit')) then
    raise exception 'codigo novo ja existe no catalogo — a 134 ja foi aplicada?';
  end if;

  if not exists (select 1 from analytics.events_catalog where code = 'checkout_started' and is_active and product = 'osi') then
    raise exception 'checkout_started nao esta ativo em osi — conferir antes.';
  end if;

  if exists (select 1 from analytics.events_log where event_code = 'checkout_started') then
    raise exception 'checkout_started tem evento gravado — nao e codigo morto, nao desativar.';
  end if;

  if exists (
    select 1 from pg_proc where prosrc ilike '%checkout_started%'
  ) then
    raise exception 'alguma funcao do banco cita checkout_started — conferir antes de desativar.';
  end if;

  if md5(pg_get_viewdef('public.v_analytics_funnel_summary'::regclass)) is null then
    raise exception 'v_analytics_funnel_summary sumiu.';
  end if;
end $$;

-- ── eventos novos ─────────────────────────────────────────────────────────────
insert into analytics.events_catalog
  (code, funnel_stage, description, meta_pixel_event, tiktok_pixel_event, ga4_event, product, is_active, sort_order)
values
  ('click_brinde_calc', 'consideration',
   'Visitante da landing OSI clicou no brinde Clearix Calc (âncora #calc). First-party, sem pixel, zero PII (R-013). Migration 134.',
   null, null, null, 'osi', true, 22),
  ('click_whatsapp_suporte', 'consideration',
   'Visitante da landing OSI clicou no WhatsApp de suporte. First-party, sem pixel, zero PII — o número de quem clica não passa por aqui. Migration 134.',
   null, null, null, 'osi', true, 24),
  ('lead_capture_submit', 'consideration',
   'Visitante da landing OSI enviou o formulário de lead-capture. Marca o envio, não o lead: o cadastro vive em marketing.landing_leads pela edge lead-capture. Sem pixel, zero PII no evento. Migration 134.',
   null, null, null, 'osi', true, 26);

-- ── código morto sai de circulação ────────────────────────────────────────────
update analytics.events_catalog
   set is_active = false,
       description = description || ' — DESATIVADO em 16/09/2026 (migration 134): nunca disparou, 0 eventos; o checkout é da Hotmart e a landing não enxerga o início dele.',
       updated_at = now()
 where code = 'checkout_started';

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
begin
  if (select count(*) from analytics.events_catalog
       where code in ('click_brinde_calc','click_whatsapp_suporte','lead_capture_submit')
         and is_active and product = 'osi'
         and meta_pixel_event is null and tiktok_pixel_event is null and ga4_event is null) <> 3 then
    raise exception 'os 3 eventos novos nao estao todos ativos, em osi e sem pixel.';
  end if;

  if exists (select 1 from analytics.events_catalog where code = 'checkout_started' and is_active) then
    raise exception 'checkout_started continua ativo.';
  end if;

  if (select count(*) from public.v_analytics_funnel_summary
       where event_code in ('click_brinde_calc','click_whatsapp_suporte','lead_capture_submit')) <> 3
  or exists (select 1 from public.v_analytics_funnel_summary where event_code = 'checkout_started') then
    raise exception 'o funil nao reflete o catalogo: faltam os novos ou sobrou checkout_started.';
  end if;

  if exists (select 1 from analytics.events_catalog where description like '%' || chr(65533) || '%') then
    raise exception 'descricao com caractere de substituicao (U+FFFD) — encoding quebrado.';
  end if;
end $$;

-- prova de comportamento, desfeita na hora: o caminho da edge grava o código novo
do $$
begin
  begin
    perform public.fn_log_event('lead_capture_submit', 'osi', 'prova-134', 'https://oticasemimproviso.com.br/',
                                null, null, null, null, null, '{}'::jsonb, 'prova 134');
    if not exists (select 1 from analytics.events_log where event_code = 'lead_capture_submit' and session_id = 'prova-134') then
      raise exception 'PROVA_134_FALHOU: fn_log_event nao gravou o codigo novo';
    end if;
    raise exception 'PROVA_134_OK';
  exception
    when others then
      if sqlerrm <> 'PROVA_134_OK' then raise; end if;
  end;
end $$;

commit;
