-- 129 — o funil first-party deixa de somar o site do Clearix na OSI e o preview local em tudo
--
-- ✔ APLICADA em 15/09/2026 às 12:33:59 BRT (15:33 UTC), por mim, com a palavra do dono neste canal
--   ("aplicar tudo"). Travas passaram. Card OSI lido depois de aplicar: landing_visit 137 total /
--   54 em 7 dias, click_checkout 2 / 1. Houve tráfego real entre 10:27 e 12:34: +8 visitas e
--   +1 clique, que já passaram na regra nova. Outros: calc_used 41, reader_gatilho_click 1. A view
--   continua com invoker.
--
-- (Escrita como NÃO APLICADA.) Pedido do Orquestrador Geral (15/09/2026): o card
--    "Funil de conversão · first-party" da tela OSI é número que pode ir a público.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O DEFEITO, medido em 15/09/2026 às 10:27 (Brasília)
-- ═══════════════════════════════════════════════════════════════════════════
-- v_analytics_funnel_summary junta events_log ao catálogo SÓ pelo código e agrupa pelo produto
-- do CATÁLOGO. Dois vazamentos:
--   1. O site do Clearix manda landing_visit e click_checkout com product 'clearix-site' no
--      payload; no catálogo esses códigos são 'osi' → as visitas do Clearix entram na OSI.
--   2. Previews locais (url http://localhost…) mandaram eventos reais: 101 linhas no log.
--
-- O QUE O DONO VÊ NO CARD DA OSI (tela OSI → Funil de conversão), antes → depois:
--   landing_visit   total 297 → 129    últimos 7 dias 146 → 46
--   click_checkout  total  14 →   1    últimos 7 dias   6 →  0
--   "conversão 7d" (cliques ÷ visitas)  6/146 = 4,1 %  →  0/46 = 0 %
--   A conversão que o card mostrava vinha dos cliques no site do CLEARIX.
-- Outros produtos (não aparecem no card da OSI, mas a view é a mesma):
--   calc_used (clearix-calc)          60 → 41   (19 do preview local)
--   reader_gatilho_view (osi-leitor)   6 →  0   (todos do preview local)
--   reader_gatilho_click (osi-leitor)  2 →  1   (fica a prova-124 do Geral, sem url)
--
-- A REGRA NOVA (conta a linha do log só se):
--   • o produto do payload é nulo, igual ao do catálogo, ou o catálogo é uma "família" dele
--     (catálogo 'osi-leitor' aceita payload 'osi': o leitor manda 'osi', e é a mesma casa); e
--   • a url não é de preview local (localhost, 127.0.0.1, [::1]) — mesma regex da events-ingest.
-- Nada é apagado: as linhas continuam no log (dado real, ordem do dono). Só a leitura muda.
-- Mesmas colunas, mesma ordem: create or replace, invoker e grants preservados (trava).

begin;

do $$
begin
  if md5(pg_get_viewdef('public.v_analytics_funnel_summary'::regclass)) <> '4319817c80701ebe93cb58c742d80d6a' then
    raise exception 'v_analytics_funnel_summary mudou desde 15/09 — esta migration substituiria a versão nova.';
  end if;
end $$;

create or replace view public.v_analytics_funnel_summary with (security_invoker = true) as
 SELECT c.product,
    c.code AS event_code,
    c.funnel_stage,
    c.sort_order,
    count(l.id) FILTER (WHERE (l.occurred_at >= (now() - '7 days'::interval))) AS n_7d,
    count(l.id) FILTER (WHERE (l.occurred_at >= (now() - '30 days'::interval))) AS n_30d,
    count(l.id) AS n_total,
    max(l.occurred_at) AS last_at
   FROM (analytics.events_catalog c
     LEFT JOIN analytics.events_log l
       ON l.event_code = c.code
      AND (l.product IS NULL OR l.product = c.product OR c.product LIKE l.product || '-%')
      AND COALESCE(l.url, '') !~* '^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/|$)')
  WHERE c.is_active
  GROUP BY c.product, c.code, c.funnel_stage, c.sort_order;

do $$
declare n int;
begin
  if not exists (select 1 from pg_class where oid = 'public.v_analytics_funnel_summary'::regclass and reloptions @> array['security_invoker=true']) then
    raise exception 'A view perdeu security_invoker.';
  end if;

  -- o card da OSI não conta mais nada que veio com product 'clearix-site'
  select count(*) into n from public.v_analytics_funnel_summary s
   where s.product = 'osi' and s.n_total > (
     select count(*) from analytics.events_log l
      where l.event_code = s.event_code and coalesce(l.product, 'osi') = 'osi'
        and coalesce(l.url, '') !~* '^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/|$)');
  if n > 0 then raise exception 'O card da OSI ainda conta evento de outro produto ou de localhost.'; end if;

  -- o leitor (catálogo osi-leitor, payload osi) continua contado
  select count(*) into n from public.v_analytics_funnel_summary where product = 'osi-leitor' and event_code = 'reader_gatilho_click' and n_total >= 1;
  if n <> 1 then raise exception 'A regra de família perdeu os eventos do leitor.'; end if;

  execute 'set local role authenticated';
  perform product, event_code, n_7d, n_30d, n_total, last_at from public.v_analytics_funnel_summary;
  execute 'reset role';
end $$;

commit;

-- PROVAS (depois de aplicar)
--   a) select event_code, n_total, n_7d from v_analytics_funnel_summary where product='osi' →
--      landing_visit 129 / 46, click_checkout 1 / 0 (números de 15/09 10:27; no ensaio desfeito das
--      10:30 já eram 130 / 47 — crescem com tráfego real);
--   b) tela OSI → Funil de conversão mostra esses números e "conversão 7d 0,0%" (ou o novo real).
