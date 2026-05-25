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

  async createIdea(input: Omit<ContentIdea, 'id' | 'used_count' | 'last_used_at' | 'created_at' | 'pillar_code' | 'pillar_name' | 'pillar_color' | 'pillar_icon'>): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_create_idea', {
      p_pillar_id: input.pillar_id,
      p_hook: input.hook,
      p_narrative: input.narrative ?? null,
      p_target_audience: input.target_audience ?? null,
      p_suggested_format: input.suggested_format ?? null,
      p_cta_suggestion: input.cta_suggestion ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) {
      console.error('[marketingStore] createIdea error:', error.message);
      return null;
    }
    return data as string;
  },

  async updateIdea(id: string, patch: Partial<ContentIdea>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_idea', {
      p_id: id,
      p_patch: patch as Record<string, unknown>,
    });
    if (error) {
      console.error('[marketingStore] updateIdea error:', error.message);
      return false;
    }
    return data === true;
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
  }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_create_calendar_post', {
      p_scheduled_date: input.scheduled_date,
      p_scheduled_time: input.scheduled_time ?? null,
      p_idea_id: input.idea_id ?? null,
      p_pillar_id: input.pillar_id ?? null,
      p_platform: input.platform ?? null,
      p_content_type: input.content_type ?? null,
      p_hook: input.hook ?? null,
      p_narrative: input.narrative ?? null,
      p_cta: input.cta ?? null,
      p_hashtags: input.hashtags ?? null,
      p_media_external_url: input.media_external_url ?? null,
      p_status: input.status ?? 'planned',
      p_notes: input.notes ?? null,
    });
    if (error) {
      console.error('[marketingStore] createCalendarPost error:', error.message);
      return null;
    }
    return data as string;
  },

  async updateCalendarPost(id: string, patch: Partial<CalendarPost>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_calendar_post', {
      p_id: id,
      p_patch: patch as Record<string, unknown>,
    });
    if (error) {
      console.error('[marketingStore] updateCalendarPost error:', error.message);
      return false;
    }
    return data === true;
  },

  /**
   * Agenda uma ideia para uma data específica.
   * RPC atômica: cria entry no calendar + marca a idea como 'scheduled' + incrementa used_count.
   */
  async scheduleIdea(ideaId: string, scheduledDate: string, extras?: { platform?: string; content_type?: string; notes?: string }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_schedule_idea', {
      p_idea_id: ideaId,
      p_scheduled_date: scheduledDate,
      p_platform: extras?.platform ?? null,
      p_content_type: extras?.content_type ?? null,
      p_notes: extras?.notes ?? null,
    });
    if (error) {
      console.error('[marketingStore] scheduleIdea error:', error.message);
      return null;
    }
    return data as string;
  },
};
