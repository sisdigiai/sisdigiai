-- 149 — estado automático, passos 5 e 6 no banco: "reconfirmar" na ordem do dia e virada de fase como pedido ao dono
--
-- ✔ APLICADA em 22/09/2026 às 08:33:39 BRT, com a palavra do dono neste canal ("pode construir o passo 4 e todos que
--   faltarem"), reensaiada antes (md5 do gerador igual depois do ensaio). Ordem do dia de 22/09 regerada: 8 itens antes e
--   depois, nenhum "reconfirmar" (nada vencido), gate da fase 2 segue "ainda nao sustentado". Caminho "evidencia sustenta"
--   correto por construção, não provado (não há venda de mercado para provar).
--
-- (Escrita como NÃO APLICADA.)
--
-- CONTRATO: docs/contrato-estado-automatico-dos-apps-2026-09-16.md §4 e §5 (passos 5 e 6).
--
-- 1. public.fn_ordem_maquina_reconfirmar(dia): lê public.v_ops_reconfirmar (140) e põe na ordem do dia um item por tipo
--    — ficha de app vencida, portão que sumiu do índice sem entrada em Fechados, decisão vencida — com a contagem e até
--    5 nomes. Dono = humano: reconfirmar é ato de gente (o agente do app reescreve a ficha; o Geral, o índice; o dono,
--    a decisão). Sem nada a reconfirmar, não entra item (e a limpeza do gerador tira o de ontem).
-- 2. public.fn_ordem_maquina_gate(dia): quando fn_gate_evidencia() diz que a evidência sustenta o gate, o item deixa de
--    ser recado da máquina e vira pedido ao dono no bloco gate ("confirmar a virada no Roadmap"). A máquina propõe;
--    quem vira a fase é o dono. Sem evidência, segue o item de hoje (máquina, "ainda não sustentado").
-- 3. public.fn_gerar_ordem_do_dia: ganha UMA linha (chamar a 1 antes da sentinela). Editada por substituição exata sobre
--    a definição viva, com trava de md5 — o resto da função fica byte a byte igual.
--
-- Medido antes (22/09 ~09h BRT): v_ops_reconfirmar vazia (16 fichas de 16/09, válidas até 16/10; portões ainda sem
--   indice_estado; nenhuma decisão com validade). fn_gate_evidencia: fase 2 não sustentada (0 venda de mercado).

begin;

do $$
begin
  if to_regprocedure('public.fn_ordem_maquina_reconfirmar(date)') is not null then
    raise exception 'fn_ordem_maquina_reconfirmar ja existe — a 149 ja foi aplicada?';
  end if;
  if md5(pg_get_functiondef('public.fn_gerar_ordem_do_dia(date)'::regprocedure)) <> 'adc7cb0a2cc7f1d0665121f5e2dfddb2' then
    raise exception 'fn_gerar_ordem_do_dia mudou desde 22/09 — conferir antes.';
  end if;
  if md5(pg_get_functiondef('public.fn_ordem_maquina_gate(date)'::regprocedure)) <> '553a907890a90edf7218e80f38eae36c' then
    raise exception 'fn_ordem_maquina_gate mudou desde 22/09 — conferir antes.';
  end if;
end $$;

create function public.fn_ordem_maquina_reconfirmar(p_dia date)
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
           else                               'Reconfirmar: ' || count(*) || ' decisao(oes) vencida(s)'
         end,
         case r.tipo
           when 'ficha_vencida'          then 'O agente de cada app reescreve a ficha (Cockpit/Apps/<app>/ficha.md) com data nova. '
           when 'portao_sumiu_do_indice' then 'Saiu de Cockpit/portoes-abertos.md sem entrada em Fechados: o Geral fecha com prova ou devolve ao indice. '
           else                               'So o dono reconfirma ou revoga, por arquivo datado em Cockpit/decisoes/. '
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
revoke all on function public.fn_ordem_maquina_reconfirmar(date) from public, anon, authenticated;

create or replace function public.fn_ordem_maquina_gate(p_dia date)
returns void
language plpgsql
security definer
set search_path to 'public', 'ops'
as $function$
begin
  insert into ops.ordem_do_dia (dia, bloco, posicao, titulo, porque, dono, origem_tipo, origem_ref, gerado_em)
  select p_dia,
         case when g.gate_cumprido then 'gate' else 'maquina' end,
         case when g.gate_cumprido then 0 else 5 end,
         case when g.gate_cumprido
              then 'Virar a Fase ' || g.fase || ': a evidencia sustenta — confirmar no Roadmap'
              else 'Gate da Fase ' || g.fase || ': ainda nao sustentado' end,
         g.veredito || case when g.gate_cumprido
              then ' A maquina propoe; quem vira a fase e o dono, no Roadmap.'
              else ' O fechamento da fase esta travado no banco ate isto mudar.' end,
         case when g.gate_cumprido then 'humano' else 'maquina' end,
         'gate', 'ops.roadmap_phases', clock_timestamp()
    from public.fn_gate_evidencia() g
  on conflict (dia, bloco, titulo) do update
     set posicao = excluded.posicao, porque = excluded.porque, dono = excluded.dono, origem_tipo = excluded.origem_tipo,
         origem_ref = excluded.origem_ref, gerado_em = clock_timestamp(), updated_at = now()
   where ops.ordem_do_dia.estado = 'aberto';
end;
$function$;

do $$
declare d text := pg_get_functiondef('public.fn_gerar_ordem_do_dia(date)'::regprocedure);
begin
  if (length(d) - length(replace(d, 'perform public.fn_ordem_sentinela(p_dia);', ''))) <> length('perform public.fn_ordem_sentinela(p_dia);') then
    raise exception 'ponto de insercao nao e unico na fn_gerar_ordem_do_dia.';
  end if;
  execute replace(d, 'perform public.fn_ordem_sentinela(p_dia);',
                  'perform public.fn_ordem_maquina_reconfirmar(p_dia);' || chr(10) || '  perform public.fn_ordem_sentinela(p_dia);');
end $$;

-- ── provas, desfeitas na hora (dia de teste 2099-01-01, fora de qualquer ordem real) ──────────────────────────────
do $$
declare v_it record;
begin
  if position('fn_ordem_maquina_reconfirmar(p_dia)' in pg_get_functiondef('public.fn_gerar_ordem_do_dia(date)'::regprocedure)) = 0 then
    raise exception 'gerador nao chama a reconfirmar.';
  end if;
  begin
    perform ops.fn_atualizar_ficha_app(jsonb_build_object('slug', 'prova_149', 'nome', 'Prova 149',
      'ficha_fonte', 'Cockpit/Apps/prova_149/ficha.md', 'declarado_em', (now() at time zone 'America/Sao_Paulo')::date - 40,
      'validade_dias', 30));
    perform public.fn_gerar_ordem_do_dia('2099-01-01');
    select * into v_it from ops.ordem_do_dia where dia = '2099-01-01' and titulo like 'Reconfirmar: % ficha(s)%';
    if v_it is null or v_it.dono <> 'humano' or position('Prova 149' in v_it.porque) = 0 then
      raise exception 'PROVA_149_FALHOU: ficha vencida nao virou item reconfirmar do dono';
    end if;
    if not exists (select 1 from ops.ordem_do_dia where dia = '2099-01-01' and titulo like 'Gate da Fase%nao sustentado'
                    and bloco = 'maquina') then
      raise exception 'PROVA_149_FALHOU: gate nao sustentado mudou de lugar';
    end if;
    raise exception 'PROVA_149_OK';
  exception when others then
    if sqlerrm <> 'PROVA_149_OK' then raise; end if;
  end;
end $$;

commit;
