-- 209 — o evento passa a dizer DE QUAL CLIENTE ele é
--
-- ✔ APLICADA em 31/10/2026, reensaiada antes — e o ensaio recusou TRÊS versões:
--   (1) `create or replace` com parâmetro novo criava SOBRECARGA e deixava a chamada de 11
--       argumentos ambígua — teria parado a coleta de evento de todas as landings e sites no ar;
--   (2) o código de prova violava a chave estrangeira `events_log.event_code → events_catalog`,
--       proteção que eu não conhecia (o catálogo tem 24 códigos);
--   (3) a prova não exigia que existisse UMA SÓ `fn_log_event` — agora exige.
--   DEPOIS DE APLICAR, medido: **1** versão de `fn_log_event`, coluna criada, **1.719 linhas com
--   `cliente_slug` NULO** (nada inferido para dentro da coluna), código de prova removido, view com
--   252 linhas. Atribuição hoje: **683 eventos inferíveis** (`mello-loja`→mello 501,
--   `digiai-site`→digiai 182) e **1.027 sem dono** (`clearix-site` 536, `osi` 428, `clearix-calc`
--   63) — porque nem `clearix` nem `osi` são slug em `ops.empresas`. Isso é decisão de mapa
--   do dono, não buraco de cadastro: são propriedades NOSSAS, e a quem elas pertencem
--   comercialmente quem diz é ele.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: dono, 31/10, no canal do app: **"pode a coluna de cliente no evento"**. Veio da dúvida dele
--   sobre `lojas.clearix.app.br` ser o lugar único das landings de todas as empresas que usarem o Clearix.
--   Medido na ocasião: `analytics.events_log` **não tinha nenhuma coluna de cliente** — só `product`, que
--   é texto livre que alguém digita. Com uma landing dá para contornar pela URL; com cinquenta não dá, e
--   remendar depois significa reprocessar histórico. É barato hoje exatamente porque só existe uma.
--
-- ═════ O QUE A MEDIÇÃO DECIDIU, E NÃO A PREFERÊNCIA ═════
--
-- 1. O VOCABULÁRIO JÁ EXISTE: é `ops.empresas.slug`. São 12 empresas, com `tipo` em
--    (cliente, parceira, pessoal, propria) — 7 são `cliente`. **Não inventei chave nova.**
--    E atenção ao que a medição mostrou: a landing é `lancaster-suzano` e a empresa é `lancaster`.
--    **Os dois vocabulários NÃO coincidem**, então a coluna guarda o NOSSO slug e quem envia faz o mapa.
--    Assumir que o slug da landing é o slug da empresa criaria cliente fantasma no primeiro envio.
--
-- 2. SEM CHAVE ESTRANGEIRA, de propósito, e esta é a decisão que eu defenderia num tribunal:
--    um FK recusaria o evento de um cliente ainda não cadastrado. **Perder o evento é pior que ter a
--    chave desconhecida** — o evento não volta, e o cadastro se conserta depois. Então a coluna aceita
--    qualquer slug e a view marca o que não existe em `ops.empresas`: a deriva fica **visível**, não
--    proibida. Trava que descarta dado não é trava, é perda.
--
-- 3. AS 1.719 LINHAS DE HOJE FICAM NULAS. Não dá para saber de quem eram, e `product` é rótulo, não
--    chave. Eu poderia inferir `mello-loja` → `mello` (os 465 eventos vêm todos de mellooticas.com.br, a
--    inferência é sólida), e **não vou gravar isso**: inferência escrita numa coluna de chave passa a ser
--    lida como coleta. A view expõe a inferência ao lado do declarado, com os dois rotulados — quem olha
--    decide se aceita. É a mesma regra das outras telas: não mostrar como medido o que foi deduzido.
--
-- 4. NORMALIZA NA ENTRADA, senão `Lancaster`, ` lancaster ` e `LANCASTER` viram três clientes e o número
--    por cliente nasce errado sem ninguém ver. `lower(btrim(...))`, vazio vira NULO (não string vazia,
--    que seria um cliente chamado ""), e tamanho limitado — o mesmo cuidado que o `fn_log_event` já tem
--    com o `metadata`.
--
-- 5. O PARÂMETRO ENTRA NO FIM, COM DEFAULT, e isso não é estilo: `fn_log_event` é o **único** caminho de
--    escrita (ninguém insere direto — `anon` e `authenticated` não têm INSERT na tabela, conferido), e é
--    chamado por landings e sites que estão no ar agora. Mudar a assinatura quebraria todos. Com default
--    no fim, toda chamada existente continua válida, posicional ou nomeada — e a prova (a) verifica isso.
--
-- FORA DE ESCOPO, de propósito: a HIERARQUIA de cliente. `mello` é guarda-chuva de 5 lojas
--   (`mello-matriz`, `mello-perus`, `mello-rio-pequeno`, `mello-sao-mateus`, `mello-suzano`) e somar
--   loja em grupo por prefixo de slug funcionaria hoje e quebraria no primeiro slug que não seguir o
--   padrão. Rollup pede coluna de pai em `ops.empresas`, que é outra conversa.
--
-- ═════ A PROVA (a) JÁ PAGOU A MIGRATION, ANTES DE ELA SER APLICADA ═════
--   A 1.ª versão fazia só `create or replace function` com o parâmetro novo. **Isso não substitui a
--   função: cria uma SOBRECARGA.** Com a de 11 parâmetros e a de 12 (cuja 12.ª tem default) vivendo
--   juntas, toda chamada de 11 argumentos passa a ser ambígua e o Postgres recusa com
--   `function public.fn_log_event(...) is not unique`. Ou seja: aplicar aquela versão teria **parado a
--   coleta de evento de todas as landings e sites no ar** — exatamente o dano que o parâmetro com
--   default existia para evitar. Quem pegou foi a prova (a), que chama a forma antiga de propósito.
--   Conserto: `drop` da assinatura de 11 **na mesma transação** do `create` da de 12. Sem janela de
--   indisponibilidade, e depois do drop a chamada de 11 argumentos volta a resolver sem ambiguidade,
--   porque o 12.º parâmetro tem default. A prova (i) passa a exigir que exista **uma só**
--   `fn_log_event`, para a ambiguidade não voltar numa próxima mão.
--
-- R-013 lido e NÃO se aplica: o cliente aqui é EMPRESA (a ótica que usa o Clearix), não pessoa — nenhuma
--   coluna de pessoa entra. R-044: coluna na tabela do próprio schema, `public` recebe só função e view.
--   R-043: view nova nasce `security_invoker`.

begin;

do $$
begin
  if exists (select 1 from information_schema.columns
              where table_schema='analytics' and table_name='events_log' and column_name='cliente_slug') then
    raise exception 'cliente_slug ja existe — a 209 ja foi aplicada?';
  end if;
  -- premissas medidas em 31/10: se mudaram, quero saber antes de a coluna existir
  if (select count(*) from ops.empresas) <> 12 then
    raise exception 'esperava 12 empresas e achei % — conferir o vocabulario antes', (select count(*) from ops.empresas);
  end if;
  if pg_catalog.has_table_privilege('anon','analytics.events_log','insert')
  or pg_catalog.has_table_privilege('authenticated','analytics.events_log','insert') then
    raise exception 'alguem passou a inserir evento direto — fn_log_event nao e mais o caminho unico';
  end if;
end $$;

alter table analytics.events_log
  add column cliente_slug text
    check (cliente_slug is null
           or (cliente_slug = lower(btrim(cliente_slug)) and length(cliente_slug) between 1 and 64));

comment on column analytics.events_log.cliente_slug is
  '209: de qual cliente é o evento, no vocabulário de `ops.empresas.slug`. NULO = a origem não disse '
  '(inclui tudo que entrou antes desta migration — 1.719 linhas, que NÃO foram preenchidas por inferência '
  'de propósito). SEM chave estrangeira de propósito: um FK recusaria evento de cliente ainda não '
  'cadastrado, e perder o evento é pior que ter a chave desconhecida — a view '
  '`v_analytics_eventos_cliente_dia` marca slug que não existe em `ops.empresas`, para a deriva ser '
  'visível em vez de proibida. Atenção: o slug da LANDING não é o slug da EMPRESA '
  '(`lancaster-suzano` × `lancaster`); quem envia faz o mapa.';

create index events_log_cliente on analytics.events_log (cliente_slug, occurred_at desc);

-- O único caminho de escrita ganha o parâmetro, no fim e com default, para nenhuma chamada no ar quebrar.
-- O DROP da assinatura de 11 é obrigatório e vai na MESMA transação: sem ele as duas coexistem como
-- sobrecarga e a chamada de 11 argumentos (a que as landings fazem) fica ambígua — ver o cabeçalho.
drop function if exists public.fn_log_event(text,text,text,text,text,text,text,text,text,jsonb,text);

create function public.fn_log_event(
  p_event_code   text,
  p_product      text default null,
  p_session_id   text default null,
  p_url          text default null,
  p_utm_source   text default null,
  p_utm_medium   text default null,
  p_utm_campaign text default null,
  p_utm_content  text default null,
  p_utm_term     text default null,
  p_metadata     jsonb default '{}'::jsonb,
  p_user_agent   text default null,
  p_cliente_slug text default null
)
returns uuid
language plpgsql
security definer
set search_path to 'analytics', 'public'
as $function$
declare v_id uuid; v_meta jsonb := coalesce(p_metadata, '{}'::jsonb); v_cliente text;
begin
  -- defense-in-depth: cap de metadata (anti-abuso / PII de terceiro injetada)
  if pg_column_size(v_meta) > 4096 then
    v_meta := jsonb_build_object('_truncated', true);
  end if;

  -- 209: normaliza na ENTRADA. Sem isto, `Lancaster`, ` lancaster ` e `LANCASTER` viram tres clientes e
  -- o numero por cliente nasce errado sem ninguem ver. Vazio vira NULO, nao string vazia. Corta em 64 em
  -- vez de recusar: o evento nunca se perde por causa do rotulo.
  v_cliente := nullif(btrim(lower(coalesce(p_cliente_slug, ''))), '');
  if v_cliente is not null and length(v_cliente) > 64 then
    v_cliente := left(v_cliente, 64);
  end if;

  insert into analytics.events_log
    (event_code, product, session_id, url, utm_source, utm_medium, utm_campaign, utm_content, utm_term,
     metadata, user_agent, cliente_slug)
  values
    (p_event_code, p_product, p_session_id, p_url, p_utm_source, p_utm_medium, p_utm_campaign,
     p_utm_content, p_utm_term, v_meta, p_user_agent, v_cliente)
  returning id into v_id;
  return v_id;
end $function$;

comment on function public.fn_log_event(text,text,text,text,text,text,text,text,text,jsonb,text,text) is
  '209: único caminho de escrita de `analytics.events_log` (nem anon nem authenticated inserem direto). '
  '`p_cliente_slug` entrou no FIM com default para não quebrar nenhuma chamada no ar, e é normalizado '
  'aqui (minúscula, sem espaço nas pontas, vazio → nulo, cortado em 64) — normalizar no chamador deixaria '
  'o mesmo cliente entrar com três grafias.';

-- Contrato de leitura: por cliente e por dia de Brasília, separando DECLARADO de INFERIDO.
create or replace view public.v_analytics_eventos_cliente_dia
  with (security_invoker = true) as
 select (e.occurred_at at time zone 'America/Sao_Paulo')::date       as dia,
        e.cliente_slug                                               as cliente,
        -- `product` é rótulo, não chave: entra como INFERÊNCIA, rotulada, nunca gravada na coluna.
        case when e.cliente_slug is not null then null
             else (select p.slug from ops.empresas p
                    where e.product is not null
                      and (e.product = p.slug or e.product like p.slug || '-%')
                    order by length(p.slug) desc limit 1)
        end                                                          as cliente_inferido_do_product,
        (e.cliente_slug is not null)                                 as cliente_declarado,
        (e.cliente_slug is not null
           and exists (select 1 from ops.empresas p where p.slug = e.cliente_slug))
                                                                     as cliente_conhecido,
        e.product,
        e.event_code,
        count(*)::int                                                as eventos,
        count(distinct e.session_id)::int                            as sessoes
   from analytics.events_log e
  where not coalesce(e.teste, false)
  group by 1, 2, 3, 4, 5, 6, 7;

comment on view public.v_analytics_eventos_cliente_dia is
  '209: evento por cliente e por dia de Brasília (não UTC). Três colunas que de propósito não se misturam: '
  '`cliente` é o que a ORIGEM DECLAROU, `cliente_inferido_do_product` é dedução a partir do rótulo '
  '`product` (preenchida só quando não há declarado, e nunca gravada na tabela), e `cliente_conhecido` diz '
  'se o slug declarado existe em `ops.empresas` — é como a deriva aparece sem que um FK descarte evento. '
  'Evento de teste fica fora. Linha com `cliente` nulo e `cliente_inferido_do_product` nulo é o que '
  'ninguém sabe de quem é, e esse número tem de aparecer na tela em vez de virar zero.';

grant select on public.v_analytics_eventos_cliente_dia to authenticated;
revoke all on public.v_analytics_eventos_cliente_dia from anon;

do $$
declare v_id uuid; v_n int; v_antes int; v_cli text; v_ok boolean;
begin
  select count(*) into v_antes from analytics.events_log;

  -- `events_log.event_code` tem CHAVE ESTRANGEIRA para `analytics.events_catalog` -- protecao que eu nao
  -- conhecia e que o ensaio me mostrou. Entao a prova cadastra o proprio codigo, e o tira no fim junto
  -- com as linhas: rascunho meu, na mesma transacao.
  insert into analytics.events_catalog
    (id, code, funnel_stage, description, is_active, sort_order, created_at, updated_at, unico_por_sessao)
  values (gen_random_uuid(), 'prova_209', 'prova', 'codigo temporario da prova da migration 209',
          false, 9999, now(), now(), false);

  -- a) NENHUMA CHAMADA NO AR PODE QUEBRAR. Esta é a prova que mais importa, porque landings e sites
  --    chamam esta função agora. Testa a forma POSICIONAL antiga (11 argumentos) e a NOMEADA antiga.
  v_id := public.fn_log_event('prova_209', 'prova-209', 's1', 'https://x/y',
                              null, null, null, null, null, '{}'::jsonb, 'ua');
  if v_id is null then raise exception 'PROVA_209_FALHOU: chamada posicional antiga devolveu nulo'; end if;
  if (select cliente_slug from analytics.events_log where id = v_id) is not null then
    raise exception 'PROVA_209_FALHOU: chamada antiga inventou cliente';
  end if;
  v_id := public.fn_log_event(p_event_code := 'prova_209', p_product := 'prova-209',
                              p_session_id := 's2', p_metadata := '{"a":1}'::jsonb);
  if v_id is null then raise exception 'PROVA_209_FALHOU: chamada nomeada antiga devolveu nulo'; end if;

  -- b) o parametro novo grava e NORMALIZA (a razao de normalizar no banco e nao no chamador)
  v_id := public.fn_log_event(p_event_code := 'prova_209', p_product := 'prova-209',
                              p_session_id := 's3', p_cliente_slug := '  LanCaster  ');
  select cliente_slug into v_cli from analytics.events_log where id = v_id;
  if v_cli <> 'lancaster' then
    raise exception 'PROVA_209_FALHOU: normalizacao deu "%" e esperava "lancaster"', v_cli;
  end if;
  -- vazio vira NULO, nao cliente chamado ""
  v_id := public.fn_log_event(p_event_code := 'prova_209', p_session_id := 's4', p_cliente_slug := '   ');
  if (select cliente_slug from analytics.events_log where id = v_id) is not null then
    raise exception 'PROVA_209_FALHOU: string vazia virou cliente';
  end if;

  -- c) CLIENTE DESCONHECIDO É ACEITO (o evento nunca se perde) e aparece MARCADO como desconhecido.
  --    Sem esta prova, alguem "melhora" isto com um FK depois e passa a descartar evento em silencio.
  v_id := public.fn_log_event(p_event_code := 'prova_209', p_product := 'prova-209',
                              p_session_id := 's5', p_cliente_slug := 'otica-que-ainda-nao-cadastrei');
  if (select cliente_slug from analytics.events_log where id = v_id) is null then
    raise exception 'PROVA_209_FALHOU: recusou cliente desconhecido e perdeu o evento';
  end if;
  select cliente_conhecido into v_ok from public.v_analytics_eventos_cliente_dia
   where cliente = 'otica-que-ainda-nao-cadastrei' limit 1;
  if v_ok is not false then
    raise exception 'PROVA_209_FALHOU: cliente desconhecido nao foi marcado como desconhecido';
  end if;
  select cliente_conhecido into v_ok from public.v_analytics_eventos_cliente_dia
   where cliente = 'lancaster' limit 1;
  if v_ok is not true then
    raise exception 'PROVA_209_FALHOU: cliente que EXISTE em ops.empresas nao foi reconhecido';
  end if;

  -- d) tamanho absurdo nao estoura nem recusa: corta
  v_id := public.fn_log_event(p_event_code := 'prova_209', p_session_id := 's6',
                              p_cliente_slug := repeat('a', 300));
  if length((select cliente_slug from analytics.events_log where id = v_id)) <> 64 then
    raise exception 'PROVA_209_FALHOU: slug gigante nao foi cortado em 64';
  end if;

  -- e) AS LINHAS ANTIGAS CONTINUAM NULAS — nada foi inferido para dentro da coluna
  if (select count(*) from analytics.events_log
       where cliente_slug is not null and event_code <> 'prova_209') <> 0 then
    raise exception 'PROVA_209_FALHOU: alguma linha antiga foi preenchida, e esta migration nao infere';
  end if;

  -- f) a INFERÊNCIA aparece na view, separada do declarado, e o `mello-loja` real casa com `mello`
  if not exists (select 1 from public.v_analytics_eventos_cliente_dia
                  where product = 'mello-loja' and cliente is null
                    and cliente_inferido_do_product = 'mello') then
    raise exception 'PROVA_209_FALHOU: a inferencia de mello-loja -> mello nao apareceu na view';
  end if;
  if exists (select 1 from public.v_analytics_eventos_cliente_dia
              where cliente is not null and cliente_inferido_do_product is not null) then
    raise exception 'PROVA_209_FALHOU: declarado e inferido apareceram juntos na mesma linha';
  end if;

  -- g) o VAZIO é mensuravel: existe linha que ninguem sabe de quem e, e ela nao desaparece
  select count(*) into v_n from public.v_analytics_eventos_cliente_dia
   where cliente is null and cliente_inferido_do_product is null;
  if v_n = 0 then
    raise exception 'PROVA_209_FALHOU: o nao-atribuido sumiu da view em vez de aparecer';
  end if;

  -- h) portao: anon nao le a view, authenticated le; a tabela continua sem INSERT direto
  if pg_catalog.has_table_privilege('anon','public.v_analytics_eventos_cliente_dia','select') then
    raise exception 'PROVA_209_FALHOU: abri a view para anon';
  end if;
  if not pg_catalog.has_table_privilege('authenticated','public.v_analytics_eventos_cliente_dia','select') then
    raise exception 'PROVA_209_FALHOU: authenticated nao le a view';
  end if;
  if pg_catalog.has_table_privilege('anon','analytics.events_log','insert') then
    raise exception 'PROVA_209_FALHOU: abri INSERT direto na tabela';
  end if;
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname='v_analytics_eventos_cliente_dia'
                    and (select lower(split_part(o,'=',2)) from unnest(c.reloptions) o
                          where split_part(o,'=',1)='security_invoker') in ('true','on')) then
    raise exception 'PROVA_209_FALHOU: a view nao nasceu invoker';
  end if;

  -- i) EXISTE UMA SÓ `fn_log_event`. Sem isto a sobrecarga volta numa proxima mao e a chamada de 11
  --    argumentos quebra em producao com "is not unique" -- foi o defeito que a prova (a) pegou aqui.
  select count(*) into v_n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
   where n.nspname = 'public' and p.proname = 'fn_log_event';
  if v_n <> 1 then
    raise exception 'PROVA_209_FALHOU: existem % versoes de fn_log_event — sobrecarga ambigua', v_n;
  end if;

  -- limpa as provas: rascunho meu, na mesma transacao
  delete from analytics.events_log where event_code = 'prova_209';
  delete from analytics.events_catalog where code = 'prova_209';
  select count(*) into v_n from analytics.events_log;
  if v_n <> v_antes then
    raise exception 'PROVA_209_FALHOU: sobrou linha de prova (% antes, % agora)', v_antes, v_n;
  end if;
end $$;

commit;
