-- ============================================================
-- 081 — Views do Telão DIGIAI + espelhos cross-projeto (27/08/2026)
-- ============================================================
-- ESPELHO DO ESTADO JÁ APLICADO no banco pelo orquestrador (via Management
-- API/MCP durante a construção do Telão) — este arquivo materializa as
-- definições no repo para serem LEGÍVEIS DO DISCO (pedido justo do agente do
-- Telão: contrato que só existe no banco obriga o consumidor a chutar coluna).
-- Reaplicável: DROP+CREATE, idempotente no resultado.
--
-- Grants: TUDO daqui é authenticated-only, EXCETO v_espelho_brands e
-- v_espelho_content_rules (anon POR DESIGN — o limelight lê máquina-a-máquina
-- sem sessão; só dado público de marca/regra editorial).

-- ── Espelhos cross-projeto (anon por design) ─────────────────────────────────

drop view if exists public.v_espelho_brands;
create view public.v_espelho_brands as
  select id as brand_id, code, name, accent_hex, logo_url, logo_arte_url
  from mkt.brands;
comment on view public.v_espelho_brands is
  'Espelho público dos assets de marca (não-secreto) para consumo cross-projeto (limelight etc.) via anon key. Criado 27/08 para acabar com transcrição manual de brand_id/logos entre agentes.';
grant select on public.v_espelho_brands to anon, authenticated;

drop view if exists public.v_espelho_content_rules;
create view public.v_espelho_content_rules as
  select b.code as brand_code, b.name as brand_name,
         r.persona, r.tom, r.publico, r.proibicoes, r.gatilhos, r.formatos,
         r.cta_padrao, r.guardrails, r.norte, r.universo, r.updated_at
  from mkt.content_rules r
  join mkt.brands b on b.id = r.brand_id;
comment on view public.v_espelho_content_rules is
  'Espelho das regras de conteúdo por marca (dereferência do ponteiro content_rules_mkt do limelight — caso OSI 27/08). NÃO expõe voice/fatos/exemplos/notas/playbook. Fonte da verdade: mkt.content_rules.';
grant select on public.v_espelho_content_rules to anon, authenticated;

-- ── Snapshot do BI Clearix (tabela alimentada pelo sync-telao-bi) ────────────

create table if not exists public.espelho_telao_bi (
  id int primary key default 1 check (id = 1),
  dia_referencia date,
  mes_referencia text,
  vendas_qtd_dia int,
  faturamento_liquido_dia numeric,
  ticket_medio_dia numeric,
  entregas_dia int,
  vendas_qtd_mes int,
  faturamento_liquido_mes numeric,
  media_diaria_30d numeric,
  os_ativas_60d int,
  os_prontas_retirada_60d int,
  os_finalizadas_hoje int,
  lojas_operantes int,
  por_loja jsonb,
  observacoes jsonb,
  gerado_em timestamptz,
  sincronizado_em timestamptz not null default now(),
  payload jsonb
);
comment on table public.espelho_telao_bi is
  'Snapshot do BI Clearix para o Telão (slide 8), CONTRATO v3: dia+mês+média 30d + OS com janela de 60 dias + corte por loja (por_loja; critério auto-ajustável na origem: loja active com venda nos últimos 90d). Alimentada SÓ pelo sync-telao-bi (server-a-server, x-espelho-token; faturamento NUNCA viaja por anon key). Carimbo do dado = sincronizado_em (cron 10min; envelheceu >20min = cron morto, tela avisa).';
revoke all on public.espelho_telao_bi from anon;
grant select on public.espelho_telao_bi to authenticated;
grant all on public.espelho_telao_bi to service_role;

-- ── Views do Telão (authenticated-only) ──────────────────────────────────────

drop view if exists public.v_telao_financeiro;
create view public.v_telao_financeiro as
with meses as (
  select date_trunc('month', (now() at time zone 'America/Sao_Paulo'))::date - (interval '1 month' * g) as mes
  from generate_series(0,5) g
), cobertura as (
  select max(month)::date as despesas_lancadas_ate from finance.expenses where deleted_at is null and kind <> 'aporte_intelectual'
)
select m.mes::date as mes,
  coalesce((select sum(e.amount_brl) from finance.expenses e
    where e.deleted_at is null and e.kind <> 'aporte_intelectual'
      and date_trunc('month', e.month)::date = m.mes), 0) as despesas_brl,
  coalesce((select sum(e.amount_brl) from finance.expenses e
    where e.deleted_at is null and e.kind = 'aporte_intelectual'
      and date_trunc('month', e.month)::date = m.mes), 0) as aporte_intelectual_brl,
  coalesce((select sum(r.mrr_brl) from finance.revenue r where r.deleted_at is null and date_trunc('month', r.month)::date = m.mes), 0) as mrr_brl,
  coalesce((select sum(r.one_time_brl) from finance.revenue r where r.deleted_at is null and date_trunc('month', r.month)::date = m.mes), 0) as receita_avulsa_brl,
  coalesce((select sum(r.sales_count) from finance.revenue r where r.deleted_at is null and date_trunc('month', r.month)::date = m.mes), 0) as vendas_qtd,
  coalesce((select sum(r.active_subscriptions) from finance.revenue r where r.deleted_at is null and date_trunc('month', r.month)::date = m.mes), 0) as assinaturas_ativas,
  c.despesas_lancadas_ate,
  now() as gerado_em
from meses m cross join cobertura c order by m.mes desc;
comment on view public.v_telao_financeiro is
  'Telão slide 5. GRÃO: 1 linha/mês, 6 meses, recente primeiro. despesas_brl = SÓ CAIXA (subscription+one_time); aporte_intelectual separado (não-caixa, NUNCA somar — a soma inflaria ~R$312k). despesas_lancadas_ate = cobertura do import (mês 0 além dela = atraso, não economia). gerado_em = leitura ao vivo.';

drop view if exists public.v_telao_pipeline;
create view public.v_telao_pipeline as
select stage, count(*) as qtd, coalesce(sum(value_brl),0) as valor_brl,
  max(updated_at) as ultima_atividade, now() as gerado_em
from ops.commercial_leads
where deleted_at is null and anonymized_at is null
group by stage;
comment on view public.v_telao_pipeline is
  'Telão slide 6. GRÃO: 1 linha por estágio, carteira viva inteira. SEM nomes de leads (PII fora por construção).';

drop view if exists public.v_telao_cobranca;
create view public.v_telao_cobranca as
select
  count(*) filter (where status = 'active') as assinantes_ativos,
  coalesce(sum(plan_amount_brl) filter (where status = 'active'), 0) as mrr_brl,
  count(*) filter (where status = 'active' and next_due_on < (now() at time zone 'America/Sao_Paulo')::date) as vencidos,
  (select coalesce(jsonb_object_agg(ds, n), '{}'::jsonb) from (
     select coalesce(dunning_stage,'em_dia') as ds, count(*) as n
     from billing.subscribers where deleted_at is null and status='active' group by 1) x) as por_regua,
  (select coalesce(sum(amount_brl),0) from billing.payments
     where status in ('approved','accredited','paid')
       and date_trunc('month', paid_at at time zone 'America/Sao_Paulo') = date_trunc('month', now() at time zone 'America/Sao_Paulo')) as recebido_mes_brl,
  now() as gerado_em
from billing.subscribers where deleted_at is null;
comment on view public.v_telao_cobranca is
  'Telão slide 7. GRÃO: 1 linha única. recebido_mes = mês corrente BRT. Sem nomes/emails de assinantes.';

drop view if exists public.v_telao_sai_hoje;
create view public.v_telao_sai_hoje as
select b.code as brand_code, b.name as brand_name, j.platforms, j.status, j.dry_run,
  j.scheduled_for, j.updated_at, now() as gerado_em
from mkt.publish_jobs j join mkt.brands b on b.id = j.brand_id
where (j.scheduled_for at time zone 'America/Sao_Paulo')::date = (now() at time zone 'America/Sao_Paulo')::date
order by j.scheduled_for;
comment on view public.v_telao_sai_hoje is
  'Telão slide 11. GRÃO: 1 linha por publicação do DIA corrente BRT. Sem conteúdo do post (de propósito).';

drop view if exists public.v_telao_pendencias;
create view public.v_telao_pendencias as
select servico, identificador, coalesce(situacao, status) as situacao,
  ultima_verificacao, left(ultimo_detalhe, 240) as detalhe, now() as gerado_em
from ops.contas_servicos
where coalesce(ativo, true)
  and (ultimo_detalhe ilike '%aguard%' or ultimo_detalhe ilike '%pendente%' or ultimo_detalhe ilike '%pendência%'
       or ultimo_detalhe ilike '%review%' or ultimo_detalhe ilike '%trial%' or ultimo_detalhe ilike '%watch-item%'
       or ultimo_detalhe ilike '%vigiar%')
order by ultima_verificacao desc nulls last;
comment on view public.v_telao_pendencias is
  'Telão slide 13. GRÃO: 1 linha por vigília do cofre (heurística por palavra-chave em ultimo_detalhe). Sem conta_dona, sem credencial. Ruído = refinar filtro aqui.';

revoke all on public.v_telao_financeiro, public.v_telao_pipeline, public.v_telao_cobranca, public.v_telao_sai_hoje, public.v_telao_pendencias from anon;
grant select on public.v_telao_financeiro, public.v_telao_pipeline, public.v_telao_cobranca, public.v_telao_sai_hoje, public.v_telao_pendencias to authenticated;

-- ── 27/08 tarde: RLS da espelho_telao_bi (correção do bloqueio do slide 8) ───
-- A tabela nasceu com RLS ligado (guarda do projeto) e ZERO policy: grant a
-- authenticated devolvia 200 com 0 linhas para TODO leitor. Diagnóstico do
-- agente do Telão via ?diag (200 + sessão + 117ms + 0 linhas = RLS, não grant).
-- Fix = opção C dele: policy com o MESMO portão do app (is_super_admin), que
-- mantém a intenção "proteção maior de propósito" do dono.
create policy telao_le on public.espelho_telao_bi
  for select to authenticated using (public.is_super_admin());
