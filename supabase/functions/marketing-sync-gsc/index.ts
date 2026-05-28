import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROVIDER = "google_search_console";
const SETUP_DOC = "/docs/setup-gsc-oauth.md";
const SITE_URL = "sc-domain:digiai.app.br";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const GSC_BASE = "https://searchconsole.googleapis.com/webmasters/v3/sites";

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

// deno-lint-ignore no-explicit-any
type Supa = any;

async function getSecret(supabase: Supa, label: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("fn_get_credential_secret", {
    p_provider: PROVIDER,
    p_label: label,
  });
  if (error) throw new Error(`get_secret ${label}: ${error.message}`);
  return data ?? null;
}

async function getAccessToken(clientId: string, clientSecret: string, refreshToken: string): Promise<string> {
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const r = await fetch(TOKEN_ENDPOINT, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`token_refresh: ${JSON.stringify(j)}`);
  return j.access_token as string;
}

async function gscQuery(accessToken: string, payload: unknown): Promise<Record<string, unknown>> {
  const url = `${GSC_BASE}/${encodeURIComponent(SITE_URL)}/searchAnalytics/query`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`gsc_query: ${JSON.stringify(j)}`);
  return j;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  let payload: { action?: string; code?: string; redirect_uri?: string } = {};
  try { payload = await req.json(); } catch { /* sem body = sync default */ }

  // --- Modo 1: troca authorization code por refresh_token (uma vez) ---
  if (payload.action === "exchange_code") {
    try {
      const clientId = await getSecret(supabase, "gsc-client-id");
      const clientSecret = await getSecret(supabase, "gsc-client-secret");
      if (!clientId || !clientSecret) {
        return jsonResp({ ok: false, error: "client_id/secret ausentes no vault" }, 400);
      }
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: payload.code ?? "",
        redirect_uri: payload.redirect_uri ?? "http://localhost",
        grant_type: "authorization_code",
      });
      const r = await fetch(TOKEN_ENDPOINT, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      const j = await r.json();
      if (!r.ok || !j.refresh_token) {
        return jsonResp({ ok: false, error: "exchange_failed", detail: j }, 400);
      }
      const { error: setErr } = await supabase.rpc("fn_set_credential_service", {
        p_provider: PROVIDER,
        p_credential_type: "oauth_refresh_token",
        p_value: j.refresh_token,
        p_label: "gsc-refresh-token",
        p_scope: "https://www.googleapis.com/auth/webmasters.readonly",
        p_notes: "Obtido via OAuth code exchange (Claude in Chrome 2026-05-27)",
      });
      if (setErr) return jsonResp({ ok: false, error: `save_refresh: ${setErr.message}` }, 500);
      return jsonResp({ ok: true, exchanged: true, message: "refresh_token salvo no vault" });
    } catch (e) {
      return jsonResp({ ok: false, error: String(e) }, 500);
    }
  }

  // --- Modo 2: sync de métricas ---
  try {
    const clientId = await getSecret(supabase, "gsc-client-id");
    const clientSecret = await getSecret(supabase, "gsc-client-secret");
    const refreshToken = await getSecret(supabase, "gsc-refresh-token");

    if (!clientId || !clientSecret) {
      return jsonResp({ ok: false, configured: false, provider: PROVIDER,
        message: "client_id/secret GSC não cadastrados.", doc: SETUP_DOC }, 503);
    }
    if (!refreshToken) {
      return jsonResp({ ok: false, configured: false, provider: PROVIDER, needs_authorization: true,
        message: "Falta autorizar OAuth (refresh_token). Rode o fluxo de autorização.", doc: SETUP_DOC }, 503);
    }

    const accessToken = await getAccessToken(clientId, clientSecret, refreshToken);

    const end = isoDaysAgo(2);   // GSC tem ~2 dias de atraso
    const start7 = isoDaysAgo(9);
    const start30 = isoDaysAgo(32);

    const totals7 = await gscQuery(accessToken, { startDate: start7, endDate: end });
    const totals30 = await gscQuery(accessToken, { startDate: start30, endDate: end });
    const queries7 = await gscQuery(accessToken, { startDate: start7, endDate: end, dimensions: ["query"], rowLimit: 5 });
    const pages7 = await gscQuery(accessToken, { startDate: start7, endDate: end, dimensions: ["page"], rowLimit: 5 });

    const rows: Record<string, unknown>[] = [];
    const t7 = (totals7.rows as Array<Record<string, number>> | undefined)?.[0];
    const t30 = (totals30.rows as Array<Record<string, number>> | undefined)?.[0];

    // Totais sempre gravados (0 quando ainda não há dados) — mantém o card consistente.
    rows.push({ metric_type: "clicks", period: "7d", value_numeric: t7?.clicks ?? 0, period_start: start7, period_end: end });
    rows.push({ metric_type: "impressions", period: "7d", value_numeric: t7?.impressions ?? 0, period_start: start7, period_end: end });
    rows.push({ metric_type: "ctr", period: "7d", value_numeric: t7?.ctr ?? 0, period_start: start7, period_end: end });
    rows.push({ metric_type: "position", period: "7d", value_numeric: t7?.position ?? 0, period_start: start7, period_end: end });
    rows.push({ metric_type: "clicks", period: "30d", value_numeric: t30?.clicks ?? 0, period_start: start30, period_end: end });
    rows.push({ metric_type: "impressions", period: "30d", value_numeric: t30?.impressions ?? 0, period_start: start30, period_end: end });

    for (const q of (queries7.rows as Array<Record<string, unknown>> | undefined) ?? []) {
      const keys = q.keys as string[];
      rows.push({ metric_type: "top_query", period: "7d", metric_key: keys[0], value_numeric: q.clicks, period_start: start7, period_end: end });
    }
    for (const p of (pages7.rows as Array<Record<string, unknown>> | undefined) ?? []) {
      const keys = p.keys as string[];
      rows.push({ metric_type: "top_page", period: "7d", metric_key: keys[0], value_numeric: p.clicks, period_start: start7, period_end: end });
    }

    const { data: count, error: repErr } = await supabase.rpc("fn_replace_metrics", { p_source: "gsc", p_rows: rows });
    if (repErr) throw new Error(`replace_metrics: ${repErr.message}`);

    // Sitemap health (best-effort) — popula o card Sitemap a partir do GSC.
    try {
      const smUrl = `${GSC_BASE}/${encodeURIComponent(SITE_URL)}/sitemaps`;
      const smR = await fetch(smUrl, { headers: { "Authorization": `Bearer ${accessToken}` } });
      const smJ = await smR.json();
      if (smR.ok) {
        const list = (smJ.sitemap as Array<Record<string, unknown>> | undefined) ?? [];
        let urls = 0, errors = 0;
        let lastRead = "";
        for (const sm of list) {
          errors += Number(sm.errors ?? 0);
          for (const c of (sm.contents as Array<Record<string, unknown>> | undefined) ?? []) {
            urls += Number(c.submitted ?? 0);
          }
          if (sm.lastDownloaded) lastRead = String(sm.lastDownloaded).slice(0, 10);
        }
        await supabase.rpc("fn_replace_metrics", { p_source: "sitemap", p_rows: [
          { metric_type: "gsc_last_read", period: "all_time", value_text: lastRead || "—" },
          { metric_type: "urls_discovered", period: "all_time", value_numeric: urls },
          { metric_type: "errors", period: "all_time", value_numeric: errors },
        ] });
      }
    } catch (_) { /* sitemap best-effort */ }

    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "ok", p_error: null });

    return jsonResp({ ok: true, configured: true, provider: PROVIDER, rows_written: count, period_end: end });
  } catch (e) {
    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "error", p_error: String(e) }).catch(() => {});
    return jsonResp({ ok: false, error: String(e) }, 500);
  }
});
