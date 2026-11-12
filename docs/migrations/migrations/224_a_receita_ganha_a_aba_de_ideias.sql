-- 224 — A página Receita ganha a aba Ideias, e a escolha de foco do dono vira dado (11/11/2026).
--
-- QUEM ESCREVEU: o Agente de Receita, em ramo próprio (`receita/aba-ideias`), por pedido do dono no canal
-- dele em 11/11/2026. APLICADA em 11/11/2026 à noite pelo próprio Receita, por ordem direta do dono no canal dele
-- ("publica tu"), depois de um ensaio com rollback em que as cinco provas passaram. A carga rodou em seguida: 48 fichas.
--
-- O PROBLEMA: em dois dias o Receita escreveu 48 ideias em sete arquivos de rodada. O dono pediu um lugar
-- só para ver todas, abrir a ficha completa de cada uma e ESCOLHER o que a casa foca. Sem isso a escolha
-- mora em conversa, e conversa não é lida por agente nenhum no dia seguinte.
--
-- DUAS DECISÕES DE DESENHO, escritas porque mudam o que pode dar errado:
--
-- 1. A FICHA e a ESCOLHA moram na mesma linha, mas têm portas diferentes. A ficha entra pela carga
--    (`Cockpit/scripts/receita-ideias-sync.mjs`, a partir de `Cockpit/receita/ideias/*.md`). A escolha só
--    entra por gente logada: a carga chega como `postgres` e é RECUSADA na função de escolher. Agente que
--    prepara a lista não pode ser quem decide o foco (ordem de agente não autoriza).
--    E a carga, ao regravar uma ficha, NÃO toca nas colunas da escolha: recarregar o texto não desfaz o
--    que o dono decidiu.
--
-- 2. O veredito e a escolha são texto SEM ACENTO com `check`. Já houve acento virando U+FFFD no caminho
--    do terminal para o banco nesta casa; chave de filtro não pode depender disso. O rótulo bonito é da tela.

create table if not exists receita.ideia (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  codigo text not null unique check (btrim(codigo) <> ''),
  ordem integer not null,
  titulo text not null check (btrim(titulo) <> ''),
  grupo text not null check (btrim(grupo) <> ''),
  veredito text not null check (veredito in ('norte', 'forte', 'media', 'fraca', 'nao_fazer',
                                             'congelada', 'estacionada', 'em_andamento', 'morta')),
  resumo text not null check (btrim(resumo) <> ''),
  conta text,
  dias text,
  prova text,
  origem text,
  secoes jsonb not null default '[]'::jsonb check (jsonb_typeof(secoes) = 'array'),
  escolha text check (escolha in ('foco', 'depois', 'nao')),
  escolha_nota text,
  escolha_por text,
  escolha_em timestamptz,
  atualizado_em timestamptz not null default now(),
  -- Escolha sem autor e sem hora é boato. Ou vêm os três, ou nenhum.
  check ((escolha is null and escolha_por is null and escolha_em is null)
      or (escolha is not null and escolha_por is not null and escolha_em is not null))
);

comment on table receita.ideia is 'Uma linha por ideia do Agente de Receita. A ficha vem de Cockpit/receita/ideias/*.md pela carga; a escolha (foco, depois, nao) só entra por pessoa logada.';
comment on column receita.ideia.secoes is 'Lista de seções da ficha: [{"titulo": text, "itens": [{"tipo": "p"|"li", "texto": text}]}]. Texto puro; a tela não interpreta HTML.';
comment on column receita.ideia.conta is 'Texto da conta como o Receita escreveu. É hipótese salvo quando o próprio texto diz "medido". Não é número de placar.';
comment on column receita.ideia.escolha is 'foco = a casa trabalha nisto agora; depois = fica na fila; nao = descartada pelo dono. Nulo = ainda não escolhida.';

-- ─────────────────────────────────────────────────────────────── RLS (a view invoker depende disto)

alter table receita.ideia enable row level security;

drop policy if exists le_staff on receita.ideia;
-- Leitura de staff, como o resto do schema. Escrita sem política nenhuma, de propósito: as duas portas
-- de escrita são as RPCs abaixo.
create policy le_staff on receita.ideia for select to authenticated using (public.is_staff());

grant select on receita.ideia to authenticated;

-- ─────────────────────────────────────────────────────────────── view de contrato (public, invoker)

create or replace view public.v_receita_ideias
with (security_invoker = true) as
select i.slug, i.codigo, i.ordem, i.titulo, i.grupo, i.veredito, i.resumo, i.conta, i.dias, i.prova,
       i.origem, i.secoes, i.escolha, i.escolha_nota, i.escolha_por, i.escolha_em, i.atualizado_em
  from receita.ideia i;

grant select on public.v_receita_ideias to authenticated;

-- ─────────────────────────────────────────────────────────────── escrita 1: a ficha (staff ou a carga)

create or replace function public.rpc_receita_gravar_ideia(
  p_slug text, p_codigo text, p_ordem integer, p_titulo text, p_grupo text, p_veredito text,
  p_resumo text, p_conta text, p_dias text, p_prova text, p_origem text, p_secoes jsonb)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
begin
  if not (public.is_staff() or session_user = 'postgres') then
    raise exception 'apenas staff ou a carga grava ficha de ideia' using errcode = 'insufficient_privilege';
  end if;

  insert into receita.ideia (slug, codigo, ordem, titulo, grupo, veredito, resumo, conta, dias, prova,
                             origem, secoes, atualizado_em)
  values (p_slug, p_codigo, p_ordem, p_titulo, p_grupo, p_veredito, p_resumo, p_conta, p_dias, p_prova,
          p_origem, coalesce(p_secoes, '[]'::jsonb), now())
  on conflict (slug) do update
     -- As quatro colunas `escolha*` ficam de fora de propósito: recarregar a ficha não desfaz a decisão.
     set codigo = excluded.codigo, ordem = excluded.ordem, titulo = excluded.titulo,
         grupo = excluded.grupo, veredito = excluded.veredito, resumo = excluded.resumo,
         conta = excluded.conta, dias = excluded.dias, prova = excluded.prova,
         origem = excluded.origem, secoes = excluded.secoes, atualizado_em = now();
  return p_slug;
end;
$function$;

-- ─────────────────────────────────────────────────────────────── escrita 2: a escolha (só pessoa logada)

create or replace function public.rpc_receita_escolher_ideia(
  p_slug text, p_escolha text, p_nota text default null)
returns text
language plpgsql
security definer
set search_path to ''
as $function$
declare v_quem text;
begin
  -- Sem `or session_user = 'postgres'`: a carga NÃO escolhe. Quem prepara a lista não decide o foco.
  if not public.is_staff() then
    raise exception 'apenas pessoa da equipe escolhe o foco' using errcode = 'insufficient_privilege';
  end if;
  if p_escolha is not null and p_escolha not in ('foco', 'depois', 'nao') then
    raise exception 'escolha invalida: % (use foco, depois, nao, ou nulo para limpar)', p_escolha;
  end if;

  v_quem := coalesce(nullif(btrim(auth.jwt() ->> 'email'), ''), auth.uid()::text);

  update receita.ideia
     set escolha = p_escolha,
         escolha_nota = case when p_escolha is null then null else nullif(btrim(coalesce(p_nota, '')), '') end,
         escolha_por = case when p_escolha is null then null else v_quem end,
         escolha_em = case when p_escolha is null then null else now() end
   where slug = p_slug;
  if not found then
    raise exception 'ideia % nao existe', p_slug;
  end if;
  return p_slug;
end;
$function$;

revoke all on function public.rpc_receita_gravar_ideia(text, text, integer, text, text, text, text, text, text, text, text, jsonb) from public, anon;
revoke all on function public.rpc_receita_escolher_ideia(text, text, text) from public, anon;
grant execute on function public.rpc_receita_gravar_ideia(text, text, integer, text, text, text, text, text, text, text, text, jsonb) to authenticated;
grant execute on function public.rpc_receita_escolher_ideia(text, text, text) to authenticated;

-- ─────────────────────────────────────────────────────────────── PROVAS

-- PROVA 1 — a view existe e roda como QUEM CONSULTA (R-043).
do $$
begin
  if not exists (
    select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
     where n.nspname = 'public' and c.relname = 'v_receita_ideias'
       and c.reloptions @> array['security_invoker=true']) then
    raise exception 'PROVA_224_FALHOU: v_receita_ideias ausente ou sem security_invoker';
  end if;
end $$;

-- PROVA 2 — `authenticated` consegue PEDIR TODAS AS COLUNAS da view (checklist 5.1 do AGENTS.md: a trava
-- corre como postgres e postgres lê tudo; `count(*)` é podado e não prova grant). Aqui prova GRANT, não RLS.
do $$
declare v integer;
begin
  set local role authenticated;
  select count(slug || codigo || titulo || grupo || veredito || resumo || coalesce(conta, '') || coalesce(dias, '')
               || coalesce(prova, '') || coalesce(origem, '') || secoes::text || coalesce(escolha, '')
               || coalesce(escolha_nota, '') || coalesce(escolha_por, '') || coalesce(escolha_em::text, '')
               || ordem::text || atualizado_em::text)
    into v from public.v_receita_ideias;
  reset role;
exception when others then
  reset role;
  raise exception 'PROVA_224_FALHOU: authenticated nao le a view com todas as colunas: %', sqlerrm;
end $$;

-- PROVA 3 — escrita fechada: `authenticated` não tem insert/update/delete direto na tabela nova.
do $$
declare v text;
begin
  select string_agg(privilege_type, ', ') into v
    from information_schema.role_table_grants
   where grantee = 'authenticated' and table_schema = 'receita' and table_name = 'ideia'
     and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE');
  if v is not null then
    raise exception 'PROVA_224_FALHOU: authenticated tem escrita direta em receita.ideia: %', v;
  end if;
end $$;

-- PROVA 4 — ida e volta da ficha pela RPC, e a regra que importa: REGRAVAR A FICHA NÃO APAGA A ESCOLHA.
-- A escolha de teste é escrita direto na tabela (a migration corre como postgres, que a RPC de escolher
-- recusa — é a prova 5). A linha de teste sai no fim: rascunho da própria transação.
do $$
declare v record;
begin
  perform public.rpc_receita_gravar_ideia('prova-224', 'P224', 9999, 'Prova da 224', 'prova', 'fraca',
    'linha de prova', 'c1', 'd1', 'p1', 'o1', '[{"titulo":"t","itens":[{"tipo":"p","texto":"x"}]}]'::jsonb);
  update receita.ideia set escolha = 'foco', escolha_por = 'prova', escolha_em = now() where slug = 'prova-224';
  perform public.rpc_receita_gravar_ideia('prova-224', 'P224', 9999, 'Prova da 224 regravada', 'prova', 'media',
    'linha de prova', 'c2', 'd2', 'p2', 'o2', '[]'::jsonb);
  select titulo, veredito, conta, escolha, escolha_por into v from receita.ideia where slug = 'prova-224';
  delete from receita.ideia where slug = 'prova-224';
  if v.titulo <> 'Prova da 224 regravada' or v.veredito <> 'media' or v.conta <> 'c2' then
    raise exception 'PROVA_224_FALHOU: regravar nao atualizou a ficha (%, %, %)', v.titulo, v.veredito, v.conta;
  end if;
  if v.escolha is distinct from 'foco' or v.escolha_por is distinct from 'prova' then
    raise exception 'PROVA_224_FALHOU: regravar a ficha apagou a escolha (ficou %, %)', v.escolha, v.escolha_por;
  end if;
end $$;

-- PROVA 5 — a carga NÃO escolhe. A migration corre como postgres, que é exatamente a identidade da carga.
do $$
declare passou boolean := false;
begin
  perform public.rpc_receita_gravar_ideia('prova-224b', 'P224B', 9998, 'Prova da 224 b', 'prova', 'fraca',
    'linha de prova', null, null, null, null, '[]'::jsonb);
  begin
    perform public.rpc_receita_escolher_ideia('prova-224b', 'foco', 'a carga tentando escolher');
    passou := true;
  exception when insufficient_privilege then
    passou := false;
  end;
  delete from receita.ideia where slug = 'prova-224b';
  if passou then
    raise exception 'PROVA_224_FALHOU: a carga conseguiu escolher o foco — a porta da escolha esta aberta para agente';
  end if;
end $$;

-- ─────────────────────────────────────────────────────────────── a quem serve cada porta (regra 5 do README)

comment on view public.v_receita_ideias is 'Consumidor: página Receita do app digiai, aba Ideias, e qualquer agente que precise saber o foco escolhido. Grant: select a authenticated, porque a view é invoker e a RLS de receita.ideia já limita a staff.';
comment on function public.rpc_receita_gravar_ideia(text, text, integer, text, text, text, text, text, text, text, text, jsonb) is 'Consumidor: a carga Cockpit/scripts/receita-ideias-sync.mjs e staff. Grant: execute a authenticated, porque o portão está dentro (is_staff ou a identidade da carga). Não toca nas colunas da escolha.';
comment on function public.rpc_receita_escolher_ideia(text, text, text) is 'Consumidor: o botão de escolha da aba Ideias. Grant: execute a authenticated, porque o portão está dentro (só is_staff). A carga é recusada de propósito: quem prepara a lista não decide o foco.';
