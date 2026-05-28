import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROVIDER = "bing_webmaster";
const SETUP_DOC = "/docs/setup-bing-api-key.md";
const SITE = "https://digiai.app.br";
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

async function bingGet(method: string, apiKey: string): Promise<unknown> {
  const url = `${BASE}/${method}?siteUrl=${encodeURIComponent(SITE)}&apikey=${apiKey}`;
  const r = await fetch(url);
  const j = await r.json();
  if (!r.ok) throw new Error(`${method}: ${JSON.stringify(j)}`);
  return j;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { data: apiKey, error: secErr } = await supabase.rpc("fn_get_credential_secret", {
      p_provider: PROVIDER, p_label: "sisdigiai-bing",
    });
    if (secErr) throw new Error(`get_secret: ${secErr.message}`);
    if (!apiKey) {
      return jsonResp({ ok: false, configured: false, provider: PROVIDER,
        message: "API key Bing não cadastrada.", doc: SETUP_DOC }, 503);
    }

    const rows: Record<string, unknown>[] = [];

    // Top queries (Clicks/Impressions por query)
    let totalClicks = 0, totalImpr = 0;
    try {
      const qs = await bingGet("GetQueryStats", apiKey) as { d?: Array<Record<string, number | string>> };
      const list = qs.d ?? [];
      const sorted = [...list].sort((a, b) => (Number(b.Clicks) || 0) - (Number(a.Clicks) || 0));
      for (const q of list) { totalClicks += Number(q.Clicks) || 0; totalImpr += Number(q.Impressions) || 0; }
      for (const q of sorted.slice(0, 5)) {
        rows.push({ metric_type: "top_query", period: "7d", metric_key: String(q.Query), value_numeric: Number(q.Clicks) || 0 });
      }
    } catch (_) { /* sem dados ainda */ }

    rows.push({ metric_type: "clicks", period: "7d", value_numeric: totalClicks });
    rows.push({ metric_type: "impressions", period: "7d", value_numeric: totalImpr });

    // Backlinks total (best-effort)
    try {
      const bl = await bingGet("GetLinkCounts", apiKey) as { d?: Array<Record<string, number>> };
      const total = (bl.d ?? []).reduce((acc, x) => acc + (Number(x.Count) || 0), 0);
      if (total > 0) rows.push({ metric_type: "backlinks_total", period: "all_time", value_numeric: total });
    } catch (_) { /* indisponível */ }

    const { data: count, error: repErr } = await supabase.rpc("fn_replace_metrics", { p_source: "bing", p_rows: rows });
    if (repErr) throw new Error(`replace_metrics: ${repErr.message}`);

    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "ok", p_error: null });
    return jsonResp({ ok: true, configured: true, provider: PROVIDER, rows_written: count });
  } catch (e) {
    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "error", p_error: String(e) }).catch(() => {});
    return jsonResp({ ok: false, error: String(e) }, 500);
  }
});
