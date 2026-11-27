// Ler tudo, não as primeiras mil linhas.
//
// A API corta QUALQUER resposta em 1.000 linhas, por mais que o `.limit()` peça mais — e devolve isso
// como sucesso. Nenhuma tela tem como perceber: mil linhas é uma resposta boa.
//
// Já custou dois defeitos nesta casa. Na Lousa, em 17/11, a semana aparecia com 95 das 182 peças e
// nenhuma das 130 que vêm do Pulso e do Limelight, porque entram no fim da união. No Radar 360, em
// 19/11, as 130 publicações mais antigas (de 1.130) não chegavam, 99 peças perdiam a data de
// publicação e entravam no recorte de 30 dias pela primeira leitura: **15.264 views a mais**.
//
// `lerTudo` pede em páginas de mil até vir uma página incompleta. O teto existe para a função não
// virar laço infinito se a API mudar de comportamento — e, se bater nele, a tela que chamou precisa
// dizer que leu só uma parte, nunca fingir que leu tudo.
//
// ERRO NÃO VIRA LISTA VAZIA (corrigido em 19/11, às 20h30, antes de espalhar). A primeira versão
// desta função lia `{ data }` e ignorava `{ error }`: leitura que falhava devolvia `[]`, e a tela
// mostrava "nenhuma peça" com cara de verdade medida. Era o mesmo pecado do teto — falha silenciosa
// com aspecto de sucesso — escrito dentro do conserto do teto. Agora ela **levanta** o erro, e quem
// chama decide: mostrar o erro na tela ou deixar estourar.
// DESEMPATE OBRIGATÓRIO (19/11, 20h50 — aviso do Lumina pelo Geral). Cada página é uma CONSULTA
// NOVA. Se a ordem não for total, o banco pode devolver as linhas empatadas em ordem diferente entre
// uma página e outra: linha repetida numa, sumida na outra, sem erro nenhum. Não é teoria — medido
// em 19/11 no próprio banco: `v_mkt_analytics_peca_dia` tem 1.128 linhas e **1.124 empatam** na data
// (52 valores distintos para mil e cem linhas), e a `v_lousa` tem 1.112 de 1.467 empatadas no
// `quando` (muita peça marcada para as 09:30).
//
// Então toda chamada ordena pela ordem que a tela quer E **termina numa chave única**: `id` quando
// existe, e nas views o conjunto de colunas que identifica a linha. Se a view não tiver chave única
// nenhuma — caso da `v_pontualidade`, onde um par de linhas é idêntico em TODAS as colunas — ordenar
// por quase todas basta: trocar uma linha por outra idêntica não muda resultado nenhum.
export const PAGINA = 1000;

export async function lerTudo<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null; error?: { message: string } | null }>,
  teto = 20000,
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; de < teto; de += PAGINA) {
    const { data, error } = await pagina(de, de + PAGINA - 1);
    if (error) throw new Error(error.message);
    const lote = (data ?? []) as T[];
    todas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return todas;
}

// ─────────────────────────────────────────────────────────────────────────────
// LER UMA RPC INTEIRA (27/11/2026). A `fn_mkt_ganho_janela` devolve o ganho já calculado pelo banco
// — 394 ms a frio contra 12,6 s de ler a medição inteira e fazer a diferença aqui. Mas ela cai no
// MESMO teto de mil linhas das views, **e o cabeçalho `Range` não funciona em RPC**: medido hoje,
// `Range: 1000-1999` devolveu `content-range: 0-999/*` com a mesma primeira peça, e um laço paginando
// por Range trouxe 21 mil linhas com mil chaves distintas — a mesma página, 21 vezes. Com
// `Prefer: count=exact` o servidor disse `0-999/1910`: 910 peças sumiriam caladas, 48% delas.
//
// O que funciona é `?limit=&offset=` na query, e é por aí que esta função lê. `order` explícito não é
// enfeite: sem ordem total, páginas por offset podem repetir e perder linha entre chamadas.
//
// Pedi ao MKT `p_limit`/`p_offset` na própria função, porque depender do PostgREST aceitar offset em
// RPC é a mesma fragilidade de depender do Range — funciona até parar, e quando parar some com peça
// sem erro nenhum. Quando existirem, esta função troca de caminho e o resto da tela não muda.
// 14h20: o MKT pôs `p_limit` e `p_offset` na própria função (migration 20261127_06), com a ordem
// fixada por dentro. É o caminho certo e esta função passou a usá-lo: o corte agora é argumento, não
// comportamento do PostgREST. Conferido que as duas páginas trazem peças diferentes — 1.000 e 910,
// 1.910 ao todo, sem repetição.
export async function lerRpcTudo<T>(
  url: string, anon: string, token: string, fn: string,
  args: Record<string, unknown>, teto = 40000,
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; de < teto; de += PAGINA) {
    const r = await fetch(`${url}/rest/v1/rpc/${fn}`, {
      method: 'POST',
      headers: { apikey: anon, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...args, p_limit: PAGINA, p_offset: de }),
    });
    if (!r.ok) throw new Error(`${fn}: HTTP ${r.status} ${(await r.text()).slice(0, 120)}`);
    const lote = (await r.json()) as T[];
    todas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return todas;
}
