import { useEffect, useState, useCallback } from 'react';
import {
  Target, AlertCircle, CheckCircle2, Calendar, AlertOctagon,
  Zap, GitBranch, DollarSign, RefreshCw, Flag, Award,
  Circle
} from 'lucide-react';
import { dashboardStore, type DashboardSummary } from '../lib/dashboardStore';
import type { Track } from '../lib/roadmapStore';
import { realtimeStore } from '../lib/realtimeStore';
import { useRealtimeToasts } from '../contexts/ToastContext';
import type { ModuleId } from '../components/Sidebar';

const VERDADES_CANONICAS = [
  { texto: 'Clearix é a prioridade máxima da DIGIAI', nível: 'máximo' },
  { texto: 'DIGIAI é a marca-mãe de todo o ecossistema', nível: 'máximo' },
  { texto: 'Academy fortalece DIGIAI e Clearix — não compete', nível: 'máximo' },
  { texto: 'Nexus apoia treinamento sem consumir foco comercial agora', nível: 'alto' },
  { texto: 'Lumina já valida uso interno, próxima fase é monetização externa', nível: 'alto' },
  { texto: 'Pulso trabalha primeiro a favor da DIGIAI', nível: 'médio' },
  { texto: 'Polapetit e Qual a Foto são segunda vertical futura', nível: 'baixo' },
  { texto: 'Nipo School é frente institucional e filantrópica', nível: 'baixo' },
  { texto: 'DIGIAI App é infraestrutura interna, não produto de mercado', nível: 'médio' },
];

const nivelCor: Record<string, string> = {
  máximo: 'border-secondary text-secondary',
  alto: 'border-secondary/50 text-secondary/80',
  médio: 'border-outline/40 text-on-surface-variant',
  baixo: 'border-outline/20 text-muted',
};

const trackColor: Record<Track, string> = {
  A: 'bg-fuchsia-500/15 text-fuchsia-300 border-fuchsia-500/30',
  B: 'bg-secondary/15 text-secondary border-secondary/30',
  C: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
};

function formatDate(iso: string): string {
  const d = new Date(iso + 'T00:00:00');
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function daysUntil(iso: string): number {
  const today = new Date(new Date().toISOString().split('T')[0]);
  const target = new Date(iso);
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

export default function Visao({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setSummary(await dashboardStore.summary());
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Toasts globais para qualquer mudança externa (cowork, outra aba, etc.)
  useRealtimeToasts();

  // Dashboard também recarrega em qualquer mudança nas tabelas ops
  useEffect(() => {
    const unsub = realtimeStore.subscribe(() => {
      load();
    });
    return () => unsub();
  }, [load]);

  if (loading || !summary) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-muted text-sm font-mono uppercase tracking-widest">Carregando dashboard...</div>
      </div>
    );
  }

  const totalProgress = summary.totalTasks > 0
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  // Próximo marco com contagem regressiva
  const nextMilestone = summary.upcomingMilestones[0];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-10">
      <div className="flex items-start justify-between gap-4">
        <div>
          <span className="font-mono text-[11px] text-secondary uppercase tracking-[0.2em] mb-2 block">Dashboard Interno</span>
          <h1 className="font-serif text-4xl font-semibold tracking-tight text-on-surface">Visão da Empresa</h1>
          <div className="h-px w-24 bg-secondary mt-4" />
          <p className="text-on-surface-variant mt-3 text-sm">Dashboard em tempo real · dados do Supabase</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-surface-highest text-muted hover:text-on-surface transition-colors" title="Recarregar">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Alertas críticos no topo */}
      {(summary.overdueTasks > 0 || summary.backlogCritical > 0) && (
        <div className="bg-red-500/5 border border-red-500/30 p-5 flex items-start gap-3">
          <AlertOctagon className="w-6 h-6 text-red-400 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-400 mb-1">Atenção necessária</div>
            <div className="flex flex-wrap gap-4 text-sm text-on-surface-variant">
              {summary.overdueTasks > 0 && (
                <span>⚠ {summary.overdueTasks} tarefa{summary.overdueTasks > 1 ? 's' : ''} do Roadmap atrasada{summary.overdueTasks > 1 ? 's' : ''}</span>
              )}
              {summary.backlogCritical > 0 && (
                <span>🔥 {summary.backlogCritical} item{summary.backlogCritical > 1 ? 's' : ''} crítico{summary.backlogCritical > 1 ? 's' : ''} no Backlog</span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Fase atual + Métrica + Progresso */}
      {summary.currentPhase && (
        <div className="bg-secondary-container/25 border border-secondary/30 p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 bg-secondary-container border border-secondary/40 flex items-center justify-center text-2xl font-serif font-bold text-secondary shrink-0">
              {summary.currentPhase.phase_number}
            </div>
            <div className="flex-1">
              <div className="text-xs font-mono text-secondary uppercase tracking-widest">Fase atual do Roadmap</div>
              <div className="text-xl font-serif font-semibold text-on-surface mt-0.5">{summary.currentPhase.nome}</div>
              <div className="text-sm text-on-surface-variant mt-0.5">{summary.currentPhase.objetivo}</div>

              {summary.currentPhaseProgress && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-on-surface-variant">Progresso desta fase</span>
                    <span className="text-secondary font-mono font-semibold">
                      {summary.currentPhaseProgress.completed_tasks}/{summary.currentPhaseProgress.total_tasks} · {summary.currentPhaseProgress.percent_complete}%
                    </span>
                  </div>
                  <div className="h-2 bg-surface-lowest overflow-hidden">
                    <div
                      className="h-full bg-secondary transition-all duration-500"
                      style={{ width: `${parseFloat(summary.currentPhaseProgress.percent_complete)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 bg-surface-lowest p-3 flex items-start gap-2">
                <Target className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">Métrica única da fase</div>
                  <div className="text-sm text-on-surface">{summary.currentPhase.metrica_unica}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4 KPIs principais */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KpiCard
          icon={<GitBranch className="w-4 h-4" />}
          label="Roadmap"
          value={`${totalProgress}%`}
          sub={`${summary.completedTasks}/${summary.totalTasks} tarefas`}
          color="text-secondary"
          onClick={() => onNavigate?.('trilha')}
        />
        <KpiCard
          icon={<Zap className="w-4 h-4" />}
          label="Backlog"
          value={String(summary.backlogInProgress)}
          sub={`em andamento · ${summary.backlogCritical} críticos`}
          color={summary.backlogCritical > 0 ? 'text-red-400' : 'text-amber-400'}
          onClick={() => onNavigate?.('backlog')}
        />
        <KpiCard
          icon={<Award className="w-4 h-4" />}
          label="Decisões"
          value={String(summary.totalDecisions)}
          sub="registradas"
          color="text-emerald-400"
          onClick={() => onNavigate?.('decisoes')}
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4" />}
          label="MRR"
          value={summary.latestMrr != null ? `R$ ${summary.latestMrr.toFixed(0)}` : '—'}
          sub={summary.runwayMonths != null ? `runway ${summary.runwayMonths} meses` : 'preencher Cadastro'}
          color="text-on-surface-variant"
          onClick={() => onNavigate?.('financeiro')}
        />
      </div>

      {/* Grid: Próximas tarefas + Próximo marco */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Próximas 7 tarefas */}
        <div className="lg:col-span-2 bg-surface-low border border-outline/10 p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-secondary" />
            <h2 className="font-serif text-lg font-semibold text-on-surface">Próximas 7 tarefas</h2>
          </div>
          {summary.nextTasks.length === 0 ? (
            <div className="text-sm text-muted italic py-4">Nenhuma tarefa pendente com data.</div>
          ) : (
            <div className="space-y-2">
              {summary.nextTasks.map((t) => {
                const d = t.target_date ? daysUntil(t.target_date) : 0;
                const overdue = d < 0;
                const urgent = d >= 0 && d <= 2;
                return (
                  <button key={t.id} onClick={() => onNavigate?.('trilha')} className={`w-full text-left flex items-start gap-3 p-2 transition-colors hover:bg-surface-highest ${overdue ? 'bg-red-500/5' : urgent ? 'bg-amber-500/5' : ''}`}>
                    <Circle className="w-3.5 h-3.5 text-muted mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-on-surface">{t.title}</span>
                        {t.track && (
                          <span className={`text-[9px] font-mono px-1.5 border ${trackColor[t.track]}`}>{t.track}</span>
                        )}
                        <span className="text-[9px] font-mono text-muted">F{t.phase_number}</span>
                      </div>
                      {t.target_date && (
                        <div className={`text-xs mt-0.5 font-mono ${overdue ? 'text-red-400' : urgent ? 'text-amber-400' : 'text-muted'}`}>
                          {formatDate(t.target_date)} · {overdue ? `${Math.abs(d)}d atrasado` : d === 0 ? 'hoje' : `em ${d}d`}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximo marco destacado */}
        <div onClick={() => onNavigate?.('trilha')} className="bg-surface-low border border-outline/10 p-5 cursor-pointer hover:border-secondary/40 transition-colors">
          <div className="flex items-center gap-2 mb-3">
            <Flag className="w-5 h-5 text-secondary" />
            <h2 className="font-serif text-base font-semibold text-on-surface">Próximo marco</h2>
          </div>
          {nextMilestone ? (
            <>
              <div className="text-xs font-mono text-secondary uppercase tracking-widest mb-1">
                {nextMilestone.category === 'decision_gate' ? 'Decision gate' : 'Marco'}
              </div>
              <div className="font-medium text-on-surface mb-3">{nextMilestone.title}</div>
              {nextMilestone.target_date && (
                <div className="text-4xl font-serif font-bold text-secondary">
                  {Math.max(0, daysUntil(nextMilestone.target_date))}d
                </div>
              )}
              <div className="text-xs text-muted mt-1">
                {nextMilestone.target_date && formatDate(nextMilestone.target_date)} · Fase {nextMilestone.phase_number}
              </div>
            </>
          ) : (
            <div className="text-sm text-muted italic">Nenhum marco próximo.</div>
          )}
        </div>
      </div>

      {/* Status institucional */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard label="CNPJ cadastrado" done={summary.hasCnpj} hint="Cadastro Empresa → Identidade" onClick={() => onNavigate?.('cadastro-empresa')} />
        <StatusCard label="DPO nomeado" done={summary.hasDpo} hint="Cadastro Empresa → LGPD" onClick={() => onNavigate?.('cadastro-empresa')} />
        <StatusCard label="Snapshot financeiro" done={summary.latestMrr !== null} hint="Cadastro Empresa → Financeiro" onClick={() => onNavigate?.('cadastro-empresa')} />
        <StatusCard label="1ª entrevista feita" done={false} hint="Fase 0 do Roadmap" onClick={() => onNavigate?.('trilha')} />
      </div>

      {/* Decisões recentes */}
      {summary.recentDecisions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-secondary" />
            <h2 className="font-serif text-lg font-semibold text-on-surface">Decisões recentes</h2>
          </div>
          <div className="space-y-2">
            {summary.recentDecisions.map((d) => (
              <button key={d.id} onClick={() => onNavigate?.('decisoes')} className="w-full text-left bg-surface-low border border-outline/10 px-4 py-3 transition-colors hover:border-secondary/40">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-muted">{new Date(d.decided_at + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  {d.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[9px] font-mono text-secondary bg-secondary/10 px-1.5 py-0.5">#{t}</span>
                  ))}
                </div>
                <div className="text-sm text-on-surface font-medium">{d.title}</div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Verdades canônicas */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-secondary" />
          <h2 className="font-serif text-lg font-semibold text-on-surface">Verdades Canônicas</h2>
          <span className="text-xs font-mono text-muted ml-2">não podem ser alteradas sem decisão estratégica</span>
        </div>
        <div className="space-y-2">
          {VERDADES_CANONICAS.map((v, i) => (
            <div key={i} className={`flex items-center gap-3 border px-4 py-3 ${nivelCor[v.nível]} bg-transparent`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-sm text-on-surface-variant">{v.texto}</span>
              <span className={`ml-auto text-[10px] font-mono uppercase tracking-widest shrink-0 ${nivelCor[v.nível]}`}>
                {v.nível}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pergunta de ouro */}
      <div className="border border-secondary/30 bg-secondary-container/20 p-6 text-center">
        <div className="text-xs font-mono text-secondary uppercase tracking-widest mb-3">Pergunta de Ouro</div>
        <p className="font-serif text-lg font-medium text-on-surface">
          Isso fortalece a DIGIAI, o Clearix e a implantação da empresa segundo a verdade canônica atual?
        </p>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color, onClick }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className="text-left w-full bg-surface-low border border-outline/10 p-4 transition-all enabled:hover:border-secondary/40 enabled:hover:bg-secondary-container/15 disabled:cursor-default">
      <div className={`flex items-center gap-2 text-xs ${color} mb-2`}>
        {icon}
        <span className="font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-serif font-bold text-on-surface">{value}</div>
      <div className="text-[11px] text-muted mt-0.5">{sub}</div>
    </button>
  );
}

function StatusCard({ label, done, hint, onClick }: { label: string; done: boolean; hint: string; onClick?: () => void }) {
  return (
    <button onClick={onClick} disabled={!onClick} className={`text-left w-full p-3 border transition-all enabled:hover:border-secondary/40 disabled:cursor-default ${done ? 'bg-secondary-container/25 border-secondary/30' : 'bg-surface-low border-outline/10'}`}>
      <div className="flex items-center gap-2 mb-1">
        {done ? <CheckCircle2 className="w-4 h-4 text-secondary" /> : <Circle className="w-4 h-4 text-muted" />}
        <span className={`text-xs font-medium ${done ? 'text-on-secondary-container' : 'text-on-surface-variant'}`}>{label}</span>
      </div>
      <div className="text-[10px] text-muted">{hint}</div>
    </button>
  );
}
