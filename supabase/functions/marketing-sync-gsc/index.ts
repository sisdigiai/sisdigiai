import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROVIDER = "google_search_console";
const SETUP_DOC = "/docs/setup-gsc-oauth.md";
const TOKEN_ENDPOINT = "https://oauth2.googleapis.com/token";
const AUTH_ENDPOINT = "https://accounts.google.com/o/oauth2/v2/auth";
const SCOPE = "https://www.googleapis.com/auth/webmasters.readonly";
// Para onde o Google pode devolver o code. O Google já recusa URI não cadastrada no client;
// esta lista impede que a edge monte ou troque um code para um destino que não é o app.
const REDIRECTS = new Set([
  "https://app.digiai.app.br/",
  "http://localhost:3000/",
  "http://localhost:3100/",
]);
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
type SiteRow = { site: string; gsc_property: string; sort_order: number };

async function getSecret(supabase: Supa, label: string): Promise<string | null> {
  const { data, error } = await supabase.rpc("fn_get_credential_secret", {
    p_provider: PROVIDER,
    p_label: label,
  });
  if (error) throw new Error(`get_secret ${label}: ${error.message}`);
  return data ?? null;
}

async function getSites(supabase: Supa, only?: string): Promise<SiteRow[]> {
  let q = supabase.from("v_seo_sites").select("site, gsc_property, sort_order");
  if (only) q = q.eq("site", only);
  const { data, error } = await q;
  if (error) throw new Error(`sites: ${error.message}`);
  return ((data ?? []) as SiteRow[]).sort((a, b) => a.sort_order - b.sort_order);
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

async function gscQuery(accessToken: string, siteUrl: string, payload: unknown): Promise<Record<string, unknown>> {
  const url = `${GSC_BASE}/${encodeURIComponent(siteUrl)}/searchAnalytics/query`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Authorization": `Bearer ${accessToken}`, "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(`gsc_query: ${JSON.stringify(j)}`);
  return j;
}

// Sincroniza um site: grava métricas GSC + saúde do sitemap, ambas keyed por site.
async function syncOneSite(supabase: Supa, accessToken: string, s: SiteRow): Promise<number> {
  const SITE_URL = s.gsc_property; // ex.: "sc-domain:digiai.app.br"
  const end = isoDaysAgo(2);       // GSC tem ~2 dias de atraso
  const start7 = isoDaysAgo(9);
  const start30 = isoDaysAgo(32);
  const start90 = isoDaysAgo(92);  // janela "3m" da tela SEO (company.seo_medicoes)

  const totals7 = await gscQuery(accessToken, SITE_URL, { startDate: start7, endDate: end });
  const totals30 = await gscQuery(accessToken, SITE_URL, { startDate: start30, endDate: end });
  const totals90 = await gscQuery(accessToken, SITE_URL, { startDate: start90, endDate: end });
  const queries7 = await gscQuery(accessToken, SITE_URL, { startDate: start7, endDate: end, dimensions: ["query"], rowLimit: 5 });
  const pages7 = await gscQuery(accessToken, SITE_URL, { startDate: start7, endDate: end, dimensions: ["page"], rowLimit: 5 });

  const rows: Record<string, unknown>[] = [];
  const t7 = (totals7.rows as Array<Record<string, number>> | undefined)?.[0];
  const t30 = (totals30.rows as Array<Record<string, number>> | undefined)?.[0];

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

  const { error: repErr } = await supabase.rpc("fn_replace_metrics", { p_source: "gsc", p_site: s.site, p_rows: rows });
  if (repErr) throw new Error(`replace_metrics: ${repErr.message}`);

  // Saúde do sitemap (best-effort) — popula o card Sitemap a partir do GSC, por site.
  let smUrls: number | null = null, smPath: string | null = null, smLido: string | null = null;
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
        if (!smPath && sm.path) smPath = String(sm.path);
      }
      if (list.length > 0) { smUrls = urls; smLido = lastRead || null; }
      await supabase.rpc("fn_replace_metrics", { p_source: "sitemap", p_site: s.site, p_rows: [
        { metric_type: "gsc_last_read", period: "all_time", value_text: lastRead || "—" },
        { metric_type: "urls_discovered", period: "all_time", value_numeric: urls },
        { metric_type: "errors", period: "all_time", value_numeric: errors },
      ] });
    }
  } catch (_) { /* sitemap best-effort */ }

  // A tela SEO lê company.seo_medicoes (histórico); company.metrics é sobrescrita a cada rodada (147).
  const t90 = (totals90.rows as Array<Record<string, number>> | undefined)?.[0];
  const { error: medErr } = await supabase.rpc("fn_seo_registrar_medicao", {
    p_site: s.site,
    p_cliques: Math.round(t90?.clicks ?? 0),
    p_impressoes: Math.round(t90?.impressions ?? 0),
    p_posicao: t90?.position ?? null,
    p_ctr_pct: t90 ? (t90.ctr ?? 0) * 100 : null,
    p_paginas_sitemap: smUrls,
    p_sitemap_url: smPath,
    p_sitemap_lido_em: smLido,
  });
  if (medErr) throw new Error(`seo_medicao: ${medErr.message}`);

  return rows.length;
}

// Portão (migration 125). verify_jwt só exige UM JWT válido, e a chave anon é um — pública.
// Passa: (a) o cron, com x-marketing-sync-cron igual ao segredo do vault; ou (b) staff: JWT de
// usuário validado no Auth (não decode local) e public.is_staff() verdadeiro no banco (R-037).
// Qualquer falha fecha.
async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
async function iguais(a: string, b: string): Promise<boolean> {
  const [x, y] = [await sha256(a), await sha256(b)];
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}
// deno-lint-ignore no-explicit-any
async function quemChama(req: Request, supabase: any): Promise<"cron" | "staff" | null> {
  try {
    const cron = req.headers.get("x-marketing-sync-cron");
    if (cron) {
      const { data: esperado, error } = await supabase.rpc("fn_marketing_sync_cron_secret");
      return !error && typeof esperado === "string" && esperado.length > 0 && await iguais(cron, esperado) ? "cron" : null;
    }
    const jwt = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "").trim();
    if (!jwt) return null;
    const cli = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: u, error: eu } = await cli.auth.getUser(jwt);
    if (eu || !u?.user?.id) return null;
    const { data: staff, error: es } = await cli.rpc("is_staff");
    return !es && staff === true ? "staff" : null;
  } catch {
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const quem = await quemChama(req, supabase);
  if (!quem) return jsonResp({ ok: false, error: "nao_autorizado" }, 401);

  let payload: { action?: string; code?: string; redirect_uri?: string; state?: string; site?: string } = {};
  try { payload = await req.json(); } catch { /* sem body = sync de todos os sites */ }

  // --- Modo 0: URL de consentimento para o botão "Reautorizar Google" da tela SEO ---
  // O client_id mora no vault; a tela não o conhece e não precisa de o levar no bundle.
  if (payload.action === "auth_url") {
    if (quem !== "staff") return jsonResp({ ok: false, error: "auth_url_exige_staff" }, 403);
    if (!payload.redirect_uri || !REDIRECTS.has(payload.redirect_uri)) {
      return jsonResp({ ok: false, error: "redirect_uri_fora_da_lista" }, 400);
    }
    if (!payload.state || payload.state.length > 200) return jsonResp({ ok: false, error: "state_invalido" }, 400);
    const clientId = await getSecret(supabase, "gsc-client-id");
    if (!clientId) return jsonResp({ ok: false, error: "client_id ausente no vault (label gsc-client-id)" }, 503);
    const url = new URL(AUTH_ENDPOINT);
    url.search = new URLSearchParams({
      client_id: clientId,
      redirect_uri: payload.redirect_uri,
      response_type: "code",
      scope: SCOPE,
      // offline + consent: sem os dois o Google pode devolver só access_token, e o
      // exchange falha com "exchange_failed" por falta de refresh_token
      access_type: "offline",
      prompt: "consent",
      state: payload.state,
    }).toString();
    return jsonResp({ ok: true, url: url.toString() });
  }

  // --- Modo 1: troca authorization code por refresh_token (uma vez) ---
  if (payload.action === "exchange_code") {
    // grava credencial: nunca o cron, só uma pessoa de staff
    if (quem !== "staff") return jsonResp({ ok: false, error: "exchange_code_exige_staff" }, 403);
    if (!payload.code) return jsonResp({ ok: false, error: "code_ausente" }, 400);
    if (!payload.redirect_uri || !REDIRECTS.has(payload.redirect_uri)) {
      return jsonResp({ ok: false, error: "redirect_uri_fora_da_lista" }, 400);
    }
    try {
      const clientId = await getSecret(supabase, "gsc-client-id");
      const clientSecret = await getSecret(supabase, "gsc-client-secret");
      if (!clientId || !clientSecret) {
        return jsonResp({ ok: false, error: "client_id/secret ausentes no vault" }, 400);
      }
      const body = new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        code: payload.code,
        redirect_uri: payload.redirect_uri,
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
        p_scope: SCOPE,
        p_notes: `Obtido pelo botão Reautorizar Google (tela SEO), por staff, em ${new Date().toISOString()}`,
      });
      if (setErr) return jsonResp({ ok: false, error: `save_refresh: ${setErr.message}` }, 500);
      return jsonResp({ ok: true, exchanged: true, message: "refresh_token salvo no vault" });
    } catch (e) {
      return jsonResp({ ok: false, error: String(e) }, 500);
    }
  }

  // --- Modo 2: sync de métricas (multi-site) ---
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
    const sites = await getSites(supabase, payload.site);
    if (!sites.length) return jsonResp({ ok: false, configured: true, provider: PROVIDER, error: "no_active_sites" }, 404);

    const results: Array<{ site: string; rows_written?: number; error?: string }> = [];
    for (const s of sites) {
      try {
        const n = await syncOneSite(supabase, accessToken, s);
        results.push({ site: s.site, rows_written: n });
      } catch (e) {
        results.push({ site: s.site, error: String(e) });
      }
    }

    // Single-site (botão da aba): reflete o erro daquele site no card.
    if (payload.site && results.length === 1 && results[0].error) {
      // O builder do supabase-js só tem then(): `.catch(...)` lançava TypeError aqui mesmo,
      // no caminho de erro — a função caía com 500, o erro real sumia e o status ficava
      // no último "ok" (GSC parado desde 22/06/2026 mostrando ok).
      try { await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "error", p_error: results[0].error }); } catch { /* marcar o status não pode esconder o erro que se está a devolver */ }
      return jsonResp({ ok: false, configured: true, provider: PROVIDER, error: results[0].error, results }, 500);
    }

    await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "ok", p_error: null });
    const totalRows = results.reduce((a, r) => a + (r.rows_written ?? 0), 0);
    return jsonResp({ ok: true, configured: true, provider: PROVIDER, results, rows_written: totalRows, period_end: isoDaysAgo(2) });
  } catch (e) {
    try { await supabase.rpc("fn_mark_sync", { p_provider: PROVIDER, p_status: "error", p_error: String(e) }); } catch { /* marcar o status não pode esconder o erro que se está a devolver */ }
    return jsonResp({ ok: false, error: String(e) }, 500);
  }
});
