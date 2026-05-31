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

function isoHoursAgo(n: number): string {
  const d = new Date();
  d.setUTCHours(d.getUTCHours() - n);
  return d.toISOString();
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
    const start24 = isoHoursAgo(24);
    const end24 = new Date().toISOString();

    const query = `query Viewer($zone: String!, $start: Date!, $end: Date!, $start24: Time!, $end24: Time!) {
      viewer {
        zones(filter: { zoneTag: $zone }) {
          httpRequests1dGroups(limit: 31, filter: { date_geq: $start, date_leq: $end }) {
            sum {
              requests
              bytes
              threats
              countryMap { clientCountryName requests }
              responseStatusMap { edgeResponseStatus requests }
            }
          }
          httpRequests1hGroups(limit: 24, filter: { datetime_geq: $start24, datetime_leq: $end24 }) {
            sum { requests }
          }
        }
      }
    }`;

    const r = await fetch(GRAPHQL, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ query, variables: { zone: ZONE_ID, start: start7, end, start24, end24 } }),
    });
    const j = await r.json();
    if (!r.ok || j.errors) throw new Error(`graphql: ${JSON.stringify(j.errors ?? j)}`);

    const zone = j?.data?.viewer?.zones?.[0];
    const groups7 = zone?.httpRequests1dGroups ?? [];
    const groups24 = zone?.httpRequests1hGroups ?? [];

    // Totais 7d
    let requests7d = 0, bytes7d = 0, threats7d = 0;
    const countryTotals = new Map<string, number>();
    const statusTotals = new Map<number, number>();

    for (const g of groups7) {
      requests7d += g.sum?.requests ?? 0;
      bytes7d += g.sum?.bytes ?? 0;
      threats7d += g.sum?.threats ?? 0;
      for (const c of (g.sum?.countryMap ?? []) as Array<{ clientCountryName: string; requests: number }>) {
        countryTotals.set(c.clientCountryName, (countryTotals.get(c.clientCountryName) ?? 0) + (c.requests ?? 0));
      }
      for (const s of (g.sum?.responseStatusMap ?? []) as Array<{ edgeResponseStatus: number; requests: number }>) {
        statusTotals.set(s.edgeResponseStatus, (statusTotals.get(s.edgeResponseStatus) ?? 0) + (s.requests ?? 0));
      }
    }

    // 24h
    let requests24h = 0;
    for (const g of groups24) requests24h += g.sum?.requests ?? 0;

    // Top 5 countries + top 6 status codes
    const topCountries = [...countryTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
    const topStatuses = [...statusTotals.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);

    const rows: Record<string, unknown>[] = [
      { metric_type: "requests", period: "24h", value_numeric: requests24h, period_start: start24.slice(0, 10), period_end: end },
      { metric_type: "requests", period: "7d", value_numeric: requests7d, period_start: start7, period_end: end },
      { metric_type: "bandwidth", period: "7d", value_numeric: bytes7d, period_start: start7, period_end: end },
      { metric_type: "threats", period: "7d", value_numeric: threats7d, period_start: start7, period_end: end },
      { metric_type: "ssl_status", period: "realtime", value_text: "active" },
    ];
    for (const [country, requests] of topCountries) {
      rows.push({ metric_type: "top_country", period: "7d", metric_key: country, value_numeric: requests, period_start: start7, period_end: end });
    }
    for (const [code, requests] of topStatuses) {
      rows.push({ metric_type: "status_code", period: "7d", metric_key: String(code), value_numeric: requests, period_start: start7, period_end: end });
    }

    const { data: count, error: repErr } = await supabase.rpc("fn_replace_metrics", { p_source: "cloudflare", p_rows: rows });
    if (repErr) throw new Error(`replace_metrics: ${repErr.message}`);

    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "ok", p_error: null });
    return jsonResp({ ok: true, configured: true, provider: PROVIDER, rows_written: count, requests_7d: requests7d, requests_24h: requests24h, countries: topCountries.length, statuses: topStatuses.length });
  } catch (e) {
    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "error", p_error: String(e) }).catch(() => {});
    return jsonResp({ ok: false, error: String(e) }, 500);
  }
});
