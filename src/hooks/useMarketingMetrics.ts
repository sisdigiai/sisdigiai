import { useCallback, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export type SyncProvider = 'gsc' | 'bing' | 'cloudflare';

type EdgeFunctionName =
  | 'marketing-sync-gsc'
  | 'marketing-sync-bing'
  | 'marketing-sync-cloudflare';

const FN_BY_PROVIDER: Record<SyncProvider, EdgeFunctionName> = {
  gsc: 'marketing-sync-gsc',
  bing: 'marketing-sync-bing',
  cloudflare: 'marketing-sync-cloudflare',
};

export type SyncStatus = {
  ok: boolean;
  configured: boolean;
  provider?: string;
  message?: string;
  doc?: string;
  credential_id?: string;
  label?: string | null;
  last_sync_at?: string | null;
  last_sync_status?: 'ok' | 'error' | 'partial' | null;
  error?: string;
  todo?: string;
};

export type MetricRow = {
  id: string;
  source: string;
  metric_type: string;
  metric_key: string | null;
  value_numeric: number | null;
  value_text: string | null;
  metadata: Record<string, unknown>;
  period: '24h' | '7d' | '30d' | 'realtime' | 'all_time';
  period_start: string | null;
  period_end: string | null;
  collected_at: string;
};

export function useMarketingMetrics(source: string) {
  const [rows, setRows] = useState<MetricRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    const { data, error: err } = await supabase
      .from('v_company_metrics')
      .select('id, source, metric_type, metric_key, value_numeric, value_text, metadata, period, period_start, period_end, collected_at')
      .eq('source', source)
      .order('collected_at', { ascending: false })
      .limit(200);
    if (err) setError(err.message);
    else setRows((data ?? []) as MetricRow[]);
    setLoading(false);
  }, [source]);

  useEffect(() => { refetch(); }, [refetch]);

  return { rows, loading, error, refetch };
}

export async function triggerSync(provider: SyncProvider): Promise<SyncStatus> {
  const fnName = FN_BY_PROVIDER[provider];
  const { data, error } = await supabase.functions.invoke<SyncStatus>(fnName, {
    method: 'POST',
  });
  if (error) {
    const body = (error.context && typeof error.context === 'object' && 'json' in (error.context as object))
      ? await (error.context as { json: () => Promise<SyncStatus> }).json().catch(() => null)
      : null;
    if (body) return body;
    return { ok: false, configured: false, error: error.message };
  }
  return data ?? { ok: false, configured: false, error: 'empty_response' };
}
