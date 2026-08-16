-- ============================================================
-- 074 — pixels, Instagram, parceiros e usuários de sistema das 9 BMs
-- ============================================================
-- Terceira e última passada do levantamento de 2026-08-15, cobrindo as camadas
-- que faltavam: conjuntos de dados/pixels, contas do Instagram, parceiros e
-- usuários de sistema, BM por BM.
--
-- O ACHADO MAIS GRAVE: existem 5 pixels e SÓ UM RECEBE DADOS.
--   OSI Landing (BM Digiai) ............. coleta ok
--   landing_page (BM Mello) ............. "Não há dados conectados"
--   pixel_landing_page .................. "Não há dados conectados"
--   Pixel de OTM_TOTAL (BM Matriz) ...... "Não há dados conectados"
--   pixel_lancaster ..................... "Não há dados conectados"
-- Ou seja: toda a medição de Mello e Lancaster está morta. Não é que converte
-- pouco — é que não chega evento nenhum. Qualquer decisão de anúncio para essas
-- lojas hoje é feita às cegas, e público personalizado/remarketing não existe.
-- Isso precisa ser confirmado no gerenciador de eventos antes de virar tarefa,
-- porque "sem dados conectados" também aparece em pixel novo que nunca disparou.
--
-- SEGUNDO ACHADO — acesso externo: a BM Oticas Taty Mello tem 4 parceiros:
-- Digiai e Matriz (esperados) + Automattic e "Solutions Engineering Team"
-- (NÃO esperados). Os dois externos alcançam também o @melloticas, que mostra
-- 2 partners. Não foi removido nada: derrubar parceiro pode quebrar integração
-- em uso (Automattic é a empresa do WordPress/WooCommerce, plausível de estar
-- ligada ao e-commerce). Decisão do dono.
--
-- TERCEIRO — pixel_lancaster está com "Solicitação pendente" na Matriz.
--
-- QUARTO — o token de longa duração tem origem: a BM Digiai já tem um usuário de
-- sistema "Conversions API System User" (61590390399194), com acesso total. É de
-- lá que sai um token com business_management para o inventário se atualizar
-- sozinho, em vez dos 3 META_* guardados hoje, que são app secrets de 64 caracteres
-- e a Graph API rejeita.
--
-- Instagram: 9 contas, uma por BM, sem sobreposição —
-- @_digiai · @oticasemimproviso · @melloticas · @pulsoprojects ·
-- @oticaslancastersuzano · @oticastatymelloperus · @oticastatymelloriopequeno ·
-- @oticastatymellosuzano · @oticastatymellosaomateus
--
-- Usuários de sistema: só a BM Digiai tem. As outras 8 não têm nenhum.
--
-- Só UPDATE em linhas existentes (R-032). Idempotente pelo marcador [mapa-extra].
-- ============================================================

WITH mapa(slug, bloco) AS (
  VALUES
  ('digiai',
   E'[mapa-extra 2026-08-15] Pixel: OSI Landing (Meta Pixel) — único do grupo que coleta.\n' ||
   E'Instagram: @_digiai, @oticasemimproviso, + @melloticas emprestado da BM Mello.\n' ||
   E'Parceiro: Oticas Taty Mello. Usuário de sistema: Conversions API System User (61590390399194),\n' ||
   E'acesso total — origem indicada para o token de longa duração com business_management.'),

  ('mello',
   E'[mapa-extra 2026-08-15] Pixels: landing_page e pixel_landing_page — ambos SEM DADOS CONECTADOS.\n' ||
   E'Instagram: @melloticas (2 pessoas, 2 partners). WhatsApp: nenhuma conta.\n' ||
   E'⚠ 4 parceiros: Digiai e Matriz (esperados) + Automattic e "Solutions Engineering Team" (externos).\n' ||
   E'Os externos alcançam o @melloticas. Não removidos — pode haver integração em uso.'),

  ('pulso',
   E'[mapa-extra 2026-08-15] Nenhum pixel. Instagram: @pulsoprojects (2 pessoas parciais).\n' ||
   E'Coerente com operação 100% orgânica: sem conta de anúncio e sem medição.'),

  ('lancaster',
   E'[mapa-extra 2026-08-15] Pixel: pixel_lancaster — SEM DADOS CONECTADOS.\n' ||
   E'Instagram: @oticaslancastersuzano (2 pessoas, 2 partners).'),

  ('mello-matriz',
   E'[mapa-extra 2026-08-15] 3 pixels, TODOS sem dados conectados: Pixel de OTM_TOTAL,\n' ||
   E'pixel_landing_page e pixel_lancaster (este com "Solicitação pendente").\n' ||
   E'Instagram: só emprestados (@melloticas da BM Mello, @oticaslancastersuzano da Lancaster).\n' ||
   E'Parceira das 6 BMs de loja — é ela que amarra o grupo. Nenhum usuário de sistema.'),

  ('mello-perus',
   E'[mapa-extra 2026-08-15] Nenhum pixel. Instagram: @oticastatymelloperus (1 pessoa, 2 parciais).'),

  ('mello-rio-pequeno',
   E'[mapa-extra 2026-08-15] Nenhum pixel. Instagram: @oticastatymelloriopequeno (3 pessoas parciais).'),

  ('mello-suzano',
   E'[mapa-extra 2026-08-15] Nenhum pixel. Instagram: @oticastatymellosuzano (1 pessoa, 2 parciais).'),

  ('mello-sao-mateus',
   E'[mapa-extra 2026-08-15] Nenhum pixel. Instagram: @oticastatymellosaomateus (1 pessoa, 2 parciais).\n' ||
   E'Tem 2 contas de anúncio próprias e nenhum pixel: gasta sem medir.')
)
UPDATE ops.contas_servicos c
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(c.obs, ''), '[mapa-extra', 1), E'\n '), ''),
      m.bloco),
    ultima_verificacao = now(),
    updated_at = now()
FROM mapa m
WHERE c.servico = 'meta_bm'
  AND c.empresa_slug = m.slug;

-- O pixel OSI Landing já tem linha própria (servico = meta_pixel). Registra que
-- ele é o único com coleta viva entre os 5 encontrados.
UPDATE ops.contas_servicos
SET ultimo_detalhe = 'Único dos 5 pixels do grupo com dados conectados (conferido 2026-08-15)',
    ultima_verificacao = now(),
    updated_at = now()
WHERE servico = 'meta_pixel'
  AND identificador = '1010582578011237';

NOTIFY pgrst, 'reload schema';
