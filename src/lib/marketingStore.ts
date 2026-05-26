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

export type AiPromptCategory = 'text' | 'image' | 'video' | 'audio' | 'music';
export type AiPromptTarget = 'chatgpt' | 'claude' | 'midjourney' | 'dalle' | 'gemini' | 'sora' | 'runway' | 'elevenlabs' | 'suno' | 'generic';

export type AiPromptTemplate = {
  id: string;
  code: string;
  name: string;
  category: AiPromptCategory | string;
  ai_target: AiPromptTarget | string;
  description: string | null;
  prompt_template: string;
  output_hint: string | null;
  locks: Record<string, unknown>;
  placeholders: string[];
  pillar_id: string | null;
  pillar_code: string | null;
  pillar_name: string | null;
  pillar_color: string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string;
  updated_at?: string;
};

export type RenderedPrompt = {
  template_id: string;
  template_code: string;
  template_name: string;
  category: string;
  ai_target: string;
  output_hint: string | null;
  rendered_prompt: string;
  vars_used: Record<string, string>;
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

  // ── AI Prompt Templates ──
  async listPromptTemplates(filters?: { category?: string; aiTarget?: string; pillarCode?: string }): Promise<AiPromptTemplate[]> {
    let q = supabase.from('v_marketing_ai_prompts').select('*');
    if (filters?.category) q = q.eq('category', filters.category);
    if (filters?.aiTarget) q = q.eq('ai_target', filters.aiTarget);
    if (filters?.pillarCode) q = q.eq('pillar_code', filters.pillarCode);
    const { data, error } = await q;
    if (error) { console.error('[marketingStore] listPromptTemplates:', error.message); return []; }
    return (data ?? []).map(d => ({
      ...d,
      locks: d.locks ?? {},
      placeholders: d.placeholders ?? [],
    })) as AiPromptTemplate[];
  },

  async renderPrompt(input: {
    templateId: string;
    postId?: string | null;
    ideaId?: string | null;
    extraVars?: Record<string, string>;
  }): Promise<RenderedPrompt | null> {
    const { data, error } = await supabase.rpc('marketing_render_prompt', {
      p_template_id: input.templateId,
      p_post_id: input.postId ?? null,
      p_idea_id: input.ideaId ?? null,
      p_extra_vars: (input.extraVars ?? {}) as Record<string, unknown>,
    });
    if (error) { console.error('[marketingStore] renderPrompt:', error.message); return null; }
    return data as RenderedPrompt;
  },

  async upsertPromptTemplate(patch: Partial<AiPromptTemplate>): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_upsert_prompt_template', { p_patch: patch as Record<string, unknown> });
    if (error) { console.error('[marketingStore] upsertPromptTemplate:', error.message); return null; }
    return data as string;
  },

  async deletePromptTemplate(id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_delete_prompt_template', { p_id: id });
    if (error) { console.error('[marketingStore] deletePromptTemplate:', error.message); return false; }
    return data === true;
  },

  // ── Hotmart sales / attribution ──
  async getPostSales(postId: string): Promise<{
    sales_count: number;
    revenue_cents: number;
    commission_cents: number;
    refunds_count: number;
    chargebacks_count: number;
    affiliate_sales_count: number;
  } | null> {
    const { data, error } = await supabase
      .from('v_marketing_post_sales')
      .select('sales_count,revenue_cents,commission_cents,refunds_count,chargebacks_count,affiliate_sales_count')
      .eq('post_id', postId)
      .maybeSingle();
    if (error) { console.error('[marketingStore] getPostSales:', error.message); return null; }
    return data as any;
  },

  async getHotmartStats(): Promise<{
    sales_total: number;
    revenue_cents_total: number;
    refunds_total: number;
    chargebacks_total: number;
    attributed_sales: number;
    affiliate_only_sales: number;
    unattributed_sales: number;
    affiliate_sales: number;
    unique_affiliates: number;
    unique_buyers: number;
    last_sale_at: string | null;
  } | null> {
    const { data, error } = await supabase.from('v_marketing_hotmart_stats').select('*').maybeSingle();
    if (error) { console.error('[marketingStore] getHotmartStats:', error.message); return null; }
    return data as any;
  },

  async getValidationRanking(): Promise<Array<{
    pillar_code: string;
    pillar_name: string;
    pillar_color: string;
    posts_count: number;
    sales_count: number;
    revenue_cents: number;
    sales_per_post: number;
  }>> {
    const { data, error } = await supabase.from('v_marketing_validation_ranking').select('*');
    if (error) { console.error('[marketingStore] getValidationRanking:', error.message); return []; }
    return (data ?? []) as any;
  },

  // ── Post AI Outputs (sistema de produção) ──
  async listPostOutputs(postId: string): Promise<Array<{
    id: string; post_id: string; template_id: string | null;
    template_code: string | null; template_name: string | null;
    ai_target: string | null; ai_provider: string | null; category: string | null;
    prompt_rendered: string; output_text: string | null; output_url: string | null;
    output_storage_path: string | null; notes: string | null;
    status: string; generated_at: string;
  }>> {
    const { data, error } = await supabase
      .from('v_marketing_post_outputs')
      .select('*')
      .eq('post_id', postId)
      .neq('status', 'superseded');
    if (error) { console.error('[marketingStore] listPostOutputs:', error.message); return []; }
    return (data ?? []) as any;
  },

  async savePostOutput(payload: {
    post_id: string; template_id?: string; ai_provider?: string;
    prompt_rendered: string; output_text?: string; output_url?: string;
    output_storage_path?: string; format?: string; notes?: string;
  }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_save_post_output', { p_payload: payload as Record<string, unknown> });
    if (error) { console.error('[marketingStore] savePostOutput:', error.message); return null; }
    return data as string;
  },

  async deletePostOutput(id: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_delete_post_output', { p_id: id });
    if (error) { console.error('[marketingStore] deletePostOutput:', error.message); return false; }
    return data === true;
  },

  async uploadAsset(postId: string, file: File): Promise<{ url: string; path: string } | null> {
    const ext = file.name.split('.').pop() || 'bin';
    const path = `posts/${postId}/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await supabase.storage.from('marketing-assets').upload(path, file, {
      contentType: file.type,
      upsert: false,
    });
    if (error) { console.error('[marketingStore] uploadAsset:', error.message); return null; }
    const { data } = supabase.storage.from('marketing-assets').getPublicUrl(path);
    return { url: data.publicUrl, path };
  },

  // ── Challenges (desafios mensais) ──
  async listChallenges(): Promise<Array<{
    id: string; code: string; name: string; description: string | null;
    movement: number | null; start_date: string | null; end_date: string | null;
    status: string; prize_description: string | null; rules: string | null;
    max_participants: number | null; hashtag: string | null; banner_url: string | null;
    participants_count: number; submissions_count: number; winners_count: number;
    total_sales_cents: number | null; closed_at: string | null; created_at: string;
  }>> {
    const { data, error } = await supabase.from('v_marketing_challenges').select('*');
    if (error) { console.error('[marketingStore] listChallenges:', error.message); return []; }
    return (data ?? []) as any;
  },

  async getChallengesStats(): Promise<{ active: number; draft: number; closed: number; cancelled: number; total_participations: number; total_winners: number } | null> {
    const { data, error } = await supabase.from('v_marketing_challenges_stats').select('*').maybeSingle();
    if (error) { console.error('[marketingStore] getChallengesStats:', error.message); return null; }
    return data as any;
  },

  async getChallengeLeaderboard(challengeId: string): Promise<Array<{
    id: string; challenge_id: string; member_id: string | null;
    participant_name: string; participant_email: string | null; participant_whatsapp: string | null;
    city: string | null; state: string | null; status: string;
    submission_text: string | null; submission_url: string | null; submission_at: string | null;
    sales_amount_cents: number | null; score: number | null; ranking: number | null;
    prize_awarded: string | null; joined_at: string;
  }>> {
    const { data, error } = await supabase.from('v_marketing_challenge_leaderboard').select('*').eq('challenge_id', challengeId);
    if (error) { console.error('[marketingStore] getChallengeLeaderboard:', error.message); return []; }
    return (data ?? []) as any;
  },

  async createChallenge(payload: { name: string; description?: string; movement?: number; start_date?: string; end_date?: string; status?: string; prize_description?: string; rules?: string; hashtag?: string; max_participants?: number; banner_url?: string; code?: string }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_create_challenge', { p_payload: payload as Record<string, unknown> });
    if (error) { console.error('[marketingStore] createChallenge:', error.message); return null; }
    return data as string;
  },

  async updateChallenge(id: string, patch: Record<string, unknown>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_challenge', { p_id: id, p_patch: patch });
    if (error) { console.error('[marketingStore] updateChallenge:', error.message); return false; }
    return data === true;
  },

  async addChallengeParticipation(payload: { challenge_id: string; member_id?: string; participant_name?: string; participant_email?: string; participant_whatsapp?: string }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_add_challenge_participation', { p_payload: payload as Record<string, unknown> });
    if (error) { console.error('[marketingStore] addChallengeParticipation:', error.message); return null; }
    return data as string;
  },

  async updateParticipation(id: string, patch: Record<string, unknown>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_participation', { p_id: id, p_patch: patch });
    if (error) { console.error('[marketingStore] updateParticipation:', error.message); return false; }
    return data === true;
  },

  async finalizeChallenge(id: string): Promise<{ ranked: number } | null> {
    const { data, error } = await supabase.rpc('marketing_finalize_challenge', { p_id: id });
    if (error) { console.error('[marketingStore] finalizeChallenge:', error.message); return null; }
    return data as any;
  },

  // ── Community (membros do Hotmart) ──
  async listCommunityMembers(): Promise<Array<{
    id: string;
    full_name: string;
    email: string;
    whatsapp: string | null;
    city: string | null;
    state: string | null;
    hotmart_transaction: string | null;
    joined_at: string;
    status: string;
    tier: string;
    last_active_at: string | null;
    testimonials_count: number;
    utm_source: string | null;
    utm_medium: string | null;
    utm_campaign: string | null;
    attributed_post_id: string | null;
    attributed_pillar_id: string | null;
    whatsapp_consent: boolean;
    email_consent: boolean;
    notes: string | null;
    pillar_code: string | null;
    pillar_name: string | null;
    pillar_color: string | null;
    attributed_post_hook: string | null;
    attributed_post_date: string | null;
    hotmart_value_cents: number | null;
    hotmart_commission_cents: number | null;
  }>> {
    const { data, error } = await supabase.from('v_marketing_community').select('*');
    if (error) { console.error('[marketingStore] listCommunityMembers:', error.message); return []; }
    return (data ?? []) as any;
  },

  async getCommunityStats(): Promise<{
    total: number; active: number; vip: number; inactive: number; refunded: number;
    new_last_7d: number; new_last_30d: number; active_last_30d: number;
    whatsapp_optin: number; email_optin: number; attributed_to_post: number;
    first_member_at: string | null; last_member_at: string | null;
  } | null> {
    const { data, error } = await supabase.from('v_marketing_community_stats').select('*').maybeSingle();
    if (error) { console.error('[marketingStore] getCommunityStats:', error.message); return null; }
    return data as any;
  },

  async updateCommunityMember(id: string, patch: Record<string, unknown>): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_update_community_member', { p_id: id, p_patch: patch });
    if (error) { console.error('[marketingStore] updateCommunityMember:', error.message); return false; }
    return data === true;
  },

  async createCommunityMember(payload: { full_name: string; email: string; whatsapp?: string; city?: string; state?: string; tier?: string; notes?: string; whatsapp_consent?: boolean }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_create_community_member', { p_payload: payload as Record<string, unknown> });
    if (error) { console.error('[marketingStore] createCommunityMember:', error.message); return null; }
    return data as string;
  },

  // ── Bulk schedule (Planejador) ──
  async bulkSchedule(input: {
    startDate: string;
    weeks: number;
    perWeek: number;
    channels?: string[];
    dryRun?: boolean;
  }): Promise<{
    posts_created: number;
    dry_run: boolean;
    first_date: string | null;
    last_date: string | null;
    by_pillar: Record<string, number>;
    channels: string[];
    channels_count: number;
    preview: Array<{ date: string; idea_id: string; content_type: string; hook: string }> | null;
  } | null> {
    const { data, error } = await supabase.rpc('marketing_bulk_schedule', {
      p_start_date: input.startDate,
      p_weeks: input.weeks,
      p_per_week: input.perWeek,
      p_channels: input.channels ?? null,
      p_dry_run: input.dryRun ?? false,
    });
    if (error) { console.error('[marketingStore] bulkSchedule:', error.message); return null; }
    return data as any;
  },

  async unschedulePlanned(fromDate?: string): Promise<{ ideas_freed: number; posts_deleted: number } | null> {
    const { data, error } = await supabase.rpc('marketing_unschedule_planned', { p_from_date: fromDate ?? null });
    if (error) { console.error('[marketingStore] unschedulePlanned:', error.message); return null; }
    return data as any;
  },

  // ── Promote post → affiliate material ──
  async getPostPromotion(postId: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_get_post_promotion', { p_post_id: postId });
    if (error) { console.error('[marketingStore] getPostPromotion:', error.message); return null; }
    return (data as string | null) ?? null;
  },

  // ── Testimonials ──
  async submitTestimonial(payload: {
    full_name: string;
    optica_name?: string;
    city?: string;
    state?: string;
    whatsapp?: string;
    whatsapp_consent?: boolean;
    hook_applied?: string;
    story: string;
    sale_value_cents?: number;
    photo_url?: string;
    rating?: number;
    hotmart_transaction?: string;
    user_agent?: string;
  }): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_submit_testimonial', { p_payload: payload as Record<string, unknown> });
    if (error) { console.error('[marketingStore] submitTestimonial:', error.message); return null; }
    return data as string;
  },

  async listTestimonials(): Promise<Array<{
    id: string;
    full_name: string;
    optica_name: string | null;
    city: string | null;
    state: string | null;
    whatsapp: string | null;
    whatsapp_consent: boolean;
    hook_applied: string | null;
    story: string;
    sale_value_cents: number | null;
    photo_url: string | null;
    rating: number | null;
    status: string;
    source: string;
    hotmart_transaction: string | null;
    promoted_idea_id: string | null;
    promoted_idea_hook: string | null;
    reviewer_notes: string | null;
    reviewed_at: string | null;
    created_at: string;
  }>> {
    const { data, error } = await supabase.from('v_marketing_testimonials').select('*');
    if (error) { console.error('[marketingStore] listTestimonials:', error.message); return []; }
    return (data ?? []) as any;
  },

  async reviewTestimonial(id: string, status: 'pending'|'approved'|'rejected'|'used'|'spam', notes?: string): Promise<boolean> {
    const { data, error } = await supabase.rpc('marketing_review_testimonial', { p_id: id, p_status: status, p_notes: notes ?? null });
    if (error) { console.error('[marketingStore] reviewTestimonial:', error.message); return false; }
    return data === true;
  },

  async promoteTestimonialToIdea(id: string, pillarId?: string): Promise<string | null> {
    const { data, error } = await supabase.rpc('marketing_promote_testimonial_to_idea', { p_id: id, p_pillar_id: pillarId ?? null });
    if (error) { console.error('[marketingStore] promoteTestimonialToIdea:', error.message); return null; }
    return data as string;
  },

  async getTestimonialsStats(): Promise<{ pending: number; approved: number; used: number; rejected: number; spam: number; total: number } | null> {
    const { data, error } = await supabase.from('v_marketing_testimonials_stats').select('*').maybeSingle();
    if (error) { console.error('[marketingStore] getTestimonialsStats:', error.message); return null; }
    return data as any;
  },

  async promotePostToMaterial(postId: string): Promise<{ materialId: string; alreadyPromoted: boolean } | null> {
    const { data, error } = await supabase.rpc('marketing_promote_post_to_material', { p_post_id: postId });
    if (error) { console.error('[marketingStore] promotePostToMaterial:', error.message); return null; }
    const r = data as { material_id: string; already_promoted: boolean };
    return { materialId: r.material_id, alreadyPromoted: r.already_promoted };
  },
};
