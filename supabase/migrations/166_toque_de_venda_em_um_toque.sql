-- 166 — registro de venda em 1 toque, e o placar da semana deixando de ser digitado
--
-- ✔ APLICADA em 30/09/2026 às 19:04:13 BRT, reensaiada antes. Rodei fn_scorecard_auto_gravar() logo depois:
--   7 métricas gravadas, TODAS com nota 'auto ·'. O placar da semana deixou de ter campo digitado.
--   Primeiro retrato: contatos_prospeccao 110 (robô) × ligacoes_dono 0 — que é a comparação que o plano quer.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: plano de vendas de 30 dias (Cockpit/comercial/plano-de-vendas-30-dias-2026-10.md, dono 30/09),
--   parte do app: "registro de venda em 1 toque (ligação / demo / piloto, com a ótica e uma nota); placar
--   semanal automático; kanban com etapa morno separada do robô". Prazo 04/10.
--
-- POR QUE 1 TOQUE IMPORTA AQUI: o gargalo declarado é o TEMPO DO DONO, não token. Um registro que peça
--   formulário, categoria e data some da rotina na terceira ligação — e aí o placar volta a ser digitado de
--   memória na sexta-feira, que é como `demos_agendadas` e `followups_feitos` chegaram vazios até hoje.
--   Três botões, a ótica e uma nota curta. Nada mais.
--
-- POR QUE MÉTRICA NOVA PARA AS LIGAÇÕES, em vez de reusar `contatos_prospeccao`: aquela já é automática e vem
--   de `mkt.osi_disparos` — ela mede o ROBÔ. A tese do plano é exatamente que o robô não substitui o dono
--   (5 pessoas em 144 abordagens). Somar os dois numa métrica só apagaria a única comparação que interessa.
--
-- `followups_feitos` SAI (active = false): follow-up não está no vocabulário de 1 toque, e métrica que ninguém
--   preenche há meses é ruído no placar. Reversível com um update; a linha histórica fica.
--
-- ESCRITA SÓ POR RPC: a tabela não recebe grant de insert. Quem escreve é fn_registrar_toque, que é definer e
--   confere `is_staff()` explicitamente (R-043) — portão que abre no erro não é portão.

begin;

do $$
begin
  if to_regclass('ops.toque_venda') is not null then
    raise exception 'ops.toque_venda ja existe — a 166 ja foi aplicada?';
  end if;
end $$;

create table ops.toque_venda (
  id         bigserial primary key,
  tipo       text not null check (tipo in ('ligacao', 'demo', 'piloto')),
  otica      text not null check (length(trim(otica)) > 0),
  lead_id    uuid,                        -- quando veio do funil; nulo quando o dono digitou o nome
  nota       text,
  quando     timestamptz not null default now(),
  quem       uuid default auth.uid(),
  created_at timestamptz not null default now()
);
create index toque_venda_quando on ops.toque_venda (quando desc);
create index toque_venda_lead on ops.toque_venda (lead_id) where lead_id is not null;
comment on table ops.toque_venda is
  '166: um toque de venda do dono — ligação, demo ou piloto. Fonte do placar semanal e da etapa "morno" do kanban.';

alter table ops.toque_venda enable row level security;
create policy toque_venda_staff_select on ops.toque_venda for select using (is_staff());
revoke all on ops.toque_venda from anon, authenticated;
grant select on ops.toque_venda to authenticated;   -- insert NÃO: só pela RPC
grant usage on sequence ops.toque_venda_id_seq to service_role;

create function public.fn_registrar_toque(
  p_tipo text, p_otica text, p_lead_id uuid default null, p_nota text default null)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare v_id bigint;
begin
  -- Portão explícito: definer não herda RLS, então quem pode escrever se decide aqui e em lugar nenhum mais.
  if not public.is_staff() then
    raise exception 'apenas staff registra toque de venda' using errcode = 'insufficient_privilege';
  end if;
  if p_tipo not in ('ligacao', 'demo', 'piloto') then
    raise exception 'tipo invalido: % (use ligacao, demo ou piloto)', p_tipo;
  end if;
  if coalesce(trim(p_otica), '') = '' then
    raise exception 'sem a otica o registro nao serve para nada';
  end if;

  insert into ops.toque_venda (tipo, otica, lead_id, nota, quem)
  values (p_tipo, trim(p_otica), p_lead_id, nullif(trim(coalesce(p_nota, '')), ''), auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;
revoke all on function public.fn_registrar_toque(text, text, uuid, text) from public, anon;
grant execute on function public.fn_registrar_toque(text, text, uuid, text) to authenticated, service_role;

create view public.v_ops_toques_semana
with (security_invoker = true) as
select date_trunc('week', (quando at time zone 'America/Sao_Paulo'))::date as semana,
       count(*) filter (where tipo = 'ligacao')::int as ligacoes,
       count(*) filter (where tipo = 'demo')::int    as demos,
       count(*) filter (where tipo = 'piloto')::int  as pilotos,
       count(distinct otica)::int                    as oticas,
       max(quando)                                   as ultimo_toque
  from ops.toque_venda
 group by 1;
revoke all on public.v_ops_toques_semana from public, anon;
grant select on public.v_ops_toques_semana to authenticated, service_role;
comment on view public.v_ops_toques_semana is
  '166: placar da semana medido — ligações, demos e pilotos que o DONO registrou. Semana em BRT.';

-- métricas novas do placar; `contatos_prospeccao` fica como está (mede o robô) para dar a comparação
insert into ops.scorecard_metrics (slug, label, owner, target, direction, unit, hint, sort_order, active)
values
  ('ligacoes_dono', 'Ligações do dono (óticas)', 'Gilberto', 10, '>=', 'un',
   'Registradas em 1 toque no app — não confundir com os disparos do robô', 15, true),
  ('pilotos_pagos', 'Pilotos pagos na semana', 'Gilberto', 1, '>=', 'un',
   'Piloto Clearix R$ 349/mês registrado em 1 toque', 25, true);

update ops.scorecard_metrics set active = false
 where slug = 'followups_feitos';

create or replace view public.v_ops_scorecard_auto as
with semana as (
  select date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date as inicio
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
      + (select count(*) from billing.mp_events_raw m, semana s where m.received_at >= s.inicio and m.signature_ok))::numeric,
       'hotmart_sales + mp_events_raw (semana)'
union all
select 'leads_respondidos_24h',
       coalesce((select round(100.0 * count(*) filter (where l.status <> 'novo')::numeric / nullif(count(*), 0)::numeric, 0)
                   from marketing.landing_leads l, semana s
                  where l.created_at >= s.inicio and l.anonymized_at is null), 100::numeric),
       'landing_leads (100% quando não houve lead na semana)'
-- 166: as três que deixam de ser digitadas
union all
select 'ligacoes_dono',
       (select count(*) from ops.toque_venda t, semana s
         where t.tipo = 'ligacao' and (t.quando at time zone 'America/Sao_Paulo')::date >= s.inicio)::numeric,
       'ops.toque_venda (ligações da semana)'
union all
select 'demos_agendadas',
       (select count(*) from ops.toque_venda t, semana s
         where t.tipo = 'demo' and (t.quando at time zone 'America/Sao_Paulo')::date >= s.inicio)::numeric,
       'ops.toque_venda (demos da semana)'
union all
select 'pilotos_pagos',
       (select count(*) from ops.toque_venda t, semana s
         where t.tipo = 'piloto' and (t.quando at time zone 'America/Sao_Paulo')::date >= s.inicio)::numeric,
       'ops.toque_venda (pilotos da semana)';

do $$
declare v_id bigint; v_n int;
begin
  -- CONTROLE POSITIVO (R-043 §4-A, aprendido na 164): não basta anon não ler; authenticated tem de LER.
  if not has_table_privilege('authenticated', 'ops.toque_venda', 'select')
  or not has_table_privilege('authenticated', 'public.v_ops_toques_semana', 'select')
  or not has_function_privilege('authenticated', 'public.fn_registrar_toque(text,text,uuid,text)', 'execute') then
    raise exception 'PROVA_166_FALHOU: authenticated nao consegue usar o que a tela precisa';
  end if;
  if has_table_privilege('anon', 'ops.toque_venda', 'select')
  or has_function_privilege('anon', 'public.fn_registrar_toque(text,text,uuid,text)', 'execute')
  or has_table_privilege('authenticated', 'ops.toque_venda', 'insert') then
    raise exception 'PROVA_166_FALHOU: anon lê ou authenticated escreve direto na tabela';
  end if;

  -- o portão tem de FECHAR sem staff (aqui não há JWT, então is_staff() é falso)
  begin
    perform public.fn_registrar_toque('ligacao', 'Prova 166');
    raise exception 'PROVA_166_FALHOU: a RPC aceitou chamada sem staff';
  exception when insufficient_privilege then null;
  end;

  -- e a view tem de somar certo: insiro direto (como dono da migration) e confiro
  insert into ops.toque_venda (tipo, otica, nota) values ('demo', 'Prova 166', 'linha de prova')
    returning id into v_id;
  select demos into v_n from public.v_ops_toques_semana
   where semana = date_trunc('week', (now() at time zone 'America/Sao_Paulo'))::date;
  if coalesce(v_n, 0) < 1 then raise exception 'PROVA_166_FALHOU: a view nao contou a demo'; end if;
  delete from ops.toque_venda where id = v_id;
  if (select count(*) from ops.toque_venda) <> 0 then
    raise exception 'PROVA_166_FALHOU: sobrou linha de prova';
  end if;

  -- o placar automático tem de conhecer as três métricas novas
  if (select count(*) from public.v_ops_scorecard_auto
       where slug in ('ligacoes_dono', 'demos_agendadas', 'pilotos_pagos')) <> 3 then
    raise exception 'PROVA_166_FALHOU: o placar automatico nao pegou as metricas novas';
  end if;
end $$;

commit;
