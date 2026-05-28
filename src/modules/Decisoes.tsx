import { useEffect, useState, useCallback } from 'react';
import { GitBranch, Plus, Trash2, Tag, Calendar, X, Download, RefreshCw } from 'lucide-react';
import { decisionsStore, type Decision, type NewDecision } from '../lib/decisionsStore';
import { realtimeStore } from '../lib/realtimeStore';

const EMPTY_DRAFT: NewDecision = {
  title: '',
  context: '',
  decision: '',
  alternatives: null,
  expected_impact: null,
  tags: [],
  decided_at: new Date().toISOString().split('T')[0],
};

const inputClass = 'w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary';

export default function Decisoes() {
  const [items, setItems] = useState<Decision[]>([]);
  const [loading, setLoading] = useState(true);
  const [draft, setDraft] = useState<NewDecision | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [tagFilter, setTagFilter] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setItems(await decisionsStore.list());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    const unsub = realtimeStore.subscribe((event) => {
      if (event.table === 'decisions') load();
    });
    return () => unsub();
  }, [load]);

  const allTags = Array.from(new Set(items.flatMap((d) => d.tags))).sort();
  const filtered = tagFilter ? items.filter((d) => d.tags.includes(tagFilter)) : items;

  const startCreate = () => {
    setDraft({ ...EMPTY_DRAFT });
    setEditingId(null);
  };

  const startEdit = (d: Decision) => {
    setDraft({
      title: d.title,
      context: d.context,
      decision: d.decision,
      alternatives: d.alternatives,
      expected_impact: d.expected_impact,
      tags: d.tags,
      decided_at: d.decided_at,
    });
    setEditingId(d.id);
  };

  const save = async () => {
    if (!draft) return;
    if (!draft.title || !draft.context || !draft.decision) {
      alert('Preencha pelo menos: título, contexto e decisão.');
      return;
    }
    if (editingId) {
      await decisionsStore.update(editingId, draft);
    } else {
      await decisionsStore.create(draft);
    }
    setDraft(null);
    setEditingId(null);
    load();
  };

  const remove = async (id: string) => {
    if (!confirm('Arquivar essa decisão?')) return;
    await decisionsStore.softDelete(id);
    load();
  };

  const addTag = () => {
    if (!draft || !tagInput.trim()) return;
    if (!draft.tags.includes(tagInput.trim())) {
      setDraft({ ...draft, tags: [...draft.tags, tagInput.trim()] });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    if (!draft) return;
    setDraft({ ...draft, tags: draft.tags.filter((t) => t !== tag) });
  };

  const exportMarkdown = () => {
    const lines: string[] = ['# Registro de Decisões Estratégicas', ''];
    lines.push(`> Exportado em ${new Date().toLocaleString('pt-BR')} · ${items.length} decisões`);
    lines.push('');
    for (const d of items) {
      lines.push(`## ${d.title}`);
      lines.push(`- **Decidido em:** ${d.decided_at}`);
      if (d.tags.length > 0) lines.push(`- **Tags:** ${d.tags.join(', ')}`);
      lines.push('');
      lines.push(`**Contexto:**  ${d.context}`);
      lines.push('');
      lines.push(`**Decisão:**  ${d.decision}`);
      lines.push('');
      if (d.alternatives) { lines.push(`**Alternativas descartadas:**  ${d.alternatives}`); lines.push(''); }
      if (d.expected_impact) { lines.push(`**Impacto esperado:**  ${d.expected_impact}`); lines.push(''); }
      lines.push('---');
      lines.push('');
    }
    const blob = new Blob([lines.join('\n')], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `decisoes-${new Date().toISOString().split('T')[0]}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-6xl mx-auto p-8">
      <header className="mb-8">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <GitBranch className="w-6 h-6 text-secondary" />
              <h1 className="text-3xl font-serif font-bold">Decisões</h1>
            </div>
            <p className="text-muted">Memória institucional — por que cada direção foi tomada, com contexto e alternativas.</p>
            <p className="text-xs text-muted mt-1">{items.length} decisões · {allTags.length} tags únicas</p>
          </div>
          <div className="flex gap-2">
            <button onClick={load} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Recarregar">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={exportMarkdown}
              disabled={items.length === 0}
              className="px-3 py-2 bg-surface-high hover:bg-surface-highest disabled:opacity-40 text-sm flex items-center gap-2"
            >
              <Download size={14} /> Markdown
            </button>
            <button
              onClick={startCreate}
              className="px-3 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2"
            >
              <Plus size={14} /> Nova decisão
            </button>
          </div>
        </div>

        {allTags.length > 0 && (
          <div className="mt-4 flex gap-1.5 flex-wrap">
            <button
              onClick={() => setTagFilter(null)}
              className={`text-xs px-2.5 py-1 rounded-full font-mono ${!tagFilter ? 'bg-secondary/15 text-secondary' : 'bg-surface-low text-muted hover:text-on-surface-variant'}`}
            >
              todas
            </button>
            {allTags.map((t) => (
              <button
                key={t}
                onClick={() => setTagFilter(tagFilter === t ? null : t)}
                className={`text-xs px-2.5 py-1 rounded-full font-mono ${tagFilter === t ? 'bg-secondary/15 text-secondary' : 'bg-surface-low text-muted hover:text-on-surface-variant'}`}
              >
                #{t}
              </button>
            ))}
          </div>
        )}
      </header>

      {draft && (
        <div className="bg-surface-lowest border border-secondary p-5 mb-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">{editingId ? 'Editar decisão' : 'Nova decisão'}</h2>
            <button onClick={() => { setDraft(null); setEditingId(null); }} className="p-1 hover:bg-surface-highest">
              <X size={16} />
            </button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs text-on-surface-variant mb-1.5">Título (qual a decisão em 1 linha)</label>
              <input className={inputClass} value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-on-surface-variant mb-1.5">Data da decisão</label>
              <input type="date" className={inputClass} value={draft.decided_at} onChange={(e) => setDraft({ ...draft, decided_at: e.target.value })} />
            </div>
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Contexto — por que essa decisão foi necessária?</label>
            <textarea rows={3} className={inputClass} value={draft.context} onChange={(e) => setDraft({ ...draft, context: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Decisão tomada</label>
            <textarea rows={3} className={inputClass} value={draft.decision} onChange={(e) => setDraft({ ...draft, decision: e.target.value })} />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Alternativas descartadas (opcional — mas fortemente recomendado)</label>
            <textarea rows={2} className={inputClass} value={draft.alternatives || ''} onChange={(e) => setDraft({ ...draft, alternatives: e.target.value || null })} placeholder='(a) alternativa 1; (b) alternativa 2' />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Impacto esperado (opcional)</label>
            <textarea rows={2} className={inputClass} value={draft.expected_impact || ''} onChange={(e) => setDraft({ ...draft, expected_impact: e.target.value || null })} />
          </div>
          <div>
            <label className="block text-xs text-on-surface-variant mb-1.5">Tags (enter para adicionar)</label>
            <div className="flex gap-2 mb-2">
              <input
                className={inputClass}
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                placeholder="ex: estrategia"
              />
              <button onClick={addTag} className="px-3 py-2 bg-surface-high text-xs">Add</button>
            </div>
            <div className="flex gap-1.5 flex-wrap">
              {draft.tags.map((t) => (
                <span key={t} className="text-xs px-2 py-1 bg-secondary/15 text-secondary rounded flex items-center gap-1">
                  #{t} <button onClick={() => removeTag(t)}><X size={10} /></button>
                </span>
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={save} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm font-medium">
              {editingId ? 'Salvar alterações' : 'Salvar decisão'}
            </button>
            <button onClick={() => { setDraft(null); setEditingId(null); }} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-16 border-2 border-dashed border-outline/10">
          <div className="text-muted mb-2">Nenhuma decisão ainda.</div>
          <button onClick={startCreate} className="text-sm text-secondary hover:underline">Criar a primeira</button>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((d) => (
            <div key={d.id} className="bg-surface-low border border-outline/10 p-5 hover:border-outline/30 transition-colors">
              <div className="flex items-start justify-between gap-4 mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <Calendar size={12} className="text-muted" />
                    <span className="text-xs font-mono text-muted">{new Date(d.decided_at + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                    {d.tags.map((t) => (
                      <span key={t} className="text-[10px] font-mono text-secondary bg-secondary/15 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Tag size={9} /> {t}
                      </span>
                    ))}
                  </div>
                  <h3 className="font-semibold text-on-surface">{d.title}</h3>
                </div>
                <div className="flex gap-1 shrink-0">
                  <button onClick={() => startEdit(d)} className="p-1.5 hover:bg-surface-highest text-muted hover:text-on-surface text-sm" title="Editar">✎</button>
                  <button onClick={() => remove(d.id)} className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-400" title="Arquivar">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="space-y-2.5 text-sm">
                <div>
                  <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-0.5">Contexto</div>
                  <div className="text-on-surface-variant">{d.context}</div>
                </div>
                <div>
                  <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-0.5">Decisão</div>
                  <div className="text-on-surface font-medium">{d.decision}</div>
                </div>
                {d.alternatives && (
                  <div>
                    <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-0.5">Alternativas descartadas</div>
                    <div className="text-on-surface-variant">{d.alternatives}</div>
                  </div>
                )}
                {d.expected_impact && (
                  <div>
                    <div className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest mb-0.5">Impacto esperado</div>
                    <div className="text-on-surface-variant">{d.expected_impact}</div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
