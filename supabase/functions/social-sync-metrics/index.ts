import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Central de Postagens — sync de métricas por post (Instagram). ADR-0039 / F2.
// Lê mídia recente das contas IG (metrics_enabled), pega insights e grava snapshot diário
// em marketing.post_metrics. Casa com content_calendar por permalink quando possível.
// LEITURA apenas (insights). FB post-insights numa iteração posterior.

const PROVIDER = "meta_graph";
const CRED_LABEL = "digiai-bm-readonly";
const GRAPH = "https://graph.facebook.com/v23.0";
const SETUP_DOC = "/docs/setup-meta-graph-token.md";
const MEDIA_LIMIT = 25;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
const today = () => new Date().toISOString().slice(0, 10);

// deno-lint-ignore no-explicit-any
type Supa = any;
type Acc = { account_code: string; platform: string; meta_ig_user_id: string | null };
type Media = { id: string; permalink?: string; media_type?: string; timestamp?: string };

async function getJson(url: string): Promise<Record<string, unknown>> {
  const j = await (await fetch(url)).json();
  if (j.error) throw new Error(j.error.message ?? JSON.stringify(j.error));
  return j;
}

async function syncOneIg(supabase: Supa, token: string, a: Acc, permalinkToPost: Map<string, string>): Promise<number> {
  if (!a.meta_ig_user_id) return 0;
  const mediaResp = await getJson(`${GRAPH}/${a.meta_ig_user_id}/media?fields=id,permalink,media_type,timestamp&limit=${MEDIA_LIMIT}&access_token=${token}`);
  const media = (mediaResp.data ?? []) as Media[];
  let written = 0;

  for (const m of media) {
    // métricas variam por tipo; reach/likes/comments/saved/shares cobrem feed e reels
    const metricList = m.media_type === "VIDEO" || m.media_type === "REELS"
      ? "reach,likes,comments,saved,shares,views"
      : "reach,likes,comments,saved,shares";
    let insights: Record<string, number> = {};
    try {
      const ins = await getJson(`${GRAPH}/${m.id}/insights?metric=${metricList}&access_token=${token}`);
      for (const row of (ins.data ?? []) as Array<{ name: string; values?: Array<{ value: number }> }>) {
        insights[row.name] = row.values?.[0]?.value ?? 0;
      }
    } catch { /* mídia sem insights (muito antiga / sem permissão) — registra o que der */ insights = {}; }

    const calendarPostId = m.permalink ? permalinkToPost.get(m.permalink) ?? null : null;
    const { error } = await supabase.from("post_metrics").upsert({
      calendar_post_id: calendarPostId,
      account_code: a.account_code,
      external_post_id: m.id,
      platform: "instagram",
      permalink: m.permalink ?? null,
      captured_on: today(),
      reach: insights.reach ?? null,
      likes: insights.likes ?? null,
      comments: insights.comments ?? null,
      shares: insights.shares ?? null,
      saves: insights.saved ?? null,
      video_views: insights.views ?? null,
      raw: { media: m, insights },
    }, { onConflict: "account_code,external_post_id,captured_on" });
    if (!error) written++;
  }
  return written;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  let payload: { account_code?: string } = {};
  try { payload = await req.json(); } catch { /* sem body = todas IG */ }

  try {
    const { data: token, error: secErr } = await supabase.rpc("fn_get_credential_secret", { p_provider: PROVIDER, p_label: CRED_LABEL });
    if (secErr) throw new Error(`get_secret: ${secErr.message}`);
    if (!token) return jsonResp({ ok: false, configured: false, provider: PROVIDER, message: "Token Meta Graph não cadastrado (F1 pendente).", doc: SETUP_DOC }, 503);

    // mapa permalink -> calendar_post_id (pra casar métrica com o post planejado)
    const { data: posts } = await supabase.from("content_calendar").select("id, published_url").not("published_url", "is", null);
    const permalinkToPost = new Map<string, string>();
    for (const p of (posts ?? []) as Array<{ id: string; published_url: string }>) {
      if (p.published_url) permalinkToPost.set(p.published_url.replace(/\/$/, ""), p.id);
    }

    let q = supabase.from("social_accounts").select("account_code, platform, meta_ig_user_id").eq("metrics_enabled", true).eq("platform", "instagram");
    if (payload.account_code) q = q.eq("account_code", payload.account_code);
    const { data: accts, error: accErr } = await q;
    if (accErr) throw new Error(`accounts: ${accErr.message}`);
    if (!accts?.length) return jsonResp({ ok: true, configured: true, provider: PROVIDER, message: "Nenhuma conta IG com metrics_enabled.", results: [] });

    const results: Array<{ account_code: string; written?: number; error?: string }> = [];
    for (const a of accts as Acc[]) {
      try { results.push({ account_code: a.account_code, written: await syncOneIg(supabase, token, a, permalinkToPost) }); }
      catch (e) { results.push({ account_code: a.account_code, error: String(e) }); }
    }
    return jsonResp({ ok: true, configured: true, provider: PROVIDER, results });
  } catch (e) {
    return jsonResp({ ok: false, error: String(e) }, 500);
  }
});
