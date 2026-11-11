-- 222 — A validade dos fatos passa a avisar sozinha (11/11/2026).
--
-- POR QUE: em 11/11 eu achei **20 de 26 fatos públicos fora da validade**, e um deles — `osi_oferta` —
-- vencia em 15/11 sendo a **fonte única** de preço e pacote da OSI pela regra de marca. Nada tinha
-- vazado para post (o motor filtra `fresco` e é fail-closed), mas ninguém estava olhando: a validade só
-- aparecia quando alguém, por acaso, fosse conferir. Revalidação que depende de alguém lembrar não é
-- controle, é sorte.
--
-- ONDE AVISA: em `ops.controle_itens`, como `agente = 'fatos'`, que é a porta que já leva à tela Controle.
-- Sem tabela nova e sem tela nova (decisão do Geral em 11/11, pela prioridade de receita).
--
-- COMO SE PROVA QUE RODOU, sem tabela de execução: o próprio job grava **uma linha de batimento por dia**.
-- Dia sem a linha é dia em que o job não rodou, e isso fica visível na tela em vez de virar silêncio.
-- É a mesma ideia que me fez separar "não medido" de "zero" na página Receita: ausência tem de aparecer.
--
-- O QUE É RISCO E O QUE É SÓ AVISO, e por que a diferença importa:
--   · RISCO — fato **vencido** que alguma `mkt.content_rules` nomeia como **fonte única**. Hoje é o caso de
--     `osi_oferta`: a regra da OSI diz que preço, pacote e garantia vêm só dele. Vencido, a peça sai sem
--     poder citar preço — trava trabalho de verdade.
--   · ABERTO — fato que **vence em 7 dias**, ou vencido que ninguém declarou como fonte única. Incomoda,
--     não trava.
-- Fato vencido que ninguém usa não vira alarme: alarme que toca por tudo ensina a ignorar alarme.

create or replace function public.fn_fatos_conferir()
returns table (frescos int, vencendo int, vencidos int, linhas int)
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_dia date := (now() at time zone 'America/Sao_Paulo')::date;
  v_frescos int; v_vencendo int; v_vencidos int; v_linhas int := 0; v_n int; v_lista text;
begin
  -- Portão: a carga roda como `postgres` (cron) e uma pessoa só se for da equipe.
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a rotina confere a validade dos fatos' using errcode = 'insufficient_privilege';
  end if;

  -- O job é dono das suas linhas do dia: apaga e regrava, para rodar duas vezes não duplicar o aviso.
  -- Só as de hoje e só as dele — a carga do Geral não encosta nelas, e esta não encosta nas dele.
  delete from ops.controle_itens where origem = 'agente' and agente = 'fatos' and data = v_dia;

  select count(*) filter (where fresco),
         count(*) filter (where fresco and valido_ate <= v_dia + 7),
         count(*) filter (where not fresco)
    into v_frescos, v_vencendo, v_vencidos
    from public.v_mkt_fatos where publico;

  insert into ops.controle_itens (origem, agente, tipo, titulo, texto, data, nivel)
  select 'agente', 'fatos', 'risco',
         'Fato vencido que é fonte única de uma marca: ' || v.chave,
         'O fato "' || v.chave || '" venceu em ' || to_char(v.valido_ate, 'DD/MM/YYYY')
           || ' e a regra de conteúdo da marca ' || upper(b.code) || ' o nomeia como fonte única. '
           || 'Enquanto estiver vencido, a peça dessa marca não pode citar o número dele — a trava é '
           || 'fail-closed e não avisa quem escreve. Revalidar na fonte ou aposentar o fato.',
         v_dia, 1
    from public.v_mkt_fatos v
    join mkt.content_rules r on r.fatos ilike '%' || v.chave || '%'
    join mkt.brands b on b.id = r.brand_id
   where v.publico and not v.fresco;
  get diagnostics v_linhas = row_count;

  -- VENCENDO EM 7 DIAS: uma linha por fato, porque cada um pede uma ida à fonte, e com nome para quem lê
  -- saber o que revalidar.
  insert into ops.controle_itens (origem, agente, tipo, titulo, texto, data, nivel)
  select 'agente', 'fatos', 'aberto',
         'Fato vence em ' || (v.valido_ate - v_dia) || ' dia(s): ' || v.chave,
         -- A chave entra no TEXTO, e não só no título: a tabela tem chave única em (data, agente, tipo,
         -- hash do texto), e dois fatos com a mesma validade e as mesmas datas geravam texto idêntico —
         -- o segundo aviso sumia como se fosse repetição. Quem é o fato faz parte do que o aviso diz.
         'Fato "' || v.chave || '". Validade de ' || v.validade_dias || ' dia(s); verificado em '
           || to_char(v.verificado_em, 'DD/MM/YYYY') || ', vale até ' || to_char(v.valido_ate, 'DD/MM/YYYY')
           || '. Revalidar na fonte antes de vencer.',
         v_dia, 2
    from public.v_mkt_fatos v
   where v.publico and v.fresco and v.valido_ate <= v_dia + 7;
  get diagnostics v_n = row_count;
  v_linhas := v_linhas + v_n;

  -- VENCIDO QUE NÃO TRAVA PEÇA: **uma linha só, com a lista dentro**. Vinte linhas iguais numa tela que a
  -- casa está justamente tentando desentupir seria eu criando o problema que passei a semana apontando —
  -- e lista longa de item parecido ensina a rolar sem ler. Quem trava peça continua saindo um por um, em
  -- risco; aqui o que importa é o tamanho do rombo, não o desfile.
  select count(*), string_agg(v.chave, ', ' order by v.chave) into v_n, v_lista
    from public.v_mkt_fatos v
   where v.publico and not v.fresco
     and not exists (select 1 from mkt.content_rules r where r.fatos ilike '%' || v.chave || '%');
  if v_n > 0 then
    insert into ops.controle_itens (origem, agente, tipo, titulo, texto, data, nivel)
    values ('agente', 'fatos', 'aberto',
            v_n || ' fato(s) público(s) vencido(s) que não travam peça',
            'Nenhuma regra de marca os nomeia como fonte única, então não impedem ninguém de publicar — '
              || 'mas número velho na mão de quem escreve é número velho. Revalidar na fonte ou aposentar: '
              || v_lista,
            v_dia, 2);
    v_linhas := v_linhas + 1;
  end if;

  -- BATIMENTO: a prova de que a rotina rodou hoje. Sem tabela de execução, a ausência desta linha é o
  -- que denuncia o dia em que ela não rodou.
  insert into ops.controle_itens (origem, agente, tipo, titulo, texto, data, nivel)
  values ('agente', 'fatos', 'feito',
          'Fatos conferidos: ' || v_frescos || ' frescos, ' || v_vencendo || ' vencendo em 7 dias, ' || v_vencidos || ' vencidos',
          'Batimento diário da conferência de validade (migration 222). Dia sem esta linha é dia em que a '
            || 'rotina não rodou — e aí o que está acima é retrato velho, não ausência de problema.',
          v_dia, 3);

  return query select v_frescos, v_vencendo, v_vencidos, v_linhas + 1;
end;
$function$;

grant execute on function public.fn_fatos_conferir() to authenticated;

do $$
declare v_job bigint;
begin
  perform cron.unschedule('digiai-fatos-validade-diaria')
    where exists (select 1 from cron.job where jobname = 'digiai-fatos-validade-diaria');

  -- 10:05 UTC = 07:05 BRT, cinco minutos depois do censo das 07h, para não disputar o mesmo minuto.
  select cron.schedule('digiai-fatos-validade-diaria', '5 10 * * *',
                       $cmd$ select public.fn_fatos_conferir(); $cmd$) into v_job;
  if v_job is null then
    raise exception 'PROVA_222_FALHOU: cron.schedule nao devolveu jobid';
  end if;
end $$;

-- PROVA 1 — a rotina roda e escreve o batimento. Rodada de verdade, aqui, com o retrato de hoje.
do $$
declare r record; v_bat int;
begin
  select * into r from public.fn_fatos_conferir();
  if r.frescos is null or r.linhas < 1 then
    raise exception 'PROVA_222_FALHOU: a conferencia nao devolveu contagem';
  end if;
  select count(*) into v_bat from ops.controle_itens
   where agente = 'fatos' and tipo = 'feito' and data = (now() at time zone 'America/Sao_Paulo')::date;
  if v_bat <> 1 then
    raise exception 'PROVA_222_FALHOU: % linha(s) de batimento hoje (esperado exatamente 1)', v_bat;
  end if;
end $$;

-- PROVA 2 — rodar duas vezes no mesmo dia não duplica aviso. Sem isto, uma reexecução encheria a tela do
-- dono com o mesmo item, e tela que repete item ensina a rolar sem ler.
do $$
declare n1 int; n2 int;
begin
  select count(*) into n1 from ops.controle_itens where agente = 'fatos' and data = (now() at time zone 'America/Sao_Paulo')::date;
  perform public.fn_fatos_conferir();
  select count(*) into n2 from ops.controle_itens where agente = 'fatos' and data = (now() at time zone 'America/Sao_Paulo')::date;
  if n1 <> n2 then
    raise exception 'PROVA_222_FALHOU: rodar duas vezes mudou de % para % linha(s)', n1, n2;
  end if;
end $$;

-- PROVA 3 — o que é risco é só o que trava trabalho. Hoje: `osi_oferta` está FRESCO (revalidado na 221),
-- logo não pode haver nenhum risco de fato aberto. Se esta prova passar a falhar um dia, é porque um fato
-- fonte única venceu — que é exatamente o alarme que esta migration existe para dar.
do $$
declare n int; quais text;
begin
  select count(*), string_agg(titulo, ' · ') into n, quais from ops.controle_itens
   where agente = 'fatos' and tipo = 'risco' and data = (now() at time zone 'America/Sao_Paulo')::date;
  if n <> 0 then
    raise exception 'PROVA_222_FALHOU: ha % risco(s) de fato hoje, e nao deveria haver nenhum: %', n, quais;
  end if;
end $$;

-- PROVA 4 — o job está agendado, ativo e no horário combinado.
do $$
declare r record;
begin
  select schedule, active, command into r from cron.job where jobname = 'digiai-fatos-validade-diaria';
  if r is null or r.schedule <> '5 10 * * *' or not r.active then
    raise exception 'PROVA_222_FALHOU: job ausente, inativo ou fora do horario';
  end if;
  if r.command not like '%fn_fatos_conferir%' then
    raise exception 'PROVA_222_FALHOU: o job nao chama a funcao de conferencia';
  end if;
end $$;
