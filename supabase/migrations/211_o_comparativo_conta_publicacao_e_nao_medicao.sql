-- 211 — o comparativo passa a contar PUBLICAÇÃO, e a medição só enriquece
--
-- ✔ APLICADA em 31/10/2026, ensaiada antes (o ensaio recusou a coluna no meio — 42P16 — e ela foi para o
--   fim). Lido depois, semana 19/10: mello 34/20, lancaster 24/23, digiai 9/4, osi 9/4, pessoal 2/0. Custo
--   como `authenticated` com JWT de verdade: **110 ms**, 361 linhas na janela de 70 dias.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: Geral, 31/10, vindo do MKT: `v_comparativo_motores_semana` (193) conta só publicação que tem
--   linha em `mkt.content_performance`. É conserto de contrato de leitura antes do placar de segunda 03/11.
--
-- ═════ MEDIDO ANTES DE ESCREVER, e o defeito é estrutural, não de dado ═════
--   `public.v_mkt_performance` — a base da view de 193 — começa `FROM mkt.content_performance` e só então
--   junta `mkt.publications`. Logo **publicação sem linha de performance não existe para a tela**. Não é
--   perda aleatória: a coleta cobre o Instagram e quase não cobre o Facebook. Semana 19/10, medido:
--     · mello:     instagram 20 pub / 20 medidas   ·  facebook 14 pub / **0 medidas**
--     · digiai:    instagram  6 pub /  4 medidas   ·  facebook  3 pub / **0 medidas**
--     · osi:       instagram  6 pub /  4 medidas   ·  facebook  3 pub / **0 medidas**
--     · lancaster: instagram 22 pub / 21 medidas   ·  facebook  2 pub /  2 medidas
--     · pessoal:   linkedin   2 pub /  0 medidas   → **a marca inteira estava invisível na tela**
--   Então a tela não comparava esforço: comparava *cobertura de coleta*, e o motor que publica em plataforma
--   mal coletada aparecia preguiçoso. É o avesso do propósito do painel.
--
-- ═════ ANTES → DEPOIS, semana 19/10 (19–25/10 BRT) ═════
--     marca      publicações       medidas   engajamento   views   views medidas
--     mello         20 → 34             20             1     243              17
--     lancaster     23 → 24             23             8     488              21
--     digiai         4 →  9              4             4       4               2
--     osi            4 →  9              4             7      50               3
--     pessoal    ausente →  2             0             0    nulo               0
--   Engajamento, views e views_medidas **não mudam** — saem das mesmas linhas de performance. O que muda é
--   o denominador do esforço, e o aparecimento da `pessoal`.
--
-- ═════ O NÚMERO DO RECADO NÃO É O DA SEMANA — e isto importa para segunda ═════
--   O recado cita "mello 61, digiai 13, osi 12". Medido: 61 e 13 são as publicações de **19/10 até hoje
--   (31/10)**, 13 dias, não a semana 19–25/10. A semana dá 34 e 9 (osi 9; de 19/10 até hoje dá 14). Ambos
--   estão certos sobre o que medem — mas um é semana e o outro é quase quinzena, e o placar é semanal. Fica
--   escrito aqui para ninguém olhar 34 na segunda e concluir que o conserto ficou pela metade.
--
-- ═════ TRÊS DECISÕES DE DESENHO ═════
-- (1) `publicacoes_medidas` nasce junto, e não é enfeite: engajamento e views são somados **sobre esse
--     subconjunto**. Sem a coluna, 1 de engajamento sobre 34 publicações e 1 sobre 20 lidas viram a mesma
--     célula, e são conclusões diferentes. Mesma regra da 193 para `views_medidas`: vazio que significa
--     "não medido" não pode parecer "nenhum".
-- (2) A view lê `mkt.publications`, `mkt.brands` e `mkt.content_performance` **direto**, em vez de
--     `v_mkt_performance`, porque o defeito está na ordem das junções daquela view — e ela serve outras
--     telas que eu não vou mexer no mesmo turno. R-043: nasce `security_invoker`, e as três tabelas têm
--     política `pode_ver_brand(brand_id)`, logo o recorte por marca continua sendo do banco.
-- (3) A prova de 193 fixava `11 publicações` em 28/09 — número do contrato ANTIGO (hoje aquela semana tem
--     17 publicações e 11 medidas). Não re-rodo a 193; registro aqui que o número dela descreve o contrato
--     que esta migration substitui, para não parecer divergência quando alguém reler.
--
-- Conferido antes: nenhuma publicação sem marca (0), nenhuma sem data (0), nenhuma performance órfã (0) e
--   **nenhuma publicação com duas linhas de performance (0)** — esta última é a que importa: com duplicata,
--   o `left join` multiplicaria a publicação e o conserto inflaria exatamente o número que veio consertar.
--   O plano confirma o motivo de ser impossível: `content_performance_pub_uidx` é índice ÚNICO por
--   `publication_id`. A prova fica de pé mesmo assim — índice se derruba, prova não.

begin;

do $$
begin
  if to_regclass('public.v_comparativo_motores_semana') is null then
    raise exception 'a view da 193 nao existe — aplicar a 193 antes';
  end if;
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='v_comparativo_motores_semana'
                and column_name='publicacoes_medidas') then
    raise exception 'publicacoes_medidas ja existe — a 211 ja foi aplicada?';
  end if;
  -- a premissa que faz o left join ser seguro
  if exists (select publication_id from mkt.content_performance group by 1 having count(*) > 1) then
    raise exception 'ha publicacao com mais de uma linha de performance — o left join multiplicaria a contagem';
  end if;
  if exists (select 1 from mkt.publications where brand_id is null or published_at is null) then
    raise exception 'ha publicacao sem marca ou sem data — ela sumiria do join e eu medi 0 destas';
  end if;
end $$;

-- ESFORÇO: por motor × marca × semana. A publicação é a base; a medição entra por `left join`.
create or replace view public.v_comparativo_motores_semana
  with (security_invoker = true) as
 select 'mkt'::text as motor,
    b.code      as marca,
    b.name      as marca_nome,
    date_trunc('week', p.published_at at time zone 'America/Sao_Paulo')::date as semana,
    count(*)::int                                                       as publicacoes,
    count(distinct (p.published_at at time zone 'America/Sao_Paulo')::date)::int as dias_com_publicacao,
    round(coalesce(sum(cp.engajamento), 0))::int                        as engajamento,
    sum(cp.views_d7)::int                                               as views,
    count(cp.views_d7)::int                                             as views_medidas,
    max(cp.d7_em)                                                       as ultima_foto_d7,
    -- coluna NOVA entra no FIM: `create or replace view` nao reordena nem insere coluna no meio (o ensaio
    -- recusou com 42P16 quando eu a pus ao lado de `publicacoes`, que e onde ela se le melhor).
    count(cp.publication_id)::int                                       as publicacoes_medidas
   from mkt.publications p
   join mkt.brands b on b.id = p.brand_id
   left join mkt.content_performance cp on cp.publication_id = p.id
  where p.published_at >= (now() - '70 days'::interval)
  group by 1, 2, 3, 4;

comment on view public.v_comparativo_motores_semana is
  '193/211: ESFORÇO por motor × marca × semana (BRT), 70 dias. **211: conta PUBLICAÇÃO (mkt.publications); a '
  'medição (mkt.content_performance) só enriquece.** Antes a view nascia da performance, então publicação sem '
  'linha coletada não existia — e a coleta cobre Instagram e quase não cobre Facebook, logo a tela comparava '
  'cobertura de coleta e não esforço (a marca `pessoal` estava invisível por inteiro). `publicacoes_medidas` '
  'diz sobre quantas publicações o engajamento e as views foram somados: 1 de engajamento sobre 34 '
  'publicações e 1 sobre 20 lidas são conclusões diferentes. `views_medidas` continua separando "ainda não" '
  'de zero. Hoje traz só o motor `mkt` — Pulso, Limelight, blogs e Polá vivem em projetos Supabase SEPARADOS '
  'e a tela os lê pelo navegador (espelhoMotores.ts). NÃO tem coluna de venda de propósito: venda é da marca, '
  'não do motor, e somar motores multiplicaria a mesma venda.';

grant select on public.v_comparativo_motores_semana to authenticated;
revoke all on public.v_comparativo_motores_semana from anon;

do $$
declare r record; v_pub int; v_med int; v_direto int;
begin
  -- a) os números da semana 19/10, exatamente como eu medi antes de escrever
  for r in
    select * from (values ('mello',34,20), ('lancaster',24,23), ('digiai',9,4), ('osi',9,4), ('pessoal',2,0))
      as e(marca, pub, med)
  loop
    select publicacoes, publicacoes_medidas into v_pub, v_med
      from public.v_comparativo_motores_semana
     where semana = date '2026-10-19' and marca = r.marca;
    if coalesce(v_pub,-1) <> r.pub or coalesce(v_med,-1) <> r.med then
      raise exception 'PROVA_211_FALHOU: % deu %/% e eu medi %/%',
        r.marca, coalesce(v_pub,-1), coalesce(v_med,-1), r.pub, r.med;
    end if;
  end loop;

  -- b) o left join NAO multiplicou: a soma da view bate com a contagem direta da tabela na mesma janela
  select coalesce(sum(publicacoes),0) into v_pub from public.v_comparativo_motores_semana;
  select count(*) into v_direto from mkt.publications
   where published_at >= (now() - '70 days'::interval);
  if v_pub <> v_direto then
    raise exception 'PROVA_211_FALHOU: a view soma % publicacoes e a tabela tem % na janela', v_pub, v_direto;
  end if;

  -- c) a coluna nova tem de SEPARAR algo: medidas <= publicacoes sempre, e menor em pelo menos uma linha.
  --    Se fosse sempre igual, o conserto nao teria mudado nada e eu estaria relatando trabalho que nao houve.
  if exists (select 1 from public.v_comparativo_motores_semana where publicacoes_medidas > publicacoes) then
    raise exception 'PROVA_211_FALHOU: medidas maior que publicacoes — o join esta errado';
  end if;
  if not exists (select 1 from public.v_comparativo_motores_semana where publicacoes_medidas < publicacoes) then
    raise exception 'PROVA_211_FALHOU: medidas = publicacoes em tudo — a view antiga ja estava certa';
  end if;

  -- d) a marca que estava invisivel aparece (motivo concreto do conserto, nao so a contagem)
  if not exists (select 1 from public.v_comparativo_motores_semana
                  where marca = 'pessoal' and publicacoes_medidas = 0 and publicacoes > 0) then
    raise exception 'PROVA_211_FALHOU: a marca pessoal continua fora, ou ganhou medicao que eu nao medi';
  end if;

  -- e) trava estrutural da 193 mantida: esforço não pode ter coluna de venda
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='v_comparativo_motores_semana'
                and column_name in ('vendas','venda','receita')) then
    raise exception 'PROVA_211_FALHOU: coluna de venda na view de esforco';
  end if;

  -- f) invoker na definição (R-043 §4-B) e fora do anon
  if not exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
                  where n.nspname='public' and c.relname='v_comparativo_motores_semana'
                    and (select lower(split_part(o,'=',2)) from unnest(c.reloptions) o
                          where split_part(o,'=',1)='security_invoker') in ('true','on')) then
    raise exception 'PROVA_211_FALHOU: a view perdeu o security_invoker';
  end if;
  if pg_catalog.has_table_privilege('anon','public.v_comparativo_motores_semana','select') then
    raise exception 'PROVA_211_FALHOU: abri a view para anon';
  end if;
end $$;

-- g) CUSTO, pelo papel e pela identidade de verdade. A politica `pode_ver_brand(brand_id)` leva ARGUMENTO,
--    logo é avaliada LINHA A LINHA — foi exatamente assim que a tela do Google estourou o timeout do dono em
--    30/10. `set local role` sozinho nao serve: sem `auth.uid()` a funcao mente e o custo nao aparece.
do $$
declare t0 timestamptz; v_ms int; v_linhas int;
begin
  set local role authenticated;
  set local request.jwt.claims = '{"sub":"2956f8d9-f161-4333-a962-96eab02600fe","role":"authenticated"}';
  set local statement_timeout = '3s';
  t0 := clock_timestamp();
  select count(*) into v_linhas from public.v_comparativo_motores_semana;
  v_ms := extract(milliseconds from (clock_timestamp() - t0))::int
          + 1000 * extract(second from (clock_timestamp() - t0))::int;
  reset role;
  if v_linhas < 1 then
    raise exception 'PROVA_211_FALHOU: authenticated leu 0 linhas — o portao fechou a tela';
  end if;
  raise notice 'custo como authenticated: % linhas em % ms', v_linhas, v_ms;
end $$;

commit;
