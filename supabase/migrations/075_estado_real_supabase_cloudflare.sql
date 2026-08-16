-- ============================================================
-- 075 — estado real dos projetos Supabase e das zonas Cloudflare
-- ============================================================
-- Levantamento de 2026-08-16 pela Management API do Supabase e pela API do
-- Cloudflare — não pelo painel, então é o estado que a plataforma reporta.
--
-- A CORREÇÃO QUE MAIS IMPORTA: o inventário registrava que o nexus está INACTIVE
-- por "teto de 2 projetos ativos". A org `sisdigiai's Org` está no plano **pro**,
-- que não tem esse teto — e hoje há 3 projetos ativos ao mesmo tempo (digiai,
-- gj_pessoal, lumina_box), o que por si só derruba a hipótese do teto.
-- Consequência prática: o nexus não está impedido de voltar. Ele está pausado, e
-- religar é decisão de custo do dono, não uma barreira técnica. Como o nexus é a
-- entrega do OSI (Universidade), isso muda de "bloqueado" para "aguardando ok".
-- Não religuei: subir projeto em plano pago tem custo, e custo é decisão humana.
--
-- Projetos visíveis com o token guardado em digiai/.env (org sisdigiai, 5 de 10):
--   digiai        hswyopqvnolqpmprqvzh  ACTIVE_HEALTHY  sa-east-1
--   gj_pessoal    xfkcqrlovqbcriiksxng  ACTIVE_HEALTHY  sa-east-1
--   lumina_box    siinufinhffynevhydgu  ACTIVE_HEALTHY  sa-east-1
--   easy_idiomas  nrrkcfxcqnvvhhamhrqf  INACTIVE        sa-east-1
--   nexus         tkbhhbzhlqsgcwljeesg  INACTIVE        us-west-2
--
-- Os outros 5 do inventário (Clearix, pulso, limelight, nipo, tgjphotos) estão em
-- outras contas e este token não os alcança. Isso é achado, não falha: o inventário
-- cobre 2+ contas Supabase e não existe uma credencial única que veja todas.
--
-- lumina_box aparecia como "desconhecido" no inventário — está ACTIVE_HEALTHY.
-- nexus está em us-west-2 enquanto todo o resto está em sa-east-1: latência extra
-- para usuário brasileiro, relevante se ele voltar a servir a Universidade.
--
-- Cloudflare: 3 zonas, todas active, todas Free — clearix.app.br, digiai.app.br,
-- mellooticas.com.br. Batem 1:1 com company.seo_sites. Nenhum domínio órfão.
--
-- Só UPDATE em linhas existentes (R-032). Idempotente pelo marcador [estado-real].
-- ============================================================

WITH estado(ref, det, bloco) AS (
  VALUES
  ('tkbhhbzhlqsgcwljeesg',
   'INACTIVE — mas NÃO por teto de projetos; a org é pro. Religar é decisão de custo.',
   E'[estado-real 2026-08-16] nexus · INACTIVE · us-west-2.\n' ||
   E'A nota anterior dizia "teto de 2 projetos ativos" — incorreta: a org sisdigiai está\n' ||
   E'no plano pro e hoje roda 3 projetos ativos simultâneos. Não há teto impedindo.\n' ||
   E'Portanto a entrega do OSI (Universidade) não está tecnicamente bloqueada: está\n' ||
   E'aguardando o dono aprovar o custo de religar. Único projeto fora de sa-east-1.'),

  ('nrrkcfxcqnvvhhamhrqf',
   'INACTIVE confirmado pela API em 2026-08-16',
   E'[estado-real 2026-08-16] easy_idiomas · INACTIVE · sa-east-1. Confirmado sem uso.'),

  ('siinufinhffynevhydgu',
   'ACTIVE_HEALTHY — sai de "desconhecido"',
   E'[estado-real 2026-08-16] lumina_box · ACTIVE_HEALTHY · sa-east-1.\n' ||
   E'O inventário marcava status desconhecido; a API confirma saudável e no ar.'),

  ('hswyopqvnolqpmprqvzh',
   'ACTIVE_HEALTHY',
   E'[estado-real 2026-08-16] digiai · ACTIVE_HEALTHY · sa-east-1. Banco central.'),

  ('xfkcqrlovqbcriiksxng',
   'ACTIVE_HEALTHY',
   E'[estado-real 2026-08-16] gj_pessoal · ACTIVE_HEALTHY · sa-east-1.'),

  ('zlfyxndjpdwbbxuypova',
   'Fora do alcance do token; prazo de restauração venceu em 03/08',
   E'[estado-real 2026-08-16] Não visível pelo token da org sisdigiai — está na conta\n' ||
   E'tgjphotos. O prazo de restauração anotado era 03/08 e já passou 13 dias.\n' ||
   E'Só o dono consegue conferir se ainda dá para recuperar. Não foi possível verificar daqui.'),

  ('tqlwkgiytdikumtcnizf',
   'Fora do alcance do token da org sisdigiai',
   E'[estado-real 2026-08-16] Não visível por este token — conta niposchool-design.'),

  ('mhgbuplnxtfgipbemchb',
   'Fora do alcance do token da org sisdigiai',
   E'[estado-real 2026-08-16] Não visível por este token — org Clearix, conta separada.'),

  ('nlcisbfdiokmipyihtuz',
   'Fora do alcance do token da org sisdigiai',
   E'[estado-real 2026-08-16] Não visível por este token — org pulso.'),

  ('gfdpvasbrxwulvpvyfvr',
   'Fora do alcance do token da org sisdigiai',
   E'[estado-real 2026-08-16] Não visível por este token — org pulso (limelight).')
)
UPDATE ops.contas_servicos c
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(c.obs, ''), '[estado-real', 1), E'\n '), ''),
      e.bloco),
    ultimo_detalhe = e.det,
    ultima_verificacao = now(),
    updated_at = now()
FROM estado e
WHERE c.servico = 'supabase'
  AND c.identificador = e.ref;

UPDATE ops.contas_servicos
SET obs = concat_ws(E'\n',
      NULLIF(rtrim(split_part(coalesce(obs, ''), '[estado-real', 1), E'\n '), ''),
      E'[estado-real 2026-08-16] 3 zonas, todas active e no plano Free: clearix.app.br,\n' ||
      E'digiai.app.br, mellooticas.com.br. Batem 1:1 com company.seo_sites — nenhum domínio órfão.'),
    ultimo_detalhe = '3 zonas ativas, conferidas pela API',
    ultima_verificacao = now(),
    updated_at = now()
WHERE servico = 'cloudflare';

NOTIFY pgrst, 'reload schema';
