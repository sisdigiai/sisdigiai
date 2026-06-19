import { supabase } from './supabase';

export interface ActionItem {
  text: string;
  resolved: boolean;
}

export interface MeetingSession {
  id?: string;
  lead_id?: string | null;
  lead_company?: string | null; // vem da view (join)
  playbook_id?: string | null;
  playbook_name?: string | null; // vem da view (join)
  title?: string;
  started_at?: string;
  ended_at?: string | null;
  duration_min?: number | null;
  pain_noted?: string;
  objections_raised?: string[];
  outcome?: string;
  stage_changed_to?: string | null;
  next_action?: string;
  follow_up_date?: string | null;
  effectiveness?: number | null; // 1-5
  notes?: string;
  // captura rica (mig 046)
  interest_plan?: string | null;   // Essencial/Controle/Crescimento
  interest_apps?: string[];        // apps que interessaram
  budget_signal?: string;          // sinal de orçamento
  quotes?: string[];               // falas marcantes
  action_items?: ActionItem[];     // análises a resolver
  meet_url?: string | null;        // link da sala
}

const LS_KEY = 'digiai_meeting_sessions';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function readLocal(): MeetingSession[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as MeetingSession[];
  } catch {
    return [];
  }
}

function writeLocal(rows: MeetingSession[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

export const meetingStore = {
  isOnline: isSupabaseReady,

  async list(): Promise<MeetingSession[]> {
    if (!isSupabaseReady()) return readLocal();
    const { data, error } = await supabase.from('v_meeting_sessions').select('*');
    if (error) {
      console.error('[meetingStore] list', error);
      return readLocal();
    }
    const rows = (data ?? []) as MeetingSession[];
    writeLocal(rows);
    return rows;
  },

  async listByLead(leadId: string): Promise<MeetingSession[]> {
    return (await this.list()).filter((m) => m.lead_id === leadId);
  },

  // Registra a reunião e propaga stage/próximo passo ao lead (no RPC). Retorna a sessão com id.
  async log(session: MeetingSession): Promise<MeetingSession> {
    const local: MeetingSession = session.id ? session : { ...session, id: crypto.randomUUID() };
    const rows = readLocal();
    const i = rows.findIndex((r) => r.id === local.id);
    if (i >= 0) rows[i] = local; else rows.push(local);
    writeLocal(rows);

    if (!isSupabaseReady()) return local;
    const { data, error } = await supabase.rpc('fn_log_meeting', { p: session });
    if (error) { console.error('[meetingStore] log', error); return local; }
    return { ...local, id: (data as string) ?? local.id };
  },

  async remove(id: string): Promise<void> {
    writeLocal(readLocal().filter((r) => r.id !== id));
    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_delete_meeting', { p_id: id });
    if (error) console.error('[meetingStore] remove', error);
  },
};
