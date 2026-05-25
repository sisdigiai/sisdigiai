import { supabase } from './supabase';

// ─── Types (espelham as tabelas marketing.* via views v_marketing_*) ───

export type ContentPillar = {
  id: string;
  code: string;
  name: string;
  description: string | null;
  color: string | null;
  icon: string | null;
  sort_order: number;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
};

export type ContentIdeaStatus = 'available' | 'scheduled' | 'used' | 'archived';

export type ContentIdea = {
  id: string;
  pillar_id: string | null;
  hook: string;
  narrative: string | null;
  target_audience: string | null;
  suggested_format: string | null;
  cta_suggestion: string | null;
  status: ContentIdeaStatus;
  used_count: number;
  last_used_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  // joined from view
  pillar_code?: string | null;
  pillar_name?: string | null;
  pillar_color?: string | null;
  pillar_icon?: string | null;
  created_at?: string;
};

export type CalendarStatus = 'planned' | 'in_production' | 'ready' | 'published' | 'cancelled';

export type CalendarPost = {
  id: string;
  scheduled_date: string; // YYYY-MM-DD
  scheduled_time: string | null;
  idea_id: string | null;
  pillar_id: string | null;
  platform: string | null; // instagram, facebook, tiktok, etc.
  content_type: string | null; // reel, carrossel, story, post, live, email
  hook: string | null;
  narrative: string | null;
  cta: string | null;
  hashtags: string[] | null;
  media_external_url: string | null;
  status: CalendarStatus;
  published_at: string | null;
  published_url: string | null;
  performance_data: Record<string, unknown>;
  notes: string | null;
  // joined from view
  pillar_code?: string | null;
  pillar_name?: string | null;
  pillar_color?: string | null;
  pillar_icon?: string | null;
  created_at?: string;
  updated_at?: string;
};

// ─── Store API ───

export const marketingStore = {
  // ── Pillars ──
  async listPillars(): Promise<ContentPillar[]> {
    const { data, error } = await supabase.from('v_marketing_pillars').select('*');
    if (error) {
      console.error('[marketingStore] listPillars error:', error.message);
      return [];
    }
    return (data ?? []) as ContentPillar[];
  },

  // ── Ideas ──
  async listIdeas(filters?: { pillarCode?: string; status?: ContentIdeaStatus }): Promise<ContentIdea[]> {
    let q = supabase.from('v_marketing_ideas').select('*');
    if (filters?.pillarCode) q = q.eq('pillar_code', filters.pillarCode);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) {
      console.error('[marketingStore] listIdeas error:', error.message);
      return [];
    }
    return (data ?? []) as ContentIdea[];
  },

  async createIdea(input: Omit<ContentIdea, 'id' | 'used_count' | 'last_used_at' | 'created_at' | 'pillar_code' | 'pillar_name' | 'pillar_color' | 'pillar_icon'>): Promise<ContentIdea | null> {
    const { data, error } = await supabase
      .schema('marketing')
      .from('content_ideas')
      .insert({
        pillar_id: input.pillar_id,
        hook: input.hook,
        narrative: input.narrative,
        target_audience: input.target_audience,
        suggested_format: input.suggested_format,
        cta_suggestion: input.cta_suggestion,
        status: input.status ?? 'available',
        notes: input.notes,
        metadata: input.metadata ?? {},
      })
      .select()
      .single();
    if (error) {
      console.error('[marketingStore] createIdea error:', error.message);
      return null;
    }
    return data as ContentIdea;
  },

  async updateIdea(id: string, patch: Partial<ContentIdea>): Promise<boolean> {
    const { error } = await supabase
      .schema('marketing')
      .from('content_ideas')
      .update(patch)
      .eq('id', id);
    if (error) {
      console.error('[marketingStore] updateIdea error:', error.message);
      return false;
    }
    return true;
  },

  // ── Calendar ──
  async listCalendar(filters?: { fromDate?: string; toDate?: string; status?: CalendarStatus; pillarCode?: string }): Promise<CalendarPost[]> {
    let q = supabase.from('v_marketing_calendar').select('*');
    if (filters?.fromDate) q = q.gte('scheduled_date', filters.fromDate);
    if (filters?.toDate) q = q.lte('scheduled_date', filters.toDate);
    if (filters?.status) q = q.eq('status', filters.status);
    if (filters?.pillarCode) q = q.eq('pillar_code', filters.pillarCode);
    const { data, error } = await q;
    if (error) {
      console.error('[marketingStore] listCalendar error:', error.message);
      return [];
    }
    return (data ?? []) as CalendarPost[];
  },

  async createCalendarPost(input: {
    scheduled_date: string;
    scheduled_time?: string | null;
    idea_id?: string | null;
    pillar_id?: string | null;
    platform?: string | null;
    content_type?: string | null;
    hook?: string | null;
    narrative?: string | null;
    cta?: string | null;
    hashtags?: string[] | null;
    media_external_url?: string | null;
    status?: CalendarStatus;
    notes?: string | null;
  }): Promise<CalendarPost | null> {
    const { data, error } = await supabase
      .schema('marketing')
      .from('content_calendar')
      .insert({
        ...input,
        status: input.status ?? 'planned',
        performance_data: {},
      })
      .select()
      .single();
    if (error) {
      console.error('[marketingStore] createCalendarPost error:', error.message);
      return null;
    }
    return data as CalendarPost;
  },

  async updateCalendarPost(id: string, patch: Partial<CalendarPost>): Promise<boolean> {
    const { error } = await supabase
      .schema('marketing')
      .from('content_calendar')
      .update(patch)
      .eq('id', id);
    if (error) {
      console.error('[marketingStore] updateCalendarPost error:', error.message);
      return false;
    }
    return true;
  },

  /**
   * Agenda uma ideia para uma data específica.
   * Cria entry no calendar + marca a idea como 'scheduled' + incrementa used_count.
   */
  async scheduleIdea(ideaId: string, scheduledDate: string, extras?: { platform?: string; content_type?: string; notes?: string }): Promise<CalendarPost | null> {
    // Busca a idea para copiar dados
    const { data: idea, error: ideaErr } = await supabase
      .from('v_marketing_ideas')
      .select('*')
      .eq('id', ideaId)
      .single();
    if (ideaErr || !idea) {
      console.error('[marketingStore] scheduleIdea: idea not found', ideaErr?.message);
      return null;
    }

    const post = await this.createCalendarPost({
      scheduled_date: scheduledDate,
      idea_id: ideaId,
      pillar_id: idea.pillar_id,
      platform: extras?.platform ?? null,
      content_type: extras?.content_type ?? idea.suggested_format,
      hook: idea.hook,
      cta: idea.cta_suggestion,
      notes: extras?.notes ?? null,
      status: 'planned',
    });

    if (post) {
      await this.updateIdea(ideaId, {
        status: 'scheduled',
        used_count: (idea.used_count ?? 0) + 1,
        last_used_at: new Date().toISOString(),
      });
    }

    return post;
  },
};
