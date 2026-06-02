import { Zap } from 'lucide-react';
import { MetricCard, MetricStat, EmptyHint } from './MetricCard';
import { useMarketingMetrics } from '../../hooks/useMarketingMetrics';
import { type SeoSite, seoUrls } from '../../hooks/useSeoSites';

export function CardIndexNow({ site }: { site: SeoSite }) {
  const { rows } = useMarketingMetrics('indexnow', site.site);
  const lastBatch = rows.find(r => r.metric_type === 'last_batch');
  const urlsInBatch = rows.find(r => r.metric_type === 'urls_in_batch');
  const successCount = rows.find(r => r.metric_type === 'success_count_30d');
  const errorCount = rows.find(r => r.metric_type === 'error_count_30d');

  const hasAny = rows.length > 0;

  return (
    <MetricCard
      title="IndexNow"
      icon={<Zap className="w-4 h-4" />}
      period="últimas notificações"
      externalUrl={seoUrls.indexnow(site)}
      externalLabel="Abrir GitHub Action"
    >
      {!hasAny ? (
        <EmptyHint>
          Histórico vazio. IndexNow ativo{site.indexnow_key ? <> via chave <code className="text-on-surface-variant font-mono text-[10px]">{site.indexnow_key}</code></> : ''};
          eventos são populados pelo workflow GitHub no push.
        </EmptyHint>
      ) : (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <MetricStat
              label="Último envio"
              value={lastBatch?.value_text ?? '—'}
              hint={lastBatch?.collected_at ? new Date(lastBatch.collected_at).toLocaleString('pt-BR') : undefined}
            />
            <MetricStat label="URLs no batch" value={urlsInBatch?.value_numeric ?? '—'} />
            <MetricStat label="Sucessos 30d" value={successCount?.value_numeric ?? 0} />
            <MetricStat label="Erros 30d" value={errorCount?.value_numeric ?? 0} />
          </div>
        </div>
      )}
    </MetricCard>
  );
}
