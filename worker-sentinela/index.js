/**
 * DIGIAI Sentinela — Worker de vigilância (Cloudflare, cron).
 *
 * Por que existe: em 2026-07-31 a org do Supabase foi pausada por fatura e todo o
 * ecossistema caiu — sem ninguém ser avisado. O alarme que existia morava DENTRO da
 * infra vigiada (função no Netlify + painel que lê o banco pausado), então emudeceu
 * junto. Este Worker vive fora de tudo que vigia e grita no Telegram.
 *
 * Faz 3 coisas por execução:
 *   1. PING REST de cada projeto Supabase — universal (pega pausa/queda em qualquer org)
 *      e o mesmo ping serve de KEEP-ALIVE do free tier (substitui a função do Netlify)
 *   2. STATUS via Management API onde o token alcança — pega PAUSING/INACTIVE antes de cair
 *   3. Alerta no Telegram se algo estiver ruim; batimento semanal (segunda) se tudo ok,
 *      porque silêncio sozinho é ambíguo (tudo bem? ou o vigia morreu?)
 *
 * Secrets: SUPABASE_TOKEN · SUPABASE_TOKEN_PULSO · TELEGRAM_BOT_TOKEN · TELEGRAM_CHAT_ID
 * Anon keys ficam inline: são públicas por design (vivem no bundle de cada app).
 */

const PROJETOS = [/*__PROJETOS__*/];

async function pingRest([nome, ref, key]) {
  try {
    const r = await fetch(`https://${ref}.supabase.co/rest/v1/`, {
      headers: { apikey: key },
      signal: AbortSignal.timeout(15000),
    });
    // 200/401/404 = servidor de pé (é o que importa aqui); 503 = pausado
    return { nome, ref, http: r.status, vivo: [200, 401, 404].includes(r.status) };
  } catch (e) {
    return { nome, ref, http: 0, vivo: false, erro: String(e && e.name ? e.name : e) };
  }
}

async function statusOrg(token) {
  if (!token) return [];
  try {
    const r = await fetch('https://api.supabase.com/v1/projects', {
      headers: { Authorization: `Bearer ${token}` },
      signal: AbortSignal.timeout(15000),
    });
    if (!r.ok) return [];
    const ps = await r.json();
    return Array.isArray(ps) ? ps.map((p) => ({ ref: p.id, nome: p.name, status: p.status })) : [];
  } catch {
    return [];
  }
}

async function avisar(env, texto) {
  if (!env.TELEGRAM_BOT_TOKEN || !env.TELEGRAM_CHAT_ID) return { enviado: false, motivo: 'sem_credencial' };
  const r = await fetch(`https://api.telegram.org/bot${env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: env.TELEGRAM_CHAT_ID,
      text: texto,
      parse_mode: 'HTML',
      disable_web_page_preview: true,
    }),
  });
  return { enviado: r.ok, http: r.status };
}

async function rodar(env, origem) {
  const pings = await Promise.all(PROJETOS.map(pingRest));
  const [orgA, orgB] = await Promise.all([statusOrg(env.SUPABASE_TOKEN), statusOrg(env.SUPABASE_TOKEN_PULSO)]);
  const porRef = Object.fromEntries([...orgA, ...orgB].map((p) => [p.ref, p.status]));

  const problemas = [];
  for (const p of pings) {
    const st = porRef[p.ref];
    if (!p.vivo) problemas.push(`🔴 <b>${p.nome}</b> — sem resposta (HTTP ${p.http}${st ? `, ${st}` : ''})`);
    else if (st && st !== 'ACTIVE_HEALTHY') problemas.push(`🟠 <b>${p.nome}</b> — status ${st}`);
  }

  const agora = new Date();
  const hoje = agora.toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  const segunda = agora.getUTCDay() === 1;

  let aviso = null;
  if (problemas.length) {
    aviso = await avisar(env, [
      `🚨 <b>DIGIAI Sentinela</b> — ${hoje}`,
      '',
      ...problemas,
      '',
      'Runbook: <code>Cockpit/runbooks/billing-servicos-saas.md</code>',
      'Serviços e navegadores: app.digiai.app.br/#/financeiro',
    ].join('\n'));
  } else if (segunda && origem === 'cron') {
    aviso = await avisar(env, `✅ <b>Sentinela viva</b> — ${hoje}\n${pings.length} projetos OK, nada a reportar.`);
  }

  return { origem, quando: agora.toISOString(), projetos: pings.length, problemas, aviso };
}

export default {
  async scheduled(event, env) {
    await rodar(env, 'cron');
  },
  async fetch(request, env) {
    const url = new URL(request.url);
    const r = await rodar(env, url.searchParams.get('teste') ? 'teste' : 'manual');
    return new Response(JSON.stringify(r, null, 2), { headers: { 'Content-Type': 'application/json' } });
  },
};
