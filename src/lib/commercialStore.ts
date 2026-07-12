import { supabase } from './supabase';

// Estágios espelham o funil REAL do banco: lead → contatado → conversa → demo → piloto → cliente/perdido
export type LeadStage = 'lead' | 'contatado' | 'conversa' | 'demo' | 'piloto' | 'cliente' | 'perdido';

export interface CommercialLead {
  id?: string;
  name: string;
  company: string;
  product: string; // clearix | osi | academy | outro
  stage: LeadStage;
  source: string;
  contact: string;
  value_brl: number | null;
  owner: string;
  next_step: string;
  notes: string;
  updated_at?: string;
}

const LS_KEY = 'digiai_commercial_leads';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function readLocal(): CommercialLead[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as CommercialLead[];
  } catch {
    return [];
  }
}

function writeLocal(rows: CommercialLead[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

export const commercialStore = {
  isOnline: isSupabaseReady,

  async list(): Promise<CommercialLead[]> {
    if (!isSupabaseReady()) return readLocal();
    const { data, error } = await supabase.from('v_commercial_leads').select('*');
    if (error) {
      console.error('[commercialStore] list', error);
      return readLocal();
    }
    const rows = (data ?? []) as CommercialLead[];
    writeLocal(rows);
    return rows;
  },

  async upsert(lead: CommercialLead): Promise<void> {
    const rows = readLocal();
    if (lead.id) {
      const i = rows.findIndex((r) => r.id === lead.id);
      if (i >= 0) rows[i] = lead; else rows.push(lead);
    } else {
      rows.push({ ...lead, id: crypto.randomUUID() });
    }
    writeLocal(rows);

    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_upsert_commercial_lead', { p_lead: lead });
    if (error) console.error('[commercialStore] upsert', error);
  },

  async remove(id: string): Promise<void> {
    writeLocal(readLocal().filter((r) => r.id !== id));
    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_delete_commercial_lead', { p_id: id });
    if (error) console.error('[commercialStore] remove', error);
  },
};
