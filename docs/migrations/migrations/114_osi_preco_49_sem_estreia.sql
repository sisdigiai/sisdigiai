-- 114 — OSI a R$ 49 no fato canônico do banco, sem condição de estreia
--
-- ✔ APLICADA em 10/09/2026 20:01 (Brasília) pelo Orquestrador Geral, sob o portão 97
--   (auditoria: price_brl 48.50 → 49.00, campos notes/price_brl/launch_condition).
--   Reconferido por mim com a trava final deste arquivo: 49.00, launch_condition nulo,
--   canal nas notas E notas antigas preservadas, checkout intacto, nenhum produto com
--   48,50 ou estreia.
--   ⚠ A prova (c) — totais de v_vendas_eventos ANTES e DEPOIS — foi tentada e é
--   VAZIA: a view tem 0 linhas dos dois lados (0 pagamentos pagos, 0 vendas Hotmart,
--   0 cancelamentos; conferido por mim em 10/09). Total 0 = 0 é verdadeiro e não prova
--   nada. O que sustenta "não mexe no faturamento" é a leitura da definição da view
--   (soma o valor pago, não price_brl). A prova só fica possível com a primeira venda.
--   (Registo anterior deste cabeçalho dizia "ficou por fazer" — corrigido: foi feita,
--   e o que falta não é a medição, é haver o que medir.)
--   Checkout Hotmart a R$ 49,00: confirmado pelo steward da OSI no checkout público
--   (10/09, segundo o Geral). Não conferido por mim.
--
-- (Escrita como NÃO APLICADA.) Decisão do dono (portão 97, canal do Orquestrador Geral): OSI a
--    R$ 49 cheio, sem "de R$ 97", sem "% off", sem turma de estreia/lançamento.
--    Tabela minha (academy.*, migration 015) — R-032.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- POR QUE ESTA LINHA IMPORTA MAIS DO QUE PARECE
-- ═══════════════════════════════════════════════════════════════════════════
-- `academy.products` (slug otica-sem-improviso) é a fonte que o fato público de
-- preço cita. Enquanto disser 48.50, qualquer reconciliação puxa o preço velho de
-- volta por cima do que se corrigir à mão noutros sítios.
--
-- MEDIDO ANTES DE ESCREVER (10/09/2026):
--   price_brl ........ 48.50
--   launch_condition . "Preço de estreia R$ 48,50 para a turma inicial (Hotmart
--                       B105515825L primário · Kiwify fallback)"
--   checkout_url ..... https://go.hotmart.com/B105515825L?dp=1
--   notes ............ "Nexus entra como apoio e continuidade. Clearix aparece
--                       apenas como ecossistema."   metadata: {}
--
-- Duas coisas que a medição mudou no desenho:
--
-- 1. MEXER EM price_brl NÃO REESCREVE FATURAMENTO PASSADO — era o risco que tornava
--    esta migration perigosa, e não se confirma. Quem lê o campo: nenhuma função;
--    duas views. `v_academy_products` só repassa. `v_vendas_eventos` soma o valor
--    PAGO (`billing.payments.amount_brl` e `price_value_cents` da Hotmart), não o
--    preço de catálogo. A prova (c) confere isto por execução.
--
-- 2. launch_condition NÃO É SÓ TEXTO DE ESTREIA. Guarda "Kiwify fallback", que não
--    está em mais lado nenhum da linha (o Hotmart B105515825L está no
--    checkout_url; metadata é {}). Anular o campo, como pedido, apagava essa
--    referência em silêncio. Por isso o canal passa para `notes` no MESMO update em
--    que o campo fica nulo. Não confirmei se o Kiwify ainda é fallback — fica
--    registrado como estava, com a data em que saiu de launch_condition.
--
-- ⚠ ESTA MIGRATION MUDA O FATO NO BANCO, NÃO O PREÇO NA HOTMART. Conferir que o
--    checkout B105515825L cobra R$ 49. Se ainda cobrar 48,50, o banco passa a dizer
--    uma coisa e o checkout a cobrar outra — e quem vir as duas acredita no checkout.

begin;

do $$
declare n int;
begin
  select count(*) into n from academy.products
   where slug = 'otica-sem-improviso' and deleted_at is null
     and price_brl = 48.50 and launch_condition like '%48,50%'
     and checkout_url like '%B105515825L%';
  if n <> 1 then
    raise exception 'Esperava a OSI com price_brl 48.50, launch_condition de estreia e checkout Hotmart B105515825L (estado de 10/09): encontrei % linha(s). Já aplicada, ou alguém mexeu — conferir antes de sobrescrever.', n;
  end if;
end $$;

-- Um só update: o canal entra nas notas no mesmo instante em que sai de
-- launch_condition. Não há estado intermediário em que a referência não exista.
update academy.products set
  notes = concat_ws(E'\n', notes,
    '[10/09/2026 · 114] Canais de venda: Hotmart B105515825L (primário) · Kiwify (fallback). Registrado aqui quando o campo launch_condition foi esvaziado — a condição de preço antiga deixou de existir.'),
  price_brl = 49.00,
  launch_condition = null
where slug = 'otica-sem-improviso' and deleted_at is null;

do $$
declare n int;
begin
  select count(*) into n from academy.products
   where slug = 'otica-sem-improviso' and deleted_at is null
     and price_brl = 49.00 and launch_condition is null
     and notes like '%B105515825L%' and notes like '%Kiwify%'
     and notes like '%Nexus entra como apoio%'
     and checkout_url like '%B105515825L%';
  if n <> 1 then
    raise exception 'A OSI não ficou em 49.00 sem launch_condition, com o canal nas notas, as notas antigas preservadas e o checkout intacto.';
  end if;

  select count(*) into n from academy.products t
   where to_jsonb(t)::text ~* '48[,.]50|estreia|turma inicial';
  if n > 0 then
    raise exception '% produto(s) ainda citam 48,50 / estreia / turma inicial.', n;
  end if;

  select count(*) into n from academy.products
   where coalesce(notes, '') like '%' || chr(65533) || '%';
  if n > 0 then
    raise exception 'Acento corrompido nas notas (U+FFFD) — a aplicação estragou o texto.';
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) linha da OSI: price_brl 49.00, launch_condition nulo, notes com o canal E
--      com o texto que já lá estava;
--   b) `v_academy_products` devolve 49.00 — é a view que as telas leem;
--   c) CONTROLO, e é o que justifica a frase 1 do cabeçalho: somar
--      `v_vendas_eventos` (dia, valor) ANTES e DEPOIS de aplicar — os totais têm de
--      ser IGUAIS. Se mudarem, o preço de catálogo alimenta faturamento em algum
--      sítio que eu não vi, e é para reverter;
--   d) o trigger `audit_academy_products` registou a mudança.
