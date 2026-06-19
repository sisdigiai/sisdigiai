import { supabase } from './supabase';

export interface ProposalItem {
  label: string;
  value: string;
}

export interface Proposal {
  id?: string;
  lead_id?: string | null;
  lead_company?: string | null; // vem da view (join)
  meeting_id?: string | null;
  title?: string;
  plan?: string; // Essencial/Controle/Crescimento
  monthly_price?: number | null;
  discount_pct?: number | null;
  trial_days?: number | null;
  setup_note?: string;
  items?: ProposalItem[];
  body?: string;
  status?: string; // rascunho/enviada/aceita/recusada
  sent_at?: string | null;
  sent_via?: string | null;
}

const LS_KEY = 'digiai_proposals';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function readLocal(): Proposal[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as Proposal[];
  } catch {
    return [];
  }
}

function writeLocal(rows: Proposal[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

export const proposalStore = {
  isOnline: isSupabaseReady,

  async list(): Promise<Proposal[]> {
    if (!isSupabaseReady()) return readLocal();
    const { data, error } = await supabase.from('v_proposals').select('*');
    if (error) {
      console.error('[proposalStore] list', error);
      return readLocal();
    }
    const rows = (data ?? []) as Proposal[];
    writeLocal(rows);
    return rows;
  },

  async listByLead(leadId: string): Promise<Proposal[]> {
    return (await this.list()).filter((p) => p.lead_id === leadId);
  },

  async upsert(proposal: Proposal): Promise<string | undefined> {
    const rows = readLocal();
    let id = proposal.id;
    if (id) {
      const i = rows.findIndex((r) => r.id === id);
      if (i >= 0) rows[i] = proposal; else rows.push(proposal);
    } else {
      id = crypto.randomUUID();
      rows.push({ ...proposal, id });
    }
    writeLocal(rows);

    if (!isSupabaseReady()) return id;
    const { data, error } = await supabase.rpc('fn_upsert_proposal', { p: proposal });
    if (error) { console.error('[proposalStore] upsert', error); return id; }
    return (data as string) ?? id;
  },

  async markSent(id: string, via: string): Promise<void> {
    const rows = readLocal();
    const i = rows.findIndex((r) => r.id === id);
    if (i >= 0) { rows[i] = { ...rows[i], status: 'enviada', sent_via: via, sent_at: new Date().toISOString() }; writeLocal(rows); }
    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_mark_proposal_sent', { p_id: id, p_via: via });
    if (error) console.error('[proposalStore] markSent', error);
  },

  async remove(id: string): Promise<void> {
    writeLocal(readLocal().filter((r) => r.id !== id));
    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_delete_proposal', { p_id: id });
    if (error) console.error('[proposalStore] remove', error);
  },
};
