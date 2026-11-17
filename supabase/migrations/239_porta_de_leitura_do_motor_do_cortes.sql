-- 239 · A porta de leitura do motor do Cortes
--
-- O QUE RESOLVE: o dono aprova na tela publicada, a decisão fica no banco — e **nada acontece na
-- máquina**, porque o motor não tem como ler. A chave de serviço não mora lá (R-042), e é assim que
-- tem de ser. Então a leitura vem pela mesma porta assinada por onde ele já escreve.
--
-- SÓ LEITURA, e só do que é dele: o episódio pedido, as decisões do dono sobre ele, e o que o MKT
-- devolveu nas peças. Nenhum comando livre, nenhuma escrita, nenhum outro schema.
--
-- O QUE FICA DE FORA DE PROPÓSITO: `decidido_por`. É quem decidiu — dado de pessoa, e o motor não
-- pediu nem precisa. Porta de leitura devolve o mínimo que serve; o resto é vazamento com boa intenção.
--
-- `session_user = 'postgres'` no portão só para as provas desta migration rodarem a função de verdade.

begin;

create or replace function public.cortes_ler_episodio(p_codigo text)
returns jsonb
language plpgsql
security definer
set search_path = public, cortes, pg_temp
as $$
declare v_ep record; v_apr jsonb; v_pec jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'cortes_ler_episodio: só a borda da casa lê por aqui' using errcode = '42501';
  end if;

  select e.id, e.codigo, e.serie, e.numero, e.titulo, e.status, e.aprovado_pelo_dono,
         e.marca_roteiro, e.marca_longo, e.marca_cortes, e.canal_do_longo, e.longo_url
    into v_ep
    from cortes.episodios e where e.codigo = p_codigo;

  -- Episódio que não existe é uma resposta, não um erro: o motor tem de poder perguntar antes de ter
  -- gravado. `encontrado: false` com listas vazias é diferente de episódio sem nenhuma aprovação.
  if not found then
    return jsonb_build_object('encontrado', false, 'codigo', p_codigo,
                              'aprovacoes', '[]'::jsonb, 'pecas', '[]'::jsonb);
  end if;

  select coalesce(jsonb_agg(jsonb_build_object(
           'item', a.item, 'decisao', a.decisao, 'categoria', a.categoria,
           'observacao', a.observacao, 'marca', a.marca, 'decidido_em', a.decidido_em
         ) order by a.decidido_em), '[]'::jsonb)
    into v_apr
    from cortes.aprovacoes a where a.episodio_id = v_ep.id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'tipo', p.tipo, 'destino', p.destino, 'rede', p.rede, 'momento', p.momento,
           'corte_numero', k.numero, 'status', p.status, 'quando_mkt', p.quando_mkt,
           'url', p.url, 'motivo', p.motivo, 'publicado_em', p.publicado_em
         ) order by p.criado_em), '[]'::jsonb)
    into v_pec
    from cortes.pecas p
    left join cortes.cortes k on k.id = p.corte_id
   where p.episodio_id = v_ep.id;

  return jsonb_build_object(
    'encontrado', true,
    'episodio', jsonb_build_object(
      'codigo', v_ep.codigo, 'serie', v_ep.serie, 'numero', v_ep.numero, 'titulo', v_ep.titulo,
      'status', v_ep.status, 'aprovado_pelo_dono', v_ep.aprovado_pelo_dono,
      'marca_roteiro', v_ep.marca_roteiro, 'marca_longo', v_ep.marca_longo,
      'marca_cortes', v_ep.marca_cortes, 'canal_do_longo', v_ep.canal_do_longo,
      'longo_url', v_ep.longo_url),
    'aprovacoes', v_apr,
    'pecas', v_pec);
end;
$$;

revoke all on function public.cortes_ler_episodio(text) from public, anon, authenticated;
grant execute on function public.cortes_ler_episodio(text) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- PROVAS — em episódio de prova, apagado aqui dentro. Os dados do ECO01 não são tocados.
-- ---------------------------------------------------------------------------------------------------
do $$
declare v_ep uuid; v_res jsonb; v_antes int; v_depois int;
begin
  select count(*) into v_antes from cortes.pecas;

  -- 1. Visitante e pessoa logada não leem por aqui.
  if has_function_privilege('anon', 'public.cortes_ler_episodio(text)', 'execute')
     or has_function_privilege('authenticated', 'public.cortes_ler_episodio(text)', 'execute') then
    raise exception 'PROVA 1 FALHOU: porta de leitura aberta a quem não é a borda';
  end if;

  -- 2. Episódio que não existe responde, não explode.
  v_res := public.cortes_ler_episodio('_NAO_EXISTE_');
  if (v_res ->> 'encontrado')::boolean
     or jsonb_array_length(v_res -> 'aprovacoes') <> 0
     or jsonb_array_length(v_res -> 'pecas') <> 0 then
    raise exception 'PROVA 2 FALHOU: episódio inexistente devolveu %', v_res;
  end if;

  insert into cortes.episodios (codigo, serie, numero, titulo, aprovado_pelo_dono)
  values ('_PROVA_239_', 'prova', 0, 'prova da 239, apagada aqui mesmo', true) returning id into v_ep;
  insert into cortes.aprovacoes (episodio_id, item, decisao, categoria, observacao, marca, decidido_por)
  values (v_ep, 'longo', 'aprovado', 'outro', 'pode gerar os cortes', 'bastidores', gen_random_uuid());   -- uuid: é quem decidiu, e por isso não sai na leitura
  insert into cortes.pecas (episodio_id, tipo, destino, rede, titulo, legenda, status)
  values (v_ep, 'corte', 'bastidores', 'youtube', 'peça de prova', '', 'rascunho');

  v_res := public.cortes_ler_episodio('_PROVA_239_');

  -- 3. Devolve o que o motor pediu.
  if not (v_res ->> 'encontrado')::boolean
     or jsonb_array_length(v_res -> 'aprovacoes') <> 1
     or jsonb_array_length(v_res -> 'pecas') <> 1
     or (v_res -> 'aprovacoes' -> 0 ->> 'decisao') <> 'aprovado'
     or not (v_res -> 'episodio' ->> 'aprovado_pelo_dono')::boolean then
    raise exception 'PROVA 3 FALHOU: leitura incompleta %', v_res;
  end if;

  -- 4. NÃO devolve quem decidiu. Porta de leitura entrega o mínimo que serve.
  if v_res -> 'aprovacoes' -> 0 ? 'decidido_por' or v_res::text like '%decidido_por%' then
    raise exception 'PROVA 4 FALHOU: a leitura expôs quem decidiu';
  end if;

  delete from cortes.aprovacoes where episodio_id = v_ep;
  delete from cortes.pecas where episodio_id = v_ep;
  delete from cortes.episodios where id = v_ep;

  select count(*) into v_depois from cortes.pecas;
  if v_antes <> v_depois then
    raise exception 'PROVA FINAL FALHOU: as peças do ECO01 mudaram de número (% para %)', v_antes, v_depois;
  end if;

  raise notice 'as 4 provas passaram; peças do ECO01 intactas: %', v_depois;
end $$;

commit;
