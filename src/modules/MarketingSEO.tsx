import { useEffect, useState } from 'react';
import { ExternalLink } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { CardGSC } from '../components/marketing-seo/CardGSC';
import { CardBing } from '../components/marketing-seo/CardBing';
import { CardCloudflare } from '../components/marketing-seo/CardCloudflare';
import { CardSitemap } from '../components/marketing-seo/CardSitemap';
import { CardBacklinks } from '../components/marketing-seo/CardBacklinks';
import { CardIndexNow } from '../components/marketing-seo/CardIndexNow';
import { useSeoSites, type SeoSite } from '../hooks/useSeoSites';

export default function MarketingSEO() {
  const { sites, loading } = useSeoSites();
  const [activeSite, setActiveSite] = useState<string | null>(null);

  useEffect(() => {
    if (!activeSite && sites.length) setActiveSite(sites[0].site);
  }, [sites, activeSite]);

  const current: SeoSite | undefined = sites.find(s => s.site === activeSite) ?? sites[0];

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="SEO & Conteúdo"
        title="Marketing & SEO"
        subtitle={
          current ? (
            <>
              Centro de controle de SEO por domínio · observando{' '}
              <a
                href={`https://${current.site}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-secondary hover:underline inline-flex items-center gap-1"
              >{current.site} <ExternalLink className="w-3 h-3" /></a>
            </>
          ) : 'Carregando domínios…'
        }
      >
        <div className="text-[11px] font-mono text-muted uppercase tracking-widest mt-4">
          Fontes: Google Search Console · Bing Webmaster · Cloudflare Analytics · IndexNow
        </div>
      </PageHeader>

      {sites.length > 0 && (
        <div className="flex items-center gap-1 border-b border-outline/10 mb-6 overflow-x-auto">
          {sites.map(s => {
            const on = s.site === current?.site;
            return (
              <button
                key={s.site}
                onClick={() => setActiveSite(s.site)}
                className={`relative px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                  on ? 'text-on-surface' : 'text-muted hover:text-on-surface-variant'
                }`}
              >
                <span className="inline-flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: s.color ?? '#6b7280' }} />
                  {s.label}
                  <span className="font-mono text-[10px] text-muted hidden sm:inline">{s.site}</span>
                </span>
                {on && <span className="absolute left-0 right-0 -bottom-px h-0.5" style={{ background: s.color ?? '#6b7280' }} />}
              </button>
            );
          })}
        </div>
      )}

      {!current ? (
        <div className="text-sm text-muted">
          {loading ? 'Carregando domínios…' : 'Nenhum site cadastrado em company.seo_sites.'}
        </div>
      ) : (
        <div key={current.site} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <CardGSC site={current} />
          <CardBing site={current} />
          <CardCloudflare site={current} />
          <CardSitemap site={current} />
          <CardBacklinks site={current} />
          <CardIndexNow site={current} />
        </div>
      )}

      <footer className="mt-8 pt-6 border-t border-outline/10 text-xs text-muted space-y-2">
        <div>
          Domínios monitorados em <code className="font-mono">company.seo_sites</code> · adicionar outro = 1 INSERT (sem deploy).
          Setup de credenciais: <code className="font-mono">docs/setup-gsc-oauth.md</code> · <code className="font-mono">docs/setup-bing-api-key.md</code> · <code className="font-mono">docs/setup-cloudflare-api-token.md</code>
        </div>
        <div>
          Cache por (site · fonte) na tabela <code className="font-mono">company.metrics</code>. Sincroniza&ccedil;&atilde;o autom&aacute;tica via cron <code className="font-mono">marketing-sync-daily</code> (09:00 UTC / 06:00 BRT) cobre todos os sites ativos. Bot&atilde;o &laquo;Sincronizar&raquo; em cada card dispara o site da aba atual.
        </div>
      </footer>
    </div>
  );
}
