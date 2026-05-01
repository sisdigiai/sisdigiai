import { supabase } from './supabase';

export type Track = 'A' | 'B' | 'C';
export type TaskCategory = 'entregavel' | 'milestone' | 'decision_gate' | 'nota';

export type RoadmapPhase = {
  id: string;
  phase_number: number;
  nome: string;
  duracao_estimada: string | null;
  objetivo: string | null;
  track_lider: Track | null;
  tracks_ativos: Track[];
  metrica_unica: string | null;
  playbook_sv: string | null;
  decision_gate: string | null;
  anti_patterns: string[];
  track_paralelo_nota: string | null;
  started_at: string | null;
  completed_at: string | null;
  decision_gate_met_at: string | null;
  notes: string | null;
};

export type RoadmapTask = {
  id: string;
  phase_number: number;
  track: Track | null;
  title: string;
  description: string | null;
  category: TaskCategory;
  target_date: string | null;
  completed_at: string | null;
  completed_by: string | null;
  priority: number;
  notes: string | null;
  display_order: number;
};

export type PhaseProgress = {
  phase_number: number;
  nome: string;
  track_lider: Track | null;
  tracks_ativos: Track[];
  metrica_unica: string | null;
  started_at: string | null;
  completed_at: string | null;
  decision_gate_met_at: string | null;
  total_tasks: number;
  completed_tasks: number;
  percent_complete: string;
  next_target_date: string | null;
  overdue_tasks: number;
};

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

export const roadmapStore = {
  isOnline: isSupabaseReady,

  async listPhases(): Promise<RoadmapPhase[]> {
    if (!isSupabaseReady()) return [];
    const { data, error } = await supabase.from('v_roadmap_phases').select('*');
    if (error) {
      console.error('[roadmapStore] listPhases', error);
      return [];
    }
    return (data as RoadmapPhase[]) || [];
  },

  async listTasks(): Promise<RoadmapTask[]> {
    if (!isSupabaseReady()) return [];
    const { data, error } = await supabase.from('v_roadmap_tasks').select('*');
    if (error) {
      console.error('[roadmapStore] listTasks', error);
      return [];
    }
    return (data as RoadmapTask[]) || [];
  },

  async listProgress(): Promise<PhaseProgress[]> {
    if (!isSupabaseReady()) return [];
    const { data, error } = await supabase.from('v_roadmap_phase_progress').select('*');
    if (error) {
      console.error('[roadmapStore] listProgress', error);
      return [];
    }
    return (data as PhaseProgress[]) || [];
  },

  async toggleTask(taskId: string, completed: boolean, userId: string | null): Promise<void> {
    if (!isSupabaseReady()) return;
    const payload = completed
      ? { completed_at: new Date().toISOString(), completed_by: userId }
      : { completed_at: null, completed_by: null };
    const { error } = await supabase
      .schema('ops')
      .from('roadmap_tasks')
      .update(payload)
      .eq('id', taskId);
    if (error) console.error('[roadmapStore] toggleTask', error);
  },

  async updateTargetDate(taskId: string, targetDate: string | null): Promise<void> {
    if (!isSupabaseReady()) return;
    const { error } = await supabase
      .schema('ops')
      .from('roadmap_tasks')
      .update({ target_date: targetDate })
      .eq('id', taskId);
    if (error) console.error('[roadmapStore] updateTargetDate', error);
  },

  async markPhaseStarted(phaseNumber: number): Promise<void> {
    if (!isSupabaseReady()) return;
    await supabase
      .schema('ops')
      .from('roadmap_phases')
      .update({ started_at: new Date().toISOString() })
      .eq('phase_number', phaseNumber)
      .is('started_at', null);
  },

  async markDecisionGateMet(phaseNumber: number): Promise<void> {
    if (!isSupabaseReady()) return;
    await supabase
      .schema('ops')
      .from('roadmap_phases')
      .update({
        decision_gate_met_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
      })
      .eq('phase_number', phaseNumber);
  },
};
