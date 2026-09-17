-- 141 — ordem do dia com id estável: regerar atualiza no lugar, não apaga e reinsere
--
-- ✔ APLICADA em 17/09/2026 às 00:21:53 BRT, com a palavra do dono neste canal ("temos que aplicar todas as migrations em nosso banco todo"),
--   reensaiada contra o banco do dia antes. Medido depois: cron ordem-do-dia-gerar = "select public.fn_gerar_ordem_do_dia();".
--
-- (Escrita como NÃO APLICADA.)
-- ⛔ NÃO APLICADA. Pede a palavra do dono neste canal.
--
-- DE ONDE VEM: contrato da edge roadmap-gj medido em 16/09 para o GJ (portão 54), e o Orquestrador Geral classificou
--   os achados como defeitos do app: o GJ não consegue deduplicar item cujo id muda, e o estado automático dos apps
--   (contrato de 16/09) também depende de id estável.
--
-- DEFEITOS MEDIDOS NO BANCO (definições de 16/09):
--   1. fn_gerar_ordem_do_dia começa com DELETE dos itens abertos do dia e reinsere → todo item aberto ganha uuid novo a
--      cada geração (cron diário e botão "Regerar ordem").
--   2. O botão "Regerar ordem" chama só fn_gerar_ordem_do_dia; os itens da sentinela e da máquina (fn_ordem_maquina_mkt,
--      _fatos, _gate, fn_ordem_sentinela) são inseridos por comandos separados do cron. Resultado: regerar APAGA esses
--      itens do dia e não os recria.
--   3. p_dia tem default CURRENT_DATE (UTC): regerar depois das 21h BRT gera a ordem do dia seguinte.
--   4. O item "Fatos publicaveis: N vencidos" conta mkt.fatos sem filtrar ativo (os 5 desativados pela 132 e os antigos
--      entravam como vencidos) e compara com current_date.
--
-- O QUE MUDA:
--   • Uma porta só: fn_gerar_ordem_do_dia(p_dia default = dia de Brasília) gera os próprios itens E chama as 4 funções
--     da máquina/sentinela. O cron passa a chamar só ela — o botão "Regerar" e o cron fazem exatamente a mesma coisa.
--   • Todas as inserções viram upsert pela chave natural que já existe (ordem_sem_duplicata: dia + bloco + título):
--     item que continua na ordem mantém o id e só tem posição/porquê/origem atualizados — e SÓ se ainda estiver aberto
--     (cumprido e justificado nunca são reabertos nem reescritos).
--   • Varredura no fim: item aberto do dia que a rodada não tocou (a fonte deixou de pedi-lo) é removido. A marca da
--     rodada é clock_timestamp() no início da geração; cada item tocado recebe gerado_em = clock_timestamp().
--   • Fatos: conta só ativos e públicos, pelo dia de Brasília.
--   • fn_ordem_sentinela_seo não é chamada hoje pelo cron e continua fora (mudança de comportamento não pedida).
--
-- LIMITE HONESTO DO "ID ESTÁVEL": a chave é o título. Item cujo título carrega número que muda ("+3 travas fora da
--   ordem", "MKT publicou 2 peca(s) em 24h", "Verificador de fatos: 1 divergente(s)") ganha id novo quando o número muda.
--   Os itens humanos que o GJ recebe (pendências, tarefa do roadmap, backlog, sentinela) têm título estável.
--
-- EFEITO NO FRONT: nenhum visível na Hoje além de "Regerar" deixar de sumir com os itens da máquina e de gerar o dia
--   errado à noite. No GJ (quando o segredo existir): o mesmo item chega com o mesmo origem_ref todos os dias em que
--   continuar aberto... dentro do mesmo dia. Entre dias, cada dia é linha própria (dia faz parte da chave).

begin;

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if md5(pg_get_functiondef('public.fn_gerar_ordem_do_dia(date)'::regprocedure)) <> '60c30f226e409b0c1fba1dd5767f026a'
  or md5(pg_get_functiondef('public.fn_ordem_maquina_mkt(date)'::regprocedure))  <> '3cb8393a8ed07842426d88df9a8cdb95'
  or md5(pg_get_functiondef('public.fn_ordem_maquina_fatos(date)'::regprocedure)) <> 'd27083bc670b61087bbd3bc1807410ae'
  or md5(pg_get_functiondef('public.fn_ordem_maquina_gate(date)'::regprocedure)) <> '37e815b2f95992b3d79b7a3589fbd64d'
  or md5(pg_get_functiondef('public.fn_ordem_sentinela(date)'::regprocedure))    <> '91c1ac2ed2dacb5eb788b6c6d0fa577a' then
    raise exception 'alguma funcao da ordem do dia mudou desde 16/09 — conferir antes de reescrever.';
  end if;
  if not exists (select 1 from pg_constraint where conrelid = 'ops.ordem_do_dia'::regclass and conname = 'ordem_sem_duplicata'
                   and pg_get_constraintdef(oid) = 'UNIQUE (dia, bloco, titulo)') then
    raise exception 'a chave natural (dia, bloco, titulo) nao existe mais.';
  end if;
  if (select command from cron.job where jobname = 'ordem-do-dia-gerar') not like '%fn_ordem_sentinela(current_date)%' then
    raise exception 'o comando do cron ordem-do-dia-gerar mudou — conferir antes.';
  end if;
end $$;

-- ── as 4 funções da máquina e da sentinela: upsert, só atualiza item aberto ───
create or replace function public.fn_ordem_maquina_mkt(p_dia date)
returns void language plpgsql security definer set search_path to 'public', 'ops'
as $function$
begin
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia, 'maquina', 3, m.titulo, m.porque, 'maquina', 'funil', 'mkt.publications', clock_timestamp()
    from public.fn_ordem_bloco_mkt(p_dia) m
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';
end;
$function$;

create or replace function public.fn_ordem_maquina_fatos(p_dia date)
returns void language plpgsql security definer set search_path to 'public', 'ops'
as $function$
begin
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia, 'maquina', 4,
         'Verificador de fatos: ' || count(*) filter (where veredito='divergente') || ' divergente(s)',
         'Medido na fonte agora. ' ||
         coalesce(string_agg(chave || ' afirma ' || coalesce(valor_numerico::text,'—') ||
                  ', fonte diz ' || coalesce(valor_medido::text,'—'), '; ')
                  filter (where veredito='divergente'), 'sem divergencia') ||
         '. ' || count(*) filter (where veredito='nao_verificavel') ||
         ' fonte(s) exigem humano. Renovar ou reescrever o fato e do agente do MKT (R-032).',
         'maquina', 'funil', 'ops.fato_medicao', clock_timestamp()
    from public.v_ops_fatos_verificados
   having count(*) filter (where veredito='divergente') > 0
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';
end;
$function$;

create or replace function public.fn_ordem_maquina_gate(p_dia date)
returns void language plpgsql security definer set search_path to 'public', 'ops'
as $function$
begin
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia, 'maquina', 5,
         case when g.gate_cumprido
              then 'Gate da Fase ' || g.fase || ': sustentado pelo dado'
              else 'Gate da Fase ' || g.fase || ': ainda nao sustentado' end,
         g.veredito || ' O fechamento da fase esta travado no banco ate isto mudar.',
         'maquina', 'gate', 'ops.roadmap_phases', clock_timestamp()
    from public.fn_gate_evidencia() g
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';
end;
$function$;

create or replace function public.fn_ordem_sentinela(p_dia date)
returns void language plpgsql security definer set search_path to 'public', 'ops'
as $function$
begin
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia,
         case when s.gravidade = 'alta' then 'trava' else 'maquina' end,
         case when s.gravidade = 'alta' then 50 else 6 end,
         'Sentinela: ' || s.achado,
         s.detalhe,
         'humano', 'sentinela', 'fn_sentinela_verdade', clock_timestamp()
    from public.fn_sentinela_verdade() s
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';
end;
$function$;

-- ── a porta única ─────────────────────────────────────────────────────────────
drop function public.fn_gerar_ordem_do_dia(date);

create function public.fn_gerar_ordem_do_dia(p_dia date default (now() at time zone 'America/Sao_Paulo')::date)
returns integer
language plpgsql
security definer
set search_path to 'public', 'ops', 'mkt', 'finance'
as $function$
declare
  v_rodada  timestamptz := clock_timestamp();
  v_fase    integer;
  v_n       integer := 0;
  v_travas  integer;
  v_teto    constant integer := 5;
begin
  select phase_number into v_fase
    from ops.roadmap_phases
   where started_at is not null and completed_at is null
   order by phase_number limit 1;

  select count(*) into v_travas
    from ops.pendencias_humanas
   where deleted_at is null and status = 'aberta' and severidade = 1;

  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref, gerado_em)
  select p_dia, 'trava', row_number() over (order by p.prazo nulls last, p.created_at),
         p.titulo,
         coalesce(p.porque, '') ||
           case
             when p.prazo is null then ''
             when p.prazo < p_dia  then ' Passou do prazo em ' || to_char(p.prazo, 'DD/MM') || '.'
             when p.prazo = p_dia  then ' Vence hoje.'
             else ' Vence em ' || (p.prazo - p_dia) || ' dias.'
           end,
         'humano', 'pendencia', p.id, p.fonte, clock_timestamp()
    from ops.pendencias_humanas p
   where p.deleted_at is null and p.status = 'aberta' and p.severidade = 1
   order by p.prazo nulls last, p.created_at
   limit v_teto
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_id = excluded.origem_id, origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';

  if v_travas > v_teto then
    insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
    values (p_dia, 'trava', 99,
      '+' || (v_travas - v_teto) || ' travas fora da ordem de hoje',
      'A ordem mostra as ' || v_teto || ' mais urgentes de ' || v_travas || ' pendencias severidade 1. '
      'Se essa fila nao encurtar, o teto vira represa — vale reclassificar ou resolver em lote.',
      'humano', 'pendencia', 'ops.pendencias_humanas', clock_timestamp())
    on conflict (dia, bloco, titulo) do update
       set posicao = excluded.posicao, porque = excluded.porque, gerado_em = clock_timestamp(), updated_at = now()
     where ops.ordem_do_dia.estado = 'aberto';
  end if;

  -- GATE: o elo da vez, falando em prazo
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref, gerado_em)
  select p_dia, 'gate', 1, t.title,
         'Fase ' || v_fase || ': elo ' ||
         (select count(*) from ops.roadmap_tasks y
           where y.phase_number = v_fase and y.deleted_at is null and y.completed_at is not null) + 1 ||
         ' de ' ||
         (select count(*) from ops.roadmap_tasks x where x.phase_number = v_fase and x.deleted_at is null) ||
         '. ' ||
         case
           when t.target_date is null   then 'Sem data marcada.'
           when t.target_date < p_dia   then 'Passou do prazo em ' || to_char(t.target_date, 'DD/MM') || '.'
           when t.target_date = p_dia   then 'Vence hoje.'
           else 'Vence em ' || (t.target_date - p_dia) || ' dias (' || to_char(t.target_date, 'DD/MM') || ').'
         end ||
         ' As demais tarefas da fase dependem desta.',
         'humano', 'roadmap', t.id, 'Fase ' || v_fase, clock_timestamp()
    from ops.roadmap_tasks t
   where t.phase_number = v_fase and t.deleted_at is null and t.completed_at is null
   order by t.target_date nulls last, t.display_order
   limit 1
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_id = excluded.origem_id, origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';

  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_id, origem_ref, gerado_em)
  select p_dia, 'gate', 1 + row_number() over (order by b.due_date nulls last, b.created_at),
         b.title,
         coalesce(nullif(btrim(b.blocker), ''), 'Critico no backlog (P1), area ' || coalesce(b.area, 'geral') || '.'),
         'humano', 'backlog', b.id, b.area, clock_timestamp()
    from ops.backlog_items b
   where b.deleted_at is null and b.priority = 1
     and b.status in ('pending','in_progress','blocked')
   order by b.due_date nulls last, b.created_at
   limit 2
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_id = excluded.origem_id, origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';

  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia, 'maquina', 1,
         'Custo de infra sincronizado do Finance',
         'Espelho da conta 7.4: ' || count(*) || ' linhas, R$ ' ||
         translate(to_char(sum(cost_brl), 'FM999G999D00'), ',.', '.,') || ' acumulado, extrato ate ' ||
         to_char(max(extrato_ate), 'DD/MM'),
         'maquina', 'funil', 'finance.infra_costs', clock_timestamp()
    from finance.infra_costs
   where sincronizado_em > now() - interval '36 hours'
  having count(*) > 0
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';

  -- fatos: só os ativos e públicos, pelo dia de Brasília (antes contava os desativados e usava current_date)
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia, 'maquina', 2,
         'Fatos publicaveis: ' || count(*) filter (where p_dia - verificado_em > validade_dias) || ' vencidos',
         'Fato vencido = IA do MKT silenciada nesse numero. ' ||
         count(*) filter (where p_dia - verificado_em <= validade_dias) || ' de ' || count(*) ||
         ' seguem frescos.',
         'maquina', 'funil', 'mkt.fatos', clock_timestamp()
    from mkt.fatos
   where publico and ativo
  having count(*) filter (where p_dia - verificado_em > validade_dias) > 0
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';

  -- máquina e sentinela na mesma porta: regerar pelo botão faz o mesmo que o cron
  perform public.fn_ordem_maquina_mkt(p_dia);
  perform public.fn_ordem_maquina_fatos(p_dia);
  perform public.fn_ordem_maquina_gate(p_dia);
  perform public.fn_ordem_sentinela(p_dia);

  -- o que a rodada não tocou e segue aberto: a fonte deixou de pedir
  delete from ops.ordem_do_dia
   where dia = p_dia and estado = 'aberto' and gerado_em < v_rodada;

  select count(*) into v_n from ops.ordem_do_dia where dia = p_dia;
  return v_n;
end;
$function$;

revoke all on function public.fn_gerar_ordem_do_dia(date) from public, anon;
grant execute on function public.fn_gerar_ordem_do_dia(date) to authenticated, service_role;

-- o cron chama só a porta única
select cron.alter_job(job_id := (select jobid from cron.job where jobname = 'ordem-do-dia-gerar'),
                      command := 'select public.fn_gerar_ordem_do_dia();');

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
begin
  if (select command from cron.job where jobname = 'ordem-do-dia-gerar') <> 'select public.fn_gerar_ordem_do_dia();' then
    raise exception 'cron nao ficou com a porta unica.';
  end if;
  if pg_get_function_arguments('public.fn_gerar_ordem_do_dia(date)'::regprocedure) not like '%America/Sao_Paulo%' then
    raise exception 'o dia padrao nao e o de Brasilia.';
  end if;
  if has_function_privilege('anon', 'public.fn_gerar_ordem_do_dia(date)', 'EXECUTE')
  or not has_function_privilege('authenticated', 'public.fn_gerar_ordem_do_dia(date)', 'EXECUTE') then
    raise exception 'grants do gerador mudaram (anon nao pode; authenticated precisa, e o botao Regerar).';
  end if;
end $$;

-- ── prova de comportamento, desfeita na hora (dia futuro, isolado dos dias reais) ──
do $$
declare
  v_dia date := (now() at time zone 'America/Sao_Paulo')::date + 20;
  v_cumprido uuid;
  v_n1 int; v_n2 int;
begin
  begin
    perform public.fn_gerar_ordem_do_dia(v_dia);
    create temp table prova_141 on commit drop as
      select id, bloco, titulo, estado from ops.ordem_do_dia where dia = v_dia;
    select count(*) into v_n1 from prova_141;
    if v_n1 = 0 then
      raise exception 'PROVA_141_FALHOU: a geracao nao produziu item nenhum para comparar';
    end if;

    -- um item cumprido e um item cuja fonte "sumiu" (aberto, não será tocado pela rodada)
    select id into v_cumprido from prova_141 order by bloco, titulo limit 1;
    update ops.ordem_do_dia set estado = 'cumprido', cumprido_em = now() where id = v_cumprido;
    insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, gerado_em)
    values (v_dia, 'gate', 9, 'PROVA_141 item cuja fonte sumiu', 'x', 'humano', 'backlog', clock_timestamp() - interval '1 hour');

    perform public.fn_gerar_ordem_do_dia(v_dia);   -- regerar

    if exists (select 1 from prova_141 a where not exists (
                 select 1 from ops.ordem_do_dia o where o.id = a.id and o.dia = v_dia)) then
      raise exception 'PROVA_141_FALHOU: regerar trocou o id de algum item';
    end if;
    if (select estado from ops.ordem_do_dia where id = v_cumprido) <> 'cumprido' then
      raise exception 'PROVA_141_FALHOU: regerar reabriu item cumprido';
    end if;
    if exists (select 1 from ops.ordem_do_dia where dia = v_dia and titulo = 'PROVA_141 item cuja fonte sumiu') then
      raise exception 'PROVA_141_FALHOU: item aberto que a rodada nao tocou continuou na ordem';
    end if;
    select count(*) into v_n2 from ops.ordem_do_dia where dia = v_dia;
    if v_n2 <> v_n1 then
      raise exception 'PROVA_141_FALHOU: regerar mudou a quantidade de itens (% -> %)', v_n1, v_n2;
    end if;

    raise exception 'PROVA_141_OK';
  exception
    when others then
      if sqlerrm <> 'PROVA_141_OK' then raise; end if;
  end;
end $$;

commit;
