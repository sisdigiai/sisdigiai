// Injeta a lista de projetos (nome, ref, anon key pública) no Worker.
// Fonte das keys: a função keep-alive atual + .env dos apps limelight/pulso.
// Gera worker-sentinela/dist.js — é ESSE arquivo que vai pro Cloudflare.
import { readFileSync, writeFileSync } from 'node:fs';

const base = readFileSync(new URL('./index.js', import.meta.url), 'utf8');
const keepalive = readFileSync(new URL('../netlify/functions/supabase-keepalive.mjs', import.meta.url), 'utf8');

const pares = [...keepalive.matchAll(/\['([a-z-]+)',\s*'([a-z]{20})',\s*'(eyJ[^']+)'\]/g)]
  .map((m) => [m[1], m[2], m[3]]);

function anonDe(caminho, chave) {
  const re = new RegExp(`^${chave}="?([^"\\r\\n]+)`, 'm');
  return re.exec(readFileSync(caminho, 'utf8'))?.[1] ?? '';
}

pares.push(['limelight', 'gfdpvasbrxwulvpvyfvr', anonDe('D:/projetos/limelight_studio/.env', 'VITE_SUPABASE_ANON_KEY')]);
let pulso = '';
for (const f of ['D:/projetos/pulso_control/.env', 'D:/projetos/pulso_control/.env.local']) {
  try { pulso = anonDe(f, 'NEXT_PUBLIC_SUPABASE_ANON_KEY') || pulso; } catch { /* arquivo pode não existir */ }
  if (pulso) break;
}
pares.push(['pulso', 'nlcisbfdiokmipyihtuz', pulso]);

const faltando = pares.filter((p) => !p[2].startsWith('eyJ')).map((p) => p[0]);
if (faltando.length) {
  console.error('anon key ausente:', faltando.join(', '));
  process.exit(1);
}

const lista = '\n' + pares.map((p) => `  ['${p[0]}', '${p[1]}', '${p[2]}'],`).join('\n') + '\n';
writeFileSync(new URL('./dist.js', import.meta.url), base.replace('/*__PROJETOS__*/', lista));
console.log(`dist.js gerado · ${pares.length} projetos: ${pares.map((p) => p[0]).join(', ')}`);
