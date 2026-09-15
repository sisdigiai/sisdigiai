/**
 * events-ingest
 *
 * Sink first-party de eventos do funil OSI. A landing POSTa aqui (sem chave Supabase)
 * e gravamos em analytics.events_log via fn_log_event (SECURITY DEFINER) usando
 * SERVICE_ROLE — mesmo padrão keyless do affiliate-materials-public.
 *
 * Captura até quem tem ad blocker (nosso endpoint não é alvo de bloqueador, ≠ Meta/TikTok).
 * R-013 (LGPD): só session_id anônimo + UTM + user_agent truncado. ZERO PII.
 *
 * POST / { events: [{ event_code, product?, session_id?, url?, utm_*?, metadata? }] }
 *   → { ok, inserted, errors }
 *
 * Só aceita eventos CLIENT-SIDE: os da landing, o da Calc, os gatilhos do leitor OSI e os da
 * landing do Clearix (migration 127).
 * purchase_approved / first_login_nexus são server-side (webhook Hotmart) e ficam de
 * fora pra evitar spoof de conversão. Todo código aceito aqui precisa de linha em
 * analytics.events_catalog (FK) — os do leitor entram pela migration 124.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

const ALLOWED = new Set([
  'landing_visit', 'click_checkout', 'checkout_started', 'calc_used',
  'reader_gatilho_view', 'reader_gatilho_click',
  'clearix_site_visit', 'clearix_demo_solicitada', 'clearix_whatsapp_click',
]);
// Preview local não mede nada: em 15/09 o preview da landing OSI mandou landing_visit reais com
// url localhost, e todo funil passou a precisar de filtro. Recusar aqui protege todas as landings
// de uma vez, em vez de confiar que cada site lembre do filtro.
const ORIGEM_LOCAL = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?(\/|$)/i;
// Os gatilhos do leitor só valem com o id do gatilho do desenho (g1…g4, e1, e2), vindo
// em utm_content ou em metadata.gatilho. Sem ele o evento não diz QUAL gatilho, e o
// endpoint é público: texto livre aqui vira lixo, ou dado de terceiro, na tabela.
const GATILHOS = new Set(['g1', 'g2', 'g3', 'g4', 'e1', 'e2']);
// Na landing do Clearix, utm_content é o lead_id do link da prospecção (despacho de 15/09 §1).
// Só um uuid entra; qualquer outra coisa vira nulo — o endpoint é público e texto livre ali
// seria dado de terceiro ou lixo colado a um lead que não existe.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_EVENTS = 20;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  if (req.method !== 'POST') return json({ error: 'method_not_allowed' }, 405);

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );
  const ua = (req.headers.get('user-agent') ?? '').slice(0, 300);

  try {
    const body = await req.json().catch(() => ({}));
    const events = Array.isArray(body?.events) ? body.events.slice(0, MAX_EVENTS) : [];
    if (!events.length) return json({ error: 'no_events' }, 400);

    let inserted = 0;
    const errors: string[] = [];

    for (const e of events) {
      const code = String(e?.event_code ?? '');
      if (!ALLOWED.has(code)) { errors.push(`bad_code:${code}`); continue; }
      if (typeof e?.url === 'string' && ORIGEM_LOCAL.test(e.url)) { errors.push('origem_local'); continue; }

      let utmContent = e?.utm_content ? String(e.utm_content).slice(0, 120) : null;
      if (code.startsWith('reader_gatilho_')) {
        const gatilho = String(e?.utm_content ?? e?.metadata?.gatilho ?? '').toLowerCase();
        if (!GATILHOS.has(gatilho)) { errors.push(`bad_gatilho:${gatilho}`); continue; }
        utmContent = gatilho;
      }
      if (code.startsWith('clearix_') && utmContent && !UUID.test(utmContent)) utmContent = null;

      const { error } = await supabase.rpc('fn_log_event', {
        p_event_code: code,
        p_product: e?.product ?? 'osi',
        p_session_id: e?.session_id ? String(e.session_id).slice(0, 64) : null,
        p_url: e?.url ? String(e.url).slice(0, 500) : null,
        p_utm_source: e?.utm_source ? String(e.utm_source).slice(0, 120) : null,
        p_utm_medium: e?.utm_medium ? String(e.utm_medium).slice(0, 120) : null,
        p_utm_campaign: e?.utm_campaign ? String(e.utm_campaign).slice(0, 120) : null,
        p_utm_content: utmContent,
        p_utm_term: e?.utm_term ? String(e.utm_term).slice(0, 120) : null,
        p_metadata: (e?.metadata && typeof e.metadata === 'object') ? e.metadata : {},
        p_user_agent: ua,
      });
      if (error) errors.push(error.message); else inserted++;
    }

    return json({ ok: true, inserted, errors });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
