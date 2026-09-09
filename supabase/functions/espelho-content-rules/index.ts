// espelho-content-rules — serve as travas de marca ao Limelight, por rota gateada
// ============================================================================
// ⚠ ESCRITA E NÃO PUBLICADA. Aguarda o "pode" do dono e o segredo digitado por
//    ele nos dois projetos. Portão 71.
//
// POR QUE EXISTE: a edge `gerar-roteiro` do Limelight lia `v_espelho_content_rules`
// com a ANON KEY DO DIGIAI. Desde 08/09 aquela view não responde a anon, e a
// função está quebrada há 72h — fail-closed correto, ZERO reclamações, porque
// ninguém olhava esse caminho. Contrato entre projetos por anon key é contrato
// público; passa a ser por rota com segredo próprio.
//
// ESCOPO: uma view, uma marca por chamada. Medido no consumidor — a `gerar-roteiro`
// lê SÓ `v_espelho_content_rules`, filtrada por `brand_code`.
// ============================================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_ROLE = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const SEGREDO = Deno.env.get('CONTENT_RULES_LIMELIGHT_SECRET') ?? '';

// Allowlist do `universo`. ESPELHA a do consumidor (`UNIVERSO_PERMITIDO` em
// gerar-roteiro), e é por isso que a resposta declara o que omitiu — ver §OMITIDO.
// Ampliar é decisão deliberada, UMA CHAVE POR VEZ, olhando o conteúdo dela em
// TODAS as marcas antes: medido em 09/09, `universo` não tem forma única —
// seis marcas partilham um esquema e a polapetit tem outro completamente
// diferente (angulo_permitido, cores, guarda_chuva, linhas, nome, origem,
// porte_real, praca, tempo_de_casa). Uma chave nova pode trazer dado de negócio.
const UNIVERSO_PERMITIDO = ['objecoes'];

const cabecalhos = { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' };
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: cabecalhos });

// SHA-256 dos dois lados fixa o TAMANHO; a comparação byte a byte sem saída
// antecipada é o que dá tempo constante. Hash sozinho não basta — `===` entre
// hexes voltaria a sair no primeiro byte diferente.
async function sha256(s: string): Promise<Uint8Array> {
  return new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)));
}
async function segredoConfere(recebido: string): Promise<boolean> {
  const [a, b] = [await sha256(recebido), await sha256(SEGREDO)];
  let dif = a.length ^ b.length;
  for (let i = 0; i < a.length; i++) dif |= a[i] ^ b[i % b.length];
  return dif === 0;
}

Deno.serve(async (req) => {
  if (req.method !== 'GET') return json({ erro: 'metodo' }, 405);

  // 503 e NUNCA `200 []`: o fail-closed do Limelight depende de persona/tom
  // virem VAZIOS para ele recusar gerar. Um `[]` acidental o protegeria por
  // acaso — e no dia em que a causa mudasse, ele geraria roteiro sem voz de
  // marca sem erro visível. Erro tem de parecer erro.
  if (!SEGREDO) return json({ erro: 'sem_segredo_configurado' }, 503);
  if (!SUPABASE_URL || !SERVICE_ROLE) return json({ erro: 'sem_credencial' }, 503);

  const recebido = req.headers.get('x-espelho-secret') ?? '';
  if (!recebido || !(await segredoConfere(recebido))) return json({ erro: 'nao_autorizado' }, 401);

  // Escopo na própria rota: a campainha vazada não abre o catálogo inteiro.
  // Segredo não é a única defesa — sem brand_code não há resposta.
  const code = new URL(req.url).searchParams.get('brand_code')?.trim();
  if (!code) return json({ erro: 'brand_code_obrigatorio' }, 400);

  try {
    const cli = createClient(SUPABASE_URL, SERVICE_ROLE);
    const { data, error } = await cli
      .from('v_espelho_content_rules')
      // Colunas NOMEADAS. `cta_padrao` fica de fora DE PROPÓSITO: na OSI ele é
      // preço/oferta, a T1 proíbe, e lá o CTA é por temporada. Mandar o cta da
      // marca poria preço em toda temporada, inclusive nas que vendem outra coisa.
      .select('brand_code, persona, tom, publico, proibicoes, gatilhos, norte, guardrails, universo, updated_at')
      .eq('brand_code', code)
      .maybeSingle();

    if (error) {
      console.error('[espelho-content-rules] leitura falhou', error);
      return json({ erro: 'leitura_falhou' }, 503); // 503, não 200 vazio
    }
    if (!data) return json({ erro: 'marca_nao_encontrada', brand_code: code }, 404);

    const universoBruto = (data.universo ?? {}) as Record<string, unknown>;
    const universo: Record<string, unknown> = {};
    for (const k of UNIVERSO_PERMITIDO) if (k in universoBruto) universo[k] = universoBruto[k];

    // §OMITIDO — as duas allowlists (aqui e no consumidor) podem divergir, e a
    // divergência seria INVISÍVEL: o consumidor não distingue "a marca não tem
    // essa chave" de "o servidor removeu". Declarar o que ficou de fora torna a
    // divergência observável em vez de silenciosa. É metadado, não conteúdo.
    const universo_omitido = Object.keys(universoBruto).filter((k) => !(k in universo)).sort();

    const gr = (data.guardrails ?? {}) as { hard_never?: unknown };
    const norte = (data.norte ?? {}) as { pilares?: unknown };

    return json({
      brand_code: data.brand_code,
      persona: data.persona ?? null,
      tom: data.tom ?? null,
      publico: data.publico ?? null,
      proibicoes: Array.isArray(data.proibicoes) ? data.proibicoes : [],
      gatilhos: Array.isArray(data.gatilhos) ? data.gatilhos : [],
      // `norte` é NULL na polapetit — medido. Devolver [] em vez de estourar.
      norte_pilares: Array.isArray(norte.pilares) ? norte.pilares : [],
      // Mantido SEPARADO de `proibicoes` de propósito: dá para unificar (o
      // consumidor manda os dois para o mesmo lugar hoje), mas fundir aqui
      // apagaria a origem da trava. Quem lê o prompt depois não saberia se a
      // regra veio da voz da marca ou do compliance duro.
      guardrails_hard_never: Array.isArray(gr.hard_never) ? gr.hard_never : [],
      universo,
      universo_omitido,
      updated_at: data.updated_at ?? null,
    });
  } catch (e) {
    console.error('[espelho-content-rules] erro interno', e);
    return json({ erro: 'erro_interno' }, 503); // fecha, não devolve vazio
  }
});
