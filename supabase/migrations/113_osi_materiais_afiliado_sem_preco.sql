-- 113 — materiais de afiliado da OSI sem preço (TEXTO PÚBLICO)
--
-- ✔ APLICADA em 10/09/2026 pelo Orquestrador Geral, sob o portão 97. Reconferido por
--   mim depois, rodando a trava final DESTE arquivo contra o banco: 17 de 17 campos
--   batem por md5 com o arquivo do steward; 0 materiais ativos com preço, estreia,
--   lançamento ou "R$"; 7 com o texto antigo em metadata; 0 U+FFFD. Os 3 materiais
--   fora do patch não foram tocados.
--
-- (Escrita como NÃO APLICADA.) Decisão do dono (portão 97, canal do Orquestrador Geral): OSI a
--    R$ 49 cheio, sem "de R$ 97", sem "% off", sem turma de estreia/lançamento;
--    materiais de afiliado SEM preço — o preço aparece só no checkout.
--    Tabela minha (marketing.*) — R-032.
--
-- ⚠ ESTE TEXTO É PÚBLICO. A edge `affiliate-materials-public` serve copy_short,
--    copy_medium e copy_long de todo material ativo à Central de Materiais da
--    landing OSI, sem autenticação. Aplicar = mudar o que qualquer afiliado copia.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- GERADA POR SCRIPT, NÃO TRANSCRITA À MÃO
-- ═══════════════════════════════════════════════════════════════════════════
-- Fonte: otica_sem_improviso/docs/divulgacao/patch-materiais-afiliado-2026-09-10.json
-- (steward da OSI). Copiar texto público com acento à mão é pôr um erro de digitação
-- direto na landing. O gerador:
--   • recusa o arquivo se algum texto novo tiver "R$", "%", "48,50", "97",
--     "estreia", "lançamento" ou "turma" — a decisão é material SEM preço;
--   • recusa campo fora de copy_short/medium/long (os títulos do patch servem só
--     de conferência de alvo e são iguais aos do banco);
--   • grava o md5 de cada campo novo, e a trava final confere BYTE A BYTE o que
--     ficou no banco. Acento corrompido na aplicação não passa.
--
-- ═══════════════════════════════════════════════════════════════════════════
-- MEDIDO EM 10/09/2026
-- ═══════════════════════════════════════════════════════════════════════════
-- 10 materiais, todos ativos. 4 com preço velho, em 9 campos:
--   05c849de ×3 · 1546cf5c ×2 · aa97dbf4 ×1 · bd89fbfa ×3
-- O patch mexe em 7: esses 4 e mais 3 SEM preço (ad0e46a1, 7597587b, 0df07742),
-- onde o steward tirou afirmação sem prova e trocou "na Nexus" por "no Nexus".
-- Os outros 3 materiais (6a469388, 31e4a8f1, 23c5a0c2) não têm preço e não mudam.
--
-- AS IMAGENS: conferi as artes-fonte no repositório da OSI (public/materiais-afiliado)
-- — banner quadrado, banner story, card da Taty e o slide 7 (CTA) do carrossel.
-- Nenhuma tem preço desenhado HOJE — conferi DEPOIS de o
-- steward as refazer em 10/09 (mapa do Geral, §3), então isto confirma o conserto, não
-- que nunca tiveram. Dizem "Manual visual + app + 90 dias de apoio",
-- "Garantia de 7 dias", "Link na bio". O reel (mp4) NÃO conferi. Conferi o arquivo-
-- fonte, não o publicado no Netlify — se o deploy da landing estiver atrasado em
-- relação ao repositório, o publicado pode diferir.
--
-- REVERSÍVEL: antes de sobrescrever, os três campos de cada um dos 7 materiais vão
-- para metadata->'copy_antes_113'. A edge pública não serve metadata.

begin;

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA PRÉ — o alvo é o que foi medido, e ninguém mexeu entretanto
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  select count(*) into n from marketing.affiliate_materials
   where deleted_at is null and is_active
     and (id, title) in (
       ('05c849de-9535-42b0-a1b4-674e76cf620d'::uuid, 'Banner principal — Ótica Sem Improviso (Quadrado 1080)'),
       ('1546cf5c-5ba8-426a-ace4-64cd0cd0da28'::uuid, 'Banner Story — Ótica Sem Improviso (1080x1920)'),
       ('aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df'::uuid, 'Email de afiliado — apresentação do material'),
       ('bd89fbfa-fbb1-42aa-a1c3-1ef95520972d'::uuid, 'WhatsApp do afiliado — 1º contato'),
       ('ad0e46a1-c2c8-4943-80d6-72cc9bcf5ca6'::uuid, 'Card de Autoridade — Tatiana Camargo'),
       ('7597587b-72d1-4c81-95ef-5681de505881'::uuid, 'Reel: Quem é a Taty (autoridade)'),
       ('0df07742-78e7-4965-8263-634023a29228'::uuid, 'Carrossel: Os 5 Movimentos')
     );
  if n <> 7 then
    raise exception 'Esperava os 7 materiais do patch, ativos, com id E título a bater: encontrei %. O patch ou a tabela mudou.', n;
  end if;

  select count(*) into n from marketing.affiliate_materials
   where id in ('05c849de-9535-42b0-a1b4-674e76cf620d', '1546cf5c-5ba8-426a-ace4-64cd0cd0da28', 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df', 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d', 'ad0e46a1-c2c8-4943-80d6-72cc9bcf5ca6', '7597587b-72d1-4c81-95ef-5681de505881', '0df07742-78e7-4965-8263-634023a29228')
     and concat_ws(' ', copy_short, copy_medium, copy_long) ~* '48[,.]50|R\$\s?97|de\s+97|%\s?off|%\s+de\s+desconto|estreia|lan.amento|turma inicial';
  if n <> 4 then
    raise exception 'Esperava 4 dos 7 com preço velho (medido em 10/09): encontrei %. Já aplicada, ou alguém mexeu — conferir antes de sobrescrever.', n;
  end if;
end $$;

-- Guarda o texto de antes, para reverter sem depender de memória nem de backup.
update marketing.affiliate_materials set
  metadata = coalesce(metadata, '{}'::jsonb) || jsonb_build_object('copy_antes_113',
    jsonb_build_object('copy_short', copy_short, 'copy_medium', copy_medium, 'copy_long', copy_long, 'guardado_em', now()))
where id in ('05c849de-9535-42b0-a1b4-674e76cf620d', '1546cf5c-5ba8-426a-ace4-64cd0cd0da28', 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df', 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d', 'ad0e46a1-c2c8-4943-80d6-72cc9bcf5ca6', '7597587b-72d1-4c81-95ef-5681de505881', '0df07742-78e7-4965-8263-634023a29228');

update marketing.affiliate_materials set
  copy_short = $txt$Pare de atender no improviso. Manual visual + App leitor + 90 dias de apoio. Link na bio.$txt$,
  copy_medium = $txt$Manual visual de atendimento para quem trabalha em ótica. PDF + App leitor + 90 dias de apoio no Nexus. Garantia de 7 dias.$txt$,
  copy_long = $txt$Ótica Sem Improviso: o manual visual prático para vendedor, atendente e consultor que querem vender melhor sem depender de improviso. PDF para imprimir + App leitor no celular + 90 dias de apoio complementar no Nexus. Compra única, com garantia de 7 dias. Link na bio.$txt$,
  updated_at = now()
where id = '05c849de-9535-42b0-a1b4-674e76cf620d';

update marketing.affiliate_materials set
  copy_medium = $txt$Manual visual + App leitor + 90 dias de apoio. Garantia de 7 dias. Link na bio.$txt$,
  copy_long = $txt$O método que tira você do atendimento no improviso e te coloca no controle do balcão e do WhatsApp. Pacote completo: manual PDF + App leitor + 90 dias de apoio no Nexus. Compra única, com garantia de 7 dias. Link na bio.$txt$,
  updated_at = now()
where id = '1546cf5c-5ba8-426a-ace4-64cd0cd0da28';

update marketing.affiliate_materials set
  copy_medium = $txt$Oi! Tenho um material de atendimento para ótica que quero te indicar.$txt$,
  copy_long = $txt$Oi!

Você trabalha no balcão de ótica ou conhece alguém que trabalha? Então essa indicação é pra você.

O Ótica Sem Improviso é o manual visual prático que ensina vendedor, atendente e consultor a vender melhor — sem depender de improviso. Em vez de "tentar lembrar o discurso", você aplica um método de 5 movimentos que cabe em qualquer atendimento.

O pacote tem: manual em PDF + App leitor no celular + 90 dias de apoio complementar no Nexus (onde você revisa o método e tira dúvidas com o Doug, o assistente de IA do Nexus).

É compra única, com garantia de 7 dias: se não fizer sentido pra você, devolve.

Link: [SEU_LINK_AFILIADO]

Abraço$txt$,
  updated_at = now()
where id = 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df';

update marketing.affiliate_materials set
  copy_short = $txt$Oi! Conheci um material novo de atendimento pra quem trabalha em ótica. Quer o link?$txt$,
  copy_medium = $txt$Oi! Conheci um material novo de atendimento pra quem trabalha em ótica. PDF + App leitor + 90 dias de apoio. Quer que eu te mande o link?$txt$,
  copy_long = $txt$Oi! Tudo bem?

Quero te indicar um material novo pra quem trabalha em ótica.

Se chama Ótica Sem Improviso — é o manual visual de atendimento pra quem quer vender melhor sem depender de improviso. Tem o PDF pra ler, o App leitor pra estudar no celular e 90 dias de apoio no Nexus (com o Doug, o assistente de IA do Nexus, que tira dúvidas).

É compra única e tem garantia de 7 dias.

Link: [SEU_LINK_AFILIADO]

Se fizer sentido, dá uma olhada!$txt$,
  updated_at = now()
where id = 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d';

update marketing.affiliate_materials set
  copy_short = $txt$Tatiana Camargo: 25 anos de balcão viraram um método. Conhece o Ótica Sem Improviso?$txt$,
  updated_at = now()
where id = 'ad0e46a1-c2c8-4943-80d6-72cc9bcf5ca6';

update marketing.affiliate_materials set
  copy_short = $txt$Quem é a Taty: 25 anos de balcão.$txt$,
  copy_medium = $txt$Quem é a Taty: 25 anos de balcão. Conhece o método que ela ensina?$txt$,
  copy_long = $txt$Roteiro: (0-5s) Hook "Quem é a Taty?" sobre foto/vídeo dela atendendo / (5-15s) "Ela tem 25 anos de balcão na Mello Óticas." / (15-25s) "Atendeu literalmente milhares de clientes — e foi de balcão a referência interna em vendas e treinamento." / (25-35s) "Hoje colocou tudo isso num manual prático: o Ótica Sem Improviso." / (35-45s) CTA "Conhece? Link na bio pro método dela." Use B-rolls do balcão real ou fotos.$txt$,
  updated_at = now()
where id = '7597587b-72d1-4c81-95ef-5681de505881';

update marketing.affiliate_materials set
  copy_short = $txt$Os 5 Movimentos de quem atende melhor e vende mais na ótica.$txt$,
  copy_medium = $txt$Sair do Automático, Ler o Cliente, Indicar com Segurança, Sustentar Valor e WhatsApp que Converte. Salva e aplica em 3 dias.$txt$,
  copy_long = $txt$Slides do carrossel: (1) Capa "Os 5 Movimentos" / (2) Movimento 1: Sair do Automático / (3) Movimento 2: Ler o Cliente / (4) Movimento 3: Indicar com Segurança / (5) Movimento 4: Sustentar Valor / (6) Movimento 5: WhatsApp que Converte / (7) CTA "Manual visual + App. Aplicação em 3 dias. PDF + App + 90 dias de apoio no Nexus. Link na bio."$txt$,
  updated_at = now()
where id = '0df07742-78e7-4965-8263-634023a29228';

-- ═══════════════════════════════════════════════════════════════════════════
-- TRAVA PÓS
-- ═══════════════════════════════════════════════════════════════════════════
do $$
declare n int;
begin
  -- Em TODO material ativo, não só nos 7: é o que a Central de Materiais serve.
  select count(*) into n from marketing.affiliate_materials
   where deleted_at is null and is_active
     and concat_ws(' ', copy_short, copy_medium, copy_long) ~* '48[,.]50|R\$\s?97|de\s+97|%\s?off|%\s+de\s+desconto|estreia|lan.amento|turma inicial';
  if n > 0 then
    raise exception '% material(is) ativo(s) ainda com preço / estreia / lançamento.', n;
  end if;

  select count(*) into n from marketing.affiliate_materials
   where deleted_at is null and is_active
     and concat_ws(' ', copy_short, copy_medium, copy_long) ~ 'R\$';
  if n > 0 then
    raise exception '% material(is) ativo(s) ainda com "R$" — a decisão é material SEM preço.', n;
  end if;

  select count(*) into n from marketing.affiliate_materials
   where concat_ws(' ', copy_short, copy_medium, copy_long) like '%' || chr(65533) || '%';
  if n > 0 then
    raise exception '% material(is) com caractere de substituição (U+FFFD) — acento corrompido na aplicação.', n;
  end if;

  select count(*) into n from marketing.affiliate_materials
   where id in ('05c849de-9535-42b0-a1b4-674e76cf620d', '1546cf5c-5ba8-426a-ace4-64cd0cd0da28', 'aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df', 'bd89fbfa-fbb1-42aa-a1c3-1ef95520972d', 'ad0e46a1-c2c8-4943-80d6-72cc9bcf5ca6', '7597587b-72d1-4c81-95ef-5681de505881', '0df07742-78e7-4965-8263-634023a29228') and metadata ? 'copy_antes_113';
  if n <> 7 then
    raise exception 'Só % dos 7 materiais guardaram o texto de antes em metadata — sem isso não há reversão.', n;
  end if;

  -- Byte a byte. Contagem POSITIVA: um campo que faltasse no join não passaria
  -- despercebido como passaria numa contagem de diferenças.
  select count(*) into n
    from (values
      ('05c849de-9535-42b0-a1b4-674e76cf620d', 'copy_short', '3512464e68712e8528d8227da481f3cb'),
      ('05c849de-9535-42b0-a1b4-674e76cf620d', 'copy_medium', 'ba88271ebbc3d2d29b359e2e457c9638'),
      ('05c849de-9535-42b0-a1b4-674e76cf620d', 'copy_long', 'b02f1ee0e8fd789ab77bfc2f97c2a2a8'),
      ('1546cf5c-5ba8-426a-ace4-64cd0cd0da28', 'copy_medium', '3ed262f8aabdcc4f887d528ed3c5e1f7'),
      ('1546cf5c-5ba8-426a-ace4-64cd0cd0da28', 'copy_long', '7e66ed1240f38a6f06aba49bf5ab19e0'),
      ('aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df', 'copy_medium', 'cdaa320f9904a10269186c91d392fbcf'),
      ('aa97dbf4-e3b3-41e1-91e5-a4c2e6b191df', 'copy_long', 'ba2d41e42b4d59a89700b9c242943df5'),
      ('bd89fbfa-fbb1-42aa-a1c3-1ef95520972d', 'copy_short', 'dc66eb78c469c9cf83d17041e5530a1d'),
      ('bd89fbfa-fbb1-42aa-a1c3-1ef95520972d', 'copy_medium', '46da1e491f66597babc795b67587bbf8'),
      ('bd89fbfa-fbb1-42aa-a1c3-1ef95520972d', 'copy_long', 'e84cdbc54ffe9c2bc91cd9f40363cb52'),
      ('ad0e46a1-c2c8-4943-80d6-72cc9bcf5ca6', 'copy_short', 'f30a8f8b751d83ee6a152e4392b522f2'),
      ('7597587b-72d1-4c81-95ef-5681de505881', 'copy_short', '7ecc4aec9fd7d2d49c6f56b1e3cef53e'),
      ('7597587b-72d1-4c81-95ef-5681de505881', 'copy_medium', '82a17e997e410f2f64fdcfd7db9890e7'),
      ('7597587b-72d1-4c81-95ef-5681de505881', 'copy_long', 'd65540c6bd1a8874547d4d986500663d'),
      ('0df07742-78e7-4965-8263-634023a29228', 'copy_short', 'b880a3e6d4edbca4a4def855b1e682ea'),
      ('0df07742-78e7-4965-8263-634023a29228', 'copy_medium', 'e33408709bb4ec5963f1684b3f78278f'),
      ('0df07742-78e7-4965-8263-634023a29228', 'copy_long', 'da2f866da23dedd2df1466154c518c60')
    ) as e(id, campo, md5)
    join marketing.affiliate_materials m on m.id = e.id::uuid
   where md5(case e.campo when 'copy_short' then m.copy_short
                          when 'copy_medium' then m.copy_medium
                          else m.copy_long end) = e.md5;
  if n <> 17 then
    raise exception 'Só % dos 17 campos batem byte a byte com o arquivo do steward — o texto gravado não é o texto do patch.', n;
  end if;
end $$;

commit;

-- ═══════════════════════════════════════════════════════════════════════════
-- PROVAS
-- ═══════════════════════════════════════════════════════════════════════════
--   a) GET na edge pública `affiliate-materials-public`: nenhum material devolvido
--      contém "R$", "48,50", "97", "estreia" ou "lançamento" — é o que o afiliado vê;
--   b) os 17 campos batem por md5 com o arquivo (a trava faz; ver o número);
--   c) reversão: metadata->'copy_antes_113' dos 7 tem os textos antigos;
--   d) os 3 materiais fora do patch INTACTOS.
