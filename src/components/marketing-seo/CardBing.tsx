import { Bot } from 'lucide-react';
import { MetricCard, MetricStat, EmptyHint } from './MetricCard';
import { useMarketingMetrics } from '../../hooks/useMarketingMetrics';

export function CardBing() {
  const { rows, refetch } = useMarketingMetrics('bing');
  const clicks7d = rows.find(r => r.metric_type === 'clicks' && r.period === '7d')?.value_numeric;
  const impressions7d = rows.find(r => r.metric_type === 'impressions' && r.period === '7d')?.value_numeric;
  const aiPerf = rows.find(r => r.metric_type === 'ai_performance' && r.period === '7d');
  const topQueries = rows.filter(r => r.metric_type === 'top_query' && r.period === '7d').slice(0, 5);

  const hasAny = rows.length > 0;

  return (
    <MetricCard
      title="Bing Webmaster"
      icon={<Bot className="w-4 h-4" />}
      period="últimos 7 dias"
      provider="bing"
      externalUrl="https://www.bing.com/webmasters/home/mysites?siteUrl=https%3A%2F%2Fdigiai.app.br%2F"
      externalLabel="Abrir Bing Webmaster"
      onAfterSync={refetch}
    >
      {!hasAny ? (
        <EmptyHint>Clique <strong className="text-white/70">Sincronizar</strong> para carregar. O Bing reporta dados alguns dias após a indexação.</EmptyHint>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricStat label="Clicks" value={clicks7d ?? '—'} />
            <MetricStat label="Impressions" value={impressions7d ?? '—'} />
          </div>
          {aiPerf ? (
            <div className="rounded-lg bg-violet-500/10 border border-violet-500/30 p-3">
              <div className="text-[10px] font-mono uppercase tracking-widest text-violet-300 mb-1">Copilot · BETA</div>
              <div className="text-xs text-white/70">{aiPerf.value_text ?? `${aiPerf.value_numeric} citações`}</div>
            </div>
          ) : (
            <div className="text-[10px] text-white/30 italic">AI Performance (Copilot) indisponível ou em BETA pra esta conta.</div>
          )}
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
        </div>
      )}
    </MetricCard>
  );
}
