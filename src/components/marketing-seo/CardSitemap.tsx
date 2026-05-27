import { Map } from 'lucide-react';
import { MetricCard, MetricStat, EmptyHint } from './MetricCard';
import { useMarketingMetrics } from '../../hooks/useMarketingMetrics';

export function CardSitemap() {
  const { rows } = useMarketingMetrics('sitemap');
  const gscRead = rows.find(r => r.metric_type === 'gsc_last_read');
  const bingRead = rows.find(r => r.metric_type === 'bing_last_read');
  const urlsFound = rows.find(r => r.metric_type === 'urls_discovered');
  const errors = rows.find(r => r.metric_type === 'errors');

  const hasAny = rows.length > 0;

  return (
    <MetricCard
      title="Sitemap Health"
      icon={<Map className="w-4 h-4" />}
      period="última verificação"
      externalUrl="https://digiai.app.br/sitemap-index.xml"
      externalLabel="Abrir sitemap"
    >
      {!hasAny ? (
        <EmptyHint>Sem dados ainda. Sincronize GSC e Bing pra ler estado do sitemap.</EmptyHint>
      ) : (
        <div className="grid grid-cols-2 gap-2">
          <MetricStat
            label="GSC leitura"
            value={gscRead?.value_text ?? '—'}
            hint={gscRead?.collected_at ? new Date(gscRead.collected_at).toLocaleString('pt-BR') : undefined}
          />
          <MetricStat
            label="Bing leitura"
            value={bingRead?.value_text ?? '—'}
            hint={bingRead?.collected_at ? new Date(bingRead.collected_at).toLocaleString('pt-BR') : undefined}
          />
          <MetricStat label="URLs descobertas" value={urlsFound?.value_numeric ?? '—'} />
          <MetricStat label="Erros" value={errors?.value_numeric ?? 0} />
        </div>
      )}
    </MetricCard>
  );
}
