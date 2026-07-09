import React, { useState } from 'react';
import { RefreshCw, ExternalLink, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react';
import type { SyncProvider, SyncStatus } from '../../hooks/useMarketingMetrics';
import { triggerSync } from '../../hooks/useMarketingMetrics';

type Props = {
  title: string;
  icon: React.ReactNode;
  period?: string;
  provider?: SyncProvider;
  site?: string;
  externalUrl?: string;
  externalLabel?: string;
  children: React.ReactNode;
  onAfterSync?: () => void;
};

export function MetricCard({ title, icon, period, provider, site, externalUrl, externalLabel, children, onAfterSync }: Props) {
  const [syncing, setSyncing] = useState(false);
  const [status, setStatus] = useState<SyncStatus | null>(null);

  async function handleSync() {
    if (!provider || !site) return;
    setSyncing(true);
    const result = await triggerSync(provider, site);
    setStatus(result);
    setSyncing(false);
    onAfterSync?.();
  }

  return (
    <div className="bg-surface-low border border-outline/10 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-secondary shrink-0">{icon}</span>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-on-surface truncate">{title}</div>
            {period && <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{period}</div>}
          </div>
        </div>
        {provider && (
          <button
            onClick={handleSync}
            disabled={syncing}
            className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-highest border border-outline/10 transition-colors disabled:opacity-50"
            aria-label="Sincronizar agora"
          >
            {syncing ? <Loader2 className="w-3 h-3 animate-spin" /> : <RefreshCw className="w-3 h-3" />}
            <span>{syncing ? 'Sincronizando…' : 'Sincronizar'}</span>
          </button>
        )}
      </div>

      <div className="flex-1 min-h-[120px]">
        {status && !status.configured && (
          <div className="bg-warning/10 border border-warning/30 p-3 mb-3 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-warning font-medium">Credenciais não configuradas</div>
                <div className="text-on-surface-variant mt-1">{status.message ?? 'Cadastre as credenciais para começar.'}</div>
                {status.doc && (
                  <code className="block mt-2 text-[10px] font-mono text-muted break-all">{status.doc}</code>
                )}
              </div>
            </div>
          </div>
        )}
        {status && status.ok && status.configured && (
          <div className="bg-success/10 border border-success/30 p-3 mb-3 text-xs">
            <div className="flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-success font-medium">
                  {status.todo ? 'Credenciais OK · stub respondendo' : 'Sincronizado agora'}
                </div>
                <div className="text-on-surface-variant mt-1">
                  {status.todo
                    ? status.todo
                    : typeof status.rows_written === 'number'
                      ? status.rows_written > 0
                        ? `${status.rows_written} métricas atualizadas${status.period_end ? ` (até ${status.period_end})` : ''}`
                        : 'Conectado, mas ainda sem dados no período — o site é novo e as métricas aparecem conforme houver tráfego/indexação.'
                      : 'Dados atualizados.'}
                </div>
              </div>
            </div>
          </div>
        )}
        {status && status.error && (
          <div className="bg-danger/10 border border-danger/30 p-3 mb-3 text-xs">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0 mt-0.5" />
              <div className="min-w-0">
                <div className="text-danger font-medium">Erro ao sincronizar</div>
                <div className="text-on-surface-variant mt-1 font-mono break-all">{status.error}</div>
              </div>
            </div>
          </div>
        )}
        {children}
      </div>

      {externalUrl && (
        <div className="pt-3 border-t border-outline/10">
          <a
            href={externalUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-muted hover:text-on-surface-variant transition-colors"
          >
            <ExternalLink className="w-3 h-3" />
            <span>{externalLabel ?? 'Abrir painel externo'}</span>
          </a>
        </div>
      )}
    </div>
  );
}

export function MetricStat({ label, value, hint }: { label: string; value: React.ReactNode; hint?: string }) {
  return (
    <div className="bg-surface-low p-3">
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</div>
      <div className="text-xl font-semibold text-on-surface tabular-nums mt-1">{value}</div>
      {hint && <div className="text-[10px] text-muted mt-0.5">{hint}</div>}
    </div>
  );
}

export function EmptyHint({ children }: { children: React.ReactNode }) {
  return (
    <div className="text-xs text-muted italic flex items-center gap-2 py-4">
      <div className="w-1.5 h-1.5 bg-surface-high" />
      {children}
    </div>
  );
}
