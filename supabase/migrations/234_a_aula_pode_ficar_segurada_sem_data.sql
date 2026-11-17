-- 234 — A aula pode ficar segurada, sem data, sem a tela mostrar prazo que caiu (17/11/2026).
--
-- QUEM ESCREVEU: o Agente de Receita, em ramo próprio (`receita/aula-segurada`), no que é da página Receita.
-- POR QUÊ: em 17/11/2026 o dono segurou a aula de 24/11 no canal do MKT ("acho melhor focarmos em estruturar
-- tudo e depois soltar a aula"; "pode segurar a aula"). O MKT tirou os agendamentos. A aba Aula continuava
-- mostrando "dias até a aula", o mínimo de 3 vagas até 22/11 e passos com prazo vencendo: prazo que não vale.
--
-- O DESENHO: duas colunas na edição. `segurada_em` (o dia em que o dono segurou; nulo = a edição vale) e
-- `segurada_nota` (o que ele disse, em uma frase). `quando` e `prazo_vendas` FICAM como estavam: são a data
-- que caiu, e a tela a mostra como "era". Não viram nulos para não quebrar a ordenação nem a conta das
-- ligações. Porta própria (`rpc_receita_segurar_aula`) para não mudar a assinatura das funções da 228 e da 230;
-- chamada com data nula, a edição volta a valer (o dono deu data nova e a carga regrava `quando`).

alter table receita.aula
  add column if not exists segurada_em date,
  add column if not exists segurada_nota text;

comment on column receita.aula.segurada_em is 'Dia em que o dono segurou esta edição. Nulo = a edição vale e a data de `quando` está de pé. Preenchido = `quando` e `prazo_vendas` são a data que caiu; a tela não conta dias nem cobra mínimo.';
comment on column receita.aula.segurada_nota is 'O que o dono disse ao segurar, em uma frase, com o canal. Vem da carga.';

-- Colunas novas no FIM: `create or replace view` não deixa mudar a ordem das que já existem.
create or replace view public.v_receita_aula
with (security_invoker = true) as
select a.slug, a.titulo, a.quando, a.preco_brl, a.minimo_ao_vivo, a.prazo_vendas, a.prazo_produto,
       a.produto_filtro, a.produto_criado, a.link_inscricao, a.pode_do_dono, a.atualizado_em,
       coalesce(v.vendas, 0)::integer as vendas,
       coalesce(v.vendas_brl, 0)::numeric(12, 2) as vendas_brl,
       v.ultima_venda,
       coalesce(l.na_lista, 0)::integer as ligacoes_na_lista,
       coalesce(l.faladas, 0)::integer as ligacoes_faladas,
       coalesce(l.nao_atenderam, 0)::integer as ligacoes_nao_atenderam,
       coalesce(l.nao_ligar, 0)::integer as ligacoes_nao_ligar,
       a.passos,
       a.segurada_em,
       a.segurada_nota
  from receita.aula a
  left join lateral (
    select count(*) as vendas, sum(ev.valor) as vendas_brl, max(ev.dia) as ultima_venda
      from public.v_vendas_eventos ev
     where ev.canal = 'hotmart'
       and ev.produto_nome_origem ilike '%' || a.produto_filtro || '%'
       and lower(coalesce(ev.status_origem, '')) in ('approved', 'complete', 'completed')) v on true
  left join lateral (
    select count(*) as na_lista,
           count(*) filter (where d.resultado = 'falou') as faladas,
           count(*) filter (where d.resultado = 'nao_atendeu') as nao_atenderam,
           count(*) filter (where d.resultado = 'nao_ligar') as nao_ligar
      from receita.lista_dia d
     where d.dia <= (a.quando at time zone 'America/Sao_Paulo')::date) l on true;

create or replace function public.rpc_receita_segurar_aula(p_slug text, p_segurada_em date, p_nota text)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga segura ou solta a aula' using errcode = 'insufficient_privilege';
  end if;
  -- Segurar sem dizer por quê não entra: a tela mostra a frase ao dono.
  if p_segurada_em is not null and coalesce(btrim(p_nota), '') = '' then
    raise exception 'aula segurada precisa da nota (o que o dono disse)';
  end if;
  update receita.aula
     set segurada_em = p_segurada_em,
         segurada_nota = case when p_segurada_em is null then null else btrim(p_nota) end,
         atualizado_em = now()
   where slug = p_slug;
  if not found then
    raise exception 'aula % nao existe', p_slug;
  end if;
  return case when p_segurada_em is null then 'vale' else 'segurada' end;
end;
$function$;

revoke all on function public.rpc_receita_segurar_aula(text, date, text) from public, anon;
grant execute on function public.rpc_receita_segurar_aula(text, date, text) to authenticated;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — a view continua invoker e entrega as colunas novas a quem consulta (prova GRANT).
do $$
declare v integer;
begin
  if not exists (select 1 from pg_class c join pg_namespace s on s.oid = c.relnamespace
                  where s.nspname = 'public' and c.relname = 'v_receita_aula' and c.reloptions @> array['security_invoker=true']) then
    raise exception 'PROVA_234_FALHOU: v_receita_aula perdeu o security_invoker';
  end if;
  set local role authenticated;
  select count(slug || coalesce(segurada_em::text, '') || coalesce(segurada_nota, '') || passos::text) into v from public.v_receita_aula;
  reset role;
exception when others then
  reset role;
  raise exception 'PROVA_234_FALHOU: authenticated nao le as colunas novas na view: %', sqlerrm;
end $$;

-- PROVA 2 — anon não executa; segurar sem nota é recusado; segurar, ler pela view e soltar funciona; nada sobra.
do $$
declare recusou boolean := false; v record; depois record;
begin
  if has_function_privilege('anon', 'public.rpc_receita_segurar_aula(text, date, text)', 'execute') then
    raise exception 'PROVA_234_FALHOU: anon executa a porta de segurar a aula';
  end if;
  perform public.rpc_receita_gravar_aula('prova-234', 'Aula de prova', now() + interval '10 days', 97, 3,
    current_date + 8, current_date + 1, 'produto que nao existe 234', false, null, false);
  begin
    perform public.rpc_receita_segurar_aula('prova-234', current_date, '  ');
  exception when others then recusou := true;
  end;
  perform public.rpc_receita_segurar_aula('prova-234', current_date, 'segurada na prova');
  select segurada_em, segurada_nota into v from public.v_receita_aula where slug = 'prova-234';
  perform public.rpc_receita_segurar_aula('prova-234', null, null);
  select segurada_em, segurada_nota into depois from public.v_receita_aula where slug = 'prova-234';
  delete from receita.aula where slug = 'prova-234';
  if not recusou then
    raise exception 'PROVA_234_FALHOU: segurar sem nota foi aceito';
  end if;
  if v.segurada_em is distinct from current_date or v.segurada_nota <> 'segurada na prova' then
    raise exception 'PROVA_234_FALHOU: a aula segurada nao voltou pela view (%, %)', v.segurada_em, v.segurada_nota;
  end if;
  if depois.segurada_em is not null or depois.segurada_nota is not null then
    raise exception 'PROVA_234_FALHOU: soltar a aula nao limpou a marca';
  end if;
  if exists (select 1 from receita.aula where slug like 'prova-234%') then
    raise exception 'PROVA_234_FALHOU: sobrou linha de prova';
  end if;
end $$;

comment on view public.v_receita_aula is 'Consumidor: página Receita do app digiai, aba Aula. Grant: select a authenticated; invoker: a RLS de receita.aula limita a staff, e as vendas vêm de v_vendas_eventos com as políticas dela. `passos` é o quadro do que falta até o dia; `segurada_em` preenchido = edição segurada pelo dono, a data de `quando` caiu.';
comment on function public.rpc_receita_segurar_aula(text, date, text) is 'Consumidor: a carga Cockpit/scripts/receita-controle-sync.mjs e staff. Grant: execute a authenticated, com o portão dentro (is_staff ou a identidade da carga). Data preenchida segura a edição (nota obrigatória); data nula solta.';
