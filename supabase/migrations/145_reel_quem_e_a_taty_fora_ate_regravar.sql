-- 145 — Central de Materiais da OSI: reel "Quem é a Taty" sai do ar até regravar, e o roteiro fica sem afirmação sem fato
--
-- ✔ APLICADA em 17/09/2026 às 13:24:27 BRT, com a palavra do dono neste canal ("pode corrigir tudo"), reensaiada antes.
--   Medido depois: edge affiliate-materials-public serve 9 materiais, sem o reel da Taty, 0× "40 anos", 0× "90 dias".
--
-- (Escrita como NÃO APLICADA.)
-- ⛔ NÃO APLICADA (escrita às 13:2x de 17/09). Palavra do dono neste canal, 17/09: "pode corrigir tudo".
--
-- DE ONDE VEM: drift achado pela OSI e repassado pelo Orquestrador Geral: o ÁUDIO do reel reel_quem_e_taty.mp4 diz
--   "40 anos no balcão"; o fato é 25 (mkt.fatos osi_taty_anos_balcao, migration 136).
--
-- MEDIDO ANTES (17/09 13:2x BRT), marketing.affiliate_materials 7597587b-72d1-4c81-95ef-5681de505881:
--   • ativo, não apagado; copy_short e copy_medium já dizem "25 anos de balcão" — certos;
--   • o "40" está só no áudio do .mp4, arquivo da landing da OSI (art_urls/preview_url) — não é dado deste banco;
--   • copy_long (roteiro) afirma "Atendeu literalmente milhares de clientes — e foi de balcão a referência interna em
--     vendas e treinamento": nenhum fato sustenta "milhares de clientes" nem "referência interna".
--
-- O QUE MUDA:
--   • is_active = false: a Central (edge affiliate-materials-public, que lista só ativos) para de servir o vídeo com
--     "40 anos". Não apaga: a linha volta quando a OSI trocar o .mp4 (reativar = nova migration ou tela, com a prova do
--     arquivo novo).
--   • copy_long = o texto revisto de 34 palavras da OSI (sem número fora de fato, sem "milhares").
--   • notes registra o porquê e a condição para voltar.

begin;

do $$
begin
  if not exists (select 1 from marketing.affiliate_materials
                  where id = '7597587b-72d1-4c81-95ef-5681de505881' and is_active and deleted_at is null
                    and md5(concat_ws('|', copy_short, copy_medium, copy_long)) = 'f78c7d2622811d92ba6bca7403297f52') then
    raise exception 'o reel da Taty mudou desde a medicao de 17/09 (ou ja saiu do ar) — conferir antes.';
  end if;
end $$;

update marketing.affiliate_materials
   set is_active = false,
       copy_long = 'Quem é a Taty? Ela tem 25 anos de balcão na Mello Óticas. Hoje colocou o que aprendeu num manual prático, o Ótica Sem Improviso. Conhece? O método dela está no link da bio.',
       notes = concat_ws(E'\n', notes,
         'Fora do ar desde 17/09/2026 (migration 145): o áudio do reel_quem_e_taty.mp4 diz "40 anos no balcão"; o fato é 25 (osi_taty_anos_balcao). Volta quando a OSI trocar o arquivo por uma gravação com 25, com prova do áudio novo. Roteiro trocado pelo texto revisto da OSI (sem "milhares de clientes" nem "referência interna", que não têm fato).'),
       updated_at = now()
 where id = '7597587b-72d1-4c81-95ef-5681de505881';

do $$
begin
  if exists (select 1 from marketing.affiliate_materials where id = '7597587b-72d1-4c81-95ef-5681de505881' and is_active) then
    raise exception 'o reel continua ativo.';
  end if;
  if exists (select 1 from marketing.affiliate_materials
              where is_active and deleted_at is null
                and concat_ws(' ', title, description, copy_short, copy_medium, copy_long) ~* '(40 anos|milhares de clientes|referência interna)') then
    raise exception 'material ativo com "40 anos", "milhares de clientes" ou "referência interna".';
  end if;
  if not exists (select 1 from marketing.affiliate_materials where id = '7597587b-72d1-4c81-95ef-5681de505881'
                   and copy_long like 'Quem é a Taty? Ela tem 25 anos de balcão na Mello Óticas.%link da bio.')
  or exists (select 1 from marketing.affiliate_materials where copy_long like '%' || chr(65533) || '%') then
    raise exception 'copy_long nao ficou com o texto revisto (ou acento quebrado).';
  end if;
end $$;

commit;
