import 'jsr:@supabase/functions-js/edge-runtime.d.ts';
import { createClient } from 'jsr:@supabase/supabase-js@2';

/**
 * Frota, agente 1 — o verificador de fatos.
 *
 * Le os fatos publicaveis (mkt.fatos, pela view), mede cada fato na fonte que ele
 * mesmo declara, e grava o veredito em ops.fato_medicao.
 *
 * DE QUEM E A TABELA: a curadoria de mkt.fatos e do DIGIAI e o MKT so le — regra do
 * AGENTS.md do MKT (linha 35, 31/07/2026), confirmada na opcao 4.2(a) do mapa da brecha
 * OSI (Cockpit/osi-brecha-entre-apps-2026-09-11.md). Este comentario dizia o contrario
 * ("tabela do agente do MKT"), e cada lado tinha escrito que a tabela era do outro.
 *
 * O que ele NAO faz, de proposito:
 *   - nao reescreve o texto do fato (isso e copy, e copy tem dono);
 *   - nao renova `verificado_em`: medir nao e curar. Mudar um fato e curadoria, e
 *     passa por migration do digiai (ex.: 118, 121 e 240), nao por esta funcao;
 *   - nao inventa medicao para fonte que exige humano — marca nao_verificavel.
 *
 * Veredito:
 *   confirmado        — a fonte ainda sustenta o numero que o texto afirma (±15%)
 *   divergente        — mudou o bastante para o texto ficar errado (para mais OU
 *                       para menos: reverificar precisa poder PIORAR o fato)
 *   fonte_inacessivel — a fonte E de maquina, mas nao respondeu a esta medicao
 *   nao_verificavel   — a fonte nao e alcancavel por maquina, ponto
 *
 * ──────────────────────────────────────────────────────────────────────────────
 * CONSERTO DE 23/11/2026, depois de medir — ele estava cego de duas maneiras, e
 * as duas se pareciam com trabalho normal na tela:
 *
 * 1. O ESPELHO DO PULSO RESPONDE 401 DESDE 08/09. A `v_espelho_pulso` carrega custo
 *    e receita do Pulso e o anon foi revogado naquele dia (o front migrou para a edge
 *    `espelho-pulso`, gateada; esta funcao nao migrou). O `catch` engolia o 401 e o
 *    fato caia no ramo final: *"a fonte exige verificacao humana"* — mentira. A fonte
 *    e de maquina; a PORTA e que estava fechada. Conferido em 23/11: a `v_espelho_pulso`
 *    responde **401 permission denied**, e a `PULSO_ANON_KEY` nunca existiu nesta
 *    function — ela rodava so no literal, que e a mesma chave revogada.
 *    Agora a medicao entra pela porta que a casa ja abriu: a propria `espelho-pulso`,
 *    chamada com o service_role do digiai (ela aceita service_role por desenho). Mesma
 *    BASE de antes (`v_espelho_pulso.views_total`), entao o numero continua comparavel
 *    — trocar a base para arrumar a leitura seria arrumar o termometro mudando a febre.
 *    Se essa porta falhar, o veredito diz `fonte_inacessivel` com o HTTP, porque "nao
 *    consegui ler" nunca pode se parecer com "precisa de gente".
 *
 * 2. LEITURA QUE FALHA VIRAVA ZERO. O `count` de `mkt.publications` era lido sem
 *    olhar o `error`, e `?? 0` transformava falha em zero. A serie provou: 14, 8, 8
 *    e **0 todo dia desde 08/09**, com o texto *"Caiu — a esteira ficou parada"*.
 *    Medido hoje, a tabela tem **2.114 linhas em 7 dias**. O alarme era falso, e era
 *    o tipo de falso que se acredita. Zero agora so existe quando a leitura deu
 *    certo e o numero e zero.
 *
 * E a chave anon literal saiu: chave fixa em codigo e chave que ninguem troca, e
 * R-021 manda rotacionar. Esta nem servia mais — estava revogada.
 */

const TOLERANCIA = 0.15;

/** A fonte se casa pelo NOME DA VIEW, nao por pedaço de texto.
 *
 *  Custou um veredito errado no mesmo dia: curei o fato dos inscritos do YouTube e escrevi a fonte
 *  como "v_seguidores_pulso_dias e v_espelho_pulso_contas_dias". O `includes('espelho_pulso')`
 *  casou, e a function comparou **543 inscritos com 820.690 views** e gritou divergente. O `_` é
 *  caractere de palavra, então `\bv_espelho_pulso\b` casa a view exata e **nao** casa
 *  `v_espelho_pulso_contas_dias` — que é justamente a distinção que faltava. */
const cita = (fonte: string, view: string) => new RegExp(`\\b${view}\\b`).test(fonte);

type Veredito = 'confirmado' | 'divergente' | 'fonte_inacessivel' | 'nao_verificavel';

interface Medicao {
  chave: string | null;
  fonte: string | null;
  valor_texto: number | null;
  valor_medido: number | null;
  veredito: Veredito;
  detalhe: string;
}

/** Uma fonte medida: ou tem valor, ou tem o motivo de nao ter. Nunca as duas, nunca nenhuma. */
interface Fonte {
  valor: number | null;
  erro: string | null;
  nota?: string;
}

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

function vereditoDe(afirmado: number | null, medido: number | null): 'confirmado' | 'divergente' {
  if (afirmado === null || afirmado === 0 || medido === null) return 'divergente';
  return Math.abs(medido - afirmado) / afirmado <= TOLERANCIA ? 'confirmado' : 'divergente';
}

/** O agregado do Pulso pela porta da casa: a edge `espelho-pulso` do proprio digiai, que aceita o
 *  service_role por desenho. Uma porta so para o Pulso — se a rota dele mudar, muda num lugar. */
async function medirPulso(url: string, chave: string): Promise<Fonte> {
  let r: Response;
  try {
    r = await fetch(`${url}/functions/v1/espelho-pulso`, {
      headers: { Authorization: `Bearer ${chave}`, apikey: chave },
      signal: AbortSignal.timeout(15000),
    });
  } catch (e) {
    return { valor: null, erro: `espelho-pulso fora do ar: ${e instanceof Error ? e.name : String(e)}` };
  }
  if (!r.ok) return { valor: null, erro: `espelho-pulso respondeu HTTP ${r.status}` };
  const o = await r.json() as { views_total?: number | null; publicacoes?: number | null } | null;
  if (!o || o.views_total === null || o.views_total === undefined) {
    return { valor: null, erro: 'espelho-pulso respondeu sem `views_total`' };
  }
  return { valor: Number(o.views_total), erro: null, nota: `${o.publicacoes ?? '?'} publicacoes` };
}

/** Inscritos do canal principal do Pulso no YouTube, pelo censo diário do espelho.
 *  `v_seguidores_pulso_dias` é anon por desenho (só contagem, zero PII e zero financeiro) — foi a
 *  `v_espelho_pulso`, que carrega custo e receita, que fechou em 08/09. Portas diferentes. */
async function medirInscritosPulso(): Promise<Fonte> {
  const K = Deno.env.get('PULSO_ANON_KEY');
  if (!K) return { valor: null, erro: 'PULSO_ANON_KEY não configurada nesta function' };
  const url = 'https://nlcisbfdiokmipyihtuz.supabase.co/rest/v1/v_seguidores_pulso_dias'
    + '?select=dia,seguidores&conta=eq.pulsohistorias&rede=eq.youtube&order=dia.desc&limit=1';
  let r: Response;
  try {
    r = await fetch(url, { headers: { apikey: K, Authorization: `Bearer ${K}` }, signal: AbortSignal.timeout(15000) });
  } catch (e) {
    return { valor: null, erro: `espelho do Pulso fora do ar: ${e instanceof Error ? e.name : String(e)}` };
  }
  if (!r.ok) return { valor: null, erro: `v_seguidores_pulso_dias respondeu HTTP ${r.status}` };
  const p = await r.json() as Array<{ dia: string; seguidores: number | null }>;
  if (!p.length || p[0].seguidores === null) return { valor: null, erro: 'o censo do canal veio sem número' };
  return { valor: Number(p[0].seguidores), erro: null, nota: `censo de ${p[0].dia}` };
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'metodo nao suportado' }, 405);

  const URL_DIGIAI = Deno.env.get('SUPABASE_URL')!;
  const SERVICE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const sb = createClient(URL_DIGIAI, SERVICE);

  // Le pela view publica, nao pela tabela: o service_role nao tem grant em mkt.fatos,
  // e a view (criada pelo MKT) e o contrato de leitura. Quem cura a tabela e o digiai.
  const { data: fatos, error } = await sb
    .from('v_mkt_fatos')
    .select('chave, fato, valor_numerico, fonte, verificado_em, validade_dias')
    .eq('publico', true);

  if (error) return json({ error: 'falha ao ler v_mkt_fatos', detalhe: error.message }, 500);

  // ── fontes medidas uma vez, reaproveitadas por todos os fatos que as citam ──
  const [pulso, inscritos] = await Promise.all([medirPulso(URL_DIGIAI, SERVICE), medirInscritosPulso()]);

  const { count, error: ePubs } = await sb
    .schema('mkt').from('publications')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString());
  const publicacoes: Fonte = ePubs
    ? { valor: null, erro: `mkt.publications nao respondeu: ${ePubs.message}` }
    : { valor: count ?? 0, erro: null };

  const daFonte = (f: { chave: string; fonte: string | null }, afirmado: number | null,
                   fonte: Fonte, comoLer: string): Medicao => (
    fonte.erro
      ? {
        chave: f.chave, fonte: f.fonte, valor_texto: afirmado, valor_medido: null,
        veredito: 'fonte_inacessivel',
        detalhe: `${comoLer} — ${fonte.erro}. NAO e "precisa de gente": a fonte e de maquina e nao respondeu.`,
      }
      : {
        chave: f.chave, fonte: f.fonte, valor_texto: afirmado, valor_medido: fonte.valor,
        veredito: vereditoDe(afirmado, fonte.valor),
        detalhe: `${comoLer}: ${fonte.valor}${fonte.nota ? ` (${fonte.nota})` : ''}. O fato afirma ${afirmado ?? '—'}.`,
      }
  );

  const medicoes: Medicao[] = (fatos ?? []).map((f) => {
    const fonte = (f.fonte ?? '').toLowerCase();
    const afirmado = f.valor_numerico === null ? null : Number(f.valor_numerico);

    if (cita(fonte, 'v_seguidores_pulso_dias')) {
      return daFonte(f, afirmado, inscritos, 'inscritos do canal do Pulso no YouTube');
    }

    if (cita(fonte, 'v_espelho_pulso')) {
      return daFonte(f, afirmado, pulso, 'v_espelho_pulso agora (pela edge espelho-pulso)');
    }

    if (fonte.includes('publications') || fonte.includes('mkt_espelho')) {
      const m = daFonte(f, afirmado, publicacoes, 'mkt.publications nos ultimos 7 dias');
      // "Caiu" so se pode dizer quando a leitura DEU CERTO e veio menor.
      if (!publicacoes.erro && afirmado !== null && (publicacoes.valor ?? 0) < afirmado) {
        m.detalhe += ' Caiu — a esteira ficou parada.';
      }
      return m;
    }

    if (fonte.includes('tenant_vida') || fonte.includes('clearix')) {
      return {
        chave: f.chave, fonte: f.fonte, valor_texto: afirmado,
        valor_medido: null, veredito: 'nao_verificavel',
        detalhe: 'Fonte no banco Clearix (crm_erp). O digiai nao le aquele banco em runtime ' +
                 '(ADR-0001/R-009); precisa de espelho de uso publicado pelo Finance.',
      };
    }

    return {
      chave: f.chave, fonte: f.fonte, valor_texto: afirmado,
      valor_medido: null, veredito: 'nao_verificavel',
      detalhe: `Fonte "${f.fonte ?? 'nao declarada'}" exige verificacao humana.`,
    };
  });

  const { data: gravadas, error: e2 } = await sb.rpc('fn_registrar_medicao_fato', { p_linhas: medicoes });
  if (e2) return json({ error: 'falha ao gravar medicao', detalhe: e2.message }, 500);

  const conta = (v: Veredito) => medicoes.filter((m) => m.veredito === v).length;
  return json({
    ok: true,
    medidos: gravadas ?? medicoes.length,
    confirmado: conta('confirmado'),
    divergente: conta('divergente'),
    fonte_inacessivel: conta('fonte_inacessivel'),
    nao_verificavel: conta('nao_verificavel'),
    medido_em: new Date().toISOString(),
  });
});
