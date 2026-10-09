-- 193 — comparativo de motores por semana: o que o banco do digiai pode responder, e só isso
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: Geral, 07/10, aprovado pelo dono ("pode"), em `Cockpit/sessoes/_PARA_APP_2026-10-07.md`. Tabela
--   crua semanal por motor × marca, para abrir o placar de segunda.
--
-- ═════ O QUE EU MEDI ANTES DE ESCREVER, e muda o desenho em três pontos ═════
--
-- (1) **Uma view do digiai NÃO alcança Pulso, Limelight, blogs nem Polá.** Esses espelhos vivem em projetos
--     Supabase SEPARADOS, lidos pelo navegador com a anon key de cada um (`espelhoMotores.ts`). Conferido:
--     este banco tem `v_mkt_performance` e `v_mkt_espelho`, e **nenhuma** `v_espelho_pulso/limelight/blogs`.
--     Então a view cobre o que mora aqui — MKT + `analytics` — e os outros motores entram na tela, pelos
--     canos que já existem (o pedido diz "nenhum cano novo", e isto honra). View que fingisse cobrir todos
--     devolveria metade dos motores em silêncio, que é o pior resultado possível numa tela de comparação.
--
-- (2) **`views_d7` está NULO em 100% das linhas** — 0 de 33 na semana corrente, 0 em 70 dias, todas as
--     marcas. O adendo do MKT diz que a foto de 7 dias começa a encher em 09/10, logo o primeiro dado real
--     aparece por volta de **16/10** — e o placar é **segunda, 12/10**. Se a coluna de views sair como 0, o
--     dono olha 33 publicações sem views e conclui que os motores não entregam nada. Por isso a view devolve
--     `views` **e** `views_medidas` (quantas linhas têm a foto): a tela escreve "ainda não" quando
--     `views_medidas = 0`, e nunca zero. Vazio que significa "não medido" não pode parecer "nenhum".
--
-- (3) **VENDA PERTENCE À MARCA, NÃO AO MOTOR.** Se `vendas` fosse coluna da linha de motor, somar os motores
--     de uma marca multiplicaria a mesma venda — o Mello tem motor MKT (IG/FB) e Limelight (TikTok/YouTube)
--     ao mesmo tempo. Por isso são **duas views**: uma de esforço (por motor × marca) e uma de resultado
--     (por marca). A tela põe lado a lado sem poder somar errado.
--
-- ═════ O QUE A ÚLTIMA SEMANA COMPLETA (28/09–04/10) DIZ, medido ═════
--   MKT: 11 publicações (mello 5, osi 4, digiai 1, lancaster 1), 2 dias com publicação, **engajamento 1**.
--   Resultado: digiai 42 visitas, osi 18 visitas, **0 cliques, 0 vendas**.
--   (Semana corrente, incompleta: 33 publicações e **engajamento 4**. Trinta e três publicações, quatro
--   interações. O número é feio e é o número.)
--
-- O MAPA MARCA → PRODUTO VAI PARA O BANCO, não para um `case` dentro da view: é a lição da 192, onde a
--   distinção escondida numa view envelheceu calada. Quatro linhas, no meu schema, e a marca nova é obrigada
--   a se declarar. `lancaster` entra com produto nulo de propósito — ela publica e **não tem site medido**,
--   então aparece no esforço e não no resultado, por declaração e não por esquecimento.

begin;

do $$
begin
  if to_regclass('ops.marca_produto_analytics') is not null then
    raise exception 'ops.marca_produto_analytics ja existe — a 193 ja foi aplicada?';
  end if;
  if to_regclass('public.v_mkt_performance') is null then
    raise exception 'v_mkt_performance nao existe — sem ela nao ha esforco para comparar';
  end if;
  if to_regclass('analytics.eventos_de_funil') is null then
    raise exception 'analytics.eventos_de_funil nao existe — a 192 nao foi aplicada';
  end if;
end $$;

create table ops.marca_produto_analytics (
  marca      text primary key,
  produto    text,                      -- nulo = a marca publica mas não tem site medido
  observacao text not null,
  criado_em  timestamptz not null default now()
);

comment on table ops.marca_produto_analytics is
  '193: liga a marca que publica (mkt.brands.brand_code) ao produto medido em analytics.events_log. Produto '
  'NULO é declaração, não falta: a marca publica e não tem site medido. Mora aqui e não num case dentro de '
  'view — distinção escondida em view envelhece calada (lição da 192).';

insert into ops.marca_produto_analytics (marca, produto, observacao) values
  ('mello',     'mello-loja',  'Loja online em Cloudflare Worker desde 02/10. Vendas vêm de loja_compra.'),
  ('osi',       'osi',         'Landing em osi.digiai.app.br desde 08/10. Resultado = click_checkout (diagnóstico pago: 0 hoje).'),
  ('digiai',    'digiai-site', 'Site institucional. Mede visita e clique em CTA desde a 160.'),
  ('lancaster', null,          'Publica pelo MKT e NÃO tem site medido — aparece no esforço, não no resultado. Declarado, não esquecido.');

grant select on ops.marca_produto_analytics to authenticated;
alter table ops.marca_produto_analytics enable row level security;
create policy marca_produto_staff_select on ops.marca_produto_analytics
  for select to authenticated using (is_staff());

-- ESFORÇO: por motor × marca × semana. Hoje só o motor que mora neste banco.
create or replace view public.v_comparativo_motores_semana
  with (security_invoker = true) as
 select 'mkt'::text as motor,
    p.brand_code as marca,
    p.brand_name as marca_nome,
    date_trunc('week', p.published_at at time zone 'America/Sao_Paulo')::date as semana,
    count(*)::int                                                       as publicacoes,
    count(distinct (p.published_at at time zone 'America/Sao_Paulo')::date)::int as dias_com_publicacao,
    round(coalesce(sum(p.engajamento), 0))::int                         as engajamento,
    sum(p.views_d7)::int                                                as views,
    count(p.views_d7)::int                                              as views_medidas,
    max(p.d7_em)                                                        as ultima_foto_d7
   from public.v_mkt_performance p
  where p.published_at >= (now() - '70 days'::interval)
  group by 1, 2, 3, 4;

comment on view public.v_comparativo_motores_semana is
  '193: ESFORÇO por motor × marca × semana (BRT), 70 dias. Hoje traz só o motor `mkt`, porque Pulso, '
  'Limelight, blogs e Polá vivem em projetos Supabase SEPARADOS — a tela os lê pelo navegador com a anon key '
  'de cada um (espelhoMotores.ts) e junta ali. `views` sai de views_d7, que o MKT começou a preencher em '
  '09/10: use `views_medidas` para saber se é "ainda não" (0) ou um número de verdade. NÃO tem coluna de '
  'venda de propósito — venda é da marca, não do motor, e somar motores multiplicaria a mesma venda.';

-- RESULTADO: por marca × semana. Separado do esforço justamente para não poder ser somado por motor.
create or replace view public.v_comparativo_resultado_semana
  with (security_invoker = true) as
 select m.marca,
    date_trunc('week', e.occurred_at at time zone 'America/Sao_Paulo')::date as semana,
    count(*) filter (where e.funnel_stage = 'awareness')::int    as visitas,
    count(*) filter (where e.funnel_stage = 'consideration')::int as cliques,
    count(*) filter (where e.event_code in ('loja_compra', 'purchase_approved'))::int as vendas
   from ops.marca_produto_analytics m
   join analytics.eventos_de_funil e on e.produto_log = m.produto
  where e.occurred_at >= (now() - '70 days'::interval)
  group by 1, 2;

comment on view public.v_comparativo_resultado_semana is
  '193: RESULTADO por marca × semana (BRT), 70 dias. Lê analytics.eventos_de_funil, logo já sem robô (175), '
  'teste (178), preview (fn_origem_real) e rajada de clique (192). Marca sem produto declarado em '
  'ops.marca_produto_analytics não aparece aqui — é o caso da lancaster, que publica e não tem site medido.';

do $$
declare v_pub int; v_eng int; v_dig int; v_osi int; v_med int;
begin
  -- a) invoker na definição e grant de leitura
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where n.nspname='public'
                and c.relname in ('v_comparativo_motores_semana','v_comparativo_resultado_semana')
                and (c.reloptions is null or not (c.reloptions::text ilike '%security_invoker%'))) then
    raise exception 'PROVA_193_FALHOU: view nasceu dona';
  end if;

  -- b) a última semana completa (28/09) tem de dar o que eu medi ANTES de escrever
  select sum(publicacoes), sum(engajamento) into v_pub, v_eng
    from public.v_comparativo_motores_semana where semana = date '2026-09-28';
  if v_pub <> 11 then raise exception 'PROVA_193_FALHOU: 28/09 deu % publicacoes e eu medi 11', v_pub; end if;
  if v_eng <> 1 then raise exception 'PROVA_193_FALHOU: 28/09 deu engajamento % e eu medi 1', v_eng; end if;

  select visitas into v_dig from public.v_comparativo_resultado_semana
   where semana = date '2026-09-28' and marca = 'digiai';
  select visitas into v_osi from public.v_comparativo_resultado_semana
   where semana = date '2026-09-28' and marca = 'osi';
  if coalesce(v_dig,0) <> 42 or coalesce(v_osi,0) <> 18 then
    raise exception 'PROVA_193_FALHOU: resultado de 28/09 deu digiai % / osi % e eu medi 42 / 18',
      coalesce(v_dig,0), coalesce(v_osi,0);
  end if;

  -- c) CONTROLE POSITIVO (R-043 §4-A): `views_medidas` tem de ser 0 hoje. Se vier > 0, a minha premissa
  --    ("a foto de 7 dias ainda não encheu") caiu, e a tela pode mostrar views em vez de "ainda não".
  select coalesce(sum(views_medidas), 0) into v_med from public.v_comparativo_motores_semana;
  if v_med <> 0 then
    raise exception 'PROVA_193_FALHOU: views_medidas = % — a foto d7 encheu, rever o texto da tela', v_med;
  end if;

  -- d) a lancaster aparece no ESFORÇO e NÃO no resultado — declarado, não esquecido
  if not exists (select 1 from public.v_comparativo_motores_semana where marca = 'lancaster') then
    raise exception 'PROVA_193_FALHOU: a lancaster sumiu do esforco';
  end if;
  if exists (select 1 from public.v_comparativo_resultado_semana where marca = 'lancaster') then
    raise exception 'PROVA_193_FALHOU: a lancaster apareceu no resultado sem produto declarado';
  end if;

  -- e) a view de esforço NÃO pode ter coluna de venda: é a trava estrutural contra somar venda por motor
  if exists (select 1 from information_schema.columns
              where table_schema='public' and table_name='v_comparativo_motores_semana'
                and column_name in ('vendas','venda','receita')) then
    raise exception 'PROVA_193_FALHOU: coluna de venda na view de esforco — somar motores multiplicaria a venda';
  end if;

  -- f) e `authenticated` consulta as duas sem erro de permissao
  set local role authenticated;
  perform count(*) from public.v_comparativo_motores_semana;
  perform count(*) from public.v_comparativo_resultado_semana;
  reset role;
end $$;

commit;
