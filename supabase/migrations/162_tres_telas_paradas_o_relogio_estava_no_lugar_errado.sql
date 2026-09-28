-- 162 — as três telas paradas desde junho: o relógio estava apontado para a fonte errada
--
-- ✔ APLICADA em 28/09/2026 às 18:06:17 BRT, reensaiada antes. Medido depois: a lista de reconfirmar da tela Hoje
--   caiu de 4 alarmes permanentes para UM item real (ficha do Polá Petit vencida). Os 5 relógios restantes estão
--   todos dentro do prazo. Nenhuma linha apagada nas três tabelas antigas.
--
-- (Escrita como NÃO APLICADA.)
--
-- O dono mandou resolver as três fontes que a tela Hoje pede para reconfirmar desde junho. Ao medir cada uma,
-- nenhuma era "alguém esqueceu de digitar". Eram três relógios apontados para lugares que pararam de ser
-- verdade — e alarme que toca sempre e não tem conserto ensina a ignorar alarme.
--
-- 1) FINANCEIRO DIGITADO (company.financial_snapshots, parado em 08/06, 4 meses atrás)
--    Medido: o snapshot é um FORMULÁRIO em Cadastro Empresa › Snapshots, não a tela Financeiro — o texto do
--    alarme mandava olhar no lugar errado. E o que ele pede à mão já é medido: custo por categoria, receita e
--    aportes vêm de v_finance_* (espelho diário do Finance, cron sync-aporte-diario). Só `saldo_conta_pj_brl`
--    não tem medição — e está NULO em todos os meses, ou seja, nunca foi usado.
--    Decisão: o relógio sai do formulário e vai para o ESPELHO do dinheiro (finance.infra_costs.sincronizado_em,
--    validade 3 dias). "O espelho do Finance parou" é alarme com conserto; "ninguém digitou o mês" não era.
--    O histórico digitado (mar–jun/2026, com investimento acumulado de R$ 328.309) fica intacto.
--
-- 2) ACADEMY (academy.product_assets, parado em 18/06, validade 60 dias)
--    Medido: 2 materiais, ambos `ready` — uma capa e um PDF. Material publicado não apodrece: um PDF de junho
--    continua valendo em setembro. Pôr relógio de validade em acervo é inventar urgência.
--    Decisão: sai do frescor. Se a pergunta um dia for "temos pouco material", isso é contagem, não validade.
--
-- 3) CENSO DAS REDES (marketing.social_updates, parado em 23/06)
--    Medido: a tabela parou 19 dias antes do handoff de 12/07/2026, quando a produção de conteúdo migrou
--    inteira para o digiai_mkt. Não é fonte que quebrou: é fonte que perdeu o emprego. A verdade viva das
--    contas hoje é public.v_mkt_grade_redes (marca × plataforma × pode publicar × travado) e quem alimenta a
--    rede é mkt.publications — 340 publicações, a última em 23/09, 5 nos últimos 7 dias.
--    Decisão: o relógio passa a olhar mkt.publications (validade 7 dias, para a cadência de 6/semana).
--    "A rede parou de ser alimentada" é o alarme que interessa a quem olha essa tela.
--
-- O QUE NÃO APAGO: nenhuma linha das três tabelas. Dado digitado com esforço vira histórico, não lixo.

begin;

do $$
begin
  if (select pg_get_viewdef('public.v_ops_frescor'::regclass, true)) like '%mkt.publications%' then
    raise exception 'v_ops_frescor ja aponta para mkt.publications — a 162 ja foi aplicada?';
  end if;
end $$;

create or replace view public.v_ops_frescor as
select * from (
  select 'roadmap'::text as tela, 'Roadmap e fases'::text as nome,
         'ops.roadmap_phases + roadmap_tasks'::text as fonte,
         (select max(greatest(updated_at, created_at)) from ops.roadmap_phases) as ultimo,
         21 as validade_dias, 'Trilha e o gate da Hoje'::text as onde
  union all
  select 'scorecard', 'Placar da semana', 'ops.scorecard_entries',
         (select max(updated_at) from ops.scorecard_entries), 10, 'Semana'
  union all
  select 'inventario', 'Contas e serviços', 'ops.contas_servicos.ultima_verificacao',
         (select max(ultima_verificacao) from ops.contas_servicos where ativo), 14, 'Inventário'
  union all
  -- 162: era o formulário digitado; virou o espelho medido. Se o espelho do Finance parar, o custo da
  -- tela envelhece calado — e custo velho é o número que mais engana em empresa pré-receita.
  select 'financeiro_espelho', 'Espelho do dinheiro (Finance)', 'finance.infra_costs.sincronizado_em',
         (select max(sincronizado_em) from finance.infra_costs), 3,
         'Visão e Financeiro (custo medido)'
  union all
  -- 162: era o censo digitado, morto desde o handoff ao MKT em 12/07. A pergunta viva é se a rede está
  -- sendo alimentada.
  select 'redes_publicacao', 'Publicação nas redes', 'mkt.publications.published_at',
         (select max(published_at) from mkt.publications), 7,
         'Engajamento (a grade das contas vem viva de v_mkt_grade_redes)'
) x;

comment on view public.v_ops_frescor is
  '151/162: fontes que envelhecem e o prazo de cada uma. Só entra aqui o que ALGUÉM CONSERTA quando o alarme toca — '
  'acervo (Academy) e formulário substituído por medição (snapshot financeiro) saíram na 162.';

do $$
declare v_n int; v_fin timestamptz; v_red timestamptz;
begin
  select count(*) into v_n from public.v_ops_frescor;
  if v_n <> 5 then raise exception 'PROVA_162_FALHOU: % fontes no frescor, esperava 5', v_n; end if;

  if exists (select 1 from public.v_ops_frescor where tela in ('academy', 'financeiro_declarado', 'redes_sociais')) then
    raise exception 'PROVA_162_FALHOU: sobrou relogio antigo';
  end if;

  select ultimo into v_fin from public.v_ops_frescor where tela = 'financeiro_espelho';
  select ultimo into v_red from public.v_ops_frescor where tela = 'redes_publicacao';
  if v_fin is null or v_red is null then
    raise exception 'PROVA_162_FALHOU: relogio novo sem leitura (financeiro=%, redes=%)', v_fin, v_red;
  end if;

  -- o sentido da troca: os dois relógios novos têm de estar VIVOS hoje, senão só troquei um alarme velho por outro
  if v_fin < now() - interval '3 days' then
    raise exception 'PROVA_162_FALHOU: o espelho do Finance ja nasce vencido (ultimo %)', v_fin;
  end if;

  -- e nenhuma linha das tabelas antigas pode ter sumido
  if (select count(*) from company.financial_snapshots) = 0
  or (select count(*) from academy.product_assets where deleted_at is null) = 0
  or (select count(*) from marketing.social_updates) = 0 then
    raise exception 'PROVA_162_FALHOU: apaguei dado que era para virar historico';
  end if;
end $$;

commit;
