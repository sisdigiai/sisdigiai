// Retrato da audiência dos 5 blogs do Ecoax, trazido para o painel da empresa (migration 161).
//
// POR QUE EXISTE: o dono pediu em 28/09 que a audiência dos blogs apareça aqui também. O Ecoax continua
// dono do dado bruto e do número; isto traz só o agregado, sem nada que descreva leitor — o que respeita a
// muralha editorial-comercial do Ecoax (trava 23) e a regra "resultado sempre no digiai" ao mesmo tempo.
//
// POR QUE SEPARA MÁQUINA DE GENTE AQUI, e não confia no rótulo do Ecoax: medido em 28/09, dos 61 eventos que
// lá constam como 'navegador', 59 caem dentro de rajadas — os 5 blogs abrindo a home no mesmo minuto, que é a
// assinatura de máquina que a própria migration 0027 do Ecoax definiu. O rótulo parou de ser aplicado depois
// de 23/09. Enquanto isso não for corrigido lá, quem espelha confere aqui; painel de empresa não pode chamar
// robô de leitor.
//
// SEM SEGREDO NOVO: os dois projetos são da mesma organização, então o PAT de gestão que já está em
// digiai/.env abre os dois. Nenhuma chave de serviço atravessa projeto.
//
// Uso:  node scripts/espelhar-audiencia-blogs.mjs          → mede e grava o retrato
//       node scripts/espelhar-audiencia-blogs.mjs --dry    → só mostra
import fs from 'node:fs';

const DRY = process.argv.includes('--dry');
const REF_ECOAX = 'zgojkioieztikqhwcoae';
const REF_DIGIAI = 'hswyopqvnolqpmprqvzh';
const PAT = fs.readFileSync(new URL('../.env', import.meta.url), 'utf8')
  .replace(/^﻿/, '').split(/\r?\n/).find((l) => l.startsWith('SUPABASE_TOKEN='))
  ?.slice('SUPABASE_TOKEN='.length).trim().replace(/^["']|["']$/g, '');
if (!PAT) { console.error('falta SUPABASE_TOKEN no digiai/.env'); process.exit(2); }

async function sql(ref, query) {
  const r = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${PAT}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });
  const t = await r.text();
  if (!r.ok) { console.error(t); process.exit(1); }
  return JSON.parse(t);
}

// Rajada = 3 ou mais blogs distintos no mesmo minuto. Uma pessoa não abre a home de 3 blogs da rede
// no mesmo minuto; um verificador automático faz isso o dia inteiro.
const CONSULTA = `
with rajada as (
  select date_trunc('minute', created_at) m
    from analytics.events_log group by 1 having count(distinct blog_slug) >= 3
), e as (
  select l.*, (date_trunc('minute', l.created_at) in (select m from rajada)) em_rajada
    from analytics.events_log l
)
select b.slug as blog_slug, b.nome,
       count(*) filter (where e.evento = 'page_view')                                        as page_views,
       count(*) filter (where e.evento = 'leitura_30s')                                      as leituras_30s,
       count(distinct e.sessao)                                                              as sessoes,
       count(*) filter (where e.cliente = 'navegador' and not e.em_rajada)                   as eventos_humanos,
       count(*) filter (where e.em_rajada)                                                   as eventos_rajada,
       count(*) filter (where e.cliente like 'interno%' or e.cliente = 'robo')               as eventos_internos,
       max(e.created_at) filter (where e.cliente = 'navegador' and not e.em_rajada)           as ultimo_humano
  from core.blogs b
  left join e on e.blog_slug = b.slug
 group by b.slug, b.nome order by b.slug`;

const linhas = await sql(REF_ECOAX, CONSULTA);
for (const l of linhas) {
  console.log(`${l.blog_slug.padEnd(24)} views:${String(l.page_views).padStart(3)}  ` +
    `gente:${String(l.eventos_humanos).padStart(3)}  rajada:${String(l.eventos_rajada).padStart(3)}  ` +
    `interno:${String(l.eventos_internos).padStart(3)}`);
}
const gente = linhas.reduce((s, l) => s + Number(l.eventos_humanos), 0);
console.log(`\naudiência humana medida na rede inteira: ${gente} evento(s)`);

if (DRY) { console.log('--dry: nada gravado.'); process.exit(0); }

const json = JSON.stringify(linhas).replace(/'/g, "''");
await sql(REF_DIGIAI, `select ops.fn_registrar_blog_audiencia('${json}'::jsonb)`);
console.log(`retrato de ${linhas.length} blogs gravado em ops.blog_audiencia.`);
