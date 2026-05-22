import { useEffect, useState, useCallback } from 'react';
import {
  Target, AlertCircle, CheckCircle2, Clock, Calendar, AlertOctagon,
  Zap, GitBranch, DollarSign, RefreshCw, TrendingUp, Flag, Award,
  Circle
} from 'lucide-react';
import { dashboardStore, type DashboardSummary } from '../lib/dashboardStore';
import type { Track } from '../lib/roadmapStore';
import { realtimeStore } from '../lib/realtimeStore';
import { useRealtimeToasts } from '../contexts/ToastContext';

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
  máximo: 'border-[#2563EB] text-[#2563EB]',
  alto: 'border-[#06B6D4] text-[#06B6D4]',
  médio: 'border-white/30 text-white/60',
  baixo: 'border-white/10 text-white/30',
};

const trackColor: Record<Track, string> = {
  A: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/30',
  B: 'bg-[#2563EB]/20 text-[#06B6D4] border-[#2563EB]/30',
  C: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
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

export default function Visao() {
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
        <div className="text-white/40 text-sm">Carregando dashboard...</div>
      </div>
    );
  }

  const totalProgress = summary.totalTasks > 0
    ? Math.round((summary.completedTasks / summary.totalTasks) * 100)
    : 0;

  // Próximo marco com contagem regressiva
  const nextMilestone = summary.upcomingMilestones[0];

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Visão da Empresa</h1>
          <p className="text-white/50 mt-1">Dashboard em tempo real · dados do Supabase</p>
        </div>
        <button onClick={load} className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white" title="Recarregar">
          <RefreshCw size={18} />
        </button>
      </div>

      {/* Alertas críticos no topo */}
      {(summary.overdueTasks > 0 || summary.backlogCritical > 0) && (
        <div className="bg-red-500/5 border border-red-500/30 rounded-2xl p-5 flex items-start gap-3">
          <AlertOctagon className="w-6 h-6 text-red-400 shrink-0" />
          <div className="flex-1">
            <div className="text-sm font-semibold text-red-400 mb-1">Atenção necessária</div>
            <div className="flex flex-wrap gap-4 text-sm text-white/70">
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
        <div className="bg-[#2563EB]/10 border border-[#2563EB]/30 rounded-2xl p-6">
          <div className="flex items-start gap-5">
            <div className="w-14 h-14 rounded-xl bg-[#2563EB]/20 border border-[#2563EB]/40 flex items-center justify-center text-2xl font-bold text-[#2563EB] shrink-0">
              {summary.currentPhase.phase_number}
            </div>
            <div className="flex-1">
              <div className="text-xs font-mono text-[#06B6D4] uppercase tracking-widest">Fase atual do Roadmap</div>
              <div className="text-xl font-bold text-white mt-0.5">{summary.currentPhase.nome}</div>
              <div className="text-sm text-white/60 mt-0.5">{summary.currentPhase.objetivo}</div>

              {summary.currentPhaseProgress && (
                <div className="mt-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-white/50">Progresso desta fase</span>
                    <span className="text-[#06B6D4] font-mono font-semibold">
                      {summary.currentPhaseProgress.completed_tasks}/{summary.currentPhaseProgress.total_tasks} · {summary.currentPhaseProgress.percent_complete}%
                    </span>
                  </div>
                  <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-[#06B6D4] to-[#2563EB] transition-all duration-500"
                      style={{ width: `${parseFloat(summary.currentPhaseProgress.percent_complete)}%` }}
                    />
                  </div>
                </div>
              )}

              <div className="mt-4 bg-black/20 rounded-lg p-3 flex items-start gap-2">
                <Target className="w-4 h-4 text-[#06B6D4] mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono text-[#06B6D4] uppercase tracking-widest">Métrica única da fase</div>
                  <div className="text-sm text-white/80">{summary.currentPhase.metrica_unica}</div>
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
          color="text-[#06B6D4]"
        />
        <KpiCard
          icon={<Zap className="w-4 h-4" />}
          label="Backlog"
          value={String(summary.backlogInProgress)}
          sub={`em andamento · ${summary.backlogCritical} críticos`}
          color={summary.backlogCritical > 0 ? 'text-red-400' : 'text-amber-400'}
        />
        <KpiCard
          icon={<Award className="w-4 h-4" />}
          label="Decisões"
          value={String(summary.totalDecisions)}
          sub="registradas"
          color="text-emerald-400"
        />
        <KpiCard
          icon={<DollarSign className="w-4 h-4" />}
          label="MRR"
          value={summary.latestMrr != null ? `R$ ${summary.latestMrr.toFixed(0)}` : '—'}
          sub={summary.runwayMonths != null ? `runway ${summary.runwayMonths} meses` : 'preencher Cadastro'}
          color="text-white/70"
        />
      </div>

      {/* Grid: Próximas tarefas + Próximo marco */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Próximas 7 tarefas */}
        <div className="lg:col-span-2 bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-[#06B6D4]" />
            <h2 className="text-lg font-semibold">Próximas 7 tarefas</h2>
          </div>
          {summary.nextTasks.length === 0 ? (
            <div className="text-sm text-white/40 italic py-4">Nenhuma tarefa pendente com data.</div>
          ) : (
            <div className="space-y-2">
              {summary.nextTasks.map((t) => {
                const d = t.target_date ? daysUntil(t.target_date) : 0;
                const overdue = d < 0;
                const urgent = d >= 0 && d <= 2;
                return (
                  <div key={t.id} className={`flex items-start gap-3 p-2 rounded-lg ${overdue ? 'bg-red-500/5' : urgent ? 'bg-amber-500/5' : ''}`}>
                    <Circle className="w-3.5 h-3.5 text-white/20 mt-1 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-white/85">{t.title}</span>
                        {t.track && (
                          <span className={`text-[9px] font-mono px-1.5 rounded border ${trackColor[t.track]}`}>{t.track}</span>
                        )}
                        <span className="text-[9px] font-mono text-white/30">F{t.phase_number}</span>
                      </div>
                      {t.target_date && (
                        <div className={`text-xs mt-0.5 font-mono ${overdue ? 'text-red-400' : urgent ? 'text-amber-400' : 'text-white/40'}`}>
                          {formatDate(t.target_date)} · {overdue ? `${Math.abs(d)}d atrasado` : d === 0 ? 'hoje' : `em ${d}d`}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Próximo marco destacado */}
        <div className="bg-gradient-to-br from-amber-500/10 to-amber-500/5 border border-amber-500/30 rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <Flag className="w-5 h-5 text-amber-400" />
            <h2 className="text-sm font-semibold">Próximo marco</h2>
          </div>
          {nextMilestone ? (
            <>
              <div className="text-xs font-mono text-amber-400 uppercase tracking-widest mb-1">
                {nextMilestone.category === 'decision_gate' ? 'Decision gate' : 'Marco'}
              </div>
              <div className="font-medium text-white mb-3">{nextMilestone.title}</div>
              {nextMilestone.target_date && (
                <div className="text-3xl font-bold text-amber-400">
                  {Math.max(0, daysUntil(nextMilestone.target_date))}d
                </div>
              )}
              <div className="text-xs text-white/50 mt-1">
                {nextMilestone.target_date && formatDate(nextMilestone.target_date)} · Fase {nextMilestone.phase_number}
              </div>
            </>
          ) : (
            <div className="text-sm text-white/40 italic">Nenhum marco próximo.</div>
          )}
        </div>
      </div>

      {/* Status institucional */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatusCard label="CNPJ cadastrado" done={summary.hasCnpj} hint="Cadastro Empresa → Identidade" />
        <StatusCard label="DPO nomeado" done={summary.hasDpo} hint="Cadastro Empresa → LGPD" />
        <StatusCard label="Snapshot financeiro" done={summary.latestMrr !== null} hint="Cadastro Empresa → Financeiro" />
        <StatusCard label="1ª entrevista feita" done={false} hint="Fase 0 do Roadmap" />
      </div>

      {/* Decisões recentes */}
      {summary.recentDecisions.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <GitBranch className="w-5 h-5 text-[#06B6D4]" />
            <h2 className="text-lg font-semibold">Decisões recentes</h2>
          </div>
          <div className="space-y-2">
            {summary.recentDecisions.map((d) => (
              <div key={d.id} className="bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-xs font-mono text-white/40">{new Date(d.decided_at + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  {d.tags.slice(0, 3).map((t) => (
                    <span key={t} className="text-[9px] font-mono text-[#06B6D4] bg-[#06B6D4]/10 px-1.5 py-0.5 rounded">#{t}</span>
                  ))}
                </div>
                <div className="text-sm text-white/85 font-medium">{d.title}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Verdades canônicas */}
      <div>
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className="w-5 h-5 text-[#06B6D4]" />
          <h2 className="text-lg font-semibold">Verdades Canônicas</h2>
          <span className="text-xs font-mono text-white/30 ml-2">não podem ser alteradas sem decisão estratégica</span>
        </div>
        <div className="space-y-2">
          {VERDADES_CANONICAS.map((v, i) => (
            <div key={i} className={`flex items-center gap-3 border rounded-xl px-4 py-3 ${nivelCor[v.nível]} bg-transparent`}>
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span className="text-sm text-white/80">{v.texto}</span>
              <span className={`ml-auto text-[10px] font-mono uppercase tracking-widest shrink-0 ${nivelCor[v.nível]}`}>
                {v.nível}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Pergunta de ouro */}
      <div className="border border-[#2563EB]/30 bg-[#2563EB]/5 rounded-2xl p-6 text-center">
        <div className="text-xs font-mono text-[#2563EB] uppercase tracking-widest mb-3">Pergunta de Ouro</div>
        <p className="text-lg font-medium text-white/90">
          Isso fortalece a DIGIAI, o Clearix e a implantação da empresa segundo a verdade canônica atual?
        </p>
      </div>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-xl p-4">
      <div className={`flex items-center gap-2 text-xs ${color} mb-2`}>
        {icon}
        <span className="font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-white/40 mt-0.5">{sub}</div>
    </div>
  );
}

function StatusCard({ label, done, hint }: { label: string; done: boolean; hint: string }) {
  return (
    <div className={`rounded-xl p-3 border ${done ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-white/3 border-white/8'}`}>
      <div className="flex items-center gap-2 mb-1">
        {done ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Circle className="w-4 h-4 text-white/20" />}
        <span className={`text-xs font-medium ${done ? 'text-emerald-300' : 'text-white/60'}`}>{label}</span>
      </div>
      <div className="text-[10px] text-white/30">{hint}</div>
    </div>
  );
}
