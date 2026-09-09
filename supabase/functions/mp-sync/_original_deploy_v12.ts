// Edge Function: mp-sync
// ============================================================
// Liga a Cobrança ao Mercado Pago via API (pull), complementando o
// webhook (push). GET = status da conexão (sem expor valores).
// POST = busca preapprovals (assinaturas) e payments recentes na MP
// API e ingere cada um via public.billing_ingest_mp_event — mesma
// trilha do webhook, zero lógica duplicada.
// Secrets: MP_ACCESS_TOKEN (+ SUPABASE_* auto). verify_jwt = true.
// ============================================================
// @ts-ignore
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// @ts-ignore
const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
// @ts-ignore
const MP_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';
const PGRST = `${SUPABASE_URL}/rest/v1`;
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
const json = (body, status = 200)=>new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json',
      ...CORS
    }
  });
async function ingest(payload, topic, id) {
  const res = await fetch(`${PGRST}/rpc/billing_ingest_mp_event`, {
    method: 'POST',
    headers: {
      'apikey': SERVICE_ROLE,
      'Authorization': `Bearer ${SERVICE_ROLE}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      p_payload: payload,
      p_topic: topic,
      p_resource_id: id,
      p_signature_ok: true
    })
  });
  if (!res.ok) console.error(`ingest ${topic}/${id} ${res.status}: ${await res.text()}`);
  return res.ok;
}
async function mp(path) {
  try {
    const r = await fetch(`https://api.mercadopago.com${path}`, {
      headers: {
        Authorization: `Bearer ${MP_TOKEN}`
      }
    });
    if (!r.ok) {
      console.error(`MP ${path} -> ${r.status}: ${await r.text()}`);
      return null;
    }
    return await r.json();
  } catch (e) {
    console.error(`MP ${path} fetch fail`, e);
    return null;
  }
}
// @ts-ignore
Deno.serve(async (req)=>{
  if (req.method === 'OPTIONS') return new Response('ok', {
    headers: CORS
  });
  if (req.method === 'GET') {
    return json({
      ok: true,
      has_access_token: !!MP_TOKEN,
      has_webhook_secret: !!MP_SECRET,
      webhook_url: `${SUPABASE_URL}/functions/v1/mercadopago-webhook`
    });
  }
  if (req.method !== 'POST') return json({
    ok: false,
    reason: 'method'
  }, 405);
  if (!MP_TOKEN) return json({
    ok: false,
    reason: 'MP_ACCESS_TOKEN não configurado nos secrets'
  }, 400);
  let preapprovals = 0;
  let payments = 0;
  const erros = [];
  // Assinaturas (preapproval) — paginação simples até 500
  for(let offset = 0; offset < 500; offset += 100){
    const page = await mp(`/preapproval/search?limit=100&offset=${offset}`);
    if (!page) {
      if (offset === 0) erros.push('preapproval/search falhou');
      break;
    }
    const results = page.results ?? [];
    for (const r of results){
      if (r?.id && await ingest(r, 'preapproval', String(r.id))) preapprovals++;
    }
    if (results.length < 100) break;
  }
  // Pagamentos dos últimos 90 dias
  const begin = new Date(Date.now() - 90 * 86400000).toISOString();
  const end = new Date().toISOString();
  for(let offset = 0; offset < 500; offset += 100){
    const page = await mp(`/v1/payments/search?sort=date_created&criteria=desc&range=date_created&begin_date=${encodeURIComponent(begin)}&end_date=${encodeURIComponent(end)}&limit=100&offset=${offset}`);
    if (!page) {
      if (offset === 0) erros.push('payments/search falhou');
      break;
    }
    const results = page.results ?? [];
    for (const r of results){
      if (r?.id && await ingest(r, 'payment', String(r.id))) payments++;
    }
    if (results.length < 100) break;
  }
  return json({
    ok: erros.length === 0,
    preapprovals,
    payments,
    erros
  });
});