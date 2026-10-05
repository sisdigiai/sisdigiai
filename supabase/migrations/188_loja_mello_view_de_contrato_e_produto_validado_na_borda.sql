-- 188 — a loja Mello ganha view de contrato (visita → venda, por utm_content), e o produto passa a ser validado
--
-- ✔ APLICADA em 05/10/2026 às 18:11:45 BRT, reensaiada antes. Edge `events-ingest` redeployada na mesma
--   leva. **Provado na borda de verdade:** `{"inserted":1,"errors":["bad_product:melloloja"]}` — produto
--   errado recusado, produto certo aceito, o aceito entrou com `teste=true` e **não** apareceu na view de
--   contrato. Nenhum produto fantasma no log.
--
-- (Escrita como NÃO APLICADA.)
--
-- PEDIDO: Orquestrador Geral, 05/10, três itens. Respondo os três com o que medi, inclusive onde a resposta
--   é "não estava como se supunha".
--
-- (1) "confirmar que mello-loja está na lista de produtos aceitos"
--     Os **códigos** estão: os 7 da loja (`loja_visit`, `loja_produto_visto`, `loja_carrinho`,
--     `loja_checkout`, `loja_lead`, `loja_newsletter`, `loja_compra`) estão na allowlist da edge E no
--     `analytics.events_catalog`. Mas **lista de produtos aceitos não existia**: a borda fazia
--     `p_product: e?.product ?? 'osi'` e gravava qualquer string. Dois efeitos calados:
--       · produto escrito errado ("melloloja", "mello_loja") criaria produto fantasma, com funil próprio;
--       · evento **sem** produto cai como **`osi`** — a loja mandar sem o campo infla o funil da OSI.
--     Esta migration cria a lista no banco (`analytics.produtos_aceitos`) e a edge passa a recusar produto
--     fora dela. Mantenho o padrão `osi` para evento SEM produto, porque mudá-lo quebraria a landing da OSI,
--     que não envia o campo — mas agora está escrito em vez de implícito.
--
-- (2) "separado dos outros nas views (sem misturar com clearix/osi)"
--     Está: `v_analytics_funnel_daily` e `_summary` agrupam **por produto**. `mello-loja` nunca se mistura.
--
-- (3) "visitas e vendas por utm_content numa view de contrato para o painel"
--     **Não existia.** Nenhuma view do banco expõe `utm_content` — conferi todas. Esta cria
--     `public.v_ops_loja_mello`. Hoje ela vem quase vazia: a loja tem 4 eventos e **zero `utm_content`**.
--     Isso é o certo — vazio é o sinal de que a campanha ainda não marcou nada, não defeito da view.
--
-- ACHADO DE CARONA, que não era do pedido e vale mais que ele: cruzei código×produto do log contra o
--   catálogo e **160 eventos de `clearix-site` usam códigos da OSI** — `landing_visit` (140 humanos) e
--   `click_checkout` (14). Não é mistura nem contagem dupla: é **troca de código em 15/09**. `landing_visit`
--   rodou de 12/08 a 15/09; `clearix_site_visit` assumiu daí em diante; só 4 sessões têm os dois (o dia da
--   virada). Consequência: **painel que conte só `clearix_site_visit` perde o primeiro mês da landing** —
--   204 em vez de ~340. Vai ao eco e ao Geral; não conserto aqui porque a landing é do eco.
--   (Também `reader_gatilho_*` chega com produto `osi`, e o catálogo diz `osi-leitor`: 8 eventos, o funil do
--   leitor está dentro do da OSI. Por isso NÃO valido o par código×produto na borda — só o produto. Validar
--   o par recusaria tráfego vivo do leitor.)

begin;

do $$
begin
  if exists (select 1 from information_schema.tables
              where table_schema='analytics' and table_name='produtos_aceitos') then
    raise exception 'analytics.produtos_aceitos ja existe — a 188 ja foi aplicada?';
  end if;
  if exists (select 1 from pg_class c join pg_namespace n on n.oid=c.relnamespace
              where n.nspname='public' and c.relname='v_ops_loja_mello') then
    raise exception 'v_ops_loja_mello ja existe — a 188 ja foi aplicada?';
  end if;
end $$;

-- A lista de produtos vive no BANCO e não só no código da borda. A borda continua precisando da sua cópia
-- (não dá para consultar o banco a cada evento sem custo), mas a lista de verdade é esta — e a prova desta
-- migration confere que ela cobre todo produto que já apareceu no log, para a lista não nascer mentindo.
create table analytics.produtos_aceitos (
  slug        text primary key,
  descricao   text not null,
  ativo       boolean not null default true,
  criado_em   timestamptz not null default now()
);

comment on table analytics.produtos_aceitos is
  '188: lista de verdade dos produtos que podem aparecer em analytics.events_log. A edge events-ingest tem '
  'uma cópia para recusar na borda sem ir ao banco — produto novo entra nos DOIS lugares, como já vale para '
  'os códigos. Produto fora da lista criava funil fantasma em silêncio.';

insert into analytics.produtos_aceitos (slug, descricao) values
  ('osi',          'Landing e funil da OSI (Ótica Sem Improviso). É também o padrão de quem não manda produto.'),
  ('osi-leitor',   'Leitor do manual da OSI (gatilhos). ⚠ hoje os eventos chegam com produto `osi`.'),
  ('clearix-site', 'Landing do Clearix. ⚠ histórico anterior a 15/09 está sob os códigos landing_visit e click_checkout.'),
  ('clearix-calc', 'Calculadora do Clearix.'),
  ('digiai-site',  'Site institucional da DIGIAI (160, 28/09).'),
  ('mello-loja',   'Loja online da Mello, em Cloudflare Worker desde 02/10 (173, 05/10).');

grant select on analytics.produtos_aceitos to authenticated;
alter table analytics.produtos_aceitos enable row level security;
create policy produtos_aceitos_leitura_logado on analytics.produtos_aceitos
  for select to authenticated using (true);

-- View de contrato da loja: funil por dia e por utm_content, sem PII. `security_invoker` na definição
-- (R-043 §4-B); a base `analytics.events_humanos` é invoker e `authenticated` tem grant nela.
--
-- Lê `events_humanos`, não `events_log`: robô (175) e compra de teste (178) ficam fora. A primeira visita
-- que a loja registrou era um navegador automático, então isto não é hipótese.
create or replace view public.v_ops_loja_mello
  with (security_invoker = true) as
 select (occurred_at at time zone 'America/Sao_Paulo')::date       as dia,
        coalesce(utm_source, '(sem campanha)')                      as utm_source,
        coalesce(utm_content, '(sem utm_content)')                   as utm_content,
        count(*) filter (where event_code = 'loja_visit')            as visitas,
        count(*) filter (where event_code = 'loja_produto_visto')    as produtos_vistos,
        count(*) filter (where event_code = 'loja_carrinho')         as carrinhos,
        count(*) filter (where event_code = 'loja_checkout')         as checkouts,
        count(*) filter (where event_code = 'loja_compra')           as compras,
        count(*) filter (where event_code = 'loja_lead')             as leads,
        count(*) filter (where event_code = 'loja_newsletter')       as newsletters,
        count(distinct session_id)                                   as sessoes,
        -- receita só do que a própria loja declarou em centavos; sem valor, soma zero e não inventa número
        round(coalesce(sum((metadata->>'valor_centavos')::numeric)
                       filter (where event_code = 'loja_compra'), 0) / 100.0, 2) as receita_brl,
        max(occurred_at)                                             as ultimo_evento
   from analytics.events_humanos
  where product = 'mello-loja'
  group by 1, 2, 3;

comment on view public.v_ops_loja_mello is
  '188: funil da loja Mello por dia e por utm_content, para o painel do digiai (resultado mora no digiai, '
  'não no MKT — regra do dono de 15/09). Lê analytics.events_humanos, logo SEM robô (175) e SEM compra de '
  'teste (178). receita_brl vem de metadata.valor_centavos declarado pela loja; sem valor, soma zero e não '
  'estima nada. Vazia significa que a loja ainda não mediu, não que a view falhou.';

grant select on public.v_ops_loja_mello to authenticated;

do $$
declare v_falta text; v_n int; v_opts text;
begin
  -- a) a lista não pode nascer mentindo: todo produto que JÁ apareceu no log tem de estar nela
  select string_agg(distinct l.product, ', ') into v_falta
    from analytics.events_log l
   where l.product is not null
     and not exists (select 1 from analytics.produtos_aceitos p where p.slug = l.product);
  if v_falta is not null then
    raise exception 'PROVA_188_FALHOU: produto no log e fora da lista: %', v_falta;
  end if;

  -- b) e todo produto do catálogo de códigos também, senão a borda recusaria evento que a casa espera
  select string_agg(distinct c.product, ', ') into v_falta
    from analytics.events_catalog c
   where c.product is not null and c.is_active
     and not exists (select 1 from analytics.produtos_aceitos p where p.slug = c.product);
  if v_falta is not null then
    raise exception 'PROVA_188_FALHOU: produto no catalogo de codigos e fora da lista: %', v_falta;
  end if;

  -- c) a view responde e o invoker ficou na definição
  select array_to_string(reloptions, ',') into v_opts
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='v_ops_loja_mello';
  if v_opts is null or v_opts not ilike '%security_invoker%' then
    raise exception 'PROVA_188_FALHOU: a view nasceu dona (%)', coalesce(v_opts,'null');
  end if;

  -- d) a loja tem 4 eventos e 1 deles é teste (179): a view tem de contar 3, não 4. É o teste de que ela
  --    lê events_humanos e não o log cru — se contar 4, eu apontei para a fonte errada.
  select coalesce(sum(visitas + produtos_vistos + carrinhos + checkouts + compras + leads + newsletters), 0)
    into v_n from public.v_ops_loja_mello;
  if v_n <> (select count(*) from analytics.events_humanos where product='mello-loja') then
    raise exception 'PROVA_188_FALHOU: a view conta % e events_humanos tem % — fonte errada ou codigo de fora',
      v_n, (select count(*) from analytics.events_humanos where product='mello-loja');
  end if;
  if v_n >= (select count(*) from analytics.events_log where product='mello-loja') then
    raise exception 'PROVA_188_FALHOU: a view conta tanto quanto o log cru — nao esta filtrando teste/robo';
  end if;

  -- e) CONTROLE POSITIVO (R-043 §4-A): invoker que ninguém lê é igual a view vazia. authenticated tem de
  --    conseguir consultar sem erro de permissão — zero linha seria aceitável, erro não.
  set local role authenticated;
  perform count(*) from public.v_ops_loja_mello;
  perform count(*) from analytics.produtos_aceitos;
  reset role;

  -- f) e `anon` não entra em nenhuma das duas
  if pg_catalog.has_table_privilege('anon','public.v_ops_loja_mello','select')
  or pg_catalog.has_table_privilege('anon','analytics.produtos_aceitos','select') then
    raise exception 'PROVA_188_FALHOU: abri para anon';
  end if;

  raise notice '188: v_ops_loja_mello com % eventos de gente; % produtos na lista',
    v_n, (select count(*) from analytics.produtos_aceitos);
end $$;

commit;
