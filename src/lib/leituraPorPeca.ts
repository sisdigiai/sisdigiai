// Uma peça, uma leitura: a última que foi medida.
//
// POR QUE ISTO EXISTE (medido em 19/11/2026, ao conferir dois defeitos que o dono apontou no Radar 360):
// `mkt.leitura_dia` guarda o ACUMULADO de cada peça no dia em que ela foi lida, não a diferença do dia.
// Somar as linhas diárias conta a mesma view tantas vezes quantas a peça foi lida.
//
// A prova, no banco: a peça `001b54de` no TikTok tem **95 views em 18/11 e 103 em 19/11**; outra tem
// **12 e depois 74**. São 51 peças com mais de uma leitura. Somando todas as linhas dava **48.204**
// views; a última leitura de cada peça dá **45.885**. Eram 2.319 views a mais — 5% — no cartão
// "Leituras do conteúdo" desde 17/11.
//
// A REGRA, agora num lugar só: o valor de uma peça é a leitura mais recente dela. Peça é identificada
// por origem + conta + rede + peca_ref, porque o mesmo corte sai em várias contas e cada conta tem a
// sua audiência.
//
// UMA RECUSA: campo não medido na última leitura não vira zero nem apaga o que já se mediu. Cada número
// é o **mais recente que existe** — se a coleta de hoje falhou nas curtidas e a de ontem tinha, vale a
// de ontem. Trocar isso por "a última linha inteira" apagaria medição boa por causa de uma coleta
// parcial, que é exatamente o erro de ler metade e chamar de tudo.

export type LeituraDeDia = {
  origem: string;
  rede: string;
  peca_ref: string;
  data: string;
  conta?: string | null;
  views?: number | null;
  curtidas?: number | null;
  comentarios?: number | null;
  compartilhamentos?: number | null;
  retencao_media_pct?: number | null;
  horas_exibicao?: number | null;
};

export type PecaLida<T> = T & { leituras: number; primeira_data: string };

const CAMPOS = ['views', 'curtidas', 'comentarios', 'compartilhamentos', 'retencao_media_pct', 'horas_exibicao'] as const;

export const chaveDaPeca = (l: LeituraDeDia) => `${l.origem}|${l.conta ?? ''}|${l.rede}|${l.peca_ref}`;

export function ultimaLeituraPorPeca<T extends LeituraDeDia>(linhas: T[]): PecaLida<T>[] {
  const grupos = new Map<string, T[]>();
  for (const l of linhas) {
    const k = chaveDaPeca(l);
    const atual = grupos.get(k);
    if (atual) atual.push(l); else grupos.set(k, [l]);
  }
  return [...grupos.values()].map((ls) => {
    const ord = [...ls].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
    const peca = { ...ord[ord.length - 1], leituras: ord.length, primeira_data: ord[0].data } as PecaLida<T>;
    for (const campo of CAMPOS) {
      for (let i = ord.length - 1; i >= 0; i--) {
        const v = (ord[i] as Record<string, unknown>)[campo];
        if (v != null) { (peca as Record<string, unknown>)[campo] = v; break; }
      }
    }
    return peca;
  });
}

export const somarCampo = <T extends LeituraDeDia>(pecas: PecaLida<T>[], campo: typeof CAMPOS[number]) =>
  pecas.reduce((a, p) => {
    const v = (p as Record<string, unknown>)[campo];
    return a + (typeof v === 'number' ? v : 0);
  }, 0);

export const pecasMedidas = <T extends LeituraDeDia>(pecas: PecaLida<T>[], campo: typeof CAMPOS[number]) =>
  pecas.filter((p) => (p as Record<string, unknown>)[campo] != null).length;

// ─────────────────────────────────────────────────────────────────────────────
// O GANHO DE UMA JANELA (27/11/2026). Mora aqui, e não em cada tela, pela mesma razão que a
// consolidação mora: duas telas com a mesma pergunta e contas diferentes é o defeito que esta casa
// já pagou três vezes.
//
// Views de rede são ACUMULADO DE VIDA. Para dizer "quanto rendeu no período" só há três respostas
// possíveis, e a terceira é a honesta:
//   1. a peça tem leitura ANTES da janela → ganho = leitura de dentro menos a de antes;
//   2. a peça NASCEU na janela (registro de publicação de verdade) → ganho = tudo que acumulou;
//   3. a peça é mais velha e só foi lida agora, **mas foi lida duas vezes dentro da janela** → ganho
//      PARCIAL: a diferença entre a primeira e a última leitura de dentro. Cobre só o pedaço da
//      janela em que houve medição, e isso tem de ser dito — mas é medido, e medido não se descarta;
//   4. a peça é mais velha e tem uma leitura só → **desconhecido**. Não se sabe quanto ela já tinha
//      quando a janela começou, e inventar é o erro que a régua dos números proíbe (R2 e R6 em
//      Cockpit/Harness/regua-dos-numeros.md).
//
// A data de publicação ESTIMADA (a que nasce da 1ª leitura quando não há registro) NÃO serve para o
// caso 2: ela diz "nasceu quando eu vi", que é circular. Quem só tem data estimada cai no caso 3.
export type GanhoDaPeca<T> = {
  /** A última leitura DENTRO da janela — o acervo da peça no fim do recorte. */
  dentro: PecaLida<T>;
  /** O que entrou na janela. `null` = desconhecido (caso 3). */
  ganho: number | null;
  origem: 'diferenca' | 'nasceu_na_janela' | 'parcial' | 'desconhecido';
  /** Só no caso `parcial`: desde quando a medição cobre, para a tela poder dizer. */
  desde?: string;
};

export function ganhoNaJanela<T extends LeituraDeDia>(
  linhas: T[],
  corte: string,
  nasceuNaJanela: (chave: string) => boolean,
): Array<GanhoDaPeca<T>> {
  const grupos = new Map<string, T[]>();
  for (const l of linhas) {
    const k = chaveDaPeca(l);
    const a = grupos.get(k);
    if (a) a.push(l); else grupos.set(k, [l]);
  }
  const saida: Array<GanhoDaPeca<T>> = [];
  for (const [chave, ls] of grupos) {
    const naJanela = ls.filter((l) => l.data >= corte);
    if (naJanela.length === 0) continue;
    const dentro = ultimaLeituraPorPeca(naJanela)[0];
    const antes = ls.filter((l) => l.data < corte).pop();
    if (antes != null && antes.views != null && dentro.views != null) {
      // Sem clamp: peça que PERDE view (post apagado, correção da rede) entra negativa. Aparar para
      // zero infla o total e esconde o que aconteceu.
      saida.push({ dentro, ganho: dentro.views - antes.views, origem: 'diferenca' });
    } else if (nasceuNaJanela(chave) && dentro.views != null) {
      saida.push({ dentro, ganho: dentro.views, origem: 'nasceu_na_janela' });
    } else if (naJanela.length >= 2 && dentro.views != null) {
      const ord = [...naJanela].sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : 0));
      const primeira = ord.find((l) => l.views != null);
      if (primeira != null && primeira.data !== dentro.data) {
        saida.push({ dentro, ganho: dentro.views - primeira.views!, origem: 'parcial', desde: primeira.data });
      } else {
        saida.push({ dentro, ganho: null, origem: 'desconhecido' });
      }
    } else {
      saida.push({ dentro, ganho: null, origem: 'desconhecido' });
    }
  }
  return saida;
}
