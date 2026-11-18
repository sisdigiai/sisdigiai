-- 245 · Quem fez a peça sair: a esteira ou a mão
--
-- POR QUE EXISTE: o Limelight mandou hoje o retroativo e avisou que, das 59, **10 saíram à mão** em
-- redes cujo responsável é o app — e perguntou se isso é ruído para a minha tela. Não é ruído: a peça
-- saiu e estava na agenda. **Mas não pode ir no mesmo saco**, porque "o motor atrasou" e "a pessoa
-- atrasou" pedem ações opostas: a primeira é conserto de código, a segunda é conversa de rotina.
--
-- E é exatamente a pergunta do dono: ele pediu para conferir "saiu no horário o vídeo, **saiu o
-- rascunho normal**" — e o rascunho é publicação de mão. Sem esta coluna, a tela responde metade.
--
-- NULO É "NÃO INFORMADO", nunca "motor". Supor motor faria a pontualidade da esteira carregar o atraso
-- de uma pessoa; a tela mostra a divisão só onde ela é sabida, e diz quantas não sabe.

begin;

alter table ops.lousa_peca
  add column if not exists saiu_por text
  constraint lousa_peca_saiu_por check (saiu_por is null or saiu_por in ('motor', 'mao'));

comment on column ops.lousa_peca.saiu_por is
  'Quem fez a peça sair: motor (esteira) ou mao (pessoa). Nulo = não informado, nunca "motor".';

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
         v_hash, l->>'link', l->>'erro', l->>'titulo', v_saiu, v_por)
      on conflict (origem, publicador, origem_ref) do update set
        marca = excluded.marca, marca_nome = excluded.marca_nome, accent_hex = excluded.accent_hex,
        conta = excluded.conta, conta_nome = excluded.conta_nome, rede = excluded.rede,
        tipo = excluded.tipo, quando = excluded.quando, estado = excluded.estado,
        arquivo_hash = excluded.arquivo_hash, link = excluded.link, erro = excluded.erro,
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

drop view if exists public.v_lousa;
create view public.v_lousa with (security_invoker = true) as
select origem, origem_ref, publicador, marca, marca_nome, accent_hex, conta, conta_nome,
       rede, tipo, quando, estado, arquivo_hash, link, erro, titulo, atualizado_em,
       null::timestamptz as saiu_em, null::text as saiu_por
  from public.v_mkt_lousa
union all
select origem, origem_ref, publicador, marca, marca_nome, accent_hex, conta, conta_nome,
       rede, tipo, quando, estado, arquivo_hash, link, erro, titulo, atualizado_em,
       saiu_em, saiu_por
  from ops.lousa_peca;

grant select on public.v_lousa to authenticated;

do $$
declare v_n int;
begin
  -- 1. Grava o que é válido.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_q1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','saiu_por','mao')));
  if (select saiu_por from ops.lousa_peca where origem_ref='_q1') <> 'mao' then
    raise exception 'PROVA 1 FALHOU: saiu_por não gravou';
  end if;

  -- 2. Valor que não existe é IGNORADO com aviso, e NÃO derruba a peça nem entra torto.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_q2','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado','saiu_por','robo')));
  if (select count(*) from ops.lousa_peca where origem_ref='_q2') <> 1
     or (select saiu_por from ops.lousa_peca where origem_ref='_q2') is not null then
    raise exception 'PROVA 2 FALHOU: valor inválido não foi ignorado como aviso';
  end if;

  -- 3. Reenvio sem o campo não apaga quem já se sabe.
  perform ops.fn_lousa_gravar('pulso', jsonb_build_array(jsonb_build_object(
    'origem','pulso','origem_ref','_q1','marca','pulso','conta','pulso','rede','kwai','tipo','reel',
    'estado','publicado')));
  if (select saiu_por from ops.lousa_peca where origem_ref='_q1') is distinct from 'mao' then
    raise exception 'PROVA 3 FALHOU: o reenvio apagou quem fez sair';
  end if;

  -- 4. A view entrega a coluna, e o lado do MKT vem nulo (não é "motor" por suposição).
  if (select saiu_por from public.v_lousa where origem_ref='_q1') is distinct from 'mao' then
    raise exception 'PROVA 4 FALHOU: a coluna não chega pela view';
  end if;
  if exists (select 1 from public.v_lousa where publicador='mkt' and saiu_por is not null) then
    raise exception 'PROVA 4 FALHOU: o lado do MKT ganhou um valor inventado';
  end if;

  delete from ops.lousa_peca where origem_ref in ('_q1','_q2');
  select count(*) into v_n from ops.lousa_peca where origem_ref in ('_q1','_q2');
  if v_n <> 0 then raise exception 'PROVA FINAL FALHOU: sobraram % de prova', v_n; end if;
  raise notice 'as 4 provas passaram';
end $$;

commit;
