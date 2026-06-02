import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

// Registro data-driven dos sites monitorados (company.seo_sites via view pública).
export type SeoSite = {
  site: string;
  label: string;
  color: string | null;
  gsc_property: string;
  bing_site_url: string;
  cloudflare_zone_id: string | null;
  indexnow_key: string | null;
  github_repo: string | null;
  active: boolean;
  sort_order: number;
};

// Conta Cloudflare Sisdigiai (constante — todas as zonas do ecossistema vivem nela).
const CF_ACCOUNT = '135d7fae19fe4fac099b241fec40fba1';

// URLs externas dos consoles, por site (derivadas do registro — nada hardcoded por domínio).
export const seoUrls = {
  gsc: (s: SeoSite) => `https://search.google.com/search-console?resource_id=${encodeURIComponent(s.gsc_property)}`,
  bing: (s: SeoSite) => `https://www.bing.com/webmasters/home/mysites?siteUrl=${encodeURIComponent(s.bing_site_url + '/')}`,
  bingBacklinks: (s: SeoSite) => `https://www.bing.com/webmasters/backlinks?siteUrl=${encodeURIComponent(s.bing_site_url + '/')}`,
  cloudflare: (s: SeoSite) => `https://dash.cloudflare.com/${CF_ACCOUNT}/${s.site}/analytics/traffic`,
  sitemap: (s: SeoSite) => `https://${s.site}/sitemap-index.xml`,
  indexnow: (s: SeoSite) => (s.github_repo ? `https://github.com/${s.github_repo}/actions` : '#'),
};

export function useSeoSites() {
  const [sites, setSites] = useState<SeoSite[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    supabase
      .from('v_seo_sites')
      .select('site, label, color, gsc_property, bing_site_url, cloudflare_zone_id, indexnow_key, github_repo, active, sort_order')
      .then(({ data }) => {
        if (!alive) return;
        const list = ((data ?? []) as SeoSite[]).sort((a, b) => a.sort_order - b.sort_order);
        setSites(list);
        setLoading(false);
      });
    return () => { alive = false; };
  }, []);

  return { sites, loading };
}
