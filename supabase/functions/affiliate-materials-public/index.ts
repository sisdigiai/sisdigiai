/**
 * affiliate-materials-public
 *
 * API pública (sem auth) que serve os materiais de afiliado ATIVOS pra Central de
 * Materiais da landing OSI. Desacopla a landing do banco interno: a landing só
 * conhece esta URL, não o Supabase DIGIAI.
 *
 * GET  /            → { materials: [...] } (somente is_active, campos públicos)
 * POST /  {action:'download', id} → incrementa downloads_count (rastreio server-side)
 *
 * Usa SERVICE_ROLE (injetado pelo Supabase) — por isso NÃO expõe anon key na landing.
 */
import { createClient } from 'jsr:@supabase/supabase-js@2';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });

  const supabase = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  try {
    if (req.method === 'POST') {
      const { action, id } = await req.json().catch(() => ({}));
      if (action !== 'download' || !id) return json({ error: 'bad_request' }, 400);

      const { data: cur, error: readErr } = await supabase
        .schema('marketing')
        .from('affiliate_materials')
        .select('downloads_count')
        .eq('id', id)
        .eq('is_active', true)
        .is('deleted_at', null)
        .single();
      if (readErr || !cur) return json({ error: 'not_found' }, 404);

      const { error: updErr } = await supabase
        .schema('marketing')
        .from('affiliate_materials')
        .update({ downloads_count: (cur.downloads_count ?? 0) + 1 })
        .eq('id', id);
      if (updErr) throw updErr;

      return json({ ok: true });
    }

    // GET → lista materiais ativos (campos públicos)
    const { data, error } = await supabase
      .from('v_marketing_affiliate_materials')
      .select(
        'id, type, title, description, copy_short, copy_medium, copy_long, art_urls, platforms, preview_url, downloads_count, pillar_code, pillar_name, pillar_color',
      )
      .eq('is_active', true)
      .is('deleted_at', null)
      .order('type', { ascending: true });
    if (error) throw error;

    return json({ materials: data ?? [], generated_at: new Date().toISOString() });
  } catch (e) {
    return json({ error: String(e instanceof Error ? e.message : e) }, 500);
  }
});
