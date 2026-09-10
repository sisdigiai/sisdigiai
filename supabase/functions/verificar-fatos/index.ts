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
 *     passa por migration do digiai (ex.: 118 e 121), nao por esta funcao;
 *   - nao inventa medicao para fonte que exige humano — marca nao_verificavel.
 *
 * Veredito:
 *   confirmado      — a fonte ainda sustenta o numero que o texto afirma (±15%)
 *   divergente      — mudou o bastante para o texto ficar errado (para mais OU
 *                     para menos: reverificar precisa poder PIORAR o fato)
 *   nao_verificavel — a fonte nao e alcancavel por maquina
 */

const ESPELHO_PULSO =
  'https://nlcisbfdiokmipyihtuz.supabase.co/rest/v1/v_espelho_pulso?select=*';
// Mesma chave anon que o front usa em src/lib/espelhoMotores.ts: e uma view
// agregada, zero PII, so leitura. Secret opcional sobrescreve.
const PULSO_ANON = Deno.env.get('PULSO_ANON_KEY') ??
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sY2lzYmZkaW9rbWlweWlodHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODk0OTksImV4cCI6MjA3OTE2NTQ5OX0.-Cfzv9ebOYB8I93zNLghWTszawJk4G3rXwiTTY9PpOI';

const TOLERANCIA = 0.15;

interface Medicao {
  chave: string | null;
  fonte: string | null;
  valor_texto: number | null;
  valor_medido: number | null;
  veredito: 'confirmado' | 'divergente' | 'nao_verificavel';
  detalhe: string;
}

const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { 'Content-Type': 'application/json' } });

function vereditoDe(afirmado: number | null, medido: number | null): 'confirmado' | 'divergente' {
  if (afirmado === null || afirmado === 0 || medido === null) return 'divergente';
  return Math.abs(medido - afirmado) / afirmado <= TOLERANCIA ? 'confirmado' : 'divergente';
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST' && req.method !== 'GET') return json({ error: 'metodo nao suportado' }, 405);

  const sb = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
  );

  // Le pela view publica, nao pela tabela: o service_role nao tem grant em mkt.fatos,
  // e a view (criada pelo MKT) e o contrato de leitura. Quem cura a tabela e o digiai.
  const { data: fatos, error } = await sb
    .from('v_mkt_fatos')
    .select('chave, fato, valor_numerico, fonte, verificado_em, validade_dias')
    .eq('publico', true);

  if (error) return json({ error: 'falha ao ler v_mkt_fatos', detalhe: error.message }, 500);

  // ── fontes medidas uma vez, reaproveitadas por todos os fatos que as citam ──
  let pulsoViews: number | null = null;
  if (PULSO_ANON) {
    try {
      const r = await fetch(ESPELHO_PULSO, {
        headers: { apikey: PULSO_ANON, Authorization: `Bearer ${PULSO_ANON}` },
      });
      if (r.ok) pulsoViews = (await r.json())?.[0]?.views_total ?? null;
    } catch { /* fonte fora do ar vira nao_verificavel abaixo */ }
  }

  const { count: pubs7d } = await sb
    .schema('mkt').from('publications')
    .select('id', { count: 'exact', head: true })
    .gte('created_at', new Date(Date.now() - 7 * 864e5).toISOString());

  const medicoes: Medicao[] = (fatos ?? []).map((f) => {
    const fonte = (f.fonte ?? '').toLowerCase();
    const afirmado = f.valor_numerico === null ? null : Number(f.valor_numerico);

    if (fonte.includes('espelho_pulso') && pulsoViews !== null) {
      return {
        chave: f.chave, fonte: f.fonte, valor_texto: afirmado,
        valor_medido: pulsoViews, veredito: vereditoDe(afirmado, pulsoViews),
        detalhe: `v_espelho_pulso agora: ${pulsoViews} views. O fato afirma ${afirmado ?? '—'}.`,
      };
    }

    if (fonte.includes('publications') || fonte.includes('mkt_espelho')) {
      const n = pubs7d ?? 0;
      return {
        chave: f.chave, fonte: f.fonte, valor_texto: afirmado,
        valor_medido: n, veredito: vereditoDe(afirmado, n),
        detalhe: `mkt.publications nos ultimos 7 dias: ${n}. O fato afirma ${afirmado ?? '—'}.` +
          (afirmado !== null && n < afirmado ? ' Caiu — a esteira ficou parada.' : ''),
      };
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

  const conta = (v: string) => medicoes.filter((m) => m.veredito === v).length;
  return json({
    ok: true,
    medidos: gravadas ?? medicoes.length,
    confirmado: conta('confirmado'),
    divergente: conta('divergente'),
    nao_verificavel: conta('nao_verificavel'),
    medido_em: new Date().toISOString(),
  });
});
