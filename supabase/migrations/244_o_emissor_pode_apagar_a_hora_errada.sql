-- 244 · O emissor passa a poder APAGAR a hora real que mandou errada
--
-- POR QUE EXISTE: hoje, 18h, o Pulso mandou `saiu_em` de duas peças do Kwai e a hora não era hora
-- nenhuma — o registro do Kwai guarda só a data, e 00:00 UTC virava 21h da véspera, aparecendo como
-- 22 horas de adiantamento. Ele consertou o motor no mesmo turno e deixou de mandar. Mas a minha regra
-- "reenvio sem o campo não apaga" — que existe por um bom motivo, não desfazer medição por engano —
-- **protegia o valor errado**, e eu tive de apagar as duas linhas à mão.
--
-- Mão em dado é o que esta casa faz uma vez. Na segunda, vira porta: mandar `"saiu_em": null`
-- explicitamente passa a significar **esquece a hora que eu te dei**, e a peça volta a "sem hora real".
-- Campo ausente continua mantendo o que está guardado — as duas coisas são diferentes, e agora a
-- função sabe distinguir uma da outra.

begin;

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
  v_apagar     boolean;
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

      -- HORA REAL. Três casos, e são diferentes de propósito:
      --   · campo AUSENTE → mantém a hora já guardada (regravar por outro motivo não desfaz medição);
      --   · campo NULO explícito → **apaga**. Esta porta nasceu de um caso real em 18/11: o Pulso
      --     mandou hora de duas peças do Kwai que não era hora nenhuma (o registro do Kwai guarda só a
      --     data, e 00:00 UTC virava 21h da véspera, com cara de 22h de adiantamento). Ele corrigiu o
      --     motor no mesmo turno, mas a minha regra de não apagar **protegia o valor errado**, e eu
      --     tive de ir à mão. Mão em dado é o que esta casa faz uma vez; na segunda, vira porta.
      --   · campo COM VALOR → grava, se der para ler.
      -- Hora que eu não consigo ler NÃO derruba a peça: a agenda vale mais que o carimbo.
      v_saiu := null;
      v_apagar := false;
      if l ? 'saiu_em' and (l->>'saiu_em') is null then
        v_apagar := true;
      elsif nullif(btrim(coalesce(l->>'saiu_em', '')), '') is not null then
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
        saiu_em = case when v_apagar then null else coalesce(excluded.saiu_em, t.saiu_em) end;

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

do $$
declare v_saiu timestamptz; v_n int;
begin
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_a1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','quando','2026-11-18T19:00:00-03:00','saiu_em','2026-11-18T19:05:00-03:00')));
  select saiu_em into v_saiu from ops.lousa_peca where origem_ref = '_a1';
  if v_saiu is null then raise exception 'PROVA 1 FALHOU: a hora não entrou'; end if;

  -- 2. Campo AUSENTE mantém — a regra que já existia continua de pé.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_a1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado')));
  if (select saiu_em from ops.lousa_peca where origem_ref='_a1') is distinct from v_saiu then
    raise exception 'PROVA 2 FALHOU: campo ausente apagou a hora';
  end if;

  -- 3. Campo NULO explícito APAGA — a porta nova.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_a1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','saiu_em', null)));
  if (select saiu_em from ops.lousa_peca where origem_ref='_a1') is not null then
    raise exception 'PROVA 3 FALHOU: o nulo explícito não apagou';
  end if;

  -- 4. Apagar uma peça não apaga a vizinha na mesma carga.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(
    jsonb_build_object('origem','pulso','origem_ref','_a2','marca','pulso','conta','pulso','rede','kwai',
      'tipo','reel','estado','publicado','saiu_em','2026-11-18T19:05:00-03:00'),
    jsonb_build_object('origem','pulso','origem_ref','_a3','marca','pulso','conta','pulso','rede','kwai',
      'tipo','reel','estado','publicado','saiu_em','2026-11-18T19:06:00-03:00')));
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_a2','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','saiu_em', null)));
  if (select saiu_em from ops.lousa_peca where origem_ref='_a2') is not null
     or (select saiu_em from ops.lousa_peca where origem_ref='_a3') is null then
    raise exception 'PROVA 4 FALHOU: o apagar vazou para a peça vizinha';
  end if;

  delete from ops.lousa_peca where origem_ref in ('_a1','_a2','_a3');
  select count(*) into v_n from ops.lousa_peca where origem_ref in ('_a1','_a2','_a3');
  if v_n <> 0 then raise exception 'PROVA FINAL FALHOU: sobraram % de prova', v_n; end if;
  raise notice 'as 4 provas passaram';
end $$;

commit;
