import { diaBrasilia } from './datas';
import type { FiltrosMkt, OrigemK } from '../modules/MktCrescimento';

// O RECORTE DA PÁGINA DE MARKETING, RESOLVIDO UMA VEZ SÓ (25/11/2026).
//
// De onde vem: o dono, no canal do MKT, 25/11 — "preciso de filtro de data para saber qual marca
// performou… falta ligação em tudo". A barra da página montava sete filtros e entregava **um** aos
// cartões do Espelho (`periodoEspelho`, que reduz tudo a 7/30/tudo). Marca, rede, grupo, intervalo
// livre e os atalhos de 60d/90d/6m/12m não chegavam a lugar nenhum.
//
// POR QUE UM ARQUIVO E NÃO UM `if` EM CADA CARTÃO: a tradução do filtro para a consulta tem uma
// armadilha que erra calado. O `origem` DA BARRA é o dono do canal (casa, cortes, pulso, limelight).
// O `origem` DAS VIEWS (`v_mkt_analytics_peca_dia`, `v_mkt_peca_consolidada`, `v_pontualidade`) é
// QUEM MEDIU a peça (mkt, pulso, digiai_cortes lendo as MESMAS contas da casa). São duas perguntas
// com o mesmo nome. Quem escrevesse `.eq('origem', filtros.origem)` — o caminho óbvio — leria saúde
// de coleta achando que lia dono de canal, e a tela mostraria número certo para a pergunta errada.
// Aqui o grupo vira SEMPRE uma lista de marcas, e a coluna `origem` das views não é tocada.
//
// A SEGUNDA REGRA: cartão que não pode obedecer **diz o que ignorou**, na própria tela. Filtro que
// não chega é pior do que filtro que não existe — quem vê a barra acesa acredita no número.

export type Recorte = {
  de: string | null;            // null = sem limite inferior ("tudo")
  ate: string | null;           // null = até hoje
  marcas: string[] | null;      // já resolvido: a marca escolhida, as marcas do grupo, ou null = todas
  marcaUnica: string;           // '' quando o recorte é um grupo ou "tudo"
  // O GRUPO continua aqui, e não só resolvido em marcas, porque os espelhos dos motores (Pulso,
  // Limelight, blogs) são somas de MOTOR: têm `plataforma` e `dia`, não têm marca. Para eles a
  // pergunta certa não é "quais marcas", é "este motor é deste recorte?". Sem isto, escolher
  // "Lancaster" somaria as views do Pulso dentro do número da Lancaster — calado.
  origem: OrigemK;              // '' = todos os grupos
  rede: string;                 // '' = todas
  data: 'publicacao' | 'leitura';
  // QUANTOS DIAS A JANELA TEM, contados de ponta a ponta (null = tudo). Fica aqui porque três
  // cartões derivavam esse número da mesma fórmula frágil — `Date.now() - Date.parse(de)` —, que
  // depende da hora do dia e dava 29 ou 30 para a mesma janela de 30 dias.
  dias: number | null;
  rotulo: string;               // a janela em palavra, para o cartão escrever o que leu
};

const diasAtras = (n: number) => diaBrasilia(new Date(Date.now() - n * 86400000));

/** Traduz a barra para um recorte. `marcasConhecidas` mapeia código → grupo; sem ela, o grupo não
 *  pode ser resolvido em marcas e é devolvido como não-obedecido pelo `aplicar`. */
export function recorteDe(
  f: FiltrosMkt,
  marcasConhecidas: Array<{ code: string; origem: OrigemK }>,
): Recorte {
  const livre = f.de !== '' && f.ate !== '' && f.de <= f.ate;
  // JANELA DE N DIAS COMEÇA N-1 DIAS ATRÁS, não N (corrigido em 26/11/2026).
  //
  // Estava `diasAtras(f.dias)`, e o corte é `>= de`, inclusive: "30 dias" lia **31**, "7 dias" lia
  // 8, e "hoje" lia **ontem e hoje**. Em 30 dias o erro era pequeno (5 peças, 142 views, medido em
  // 26/11) e passava despercebido; em "hoje" era de 100%. O dono perguntou se a tela falava a
  // verdade sobre as views do dia — não falava, e por isto.
  const de = livre ? f.de : f.dias === 0 ? null : diasAtras(Math.max(0, f.dias - 1));
  const ate = livre ? f.ate : null;
  const dias = livre
    ? Math.max(1, Math.round((Date.parse(f.ate) - Date.parse(f.de)) / 864e5) + 1)
    : f.dias === 0 ? null : f.dias;

  let marcas: string[] | null = null;
  if (f.marca) marcas = [f.marca];
  else if (f.origem) {
    const doGrupo = marcasConhecidas.filter((m) => m.origem === f.origem).map((m) => m.code);
    marcas = doGrupo.length ? doGrupo : [];      // grupo conhecido e vazio é vazio, não "todas"
  }

  const rotulo = livre
    ? `${f.de} → ${f.ate}`
    : f.dias === 0 ? 'tudo' : f.dias === 1 ? 'hoje' : `${f.dias} dias`;

  // Marca escolhida implica o grupo dela: pedir "mello" é pedir a casa, e o espelho do Pulso fica
  // fora sem que ninguém precise clicar no grupo.
  const origem: OrigemK = f.marca
    ? (marcasConhecidas.find((m) => m.code === f.marca)?.origem ?? 'casa')
    : f.origem;

  return { de, ate, marcas, marcaUnica: f.marca, origem, rede: f.rede, data: f.data, dias, rotulo };
}

/** Um motor de fora (Pulso, Limelight, blogs) entra neste recorte? Vale para fonte que soma o motor
 *  inteiro e não sabe dizer de que marca é cada linha. `exato` = o motor sabe separar a marca. */
export function motorNoRecorte(r: Recorte, grupoDoMotor: OrigemK, exato = false): boolean {
  if (r.marcaUnica && !exato) return false;      // marca específica, e o motor só sabe o total dele
  if (!r.origem) return true;
  return r.origem === grupoDoMotor;
}

/** Que colunas a view do cartão tem. O que não for declarado aqui NÃO é filtrado — e entra na lista
 *  do que a tela precisa confessar. */
export type Suporta = {
  data?: string;     // coluna de data ('data', 'dia', 'publicada_em', 'quando'…)
  marca?: string;    // coluna de marca (código, não nome)
  rede?: string;     // coluna de rede
};

/** Os quatro métodos que esta peça usa do construtor de consulta. Nada além disto. */
type Filtravel = {
  gte: (c: string, v: string) => Filtravel;
  lte: (c: string, v: string) => Filtravel;
  eq: (c: string, v: string) => Filtravel;
  in: (c: string, v: readonly string[]) => Filtravel;
};

/** Aplica o recorte ao que a view aguenta e devolve, em palavra, o que ficou de fora.
 *
 *  O genérico `T` é SOLTO de propósito, e as duas conversões abaixo são o preço disso. Amarrar
 *  `T extends Filtravel` parece mais seguro e não é: o tipo do `PostgrestFilterBuilder` se
 *  reconstrói a cada método encadeado, e o compilador estoura em TS2589 ("type instantiation is
 *  excessively deep") na primeira chamada — aconteceu aqui em 25/11. A conversão fica presa a este
 *  arquivo, e o tipo do chamador atravessa intacto. */
export function aplicar<T>(q: T, r: Recorte, s: Suporta): { q: T; ignorados: string[] } {
  const ignorados: string[] = [];
  let out = q as Filtravel;

  if (s.data) {
    if (r.de) out = out.gte(s.data, r.de);
    if (r.ate) out = out.lte(s.data, r.ate);
  } else if (r.de || r.ate) {
    ignorados.push('a data');
  }

  if (r.marcas) {
    if (s.marca) out = r.marcas.length === 1 ? out.eq(s.marca, r.marcas[0]) : out.in(s.marca, r.marcas);
    else ignorados.push('a marca');
  }

  if (r.rede) {
    if (s.rede) out = out.eq(s.rede, r.rede);
    else ignorados.push('a rede');
  }

  return { q: out as T, ignorados };
}

/** A frase do rodapé do cartão. Vazia quando o cartão obedeceu a tudo — nada a confessar, nada a ler. */
export function frasedoQueIgnorou(ignorados: string[], ondeMora = 'esta leitura'): string {
  if (ignorados.length === 0) return '';
  const lista = ignorados.length === 1
    ? ignorados[0]
    : `${ignorados.slice(0, -1).join(', ')} e ${ignorados[ignorados.length - 1]}`;
  return `${ondeMora} não separa por ${lista} — o número abaixo é de tudo`;
}

// DESDE QUANDO EXISTE LEITURA, POR REDE (medido no banco em 25/11/2026, 90 dias):
//   Instagram 09/09 · Facebook 31/10 · TikTok 14/11 · YouTube 14/11.
// Isto NÃO é detalhe de rodapé: num recorte de 90 dias, o Instagram soma 77 dias de leitura e o
// TikTok 11. Comparar as duas marcas "no mesmo período" compara, em parte, QUANDO O COLETOR FOI
// LIGADO. E como a leitura mais antiga é de 16/07/2026, "12 meses" e "tudo" devolvem o mesmo número
// que "90 dias" — foi exatamente o 298k que o dono viu repetido e leu como filtro quebrado.
//
// A tela tem de dizer isso onde o número aparece. Os valores vêm do banco (`primeiraLeituraPorRede`),
// nunca desta lista: constante envelhece em silêncio, e no dia em que o LinkedIn ligar a leitura a
// tela estaria mentindo de novo.
export const COMECO_DA_LEITURA_MEDIDO_EM = '2026-11-25';
