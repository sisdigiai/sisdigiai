-- 225 — A página Receita ganha a aba Pacotes: o detalhe de cada pacote passa a ser lido no app (12/11/2026).
--
-- QUEM ESCREVEU: o Agente de Receita, em ramo próprio (`receita/pacotes-no-app`), por pedido do dono no
-- canal dele em 12/11/2026 ("coloca os detalhes dos pacotes no app também").
-- APLICADA em 12/11/2026 pelo próprio Receita, depois de dois ensaios com rollback em que as cinco provas
-- passaram. A carga rodou em seguida: 8 pacotes, 17 documentos.
--
-- O PROBLEMA: a ficha de ideia (224) diz "o detalhe está em `receita/pacotes/<nome>/`", e o dono não abre
-- pasta do Cockpit: lê o app. Os textos de cada pacote (o plano, as peças, as listas, os testes) ficavam
-- fora do alcance de quem decide.
--
-- TRÊS DECISÕES DE DESENHO:
--
-- 1. UMA LINHA POR PACOTE, com os documentos dentro (`docs`, jsonb). São oito pacotes e cerca de vinte
--    documentos; tabela filha só acrescentaria junção. A carga regrava o pacote inteiro.
--
-- 2. O TEXTO ENTRA JÁ ESTRUTURADO EM BLOCOS (título, parágrafo, citação, lista, tabela). A tela desenha
--    bloco por bloco e NÃO interpreta HTML: o que vem do arquivo nunca vira marcação executável.
--
-- 3. SÓ ENTRA TEXTO. Planilha e lista em CSV ficam no Cockpit; aqui vai só o nome e o tamanho (`anexos`),
--    para a tela dizer que existem e onde estão.
--
-- QUEM LÊ: `is_staff()`, como o resto do schema `receita`. Em 12/11/2026 é uma pessoa só (o dono). Entre os
-- pacotes há um dossiê de risco jurídico (`epi-com-grau/CASO-2024.md`): quem der papel de equipe a mais
-- alguém passa a mostrar esse texto a essa pessoa. Se isso deixar de servir, o conserto é um portão mais
-- estreito nesta tabela, não tirar o texto da tela.

create table if not exists receita.pacote (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  ordem integer not null,
  titulo text not null check (btrim(titulo) <> ''),
  risco text,
  caminho text not null check (btrim(caminho) <> ''),
  docs jsonb not null check (jsonb_typeof(docs) = 'array' and jsonb_array_length(docs) > 0),
  anexos jsonb not null default '[]'::jsonb check (jsonb_typeof(anexos) = 'array'),
  ideias jsonb not null default '[]'::jsonb check (jsonb_typeof(ideias) = 'array'),
  atualizado_em timestamptz not null default now()
);

comment on table receita.pacote is 'Uma linha por pacote do Agente de Receita (pasta de Cockpit/receita/pacotes/). Vem da carga Cockpit/scripts/receita-pacotes-sync.mjs. Só texto; anexos ficam no Cockpit.';
comment on column receita.pacote.risco is 'O risco que abre o documento principal do pacote (R-046), como texto. Nulo quando o documento não abre com risco.';
comment on column receita.pacote.docs is 'Documentos do pacote, na ordem de leitura: [{"arquivo": text, "titulo": text, "blocos": [bloco]}]. Bloco: {"t":"h","n":int,"x":text} | {"t":"p","x":text} | {"t":"q","blocos":[bloco]} | {"t":"l","itens":[{"m":text,"n":int,"x":text}]} | {"t":"tab","cab":[text],"linhas":[[text]]} | {"t":"hr"}. Texto puro com negrito/código/riscado em marcação simples; a tela não interpreta HTML.';
comment on column receita.pacote.anexos is 'Arquivos do pacote que NÃO entram no app (planilha, CSV): [{"arquivo": text, "bytes": int}].';
comment on column receita.pacote.ideias is 'Fichas de ideia que citam este pacote: [{"slug": text, "codigo": text, "titulo": text}]. Calculado pela carga.';

-- ─────────────────────────────────────────────────────────────── RLS (a view invoker depende disto)

alter table receita.pacote enable row level security;

drop policy if exists le_staff on receita.pacote;
-- Leitura de staff. Escrita sem política, de propósito: a única porta de escrita é a RPC abaixo.
create policy le_staff on receita.pacote for select to authenticated using (public.is_staff());

grant select on receita.pacote to authenticated;

-- ─────────────────────────────────────────────────────────────── view de contrato (public, invoker)

create or replace view public.v_receita_pacotes
with (security_invoker = true) as
select p.slug, p.ordem, p.titulo, p.risco, p.caminho, p.docs, p.anexos, p.ideias, p.atualizado_em
  from receita.pacote p;

grant select on public.v_receita_pacotes to authenticated;

-- ─────────────────────────────────────────────────────────────── escrita: o pacote inteiro (staff ou a carga)

create or replace function public.rpc_receita_gravar_pacote(
  p_slug text, p_ordem integer, p_titulo text, p_risco text, p_caminho text,
  p_docs jsonb, p_anexos jsonb, p_ideias jsonb)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga grava pacote' using errcode = 'insufficient_privilege';
  end if;

  insert into receita.pacote (slug, ordem, titulo, risco, caminho, docs, anexos, ideias, atualizado_em)
  values (p_slug, p_ordem, p_titulo, nullif(btrim(coalesce(p_risco, '')), ''), p_caminho, p_docs,
          coalesce(p_anexos, '[]'::jsonb), coalesce(p_ideias, '[]'::jsonb), now())
  on conflict (slug) do update
     set ordem = excluded.ordem, titulo = excluded.titulo, risco = excluded.risco,
         caminho = excluded.caminho, docs = excluded.docs, anexos = excluded.anexos,
         ideias = excluded.ideias, atualizado_em = now();
  return p_slug;
end;
$function$;

revoke all on function public.rpc_receita_gravar_pacote(text, integer, text, text, text, jsonb, jsonb, jsonb) from public, anon;
grant execute on function public.rpc_receita_gravar_pacote(text, integer, text, text, text, jsonb, jsonb, jsonb) to authenticated;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — a view existe e roda como QUEM CONSULTA (R-043).
do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'v_receita_pacotes'
       and c.reloptions @> array['security_invoker=true']) then
    raise exception 'PROVA_225_FALHOU: v_receita_pacotes ausente ou sem security_invoker';
  end if;
end $$;

-- PROVA 2 — `authenticated` consegue PEDIR TODAS AS COLUNAS da view. Prova GRANT, não RLS.
do $$
declare v integer;
begin
  set local role authenticated;
  select count(slug || ordem::text || titulo || coalesce(risco, '') || caminho || docs::text || anexos::text
               || ideias::text || atualizado_em::text)
    into v from public.v_receita_pacotes;
  reset role;
exception when others then
  reset role;
  raise exception 'PROVA_225_FALHOU: authenticated nao le a view com todas as colunas: %', sqlerrm;
end $$;

-- PROVA 3 — escrita fechada: `authenticated` não tem insert/update/delete direto, e `anon` não tem nada.
do $$
declare v text;
begin
  select string_agg(grantee || ':' || privilege_type, ', ') into v
    from information_schema.role_table_grants
   where table_schema = 'receita' and table_name = 'pacote'
     and ((grantee = 'authenticated' and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'))
       or grantee = 'anon');
  if v is not null then
    raise exception 'PROVA_225_FALHOU: privilegio indevido em receita.pacote: %', v;
  end if;
  if has_table_privilege('anon', 'public.v_receita_pacotes', 'select') then
    raise exception 'PROVA_225_FALHOU: anon le a view dos pacotes';
  end if;
  if has_function_privilege('anon', 'public.rpc_receita_gravar_pacote(text, integer, text, text, text, jsonb, jsonb, jsonb)', 'execute') then
    raise exception 'PROVA_225_FALHOU: anon executa a gravacao de pacote';
  end if;
end $$;

-- PROVA 4 — ida e volta pela RPC: grava, regrava e o segundo texto substitui o primeiro. A linha de
-- prova sai no fim: rascunho da própria transação.
do $$
declare v record;
begin
  perform public.rpc_receita_gravar_pacote('prova-225', 9999, 'Prova da 225', '  ', 'x/prova-225',
    '[{"arquivo":"A.md","titulo":"a","blocos":[{"t":"p","x":"um"}]}]'::jsonb, null, null);
  perform public.rpc_receita_gravar_pacote('prova-225', 9999, 'Prova da 225 regravada', 'risco escrito', 'x/prova-225',
    '[{"arquivo":"A.md","titulo":"a","blocos":[{"t":"p","x":"dois"}]},{"arquivo":"B.md","titulo":"b","blocos":[]}]'::jsonb,
    '[{"arquivo":"l.csv","bytes":10}]'::jsonb, '[{"slug":"s","codigo":"X00","titulo":"t"}]'::jsonb);
  select titulo, risco, jsonb_array_length(docs) as n_docs, docs #>> '{0,blocos,0,x}' as primeiro,
         jsonb_array_length(anexos) as n_anexos, jsonb_array_length(ideias) as n_ideias
    into v from receita.pacote where slug = 'prova-225';
  delete from receita.pacote where slug = 'prova-225';
  if v.titulo <> 'Prova da 225 regravada' or v.risco <> 'risco escrito' or v.n_docs <> 2 or v.primeiro <> 'dois'
     or v.n_anexos <> 1 or v.n_ideias <> 1 then
    raise exception 'PROVA_225_FALHOU: regravar nao substituiu o pacote (%, %, %, %)', v.titulo, v.risco, v.n_docs, v.primeiro;
  end if;
end $$;

-- PROVA 5 — pacote sem documento é recusado: card que abre em página vazia não entra.
do $$
declare passou boolean := false;
begin
  begin
    perform public.rpc_receita_gravar_pacote('prova-225b', 9998, 'Prova b', null, 'x/prova-225b', '[]'::jsonb, null, null);
    passou := true;
  exception when check_violation then
    passou := false;
  end;
  delete from receita.pacote where slug = 'prova-225b';
  if passou then
    raise exception 'PROVA_225_FALHOU: pacote sem documento foi aceito';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────── a quem serve cada porta (regra 5 do README)

comment on view public.v_receita_pacotes is 'Consumidor: página Receita do app digiai, aba Pacotes, e a ficha de ideia (link para o pacote). Grant: select a authenticated, porque a view é invoker e a RLS de receita.pacote já limita a staff.';
comment on function public.rpc_receita_gravar_pacote(text, integer, text, text, text, jsonb, jsonb, jsonb) is 'Consumidor: a carga Cockpit/scripts/receita-pacotes-sync.mjs e staff. Grant: execute a authenticated, porque o portão está dentro (is_staff ou a identidade da carga). Regrava o pacote inteiro.';
