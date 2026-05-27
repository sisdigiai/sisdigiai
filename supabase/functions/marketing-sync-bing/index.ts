import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const PROVIDER = "bing_webmaster";
const SETUP_DOC = "/docs/setup-bing-api-key.md";

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

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
  );

  const { data: cred, error } = await supabase
    .rpc("fn_marketing_credential_status", { p_provider: PROVIDER })
    .maybeSingle();

  if (error) return jsonResp({ ok: false, provider: PROVIDER, error: error.message }, 500);

  if (!cred) {
    return jsonResp({
      ok: false,
      configured: false,
      provider: PROVIDER,
      message: "API key Bing Webmaster não cadastrada. Veja a doc para gerar e cadastrar.",
      doc: SETUP_DOC,
    }, 503);
  }

  return jsonResp({
    ok: true,
    configured: true,
    provider: PROVIDER,
    credential_id: cred.id,
    label: cred.label,
    last_sync_at: cred.last_sync_at,
    last_sync_status: cred.last_sync_status,
    todo: "stub — sync real será implementado em F5",
  });
});
