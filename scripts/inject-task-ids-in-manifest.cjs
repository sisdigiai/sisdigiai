#!/usr/bin/env node
/**
 * Injetar task_ids do Supabase no manifest do produto.
 *
 * Uso: node scripts/inject-task-ids-in-manifest.js
 *
 * O script busca todas as tarefas da Fase 1 do Roadmap (Track A — Academy)
 * e injeta o task_id como comentário HTML ao lado de cada checkbox no manifest.
 *
 * Match é por título exato (com fallback fuzzy). Se não encontrar, registra aviso.
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

// ========== CONFIG ==========
const PROJECT_REF = 'hswyopqvnolqpmprqvzh';
const MANIFEST_PATH = path.resolve(__dirname, '../../diferentes/nexus/academy-assets/produtos/vendas-em-oticas-na-pratica/manifest.md');
const PHASE_NUMBER = 1; // Fase 1 do Roadmap (Ramen Profitability / Academy)
const TRACK = 'A';

// PAT precisa estar em env ou no .mcp.json
function readPAT() {
  const envPat = process.env.SUPABASE_PAT;
  if (envPat) return envPat;
  try {
    const mcp = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../.mcp.json'), 'utf8'));
    const server = mcp?.mcpServers?.['supabase-digiai-app'];
    if (server?.env?.SUPABASE_ACCESS_TOKEN) return server.env.SUPABASE_ACCESS_TOKEN;
  } catch {}
  throw new Error('PAT não encontrado. Defina SUPABASE_PAT ou configure .mcp.json');
}

// ========== QUERY HELPER ==========
function querySQL(sql) {
  const pat = readPAT();
  const data = JSON.stringify({ query: sql });
  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.supabase.com',
      path: `/v1/projects/${PROJECT_REF}/database/query`,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${pat}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
      },
    }, (res) => {
      let body = '';
      res.on('data', c => body += c);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          try { resolve(JSON.parse(body)); } catch { resolve([]); }
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${body.slice(0, 300)}`));
        }
      });
    });
    req.on('error', reject);
    req.write(data); req.end();
  });
}

// ========== MATCH TITLES ==========
function normalize(s) {
  return String(s || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[\[\]()]/g, ' ')
    .replace(/[^a-z0-9 ]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bestMatch(manifestLine, tasks) {
  const targetNorm = normalize(manifestLine);
  // exact substring match first
  let exact = tasks.find(t => {
    const titleNorm = normalize(t.title);
    // remove prefix [Academy] para bater com linhas do manifest
    const cleanTitle = titleNorm.replace(/^academy /, '');
    return targetNorm.includes(cleanTitle) || cleanTitle.includes(targetNorm.replace(/^academy /, ''));
  });
  return exact || null;
}

// ========== MAIN ==========
(async () => {
  console.log('📥 Lendo tarefas da Fase', PHASE_NUMBER, 'Track', TRACK, '...');
  const tasks = await querySQL(
    `SELECT id, title, display_order FROM ops.roadmap_tasks
     WHERE phase_number = ${PHASE_NUMBER} AND track = '${TRACK}' AND deleted_at IS NULL
     ORDER BY display_order`
  );
  console.log(`   ${tasks.length} tarefas encontradas`);

  console.log('📖 Lendo manifest:', MANIFEST_PATH);
  if (!fs.existsSync(MANIFEST_PATH)) {
    console.error('❌ Manifest não encontrado');
    process.exit(1);
  }
  let content = fs.readFileSync(MANIFEST_PATH, 'utf8');

  // Padrão de checkbox no manifest: "- [ ] texto" ou "- [x] texto"
  // Injetar <!-- task_id=uuid --> no final se ainda não tem
  const lines = content.split('\n');
  let injected = 0;
  let matched = 0;
  let unmatched = [];

  const out = lines.map((line) => {
    const m = line.match(/^(\s*)-\s*\[([ x])\]\s*(.+)$/);
    if (!m) return line;
    const [, indent, checked, text] = m;

    // já tem task_id?
    if (/<!--\s*task_id=/.test(line)) return line;

    // tenta match
    const match = bestMatch(text, tasks);
    if (!match) {
      unmatched.push(text.trim());
      return line;
    }
    matched++;
    injected++;
    return `${indent}- [${checked}] ${text.trim()} <!-- task_id=${match.id} -->`;
  });

  const newContent = out.join('\n');
  fs.writeFileSync(MANIFEST_PATH, newContent, 'utf8');

  console.log(`✅ Matched: ${matched} | Injected: ${injected}`);
  if (unmatched.length > 0) {
    console.log(`⚠️  ${unmatched.length} linhas sem match (podem não ser tarefas da Fase 1):`);
    unmatched.slice(0, 10).forEach(u => console.log(`     - ${u.slice(0, 70)}`));
    if (unmatched.length > 10) console.log(`     ... e mais ${unmatched.length - 10}`);
  }
  console.log('\nManifest atualizado com task_ids.');
})().catch(err => {
  console.error('❌ Erro:', err.message);
  process.exit(1);
});
