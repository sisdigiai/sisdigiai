// Gera o espelho documentado do schema `cortes` — estrutura (schema.sql) e dados de referência (seed.sql).
//
// POR QUE MORA AQUI e não no repositório do Cortes: o espelho é retrato do BANCO, e quem tem leitura do
// banco da casa é o app digiai. O agente do Cortes pediu os arquivos porque não lê o banco (17/11/2026).
// O gerador fica com o acesso; a saída vai para o repositório dele.
//
// Uso:  node scripts/dump-schema-cortes.mjs           > ../digiai_cortes/docs/migrations/schema.sql
//       node scripts/dump-schema-cortes.mjs --seed    > ../digiai_cortes/docs/migrations/seed.sql
//
// Herdado do `dump-schema.mjs` do MKT, com as lições dele mantidas:
//   · o que é do cortes em `public` sai das MIGRATIONS dele, não de prefixo de nome — lista por prefixo é
//     o recorte da busca decidindo o tamanho do espelho, e já deixou objeto de fora duas vezes lá;
//   · `security_invoker` se lê pelo VALOR, não pela presença: `security_invoker=off` escrito como `true`
//     transformaria uma view definer em invoker num banco reconstruído, e ela quebraria com 42501;
//   · comando de cron sai com o Bearer mascarado.
// Acrescentado aqui: **GRANTS**. No cortes o portão É o grant (só `service_role` executa), então espelho
// sem grant seria retrato sem a fechadura.
import { readFileSync, readdirSync } from 'node:fs';

const REF = 'hswyopqvnolqpmprqvzh';
const SCHEMA = 'cortes';
const API = `https://api.supabase.com/v1/projects/${REF}/database/query`;
const env = readFileSync(new URL('../.env', import.meta.url), 'utf8');
const token = /^SUPABASE_TOKEN="?([^"\r\n]+)"?/m.exec(env)?.[1];
if (!token) { console.error('SUPABASE_TOKEN ausente no .env'); process.exit(1); }

async function q(sql) {
  const res = await fetch(API, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: sql }),
  });
  if (!res.ok) { console.error(res.status, await res.text()); process.exit(1); }
  return res.json();
}

const hoje = (await q("select to_char(now() at time zone 'America/Sao_Paulo','YYYY-MM-DD HH24:MI') d"))[0].d;
const out = [];

// O que é do cortes em `public`: lido das migrations DELE.
const migDir = new URL('../../digiai_cortes/docs/migrations/', import.meta.url);
const seus = new Set();
for (const arq of readdirSync(migDir).filter((f) => f.endsWith('.sql'))) {
  const sql = readFileSync(new URL(arq, migDir), 'utf8');
  for (const m of sql.matchAll(
    /(?:create\s+(?:or\s+replace\s+)?(?:materialized\s+)?|alter\s+|comment\s+on\s+)(?:view|function)\s+public\.([a-z0-9_]+)/gi)) {
    seus.add(m[1].toLowerCase());
  }
}
const lista = [...seus].map((n) => `'${n}'`).join(',') || `''`;

if (process.argv.includes('--seed')) {
  out.push(`-- seed.sql — dados de referência do schema ${SCHEMA} (banco ${REF})`);
  out.push(`-- GERADO pelo app digiai (scripts/dump-schema-cortes.mjs) em ${hoje} BRT. NÃO EDITAR À MÃO.`);
  out.push('--');
  const tabelas = await q(`select tablename from pg_tables where schemaname='${SCHEMA}' order by 1`);
  const contagens = [];
  for (const t of tabelas) {
    const [{ n }] = await q(`select count(*)::int n from ${SCHEMA}.${t.tablename}`);
    contagens.push([t.tablename, n]);
  }
  const total = contagens.reduce((s, [, n]) => s + n, 0);
  out.push(`-- Contagem por tabela em ${hoje} BRT:`);
  for (const [t, n] of contagens) out.push(`--   ${SCHEMA}.${t}: ${n} linha(s)`);
  out.push('--');
  if (total === 0) {
    out.push('-- NENHUMA LINHA EM NENHUMA TABELA. Não há dado de referência para semear: o schema nasceu');
    out.push('-- em 16/11/2026 e o motor ainda não grava (depende da edge function `cortes-gravar`).');
    out.push('-- Arquivo vazio de propósito — vazio medido não é vazio por esquecimento.');
  } else {
    out.push('-- Há linhas. Este gerador ainda não exporta conteúdo: pedir ao app digiai o dump com dados');
    out.push('-- quando existir dado de referência de verdade (e não episódio de produção).');
  }
  console.log(out.join('\n'));
  process.exit(0);
}

out.push(`-- schema.sql — retrato estrutural do schema ${SCHEMA} (banco ${REF})`);
out.push(`-- GERADO pelo app digiai (scripts/dump-schema-cortes.mjs) em ${hoje} BRT. NÃO EDITAR À MÃO.`);
out.push('-- Regenerar: pedir ao agente do app digiai — o gerador mora lá porque a leitura do banco mora lá.');
out.push('');

const cols = await q(`
  select c.table_name, c.column_name, c.data_type, c.is_nullable, c.column_default
  from information_schema.columns c
  join information_schema.tables t on t.table_schema=c.table_schema and t.table_name=c.table_name and t.table_type='BASE TABLE'
  where c.table_schema='${SCHEMA}' order by c.table_name, c.ordinal_position`);
const porTabela = new Map();
for (const r of cols) {
  if (!porTabela.has(r.table_name)) porTabela.set(r.table_name, []);
  porTabela.get(r.table_name).push(r);
}
out.push('-- ============ TABELAS ============');
for (const [t, cs] of porTabela) {
  out.push(`\ncreate table ${SCHEMA}.${t} (`);
  out.push(cs.map((c) =>
    `  ${c.column_name} ${c.data_type}${c.is_nullable === 'NO' ? ' not null' : ''}${c.column_default ? ` default ${c.column_default}` : ''}`,
  ).join(',\n'));
  out.push(');');
}

const cons = await q(`
  select conrelid::regclass::text as tabela, conname, pg_get_constraintdef(oid) as def
  from pg_constraint where connamespace='${SCHEMA}'::regnamespace order by 1, 2`);
out.push('\n-- ============ CONSTRAINTS ============');
for (const r of cons) out.push(`alter table ${r.tabela} add constraint ${r.conname} ${r.def};`);

const idx = await q(`
  select indexdef from pg_indexes where schemaname='${SCHEMA}'
  and indexname not in (select conname from pg_constraint where connamespace='${SCHEMA}'::regnamespace)
  order by tablename, indexname`);
out.push('\n-- ============ INDEXES ============');
for (const r of idx) out.push(`${r.indexdef};`);

const rls = await q(`select relname from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where n.nspname='${SCHEMA}' and c.relkind='r' and c.relrowsecurity order by 1`);
out.push('\n-- ============ RLS ============');
for (const r of rls) out.push(`alter table ${SCHEMA}.${r.relname} enable row level security;`);
const pols = await q(`
  select tablename, policyname, cmd, roles::text as roles, coalesce(qual,'') as qual, coalesce(with_check,'') as wc
  from pg_policies where schemaname='${SCHEMA}' order by tablename, policyname`);
for (const p of pols) {
  const roles = p.roles.replace(/[{}]/g, '');
  let s = `create policy ${p.policyname} on ${SCHEMA}.${p.tablename} for ${p.cmd.toLowerCase()} to ${roles}`;
  if (p.qual) s += ` using (${p.qual})`;
  if (p.wc) s += ` with check (${p.wc})`;
  out.push(s + ';');
}

const views = await q(`
  select n.nspname as sch, c.relname, pg_get_viewdef(c.oid, true) as def, coalesce(c.reloptions::text,'') as opts
  from pg_class c join pg_namespace n on n.oid=c.relnamespace
  where c.relkind='v' and (n.nspname='${SCHEMA}' or (n.nspname='public' and c.relname in (${lista})))
  order by 1, 2`);
out.push('\n-- ============ VIEWS ============');
for (const v of views) {
  const m = /security_invoker=(\w+)/.exec(v.opts);
  const inv = m && ['on', 'true', '1', 'yes'].includes(m[1].toLowerCase()) ? ' with (security_invoker=true)' : '';
  out.push(`\ncreate or replace view ${v.sch}.${v.relname}${inv} as\n${v.def}`);
}

const fns = await q(`
  select pg_get_functiondef(p.oid) as def
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  where (n.nspname='${SCHEMA}') or (n.nspname='public' and p.proname in (${lista}))
  order by n.nspname, p.proname`);
out.push('\n-- ============ FUNCTIONS ============');
for (const f of fns) out.push('\n' + f.def + ';');

// GRANTS — no cortes o portão É o grant. Espelho sem isto é retrato sem a fechadura.
out.push('\n-- ============ GRANTS ============');
const gschema = await q(`
  select r.rolname, has_schema_privilege(r.rolname, '${SCHEMA}', 'usage') as usa
  from pg_roles r where r.rolname in ('anon','authenticated','service_role') order by 1`);
for (const g of gschema) {
  out.push(g.usa ? `grant usage on schema ${SCHEMA} to ${g.rolname};`
                 : `-- ${g.rolname}: SEM usage em ${SCHEMA} (de propósito)`);
}
const gtab = await q(`
  select table_name, grantee, string_agg(distinct privilege_type, ', ' order by privilege_type) privs
  from information_schema.role_table_grants
  where table_schema='${SCHEMA}' and grantee in ('anon','authenticated','service_role')
  group by 1,2 order by 1,2`);
for (const g of gtab) out.push(`grant ${g.privs.toLowerCase()} on ${SCHEMA}.${g.table_name} to ${g.grantee};`);
const gfn = await q(`
  select p.proname, r.rolname,
         has_function_privilege(r.rolname, p.oid, 'execute') as exec
  from pg_proc p join pg_namespace n on n.oid=p.pronamespace
  cross join pg_roles r
  where n.nspname='public' and p.proname in (${lista})
    and r.rolname in ('anon','authenticated','service_role')
  order by 1, 2`);
for (const g of gfn) {
  out.push(g.exec ? `grant execute on function public.${g.proname} to ${g.rolname};`
                  : `-- public.${g.proname}: ${g.rolname} SEM execute (de propósito)`);
}

const bucket = await q(`select id, public from storage.buckets where id='${SCHEMA}'`);
out.push('\n-- ============ STORAGE ============');
for (const b of bucket) out.push(`-- bucket '${b.id}' | público: ${b.public}`);
const polsStorage = await q(`
  select policyname, cmd, roles::text roles, coalesce(qual,'') qual
  from pg_policies where schemaname='storage' and policyname ilike '%${SCHEMA}%' order by 1`);
for (const p of polsStorage) {
  out.push(`-- policy storage.objects ${p.policyname} | ${p.cmd} | ${p.roles.replace(/[{}]/g, '')} | ${p.qual}`);
}

const crons = await q(`
  select jobname, schedule, active,
         regexp_replace(command, 'Bearer [A-Za-z0-9._-]+', 'Bearer ***', 'g') as command
  from cron.job where jobname ilike '%${SCHEMA}%' order by jobname`);
out.push('\n-- ============ PG_CRON (informativo) ============');
if (!crons.length) out.push('-- nenhum agendamento com nome de cortes');
for (const c of crons) out.push(`-- ${c.jobname} | ${c.schedule} | active=${c.active}\n-- ${c.command.replace(/\n/g, ' ').trim()}`);

console.log(out.join('\n'));
