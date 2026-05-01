import { supabase } from './supabase';

export type Decision = {
  id: string;
  title: string;
  context: string;
  decision: string;
  alternatives: string | null;
  expected_impact: string | null;
  tags: string[];
  decided_at: string;
  created_at: string;
  updated_at: string;
  created_by: string | null;
};

export type NewDecision = Omit<Decision, 'id' | 'created_at' | 'updated_at' | 'created_by'>;

const LS_KEY = 'digiai_decisions';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function readLocal(): Decision[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Decision[];
  } catch {
    return [];
  }
}

function writeLocal(items: Decision[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function cache(items: Decision[]) {
  writeLocal(items);
  return items;
}

export const decisionsStore = {
  isOnline: isSupabaseReady,

  async list(): Promise<Decision[]> {
    if (!isSupabaseReady()) return readLocal();

    const { data, error } = await supabase.from('v_decisions').select('*');
    if (error) {
      console.error('[decisionsStore] list', error);
      return readLocal();
    }

    return cache((data as Decision[]) || []);
  },

  async create(input: NewDecision): Promise<Decision | null> {
    const now = new Date().toISOString();
    const localItem: Decision = {
      id: crypto.randomUUID(),
      title: input.title,
      context: input.context,
      decision: input.decision,
      alternatives: input.alternatives,
      expected_impact: input.expected_impact,
      tags: input.tags,
      decided_at: input.decided_at,
      created_at: now,
      updated_at: now,
      created_by: null,
    };

    writeLocal([...readLocal(), localItem]);

    if (!isSupabaseReady()) return localItem;

    const { data, error } = await supabase
      .schema('ops')
      .from('decisions')
      .insert(input)
      .select()
      .single();

    if (error) {
      console.error('[decisionsStore] create', error);
      return localItem;
    }

    const serverItem = data as Decision;
    writeLocal([...readLocal().filter((item) => item.id !== localItem.id), serverItem]);
    return serverItem;
  },

  async update(id: string, input: Partial<NewDecision>): Promise<void> {
    const updatedAt = new Date().toISOString();
    writeLocal(
      readLocal().map((item) => (
        item.id === id
          ? { ...item, ...input, updated_at: updatedAt }
          : item
      )),
    );

    if (!isSupabaseReady()) return;

    const { error } = await supabase
      .schema('ops')
      .from('decisions')
      .update(input)
      .eq('id', id);

    if (error) console.error('[decisionsStore] update', error);
  },

  async softDelete(id: string): Promise<void> {
    writeLocal(readLocal().filter((item) => item.id !== id));

    if (!isSupabaseReady()) return;

    const { error } = await supabase
      .schema('ops')
      .from('decisions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error('[decisionsStore] softDelete', error);
  },
};
