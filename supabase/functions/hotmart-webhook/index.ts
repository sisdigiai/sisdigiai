// ============================================================
// Edge Function: hotmart-webhook
// ============================================================
// Recebe POST do Hotmart, valida HOTTOK (header X-HOTMART-HOTTOK
// ou query ?hottok=), grava em marketing.hotmart_events_raw,
// dispara public.marketing_ingest_hotmart_event(raw_id) que
// parseia e atribui via UTM.
//
// Sem deps externas — chama PostgREST direto via fetch
// (deploy via Management API roda com --no-remote, JSR/ESM bloqueados).
//
// Secrets necessários (Supabase Dashboard → Edge Functions → Secrets):
//   HOTMART_HOTTOK = signing secret do produto B105515825
//   (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são auto-injetados)
//
// URL pública:
//   https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/hotmart-webhook
// ============================================================

// @ts-ignore — Deno global
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// @ts-ignore
const HOTTOK                = Deno.env.get('HOTMART_HOTTOK') ?? '';

const PGRST = `${SUPABASE_URL}/rest/v1`;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function pgrstInsert(table: string, schema: string, row: Record<string, unknown>) {
  const res = await fetch(`${PGRST}/${table}`, {
    method: 'POST',
    headers: {
      'apikey':           SUPABASE_SERVICE_ROLE,
      'Authorization':    `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Content-Type':     'application/json',
      'Content-Profile':  schema,
      'Prefer':           'return=representation',
    },
    body: JSON.stringify(row),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`PGRST insert ${schema}.${table} ${res.status}: ${text}`);
  return JSON.parse(text);
}

async function rpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${PGRST}/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'apikey':         SUPABASE_SERVICE_ROLE,
      'Authorization':  `Bearer ${SUPABASE_SERVICE_ROLE}`,
      'Content-Type':   'application/json',
    },
    body: JSON.stringify(args),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`RPC ${fn} ${res.status}: ${text}`);
  return text ? JSON.parse(text) : null;
}

// @ts-ignore — Deno.serve global
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json({ error: 'method_not_allowed' }, 405);
  }

  const url = new URL(req.url);
  const headerHottok = req.headers.get('x-hotmart-hottok') ?? '';
  const queryHottok  = url.searchParams.get('hottok') ?? '';
  const providedHottok = headerHottok || queryHottok;
  const signatureOk = HOTTOK !== '' && providedHottok === HOTTOK;

  let payload: Record<string, unknown> = {};
  try {
    payload = await req.json();
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  const eventType =
    (payload['event'] as string | undefined) ??
    (payload['type'] as string | undefined) ??
    null;

  const data     = (payload['data'] as Record<string, unknown> | undefined) ?? payload;
  const purchase = (data['purchase'] as Record<string, unknown> | undefined) ?? {};
  const product  = (data['product']  as Record<string, unknown> | undefined) ?? {};

  const hotmartId =
    (purchase['transaction'] as string | undefined) ??
    (data['transaction'] as string | undefined) ??
    null;
  const productId = (product['id'] as string | undefined) ?? null;

  const sourceIp =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;

  // 1. Grava raw (audit log — nunca perde dados, mesmo com HOTTOK errado)
  let rawId: string;
  try {
    const inserted = await pgrstInsert('hotmart_events_raw', 'marketing', {
      event_type:         eventType,
      hotmart_id:         hotmartId,
      product_id:         productId,
      signature_ok:       signatureOk,
      signature_provided: providedHottok
        ? `${providedHottok.slice(0, 4)}…(${providedHottok.length})`
        : null,
      payload,
      source_ip:          sourceIp,
    });
    rawId = inserted[0]?.id;
    if (!rawId) throw new Error('no_id_returned_from_insert');
  } catch (e) {
    console.error('[hotmart-webhook] raw insert failed:', e);
    return json({ error: 'storage_failed', detail: String(e) }, 500);
  }

  // 2. Fail-closed: só dispara o ingest quando a assinatura foi validada.
  //    HOTTOK ausente (mal-configurado) OU divergente => NÃO processa.
  //    O raw já foi gravado acima, então auditoria não perde o evento mesmo na rejeição.
  if (!signatureOk) {
    const reason = HOTTOK === '' ? 'hottok_not_configured' : 'invalid_hottok';
    if (HOTTOK === '') {
      console.error('[hotmart-webhook] HOTMART_HOTTOK ausente — modo fail-closed, evento não processado');
    }
    return json({ ok: false, reason, raw_id: rawId }, 200);
  }

  // 3. Dispara ingest síncrono
  try {
    const result = await rpc('marketing_ingest_hotmart_event', { p_raw_id: rawId });
    return json({ ok: true, raw_id: rawId, result }, 200);
  } catch (e) {
    console.error('[hotmart-webhook] ingest RPC failed:', e);
    return json({ ok: true, raw_id: rawId, ingest_error: String(e) }, 200);
  }
});
