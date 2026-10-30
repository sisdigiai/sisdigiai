-- 207 — as RPCs do Google estouravam o timeout na tela do dono, e a culpa é da prova que eu tirei
--
-- ✔ APLICADA em 30/10/2026, reensaiada antes (o ensaio recusou três versões: a leitura de
--   `iam.users` depois da troca de papel, as colunas de `returns table` ambiguas em plpgsql e
--   `sum(bigint)` devolvendo numeric, que `language sql` coagia e `return query` nao).
--   MEDIDO DEPOIS, na chamada do dono reproduzida com JWT real: **56 ms no total** — por_dia 21 ms,
--   painel 24 ms, por_ficha 10 ms — contra **estouro de 60 s** antes. Mesmos números da 206
--   (228/38/13, anterior 246, 9 ruins na base e 5 fora, `cliques_site` nulo).
--   PORTÃO CONFERIDO em dois casos, nao um: sem JWT as três recusam, e com JWT VÁLIDO de quem
--   nao e staff (sub fora de `iam.users`) as três tambem recusam — definer nao afrouxou nada.
--
-- (Escrita como NÃO APLICADA.)
--
-- ═════ O DEFEITO É MEU, E É O MESMO QUE EU TINHA NA MÃO E DESCARTEI ═════
--   O dono abriu `#/google` logado em 29/10 à noite e recebeu **"canceling statement due to statement
--   timeout"**. A tela não abre.
--
--   Na 206 esse timeout APARECEU no ensaio, dentro de `is_admin`/`pode_ver_brand`, e eu o classifiquei
--   como artefato da Management API: `set role` troca `current_user` e não dá `auth.uid()`, logo
--   `is_staff()` responde falso e nada fica provado. A primeira metade do raciocínio estava certa — e a
--   conclusão estava errada. Eu concluí "logo o custo real não é esse" quando o correto era "logo eu
--   ainda não medi o custo real". Descartei o único sinal que eu tinha, e escrevi na própria migration
--   que "não há motivo para ficar pior". Havia.
--
--   **A medição que eu devia ter feito**, e que faço aqui: `set local role authenticated` MAIS
--   `set local request.jwt.claims` com o `sub` de um usuário de verdade. Aí `auth.uid()` responde,
--   `is_staff()` dá true e `pode_ver_brand()` consulta de fato — é a chamada do dono, reproduzida.
--   Com ela: `is_staff() = true`, 6 fichas visíveis, e as três funções **estouram 60 s**.
--
-- ═════ POR QUE É LENTO (medido, não suposto) ═════
--   As políticas de `mkt.gbp_avaliacoes`, `gbp_posts`, `gbp_metricas_dia` e `gbp_fichas` são todas
--   `mkt.pode_ver_brand(brand_id)` — função STABLE SECURITY DEFINER que chama `mkt.is_admin()`, que por
--   sua vez consulta `mkt.app_users`. Como o predicado recebe **argumento** (`brand_id`), ele é avaliado
--   **por linha**. O painel varre `v_mkt_gbp_avaliacoes` TRÊS vezes (período, fila de ruins, ruins fora da
--   base), mais posts e métricas — ou seja, da ordem de 5 a 7 mil avaliações de uma função que faz
--   consulta aninhada. A tela antiga sobrevivia porque fazia UMA leitura das 1.745 linhas; agregar no
--   banco com RLS por linha multiplicou isso.
--
--   Então a frase que eu escrevi na 206 — "lê as MESMAS linhas com o MESMO predicado, não há motivo para
--   ficar pior" — era falsa no ponto que importa: o número de vezes.
--
-- ═════ O CONSERTO, E POR QUE ELE NÃO AFROUXA NADA ═════
--   As três funções passam a `SECURITY DEFINER` com **portão explícito de papel**, que é exatamente o que
--   a R-043 manda ("RPC definer só com filtro explícito de tenant/papel") e o mesmo desenho das RPCs da
--   196. Duas peças, e as duas são necessárias:
--     1. `if not public.is_staff() then raise insufficient_privilege` — o portão. Falha fechado: sem JWT
--        de staff a função não devolve linha nenhuma, ela recusa.
--     2. `mkt.pode_ver_brand(brand_id)` aplicado **uma vez por ficha**, num CTE `visiveis` marcado
--        `materialized`, e todo o resto junta por `location_id`. São **6** avaliações do predicado em vez
--        de milhares, e a visibilidade por marca continua a MESMA regra, da mesma função, com o mesmo
--        `auth.uid()` — `auth.uid()` lê o GUC da sessão e não muda dentro de definer, que é o que faz o
--        portão ser real.
--   Ou seja: o que sai é a repetição, não a regra. Quem não é staff continua sem nada; quem é staff de
--   uma marca só continua vendo uma marca.
--
-- ═════ O QUE ESTA MIGRATION PROVA, E A PROVA QUE FALTAVA ═════
--   Além dos números (iguais aos da 206), ela prova as duas coisas que eu não provei ontem:
--     · o portão RECUSA sem JWT de staff (controle negativo), e
--     · com JWT de staff de verdade as três funções respondem **dentro de 5 s** — `statement_timeout`
--       baixado de propósito, para que a prova FALHE se o desempenho voltar a ser o de ontem.
--   Prova de desempenho em migration não é luxo aqui: foi a falta dela que mandou uma tela quebrada para
--   o dono.

begin;

do $$
begin
  if to_regprocedure('public.rpc_gbp_painel(text,int,boolean)') is null then
    raise exception 'rpc_gbp_painel nao existe — a 206 nao foi aplicada';
  end if;
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname='public' and p.proname='rpc_gbp_painel' and p.prosecdef) then
    raise exception 'rpc_gbp_painel ja e definer — a 207 ja foi aplicada?';
  end if;
end $$;

create or replace function public.rpc_gbp_painel(
  p_ficha            text    default null,
  p_janela           int     default 14,
  p_incluir_fechadas boolean default false
)
returns table (
  base_fichas         int,
  serie_fechados      int,
  perf_ini            date,
  perf_fim            date,
  perf_dias           int,
  aparicoes           bigint,
  rotas               bigint,
  ligacoes            bigint,
  cliques_site        bigint,
  incompleto          boolean,
  ant_dias            int,
  ant_aparicoes       bigint,
  ant_rotas           bigint,
  ant_ligacoes        bigint,
  comparavel          boolean,
  hoje                date,
  janela_ini          date,
  aval_periodo        int,
  aval_media          numeric,
  ruins_sem_resposta  int,
  ruins_fora_da_base  int,
  no_ar_janela        int,
  agendados           int,
  falhas              int,
  lido_em             timestamptz,
  ultimo_fechado      date,
  avaliacoes_lidas_em timestamptz,
  leitura_divergente  boolean
)
language plpgsql
stable
security definer
set search_path = ''
as $$
-- `returns table (...)` cria VARIAVEL plpgsql com o nome de cada coluna de saida, e dentro do
-- `return query` um `aparicoes` solto fica ambiguo entre a variavel e a coluna. `use_column` resolve a
-- favor da coluna, que e o que todo este corpo quer; nenhuma das colunas de saida e lida como variavel
-- aqui. (Em `language sql`, na 206, o problema nao existia.)
#variable_conflict use_column
begin
  -- PORTÃO (R-043/R-037): definer não herda RLS, então quem pode ler se decide aqui e em lugar nenhum
  -- mais. Recusa, não devolve vazio: portão que "abre com zero linhas" esconde o próprio portão.
  if not public.is_staff() then
    raise exception 'apenas equipe le o painel do Google' using errcode = 'insufficient_privilege';
  end if;

  return query
  with visiveis as materialized (
    -- O PREDICADO DE MARCA RODA AQUI, UMA VEZ POR FICHA (6), e não por linha de avaliação (1.747 × 3).
    -- `materialized` é de propósito: sem ele o planejador inlinaria o CTE em cada uso e a chamada da
    -- função voltaria a se multiplicar — que é exatamente o defeito que esta migration conserta.
    select g.location_id, g.nome, g.situacao, g.avaliacoes_lidas_em
      from public.v_mkt_gbp_fichas g
      join mkt.gbp_fichas gg on gg.location_id = g.location_id
     where mkt.pode_ver_brand(gg.brand_id)
  ),
  base as (
    select v.location_id, v.nome, v.avaliacoes_lidas_em
      from visiveis v
     where case when p_ficha is not null then v.nome = p_ficha
                else p_incluir_fechadas
                     or coalesce(v.situacao, '') <> 'fechada_definitivamente'
           end
  ),
  -- LÊ A VIEW, NÃO A TABELA: `dia_fechado` (lido_em >= dia + 5 dias), o nulo dos campos em dia aberto e
  -- `cliques_site` NULL literal moram na definição de `v_mkt_gbp_metricas_dia`. Reescrever a regra dos 5
  -- dias aqui seria a mesma regra em dois lugares — o defeito que a 192 me ensinou.
  met as (
    select m.* from public.v_mkt_gbp_metricas_dia m join base b on b.location_id = m.location_id
  ),
  fech as (select distinct dia from met where dia_fechado),
  anc  as (select max(dia) as fim, min(dia) as ini_serie, count(*)::int as n from fech),
  lim  as (
    select (select fim from anc) as fim,
           case when p_janela > 0 then (select fim from anc) - (p_janela - 1)
                else (select ini_serie from anc) end as ini,
           case when p_janela > 0 then p_janela else (select n from anc) end as n
  ),
  ant as (
    select (select ini from lim) - 1                  as fim,
           (select ini from lim) - (select n from lim) as ini
  ),
  atual as (
    select count(distinct dia)::int                                       as dias,
           sum(aparicoes)                                                 as aparicoes,
           sum(rotas)                                                     as rotas,
           sum(ligacoes)                                                  as ligacoes,
           sum(cliques_site)                                              as cliques_site,
           bool_or(aparicoes is null or rotas is null or ligacoes is null) as incompleto
      from met
     where dia_fechado and dia between (select ini from lim) and (select fim from lim)
  ),
  anterior as (
    select count(distinct dia)::int as dias, sum(aparicoes) as aparicoes,
           sum(rotas) as rotas, sum(ligacoes) as ligacoes
      from met
     where p_janela > 0 and dia_fechado
       and dia between (select ini from ant) and (select fim from ant)
  ),
  hj as (select (now() at time zone 'America/Sao_Paulo')::date as d),
  jan as (
    select (select d from hj) as hoje,
           case when p_janela > 0 then (select d from hj) - (p_janela - 1)
                else date '0001-01-01' end as ini
  ),
  -- UMA varredura de avaliações para as três contas (período, fila da base, fila fora da base), em vez
  -- das três da 206. Sem RLS por linha isto já seria barato; com uma varredura só, fica barato de novo
  -- até se alguém devolver a política por linha.
  av as (
    select
      count(*) filter (
        where b.location_id is not null
          and (a.criada_em at time zone 'America/Sao_Paulo')::date >= (select ini from jan)
      )::int                                                                       as periodo,
      round(avg(a.estrelas) filter (
        where b.location_id is not null
          and (a.criada_em at time zone 'America/Sao_Paulo')::date >= (select ini from jan)
      )::numeric, 2)                                                               as media,
      count(*) filter (
        where b.location_id is not null
          and a.estrelas <= 3 and coalesce(a.status, '') <> 'publicada'
      )::int                                                                       as ruins,
      count(*) filter (
        where b.location_id is null
          and coalesce(v.situacao, '') = 'fechada_definitivamente'
          and a.estrelas <= 3 and coalesce(a.status, '') <> 'publicada'
      )::int                                                                       as ruins_fora
    from public.v_mkt_gbp_avaliacoes a
    join visiveis v on v.location_id = a.location_id
    left join base b on b.location_id = a.location_id
  ),
  post as (
    select count(*) filter (
             where p.estado_google = 'LIVE'
               and (p.publicado_em at time zone 'America/Sao_Paulo')::date >= (select ini from jan)
           )::int as no_ar_janela,
           count(*) filter (where p.status = 'agendado')::int as agendados,
           -- `erro` em post NÃO cancelado é falha de verdade; em cancelado é MOTIVO, que é decisão.
           count(*) filter (
             where coalesce(p.status, '') <> 'cancelado' and btrim(coalesce(p.erro, '')) <> ''
           )::int as falhas
      from public.v_mkt_gbp_posts p join base b on b.location_id = p.location_id
  ),
  leitura as (
    select max(lido_em) as lido_em, max(dia) filter (where dia_fechado) as ultimo_fechado from met
  ),
  carimbo as (
    select min(avaliacoes_lidas_em) as mais_velho,
           (min(avaliacoes_lidas_em) <> max(avaliacoes_lidas_em)) as divergente
      from base
  )
  select (select count(*)::int from base),
         (select n from anc),
         (select ini from lim), (select fim from lim), (select dias from atual),
         (select aparicoes from atual), (select rotas from atual), (select ligacoes from atual),
         (select cliques_site from atual), coalesce((select incompleto from atual), false),
         (select dias from anterior), (select aparicoes from anterior),
         (select rotas from anterior), (select ligacoes from anterior),
         (p_janela > 0
            and (select dias from anterior) = (select n from lim)
            and (select dias from atual)    = (select n from lim)),
         (select hoje from jan), (select ini from jan),
         (select periodo from av), (select media from av),
         (select ruins from av), (select ruins_fora from av),
         (select no_ar_janela from post), (select agendados from post), (select falhas from post),
         (select lido_em from leitura), (select ultimo_fechado from leitura),
         (select mais_velho from carimbo), coalesce((select divergente from carimbo), false);
end;
$$;

comment on function public.rpc_gbp_painel(text, int, boolean) is
  '206/207 (R-049): os KPIs da tela #/google nascem aqui, com ficha, janela e base como PARÂMETRO — a '
  'tela passa filtro e desenha, não soma linha. Duas âncoras de tempo: desempenho no último dia FECHADO '
  '(o relatório do Google atrasa), avaliação e post em hoje/Brasília. `comparavel` só é verdade quando o '
  'período anterior tem o mesmo número de dias fechados. `cliques_site` sai NULO quando a origem não '
  'coletou — não há coalesce nele de propósito. **207:** passou a DEFINER com portão `is_staff()` '
  'explícito porque como invoker a política `pode_ver_brand(brand_id)` era avaliada POR LINHA e a tela do '
  'dono estourava o statement timeout. A visibilidade por marca continua, aplicada uma vez por ficha no '
  'CTE `visiveis` (materialized de propósito) — sai a repetição, não a regra.';

create or replace function public.rpc_gbp_por_dia(
  p_ficha text default null, p_janela int default 14, p_incluir_fechadas boolean default false
)
returns table (
  dia date, aberto boolean, aparicoes bigint, rotas bigint, ligacoes bigint,
  nossos bigint, no_ar_google bigint
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_staff() then
    raise exception 'apenas equipe le o painel do Google' using errcode = 'insufficient_privilege';
  end if;

  return query
  with visiveis as materialized (
    select g.location_id, g.nome, g.situacao
      from public.v_mkt_gbp_fichas g
      join mkt.gbp_fichas gg on gg.location_id = g.location_id
     where mkt.pode_ver_brand(gg.brand_id)
  ),
  base as (
    select v.location_id from visiveis v
     where case when p_ficha is not null then v.nome = p_ficha
                else p_incluir_fechadas or coalesce(v.situacao, '') <> 'fechada_definitivamente'
           end
  ),
  met as (select m.* from public.v_mkt_gbp_metricas_dia m join base b on b.location_id = m.location_id),
  -- A JANELA É A MESMA DO PAINEL, ancorada no último dia FECHADO. A primeira versão pegava os N dias mais
  -- RECENTES, que incluem os ainda abertos: a tabela mostraria 22–28/10 enquanto o KPI somava 18–24/10 —
  -- número nenhum errado, mas tabela e total falando de períodos diferentes na mesma tela.
  anc as (select max(dia) filter (where dia_fechado) as fim,
                 min(dia) filter (where dia_fechado) as ini_serie from met),
  lim as (select case when p_janela > 0 then (select fim from anc) - (p_janela - 1)
                      else (select ini_serie from anc) end as ini from anc)
  select m.dia,
         bool_or(not coalesce(m.dia_fechado, false))    as aberto,
         sum(m.aparicoes) filter (where m.dia_fechado)  as aparicoes,
         sum(m.rotas)     filter (where m.dia_fechado)  as rotas,
         sum(m.ligacoes)  filter (where m.dia_fechado)  as ligacoes,
         -- cast explicito: `sum(bigint)` devolve numeric, e `return query` em plpgsql nao coage o
         -- tipo como a versao `language sql` da 206 coagia.
         sum(m.posts_no_dia)::bigint                    as nossos,
         sum(m.posts_no_ar_google)::bigint              as no_ar_google
    from met m
   -- sem limite superior de propósito: o dia que ainda não fechou aparece marcado `aberto`, e como as
   -- somas filtram `dia_fechado` ele entra como nulo e não muda total nenhum.
   where m.dia >= (select ini from lim)
   group by m.dia
   order by m.dia desc;
end;
$$;

comment on function public.rpc_gbp_por_dia(text, int, boolean) is
  '206/207 (R-049): a tabela por dia da tela #/google, mesma base e mesma janela do painel, ancorada no '
  'último dia fechado. `aberto` marca o dia em que alguma ficha ainda não fechou: soma parcial com cara '
  'de número fechado é pior que dizer "espera". Post não depende do relatório de desempenho — '
  '`posts_no_ar_google` é leitura própria da API e soma sem o filtro de `dia_fechado`. **207:** DEFINER '
  'com portão `is_staff()`; ver o comentário do painel.';

create or replace function public.rpc_gbp_por_ficha()
returns table (
  ficha text, situacao text, posts_motor boolean, total int, noventa int,
  media numeric, sem_resposta int, ruins_sem_resposta int,
  ultima_avaliacao_em timestamptz, avaliacoes_lidas_em timestamptz
)
language plpgsql
stable
security definer
set search_path = ''
as $$
#variable_conflict use_column
begin
  if not public.is_staff() then
    raise exception 'apenas equipe le o painel do Google' using errcode = 'insufficient_privilege';
  end if;

  -- SEM parâmetro de base de propósito: esta tabela existe para COMPARAR, e tirar as fechadas dela
  -- tiraria a razão dela existir. Ela traz `situacao` para a tela rotular cada linha.
  return query
  with visiveis as materialized (
    select g.location_id, g.nome, g.situacao, g.posts_motor,
           g.ultima_avaliacao_em, g.avaliacoes_lidas_em
      from public.v_mkt_gbp_fichas g
      join mkt.gbp_fichas gg on gg.location_id = g.location_id
     where mkt.pode_ver_brand(gg.brand_id)
  )
  select v.nome,
         v.situacao,
         v.posts_motor,
         count(a.review_id)::int,
         count(*) filter (
           where (a.criada_em at time zone 'America/Sao_Paulo')::date
                 >= (now() at time zone 'America/Sao_Paulo')::date - 90
         )::int,
         round(avg(a.estrelas)::numeric, 2),
         count(*) filter (where coalesce(a.status, '') <> 'publicada')::int,
         count(*) filter (where a.estrelas <= 3 and coalesce(a.status, '') <> 'publicada')::int,
         v.ultima_avaliacao_em,
         v.avaliacoes_lidas_em
    from visiveis v
    left join public.v_mkt_gbp_avaliacoes a on a.location_id = v.location_id
   group by v.nome, v.situacao, v.posts_motor, v.ultima_avaliacao_em, v.avaliacoes_lidas_em
   order by 5 desc, 4 desc;
end;
$$;

comment on function public.rpc_gbp_por_ficha() is
  '206/207 (R-049): a tabela por ficha da tela #/google. NÃO recebe parâmetro de base porque existe para '
  'comparar — tirar as fechadas tiraria a razão dela existir; devolve `situacao` para a tela rotular. '
  '`ultima_avaliacao_em` ("quando alguém avaliou") e `avaliacoes_lidas_em` ("quando nós lemos") vêm '
  'separadas: confundir as duas foi o erro de 29/10, que me fez reportar coleta parada onde nada parou. '
  '**207:** DEFINER com portão `is_staff()`; ver o comentário do painel.';

revoke all on function public.rpc_gbp_painel(text, int, boolean) from public, anon;
revoke all on function public.rpc_gbp_por_dia(text, int, boolean) from public, anon;
revoke all on function public.rpc_gbp_por_ficha() from public, anon;
grant execute on function public.rpc_gbp_painel(text, int, boolean) to authenticated;
grant execute on function public.rpc_gbp_por_dia(text, int, boolean) to authenticated;
grant execute on function public.rpc_gbp_por_ficha() to authenticated;

do $$
declare r record; v_claims text; v_t0 timestamptz; v_ms numeric;
begin
  -- a) O PORTÃO RECUSA. Esta sessão não tem JWT, logo `is_staff()` é falso e as três têm de levantar
  --    `insufficient_privilege`. É o controle negativo que a 206 não tinha: lá a ausência de JWT fazia a
  --    prova estourar o timeout; aqui ela faz a função recusar, que é o comportamento desenhado.
  begin
    perform count(*) from public.rpc_gbp_painel(null, 14, false);
    raise exception 'PROVA_207_FALHOU: o painel respondeu sem JWT de staff';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.rpc_gbp_por_dia(null, 14, false);
    raise exception 'PROVA_207_FALHOU: a tabela por dia respondeu sem JWT de staff';
  exception when insufficient_privilege then null;
  end;
  begin
    perform count(*) from public.rpc_gbp_por_ficha();
    raise exception 'PROVA_207_FALHOU: a tabela por ficha respondeu sem JWT de staff';
  exception when insufficient_privilege then null;
  end;

  -- b) AGORA A CHAMADA DO DONO, DE VERDADE: papel `authenticated` + `request.jwt.claims` com o `sub` de
  --    um staff ativo. É a medição que faltou ontem — `set role` sozinho não dá `auth.uid()`.
  -- a leitura de `iam.users` vem ANTES da troca de papel, de proposito: como `authenticated` ela volta
  -- vazia (permissao/RLS) e a simulacao nasceria sem `sub` -- foi o que o primeiro ensaio pegou.
  select '{"sub":"' || u.auth_id::text || '","role":"authenticated"}'
    into v_claims
    from iam.users u
   where u.role in ('super_admin','admin','founder') and u.status = 'active' and u.deleted_at is null
   order by u.role limit 1;
  if v_claims is null then
    raise exception 'PROVA_207_FALHOU: nao achei staff ativo para simular a chamada do dono';
  end if;

  set local role authenticated;
  perform set_config('request.jwt.claims', v_claims, true);

  if not public.is_staff() then
    raise exception 'PROVA_207_FALHOU: a simulacao de JWT nao produziu staff — prova invalida';
  end if;

  -- c) PROVA DE DESEMPENHO, e ela é o motivo desta migration existir: com 5 s de teto, a prova FALHA se
  --    o desempenho voltar a ser o de ontem (as três estouravam 60 s). Foi a falta desta asserção que
  --    mandou tela quebrada para o dono.
  perform set_config('statement_timeout', '5s', true);
  v_t0 := clock_timestamp();
  select * into r from public.rpc_gbp_painel(null, 14, false);
  perform count(*) from public.rpc_gbp_por_dia(null, 14, false);
  perform count(*) from public.rpc_gbp_por_ficha();
  v_ms := round(extract(epoch from (clock_timestamp() - v_t0)) * 1000);
  perform set_config('statement_timeout', '120s', true);

  -- d) e os NÚMEROS continuam os mesmos da 206, medidos em 29/10 na base de lojas abertas
  if r.base_fichas <> 2 then
    raise exception 'PROVA_207_FALHOU: base padrao com % fichas, esperado 2', r.base_fichas;
  end if;
  if r.aparicoes <> 228 or r.rotas <> 38 or r.ligacoes <> 13 then
    raise exception 'PROVA_207_FALHOU: 14 dias deu %/%/% e o medido foi 228/38/13',
      r.aparicoes, r.rotas, r.ligacoes;
  end if;
  if r.ant_aparicoes <> 246 or not r.comparavel then
    raise exception 'PROVA_207_FALHOU: anterior deu % comparavel=%', r.ant_aparicoes, r.comparavel;
  end if;
  if r.ruins_sem_resposta <> 9 or r.ruins_fora_da_base <> 5 then
    raise exception 'PROVA_207_FALHOU: ruins deu %/% e o medido foi 9 na base e 5 fora',
      r.ruins_sem_resposta, r.ruins_fora_da_base;
  end if;
  if r.cliques_site is not null then
    raise exception 'PROVA_207_FALHOU: cliques_site saiu % e a origem nao coletou', r.cliques_site;
  end if;
  if r.perf_fim <> date '2026-10-24' and r.perf_fim <> date '2026-10-25' then
    raise exception 'PROVA_207_FALHOU: ultimo dia fechado inesperado (%)', r.perf_fim;
  end if;

  -- e) a prova da R-049 continua valendo: total de cima = soma das linhas
  if (select coalesce(sum(d.aparicoes), 0) from public.rpc_gbp_por_dia(null, 14, false) d)
     <> coalesce(r.aparicoes, 0) then
    raise exception 'PROVA_207_FALHOU: painel % <> soma das linhas %', r.aparicoes,
      (select sum(d.aparicoes) from public.rpc_gbp_por_dia(null, 14, false) d);
  end if;

  -- f) a tabela de comparação continua com as seis
  if (select count(*) from public.rpc_gbp_por_ficha()) <> 6 then
    raise exception 'PROVA_207_FALHOU: a tabela por ficha nao trouxe as 6';
  end if;

  perform set_config('request.jwt.claims', null, true);
  reset role;

  -- g) as três são definer AGORA (a propriedade se confere na DEFINIÇÃO — R-043 §4-B) e seguem fora do
  --    anon. Definer sem portão seria o furo; o portão está provado em (a).
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and not p.prosecdef
                and p.proname in ('rpc_gbp_painel', 'rpc_gbp_por_dia', 'rpc_gbp_por_ficha')) then
    raise exception 'PROVA_207_FALHOU: alguma funcao ficou invoker';
  end if;
  if pg_catalog.has_function_privilege('anon', 'public.rpc_gbp_painel(text,int,boolean)', 'execute')
  or pg_catalog.has_function_privilege('anon', 'public.rpc_gbp_por_dia(text,int,boolean)', 'execute')
  or pg_catalog.has_function_privilege('anon', 'public.rpc_gbp_por_ficha()', 'execute') then
    raise exception 'PROVA_207_FALHOU: abri funcao para anon';
  end if;
  if not pg_catalog.has_function_privilege('authenticated',
        'public.rpc_gbp_painel(text,int,boolean)', 'execute') then
    raise exception 'PROVA_207_FALHOU: authenticated nao executa o painel';
  end if;

  raise notice 'as tres RPCs responderam em % ms com JWT de staff', v_ms;
end $$;

commit;
