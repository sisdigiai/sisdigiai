import { Megaphone, ExternalLink } from 'lucide-react';
import { CardGSC } from '../components/marketing-seo/CardGSC';
import { CardBing } from '../components/marketing-seo/CardBing';
import { CardCloudflare } from '../components/marketing-seo/CardCloudflare';
import { CardSitemap } from '../components/marketing-seo/CardSitemap';
import { CardBacklinks } from '../components/marketing-seo/CardBacklinks';
import { CardIndexNow } from '../components/marketing-seo/CardIndexNow';

export default function MarketingSEO() {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-lg bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center">
            <Megaphone className="w-5 h-5 text-[#06B6D4]" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold text-white">Marketing & SEO</h1>
            <p className="text-sm text-white/50">
              Observabilidade do site institucional <a
                href="https://digiai.app.br"
                target="_blank"
                rel="noopener noreferrer"
                className="text-[#06B6D4] hover:underline inline-flex items-center gap-1"
              >digiai.app.br <ExternalLink className="w-3 h-3" /></a>
            </p>
          </div>
        </div>
        <div className="text-[11px] font-mono text-white/30 uppercase tracking-widest">
          Fontes: Google Search Console · Bing Webmaster · Cloudflare Analytics · IndexNow
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <CardGSC />
        <CardBing />
        <CardCloudflare />
        <CardSitemap />
        <CardBacklinks />
        <CardIndexNow />
      </div>

      <footer className="mt-8 pt-6 border-t border-white/5 text-xs text-white/40 space-y-2">
        <div>
          Setup de credenciais: <code className="font-mono">docs/setup-gsc-oauth.md</code> · <code className="font-mono">docs/setup-bing-api-key.md</code> · <code className="font-mono">docs/setup-cloudflare-api-token.md</code>
        </div>
        <div>
          Cache via tabela <code className="font-mono">company.metrics</code>. Sincronização sob demanda via edge functions <code className="font-mono">marketing-sync-*</code> (cron diário em V2).
        </div>
      </footer>
    </div>
  );
}
