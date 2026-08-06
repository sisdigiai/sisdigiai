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

const PROJETOS = [
  ['nipo-school', 'tqlwkgiytdikumtcnizf', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRxbHdrZ2l5dGRpa3VtdGNuaXpmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE1NTQwOTYsImV4cCI6MjA4NzEzMDA5Nn0.NnXt7cFAj5mKoYvmAy7HfFye-mMse1f4Eahk9b9gcGE'],
  ['qual-foto', 'zlfyxndjpdwbbxuypova', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpsZnl4bmRqcGR3YmJ4dXlwb3ZhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjgzNTQzMDEsImV4cCI6MjA4MzkzMDMwMX0.2YRtjRaTQjcFyv6wE_1nBVjuP389SjW3G3pDvbouSTc'],
  ['easy-idiomas', 'nrrkcfxcqnvvhhamhrqf', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5ycmtjZnhjcW52dmhoYW1ocnFmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwNzU0NzgsImV4cCI6MjA5NDY1MTQ3OH0.Om9HO-1RMc55d2U7BeosTCYh3L1gRd4CPhG1MiDhjI8'],
  ['digiai', 'hswyopqvnolqpmprqvzh', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhzd3lvcHF2bm9scXBtcHJxdnpoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY0MzY0NzMsImV4cCI6MjA5MjAxMjQ3M30.ZCtoaMGvko1QHVFs23gC8nDpfTG-xgieaRsIPNAT21s'],
  ['clearix', 'mhgbuplnxtfgipbemchb', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1oZ2J1cGxueHRmZ2lwYmVtY2hiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQwODAwMDQsImV4cCI6MjA1OTY1NjAwNH0.478ltLNyzDefQFZjnMHxuM2Qk8Aw8lsIpIrdb-h7rl0'],
  ['nexus', 'tkbhhbzhlqsgcwljeesg', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRrYmhoYnpobHFzZ2N3bGplZXNnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM4NzMzNjcsImV4cCI6MjA4OTQ0OTM2N30.mzHTjV8ilOtNV6ydZuEWI11pHVuw3G5yLqlHW4bGrX4'],
  ['polapetit', 'cvqoqnjitqvuopqadfbh', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN2cW9xbmppdHF2dW9wcWFkZmJoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzUzMzE1ODEsImV4cCI6MjA5MDkwNzU4MX0.YQxZ-My4ap4QB-KMK8U3MgvDsWXNPPexYx0QfFYptME'],
  ['limelight', 'gfdpvasbrxwulvpvyfvr', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZHB2YXNicnh3dWx2cHZ5ZnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzMwNzYsImV4cCI6MjEwMDE0OTA3Nn0.Gr8I2e9Ot2d6fOq0eBp43yDWDxAohkzAcoa0dJ9_zOk'],
  ['pulso', 'nlcisbfdiokmipyihtuz', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sY2lzYmZkaW9rbWlweWlodHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODk0OTksImV4cCI6MjA3OTE2NTQ5OX0.-Cfzv9ebOYB8I93zNLghWTszawJk4G3rXwiTTY9PpOI'],
  ['gj-pessoal', 'xfkcqrlovqbcriiksxng', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhma2NxcmxvdnFiY3JpaWtzeG5nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM5NzYwODksImV4cCI6MjA5OTU1MjA4OX0.uTAm5HVsYX2M7wJ4NXUtwfPtK5DwPw7oAJ2Hzkwlk2w'],
];

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
