import { useEffect, useMemo, useRef, useState } from 'react';
import { Search, CornerDownLeft } from 'lucide-react';
import type { ModuleId } from './Sidebar';

interface Item { id: ModuleId; label: string; group: string }

const ITEMS: Item[] = [
  { id: 'visao', label: 'Visão', group: 'Operacional' },
  { id: 'portfolio', label: 'Portfólio', group: 'Operacional' },
  { id: 'trilha', label: 'Roadmap', group: 'Operacional' },
  { id: 'lista-mestra', label: 'Lista Mestra', group: 'Operacional' },
  { id: 'backlog', label: 'Backlog Executivo', group: 'Operacional' },
  { id: 'cadastro-empresa', label: 'Cadastro Empresa', group: 'Operacional' },
  { id: 'financeiro', label: 'Financeiro', group: 'Operacional' },
  { id: 'comercial', label: 'Comercial', group: 'Operacional' },
  { id: 'academy', label: 'Academy', group: 'Operacional' },
  { id: 'funil', label: 'Funil OSI', group: 'Operacional' },
  { id: 'fluxo-osi', label: 'Fluxo OSI', group: 'Operacional' },
  { id: 'marketing', label: 'Marketing', group: 'Operacional' },
  { id: 'marketing-seo', label: 'Marketing & SEO', group: 'Operacional' },
  { id: 'clearix', label: 'Central Clearix', group: 'Operacional' },
  { id: 'ecossistemas', label: 'Ecossistemas (Painel)', group: 'Ecossistemas' },
  { id: 'guia', label: 'Guia Operacional', group: 'Sistema' },
  { id: 'travas-marketing', label: 'Travas Marketing', group: 'Sistema' },
  { id: 'decisoes', label: 'Decisões', group: 'Sistema' },
  { id: 'biblioteca', label: 'Biblioteca', group: 'Sistema' },
  { id: 'brand', label: 'Brand Guidelines', group: 'Sistema' },
  { id: 'referencias-design', label: 'Referências Design', group: 'Sistema' },
  { id: 'mock-estilos', label: 'Mock Vendas', group: 'Sistema' },
];

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

export default function CommandPalette({ onNavigate }: { onNavigate: (id: ModuleId) => void }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(o => !o);
      } else if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  useEffect(() => {
    if (open) { setQuery(''); setSel(0); setTimeout(() => inputRef.current?.focus(), 30); }
  }, [open]);

  const results = useMemo(() => {
    const q = norm(query.trim());
    if (!q) return ITEMS;
    return ITEMS.filter(i => norm(i.label).includes(q) || norm(i.group).includes(q));
  }, [query]);

  useEffect(() => { setSel(0); }, [query]);

  if (!open) return null;

  const go = (id: ModuleId) => { onNavigate(id); setOpen(false); };

  const onInputKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setSel(s => Math.min(s + 1, results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setSel(s => Math.max(s - 1, 0)); }
    else if (e.key === 'Enter') { e.preventDefault(); if (results[sel]) go(results[sel].id); }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[12vh] bg-black/60" onClick={() => setOpen(false)}>
      <div className="w-full max-w-lg bg-surface-container border border-outline/20 shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
        <div className="flex items-center gap-3 px-4 py-3 border-b border-outline/10">
          <Search className="w-4 h-4 text-muted" />
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onInputKey}
            placeholder="Ir para módulo… (Ctrl+K)"
            className="flex-1 bg-transparent text-sm text-on-surface placeholder:text-muted focus:outline-none"
          />
          <kbd className="text-[10px] font-mono text-muted border border-outline/30 px-1.5 py-0.5">esc</kbd>
        </div>
        <div className="max-h-[50vh] overflow-y-auto py-2">
          {results.length === 0 && <div className="px-4 py-6 text-center text-sm text-muted">Nenhum módulo.</div>}
          {results.map((i, idx) => (
            <button
              key={i.id}
              onMouseEnter={() => setSel(idx)}
              onClick={() => go(i.id)}
              className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-left text-sm transition-colors border-l-2 ${idx === sel ? 'bg-secondary-container text-on-secondary-container border-secondary' : 'text-on-surface-variant border-transparent hover:bg-surface-highest'}`}
            >
              <span>{i.label}</span>
              <span className="flex items-center gap-2">
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{i.group}</span>
                {idx === sel && <CornerDownLeft className="w-3.5 h-3.5 text-secondary" />}
              </span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
