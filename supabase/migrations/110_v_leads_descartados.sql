-- 110 — `v_leads_descartados`: a memória do que se rejeitou passa a ser alcançável
--
-- ✔ APLICADA em 09/09/2026 pelo Orquestrador Geral, e provada COMO COMPLEMENTO:
--   descartável antes 0 aqui / 1 na v_commercial_leads → depois de nao_e_otica,
--   1 aqui com rótulo "Não é ótica" e 0 lá — que é o passo 3, o único que prova
--   complemento e não só leitura. Reconferido por mim depois: invoker on,
--   authenticated lê, anon não, 260 vivos / 0 descartados / 260 na tabela.
--   Decisão do Orquestrador Geral com o MKT, depois da resposta ao §4.2 da 109.
--   A tabela é minha (096), então a migration veio por aqui — R-032.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ESTA VIEW EXISTE, E POR QUE A RESPOSTA MUDOU O DESENHO
-- ═══════════════════════════════════════════════════════════════════════════
-- Na 109 escrevi que a linha descartada fica guardada para servir de memória ao
-- dedupe da próxima raspagem — e levantei que essa memória não se alcançava pelo
-- app. A pergunta era: quem lê? Importador a correr como service_role, ou gente
-- numa tela?
--
-- **Resposta do MKT: não existe importador.** Os 254 leads de raspagem entraram
-- por fora. Confirmei pelo lado do banco, que é ângulo diferente do grep dele:
--
--   cron jobs a tocar commercial_leads ou apify ......... 0
--   funções que fazem INSERT em ops.commercial_leads .... 1 — e é a
--     `fn_upsert_commercial_lead`, a RPC das duas telas. Nenhum importador.
--
-- Duas verificações independentes a dar o mesmo, o que é o que se pede a uma
-- afirmação NEGATIVA — "não existe X" é a mais fácil de errar por procurar no
-- sítio errado.
--
-- Consequência: escrever "o dedupe é do importador" no comment seria escrever
-- para ninguém. Quem lê é **gente**, e gente precisa de uma view.
--
-- ⚠ E há uma consequência maior, que não é desta migration e está no fim: sem
--    importador, **não há dedupe nenhum hoje**. A memória que estamos a preservar
--    não tem quem a consulte na hora que interessa, que é a da importação.

begin;

-- INVOKER de propósito: é dado de lead, e quem manda é a RLS de
-- ops.commercial_leads (política `commercial_leitura_lead` → pode_tocar_lead()).
-- Conferido antes de escrever: **nenhuma política filtra deleted_at**, senão esta
-- view devolveria vazio para toda a gente e pareceria "não há descartados".
--
-- E o join com ops.motivos_perda para o rótulo não precisa de grant novo: a 108
-- já concedeu SELECT a authenticated nessa tabela. É exatamente o passo que
-- faltou na 106/107 e derrubou a tela do MKT — por isso a trava lá em baixo
-- corre COMO authenticated e PEDE a coluna do rótulo.
create or replace view public.v_leads_descartados
with (security_invoker = true) as
  select l.id,
         l.company,
         l.contact,
         l.source,
         l.motivo_perda,
         (select m.rotulo from ops.motivos_perda m where m.chave = l.motivo_perda) as motivo_rotulo,
         l.deleted_at
  from ops.commercial_leads l
  where l.deleted_at is not null
  order by l.deleted_at desc;

comment on view public.v_leads_descartados is
  'Leads que SAÍRAM da base (deleted_at preenchido) — o complemento das 12 views que filtram deleted_at. Existe porque a 109 guarda a linha descartada de propósito (254 dos 260 leads vêm de raspagem e vem mais), e essa memória não se alcançava por nenhuma tela: é o único sítio do app onde se vê o maior balde da casa. Inclui DE PROPÓSITO a lixeira antiga (deleted_at sem motivo), que aparece com motivo_rotulo NULO — é a medida de quanto se apagou sem dizer porquê, e é o que a CHECK do passe do front vai extinguir. INVOKER: a RLS de ops.commercial_leads é que manda. CONSUMIDORES: aba "descartadas" da Posto (digiai_mkt), auditoria humana, e a resposta a "por que a base encolheu". NÃO é fonte de dedupe automático: em 09/09/2026 não existe importador nenhum a ler isto.';

revoke all on public.v_leads_descartados from public, anon;
grant select on public.v_leads_descartados to authenticated;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA — e desta vez pelo papel que vai chamar, com as colunas pedidas
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  if has_table_privilege('anon','public.v_leads_descartados','select') then
    raise exception 'anon lê v_leads_descartados.';
  end if;
  if not has_table_privilege('authenticated','public.v_leads_descartados','select') then
    raise exception 'authenticated não lê v_leads_descartados — a view nasceria sem porta.';
  end if;

  -- A lição da 108, aplicada antes de custar: `set local role` E **pedir a coluna
  -- que faz o join**. Sem pedir, o Postgres poda a subquery e o teste passa por
  -- não testar — foi assim que o 42501 da 106/107 escapou às minhas travas.
  set local role authenticated;
  select count(motivo_rotulo) into n
    from (select motivo_rotulo from public.v_leads_descartados) q;
  reset role;
  -- n = 0 hoje e está certo: não há nada descartado. O que se prova aqui é que
  -- NÃO REBENTA com 42501, não que haja linhas.

  -- Apanha o filtro INVERTIDO, que é o erro plausível aqui: com `is null` no
  -- lugar de `is not null` a view devolveria 260 contra 0 e isto explodia.
  -- ⚠ NÃO prova nada sobre RLS: este bloco corre como postgres, que é dono da
  --   tabela e passa ao lado das políticas. RLS só se prova com JWT real.
  select count(*) into n from ops.commercial_leads
   where deleted_at is not null;
  if n <> (select count(*) from public.v_leads_descartados) then
    raise exception 'v_leads_descartados não devolve as linhas com deleted_at (% na tabela) — filtro invertido.', n;
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS — e a principal NÃO se prova com a base como está
-- ═══════════════════════════════════════════════════════════════════════════
--   a) anon → sem select; authenticated → com select;
--   b) `select motivo_rotulo from v_leads_descartados` como authenticated →
--      executa (0 linhas hoje, e 0 está certo);
--
--   ⚠ c) A PROVA QUE INTERESSA precisa de um descarte a existir, e hoje há ZERO
--      linhas com deleted_at. Com a base como está, esta view devolve vazio — e
--      "vazio" é indistinguível de "filtro invertido". Fazer no mesmo turno em
--      que se testa a 109, com lead descartável:
--        1. `fn_descartar_lead(A, 'cadastro_ruim')`;
--        2. A **aparece** em v_leads_descartados com motivo_rotulo
--           "Cadastro quebrado (nome/telefone de outra empresa)";
--        3. A **não aparece** em v_commercial_leads (é o complemento);
--        4. apagar A e a view volta a vazio.
--      Sem o passo 3 isto não prova complemento nenhum: prova só que a view lê.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE ESTA MIGRATION TORNA VISÍVEL, E QUE É MAIOR DO QUE ELA
-- ═══════════════════════════════════════════════════════════════════════════
-- Sem importador, **não existe dedupe nenhum hoje**. A 109 preserva a linha para
-- a próxima raspagem não repetir o que já se rejeitou — e não há nada, nem
-- ninguém, a consultar isso no momento da importação. A memória fica correta e
-- ociosa até alguém escrever quem a lê.
--
-- E aí vem a pergunta que o Orquestrador Geral me passou com o meu nome: **qual é
-- a chave de dedupe do lead?** Medi antes de opinar, e a medição desaconselha as
-- duas respostas fáceis:
--
--   `company` .......... 260 valores distintos em 260 linhas. Parece chave
--                        perfeita, e é o oposto: raspagem produz strings sujas
--                        e cada sujeira é única. Unicidade aqui é sintoma, não
--                        garantia — é o mesmo formato do `count(*)=1` numa view
--                        agregada vazia.
--   `email` ............ 0 linhas preenchidas. Não é candidato.
--   `phone_e164` ....... 240/260 preenchidos e todos em formato E.164 válido;
--                        **0 telefones repetidos** hoje. É o melhor candidato, e
--                        é coerente com R-013, que já define identidade por
--                        telefone.
--
-- ⚠ MAS NÃO ESTÁ PRONTO PARA SER CHAVE, e o detalhe é o que estraga índices:
--   das 20 linhas sem telefone, **14 têm string VAZIA e 6 têm NULL**. São duas
--   grafias de "não sei", e um índice único trata-as de forma OPOSTA: NULLs são
--   todos distintos entre si, `''` é um valor e **colide consigo mesmo**. Um
--   `unique (phone_e164)` hoje **falha a criar**, pelas 14 vazias.
--   Não há índice nenhum em `phone_e164` (conferido em pg_indexes).
--
-- O caminho, se a decisão for telefone — e não o escrevo como migration porque a
-- decisão é do dono e mexe em dado real:
--   1. normalizar as 14 vazias para NULL (duas grafias passam a uma);
--   2. `create unique index … on ops.commercial_leads (phone_e164)
--       where phone_e164 is not null` — parcial, para os sem telefone não
--       colidirem uns com os outros;
--   3. decidir o que a unicidade faz com um lead JÁ DESCARTADO: se o índice
--      abranger as linhas com deleted_at, reimportar um cadastro rejeitado passa
--      a dar ERRO em vez de ser ignorado em silêncio. Provavelmente é o que se
--      quer — mas é decisão, não consequência, e a diferença aparece na cara de
--      quem importa.
-- Decidir **antes** da próxima raspagem. Durante, já é limpeza.
