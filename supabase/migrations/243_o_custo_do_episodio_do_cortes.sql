-- 243 · O custo do episódio do Cortes, para os quatro motores terem a mesma coluna
--
-- POR QUÊ: o dono aprovou a aba Motores com os quatro lado a lado e as MESMAS colunas (peças na
-- semana, views na semana, custo, custo por mil views). MKT, Limelight e Pulso já têm custo; o Cortes
-- não tinha onde guardar o dele. Sem isso, ou a coluna fica vazia para um motor — e motor sem custo
-- medido parece motor de graça — ou a comparação some para todos.
--
-- POR QUE A MIGRATION É MINHA, sendo a tabela do Cortes: **ele não tem acesso ao banco** (foi por isso
-- que lhe gerei o espelho documentado em 17/11). A DDL só pode sair daqui. O que é dele continua dele:
-- **o número**. Esta migration abre o caminho e não inventa valor nenhum.
--
-- NULO É "NÃO MEDIDO", e a tela diz isso. Zero seria "saiu de graça", que é outra afirmação.

begin;

alter table cortes.episodios
  add column if not exists custo_brl numeric(12,2);

comment on column cortes.episodios.custo_brl is
  'Custo do episódio em reais, enviado pelo motor do Cortes. Nulo = não medido, nunca zero. '
  'Zero significa "não custou nada"; nulo significa "ninguém mediu" — a tela separa as duas.';

-- A view ganha a coluna. Continua sendo a mesma lista, sem nada a mais.
drop view if exists public.v_cortes_episodios;
create view public.v_cortes_episodios with (security_invoker = true) as
select id, codigo, serie, numero, titulo, status, aprovado_pelo_dono, canal_do_longo, longo_url,
       historias, roteiro_md, travas, conferencia, marca_roteiro, marca_longo, marca_cortes,
       custo_brl, criado_em, atualizado_em
  from cortes.episodios;

grant select on public.v_cortes_episodios to authenticated;

-- A porta de escrita dele passa a aceitar o campo, sem mexer em mais nada do que já faz.
-- `coalesce` com o valor atual: envio que não traga o custo NÃO apaga o custo já medido — é a mesma
-- regra que pus na hora real da Lousa hoje, pelo mesmo motivo (regravar por outro motivo não pode
-- desfazer uma medição).
create or replace function public.cortes_gravar_custo(p_codigo text, p_custo numeric)
returns jsonb
language plpgsql
security definer
set search_path = public, cortes, pg_temp
as $$
declare v_n int;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'cortes_gravar_custo: só a borda da casa' using errcode = '42501';
  end if;
  if p_custo is not null and p_custo < 0 then
    raise exception 'custo negativo não existe' using errcode = '22023';
  end if;

  update cortes.episodios e
     set custo_brl = coalesce(p_custo, e.custo_brl), atualizado_em = now()
   where e.codigo = p_codigo;
  get diagnostics v_n = row_count;

  return jsonb_build_object('episodio', p_codigo, 'gravado', v_n = 1);
end;
$$;

revoke all on function public.cortes_gravar_custo(text, numeric) from public, anon, authenticated;
grant execute on function public.cortes_gravar_custo(text, numeric) to service_role;

do $$
declare v_ep uuid; v_res jsonb; v_antes int;
begin
  select count(*) into v_antes from cortes.episodios;

  if has_function_privilege('anon', 'public.cortes_gravar_custo(text, numeric)', 'execute')
     or has_function_privilege('authenticated', 'public.cortes_gravar_custo(text, numeric)', 'execute') then
    raise exception 'PROVA 1 FALHOU: porta de custo aberta a quem não é a borda';
  end if;

  insert into cortes.episodios (codigo, serie, numero, titulo)
  values ('_PROVA_243_', 'prova', 0, 'prova da 243') returning id into v_ep;

  -- 2. Nasce não medido, e não medido não é zero.
  if (select custo_brl from cortes.episodios where id = v_ep) is not null then
    raise exception 'PROVA 2 FALHOU: episódio novo nasceu com custo';
  end if;

  -- 3. Grava, e a view entrega.
  v_res := public.cortes_gravar_custo('_PROVA_243_', 12.34);
  if not (v_res->>'gravado')::boolean
     or (select custo_brl from public.v_cortes_episodios where codigo = '_PROVA_243_') is distinct from 12.34 then
    raise exception 'PROVA 3 FALHOU: %', v_res;
  end if;

  -- 4. Chamada sem custo NÃO apaga o que já foi medido.
  perform public.cortes_gravar_custo('_PROVA_243_', null);
  -- `is distinct from`, não `<>`: a sabotagem desta prova PASSOU na primeira tentativa porque
  -- `null <> 12.34` não é verdadeiro, é NULO — e um `if` com condição nula não dispara. A prova que
  -- não pega o caso que ela existe para pegar é pior que não ter prova, porque dá confiança.
  if (select custo_brl from cortes.episodios where id = v_ep) is distinct from 12.34 then
    raise exception 'PROVA 4 FALHOU: o custo medido foi apagado por um envio vazio';
  end if;

  -- 5. Episódio que não existe responde `gravado: false`, não explode nem cria nada.
  v_res := public.cortes_gravar_custo('_NAO_EXISTE_', 9.99);
  if (v_res->>'gravado')::boolean then
    raise exception 'PROVA 5 FALHOU: gravou custo em episódio inexistente';
  end if;

  delete from cortes.episodios where id = v_ep;
  if (select count(*) from cortes.episodios) <> v_antes then
    raise exception 'PROVA FINAL FALHOU: o ECO01 mudou de número';
  end if;

  raise notice 'as 5 provas passaram';
end $$;

commit;
