-- 219 — A página Receita ganha banco (decisão do dono em 10/11/2026, R-051).
--
-- POR QUE: a meta de mais R$ 100 mil por mês de dinheiro novo precisa de UM lugar no app, e o lugar só
-- vale se o número nascer no banco. Hoje o placar vive em `Cockpit/receita/placar.md` e `finance.revenue`
-- está vazia e com dois furos que eu apontei em 10/11: não tem custo (logo não existe "líquido") e não tem
-- o valor em reais da entrada nova (só contagem de assinaturas).
--
-- O QUE ESTA MIGRATION RECUSA, de propósito, e é o motivo de ela existir assim:
--   · PROPOSTA NÃO É MEDIÇÃO. `estado` é obrigatório ('proposta' | 'medido') e **a view do placar só soma
--     `medido`**. O placar de hoje traz R$ 73.330,62 na linha 1 como proposta; se proposta e medição
--     dividissem coluna, em uma semana ninguém lembraria qual era qual. É a mesma regra que separa pixel
--     declarado de pixel no ar.
--   · RELER O MÊS NÃO DOBRA O PLACAR. Uma leitura por (linha, mês, data, estado), e a view pega a **mais
--     recente** por (linha, mês) — nunca a soma das leituras.
--   · MOEDA NÃO SE MISTURA. Colunas `_brl` carregam `check` de não-negativo e o nome diz a moeda; a casa já
--     tem o alçapão pronto em `v_ops_cofre_resumo`, que soma USD com BRL. Aqui não entra dólar.
--   · A META É DADO, NÃO CONSTANTE. `receita.meta` guarda o valor por mês com quem definiu e quando —
--     autorização e número vêm do banco, nunca de constante no app (R-037 na forma, R-049 no fundo).
--   · RECEITA DA CASA FICA MARCADA. `parte_relacionada` é coluna da própria leitura, não herdada de outra
--     tabela com grão diferente: sem ela, as lojas do dono inflam a linha 1.
--
-- ONDE MORA O QUÊ (R-043/R-044): tabela em schema de domínio (`receita`), `public` recebe só view
-- `security_invoker` e RPC. As tabelas ganham RLS com política de staff — sem isso a view invoker devolve
-- 42501 para todo mundo, e com definer a RLS não valeria nada.
--
-- ESCRITA: só por RPC com portão explícito. O Agente de Receita grava do lado dele; ninguém faz `insert`
-- direto, e a tela não escreve número nenhum.

create schema if not exists receita;

-- ─────────────────────────────────────────────────────────────── tabelas

create table if not exists receita.meta (
  mes date primary key,
  valor_brl numeric(14,2) not null check (valor_brl > 0),
  definida_por text not null,
  definida_em date not null default (now() at time zone 'America/Sao_Paulo')::date,
  fonte text not null
);

comment on table receita.meta is 'Meta de dinheiro novo por mês. Número do dono, com data e fonte — não constante no app.';

create table if not exists receita.leitura (
  id bigint generated always as identity primary key,
  linha smallint not null check (linha in (1, 2, 3)),
  data_leitura date not null,
  mes date not null,
  estado text not null check (estado in ('proposta', 'medido')),
  entrada_bruta_brl numeric(14,2) not null check (entrada_bruta_brl >= 0),
  custo_para_trazer_brl numeric(14,2) not null default 0 check (custo_para_trazer_brl >= 0),
  regua_brl numeric(14,2) not null default 0 check (regua_brl >= 0),
  parte_relacionada boolean not null default false,
  fonte text not null check (btrim(fonte) <> ''),
  medido_por text not null check (btrim(medido_por) <> ''),
  obs text,
  criado_em timestamptz not null default now(),
  -- Reler o mesmo mês no mesmo dia e no mesmo estado é correção, não leitura nova.
  unique (linha, mes, data_leitura, estado)
);

comment on column receita.leitura.linha is '1 lojas com fonte nova · 2 Clearix para outras óticas · 3 publicações';
comment on column receita.leitura.estado is 'proposta = cálculo; medido = dinheiro que entrou. A view do placar só soma medido.';
comment on column receita.leitura.fonte is 'Link, consulta SQL ou caminho de arquivo — tem de dar para refazer a conta. Prosa não serve.';

create table if not exists receita.alavanca (
  id bigint generated always as identity primary key,
  nome text not null check (btrim(nome) <> ''),
  linha smallint not null check (linha in (1, 2, 3)),
  executor text not null,
  inicio date not null,
  margem_prevista_pct numeric(5,2),
  dias_ate_primeiro_real integer,
  resultado_brl numeric(14,2) not null default 0,
  estado text not null check (estado in ('em_curso', 'encerrada', 'congelada')),
  veredito text,
  atualizado_em timestamptz not null default now(),
  unique (nome, inicio)
);

comment on table receita.alavanca is 'O que está sendo feito para o dinheiro entrar, e o que já foi tentado. Encerrada sem veredito escrito não serve de histórico.';

create table if not exists receita.rotina (
  nome text primary key,
  descricao text,
  hora text,
  ligada boolean not null default false,
  ultima_execucao timestamptz,
  ultima_falha timestamptz,
  detalhe_falha text,
  fonte text,
  atualizado_em timestamptz not null default now()
);

comment on table receita.rotina is 'Rotina que grava a PRÓPRIA execução. O agendamento do cron não prova trabalho: cron marca sucesso quando o comando SQL rodou, mesmo que a função tenha devolvido 401.';

-- O foco da semana que o Geral pediu: tabela tipada, não linha solta na tabela de itens. O bloco "urgente"
-- do Controle mora dentro de `ops.controle_itens` e por isso a tela lê prosa com 5 expressões regulares;
-- se o remetente muda a redação, o bloco degrada calado. Coluna tipada não degrada assim.
create table if not exists ops.controle_foco (
  semana_de date not null,
  ordem smallint not null check (ordem between 1 and 5),
  texto text not null check (btrim(texto) <> ''),
  autor text not null,
  criado_em timestamptz not null default now(),
  primary key (semana_de, ordem)
);

-- ─────────────────────────────────────────────────────────────── RLS (a view invoker depende disto)

alter table receita.meta     enable row level security;
alter table receita.leitura  enable row level security;
alter table receita.alavanca enable row level security;
alter table receita.rotina   enable row level security;
alter table ops.controle_foco enable row level security;

do $$
declare t text;
begin
  foreach t in array array['receita.meta', 'receita.leitura', 'receita.alavanca', 'receita.rotina', 'ops.controle_foco'] loop
    execute format('drop policy if exists le_staff on %s', t);
    -- Leitura é de staff e de mais ninguém. Escrita não tem política nenhuma de propósito: quem grava é
    -- RPC definer com portão, e política de escrita aqui seria uma segunda porta para a mesma sala.
    execute format('create policy le_staff on %s for select to authenticated using (public.is_staff())', t);
  end loop;
end $$;

grant usage on schema receita to authenticated;
grant select on receita.meta, receita.leitura, receita.alavanca, receita.rotina to authenticated;
grant select on ops.controle_foco to authenticated;

-- ─────────────────────────────────────────────────────────────── views de contrato (public, invoker)

create or replace view public.v_receita_placar
with (security_invoker = true) as
with ultima as (
  -- A leitura mais recente por (linha, mês, estado). Somar todas as leituras do mês contaria a mesma
  -- entrada tantas vezes quantas alguém tivesse olhado para ela.
  select distinct on (linha, mes, estado) *
    from receita.leitura
   order by linha, mes, estado, data_leitura desc, id desc
)
select u.linha,
       u.mes,
       u.estado,
       u.entrada_bruta_brl,
       u.custo_para_trazer_brl,
       u.regua_brl,
       (u.entrada_bruta_brl - u.custo_para_trazer_brl - u.regua_brl)::numeric(14,2) as dinheiro_novo_brl,
       u.parte_relacionada,
       u.data_leitura,
       ((now() at time zone 'America/Sao_Paulo')::date - u.data_leitura) as dias_desde_leitura,
       -- "Leitura velha" é aviso, não erro: número de 8 dias atrás continua sendo número, mas quem olha
       -- precisa saber que ele não é de hoje antes de decidir em cima dele.
       (((now() at time zone 'America/Sao_Paulo')::date - u.data_leitura) > 7) as leitura_velha,
       u.fonte,
       u.medido_por,
       u.obs
  from ultima u;

create or replace view public.v_receita_meta
with (security_invoker = true) as
with dia as (select (now() at time zone 'America/Sao_Paulo')::date as hoje),
mes_atual as (select date_trunc('month', hoje)::date as mes, hoje from dia),
entrada as (
  select coalesce(sum(p.dinheiro_novo_brl), 0)::numeric(14,2) as novo_brl,
         count(*) filter (where p.estado = 'medido') as linhas_medidas,
         count(*) filter (where p.estado = 'proposta') as linhas_so_proposta
    from public.v_receita_placar p, mes_atual m
   -- SÓ `medido`. Proposta aparece na tela ao lado, nunca dentro do placar.
   where p.mes = m.mes and p.estado = 'medido' and not p.parte_relacionada
)
select m.mes,
       m.hoje,
       (select valor_brl from receita.meta where mes = m.mes) as meta_brl,
       e.novo_brl as dinheiro_novo_brl,
       e.linhas_medidas,
       e.linhas_so_proposta,
       ((select valor_brl from receita.meta where mes = m.mes) - e.novo_brl)::numeric(14,2) as falta_brl,
       ((date_trunc('month', m.hoje) + interval '1 month - 1 day')::date - m.hoje) as dias_restantes,
       -- Ritmo por semana com o que falta e o tempo que sobra. Sem meta cadastrada o ritmo é NULO, não 0:
       -- zero diria "não precisa correr", e o que é verdade é "ninguém escreveu a meta deste mês".
       case
         when (select valor_brl from receita.meta where mes = m.mes) is null then null
         else round(
           ((select valor_brl from receita.meta where mes = m.mes) - e.novo_brl)
           / greatest(((date_trunc('month', m.hoje) + interval '1 month - 1 day')::date - m.hoje), 1)::numeric * 7, 2)
       end as ritmo_semanal_brl
  from mes_atual m, entrada e;

create or replace view public.v_receita_alavancas
with (security_invoker = true) as
select a.id, a.nome, a.linha, a.executor, a.inicio,
       ((now() at time zone 'America/Sao_Paulo')::date - a.inicio) as dias_em_curso,
       a.margem_prevista_pct, a.dias_ate_primeiro_real, a.resultado_brl, a.estado, a.veredito, a.atualizado_em,
       -- Três semanas de zero é a trava do mandato. A view marca; quem decide encerrar é o dono.
       (a.estado = 'em_curso' and a.resultado_brl = 0
        and ((now() at time zone 'America/Sao_Paulo')::date - a.inicio) >= 21) as zero_ha_tres_semanas
  from receita.alavanca a;

create or replace view public.v_receita_rotinas
with (security_invoker = true) as
select r.nome, r.descricao, r.hora, r.ligada, r.ultima_execucao, r.ultima_falha, r.detalhe_falha, r.fonte,
       -- Rotina ligada que nunca gravou execução é promessa, não rotina.
       (r.ligada and r.ultima_execucao is null) as ligada_sem_prova,
       (r.ultima_execucao is not null
        and r.ultima_execucao < now() - interval '48 hours') as sem_rodar_ha_2_dias
  from receita.rotina r;

-- Funil da linha 2. Sai de `v_vendas_leads`, que tem nome e telefone — por isso aqui só entra CONTAGEM.
create or replace view public.v_receita_funil
with (security_invoker = true) as
select count(*)::int                                                  as leads,
       count(*) filter (where last_touch_at is null)::int             as sem_nenhum_toque,
       count(*) filter (where last_touch_at is not null)::int         as com_algum_toque,
       count(*) filter (where stage = 'captado')::int                 as captado,
       count(*) filter (where stage = 'contatado')::int               as contatado,
       count(*) filter (where stage = 'conversa')::int                as conversa,
       count(*) filter (where stage = 'cliente')::int                 as cliente,
       max(last_touch_at)                                             as ultimo_toque_em
  from public.v_vendas_leads;

-- O que espera a palavra do dono, do ponto de vista da receita: sai da mesma fonte do Controle, para não
-- existirem duas listas de pendência com contas diferentes.
create or replace view public.v_receita_esperando_dono
with (security_invoker = true) as
select i.agente, i.tipo, i.titulo, i.texto, i.data, i.nivel,
       ((now() at time zone 'America/Sao_Paulo')::date - i.data) as dias_esperando
  from public.v_controle_itens i
 where not i.resolvido
   and i.tipo = 'pendente_dono'
   and i.data >= (now() at time zone 'America/Sao_Paulo')::date - 30;

grant select on public.v_receita_placar, public.v_receita_meta, public.v_receita_alavancas,
                public.v_receita_rotinas, public.v_receita_funil, public.v_receita_esperando_dono
  to authenticated;

-- ─────────────────────────────────────────────────────────────── rotinas do cron (leitura honesta)

-- `cron.job` e `cron.job_run_details` não são legíveis por `authenticated`, e não vão ser: a resposta vem
-- por função com portão explícito, que é o que a R-043 exige de definer.
--
-- O QUE ESTA FUNÇÃO NÃO DIZ: que a rotina funcionou. `job_run_details.status = 'succeeded'` significa que
-- o COMANDO SQL rodou — um `net.http_post` que recebeu 401 entra como sucesso. Medido em 10/11: 30 jobs
-- ativos, 72.885 execuções e ZERO falhas registradas, e esse zero engana. Por isso a coluna se chama
-- `disparou_em`, e não `funcionou_em`.
create or replace function public.rpc_receita_rotinas_cron()
returns table (nome text, agendamento text, ativa boolean, disparou_em timestamptz, status_ultimo text, execucoes bigint)
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not public.is_staff() then
    raise exception 'apenas staff lê as rotinas do cron' using errcode = 'insufficient_privilege';
  end if;
  return query
    select j.jobname::text,
           j.schedule::text,
           j.active,
           d.ultima,
           d.status_ultimo,
           coalesce(d.n, 0)
      from cron.job j
      left join lateral (
        select max(r.start_time) as ultima,
               count(*) as n,
               (array_agg(r.status order by r.start_time desc))[1] as status_ultimo
          from cron.job_run_details r
         where r.jobid = j.jobid
      ) d on true
     order by j.jobname;
end;
$function$;

grant execute on function public.rpc_receita_rotinas_cron() to authenticated;

-- ─────────────────────────────────────────────────────────────── escrita (RPC com portão)

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
  if not public.is_staff() then
    raise exception 'apenas staff grava leitura de receita' using errcode = 'insufficient_privilege';
  end if;
  -- O dia do negócio é BRT. `current_date` no servidor vira o dia seguinte depois das 21h e a leitura de
  -- hoje apareceria como de amanhã — já aconteceu nesta casa, em outra tela.
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

create or replace function public.rpc_receita_gravar_alavanca(
  p_nome text, p_linha smallint, p_executor text, p_inicio date, p_estado text,
  p_margem_prevista_pct numeric default null, p_dias_ate_primeiro_real integer default null,
  p_resultado_brl numeric default 0, p_veredito text default null)
returns bigint
language plpgsql
security definer
set search_path to ''
as $function$
declare v_id bigint;
begin
  if not public.is_staff() then
    raise exception 'apenas staff grava alavanca' using errcode = 'insufficient_privilege';
  end if;
  -- Alavanca encerrada sem veredito escrito não vira histórico, vira esquecimento com data.
  if p_estado in ('encerrada', 'congelada') and btrim(coalesce(p_veredito, '')) = '' then
    raise exception 'alavanca % sem veredito escrito: encerrada ou congelada exige o porquê', p_nome;
  end if;

  insert into receita.alavanca (nome, linha, executor, inicio, margem_prevista_pct, dias_ate_primeiro_real,
                                resultado_brl, estado, veredito, atualizado_em)
  values (p_nome, p_linha, p_executor, p_inicio, p_margem_prevista_pct, p_dias_ate_primeiro_real,
          coalesce(p_resultado_brl, 0), p_estado, p_veredito, now())
  on conflict (nome, inicio) do update
     set linha = excluded.linha, executor = excluded.executor,
         margem_prevista_pct = excluded.margem_prevista_pct,
         dias_ate_primeiro_real = excluded.dias_ate_primeiro_real,
         resultado_brl = excluded.resultado_brl, estado = excluded.estado,
         veredito = excluded.veredito, atualizado_em = now()
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
  if not public.is_staff() then
    raise exception 'apenas staff grava rotina' using errcode = 'insufficient_privilege';
  end if;
  insert into receita.rotina (nome, descricao, hora, ligada, ultima_execucao, ultima_falha, detalhe_falha, fonte, atualizado_em)
  values (p_nome, p_descricao, p_hora, p_ligada, p_execucao, p_falha, p_detalhe_falha, p_fonte, now())
  on conflict (nome) do update
     set descricao = coalesce(excluded.descricao, receita.rotina.descricao),
         hora = coalesce(excluded.hora, receita.rotina.hora),
         ligada = excluded.ligada,
         -- Execução e falha só avançam: gravar nulo por cima apagaria a prova de que a rotina já rodou.
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
  if not public.is_staff() then
    raise exception 'apenas staff escreve o foco da semana' using errcode = 'insufficient_privilege';
  end if;
  insert into ops.controle_foco (semana_de, ordem, texto, autor)
  values (p_semana_de, p_ordem, p_texto, p_autor)
  on conflict (semana_de, ordem) do update set texto = excluded.texto, autor = excluded.autor, criado_em = now();
  return p_semana_de;
end;
$function$;

grant execute on function public.rpc_receita_gravar_leitura(smallint, date, text, numeric, numeric, numeric, text, text, boolean, date, text) to authenticated;
grant execute on function public.rpc_receita_gravar_alavanca(text, smallint, text, date, text, numeric, integer, numeric, text) to authenticated;
grant execute on function public.rpc_receita_gravar_rotina(text, boolean, text, text, text, timestamptz, timestamptz, text) to authenticated;
grant execute on function public.rpc_controle_foco_gravar(date, smallint, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────── a meta do dono, como dado

insert into receita.meta (mes, valor_brl, definida_por, fonte)
values ('2026-11-01', 100000.00, 'dono', 'R-051 e Cockpit/controle/mandato-agente-receita-2026-11-10.md'),
       ('2026-12-01', 100000.00, 'dono', 'R-051 e Cockpit/controle/mandato-agente-receita-2026-11-10.md')
on conflict (mes) do nothing;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — as seis views de contrato existem e rodam como QUEM CONSULTA. View de contrato que roda como
-- dona fura a RLS que acabou de ser criada, e a política de staff viraria enfeite (R-043).
do $$
declare faltou text;
begin
  select string_agg(v, ', ') into faltou
    from unnest(array['v_receita_placar','v_receita_meta','v_receita_alavancas','v_receita_rotinas',
                      'v_receita_funil','v_receita_esperando_dono']) v
   where not exists (
     select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname = v
        and c.reloptions @> array['security_invoker=true']);
  if faltou is not null then
    raise exception 'PROVA_219_FALHOU: view ausente ou sem security_invoker: %', faltou;
  end if;
end $$;

-- PROVA 2 — PROPOSTA NÃO ENTRA NO PLACAR. É a regra que o dono mais paga se falhar, então ela é provada
-- com dado de verdade: duas leituras num mês impossível (1900), conferência, e as duas saem na mesma
-- transação da migration — rascunho meu, criado e removido aqui (R-004).
do $$
declare v_novo numeric; v_linhas int;
begin
  insert into receita.leitura (linha, data_leitura, mes, estado, entrada_bruta_brl, custo_para_trazer_brl,
                               regua_brl, fonte, medido_por)
  values (1, '1900-01-05', '1900-01-01', 'proposta', 999999.00, 0, 0, 'prova da 219', 'prova'),
         (1, '1900-01-05', '1900-01-01', 'medido',      100.00, 30, 10, 'prova da 219', 'prova');

  select count(*), coalesce(sum(dinheiro_novo_brl), 0) into v_linhas, v_novo
    from public.v_receita_placar where mes = '1900-01-01' and estado = 'medido';
  if v_linhas <> 1 or v_novo <> 60.00 then
    raise exception 'PROVA_219_FALHOU: placar medido devolveu % linha(s) e R$ % (esperado 1 e 60,00 = 100-30-10)', v_linhas, v_novo;
  end if;

  select coalesce(sum(dinheiro_novo_brl), 0) into v_novo
    from public.v_receita_placar where mes = '1900-01-01';
  if v_novo <> 999999.00 + 60.00 then
    raise exception 'PROVA_219_FALHOU: a proposta sumiu da view — ela tem de aparecer, separada, e nao somar no placar';
  end if;

  delete from receita.leitura where fonte = 'prova da 219';
end $$;

-- PROVA 3 — RELER O MÊS NÃO DOBRA. Duas leituras `medido` do mesmo mês em dias diferentes: vale a última.
do $$
declare v_novo numeric; v_linhas int;
begin
  insert into receita.leitura (linha, data_leitura, mes, estado, entrada_bruta_brl, fonte, medido_por)
  values (2, '1900-02-01', '1900-02-01', 'medido', 500.00, 'prova da 219', 'prova'),
         (2, '1900-02-20', '1900-02-01', 'medido', 800.00, 'prova da 219', 'prova');

  select count(*), coalesce(sum(dinheiro_novo_brl), 0) into v_linhas, v_novo
    from public.v_receita_placar where mes = '1900-02-01';
  if v_linhas <> 1 or v_novo <> 800.00 then
    raise exception 'PROVA_219_FALHOU: duas leituras do mesmo mes viraram % linha(s) e R$ % (esperado 1 e 800,00)', v_linhas, v_novo;
  end if;

  delete from receita.leitura where fonte = 'prova da 219';
end $$;

-- PROVA 4 — o funil não leva PII. A view sai de `v_vendas_leads`, que tem nome e telefone; se um dia
-- alguém acrescentar uma coluna de pessoa aqui, a migration do dia seguinte recusa.
do $$
declare v_pii text;
begin
  select string_agg(column_name, ', ') into v_pii
    from information_schema.columns
   where table_schema = 'public' and table_name = 'v_receita_funil'
     and column_name = any (array['name','contact','phone_e164','company','owner']);
  if v_pii is not null then
    raise exception 'PROVA_219_FALHOU: o funil esta levando dado de pessoa: %', v_pii;
  end if;
end $$;

-- PROVA 5 — a meta é dado e está escrita para o mês corrente; sem ela a tela mostraria falta e ritmo sobre
-- um valor que ninguém definiu.
do $$
declare v record;
begin
  select meta_brl, dias_restantes into v from public.v_receita_meta;
  if v.meta_brl is null then
    raise exception 'PROVA_219_FALHOU: mes corrente sem meta cadastrada em receita.meta';
  end if;
  if v.dias_restantes is null or v.dias_restantes < 0 then
    raise exception 'PROVA_219_FALHOU: dias_restantes invalido (%)', v.dias_restantes;
  end if;
end $$;

-- PROVA 6 — escrita fechada: `authenticated` não tem insert/update/delete em nenhuma tabela nova. A porta
-- de escrita é a RPC com portão, e uma segunda porta seria a que ninguém lembraria de trancar.
do $$
declare v text;
begin
  select string_agg(table_name || ':' || privilege_type, ', ') into v
    from information_schema.role_table_grants
   where grantee = 'authenticated'
     and table_schema in ('receita')
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if v is not null then
    raise exception 'PROVA_219_FALHOU: authenticated tem escrita direta em receita: %', v;
  end if;
end $$;
