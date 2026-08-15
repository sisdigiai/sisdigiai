-- ============================================================
-- 072 — mapa real de posse das Páginas nas 9 BMs do Meta
-- ============================================================
-- Levantamento feito no navegador em 2026-08-15, BM por BM, lendo
-- business.facebook.com/latest/settings/pages de cada uma das 9.
--
-- POR QUE ISSO IMPORTA: o inventário anterior gravou o número que aparece no
-- CARD do seletor de BM. Esse número não é o número de Páginas que a BM possui.
-- Em 3 das 9 ele diverge da lista real de configurações:
--   Digiai       card 5 → lista 3
--   Rio Pequeno  card 3 → lista 1
--   Pulso        card 2 → lista 1
-- A hipótese mais provável é o card somar contas do Instagram junto. Não foi
-- confirmada, então as duas contagens ficam registradas — nenhuma foi apagada.
--
-- O QUE MUDA A DECISÃO: "Matriz" não é dona de nenhuma Página. Ela enxerga as 6
-- Páginas das outras BMs por compartilhamento, todas com 0 pessoas. Ou seja, a
-- centralização que parecia existir é só visibilidade, não posse. Consolidar de
-- verdade significa MOVER Páginas entre BMs — o que quebra histórico de pixel e
-- de anúncio. Por isso este mapa vem antes de qualquer decisão de apagar/mesclar.
--
-- Só UPDATE em linhas existentes: `ops.contas_servicos` é a tabela do agente do
-- digiai_mkt (R-032). Nenhuma coluna nova, nenhum `servico` novo, nenhuma linha
-- nova. Colunas conferidas em information_schema antes de escrever.
--
-- WHERE por `empresa_slug` (ASCII) e não por `identificador` (tem acento), para
-- o match não depender de encoding.
--
-- Idempotente: remove o bloco [mapa-paginas] anterior antes de reescrever.
-- ============================================================

WITH mapa(slug, detalhe, bloco) AS (
  VALUES
  ('digiai',
   'Possui 2 Páginas; a 3ª é compartilhada de outra BM',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Próprias: Digiai (1019615814560100, 3 pessoas acesso total) · Óticas Sem Improviso (2 total / 1 parcial).\n' ||
   E'Compartilhada: Mello Óticas — pertence à BM "Oticas Taty Mello".\n' ||
   E'Tem um "Conversions API System User" com acesso total.\n' ||
   E'Card do seletor diz 5 Páginas; configurações listam 3.'),

  ('mello',
   'Dona da Página Mello Óticas; 2 partners externos',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Própria: Mello Óticas (206993829171973, 2 total / 1 parcial).\n' ||
   E'É a BM de origem da Página que aparece compartilhada em Digiai e Matriz.\n' ||
   E'2 partners externos com acesso — não estavam no inventário anterior.'),

  ('pulso',
   'Possui 1 Página, não 2',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Própria: Pulso Projects (926237593895365, 3 pessoas).\n' ||
   E'Card do seletor diz 2 Páginas; configurações listam 1.'),

  ('lancaster',
   'Dona da Página Óticas Lancaster Suzano',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Própria: Óticas Lancaster Suzano (103735828223857), marcada como Página principal da empresa.\n' ||
   E'3 pessoas / 1 parcial / 1 partner.'),

  ('mello-matriz',
   'NÃO é dona de nenhuma Página — só enxerga as 6 das outras BMs',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Nenhuma Página própria. Lista 6, todas marcadas "isto pertence a" outra BM e todas com 0 pessoas:\n' ||
   E'Mello Óticas · São Mateus · Suzano · Rio Pequeno · Perus · Lancaster Suzano.\n' ||
   E'É hub de visibilidade, não de posse. Candidata natural a virar a BM-mãe real\n' ||
   E'OU a ser desativada — decisão depende de para onde vão as contas de anúncio.'),

  ('mello-perus',
   'ALERTA: Meta pede revisão de quem tem acesso à Página',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Própria: Óticas Taty Mello - Perus (116846388095624), Página principal da empresa.\n' ||
   E'3 pessoas / 1 parcial / 1 partner.\n' ||
   E'⚠ A própria Meta sinaliza "Requer análise — necessário analisar as pessoas com\n' ||
   E'acesso à Página do Facebook". É a única das 9 com esse aviso. Tratar primeiro.'),

  ('mello-rio-pequeno',
   'Possui 1 Página, não 3',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Própria: Óticas Taty Mello - Rio Pequeno, Página principal da empresa.\n' ||
   E'2 pessoas / 1 parcial / 1 partner.\n' ||
   E'Card do seletor diz 3 Páginas; configurações listam 1.'),

  ('mello-suzano',
   'Dona da Página Óticas Taty Mello - Suzano',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Própria: Óticas Taty Mello - Suzano, Página principal da empresa.\n' ||
   E'2 pessoas / 1 parcial / 1 partner.'),

  ('mello-sao-mateus',
   'Dona da Página Óticas Taty Mello - São Mateus',
   E'[mapa-paginas 2026-08-15]\n' ||
   E'Própria: Óticas Taty Mello - São Mateus (109483321768582), Página principal da empresa.\n' ||
   E'2 pessoas / 1 parcial / 1 partner.')
)
UPDATE ops.contas_servicos c
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(c.obs, ''), '[mapa-paginas', 1), E'\n '), ''),
      m.bloco),
    ultimo_detalhe = m.detalhe,
    ultima_verificacao = now(),
    updated_at = now()
FROM mapa m
WHERE c.servico = 'meta_bm'
  AND c.empresa_slug = m.slug;

NOTIFY pgrst, 'reload schema';
