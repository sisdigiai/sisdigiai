-- 146 — régua única de "origem real" + OSI por dia (molde do card do blog) + funil sem prévias
--
-- ⛔ NÃO APLICADA. Pede a palavra do dono neste canal.
--
-- DE ONDE VEM: pedido do dono repassado pelo Agent OSI (17/09 13:52): "avisar o digiai para incluir as configurações no
--   app, para termos os dados reais iguais ao blog". O blog aparece em Mkt › Crescimento como card com série por dia e
--   detalhe; a OSI hoje só tem contagens 7d/30d/total em OSI › Mapa (v_analytics_funnel_summary).
--
-- MEDIDO ANTES (17/09 ~14h BRT), analytics.events_log product osi/osi-leitor:
--   landing_visit 198 · reader_gatilho_view 6 · click_checkout 3 · reader_gatilho_click 2 · 3 eventos novos: 0 ainda.
--   Os 8 do leitor são todos de localhost ou sem url (teste de 14/09); dos 3 cliques em comprar, 1 é de 09/06
--   (fora dos 90 dias), 1 de localhost e 1 da campanha teste.compra_teste.v1. Na janela: 79 visitas reais, 51 sessões, 0 compras.
--   Por origem: 120 da landing publicada, 52 de localhost (3000 e 4173), ~38 de prévias da Netlify (<hash>--landing…),
--   1 sem url. O funil atual (v_analytics_funnel_summary) tira localhost, mas CONTA as
--   prévias da Netlify (~38 visitas que não são gente de fora). marketing.hotmart_sales: 0 linhas.
--
-- O QUE CRIA: public.v_mkt_osi_dias (security_invoker; RLS de events_log e hotmart_sales = is_staff()):
--   90 dias, dia em BRT, só origem real (fora: sem url, localhost/127/::1, prévia <hash>--*.netlify.app, *.pages.dev,
--   e campanha utm "teste.*" — o clique em comprar de 15/09 12:30 na landing publicada é teste.compra_teste.v1).
--   Filtro por EXCLUSÃO de origem de teste, não por lista de hosts: são dois hosts publicados (OSI, 17/09) —
--   landingoticasemimproviso.netlify.app (visita, comprar, calc, whatsapp, lead) e oticasemimproviso.netlify.app (leitor,
--   gatilhos). Sem domínio próprio ainda. Único prefixo de teste usado: "teste.". Colunas:
--   visitas, sessoes, cliques_comprar, cliques_calc, cliques_whatsapp, leads, gatilho_views, gatilho_clicks,
--   vendas (hotmart approved) e receita_cents. Sem PII: só contagem.
--
-- RÉGUA ÚNICA (pedido do Orquestrador Geral, 17/09): a definição de "real" mora em UM lugar,
--   analytics.fn_origem_real(url, utm_campaign), e as duas views a usam — sem número duplicado por construção.
--
-- MUDA TAMBÉM: public.v_analytics_funnel_summary (OSI › Mapa, Comercial › Site Clearix) passa a usar a mesma régua.
--   Hoje ela só tira localhost. Efeito medido em 17/09, total histórico por produto:
--     osi .......... 157 → 116 (saem 41: prévias <hash>--*.netlify.app, 1 sem url e campanhas teste.*)
--     clearix-site . 151 → 144 (saem 7: 2 landing_visit de clearix-site.pages.dev e 5 eventos da campanha teste.site.v0/v1)
--     clearix-calc .  43 →  43
--   Nenhum evento que hoje conta passa a contar; só saem. Mesmas colunas, mesmo security_invoker, mesmos grants.

begin;

do $$
begin
  if to_regclass('public.v_mkt_osi_dias') is not null or to_regprocedure('analytics.fn_origem_real(text,text)') is not null then
    raise exception 'v_mkt_osi_dias ou fn_origem_real ja existe — a 146 ja foi aplicada?';
  end if;
  if md5(pg_get_viewdef('public.v_analytics_funnel_summary'::regclass)) <> 'dffc2291f4992ec745c119f32b05deb6' then
    raise exception 'v_analytics_funnel_summary mudou desde 17/09 — conferir antes.';
  end if;
end $$;

create function analytics.fn_origem_real(p_url text, p_utm_campaign text)
returns boolean
language sql
immutable
set search_path = ''
as $$
  select coalesce(p_url, '') ~* '^https?://'
     and p_url !~* '^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/|$)'
     and p_url !~* '^https?://([0-9a-f]{20,}--[a-z0-9-]+\.netlify\.app|([a-z0-9-]+\.)+pages\.dev)(:\d+)?(/|$)'
     and coalesce(p_utm_campaign, '') !~* '^teste\.';
$$;
comment on function analytics.fn_origem_real(text, text) is
  'Régua única de evento real (146): com url http(s), fora de localhost, prévia de deploy (<hash>--*.netlify.app, *.pages.dev) e campanha utm teste.*';
revoke all on function analytics.fn_origem_real(text, text) from public, anon;
grant execute on function analytics.fn_origem_real(text, text) to authenticated, service_role;

create or replace view public.v_analytics_funnel_summary
with (security_invoker = true) as
 SELECT c.product,
    c.code AS event_code,
    c.funnel_stage,
    c.sort_order,
    count(l.id) FILTER (WHERE (l.occurred_at >= (now() - '7 days'::interval))) AS n_7d,
    count(l.id) FILTER (WHERE (l.occurred_at >= (now() - '30 days'::interval))) AS n_30d,
    count(l.id) AS n_total,
    max(l.occurred_at) AS last_at
   FROM (analytics.events_catalog c
     LEFT JOIN analytics.events_log l ON (((l.event_code = c.code) AND ((l.product IS NULL) OR (l.product = c.product) OR (c.product ~~ (l.product || '-%'::text))) AND analytics.fn_origem_real(l.url, l.utm_campaign))))
  WHERE c.is_active
  GROUP BY c.product, c.code, c.funnel_stage, c.sort_order;

create view public.v_mkt_osi_dias
with (security_invoker = true) as
with dias as (
  select generate_series(((now() at time zone 'America/Sao_Paulo')::date - 89),
                         (now() at time zone 'America/Sao_Paulo')::date, interval '1 day')::date as dia
), ev as (
  select (l.occurred_at at time zone 'America/Sao_Paulo')::date as dia,
         count(*) filter (where l.event_code = 'landing_visit')          as visitas,
         count(distinct l.session_id) filter (where l.event_code = 'landing_visit') as sessoes,
         count(*) filter (where l.event_code = 'click_checkout')         as cliques_comprar,
         count(*) filter (where l.event_code = 'click_brinde_calc')      as cliques_calc,
         count(*) filter (where l.event_code = 'click_whatsapp_suporte') as cliques_whatsapp,
         count(*) filter (where l.event_code = 'lead_capture_submit')    as leads,
         count(*) filter (where l.event_code = 'reader_gatilho_view')    as gatilho_views,
         count(*) filter (where l.event_code = 'reader_gatilho_click')   as gatilho_clicks
    from analytics.events_log l
   where l.product in ('osi', 'osi-leitor')
     and l.occurred_at >= now() - interval '91 days'
     and analytics.fn_origem_real(l.url, l.utm_campaign)
   group by 1
), hs as (
  select (s.purchase_date at time zone 'America/Sao_Paulo')::date as dia,
         count(*) as vendas,
         sum(coalesce(s.price_value_cents, 0)) as receita_cents
    from marketing.hotmart_sales s
   where s.status = 'approved'
     and s.purchase_date >= now() - interval '91 days'
   group by 1
)
select d.dia,
       coalesce(ev.visitas, 0)          as visitas,
       coalesce(ev.sessoes, 0)          as sessoes,
       coalesce(ev.cliques_comprar, 0)  as cliques_comprar,
       coalesce(ev.cliques_calc, 0)     as cliques_calc,
       coalesce(ev.cliques_whatsapp, 0) as cliques_whatsapp,
       coalesce(ev.leads, 0)            as leads,
       coalesce(ev.gatilho_views, 0)    as gatilho_views,
       coalesce(ev.gatilho_clicks, 0)   as gatilho_clicks,
       coalesce(hs.vendas, 0)           as vendas,
       coalesce(hs.receita_cents, 0)    as receita_cents
  from dias d
  left join ev on ev.dia = d.dia
  left join hs on hs.dia = d.dia
 order by d.dia desc;

revoke all on public.v_mkt_osi_dias from public, anon;
grant select on public.v_mkt_osi_dias to authenticated, service_role;

do $$
declare v_real bigint; v_view bigint; v_dias int; v_hoje date;
begin
  select count(*), max(dia) into v_dias, v_hoje from public.v_mkt_osi_dias;
  if v_dias <> 90 or v_hoje <> (now() at time zone 'America/Sao_Paulo')::date then
    raise exception 'a view nao tem 90 dias terminando hoje em BRT (% dias, ultimo %)', v_dias, v_hoje;
  end if;

  -- conservação: a soma de visitas é exatamente a das visitas de origem real na janela BRT
  select count(*) into v_real from analytics.events_log
   where product in ('osi','osi-leitor') and event_code = 'landing_visit'
     and (occurred_at at time zone 'America/Sao_Paulo')::date >= (now() at time zone 'America/Sao_Paulo')::date - 89
     and url ~* '^https?://landingoticasemimproviso\.netlify\.app(/|$)'
     and coalesce(utm_campaign, '') !~* '^teste\.';
  select sum(visitas) into v_view from public.v_mkt_osi_dias;
  if v_view <> v_real then
    raise exception 'visitas na view (%) diferem das visitas da landing publicada (%) — alguma origem entrou ou saiu errado', v_view, v_real;
  end if;

  -- funil: mesma régua; efeito exatamente o medido
  if (select sum(n_total) from public.v_analytics_funnel_summary where product = 'clearix-calc') <> 43
  or exists (select 1 from public.v_analytics_funnel_summary f
              where f.n_total <> (select count(*) from analytics.events_log l
                                   where l.event_code = f.event_code
                                     and (l.product is null or l.product = f.product or f.product like l.product || '-%')
                                     and coalesce(l.url, '') ~* '^https?://'
                                     and l.url !~* '^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/|$)'
                                     and l.url !~* '^https?://([0-9a-f]{20,}--[a-z0-9-]+\.netlify\.app|([a-z0-9-]+\.)+pages\.dev)(:\d+)?(/|$)'
                                     and coalesce(l.utm_campaign, '') !~* '^teste\.')) then
    raise exception 'funil nao bate com a regua escrita por extenso.';
  end if;
  if exists (select 1 from public.v_analytics_funnel_summary f
              where f.product = 'osi' and f.event_code = 'landing_visit'
                and f.n_total <> (select count(*) from analytics.events_log where event_code = 'landing_visit'
                                   and (product is null or product = 'osi') and url ~* '^https?://landingoticasemimproviso\.netlify\.app(/|$)'
                                   and coalesce(utm_campaign, '') !~* '^teste\.')) then
    raise exception 'funil da OSI ainda conta previa.';
  end if;

  if has_table_privilege('anon', 'public.v_mkt_osi_dias', 'select') or has_function_privilege('anon', 'analytics.fn_origem_real(text,text)', 'execute') then
    raise exception 'anon le a view.';
  end if;

  -- prova: prévia e localhost não entram; landing publicada entra (desfeito)
  begin
    insert into analytics.events_log (event_code, product, occurred_at, session_id, url) values
      ('click_brinde_calc', 'osi', now(), 'prova146a', 'https://6aab28c86ade6700088aa072--landingoticasemimproviso.netlify.app/'),
      ('click_brinde_calc', 'osi', now(), 'prova146b', 'http://localhost:4173/'),
      ('click_brinde_calc', 'osi', now(), 'prova146c', 'https://landingoticasemimproviso.netlify.app/obrigado');
    if (select sum(cliques_calc) from public.v_mkt_osi_dias) <> 1 + (select count(*) from analytics.events_log
          where event_code = 'click_brinde_calc' and session_id not like 'prova146%'
            and url ~* '^https?://landingoticasemimproviso\.netlify\.app(/|$)') then
      raise exception 'PROVA_146_FALHOU: filtro de origem';
    end if;
    -- o leitor publica em outro host (oticasemimproviso.netlify.app): entra; a prévia dele não
    insert into analytics.events_log (event_code, product, occurred_at, session_id, url) values
      ('reader_gatilho_view', 'osi', now(), 'prova146d', 'https://oticasemimproviso.netlify.app/leitor'),
      ('reader_gatilho_view', 'osi', now(), 'prova146e', 'https://6aab28c86ade6700088aa072--oticasemimproviso.netlify.app/leitor'),
      ('reader_gatilho_view', 'osi', now(), 'prova146f', 'https://x.netlify.app/?utm_campaign=teste.t1.v1');
    update analytics.events_log set utm_campaign = 'teste.t1.v1' where session_id = 'prova146f';
    if (select sum(gatilho_views) from public.v_mkt_osi_dias) <> 1 + (select count(*) from analytics.events_log
          where event_code = 'reader_gatilho_view' and session_id not like 'prova146%'
            and url ~* '^https?://oticasemimproviso\.netlify\.app(/|$)') then
      raise exception 'PROVA_146_FALHOU: leitor publicado nao entrou, ou previa/teste do leitor entrou';
    end if;
    raise exception 'PROVA_146_OK';
  exception when others then
    if sqlerrm <> 'PROVA_146_OK' then raise; end if;
  end;
end $$;

commit;
