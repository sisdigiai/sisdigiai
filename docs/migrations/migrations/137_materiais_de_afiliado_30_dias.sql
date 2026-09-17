-- 137 — Central de Materiais da OSI: "90 dias" → "30 dias" nos textos dos afiliados
--
-- ✔ APLICADA em 17/09/2026 às 00:21:45 BRT, com a palavra do dono neste canal ("temos que aplicar todas as migrations em nosso banco todo"),
--   reensaiada contra o banco do dia antes. Medido depois: 5 materiais ativos com 30 dias, 0 com 90; metadata intacta.
--
-- (Escrita como NÃO APLICADA.)
-- ⛔ NÃO APLICADA. Palavra do dono dada no canal da OSI (16/09, textual: "1 pode / 2 pode tbm / 3 pode tbm / e pode
--   mandar tudo para o orquestrador" — 1 = autoriza os textos; 2 = o app aplica; 3 = a OSI confere), repassada pelo
--   Orquestrador Geral. Pede a confirmação de uma linha neste canal.
--
-- HISTÓRIA DESTE ARQUIVO: a primeira versão (16/09 ~20h) tirava o número ("apoio no Nexus incluído"). A OSI decidiu
--   "30 dias", porque as artes da Central já dizem 30 e a promessa-padrão §3 fixa "PDF + App leitor + 30 dias de apoio no
--   Nexus". Esta versão aplica o patch da OSI: otica_sem_improviso/docs/divulgacao/patch-materiais-afiliado-2026-09-16-30dias.json
--   (commit fc7288f), texto por texto, sem regex.
--
-- O QUE MUDA: 9 campos copy_* de 5 materiais ativos (banner quadrado 05c849de, banner story 1546cf5c, e-mail aa97dbf4,
--   WhatsApp bd89fbfa, carrossel 0df07742). Trava de entrada: os textos de hoje batem com a medição de 16/09 (md5).
--   Trava de saída: cada campo = texto do patch, e o patch = troca exata de "90 dias" por "30 dias" no texto de hoje.
--
-- O QUE NÃO MUDA, DE PROPÓSITO — metadata: o pedido incluía trocar "90 dias" também no metadata de 4 materiais. Medido:
--   o único conteúdo ali é metadata->'copy_antes_113', o BACKUP do texto anterior à migration 113, guardado de propósito
--   (e com "Lançamento R$ 48,50", o preço velho). A edge affiliate-materials-public NÃO serve metadata (lista só
--   id, type, title, description, copy_*, art_urls, platforms, preview_url, downloads_count e pilar). Reescrever o backup
--   não muda nada que afiliado veja e falsifica o histórico: viraria "30 dias … Lançamento R$ 48,50", um texto que nunca
--   existiu. A trava de saída prova que o metadata ficou byte a byte igual.
--
-- EFEITO NO FRONT: Central de Materiais da OSI (edge affiliate-materials-public) passa a servir "30 dias" nos 5.

begin;

create temp table antes_137 on commit drop as
  select id, copy_short, copy_medium, copy_long from marketing.affiliate_materials where id in ('05c849de-9535-42b0-a1b4-674e76cf620d', '1546cf5c-5ba8-426a-ace4-64cd0cd0da28', 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df', 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d', '0df07742-78e7-4965-8263-634023a29228');

-- ── travas de entrada ──────────────────────────────────────────────────────────
do $$
begin
  if exists (
    select 1 from (values
      ('05c849de-9535-42b0-a1b4-674e76cf620d'::uuid, 'b75bf778a6319d6b158ab47a8a16bca0'),
      ('1546cf5c-5ba8-426a-ace4-64cd0cd0da28'::uuid, 'bf6ed6154ab5bdfb9a36f062262ffa07'),
      ('aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df'::uuid, 'c7b7b6c6ad52da391031985770a58201'),
      ('bd89fbfa-fbb1-42aa-a1c3-1ef95520972d'::uuid, 'acb09ac823254321587b6046fe85a00c'),
      ('0df07742-78e7-4965-8263-634023a29228'::uuid, '42d3f997cf60e6db42002050320762e8')
    ) e(id, md5)
    where not exists (select 1 from marketing.affiliate_materials m
                       where m.id = e.id and m.is_active and m.deleted_at is null
                         and md5(concat_ws('|', m.copy_short, m.copy_medium, m.copy_long)) = e.md5)
  ) then
    raise exception 'algum material mudou desde a medicao de 16/09 (ou saiu de ativo) — conferir antes.';
  end if;
end $$;

-- ── os textos da OSI ──────────────────────────────────────────────────────────
update marketing.affiliate_materials
   set copy_short = 'Pare de atender no improviso. Manual visual + App leitor + 30 dias de apoio. Link na bio.', copy_medium = 'Manual visual de atendimento para quem trabalha em ótica. PDF + App leitor + 30 dias de apoio no Nexus. Garantia de 7 dias.', copy_long = 'Ótica Sem Improviso: o manual visual prático para vendedor, atendente e consultor que querem vender melhor sem depender de improviso. PDF para imprimir + App leitor no celular + 30 dias de apoio complementar no Nexus. Compra única, com garantia de 7 dias. Link na bio.', updated_at = now()
 where id = '05c849de-9535-42b0-a1b4-674e76cf620d';
update marketing.affiliate_materials
   set copy_medium = 'Manual visual + App leitor + 30 dias de apoio. Garantia de 7 dias. Link na bio.', copy_long = 'O método que tira você do atendimento no improviso e te coloca no controle do balcão e do WhatsApp. Pacote completo: manual PDF + App leitor + 30 dias de apoio no Nexus. Compra única, com garantia de 7 dias. Link na bio.', updated_at = now()
 where id = '1546cf5c-5ba8-426a-ace4-64cd0cd0da28';
update marketing.affiliate_materials
   set copy_long = 'Oi!

Você trabalha no balcão de ótica ou conhece alguém que trabalha? Então essa indicação é pra você.

O Ótica Sem Improviso é o manual visual prático que ensina vendedor, atendente e consultor a vender melhor — sem depender de improviso. Em vez de "tentar lembrar o discurso", você aplica um método de 5 movimentos que cabe em qualquer atendimento.

O pacote tem: manual em PDF + App leitor no celular + 30 dias de apoio complementar no Nexus (onde você revisa o método e tira dúvidas com o Doug, o assistente de IA do Nexus).

É compra única, com garantia de 7 dias: se não fizer sentido pra você, devolve.

Link: [SEU_LINK_AFILIADO]

Abraço', updated_at = now()
 where id = 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df';
update marketing.affiliate_materials
   set copy_medium = 'Oi! Conheci um material novo de atendimento pra quem trabalha em ótica. PDF + App leitor + 30 dias de apoio. Quer que eu te mande o link?', copy_long = 'Oi! Tudo bem?

Quero te indicar um material novo pra quem trabalha em ótica.

Se chama Ótica Sem Improviso — é o manual visual de atendimento pra quem quer vender melhor sem depender de improviso. Tem o PDF pra ler, o App leitor pra estudar no celular e 30 dias de apoio no Nexus (com o Doug, o assistente de IA do Nexus, que tira dúvidas).

É compra única e tem garantia de 7 dias.

Link: [SEU_LINK_AFILIADO]

Se fizer sentido, dá uma olhada!', updated_at = now()
 where id = 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d';
update marketing.affiliate_materials
   set copy_long = 'Slides do carrossel: (1) Capa "Os 5 Movimentos" / (2) Movimento 1: Sair do Automático / (3) Movimento 2: Ler o Cliente / (4) Movimento 3: Indicar com Segurança / (5) Movimento 4: Sustentar Valor / (6) Movimento 5: WhatsApp que Converte / (7) CTA "Manual visual + App. Aplicação em 3 dias. PDF + App + 30 dias de apoio no Nexus. Link na bio."', updated_at = now()
 where id = '0df07742-78e7-4965-8263-634023a29228';

-- ── travas de saída ───────────────────────────────────────────────────────────
do $$
begin
  if exists (select 1 from marketing.affiliate_materials
              where is_active and deleted_at is null
                and concat_ws(' ', title, description, copy_short, copy_medium, copy_long) ~* '90 ?dias') then
    raise exception 'ainda ha material ativo com "90 dias" no que a edge serve.';
  end if;

  if false
  or not exists (select 1 from marketing.affiliate_materials where id = '05c849de-9535-42b0-a1b4-674e76cf620d' and copy_short = 'Pare de atender no improviso. Manual visual + App leitor + 30 dias de apoio. Link na bio.')
  or not exists (select 1 from antes_137 a where a.id = '05c849de-9535-42b0-a1b4-674e76cf620d' and replace(a.copy_short, '90 dias', '30 dias') = 'Pare de atender no improviso. Manual visual + App leitor + 30 dias de apoio. Link na bio.')
  or not exists (select 1 from marketing.affiliate_materials where id = '05c849de-9535-42b0-a1b4-674e76cf620d' and copy_medium = 'Manual visual de atendimento para quem trabalha em ótica. PDF + App leitor + 30 dias de apoio no Nexus. Garantia de 7 dias.')
  or not exists (select 1 from antes_137 a where a.id = '05c849de-9535-42b0-a1b4-674e76cf620d' and replace(a.copy_medium, '90 dias', '30 dias') = 'Manual visual de atendimento para quem trabalha em ótica. PDF + App leitor + 30 dias de apoio no Nexus. Garantia de 7 dias.')
  or not exists (select 1 from marketing.affiliate_materials where id = '05c849de-9535-42b0-a1b4-674e76cf620d' and copy_long = 'Ótica Sem Improviso: o manual visual prático para vendedor, atendente e consultor que querem vender melhor sem depender de improviso. PDF para imprimir + App leitor no celular + 30 dias de apoio complementar no Nexus. Compra única, com garantia de 7 dias. Link na bio.')
  or not exists (select 1 from antes_137 a where a.id = '05c849de-9535-42b0-a1b4-674e76cf620d' and replace(a.copy_long, '90 dias', '30 dias') = 'Ótica Sem Improviso: o manual visual prático para vendedor, atendente e consultor que querem vender melhor sem depender de improviso. PDF para imprimir + App leitor no celular + 30 dias de apoio complementar no Nexus. Compra única, com garantia de 7 dias. Link na bio.')
  or not exists (select 1 from marketing.affiliate_materials where id = '1546cf5c-5ba8-426a-ace4-64cd0cd0da28' and copy_medium = 'Manual visual + App leitor + 30 dias de apoio. Garantia de 7 dias. Link na bio.')
  or not exists (select 1 from antes_137 a where a.id = '1546cf5c-5ba8-426a-ace4-64cd0cd0da28' and replace(a.copy_medium, '90 dias', '30 dias') = 'Manual visual + App leitor + 30 dias de apoio. Garantia de 7 dias. Link na bio.')
  or not exists (select 1 from marketing.affiliate_materials where id = '1546cf5c-5ba8-426a-ace4-64cd0cd0da28' and copy_long = 'O método que tira você do atendimento no improviso e te coloca no controle do balcão e do WhatsApp. Pacote completo: manual PDF + App leitor + 30 dias de apoio no Nexus. Compra única, com garantia de 7 dias. Link na bio.')
  or not exists (select 1 from antes_137 a where a.id = '1546cf5c-5ba8-426a-ace4-64cd0cd0da28' and replace(a.copy_long, '90 dias', '30 dias') = 'O método que tira você do atendimento no improviso e te coloca no controle do balcão e do WhatsApp. Pacote completo: manual PDF + App leitor + 30 dias de apoio no Nexus. Compra única, com garantia de 7 dias. Link na bio.')
  or not exists (select 1 from marketing.affiliate_materials where id = 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df' and copy_long = 'Oi!

Você trabalha no balcão de ótica ou conhece alguém que trabalha? Então essa indicação é pra você.

O Ótica Sem Improviso é o manual visual prático que ensina vendedor, atendente e consultor a vender melhor — sem depender de improviso. Em vez de "tentar lembrar o discurso", você aplica um método de 5 movimentos que cabe em qualquer atendimento.

O pacote tem: manual em PDF + App leitor no celular + 30 dias de apoio complementar no Nexus (onde você revisa o método e tira dúvidas com o Doug, o assistente de IA do Nexus).

É compra única, com garantia de 7 dias: se não fizer sentido pra você, devolve.

Link: [SEU_LINK_AFILIADO]

Abraço')
  or not exists (select 1 from antes_137 a where a.id = 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df' and replace(a.copy_long, '90 dias', '30 dias') = 'Oi!

Você trabalha no balcão de ótica ou conhece alguém que trabalha? Então essa indicação é pra você.

O Ótica Sem Improviso é o manual visual prático que ensina vendedor, atendente e consultor a vender melhor — sem depender de improviso. Em vez de "tentar lembrar o discurso", você aplica um método de 5 movimentos que cabe em qualquer atendimento.

O pacote tem: manual em PDF + App leitor no celular + 30 dias de apoio complementar no Nexus (onde você revisa o método e tira dúvidas com o Doug, o assistente de IA do Nexus).

É compra única, com garantia de 7 dias: se não fizer sentido pra você, devolve.

Link: [SEU_LINK_AFILIADO]

Abraço')
  or not exists (select 1 from marketing.affiliate_materials where id = 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d' and copy_medium = 'Oi! Conheci um material novo de atendimento pra quem trabalha em ótica. PDF + App leitor + 30 dias de apoio. Quer que eu te mande o link?')
  or not exists (select 1 from antes_137 a where a.id = 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d' and replace(a.copy_medium, '90 dias', '30 dias') = 'Oi! Conheci um material novo de atendimento pra quem trabalha em ótica. PDF + App leitor + 30 dias de apoio. Quer que eu te mande o link?')
  or not exists (select 1 from marketing.affiliate_materials where id = 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d' and copy_long = 'Oi! Tudo bem?

Quero te indicar um material novo pra quem trabalha em ótica.

Se chama Ótica Sem Improviso — é o manual visual de atendimento pra quem quer vender melhor sem depender de improviso. Tem o PDF pra ler, o App leitor pra estudar no celular e 30 dias de apoio no Nexus (com o Doug, o assistente de IA do Nexus, que tira dúvidas).

É compra única e tem garantia de 7 dias.

Link: [SEU_LINK_AFILIADO]

Se fizer sentido, dá uma olhada!')
  or not exists (select 1 from antes_137 a where a.id = 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d' and replace(a.copy_long, '90 dias', '30 dias') = 'Oi! Tudo bem?

Quero te indicar um material novo pra quem trabalha em ótica.

Se chama Ótica Sem Improviso — é o manual visual de atendimento pra quem quer vender melhor sem depender de improviso. Tem o PDF pra ler, o App leitor pra estudar no celular e 30 dias de apoio no Nexus (com o Doug, o assistente de IA do Nexus, que tira dúvidas).

É compra única e tem garantia de 7 dias.

Link: [SEU_LINK_AFILIADO]

Se fizer sentido, dá uma olhada!')
  or not exists (select 1 from marketing.affiliate_materials where id = '0df07742-78e7-4965-8263-634023a29228' and copy_long = 'Slides do carrossel: (1) Capa "Os 5 Movimentos" / (2) Movimento 1: Sair do Automático / (3) Movimento 2: Ler o Cliente / (4) Movimento 3: Indicar com Segurança / (5) Movimento 4: Sustentar Valor / (6) Movimento 5: WhatsApp que Converte / (7) CTA "Manual visual + App. Aplicação em 3 dias. PDF + App + 30 dias de apoio no Nexus. Link na bio."')
  or not exists (select 1 from antes_137 a where a.id = '0df07742-78e7-4965-8263-634023a29228' and replace(a.copy_long, '90 dias', '30 dias') = 'Slides do carrossel: (1) Capa "Os 5 Movimentos" / (2) Movimento 1: Sair do Automático / (3) Movimento 2: Ler o Cliente / (4) Movimento 3: Indicar com Segurança / (5) Movimento 4: Sustentar Valor / (6) Movimento 5: WhatsApp que Converte / (7) CTA "Manual visual + App. Aplicação em 3 dias. PDF + App + 30 dias de apoio no Nexus. Link na bio."')
  then
    raise exception 'algum campo nao ficou igual ao patch da OSI, ou o patch nao e a troca exata 90 → 30.';
  end if;

  if exists (
    select 1 from (values
      ('05c849de-9535-42b0-a1b4-674e76cf620d'::uuid, '214f108d98b1d47afb129fb86bf60eeb'),
      ('0df07742-78e7-4965-8263-634023a29228'::uuid, '4ab0a71fc3f32c9e02bd1cd54c4fb78c'),
      ('1546cf5c-5ba8-426a-ace4-64cd0cd0da28'::uuid, '89b92fd4e33ad41d69ae671a005dc82f'),
      ('aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df'::uuid, '6e98e419759201d4bad81c825bf68b97'),
      ('bd89fbfa-fbb1-42aa-a1c3-1ef95520972d'::uuid, '1cad7a9f9d2db28dd13cfdbb8739b2e9')
    ) e(id, md5)
    where not exists (select 1 from marketing.affiliate_materials m where m.id = e.id and md5(m.metadata::text) = e.md5)
  ) then
    raise exception 'metadata mudou — o backup copy_antes_113 nao pode ser reescrito por esta migration.';
  end if;

  if exists (select 1 from marketing.affiliate_materials
              where id in ('05c849de-9535-42b0-a1b4-674e76cf620d', '1546cf5c-5ba8-426a-ace4-64cd0cd0da28', 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df', 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d', '0df07742-78e7-4965-8263-634023a29228') and concat_ws(' ', copy_short, copy_medium, copy_long) like '%' || chr(65533) || '%') then
    raise exception 'caractere de substituicao (U+FFFD) nos textos.';
  end if;
end $$;

commit;
