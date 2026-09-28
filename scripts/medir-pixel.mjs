// O que cada site público está realmente carregando de medição (migration 158).
//
// POR QUE EXISTE: o inventário diz qual pixel é de qual produto, mas ninguém sabia se ele dispara. Pixel
// declarado e não instalado é pior que nenhum — a pessoa acha que está medindo e decide com tela vazia.
//
// COMO MEDE: baixa o HTML publicado e os primeiros bundles JS referenciados, e procura a assinatura de cada
// medidor (fbevents/fbq, analytics.tiktok/ttq, G-… ou GTM-…, clarity.ms). Não executa nada da página e não
// entra em área logada: só lê o que qualquer visitante recebe.
//
// LIMITE HONESTO: achar o ID no bundle prova que o código está publicado, não que o evento chegou à Meta —
// isso só o Events Manager responde. E site que injeta o pixel por tag manager remoto não aparece aqui.
//
// Uso:  node scripts/medir-pixel.mjs          → mede todos os sites ativos do inventário e grava
//       node scripts/medir-pixel.mjs --dry    → mede e só mostra
import fs from 'node:fs';

const DRY = process.argv.includes('--dry');
const REF = 'hswyopqvnolqpmprqvzh';
const PAT = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .replace(/^﻿/, '').split(/\r?\n/).find((l) => l.startsWith('SUPABASE_TOKEN='))
  ?.slice('SUPABASE_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
if (!PAT) { console.error('falta SUPABASE_TOKEN no digiai/.env'); process.exit(2); }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) { console.error(t); process.exit(1); }
  return JSON.parse(t);
}

async function baixar(url, ms = 20000) {
  const ctrl = AbortSignal.timeout(ms);
  try {
    const r = await fetch(url, { redirect: 'follow', signal: ctrl, headers: { 'User-Agent': 'digiai-medidor/1.0 (painel interno)' } });
    return { code: r.status, texto: r.status < 400 ? await r.text() : '' };
  } catch {
    return { code: 0, texto: '' };
  }
}

async function medir(url) {
  const base = url.replace(/\/$/, '');
  const pagina = await baixar(base);
  let todo = pagina.texto;
  const scripts = [...new Set([...todo.matchAll(/(?:\/assets\/|\/_next\/static\/[^"']*?\/|\/_astro\/)[^"']*?\.js/g)].map((m) => m[0]))].slice(0, 3);
  for (const s of scripts) todo += (await baixar(base + s, 25000)).texto;

  const meta = /fbevents\.js|fbq\s*\(/.test(todo);
  const id = todo.match(/\b(1[0-9]{14,15})\b/)?.[1] ?? null;
  return {
    url,
    http_code: pagina.code,
    meta_pixel_id: meta ? id : null,
    tiktok: /analytics\.tiktok\.com|ttq\.load/.test(todo),
    ga_gtm: todo.match(/\b(G-[A-Z0-9]{8,12}|GTM-[A-Z0-9]{5,8})\b/)?.[1] ?? null,
    clarity: /clarity\.ms/.test(todo),
    obs: scripts.length ? `html + ${scripts.length} bundle(s)` : 'só html',
  };
}

const sites = await sql(`select valor url from company.digital_assets
  where deleted_at is null and categoria = 'site' and status = 'ativo' order by valor`);

const medidos = [];
for (const s of sites) {
  const m = await medir(s.url);
  medidos.push(m);
  console.log(`${String(m.http_code).padEnd(3)} ${m.url}  meta:${m.meta_pixel_id ?? 'não'}  tiktok:${m.tiktok ? 'sim' : 'não'}  ga:${m.ga_gtm ?? 'não'}`);
}

if (DRY) { console.log(`\n--dry: ${medidos.length} medidos, nada gravado.`); process.exit(0); }

const json = JSON.stringify(medidos).replace(/'/g, "''");
await sql(`select ops.fn_registrar_pixel_medicao('${json}'::jsonb)`);
console.log(`\n${medidos.length} medições gravadas em ops.pixel_medicao.`);
