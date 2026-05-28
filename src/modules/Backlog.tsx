import { useEffect, useState, useCallback } from 'react';
import { Zap, AlertTriangle, Clock, CheckCircle2, Circle, Plus, X, RefreshCw, Trash2 } from 'lucide-react';
import { backlogStore, type BacklogItem, type BacklogStatus, type NewBacklogItem } from '../lib/backlogStore';
import { realtimeStore } from '../lib/realtimeStore';

type PriorityLabel = 'critico' | 'alto' | 'medio' | 'baixo' | 'minimo';

const PRIORITY_MAP: Record<number, PriorityLabel> = { 1: 'critico', 2: 'alto', 3: 'medio', 4: 'baixo', 5: 'minimo' };
const PRIORITY_NUM: Record<PriorityLabel, number> = { critico: 1, alto: 2, medio: 3, baixo: 4, minimo: 5 };

const priorityConfig: Record<PriorityLabel, { label: string; className: string }> = {
  critico: { label: 'Crítico', className: 'text-red-400 bg-red-400/10 border-red-400/20' },
  alto: { label: 'Alto', className: 'text-amber-400 bg-amber-400/10 border-amber-400/20' },
  medio: { label: 'Médio', className: 'text-secondary bg-secondary/15 border-secondary/40' },
  baixo: { label: 'Baixo', className: 'text-muted bg-surface-low border-outline/10' },
  minimo: { label: 'Mínimo', className: 'text-muted bg-surface-low border-outline/10' },
};

const statusConfig: Record<BacklogStatus, { label: string; icon: React.ReactNode }> = {
  pending: { label: 'Pendente', icon: <Circle className="w-4 h-4 text-muted" /> },
  in_progress: { label: 'Em andamento', icon: <Clock className="w-4 h-4 text-secondary" /> },
  done: { label: 'Concluído', icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" /> },
  blocked: { label: 'Bloqueado', icon: <AlertTriangle className="w-4 h-4 text-red-400" /> },
  cancelled: { label: 'Cancelado', icon: <X className="w-4 h-4 text-muted" /> },
};

const areaLabel: Record<string, string> = {
  docs: 'Docs', clearix: 'Clearix', app: 'DIGIAI App',
  academy: 'Academy', comercial: 'Comercial', infra: 'Infraestrutura',
};

const inputClass = 'w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary';

const EMPTY_DRAFT: Partial<NewBacklogItem> = {
  title: '',
  description: '',
  priority: 3,
  status: 'pending',
  area: 'docs',
  tags: [],
  origem: null,
  blocker: null,
};

export default function Backlog() {
  const [items, setItems] = useState<BacklogItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<Partial<NewBacklogItem> | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [filtroArea, setFiltroArea] = useState<string>('todos');
  const [filtroStatus, setFiltroStatus] = useState<BacklogStatus | 'todos'>('todos');

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await backlogStore.list());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = realtimeStore.subscribe((event) => {
      if (event.table === 'backlog_items') load();
    });
    return () => unsub();
  }, [load]);

  const areas = Array.from(new Set(items.map((i) => i.area).filter(Boolean))) as string[];

  const filtered = items
    .filter((i) => filtroArea === 'todos' || i.area === filtroArea)
    .filter((i) => filtroStatus === 'todos' || i.status === filtroStatus);

  const criticos = items.filter((i) => i.priority === 1 && i.status !== 'done').length;
  const emAndamento = items.filter((i) => i.status === 'in_progress').length;

  const startCreate = () => { setDraft({ ...EMPTY_DRAFT }); setEditingId(null); };
  const startEdit = (i: BacklogItem) => {
    setDraft({
      title: i.title, description: i.description, priority: i.priority, status: i.status,
      area: i.area, product_id: i.product_id, owner: i.owner, due_date: i.due_date,
      tags: i.tags, origem: i.origem, blocker: i.blocker,
    });
    setEditingId(i.id);
  };

  const save = async () => {
    if (!draft?.title) { alert('Título obrigatório'); return; }
    if (editingId) {
      await backlogStore.update(editingId, draft);
    } else {
      await backlogStore.create(draft);
    }
    setDraft(null); setEditingId(null); load();
  };

  const toggleStatus = async (i: BacklogItem) => {
    const next: BacklogStatus = i.status === 'done' ? 'pending' : i.status === 'pending' ? 'in_progress' : i.status === 'in_progress' ? 'done' : i.status;
    await backlogStore.updateStatus(i.id, next);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Arquivar esse item?')) return;
    await backlogStore.softDelete(id);
    load();
  };

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-serif">Backlog Executivo</h1>
          <p className="text-on-surface-variant mt-1">{items.length} itens · {criticos} críticos · {emAndamento} em andamento</p>
        </div>
        <div className="flex gap-2">
          <button onClick={load} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Recarregar">
            <RefreshCw size={16} />
          </button>
          <button onClick={startCreate} className="px-3 py-2 bg-secondary hover:bg-secondary/90 text-surface text-sm flex items-center gap-2">
            <Plus size={14} /> Novo item
          </button>
        </div>
      </div>

      {criticos > 0 && (
        <div className="bg-red-400/5 border border-red-400/20 p-4 flex items-start gap-3">
          <Zap className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold text-red-400">{criticos} item(s) crítico(s) pendente(s)</div>
            <div className="text-xs text-on-surface-variant mt-0.5">Resolva esses itens antes de avançar para as próximas fases do Roadmap</div>
          </div>
        </div>
      )}

      {/* Form draft */}
      {draft && (
        <div className="bg-surface-lowest border border-secondary p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm">{editingId ? 'Editar item' : 'Novo item'}</h3>
            <button onClick={() => { setDraft(null); setEditingId(null); }} className="p-1 hover:bg-surface-highest rounded"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="md:col-span-3">
              <label className="block text-xs text-on-surface-variant mb-1">Título</label>
              <input className={inputClass} value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-on-surface-variant mb-1">Descrição</label>
              <textarea rows={2} className={inputClass} value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Prioridade</label>
              <select className={inputClass} value={draft.priority || 3} onChange={(e) => setDraft({ ...draft, priority: parseInt(e.target.value) })}>
                <option value={1}>1 — Crítico</option>
                <option value={2}>2 — Alto</option>
                <option value={3}>3 — Médio</option>
                <option value={4}>4 — Baixo</option>
                <option value={5}>5 — Mínimo</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Status</label>
              <select className={inputClass} value={draft.status || 'pending'} onChange={(e) => setDraft({ ...draft, status: e.target.value as BacklogStatus })}>
                <option value="pending">Pendente</option>
                <option value="in_progress">Em andamento</option>
                <option value="blocked">Bloqueado</option>
                <option value="done">Concluído</option>
                <option value="cancelled">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Área</label>
              <input className={inputClass} value={draft.area || ''} onChange={(e) => setDraft({ ...draft, area: e.target.value })} placeholder="docs / clearix / app / academy / comercial / infra" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs text-on-surface-variant mb-1">Origem (qual fase/doc originou esse item)</label>
              <input className={inputClass} value={draft.origem || ''} onChange={(e) => setDraft({ ...draft, origem: e.target.value || null })} />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1">Prazo</label>
              <input type="date" className={inputClass} value={draft.due_date || ''} onChange={(e) => setDraft({ ...draft, due_date: e.target.value || null })} />
            </div>
            <div className="md:col-span-3">
              <label className="block text-xs text-on-surface-variant mb-1">Bloqueio / dependência (opcional)</label>
              <input className={inputClass} value={draft.blocker || ''} onChange={(e) => setDraft({ ...draft, blocker: e.target.value || null })} />
            </div>
          </div>
          <div className="flex gap-2 pt-2">
            <button onClick={save} className="px-4 py-2 bg-secondary text-surface text-sm">{editingId ? 'Salvar' : 'Criar'}</button>
            <button onClick={() => { setDraft(null); setEditingId(null); }} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1 flex-wrap">
          <button onClick={() => setFiltroArea('todos')} className={`text-xs px-3 py-1.5 font-mono ${filtroArea === 'todos' ? 'bg-secondary text-surface' : 'bg-surface-low text-muted hover:text-on-surface-variant'}`}>Todos</button>
          {areas.map((a) => (
            <button key={a} onClick={() => setFiltroArea(a)} className={`text-xs px-3 py-1.5 font-mono ${filtroArea === a ? 'bg-secondary text-surface' : 'bg-surface-low text-muted hover:text-on-surface-variant'}`}>
              {areaLabel[a] || a}
            </button>
          ))}
        </div>
        <div className="w-px bg-surface-high mx-1" />
        {(['todos', 'in_progress', 'pending', 'blocked', 'done'] as const).map((s) => (
          <button key={s} onClick={() => setFiltroStatus(s as any)} className={`text-xs px-3 py-1.5 font-mono ${filtroStatus === s ? 'bg-secondary text-surface' : 'bg-surface-low text-muted hover:text-on-surface-variant'}`}>
            {s === 'todos' ? 'Todos status' : statusConfig[s as BacklogStatus]?.label}
          </button>
        ))}
      </div>

      {/* Lista */}
      {loading ? (
        <div className="text-sm text-muted">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center text-muted py-12">Nenhum item encontrado com esses filtros</div>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => {
            const pLabel = PRIORITY_MAP[item.priority] || 'medio';
            const pConf = priorityConfig[pLabel];
            const sConf = statusConfig[item.status];
            return (
              <div key={item.id} className={`bg-surface-low border p-4 ${item.priority === 1 && item.status !== 'done' ? 'border-red-400/15' : item.status === 'in_progress' ? 'border-secondary/40' : 'border-outline/10'}`}>
                <div className="flex items-start gap-3">
                  <button onClick={() => toggleStatus(item)} className="mt-0.5 hover:scale-110 transition-transform" title="Ciclar status">
                    {sConf?.icon}
                  </button>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${pConf.className}`}>{pConf.label}</span>
                      {item.area && <span className="text-[10px] font-mono text-muted uppercase">{areaLabel[item.area] || item.area}</span>}
                      {item.due_date && <span className="text-[10px] font-mono text-muted">📅 {new Date(item.due_date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>}
                    </div>
                    <div className="font-medium text-sm text-on-surface">{item.title}</div>
                    {item.description && <div className="text-xs text-on-surface-variant mt-1">{item.description}</div>}
                    {item.blocker && (
                      <div className="flex items-center gap-1.5 mt-2">
                        <AlertTriangle className="w-3 h-3 text-amber-400 shrink-0" />
                        <span className="text-xs text-amber-400/70">{item.blocker}</span>
                      </div>
                    )}
                    {item.origem && <div className="text-[10px] font-mono text-muted mt-2">origem: {item.origem}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => startEdit(item)} className="p-1.5 hover:bg-surface-highest rounded text-muted hover:text-on-surface text-sm">✎</button>
                    <button onClick={() => remove(item.id)} className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
