import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// Passo 4 do contrato do estado automático dos apps (docs/contrato-estado-automatico-dos-apps-2026-09-16.md, itens A–D).
// Quem chama: só o runner local do Cockpit (Cockpit/scripts/estado-runner.mjs), a cada 30 min, com x-estado-secret.
// O segredo mora em UM lugar do lado do servidor (secret ESTADO_INGEST_SECRET do projeto) e foi digitado pelo dono.
// Sem o secret configurado, fecha: portão que abre no erro não é portão (R-037).
// A edge não interpreta arquivo nenhum: recebe o retrato já lido e repassa às funções da 140, que validam cada campo.

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-estado-secret",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResp(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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

type Retrato = {
  fichas?: Record<string, unknown>[];
  decisoes?: Record<string, unknown>[];
  portoes?: { abertos: unknown[]; fechados: unknown[]; lido_em: string } | null;
  passada?: { fichas?: number; nao_declarados?: string[]; recusadas?: string[] } | null;
  sinais_repo?: Record<string, unknown>[];
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return jsonResp({ ok: false, error: "method_not_allowed" }, 405);

  const esperado = Deno.env.get("ESTADO_INGEST_SECRET") ?? "";
  if (esperado.length < 32) return jsonResp({ ok: false, error: "segredo_nao_configurado" }, 503);
  const veio = req.headers.get("x-estado-secret") ?? "";
  if (!veio || !await iguais(veio, esperado)) return jsonResp({ ok: false, error: "nao_autorizado" }, 401);

  let r: Retrato;
  try { r = await req.json(); } catch { return jsonResp({ ok: false, error: "json_invalido" }, 400); }

  const ops = createClient(Deno.env.get("SUPABASE_URL") ?? "", Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "").schema("ops");
  const erros: string[] = [];
  const feito = { fichas: 0, decisoes: 0, sinais_repo: 0, portoes: null as unknown };

  // Fichas antes dos sinais: ops.apps_sinais tem FK para ops.apps.
  for (const f of r.fichas ?? []) {
    const { error } = await ops.rpc("fn_atualizar_ficha_app", { p: f });
    if (error) erros.push(`ficha ${f.slug}: ${error.message}`); else feito.fichas++;
  }
  for (const d of r.decisoes ?? []) {
    const { error } = await ops.rpc("fn_registrar_decisao", { p: d });
    if (error) erros.push(`decisao ${d.fonte_arquivo}: ${error.message}`); else feito.decisoes++;
  }
  if (r.portoes) {
    const { data, error } = await ops.rpc("fn_sincronizar_portoes", {
      p_abertos: r.portoes.abertos, p_fechados: r.portoes.fechados, p_lido_em: r.portoes.lido_em,
    });
    if (error) erros.push(`portoes: ${error.message}`); else feito.portoes = data;
  }
  for (const s of r.sinais_repo ?? []) {
    const { error } = await ops.rpc("fn_registrar_sinal_app", { p: { ...s, tipo: "repo" } });
    if (error) erros.push(`sinal ${s.slug}: ${error.message}`); else feito.sinais_repo++;
  }

  // 150: o que NÃO entrou (ficha sem frontmatter, ficha recusada) vira item da tela Hoje, não linha de log.
  if (r.passada) {
    const { error } = await ops.rpc("fn_registrar_passada", { p: r.passada });
    if (error) erros.push(`passada: ${error.message}`);
  }

  return jsonResp({ ok: erros.length === 0, feito, erros });
});
