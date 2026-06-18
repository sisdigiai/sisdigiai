// ============================================================
// Edge Function: mercadopago-webhook
// ============================================================
// Recebe notificações do Mercado Pago (Webhooks/IPN). Valida a
// assinatura (header x-signature, HMAC-SHA256 com MP_WEBHOOK_SECRET),
// busca o detalhe do recurso na MP API (Bearer MP_ACCESS_TOKEN) e
// chama public.billing_ingest_mp_event(payload, topic, id, sig_ok).
//
// Sem deps externas — chama PostgREST direto via fetch.
// verify_jwt = false: a função se autentica pela assinatura do MP.
//
// Secrets (Supabase → Edge Functions → Secrets):
//   MP_ACCESS_TOKEN  = access token da conta MP (server-side)
//   MP_WEBHOOK_SECRET = "assinatura secreta" da config de webhooks no painel MP
//   (SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são auto-injetados)
//
// URL pública:
//   https://hswyopqvnolqpmprqvzh.supabase.co/functions/v1/mercadopago-webhook
// ============================================================

// @ts-ignore — Deno global
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// @ts-ignore
const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
// @ts-ignore
const MP_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';

const PGRST = `${SUPABASE_URL}/rest/v1`;

const json = (body: unknown, status = 200): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

async function rpc(fn: string, args: Record<string, unknown>) {
  const res = await fetch(`${PGRST}/rpc/${fn}`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(args),
  });
  if (!res.ok) {
    const t = await res.text();
    console.error(`rpc ${fn} ${res.status}: ${t}`);
  }
  return res.ok;
}

// Valida x-signature do MP. Retorna true/false, ou null se o secret não
// estiver configurado (não bloqueia — marca como não-verificado).
async function validateSignature(req: Request, dataId: string): Promise<boolean | null> {
  if (!MP_SECRET) return null;
  const sig = req.headers.get('x-signature') ?? '';
  const reqId = req.headers.get('x-request-id') ?? '';
  const parts: Record<string, string> = {};
  for (const p of sig.split(',')) {
    const [k, v] = p.split('=');
    if (k && v) parts[k.trim()] = v.trim();
  }
  const ts = parts['ts'];
  const v1 = parts['v1'];
  if (!ts || !v1) return false;
  const manifest = `id:${dataId};request-id:${reqId};ts:${ts};`;
  const key = await crypto.subtle.importKey(
    'raw', new TextEncoder().encode(MP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'],
  );
  const mac = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(manifest));
  const hex = [...new Uint8Array(mac)].map((b) => b.toString(16).padStart(2, '0')).join('');
  return hex === v1;
}

// Busca o detalhe do recurso na API do MP (precisa do access token).
async function fetchResource(topic: string, id: string): Promise<unknown | null> {
  if (!MP_TOKEN || !id) return null;
  let url: string | null = null;
  if (topic.includes('payment')) url = `https://api.mercadopago.com/v1/payments/${id}`;
  else if (topic.includes('preapproval') || topic.includes('subscription')) url = `https://api.mercadopago.com/preapproval/${id}`;
  if (!url) return null;
  try {
    const r = await fetch(url, { headers: { Authorization: `Bearer ${MP_TOKEN}` } });
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// @ts-ignore — Deno global
Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json({ ok: true, msg: 'mercadopago-webhook up' });

  const url = new URL(req.url);
  let body: any = {};
  try { body = await req.json(); } catch { /* notificação pode vir vazia */ }

  const topic = String(body.type || body.topic || url.searchParams.get('topic') || url.searchParams.get('type') || '');
  const dataId = String((body.data && body.data.id) || body.id || url.searchParams.get('id') || url.searchParams.get('data.id') || '');

  let sigOk: boolean | null = null;
  try { sigOk = await validateSignature(req, dataId); } catch { sigOk = false; }

  if (sigOk === false) {
    await rpc('billing_ingest_mp_event', { p_payload: body, p_topic: topic, p_resource_id: dataId, p_signature_ok: false });
    return json({ ok: false, reason: 'bad signature' }, 401);
  }

  const detail = await fetchResource(topic, dataId);
  const payload = detail ?? body;
  await rpc('billing_ingest_mp_event', { p_payload: payload, p_topic: topic, p_resource_id: dataId, p_signature_ok: sigOk });

  return json({ ok: true });
});
