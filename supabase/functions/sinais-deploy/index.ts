import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Passo 3 do contrato do estado automático dos apps (docs/contrato-estado-automatico-dos-apps-2026-09-16.md, item E):
// para cada app ativo em ops.apps, abre as URLs de produção declaradas na ficha e grava UM sinal 'deploy' por app
// (ok = todas responderam 2xx/3xx; build = <meta name="build"> quando a página publica). Quem chama: cron da 148
// (a cada 30 min) ou staff à mão. Sem ops.apps preenchida (runner do passo 4), não mede nada — e diz isso.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}

// A ficha declara urls como mapa ({producao, repo, ...}) ou lista. Repositório não é "no ar": fica de fora.
function urlsDeProducao(urls: unknown): string[] {
  const vals = Array.isArray(urls) ? urls : (urls && typeof urls === "object" ? Object.entries(urls as Record<string, unknown>)
    .filter(([k]) => !/repo/i.test(k)).map(([, v]) => v) : []);
  return [...new Set(vals.filter((v): v is string => typeof v === "string" && /^https?:\/\//i.test(v))
    .filter((u) => !/^https?:\/\/(www\.)?github\.com\//i.test(u)))];
}

async function sondar(url: string): Promise<{ url: string; http: number | null; build: string | null; ms: number; erro?: string }> {
  const t0 = Date.now();
  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(15000), headers: { "User-Agent": "digiai-sinais-deploy/1" } });
    const tipo = r.headers.get("content-type") ?? "";
    const html = tipo.includes("html") ? (await r.text()).slice(0, 200_000) : "";
    const build = html.match(/<meta\s+name=["']build["']\s+content=["']([^"']+)["']/i)?.[1] ?? null;
    return { url, http: r.status, build, ms: Date.now() - t0 };
  } catch (e) {
    return { url, http: null, build: null, ms: Date.now() - t0, erro: String((e as Error)?.name ?? e) };
  }
}

async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s)));
}
async function iguais(a: string, b: string): Promise<boolean> {
  const [x, y] = [await sha256(a), await sha256(b)];
  let dif = 0;
  for (let i = 0; i < x.length; i++) dif |= x[i] ^ y[i];
  return dif === 0;
}
// Mesmo portão da marketing-sync-* (125): cron com o segredo do vault, ou staff validado no Auth + is_staff() no banco.
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

  const supabase = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "");
  if (!await quemChama(req, supabase)) return jsonResp({ ok: false, error: "nao_autorizado" }, 401);

  const { data: apps, error } = await supabase.schema("ops").from("apps").select("slug, urls").eq("ativo", true);
  if (error) return jsonResp({ ok: false, error: `apps: ${error.message}` }, 500);
  if (!apps || apps.length === 0) return jsonResp({ ok: true, medidos: 0, aviso: "ops.apps vazia — fichas chegam pelo runner (passo 4)" });

  const resultado: { slug: string; ok: boolean | null; urls: number }[] = [];
  const erros: string[] = [];
  for (const a of apps as { slug: string; urls: unknown }[]) {
    const urls = urlsDeProducao(a.urls);
    if (urls.length === 0) { resultado.push({ slug: a.slug, ok: null, urls: 0 }); continue; }
    const sondas = await Promise.all(urls.map(sondar));
    const ok = sondas.every((s) => s.http !== null && s.http >= 200 && s.http < 400);
    const { error: e } = await supabase.schema("ops").rpc("fn_registrar_sinal_app", {
      p: { slug: a.slug, tipo: "deploy", ok, dados: { build: sondas.find((s) => s.build)?.build ?? null, urls: sondas } },
    });
    if (e) erros.push(`${a.slug}: ${e.message}`);
    resultado.push({ slug: a.slug, ok, urls: urls.length });
  }
  return jsonResp({ ok: erros.length === 0, medidos: resultado.filter((r) => r.ok !== null).length, sem_url: resultado.filter((r) => r.ok === null).map((r) => r.slug), resultado, erros });
});
