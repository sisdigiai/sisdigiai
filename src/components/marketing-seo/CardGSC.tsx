import { Search } from 'lucide-react';
import { MetricCard, MetricStat, EmptyHint } from './MetricCard';
import { useMarketingMetrics } from '../../hooks/useMarketingMetrics';

export function CardGSC() {
  const { rows, refetch } = useMarketingMetrics('gsc');
  const clicks7d = rows.find(r => r.metric_type === 'clicks' && r.period === '7d')?.value_numeric;
  const impressions7d = rows.find(r => r.metric_type === 'impressions' && r.period === '7d')?.value_numeric;
  const ctr7d = rows.find(r => r.metric_type === 'ctr' && r.period === '7d')?.value_numeric;
  const position7d = rows.find(r => r.metric_type === 'position' && r.period === '7d')?.value_numeric;
  const topQueries = rows.filter(r => r.metric_type === 'top_query' && r.period === '7d').slice(0, 5);
  const topPages = rows.filter(r => r.metric_type === 'top_page' && r.period === '7d').slice(0, 5);

  const hasAny = rows.length > 0;

  return (
    <MetricCard
      title="Google Search Console"
      icon={<Search className="w-4 h-4" />}
      period="últimos 7 dias"
      provider="gsc"
      externalUrl="https://search.google.com/search-console?resource_id=sc-domain%3Adigiai.app.br"
      externalLabel="Abrir GSC"
      onAfterSync={refetch}
    >
      {!hasAny ? (
        <EmptyHint>Sem dados ainda. Configure credenciais e clique <strong className="text-white/70">Sincronizar</strong>.</EmptyHint>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricStat label="Clicks" value={clicks7d ?? '—'} />
            <MetricStat label="Impressions" value={impressions7d ?? '—'} />
            <MetricStat label="CTR" value={ctr7d != null ? `${(ctr7d * 100).toFixed(2)}%` : '—'} />
            <MetricStat label="Posição média" value={position7d?.toFixed(1) ?? '—'} />
          </div>
          {topQueries.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1.5">Top queries</div>
              <ul className="space-y-1">
                {topQueries.map(q => (
                  <li key={q.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/70 truncate">{q.metric_key}</span>
                    <span className="font-mono tabular-nums text-white/50 shrink-0 ml-2">{q.value_numeric}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {topPages.length > 0 && (
            <div>
              <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-1.5">Top pages</div>
              <ul className="space-y-1">
                {topPages.map(p => (
                  <li key={p.id} className="flex items-center justify-between text-xs">
                    <span className="text-white/70 truncate">{p.metric_key}</span>
                    <span className="font-mono tabular-nums text-white/50 shrink-0 ml-2">{p.value_numeric}</span>
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
