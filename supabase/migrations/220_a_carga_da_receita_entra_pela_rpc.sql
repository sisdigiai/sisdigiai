-- 220 — A carga do Agente de Receita entra pela RPC, e não por escrita direta (11/11/2026).
--
-- POR QUE AGORA: a página Receita está no ar e vazia. O Agente de Receita **não tem login de equipe**, então
-- as RPCs da 219 o recusam (`is_staff()` é falso para ele). A carga dele vai sair de arquivo, como a do
-- Controle — e aí vinha a tentação de repetir o caminho do Controle, que é `insert` direto na tabela pela
-- Management API.
--
-- RECUSADO, com motivo: o `insert` direto é exatamente por que a tabela do Controle acabou guardando prosa
-- que a tela precisa ler com cinco expressões regulares. Aqui as regras do placar **são o produto**:
-- `estado` obrigatório, alavanca encerrada sem veredito recusada, mês relido que não duplica. Se a carga
-- escrever direto, essas regras valem só enquanto alguém lembrar delas.
--
-- O QUE ESTA MIGRATION FAZ: deixa a carga passar PELA MESMA PORTA, acrescentando ao portão a identidade de
-- quem faz carga (`session_user = 'postgres'`, que é como a Management API chega). Isso **não concede
-- privilégio nenhum**: `postgres` já é dono de tudo e já poderia escrever direto na tabela. O que muda é
-- que agora, ao passar pela RPC, a carga é obrigada a respeitar as mesmas regras do resto da casa.
--
-- E DUAS CORREÇÕES DE MODELO que o arquivo real do Receita (`Cockpit/receita/placar.md`) mostrou:
--   · `alavanca.inicio` deixa de ser obrigatório. Três das seis alavancas dele estão "não iniciada", e
--     inventar uma data de início para caber no schema seria gravar um fato que não existe.
--   · `alavanca.obs` entra para guardar o texto como ele escreveu (margem prevista em reais por óculos,
--     prazo, condição de reabertura). A coluna numérica fica com o número; a frase fica com a frase.

alter table receita.alavanca alter column inicio drop not null;
alter table receita.alavanca add column if not exists obs text;

comment on column receita.alavanca.inicio is 'Nulo = não iniciada. Data inventada para caber no schema seria fato que não existe.';

-- O portão passa a aceitar também a carga. Escrito uma vez aqui e repetido nas quatro funções, de propósito:
-- portão que mora em um lugar só vira portão que alguém esquece de chamar.
create or replace function public.rpc_receita_gravar_leitura(
  p_linha smallint, p_mes date, p_estado text,
  p_entrada_bruta_brl numeric, p_custo_para_trazer_brl numeric, p_regua_brl numeric,
  p_fonte text, p_medido_por text,
  p_parte_relacionada boolean default false, p_data_leitura date default null, p_obs text default null)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare v_id bigint; v_dia date;
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga grava leitura de receita' using errcode = 'insufficient_privilege';
  end if;
  v_dia := coalesce(p_data_leitura, (now() at time zone 'America/Sao_Paulo')::date);

  insert into receita.leitura (linha, data_leitura, mes, estado, entrada_bruta_brl, custo_para_trazer_brl,
                               regua_brl, parte_relacionada, fonte, medido_por, obs)
  values (p_linha, v_dia, date_trunc('month', p_mes)::date, p_estado, p_entrada_bruta_brl,
          coalesce(p_custo_para_trazer_brl, 0), coalesce(p_regua_brl, 0), coalesce(p_parte_relacionada, false),
          p_fonte, p_medido_por, p_obs)
  on conflict (linha, mes, data_leitura, estado) do update
     set entrada_bruta_brl = excluded.entrada_bruta_brl,
         custo_para_trazer_brl = excluded.custo_para_trazer_brl,
         regua_brl = excluded.regua_brl,
         parte_relacionada = excluded.parte_relacionada,
         fonte = excluded.fonte, medido_por = excluded.medido_por, obs = excluded.obs
  returning id into v_id;
  return v_id;
end;
$function$;

-- A assinatura ganha `p_obs`, então a de ontem precisa SAIR e não apenas ser acompanhada: duas versões
-- da mesma função é uma porta nova com a tranca velha, e foi a prova 1 que me obrigou a ver isso.
drop function if exists public.rpc_receita_gravar_alavanca(text, smallint, text, date, text, numeric, integer, numeric, text);

create or replace function public.rpc_receita_gravar_alavanca(
  p_nome text, p_linha smallint, p_executor text, p_inicio date, p_estado text,
  p_margem_prevista_pct numeric default null, p_dias_ate_primeiro_real integer default null,
  p_resultado_brl numeric default 0, p_veredito text default null, p_obs text default null)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare v_id bigint;
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga grava alavanca' using errcode = 'insufficient_privilege';
  end if;
  if p_estado in ('encerrada', 'congelada') and btrim(coalesce(p_veredito, '')) = '' then
    raise exception 'alavanca % sem veredito escrito: encerrada ou congelada exige o porquê', p_nome;
  end if;

  insert into receita.alavanca (nome, linha, executor, inicio, margem_prevista_pct, dias_ate_primeiro_real,
                                resultado_brl, estado, veredito, obs, atualizado_em)
  values (p_nome, p_linha, p_executor, p_inicio, p_margem_prevista_pct, p_dias_ate_primeiro_real,
          coalesce(p_resultado_brl, 0), p_estado, p_veredito, p_obs, now())
  on conflict (nome, inicio) do update
     set linha = excluded.linha, executor = excluded.executor,
         margem_prevista_pct = excluded.margem_prevista_pct,
         dias_ate_primeiro_real = excluded.dias_ate_primeiro_real,
         resultado_brl = excluded.resultado_brl, estado = excluded.estado,
         veredito = excluded.veredito, obs = excluded.obs, atualizado_em = now()
  returning id into v_id;
  return v_id;
end;
$function$;

create or replace function public.rpc_receita_gravar_rotina(
  p_nome text, p_ligada boolean, p_hora text default null, p_descricao text default null,
  p_fonte text default null, p_execucao timestamptz default null,
  p_falha timestamptz default null, p_detalhe_falha text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga grava rotina' using errcode = 'insufficient_privilege';
  end if;
  insert into receita.rotina (nome, descricao, hora, ligada, ultima_execucao, ultima_falha, detalhe_falha, fonte, atualizado_em)
  values (p_nome, p_descricao, p_hora, p_ligada, p_execucao, p_falha, p_detalhe_falha, p_fonte, now())
  on conflict (nome) do update
     set descricao = coalesce(excluded.descricao, receita.rotina.descricao),
         hora = coalesce(excluded.hora, receita.rotina.hora),
         ligada = excluded.ligada,
         ultima_execucao = greatest(receita.rotina.ultima_execucao, excluded.ultima_execucao),
         ultima_falha = greatest(receita.rotina.ultima_falha, excluded.ultima_falha),
         detalhe_falha = coalesce(excluded.detalhe_falha, receita.rotina.detalhe_falha),
         fonte = coalesce(excluded.fonte, receita.rotina.fonte),
         atualizado_em = now();
  return p_nome;
end;
$function$;

create or replace function public.rpc_controle_foco_gravar(p_semana_de date, p_ordem smallint, p_texto text, p_autor text)
returns date
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga escreve o foco da semana' using errcode = 'insufficient_privilege';
  end if;
  insert into ops.controle_foco (semana_de, ordem, texto, autor)
  values (p_semana_de, p_ordem, p_texto, p_autor)
  on conflict (semana_de, ordem) do update set texto = excluded.texto, autor = excluded.autor, criado_em = now();
  return p_semana_de;
end;
$function$;

grant execute on function public.rpc_receita_gravar_alavanca(text, smallint, text, date, text, numeric, integer, numeric, text, text) to authenticated;

-- A view das alavancas passa a mostrar o texto escrito e a dizer quando a alavanca nem começou.
-- `create or replace` não aceita coluna nova no meio da lista (42P16), então a view cai e volta na
-- mesma transação. É objeto meu, de ontem, e nada lê entre o drop e o create.
drop view if exists public.v_receita_alavancas;
create view public.v_receita_alavancas
with (security_invoker = true) as
select a.id, a.nome, a.linha, a.executor, a.inicio,
       case when a.inicio is null then null
            else ((now() at time zone 'America/Sao_Paulo')::date - a.inicio) end as dias_em_curso,
       a.margem_prevista_pct, a.dias_ate_primeiro_real, a.resultado_brl, a.estado, a.veredito, a.obs,
       a.atualizado_em,
       (a.inicio is null) as nao_iniciada,
       -- Três semanas de zero é a trava do mandato, e ela só conta para o que REALMENTE começou: alavanca
       -- sem data de início está parada, não fracassando, e as duas pedem conversas diferentes.
       (a.estado = 'em_curso' and a.resultado_brl = 0 and a.inicio is not null
        and ((now() at time zone 'America/Sao_Paulo')::date - a.inicio) >= 21) as zero_ha_tres_semanas
  from receita.alavanca a;

grant select on public.v_receita_alavancas to authenticated;

-- PROVA 1 — as quatro funções de escrita carregam o portão novo. Função de escrita sem portão é a porta
-- que ninguém lembra de trancar, e aqui elas são quatro.
do $$
declare faltou text;
begin
  select string_agg(p.proname, ', ') into faltou
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public'
     and p.proname in ('rpc_receita_gravar_leitura','rpc_receita_gravar_alavanca',
                       'rpc_receita_gravar_rotina','rpc_controle_foco_gravar')
     and pg_get_functiondef(p.oid) not like '%public.is_staff() or session_user = ''postgres''%';
  if faltou is not null then
    raise exception 'PROVA_220_FALHOU: funcao sem o portao: %', faltou;
  end if;
end $$;

-- PROVA 2 — a carga consegue gravar pela RPC, e o que ela grava respeita as regras. Ida e volta completa
-- com alavanca sem data de início (o caso que a 219 recusava), e limpeza na mesma transação (R-004).
do $$
declare v_id bigint; v_nao_iniciada boolean; v_dias int;
begin
  v_id := public.rpc_receita_gravar_alavanca(
    p_nome => 'prova da 220', p_linha => 2::smallint, p_executor => 'prova', p_inicio => null,
    p_estado => 'em_curso', p_margem_prevista_pct => null, p_dias_ate_primeiro_real => null,
    p_resultado_brl => 0, p_veredito => null, p_obs => 'linha de prova');

  select nao_iniciada, dias_em_curso into v_nao_iniciada, v_dias
    from public.v_receita_alavancas where id = v_id;
  if not v_nao_iniciada or v_dias is not null then
    raise exception 'PROVA_220_FALHOU: alavanca sem inicio devia sair como nao iniciada e sem contagem de dias';
  end if;

  delete from receita.alavanca where id = v_id;
end $$;

-- PROVA 3 — a regra do veredito continua de pé pela porta nova: encerrar sem o porquê tem de ser recusado.
do $$
declare v_recusou boolean := false;
begin
  begin
    perform public.rpc_receita_gravar_alavanca(
      p_nome => 'prova do veredito 220', p_linha => 3::smallint, p_executor => 'prova',
      p_inicio => '2026-11-01', p_estado => 'encerrada');
  exception when others then
    v_recusou := true;
  end;
  if not v_recusou then
    delete from receita.alavanca where nome = 'prova do veredito 220';
    raise exception 'PROVA_220_FALHOU: aceitou alavanca encerrada sem veredito';
  end if;
end $$;
