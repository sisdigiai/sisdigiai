import { useEffect, useState } from 'react';
import { Trophy, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

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

export default function OQueFunciona() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rede, setRede] = useState<string | null>(null);
  const [recorte, setRecorte] = useState<string>('tipo');

  useEffect(() => {
    supabase.from('v_mkt_resultado_recorte')
      .select('recorte, valor, rede_recorte, pecas, redes, lidas, com_views, views_mediana, views_p90, views_melhor, com_alcance, alcance_mediana, engaj_confiaveis, engaj_mediana, engaj_melhor, serve_de_base, mistura_redes')
      .limit(2000)
      .then(({ data, error }) => {
        if (error) { setErro(error.message); setLinhas([]); return; }
        const todas = (data ?? []) as Linha[];
        setLinhas(todas);
        // a rede que abre é a que tem mais leitura, não a primeira do alfabeto: abrir numa rede sem
        // dado faz o bloco parecer vazio quando o vazio é só daquela rede.
        const porRede = new Map<string, number>();
        for (const l of todas) if (l.rede_recorte) porRede.set(l.rede_recorte, (porRede.get(l.rede_recorte) ?? 0) + l.com_views);
        setRede([...porRede.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null);
      });
  }, []);

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
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não consegui ler o resultado por recorte: {erro}.</span>
        </div>
      ) : linhas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
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
