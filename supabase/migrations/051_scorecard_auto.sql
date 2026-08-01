-- Scorecard que se preenche sozinho onde o dado já existe (2026-08-01).
-- Motivo: 4 das 6 métricas da Semana JÁ são medidas em algum lugar do ecossistema
-- (prospecção no MKT, publicações no espelho, leads na captura, vendas nos webhooks).
-- Pedir digitação de número que o sistema já tem é retrabalho — e retrabalho não é feito.
-- O humano só digita o que é julgamento (demos agendadas, follow-ups).
--
-- v_ops_scorecard_auto devolve, por métrica, o valor calculado da semana corrente.
-- A UI mostra como sugestão; gravar continua sendo ato explícito (fn_scorecard_set),
-- porque o dono é quem assina o número da semana.

create or replace view public.v_ops_scorecard_auto as
with semana as (
  select date_trunc('week', now() at time zone 'America/Sao_Paulo')::date as inicio
)
select 'contatos_prospeccao'::text as slug,
       (select count(*) from mkt.osi_disparos d, semana s where d.enviado_em >= s.inicio)::numeric as valor,
       'mkt.osi_disparos (disparos da semana)'::text as fonte
union all
select 'posts_no_ar',
       (select count(*) from mkt.publications p, semana s where p.published_at >= s.inicio)::numeric,
       'mkt.publications (publicadas na semana)'
union all
select 'vendas_osi',
       ((select count(*) from marketing.hotmart_sales h, semana s where h.created_at >= s.inicio)
      + (select count(*) from billing.mp_events_raw m, semana s where m.received_at >= s.inicio and m.sig_ok))::numeric,
       'hotmart_sales + mp_events_raw (semana)'
union all
-- % de leads da semana que saíram de 'novo' (proxy honesto de "respondido")
select 'leads_respondidos_24h',
       coalesce((
         select round(100.0 * count(*) filter (where l.status <> 'novo') / nullif(count(*), 0), 0)
         from marketing.landing_leads l, semana s
         where l.created_at >= s.inicio and l.anonymized_at is null
       ), 100)::numeric,
       'landing_leads (100% quando não houve lead na semana)';

grant select on public.v_ops_scorecard_auto to authenticated;

comment on view public.v_ops_scorecard_auto is
  'Valores calculados na fonte para as métricas automatizáveis do scorecard semanal. demos_agendadas e followups_feitos ficam de fora de propósito: são julgamento humano.';
