-- 238 · As duas portas que deixam a borda assinar os links de leitura das peças do Cortes
--
-- O PROBLEMA, medido em 17/11 às 17h05 e não deduzido: o robô do MKT lê `url_assinada`/`url_expira` de
-- cada peça, a RPC `cortes_gravar_episodio` grava esses campos **a partir da carga**, e o motor do Cortes
-- **não tem como preenchê-los** — ele não segura credencial do depósito, e é assim que tem de ser.
-- Quem pode assinar é quem guarda a credencial: a edge function `cortes-gravar`.
--
-- POR QUE NÃO DEU PARA A FUNÇÃO ESCREVER DIRETO: tentei, e a chamada devolveu **`Invalid schema: cortes`**
-- — a API REST não expõe esse schema. Se eu tivesse entregue sem provar de ponta a ponta, as 85 peças que
-- o ECO01 acabou de gravar chegariam ao MKT **sem vídeo**, e isso só apareceria no dia 23.
--
-- ENTÃO: duas funções em `public`, as duas `SECURITY DEFINER` com o filtro de papel escrito dentro
-- (R-043), nenhuma delas com comando livre. Uma diz **quais peças precisam de link**; a outra **grava o
-- link que a borda assinou**. A borda nunca escreve na tabela, e a tabela nunca sabe assinar.
--
-- `session_user = 'postgres'` entra no portão só para as provas desta migration exercitarem as funções
-- com dado real dentro da transação. Não alarga nada: quem já está ligado como postgres é dono da tabela.

begin;

create or replace function public.cortes_pecas_para_assinar(p_codigo text default null, p_horas int default 48)
returns jsonb
language plpgsql
security definer
set search_path = public, cortes, pg_temp
as $$
declare v jsonb;
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'cortes_pecas_para_assinar: só a borda da casa' using errcode = '42501';
  end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'caminhos', x.caminhos)), '[]'::jsonb)
    into v
    from (
      select p.id,
             array(select distinct c
                     from unnest(array_remove(array[p.arquivo] || p.arquivos, null)) c
                    where c <> '') as caminhos
        from cortes.pecas p
        join cortes.episodios e on e.id = p.episodio_id
       where (p_codigo is null or e.codigo = p_codigo)
         and (p.arquivo is not null or coalesce(array_length(p.arquivos, 1), 0) > 0)
         -- Com código, devolve todas as do episódio (acabou de gravar). Sem código, só o que vence em
         -- breve: link que expira no sábado e só seria renovado na segunda deixa o robô sem vídeo no
         -- fim de semana, e ninguém vê porque não há erro — há um vídeo que não abre.
         and (p_codigo is not null
              or p.url_expira is null
              or p.url_expira < now() + make_interval(hours => greatest(p_horas, 1)))
       order by p.criado_em
       limit 500
    ) x
   where coalesce(array_length(x.caminhos, 1), 0) > 0;

  return v;
end;
$$;

revoke all on function public.cortes_pecas_para_assinar(text, int) from public, anon, authenticated;
grant execute on function public.cortes_pecas_para_assinar(text, int) to service_role;

create or replace function public.cortes_gravar_links(p jsonb)
returns jsonb
language plpgsql
security definer
set search_path = public, cortes, pg_temp
as $$
declare l jsonb; n int := 0; v_ids uuid[] := '{}';
begin
  if coalesce(auth.role(), '') <> 'service_role' and session_user <> 'postgres' then
    raise exception 'cortes_gravar_links: só a borda da casa' using errcode = '42501';
  end if;
  if jsonb_typeof(p) <> 'array' then
    raise exception 'cortes_gravar_links: a carga tem de ser uma lista' using errcode = '22023';
  end if;

  for l in select * from jsonb_array_elements(p) loop
    update cortes.pecas t
       set url_assinada   = l ->> 'url_assinada',
           urls_assinadas = array(select jsonb_array_elements_text(coalesce(l -> 'urls_assinadas', '[]'::jsonb))),
           url_expira     = (l ->> 'url_expira')::timestamptz,
           atualizado_em  = now()
     where t.id = (l ->> 'id')::uuid;
    if found then
      n := n + 1;
      v_ids := v_ids || (l ->> 'id')::uuid;
    end if;
  end loop;

  -- Devolve quantas peças mudaram de verdade. Carga que não casa com peça nenhuma sai com zero, e zero
  -- aqui é uma resposta — não um sucesso silencioso.
  return jsonb_build_object('gravadas', n, 'pedidas', jsonb_array_length(p));
end;
$$;

revoke all on function public.cortes_gravar_links(jsonb) from public, anon, authenticated;
grant execute on function public.cortes_gravar_links(jsonb) to service_role;

-- ---------------------------------------------------------------------------------------------------
-- PROVAS — em episódio de prova, criado e apagado aqui dentro. Os dados do ECO01 não são tocados.
-- ---------------------------------------------------------------------------------------------------
do $$
declare
  v_ep uuid; v_peca uuid; v_res jsonb; v_antes int; v_depois int; v_lista jsonb;
begin
  select count(*) into v_antes from cortes.pecas;

  -- 1. Visitante e pessoa logada não executam nenhuma das duas.
  if has_function_privilege('anon', 'public.cortes_pecas_para_assinar(text, int)', 'execute')
     or has_function_privilege('authenticated', 'public.cortes_pecas_para_assinar(text, int)', 'execute')
     or has_function_privilege('anon', 'public.cortes_gravar_links(jsonb)', 'execute')
     or has_function_privilege('authenticated', 'public.cortes_gravar_links(jsonb)', 'execute') then
    raise exception 'PROVA 1 FALHOU: função de borda executável por quem não é a borda';
  end if;

  insert into cortes.episodios (codigo, serie, numero, titulo)
  values ('_PROVA_238_', 'prova', 0, 'prova da 238, apagada aqui mesmo') returning id into v_ep;

  -- 2. Peça SEM arquivo não entra na lista: não há o que assinar, e devolvê-la faria a borda pedir um
  --    link para o nada e gravar vazio por cima do que já existe.
  insert into cortes.pecas (episodio_id, tipo, destino, rede, titulo, legenda, status)
  values (v_ep, 'corte', 'bastidores', 'youtube', 'sem arquivo', '', 'rascunho');
  v_lista := public.cortes_pecas_para_assinar('_PROVA_238_');
  if jsonb_array_length(v_lista) <> 0 then
    raise exception 'PROVA 2 FALHOU: peça sem arquivo entrou na lista (%)', v_lista;
  end if;

  -- 3. Peça com arquivo entra, com os caminhos todos e sem repetição.
  -- `momento` diferente da peça acima porque há índice único em (episódio, corte, tipo, destino, rede,
  -- momento) — o ensaio pegou isto antes de a migration ir ao banco.
  insert into cortes.pecas (episodio_id, tipo, destino, rede, momento, titulo, legenda, status, arquivo, arquivos)
  values (v_ep, 'corte', 'bastidores', 'youtube', 'antes', 'com arquivo', '', 'rascunho',
          'a/um.mp4', array['a/um.mp4', 'a/dois.mp4'])
  returning id into v_peca;
  v_lista := public.cortes_pecas_para_assinar('_PROVA_238_');
  if jsonb_array_length(v_lista) <> 1
     or jsonb_array_length(v_lista -> 0 -> 'caminhos') <> 2 then
    raise exception 'PROVA 3 FALHOU: esperava 1 peça com 2 caminhos, veio %', v_lista;
  end if;

  -- 4. A gravação do link funciona e conta só o que mudou.
  v_res := public.cortes_gravar_links(jsonb_build_array(
    jsonb_build_object('id', v_peca, 'url_assinada', 'https://exemplo/um',
      'urls_assinadas', jsonb_build_array('https://exemplo/um', 'https://exemplo/dois'),
      'url_expira', (now() + interval '7 days')::text),
    jsonb_build_object('id', gen_random_uuid(), 'url_assinada', 'https://exemplo/fantasma',
      'urls_assinadas', '[]'::jsonb, 'url_expira', (now() + interval '7 days')::text)));
  if (v_res ->> 'gravadas')::int <> 1 or (v_res ->> 'pedidas')::int <> 2 then
    raise exception 'PROVA 4 FALHOU: esperava 1 gravada de 2 pedidas, veio %', v_res;
  end if;

  -- 5. Peça com link fresco sai da fila de renovação (senão a borda reassina tudo a cada passagem).
  v_lista := public.cortes_pecas_para_assinar(null, 48);
  if exists (select 1 from jsonb_array_elements(v_lista) e where (e ->> 'id')::uuid = v_peca) then
    raise exception 'PROVA 5 FALHOU: peça recém-assinada ainda aparece para renovar';
  end if;

  -- 6. E volta à fila quando o vencimento se aproxima.
  update cortes.pecas set url_expira = now() + interval '3 hours' where id = v_peca;
  v_lista := public.cortes_pecas_para_assinar(null, 48);
  if not exists (select 1 from jsonb_array_elements(v_lista) e where (e ->> 'id')::uuid = v_peca) then
    raise exception 'PROVA 6 FALHOU: peça a vencer em 3h não entrou na fila de renovação';
  end if;

  delete from cortes.pecas where episodio_id = v_ep;
  delete from cortes.episodios where id = v_ep;

  select count(*) into v_depois from cortes.pecas;
  if v_antes <> v_depois then
    raise exception 'PROVA FINAL FALHOU: as peças do ECO01 mudaram de número (% para %)', v_antes, v_depois;
  end if;

  raise notice 'as 6 provas passaram; peças do ECO01 intactas: %', v_depois;
end $$;

commit;
