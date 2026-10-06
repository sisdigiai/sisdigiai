-- 190 — a funnel_daily para de contar preview local como visita
--
-- ✔ APLICADA em 06/10/2026 às 02:08:09 BRT, reensaiada antes (e o ensaio recusou a 1.ª versão: eu afirmava
--   que o card de 7 dias não mudava comparando janelas diferentes). Medido depois: `calc_used` 41,
--   `osi landing_visit` 116, `clearix-site landing_visit` **99 preservadas**, leitor sem url **sobreviveu**,
--   e a `summary` idêntica (osi landing_visit 157 / 18) — os cards não se moveram.
--
-- (Escrita como NÃO APLICADA.)
--
-- DE ONDE VEM: eu reportei ao Geral que `v_analytics_funnel_daily` e `v_analytics_funnel_summary`
--   discordavam em 30%, e ele mandou alinhar a `daily` à regra da 129 (regra do dono, 15/09, "aplicar tudo").
--
-- O QUE EU MEDI ANTES, e corrige as duas coisas que dissemos:
--
--   (1) **Os 30% eram artefato meu.** Comparei a `daily`, que tem janela de **90 dias**, contra o `n_total` da
--       `summary`, que é **desde sempre**. `osi landing_visit` 152 contra 157 não é discordância de regra: é
--       janela diferente. A diferença real entre as duas views é só o preview.
--
--   (2) **NÃO aplico a regra de produto da 129 aqui, e isso é de propósito.** A 129 tem duas regras. O defeito
--       que ela consertou foi "o site do Clearix somar na OSI", e isso acontece na `summary` porque ela agrupa
--       pelo produto do CATÁLOGO — onde `landing_visit` só tem uma casa possível, `osi`. A `daily` agrupa pelo
--       produto do LOG: as visitas do Clearix aparecem em `clearix-site` e **não poluem a OSI**. Ou seja, a
--       `daily` nunca teve o defeito nº 1. Aplicar a regra de produto nela **apagaria 99 visitas reais da
--       landing do Clearix**, que hoje ela atribui certo — trocaria um número errado por um desaparecimento.
--       Então alinho só a regra nº 2: preview local não é visita.
--
-- A EXPRESSÃO É A LITERAL DA 129, copiada e não reescrita:
--   `coalesce(url, '') !~* '^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/|$)'`
--   O `coalesce` é o que **preserva linha sem url** — a minha primeira tentativa usava `url !~* ...` direto, e
--   `null !~* x` é null, o que derrubaria as linhas do leitor em silêncio. A própria 129 registra que a
--   prova-124 (sem url) deve continuar contando. Reescrever de cabeça uma regra que já existe é como se
--   inventa divergência.
--
-- ANTES → DEPOIS na janela de 90 dias (medido, não estimado):
--   clearix-calc · calc_used            60 → 41
--   clearix-site · landing_visit       140 → 99
--   osi · landing_visit                152 → 116
--   osi · click_checkout                 2 → 1
--   osi · reader_gatilho_click           2 → 1
--   osi · reader_gatilho_view            6 → 0
--
--   Os três últimos batem **exatamente** com o que a 129 registrou em 15/09 (`calc_used 60 → 41`,
--   `reader_gatilho_view 6 → 0`, `reader_gatilho_click 2 → 1`) — é a prova de que é a mesma regra, e não uma
--   variante minha com o mesmo nome.
--
-- O QUE O DONO VÊ NA TELA: **nenhum card muda.** Medido no código, não suposto: `FluxoOSI.tsx` e
--   `SiteClearixCard.tsx` leem `v_analytics_funnel_summary`, que esta migration **não toca**. A `daily`
--   alimenta gráfico por dia, não os cards. A prova confere que a `summary` continua com os mesmos números.
--
-- SEGUNDA CORREÇÃO, achada ao conferir a janela de 7 dias: **o dia desta view era UTC.** `occurred_at::date`
--   bucketiza em UTC, então a fronteira do dia cai às 21h de Brasília — e a casa já decidiu que o dia do
--   negócio é BRT. Medido: **105 eventos em 30 dias distintos** caem no dia errado; um de 10/07 às 21:21 BRT
--   aparece como 11/07. Passa a `at time zone 'America/Sao_Paulo'`. Isso **não muda total nenhum**, só em que
--   dia cada evento pousa — por isso cabe na mesma migration sem embaralhar a prova do preview.
--   (A janela de 7 dias pelo calendário BRT dá 13 contra 14 em UTC. Os "18" que eu havia dito ao Geral eram
--   de uma janela rolante de 7×24h — outra conta, não outro número.)
--
-- POR QUE EU APLICO SEM NOVA FRASE DO DONO: não é destrutivo (nada apagado, só a leitura muda), não é portão
--   de acesso, não é número público novo — e sobretudo **a decisão já é dele**: a 129 é "preview local não
--   conta", com a palavra dele em 15/09. A `daily` não cumprir a mesma regra é defeito, não uma segunda
--   escolha. Mesmo assim o antes→depois vai dito a ele no mesmo turno.
--
-- INVOKER NA DEFINIÇÃO (R-043 §4-B): a view é invoker desde a 177, e `create or replace view` **zera** as
--   reloptions que não estão na cláusula `with` — foi assim que eu mesmo quebrei a `events_humanos` na 178.
--   Vai na definição, e a prova confere.

begin;

do $$
declare v_def text;
begin
  select pg_get_viewdef('public.v_analytics_funnel_daily'::regclass, true) into v_def;
  if v_def ilike '%localhost%' then
    raise exception 'a funnel_daily ja filtra preview — a 190 ja foi aplicada?';
  end if;
  if v_def not ilike '%events_humanos%' then
    raise exception 'a funnel_daily nao le events_humanos — a definicao mudou, rever antes de substituir';
  end if;
  if not pg_catalog.has_table_privilege('authenticated','public.v_analytics_funnel_daily','select') then
    raise exception 'authenticated nao le a funnel_daily hoje — estado inesperado, parar';
  end if;
end $$;

create or replace view public.v_analytics_funnel_daily
  with (security_invoker = true) as
 select product,
    event_code,
    (occurred_at at time zone 'America/Sao_Paulo')::date as day,
    count(*) as n
   from analytics.events_humanos
  where occurred_at >= (now() - '90 days'::interval)
    and coalesce(url, '') !~* '^https?://(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(/|$)'
  group by product, event_code, ((occurred_at at time zone 'America/Sao_Paulo')::date);

comment on view public.v_analytics_funnel_daily is
  '190: funil por dia, janela de 90 dias. Agrupa pelo produto do LOG (de propósito — é o que atribui a visita '
  'ao site onde ela aconteceu; a v_analytics_funnel_summary agrupa pelo do CATÁLOGO e responde outra '
  'pergunta). Exclui preview local com a expressão literal da 129, incluindo o coalesce que preserva linha '
  'sem url. O dia é **BRT** (190) — era UTC, e 105 eventos em 30 dias caíam no dia seguinte. Lê '
  'events_humanos, logo sem robô (175) e sem teste (178). NÃO aplica a regra de produto da 129: aqui ela '
  'apagaria as visitas reais da landing do Clearix, que esta view atribui corretamente. Os cards NÃO leem '
  'esta view — leem a v_analytics_funnel_summary.';

do $$
declare v_opts text; v_n int; v_7d int; v_nulo int;
begin
  -- a) o invoker ficou NA definição, e não como false
  select array_to_string(reloptions, ',') into v_opts
    from pg_class c join pg_namespace n on n.oid=c.relnamespace
   where n.nspname='public' and c.relname='v_analytics_funnel_daily';
  if v_opts is null or v_opts not ilike '%security_invoker%'
     or v_opts ilike '%security_invoker=false%' or v_opts ilike '%security_invoker=off%' then
    raise exception 'PROVA_190_FALHOU: invoker nao gravado (%)', coalesce(v_opts,'null');
  end if;

  -- b) o grant sobreviveu ao create or replace
  if not pg_catalog.has_table_privilege('authenticated','public.v_analytics_funnel_daily','select') then
    raise exception 'PROVA_190_FALHOU: perdi o grant de authenticated';
  end if;

  -- c) o preview saiu: os numeros medidos antes de escrever esta migration
  select sum(n) into v_n from public.v_analytics_funnel_daily
   where product='clearix-calc' and event_code='calc_used';
  if v_n <> 41 then raise exception 'PROVA_190_FALHOU: calc_used deu % e a 129 diz 41', v_n; end if;

  select sum(n) into v_n from public.v_analytics_funnel_daily
   where product='osi' and event_code='landing_visit';
  if v_n <> 116 then raise exception 'PROVA_190_FALHOU: osi landing_visit deu % e eu medi 116', v_n; end if;

  -- d) CONTROLE POSITIVO (R-043 §4-A): nao basta cair, tem de cair o CERTO.
  --    d1) a linha do leitor SEM url continua contando — era o risco do `null !~*`
  select sum(n) into v_nulo from public.v_analytics_funnel_daily
   where product='osi' and event_code='reader_gatilho_click';
  if coalesce(v_nulo,0) <> 1 then
    raise exception 'PROVA_190_FALHOU: a linha do leitor sem url desapareceu (% em vez de 1)', coalesce(v_nulo,0);
  end if;

  --    d2) as visitas da landing do Clearix CONTINUAM atribuidas a clearix-site — e o que eu me recusei a
  --        apagar ao nao aplicar a regra de produto aqui
  select sum(n) into v_n from public.v_analytics_funnel_daily
   where product='clearix-site' and event_code='landing_visit';
  if coalesce(v_n,0) <> 99 then
    raise exception 'PROVA_190_FALHOU: clearix-site landing_visit deu % e eu medi 99 — apaguei historia real',
      coalesce(v_n,0);
  end if;

  --    d3) A SUMMARY NAO FOI TOCADA — e ela que alimenta os cards (FluxoOSI.tsx, SiteClearixCard.tsx).
  --        Esta e a prova de que o dono nao ve numero mudar: se eu tivesse mexido na view errada, cai aqui.
  select n_total into v_n from public.v_analytics_funnel_summary
   where product='osi' and event_code='landing_visit';
  if v_n <> 157 then
    raise exception 'PROVA_190_FALHOU: a summary mudou (% em vez de 157) — mexi na view dos cards', v_n;
  end if;

  --    d4) o dia passou a ser BRT: o evento de 10/07 as 21:21 BRT tem de pousar em 10/07, nao em 11/07.
  --        Sem esta linha, trocar o fuso seria afirmacao sem medida.
  if not exists (select 1 from public.v_analytics_funnel_daily
                  where day = date '2026-07-10'
                    and event_code = (select event_code from analytics.events_humanos
                                       where (occurred_at at time zone 'America/Sao_Paulo')
                                             between timestamp '2026-07-10 21:00' and timestamp '2026-07-10 23:59'
                                       limit 1)) then
    raise exception 'PROVA_190_FALHOU: o evento das 21h21 de 10/07 BRT nao pousou em 10/07 — o dia continua UTC';
  end if;

  -- e) e a view responde para `authenticated` sem erro de permissao
  set local role authenticated;
  perform count(*) from public.v_analytics_funnel_daily;
  reset role;
end $$;

commit;
