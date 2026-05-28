import { useEffect, useMemo, useState } from 'react';
import { Copy, ExternalLink, Image as ImageIcon, RefreshCw, Search } from 'lucide-react';
import { marketingStore, type AffiliateMaterial, type ContentPillar } from '../../lib/marketingStore';

const TYPE_LABELS: Record<string, string> = {
  banner: 'Banner',
  post_copy: 'Copy de post',
  reel: 'Reel (roteiro)',
  email: 'Email',
  whatsapp_msg: 'WhatsApp',
  carrossel: 'Carrossel',
  story: 'Story',
  video: 'Vídeo',
};

export function MateriaisAfiliados() {
  const [materials, setMaterials] = useState<AffiliateMaterial[]>([]);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [pillarFilter, setPillarFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [m, p] = await Promise.all([marketingStore.listMaterials(), marketingStore.listPillars()]);
    setMaterials(m);
    setPillars(p);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => materials.filter(m => {
    if (pillarFilter !== 'all' && m.pillar_code !== pillarFilter) return false;
    if (typeFilter !== 'all' && m.type !== typeFilter) return false;
    if (search && !m.title.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [materials, pillarFilter, typeFilter, search]);

  const types = useMemo(() => Array.from(new Set(materials.map(m => m.type))), [materials]);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-8">
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar material..." className="flex-1 bg-surface-low border border-outline/10 px-3 py-1.5 text-sm focus:outline-none focus:border-secondary/40" />
        </div>
        <select value={pillarFilter} onChange={e => setPillarFilter(e.target.value)} className="bg-surface-low border border-outline/10 px-3 py-1.5 text-sm">
          <option value="all">Todos pilares</option>
          {pillars.map(p => <option key={p.id} value={p.code}>{p.name}</option>)}
        </select>
        <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)} className="bg-surface-low border border-outline/10 px-3 py-1.5 text-sm">
          <option value="all">Todos tipos</option>
          {types.map(t => <option key={t} value={t}>{TYPE_LABELS[t] ?? t}</option>)}
        </select>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-outline/10 hover:bg-surface-highest">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-muted text-sm">Nenhum material encontrado.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map(m => (
            <div key={m.id} className="bg-surface-low border border-outline/10 p-4 border-l-4" style={{ borderLeftColor: m.pillar_color ?? '#adcebd' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] uppercase tracking-widest font-bold text-muted">{TYPE_LABELS[m.type] ?? m.type}</span>
                    {m.pillar_name && <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: m.pillar_color ?? '#adcebd' }}>· {m.pillar_name}</span>}
                  </div>
                  <h3 className="font-medium">{m.title}</h3>
                  {m.description && <p className="text-xs text-on-surface-variant mt-1">{m.description}</p>}
                  {m.platforms.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {m.platforms.map(p => <span key={p} className="text-[10px] px-1.5 py-0.5 bg-surface-low text-on-surface-variant">{p}</span>)}
                    </div>
                  )}
                </div>
                <div className="text-right">
                  <div className="text-[10px] text-muted">{m.downloads_count} downloads</div>
                </div>
              </div>

              <button onClick={() => setExpanded(expanded === m.id ? null : m.id)} className="text-xs text-secondary hover:text-on-surface mt-3">
                {expanded === m.id ? 'Recolher ▲' : 'Ver copy + artes ▼'}
              </button>

              {expanded === m.id && (
                <div className="mt-3 pt-3 border-t border-outline/10 space-y-3">
                  {/* Copies */}
                  {[
                    ['copy_short', 'Copy curta'],
                    ['copy_medium', 'Copy média'],
                    ['copy_long', 'Copy longa'],
                  ].map(([k, label]) => {
                    const value = (m as any)[k] as string | null;
                    if (!value) return null;
                    const key = `${m.id}-${k}`;
                    return (
                      <div key={k} className="bg-surface-lowest p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-[10px] uppercase tracking-widest font-bold text-muted">{label}</span>
                          <button onClick={() => handleCopy(value, key)} className="text-[10px] flex items-center gap-1 text-secondary hover:text-on-surface">
                            <Copy className="w-3 h-3" /> {copied === key ? 'Copiado!' : 'Copiar'}
                          </button>
                        </div>
                        <pre className="text-xs text-on-surface-variant whitespace-pre-wrap font-sans">{value}</pre>
                      </div>
                    );
                  })}

                  {/* Artes */}
                  {m.art_urls.length > 0 && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">Artes</div>
                      <div className="space-y-1">
                        {m.art_urls.map((a, i) => (
                          <a key={i} href={a.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-xs text-secondary hover:text-on-surface">
                            <ImageIcon className="w-3.5 h-3.5" />
                            <span className="font-mono">{a.format}</span>
                            <span className="truncate">{a.url}</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ))}
                      </div>
                    </div>
                  )}

                  {m.notes && (
                    <div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-1">Notas</div>
                      <p className="text-xs text-on-surface-variant">{m.notes}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
