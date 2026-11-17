-- 235 · A Lousa recebe de fora (Pulso e Limelight), e cada emissor abre só a porta dele
--
-- POR QUE AGORA: o Pulso e o Limelight já enviam (134 e N itens) e recebem 404 da `lousa-entrada`, que
-- ainda não existe. A etapa 1 da Lousa mostra só o que o MKT publica; estas duas origens publicam nas
-- contas delas e não apareciam em lugar nenhum.
--
-- UM DEFEITO MEU QUE ESTA MIGRATION FECHA, e que eu achei medindo antes de escrever: a `cortes-gravar`
-- (no ar desde 17/11, 01h44) aceita **qualquer emissor ativo** de `ops.emissor_externo`. Como eu cadastrei
-- o Limelight nessa tabela para a Lousa, a chave dele podia, hoje, gravar episódio no schema `cortes`.
-- Ninguém usou — `ultima_entrega` é nula e o `cortes` tem 0 episódios —, mas a porta estava aberta.
-- O conserto: cada emissor passa a declarar **em que portas entra**, e o padrão é NENHUMA.
--
-- R-037: a autorização vem do banco, não de constante na função. R-043: as duas funções novas são DEFINER
-- com filtro explícito de papel escrito dentro. R-044: a tabela nasce em `ops`; `public` só recebe a view.

begin;

-- ---------------------------------------------------------------------------------------------------
-- 1. Porta por emissor — fail-closed
-- ---------------------------------------------------------------------------------------------------

alter table ops.emissor_externo
  add column if not exists portas text[] not null default '{}';

comment on column ops.emissor_externo.portas is
  'Em que funções este emissor pode entrar (ex.: {lousa}, {cortes}). Vazio = nenhuma. '
  'Emissor novo nasce sem porta de propósito: quem cadastra tem de dizer para quê.';

-- O Limelight foi cadastrado para a Lousa. Ele NÃO entra no cortes.
update ops.emissor_externo set portas = array['lousa'] where nome = 'limelight';

-- O Pulso. Chave conferida por mim em 17/11, não pelo relato: 44 bytes SPKI, tipo ed25519,
-- sha256 da SPKI 96cccd5759a3a3872f1583ff59732335183154dad4e813fa4ca684c2787e4505, e uma assinatura
-- falsa é recusada por ela. Arquivo: Cockpit/chaves-publicas/lousa-pulso.txt.
insert into ops.emissor_externo (nome, chave_publica, ativo, descricao, registrado_por, portas)
values ('pulso', 'MCowBQYDK2VwAyEApGI8P6jlUBOFmVU+IVbwFWfQiiHdxWbOfO6aiqxUaBU=', true,
        'Motor do Pulso: segundo destino do mesmo envio que vai à torre do GJ (lousa).',
        'app digiai, conferida em 17/11/2026', array['lousa'])
on conflict (nome) do update
  set chave_publica = excluded.chave_publica, ativo = true, portas = excluded.portas;

-- A única leitura de chave que as funções de borda fazem. Centralizar aqui é o que impede uma função
-- futura de esquecer a porta e aceitar um emissor que nunca foi autorizado para ela.
create or replace function ops.fn_emissor_chave(p_nome text, p_porta text)
returns text
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'fn_emissor_chave: só a borda da casa consulta emissor' using errcode = '42501';
  end if;

  return (select chave_publica from ops.emissor_externo
           where nome = p_nome and ativo and p_porta = any(portas));
end;
$$;

revoke all on function ops.fn_emissor_chave(text, text) from public, anon, authenticated;
grant execute on function ops.fn_emissor_chave(text, text) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- 2. A peça que vem de fora
-- ---------------------------------------------------------------------------------------------------

create table if not exists ops.lousa_peca (
  origem        text not null,
  publicador    text not null,
  origem_ref    text not null,
  marca         text not null,
  marca_nome    text,
  accent_hex    text,
  conta         text not null,
  conta_nome    text,
  rede          text not null,
  tipo          text not null,
  quando        timestamptz,
  estado        text not null,
  arquivo_hash  text,
  link          text,
  erro          text,
  titulo        text,
  atualizado_em timestamptz not null default now(),
  recebido_em   timestamptz not null default now(),

  -- A chave leva o PUBLICADOR, e isso veio de uma medição, não de gosto: a `v_mkt_lousa` já traz 135
  -- linhas com origem='pulso' e publicador='mkt' (cortes do Pulso que o MKT publica). Sem o publicador,
  -- o envio do Pulso casaria com essas linhas e a segunda apagaria a primeira em silêncio.
  primary key (origem, publicador, origem_ref),

  -- Hash torto não acusa arquivo repetido, e acusar repetição é a razão de ele existir.
  constraint lousa_peca_hash_hex   check (arquivo_hash is null or arquivo_hash ~ '^[0-9a-f]{64}$'),
  -- Handle com arroba e handle sem arroba viram duas contas para a mesma conta (ADR-0066).
  constraint lousa_peca_conta_limpa check (conta = lower(conta) and conta !~ '^@' and conta <> ''),
  constraint lousa_peca_estado      check (estado <> '' and length(estado) <= 40)
);

comment on table ops.lousa_peca is
  'Agenda que Pulso e Limelight enviam à Lousa, assinada (Ed25519) pela função `lousa-entrada`. '
  'O que o MKT publica NÃO entra aqui: vem da v_mkt_lousa. A união é a view public.v_lousa.';

alter table ops.lousa_peca enable row level security;

drop policy if exists lousa_peca_equipe on ops.lousa_peca;
create policy lousa_peca_equipe on ops.lousa_peca
  for select to authenticated using (public.is_staff());

grant select on ops.lousa_peca to authenticated;

create index if not exists lousa_peca_quando_idx on ops.lousa_peca (quando);

-- ---------------------------------------------------------------------------------------------------
-- 3. A gravação — idempotente, normalizadora, e que RECUSA linha por linha em vez de engolir
-- ---------------------------------------------------------------------------------------------------

-- `session_user = 'postgres'` entra no portão para as provas desta migration poderem exercitar a função
-- de verdade, com dado real, dentro da transação. Não alarga nada: quem já está ligado como `postgres`
-- é dono da tabela e escreveria nela de qualquer jeito.
create or replace function ops.fn_lousa_gravar(p_origem text, p_linhas jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ops, public, pg_temp
as $$
declare
  l            jsonb;
  v_campo      text;
  v_conta      text;
  v_hash       text;
  v_pub        text;
  v_quando     timestamptz;
  v_gravadas   int := 0;
  v_recebidas  int := 0;
  v_ignoradas  jsonb := '[]'::jsonb;
  v_motivo     text;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'fn_lousa_gravar: só a função de entrada grava aqui' using errcode = '42501';
  end if;

  if jsonb_typeof(p_linhas) <> 'array' then
    raise exception 'fn_lousa_gravar: a carga tem de ser uma lista' using errcode = '22023';
  end if;

  for l in select * from jsonb_array_elements(p_linhas) loop
    v_recebidas := v_recebidas + 1;
    v_motivo := null;

    begin
      -- Origem do corpo tem de bater com a do cabeçalho assinado: emissor não escreve como se fosse outro.
      if coalesce(l->>'origem', '') <> p_origem then
        v_motivo := format('origem %L no corpo não bate com %L do cabeçalho', l->>'origem', p_origem);
        raise exception 'recusa';
      end if;

      -- O publicador é quem está autenticado. Ausente vale; diferente é RECUSADO, não reescrito calado:
      -- aceitar publicador de terceiro deixaria um emissor duplicar na tela o que outro já publica.
      v_pub := coalesce(nullif(l->>'publicador', ''), p_origem);
      if v_pub <> p_origem then
        v_motivo := format('publicador %L não é a origem autenticada %L', v_pub, p_origem);
        raise exception 'recusa';
      end if;

      if coalesce(l->>'origem_ref', '') = '' then
        v_motivo := 'origem_ref vazio: sem ele a gravação não é idempotente';
        raise exception 'recusa';
      end if;

      foreach v_campo in array array['marca', 'conta', 'rede', 'tipo', 'estado'] loop
        if coalesce(l->>v_campo, '') = '' then
          v_motivo := format('%s vazio', v_campo);
          raise exception 'recusa';
        end if;
      end loop;

      -- Normalização: aceita as duas formas e guarda UMA (contrato de 17/11).
      v_conta := lower(btrim(ltrim(l->>'conta', '@')));
      v_hash  := nullif(lower(btrim(regexp_replace(coalesce(l->>'arquivo_hash', ''), '^sha256:', ''))), '');
      if v_hash is not null and v_hash !~ '^[0-9a-f]{64}$' then
        v_motivo := 'arquivo_hash não é hex de 64 depois de tirar o prefixo';
        raise exception 'recusa';
      end if;

      v_quando := nullif(l->>'quando', '')::timestamptz;

      insert into ops.lousa_peca as t
        (origem, publicador, origem_ref, marca, marca_nome, accent_hex, conta, conta_nome,
         rede, tipo, quando, estado, arquivo_hash, link, erro, titulo)
      values
        (p_origem, v_pub, l->>'origem_ref', lower(l->>'marca'), l->>'marca_nome', l->>'accent_hex',
         v_conta, l->>'conta_nome', lower(l->>'rede'), lower(l->>'tipo'), v_quando, lower(l->>'estado'),
         v_hash, l->>'link', l->>'erro', l->>'titulo')
      on conflict (origem, publicador, origem_ref) do update set
        marca = excluded.marca, marca_nome = excluded.marca_nome, accent_hex = excluded.accent_hex,
        conta = excluded.conta, conta_nome = excluded.conta_nome, rede = excluded.rede,
        tipo = excluded.tipo, quando = excluded.quando, estado = excluded.estado,
        arquivo_hash = excluded.arquivo_hash, link = excluded.link, erro = excluded.erro,
        titulo = excluded.titulo, atualizado_em = now();

      v_gravadas := v_gravadas + 1;

    exception when others then
      -- Linha torta não derruba a carga inteira, e também não some: volta nomeada, com o motivo.
      v_ignoradas := v_ignoradas || jsonb_build_object(
        'origem_ref', l->>'origem_ref',
        'motivo', coalesce(v_motivo, sqlerrm));
    end;
  end loop;

  return jsonb_build_object('recebidas', v_recebidas, 'gravadas', v_gravadas, 'ignoradas', v_ignoradas);
end;
$$;

revoke all on function ops.fn_lousa_gravar(text, jsonb) from public, anon, authenticated;
grant execute on function ops.fn_lousa_gravar(text, jsonb) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- 4. A view que a tela lê — o MKT mais o que veio de fora
-- ---------------------------------------------------------------------------------------------------

drop view if exists public.v_lousa;
create view public.v_lousa with (security_invoker = true) as
select origem, origem_ref, publicador, marca, marca_nome, accent_hex, conta, conta_nome,
       rede, tipo, quando, estado, arquivo_hash, link, erro, titulo, atualizado_em
  from public.v_mkt_lousa
union all
select origem, origem_ref, publicador, marca, marca_nome, accent_hex, conta, conta_nome,
       rede, tipo, quando, estado, arquivo_hash, link, erro, titulo, atualizado_em
  from ops.lousa_peca;

comment on view public.v_lousa is
  'A Lousa inteira: o que o MKT publica (v_mkt_lousa) mais o que Pulso e Limelight enviam assinado. '
  'Hoje a v_mkt_lousa só traz publicador=mkt, medido, então a união não duplica peça.';

grant select on public.v_lousa to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- PROVAS
-- ---------------------------------------------------------------------------------------------------
do $$
declare
  v_n int; v_txt text; v_res jsonb;
begin
  -- 1. Emissor novo nasce sem porta nenhuma.
  insert into ops.emissor_externo (nome, chave_publica, ativo, registrado_por)
  values ('_prova_', 'MCowBQYDK2VwAyEApGI8P6jlUBOFmVU+IVbwFWfQiiHdxWbOfO6aiqxUaBU=', true, 'prova');
  if ops.fn_emissor_chave('_prova_', 'lousa') is not null
     or ops.fn_emissor_chave('_prova_', 'cortes') is not null then
    raise exception 'PROVA 1 FALHOU: emissor sem porta declarada foi autorizado';
  end if;
  delete from ops.emissor_externo where nome = '_prova_';

  -- 2. O defeito que esta migration fecha: o Limelight entra na lousa e NÃO entra no cortes.
  if ops.fn_emissor_chave('limelight', 'lousa') is null then
    raise exception 'PROVA 2 FALHOU: limelight perdeu a porta da lousa';
  end if;
  if ops.fn_emissor_chave('limelight', 'cortes') is not null then
    raise exception 'PROVA 2 FALHOU: a chave do limelight ainda abre o cortes';
  end if;

  -- 3. A chave do Pulso no banco é a que eu conferi no arquivo (impressão da SPKI).
  select encode(sha256(decode(chave_publica, 'base64')), 'hex') into v_txt
    from ops.emissor_externo where nome = 'pulso';
  if v_txt <> '96cccd5759a3a3872f1583ff59732335183154dad4e813fa4ca684c2787e4505' then
    raise exception 'PROVA 3 FALHOU: a chave do pulso no banco não é a que eu conferi (%)', v_txt;
  end if;

  -- 4. Visitante e pessoa logada não executam nenhuma das duas funções.
  if has_function_privilege('anon', 'ops.fn_lousa_gravar(text, jsonb)', 'execute')
     or has_function_privilege('authenticated', 'ops.fn_lousa_gravar(text, jsonb)', 'execute')
     or has_function_privilege('anon', 'ops.fn_emissor_chave(text, text)', 'execute')
     or has_function_privilege('authenticated', 'ops.fn_emissor_chave(text, text)', 'execute') then
    raise exception 'PROVA 4 FALHOU: função de borda executável por quem não é a borda';
  end if;

  -- 5. Gravação de verdade, com dado real, e normalização.
  v_res := ops.fn_lousa_gravar('pulso', jsonb_build_array(
    jsonb_build_object('origem','pulso','origem_ref','_p1','marca','pulso','conta','@Pulso',
      'rede','instagram','tipo','reel','quando','2026-11-19T12:00:00-03:00','estado','agendado',
      'arquivo_hash','sha256:9F86D081884C7D659A2FEAA0C55AD015A3BF4F1B2B0B822CD15D6C15B0F00A08'),
    jsonb_build_object('origem','limelight','origem_ref','_p2','marca','x','conta','y',
      'rede','instagram','tipo','reel','estado','agendado'),
    jsonb_build_object('origem','pulso','origem_ref','_p3','marca','pulso','conta','pulso',
      'rede','instagram','tipo','reel','estado','agendado','publicador','mkt'),
    jsonb_build_object('origem','pulso','origem_ref','_p4','marca','pulso','conta','pulso',
      'rede','instagram','tipo','reel','estado','agendado','arquivo_hash','abc')
  ));
  if (v_res->>'gravadas')::int <> 1 or jsonb_array_length(v_res->'ignoradas') <> 3 then
    raise exception 'PROVA 5 FALHOU: esperava 1 gravada e 3 recusadas, veio %', v_res;
  end if;
  if (select conta from ops.lousa_peca where origem_ref = '_p1') <> 'pulso' then
    raise exception 'PROVA 5 FALHOU: @Pulso não virou pulso';
  end if;
  if (select arquivo_hash from ops.lousa_peca where origem_ref = '_p1')
     <> '9f86d081884c7d659a2feaa0c55ad015a3bf4f1b2b0b822cd15d6c15b0f00a08' then
    raise exception 'PROVA 5 FALHOU: o hash não foi normalizado';
  end if;

  -- 6. Reenviar a mesma peça não duplica e atualiza.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(
    jsonb_build_object('origem','pulso','origem_ref','_p1','marca','pulso','conta','pulso',
      'rede','instagram','tipo','reel','estado','publicado')));
  select count(*) into v_n from ops.lousa_peca where origem_ref = '_p1';
  if v_n <> 1 or (select estado from ops.lousa_peca where origem_ref = '_p1') <> 'publicado' then
    raise exception 'PROVA 6 FALHOU: % linhas, estado %', v_n, (select estado from ops.lousa_peca where origem_ref='_p1');
  end if;

  -- 7. A view soma as duas fontes, e é invoker.
  select count(*) into v_n from public.v_lousa where origem_ref = '_p1';
  if v_n <> 1 then raise exception 'PROVA 7 FALHOU: a peça de fora não apareceu na v_lousa'; end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid = c.relnamespace
                  where n.nspname = 'public' and c.relname = 'v_lousa'
                    and array_to_string(c.reloptions, ',') like '%security_invoker=true%') then
    raise exception 'PROVA 7 FALHOU: v_lousa não é security_invoker';
  end if;

  -- Limpa o que as provas criaram.
  delete from ops.lousa_peca where origem_ref in ('_p1', '_p2', '_p3', '_p4');
  select count(*) into v_n from ops.lousa_peca;
  if v_n <> 0 then raise exception 'PROVA FINAL FALHOU: sobraram % linhas de prova', v_n; end if;

  raise notice 'as 7 provas passaram';
end $$;

commit;
