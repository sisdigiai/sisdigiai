import { supabase } from './supabase';

// ─── Types ───────────────────────────────────────────────────────

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
  pillar_code?: string | null;
  pillar_name?: string | null;
  pillar_color?: string | null;
  pillar_icon?: string | null;
  created_at?: string;
};

export type CalendarStatus = 'planned' | 'in_production' | 'ready' | 'published' | 'cancelled';

export type CalendarArt = {
  type: string;       // 'cover', 'story', 'reel', 'carrossel', 'video'
  format?: string;    // '1080x1080', '1080x1920', etc.
  url: string;
  label?: string;     // descrição livre
};

export type CalendarPost = {
  id: string;
  scheduled_date: string;
  scheduled_time: string | null;
  idea_id: string | null;
  pillar_id: string | null;
  platform: string | null;            // legacy single
  platforms: string[] | null;         // novo multi
  content_type: string | null;
  hook: string | null;
  narrative: string | null;
  copy_full: string | null;           // copy pronta
  posting_brief: string | null;       // brief criativo
  cta: string | null;
  hashtags: string[] | null;
  arts: CalendarArt[];                // múltiplas artes
  media_external_url: string | null;
  tools_used: string[] | null;
  responsible_producer: string | null;
  responsible_publisher: string | null;
  status: CalendarStatus;
  published_at: string | null;
  published_url: string | null;
  reach: number | null;
  impressions: number | null;
  likes: number | null;
  comments: number | null;
  shares: number | null;
  saves: number | null;
  link_clicks: number | null;
  conversions: number | null;
  performance_data: Record<string, unknown>;
  notes: string | null;
  pillar_code?: string | null;
  pillar_name?: string | null;
  pillar_color?: string | null;
  pillar_icon?: string | null;
  created_at?: string;
  updated_at?: string;
};

export type Platform = {
  code: string;
  name: string;
  parent_platform: string | null;
  icon: string | null;
  color: string | null;
  formats: Array<{ name: string; w: number; h: number; aspect: string; slides?: string; duration_max?: number }>;
  copy_char_limit: number | null;
  hashtag_limit: number | null;
  notes: string | null;
  sort_order: number;
  is_active: boolean;
};

export type AffiliateMaterialType = 'banner' | 'post_copy' | 'reel' | 'email' | 'whatsapp_msg' | 'carrossel' | 'story' | 'video';

export type AffiliateMaterial = {
  id: string;
  pillar_id: string | null;
  type: AffiliateMaterialType | string;
  title: string;
  description: string | null;
  copy_short: string | null;
  copy_medium: string | null;
  copy_long: string | null;
  art_urls: Array<{ format: string; url: string; dimensions?: string }>;
  platforms: string[];
  preview_url: string | null;
  downloads_count: number;
  is_active: boolean;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
  pillar_code?: string | null;
  pillar_name?: string | null;
  pillar_color?: string | null;
};

export type AffiliateStatus = 'pending' | 'active' | 'top' | 'inactive' | 'banned';
export type AffiliateTier = 'bronze' | 'prata' | 'ouro';

export type Affiliate = {
  id: string;
  full_name: string;
  email: string;
  whatsapp: string | null;
  instagram_handle: string | null;
  city: string | null;
  state: string | null;
  status: AffiliateStatus | string;
  tier: AffiliateTier | string;
  joined_at: string;
  total_sales: number;
  total_commission_cents: number;
  total_commission_brl?: number;
  affiliate_link_hotmart: string | null;
  affiliate_link_kiwify: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at?: string;
  updated_at?: string;
};

// ─── Store API ───────────────────────────────────────────────────

export const marketingStore = {
  // ── Pillars ──
  async listPillars(): Promise<ContentPillar[]> {
    const { data, error } = await supabase.from('v_marketing_pillars').select('*');
    if (error) { console.error('[marketingStore] listPillars:', error.message); return []; }
    return (data ?? []) as ContentPillar[];
  },

  // ── Platforms ──
  async listPlatforms(): Promise<Platform[]> {
    const { data, error } = await supabase.from('v_marketing_platforms').select('*');
    if (error) { console.error('[marketingStore] listPlatforms:', error.message); return []; }
    return (data ?? []) as Platform[];
  },

  // ── Ideas ──
  async listIdeas(filters?: { pillarCode?: string; status?: ContentIdeaStatus }): Promise<ContentIdea[]> {
    let q = supabase.from('v_marketing_ideas').select('*');
    if (filters?.pillarCode) q = q.eq('pillar_code', filters.pillarCode);
    if (filters?.status) q = q.eq('status', filters.status);
    const { data, error } = await q;
    if (error) { console.error('[marketingStore] listIdeas:', error.message); return []; }
    return (data ?? []) as ContentIdea[];
  },

  async createIdea(input: { pillar_id: string; hook: string; narrative?: string; target_audience?: string; suggested_format?: string; cta_suggestion?: string; notes?: string }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_create_idea', {
      p_pillar_id: input.pillar_id, p_hook: input.hook,
      p_narrative: input.narrative ?? null, p_target_audience: input.target_audience ?? null,
      p_suggested_format: input.suggested_format ?? null, p_cta_suggestion: input.cta_suggestion ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) { console.error('[marketingStore] createIdea:', error.message); return null; }
    return data as string;
  },

  async updateIdea(id: string, patch: Partial<ContentIdea>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_idea', { p_id: id, p_patch: patch as Record<string, unknown> });
    if (error) { console.error('[marketingStore] updateIdea:', error.message); return false; }
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
    if (error) { console.error('[marketingStore] listCalendar:', error.message); return []; }
    return (data ?? []).map(d => ({ ...d, arts: d.arts ?? [] })) as CalendarPost[];
  },

  async createCalendarPost(input: Partial<CalendarPost>): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_create_calendar_post', {
      p_scheduled_date: input.scheduled_date,
      p_scheduled_time: input.scheduled_time ?? null,
      p_idea_id: input.idea_id ?? null,
      p_pillar_id: input.pillar_id ?? null,
      p_platform: input.platform ?? null,
      p_platforms: input.platforms ?? null,
      p_content_type: input.content_type ?? null,
      p_hook: input.hook ?? null,
      p_narrative: input.narrative ?? null,
      p_copy_full: input.copy_full ?? null,
      p_posting_brief: input.posting_brief ?? null,
      p_cta: input.cta ?? null,
      p_hashtags: input.hashtags ?? null,
      p_arts: input.arts ?? null,
      p_media_external_url: input.media_external_url ?? null,
      p_tools_used: input.tools_used ?? null,
      p_responsible_producer: input.responsible_producer ?? null,
      p_responsible_publisher: input.responsible_publisher ?? null,
      p_status: input.status ?? 'planned',
      p_notes: input.notes ?? null,
    });
    if (error) { console.error('[marketingStore] createCalendarPost:', error.message); return null; }
    return data as string;
  },

  async updateCalendarPost(id: string, patch: Partial<CalendarPost>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_calendar_post', { p_id: id, p_patch: patch as Record<string, unknown> });
    if (error) { console.error('[marketingStore] updateCalendarPost:', error.message); return false; }
    return data === true;
  },

  async scheduleIdea(ideaId: string, scheduledDate: string, extras?: { platform?: string; content_type?: string; notes?: string }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_schedule_idea', {
      p_idea_id: ideaId, p_scheduled_date: scheduledDate,
      p_platform: extras?.platform ?? null, p_content_type: extras?.content_type ?? null, p_notes: extras?.notes ?? null,
    });
    if (error) { console.error('[marketingStore] scheduleIdea:', error.message); return null; }
    return data as string;
  },

  // ── Affiliate Materials ──
  async listMaterials(filters?: { pillarCode?: string; type?: string }): Promise<AffiliateMaterial[]> {
    let q = supabase.from('v_marketing_affiliate_materials').select('*');
    if (filters?.pillarCode) q = q.eq('pillar_code', filters.pillarCode);
    if (filters?.type) q = q.eq('type', filters.type);
    const { data, error } = await q;
    if (error) { console.error('[marketingStore] listMaterials:', error.message); return []; }
    return (data ?? []).map(d => ({ ...d, art_urls: d.art_urls ?? [], platforms: d.platforms ?? [] })) as AffiliateMaterial[];
  },

  async createMaterial(input: Partial<AffiliateMaterial> & { type: string; title: string }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_create_material', {
      p_type: input.type,
      p_title: input.title,
      p_pillar_id: input.pillar_id ?? null,
      p_description: input.description ?? null,
      p_copy_short: input.copy_short ?? null,
      p_copy_medium: input.copy_medium ?? null,
      p_copy_long: input.copy_long ?? null,
      p_art_urls: input.art_urls ?? null,
      p_platforms: input.platforms ?? null,
      p_preview_url: input.preview_url ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) { console.error('[marketingStore] createMaterial:', error.message); return null; }
    return data as string;
  },

  async updateMaterial(id: string, patch: Partial<AffiliateMaterial>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_material', { p_id: id, p_patch: patch as Record<string, unknown> });
    if (error) { console.error('[marketingStore] updateMaterial:', error.message); return false; }
    return data === true;
  },

  // ── Affiliates ──
  async listAffiliates(): Promise<Affiliate[]> {
    const { data, error } = await supabase.from('v_marketing_affiliates').select('*');
    if (error) { console.error('[marketingStore] listAffiliates:', error.message); return []; }
    return (data ?? []) as Affiliate[];
  },

  async createAffiliate(input: Partial<Affiliate> & { full_name: string; email: string }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_create_affiliate', {
      p_full_name: input.full_name,
      p_email: input.email,
      p_whatsapp: input.whatsapp ?? null,
      p_instagram_handle: input.instagram_handle ?? null,
      p_city: input.city ?? null,
      p_state: input.state ?? null,
      p_status: input.status ?? 'pending',
      p_tier: input.tier ?? 'bronze',
      p_affiliate_link_hotmart: input.affiliate_link_hotmart ?? null,
      p_affiliate_link_kiwify: input.affiliate_link_kiwify ?? null,
      p_notes: input.notes ?? null,
    });
    if (error) { console.error('[marketingStore] createAffiliate:', error.message); return null; }
    return data as string;
  },

  async updateAffiliate(id: string, patch: Partial<Affiliate>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_affiliate', { p_id: id, p_patch: patch as Record<string, unknown> });
    if (error) { console.error('[marketingStore] updateAffiliate:', error.message); return false; }
    return data === true;
  },
};
