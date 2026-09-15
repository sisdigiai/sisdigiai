/**
 * lead-capture
 *
 * Sink first-party de leads das landings DIGIAI (OSI + clearix-site). O form POSTa
 * aqui (sem chave Supabase) e gravamos em marketing.landing_leads via
 * fn_capture_landing_lead (SECURITY DEFINER) usando SERVICE_ROLE — mesmo padrão
 * keyless do events-ingest.
 *
 * POST / { product?, name, email?, whatsapp?, source_url?, session_id?, utm_*?,
 *          consent_text?, notes?, website? (honeypot), commercial_lead_id? }
 *   → { ok, lead_id, commercial_lead_id? } | { error }
 *
 * commercial_lead_id (migration 128, despacho de 15/09): o lead_id do link da prospecção.
 * Se vier no body, a resposta traz SEMPRE a chave: o id quando ele existe na base (e o pedido
 * foi ligado a ele), ou null. Nunca cria lead a partir de id vindo da URL.
 *
 * Anti-bot: campo honeypot 'website' (humano não vê; bot preenche → descarta em silêncio).
 * R-013/LGPD: consentimento registrado (consent_text + user_agent); dados mínimos.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'content-type',
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

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

    // honeypot: bots preenchem; responde ok sem gravar
    if (typeof body?.website === 'string' && body.website.trim() !== '') {
      return json({ ok: true });
    }

    const email = typeof body?.email === 'string' ? body.email.slice(0, 200) : '';
    const whatsapp = typeof body?.whatsapp === 'string' ? body.whatsapp.slice(0, 40) : '';
    if (!email.trim() && !whatsapp.trim()) return json({ error: 'sem_contato' }, 400);

    const { data, error } = await supabase.rpc('fn_capture_landing_lead', {
      p_product:      typeof body?.product === 'string' ? body.product.slice(0, 40) : 'osi',
      p_name:         typeof body?.name === 'string' ? body.name.slice(0, 160) : null,
      p_email:        email || null,
      p_whatsapp:     whatsapp || null,
      p_source_url:   typeof body?.source_url === 'string' ? body.source_url.slice(0, 500) : null,
      p_session_id:   typeof body?.session_id === 'string' ? body.session_id.slice(0, 64) : null,
      p_utm_source:   typeof body?.utm_source === 'string' ? body.utm_source.slice(0, 120) : null,
      p_utm_medium:   typeof body?.utm_medium === 'string' ? body.utm_medium.slice(0, 120) : null,
      p_utm_campaign: typeof body?.utm_campaign === 'string' ? body.utm_campaign.slice(0, 120) : null,
      p_utm_content:  typeof body?.utm_content === 'string' ? body.utm_content.slice(0, 120) : null,
      p_utm_term:     typeof body?.utm_term === 'string' ? body.utm_term.slice(0, 120) : null,
      p_consent_text: typeof body?.consent_text === 'string' ? body.consent_text.slice(0, 500) : null,
      p_user_agent:   ua,
      p_notes:        typeof body?.notes === 'string' ? body.notes.slice(0, 2000) : null,
    });

    if (error) {
      const msg = error.message ?? 'erro';
      const known = ['email_invalido', 'whatsapp_invalido', 'lead_sem_identificador'];
      const code = known.find((k) => msg.includes(k)) ?? 'capture_failed';
      return json({ error: code }, code === 'capture_failed' ? 500 : 400);
    }

    if (!('commercial_lead_id' in (body ?? {}))) return json({ ok: true, lead_id: data });

    // O pedido já está gravado: falhar o vínculo não pode derrubar a captura. Devolve null e
    // o site marca o evento como lead_id desconhecido.
    const pedido = typeof body.commercial_lead_id === 'string' ? body.commercial_lead_id.trim() : '';
    let casou: string | null = null;
    if (UUID.test(pedido)) {
      const { data: v, error: ev } = await supabase.rpc('fn_ligar_pedido_ao_lead', {
        p_commercial_lead_id: pedido,
        p_landing_lead_id: data,
        p_utm_source: typeof body?.utm_source === 'string' ? body.utm_source.slice(0, 120) : null,
        p_utm_medium: typeof body?.utm_medium === 'string' ? body.utm_medium.slice(0, 120) : null,
        p_utm_campaign: typeof body?.utm_campaign === 'string' ? body.utm_campaign.slice(0, 120) : null,
      });
      if (ev) console.error('[lead-capture] fn_ligar_pedido_ao_lead', ev.message);
      else casou = (v as string | null) ?? null;
    }
    return json({ ok: true, lead_id: data, commercial_lead_id: casou });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
