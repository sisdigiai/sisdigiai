import { supabase } from './supabase';

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

  // Registra a reunião e propaga stage/próximo passo ao lead (no RPC).
  async log(session: MeetingSession): Promise<void> {
    const rows = readLocal();
    if (session.id) {
      const i = rows.findIndex((r) => r.id === session.id);
      if (i >= 0) rows[i] = session; else rows.push(session);
    } else {
      rows.push({ ...session, id: crypto.randomUUID() });
    }
    writeLocal(rows);

    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_log_meeting', { p: session });
    if (error) console.error('[meetingStore] log', error);
  },

  async remove(id: string): Promise<void> {
    writeLocal(readLocal().filter((r) => r.id !== id));
    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_delete_meeting', { p_id: id });
    if (error) console.error('[meetingStore] remove', error);
  },
};
