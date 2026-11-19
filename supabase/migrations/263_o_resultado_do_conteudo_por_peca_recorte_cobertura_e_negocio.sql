-- ============================================================
-- 263 — o resultado do conteúdo: por peça, por recorte, a cobertura da medição e o resultado de negócio
-- Banco: o da casa (hswyopqvnolqpmprqvzh).
-- Pedido do dono, 18/11/2026, canal do app: "precisamos melhorar o espelho do marketing… nossos resultados
--   estão complexos e misturados, temos postagens, porém nada de dados sérios para tomada de decisão, mostra
--   o que saiu e bem pouco o que funciona, onde melhorar isso?" — e, à lista de seis pontos que eu medi e
--   apresentei: "de 1 a 6 todos". Esta migration é dos pontos 1 a 4 (os 5 e 6 são coleta, do agente do MKT).
--
-- O QUE EU MEDI ANTES DE ESCREVER (18/11, e cada número mudou o desenho):
--   · 770 peças têm resultado próprio desde 16/07, e a view que a tela lê (`v_mkt_performance`) expõe **só
--     `engajamento`** — a coluna com menos dado. `views` (562 com valor), `alcance` (469) e os salvamentos
--     estavam coletados e invisíveis.
--   · A tela calculava **média**. O Facebook da Lancaster tem peça de 11.333 views com mediana 14: média ali
--     descreve a peça viral, não o trabalho. Aqui é mediana, p90 e o tamanho da base, sempre juntos.
--   · **Nulo não é zero, e eu mesmo tinha misturado os dois na primeira leitura.** Medido por rede:
--       no Facebook, `alcance` é nulo nas 239 peças (a Meta não fornece — confirmado pelo MKT, testado em
--       17/08 na v23), e `views` tem 39 nulos contra 118 **zeros medidos**;
--       no Instagram, 56 nulos de alcance e 35 de views.
--     Então cada métrica tem três estados, e a tela precisa dos três: **não coletado**, **medido zero**,
--     **medido com valor**. Tratar nulo como zero é a mentira que estava na tela.
--   · `engajamento` **nunca é nulo** nas 770 peças, e é zero em 480. Isso é suspeito por construção: coletor
--     que sempre escreve número nunca admite falha. Medido: em **287** peças o zero é confiável (a peça foi
--     lida, views ou alcance > 0, e a interação foi mesmo zero) e em **71** não há prova nenhuma. A coluna
--     `engajamento_confiavel` carrega essa diferença em vez de a esconder.
--   · Há **duas** fontes de resultado por peça, e elas cobrem redes **diferentes**: `content_performance` só
--     tem instagram e facebook; `leitura_dia` (Pulso e Cortes) tem facebook, instagram, tiktok e youtube, e é
--     a única com retenção. Uma view só de uma delas deixaria metade das redes fora.
--   · Em `leitura_dia` o `views` é **cumulativo**: 80 de 80 pares consecutivos nunca diminuíram (séries
--     0 → 85 → 85, 0 → 0 → 165). Logo vale o **último** dia, **nunca a soma** — somar dobraria o número.
--   · A causa quase não existe: `gatilho` vazio em 758 de 770 e `formato` em 577. Mas 425 das 770 alcançam
--     `mkt.assets`, que tem `tipo`, `tema` e `formato` **preenchidos**: é por ali que o recorte se faz hoje,
--     sem esperar coleta nova. O MKT vai copiar formato/tema na coleta até 20/11.
--
-- DECISÃO DE DESENHO que muda o número e por isso fica escrita: **"o que funciona" só olha peça com 7 dias ou
--   mais de vida**, nos últimos 90 dias. Peça de ontem não teve tempo de performar; comparar com a de julho
--   compara idade, não qualidade. Peça fresca aparece em "o que saiu", não em "o que funciona".
--   E **mediana só se a métrica não é nula** — nunca `coalesce(metrica, 0)`, que foi o que me deu mediana 12
--   na primeira medição e me fez quase concluir que nada funciona.
--
-- Ensaio: FEITO (rollback) + 6 sabotagens (ver a lista no fim).
-- Regras: [x] R-043 as quatro views `security_invoker`, com o portão `mkt.pode_ver_marca` dentro
--         [x] R-044 nada de tabela nova; só view em public sobre as tabelas do domínio `mkt`
--         [x] sem PII (nenhuma coluna de pessoa; GBP é por ficha, não por cliente)
--         [x] grants na mesma migration, anon sem nada
-- ============================================================
begin;

do $$ begin
  if to_regclass('mkt.content_performance') is null or to_regclass('mkt.leitura_dia') is null
     or to_regclass('mkt.gbp_metricas_dia') is null or to_regprocedure('mkt.pode_ver_marca(text)') is null then
    raise exception 'falta uma das fontes ou o portão de marca';
  end if;
end $$;

-- ------------------------------------------------------------------ 1) a peça, com os três estados da medição
create or replace view public.v_mkt_resultado_peca with (security_invoker = true) as
with coleta as (
  select 'coleta_mkt'::text as fonte, cp.publication_id::text as peca, p.url as link,
         b.code as marca, b.name as marca_nome, b.accent_hex, b.logo_url, p.platform as rede,
         p.published_at as publicado_em,
         a.tipo, a.tema, coalesce(nullif(cp.formato, ''), a.formato) as formato,
         cp.views, cp.alcance, cp.engajamento, cp.salvamentos, cp.compartilhamentos,
         null::numeric as retencao_pct,
         cp.views_d7, cp.alcance_d7, cp.engajamento_d7, cp.d7_em as lido_d7_em, cp.coletado_em
    from mkt.content_performance cp
    join mkt.brands b on b.id = cp.brand_id
    join mkt.publications p on p.id = cp.publication_id
    left join mkt.publish_jobs j on j.id = p.job_id
    left join mkt.assets a on a.id = j.asset_id
   where p.published_at <= now()
),
-- o último dia de cada peça: a leitura é cumulativa (medido: 80 de 80 pares nunca diminuíram)
ultimo as (
  select distinct on (l.peca_ref) l.*
    from mkt.leitura_dia l order by l.peca_ref, l.data desc, l.lido_em desc nulls last
),
leitura as (
  select 'leitura_diaria'::text as fonte, u.peca_ref as peca, u.link,
         b.code as marca, b.name as marca_nome, b.accent_hex, b.logo_url, u.rede,
         (u.data + time '12:00') at time zone 'America/Sao_Paulo' as publicado_em,
         u.tipo, null::text as tema, null::text as formato,
         u.views, null::integer as alcance,
         -- interação somada das três, e **nula** quando nenhuma das três veio: zero inventado é pior que vazio
         case when u.curtidas is null and u.comentarios is null and u.compartilhamentos is null then null
              else coalesce(u.curtidas,0) + coalesce(u.comentarios,0) + coalesce(u.compartilhamentos,0) end::numeric as engajamento,
         null::integer as salvamentos, u.compartilhamentos,
         u.retencao_media_pct as retencao_pct,
         null::integer as views_d7, null::integer as alcance_d7, null::numeric as engajamento_d7,
         null::timestamptz as lido_d7_em, u.lido_em as coletado_em
    from ultimo u
    join mkt.brands b on b.id = u.brand_id
),
tudo as (select * from coleta union all select * from leitura)
select t.fonte, t.peca, t.link, t.marca, t.marca_nome, t.accent_hex, t.logo_url, t.rede,
       t.publicado_em,
       (t.publicado_em at time zone 'America/Sao_Paulo')::date as dia,
       (current_date - (t.publicado_em at time zone 'America/Sao_Paulo')::date) as idade_dias,
       extract(hour from t.publicado_em at time zone 'America/Sao_Paulo')::int as hora_brt,
       to_char(t.publicado_em at time zone 'America/Sao_Paulo', 'ID')::int as dia_da_semana,
       t.tipo, t.tema, t.formato,
       (coalesce(t.tipo,'') <> '' or coalesce(t.tema,'') <> '' or coalesce(t.formato,'') <> '') as tem_causa,
       t.views, t.alcance, t.engajamento, t.salvamentos, t.compartilhamentos, t.retencao_pct,
       t.views_d7, t.alcance_d7, t.engajamento_d7, t.lido_d7_em, t.coletado_em,
       -- os três estados: lida é "alguma métrica veio"; sem_leitura NÃO é desempenho zero
       (t.views is not null or t.alcance is not null or t.retencao_pct is not null) as lida,
       -- o zero do engajamento só vale se a peça foi mesmo lida por outra métrica
       (t.engajamento is not null and (coalesce(t.views,0) > 0 or coalesce(t.alcance,0) > 0)) as engajamento_confiavel,
       -- a Meta não devolve alcance de post no Facebook (MKT, testado 17/08, API v23): nulo ali é limite, não falha nossa
       (t.rede <> 'facebook') as alcance_e_fornecido
  from tudo t
 where mkt.pode_ver_marca(t.marca);

comment on view public.v_mkt_resultado_peca is
  'Uma linha por peça publicada, das duas fontes de resultado (coleta do MKT: instagram e facebook; leitura diária do Pulso e do Cortes: também tiktok e youtube). NULO É PRESERVADO: não coletado, medido zero e medido com valor são três estados diferentes. A leitura diária é cumulativa, então vale o último dia, nunca a soma.';

revoke all on public.v_mkt_resultado_peca from public, anon;
grant select on public.v_mkt_resultado_peca to authenticated, service_role;

-- ------------------------------------------------------------------ 2) "o que funciona", por recorte
create or replace view public.v_mkt_resultado_recorte with (security_invoker = true) as
with base as (
  -- só peça que teve tempo de performar, e só os últimos 90 dias: o resto é idade, não qualidade
  select * from public.v_mkt_resultado_peca where idade_dias >= 7 and idade_dias <= 90
),
cortes as (
  select 'marca'   as recorte, marca_nome as valor, * from base
  union all select 'rede',    rede, * from base
  union all select 'tipo',    coalesce(nullif(tipo, ''), '(sem tipo registrado)'), * from base
  union all select 'tema',    coalesce(nullif(tema, ''), '(sem tema registrado)'), * from base
  union all select 'formato', coalesce(nullif(formato, ''), '(sem formato registrado)'), * from base
  union all select 'hora',    lpad(((hora_brt / 3) * 3)::text, 2, '0') || 'h–' || lpad(((hora_brt / 3) * 3 + 3)::text, 2, '0') || 'h', * from base
  union all select 'dia da semana',
                   (array['segunda','terça','quarta','quinta','sexta','sábado','domingo'])[dia_da_semana], * from base
)
select recorte, valor,
       count(*) as pecas,
       count(distinct rede) as redes,
       count(*) filter (where lida) as lidas,
       count(views) as com_views,
       round(percentile_cont(0.5) within group (order by views)::numeric, 0) as views_mediana,
       round(percentile_cont(0.9) within group (order by views)::numeric, 0) as views_p90,
       max(views) as views_melhor,
       count(alcance) as com_alcance,
       round(percentile_cont(0.5) within group (order by alcance)::numeric, 0) as alcance_mediana,
       count(*) filter (where engajamento_confiavel) as engaj_confiaveis,
       round(percentile_cont(0.5) within group (order by engajamento) filter (where engajamento_confiavel)::numeric, 1) as engaj_mediana,
       max(engajamento) filter (where engajamento_confiavel) as engaj_melhor,
       -- quatro peças lidas é o mínimo para uma mediana dizer algo (mesma régua da Lousa, migration 236)
       (count(views) >= 4) as serve_de_base,
       -- grupo que mistura redes mistura réguas: view de tiktok não é view de instagram
       (count(distinct rede) > 1) as mistura_redes
  from cortes
 group by recorte, valor;

comment on view public.v_mkt_resultado_recorte is
  'O que funciona, por recorte (marca, rede, tipo, tema, formato, faixa de hora, dia da semana). Só peça com 7 a 90 dias de vida: peça de ontem não performou e peça de julho não se compara. Mediana e p90 calculados SÓ sobre a métrica não nula — nunca coalesce(metrica,0). `serve_de_base` falso = base pequena demais para concluir; `mistura_redes` verdadeiro = a mediana compara réguas diferentes.';

revoke all on public.v_mkt_resultado_recorte from public, anon;
grant select on public.v_mkt_resultado_recorte to authenticated, service_role;

-- ------------------------------------------------------------------ 3) a cobertura da medição (e o progresso dos itens 5 e 6)
create or replace view public.v_mkt_cobertura_leitura with (security_invoker = true) as
select marca, marca_nome, accent_hex, logo_url, rede, fonte,
       count(*) as pecas,
       count(*) filter (where lida) as lidas,
       count(*) filter (where not lida) as sem_leitura,
       count(views) as com_views,
       count(*) filter (where views = 0) as views_zero_medido,
       count(alcance) as com_alcance,
       bool_and(alcance_e_fornecido) as alcance_e_fornecido,
       count(*) filter (where tem_causa) as com_causa,
       count(*) filter (where not tem_causa) as sem_causa,
       count(lido_d7_em) as com_segunda_leitura,
       count(*) filter (where engajamento_confiavel) as engaj_confiavel,
       count(*) filter (where engajamento is not null and not engajamento_confiavel) as engaj_sem_prova,
       max(coletado_em) as coletado_em,
       max(publicado_em) as ultima_publicacao
  from public.v_mkt_resultado_peca
 group by marca, marca_nome, accent_hex, logo_url, rede, fonte;

comment on view public.v_mkt_cobertura_leitura is
  'Quanto da medição existe, por marca e rede: quantas peças foram lidas, quantas têm alcance, quantas têm causa (tipo/tema/formato) e quantas têm a segunda leitura em 7 dias. Serve ao dono para saber de que tamanho é o buraco, e ao app e ao MKT para medirem sem conversar o avanço da coleta.';

revoke all on public.v_mkt_cobertura_leitura from public, anon;
grant select on public.v_mkt_cobertura_leitura to authenticated, service_role;

-- ------------------------------------------------------------------ 4) o resultado de NEGÓCIO, por semana
create or replace view public.v_mkt_negocio_semana with (security_invoker = true) as
with gbp as (
  select b.code as marca, b.name as marca_nome, b.accent_hex,
         date_trunc('week', g.dia)::date as semana,
         count(distinct g.location_id) as fichas, count(distinct g.dia) as dias_medidos,
         sum(g.aparicoes) as aparicoes, sum(g.ligacoes) as ligacoes,
         sum(g.cliques_site) as cliques_site, sum(g.rotas) as rotas
    from mkt.gbp_metricas_dia g join mkt.brands b on b.id = g.brand_id
   group by 1, 2, 3, 4
),
esforco as (
  select b.code as marca, date_trunc('week', (p.published_at at time zone 'America/Sao_Paulo')::date)::date as semana,
         count(*) as publicacoes
    from mkt.publications p join mkt.brands b on b.id = p.brand_id
   where p.published_at is not null and p.published_at <= now()
   group by 1, 2
)
select g.marca, g.marca_nome, g.accent_hex, g.semana, g.fichas, g.dias_medidos,
       g.aparicoes, g.ligacoes, g.cliques_site, g.rotas,
       coalesce(e.publicacoes, 0) as publicacoes,
       -- semana incompleta não se compara com semana cheia
       (g.dias_medidos >= 7 * g.fichas) as semana_completa
  from gbp g left join esforco e on e.marca = g.marca and e.semana = g.semana
 where mkt.pode_ver_marca(g.marca);

comment on view public.v_mkt_negocio_semana is
  'O resultado de negócio do painel do Google por semana e por marca — aparições, ligações, cliques e pedidos de rota — com o esforço de publicação da mesma semana ao lado. ATENÇÃO: o Google mede por FICHA e por DIA, não por post. Isto NÃO atribui resultado a peça nenhuma; serve para ver se o movimento da loja acompanha o esforço, e a tela tem de dizer isso.';

revoke all on public.v_mkt_negocio_semana from public, anon;
grant select on public.v_mkt_negocio_semana to authenticated, service_role;

-- ============================================================
-- Provas
-- ============================================================

-- 5-a) as quatro views: sem grant para visitante, e todas security_invoker
--
-- O QUE ESTA PROVA NÃO ALCANÇA, E EU TENTEI: o portão `mkt.pode_ver_marca` passa por
-- `mkt.contexto_privilegiado()`, que devolve verdadeiro quando **`session_user`** é `postgres` ou
-- `supabase_admin`. Esta migration roda pela API de gestão, onde `session_user` é `postgres` — então o portão
-- abre para ela por desenho, e `set local role authenticated` **não muda `session_user`**, só o `current_user`.
-- A primeira versão desta prova afirmava "logado sem marca lê zero peça" e **falhou com 792**: não era a view
-- aberta, era a prova impossível. Tentei `set local session authorization authenticated` para trocar o
-- `session_user` e levei "permission denied" (o papel `postgres` do Supabase não é superusuário).
-- Então: o filtro de marca **não é provável por esta porta**, e eu não digo que provei. Fica provado aqui o
-- que o catálogo alcança (grant e invoker), e o visitante foi provado **por chamada real** ao PostgREST com a
-- chave anônima depois de aplicar, com o resultado escrito no changelog. Em produção quem chama é o
-- `authenticator`, não o `postgres`, e aí o portão vale — é a mesma razão por que a `v_mkt_performance`, que
-- usa o mesmo portão desde sempre, filtra na tela e não filtra aqui.
do $$ declare v text; begin
  foreach v in array array['v_mkt_resultado_peca', 'v_mkt_resultado_recorte', 'v_mkt_cobertura_leitura', 'v_mkt_negocio_semana'] loop
    if exists (select 1 from information_schema.role_table_grants
                where table_schema = 'public' and table_name = v and grantee in ('anon', 'public')) then
      raise exception 'a view % está aberta para visitante', v;
    end if;
    if not exists (select 1 from information_schema.role_table_grants
                where table_schema = 'public' and table_name = v and grantee = 'authenticated' and privilege_type = 'SELECT') then
      raise exception 'a equipe não consegue ler a view %', v;
    end if;
    if (select count(*) from pg_class c join pg_namespace n2 on n2.oid = c.relnamespace
         where n2.nspname = 'public' and c.relname = v
           and 'security_invoker=true' = any (c.reloptions)) <> 1 then
      raise exception 'a view % não é security_invoker', v;
    end if;
    -- o portão tem de estar ESCRITO na view, mesmo não sendo provável aqui
    if position('pode_ver_marca' in pg_get_viewdef(('public.' || v)::regclass, true)) = 0
       and v <> 'v_mkt_resultado_recorte' and v <> 'v_mkt_cobertura_leitura' then
      raise exception 'a view % não tem o portão de marca escrito', v;
    end if;
  end loop;
  -- as duas derivadas herdam o portão por lerem a v_mkt_resultado_peca, e isso tem de ser verdade:
  if position('v_mkt_resultado_peca' in pg_get_viewdef('public.v_mkt_resultado_recorte'::regclass, true)) = 0
     or position('v_mkt_resultado_peca' in pg_get_viewdef('public.v_mkt_cobertura_leitura'::regclass, true)) = 0 then
    raise exception 'uma view derivada deixou de ler a v_mkt_resultado_peca e perdeu o portão';
  end if;
end $$;

-- 5-b) O CORAÇÃO: nulo não vira zero, e a mediana não é calculada sobre nulo
do $$ declare m_certa numeric; m_errada numeric; n_nulos int; begin
  select count(*) into n_nulos from public.v_mkt_resultado_peca where views is null;
  if n_nulos = 0 then raise exception 'a view transformou todos os nulos de views em algum número'; end if;

  select percentile_cont(0.5) within group (order by views) into m_certa
    from public.v_mkt_resultado_peca where idade_dias between 7 and 90;
  select percentile_cont(0.5) within group (order by coalesce(views, 0)) into m_errada
    from public.v_mkt_resultado_peca where idade_dias between 7 and 90;
  if m_certa is null then raise exception 'não há views suficientes para a prova'; end if;
  if m_certa <= m_errada then
    raise exception 'a mediana sobre nulo-como-zero (%) não ficou abaixo da mediana honesta (%): a prova não está medindo o que diz', m_errada, m_certa;
  end if;

  -- e o recorte tem de usar a honesta
  if (select views_mediana from public.v_mkt_resultado_recorte where recorte = 'rede' and valor = 'instagram') is distinct from round(
       (select percentile_cont(0.5) within group (order by views) from public.v_mkt_resultado_peca
         where idade_dias between 7 and 90 and rede = 'instagram')::numeric, 0) then
    raise exception 'a mediana do recorte não é a mediana honesta da peça';
  end if;
end $$;

-- 5-c) a leitura diária entra pelo ÚLTIMO dia, nunca pela soma
do $$ declare v_peca text; v_na_view numeric; v_ultimo numeric; v_soma numeric; begin
  -- a peça tem de ter DUAS leituras maiores que zero: se só a última é > 0, soma e último dão o mesmo
  -- número e a prova não distingue uma da outra (a primeira versão escolheu uma assim e a guarda pegou).
  select peca_ref into v_peca from mkt.leitura_dia
   group by peca_ref having count(*) filter (where views > 0) >= 2 limit 1;
  if v_peca is null then
    raise notice 'sem peça com duas leituras diferentes: prova 5-c não pôde rodar hoje';
  else
    select sum(views), max(views) into v_soma, v_ultimo from mkt.leitura_dia where peca_ref = v_peca;
    set local role service_role;      -- o portão de marca não é o que se prova aqui
    perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
    select views into v_na_view from public.v_mkt_resultado_peca where peca = v_peca;
    reset role;
    if v_na_view is distinct from v_ultimo then
      raise exception 'a peça % entrou com % em vez do último valor %', v_peca, v_na_view, v_ultimo;
    end if;
    if v_soma = v_ultimo then raise exception 'a prova é cega: soma e último são iguais nesta peça'; end if;
  end if;
end $$;

-- 5-d) peça fresca não entra em "o que funciona", e base pequena se declara
do $$ declare n int; begin
  if exists (select 1 from public.v_mkt_resultado_recorte r
              where r.serve_de_base and r.com_views < 4) then
    raise exception 'um grupo com menos de 4 leituras disse servir de base';
  end if;
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  select count(*) into n from public.v_mkt_resultado_peca where idade_dias < 7;
  if n = 0 then raise notice 'sem peça fresca hoje: a parte do corte de 7 dias não pôde ser medida'; end if;
  if exists (select 1 from public.v_mkt_resultado_recorte where pecas > (select count(*) from public.v_mkt_resultado_peca where idade_dias between 7 and 90)) then
    raise exception 'algum recorte contou peça fora da janela de 7 a 90 dias';
  end if;
  reset role;
end $$;

-- 5-e) o alcance do Facebook é declarado como não fornecido, e o engajamento zero sem prova não conta como confiável
do $$ begin
  if exists (select 1 from public.v_mkt_resultado_peca where rede = 'facebook' and alcance_e_fornecido) then
    raise exception 'o Facebook apareceu como rede que fornece alcance'; end if;
  if exists (select 1 from public.v_mkt_resultado_peca
              where engajamento_confiavel and coalesce(views, 0) = 0 and coalesce(alcance, 0) = 0) then
    raise exception 'engajamento sem nenhuma leitura ao lado passou por confiável'; end if;
end $$;

-- 5-f) a semana do negócio só se declara completa com todos os dias de todas as fichas
do $$ begin
  set local role service_role;
  perform set_config('request.jwt.claims', '{"role":"service_role"}', true);
  if exists (select 1 from public.v_mkt_negocio_semana where semana_completa and dias_medidos < 7 * fichas) then
    raise exception 'semana incompleta se declarou completa'; end if;
  if not exists (select 1 from public.v_mkt_negocio_semana where rotas > 0) then
    raise exception 'o resultado de negócio não trouxe nenhuma rota, e havia 530 medidas'; end if;
  reset role;
end $$;

commit;

-- Sabotagens conferidas antes de aplicar (todas morderam, e no lugar certo):
--   a) `coalesce(views, 0)` na peça            → 5-b: "transformou todos os nulos"
--   b) mediana do recorte sobre nulo-como-zero → 5-b: "a mediana do recorte não é a honesta"
--   c) soma em vez do último na leitura diária → 5-c: "entrou com X em vez do último valor"
--   d) `serve_de_base` com 1 peça              → 5-d: "disse servir de base"
--   e) `alcance_e_fornecido` sempre verdadeiro → 5-e: "o Facebook apareceu como rede que fornece"
--   f) `engajamento_confiavel` = não nulo      → 5-e: "engajamento sem nenhuma leitura passou por confiável"
--
-- Reversão: drop view public.v_mkt_negocio_semana, public.v_mkt_cobertura_leitura,
--           public.v_mkt_resultado_recorte, public.v_mkt_resultado_peca;
--   (nada é alterado nas tabelas; `v_mkt_performance` continua existindo até a tela sair dela)
