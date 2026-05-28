import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROVIDER = "cloudflare";
const SETUP_DOC = "/docs/setup-cloudflare-api-token.md";
const ZONE_ID = "b449527cc352374d312fe8ebd2937060";
const GRAPHQL = "https://api.cloudflare.com/client/v4/graphql";

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

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  try {
    const { data: token, error: secErr } = await supabase.rpc("fn_get_credential_secret", {
      p_provider: PROVIDER, p_label: "digiai-app-br-readonly",
    });
    if (secErr) throw new Error(`get_secret: ${secErr.message}`);
    if (!token) {
      return jsonResp({ ok: false, configured: false, provider: PROVIDER,
        message: "API token Cloudflare não cadastrado.", doc: SETUP_DOC }, 503);
    }

    const start7 = isoDaysAgo(7);
    const end = isoDaysAgo(0);

    const query = `query Viewer($zone: String!, $start: Date!, $end: Date!) {
      viewer {
        zones(filter: { zoneTag: $zone }) {
          httpRequests1dGroups(limit: 31, filter: { date_geq: $start, date_leq: $end }) {
            sum { requests bytes threats }
          }
        }
      }
    }`;

    const r = await fetch(GRAPHQL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { zone: ZONE_ID, start: start7, end } }),
    });
    const j = await r.json();
    if (!r.ok || j.errors) throw new Error(`graphql: ${JSON.stringify(j.errors ?? j)}`);

    const groups = j?.data?.viewer?.zones?.[0]?.httpRequests1dGroups ?? [];
    let requests = 0, bytes = 0, threats = 0;
    for (const g of groups) {
      requests += g.sum?.requests ?? 0;
      bytes += g.sum?.bytes ?? 0;
      threats += g.sum?.threats ?? 0;
    }

    const rows: Record<string, unknown>[] = [
      { metric_type: "requests", period: "7d", value_numeric: requests, period_start: start7, period_end: end },
      { metric_type: "bandwidth", period: "7d", value_numeric: bytes, period_start: start7, period_end: end },
      { metric_type: "threats", period: "7d", value_numeric: threats, period_start: start7, period_end: end },
      { metric_type: "ssl_status", period: "realtime", value_text: "active" },
    ];

    const { data: count, error: repErr } = await supabase.rpc("fn_replace_metrics", { p_source: "cloudflare", p_rows: rows });
    if (repErr) throw new Error(`replace_metrics: ${repErr.message}`);

    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "ok", p_error: null });
    return jsonResp({ ok: true, configured: true, provider: PROVIDER, rows_written: count, requests_7d: requests });
  } catch (e) {
    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "error", p_error: String(e) }).catch(() => {});
    return jsonResp({ ok: false, error: String(e) }, 500);
  }
});
