-- 153 — v_ops_frescor e v_ops_contas_custo passam a ler como as demais views de ops
--
-- ✔ APLICADA em 23/09/2026 às 21:48:10 BRT, reensaiada antes. Medido depois, na tela com o login do dono:
--   Trilha mostra "Esta tela mostra dado de há 40 dias"; Inventário mostra "custo medido no mês R$ 614,49 · 3 serviços";
--   aba limpa em 7 rotas: 0 requisição >=400 e 0 erro de console.
--
-- (Escrita como NÃO APLICADA.)
--
-- POR QUE: a 151/152 criou as duas views com security_invoker = on, e elas leem ops.contas_servicos e
--   ops.scorecard_entries. Medido em 23/09: as duas tabelas têm RLS LIGADA e NENHUMA policy — ninguém lê direto;
--   o app sempre as leu por view de dono (v_ops_contas_servicos, v_ops_scorecard, ambas sem security_invoker).
--   Com invoker, a leitura do usuário logado dava permissão negada e a tela ficava muda: o aviso de idade não
--   aparecia na Trilha e o custo medido não aparecia no Inventário — sem erro visível, que é o pior jeito de falhar.
--
-- O QUE FAZ: recria as duas views no mesmo padrão das irmãs (dono postgres, sem invoker), com o MESMO conteúdo.
--   Continua sem PII: frescor devolve data e nome de fonte; custo devolve a conta e o valor do extrato.
--   `anon` segue sem acesso; quem lê é `authenticated` (staff do painel) e `service_role`.
--
-- Fica anotado o débito: o certo é ops.contas_servicos e ops.scorecard_entries ganharem policy `is_staff()`
--   como ops.apps tem, e então todas as views voltarem a invoker. Isso mexe em portão de leitura de duas tabelas
--   e pede medição própria (R-037) — não entra de carona nesta migration.

begin;

do $$
begin
  if to_regclass('public.v_ops_frescor') is null or to_regclass('public.v_ops_contas_custo') is null then
    raise exception 'aplicar 151 e 152 antes.';
  end if;
end $$;

drop view public.v_ops_frescor cascade;   -- v_ops_reconfirmar depende dela; recriada abaixo, igual

create view public.v_ops_frescor as
select * from (
  select 'roadmap'::text as tela, 'Roadmap e fases'::text as nome, 'ops.roadmap_phases + roadmap_tasks'::text as fonte,
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
  '151/153: idade de cada tela declarada. View de dono (as fontes têm RLS sem policy) — só data e nome de fonte, sem PII.';

create or replace view public.v_ops_contas_custo as
with mes as (select (date_trunc('month', (now() at time zone 'America/Sao_Paulo')))::date m),
medido as (
  select regexp_replace(lower(btrim(service)), '[^a-z0-9]', '', 'g') chave,
         sum(cost_brl) custo_medido_brl, max(extrato_ate) extrato_ate, max(sincronizado_em) sincronizado_em
    from finance.infra_costs where month = (select m from mes) group by 1
)
select c.id, c.servico, c.identificador, c.conta_dona, c.status, c.custo_mensal as custo_declarado_brl,
       m.custo_medido_brl, m.extrato_ate, m.sincronizado_em,
       (m.custo_medido_brl is not null and coalesce(c.custo_mensal, 0) = 0) as declarado_zerado_com_gasto_real,
       c.ultima_verificacao
  from ops.contas_servicos c
  left join lateral (
    select * from medido m
     where m.chave = regexp_replace(lower(btrim(c.servico)), '[^a-z0-9]', '', 'g')
        or m.chave like '%' || regexp_replace(lower(btrim(c.servico)), '[^a-z0-9]', '', 'g') || '%'
        or regexp_replace(lower(btrim(c.servico)), '[^a-z0-9]', '', 'g') like '%' || m.chave || '%'
     order by length(m.chave) desc limit 1
  ) m on true
 where c.ativo;

revoke all on public.v_ops_contas_custo from public, anon;
grant select on public.v_ops_contas_custo to authenticated, service_role;
comment on view public.v_ops_contas_custo is
  '151/152/153: conta do inventário × custo medido pelo Finance no mês. View de dono, como v_ops_contas_servicos.';

-- v_ops_reconfirmar voltou a cair junto com o cascade: recriada igual à 151
create view public.v_ops_reconfirmar
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
  union all
  select 'tela_parada', f.tela, f.nome,
         'Fonte ' || f.fonte || ' sem mexida desde ' || to_char(f.ultimo at time zone 'America/Sao_Paulo', 'DD/MM')
         || ' (validade de ' || f.validade_dias || ' dias). Aparece em: ' || f.onde || '.'
    from public.v_ops_frescor f
   where f.ultimo < now() - (f.validade_dias || ' days')::interval;

revoke all on public.v_ops_reconfirmar from public, anon;
grant select on public.v_ops_reconfirmar to authenticated, service_role;

do $$
begin
  if has_table_privilege('anon', 'public.v_ops_frescor', 'select')
  or has_table_privilege('anon', 'public.v_ops_contas_custo', 'select')
  or has_table_privilege('anon', 'public.v_ops_reconfirmar', 'select') then
    raise exception 'anon com acesso indevido.';
  end if;
  if (select count(*) from public.v_ops_frescor) < 5 then
    raise exception 'PROVA_153_FALHOU: frescor com menos de 5 telas';
  end if;
  if (select count(*) from public.v_ops_contas_custo where custo_medido_brl is not null) = 0 then
    raise exception 'PROVA_153_FALHOU: nenhuma conta com custo medido';
  end if;
  if not exists (select 1 from public.v_ops_reconfirmar where tipo = 'tela_parada' and ref = 'roadmap') then
    raise exception 'PROVA_153_FALHOU: roadmap parado sumiu da reconfirmar';
  end if;
end $$;

commit;
