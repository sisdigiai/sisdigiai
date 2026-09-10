-- 117 — ideias e roteiros com o preço velho da OSI saem do alcance da importação
--
-- ⚠ NÃO APLICADA, e NÃO APLICAR sem a palavra do dono dita no canal do orquestrador
--    do app digiai. É soft delete (reversível, mas é retirar conteúdo).
--    Tabelas minhas (marketing.*) — R-032.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- "CONGELADO COMO HISTÓRICO" TEM UMA PORTA LATERAL
-- ═══════════════════════════════════════════════════════════════════════════
-- Foi-me dito que marketing.content_* está congelado. Medi, e é quase verdade:
--   • última escrita: content_calendar 25/06, content_ideas 26/05;
--   • publicação direta: NADA sai. `v_mkt_publicar` e `v_mkt_upcoming` só pegam
--     status 'ready' com data >= hoje, e os itens com preço velho são de jun/jul;
--     a agenda do GJ usa o mesmo filtro de data.
--
-- Mas o botão "importar do digiai" do MKT chama duas funções que NÃO filtram data:
--   • mkt.mkt_ingerir_ideias_digiai — importa TODA ideia com deleted_at nulo, de
--     qualquer status;
--   • mkt.mkt_ingerir_roteiros_digiai — importa todo item do calendário não
--     publicado com copy_full, levando hook + copy_full.
-- Ambas são idempotentes: o que já foi importado não volta a ser lido. Então
-- corrigir a origem só adianta ANTES da importação — e medido: o MKT importou 0
-- ideias e 0 roteiros até hoje. É agora ou é limpar nas tabelas dele depois.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- O QUE SAI, E POR QUE SAIR EM VEZ DE REESCREVER
-- ═══════════════════════════════════════════════════════════════════════════
-- 5 ideias (status available), todas gancho de preço ou de lançamento, sem narrativa:
--   1ef870d5  "Lançamento: condição especial pra quem entra na 1ª turma"
--   4f81fdd8  "Por que R$ 48,50 paga 1 venda recuperada no WhatsApp"
--   8ec6f694  "Última semana de lançamento — depois o preço vai subir"
--   988f3e17  "Ótica Sem Improviso: PDF + app + 90 dias de apoio. R$ 97. (50% off no lançamento)"
--   d456d39b  "Comparação: 1 curso longo de R$ 1.500 vs 1 manual de R$ 97 que entrega o método"
-- 5 itens do calendário não publicados, com preço/estreia em hook ou copy_full:
--   765ed1ce  ready 24/06 — broadcast "turma de estreia por R$48,50 (depois vai pra R$97)"
--   a4ce9bc6  ready 25/06 — fecha com "Estreia R$48,50."
--   a63f46b6  ready 22/07 — fecha com "Estreia R$ 48,50."
--   a8c6e972  ready 23/07 — "Estreia por R$ 48,50 (menos que um almoço da equipe)"
--   c1fcb184  planned 27/06 — "Fecha com a oferta de estreia."
--
-- Soft delete e não reescrita: "Última semana de lançamento — depois o preço vai
-- subir" não tem conserto trocando um número — é escassez falsa de ponta a ponta, e
-- reescrever copy é trabalho do steward da OSI, não DML meu. Soft delete tira do
-- alcance das duas importações e das views, guarda a linha, e reverte com
-- `deleted_at = null`.
--
-- ⚠ A ALTERNATIVA, que o dono pode preferir: a63f46b6 e a8c6e972 têm conteúdo de
--    método que presta e só a frase final carrega preço. Em vez de retirar esses
--    dois, o steward reescreve a última frase. Nesse caso tirar os dois ids desta
--    migration antes de aplicar.
--
-- O QUE FICA:
--   • os 7 itens JÁ PUBLICADOS com preço velho — portão 107, decisão do dono, não DML;
--   • 032f77de, a6f3120f, bc7ffe8d: casaram "estreia" no sentido de "post de
--     estreia" / "semana de estreia" em narrative, posting_brief e notes, que a
--     importação não leva. Falsos positivos.

begin;

do $$
declare n int;
begin
  select count(*) into n from marketing.content_ideas
   where deleted_at is null and status = 'available'
     and id in ('1ef870d5-199d-463d-ba11-d9d0641782c5','4f81fdd8-9987-4471-8dec-9361a29b763a','8ec6f694-a952-490a-96e5-8646eab2eb8c','988f3e17-7497-4682-8c23-c558cc462d7e','d456d39b-e6ae-4406-9f31-509884c01d7d');
  if n <> 5 then
    raise exception 'Esperava as 5 ideias vivas e available (medido em 10/09): encontrei %.', n;
  end if;

  select count(*) into n from marketing.content_calendar
   where deleted_at is null and status <> 'published'
     and id in ('765ed1ce-12f5-4abe-83fc-e3a8775a6c44','a4ce9bc6-3cce-4446-a995-da8f0cf99143','a63f46b6-8c6a-4039-99d5-05391c84edde','a8c6e972-cffd-4fea-9153-c026ef40fb3b','c1fcb184-25ef-4ad3-8ced-0efbdc38185b');
  if n <> 5 then
    raise exception 'Esperava os 5 itens do calendário vivos e não publicados: encontrei %.', n;
  end if;

  -- Se o MKT importou entretanto, retirar a origem já não chega às cópias: parar e
  -- limpar primeiro nas tabelas dele.
  select count(*) into n from mkt.ideias
   where origem = 'digiai_banco_ideias'
     and metadata->>'source_id' in ('1ef870d5-199d-463d-ba11-d9d0641782c5','4f81fdd8-9987-4471-8dec-9361a29b763a','8ec6f694-a952-490a-96e5-8646eab2eb8c','988f3e17-7497-4682-8c23-c558cc462d7e','d456d39b-e6ae-4406-9f31-509884c01d7d');
  if n > 0 then
    raise exception '% ideia(s) destas já foram importadas para mkt.ideias — a 117 não alcança as cópias.', n;
  end if;

  select count(*) into n from mkt.roteiros
   where metadata->>'source_id' in ('765ed1ce-12f5-4abe-83fc-e3a8775a6c44','a4ce9bc6-3cce-4446-a995-da8f0cf99143','a63f46b6-8c6a-4039-99d5-05391c84edde','a8c6e972-cffd-4fea-9153-c026ef40fb3b','c1fcb184-25ef-4ad3-8ced-0efbdc38185b');
  if n > 0 then
    raise exception '% roteiro(s) destes já foram importados para mkt.roteiros — a 117 não alcança as cópias.', n;
  end if;
end $$;

update marketing.content_ideas set
  deleted_at = now(),
  updated_at = now(),
  notes = concat_ws(E'\n', notes, '[10/09/2026 · 117] Retirada: gancho de preço ou de lançamento que a decisão do dono (OSI a R$ 49 cheio, sem estreia/lançamento/% off) tornou falso. Soft delete — reverter com deleted_at = null.'),
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('retirada_117', 'preco_ou_lancamento_desatualizado')
where id in ('1ef870d5-199d-463d-ba11-d9d0641782c5','4f81fdd8-9987-4471-8dec-9361a29b763a','8ec6f694-a952-490a-96e5-8646eab2eb8c','988f3e17-7497-4682-8c23-c558cc462d7e','d456d39b-e6ae-4406-9f31-509884c01d7d');

update marketing.content_calendar set
  deleted_at = now(),
  updated_at = now(),
  notes = concat_ws(E'\n', notes, '[10/09/2026 · 117] Retirado: copy com preço ou condição de estreia que a decisão do dono (OSI a R$ 49 cheio, sem estreia/lançamento/% off) tornou falsa. Soft delete — reverter com deleted_at = null.')
where id in ('765ed1ce-12f5-4abe-83fc-e3a8775a6c44','a4ce9bc6-3cce-4446-a995-da8f0cf99143','a63f46b6-8c6a-4039-99d5-05391c84edde','a8c6e972-cffd-4fea-9153-c026ef40fb3b','c1fcb184-25ef-4ad3-8ced-0efbdc38185b');

do $$
declare n int;
begin
  -- Por construção, e não por lista: simula o WHERE das duas funções de importação
  -- e exige que nada do que elas ainda alcançam carregue o preço velho.
  select count(*) into n from marketing.content_ideas
   where deleted_at is null
     and concat_ws(' ', hook, narrative, cta_suggestion) ~* '48[,.]50|R\$\s?97|%\s?off|lan.amento';
  if n > 0 then
    raise exception '% ideia(s) ainda importável(is) com preço ou lançamento.', n;
  end if;

  select count(*) into n from marketing.content_calendar
   where deleted_at is null and status <> 'published' and coalesce(copy_full, '') <> ''
     and concat_ws(' ', hook, copy_full) ~* '48[,.]50|R\$\s?97|%\s?off|turma de estreia|oferta de estreia|estreia (por )?R\$|lan.amento';
  if n > 0 then
    raise exception '% item(ns) do calendário ainda importável(is) com preço ou estreia.', n;
  end if;

  select count(*) into n from marketing.content_calendar
   where coalesce(notes, '') like '%' || chr(65533) || '%';
  if n > 0 then
    raise exception 'Acento corrompido nas notas do calendário (U+FFFD).';
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) as 10 linhas com deleted_at e a nota da 117;
--   b) chamar as duas funções de importação NUMA TRANSAÇÃO DESFEITA: nenhuma das
--      10 aparece em mkt.ideias / mkt.roteiros;
--   c) os 7 itens publicados e os 3 falsos positivos INTACTOS;
--   d) reversão testável: `deleted_at = null` numa delas, numa transação desfeita,
--      devolve-a às views.
