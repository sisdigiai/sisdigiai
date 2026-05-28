import { Cloud } from 'lucide-react';
import { MetricCard, MetricStat, EmptyHint } from './MetricCard';
import { useMarketingMetrics } from '../../hooks/useMarketingMetrics';

function formatBytes(n: number | null | undefined): string {
  if (n == null) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 ** 2) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 ** 3) return `${(n / 1024 ** 2).toFixed(1)} MB`;
  return `${(n / 1024 ** 3).toFixed(2)} GB`;
}

export function CardCloudflare() {
  const { rows, refetch } = useMarketingMetrics('cloudflare');
  const requests24h = rows.find(r => r.metric_type === 'requests' && r.period === '24h')?.value_numeric;
  const requests7d = rows.find(r => r.metric_type === 'requests' && r.period === '7d')?.value_numeric;
  const bandwidth7d = rows.find(r => r.metric_type === 'bandwidth' && r.period === '7d')?.value_numeric;
  const threats7d = rows.find(r => r.metric_type === 'threats' && r.period === '7d')?.value_numeric;
  const sslStatus = rows.find(r => r.metric_type === 'ssl_status')?.value_text;
  const topCountries = rows.filter(r => r.metric_type === 'top_country' && r.period === '7d').slice(0, 5);

  const hasAny = rows.length > 0;

  return (
    <MetricCard
      title="Cloudflare Analytics"
      icon={<Cloud className="w-4 h-4" />}
      period="24h / 7d"
      provider="cloudflare"
      externalUrl="https://dash.cloudflare.com/135d7fae19fe4fac099b241fec40fba1/digiai.app.br/analytics/traffic"
      externalLabel="Abrir Cloudflare Dashboard"
      onAfterSync={refetch}
    >
      {!hasAny ? (
        <EmptyHint>Clique <strong className="text-on-surface-variant">Sincronizar</strong> para carregar. Cloudflare consolida o tráfego com ~1h de atraso.</EmptyHint>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricStat label="Requests 24h" value={requests24h ?? '—'} />
            <MetricStat label="Requests 7d" value={requests7d ?? '—'} />
            <MetricStat label="Bandwidth 7d" value={formatBytes(bandwidth7d)} />
            <MetricStat label="Threats bloqueados" value={threats7d ?? 0} />
          </div>
          {sslStatus && (
            <div className="text-xs text-on-surface-variant">
              SSL: <span className="font-mono text-emerald-300">{sslStatus}</span>
            </div>
          )}
          {topCountries.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">Top countries</div>
              <ul className="space-y-1">
                {topCountries.map(c => (
                  <li key={c.id} className="flex items-center justify-between text-xs">
                    <span className="text-on-surface-variant font-mono">{c.metric_key}</span>
                    <span className="font-mono tabular-nums text-on-surface-variant">{c.value_numeric}</span>
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
