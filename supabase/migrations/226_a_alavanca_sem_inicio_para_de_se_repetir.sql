-- 226 — A alavanca sem data de início para de se repetir a cada carga (12/11/2026).
--
-- QUEM ESCREVEU: o Agente de Receita, em ramo próprio (`receita/alavanca-sem-repetir`), com o "sim,
-- conserta" do dono no canal dele em 12/11/2026. A tabela e a função nasceram na 219 e na 220.
-- APLICADA em 12/11/2026 pelo próprio Receita, depois de ensaio com rollback em que as seis provas passaram.
-- Prova de uso: duas cargas seguidas do placar deixaram as mesmas 12 alavancas, nenhuma repetida.
--
-- O DEFEITO: a chave de `receita.alavanca` é `unique (nome, inicio)`. Alavanca ainda não iniciada grava
-- `inicio` nulo, e para o Postgres nulo não é igual a nulo: o `on conflict (nome, inicio)` nunca casava,
-- e CADA CARGA do placar criava outra linha para toda alavanca não iniciada. Em 12/11 a página mostrou o
-- Kit do Pulso duas vezes, uma "em curso" e outra "congelada". As três linhas repetidas foram tiradas à
-- mão antes desta migration (a mais antiga de cada par).
--
-- O CONSERTO, em duas partes:
--
-- 1. A chave passa a tratar nulo como igual (`nulls not distinct`). O `on conflict (nome, inicio)` da
--    função continua o mesmo e passa a casar também quando as duas linhas não têm início.
--
-- 2. O segundo defeito, que ainda não tinha acontecido: alavanca gravada SEM início e depois regravada COM
--    início criaria uma segunda linha, e a primeira ficaria para sempre como "não iniciada". A função agora
--    faz a linha sem início ganhar a data, em vez de nascer outra.
--
-- O QUE NÃO MUDA: o mesmo nome com DUAS datas de início diferentes continua sendo duas linhas. É o
-- desenho da 219 (a mesma alavanca pode ser tentada de novo mais tarde), e a prova 4 o segura.

-- Trava de entrada: se ainda houver par repetido, a chave nova não nasce — e a mensagem diz o porquê.
do $$
declare v text;
begin
  select string_agg(nome || ' (' || n || ')', '; ') into v
    from (select nome, count(*) n from receita.alavanca group by nome, inicio having count(*) > 1) x;
  if v is not null then
    raise exception 'TRAVA_226: ha alavanca repetida com o mesmo nome e o mesmo inicio: %. Tire a repetida antes.', v;
  end if;
end $$;

alter table receita.alavanca drop constraint alavanca_nome_inicio_key;
alter table receita.alavanca add constraint alavanca_nome_inicio_key unique nulls not distinct (nome, inicio);

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

  -- A alavanca que estava "não iniciada" e agora chega com data É A MESMA: ela ganha a data. Só não vale
  -- quando já existe outra linha com este nome e esta data (aí o `on conflict` abaixo resolve).
  if p_inicio is not null then
    update receita.alavanca a
       set inicio = p_inicio
     where a.nome = p_nome and a.inicio is null
       and not exists (select 1 from receita.alavanca b where b.nome = p_nome and b.inicio = p_inicio);
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

-- ─────────────────────────────────────────────────────────────── PROVAS
-- Todas gravam com nome próprio de prova e apagam no fim: rascunho da própria transação.

-- PROVA 1 — a chave trata nulo como igual.
do $$
begin
  if not exists (
    select 1 from pg_index i join pg_class c on c.oid = i.indexrelid
     where c.relname = 'alavanca_nome_inicio_key' and i.indrelid = 'receita.alavanca'::regclass
       and i.indisunique and i.indnullsnotdistinct) then
    raise exception 'PROVA_226_FALHOU: a chave (nome, inicio) nao esta como nulls not distinct';
  end if;
end $$;

-- PROVA 2 — O DEFEITO: gravar duas vezes a mesma alavanca SEM início dá UMA linha, com o segundo texto.
do $$
declare n int; v record; a bigint; b bigint;
begin
  a := public.rpc_receita_gravar_alavanca('prova-226 sem inicio', 2::smallint, 'prova', null, 'em_curso', null, null, 0, null, 'primeira');
  b := public.rpc_receita_gravar_alavanca('prova-226 sem inicio', 3::smallint, 'prova', null, 'congelada', null, null, 0, 'porque sim', 'segunda');
  select count(*) into n from receita.alavanca where nome = 'prova-226 sem inicio';
  select estado, obs, linha into v from receita.alavanca where nome = 'prova-226 sem inicio' limit 1;
  delete from receita.alavanca where nome = 'prova-226 sem inicio';
  if n <> 1 or a <> b then
    raise exception 'PROVA_226_FALHOU: gravar duas vezes sem inicio deu % linha(s) (ids % e %)', n, a, b;
  end if;
  if v.estado <> 'congelada' or v.obs <> 'segunda' or v.linha <> 3 then
    raise exception 'PROVA_226_FALHOU: a segunda gravacao nao substituiu a primeira (%, %, %)', v.estado, v.obs, v.linha;
  end if;
end $$;

-- PROVA 3 — a não iniciada que ganha data continua sendo UMA linha, agora com a data.
do $$
declare n int; v record; a bigint; b bigint;
begin
  a := public.rpc_receita_gravar_alavanca('prova-226 ganha data', 1::smallint, 'prova', null, 'em_curso');
  b := public.rpc_receita_gravar_alavanca('prova-226 ganha data', 1::smallint, 'prova', date '2026-11-12', 'em_curso', null, null, 10, null, 'comecou');
  select count(*) into n from receita.alavanca where nome = 'prova-226 ganha data';
  select inicio, resultado_brl, obs into v from receita.alavanca where nome = 'prova-226 ganha data' limit 1;
  delete from receita.alavanca where nome = 'prova-226 ganha data';
  if n <> 1 or a <> b or v.inicio <> date '2026-11-12' or v.resultado_brl <> 10 or v.obs <> 'comecou' then
    raise exception 'PROVA_226_FALHOU: a nao iniciada que ganhou data ficou em % linha(s) (ids % e %; inicio %)', n, a, b, v.inicio;
  end if;
end $$;

-- PROVA 4 — o que NÃO muda: o mesmo nome com duas datas diferentes são duas linhas.
do $$
declare n int;
begin
  perform public.rpc_receita_gravar_alavanca('prova-226 duas datas', 1::smallint, 'prova', date '2026-10-01', 'encerrada', null, null, 0, 'primeira tentativa');
  perform public.rpc_receita_gravar_alavanca('prova-226 duas datas', 1::smallint, 'prova', date '2026-11-12', 'em_curso');
  select count(*) into n from receita.alavanca where nome = 'prova-226 duas datas';
  delete from receita.alavanca where nome = 'prova-226 duas datas';
  if n <> 2 then
    raise exception 'PROVA_226_FALHOU: duas datas de inicio diferentes viraram % linha(s); deviam ser 2', n;
  end if;
end $$;

-- PROVA 5 — a regra antiga continua de pé: encerrada sem veredito é recusada.
do $$
declare passou boolean := false;
begin
  begin
    perform public.rpc_receita_gravar_alavanca('prova-226 sem veredito', 1::smallint, 'prova', null, 'encerrada');
    passou := true;
  exception when others then
    passou := false;
  end;
  delete from receita.alavanca where nome = 'prova-226 sem veredito';
  if passou then
    raise exception 'PROVA_226_FALHOU: alavanca encerrada sem veredito foi aceita';
  end if;
end $$;

-- PROVA 6 — nenhuma linha de prova ficou, e as alavancas reais continuam uma por nome e início.
do $$
begin
  if exists (select 1 from receita.alavanca where nome like 'prova-226%') then
    raise exception 'PROVA_226_FALHOU: sobrou linha de prova em receita.alavanca';
  end if;
  if exists (select 1 from receita.alavanca group by nome, inicio having count(*) > 1) then
    raise exception 'PROVA_226_FALHOU: ha alavanca repetida depois do conserto';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────── a quem serve a porta (regra 5 do README)

comment on function public.rpc_receita_gravar_alavanca(text, smallint, text, date, text, numeric, integer, numeric, text, text) is 'Consumidor: a carga Cockpit/scripts/receita-sync.mjs e staff. Grant: execute a authenticated, porque o portão está dentro (is_staff ou a identidade da carga). Uma linha por (nome, início); sem início conta como igual a sem início, e a não iniciada que chega com data ganha a data em vez de virar outra linha.';
