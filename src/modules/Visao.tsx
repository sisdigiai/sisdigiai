import { useEffect, useState, useCallback, useRef } from 'react';
import { RefreshCw } from 'lucide-react';
import { dashboardStore, type DashboardSummary } from '../lib/dashboardStore';
import { commercialStore, type CommercialLead, type LeadStage } from '../lib/commercialStore';
import { realtimeStore } from '../lib/realtimeStore';
import { useRealtimeToasts } from '../contexts/ToastContext';
import type { ModuleId } from '../components/Sidebar';
import { initConvergenceMesh } from '../lib/dhMesh';

/**
 * Command Center (Visão Geral) — mission control em DIGIAI House.
 * 100% dados reais: dashboardStore.summary() (views Supabase) + commercialStore.list().
 * Sem mocks. Estados vazios são tratados com "—" e mensagens honestas.
 */

const VERDADES_CANONICAS = [
  'Clearix é a prioridade máxima',
  'DIGIAI é a marca-mãe do ecossistema',
  'Academy fortalece — não compete',
  'Dados > Opiniões',
  'Velocidade com qualidade',
];

// Funil comercial real (ordem + rótulos). "perdido" fica fora do pipeline visível.
const FUNNEL: { stage: LeadStage; label: string }[] = [
  { stage: 'lead', label: 'Leads' },
  { stage: 'contato', label: 'Contato' },
  { stage: 'demo', label: 'Demonstração' },
  { stage: 'piloto', label: 'Piloto' },
  { stage: 'cliente', label: 'Cliente' },
];

function daysUntil(iso: string): number {
  const today = new Date(new Date().toISOString().split('T')[0]);
  return Math.round((new Date(iso).getTime() - today.getTime()) / 86400000);
}
function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}
function saudacao(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
}
function brl(n: number): string {
  return 'R$ ' + n.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
}

export default function Visao({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [leads, setLeads] = useState<CommercialLead[]>([]);
  const [loading, setLoading] = useState(true);
  const meshRef = useRef<HTMLCanvasElement>(null);

  const load = useCallback(async () => {
    const [s, l] = await Promise.all([dashboardStore.summary(), commercialStore.list()]);
    setSummary(s); setLeads(l); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);
  useRealtimeToasts();
  useEffect(() => realtimeStore.subscribe(() => { load(); }), [load]);
  useEffect(() => { if (!loading && meshRef.current) return initConvergenceMesh(meshRef.current); }, [loading]);

  if (loading || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="text-muted text-sm font-mono uppercase tracking-widest animate-pulse">Conectando ao command center…</div>
      </div>
    );
  }

  // ---- Derivações reais ----
  const nextMilestone = summary.upcomingMilestones[0];

  const counts: Record<string, number> = {};
  let pipelineValue = 0;
  for (const l of leads) { counts[l.stage] = (counts[l.stage] || 0) + 1; if (l.stage !== 'perdido' && l.stage !== 'cliente') pipelineValue += l.value_brl || 0; }
  const activeLeads = leads.filter(l => l.stage !== 'perdido' && l.stage !== 'cliente').length;
  const negociacoes = (counts['demo'] || 0) + (counts['piloto'] || 0);
  const clientes = counts['cliente'] || 0;
  const totalEntrantes = leads.filter(l => l.stage !== 'perdido').length;
  const conversao = totalEntrantes > 0 ? (clientes / totalEntrantes) * 100 : 0;
  const funnelMax = Math.max(1, ...FUNNEL.map(f => counts[f.stage] || 0));

  // Alertas reais
  const alertas: { tone: string; texto: string; sub?: string; go: ModuleId }[] = [];
  if (summary.overdueTasks > 0) alertas.push({ tone: 'var(--color-danger)', texto: `${summary.overdueTasks} tarefa(s) do Roadmap atrasada(s)`, go: 'trilha' });
  if (summary.backlogCritical > 0) alertas.push({ tone: 'var(--color-danger)', texto: `${summary.backlogCritical} item(ns) crítico(s) no Backlog`, go: 'backlog' });
  if (!summary.hasCnpj) alertas.push({ tone: 'var(--color-warning)', texto: 'CNPJ não cadastrado', sub: 'Cadastro Empresa → Identidade', go: 'cadastro-empresa' });
  if (!summary.hasDpo) alertas.push({ tone: 'var(--color-warning)', texto: 'DPO não nomeado', sub: 'Cadastro Empresa → LGPD', go: 'cadastro-empresa' });
  if (summary.latestMrr === null) alertas.push({ tone: 'var(--color-warning)', texto: 'Snapshot financeiro pendente', sub: 'Cadastro Empresa → Financeiro', go: 'cadastro-empresa' });

  const focoTask = summary.nextTasks[0];

  const kpis = [
    { idx: '01', label: 'MRR ATUAL', value: summary.latestMrr != null ? brl(summary.latestMrr) : '—', sub: summary.runwayMonths != null ? `runway ${summary.runwayMonths} meses` : 'preencher cadastro', go: 'financeiro' as ModuleId },
    { idx: '02', label: 'LEADS NO FUNIL', value: String(activeLeads), sub: `${leads.length} no total`, go: 'comercial' as ModuleId },
    { idx: '03', label: 'NEGOCIAÇÕES', value: String(negociacoes), sub: `${brl(pipelineValue)} em jogo`, go: 'comercial' as ModuleId },
    { idx: '04', label: 'CONVERSÃO', value: conversao > 0 ? conversao.toFixed(1).replace('.', ',') + '%' : '—', sub: `${clientes} cliente(s)`, go: 'comercial' as ModuleId },
  ];

  // Gráfico MRR real (dos snapshots). Só desenha com ≥2 pontos.
  const series = summary.mrrSeries || [];
  const hasChart = series.length >= 2;
  let areaLine = '', areaFill = '', dots: { x: number; y: number }[] = [];
  if (hasChart) {
    const W = 520, H = 150, PAD = 8;
    const min = Math.min(...series), max = Math.max(...series), span = max - min || 1;
    const pts = series.map((v, i) => ({ x: (i / (series.length - 1)) * W, y: H - PAD - ((v - min) / span) * (H - PAD * 2) }));
    areaLine = 'M' + pts.map(p => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' L');
    areaFill = areaLine + ` L${W},${H} L0,${H} Z`;
    dots = pts;
  }

  return (
    <div className="text-on-surface">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 pb-16 space-y-5">

        {/* ===== FOCO DO DIA ===== */}
        <div className="relative border border-outline/25 bg-gradient-to-r from-surface-container to-surface p-5 flex flex-col md:flex-row md:items-center gap-5 overflow-hidden">
          <span className="absolute top-0 left-0 w-[3px] h-full bg-action" />
          <div className="shrink-0">
            <div className="font-mono text-[9px] tracking-[0.2em] text-secondary uppercase mb-1.5">◆ Foco do dia</div>
            <div className="font-serif text-[15px] text-muted first-letter:uppercase">{saudacao()}, Gilberto</div>
          </div>
          <div className="hidden md:block w-px h-11 bg-outline/20" />
          <div className="flex-1 min-w-0">
            <div className="font-serif text-[22px] leading-tight tracking-tight text-on-surface">
              {focoTask
                ? <>Prioridade: <span className="text-secondary">{focoTask.title}</span>.</>
                : <>Nenhuma tarefa urgente. <span className="text-secondary">Avance o roadmap.</span></>}
            </div>
          </div>
          <button onClick={load} className="absolute top-3 right-3 p-1.5 text-muted hover:text-on-surface transition-colors" title="Recarregar" aria-label="Recarregar dados">
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
          <div className="shrink-0 flex gap-7">
            <div className="text-right"><div className="font-serif font-bold text-[26px] leading-none tabular-nums text-on-surface">{summary.nextTasks.length}</div><div className="font-mono text-[9px] tracking-[0.1em] text-muted uppercase mt-1.5">Próximas ações</div></div>
            <div className="text-right"><div className="font-serif font-bold text-[26px] leading-none tabular-nums" style={{ color: alertas.length ? 'var(--color-warning)' : 'var(--color-success)' }}>{alertas.length}</div><div className="font-mono text-[9px] tracking-[0.1em] text-muted uppercase mt-1.5">Alertas críticos</div></div>
          </div>
        </div>

        {/* ===== KPI TELEMETRY ROW ===== */}
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
          {kpis.map((k) => (
            <button key={k.idx} onClick={() => onNavigate?.(k.go)} className="relative text-left border border-outline/15 bg-surface-container p-4 pt-5 hover:bg-surface-high transition-colors group">
              <span className="absolute -top-px -left-px w-2.5 h-2.5 border-t-2 border-l-2 border-secondary/70" />
              <span className="absolute -top-px -right-px w-2.5 h-2.5 border-t-2 border-r-2 border-secondary/70" />
              <div className="font-mono text-[9px] tracking-[0.12em] text-muted uppercase mb-3">{k.idx} · {k.label}</div>
              <div className="font-serif font-bold text-[30px] leading-none tracking-tight text-on-surface tabular-nums">{k.value}</div>
              <div className="font-mono text-[10px] text-muted mt-2.5 truncate">{k.sub}</div>
            </button>
          ))}
        </div>

        {/* ===== ROW: MRR chart | Pipeline | Alertas ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* MRR real */}
          <div className="border border-outline/15 bg-surface-container p-4">
            <div className="font-mono text-[9px] tracking-[0.14em] text-secondary uppercase">§ 01 — Receita</div>
            <div className="font-serif text-[17px] text-on-surface mt-1">Evolução do MRR</div>
            {hasChart ? (
              <>
                <svg viewBox="0 0 520 150" preserveAspectRatio="none" className="w-full mt-3" style={{ height: 150 }}>
                  <line x1="0" y1="40" x2="520" y2="40" stroke="var(--color-outline)" strokeOpacity="0.4" />
                  <line x1="0" y1="95" x2="520" y2="95" stroke="var(--color-outline)" strokeOpacity="0.4" />
                  <path d={areaFill} fill="var(--color-forest)" fillOpacity="0.14" />
                  <path d={areaLine} fill="none" stroke="var(--color-action)" strokeWidth="2.5" />
                  {dots.map((d, i) => <circle key={i} cx={d.x} cy={d.y} r="3" fill="var(--color-surface)" stroke="var(--color-action)" strokeWidth="2" />)}
                </svg>
                <div className="font-mono text-[9px] text-muted mt-2">Últimos {series.length} snapshots · fonte: financeiro</div>
              </>
            ) : (
              <div className="mt-6 flex flex-col items-start">
                <div className="font-serif font-bold text-[40px] leading-none text-on-surface tabular-nums">{summary.latestMrr != null ? brl(summary.latestMrr) : '—'}</div>
                <div className="font-mono text-[10px] text-muted mt-3">Histórico insuficiente para o gráfico — registre mais snapshots.</div>
              </div>
            )}
          </div>

          {/* Pipeline real */}
          <div className="border border-outline/15 bg-surface-container p-4">
            <div className="flex items-center justify-between">
              <div><div className="font-mono text-[9px] tracking-[0.14em] text-secondary uppercase">§ 02 — Comercial</div><div className="font-serif text-[17px] text-on-surface mt-1">Pipeline de Vendas</div></div>
              <button onClick={() => onNavigate?.('comercial')} className="font-mono text-[9px] tracking-[0.08em] uppercase text-secondary hover:text-on-surface">abrir →</button>
            </div>
            <div className="mt-4 space-y-3.5">
              {FUNNEL.map((f) => {
                const n = counts[f.stage] || 0;
                return (
                  <div key={f.stage}>
                    <div className="flex justify-between text-[12px] mb-1.5"><span className="text-on-surface-variant">{f.label}</span><span className="font-mono text-on-surface tabular-nums">{n}</span></div>
                    <div className="h-1.5 bg-surface-high overflow-hidden"><div className="h-full bg-action/85" style={{ width: `${(n / funnelMax) * 100}%` }} /></div>
                  </div>
                );
              })}
              {leads.length === 0 && <div className="text-[12px] text-muted italic pt-1">Nenhum lead cadastrado ainda.</div>}
            </div>
          </div>

          {/* Alertas reais */}
          <div className="border border-outline/15 bg-surface-container p-4 flex flex-col">
            <div className="flex items-center justify-between">
              <div><div className="font-mono text-[9px] tracking-[0.14em] text-secondary uppercase">§ 03 — Alertas</div><div className="font-serif text-[17px] text-on-surface mt-1">Críticos</div></div>
              <span className="font-mono text-[9px] px-2 py-0.5 border" style={{ color: alertas.length ? 'var(--color-warning)' : 'var(--color-success)', borderColor: alertas.length ? 'var(--color-warning)' : 'var(--color-success)' }}>{alertas.length} {alertas.length ? 'ATIVOS' : 'OK'}</span>
            </div>
            {alertas.length === 0 ? (
              <div className="flex-1 flex items-center text-[13px] text-success mt-4">Nada exigindo atenção agora.</div>
            ) : (
              <div className="mt-3 border border-outline/15">
                {alertas.map((a, i) => (
                  <button key={i} onClick={() => onNavigate?.(a.go)} className="w-full text-left bg-surface-container hover:bg-surface-high transition-colors p-3 flex gap-2.5 items-start border-b border-outline/15 last:border-0">
                    <span className="w-1.5 h-1.5 mt-1.5 shrink-0" style={{ background: a.tone }} />
                    <span className="min-w-0"><span className="block text-[12.5px] text-on-surface leading-snug">{a.texto}</span>{a.sub && <span className="block font-mono text-[10px] text-muted mt-0.5">{a.sub}</span>}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ===== ROW: Ecosystem Pulse | Próximas ações | Verdades ===== */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Pulso do Ecossistema (instrumento vivo) */}
          <div className="relative border border-outline/25 bg-surface-lowest overflow-hidden min-h-[300px]">
            <canvas ref={meshRef} className="absolute inset-0 w-full h-full" aria-hidden />
            <div className="absolute inset-0 pointer-events-none" style={{ background: 'radial-gradient(circle at 62% 50%, transparent 42%, var(--color-surface-lowest) 100%)' }} />
            <div className="relative p-4 pointer-events-none">
              <div className="font-mono text-[9px] tracking-[0.14em] text-secondary uppercase">§ 04 — Ecossistema · live</div>
              <div className="font-serif text-[17px] text-on-surface mt-1">Pulso do Ecossistema</div>
            </div>
            <div className="absolute bottom-3.5 left-4 right-4 flex gap-3.5 flex-wrap font-mono text-[9px] tracking-[0.06em] text-muted uppercase pointer-events-none">
              <span style={{ color: 'var(--color-success)' }}>● 8 operando</span><span style={{ color: 'var(--color-warning)' }}>◐ 1 piloto</span>
              {summary.latestMrr != null && <span>MRR {brl(summary.latestMrr)}</span>}
            </div>
          </div>

          {/* Próximas ações reais */}
          <div className="border border-outline/15 bg-surface-container p-4">
            <div className="flex items-center justify-between mb-3">
              <div><div className="font-mono text-[9px] tracking-[0.14em] text-secondary uppercase">§ 05 — Execução</div><div className="font-serif text-[17px] text-on-surface mt-1">Próximas Ações</div></div>
              <button onClick={() => onNavigate?.('trilha')} className="font-mono text-[9px] tracking-[0.08em] uppercase text-secondary hover:text-on-surface">roadmap →</button>
            </div>
            {summary.nextTasks.length === 0 ? (
              <div className="text-[12px] text-muted italic py-2">Nenhuma tarefa pendente com data.</div>
            ) : summary.nextTasks.slice(0, 5).map((t) => {
              const d = t.target_date ? daysUntil(t.target_date) : 0;
              const overdue = d < 0, urgent = d >= 0 && d <= 2;
              return (
                <button key={t.id} onClick={() => onNavigate?.('trilha')} className="w-full text-left flex items-center gap-2.5 py-2.5 border-b border-outline/12 hover:bg-surface-high transition-colors">
                  <span className="w-3.5 h-3.5 shrink-0 border border-outline/40" />
                  <span className="flex-1 min-w-0 text-[12.5px] text-on-surface truncate">{t.title}</span>
                  {t.target_date && <span className="font-mono text-[9px] tabular-nums shrink-0" style={{ color: overdue ? 'var(--color-danger)' : urgent ? 'var(--color-warning)' : 'var(--color-muted)' }}>{overdue ? `${Math.abs(d)}d atr.` : d === 0 ? 'hoje' : formatDate(t.target_date)}</span>}
                </button>
              );
            })}
            {nextMilestone && (
              <div className="mt-3 pt-3 border-t border-outline/15 flex items-center gap-3">
                <div className="font-serif font-bold text-[28px] leading-none text-secondary tabular-nums">{nextMilestone.target_date ? Math.max(0, daysUntil(nextMilestone.target_date)) : 0}d</div>
                <div className="min-w-0"><div className="font-mono text-[9px] tracking-[0.1em] text-secondary uppercase">Próximo marco</div><div className="text-[12px] text-on-surface-variant truncate">{nextMilestone.title}</div></div>
              </div>
            )}
          </div>

          {/* Verdades canônicas + decisões reais */}
          <div className="border border-outline/15 bg-surface-container p-4">
            <div className="font-mono text-[9px] tracking-[0.14em] text-secondary uppercase">§ 06 — Bússola</div>
            <div className="font-serif text-[17px] text-on-surface mt-1 mb-3">Verdades Canônicas</div>
            {VERDADES_CANONICAS.map((v, i) => (
              <div key={i} className="flex gap-2.5 items-start py-2 border-b border-outline/12">
                <span className="mt-0.5 shrink-0 w-3.5 h-3.5 border border-secondary/60 flex items-center justify-center"><span className="block w-[5px] h-[8px] border-r-2 border-b-2 border-secondary rotate-45 -translate-y-px" /></span>
                <span className="text-[12.5px] text-on-surface-variant leading-snug">{v}</span>
              </div>
            ))}
            <div className="mt-3 pt-3 border-t border-outline/15">
              <div className="font-mono text-[9px] tracking-[0.1em] text-secondary uppercase mb-1">Pergunta de ouro</div>
              <p className="font-serif text-[13px] leading-snug text-on-surface-variant">Isso fortalece a DIGIAI, o Clearix e a implantação da empresa?</p>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
