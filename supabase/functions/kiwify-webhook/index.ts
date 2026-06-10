// ============================================================
// Edge Function: kiwify-webhook
// ============================================================
// Recebe POST da Kiwify, valida assinatura (?signature= na query,
// HMAC-SHA1 hex do corpo bruto com o token do webhook), grava em
// marketing.kiwify_events_raw e dispara
// public.marketing_ingest_kiwify_event(raw_id).
//
// Mesmo padrão fail-closed do hotmart-webhook: raw sempre gravado
// (auditoria), ingest só com assinatura válida.
//
// Sem deps externas — PostgREST direto via fetch.
//
// Secrets necessários (Supabase Dashboard → Edge Functions → Secrets):
//   KIWIFY_WEBHOOK_TOKEN = token exibido ao criar o webhook no painel Kiwify
//   (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são auto-injetados)
//
// URL pública (configurar no painel Kiwify → Apps → Webhooks):
//   https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/kiwify-webhook
// ============================================================

// @ts-ignore — Deno global
const SUPABASE_URL          = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const SUPABASE_SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// @ts-ignore
const KIWIFY_TOKEN          = Deno.env.get('KIWIFY_WEBHOOK_TOKEN') ?? '';

const PGRST = `${SUPABASE_URL}/rest/v1`;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

async function hmacSha1Hex(secret: string, body: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-1' }, false, ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, enc.encode(body));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

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
  const providedSig = url.searchParams.get('signature') ?? '';

  const rawBody = await req.text();
  let payload: Record<string, unknown> = {};
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ error: 'invalid_json' }, 400);
  }

  let signatureOk = false;
  if (KIWIFY_TOKEN !== '' && providedSig !== '') {
    try {
      signatureOk = (await hmacSha1Hex(KIWIFY_TOKEN, rawBody)) === providedSig.toLowerCase();
    } catch {
      signatureOk = false;
    }
  }

  const eventType = (payload['webhook_event_type'] as string | undefined) ?? null;
  const orderId   = (payload['order_id'] as string | undefined) ?? null;
  const product   = (payload['Product'] as Record<string, unknown> | undefined) ?? {};
  const productId = (product['product_id'] as string | undefined) ?? null;

  const sourceIp =
    req.headers.get('cf-connecting-ip') ??
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ??
    null;

  // 1. Grava raw (audit log — nunca perde dados, mesmo com assinatura errada)
  let rawId: string;
  try {
    const inserted = await pgrstInsert('kiwify_events_raw', 'marketing', {
      event_type:         eventType,
      kiwify_order_id:    orderId,
      product_id:         productId,
      signature_ok:       signatureOk,
      signature_provided: providedSig
        ? `${providedSig.slice(0, 4)}…(${providedSig.length})`
        : null,
      payload,
      source_ip:          sourceIp,
    });
    rawId = inserted[0]?.id;
    if (!rawId) throw new Error('no_id_returned_from_insert');
  } catch (e) {
    console.error('[kiwify-webhook] raw insert failed:', e);
    return json({ error: 'storage_failed', detail: String(e) }, 500);
  }

  // 2. Fail-closed: só processa com assinatura válida
  if (!signatureOk) {
    const reason = KIWIFY_TOKEN === '' ? 'token_not_configured' : 'invalid_signature';
    if (KIWIFY_TOKEN === '') {
      console.error('[kiwify-webhook] KIWIFY_WEBHOOK_TOKEN ausente — modo fail-closed, evento não processado');
    }
    return json({ ok: false, reason, raw_id: rawId }, 200);
  }

  // 3. Dispara ingest síncrono
  try {
    const result = await rpc('marketing_ingest_kiwify_event', { p_raw_id: rawId });
    return json({ ok: true, raw_id: rawId, result }, 200);
  } catch (e) {
    console.error('[kiwify-webhook] ingest RPC failed:', e);
    return json({ ok: true, raw_id: rawId, ingest_error: String(e) }, 200);
  }
});
