-- 154 — o retrato do roadmap e do placar de 23/09 entra no banco (Geral declara, app grava)
--
-- ✔ APLICADA em 23/09/2026 às 21:54:39 BRT, reensaiada antes. Medido depois: fase 2 com 14 tarefas e 5 concluídas
--   (as 6 originais seguem NÃO feitas, com a nota do estado real); placar da semana 6/6 (4 automáticas + demos 0 e
--   follow-ups 0 com a palavra do dono); "roadmap" saiu das telas paradas — sobram academy, financeiro_declarado e
--   redes_sociais, que são de outros donos. Visto na tela: Trilha 5/14 e Semana "scorecard 6/6 preenchido".
--
-- (Escrita como NÃO APLICADA.) Palavra do dono neste canal em 23/09 (programa das 4 frentes) + retrato do Orquestrador Geral em
--   Cockpit/roadmap-retrato-2026-09-23.md; as duas métricas manuais têm a palavra do dono nesta sessão ("zero nas duas").
--
-- POR QUE: ops.roadmap_* e ops.scorecard_* estavam parados em 14/08 e 01/08 — a Trilha mostrava a fase 2 como se
--   nada tivesse acontecido desde agosto. Roadmap e placar são do Geral; ele mandou o retrato, o app só grava.
--
-- REGRA QUE ESTA MIGRATION RESPEITA: nada de progresso inventado. As 6 tarefas da fase 2 continuam NÃO concluídas —
--   ganham só a nota do estado real. O que foi feito em setembro entra como tarefa nova JÁ concluída, com a data da
--   prova. Tarefa de fase 0/1 superada não é apagada: ganha nota e sai do caminho.
--
-- MEDIDO ANTES (23/09 22h BRT): fase 2 aberta desde 18/06, 8 tarefas, 0 concluídas, tudo com updated_at de 14/08;
--   v_ops_frescor dizia "roadmap parado há 40 dias"; placar da semana só com as 4 automáticas (já religadas pela 151).

begin;

do $$
begin
  if exists (select 1 from ops.roadmap_tasks where notes like '%retrato 23/09/2026%') then
    raise exception 'retrato de 23/09 ja gravado — a 154 ja foi aplicada?';
  end if;
  if (select count(*) from ops.roadmap_tasks where phase_number = 2 and deleted_at is null and completed_at is not null) <> 0 then
    raise exception 'fase 2 ja tem tarefa concluida — conferir antes de gravar o retrato.';
  end if;
end $$;

-- ── fase 2: estado real de cada tarefa, sem marcar nenhuma como feita ─────────
update ops.roadmap_tasks set notes = 'Estado em 23/09/2026 (retrato 23/09/2026, Geral): NÃO FEITA — nenhuma reunião com ótica de fora registrada.', updated_at = now()
 where id = '74ff2281-f172-45a5-b293-c030c6c18f5d';
update ops.roadmap_tasks set notes = 'Estado em 23/09/2026 (retrato 23/09/2026, Geral): NÃO FEITA — pitch v2 espera o Clinics; palco da demo = tenant Grupo Mello (dono, 16/09).', updated_at = now()
 where id = 'b08d6636-afb5-4e93-8156-8d2ded13d437';
update ops.roadmap_tasks set notes = 'Estado em 23/09/2026 (retrato 23/09/2026, Geral): PARCIAL — esteira rodou e foi desligada em 21/09 (Meta bloqueou); 532 óticas nos contatos; handoff automático no ar, pausado (Z-API desconectada).', updated_at = now()
 where id = 'a7bb691c-c939-49f5-b255-5047c0de5105';
update ops.roadmap_tasks set notes = 'Estado em 23/09/2026 (retrato 23/09/2026, Geral): NÃO — 0 piloto; termo de piloto 15/17 (falta payback do dono + assinatura).', updated_at = now()
 where id = 'aa11640e-3bff-441d-b6c3-c659ea4fff7f';
update ops.roadmap_tasks set notes = 'Estado em 23/09/2026 (retrato 23/09/2026, Geral): não se aplica ainda — depende da 1ª ótica piloto.', updated_at = now()
 where id in ('9b6b6403-38cf-404f-885e-9bfa130f066f', 'a45b1d59-ee5f-4d41-97ac-9293bfce1e3a');

update ops.roadmap_phases
   set notes = 'Retrato 23/09/2026 (Geral): fase segue ABERTA desde 18/06. Métrica única: 1 ótica pagando o Clearix. Medido: 0 cliente pagante (v_vendas_clearix). Gate não batido. Próximo retrato: 30/09.',
       updated_at = now()
 where phase_number = 2;

-- ── fases 0 e 1: tarefa superada fica no histórico, com a nota ────────────────
update ops.roadmap_tasks
   set notes = coalesce(notes || ' | ', '') || 'Superada em 18/06/2026 (decisão #osi); não executar. Registrado no retrato 23/09/2026.',
       updated_at = now()
 where phase_number in (0, 1) and completed_at is null and deleted_at is null;

-- ── o que setembro entregou: tarefa nova, já concluída, com a prova ───────────
-- completed_by é uuid de usuário; quem declarou está na nota, não no campo de pessoa
insert into ops.roadmap_tasks (phase_number, track, title, description, category, target_date, completed_at, completed_by, priority, notes, display_order)
values
 (2, 'C', 'Landing clearix.app.br com a home premium no ar', 'Os 8 passos da home nova publicados e o funil provado ponta a ponta (visita → demo solicitada).', 'entregavel', '2026-09-23', '2026-09-23 12:00-03', null, 2,
  'Retrato 23/09/2026 (Geral). Prova: eventos clearix_* na v_analytics_funnel_summary, form de demo disparando em 23/09 16:22.', 100),
 (2, 'A', 'Folha única de venda com números reais e datados', 'Rótulo do Clearix com número medido: carnê R$ 394.734 em 1.528 contratos (21/09).', 'milestone', '2026-09-21', '2026-09-21 12:00-03', null, 2,
  'Retrato 23/09/2026 (Geral). Prova: folha única do Clearix, medição de 21/09.', 101),
 (2, 'C', 'Hospedagem do ecossistema virada para a Cloudflare', 'Migração dos painéis (ADR-0059) concluída em 23/09.', 'entregavel', '2026-09-23', '2026-09-23 12:00-03', null, 3,
  'Retrato 23/09/2026 (Geral).', 102),
 (2, 'C', 'Portão do portal do paciente fechado (portão 138)', 'Token de paciente deixa de ler a operação do tenant; dono testou o link real.', 'milestone', '2026-09-21', '2026-09-21 12:00-03', null, 1,
  'Retrato 23/09/2026 (Geral). Prova: dono testou o link real — "nada vazando".', 103),
 (2, 'A', '1ª publicação no YouTube pelo MKT (portão 120)', 'Canal @oticasemimproviso publicando pelo motor do MKT.', 'milestone', '2026-09-22', '2026-09-22 12:00-03', null, 3,
  'Retrato 23/09/2026 (Geral).', 104),
 (2, 'B', 'Termo de piloto v1 escrito (15 de 17 itens)', 'Falta o payback do dono e a assinatura.', 'entregavel', '2026-09-23', null, null, 2,
  'Retrato 23/09/2026 (Geral): 15/17 — NÃO concluído; falta payback do dono + assinatura.', 105);

-- ── placar da semana: as 2 manuais, com a palavra do dono ─────────────────────
insert into ops.scorecard_entries (metric_id, week_start, value, note)
select m.id, (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date, 0,
       'manual · palavra do dono em 23/09/2026 (retrato 23/09, Geral)'
  from ops.scorecard_metrics m where m.slug in ('demos_agendadas', 'followups_feitos') and m.active
on conflict (metric_id, week_start) do update set value = excluded.value, note = excluded.note, updated_at = now();

do $$
declare v_f2_feitas int; v_novas int; v_manuais int; v_parado boolean;
begin
  select count(*) into v_f2_feitas from ops.roadmap_tasks
   where phase_number = 2 and deleted_at is null and completed_at is not null and display_order < 100;
  if v_f2_feitas <> 0 then
    raise exception 'PROVA_154_FALHOU: alguma tarefa original da fase 2 foi marcada como feita';
  end if;
  select count(*) into v_novas from ops.roadmap_tasks where notes like 'Retrato 23/09/2026%' and completed_at is not null;
  if v_novas <> 5 then raise exception 'PROVA_154_FALHOU: esperava 5 entregas de setembro, veio %', v_novas; end if;
  select count(*) into v_manuais from ops.scorecard_entries e join ops.scorecard_metrics m on m.id = e.metric_id
   where m.slug in ('demos_agendadas','followups_feitos') and e.week_start = (date_trunc('week', (now() at time zone 'America/Sao_Paulo')))::date;
  if v_manuais <> 2 then raise exception 'PROVA_154_FALHOU: placar manual da semana incompleto'; end if;
  select exists (select 1 from public.v_ops_reconfirmar where tipo = 'tela_parada' and ref = 'roadmap') into v_parado;
  if v_parado then raise exception 'PROVA_154_FALHOU: roadmap continua marcado como parado depois do retrato'; end if;
end $$;

commit;
