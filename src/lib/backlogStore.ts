import { supabase } from './supabase';

export type BacklogStatus = 'pending' | 'in_progress' | 'blocked' | 'done' | 'cancelled';

export type BacklogItem = {
  id: string;
  title: string;
  description: string | null;
  product_id: string | null;
  area: string | null;
  priority: number;
  status: BacklogStatus;
  owner: string | null;
  due_date: string | null;
  tags: string[];
  origem: string | null;
  blocker: string | null;
  created_at: string;
  updated_at: string;
};

export type NewBacklogItem = Omit<BacklogItem, 'id' | 'created_at' | 'updated_at'>;

const LS_KEY = 'digiai_backlog_items';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function readLocal(): BacklogItem[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as BacklogItem[];
  } catch {
    return [];
  }
}

function writeLocal(items: BacklogItem[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

function cache(items: BacklogItem[]) {
  writeLocal(items);
  return items;
}

export const backlogStore = {
  isOnline: isSupabaseReady,

  async list(): Promise<BacklogItem[]> {
    if (!isSupabaseReady()) return readLocal();

    const { data, error } = await supabase.from('v_backlog_items').select('*');
    if (error) {
      console.error('[backlogStore] list', error);
      return readLocal();
    }

    return cache((data as BacklogItem[]) || []);
  },

  async create(input: Partial<NewBacklogItem>): Promise<BacklogItem | null> {
    const now = new Date().toISOString();
    const localItem: BacklogItem = {
      id: crypto.randomUUID(),
      title: input.title || '',
      description: input.description || null,
      product_id: input.product_id || null,
      area: input.area || null,
      priority: input.priority ?? 3,
      status: input.status ?? 'pending',
      owner: input.owner || null,
      due_date: input.due_date || null,
      tags: input.tags || [],
      origem: input.origem || null,
      blocker: input.blocker || null,
      created_at: now,
      updated_at: now,
    };

    const localItems = [...readLocal(), localItem];
    writeLocal(localItems);

    if (!isSupabaseReady()) return localItem;

    const payload = {
      priority: 3,
      status: 'pending' as BacklogStatus,
      tags: [],
      ...input,
    };

    const { data, error } = await supabase
      .schema('ops')
      .from('backlog_items')
      .insert(payload)
      .select()
      .single();

    if (error) {
      console.error('[backlogStore] create', error);
      return localItem;
    }

    const serverItem = data as BacklogItem;
    writeLocal([...readLocal().filter((item) => item.id !== localItem.id), serverItem]);
    return serverItem;
  },

  async update(id: string, input: Partial<NewBacklogItem>): Promise<void> {
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
      .from('backlog_items')
      .update(input)
      .eq('id', id);

    if (error) console.error('[backlogStore] update', error);
  },

  async updateStatus(id: string, status: BacklogStatus): Promise<void> {
    return this.update(id, { status });
  },

  async softDelete(id: string): Promise<void> {
    writeLocal(readLocal().filter((item) => item.id !== id));

    if (!isSupabaseReady()) return;

    const { error } = await supabase
      .schema('ops')
      .from('backlog_items')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) console.error('[backlogStore] softDelete', error);
  },
};
