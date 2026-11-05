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
// 05/11: HOSTS MISTURADOS — o medidor seguia o 3xx e resolvia os scripts contra o host PEDIDO. Os apps de
// login do Clearix mandam o visitante para `app.clearix.app.br/login`, e eu pedia os chunks dessa página ao
// host de origem: 12 de 12 em 404, que eu reportei como "build quebrado" em dois apps do eco. Era o retrato.
// Quem apontou foi o Orquestrador do eco, com medição. Mesma família do soft-404 abaixo: eu li o endereço e
// o código, não o que de fato voltou.
//
// 05/11: SOFT-404 — o medidor tratava HTTP 200 como "página viva". `visaoparasuzano` e
// `lancaster-multifocal` devolvem 200 com o corpo "Página não encontrada": são rascunhos. Eu olhei o
// CÓDIGO e não o CORPO, chamei de "landing no ar sem pixel" e tive de desdizer ao dono. Sem este
// conserto, todo slug errado ou rascunho entra no retrato como vitrine cega — e "não existe" e "existe e
// não mede" pedem ações opostas: uma é publicar, a outra é instalar pixel.
//
// 04/11: o retrato passou a incluir as LANDINGS DE LOJA do Clearix (`lojas.clearix.app.br`), lidas do
// sitemap público. São do ecossistema; a casa confere, não é dona. E o medidor passou a distinguir pixel
// POR CONSENTIMENTO (presente, dispara após o aceite) de pixel ausente — tratar os dois como "sem meta"
// foi erro meu em 31/10, e os dois pedem decisões opostas sobre gastar em anúncio.
//
// Uso:  node scripts/medir-pixel.mjs          → mede os sites ativos do inventário + as landings, e grava
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

// 01/10: o catch devolvia texto vazio e engolia o motivo. Com isso "não consegui ler o bundle" e "o site
// não tem pixel" viravam a MESMA resposta — e o painel chamaria de vitrine cega quem só teve timeout.
// Agora a falha volta nomeada e sobe até o retrato; medição que não sabe que falhou é pior que medição nenhuma.
async function baixar(url, ms = 20000) {
  try {
    const r = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(ms),
      headers: { 'User-Agent': 'digiai-medidor/1.0 (painel interno)' } });
    // 05/11: `r.url` é onde o corpo foi buscado DE FATO, depois dos 3xx. Eu seguia o redirect e jogava
    // esse endereço fora — ver o comentário do laço de scripts, logo abaixo.
    return { code: r.status, url_final: r.url || url,
      texto: r.status < 400 ? await r.text() : '', erro: r.status >= 400 ? `HTTP ${r.status}` : null };
  } catch (e) {
    return { code: 0, url_final: url, texto: '', erro: e?.name === 'TimeoutError' ? 'timeout' : (e?.cause?.code ?? e?.name ?? 'falhou') };
  }
}

const titulo = (html) => html?.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1].replace(/\s+/g, ' ').trim() || null;

// SONDA: pede ao MESMO host um irmão INVENTADO da página medida e compara. Decide soft-404 sem depender de
// idioma nem de lista de frases minhas — quem diz o que é "não encontrada" naquele host é o host.
//   sonda 404/410  → host honesto: o que respondeu 200 existe.
//   sonda < 400 e <title> IGUAL ao da página medida → a página medida É a página de "não encontrada".
//   sonda não lida → não sei dizer, e o retrato diz isso em vez de chutar.
// Só vale para URL COM CAMINHO. Na raiz de um host a sonda não prova nada: SPA que serve a mesma casca
// para qualquer caminho faria a própria home ser declarada inexistente — e é na raiz que moram os 31
// sites do inventário. Uma sonda por pasta, não por página: 12 landings custam 1 requisição ao host do eco.
// A SONDA TEM DE TER A MESMA FORMA DA PÁGINA MEDIDA, e isso eu aprendi errando na primeira corrida:
// `/__sonda-inexistente-digiai` devolveu 404 de 23 bytes e `/sonda-inexistente-digiai` devolveu 200 com
// "Página não encontrada" — no MESMO host, no mesmo minuto. Caminho com `_` na frente (ou com ponto) não
// casa com a rota dinâmica e sai por outra porta. Com a sonda fora de forma, o conserto concluía "host
// honesto, logo os rascunhos existem": o oposto da verdade. Por isso a sonda nasce do próprio último
// pedaço da URL medida, preservando extensão quando houver — ela é irmã da página, não uma estranha.
const SONDA = 'sonda-inexistente-digiai';
const sondas = new Map();
async function sonda(base, pagina) {
  const alvo = new URL(base);
  if (alvo.pathname === '/' || alvo.pathname === '') return null;
  const ultimo = alvo.pathname.replace(/^.*\//, '');
  const ponto = ultimo.lastIndexOf('.');
  const inventado = ponto > 0 ? `${ultimo.slice(0, ponto)}-${SONDA}${ultimo.slice(ponto)}` : `${ultimo}-${SONDA}`;
  const dir = alvo.origin + alvo.pathname.replace(/[^/]+$/, '');
  const chave = dir + (ponto > 0 ? ultimo.slice(ponto) : '');  // a resposta de "não encontrada" é do host,
  if (!sondas.has(chave)) {                                    // mas a forma do caminho muda a porta
    const r = await baixar(dir + inventado, 20000);
    sondas.set(chave, { url: dir + inventado, code: r.code, titulo: titulo(r.texto), erro: r.code === 0 ? r.erro : null });
  }
  const s = sondas.get(chave);
  if (s.erro || s.code >= 400 || !s.titulo) return { ...s, inexistente: false };
  const t = titulo(pagina.texto);
  return { ...s, inexistente: !!(t && t === s.titulo) };
}

async function medir(url) {
  const base = url.replace(/\/$/, '');
  const pagina = await baixar(base);

  // 05/11, correção apontada pelo eco e medida por mim: o corpo que chega aqui é o do DESTINO depois dos
  // 3xx, não o do endereço pedido. `sales.clearix.app.br` devolve 307 para `app.clearix.app.br/login`, e eu
  // pedia os chunks `/_next/...` dessa página de login ao host de ORIGEM: 12 de 12 em 404. Chamei de "build
  // quebrado" em dois apps do eco — era o meu retrato misturando hosts. Provado: o chunk
  // `e2580f6a526a2d93.js` dá 404 em `sales` e 200 em `app`, mesmo minuto.
  // Agora o endereço final manda, como no navegador. E quando o host final é OUTRO, isso fica escrito no
  // obs: o que está medido é a página de destino, e atribuir o pixel dela ao host pedido sem dizer de onde
  // veio seria a mesma mentira em outra direção.
  const hostDe = (u) => { try { return new URL(u).host.replace(/^www\./, ''); } catch { return null; } };
  const destino = (pagina.url_final || base).replace(/\/$/, '');
  const outroHost = hostDe(destino) && hostDe(base) !== hostDe(destino) ? destino : null;

  // A sonda vem ANTES dos bundles: página que não existe não gasta 12 requisições no host do eco, e
  // "não existe" não pode sair do mesmo lugar que "existe e não mede".
  // Com redirect para outro host a sonda não entra: o host já respondeu "vai para lá" em vez de "não
  // encontrei", e sondar o destino responderia uma pergunta que não é a desta linha do retrato.
  const s = outroHost ? null : await sonda(destino, pagina);
  if (s?.inexistente) {
    return { url, http_code: pagina.code, pagina_inexistente: true,
      meta_pixel_id: null, tiktok: false, ga_gtm: null, clarity: false,
      obs: `PÁGINA NÃO EXISTE (soft-404): HTTP ${pagina.code} com o mesmo <title> ("${s.titulo}") que `
         + `${s.url}, que eu inventei — é rascunho ou slug errado, não é vitrine sem pixel` };
  }

  let todo = pagina.texto;
  // 01/10: buscava só /assets, /_next e /_astro. Os pixels de digiai.app.br e clearix.app.br vivem em
  // arquivo próprio (/digiai-pixel.js, /clearix-pixel.js), então o medidor dizia "sem meta" sobre dois
  // sites que TÊM pixel — e o painel ia chamar de vitrine cega quem estava medindo. Agora segue todo
  // <script src> do próprio site, que é o que o navegador faria.
  // 04/11: a landing de loja tem 15 scripts de mesma origem e o pixel vive no 15.o — o chunk da PAGINA
  // (`/_next/static/chunks/app/l/[slug]/page-*.js`). Com o corte em 8 o medidor diria "sem meta" sobre uma
  // landing que TEM pixel: a mesma conclusao errada que eu dei a mao em 31/10, agora reproduzida pela
  // ferramenta. Conserto: os chunks de `app/` (pagina e layout, onde mora codigo de medicao) vao PRIMEIRO,
  // e o teto sobe a 12 — sem virar 15 requisicoes por landing no host do eco. O obs continua dizendo
  // quantos de quantos foram lidos, para leitura parcial nunca passar por leitura completa.
  const todosScripts = [...new Set([...todo.matchAll(/<script[^>]+src=["']([^"']+)["']/g)]
    .map((m) => m[1]).filter((u) => !/^https?:/i.test(u)))];
  const scripts = [...todosScripts.filter((u) => u.includes('/app/')),
                   ...todosScripts.filter((u) => !u.includes('/app/'))].slice(0, 12);
  const falhas = [];
  for (const s of scripts) {
    // 04/11: era `base + caminho`, e com URL que tem caminho (as landings sao /<slug>) isso virava
    // `lojas.clearix.app.br/lancaster-suzano/_next/...` — 404 nos 8 chunks. Nenhum site do inventario tem
    // caminho, entao o defeito nunca apareceu. `new URL` resolve como o navegador: caminho absoluto vai
    // para a RAIZ, relativo fica ao lado da pagina.
    const r = await baixar(new URL(s, destino + '/').href, 25000);
    if (r.erro) falhas.push(`${s}: ${r.erro}`); else todo += r.texto;
  }
  if (pagina.erro) falhas.push(`página: ${pagina.erro}`);

  const meta = /fbevents\.js|fbq\s*\(/.test(todo);
  // 04/11: a landing de loja carrega o pixel SO DEPOIS DO ACEITE (injeta fbevents no clique). Sem esta
  // deteccao o retrato diria "sem meta" sobre uma pagina que TEM pixel configurado — foi a conclusao
  // errada que eu dei ao dono em 31/10 e tive de desdizer. Pixel presente e esperando aceite nao e
  // vitrine cega: e medicao parcial, e a diferenca muda a decisao de gastar em anuncio.
  const porConsentimento = /consent|consentimento/i.test(todo) && /fbevents|gtag\/js/.test(todo);
  // O ID vem de um lugar que o NOMEIA como id de pixel — ou não vem. Ler só "número começado em 1" era
  // palpite meu: o pixel do site institucional começa em 3.
  //
  // 05/11: a landing de loja declara o pixel no payload da própria página (`"meta_pixel_id":"…"`, com as
  // aspas escapadas pelo RSC), e NENHUM dos padrões nomeados pegava isso — o número caía no último recurso,
  // "qualquer número solto de 15-16 dígitos no bundle". Medi: o único candidato solto nos 15 scripts da
  // landing hoje é `9007199254740991`, que é o MAX_SAFE_INTEGER do JavaScript. Ou seja, o último recurso
  // estava a um deploy de distância de publicar uma constante da linguagem como "o pixel da loja".
  // Por isso a procedência do número agora VIAJA COM ELE até o obs: número cuja origem não se sabe dizer
  // não é número, é palpite, e palpite não decide gasto com anúncio.
  const FONTES_ID = [
    ['variável META_PIXEL_ID', /META_PIXEL_ID\s*=\s*["']([0-9]{14,17})["']/],
    ['chave meta_pixel_id da página', /["']meta_pixel_id\\?["']\s*:\s*\\?["']([0-9]{14,17})\\?["']/],
    ['const id', /const id\s*=\s*["']([0-9]{14,17})["']/],
    ['fbq init', /fbq\s*\(\s*["']init["']\s*,\s*["']([0-9]{14,17})["']/],
  ];
  let id = null, idFonte = null;
  for (const [nome, re] of FONTES_ID) {
    const m = todo.match(re);
    if (m) { id = m[1]; idFonte = nome; break; }
  }
  // Último recurso mantido só para não PERDER a presença do pixel em site que ainda não foi lido por padrão
  // nomeado — mas marcado como palpite, em letra maiúscula, no retrato.
  if (!id) { const m = todo.match(/\b([0-9]{15,16})\b/); if (m) { id = m[1]; idFonte = null; } }
  return {
    url,
    http_code: pagina.code,
    pagina_inexistente: false,
    meta_pixel_id: meta ? id : null,
    tiktok: /analytics\.tiktok\.com|ttq\.load/.test(todo),
    // 04/11: faltava `AW-` (Google ADS). A landing de loja mede conversão por AW-18544661611, e o retrato
    // dizia "sem google" sobre quem tem conversão configurada — cego no exato lugar onde o dinheiro entra.
    ga_gtm: todo.match(/\b(G-[A-Z0-9]{8,12}|GTM-[A-Z0-9]{5,8}|AW-[0-9]{9,12})\b/)?.[1] ?? null,
    clarity: /clarity\.ms/.test(todo),
    obs: (outroHost ? `REDIRECIONOU para outro host: ${outroHost} — o que está medido abaixo é a página de `
                    + `destino, não ${base}; pixel achado aqui é do destino — ` : '') +
         (falhas.length ? `NÃO LIDO: ${falhas.join('; ')} — ` : '') +
         // Sonda que não respondeu não pode virar "a página existe": sem ela, "sem pixel" aqui pode ser
         // rascunho. Fica dito, para ninguém decidir anúncio em cima de um palpite meu.
         (s?.erro ? `SONDA NÃO LIDA (${s.erro}) — não sei dizer se esta página existe — ` : '') +
         // Quando a sonda volta 404 de verdade, a conclusão "esta página existe" fica ESCRITA com a
         // evidência: foi assim que eu descobri a sonda fora de forma, e é assim que o próximo descobre.
         (s && !s.erro && s.code >= 400 ? `sonda ${s.url} → HTTP ${s.code}, logo esta página existe — ` : '') +
         (porConsentimento ? 'PIXEL POR CONSENTIMENTO (só dispara depois do aceite) — ' : '') +
         // A procedência do id viaja com o id: quem lê a tela precisa saber se o número foi declarado pela
         // página ou se foi eu que adivinhei num bundle.
         (meta && id && idFonte ? `id pela ${idFonte} — ` : '') +
         (meta && id && !idFonte ? `ID PALPITE: achei meta no código, mas o número (${id}) saiu de número `
           + `solto no bundle, que não se chama id de pixel — conferir no Events Manager antes de usar — ` : '') +
         (scripts.length ? `html + ${scripts.length - falhas.length} de ${scripts.length} script(s)` : 'só html'),
  };
}

// Um site só, com o retrato inteiro: `node scripts/medir-pixel.mjs https://site --dry`. Serve para
// conferir um caso sem varrer 33 e sem gravar.
const alvo = process.argv.find((a) => /^https?:\/\//.test(a));
if (alvo) {
  console.log(JSON.stringify(await medir(alvo), null, 2));
  process.exit(0);
}

const sites = await sql(`select valor url from company.digital_assets
  where deleted_at is null and categoria = 'site' and status = 'ativo' order by valor`);

// 04/11 (pedido do dono): as LANDINGS DE LOJA entram no mesmo retrato. Elas sao do ecossistema Clearix e
// moram em `lojas.clearix.app.br`; a lista sai do SITEMAP PUBLICO e nao de uma lista escrita aqui, por duas
// razoes: lista no codigo envelhece calada na primeira landing nova, e ler o banco do Clearix seria cano
// novo contra o ADR-0001. A casa precisa CONFERIR, nao ser dona: o eco publica, nos medimos.
const SITEMAP_LANDINGS = 'https://lojas.clearix.app.br/sitemap.xml';
async function landings() {
  const r = await baixar(SITEMAP_LANDINGS, 20000);
  if (r.erro) return { urls: [], erro: r.erro };
  const urls = [...new Set([...r.texto.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1]))]
    .filter((u) => /\/[^/]+$/.test(new URL(u).pathname));
  return { urls, erro: null };
}

const medidos = [];
for (const s of sites) {
  const m = await medir(s.url);
  medidos.push(m);
  console.log(`${String(m.http_code).padEnd(3)} ${m.url}  meta:${m.meta_pixel_id ?? 'não'}  tiktok:${m.tiktok ? 'sim' : 'não'}  ga:${m.ga_gtm ?? 'não'}` +
    (m.obs.startsWith('NÃO LIDO') ? `  ⚠ ${m.obs}` : ''));
}

const lp = await landings();
if (lp.erro) {
  // Falha nomeada e gravada: "nao li o sitemap" nao pode virar "nao ha landing". Zero landing medida com o
  // sitemap fora do ar e a mesma tela de zero landing publicada, e as duas pedem acoes opostas.
  console.log(`
⚠ sitemap das landings NÃO LIDO (${lp.erro}) — nenhuma landing neste retrato`);
  medidos.push({ url: SITEMAP_LANDINGS, http_code: 0, meta_pixel_id: null, tiktok: false, ga_gtm: null,
    clarity: false, fonte: 'sitemap lojas.clearix.app.br',
    obs: `NÃO LIDO: sitemap ${lp.erro} — a lista de landings deste retrato está vazia por falha, não por ausência` });
} else {
  console.log(`
landings de loja no sitemap: ${lp.urls.length}`);
  for (const u of lp.urls) {
    const m = { ...await medir(u), fonte: 'sitemap lojas.clearix.app.br' };
    medidos.push(m);
    console.log(`${String(m.http_code).padEnd(3)} ${m.url}  meta:${m.meta_pixel_id ?? 'não'}  ga:${m.ga_gtm ?? 'não'}  ${m.obs}`);
  }
}

if (DRY) { console.log(`\n--dry: ${medidos.length} medidos, nada gravado.`); process.exit(0); }

const json = JSON.stringify(medidos).replace(/'/g, "''");
await sql(`select ops.fn_registrar_pixel_medicao('${json}'::jsonb)`);
console.log(`\n${medidos.length} medições gravadas em ops.pixel_medicao.`);
