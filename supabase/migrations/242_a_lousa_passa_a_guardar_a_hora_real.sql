-- 242 · A Lousa passa a guardar a hora REAL em que a peça saiu
--
-- POR QUÊ: o dono aprovou a pontualidade em 18/11. Do que o MKT publica eu já sei — `scheduled_for`
-- contra `published_at` dá 469 no horário e 43 atrasadas, média de 3h38 e a pior com 18 dias. Das peças
-- que Pulso e Limelight enviam eu sei **que** saíram, não **quando**: o contrato carrega `estado` e mais
-- nada. E a regra que eu assinei no desenho é que **fonte sem hora real aparece nomeada, nunca como
-- pontual** — contar o silêncio como acerto inflaria a pontualidade da casa com o que ninguém mediu.
--
-- CAMPO OPCIONAL, de propósito: quem não mandar continua funcionando igual, e a peça dele aparece com
-- "sem hora real". Nada de valor de reserva, que é como um zero vira "saiu na hora" sem ninguém notar.

begin;

alter table ops.lousa_peca
  add column if not exists saiu_em timestamptz;

comment on column ops.lousa_peca.saiu_em is
  'Hora real em que a peça saiu na rede, enviada pelo emissor. Nula = não medida, nunca "no horário". '
  'Só é guardada com estado=publicado: em outro estado seria hora de uma publicação que não houve.';

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
  v_saiu       timestamptz;
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
      if coalesce(l->>'origem', '') <> p_origem then
        v_motivo := format('origem %L no corpo não bate com %L do cabeçalho', l->>'origem', p_origem);
        raise exception 'recusa';
      end if;

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

      v_conta := lower(btrim(ltrim(l->>'conta', '@')));
      v_hash  := nullif(lower(btrim(regexp_replace(coalesce(l->>'arquivo_hash', ''), '^sha256:', ''))), '');
      if v_hash is not null and v_hash !~ '^[0-9a-f]{64}$' then
        v_motivo := 'arquivo_hash não é hex de 64 depois de tirar o prefixo';
        raise exception 'recusa';
      end if;

      v_quando := nullif(l->>'quando', '')::timestamptz;

      -- HORA REAL. Hora que eu não consigo ler NÃO derruba a peça: a agenda vale mais que o carimbo.
      -- Volta como aviso, e a peça fica "sem hora real" — que é a verdade, e não um zero disfarçado.
      v_saiu := null;
      if nullif(l->>'saiu_em', '') is not null then
        if lower(l->>'estado') <> 'publicado' then
          v_ignoradas := v_ignoradas || jsonb_build_object(
            'origem_ref', l->>'origem_ref',
            'aviso', format('saiu_em ignorado: estado é %L, não publicado', l->>'estado'));
        else
          begin
            v_saiu := (l->>'saiu_em')::timestamptz;
          exception when others then
            v_saiu := null;
            v_ignoradas := v_ignoradas || jsonb_build_object(
              'origem_ref', l->>'origem_ref',
              'aviso', format('saiu_em %L não é data que eu consiga ler', l->>'saiu_em'));
          end;
        end if;
      end if;

      insert into ops.lousa_peca as t
        (origem, publicador, origem_ref, marca, marca_nome, accent_hex, conta, conta_nome,
         rede, tipo, quando, estado, arquivo_hash, link, erro, titulo, saiu_em)
      values
        (p_origem, v_pub, l->>'origem_ref', lower(l->>'marca'), l->>'marca_nome', l->>'accent_hex',
         v_conta, l->>'conta_nome', lower(l->>'rede'), lower(l->>'tipo'), v_quando, lower(l->>'estado'),
         v_hash, l->>'link', l->>'erro', l->>'titulo', v_saiu)
      on conflict (origem, publicador, origem_ref) do update set
        marca = excluded.marca, marca_nome = excluded.marca_nome, accent_hex = excluded.accent_hex,
        conta = excluded.conta, conta_nome = excluded.conta_nome, rede = excluded.rede,
        tipo = excluded.tipo, quando = excluded.quando, estado = excluded.estado,
        arquivo_hash = excluded.arquivo_hash, link = excluded.link, erro = excluded.erro,
        titulo = excluded.titulo, atualizado_em = now(),
        -- Hora real já conhecida NÃO é apagada por um reenvio que não a traga: o motor pode regravar a
        -- peça por outro motivo, e perder o carimbo faria uma peça pontual virar "sem hora real".
        saiu_em = coalesce(excluded.saiu_em, t.saiu_em);

      v_gravadas := v_gravadas + 1;

    exception when others then
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

-- A view ganha a coluna. No lado do MKT ela vem NULA de propósito: a hora real do que o MKT publica
-- vive em `mkt.publications.published_at`, e a conferência lê de lá. Pôr aqui um valor aproximado
-- faria duas fontes para o mesmo número, que é como nascem as contradições de tela.
drop view if exists public.v_lousa;
create view public.v_lousa with (security_invoker = true) as
select origem, origem_ref, publicador, marca, marca_nome, accent_hex, conta, conta_nome,
       rede, tipo, quando, estado, arquivo_hash, link, erro, titulo, atualizado_em,
       null::timestamptz as saiu_em
  from public.v_mkt_lousa
union all
select origem, origem_ref, publicador, marca, marca_nome, accent_hex, conta, conta_nome,
       rede, tipo, quando, estado, arquivo_hash, link, erro, titulo, atualizado_em,
       saiu_em
  from ops.lousa_peca;

grant select on public.v_lousa to authenticated;

-- ---------------------------------------------------------------------------------------------------
-- PROVAS
-- ---------------------------------------------------------------------------------------------------
do $$
declare v_res jsonb; v_n int; v_saiu timestamptz;
begin
  -- 1. Peça publicada com hora real guarda a hora.
  v_res := ops.fn_lousa_gravar('pulso', jsonb_build_array(
    jsonb_build_object('origem','pulso','origem_ref','_s1','marca','pulso','conta','pulso',
      'rede','instagram','tipo','reel','estado','publicado',
      'quando','2026-11-18T12:00:00-03:00','saiu_em','2026-11-18T12:04:11-03:00')));
  if (v_res->>'gravadas')::int <> 1 then raise exception 'PROVA 1 FALHOU: %', v_res; end if;
  select saiu_em into v_saiu from ops.lousa_peca where origem_ref = '_s1';
  if v_saiu is null then raise exception 'PROVA 1 FALHOU: a hora real não foi guardada'; end if;

  -- 2. Reenvio SEM a hora real não apaga a que já existe.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(
    jsonb_build_object('origem','pulso','origem_ref','_s1','marca','pulso','conta','pulso',
      'rede','instagram','tipo','reel','estado','publicado')));
  if (select saiu_em from ops.lousa_peca where origem_ref = '_s1') is distinct from v_saiu then
    raise exception 'PROVA 2 FALHOU: o reenvio apagou a hora real';
  end if;

  -- 3. Hora real em peça que não foi publicada é ignorada, e o aviso volta.
  v_res := ops.fn_lousa_gravar('pulso', jsonb_build_array(
    jsonb_build_object('origem','pulso','origem_ref','_s2','marca','pulso','conta','pulso',
      'rede','instagram','tipo','reel','estado','agendado','saiu_em','2026-11-18T12:04:11-03:00')));
  if (select saiu_em from ops.lousa_peca where origem_ref = '_s2') is not null
     or v_res->'ignoradas' = '[]'::jsonb then
    raise exception 'PROVA 3 FALHOU: hora real aceita em peça não publicada (%)', v_res;
  end if;

  -- 4. Data ilegível NÃO derruba a peça: ela entra sem hora real, com aviso.
  v_res := ops.fn_lousa_gravar('pulso', jsonb_build_array(
    jsonb_build_object('origem','pulso','origem_ref','_s3','marca','pulso','conta','pulso',
      'rede','instagram','tipo','reel','estado','publicado','saiu_em','ontem à tarde')));
  if (v_res->>'gravadas')::int <> 1
     or (select saiu_em from ops.lousa_peca where origem_ref = '_s3') is not null
     or v_res->'ignoradas' = '[]'::jsonb then
    raise exception 'PROVA 4 FALHOU: data ilegível não tratada como aviso (%)', v_res;
  end if;

  -- 5. A view entrega a coluna, e o lado do MKT vem nulo.
  if (select count(*) from public.v_lousa where origem_ref = '_s1' and saiu_em is not null) <> 1 then
    raise exception 'PROVA 5 FALHOU: a hora real não chega pela view';
  end if;
  if exists (select 1 from public.v_lousa where publicador = 'mkt' and saiu_em is not null) then
    raise exception 'PROVA 5 FALHOU: o lado do MKT trouxe hora real inventada';
  end if;

  delete from ops.lousa_peca where origem_ref in ('_s1','_s2','_s3');
  select count(*) into v_n from ops.lousa_peca where origem_ref like '\_s%';
  if v_n <> 0 then raise exception 'PROVA FINAL FALHOU: sobraram % linhas de prova', v_n; end if;

  raise notice 'as 5 provas passaram';
end $$;

commit;
