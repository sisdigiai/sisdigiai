import { useEffect, useMemo, useState } from 'react';
import { List, Search } from 'lucide-react';
import { backlogStore } from '../lib/backlogStore';
import { roadmapStore } from '../lib/roadmapStore';

type Fonte = 'Backlog' | 'Roadmap';
type StatusNorm = 'done' | 'in_progress' | 'pending' | 'blocked' | 'atrasado' | 'cancelled';

interface MasterItem {
  id: string;
  fonte: Fonte;
  title: string;
  area: string;
  fase: string;
  prioridade: number;
  status: StatusNorm;
  owner: string;
  prazo: string | null;
}

const STATUS_STYLE: Record<StatusNorm, { label: string; cls: string }> = {
  done:        { label: 'Concluído',   cls: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30' },
  in_progress: { label: 'Em andamento',cls: 'bg-[#2563EB]/15 text-[#06B6D4] border-[#2563EB]/30' },
  pending:     { label: 'Pendente',    cls: 'bg-white/10 text-white/60 border-white/10' },
  blocked:     { label: 'Bloqueado',   cls: 'bg-rose-500/15 text-rose-300 border-rose-500/30' },
  atrasado:    { label: 'Atrasado',    cls: 'bg-amber-500/15 text-amber-300 border-amber-500/30' },
  cancelled:   { label: 'Cancelado',   cls: 'bg-white/5 text-white/30 border-white/5' },
};

const PRIO_LABEL: Record<number, string> = { 1: 'P1 crítico', 2: 'P2 alto', 3: 'P3 médio', 4: 'P4 baixo' };

export default function ListaMestra() {
  const [items, setItems] = useState<MasterItem[] | null>(null);
  const [fonte, setFonte] = useState<'todos' | Fonte>('todos');
  const [status, setStatus] = useState<'todos' | StatusNorm>('todos');
  const [prio, setPrio] = useState<'todas' | number>('todas');
  const [busca, setBusca] = useState('');

  useEffect(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    Promise.all([backlogStore.list(), roadmapStore.listTasks()])
      .then(([backlog, tasks]) => {
        const b: MasterItem[] = backlog.map(x => ({
          id: `b-${x.id}`,
          fonte: 'Backlog',
          title: x.title,
          area: x.area || '—',
          fase: '—',
          prioridade: x.priority,
          status: (x.status === 'cancelled' ? 'cancelled' : x.status) as StatusNorm,
          owner: x.owner || '—',
          prazo: x.due_date,
        }));
        const r: MasterItem[] = tasks.map(t => {
          let st: StatusNorm = 'pending';
          if (t.completed_at) st = 'done';
          else if (t.target_date && t.target_date < hoje) st = 'atrasado';
          return {
            id: `r-${t.id}`,
            fonte: 'Roadmap',
            title: t.title,
            area: t.track ? `Track ${t.track}` : '—',
            fase: `Fase ${t.phase_number}`,
            prioridade: t.priority,
            status: st,
            owner: t.track ? `Track ${t.track}` : '—',
            prazo: t.target_date,
          };
        });
        setItems([...b, ...r]);
      })
      .catch(() => setItems([]));
  }, []);

  const filtrados = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return (items ?? []).filter(i =>
      (fonte === 'todos' || i.fonte === fonte) &&
      (status === 'todos' || i.status === status) &&
      (prio === 'todas' || i.prioridade === prio) &&
      (q === '' || i.title.toLowerCase().includes(q) || i.area.toLowerCase().includes(q))
    ).sort((a, b) => a.prioridade - b.prioridade || a.fase.localeCompare(b.fase));
  }, [items, fonte, status, prio, busca]);

  const atrasados = (items ?? []).filter(i => i.status === 'atrasado').length;

  const chip = (active: boolean) =>
    `px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
      active ? 'bg-[#2563EB]/20 text-white border-[#2563EB]/40' : 'text-white/50 border-white/10 hover:text-white/80'
    }`;

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-5">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <List className="w-7 h-7 text-[#06B6D4]" /> Lista Mestra
        </h1>
        <p className="text-white/50 mt-1">
          {items === null ? 'Carregando…' : `${items.length} itens de implantação`} · unifica Backlog + Roadmap
          {atrasados > 0 && <span className="text-amber-300"> · {atrasados} atrasados</span>}
        </p>
      </div>

      <div className="space-y-3">
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 mr-1">Fonte</span>
          {(['todos', 'Backlog', 'Roadmap'] as const).map(f => (
            <button key={f} className={chip(fonte === f)} onClick={() => setFonte(f)}>{f === 'todos' ? 'Todas' : f}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 mr-1">Status</span>
          <button className={chip(status === 'todos')} onClick={() => setStatus('todos')}>Todos</button>
          {(Object.keys(STATUS_STYLE) as StatusNorm[]).map(s => (
            <button key={s} className={chip(status === s)} onClick={() => setStatus(s)}>{STATUS_STYLE[s].label}</button>
          ))}
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 mr-1">Prioridade</span>
          <button className={chip(prio === 'todas')} onClick={() => setPrio('todas')}>Todas</button>
          {[1, 2, 3, 4].map(p => (
            <button key={p} className={chip(prio === p)} onClick={() => setPrio(p)}>{PRIO_LABEL[p]}</button>
          ))}
          <div className="relative ml-auto">
            <Search className="w-4 h-4 text-white/30 absolute left-3 top-2.5" />
            <input
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Buscar item ou área…"
              className="bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm text-white/80 w-64 focus:outline-none focus:border-[#2563EB]/40"
            />
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-white/8 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-white/[0.03] text-[10px] font-mono uppercase tracking-widest text-white/40">
              <th className="text-left px-4 py-2.5 font-medium">Item</th>
              <th className="text-left px-3 py-2.5 font-medium">Fonte</th>
              <th className="text-left px-3 py-2.5 font-medium">Área / Fase</th>
              <th className="text-left px-3 py-2.5 font-medium">Prio</th>
              <th className="text-left px-3 py-2.5 font-medium">Status</th>
              <th className="text-left px-3 py-2.5 font-medium">Resp.</th>
              <th className="text-left px-3 py-2.5 font-medium">Prazo</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map(i => {
              const st = STATUS_STYLE[i.status];
              return (
                <tr key={i.id} className="border-t border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-2.5 text-white/85">{i.title}</td>
                  <td className="px-3 py-2.5 text-white/40 font-mono text-xs">{i.fonte}</td>
                  <td className="px-3 py-2.5 text-white/50 text-xs">{i.fonte === 'Roadmap' ? i.fase : i.area}</td>
                  <td className="px-3 py-2.5 text-white/60 font-mono text-xs">P{i.prioridade}</td>
                  <td className="px-3 py-2.5">
                    <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 rounded border ${st.cls}`}>{st.label}</span>
                  </td>
                  <td className="px-3 py-2.5 text-white/50 text-xs">{i.owner}</td>
                  <td className={`px-3 py-2.5 font-mono text-xs ${i.status === 'atrasado' ? 'text-amber-300' : 'text-white/40'}`}>{i.prazo || '—'}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {items !== null && filtrados.length === 0 && (
          <div className="px-4 py-8 text-center text-sm text-white/30">Nenhum item com esses filtros.</div>
        )}
        {items === null && <div className="px-4 py-8 text-center text-sm text-white/30">Carregando itens do banco…</div>}
      </div>

      <div className="text-[11px] text-white/30">
        Fonte: <span className="font-mono">v_backlog_items</span> + <span className="font-mono">v_roadmap_tasks</span> (vivo).
        Editar é feito nos módulos Backlog e Roadmap; aqui é a visão consolidada filtrável.
      </div>
    </div>
  );
}
