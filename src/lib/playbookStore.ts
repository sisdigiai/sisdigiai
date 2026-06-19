import { supabase } from './supabase';

export interface AgendaBlock {
  from_min: number;
  to_min: number;
  bloco: string;
  foco: string;
  quem: string; // dono | assessoria | ambos
}
export interface Objection {
  objecao: string;
  resposta: string;
  para: string; // dono | assessoria
}
export interface SandboxAccess {
  tier: string;
  login: string;
}
export interface AccessInfo {
  url?: string;
  entrada?: string;
  senha_nota?: string;
  sandboxes?: SandboxAccess[];
  perfis?: string[];
  regra?: string;
}
export interface Playbook {
  id?: string;
  slug?: string;
  name: string;
  product?: string;
  audience?: string;
  objective?: string;
  duration_min?: number | null;
  agenda: AgendaBlock[];
  discovery: { dono?: string[]; assessoria?: string[] };
  objections: Objection[];
  checklist: string[];
  access_info: AccessInfo;
  followup: { dono?: string; assessoria?: string };
  deck_url?: string;
  pdf_url?: string;
  notes?: string;
  active?: boolean;
}

const LS_KEY = 'digiai_playbooks';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function readLocal(): Playbook[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as Playbook[];
  } catch {
    return [];
  }
}

function writeLocal(rows: Playbook[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

export const playbookStore = {
  isOnline: isSupabaseReady,

  async list(): Promise<Playbook[]> {
    if (!isSupabaseReady()) return readLocal();
    const { data, error } = await supabase.from('v_playbooks').select('*');
    if (error) {
      console.error('[playbookStore] list', error);
      return readLocal();
    }
    const rows = (data ?? []) as Playbook[];
    writeLocal(rows);
    return rows;
  },

  async upsert(playbook: Playbook): Promise<void> {
    const rows = readLocal();
    if (playbook.id) {
      const i = rows.findIndex((r) => r.id === playbook.id);
      if (i >= 0) rows[i] = playbook; else rows.push(playbook);
    } else {
      rows.push({ ...playbook, id: crypto.randomUUID() });
    }
    writeLocal(rows);

    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_upsert_playbook', { p: playbook });
    if (error) console.error('[playbookStore] upsert', error);
  },

  async remove(id: string): Promise<void> {
    writeLocal(readLocal().filter((r) => r.id !== id));
    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('fn_delete_playbook', { p_id: id });
    if (error) console.error('[playbookStore] remove', error);
  },
};
