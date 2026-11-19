-- ============================================================
-- 261 — o pedido de capítulo guarda a sequência em que o dono escolheu
-- Banco: o da casa (hswyopqvnolqpmprqvzh). Depende da 260, aplicada hoje, 18/11/2026, 21h05.
-- Pedido: dono, canal do Geral, 18/11/2026, 21h10: "cuidado que temos que ter storytelling, e para isso a
--   sequencia de ideias tem que vir cravada na sequencia". Achado pelo Geral na revisão da 260.
-- O defeito: `array_agg(distinct x)` devolve os ids em ordem alfabética. O capítulo nasceria com as histórias
--   fora da ordem em que ele as escolheu — e ordem errada, em storytelling, é a história errada.
-- O segundo defeito, no mesmo trecho, que eu só vi ao consertar o primeiro: tirando o `distinct` sai também o
--   `coalesce` que o protegia. Sem ele, lista vazia faz `array_agg` devolver NULL, `cardinality(null)` é NULL,
--   o `if ... < 1` não dispara (NULL não é falso nem verdadeiro) e a função seguiria com uma lista nula.
--   O coalesce fica, agora dentro da subconsulta. Prova 2-c abaixo.
-- Conserto: tira a duplicata pela PRIMEIRA aparição e guarda a ordem de chegada (`with ordinality`).
-- Ensaio: FEITO (rollback) + sabotagem (voltar ao `array_agg(distinct)`: a prova 2-b morde).
-- Regras: [x] R-043 a definer continua com o portão de papel explícito dentro, e ele fecha no nulo
--         [x] as recusas da 260 reprovadas aqui, para não consertar a ordem e abrir o portão
-- ============================================================
begin;

do $$ begin
  if to_regprocedure('public.cortes_pedir_capitulo(text[], text)') is null then
    raise exception 'a 260 não está aplicada';
  end if;
end $$;

create or replace function public.cortes_pedir_capitulo(p_historias text[], p_observacao text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare v_ids text[]; v_ruim text; v_id uuid;
begin
  if coalesce(public.current_role_code(), '') <> 'super_admin' then
    raise exception 'só o dono pede capítulo' using errcode = '42501';
  end if;
  -- A ordem é parte do pedido: o capítulo se conta na sequência que ele escolheu. Repetida sai, mas quem fica
  -- é a PRIMEIRA aparição, no lugar dela. O coalesce é o que impede lista nula de passar pelo if de baixo.
  select coalesce(array_agg(s.x order by s.ord), '{}') into v_ids
    from (select t.x, min(t.ord) as ord
            from unnest(coalesce(p_historias, '{}')) with ordinality as t(x, ord)
           where coalesce(btrim(t.x), '') <> ''
           group by t.x) s;
  if cardinality(v_ids) < 1 or cardinality(v_ids) > 12 then
    raise exception 'escolha de 1 a 12 histórias';
  end if;
  select x into v_ruim from unnest(v_ids) x
   where not exists (select 1 from cortes.historias h where h.id = x and h.liberada and h.usado_em = '') limit 1;
  if v_ruim is not null then
    raise exception 'a história % não existe, não está liberada ou já foi usada', v_ruim;
  end if;
  select x into v_ruim from unnest(v_ids) x
   where exists (select 1 from cortes.pedidos q where q.estado in ('pedido', 'em_roteiro') and x = any (q.historias)) limit 1;
  if v_ruim is not null then
    raise exception 'a história % já está em outro pedido aberto', v_ruim;
  end if;
  insert into cortes.pedidos (historias, observacao, pedido_por)
  values (v_ids, coalesce(btrim(p_observacao), ''), auth.uid())
  returning id into v_id;
  return jsonb_build_object('id', v_id, 'historias', cardinality(v_ids));
end $$;

comment on function public.cortes_pedir_capitulo(text[], text) is
  'O pedido de capítulo do dono. Guarda a ordem em que ele escolheu: a sequência é parte da história.';

-- 2) Provas
-- 2-a) o grant não mudou com o create or replace
do $$ begin
  if exists (select 1 from information_schema.role_routine_grants
              where routine_schema = 'public' and routine_name = 'cortes_pedir_capitulo' and grantee in ('anon', 'public')) then
    raise exception 'o replace devolveu execução a anon';
  end if;
  if not exists (select 1 from information_schema.role_routine_grants
                  where routine_schema = 'public' and routine_name = 'cortes_pedir_capitulo' and grantee = 'authenticated') then
    raise exception 'o dono perdeu a execução';
  end if;
end $$;

-- 2-b) [b, a, b] grava [b, a]: a duplicata sai e a ordem dele fica
do $$
declare v_dono text := '2956f8d9-f161-4333-a962-96eab02600fe'; v_id uuid; v_guardado text[]; begin
  insert into cortes.historias (id, dominio, titulo, estado, arquivo, marca, liberada) values
    ('prova-ord-a', 'geral', 'a', 'corrigido', 'x', 'm', true),
    ('prova-ord-b', 'geral', 'b', 'corrigido', 'x', 'm', true),
    ('prova-ord-c', 'geral', 'c', 'corrigido', 'x', 'm', true);
  set local role authenticated;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_dono), true);
  v_id := (public.cortes_pedir_capitulo(array['prova-ord-b', 'prova-ord-a', 'prova-ord-b']) ->> 'id')::uuid;
  reset role;
  select historias into v_guardado from cortes.pedidos where id = v_id;
  if v_guardado <> array['prova-ord-b', 'prova-ord-a'] then
    raise exception 'a sequência do dono não foi guardada: %', v_guardado;
  end if;

  -- a ordem volta igual pela porta do motor (não é só o que está na tabela)
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if (select x -> 'historias' from jsonb_array_elements(public.cortes_ler_pedidos() -> 'pedidos') x
       where x ->> 'id' = v_id::text) <> '["prova-ord-b", "prova-ord-a"]'::jsonb then
    raise exception 'o motor recebe a lista fora da ordem';
  end if;
  reset role;
  delete from cortes.pedidos where id = v_id;
  delete from cortes.historias where id like 'prova-ord-%';
end $$;

-- 2-c) lista vazia e lista de vazios continuam recusadas (o coalesce de dentro)
do $$
declare v_dono text := '2956f8d9-f161-4333-a962-96eab02600fe'; caso text; negou boolean; msg text; begin
  foreach caso in array array['vazia', 'brancos'] loop
    set local role authenticated;
    perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_dono), true);
    negou := false;
    begin
      if caso = 'vazia' then perform public.cortes_pedir_capitulo('{}'::text[]);
      else perform public.cortes_pedir_capitulo(array['', '   ']); end if;
    exception when others then negou := true; msg := sqlerrm; end;
    reset role;
    if not negou then raise exception 'lista % passou', caso; end if;
    if msg not like '%escolha de 1 a 12%' then raise exception 'lista % morreu por outro motivo: %', caso, msg; end if;
  end loop;
end $$;

-- 2-d) as recusas da 260 continuam de pé: consertar a ordem não pode abrir o portão nem a conferência
do $$
declare v_dono text := '2956f8d9-f161-4333-a962-96eab02600fe'; v_estado text; v_msg text; negou boolean; begin
  insert into cortes.historias (id, dominio, titulo, estado, arquivo, marca, liberada, usado_em) values
    ('prova-r-boa',     'geral', 'boa',     'corrigido', 'x', 'm', true,  ''),
    ('prova-r-travada', 'geral', 'travada', 'corrigido', 'x', 'm', false, ''),
    ('prova-r-usada',   'geral', 'usada',   'corrigido', 'x', 'm', true,  'ECO01');

  -- quem não é o dono: tem de ser O PORTÃO a recusar, com história boa na mão
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  v_estado := null;
  begin perform public.cortes_pedir_capitulo(array['prova-r-boa']);
  exception when others then v_estado := sqlstate; v_msg := sqlerrm; end;
  reset role;
  if v_estado <> '42501' or v_msg not like '%só o dono pede capítulo%' then
    raise exception 'não foi o portão que recusou: % / %', v_estado, v_msg;
  end if;

  -- o dono: recusa travada e usada, e não grava meio pedido
  set local role authenticated;
  perform set_config('request.jwt.claims', format('{"sub":"%s","role":"authenticated"}', v_dono), true);
  negou := false;
  begin perform public.cortes_pedir_capitulo(array['prova-r-travada']); exception when others then negou := true; end;
  if not negou then raise exception 'passou história não liberada'; end if;
  negou := false;
  begin perform public.cortes_pedir_capitulo(array['prova-r-usada']); exception when others then negou := true; end;
  if not negou then raise exception 'passou história já usada'; end if;
  negou := false;
  begin perform public.cortes_pedir_capitulo(array['prova-r-boa', 'prova-r-travada']); exception when others then negou := true; end;
  if not negou then raise exception 'lista com uma ruim passou'; end if;
  reset role;
  if exists (select 1 from cortes.pedidos where 'prova-r-boa' = any (historias)) then
    raise exception 'gravou meio pedido';
  end if;
  delete from cortes.historias where id like 'prova-r-%';
end $$;

commit;

-- Reversão: aplicar de novo o corpo da função como estava na 260 (com `array_agg(distinct x)`) — e perder a
--   sequência do dono outra vez, que é justamente o defeito. Nada mais muda: não há objeto novo aqui.
