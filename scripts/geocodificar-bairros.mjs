// Centro de cada bairro que tem ótica sem coordenada (migration 155).
//
// POR QUE EXISTE: a raspagem trouxe 253 óticas sem lat/lng. O dono pediu para não perdê-las no mapa,
// marcadas como aproximadas. Pelo CEP não dá: o serviço público devolve o centro da CIDADE para toda a
// capital (medido em 24/09 — Jardim Capela, Vila Perus e Penha de França vieram no mesmo ponto).
// Pelo bairro dá, e bairro é a granularidade em que se decide raspagem.
//
// FONTE: Nominatim (OpenStreetMap), uso gratuito com regra de 1 consulta por segundo e User-Agent
// identificado — as duas coisas estão respeitadas aqui. Só o nome do lugar sai daqui ("bairro, cidade, UF");
// nada de lead, telefone ou nome de loja.
//
// Uso:  node scripts/geocodificar-bairros.mjs            → busca só o que falta e grava
//       node scripts/geocodificar-bairros.mjs --dry      → só mostra o que buscaria
//
// Idempotente: bairro já gravado não é consultado de novo.
import fs from 'node:fs';

const DRY = process.argv.includes('--dry');
const REF = 'hswyopqvnolqpmprqvzh';
const PAT = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .replace(/^﻿/, '').split(/\r?\n/).find((l) => l.startsWith('SUPABASE_TOKEN='))?.slice('SUPABASE_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
if (!PAT) { console.error('falta SUPABASE_TOKEN no digiai/.env'); process.exit(2); }

async function sql(query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) throw new Error(`${r.status} ${t.slice(0, 300)}`);
  return t ? JSON.parse(t) : null;
}

// Miolo de cada cidade, calculado das óticas que TÊM coordenada. Serve de trava: nome de bairro que também é
// nome de cidade ("Santana", "Pompeia") faz o serviço devolver a cidade homônima, a centenas de km. Medido em
// 24/09: 19 bairros vieram errados assim. Resultado fora da própria cidade é descartado, não corrigido no chute.
const miolo = new Map((await sql(`
  select uf || '|' || cidade chave, avg(lat)::float lat, avg(lng)::float lng
    from public.v_mkt_cobertura_pontos group by 1`)).map((c) => [c.chave, c]));

const kmEntre = (a, b) => {
  const R = 6371, rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
};
const LIMITE_KM = 30;

const pendentes = await sql(`
  select uf, cidade, bairro, oticas_sem_coordenada
    from public.v_ops_cobertura_aproximada
   where lat is null and bairro <> '—'
   order by oticas_sem_coordenada desc`);

console.log(`${pendentes.length} bairro(s) sem centro · ${pendentes.reduce((a, p) => a + p.oticas_sem_coordenada, 0)} ótica(s) esperando`);
if (DRY) { console.log(pendentes.slice(0, 10).map((p) => `${p.bairro} · ${p.cidade}/${p.uf} (${p.oticas_sem_coordenada})`).join('\n')); process.exit(0); }

// A raspagem às vezes guardou complemento de endereço no campo do bairro
// ("Loja 320 - Lauzane Paulista", "13º Andar - Sala 1309 - Tatuapé", "anexo 800 - Guaianases").
// O bairro de verdade é o último pedaço depois do traço. Limpar aqui não altera o dado do MKT:
// serve só para achar o centro; o nome exibido continua o que veio da fonte.
const soOBairro = (b) => {
  const partes = String(b).split(/\s+-\s+/);
  const ultimo = partes[partes.length - 1].trim();
  return ultimo.replace(/^(loja|sala|box|anexo|quiosque|piso|andar)\s*\d*[ºo°]?\s*/i, '').trim() || b;
};

const achados = [];
const semResultado = [];
const foraDaCidade = [];
for (const [i, p] of pendentes.entries()) {
  const q = `${soOBairro(p.bairro)}, ${p.cidade}, ${p.uf}, Brasil`;
  try {
    const r = await fetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&countrycodes=br&q=${encodeURIComponent(q)}`, {
      headers: { 'User-Agent': 'digiai-app/1.0 (painel interno DIGIAI; contato@digiai.app.br)' },
    });
    const d = await r.json();
    const achado = Array.isArray(d) && d[0] ? { lat: Number(d[0].lat), lng: Number(d[0].lon) } : null;
    const centro = miolo.get(`${p.uf}|${p.cidade}`);
    if (!achado) semResultado.push(q);
    else if (centro && kmEntre(centro, achado) > LIMITE_KM) {
      foraDaCidade.push(`${q} -> ${kmEntre(centro, achado).toFixed(0)} km do miolo da cidade (descartado)`);
    } else {
      achados.push({ uf: p.uf, cidade: p.cidade, bairro: p.bairro, lat: achado.lat, lng: achado.lng });
    }
  } catch (e) {
    semResultado.push(`${q} (erro: ${e?.name ?? e})`);
  }
  if (i % 20 === 19) console.log(`  ${i + 1}/${pendentes.length}…`);
  await new Promise((s) => setTimeout(s, 1100));   // regra de uso do Nominatim: 1 por segundo
}

if (achados.length) {
  const lote = JSON.stringify(achados).replace(/'/g, "''");
  await sql(`select ops.fn_registrar_bairro_coordenada('${lote}'::jsonb)`);
}
console.log(`gravados: ${achados.length} | sem resultado: ${semResultado.length} | descartados por cair fora da cidade: ${foraDaCidade.length}`);
if (foraDaCidade.length) {
  console.log('fora da cidade (nao entram no mapa):');
  for (const f of foraDaCidade) console.log('  ' + f);
}
