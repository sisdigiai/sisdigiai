-- ============================================================
-- 070 — mellooticas.com.br entra no registro de sites de SEO
-- ============================================================
-- O e-commerce da Mello Oticas passa a viver sob o guarda-chuva DIGIAI. O
-- dominio ja esta no Cloudflare (conta sisdigiai), verificado no Google Search
-- Console como propriedade de dominio e importado no Bing, ambos na conta
-- sisdigiai@gmail.com. Sitemap enviado nos dois. Hospedagem no Netlify.
--
-- Schema conferido em 029_seo_multisite.sql antes de escrever: todas as colunas
-- abaixo existem, nenhuma inventada. sort_order 3 = proximo livre (digiai=1,
-- clearix=2).
--
-- Upsert por `site` (chave primaria): rodar de novo atualiza, nao duplica.
-- ============================================================

INSERT INTO company.seo_sites (
  site, label, color, gsc_property, bing_site_url,
  cloudflare_zone_id, indexnow_key, github_repo, sort_order, active
) VALUES (
  'mellooticas.com.br',
  'Mello Óticas',
  '#1C3B5A',                                   -- navy oficial da marca
  'sc-domain:mellooticas.com.br',
  'https://mellooticas.com.br/',
  '138436f1a52ad7538786fa4a574dd54f',
  'ba2e2d76dfd07b16091e9fab2716f464',
  'mellooticas/melloeyewear',
  3,
  true
)
ON CONFLICT (site) DO UPDATE SET
  label              = EXCLUDED.label,
  color              = EXCLUDED.color,
  gsc_property       = EXCLUDED.gsc_property,
  bing_site_url      = EXCLUDED.bing_site_url,
  cloudflare_zone_id = EXCLUDED.cloudflare_zone_id,
  indexnow_key       = EXCLUDED.indexnow_key,
  github_repo        = EXCLUDED.github_repo,
  sort_order         = EXCLUDED.sort_order,
  active             = EXCLUDED.active,
  updated_at         = now();

NOTIFY pgrst, 'reload schema';
