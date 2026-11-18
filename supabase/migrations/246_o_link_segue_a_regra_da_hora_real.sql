-- 246 · O link passa a seguir a mesma regra da hora real
--
-- O QUE EU TESTEI HOJE, e não deduzi do código: **omitir o `link` apagava o link**. Gravei uma peça
-- com endereço, reenviei sem o campo, e o endereço sumiu. Então um reenvio distraído de uma peça já
-- publicada perdia o post em silêncio — e silêncio é o que torna este tipo de perda cara: ninguém vê
-- até procurar o link e não achar.
--
-- POR QUE AGORA: o Limelight achou que me tinha mandado 10 peças duplicadas e precisava de limpar o
-- `link` das linhas de correção. O caminho que existia era "reenvia sem o campo" — que funcionava por
-- acidente, não por desenho, e pelo mesmo acidente destruía dado em todos os outros casos.
--
-- A REGRA FICA UMA SÓ, igual à do `saiu_em`: **campo ausente mantém; nulo explícito apaga.** Contrato
-- com duas regras para dois campos é contrato que alguém vai confundir num dia de pressa.

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
  v_por        text;
  v_link       text;
  v_apaga_link boolean;
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

      -- O LINK, com a mesma regra da hora real. Até agora, **omitir o link apagava o link** — testei
      -- e confirmei, não deduzi do código. Isso significa que um reenvio distraído de uma peça já
      -- publicada perderia o endereço do post, em silêncio, e ninguém veria até alguém procurar.
      -- É a mesma classe do defeito que me custou a mão de hoje. Agora: ausente mantém, nulo explícito
      -- apaga — igual ao `saiu_em`, para o contrato ter uma regra só e não duas.
      v_link := nullif(btrim(coalesce(l->>'link', '')), '');
      v_apaga_link := (l ? 'link' and (l->>'link') is null);

      -- QUEM FEZ SAIR. Opcional, e nulo é "não informado" — nunca "motor". Supor motor faria a
      -- pontualidade da esteira carregar o atraso de uma pessoa, e vice-versa.
      v_por := lower(nullif(btrim(coalesce(l->>'saiu_por', '')), ''));
      if v_por is not null and v_por not in ('motor', 'mao') then
        v_ignoradas := v_ignoradas || jsonb_build_object(
          'origem_ref', l->>'origem_ref',
          'aviso', format('saiu_por %L ignorado: só vale motor ou mao', v_por));
        v_por := null;
      end if;

      insert into ops.lousa_peca as t
        (origem, publicador, origem_ref, marca, marca_nome, accent_hex, conta, conta_nome,
         rede, tipo, quando, estado, arquivo_hash, link, erro, titulo, saiu_em, saiu_por)
      values
        (p_origem, v_pub, l->>'origem_ref', lower(l->>'marca'), l->>'marca_nome', l->>'accent_hex',
         v_conta, l->>'conta_nome', lower(l->>'rede'), lower(l->>'tipo'), v_quando, lower(l->>'estado'),
         v_hash, v_link, l->>'erro', l->>'titulo', v_saiu, v_por)
      on conflict (origem, publicador, origem_ref) do update set
        marca = excluded.marca, marca_nome = excluded.marca_nome, accent_hex = excluded.accent_hex,
        conta = excluded.conta, conta_nome = excluded.conta_nome, rede = excluded.rede,
        tipo = excluded.tipo, quando = excluded.quando, estado = excluded.estado,
        arquivo_hash = excluded.arquivo_hash, erro = excluded.erro,
        link = case when v_apaga_link then null else coalesce(excluded.link, t.link) end,
        titulo = excluded.titulo, atualizado_em = now(),
        saiu_em = case when v_apagar then null else coalesce(excluded.saiu_em, t.saiu_em) end,
        saiu_por = coalesce(excluded.saiu_por, t.saiu_por);

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
declare v_n int;
begin
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_lk1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','link','https://exemplo/post')));
  if (select link from ops.lousa_peca where origem_ref='_lk1') is distinct from 'https://exemplo/post' then
    raise exception 'PROVA 1 FALHOU: o link não entrou';
  end if;

  -- 2. Campo AUSENTE mantém — era aqui que o endereço sumia antes.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_lk1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado')));
  if (select link from ops.lousa_peca where origem_ref='_lk1') is distinct from 'https://exemplo/post' then
    raise exception 'PROVA 2 FALHOU: o reenvio sem o campo apagou o link';
  end if;

  -- 3. Nulo explícito apaga.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_lk1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','link', null)));
  if (select link from ops.lousa_peca where origem_ref='_lk1') is not null then
    raise exception 'PROVA 3 FALHOU: o nulo explícito não apagou o link';
  end if;

  -- 4. Link novo substitui o antigo (o emissor continua dono do endereço).
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_lk1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','link','https://exemplo/outro')));
  if (select link from ops.lousa_peca where origem_ref='_lk1') is distinct from 'https://exemplo/outro' then
    raise exception 'PROVA 4 FALHOU: o link novo não substituiu';
  end if;

  -- 5. A hora real continua com a mesma regra: as duas são iguais de propósito.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_lk1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','saiu_em','2026-11-18T19:05:00-03:00')));
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_lk1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado')));
  if (select saiu_em from ops.lousa_peca where origem_ref='_lk1') is null then
    raise exception 'PROVA 5 FALHOU: as duas regras deixaram de ser iguais';
  end if;

  delete from ops.lousa_peca where origem_ref = '_lk1';
  select count(*) into v_n from ops.lousa_peca where origem_ref = '_lk1';
  if v_n <> 0 then raise exception 'PROVA FINAL FALHOU'; end if;
  raise notice 'as 5 provas passaram';
end $$;

commit;
