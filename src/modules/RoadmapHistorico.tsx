import { useEffect, useState, useCallback, useMemo } from 'react';
import { History, CheckSquare, Edit, Plus, Trash2, RefreshCw, Filter, CheckCircle2, Flag } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { realtimeStore } from '../lib/realtimeStore';
import type { RoadmapPhase, RoadmapTask } from '../lib/roadmapStore';

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
  INSERT: <Plus size={13} className="text-success" />,
  UPDATE: <Edit size={13} className="text-secondary" />,
  DELETE: <Trash2 size={13} className="text-danger" />,
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

function fmtData(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

type Props = {
  phases?: RoadmapPhase[];
  tasks?: RoadmapTask[];
};

export default function RoadmapHistorico({ phases = [], tasks = [] }: Props) {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  // Dentro do módulo Roadmap (com fases), o audit abre já filtrado no roadmap
  const [filter, setFilter] = useState<FilterScope>(phases.length > 0 ? 'roadmap' : 'todos');

  // Jornada: fases com atividade (iniciadas/concluídas), em ordem
  const jornada = useMemo(() =>
    [...phases].sort((a, b) => a.phase_number - b.phase_number),
  [phases]);

  // Conquistas: tarefas concluídas, mais recentes primeiro
  const conquistas = useMemo(() =>
    tasks
      .filter((t) => t.completed_at)
      .sort((a, b) => (a.completed_at! > b.completed_at! ? -1 : 1))
      .slice(0, 15),
  [tasks]);

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
      {/* Jornada da trilha — o caminho percorrido no 0→milhão */}
      {jornada.length > 0 && (
        <div className="border border-outline/15 bg-surface-container p-5">
          <div className="text-[10px] font-mono uppercase tracking-widest text-secondary mb-4">Jornada da trilha · 0→milhão</div>
          <div className="relative">
            <div className="absolute left-[9px] top-2 bottom-2 w-px bg-outline/25" />
            <div className="space-y-3">
              {jornada.map((f) => {
                const done = !!f.completed_at;
                const started = !!f.started_at;
                return (
                  <div key={f.phase_number} className="relative pl-8">
                    <span className="absolute left-0 top-0.5">
                      {done
                        ? <CheckCircle2 className="w-[19px] h-[19px] text-success" />
                        : started
                          ? <span className="block w-[19px] h-[19px] rounded-full bg-surface border-2 border-secondary" />
                          : <span className="block w-[11px] h-[11px] mt-1 ml-1 rounded-full border border-muted/60" />}
                    </span>
                    <div className="flex items-baseline gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${done ? 'text-on-surface' : started ? 'text-on-surface' : 'text-muted'}`}>
                        Fase {f.phase_number} · {f.nome}
                      </span>
                      <span className="font-mono text-[10px] text-muted">
                        {done
                          ? `${fmtData(f.started_at)} → concluída ${fmtData(f.completed_at)}`
                          : started
                            ? `iniciada ${fmtData(f.started_at)} · em andamento`
                            : 'não iniciada'}
                      </span>
                      {f.decision_gate_met_at && (
                        <span className="font-mono text-[9px] uppercase text-success bg-success/10 px-1.5 py-0.5 flex items-center gap-1">
                          <Flag size={8} /> gate {fmtData(f.decision_gate_met_at)}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Conquistas — tarefas concluídas mais recentes */}
      {conquistas.length > 0 && (
        <div className="border border-outline/15 bg-surface-container">
          <div className="px-4 py-2.5 border-b border-outline/10">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Conquistas recentes ({conquistas.length})</span>
          </div>
          <div className="divide-y divide-outline/10">
            {conquistas.map((t) => (
              <div key={t.id} className="flex items-center gap-2.5 px-4 py-2">
                <CheckSquare size={14} className="text-success shrink-0" />
                <span className="flex-1 min-w-0 text-sm text-on-surface truncate">{t.title}</span>
                <span className="font-mono text-[10px] text-muted shrink-0">Fase {t.phase_number}</span>
                <span className="font-mono text-[10px] text-success shrink-0">{fmtData(t.completed_at)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

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
            <div key={log.id} className="bg-surface-container border border-outline/15 px-3 py-2 flex items-start gap-3 hover:bg-surface-highest transition-colors">
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
