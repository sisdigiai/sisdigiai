import { useEffect, useState, useCallback } from 'react';
import {
  CheckCircle2, Circle, Clock, AlertCircle, ChevronDown, ChevronUp,
  Target, Flag, BookOpen, AlertTriangle, FileText, Calendar, CheckSquare,
  Square, AlertOctagon, RefreshCw, GitBranch, CalendarDays, History
} from 'lucide-react';
import { roadmapStore, type RoadmapPhase, type RoadmapTask, type PhaseProgress, type Track } from '../lib/roadmapStore';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../lib/supabase';
import { realtimeStore } from '../lib/realtimeStore';
import RoadmapCalendar from './RoadmapCalendar';
import RoadmapHistorico from './RoadmapHistorico';
import PageHeader from '../components/PageHeader';

const TRACK_INFO: Record<Track, { nome: string; descricao: string; cor: string; badge: string }> = {
  A: {
    nome: 'Academy Low-Ticket',
    descricao: 'Renda imediata + audiência + autoridade',
    cor: 'border-eco-academy/40 text-eco-academy',
    badge: 'bg-eco-academy/15 text-eco-academy border-eco-academy/30',
  },
  B: {
    nome: 'Clearix B2B',
    descricao: 'MRR recorrente + case studies + enterprise path',
    cor: 'border-eco-clearix/40 text-eco-clearix',
    badge: 'bg-eco-clearix/15 text-eco-clearix border-eco-clearix/30',
  },
  C: {
    nome: 'Empresa / Ops',
    descricao: 'Infra legal + financeira + operacional',
    cor: 'border-eco-app/40 text-eco-app',
    badge: 'bg-eco-app/15 text-eco-app border-eco-app/30',
  },
};

const SHORT_FASE: Record<number, string> = {
  0: 'Validação', 1: 'Ramen · Academy', 2: 'Clearix Pilot', 3: '10 clientes', 4: 'PMF',
  5: 'Growth', 6: 'Escala', 7: 'Expansão', 8: 'Unicorn',
};

function TrackBadge({ track, compact = false }: { track: Track; compact?: boolean }) {
  const info = TRACK_INFO[track];
  return (
    <span className={`inline-flex items-center justify-center ${compact ? 'w-5 h-5 text-[9px]' : 'w-6 h-6 text-[10px]'} font-mono font-bold border ${info.badge}`}>
      {track}
    </span>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

function isPastDue(targetDate: string | null, completedAt: string | null): boolean {
  if (!targetDate || completedAt) return false;
  return new Date(targetDate) < new Date(new Date().toISOString().split('T')[0]);
}

function daysUntil(targetDate: string | null): number | null {
  if (!targetDate) return null;
  const today = new Date(new Date().toISOString().split('T')[0]);
  const target = new Date(targetDate);
  return Math.round((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

type ViewMode = 'timeline' | 'calendar' | 'historico';

export default function Trilha() {
  const { user } = useAuth();
  const [view, setView] = useState<ViewMode>('timeline');
  const [phases, setPhases] = useState<RoadmapPhase[]>([]);
  const [tasks, setTasks] = useState<RoadmapTask[]>([]);
  const [progress, setProgress] = useState<PhaseProgress[]>([]);
  const [expandido, setExpandido] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [internalUserId, setInternalUserId] = useState<string | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    const [p, t, pr] = await Promise.all([
      roadmapStore.listPhases(),
      roadmapStore.listTasks(),
      roadmapStore.listProgress(),
    ]);
    setPhases(p);
    setTasks(t);
    setProgress(pr);
    // Abre na fase atual (primeira não-concluída com tarefas), não na Fase 0
    const atual = p.find((f) => !f.completed_at && pr.some((x) => x.phase_number === f.phase_number && x.total_tasks > 0)) ?? p[0];
    setExpandido((prev) => prev ?? atual?.phase_number ?? 0);
    setLoading(false);
  }, []);

  useEffect(() => {
    loadAll();
    if (user?.email) {
      supabase.from('v_iam_users' as any).select('id').eq('auth_id', user.id).maybeSingle().then(({ data }) => {
        setInternalUserId((data as any)?.id ?? null);
      });
    }
  }, [loadAll, user]);

  // Realtime: qualquer mudança nas tabelas do roadmap recarrega os dados
  useEffect(() => {
    const unsub = realtimeStore.subscribe((event) => {
      if (event.table === 'roadmap_tasks' || event.table === 'roadmap_phases') {
        loadAll();
      }
    });
    return () => unsub();
  }, [loadAll]);

  const handleToggle = async (task: RoadmapTask) => {
    const newCompleted = !task.completed_at;
    // Optimistic update
    setTasks((prev) => prev.map((t) => t.id === task.id ? {
      ...t,
      completed_at: newCompleted ? new Date().toISOString() : null,
      completed_by: newCompleted ? internalUserId : null,
    } : t));
    await roadmapStore.toggleTask(task.id, newCompleted, internalUserId);
    // Refresh progress stats
    const pr = await roadmapStore.listProgress();
    setProgress(pr);
  };

  const handleReschedule = async (task: RoadmapTask, newDate: string | null) => {
    setTasks((prev) => prev.map((t) => t.id === task.id ? { ...t, target_date: newDate } : t));
    await roadmapStore.updateTargetDate(task.id, newDate);
    const pr = await roadmapStore.listProgress();
    setProgress(pr);
  };

  const phaseProgress = (phaseNumber: number) =>
    progress.find((p) => p.phase_number === phaseNumber);

  const phaseTasks = (phaseNumber: number) =>
    tasks.filter((t) => t.phase_number === phaseNumber).sort((a, b) => a.display_order - b.display_order);

  // Fase atual = primeira fase não-concluída com tarefas
  const currentPhase = phases.find((p) => !p.completed_at && (phaseProgress(p.phase_number)?.total_tasks ?? 0) > 0) ?? phases[0];
  const currentProgress = currentPhase ? phaseProgress(currentPhase.phase_number) : null;

  if (loading) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="text-muted text-sm">Carregando Roadmap...</div>
      </div>
    );
  }

  if (phases.length === 0) {
    return (
      <div className="p-8 max-w-7xl mx-auto">
        <div className="bg-warning/10 border border-warning/30 p-5">
          <div className="text-warning font-semibold mb-2">Roadmap sem dados</div>
          <p className="text-sm text-on-surface-variant">
            Não há fases cadastradas no banco. Confirme que a migration 014 foi aplicada e que o usuário está autenticado como staff.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Plano Mestre"
        title="Roadmap — Do Zero aos Milhões"
        subtitle="9 fases · 3 tracks paralelos · Playbook Unicórnio Adaptado · calendário 45d seed"
        actions={
          <button
            onClick={loadAll}
            className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface transition-colors"
            title="Recarregar do Supabase"
          >
            <RefreshCw size={18} />
          </button>
        }
      />

      <div className="space-y-6">
      {/* Abas de visualização */}
      <div className="flex gap-1 border-b border-outline/10">
        <button
          onClick={() => setView('timeline')}
          className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            view === 'timeline'
              ? 'border-secondary text-on-surface'
              : 'border-transparent text-muted hover:text-on-surface-variant'
          }`}
        >
          <GitBranch size={14} /> Timeline (9 fases)
        </button>
        <button
          onClick={() => setView('calendar')}
          className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            view === 'calendar'
              ? 'border-secondary text-on-surface'
              : 'border-transparent text-muted hover:text-on-surface-variant'
          }`}
        >
          <CalendarDays size={14} /> Calendário
        </button>
        <button
          onClick={() => setView('historico')}
          className={`px-4 py-2.5 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
            view === 'historico'
              ? 'border-secondary text-on-surface'
              : 'border-transparent text-muted hover:text-on-surface-variant'
          }`}
        >
          <History size={14} /> Histórico
        </button>
      </div>

      {/* View: Calendário */}
      {view === 'calendar' && (
        <RoadmapCalendar tasks={tasks} onToggle={handleToggle} onReschedule={handleReschedule} />
      )}

      {/* View: Histórico */}
      {view === 'historico' && <RoadmapHistorico phases={phases} tasks={tasks} />}

      {/* View: Timeline — continua abaixo */}
      {view === 'timeline' && (
      <>
      {/* Trilha horizontal — você está aqui */}
      <div className="border border-outline/15 bg-surface-container p-5">
        <div className="flex items-center justify-between mb-4">
          <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">A trilha · do zero aos milhões</span>
          <span className="font-mono text-[10px] text-muted">fase {currentPhase?.phase_number} de {phases.length - 1}</span>
        </div>
        <div className="relative">
          <div className="absolute top-[13px] left-[5%] right-[5%] h-px bg-outline/25" />
          <div className="flex justify-between relative">
            {phases.map((f) => {
              const isCompleted = !!f.completed_at;
              const isActive = f.phase_number === currentPhase?.phase_number;
              let dot = <span className="w-2.5 h-2.5 rounded-full border border-muted/60" />;
              if (isCompleted) dot = <span className="w-[26px] h-[26px] rounded-full bg-success flex items-center justify-center"><CheckCircle2 className="w-3.5 h-3.5 text-on-action" /></span>;
              else if (isActive) dot = <span className="w-[26px] h-[26px] rounded-full bg-surface border-2 border-secondary" style={{ boxShadow: '0 0 0 4px color-mix(in srgb, var(--color-secondary) 20%, transparent)' }} />;
              return (
                <div key={f.phase_number} className="flex-1 text-center px-0.5 min-w-0">
                  <div className="h-[26px] flex items-center justify-center">{dot}</div>
                  <div className={`mt-2 text-[10px] leading-tight truncate ${isActive ? 'text-on-surface font-medium' : isCompleted ? 'text-on-surface-variant' : 'text-muted'}`}>
                    {f.phase_number}. {SHORT_FASE[f.phase_number] ?? f.nome}
                  </div>
                  {isActive && <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-secondary">você está aqui</div>}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Banner com script sync */}
      <div className="bg-action/5 border border-action/20 p-3 flex items-center gap-3 text-xs">
        <RefreshCw size={14} className="text-action shrink-0" />
        <div className="flex-1">
          <span className="text-on-surface-variant">Sincronizar manifest do cowork com o banco: </span>
          <code className="text-action font-mono">cd D:/projetos/digiai && node scripts/sync-manifest.cjs</code>
        </div>
      </div>

      {/* 3 tracks */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {(['A', 'B', 'C'] as Track[]).map((t) => {
          const info = TRACK_INFO[t];
          return (
            <div key={t} className={`border bg-gradient-to-br ${info.cor} p-4`}>
              <div className="flex items-center gap-2 mb-1">
                <TrackBadge track={t} />
                <span className="text-xs font-mono uppercase tracking-widest">Track {t}</span>
              </div>
              <div className="font-semibold text-on-surface">{info.nome}</div>
              <div className="text-xs opacity-80 mt-0.5">{info.descricao}</div>
            </div>
          );
        })}
      </div>

      {/* Fase atual em destaque com progresso */}
      {currentPhase && currentProgress && (
        <div className="bg-secondary-container/40 border border-secondary/40 p-5">
          <div className="flex items-start gap-4">
            <div className="w-10 h-10 bg-secondary-container/40 border border-secondary/40 flex items-center justify-center text-lg font-bold text-secondary">
              {currentPhase.phase_number}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-secondary uppercase tracking-widest">Fase atual</span>
                {currentPhase.track_lider && <TrackBadge track={currentPhase.track_lider} compact />}
                <span className="text-[10px] font-mono text-muted">líder</span>
                <span className="text-[10px] font-mono text-muted">· {currentPhase.duracao_estimada}</span>
                {currentProgress.overdue_tasks > 0 && (
                  <span className="text-[10px] font-mono text-danger bg-danger/10 px-2 py-0.5 flex items-center gap-1">
                    <AlertOctagon size={10} /> {currentProgress.overdue_tasks} atrasada{currentProgress.overdue_tasks > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <div className="font-bold text-on-surface mt-1">{currentPhase.nome}</div>
              <div className="text-sm text-on-surface-variant mt-0.5">{currentPhase.objetivo}</div>

              {/* Barra de progresso */}
              <div className="mt-3">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-on-surface-variant">Progresso das tarefas</span>
                  <span className="text-secondary font-mono font-semibold">
                    {currentProgress.completed_tasks}/{currentProgress.total_tasks} · {currentProgress.percent_complete}%
                  </span>
                </div>
                <div className="h-2 bg-surface-lowest overflow-hidden">
                  <div
                    className="h-full bg-secondary transition-all duration-300"
                    style={{ width: `${parseFloat(currentProgress.percent_complete)}%` }}
                  />
                </div>
              </div>

              {/* Próxima data */}
              {currentProgress.next_target_date && (
                <div className="mt-3 flex items-center gap-2 text-xs">
                  <Calendar size={12} className="text-secondary" />
                  <span className="text-on-surface-variant">Próxima data:</span>
                  <span className="text-on-surface font-mono">{formatDate(currentProgress.next_target_date)}</span>
                  {(() => {
                    const d = daysUntil(currentProgress.next_target_date);
                    if (d === null) return null;
                    if (d < 0) return <span className="text-danger">· {Math.abs(d)}d atrasado</span>;
                    if (d === 0) return <span className="text-warning">· hoje</span>;
                    return <span className="text-muted">· em {d}d</span>;
                  })()}
                </div>
              )}

              <div className="mt-3 bg-surface-lowest p-3 flex items-start gap-2">
                <Target className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                <div>
                  <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">Métrica única</div>
                  <div className="text-sm text-on-surface">{currentPhase.metrica_unica}</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline */}
      <div className="relative">
        <div className="absolute left-5 top-0 bottom-0 w-px bg-surface-high" />

        <div className="space-y-3">
          {phases.map((fase) => {
            const pp = phaseProgress(fase.phase_number);
            const isOpen = expandido === fase.phase_number;
            const fTasks = phaseTasks(fase.phase_number);
            const isCompleted = !!fase.completed_at;
            const isActive = fase.phase_number === currentPhase?.phase_number;
            const hasOverdue = (pp?.overdue_tasks ?? 0) > 0;

            let statusLabel = 'Não iniciada';
            let statusClasses = 'text-muted bg-surface-low';
            let dotColor = 'bg-surface-high';
            let borderColor = 'border-outline/10 bg-surface-low';
            let statusIcon = <Circle className="w-5 h-5 text-muted" />;

            if (isCompleted) {
              statusLabel = 'Concluída';
              statusClasses = 'text-success bg-success/10';
              dotColor = 'bg-success';
              borderColor = 'border-success/20 bg-success/5';
              statusIcon = <CheckCircle2 className="w-5 h-5 text-success" />;
            } else if (isActive) {
              statusLabel = 'Em andamento';
              statusClasses = 'text-secondary bg-secondary-container/40';
              dotColor = 'bg-secondary';
              borderColor = 'border-secondary/40 bg-secondary-container/40';
              statusIcon = <Clock className="w-5 h-5 text-secondary" />;
            } else if ((pp?.completed_tasks ?? 0) > 0) {
              statusLabel = 'Iniciada';
              statusClasses = 'text-warning bg-warning/10';
              dotColor = 'bg-warning';
              borderColor = 'border-warning/20 bg-warning/5';
              statusIcon = <AlertCircle className="w-5 h-5 text-warning" />;
            }

            return (
              <div key={fase.phase_number} className="relative pl-14">
                <div className={`absolute left-3.5 top-5 w-3 h-3 border-2 border-surface ${dotColor}`} />

                <div className={`border ${borderColor} overflow-hidden`}>
                  <button
                    className="w-full flex items-center gap-3 p-5 text-left"
                    onClick={() => setExpandido(isOpen ? null : fase.phase_number)}
                  >
                    {statusIcon}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-mono text-muted">Fase {fase.phase_number}</span>
                        {fase.track_lider && <TrackBadge track={fase.track_lider} compact />}
                        <span className="font-semibold text-sm">{fase.nome}</span>
                        <span className="text-[10px] font-mono text-muted">· {fase.duracao_estimada}</span>
                        {hasOverdue && (
                          <span className="text-[10px] font-mono text-danger bg-danger/10 px-1.5 py-0.5 flex items-center gap-1">
                            <AlertOctagon size={9} /> {pp?.overdue_tasks}
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-muted mt-0.5 truncate">{fase.objetivo}</div>
                      {pp && pp.total_tasks > 0 && (
                        <div className="mt-2 flex items-center gap-2">
                          <div className="flex-1 max-w-[200px] h-1.5 bg-surface-lowest overflow-hidden">
                            <div
                              className="h-full bg-secondary transition-all duration-300"
                              style={{ width: `${parseFloat(pp.percent_complete)}%` }}
                            />
                          </div>
                          <span className="text-[10px] font-mono text-muted">
                            {pp.completed_tasks}/{pp.total_tasks}
                          </span>
                        </div>
                      )}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 ${statusClasses}`}>
                        {statusLabel}
                      </span>
                      {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                    </div>
                  </button>

                  {isOpen && (
                    <div className="px-5 pb-5 space-y-4 border-t border-outline/10 pt-4">
                      {/* Métrica única */}
                      <div className="bg-secondary/15 border border-secondary/40 p-3 flex items-start gap-2">
                        <Target className="w-4 h-4 text-secondary mt-0.5 shrink-0" />
                        <div>
                          <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">Métrica única</div>
                          <div className="text-sm text-on-surface">{fase.metrica_unica}</div>
                        </div>
                      </div>

                      {/* Playbook SV */}
                      {fase.playbook_sv && (
                        <div className="flex items-start gap-2">
                          <BookOpen className="w-4 h-4 text-warning mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[10px] font-mono text-warning uppercase tracking-widest">Playbook aplicado</div>
                            <div className="text-sm text-on-surface-variant">{fase.playbook_sv}</div>
                          </div>
                        </div>
                      )}

                      {/* Tarefas agrupadas por track */}
                      {fTasks.length > 0 && (
                        <div>
                          <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">
                            Tarefas do calendário ({fTasks.filter((t) => t.completed_at).length}/{fTasks.length})
                          </div>
                          {(['C', 'B', 'A'] as Track[]).map((tr) => {
                            const trTasks = fTasks.filter((t) => t.track === tr);
                            if (trTasks.length === 0) return null;
                            const info = TRACK_INFO[tr];
                            return (
                              <div key={tr} className="mb-3">
                                <div className="flex items-center gap-2 mb-2 mt-2">
                                  <TrackBadge track={tr} compact />
                                  <span className="text-xs font-semibold text-on-surface-variant">{info.nome}</span>
                                </div>
                                <div className="space-y-1.5 ml-1">
                                  {trTasks.map((task) => {
                                    const done = !!task.completed_at;
                                    const overdue = isPastDue(task.target_date, task.completed_at);
                                    const isGate = task.category === 'decision_gate';
                                    const isMilestone = task.category === 'milestone';
                                    return (
                                      <div key={task.id} className={`flex items-start gap-2 group ${overdue ? 'bg-danger/5 -mx-2 px-2 py-1' : ''}`}>
                                        <button
                                          onClick={() => handleToggle(task)}
                                          className={`mt-0.5 shrink-0 transition-colors ${done ? 'text-success' : 'text-muted hover:text-on-surface-variant'}`}
                                          title={done ? 'Marcar como pendente' : 'Marcar como concluída'}
                                        >
                                          {done ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                                        </button>
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-center gap-2 flex-wrap">
                                            <span className={`text-sm ${done ? 'text-muted line-through' : 'text-on-surface'}`}>
                                              {task.title}
                                            </span>
                                            {isGate && !done && (
                                              <span className="text-[9px] font-mono uppercase text-success bg-success/10 px-1.5">
                                                Gate
                                              </span>
                                            )}
                                            {isMilestone && !done && (
                                              <span className="text-[9px] font-mono uppercase text-warning bg-warning/10 px-1.5">
                                                Marco
                                              </span>
                                            )}
                                          </div>
                                          {task.description && (
                                            <div className="text-xs text-muted mt-0.5">{task.description}</div>
                                          )}
                                          {task.target_date && (
                                            <div className="flex items-center gap-1 mt-0.5">
                                              <Calendar size={10} className={overdue ? 'text-danger' : done ? 'text-muted' : 'text-muted'} />
                                              <span className={`text-[10px] font-mono ${overdue ? 'text-danger' : done ? 'text-muted' : 'text-on-surface-variant'}`}>
                                                {formatDate(task.target_date)}
                                                {overdue && ' · atrasada'}
                                                {done && task.completed_at && ` · feito ${formatDate(task.completed_at)}`}
                                              </span>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {fTasks.length === 0 && (
                        <div className="text-xs text-muted italic">
                          Fase sem tarefas pré-seed. Tarefas serão criadas ao atingir a fase anterior.
                        </div>
                      )}

                      {/* Decision gate */}
                      {fase.decision_gate && (
                        <div className="bg-success/5 border border-success/20 p-3 flex items-start gap-2">
                          <Flag className="w-4 h-4 text-success mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[10px] font-mono text-success uppercase tracking-widest">Decision gate (para avançar)</div>
                            <div className="text-sm text-on-surface">{fase.decision_gate}</div>
                          </div>
                        </div>
                      )}

                      {/* Anti-patterns */}
                      {fase.anti_patterns && fase.anti_patterns.length > 0 && (
                        <div>
                          <div className="flex items-center gap-1.5 mb-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-danger" />
                            <div className="text-[10px] font-mono text-danger uppercase tracking-widest">Anti-patterns</div>
                          </div>
                          <div className="space-y-1">
                            {fase.anti_patterns.map((ap, i) => (
                              <div key={i} className="flex items-start gap-2">
                                <span className="text-danger/70 mt-0.5 text-xs">✗</span>
                                <span className="text-xs text-on-surface-variant">{ap}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {fase.track_paralelo_nota && (
                        <div className="bg-surface-low px-4 py-3 flex items-start gap-2">
                          <FileText className="w-4 h-4 text-muted mt-0.5 shrink-0" />
                          <div>
                            <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">Nota de execução</div>
                            <div className="text-xs text-on-surface-variant">{fase.track_paralelo_nota}</div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
      </>
      )}
      </div>
    </div>
  );
}
