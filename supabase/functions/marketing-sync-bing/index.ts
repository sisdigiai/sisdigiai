import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROVIDER = "bing_webmaster";
const SETUP_DOC = "/docs/setup-bing-api-key.md";
const BASE = "https://ssl.bing.com/webmaster/api.svc/json";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// deno-lint-ignore no-explicit-any
type Supa = any;
type SiteRow = { site: string; bing_site_url: string; sort_order: number };

async function getSites(supabase: Supa, only?: string): Promise<SiteRow[]> {
  let q = supabase.from("v_seo_sites").select("site, bing_site_url, sort_order");
  if (only) q = q.eq("site", only);
  const { data, error } = await q;
  if (error) throw new Error(`sites: ${error.message}`);
  return ((data ?? []) as SiteRow[]).sort((a, b) => a.sort_order - b.sort_order);
}

async function bingGet(method: string, apiKey: string, siteUrl: string): Promise<unknown> {
  const url = `${BASE}/${method}?siteUrl=${encodeURIComponent(siteUrl)}&apikey=${apiKey}`;
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(`${method}: ${JSON.stringify(j)}`);
  return j;
}

async function syncOneSite(supabase: Supa, apiKey: string, s: SiteRow): Promise<number> {
  const SITE = s.bing_site_url; // ex.: "https://digiai.app.br"
  const rows: Record<string, unknown>[] = [];

  // Top queries (Clicks/Impressions por query)
  let totalClicks = 0, totalImpr = 0;
  try {
    const qs = await bingGet("GetQueryStats", apiKey, SITE) as { d?: Array<Record<string, number | string>> };
    const list = qs.d ?? [];
    const sorted = [...list].sort((a, b) => (Number(b.Clicks) || 0) - (Number(a.Clicks) || 0));
    for (const q of list) { totalClicks += Number(q.Clicks) || 0; totalImpr += Number(q.Impressions) || 0; }
    for (const q of sorted.slice(0, 5)) {
      rows.push({ metric_type: "top_query", period: "7d", metric_key: String(q.Query), value_numeric: Number(q.Clicks) || 0 });
    }
  } catch (_) { /* sem dados ainda */ }

  rows.push({ metric_type: "clicks", period: "7d", value_numeric: totalClicks });
  rows.push({ metric_type: "impressions", period: "7d", value_numeric: totalImpr });

  // Backlinks: total + top referrers (best-effort)
  try {
    const bl = await bingGet("GetLinkCounts", apiKey, SITE) as { d?: { Links?: Array<{ Url?: string; Count?: number }> } };
    const list = bl.d?.Links ?? [];
    const total = list.reduce((acc, x) => acc + (Number(x.Count) || 0), 0);
    rows.push({ metric_type: "backlinks_total", period: "all_time", value_numeric: total });

    const sorted = [...list].sort((a, b) => (Number(b.Count) || 0) - (Number(a.Count) || 0));
    for (const r of sorted.slice(0, 10)) {
      if (r.Url) {
        rows.push({ metric_type: "top_referrer", period: "all_time", metric_key: r.Url, value_numeric: Number(r.Count) || 0 });
      }
    }
  } catch (_) { /* indisponível */ }

  const { error: repErr } = await supabase.rpc("fn_replace_metrics", { p_source: "bing", p_site: s.site, p_rows: rows });
  if (repErr) throw new Error(`replace_metrics: ${repErr.message}`);
  return rows.length;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let payload: { site?: string } = {};
  try { payload = await req.json(); } catch { /* sem body = todos os sites */ }

  try {
    const { data: apiKey, error: secErr } = await supabase.rpc("fn_get_credential_secret", {
      p_provider: PROVIDER, p_label: "sisdigiai-bing",
    });
    if (secErr) throw new Error(`get_secret: ${secErr.message}`);
    if (!apiKey) {
      return jsonResp({ ok: false, configured: false, provider: PROVIDER,
        message: "API key Bing não cadastrada.", doc: SETUP_DOC }, 503);
    }

    const sites = await getSites(supabase, payload.site);
    if (!sites.length) return jsonResp({ ok: false, configured: true, provider: PROVIDER, error: "no_active_sites" }, 404);

    const results: Array<{ site: string; rows_written?: number; error?: string }> = [];
    for (const s of sites) {
      try {
        const n = await syncOneSite(supabase, apiKey, s);
        results.push({ site: s.site, rows_written: n });
      } catch (e) {
        results.push({ site: s.site, error: String(e) });
      }
    }

    if (payload.site && results.length === 1 && results[0].error) {
      await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "error", p_error: results[0].error }).catch(() => {});
      return jsonResp({ ok: false, configured: true, provider: PROVIDER, error: results[0].error, results }, 500);
    }

    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "ok", p_error: null });
    const totalRows = results.reduce((a, r) => a + (r.rows_written ?? 0), 0);
    return jsonResp({ ok: true, configured: true, provider: PROVIDER, results, rows_written: totalRows });
  } catch (e) {
    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "error", p_error: String(e) }).catch(() => {});
    return jsonResp({ ok: false, error: String(e) }, 500);
  }
});
