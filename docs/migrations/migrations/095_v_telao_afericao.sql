-- 095 — v_telao_afericao: o Telão passa a saber se está cego, sem sessão e sem ver valor
--
-- ⚠ NÃO APLICADA. Aguarda o "pode" do dono. Portão 52.
--    Pedido original: digiai_telao/_PEDIDO_AO_ORQUESTRADOR_2026-09-08_cegueira.md
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE NÃO É `count(*)`, QUE FOI O PEDIDO
-- ═══════════════════════════════════════════════════════════════════════════
-- O pedido era `fonte, count(*), max(timestamp)`. Medido em 09/09, isso não
-- detecta o que o Telão precisa detectar:
--
--     billing.subscribers ............. 0 linhas (tabela vazia)
--     count(*) de v_telao_cobranca .... 1        (a view "tem linha")
--
-- As views do Telão são AGREGADAS sem GROUP BY: devolvem uma linha sempre, com a
-- fonte cheia ou vazia. `count(*)` daria 1 para sempre — inclusive no dia em que
-- o RLS cegar a origem, que é o incidente que motivou o pedido. A medição teria
-- passado no teste que ela existe para fazer.
--
-- E `count(*)` publica volume: o pedido fala em estender às views do app, e aí
-- entram leads (260) e assinantes. Quantidade de registro É dado de negócio —
-- quantos clientes pagantes a empresa tem, legível por qualquer portador da chave
-- pública. `tem_dado` boolean responde "está cega?" sem responder "quanto vocês têm".
--
-- ═══════════════════════════════════════════════════════════════════════════
-- COMO ISTO DE FATO SEPARA "CEGA" DE "VAZIA" — e é o ponto do desenho
-- ═══════════════════════════════════════════════════════════════════════════
-- Esta view NÃO leva `security_invoker`: roda com o direito do dono, então
-- `tem_dado` reflete O DADO, não a permissão de quem pergunta.
--
--     Telão vê vazio + afericao diz tem_dado = true   → CEGUEIRA (permissão)
--     Telão vê vazio + afericao diz tem_dado = false  → fonte realmente vazia
--
-- É a mesma técnica que separou "tabela vazia" de "RLS cegando" na 092: comparar
-- a leitura de quem pergunta com a leitura de quem enxerga tudo. Sem esse
-- contraste, um zero não diz nada — e foi exatamente por não ter o contraste que
-- o Censo carregou uma frase falsa por dias.
--
-- ⚠ LIMITE DECLARADO: para `v_telao_cobranca` e `v_telao_financeiro`, que são
--    agregadas de uma linha, `tem_dado` é avaliado contra os VALORES. Hoje a
--    cobrança é legitimamente zero (a empresa não fez a primeira venda), então
--    ela vai reportar `false` — e isso é verdade, não alarme. O Telão deve ler
--    `false` como "não há o que mostrar", e só chamar de cegueira quando ele vê
--    vazio E aqui diz `true`.

begin;

create or replace view public.v_telao_afericao as
-- Agregadas de 1 linha: "tem dado" = tem VALOR, porque a linha existe sempre.
select 'v_telao_cobranca'::text as fonte,
       (coalesce(assinantes_ativos,0) > 0 or coalesce(recebido_mes_brl,0) > 0 or coalesce(vencidos,0) > 0) as tem_dado,
       gerado_em as atualizado_em
  from public.v_telao_cobranca
union all
select 'v_telao_financeiro',
       (coalesce(despesas_brl,0) > 0 or coalesce(mrr_brl,0) > 0 or coalesce(receita_avulsa_brl,0) > 0),
       max(gerado_em)
  from public.v_telao_financeiro
 group by 1, 2
union all
-- Multi-linha: "tem dado" = existe linha. Aqui o esvaziamento é observável.
select 'v_telao_pendencias', exists (select 1 from public.v_telao_pendencias), (select max(gerado_em) from public.v_telao_pendencias)
union all
select 'v_telao_pipeline',   exists (select 1 from public.v_telao_pipeline),   (select max(gerado_em) from public.v_telao_pipeline)
union all
select 'v_telao_roadmap',    exists (select 1 from public.v_telao_roadmap),    (select max(gerado_em) from public.v_telao_roadmap)
union all
select 'v_telao_sai_hoje',   exists (select 1 from public.v_telao_sai_hoje),   (select max(gerado_em) from public.v_telao_sai_hoje)
union all
select 'espelho_telao_bi',   exists (select 1 from public.espelho_telao_bi),   (select max(sincronizado_em) from public.espelho_telao_bi);

comment on view public.v_telao_afericao is
  'Aferição de fontes do Telão: uma linha por fonte, com tem_dado (boolean) e atualizado_em. CONSUMIDOR: digiai_telao. MOTIVO DO GRANT A anon: o Telão precisa saber se está cego SEM sessão — é a exceção anon documentada da casa, e não é dado de negócio. NÃO expõe valor nem contagem: boolean expõe menos que contagem, porque volume de leads/assinantes é dado de negócio e "está cega?" se responde sem ele. Roda como dono (sem security_invoker) DE PROPÓSITO: é o controle contra o qual o Telão compara a própria leitura — Telão vazio + tem_dado true = cegueira; ambos vazios = fonte vazia. Não acrescentar coluna de valor aqui.';

-- Só leitura, e só o necessário.
revoke all on public.v_telao_afericao from public;
grant select on public.v_telao_afericao to anon, authenticated;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS EXIGIDAS DEPOIS DE APLICAR
-- ═══════════════════════════════════════════════════════════════════════════
--   a) chave anon crua, sem sessão → 200 com 7 linhas (é o ponto da exceção);
--   b) nenhuma coluna de valor no retorno — só fonte, tem_dado, atualizado_em;
--   c) `v_telao_cobranca` reporta tem_dado = false HOJE, e isso está certo:
--      a empresa não tem assinante. Se reportar true, a expressão está errada;
--   d) `v_telao_roadmap` reporta tem_dado = true (9 linhas hoje) — controle positivo;
--   e) o Telão, sem sessão, lê a aferição e continua NÃO lendo as fontes:
--      é a prova de que abrimos o metadado sem abrir o dado.
