import { Link2 } from 'lucide-react';
import { MetricCard, MetricStat, EmptyHint } from './MetricCard';
import { useMarketingMetrics } from '../../hooks/useMarketingMetrics';
import { type SeoSite, seoUrls } from '../../hooks/useSeoSites';

export function CardBacklinks({ site }: { site: SeoSite }) {
  const { rows } = useMarketingMetrics('bing', site.site);
  const total = rows.find(r => r.metric_type === 'backlinks_total');
  const referrers = rows.filter(r => r.metric_type === 'top_referrer').slice(0, 10);

  const hasAny = !!total || referrers.length > 0;

  return (
    <MetricCard
      title="Backlinks"
      icon={<Link2 className="w-4 h-4" />}
      period="all time"
      externalUrl={seoUrls.bingBacklinks(site)}
      externalLabel="Abrir relatório Bing"
    >
      {!hasAny ? (
        <EmptyHint>Sem dados ainda. Bing reporta backlinks após algumas semanas de indexação.</EmptyHint>
      ) : (
        <div className="space-y-3">
          <MetricStat label="Total de backlinks" value={total?.value_numeric ?? '—'} />
          {referrers.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">Top referrers</div>
              <ul className="space-y-1">
                {referrers.map(r => (
                  <li key={r.id} className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant truncate">{r.metric_key}</span>
                    <span className="font-mono tabular-nums text-on-surface-variant shrink-0 ml-2">{r.value_numeric}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </MetricCard>
  );
}
