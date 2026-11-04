-- 214 — a view "por cliente" volta a ser legível pelo app, sem abrir o registro de empresas
--
-- ✔ APLICADA em 04/11/2026, ensaiada antes (o ensaio recusou a 1.a versão, ver abaixo). Provada DEPOIS pelo
--   caminho real (PostgREST, JWT assinado): **como staff, HTTP 200 com 267 linhas** — paga 526, casa 189,
--   sem espécie 1.055 (cresceu desde 31/10 porque evento continua chegando); **token sem membro, HTTP 200
--   com 0 linhas** (antes era 403 para todos). `v_ops_empresas_especie`: 12 empresas para staff, 0 para
--   quem não é.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: dono, 04/11, no canal do app: "pode consertar a view".
--
-- ═════ O DEFEITO É MEU E A CAUSA É O ATALHO DE PROVA, NÃO O SQL ═════
--   `public.v_analytics_eventos_cliente_dia` (209/210) devolve **HTTP 403, `permission denied for table
--   empresas`** para QUALQUER usuário do app — inclusive o dono. Medido em 04/11 por PostgREST com JWT
--   assinado de staff de verdade. A view é `security_invoker` (certo, R-043) e lê `ops.empresas`, que está
--   **fechada**: RLS ligada, **0 políticas**, sem grant para `authenticated` (medido).
--
--   Por que passou: eu provei a view **dentro da migration, como `postgres`**, que tem BYPASSRLS e lê tudo.
--   Os números que eu reportei em 31/10 (501 / 182 / 1.027) eram verdadeiros e **a tela nunca os leria**. É
--   o mesmo atalho de 30/10, quando `set role` sozinho me fez chamar de "artefato" um timeout real. A lição
--   não é "prove mais": é **provar pelo papel e pela identidade de quem vai ler**.
--
-- ═════ POR QUE O CONSERTO NÃO É `GRANT` ═════
--   `grant select on ops.empresas to authenticated` **pioraria**: com RLS ligada e 0 políticas, a leitura
--   passa a ser permitida e devolve **0 linhas**. O 403 viraria `cliente_tipo = null` em TODAS as linhas —
--   erro silencioso no lugar de erro visível. Vazio que significa "não pude ler" não pode parecer "não tem
--   espécie". Pelo mesmo motivo eu não crio política ampla em `ops.empresas`: a tabela guarda CNPJ e razão
--   social, e a view precisa de **duas colunas** (slug e tipo).
--
-- ═════ O QUE ESTA MIGRATION FAZ ═════
--   Uma view estreita `public.v_ops_empresas_especie` com **só `slug` e `tipo`** — sem CNPJ, sem razão
--   social — **não-invoker** (roda como dona, logo alcança `ops.empresas`) e com **portão explícito no
--   corpo**: `where public.is_staff()`. É o que a R-043 exige de objeto definer: filtro explícito de papel
--   escrito ali, não RLS herdada. `is_staff()` não leva argumento e é STABLE, então o planejador a avalia
--   **uma vez**, e não por linha — a diferença entre esta view e o que estourou o timeout em 30/10.
--   `ops.empresas` continua fechada; nada ganha grant novo além desta view.
--
-- ═════ O QUE O ENSAIO ME ENSINOU, E MUDOU A PROVA ═════
--   A primeira versão desta migration provava os números **como `postgres`** — e o ensaio recusou, com
--   `PROVA_214_FALHOU: mello-loja sumiu ou perdeu a especie`. Motivo: o portão é `is_staff()`, que devolve
--   **false para `postgres`** (não há `auth.uid()`), então a view estreita devolve 0 linhas para quem roda a
--   migration. A prova falhou pelo motivo certo: **postgres não é o leitor desta view.** Por isso as provas
--   de número foram para DENTRO do bloco com `set local role authenticated` + claims do dono — o papel e a
--   identidade de quem vai ler. O ensaio pagou a migration antes de ela existir, de novo.
--
--   Consequência aceita de propósito: `service_role` (edge function) também lê 0 linhas aqui. Está certo —
--   função de servidor lê `ops.empresas` direto, que é dela por direito. Abrir o portão para contexto
--   privilegiado deixaria a view **improvável** por este caminho (`set local role` não troca `session_user`,
--   que continua `postgres`), e eu prefiro portão estreito e provável a portão largo e não medido.

begin;

do $$
begin
  if to_regclass('public.v_analytics_eventos_cliente_dia') is null then
    raise exception 'a view da 209/210 nao existe';
  end if;
  -- as duas premissas do diagnostico, conferidas e nao supostas
  if has_table_privilege('authenticated','ops.empresas','select') then
    raise exception 'ops.empresas JA esta aberta para authenticated — rever o diagnostico da 214';
  end if;
  if (select count(*) from pg_policies where schemaname='ops' and tablename='empresas') <> 0 then
    raise exception 'ops.empresas ganhou politica — rever, porque o grant passaria a devolver linha';
  end if;
  if to_regclass('public.v_ops_empresas_especie') is not null then
    raise exception 'v_ops_empresas_especie ja existe — a 214 ja foi aplicada?';
  end if;
end $$;

create view public.v_ops_empresas_especie
  with (security_invoker = false) as
 select e.slug, e.tipo
   from ops.empresas e
  where public.is_staff();

comment on view public.v_ops_empresas_especie is
  '214: só `slug` e `tipo` de `ops.empresas` — sem CNPJ e sem razão social. NÃO-INVOKER de propósito: roda '
  'como dona para alcançar `ops.empresas`, que fica fechada (RLS ligada, 0 políticas, sem grant). O portão '
  'é o `where public.is_staff()` ESCRITO NO CORPO, como a R-043 exige de objeto definer — RLS não protege '
  'view de dona. Existe porque `grant select on ops.empresas` devolveria 0 linhas (RLS sem política) e '
  'trocaria um 403 visível por `cliente_tipo` nulo em silêncio.';

grant select on public.v_ops_empresas_especie to authenticated;
revoke all on public.v_ops_empresas_especie from anon;

-- a view de cliente passa a ler a view estreita, e nada mais muda nela
create or replace view public.v_analytics_eventos_cliente_dia
  with (security_invoker = true) as
 select (e.occurred_at at time zone 'America/Sao_Paulo')::date       as dia,
        e.cliente_slug                                               as cliente,
        case when e.cliente_slug is not null then null
             else (select p.slug from public.v_ops_empresas_especie p
                    where e.product is not null
                      and (e.product = p.slug or e.product like p.slug || '-%')
                    order by length(p.slug) desc limit 1)
        end                                                          as cliente_inferido_do_product,
        (e.cliente_slug is not null)                                 as cliente_declarado,
        (e.cliente_slug is not null
           and exists (select 1 from public.v_ops_empresas_especie p where p.slug = e.cliente_slug))
                                                                     as cliente_conhecido,
        e.product,
        e.event_code,
        count(*)::int                                                as eventos,
        count(distinct e.session_id)::int                             as sessoes,
        (select p.tipo from public.v_ops_empresas_especie p
          where p.slug = coalesce(
            e.cliente_slug,
            (select q.slug from public.v_ops_empresas_especie q
              where e.product is not null
                and (e.product = q.slug or e.product like q.slug || '-%')
              order by length(q.slug) desc limit 1)))                as cliente_tipo
   from analytics.events_log e
  where not coalesce(e.teste, false)
  group by 1, 2, 3, 4, 5, 6, 7, 10;

comment on view public.v_analytics_eventos_cliente_dia is
  '209/210/214: evento por cliente e por dia de Brasília (não UTC). Colunas que de propósito não se '
  'misturam: `cliente` é o que a ORIGEM DECLAROU, `cliente_inferido_do_product` é dedução pelo rótulo '
  '`product` (só quando não há declarado, e nunca gravada na tabela), `cliente_conhecido` diz se o slug '
  'declarado existe no registro, e `cliente_tipo` diz se é `cliente` que paga ou `propria`/`parceira`/'
  '`pessoal` da casa, para um total chamado "por cliente" não somar as duas espécies. **214: lê '
  '`public.v_ops_empresas_especie` (slug e tipo, com portão de staff) em vez de `ops.empresas` direto — '
  'antes disto a view devolvia 403 para todo mundo, inclusive o dono, e eu só não vi porque provei como '
  'postgres.** Evento de teste fica fora. Linha com `cliente` e `cliente_inferido_do_product` nulos é o que '
  'ninguém sabe de quem é, e esse número tem de aparecer na tela em vez de virar zero.';

grant select on public.v_analytics_eventos_cliente_dia to authenticated;
revoke all on public.v_analytics_eventos_cliente_dia from anon;

do $$
declare v_n int; v_tipo text; v_cols int;
begin
  -- a) a view estreita NAO carrega PII: duas colunas, e nenhuma de documento
  select count(*) into v_cols from information_schema.columns
   where table_schema='public' and table_name='v_ops_empresas_especie';
  if v_cols <> 2 then raise exception 'PROVA_214_FALHOU: a view estreita ficou com % colunas', v_cols; end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='v_ops_empresas_especie'
                and column_name in ('cnpj','razao_social','nome')) then
    raise exception 'PROVA_214_FALHOU: vazou coluna de cadastro na view estreita';
  end if;

  -- b) `ops.empresas` continua FECHADA: o conserto nao podia abrir a tabela
  if has_table_privilege('authenticated','ops.empresas','select')
     or has_table_privilege('anon','ops.empresas','select') then
    raise exception 'PROVA_214_FALHOU: abri ops.empresas';
  end if;
  if pg_catalog.has_table_privilege('anon','public.v_ops_empresas_especie','select') then
    raise exception 'PROVA_214_FALHOU: abri a view estreita para anon';
  end if;

  -- c) como `postgres` a view estreita devolve 0 linhas, e isto E o portao funcionando: `is_staff()` e
  --    false sem `auth.uid()`. As provas de NUMERO ficam no bloco (d), sob a identidade do dono.
  select count(*) into v_n from public.v_ops_empresas_especie;
  if v_n <> 0 then
    raise exception 'PROVA_214_FALHOU: postgres (sem auth.uid) leu % empresas — o portao nao esta no corpo', v_n;
  end if;
end $$;

-- d) PELO PAPEL E PELA IDENTIDADE DE QUEM LE — a prova que faltou na 209/210.
--    `is_staff()` le so `auth.uid()`, logo `set local role` + claims reproduz fielmente este portao (ao
--    contrario das guardas do mkt, que olham `session_user` e dariam true aqui por engano).
do $$
declare v_fora int; v_dono int; v_emp_fora int; v_emp_dono int;
begin
  set local role authenticated;

  set local request.jwt.claims = '{"sub":"00000000-0000-0000-0000-0000000000ff","role":"authenticated"}';
  if public.is_staff() then raise exception 'PROVA_214_FALHOU: is_staff deu true para quem nao e membro'; end if;
  select count(*) into v_emp_fora from public.v_ops_empresas_especie;
  select count(*) into v_fora from public.v_analytics_eventos_cliente_dia;

  set local request.jwt.claims = '{"sub":"2956f8d9-f161-4333-a962-96eab02600fe","role":"authenticated"}';
  if not public.is_staff() then raise exception 'PROVA_214_FALHOU: is_staff deu false para o dono'; end if;
  select count(*) into v_emp_dono from public.v_ops_empresas_especie;
  select count(*) into v_dono from public.v_analytics_eventos_cliente_dia;

  reset role;

  if v_emp_fora <> 0 then
    raise exception 'PROVA_214_FALHOU: quem nao e equipe leu % empresas', v_emp_fora;
  end if;
  if v_fora <> 0 then
    raise exception 'PROVA_214_FALHOU: quem nao e equipe leu % linhas de evento', v_fora;
  end if;
  if v_emp_dono < 1 or v_dono < 1 then
    raise exception 'PROVA_214_FALHOU: a equipe leu % empresas e % linhas — o conserto nao consertou',
      v_emp_dono, v_dono;
  end if;
end $$;

-- e) OS NUMEROS DA 210, lidos como o dono le (e nao como postgres): e aqui que o 403 se prova consertado.
do $$
declare v_tipo text; v_paga int; v_casa int; v_sem int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"2956f8d9-f161-4333-a962-96eab02600fe","role":"authenticated"}';

  select cliente_tipo into v_tipo from public.v_analytics_eventos_cliente_dia
   where product = 'mello-loja' limit 1;
  if v_tipo <> 'cliente' then
    raise exception 'PROVA_214_FALHOU: mello-loja deu especie "%" e mello paga', coalesce(v_tipo,'(nulo)');
  end if;
  select cliente_tipo into v_tipo from public.v_analytics_eventos_cliente_dia
   where product = 'digiai-site' limit 1;
  if v_tipo <> 'propria' then
    raise exception 'PROVA_214_FALHOU: digiai-site deu especie "%" e e propria', coalesce(v_tipo,'(nulo)');
  end if;

  -- controle negativo da 210: o que ninguem sabe de quem e NAO ganha especie
  if exists (select 1 from public.v_analytics_eventos_cliente_dia
              where cliente is null and cliente_inferido_do_product is null and cliente_tipo is not null) then
    raise exception 'PROVA_214_FALHOU: evento sem dono ganhou especie';
  end if;

  -- e as tres populacoes seguem as mesmas de 31/10: conserto de LEITURA nao mexe em conta
  select coalesce(sum(eventos),0) into v_paga from public.v_analytics_eventos_cliente_dia where cliente_tipo = 'cliente';
  select coalesce(sum(eventos),0) into v_casa from public.v_analytics_eventos_cliente_dia where cliente_tipo = 'propria';
  select coalesce(sum(eventos),0) into v_sem  from public.v_analytics_eventos_cliente_dia
   where cliente is null and cliente_inferido_do_product is null;
  reset role;
  if v_paga < 501 or v_casa < 182 or v_sem < 1027 then
    raise exception 'PROVA_214_FALHOU: populacoes DIMINUIRAM (paga %, casa %, sem dono %) contra 501/182/1027 de 31/10',
      v_paga, v_casa, v_sem;
  end if;
  raise notice 'lido como o dono: paga %, casa %, sem dono %', v_paga, v_casa, v_sem;
end $$;

commit;
