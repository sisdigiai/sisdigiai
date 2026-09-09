// Edge Function: mp-sync
// ============================================================
// ADOTADA DO DEPLOY em 2026-09-09: esta função rodava em produção (v12, ACTIVE)
// SEM FONTE EM REPOSITÓRIO NENHUM. Corpo recuperado pela Management API
// (GET /v1/projects/{ref}/functions/mp-sync/body) e versionado aqui.
// O original intacto ficou em `_original_deploy_v12.ts` para diff — a única
// diferença é a trava de papel abaixo.
//
// POR QUE A TRAVA ENTROU NO MESMO PASSE DA ADOÇÃO:
// a função escreve em billing com SERVICE_ROLE e o único portão dela era
// `verify_jwt = true`, que prova SESSÃO, não PAPEL. Qualquer conta autenticada
// disparava a ingestão — furando a trava que a migration 092 pôs em billing no
// dia anterior. Versionar primeiro e consertar depois deixaria no repositório,
// assinado, um código que já se sabia furado.
// ============================================================
// @ts-ignore
const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
// @ts-ignore
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
// @ts-ignore
const MP_TOKEN = Deno.env.get('MP_ACCESS_TOKEN') ?? '';
// @ts-ignore
const MP_SECRET = Deno.env.get('MP_WEBHOOK_SECRET') ?? '';
// @ts-ignore
const ANON = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
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
  // Trava de papel (09/09/2026). `verify_jwt` prova que HÁ sessão, não QUEM é:
  // sem isto, qualquer conta autenticada disparava ingestão em billing com
  // service_role. Pergunta ao banco, nunca a uma constante (R-037), e usa a
  // MESMA função que governa o módulo Cobrança no front — trava mais apertada
  // que a tela recria o desalinhamento que a auditoria apontou.
  // Erro na checagem = NEGA: portão que abre no erro não é portão.
  let ehAdmin = false;
  try {
    const r = await fetch(`${PGRST}/rpc/is_admin`, {
      method: 'POST',
      headers: {
        apikey: ANON,
        Authorization: req.headers.get('authorization') ?? '',
        'Content-Type': 'application/json'
      },
      body: '{}'
    });
    ehAdmin = r.ok && await r.json() === true;
  } catch (e) {
    console.error('mp-sync: checagem de papel falhou', e);
  }
  if (!ehAdmin) return json({
    ok: false,
    reason: 'Acesso negado: sincronizar cobrança exige papel admin ou superior'
  }, 403);
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