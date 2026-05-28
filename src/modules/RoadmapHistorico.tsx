import { useEffect, useState, useCallback } from 'react';
import { History, CheckSquare, Edit, Plus, Trash2, RefreshCw, Filter } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { realtimeStore } from '../lib/realtimeStore';

type AuditLog = {
  id: string;
  user_email: string | null;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  resource_type: string;
  resource_id: string | null;
  details: { old?: any; new?: any };
  created_at: string;
};

const RESOURCE_LABELS: Record<string, string> = {
  'ops.roadmap_tasks': 'Tarefa',
  'ops.roadmap_phases': 'Fase',
  'ops.decisions': 'Decisão',
  'ops.backlog_items': 'Backlog',
  'company.identity': 'Identidade',
  'company.contacts': 'Contato',
  'company.tools': 'Ferramenta',
  'company.legal_status': 'LGPD',
};

const ACTION_ICONS: Record<string, React.ReactNode> = {
  INSERT: <Plus size={13} className="text-emerald-400" />,
  UPDATE: <Edit size={13} className="text-secondary" />,
  DELETE: <Trash2 size={13} className="text-red-400" />,
};

const ACTION_LABELS: Record<string, string> = {
  INSERT: 'criou',
  UPDATE: 'atualizou',
  DELETE: 'removeu',
};

function formatRelative(iso: string): string {
  const now = new Date();
  const then = new Date(iso);
  const diffSec = Math.round((now.getTime() - then.getTime()) / 1000);
  if (diffSec < 60) return 'agora';
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `há ${diffMin}min`;
  const diffH = Math.round(diffMin / 60);
  if (diffH < 24) return `há ${diffH}h`;
  const diffD = Math.round(diffH / 24);
  return `há ${diffD}d`;
}

function summarizeChange(log: AuditLog): string {
  const n = log.details?.new || {};
  const o = log.details?.old || {};

  if (log.resource_type === 'ops.roadmap_tasks') {
    if (log.action === 'UPDATE' && n.completed_at !== o.completed_at) {
      if (n.completed_at && !o.completed_at) return `marcou como feita: ${n.title || ''}`;
      if (!n.completed_at && o.completed_at) return `desmarcou: ${o.title || ''}`;
    }
    if (log.action === 'INSERT') return `criou tarefa: ${n.title || ''}`;
    if (log.action === 'DELETE') return `removeu tarefa: ${o.title || ''}`;
    return `editou tarefa: ${n.title || o.title || ''}`;
  }

  if (log.resource_type === 'ops.decisions') {
    if (log.action === 'INSERT') return `registrou decisão: ${n.title || ''}`;
    if (log.action === 'UPDATE') return `editou decisão: ${n.title || ''}`;
  }

  if (log.resource_type === 'ops.backlog_items') {
    if (log.action === 'UPDATE' && n.status !== o.status) {
      return `mudou status de "${n.title || ''}" para ${n.status}`;
    }
    if (log.action === 'INSERT') return `criou backlog: ${n.title || ''}`;
  }

  return `${ACTION_LABELS[log.action] || log.action} ${RESOURCE_LABELS[log.resource_type] || log.resource_type}`;
}

type FilterScope = 'todos' | 'roadmap' | 'decisoes' | 'backlog';

export default function RoadmapHistorico() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<FilterScope>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    const { data, error } = await supabase.from('v_audit_logs').select('*').limit(100);
    if (error) console.error('[historico] erro', error);
    setLogs((data as AuditLog[]) || []);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = realtimeStore.subscribe(() => load());
    return () => unsub();
  }, [load]);

  const filterMap: Record<FilterScope, string[]> = {
    todos: [],
    roadmap: ['ops.roadmap_tasks', 'ops.roadmap_phases'],
    decisoes: ['ops.decisions'],
    backlog: ['ops.backlog_items'],
  };

  const filtered = filter === 'todos'
    ? logs
    : logs.filter((l) => filterMap[filter].includes(l.resource_type));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <div className="flex items-center gap-2">
            <History className="w-5 h-5 text-secondary" />
            <h2 className="text-lg font-semibold">Histórico de auditoria</h2>
          </div>
          <p className="text-xs text-muted mt-0.5">Últimas 100 mudanças · atualiza em tempo real</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Recarregar">
            <RefreshCw size={14} />
          </button>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {(['todos', 'roadmap', 'decisoes', 'backlog'] as FilterScope[]).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`text-xs px-3 py-1.5 font-mono transition-colors ${
              filter === f ? 'bg-secondary text-surface' : 'bg-surface-low text-muted hover:text-on-surface-variant'
            }`}
          >
            <Filter size={10} className="inline mr-1" />
            {f === 'todos' ? 'Todos' : f === 'roadmap' ? 'Roadmap' : f === 'decisoes' ? 'Decisões' : 'Backlog'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-sm text-muted py-8">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted border-2 border-dashed border-outline/10">
          Nenhuma entrada no histórico ainda.
        </div>
      ) : (
        <div className="space-y-1">
          {filtered.map((log) => (
            <div key={log.id} className="bg-surface-low border border-outline/10 px-3 py-2 flex items-start gap-3 hover:bg-surface-highest transition-colors">
              <div className="mt-0.5 shrink-0">{ACTION_ICONS[log.action]}</div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-on-surface">
                    <span className="text-secondary">{log.user_email || 'sistema'}</span>{' '}
                    <span className="text-on-surface-variant">{summarizeChange(log)}</span>
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-muted">{formatRelative(log.created_at)}</span>
                  <span className="text-[10px] font-mono text-muted">·</span>
                  <span className="text-[10px] font-mono text-muted">{RESOURCE_LABELS[log.resource_type] || log.resource_type}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
