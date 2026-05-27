import { Zap } from 'lucide-react';
import { MetricCard, MetricStat, EmptyHint } from './MetricCard';
import { useMarketingMetrics } from '../../hooks/useMarketingMetrics';

export function CardIndexNow() {
  const { rows } = useMarketingMetrics('indexnow');
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
      externalUrl="https://github.com/sisdigiai/digiai-site/actions"
      externalLabel="Abrir GitHub Action"
    >
      {!hasAny ? (
        <EmptyHint>
          Histórico vazio. IndexNow ativo via chave <code className="text-white/60 font-mono text-[10px]">6aa032cad330bfd49b32be85843c253c</code>;
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
