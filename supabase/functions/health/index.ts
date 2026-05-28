// ============================================================
// Edge Function: health  (R-016 — healthcheck público)
// ============================================================
// GET https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/health
//
// Checa: reachability do banco (latência de um SELECT leve numa view pública).
// Resposta < 500ms p95, sem dados sensíveis. Público (rate-limit no gateway).
//
// DEPLOY: precisa de verify_jwt = false (endpoint público).
//   supabase functions deploy health --no-verify-jwt
// Monitor sugerido: UptimeRobot keyword "\"status\":\"ok\"".
//
// Schema da resposta segue Cockpit/runbooks/healthcheck-padroes.md.
// ============================================================

// @ts-ignore — Deno global
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

const json = (body: unknown, status: number): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  });

async function checkDatabase(): Promise<{ ok: boolean; latency_ms: number; error?: string }> {
  const t0 = Date.now();
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/v_decisions?select=id&limit=1`, {
      headers: {
        'apikey': SUPABASE_SERVICE_ROLE,
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE}`,
      },
    });
    const latency_ms = Date.now() - t0;
    if (!res.ok) return { ok: false, latency_ms, error: `pgrst_${res.status}` };
    return { ok: true, latency_ms };
  } catch (e) {
    return { ok: false, latency_ms: Date.now() - t0, error: String(e) };
  }
}

// @ts-ignore — Deno.serve global
Deno.serve(async (req: Request) => {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    return json({ status: 'error', reason: 'method_not_allowed' }, 405);
  }

  const database = await checkDatabase();
  const status = database.ok ? 'ok' : 'down';

  return json(
    {
      status,
      service: 'digiai-app',
      ts: new Date().toISOString(),
      checks: { database },
    },
    database.ok ? 200 : 503,
  );
});
