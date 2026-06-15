import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Central de Postagens — sync de status de conta (seguidores). ADR-0039 / F2.
// Lê marketing.social_accounts (metrics_enabled) e grava placar diário em account_status.
// Token Meta de LEITURA no Vault (provider 'meta_graph'); publicação segue humana (T-9/T-10).

const PROVIDER = "meta_graph";
const CRED_LABEL = "digiai-bm-readonly";
const GRAPH = "https://graph.facebook.com/v23.0";
const SETUP_DOC = "/docs/setup-meta-graph-token.md";

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
type Acc = {
  account_code: string; platform: string;
  meta_ig_user_id: string | null; meta_page_id: string | null;
};

async function syncOne(supabase: Supa, token: string, a: Acc): Promise<number> {
  let followers: number | null = null, follows: number | null = null, mediaCount: number | null = null, raw: unknown = {};

  if (a.platform === "instagram" && a.meta_ig_user_id) {
    const url = `${GRAPH}/${a.meta_ig_user_id}?fields=followers_count,follows_count,media_count&access_token=${token}`;
    const j = await (await fetch(url)).json();
    if (j.error) throw new Error(`ig ${a.account_code}: ${j.error.message}`);
    followers = j.followers_count ?? null; follows = j.follows_count ?? null; mediaCount = j.media_count ?? null; raw = j;
  } else if (a.platform === "facebook" && a.meta_page_id) {
    const url = `${GRAPH}/${a.meta_page_id}?fields=followers_count,fan_count&access_token=${token}`;
    const j = await (await fetch(url)).json();
    if (j.error) throw new Error(`fb ${a.account_code}: ${j.error.message}`);
    followers = j.followers_count ?? j.fan_count ?? null; raw = j;
  } else {
    return 0; // sem id Meta cadastrado ainda (preencher na F1)
  }

  const { error } = await supabase.from("account_status").upsert({
    account_code: a.account_code, platform: a.platform,
    followers, follows, media_count: mediaCount, captured_on: today(),
    raw: raw as Record<string, unknown>,
  }, { onConflict: "account_code,captured_on" });
  if (error) throw new Error(`upsert ${a.account_code}: ${error.message}`);
  return 1;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  let payload: { account_code?: string } = {};
  try { payload = await req.json(); } catch { /* sem body = todas as contas */ }

  try {
    const { data: token, error: secErr } = await supabase.rpc("fn_get_credential_secret", { p_provider: PROVIDER, p_label: CRED_LABEL });
    if (secErr) throw new Error(`get_secret: ${secErr.message}`);
    if (!token) return jsonResp({ ok: false, configured: false, provider: PROVIDER, message: "Token Meta Graph não cadastrado (F1 pendente).", doc: SETUP_DOC }, 503);

    let q = supabase.from("social_accounts").select("account_code, platform, meta_ig_user_id, meta_page_id").eq("metrics_enabled", true);
    if (payload.account_code) q = q.eq("account_code", payload.account_code);
    const { data: accts, error: accErr } = await q;
    if (accErr) throw new Error(`accounts: ${accErr.message}`);
    if (!accts?.length) return jsonResp({ ok: true, configured: true, provider: PROVIDER, message: "Nenhuma conta com metrics_enabled.", results: [] });

    const results: Array<{ account_code: string; written?: number; error?: string }> = [];
    for (const a of accts as Acc[]) {
      try { results.push({ account_code: a.account_code, written: await syncOne(supabase, token, a) }); }
      catch (e) { results.push({ account_code: a.account_code, error: String(e) }); }
    }
    return jsonResp({ ok: true, configured: true, provider: PROVIDER, results });
  } catch (e) {
    return jsonResp({ ok: false, error: String(e) }, 500);
  }
});
