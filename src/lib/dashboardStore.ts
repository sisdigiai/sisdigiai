import { supabase } from './supabase';
import type { RoadmapTask, RoadmapPhase, PhaseProgress } from './roadmapStore';
import type { BacklogItem } from './backlogStore';
import type { Decision } from './decisionsStore';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

export type DashboardSummary = {
  // Roadmap
  currentPhase: RoadmapPhase | null;
  currentPhaseProgress: PhaseProgress | null;
  totalTasks: number;
  completedTasks: number;
  overdueTasks: number;
  nextTasks: RoadmapTask[];
  upcomingMilestones: RoadmapTask[];

  // Backlog
  backlogTotal: number;
  backlogCritical: number;
  backlogInProgress: number;

  // Decisions
  recentDecisions: Decision[];
  totalDecisions: number;

  // Financial (from latest snapshot)
  latestMrr: number | null;
  latestBurn: number | null;
  runwayMonths: number | null;

  // Company
  hasCnpj: boolean;
  hasDpo: boolean;
};

const emptySummary: DashboardSummary = {
  currentPhase: null,
  currentPhaseProgress: null,
  totalTasks: 0,
  completedTasks: 0,
  overdueTasks: 0,
  nextTasks: [],
  upcomingMilestones: [],
  backlogTotal: 0,
  backlogCritical: 0,
  backlogInProgress: 0,
  recentDecisions: [],
  totalDecisions: 0,
  latestMrr: null,
  latestBurn: null,
  runwayMonths: null,
  hasCnpj: false,
  hasDpo: false,
};

export const dashboardStore = {
  isOnline: isSupabaseReady,

  async summary(): Promise<DashboardSummary> {
    if (!isSupabaseReady()) return emptySummary;

    const today = new Date().toISOString().split('T')[0];

    const [
      phasesRes,
      progressRes,
      tasksRes,
      backlogRes,
      decisionsRes,
      financialRes,
      identityRes,
      legalRes,
    ] = await Promise.all([
      supabase.from('v_roadmap_phases').select('*'),
      supabase.from('v_roadmap_phase_progress').select('*'),
      supabase.from('v_roadmap_tasks').select('*'),
      supabase.from('v_backlog_items').select('*'),
      supabase.from('v_decisions').select('*'),
      supabase.from('v_company_financial_snapshots').select('*'),
      supabase.from('v_company_identity').select('cnpj').maybeSingle(),
      supabase.from('v_company_legal_status').select('dpo_nomeado').maybeSingle(),
    ]);

    const phases = (phasesRes.data as RoadmapPhase[]) || [];
    const progress = (progressRes.data as PhaseProgress[]) || [];
    const tasks = (tasksRes.data as RoadmapTask[]) || [];
    const backlog = (backlogRes.data as BacklogItem[]) || [];
    const decisions = (decisionsRes.data as Decision[]) || [];
    const snapshots = (financialRes.data as any[]) || [];

    const currentPhase = phases.find((p) => !p.completed_at && progress.find((pr) => pr.phase_number === p.phase_number && pr.total_tasks > 0)) || phases[0] || null;
    const currentProg = currentPhase ? progress.find((p) => p.phase_number === currentPhase.phase_number) || null : null;

    const totalTasks = progress.reduce((s, p) => s + (p.total_tasks || 0), 0);
    const completedTasks = progress.reduce((s, p) => s + (p.completed_tasks || 0), 0);
    // Só fases iniciadas podem ter tarefa "atrasada" — uma fase que não começou não tem prazo corrente.
    const startedPhases = new Set(phases.filter((p) => p.started_at).map((p) => p.phase_number));
    const overdueTasks = progress.reduce((s, p) => s + (p.started_at ? (p.overdue_tasks || 0) : 0), 0);

    // Tarefas futuras (não concluídas, com data) — só de fases já iniciadas (as demais ainda não são acionáveis)
    const nextTasks = tasks
      .filter((t) => !t.completed_at && t.target_date && startedPhases.has(t.phase_number))
      .sort((a, b) => (a.target_date || '').localeCompare(b.target_date || ''))
      .slice(0, 7);

    // Milestones próximos — idem, só de fases iniciadas
    const upcomingMilestones = tasks
      .filter((t) => !t.completed_at && t.target_date && startedPhases.has(t.phase_number) && (t.category === 'milestone' || t.category === 'decision_gate'))
      .sort((a, b) => (a.target_date || '').localeCompare(b.target_date || ''))
      .slice(0, 3);

    const backlogTotal = backlog.length;
    const backlogCritical = backlog.filter((b) => b.priority === 1 && b.status !== 'done').length;
    const backlogInProgress = backlog.filter((b) => b.status === 'in_progress').length;

    const recentDecisions = decisions.slice(0, 3);

    // Snapshot mais recente
    const latestSnap = snapshots.length > 0 ? snapshots[0] : null;
    const latestMrr = latestSnap?.mrr_total_brl ?? null;
    const latestBurn = latestSnap?.custo_total_brl ?? null;
    const saldoPj = latestSnap?.saldo_conta_pj_brl ?? null;
    const runwayMonths = saldoPj != null && latestBurn && latestBurn > 0
      ? Math.round((saldoPj / latestBurn) * 10) / 10
      : null;

    const hasCnpj = !!(identityRes.data as any)?.cnpj;
    const hasDpo = !!(legalRes.data as any)?.dpo_nomeado;

    return {
      currentPhase,
      currentPhaseProgress: currentProg,
      totalTasks,
      completedTasks,
      overdueTasks,
      nextTasks,
      upcomingMilestones,
      backlogTotal,
      backlogCritical,
      backlogInProgress,
      recentDecisions,
      totalDecisions: decisions.length,
      latestMrr,
      latestBurn,
      runwayMonths,
      hasCnpj,
      hasDpo,
    };
  },
};
