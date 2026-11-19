-- ============================================================
-- 262 — cortes.historias ganha `ordem` (número na série) e `relevancia`
-- Banco: o da casa (hswyopqvnolqpmprqvzh). Depende da 260 e da 261, aplicadas hoje, 18/11/2026.
-- Pedido: Geral, 21h26, repassando o dono (21h23, canal do Geral): "a ideia são todos os agents de cada app,
--   alimentar o cockpit, ele exige de cada app que mande todas as informações com datas, relevancias e tudo mais,
--   assim teriamos uma sequencia que o cockpit controla, o cortes busca e sobe para o banco".
--   Desenho: Cockpit/bastidores/PONTE-das-historias-2026-11-18.md.
--
-- TRÊS ESCOLHAS QUE NÃO SÃO ÓBVIAS, e por que são assim:
--
-- 1) `ordem` é "ausente mantém, nulo explícito apaga" (como `saiu_em`, migration 242).
--    A ordem NÃO mora no arquivo da história: quem numera e trava é o Geral (`SEQUENCIA.md`). O motor do Cortes
--    manda a base inteira a cada rodada. Se "sem ordem no corpo" apagasse a coluna, a primeira rodada depois da
--    trava zeraria a numeração do Geral **em silêncio** — a tela mostraria a série sem ordem e ninguém saberia
--    que foi a sincronização. Mandar `"ordem": null` de propósito continua apagando.
--
-- 1-b) CORREÇÃO MEDIDA DEPOIS DE APLICAR (18/11, 22h): eu justifiquei a regra de cima dizendo que, sem ela, a
--    primeira rodada do motor zeraria a numeração do Geral. **Fui ler o motor e isso não acontece.**
--    `digiai_cortes/motor/historias.py` manda `ordem` SEMPRE, com `null` quando a linha do `SEQUENCIA.md` não está
--    travada — então "ausente mantém" nunca dispara por ele, e `null` explícito apaga, que é o certo: a ordem
--    pertence ao `SEQUENCIA.md`, e ordem apagada significa "o Geral destravou", não "a sincronização comeu".
--    A regra fica, como defesa para QUALQUER outro escritor (uma versão antiga do motor, uma correção à mão, um
--    segundo motor amanhã), mas o risco que eu descrevi ao Geral era maior do que o medido, e isso está corrigido
--    por escrito com ele. Afirmei sobre um motor que eu não tinha lido.
--
-- 2) `relevancia` é o contrário: vem do arquivo, então ausente APAGA.
--    Se alguém tira a relevância do arquivo, o banco não pode continuar afirmando uma que já não existe.
--
-- 3) `relevancia` só aceita alta, media, baixa (ou vazio), e o texto é normalizado antes ("Média" → "media").
--    Texto livre numa coluna de classificação é pior que coluna vazia: "Alta " e "alta" viram duas gavetas, e o
--    filtro da tela mostra metade dizendo que mostra tudo. Valor que não é um dos três **recusa a gravação**,
--    para o arquivo do Cockpit ser corrigido em vez de o banco guardar lixo com cara de classificação.
--
-- `ordem` é única (sem contar nulos), mas DEFERRABLE: o motor que troca o 3 com o 4 passa pelo estado em que os
--   dois existem, e a conferência fica para o fim da transação. Série com dois números 3 recusa a rodada inteira,
--   alto — é o defeito que a 261 acabou de consertar, não vale guardá-lo de outra forma.
--
-- Ensaio: FEITO (rollback) + 5 sabotagens, todas mordendo: ausente apagando a ordem; nulo explícito não
--   apagando; relevância aceitando texto livre; ordem repetida passando; relevância sumindo do arquivo e o banco
--   mantendo a antiga.
--   Honestidade sobre uma delas: a da relevância morre no `check` da coluna (23514), não na minha prova — há duas
--   guardas, e a de dentro da função é a que dá a frase que o agente do Cockpit precisa ler. O que a prova
--   demonstra pelo lado positivo é a normalização ("  Média " → "media") e que a recusa do valor inventado vem
--   da função (ela exige a frase "só alta, media ou baixa", não o código do check).
-- Regras: [x] R-043 a view segue invoker  [x] R-044 coluna na tabela do domínio, public só a view
--         [x] sem PII  [x] grants conferidos depois do replace
-- ============================================================
begin;

do $$ begin
  if to_regclass('cortes.historias') is null or to_regprocedure('public.cortes_gravar_historias(jsonb)') is null then
    raise exception 'a 260 não está aplicada';
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema = 'cortes' and table_name = 'historias' and column_name in ('ordem', 'relevancia')) then
    raise exception 'ordem ou relevancia já existe';
  end if;
end $$;

alter table cortes.historias
  add column ordem      integer,
  add column relevancia text not null default ''
    check (relevancia in ('', 'alta', 'media', 'baixa'));

comment on column cortes.historias.ordem is
  'Número da história na série, dado e travado pelo Geral em SEQUENCIA.md. Não mora no arquivo da história: por isso a gravação sem este campo MANTÉM o valor, e só "ordem": null apaga.';
comment on column cortes.historias.relevancia is
  'alta, media ou baixa, proposta pelo agente do app no arquivo da história. Vem do arquivo: gravação sem o campo apaga, porque o banco não afirma relevância que o arquivo já não diz.';

alter table cortes.historias
  add constraint historias_ordem_unica unique (ordem) deferrable initially deferred;

create or replace function public.cortes_gravar_historias(p jsonb)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare h jsonb; n int := 0; v_rel text;
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'sem permissão para gravar no cortes' using errcode = '42501';
  end if;
  for h in select * from jsonb_array_elements(coalesce(nullif(p -> 'historias', 'null'::jsonb), '[]'::jsonb)) loop
    if coalesce(h ->> 'id', '') = '' or coalesce(h ->> 'titulo', '') = '' or coalesce(h ->> 'arquivo', '') = ''
       or coalesce(h ->> 'marca', '') = '' or coalesce(h ->> 'dominio', '') not in ('clearix', 'geral') then
      raise exception 'história sem id, titulo, arquivo, marca ou domínio';
    end if;
    -- a relevância é normalizada antes de qualquer coisa: acento e maiúscula não criam gaveta nova
    v_rel := translate(lower(btrim(coalesce(h ->> 'relevancia', ''))), 'áéíóúâêôãõç', 'aeiouaeoaoc');
    if v_rel not in ('', 'alta', 'media', 'baixa') then
      raise exception 'relevância "%" na história %: só alta, media ou baixa', h ->> 'relevancia', h ->> 'id';
    end if;
    insert into cortes.historias as t (id, dominio, apps, titulo, estado, data_do_fato, data_do_problema, data_da_descoberta,
        data_do_conserto, gancho, fato, conserto, aprendizado, numeros_no_ar, nao_vai_ao_ar, fonte, rende, liberada,
        completa, falta, pronta_para_video, usado_em, arquivo, marca, ordem, relevancia)
    values (h ->> 'id', h ->> 'dominio',
            array(select jsonb_array_elements_text(nullif(h -> 'apps', 'null'::jsonb))),
            h ->> 'titulo', coalesce(h ->> 'estado', 'sem_estado'),
            (h ->> 'data_do_fato')::date, (h ->> 'data_do_problema')::date, (h ->> 'data_da_descoberta')::date,
            (h ->> 'data_do_conserto')::date,
            coalesce(h ->> 'gancho', ''), coalesce(h ->> 'fato', ''), coalesce(h ->> 'conserto', ''),
            coalesce(h ->> 'aprendizado', ''), coalesce(h ->> 'numeros_no_ar', ''), coalesce(h ->> 'nao_vai_ao_ar', ''),
            coalesce(h ->> 'fonte', ''),
            array(select jsonb_array_elements_text(nullif(h -> 'rende', 'null'::jsonb))),
            coalesce((h ->> 'liberada')::boolean, false), coalesce((h ->> 'completa')::boolean, false),
            array(select jsonb_array_elements_text(nullif(h -> 'falta', 'null'::jsonb))),
            coalesce((h ->> 'pronta_para_video')::boolean, false), coalesce(h ->> 'usado_em', ''),
            h ->> 'arquivo', h ->> 'marca', (h ->> 'ordem')::int, v_rel)
    on conflict (id) do update
      set dominio = excluded.dominio, apps = excluded.apps, titulo = excluded.titulo, estado = excluded.estado,
          data_do_fato = excluded.data_do_fato, data_do_problema = excluded.data_do_problema,
          data_da_descoberta = excluded.data_da_descoberta, data_do_conserto = excluded.data_do_conserto,
          gancho = excluded.gancho, fato = excluded.fato, conserto = excluded.conserto, aprendizado = excluded.aprendizado,
          numeros_no_ar = excluded.numeros_no_ar, nao_vai_ao_ar = excluded.nao_vai_ao_ar, fonte = excluded.fonte,
          rende = excluded.rende, liberada = excluded.liberada, completa = excluded.completa, falta = excluded.falta,
          pronta_para_video = excluded.pronta_para_video, usado_em = excluded.usado_em, arquivo = excluded.arquivo,
          marca = excluded.marca,
          relevancia = excluded.relevancia,
          -- ausente mantém, nulo explícito apaga: a chave no corpo é que decide, não o valor que chegou
          ordem = case when h ? 'ordem' then excluded.ordem else t.ordem end,
          atualizado_em = case when t.marca is distinct from excluded.marca then now() else t.atualizado_em end;
    n := n + 1;
  end loop;
  return jsonb_build_object('historias', n);
end $$;

revoke all on function public.cortes_gravar_historias(jsonb) from public, anon, authenticated;
grant execute on function public.cortes_gravar_historias(jsonb) to service_role;

create or replace view public.v_cortes_historias with (security_invoker = true) as
  select h.id, h.dominio, h.apps, h.titulo, h.estado, h.data_do_fato, h.data_do_problema, h.data_da_descoberta,
         h.data_do_conserto, h.gancho, h.fato, h.conserto, h.aprendizado, h.numeros_no_ar, h.nao_vai_ao_ar, h.fonte,
         h.rende, h.liberada, h.completa, h.falta, h.pronta_para_video, h.usado_em, h.arquivo, h.atualizado_em,
         h.ordem, h.relevancia
    from cortes.historias h;
revoke all on public.v_cortes_historias from public, anon;
grant select on public.v_cortes_historias to authenticated, service_role;

-- ============================================================
-- Provas
-- ============================================================

-- 2-a) a view entrega as duas colunas novas, e anon continua de fora
do $$ declare negou boolean := false; begin
  if (select count(*) from information_schema.columns
       where table_schema = 'public' and table_name = 'v_cortes_historias' and column_name in ('ordem', 'relevancia')) <> 2 then
    raise exception 'a view não expõe ordem e relevancia';
  end if;
  if exists (select 1 from information_schema.role_table_grants
              where table_schema = 'public' and table_name = 'v_cortes_historias' and grantee in ('anon', 'public')) then
    raise exception 'o replace da view abriu para anon';
  end if;
  if exists (select 1 from information_schema.role_routine_grants
              where routine_schema = 'public' and routine_name = 'cortes_gravar_historias' and grantee in ('anon', 'authenticated', 'public')) then
    raise exception 'o replace da função abriu a gravação';
  end if;
  set local role authenticated;
  perform set_config('request.jwt.claims', '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  begin perform public.cortes_gravar_historias('{"historias":[]}'::jsonb); exception when insufficient_privilege then negou := true; end;
  reset role;
  if not negou then raise exception 'logado grava história'; end if;
end $$;

-- 2-b) o coração desta migration: ausente MANTÉM a ordem, nulo explícito APAGA
do $$ declare base jsonb; v_ordem int; begin
  base := '{"historias":[{"id":"prova-o-1","dominio":"geral","titulo":"t","arquivo":"a","marca":"m"}]}'::jsonb;
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);

  perform public.cortes_gravar_historias(jsonb_set(base, '{historias,0,ordem}', '7'));
  reset role;
  select ordem into v_ordem from cortes.historias where id = 'prova-o-1';
  if v_ordem <> 7 then raise exception 'a ordem não foi gravada: %', v_ordem; end if;

  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.cortes_gravar_historias(base);                                  -- SEM o campo: tem de manter
  reset role;
  select ordem into v_ordem from cortes.historias where id = 'prova-o-1';
  if v_ordem is distinct from 7 then
    raise exception 'a sincronização apagou a ordem do Geral em silêncio (ficou %)', v_ordem;
  end if;

  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.cortes_gravar_historias(jsonb_set(base, '{historias,0,ordem}', 'null'));   -- nulo de propósito
  reset role;
  select ordem into v_ordem from cortes.historias where id = 'prova-o-1';
  if v_ordem is not null then raise exception 'nulo explícito não apagou a ordem (ficou %)', v_ordem; end if;
  delete from cortes.historias where id = 'prova-o-1';
end $$;

-- 2-c) relevância: normaliza acento e maiúscula, apaga quando sai do arquivo, e recusa o que não é das três
do $$ declare base jsonb; v_rel text; negou boolean; msg text; begin
  base := '{"historias":[{"id":"prova-r-1","dominio":"geral","titulo":"t","arquivo":"a","marca":"m"}]}'::jsonb;
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.cortes_gravar_historias(jsonb_set(base, '{historias,0,relevancia}', '"  Média "'));
  reset role;
  select relevancia into v_rel from cortes.historias where id = 'prova-r-1';
  if v_rel <> 'media' then raise exception 'a relevância não foi normalizada: "%"', v_rel; end if;

  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  perform public.cortes_gravar_historias(base);                                  -- saiu do arquivo: tem de apagar
  reset role;
  select relevancia into v_rel from cortes.historias where id = 'prova-r-1';
  if v_rel <> '' then raise exception 'o banco seguiu afirmando relevância que o arquivo não diz: "%"', v_rel; end if;

  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  negou := false;
  begin perform public.cortes_gravar_historias(jsonb_set(base, '{historias,0,relevancia}', '"urgentissima"'));
  exception when others then negou := true; msg := sqlerrm; end;
  reset role;
  if not negou then raise exception 'relevância inventada entrou no banco'; end if;
  if msg not like '%só alta, media ou baixa%' then raise exception 'recusou por outro motivo: %', msg; end if;
  delete from cortes.historias where id = 'prova-r-1';
end $$;

-- 2-d) duas histórias com o mesmo número na série são recusadas; trocar 3 por 4 na mesma rodada passa
do $$ declare negou boolean := false; begin
  insert into cortes.historias (id, dominio, titulo, estado, arquivo, marca, ordem) values
    ('prova-u-1', 'geral', 'a', 'x', 'a', 'm', 3),
    ('prova-u-2', 'geral', 'b', 'x', 'a', 'm', 4);
  -- a conferência é no fim da transação; aqui eu a trago para agora, para poder pegar o erro
  set constraints all immediate;
  begin
    update cortes.historias set ordem = 3 where id = 'prova-u-2';
    set constraints all immediate;
  exception when unique_violation then negou := true; end;
  if not negou then raise exception 'duas histórias ficaram com o número 3 da série'; end if;

  -- a troca honesta (3 ↔ 4) passa porque a conferência fica para o fim
  set constraints all deferred;
  update cortes.historias set ordem = 4 where id = 'prova-u-1';
  update cortes.historias set ordem = 3 where id = 'prova-u-2';
  set constraints all immediate;
  if (select ordem from cortes.historias where id = 'prova-u-1') <> 4
     or (select ordem from cortes.historias where id = 'prova-u-2') <> 3 then
    raise exception 'a troca de ordem não valeu';
  end if;

  -- e muitas histórias sem número convivem (nulo não briga com nulo)
  insert into cortes.historias (id, dominio, titulo, estado, arquivo, marca) values
    ('prova-u-3', 'geral', 'c', 'x', 'a', 'm'), ('prova-u-4', 'geral', 'd', 'x', 'a', 'm');
  delete from cortes.historias where id like 'prova-u-%';
end $$;

commit;

-- Reversão:
--   alter table cortes.historias drop constraint historias_ordem_unica;
--   alter table cortes.historias drop column relevancia, drop column ordem;   -- a view precisa cair antes
--   (e aplicar de novo o corpo da função e da view como estavam na 260)
