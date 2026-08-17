-- ============================================================
-- 078 — medições de SEO: onde o número mora, e o diagnóstico junto
-- ============================================================
-- `company.seo_sites` guarda CONFIGURAÇÃO (propriedade GSC, Bing, zona, sitemap).
-- Não existia lugar para guardar MEDIÇÃO. Consequência prática: os números que eu
-- levantei no Search Console em 17/08 só existiam no `obs` de uma linha de
-- inventário e na conversa. Dado conferido sem lugar de morar envelhece em segredo
-- — foi assim que o SEO passou semanas parecendo morto quando estava só invisível.
--
-- Duas decisões de desenho:
--
-- 1. HISTÓRICO, NÃO ÚLTIMO VALOR. A tabela guarda uma linha por medição, não um
--    campo mutável em `seo_sites`. SEO se julga por tendência: 2 cliques hoje só
--    significa algo comparado a 2 cliques no mês passado. Campo sobrescrito não
--    responde "melhorou?".
--
-- 2. O DIAGNÓSTICO É DERIVADO NA VIEW, NÃO DIGITADO. Três sintomas distintos que
--    pedem trabalhos distintos, e confundi-los custa dinheiro:
--      · posição boa + CTR baixo  → título/descrição não convidam ao clique
--      · posição ruim              → ranking; mexer em CTR não serve para nada
--      · sitemap minúsculo         → cobertura; nem chegou a competir
--    Deixar isso como texto livre convidaria a escrever "melhorar SEO", que não é
--    tarefa. Derivado, a tela diz qual das três coisas fazer.
--
-- A `indexnow_key` NÃO entra na view nova. Ela já é exposta pela `v_seo_sites`
-- existente, o que dá a qualquer usuário `authenticated` uma chave de submissão de
-- indexação — vale revisar, mas mexer na view de outro contexto não é assunto desta
-- migration. Registrado para não passar em branco.
-- ============================================================

CREATE TABLE IF NOT EXISTS company.seo_medicoes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  site             text NOT NULL REFERENCES company.seo_sites(site) ON DELETE CASCADE,
  medido_em        date NOT NULL DEFAULT current_date,
  janela           text NOT NULL DEFAULT '3m',
  paginas_sitemap  integer,
  sitemap_url      text,
  sitemap_lido_em  date,
  cliques          integer,
  impressoes       integer,
  posicao_media    numeric(5,1),
  ctr              numeric(5,2),
  fonte            text NOT NULL DEFAULT 'gsc-navegador',
  obs              text,
  created_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (site, medido_em, janela)
);

COMMENT ON TABLE company.seo_medicoes IS
  'Histórico de medições de SEO por site. Uma linha por leitura; nunca sobrescrever para preservar tendência.';
COMMENT ON COLUMN company.seo_medicoes.janela IS
  'Janela da medição no painel de origem. "3m" = padrão do Search Console.';
COMMENT ON COLUMN company.seo_medicoes.fonte IS
  'Como o número foi obtido: gsc-navegador (leitura manual), gsc-api, bing.';

-- Semeia a medição de 17/08/2026, lida no Search Console (conta sisdigiai@gmail.com),
-- propriedade por propriedade. Números conferidos na tela, não estimados.
INSERT INTO company.seo_medicoes
  (site, medido_em, janela, paginas_sitemap, sitemap_url, sitemap_lido_em,
   cliques, impressoes, posicao_media, ctr, fonte, obs)
VALUES
  ('digiai.app.br', '2026-08-17', '3m', 15,
   'https://digiai.app.br/sitemap-index.xml', '2026-08-13',
   2, 281, 8.2, 0.70, 'gsc-navegador',
   'Primeira página com CTR de 0,7%: o problema é título/descrição, não ranking.'),

  ('clearix.app.br', '2026-08-17', '3m', 5,
   'https://clearix.app.br/sitemap-index.xml', '2026-08-14',
   2, 33, 26.2, 6.10, 'gsc-navegador',
   'Produto-âncora com 5 páginas e posição 26. Cobertura vem antes de ranking: com 5 páginas não se perde a corrida, não se entra nela.'),

  ('mellooticas.com.br', '2026-08-17', '3m', 6,
   'https://mellooticas.com.br/sitemap.xml', '2026-08-16',
   0, 16, 14.3, 0.00, 'gsc-navegador',
   'E-commerce com 6 páginas no sitemap: catálogo não indexado. Maior potencial e o mais barato de corrigir.')
ON CONFLICT (site, medido_em, janela) DO UPDATE SET
  paginas_sitemap = EXCLUDED.paginas_sitemap,
  sitemap_url     = EXCLUDED.sitemap_url,
  sitemap_lido_em = EXCLUDED.sitemap_lido_em,
  cliques         = EXCLUDED.cliques,
  impressoes      = EXCLUDED.impressoes,
  posicao_media   = EXCLUDED.posicao_media,
  ctr             = EXCLUDED.ctr,
  obs             = EXCLUDED.obs;

-- ── Estado atual por site: config + última medição + diagnóstico + tendência ──
CREATE OR REPLACE VIEW public.v_seo_estado
WITH (security_invoker = true) AS
WITH ultima AS (
  SELECT DISTINCT ON (site) *
  FROM company.seo_medicoes
  ORDER BY site, medido_em DESC, created_at DESC
),
anterior AS (
  SELECT DISTINCT ON (m.site) m.*
  FROM company.seo_medicoes m
  JOIN ultima u ON u.site = m.site
  WHERE m.medido_em < u.medido_em
  ORDER BY m.site, m.medido_em DESC
)
SELECT
  s.site,
  s.label,
  s.color,
  s.gsc_property,
  s.bing_site_url IS NOT NULL              AS tem_bing,
  s.cloudflare_zone_id IS NOT NULL         AS tem_cloudflare,
  s.github_repo,
  s.sort_order,
  u.medido_em,
  u.janela,
  u.paginas_sitemap,
  u.sitemap_url,
  u.sitemap_lido_em,
  current_date - u.sitemap_lido_em         AS dias_desde_leitura,
  u.cliques,
  u.impressoes,
  u.posicao_media,
  u.ctr,
  u.obs,
  a.cliques      AS cliques_antes,
  a.impressoes   AS impressoes_antes,
  a.posicao_media AS posicao_antes,
  a.medido_em    AS medido_antes_em,
  -- Diagnóstico: qual dos três trabalhos esse site pede. Ordem importa —
  -- não faz sentido falar de CTR onde ninguém vê, nem de ranking onde não há página.
  CASE
    WHEN u.medido_em IS NULL                         THEN 'sem medicao'
    WHEN coalesce(u.paginas_sitemap, 0) < 10         THEN 'cobertura'
    WHEN u.posicao_media > 20                        THEN 'ranking'
    WHEN u.posicao_media <= 10 AND coalesce(u.ctr,0) < 2 THEN 'ctr'
    WHEN coalesce(u.impressoes, 0) = 0               THEN 'sem impressao'
    ELSE 'saudavel'
  END AS diagnostico,
  -- Sitemap sem leitura recente é falha de infraestrutura, independente do resto.
  (u.sitemap_lido_em IS NULL OR current_date - u.sitemap_lido_em > 7) AS sitemap_frio
FROM company.seo_sites s
LEFT JOIN ultima u   ON u.site = s.site
LEFT JOIN anterior a ON a.site = s.site
WHERE s.active
ORDER BY s.sort_order;

REVOKE ALL ON public.v_seo_estado FROM anon;
GRANT SELECT ON public.v_seo_estado TO authenticated;

REVOKE ALL ON company.seo_medicoes FROM anon;
GRANT SELECT ON company.seo_medicoes TO authenticated;

NOTIFY pgrst, 'reload schema';
