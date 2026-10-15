-- 203 — o medidor de invoker escondia duas views, e eu reportei 22 onde eram 24
--
-- ✔ APLICADA em 15/10/2026 às 09:37:46 BRT, ensaiada antes — e o **ensaio me recusou**: `create or
--   replace view` não renomeia nem reordena coluna (*cannot change name of view column "reloptions"
--   to "motivo"*). Em vez de `drop`, `motivo` entrou no FIM. Depois: lista com **24** (22 sem a opção
--   + 2 desligadas, nomeadas), **0** das 55 grafadas `=on` entraram, e nenhuma das 22 saiu.
--
-- (Escrita como NÃO APLICADA.)
--
-- ═════ O ERRO É MEU, E É NA FERRAMENTA EM QUE EU CONFIO ═════
--   A 180 nasceu de um erro meu (a 178 zerou o `security_invoker` que a 177 havia posto por `alter view`)
--   e criou `ops.v_views_sem_invoker` **para eu não depender de olho**. O medidor pergunta:
--
--       c.reloptions is null or not c.reloptions::text ilike '%security_invoker%'
--
--   Isto testa se a opção **existe**, não se ela é **verdadeira**. Medido hoje nas 210 views legíveis pelo
--   app: **186 são invoker de fato**, **22 não têm a opção** — e **2 têm `security_invoker` explicitamente
--   DESLIGADO**. Essas 2 contêm o substring, então o medidor as declara seguras. O número certo de views
--   que rodam como dona é **24**, e eu reportei **22** ao dono e ao Geral em 09 e 10/10.
--
--   É o mesmo defeito de forma do que a 180 consertou: a regra cobria o caso que eu tinha em mente e não o
--   caso vizinho. Lá era "view nova nasce invoker" sem cobrir recriação; aqui é "a opção está escrita" sem
--   cobrir o valor dela. Medidor que erra para o lado de "está limpo" é pior que não ter medidor.
--
-- ═════ E HÁ DUAS GRAFIAS, QUE FOI O QUE ME FEZ ACHAR ═════
--   O Postgres guarda a string literal que se escreveu: **131** views dizem `security_invoker=true` e
--   **55** dizem `security_invoker=on`. São a mesma coisa. Quem compare com o texto `'security_invoker=true'`
--   classifica 55 views invoker como donas — o erro oposto, e também errado. Achei isto porque uma prova
--   minha de hoje testava exatamente essa igualdade e deu 0 numa view que é invoker.
--   Por isso o medidor passa a **ler o valor da opção**, em vez de procurar texto.
--
-- ═════ AS DUAS QUE ESTAVAM ESCONDIDAS, E O QUE ELAS SÃO ═════
--   · `public.v_mkt_credenciais_saude` (`=false`) — **definer de propósito, com trava no corpo**
--     (`where mkt.is_admin()`), e o comentário dela já dizia isso. Lê `mkt.credentials`, que não tem SELECT
--     para `authenticated`; expõe status e validade, nunca o segredo. Não é furo: é o padrão da casa
--     (R-043 — definer só com filtro explícito). O defeito era ela ser **invisível** na auditoria.
--   · `public.v_motivos_saida` (`=off`) — definer sobre `ops.motivos_perda`, com `where ativo` e **nenhum
--     filtro de papel**. É **lista de referência** (chave, rótulo, ordem, tipo de motivo de perda/descarte):
--     não tem PII, não tem linha por cliente nem por tenant, e `anon` não a lê. Não é exposição.
--     **Não troco o modo dela aqui, de propósito:** ela alimenta um seletor na tela, e invoker com a RLS de
--     `ops.motivos_perda` pode esvaziar o seletor **em silêncio** — que é exatamente o modo de falhar que
--     me mordeu na 183. Vai para a lista, com o comentário dizendo o que ela é, e quem decidir mexer decide
--     vendo a tela.
--
-- O QUE ESTA MIGRATION PROVA: que a lista passa de 22 para 24, que as 2 escondidas aparecem **pelo nome**,
--   que nenhuma das 55 grafadas `=on` entrou na lista por engano, e que as 22 que já estavam continuam lá
--   (comparadas **nome por nome** contra um retrato tirado dentro da transação, não contra número que eu
--   digitei). O que é **correto por construção, não medido**: que a lista continue certa para grafias que
--   o Postgres aceita e que hoje ninguém usa (`yes`/`no`, `1`/`0`, opção sem `=`) — estão tratadas no
--   código, sem caso real para medir.

begin;

do $$
declare v_hoje int; v_desligadas int;
begin
  select count(*) into v_hoje from ops.v_views_sem_invoker;
  if v_hoje <> 22 then
    raise exception 'esperava a lista velha com 22 e achei % — a 203 ja foi aplicada?', v_hoje;
  end if;
  select count(*) into v_desligadas
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
   where c.relkind = 'v' and c.reloptions::text ~* 'security_invoker=(false|off)';
  if v_desligadas <> 2 then
    raise exception 'esperava as 2 views com invoker desligado e achei % — conferir antes', v_desligadas;
  end if;
end $$;

-- retrato do que a lista velha mostra, para a prova (e) comparar nome por nome
create temporary table _antes_203 on commit drop as
  select schema, "view" from ops.v_views_sem_invoker;

create or replace view ops.v_views_sem_invoker
  with (security_invoker = true) as
with lida as (
  select n.nspname as schema,
         c.relname  as view,
         c.oid,
         c.reloptions,
         exists (select 1 from unnest(coalesce(c.reloptions, '{}'::text[])) o
                  where split_part(o, '=', 1) = 'security_invoker') as tem_opcao,
         (select split_part(o, '=', 2) from unnest(coalesce(c.reloptions, '{}'::text[])) o
           where split_part(o, '=', 1) = 'security_invoker')         as valor
    from pg_class c
    join pg_namespace n on n.oid = c.relnamespace
   where c.relkind = 'v'
     and n.nspname = any (array['public','analytics','mkt','ops','company','finance','marketing'])
     and (has_table_privilege('anon', c.oid, 'select')
       or has_table_privilege('authenticated', c.oid, 'select'))
)
-- A ordem das colunas repete a da 180 de propósito, e `motivo` entra no FIM: `create or replace view`
-- não renomeia nem reordena coluna, e o ensaio me recusou quando tentei pôr `motivo` no meio
-- (*cannot change name of view column "reloptions" to "motivo"*). Acrescentar no fim evita o `drop`.
select schema,
       view,
       has_table_privilege('anon', oid, 'select') as legivel_por_anon,
       coalesce(array_to_string(reloptions, ', '), '(nenhuma)') as reloptions,
       obj_description(oid, 'pg_class') as comentario,
       case when not tem_opcao then 'sem a opcao'
            else 'desligada explicitamente (' || coalesce(valor, 'sem valor') || ')' end as motivo
  from lida
 where not tem_opcao
    -- opção escrita e FALSA. A 180 testava só se o texto aparecia, e por isso escondia estas.
    or lower(coalesce(valor, '')) in ('false', 'off', 'no', '0')
 order by has_table_privilege('anon', oid, 'select') desc, schema, view;

comment on view ops.v_views_sem_invoker is
  '180/203: view legível pelo app que roda como DONA (postgres tem BYPASSRLS aqui) — a RLS não a protege. '
  'Nem toda linha é defeito: view de contrato que agrega entre tenants pode ser definer de propósito, mas '
  'então precisa de filtro explícito no corpo (R-043) e de comentário dizendo isso. '
  '**203:** passou a ler o VALOR de `security_invoker` em vez de procurar o texto. A versão da 180 testava '
  '`ilike ''%security_invoker%''`, que é "a opção existe", não "a opção é verdadeira" — e escondia as 2 '
  'views com a opção DESLIGADA, fazendo eu reportar 22 onde eram 24. A coluna `motivo` separa "sem a opcao" '
  'de "desligada explicitamente". Atenção a quem for reescrever isto: o Postgres guarda a grafia literal, e '
  'a casa tem as duas (`=true` em 131 views, `=on` em 55) — comparar com o texto ''security_invoker=true'' '
  'classifica 55 views invoker como donas.';

grant select on ops.v_views_sem_invoker to authenticated;

do $$
declare v_depois int; v_on int; v_perdidas text;
begin
  -- a) a lista passa de 22 para 24
  select count(*) into v_depois from ops.v_views_sem_invoker;
  if v_depois <> 24 then
    raise exception 'PROVA_203_FALHOU: esperava 24 na lista e achei %', v_depois;
  end if;

  -- b) CONTROLE POSITIVO (R-043 §4-A): as 2 que estavam escondidas aparecem PELO NOME. Lista que cresce
  --    sozinha não prova nada; o que motivou a migration tem de estar nela.
  if not exists (select 1 from ops.v_views_sem_invoker
                  where schema='public' and "view"='v_mkt_credenciais_saude') then
    raise exception 'PROVA_203_FALHOU: v_mkt_credenciais_saude continua escondida';
  end if;
  if not exists (select 1 from ops.v_views_sem_invoker
                  where schema='public' and "view"='v_motivos_saida') then
    raise exception 'PROVA_203_FALHOU: v_motivos_saida continua escondida';
  end if;
  if (select count(*) from ops.v_views_sem_invoker
       where motivo like 'desligada explicitamente%') <> 2 then
    raise exception 'PROVA_203_FALHOU: o motivo nao separou as 2 desligadas';
  end if;

  -- c) CONTROLE NEGATIVO: nenhuma das 55 grafadas `=on` entrou na lista. Era o erro oposto, e o que me
  --    fez achar o problema.
  select count(*) into v_on from ops.v_views_sem_invoker v
    join pg_class c on c.relname = v."view"
    join pg_namespace n on n.oid = c.relnamespace and n.nspname = v.schema
   where c.reloptions::text ~* 'security_invoker=on';
  if v_on <> 0 then
    raise exception 'PROVA_203_FALHOU: % view grafada =on entrou na lista como dona', v_on;
  end if;

  -- d) nada que já estava listado sumiu — comparado nome por nome contra o retrato da transação, não
  --    contra número digitado por mim (a 186 me ensinou isso).
  select string_agg(a.schema||'.'||a."view", ', ') into v_perdidas
    from _antes_203 a
   where not exists (select 1 from ops.v_views_sem_invoker d
                      where d.schema = a.schema and d."view" = a."view");
  if v_perdidas is not null then
    raise exception 'PROVA_203_FALHOU: sairam da lista sem motivo: %', v_perdidas;
  end if;

  -- e) o medidor continua invoker (na DEFINIÇÃO — R-043 §4-B) e fora do anon
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='ops' and c.relname='v_views_sem_invoker'
                    and (select lower(split_part(o,'=',2)) from unnest(c.reloptions) o
                          where split_part(o,'=',1)='security_invoker') in ('true','on')) then
    raise exception 'PROVA_203_FALHOU: o proprio medidor perdeu o security_invoker';
  end if;
  if pg_catalog.has_table_privilege('anon','ops.v_views_sem_invoker','select') then
    raise exception 'PROVA_203_FALHOU: abri o medidor para anon';
  end if;
end $$;

commit;
