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
