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
export const PAGINA = 1000;

export async function lerTudo<T>(
  pagina: (de: number, ate: number) => PromiseLike<{ data: T[] | null }>,
  teto = 20000,
): Promise<T[]> {
  const todas: T[] = [];
  for (let de = 0; de < teto; de += PAGINA) {
    const { data } = await pagina(de, de + PAGINA - 1);
    const lote = (data ?? []) as T[];
    todas.push(...lote);
    if (lote.length < PAGINA) break;
  }
  return todas;
}
