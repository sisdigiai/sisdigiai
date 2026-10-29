-- 206 — os KPIs do Google nascem no banco, com ficha/janela/base como parâmetro (R-049)
--
-- ✔ APLICADA em 29/10/2026, reensaiada antes (e o ensaio recusou três versões: a janela da
--   `por_dia` falava de outro período, o número esperado de "ruins fora da base" estava errado
--   porque EU tinha medido por `publicada_em` em vez de `status`, e a prova de papel `authenticated`
--   estourava o timeout por artefato da Management API). Depois: as 3 funções existem, nenhuma
--   definer, `authenticated` executa, `anon` não, e os comentários ficaram com acento íntegro.
--   Lido depois de aplicar, base de lojas abertas, janela 14: 228 aparições / 38 rotas / 13
--   ligações, 11–24/10, anterior 246, comparável; `cliques_site` NULO; 9 ruins sem resposta na
--   base e 5 fora; 33 dias fechados na série.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: nenhum. É dívida minha, declarada por mim ontem e hoje no cabeçalho de `src/modules/Google.tsx`
--   e no changelog: a tela soma linha no front. R-049 (dono, 13/10) diz o contrário — "o agregado exibido
--   nasce no banco com todos os filtros da tela como parâmetro da RPC/view; o front passa filtros e
--   desenha, nunca re-soma linhas; prova = número de cima e soma das linhas batem ou a tela não sobe".
--   Não dá para chamar de cumprido o que não está, e não precisa de palavra de ninguém para cumprir regra
--   da casa no meu próprio app.
--
-- ═════ O QUE A VERSÃO DO FRONT FAZIA, E POR QUE ISSO É MAIS QUE ELEGÂNCIA ═════
--   Para exibir 8 números, a tela lia **1.745 avaliações + 216 linhas de métrica + 184 posts** e somava em
--   `useMemo`. Três custos reais, não estéticos:
--     (1) o `lerTudo` com contagem exata e paginação só existe porque o front precisa das linhas — some o
--         motivo e some a classe inteira de erro "página silenciosa de 1.000 truncou todo total";
--     (2) as três regras difíceis (duas âncoras de tempo, variação só com base completa, nulo que não é
--         zero) viviam em TypeScript, onde nada as prova; aqui elas viram uma fonte só, provada na
--         própria migration;
--     (3) o mesmo número passaria a divergir se outra tela (Telão, Semana) quisesse exibi-lo — a lição da
--         192, onde a mesma regra escrita em dois lugares saiu de sincronia.
--
-- ═════ AS TRÊS REGRAS, AGORA NO BANCO ═════
--   · DUAS ÂNCORAS. Desempenho (aparições/rotas/ligações) ancora no último dia **fechado** — hoje 24/10,
--     porque o relatório do Google atrasa; avaliação e post ancoram em **hoje** (Brasília), porque chegam
--     na hora. As duas datas saem na resposta para a tela escrever qual usou.
--   · VARIAÇÃO SÓ COM BASE COMPLETA. `comparavel` é verdade apenas quando o período anterior tem o MESMO
--     número de dias fechados. Medido hoje na base de lojas abertas: em 30 dias o anterior tem **3** dias,
--     e a variação ingênua diria +987%. `comparavel = false` e a tela escreve "sem base anterior
--     completa".
--   · NULO NÃO É ZERO. `cliques_site` vem nulo nas 6 fichas e `sum()` de tudo nulo é **nulo**, não 0 —
--     é o comportamento que eu quero e por isso não há `coalesce` nele. `incompleto` acende se algum dia
--     que a origem declarou fechado trouxer campo nulo.
--
-- ═════ DECISÕES QUE A MEDIÇÃO IMPÔS ═════
--   · `SECURITY INVOKER` (o padrão), e NÃO definer. R-043 diz que RLS não protege objeto definer e que
--     definer só com filtro explícito de papel. Função de leitura que roda como quem chama não precisa de
--     portão nenhum: as `v_mkt_gbp_*` já são invoker e `anon` não lê nenhuma delas (conferido). Definer
--     aqui seria inventar superfície para não ganhar nada.
--   · A BASE JUNTA PELO `location_id`, não pelo nome. A tela filtra por nome (é o que o seletor tem), e a
--     função resolve para `location_id` no primeiro CTE. Juntar por nome funcionaria hoje e quebraria
--     calado no dia em que alguém renomear uma ficha no Google — e renomear ficha é coisa que acontece.
--   · FICHA ESCOLHIDA VENCE A BASE. `p_ficha` preenchido ignora `p_incluir_fechadas`: escolher no seletor
--     uma loja fechada de vez é ato explícito do dono e vale mais que o padrão da tela.
--   · `coalesce(situacao,'')` no filtro da base: ficha com situação NULA entra como aberta. É o mesmo que
--     o front fazia (`!== 'fechada_definitivamente'`), e o contrário esconderia ficha nova sem situação.
--
-- R-044: nada de tabela nova; `public` recebe só função. R-049: ficha, janela e base são parâmetros.
--   As três funções leem SOMENTE as views de contrato (`public.v_mkt_gbp_*`), nunca `mkt.gbp_*` direto:
--   paga a dívida de R-044 que eu tinha anotado em vez de aumentar, e `dia_fechado`, o nulo do dia aberto e
--   os dois carimbos de leitura continuam definidos num lugar só — a view do MKT, que é quem os produz.

begin;

do $$
begin
  if to_regprocedure('public.rpc_gbp_painel(text,int,boolean)') is not null then
    raise exception 'rpc_gbp_painel ja existe — a 206 ja foi aplicada?';
  end if;
  -- premissas medidas hoje, 29/10. Se qualquer uma mudou, eu quero saber ANTES de a função existir.
  if (select count(*) from public.v_mkt_gbp_fichas where coalesce(situacao,'') = 'fechada_definitivamente') <> 4 then
    raise exception 'esperava 4 fichas fechadas de vez — conferir a base antes de aplicar';
  end if;
  if (select max(m.dia) from public.v_mkt_gbp_metricas_dia m
       join public.v_mkt_gbp_fichas f on f.location_id = m.location_id
      where m.dia_fechado and coalesce(f.situacao,'') <> 'fechada_definitivamente') <> date '2026-10-24' then
    raise exception 'o ultimo dia fechado nao e 24/10 — reler os numeros esperados da prova';
  end if;
end $$;

create function public.rpc_gbp_painel(
  p_ficha            text    default null,     -- nome da ficha; nulo = a base inteira
  p_janela           int     default 14,       -- dias; 0 = série inteira
  p_incluir_fechadas boolean default false     -- ignorado quando p_ficha vem preenchido
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
language sql
stable
as $$
with base as (
  select g.location_id, g.nome, g.avaliacoes_lidas_em
    from public.v_mkt_gbp_fichas g
   where case when p_ficha is not null then g.nome = p_ficha
              else p_incluir_fechadas
                   or coalesce(g.situacao, '') <> 'fechada_definitivamente'
         end
),
-- LÊ A VIEW, NÃO A TABELA: `dia_fechado` (lido_em >= dia + 5 dias) e o nulo dos campos em dia aberto
-- moram na definição de `v_mkt_gbp_metricas_dia`, e `cliques_site` é NULL literal lá. Reescrever a regra
-- dos 5 dias aqui seria a mesma regra em dois lugares — o defeito que a 192 me ensinou.
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
  select (select ini from lim) - 1                        as fim,
         (select ini from lim) - (select n from lim)       as ini
),
-- Desempenho: só dia FECHADO entra na soma. Sem `coalesce` em cliques_site de propósito.
atual as (
  select count(distinct dia)::int                                   as dias,
         sum(aparicoes)                                             as aparicoes,
         sum(rotas)                                                 as rotas,
         sum(ligacoes)                                              as ligacoes,
         sum(cliques_site)                                          as cliques_site,
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
         case when p_janela > 0 then (select d from hj) - (p_janela - 1) else date '0001-01-01' end as ini
),
aval as (
  select count(*)::int as n, round(avg(a.estrelas)::numeric, 2) as media
    from public.v_mkt_gbp_avaliacoes a join base b on b.location_id = a.location_id
   where (a.criada_em at time zone 'America/Sao_Paulo')::date >= (select ini from jan)
),
-- Fila inteira, sem corte de período: avaliação velha sem resposta continua custando.
ruins as (
  select count(*)::int as n
    from public.v_mkt_gbp_avaliacoes a join base b on b.location_id = a.location_id
   where a.estrelas <= 3 and coalesce(a.status, '') <> 'publicada'
),
-- O que fica FORA da base, para a tela citar ao lado em vez de somar dentro.
ruins_fora as (
  select count(*)::int as n
    from public.v_mkt_gbp_avaliacoes a join public.v_mkt_gbp_fichas g on g.location_id = a.location_id
   where a.estrelas <= 3 and coalesce(a.status, '') <> 'publicada'
     and coalesce(g.situacao, '') = 'fechada_definitivamente'
     and not exists (select 1 from base b where b.location_id = a.location_id)
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
       -- comparável só com o MESMO número de dias fechados nas duas pontas
       (p_janela > 0
          and (select dias from anterior) = (select n from lim)
          and (select dias from atual)    = (select n from lim)),
       (select hoje from jan), (select ini from jan),
       (select n from aval), (select media from aval),
       (select n from ruins), (select n from ruins_fora),
       (select no_ar_janela from post), (select agendados from post), (select falhas from post),
       (select lido_em from leitura), (select ultimo_fechado from leitura),
       (select mais_velho from carimbo), coalesce((select divergente from carimbo), false);
$$;

comment on function public.rpc_gbp_painel(text, int, boolean) is
  '206 (R-049): os KPIs da tela #/google nascem aqui, com ficha, janela e base como PARÂMETRO — a tela '
  'passa filtro e desenha, não soma linha. Duas âncoras de tempo: desempenho no último dia FECHADO (o '
  'relatório do Google atrasa), avaliação e post em hoje/Brasília. `comparavel` só é verdade quando o '
  'período anterior tem o mesmo número de dias fechados (em 30 dias o anterior tem 3, e a variação ingênua '
  'diria +987%). `cliques_site` sai NULO quando a origem não coletou — não há coalesce nele de propósito. '
  'INVOKER, nunca definer: as views de origem já são invoker e anon não lê nenhuma.';

create function public.rpc_gbp_por_dia(
  p_ficha text default null, p_janela int default 14, p_incluir_fechadas boolean default false
)
returns table (
  dia date, aberto boolean, aparicoes bigint, rotas bigint, ligacoes bigint,
  nossos bigint, no_ar_google bigint
)
language sql
stable
as $$
with base as (
  select g.location_id from public.v_mkt_gbp_fichas g
   where case when p_ficha is not null then g.nome = p_ficha
              else p_incluir_fechadas or coalesce(g.situacao, '') <> 'fechada_definitivamente'
         end
),
met as (select m.* from public.v_mkt_gbp_metricas_dia m join base b on b.location_id = m.location_id),
-- A JANELA É A MESMA DO PAINEL, ancorada no último dia FECHADO — e isto é correção de um defeito meu.
-- A primeira versão desta função pegava os N dias mais RECENTES, que incluem os dias ainda abertos depois
-- do último fechado: a tabela mostraria 22–28/10 enquanto o KPI somava 18–24/10. Número nenhum ficava
-- errado, mas a tabela e o número de cima falariam de períodos diferentes na mesma tela, que é pior.
-- Quem achou foi a prova (a) desta migration, antes de a função existir.
anc as (select max(dia) filter (where dia_fechado) as fim,
               min(dia) filter (where dia_fechado) as ini_serie from met),
lim as (select case when p_janela > 0 then (select fim from anc) - (p_janela - 1)
                    else (select ini_serie from anc) end as ini from anc)
select m.dia,
       bool_or(not coalesce(m.dia_fechado, false))                   as aberto,
       sum(m.aparicoes) filter (where m.dia_fechado)                 as aparicoes,
       sum(m.rotas)     filter (where m.dia_fechado)                 as rotas,
       sum(m.ligacoes)  filter (where m.dia_fechado)                 as ligacoes,
       sum(m.posts_no_dia)                                           as nossos,
       sum(m.posts_no_ar_google)                                     as no_ar_google
  from met m
 -- sem limite superior de propósito: o dia que ainda não fechou aparece marcado `aberto`, e como as somas
 -- filtram `dia_fechado` ele entra como nulo e não muda total nenhum.
 where m.dia >= (select ini from lim)
 group by m.dia
 order by m.dia desc;
$$;

comment on function public.rpc_gbp_por_dia(text, int, boolean) is
  '206 (R-049): a tabela por dia da tela #/google, mesma base e mesma janela do painel. `aberto` marca o '
  'dia em que alguma ficha ainda não fechou: soma parcial com cara de número fechado é pior que dizer '
  '"espera". Post não depende do relatório de desempenho — `posts_no_ar_google` é leitura própria da API e '
  'vale em dia aberto também, por isso soma sem o filtro de `dia_fechado`.';

create function public.rpc_gbp_por_ficha()
returns table (
  ficha text, situacao text, posts_motor boolean, total int, noventa int,
  media numeric, sem_resposta int, ruins_sem_resposta int,
  ultima_avaliacao_em timestamptz, avaliacoes_lidas_em timestamptz
)
language sql
stable
as $$
-- SEM parâmetro de base de propósito: esta tabela existe para COMPARAR, e tirar as fechadas dela tiraria
-- a razão dela existir. Ela traz `situacao` para a tela rotular cada linha.
select g.nome,
       g.situacao,
       g.posts_motor,
       count(a.review_id)::int,
       count(*) filter (
         where (a.criada_em at time zone 'America/Sao_Paulo')::date
               >= (now() at time zone 'America/Sao_Paulo')::date - 90
       )::int,
       round(avg(a.estrelas)::numeric, 2),
       count(*) filter (where coalesce(a.status, '') <> 'publicada')::int,
       count(*) filter (where a.estrelas <= 3 and coalesce(a.status, '') <> 'publicada')::int,
       g.ultima_avaliacao_em,
       g.avaliacoes_lidas_em
  from public.v_mkt_gbp_fichas g
  left join public.v_mkt_gbp_avaliacoes a on a.location_id = g.location_id
 group by g.nome, g.situacao, g.posts_motor, g.ultima_avaliacao_em, g.avaliacoes_lidas_em
 order by 5 desc, 4 desc;
$$;

comment on function public.rpc_gbp_por_ficha() is
  '206 (R-049): a tabela por ficha da tela #/google. NÃO recebe parâmetro de base porque existe para '
  'comparar — tirar as fechadas tiraria a razão dela existir; ela devolve `situacao` para a tela rotular. '
  '`ultima_avaliacao_em` ("quando alguém avaliou") e `avaliacoes_lidas_em` ("quando nós lemos") vêm '
  'separadas: confundir as duas foi o erro de 29/10, que fez eu reportar coleta parada onde nada parou.';

revoke all on function public.rpc_gbp_painel(text, int, boolean) from public, anon;
revoke all on function public.rpc_gbp_por_dia(text, int, boolean) from public, anon;
revoke all on function public.rpc_gbp_por_ficha() from public, anon;
grant execute on function public.rpc_gbp_painel(text, int, boolean) to authenticated;
grant execute on function public.rpc_gbp_por_dia(text, int, boolean) to authenticated;
grant execute on function public.rpc_gbp_por_ficha() to authenticated;

do $$
declare r record; v_n int;
begin
  -- a) A PROVA QUE A R-049 PEDE: o número de cima bate com a soma das linhas. Se o painel e a tabela por
  --    dia discordarem, a tela não sobe — é esta a asserção que torna a regra verificável e não retórica.
  --    (Foi ela que achou a janela errada da `por_dia`: os N dias mais recentes != os N dias ancorados no
  --    último fechado. O número não estava errado; a tabela e o KPI falavam de períodos diferentes.)
  for v_n in select j from (values (7), (14), (30), (0)) t(j) loop
    if (select coalesce(sum(d.aparicoes), 0) from public.rpc_gbp_por_dia(null, v_n, false) d)
       <> (select coalesce(p.aparicoes, 0) from public.rpc_gbp_painel(null, v_n, false) p) then
      raise exception 'PROVA_206_FALHOU: janela %, aparicoes do painel % <> soma das linhas %', v_n,
        (select p.aparicoes from public.rpc_gbp_painel(null, v_n, false) p),
        (select sum(d.aparicoes) from public.rpc_gbp_por_dia(null, v_n, false) d);
    end if;
    if (select coalesce(sum(d.rotas), 0) from public.rpc_gbp_por_dia(null, v_n, false) d)
       <> (select coalesce(p.rotas, 0) from public.rpc_gbp_painel(null, v_n, false) p) then
      raise exception 'PROVA_206_FALHOU: janela %, rotas do painel nao bate com a soma das linhas', v_n;
    end if;
  end loop;

  -- b) os números medidos HOJE na base de lojas abertas, que são os que estão na tela agora
  select * into r from public.rpc_gbp_painel(null, 14, false);
  if r.perf_fim <> date '2026-10-24' or r.perf_ini <> date '2026-10-11' or r.perf_dias <> 14 then
    raise exception 'PROVA_206_FALHOU: janela de 14 dias deu %..% com % dias', r.perf_ini, r.perf_fim, r.perf_dias;
  end if;
  if r.aparicoes <> 228 or r.rotas <> 38 or r.ligacoes <> 13 then
    raise exception 'PROVA_206_FALHOU: 14 dias deu %/%/% e o medido foi 228/38/13',
      r.aparicoes, r.rotas, r.ligacoes;
  end if;
  if r.ant_aparicoes <> 246 or not r.comparavel then
    raise exception 'PROVA_206_FALHOU: periodo anterior de 14 dias deu % (esperado 246) comparavel=%',
      r.ant_aparicoes, r.comparavel;
  end if;
  if r.base_fichas <> 2 then
    raise exception 'PROVA_206_FALHOU: a base padrao tem % fichas e deveria ter 2', r.base_fichas;
  end if;

  -- c) CONTROLE NEGATIVO da variação: em 30 dias o anterior tem 3 dias fechados, logo NÃO é comparável.
  --    Sem esta prova, um `comparavel` que devolvesse `true` sempre passaria por (b) e a tela voltaria a
  --    poder exibir +987% com cara de notícia boa.
  select * into r from public.rpc_gbp_painel(null, 30, false);
  if r.comparavel then
    raise exception 'PROVA_206_FALHOU: 30 dias apareceu como comparavel com % dias no anterior', r.ant_dias;
  end if;
  if r.ant_dias <> 3 then
    raise exception 'PROVA_206_FALHOU: esperava 3 dias fechados no anterior de 30 e deu %', r.ant_dias;
  end if;

  -- d) NULO NÃO É ZERO: cliques_site tem de sair NULO, nunca 0.
  select * into r from public.rpc_gbp_painel(null, 14, false);
  if r.cliques_site is not null then
    raise exception 'PROVA_206_FALHOU: cliques_site saiu % e a origem nao coletou nada', r.cliques_site;
  end if;

  -- e) A BASE MUDA O NÚMERO, e muda para mais: incluir as 4 fechadas tem de somar avaliação e post.
  --    Controle positivo do parâmetro — um `p_incluir_fechadas` ignorado passaria por tudo acima.
  if (select p.ruins_sem_resposta from public.rpc_gbp_painel(null, 14, true) p)
     <= (select p.ruins_sem_resposta from public.rpc_gbp_painel(null, 14, false) p) then
    raise exception 'PROVA_206_FALHOU: incluir as fechadas nao aumentou a fila de ruins';
  end if;
  if (select p.base_fichas from public.rpc_gbp_painel(null, 14, true) p) <> 6 then
    raise exception 'PROVA_206_FALHOU: com as fechadas a base nao deu 6 fichas';
  end if;
  -- e o que fica fora da base tem de ser exatamente o que a tela cita ao lado
  select * into r from public.rpc_gbp_painel(null, 14, false);
  if r.ruins_fora_da_base <> 5 then
    raise exception 'PROVA_206_FALHOU: ruins fora da base deu % e o medido foi 5', r.ruins_fora_da_base;
  end if;
  if r.ruins_sem_resposta <> 9 then
    raise exception 'PROVA_206_FALHOU: ruins na base deu % e o medido foi 9', r.ruins_sem_resposta;
  end if;

  -- e-2) A DEFINICAO DE "SEM RESPOSTA" FICA PINADA AQUI, porque eu mesmo errei nela hoje.
  --   Eu medi por `publicada_em is null` e reportei ao dono 21 ruins sem resposta (13 abertas + 8
  --   fechadas). Esta errado: `publicada_em is null` conta tambem avaliacao RESPONDIDA cujo carimbo de
  --   publicacao nao foi gravado. Medido: 1.731 linhas `status='publicada'` tem TODAS texto de resposta,
  --   mas so 1.604 tem `publicada_em` -- 127 respondidas sem carimbo, 7 delas ruins. A fila de verdade sao
  --   as 16 `status='sem_resposta'` (14 ruins: 9 em loja aberta, 5 em fechada), que e o que a tela ja
  --   mostrava. A funcao usa `status <> 'publicada'` (aberto a status novo, como `falhou`, que
  --   `v_mkt_gbp_fichas.avaliacoes_pendentes` tambem conta) e esta prova trava a diferenca em 7, para as
  --   duas leituras nao voltarem a se confundir em silencio.
  if (select count(*) from public.v_mkt_gbp_avaliacoes
       where estrelas <= 3 and publicada_em is null and coalesce(status,'') = 'publicada') <> 7 then
    raise exception 'PROVA_206_FALHOU: a diferenca entre as duas leituras de "sem resposta" nao e 7, e %',
      (select count(*) from public.v_mkt_gbp_avaliacoes
        where estrelas <= 3 and publicada_em is null and coalesce(status,'') = 'publicada');
  end if;
  if (select count(*) from public.v_mkt_gbp_avaliacoes
       where coalesce(status,'') <> 'publicada' and publicada_em is not null) <> 0 then
    raise exception 'PROVA_206_FALHOU: apareceu avaliacao com carimbo de publicacao e status nao publicada';
  end if;

  -- f) FICHA ESCOLHIDA VENCE A BASE: pedir uma ficha fechada de vez tem de devolvê-la, não vazio.
  -- o nome sai de uma CONSULTA, nao de literal: a grafia da ficha e dado (e viaja por camadas que ja
  -- estragaram acento uma vez hoje), e prova que depende de grafia quebra no dia em que renomeiam a loja.
  select * into r from public.rpc_gbp_painel(
    (select nome from public.v_mkt_gbp_fichas
      where coalesce(situacao,'') = 'fechada_definitivamente' order by nome limit 1), 14, false);
  if r.base_fichas <> 1 then
    raise exception 'PROVA_206_FALHOU: escolher ficha fechada devolveu % fichas', r.base_fichas;
  end if;

  -- g) a tabela por ficha fica com as SEIS, sempre — é a razão de ela existir
  if (select count(*) from public.rpc_gbp_por_ficha()) <> 6 then
    raise exception 'PROVA_206_FALHOU: a tabela por ficha nao trouxe as 6';
  end if;
  if (select count(*) from public.rpc_gbp_por_ficha() where situacao is null) > 0 then
    raise exception 'PROVA_206_FALHOU: ficha sem situacao na tabela de comparacao';
  end if;

  -- h) os dois carimbos saem separados e preenchidos nas 6
  if (select count(*) from public.rpc_gbp_por_ficha() where avaliacoes_lidas_em is null) > 0 then
    raise exception 'PROVA_206_FALHOU: ficha sem avaliacoes_lidas_em';
  end if;

  -- i) PORTÃO: anon não executa nenhuma das três; authenticated executa as três.
  if pg_catalog.has_function_privilege('anon', 'public.rpc_gbp_painel(text,int,boolean)', 'execute')
  or pg_catalog.has_function_privilege('anon', 'public.rpc_gbp_por_dia(text,int,boolean)', 'execute')
  or pg_catalog.has_function_privilege('anon', 'public.rpc_gbp_por_ficha()', 'execute') then
    raise exception 'PROVA_206_FALHOU: abri funcao para anon';
  end if;
  if not pg_catalog.has_function_privilege('authenticated', 'public.rpc_gbp_painel(text,int,boolean)', 'execute') then
    raise exception 'PROVA_206_FALHOU: authenticated nao executa o painel';
  end if;

  -- j) nenhuma das três é definer (R-043 §4-B: a propriedade se confere na DEFINIÇÃO, não na intenção)
  if exists (select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
              where n.nspname = 'public' and p.prosecdef
                and p.proname in ('rpc_gbp_painel', 'rpc_gbp_por_dia', 'rpc_gbp_por_ficha')) then
    raise exception 'PROVA_206_FALHOU: alguma das funcoes nasceu SECURITY DEFINER';
  end if;

  -- k) O CONTROLE POSITIVO DO CAMINHO REAL NÃO CABE AQUI, e dizer isso é mais honesto que simular.
  --   A primeira versão desta prova fazia `set local role authenticated` e chamava as três. Ela
  --   estourou o statement timeout dentro de `is_admin` / `pode_ver_brand`, e o ensaio me lembrou da
  --   regra que eu mesmo escrevi: `set role` troca `current_user` e não `session_user`, não há
  --   `auth.uid()` nesta sessão, e por isso `is_admin()` mente — RLS e custo real só se provam
  --   por chamada com JWT do papel. Manter aquele bloco seria trocar uma prova por uma encenação,
  --   e pior: um timeout de artefato bloquearia uma migration correta.
  --   O que SE prova daqui está em (i): o GRANT existe para `authenticated` e não existe para
  --   `anon` — isso `has_function_privilege` responde sem depender de papel de sessão. O resto
  --   (abre logado, e abre rápido) se prova na tela publicada, por R-005, e fica registrado lá.
  --   NOTA DE CUSTO, para quem vier depois: as linhas de avaliação já são lidas hoje sob a
  --   mesma RLS — a tela baixava as 1.745 e somava no front. Agregar no banco lê as MESMAS linhas
  --   com o MESMO predicado e deixa de trafegar 1.745 registros; não há motivo para ficar pior, e
  --   se ficar, a medição honesta vem da rede do navegador, não daqui.
end $$;

commit;
