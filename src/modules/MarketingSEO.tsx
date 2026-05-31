import { ExternalLink } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { CardGSC } from '../components/marketing-seo/CardGSC';
import { CardBing } from '../components/marketing-seo/CardBing';
import { CardCloudflare } from '../components/marketing-seo/CardCloudflare';
import { CardSitemap } from '../components/marketing-seo/CardSitemap';
import { CardBacklinks } from '../components/marketing-seo/CardBacklinks';
import { CardIndexNow } from '../components/marketing-seo/CardIndexNow';

export default function MarketingSEO() {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="SEO & Conteúdo"
        title="Marketing & SEO"
        subtitle={
          <>
            Observabilidade do site institucional <a
              href="https://digiai.app.br"
              target="_blank"
              rel="noopener noreferrer"
              className="text-secondary hover:underline inline-flex items-center gap-1"
            >digiai.app.br <ExternalLink className="w-3 h-3" /></a>
          </>
        }
      >
        <div className="text-[11px] font-mono text-muted uppercase tracking-widest mt-4">
          Fontes: Google Search Console · Bing Webmaster · Cloudflare Analytics · IndexNow
        </div>
      </PageHeader>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardGSC />
        <CardBing />
        <CardCloudflare />
        <CardSitemap />
        <CardBacklinks />
        <CardIndexNow />
      </div>

      <footer className="mt-8 pt-6 border-t border-outline/10 text-xs text-muted space-y-2">
        <div>
          Setup de credenciais: <code className="font-mono">docs/setup-gsc-oauth.md</code> · <code className="font-mono">docs/setup-bing-api-key.md</code> · <code className="font-mono">docs/setup-cloudflare-api-token.md</code>
        </div>
        <div>
          Cache via tabela <code className="font-mono">company.metrics</code>. Sincronização autom&aacute;tica via cron <code className="font-mono">marketing-sync-daily</code> (09:00 UTC / 06:00 BRT). Bot&atilde;o &laquo;Sincronizar&raquo; em cada card dispara on-demand.
        </div>
      </footer>
    </div>
  );
}
