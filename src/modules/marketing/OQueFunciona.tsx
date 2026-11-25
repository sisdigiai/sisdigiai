import { useEffect, useState } from 'react';
import { Trophy, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Recorte } from '../../lib/recorte';

// "O que funciona" — o bloco que faltava. O dono, 18/11: "mostra o que saiu e bem pouco o que funciona".
//
// A TELA MOSTRAVA O QUE SAIU PORQUE ERA O ÚNICO DADO INTEIRO. O resultado existe por peça desde 16/07
// (770 peças), mas a view que a tela lia entregava só `engajamento` — a coluna com menos dado — e
// calculava **média**. Com uma peça de 11.333 views no meio de medianas de 14, média descreve a peça
// viral, não o trabalho. Aqui é sempre **mediana, p90 e o tamanho da base**, juntos.
//
// TRÊS RECUSAS DESTE BLOCO, e são elas que o tornam utilizável para decidir:
//  · **não compara réguas.** View de TikTok não é view de Instagram: uma é entregue a quem não segue,
//    a outra quase só a quem segue. O recorte vem por rede, e a linha de "todas as redes" só aparece
//    marcada como contexto.
//  · **não compara idades.** Só peça com 7 a 90 dias de vida. Peça de ontem não teve tempo de
//    performar; peça de julho acumulou meses. Peça fresca é assunto de "o que saiu", não daqui.
//  · **não conclui de base curta.** Menos de 4 leituras, o grupo aparece apagado e sem posição. Com
//    base de 2, a diferença entre primeiro e último é ruído com cara de ranking.
//
// E a mediana é calculada **só sobre a leitura que existe**. Contar peça não medida como zero foi o
// que me deu mediana 12 na primeira passada e quase me fez concluir que nada funciona.

type Linha = {
  recorte: string; valor: string; rede_recorte: string | null;
  pecas: number; redes: number; lidas: number; com_views: number;
  views_mediana: number | null; views_p90: number | null; views_melhor: number | null;
  com_alcance: number; alcance_mediana: number | null;
  engaj_confiaveis: number; engaj_mediana: number | null; engaj_melhor: number | null;
  serve_de_base: boolean; mistura_redes: boolean;
};

const RECORTES = ['tipo', 'formato', 'hora', 'dia da semana', 'marca'] as const;
const num = (n: number | null) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));

// Grupo "(sem tipo registrado)" e companhia APARECE na tabela — a peça não pode desaparecer da conta —
// mas não disputa posição nem a frase de destaque. Na primeira versão publicada ele venceu o ranking e a
// tela anunciou "(sem tipo registrado) rende 3,6× a mediana de vídeo": uma frase sem sentido nenhum, e eu
// só vi ao abrir a tela. Falta de rótulo não é característica da peça; é falta nossa.
const semRotulo = (valor: string) => valor.startsWith('(sem ');

// ESTE BLOCO NÃO OBEDECE À BARRA, E DIZ ISSO (25/11/2026).
//
// `v_mkt_resultado_recorte` tem recorte, valor, medianas e p90 — **não tem data, nem marca, nem
// rede** (a coluna `rede_recorte` é o rótulo do corte, não um filtro de rede). Medido no banco em
// 25/11. A janela dela é fixa na própria view: peça com 7 a 90 dias.
//
// Então o prop `janela` não filtra nada aqui — serve só para o selo dizer, na cara de quem olha,
// que o recorte escolhido não chegou. O MKT ofereceu em 25/11 fazer a versão com data; pedido
// aberto. Até lá, confessar é a única coisa honesta a fazer.
//
// (O estado `recorte` lá embaixo é outra coisa: é a DIMENSÃO do corte — tipo, gatilho, hora.
// Por isso o prop entra como `janela`.)
export default function OQueFunciona({ recorte: janela, recarga = 0 }: { recorte: Recorte; recarga?: number }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rede, setRede] = useState<string | null>(null);
  const [recorte, setRecorte] = useState<string>('tipo');

  // 25/11, tarde: o MKT publicou `fn_mkt_resultado_recorte(p_de, p_ate, p_marca, p_rede)` e este bloco
  // deixou de ser cego. Conferido por mim no banco antes de ligar: função **invoker**, `anon` sem
  // execute, `authenticated` com; sem parâmetro devolve as mesmas 138 linhas da view.
  //
  // DUAS COISAS QUE A FUNÇÃO NÃO FAZ, e que a tela diz em vez de esconder:
  //  · `p_marca` é UMA marca. Escolher um GRUPO (casa, cortes…) não dá — o bloco avisa e mostra tudo.
  //  · esta análise só existe para Instagram e Facebook. Medido: instagram 102 linhas, facebook 68,
  //    **youtube 0, tiktok 0**. Com TikTok escolhido o bloco vem vazio, e vazio sem explicação parece
  //    coleta quebrada — por isso a frase.
  const grupoSemMarca = !!janela.marcas && janela.marcas.length > 1;

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.rpc('fn_mkt_resultado_recorte', {
        p_de: janela.de, p_ate: janela.ate,
        p_marca: janela.marcaUnica || null,
        p_rede: janela.rede || null,
      });
      if (error) throw new Error(error.message);
      return (data ?? []) as Linha[];
    })()
      .then((todas) => {
        setLinhas(todas);
        // a rede que abre é a que tem mais leitura, não a primeira do alfabeto: abrir numa rede sem
        // dado faz o bloco parecer vazio quando o vazio é só daquela rede.
        const porRede = new Map<string, number>();
        for (const l of todas) if (l.rede_recorte) porRede.set(l.rede_recorte, (porRede.get(l.rede_recorte) ?? 0) + l.com_views);
        setRede([...porRede.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
      })
      .catch((e) => { setErro(String(e?.message ?? e)); setLinhas([]); });
  }, [janela, recarga]);

  const redes = [...new Set((linhas ?? []).map((l) => l.rede_recorte).filter((r): r is string => !!r))].sort();
  const mostradas = (linhas ?? [])
    .filter((l) => l.recorte === recorte && (rede === '__todas' ? l.rede_recorte === null : l.rede_recorte === rede))
    .sort((a, b) => (b.views_mediana ?? -1) - (a.views_mediana ?? -1));
  const comBase = mostradas.filter((l) => l.serve_de_base && !semRotulo(l.valor));
  const melhor = comBase[0];
  const pior = comBase.length > 1 ? comBase[comBase.length - 1] : null;

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Trophy className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">O que funciona</span>
        <span className="font-mono text-[10px] text-muted">
          peça com 7 a 90 dias · mediana sobre a leitura que existe, nunca sobre peça não medida
        </span>
        {grupoSemMarca && (
          <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-warning border border-warning/40 bg-warning/10 px-1.5 py-px"
                title="fn_mkt_resultado_recorte recebe UMA marca, não um grupo; escolha uma marca para recortar este bloco">
            grupo não recorta aqui
          </span>
        )}
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não consegui ler o resultado por recorte: {erro}.</span>
        </div>
      ) : linhas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
      ) : linhas.length === 0 ? (
        /* Vazio sem explicação parece coleta quebrada e manda consertar o que não está quebrado.
           Medido em 25/11: esta análise tem 102 linhas de Instagram e 68 de Facebook, e ZERO de
           TikTok e YouTube — a mediana por formato e gatilho só existe onde a leitura por peça é
           antiga o bastante para formar base. */
        <div className="px-4 py-3 text-sm text-on-surface-variant">
          {janela.rede && !['instagram', 'facebook'].includes(janela.rede)
            ? <>Esta análise não existe para <strong>{janela.rede}</strong>. Hoje ela só tem base no Instagram e no Facebook — nas outras redes a leitura por peça é nova demais para formar mediana. Tire a rede da barra para ver o que há.</>
            : <>Nenhuma peça com leitura suficiente neste recorte. A análise usa peça com <strong>7 a 90 dias</strong>: recorte mais curto que isso vem vazio por construção.</>}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-2 flex-wrap px-4 py-2 border-b border-outline/10">
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted">rede</span>
            {[...redes, '__todas'].map((r) => (
              <button key={r} onClick={() => setRede(r)}
                className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 border transition-colors ${
                  rede === r ? 'bg-secondary text-on-action border-secondary' : 'text-muted border-outline/25 hover:text-on-surface'}`}>
                {r === '__todas' ? 'todas (contexto)' : r}
              </button>
            ))}
            <span className="font-mono text-[10px] uppercase tracking-wider text-muted ml-3">recorte</span>
            {RECORTES.map((r) => (
              <button key={r} onClick={() => setRecorte(r)}
                className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 border transition-colors ${
                  recorte === r ? 'bg-secondary text-on-action border-secondary' : 'text-muted border-outline/25 hover:text-on-surface'}`}>
                {r}
              </button>
            ))}
          </div>

          {rede === '__todas' && (
            <div className="px-4 py-2 border-b border-outline/10 flex items-start gap-2">
              <AlertTriangle className="w-3.5 h-3.5 text-warning shrink-0 mt-0.5" />
              <span className="text-xs text-on-surface-variant">
                Esta leitura soma redes diferentes na mesma mediana. View de TikTok não é view de Instagram —
                serve de contexto, não para decidir. Escolhe uma rede acima.
              </span>
            </div>
          )}

          {mostradas.length === 0 ? (
            <div className="px-4 py-3 text-sm text-on-surface-variant">
              Nenhuma peça medida neste recorte {rede && rede !== '__todas' ? `no ${rede}` : ''} nos últimos 90 dias.
            </div>
          ) : (
            <>
              {melhor && pior && melhor.views_mediana != null && pior.views_mediana != null && pior.views_mediana > 0 && (
                <div className="px-4 py-2.5 border-b border-outline/10">
                  <p className="text-sm text-on-surface">
                    Em <span className="font-semibold">{rede}</span>, por {recorte}:{' '}
                    <span className="font-semibold text-success">{melhor.valor}</span> rende{' '}
                    <span className="font-mono tabular-nums">
                      {(melhor.views_mediana / pior.views_mediana).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}×
                    </span>{' '}
                    a mediana de <span className="font-semibold">{pior.valor}</span>
                    {' '}({num(melhor.views_mediana)} contra {num(pior.views_mediana)} views, base de{' '}
                    {melhor.com_views} e {pior.com_views} peças lidas).
                  </p>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline/10 text-left">
                      <th className="px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted">{recorte}</th>
                      <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted text-right">views mediana</th>
                      <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted text-right">p90</th>
                      <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted text-right">melhor</th>
                      <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted text-right">interação mediana</th>
                      <th className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted text-right">base</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mostradas.map((l) => {
                      const fraca = !l.serve_de_base;
                      const posicao = comBase.indexOf(l);
                      return (
                        <tr key={`${l.recorte}|${l.valor}`} className={`border-b border-outline/5 ${fraca || semRotulo(l.valor) ? 'opacity-50' : ''}`}>
                          <td className="px-4 py-2">
                            <span className="font-mono text-[10px] text-muted tabular-nums mr-2">
                              {posicao < 0 ? '—' : `${posicao + 1}º`}
                            </span>
                            <span className={posicao === 0 ? 'font-semibold text-on-surface' : 'text-on-surface-variant'}>{l.valor}</span>
                            {semRotulo(l.valor) && (
                              <div className="font-mono text-[9px] text-muted leading-tight">não entra na comparação: falta de rótulo não é característica da peça</div>
                            )}
                          </td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-on-surface">{num(l.views_mediana)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">{num(l.views_p90)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-muted">{num(l.views_melhor)}</td>
                          <td className="px-3 py-2 text-right font-mono tabular-nums text-on-surface-variant">
                            {l.engaj_confiaveis === 0 ? <span className="text-muted">não medida</span> : num(l.engaj_mediana)}
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-[10px] tabular-nums text-muted">
                            {l.com_views} de {l.pecas}
                            {fraca && <span className="text-warning"> · base curta</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="px-4 py-2 border-t border-outline/10">
                <span className="font-mono text-[10px] text-muted">
                  grupo com menos de 4 peças lidas aparece apagado e sem posição · "melhor" é a peça mais vista do grupo,
                  e uma peça viral não muda a mediana, que é o ponto dela
                </span>
              </div>
            </>
          )}
        </>
      )}
    </section>
  );
}
