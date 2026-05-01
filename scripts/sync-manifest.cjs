#!/usr/bin/env node
/**
 * Sincroniza o manifest com o banco (Supabase).
 *
 * Uso: node scripts/sync-manifest.js
 *
 * Lê o manifest do produto, extrai (task_id, checkbox state) de cada linha,
 * compara com o banco e atualiza as tarefas cujo status mudou.
 *
 * Direção: manifest → banco (o que está no manifest vence).
 *
 * Log estruturado:
 *   - Tarefas marcadas como feitas (completed_at = now)
 *   - Tarefas desmarcadas (completed_at = null)
 *   - Tarefas sem mudança
 *   - Tarefas no manifest sem task_id (ignoradas)
 */

const fs = require('fs');
const https = require('https');
const path = require('path');

const PROJECT_REF = 'hswyopqvnolqpmprqvzh';
const MANIFEST_PATH = path.resolve(__dirname, '../../diferentes/nexus/academy-assets/produtos/vendas-em-oticas-na-pratica/manifest.md');

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

function parseManifest() {
  const content = fs.readFileSync(MANIFEST_PATH, 'utf8');
  const lines = content.split('\n');
  const entries = [];
  for (const line of lines) {
    const m = line.match(/^\s*-\s*\[([ x])\]\s*(.+?)\s*<!--\s*task_id=([a-f0-9-]+)\s*-->/i);
    if (m) {
      entries.push({
        checked: m[1] === 'x',
        title: m[2].trim(),
        task_id: m[3].trim(),
      });
    }
  }
  return entries;
}

(async () => {
  console.log('📖 Lendo manifest:', MANIFEST_PATH);
  if (!fs.existsSync(MANIFEST_PATH)) { console.error('❌ Manifest não existe'); process.exit(1); }

  const manifestEntries = parseManifest();
  if (manifestEntries.length === 0) {
    console.log('⚠️  Nenhuma linha com task_id no manifest.');
    console.log('   Execute primeiro: node scripts/inject-task-ids-in-manifest.js');
    process.exit(0);
  }
  console.log(`   ${manifestEntries.length} linhas com task_id encontradas no manifest`);

  // Buscar estado atual no banco
  const ids = manifestEntries.map(e => `'${e.task_id}'`).join(',');
  const tasksInDb = await querySQL(
    `SELECT id, title, completed_at FROM ops.roadmap_tasks WHERE id IN (${ids})`
  );
  const dbById = new Map(tasksInDb.map(t => [t.id, t]));

  // Diff
  const toMarkDone = [];
  const toMarkUndone = [];
  const unchanged = [];
  const missing = [];

  for (const entry of manifestEntries) {
    const dbTask = dbById.get(entry.task_id);
    if (!dbTask) { missing.push(entry); continue; }
    const dbDone = !!dbTask.completed_at;
    if (entry.checked && !dbDone) toMarkDone.push(entry);
    else if (!entry.checked && dbDone) toMarkUndone.push(entry);
    else unchanged.push(entry);
  }

  console.log('\n📊 Diff:');
  console.log(`   ✅ Marcar como feitas: ${toMarkDone.length}`);
  console.log(`   ⏸️  Desmarcar (voltar a pendente): ${toMarkUndone.length}`);
  console.log(`   ➖ Sem mudança: ${unchanged.length}`);
  if (missing.length > 0) console.log(`   ⚠️  Task_ids no manifest que não existem no banco: ${missing.length}`);

  if (toMarkDone.length === 0 && toMarkUndone.length === 0) {
    console.log('\n✓ Nada para sincronizar. Banco e manifest já estão idênticos.');
    process.exit(0);
  }

  // Executar updates em transação única
  const now = new Date().toISOString();
  const updates = [];
  if (toMarkDone.length > 0) {
    const ids = toMarkDone.map(e => `'${e.task_id}'`).join(',');
    updates.push(`UPDATE ops.roadmap_tasks SET completed_at = '${now}' WHERE id IN (${ids});`);
  }
  if (toMarkUndone.length > 0) {
    const ids = toMarkUndone.map(e => `'${e.task_id}'`).join(',');
    updates.push(`UPDATE ops.roadmap_tasks SET completed_at = NULL, completed_by = NULL WHERE id IN (${ids});`);
  }

  console.log('\n🚀 Aplicando mudanças...');
  await querySQL(updates.join('\n'));

  console.log('\n✅ Sync concluído.');
  if (toMarkDone.length > 0) {
    console.log('\n  Marcadas como feitas:');
    toMarkDone.forEach(e => console.log(`    ✓ ${e.title.slice(0, 80)}`));
  }
  if (toMarkUndone.length > 0) {
    console.log('\n  Desmarcadas:');
    toMarkUndone.forEach(e => console.log(`    ○ ${e.title.slice(0, 80)}`));
  }

  // Guardar último sync
  const state = {
    last_sync_at: now,
    marked_done: toMarkDone.length,
    marked_undone: toMarkUndone.length,
    unchanged: unchanged.length,
  };
  const stateFile = path.resolve(__dirname, '.sync-state.json');
  fs.writeFileSync(stateFile, JSON.stringify(state, null, 2), 'utf8');
  console.log(`\n📝 Estado salvo em ${stateFile}`);
})().catch(err => {
  console.error('\n❌ Erro:', err.message);
  process.exit(1);
});
