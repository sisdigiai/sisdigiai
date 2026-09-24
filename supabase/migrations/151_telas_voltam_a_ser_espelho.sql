-- 151 — as quatro frentes que o dono apontou: o app volta a ser espelho, e o que não tem fonte diz a idade
--
-- ✔ APLICADA em 23/09/2026 às 21:40:07 BRT, com a palavra do dono neste canal ("os 4"), reensaiada antes.
--   Medido depois: v_ops_dinheiro = R$ 0 de receita de mercado e R$ 1.903,38 de infra no mês (espelho 23/09 01:20);
--   placar da semana gravado sozinho (contatos 1, posts 5, vendas 0, leads 0); telas paradas na Hoje: roadmap,
--   financeiro_declarado, academy, redes_sociais. As views de frescor/custo precisaram da 153 para serem lidas.
--
-- (Escrita como NÃO APLICADA.)
--
-- MEDIDO ANTES (23/09 ~21h BRT), das 101 fontes que o app lê: 24 vivas (48 h), 35 mornas, 42 paradas há mais de 21 dias.
--   · Roadmap: fase 2 aberta, 8 tarefas, 0 feitas, nada tocado desde 14/08 (41 dias).
--   · Semana: v_ops_scorecard_auto CALCULA a semana corrente (contatos 1, posts 5, vendas 0), mas ninguém grava —
--     a tela mostra a semana de 27/07 como se fosse o placar de hoje.
--   · Dinheiro: Visão lê company.financial_snapshots (parado em 09/06) e mostra "R$ 0 · preencher cadastro". O medido
--     hoje: 0 pagamento aprovado, 0 assinante de mercado, 0 venda Hotmart aprovada, R$ 1.903,38 de infra no mês
--     (finance.infra_costs, sincronizado 23/09 01:20 pelo Finance).
--   · Inventário: 85 contas ativas, 76 com verificação velha, custo declarado R$ 0 contra R$ 1.903,38 medidos em 6 serviços.
--
-- O QUE CRIA
--   1. public.v_ops_dinheiro        — dinheiro MEDIDO (receita de mercado, assinantes, vendas, custo de infra do mês,
--                                     série de 6 meses e a hora do último espelho). Substitui o snapshot digitado na Visão.
--   2. public.fn_scorecard_auto_gravar(semana) + job 'scorecard-auto' (todo dia 06:10 BRT): grava no placar da semana
--      corrente o que v_ops_scorecard_auto calcula. Só toca linha automática — nota que começa com 'auto ·';
--      valor digitado por gente NUNCA é sobrescrito.
--   3. public.v_ops_frescor         — idade de cada tela declarada (roadmap, placar, financeiro, inventário, academy,
--      redes), com validade e "vencida". Quem não tem fonte automática passa a dizer de quando é.
--   4. v_ops_reconfirmar + fn_ordem_maquina_reconfirmar ganham o tipo 'tela_parada' (a Hoje cobra a reconfirmação).
--   5. public.v_ops_contas_custo    — conta declarada × custo medido pelo Finance no mês, para o Inventário parar de
--      dizer R$ 0 onde o extrato diz R$ 1.903.
--
-- O QUE NÃO FAZ: não marca tarefa de roadmap como feita (progresso de fase é palavra do dono/Geral, nunca dedução da
--   máquina) e não inventa receita — se não há venda de mercado, o número honesto é zero, com a data da medição.

begin;

do $$
begin
  if to_regprocedure('public.fn_scorecard_auto_gravar(date)') is not null or to_regclass('public.v_ops_frescor') is not null then
    raise exception 'ja existe fn_scorecard_auto_gravar ou v_ops_frescor — a 151 ja foi aplicada?';
  end if;
  if exists (select 1 from cron.job where jobname = 'scorecard-auto') then
    raise exception 'job scorecard-auto ja existe.';
  end if;
end $$;

-- ── 1. dinheiro medido ────────────────────────────────────────────────────────
create view public.v_ops_dinheiro
with (security_invoker = on) as
with mes as (select (date_trunc('month', (now() at time zone 'America/Sao_Paulo')))::date as m)
select
  (select count(*) from billing.payments where status = 'approved' and paid_at is not null)                      as pagamentos_aprovados,
  (select count(*) from billing.subscribers s
    where s.status = 'active' and not s.parte_relacionada and not s.teste and s.deleted_at is null)              as assinantes_mercado,
  (select coalesce(sum(mrr_brl + one_time_brl), 0) from finance.revenue
    where deleted_at is null and not parte_relacionada)                                                          as receita_mercado_brl,
  (select count(*) from marketing.hotmart_sales
    where status = 'approved' and coalesce(utm_campaign, '') !~* '^teste\.')                                     as vendas_osi_aprovadas,
  (select coalesce(sum(cost_brl), 0) from finance.infra_costs where month = (select m from mes))                 as custo_infra_mes_brl,
  (select count(distinct service) from finance.infra_costs where month = (select m from mes))                    as servicos_com_custo,
  (select max(sincronizado_em) from finance.infra_costs)                                                         as espelho_finance_em,
  (select json_agg(json_build_object('mes', to_char(x.month, 'MM/YYYY'), 'custo', x.c) order by x.month)
     from (select month, sum(cost_brl) c from finance.infra_costs
            where month >= (select m from mes) - interval '5 months' group by month) x)                          as custo_por_mes;

revoke all on public.v_ops_dinheiro from public, anon;
grant select on public.v_ops_dinheiro to authenticated, service_role;
comment on view public.v_ops_dinheiro is
  '151: dinheiro medido (receita de mercado, assinantes, vendas, custo de infra do mês). Nada digitado à mão.';

-- ── 2. o placar da semana passa a ser gravado sozinho ─────────────────────────
create function public.fn_scorecard_auto_gravar(p_semana date default (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date)
returns integer
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
declare v_n integer := 0; r record;
begin
  for r in select a.slug, a.valor, a.fonte from public.v_ops_scorecard_auto a loop
    insert into ops.scorecard_entries (metric_id, week_start, value, note)
    select m.id, p_semana, r.valor, 'auto · ' || r.fonte
      from ops.scorecard_metrics m where m.slug = r.slug and m.active
    on conflict (metric_id, week_start) do update
       set value = excluded.value, note = excluded.note, updated_at = now()
     -- valor digitado por gente tem precedência: só a própria linha automática é atualizada
     where ops.scorecard_entries.note like 'auto ·%';
    v_n := v_n + 1;
  end loop;
  return v_n;
end;
$function$;
revoke all on function public.fn_scorecard_auto_gravar(date) from public, anon, authenticated;
grant execute on function public.fn_scorecard_auto_gravar(date) to service_role;

select cron.schedule('scorecard-auto', '10 9 * * *', 'select public.fn_scorecard_auto_gravar();');

-- ── 3. idade de cada tela declarada ───────────────────────────────────────────
create view public.v_ops_frescor
with (security_invoker = on) as
select * from (
  select 'roadmap'::text    as tela, 'Roadmap e fases'::text             as nome, 'ops.roadmap_phases + roadmap_tasks'::text as fonte,
         (select max(greatest(updated_at, created_at)) from ops.roadmap_phases) as ultimo, 21 as validade_dias,
         'Trilha e o gate da Hoje'::text as onde
  union all
  select 'scorecard', 'Placar da semana', 'ops.scorecard_entries',
         (select max(updated_at) from ops.scorecard_entries), 10, 'Semana'
  union all
  select 'financeiro_declarado', 'Snapshot financeiro digitado', 'company.financial_snapshots',
         (select max(updated_at) from company.financial_snapshots), 45, 'Financeiro (o medido vem de v_ops_dinheiro)'
  union all
  select 'inventario', 'Contas e serviços', 'ops.contas_servicos.ultima_verificacao',
         (select max(ultima_verificacao) from ops.contas_servicos where ativo), 14, 'Inventário'
  union all
  select 'academy', 'Academy (produtos e material)', 'academy.product_assets',
         (select max(greatest(updated_at, created_at)) from academy.product_assets), 60, 'Academy'
  union all
  select 'redes_sociais', 'Censo das redes', 'marketing.social_updates',
         (select max(created_at) from marketing.social_updates), 30, 'Engajamento'
) t
where ultimo is not null;

revoke all on public.v_ops_frescor from public, anon;
grant select on public.v_ops_frescor to authenticated, service_role;
comment on view public.v_ops_frescor is
  '151: idade de cada tela declarada. Dado velho com cara de novo é o jeito mais rápido de decidir errado.';

create or replace view public.v_ops_reconfirmar
with (security_invoker = on) as
  select 'ficha_vencida'::text as tipo, a.slug as ref, a.nome as titulo,
         'Ficha declarada em ' || to_char(a.declarado_em, 'DD/MM') || ', validade de ' || a.validade_dias || ' dias. Fonte: ' || a.ficha_fonte as porque
    from ops.apps a
   where a.ativo and (now() at time zone 'America/Sao_Paulo')::date > a.declarado_em + a.validade_dias
  union all
  select 'portao_sumiu_do_indice', p.numero, p.titulo,
         'Saiu de Cockpit/portoes-abertos.md sem entrada em Fechados. Visto pela última vez em '
         || to_char(p.visto_no_indice_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI') || '.'
    from ops.pendencias_humanas p
   where p.indice_estado = 'sumiu_do_indice' and p.deleted_at is null
  union all
  select 'decisao_vencida', d.fonte_arquivo, d.title,
         'Validade até ' || to_char(d.valida_ate, 'DD/MM') || '. Decisão do dono: reconfirmar ou revogar por arquivo.'
    from ops.decisions d
   where d.valida_ate is not null and d.revogada_em is null and d.deleted_at is null
     and (now() at time zone 'America/Sao_Paulo')::date > d.valida_ate
  union all
  select 'app_nao_declarado', x.app, x.app,
         'Cockpit/Apps/' || x.app || '/ficha.md existe mas não tem o bloco de frontmatter que o runner lê — '
         || 'o app não aparece no Portfólio nem tem estado medido.'
    from (select unnest(u.nao_declarados) as app from (select * from ops.estado_passada order by medido_em desc limit 1) u) x
  union all
  select 'ficha_recusada', split_part(x.motivo, ':', 1), split_part(x.motivo, ':', 1),
         'Ficha recusada pelo runner: ' || x.motivo || '. Valor fora do padrão — corrigir na ficha.'
    from (select unnest(u.recusadas) as motivo from (select * from ops.estado_passada order by medido_em desc limit 1) u) x
  union all
  select 'runner_parado', 'estado-runner', 'Runner do estado dos apps parado',
         'Última passada em ' || to_char(u.medido_em at time zone 'America/Sao_Paulo', 'DD/MM HH24:MI')
         || ' (deveria ser a cada 30 min). Enquanto isso, ficha e repo na tela são retrato velho.'
    from (select * from ops.estado_passada order by medido_em desc limit 1) u
   where u.medido_em < now() - interval '2 hours'
  -- 151: tela declarada que passou da validade
  union all
  select 'tela_parada', f.tela, f.nome,
         'Fonte ' || f.fonte || ' sem mexida desde ' || to_char(f.ultimo at time zone 'America/Sao_Paulo', 'DD/MM')
         || ' (validade de ' || f.validade_dias || ' dias). Aparece em: ' || f.onde || '.'
    from public.v_ops_frescor f
   where f.ultimo < now() - (f.validade_dias || ' days')::interval;

create or replace function public.fn_ordem_maquina_reconfirmar(p_dia date)
returns void
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
begin
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia, 'maquina', 6 + row_number() over (order by r.tipo),
         case r.tipo
           when 'ficha_vencida'          then 'Reconfirmar: ' || count(*) || ' ficha(s) de app vencida(s)'
           when 'portao_sumiu_do_indice' then 'Reconfirmar: ' || count(*) || ' portao(oes) sumiu(ram) do indice'
           when 'decisao_vencida'        then 'Reconfirmar: ' || count(*) || ' decisao(oes) vencida(s)'
           when 'app_nao_declarado'      then count(*) || ' app(s) sem ficha declarada — invisiveis no Portfolio'
           when 'ficha_recusada'         then count(*) || ' ficha(s) recusada(s) pelo runner'
           when 'tela_parada'            then count(*) || ' tela(s) mostrando dado parado'
           else                               'Runner do estado dos apps parado'
         end,
         case r.tipo
           when 'ficha_vencida'          then 'O agente de cada app reescreve a ficha (Cockpit/Apps/<app>/ficha.md) com data nova. '
           when 'portao_sumiu_do_indice' then 'Saiu de Cockpit/portoes-abertos.md sem entrada em Fechados: o Geral fecha com prova ou devolve ao indice. '
           when 'decisao_vencida'        then 'So o dono reconfirma ou revoga, por arquivo datado em Cockpit/decisoes/. '
           when 'app_nao_declarado'      then 'Ficha sem o bloco de frontmatter: o app existe no disco e nao existe na tela. '
           when 'ficha_recusada'         then 'Valor fora do padrao na ficha (maturidade, vendas_fonte, degrau ou validade). '
           when 'tela_parada'            then 'Fonte sem alimentacao: ou alguem reconfirma, ou a tela segue mostrando o passado. '
           else                               'Maquina desligada, tarefa quebrada ou segredo trocado: '
         end || 'Quais: ' || string_agg(r.titulo, '; ' order by r.titulo) filter (where r.rn <= 5)
           || case when count(*) > 5 then ' (+' || (count(*) - 5) || ')' else '' end || '.',
         'humano', 'reconfirmar', 'public.v_ops_reconfirmar', clock_timestamp()
    from (select v.*, row_number() over (partition by v.tipo order by v.titulo) as rn from public.v_ops_reconfirmar v) r
   group by r.tipo
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';
end;
$function$;

-- ── 5. inventário: o que a conta declara × o que o extrato mediu ──────────────
create view public.v_ops_contas_custo
with (security_invoker = on) as
with mes as (select (date_trunc('month', (now() at time zone 'America/Sao_Paulo')))::date m),
medido as (
  select lower(btrim(service)) servico, sum(cost_brl) custo_medido_brl, max(extrato_ate) extrato_ate, max(sincronizado_em) sincronizado_em
    from finance.infra_costs where month = (select m from mes) group by 1
)
select c.id, c.servico, c.identificador, c.conta_dona, c.status, c.custo_mensal as custo_declarado_brl,
       m.custo_medido_brl, m.extrato_ate, m.sincronizado_em,
       (m.custo_medido_brl is not null and coalesce(c.custo_mensal, 0) = 0) as declarado_zerado_com_gasto_real,
       c.ultima_verificacao
  from ops.contas_servicos c
  left join medido m on m.servico = lower(btrim(c.servico))
 where c.ativo;

revoke all on public.v_ops_contas_custo from public, anon;
grant select on public.v_ops_contas_custo to authenticated, service_role;
comment on view public.v_ops_contas_custo is
  '151: conta declarada no inventário × custo medido pelo Finance no mês (finance.infra_costs).';

-- ── provas ────────────────────────────────────────────────────────────────────
do $$
declare v jsonb; v_n int; v_semana date := (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date;
begin
  if has_table_privilege('anon', 'public.v_ops_dinheiro', 'select')
  or has_table_privilege('anon', 'public.v_ops_frescor', 'select')
  or has_function_privilege('authenticated', 'public.fn_scorecard_auto_gravar(date)', 'execute') then
    raise exception 'anon/authenticated com acesso indevido.';
  end if;

  -- dinheiro: bate com a fonte, sem número inventado
  if (select receita_mercado_brl from public.v_ops_dinheiro) <> (select coalesce(sum(mrr_brl + one_time_brl), 0) from finance.revenue where deleted_at is null and not parte_relacionada)
  or (select custo_infra_mes_brl from public.v_ops_dinheiro) <> (select coalesce(sum(cost_brl), 0) from finance.infra_costs where month = (date_trunc('month', (now() at time zone 'America/Sao_Paulo')))::date) then
    raise exception 'PROVA_151_FALHOU: v_ops_dinheiro nao bate com a fonte';
  end if;

  -- frescor: roadmap e placar precisam aparecer como vencidos hoje (14/08 e 01/08)
  if not exists (select 1 from public.v_ops_reconfirmar where tipo = 'tela_parada' and ref = 'roadmap')
  or not exists (select 1 from public.v_ops_reconfirmar where tipo = 'tela_parada' and ref = 'scorecard') then
    raise exception 'PROVA_151_FALHOU: roadmap/placar parados nao apareceram na reconfirmar';
  end if;

  begin
    -- placar automático: grava a semana corrente e NÃO sobrescreve linha digitada por gente
    perform public.fn_scorecard_auto_gravar(v_semana);
    if (select count(*) from ops.scorecard_entries where week_start = v_semana and note like 'auto ·%') = 0 then
      raise exception 'PROVA_151_FALHOU: nada gravado no placar da semana';
    end if;
    update ops.scorecard_entries set value = 999, note = 'digitado pelo dono' where week_start = v_semana and note like 'auto ·%'
     and metric_id = (select id from ops.scorecard_metrics where slug = 'posts_no_ar');
    perform public.fn_scorecard_auto_gravar(v_semana);
    if (select value from ops.scorecard_entries where week_start = v_semana
         and metric_id = (select id from ops.scorecard_metrics where slug = 'posts_no_ar')) <> 999 then
      raise exception 'PROVA_151_FALHOU: valor digitado por gente foi sobrescrito pelo automatico';
    end if;
    raise exception 'PROVA_151_OK';
  exception when others then
    if sqlerrm <> 'PROVA_151_OK' then raise; end if;
  end;
end $$;

commit;
