import { useEffect, useMemo, useState, useCallback } from 'react';
import { Search, AlertTriangle, LayoutList, Boxes, CheckSquare, Square, CheckCircle2 } from 'lucide-react';
import { backlogStore } from '../lib/backlogStore';
import { roadmapStore } from '../lib/roadmapStore';
import { realtimeStore } from '../lib/realtimeStore';
import { PRODUTOS, PRODUTO_BY_SLUG, DEGRAU_LABEL, type ProdutoInfo } from './Portfolio';
import PageHeader from '../components/PageHeader';

type Fonte = 'Backlog' | 'Roadmap';
type StatusNorm = 'done' | 'in_progress' | 'pending' | 'blocked' | 'atrasado' | 'cancelled';
type Vista = 'produto' | 'lista';

interface MasterItem {
  id: string;
  rawId: string;
  fonte: Fonte;
  title: string;
  area: string;
  fase: string;
  prioridade: number;
  status: StatusNorm;
  owner: string;
  prazo: string | null;
  productId: string | null;
  blocker: string | null;
}

const STATUS_STYLE: Record<StatusNorm, { label: string; cls: string }> = {
  done:        { label: 'Concluído',   cls: 'bg-success/15 text-success border-success/30' },
  in_progress: { label: 'Em andamento',cls: 'bg-secondary-container/40 text-secondary border-secondary/40' },
  pending:     { label: 'Pendente',    cls: 'bg-surface-high text-on-surface-variant border-outline/10' },
  blocked:     { label: 'Bloqueado',   cls: 'bg-danger/15 text-danger border-danger/30' },
  atrasado:    { label: 'Atrasado',    cls: 'bg-warning/15 text-warning border-warning/30' },
  cancelled:   { label: 'Cancelado',   cls: 'bg-surface-low text-muted border-outline/10' },
};

const PRIO_LABEL: Record<number, string> = { 1: 'P1 crítico', 2: 'P2 alto', 3: 'P3 médio', 4: 'P4 baixo' };

const NOME_LIVRE: Record<string, string> = {
  'digiai': 'DIGIAI · holding',
  'sem-produto': 'Sem produto',
};

function ProdutoTile({ info, slug, size = 9 }: { info?: ProdutoInfo; slug: string; size?: 7 | 9 }) {
  const px = size === 9 ? 'w-9 h-9' : 'w-7 h-7';
  const logoPx = size === 9 ? 'w-5 h-5' : 'w-4 h-4';
  if (info) {
    return (
      <div
        className={`${px} flex items-center justify-center overflow-hidden font-mono text-[11px] font-bold shrink-0`}
        style={info.badge ? undefined : { background: info.cor, color: 'var(--color-on-action)' }}
      >
        {info.logo
          ? <img src={info.logo} alt="" className={info.badge ? `${px} object-cover` : `${logoPx} object-contain`} style={info.badge ? undefined : { filter: 'brightness(0) invert(1)' }} />
          : info.mono}
      </div>
    );
  }
  return (
    <div className={`${px} flex items-center justify-center font-mono text-[11px] font-bold shrink-0 bg-surface-high text-muted`}>
      {slug.slice(0, 2).toUpperCase()}
    </div>
  );
}

function Escada({ degrau }: { degrau: number }) {
  return (
    <div className="flex items-center gap-1.5">
      <div className="flex items-center gap-1">
        {[1, 2, 3, 4, 5].map(i => (
          <span
            key={i}
            title={DEGRAU_LABEL[i]}
            className="w-2 h-2 rounded-full"
            style={
              i < degrau ? { background: 'var(--color-success)' }
              : i === degrau ? { background: 'var(--color-warning)', boxShadow: '0 0 0 2px color-mix(in srgb, var(--color-warning) 22%, transparent)' }
              : { border: '1px solid var(--color-muted)' }
            }
          />
        ))}
      </div>
      <span className="font-mono text-[9px] uppercase tracking-wider text-warning">{DEGRAU_LABEL[degrau]}</span>
    </div>
  );
}

export default function ListaMestra() {
  const [items, setItems] = useState<MasterItem[] | null>(null);
  const [vista, setVista] = useState<Vista>('produto');
  const [fonte, setFonte] = useState<'todos' | Fonte>('todos');
  const [status, setStatus] = useState<'todos' | StatusNorm>('todos');
  const [prio, setPrio] = useState<'todas' | number>('todas');
  const [busca, setBusca] = useState('');

  const load = useCallback(async () => {
    const hoje = new Date().toISOString().slice(0, 10);
    try {
      const [backlog, tasks] = await Promise.all([backlogStore.list(), roadmapStore.listTasks()]);
      const b: MasterItem[] = backlog.map(x => ({
        id: `b-${x.id}`,
        rawId: x.id,
        fonte: 'Backlog',
        title: x.title,
        area: x.area || '—',
        fase: '—',
        prioridade: x.priority,
        status: (x.status === 'cancelled' ? 'cancelled' : x.status) as StatusNorm,
        owner: x.owner || '—',
        prazo: x.due_date,
        productId: x.product_id,
        blocker: x.blocker,
      }));
      const r: MasterItem[] = tasks.map(t => {
        let st: StatusNorm = 'pending';
        if (t.completed_at) st = 'done';
        else if (t.target_date && t.target_date < hoje) st = 'atrasado';
        return {
          id: `r-${t.id}`,
          rawId: t.id,
          fonte: 'Roadmap',
          title: t.title,
          area: t.track ? `Track ${t.track}` : '—',
          fase: `Fase ${t.phase_number}`,
          prioridade: t.priority,
          status: st,
          owner: t.track ? `Track ${t.track}` : '—',
          prazo: t.target_date,
          productId: null,
          blocker: null,
        };
      });
      setItems([...b, ...r]);
    } catch {
      setItems([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Vivo: mudanças no Backlog ou no Roadmap (feitas em qualquer módulo) refletem aqui
  useEffect(() => {
    const unsub = realtimeStore.subscribe((event) => {
      if (event.table === 'backlog_items' || event.table === 'roadmap_tasks' || event.table === 'roadmap_phases') {
        load();
      }
    });
    return () => unsub();
  }, [load]);

  // Concluir/reabrir direto daqui — grava na fonte certa (Backlog ou Roadmap)
  const toggleItem = async (i: MasterItem) => {
    const done = i.status === 'done';
    setItems(prev => (prev ?? []).map(x => x.id === i.id ? { ...x, status: done ? 'pending' : 'done' } : x));
    if (i.fonte === 'Backlog') {
      await backlogStore.updateStatus(i.rawId, done ? 'pending' : 'done');
    } else {
      await roadmapStore.toggleTask(i.rawId, !done, null);
    }
  };

  const passaFiltro = useCallback((i: MasterItem) => {
    const q = busca.trim().toLowerCase();
    return (
      (status === 'todos' || i.status === status) &&
      (prio === 'todas' || i.prioridade === prio) &&
      (q === '' || i.title.toLowerCase().includes(q) || i.area.toLowerCase().includes(q) || (i.productId ?? '').includes(q))
    );
  }, [busca, status, prio]);

  const filtrados = useMemo(() =>
    (items ?? [])
      .filter(i => (fonte === 'todos' || i.fonte === fonte) && passaFiltro(i))
      .sort((a, b) => a.prioridade - b.prioridade || a.fase.localeCompare(b.fase)),
  [items, fonte, passaFiltro]);

  // Por produto: TODOS os produtos do Portfólio + frentes livres do Backlog (digiai, sem-produto)
  const { grupos, emDia } = useMemo(() => {
    const backlog = (items ?? []).filter(i => i.fonte === 'Backlog' && passaFiltro(i));
    const porSlug = new Map<string, MasterItem[]>();
    for (const it of backlog) {
      const key = it.productId || 'sem-produto';
      if (!porSlug.has(key)) porSlug.set(key, []);
      porSlug.get(key)!.push(it);
    }
    const slugs = new Set<string>([...PRODUTOS.map(p => p.slug), ...porSlug.keys()]);
    const all = [...slugs].map(slug => {
      const info = PRODUTO_BY_SLUG[slug];
      const its = (porSlug.get(slug) ?? []).sort((a, b) => a.prioridade - b.prioridade);
      const abertos = its.filter(i => i.status !== 'done' && i.status !== 'cancelled').length;
      const bloqueados = its.filter(i => i.status === 'blocked').length;
      return {
        slug,
        info,
        nome: info?.nome ?? NOME_LIVRE[slug] ?? slug,
        items: its,
        abertos,
        bloqueados,
      };
    });
    const comPendencia = all.filter(g => g.items.length > 0)
      .sort((a, b) => b.bloqueados - a.bloqueados || b.abertos - a.abertos || (a.info?.maturidade ?? 0) - (b.info?.maturidade ?? 0));
    const semPendencia = all.filter(g => g.items.length === 0)
      .sort((a, b) => (b.info?.maturidade ?? 0) - (a.info?.maturidade ?? 0));
    return { grupos: comPendencia, emDia: semPendencia };
  }, [items, passaFiltro]);

  const abertosTotal = (items ?? []).filter(i => i.status !== 'done' && i.status !== 'cancelled').length;
  const bloqueadosTotal = (items ?? []).filter(i => i.status === 'blocked').length;
  const atrasados = (items ?? []).filter(i => i.status === 'atrasado').length;

  const chip = (active: boolean) =>
    `px-3 py-1 text-xs font-medium border transition-all ${
      active ? 'bg-secondary-container/40 text-on-surface border-secondary/40' : 'text-on-surface-variant border-outline/10 hover:text-on-surface'
    }`;

  const CheckBtn = ({ i }: { i: MasterItem }) => (
    <button
      onClick={() => toggleItem(i)}
      className={`shrink-0 transition-colors ${i.status === 'done' ? 'text-success' : 'text-muted hover:text-success'}`}
      title={i.status === 'done' ? 'Reabrir' : 'Concluir'}
    >
      {i.status === 'done' ? <CheckSquare size={15} /> : <Square size={15} />}
    </button>
  );

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Implantação"
        title="Lista Mestra"
        subtitle={
          <>
            {items === null ? 'Carregando…' : `${abertosTotal} abertos`}
            {bloqueadosTotal > 0 && <span className="text-danger"> · {bloqueadosTotal} bloqueados</span>}
            {atrasados > 0 && <span className="text-warning"> · {atrasados} atrasados</span>}
            {' '}· o que falta por produto (Backlog) + estratégia (Roadmap) · vivo
          </>
        }
      />

      <div className="space-y-5">
        {/* Alternador de visão */}
        <div className="flex items-center gap-1 border border-outline/15 w-fit p-0.5">
          <button
            onClick={() => setVista('produto')}
            className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5 transition-colors ${vista === 'produto' ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}
          >
            <Boxes className="w-3.5 h-3.5" /> Por produto
          </button>
          <button
            onClick={() => setVista('lista')}
            className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 flex items-center gap-1.5 transition-colors ${vista === 'lista' ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}
          >
            <LayoutList className="w-3.5 h-3.5" /> Lista
          </button>
        </div>

        {/* Filtros */}
        <div className="space-y-3">
          {vista === 'lista' && (
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted mr-1">Fonte</span>
              {(['todos', 'Backlog', 'Roadmap'] as const).map(f => (
                <button key={f} className={chip(fonte === f)} onClick={() => setFonte(f)}>{f === 'todos' ? 'Todas' : f}</button>
              ))}
            </div>
          )}
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted mr-1">Status</span>
            <button className={chip(status === 'todos')} onClick={() => setStatus('todos')}>Todos</button>
            {(Object.keys(STATUS_STYLE) as StatusNorm[]).map(s => (
              <button key={s} className={chip(status === s)} onClick={() => setStatus(s)}>{STATUS_STYLE[s].label}</button>
            ))}
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted mr-1">Prioridade</span>
            <button className={chip(prio === 'todas')} onClick={() => setPrio('todas')}>Todas</button>
            {[1, 2, 3, 4].map(p => (
              <button key={p} className={chip(prio === p)} onClick={() => setPrio(p)}>{PRIO_LABEL[p]}</button>
            ))}
            <div className="relative ml-auto">
              <Search className="w-4 h-4 text-muted absolute left-3 top-2.5" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar item, área ou produto…"
                className="bg-surface-container border border-outline/15 pl-9 pr-3 py-2 text-sm text-on-surface w-64 focus:outline-none focus:border-secondary/40"
              />
            </div>
          </div>
        </div>

        {items === null && <div className="px-4 py-8 text-center text-sm text-muted">Carregando itens do banco…</div>}

        {/* VISTA: Por produto */}
        {items !== null && vista === 'produto' && (
          <div className="space-y-4">
            <div className="text-[11px] text-muted">
              O que falta em cada produto, do Backlog (<span className="font-mono">ops.backlog_items</span>) agrupado por <span className="font-mono">product_id</span>.
              A estratégia 0→milhão vive no módulo <span className="text-on-surface">Roadmap</span>. Concluir aqui grava na fonte.
            </div>
            {grupos.length === 0 && <div className="px-4 py-8 text-center text-sm text-muted">Nenhum item com esses filtros.</div>}
            {grupos.map(g => (
              <div key={g.slug} className="border border-outline/15 bg-surface-container">
                {/* Cabeçalho do produto */}
                <div className="flex items-center gap-3 p-4 border-b border-outline/10">
                  <ProdutoTile info={g.info} slug={g.slug} />
                  <div className="flex-1 min-w-0">
                    <div className="font-serif text-base font-semibold text-on-surface truncate">{g.nome}</div>
                    <div className="mt-1 flex items-center gap-3">
                      {g.info?.degrau
                        ? <Escada degrau={g.info.degrau} />
                        : g.info
                          ? <div className="h-1.5 w-28 bg-surface-lowest overflow-hidden"><div className="h-full" style={{ width: `${g.info.maturidade}%`, background: g.info.cor }} /></div>
                          : <span className="font-mono text-[9px] uppercase tracking-wider text-muted">frente da holding</span>}
                      {g.info && <span className="font-mono text-[10px] text-muted tabular-nums">{g.info.maturidade}%</span>}
                    </div>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm font-semibold text-on-surface tabular-nums">{g.abertos} <span className="text-[10px] font-normal text-muted">abertos</span></div>
                    {g.bloqueados > 0 && (
                      <div className="font-mono text-[10px] text-danger flex items-center gap-1 justify-end mt-0.5">
                        <AlertTriangle className="w-3 h-3" /> {g.bloqueados} bloqueado{g.bloqueados > 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                </div>
                {/* Itens do produto */}
                <div className="divide-y divide-outline/10">
                  {g.items.map(i => {
                    const st = STATUS_STYLE[i.status];
                    return (
                      <div key={i.id} className="flex items-start gap-3 px-4 py-2.5">
                        <span className="mt-0.5"><CheckBtn i={i} /></span>
                        <span className="font-mono text-[10px] text-muted tabular-nums mt-1 w-6 shrink-0">P{i.prioridade}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className={`text-sm ${i.status === 'done' ? 'text-muted line-through' : 'text-on-surface'}`}>{i.title}</span>
                            <span className={`text-[9px] font-mono uppercase tracking-wider px-1.5 py-0.5 border ${st.cls}`}>{st.label}</span>
                          </div>
                          {i.blocker && i.status !== 'done' && <div className="text-[11px] text-muted mt-0.5 leading-snug">{i.blocker}</div>}
                        </div>
                        {i.prazo && <span className="font-mono text-[10px] text-muted shrink-0 mt-1">{i.prazo}</span>}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {/* Produtos em dia — sem pendência aberta no Backlog */}
            {emDia.length > 0 && (
              <div className="border border-outline/15 bg-surface-container">
                <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2">
                  <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted">
                    Sem pendência no Backlog ({emDia.length}) — cobertura completa do portfólio
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-outline/10">
                  {emDia.map(g => (
                    <div key={g.slug} className="bg-surface-container flex items-center gap-2.5 px-3 py-2">
                      <ProdutoTile info={g.info} slug={g.slug} size={7} />
                      <div className="flex-1 min-w-0">
                        <div className="text-[13px] font-medium text-on-surface truncate">{g.nome}</div>
                        {g.info && <span className="font-mono text-[9px] text-muted tabular-nums">{g.info.maturidade}% · {g.info.degrau ? DEGRAU_LABEL[g.info.degrau] : g.info.tier}</span>}
                      </div>
                      <CheckCircle2 className="w-3.5 h-3.5 text-success shrink-0" />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* VISTA: Lista (tabela consolidada) */}
        {items !== null && vista === 'lista' && (
          <>
            <div className="border border-outline/10 overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-surface-low text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
                    <th className="px-3 py-2.5 w-8" aria-label="Concluir" />
                    <th className="text-left px-2 py-2.5 font-medium">Item</th>
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
                      <tr key={i.id} className="border-t border-outline/10 hover:bg-surface-low">
                        <td className="px-3 py-2.5"><CheckBtn i={i} /></td>
                        <td className={`px-2 py-2.5 ${i.status === 'done' ? 'text-muted line-through' : 'text-on-surface'}`}>{i.title}</td>
                        <td className="px-3 py-2.5 text-muted font-mono text-xs">{i.fonte}</td>
                        <td className="px-3 py-2.5 text-on-surface-variant text-xs">{i.fonte === 'Roadmap' ? i.fase : i.area}</td>
                        <td className="px-3 py-2.5 text-on-surface-variant font-mono text-xs">P{i.prioridade}</td>
                        <td className="px-3 py-2.5">
                          <span className={`text-[9px] font-mono uppercase tracking-wider px-2 py-0.5 border ${st.cls}`}>{st.label}</span>
                        </td>
                        <td className="px-3 py-2.5 text-on-surface-variant text-xs">{i.owner}</td>
                        <td className={`px-3 py-2.5 font-mono text-xs ${i.status === 'atrasado' ? 'text-warning' : 'text-muted'}`}>{i.prazo || '—'}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {filtrados.length === 0 && (
                <div className="px-4 py-8 text-center text-sm text-muted">Nenhum item com esses filtros.</div>
              )}
            </div>
            <div className="text-[11px] text-muted">
              Fonte: <span className="font-mono">v_backlog_items</span> + <span className="font-mono">v_roadmap_tasks</span> (vivo, realtime).
              Concluir aqui grava na fonte (Backlog/Roadmap); criar e editar itens é nos módulos de origem.
            </div>
          </>
        )}
      </div>
    </div>
  );
}
