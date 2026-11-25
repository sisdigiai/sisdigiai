import { useEffect, useState } from 'react';
import { Trophy, ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { lerTudo } from '../../lib/paginar';
import { aplicar, type Recorte } from '../../lib/recorte';

// QUAL PEÇA DEU RESULTADO (25/11/2026).
//
// Terceiro pedido do dono no canal do MKT, 25/11. A página sabia dizer o que funciona por FORMATO e
// por GATILHO (medianas, no bloco ao lado) e não sabia dizer **qual peça**. Mediana responde "que
// tipo de coisa fazer de novo"; a lista responde "o que foi esse pico" — e as duas perguntas são
// feitas no mesmo minuto, olhando o mesmo gráfico.
//
// Fonte: `v_mkt_peca_consolidada` — uma linha por peça, com link. Medido em 25/11: 1.309 peças,
// 1.244 com data de publicação, **todas com link**, 461 publicadas nos últimos 30 dias.
//
// TRÊS RECUSAS:
//  1. **Peça apagada fica fora por padrão**, e o rodapé diz quantas foram. Ranking que lista o que
//     não está mais no ar manda o dono procurar uma peça que não existe.
//  2. **Ordenar por engajamento seria mentira hoje.** Medido em 90 dias: Instagram somou 35
//     interações em 881 leituras, TikTok 3.961 em 593. Ordenar por isso não ordenaria por
//     engajamento — ordenaria por "de qual rede a coleta lê interação". A ordem é por views, e a
//     coluna de interação mostra o que existe, em branco onde não existe.
//  3. **Retenção só onde ela é medida.** Em 90 dias há retenção em 247 leituras, todas do YouTube.
//     Coluna vazia nas outras redes é a verdade; 0% seria um juízo sobre o vídeo.

type Linha = {
  marca: string | null; rede: string; tipo: string | null; peca_ref: string;
  views: number | null; curtidas: number | null; comentarios: number | null; compartilhamentos: number | null;
  retencao_media_pct: number | null; link: string | null; dia_publicacao: string | null; apagada: boolean;
};

const n = (v: number) => v.toLocaleString('pt-BR');
const dm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');

export default function RankingDePecas({ recorte, recarga = 0 }: { recorte: Recorte; recarga?: number }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [quantas, setQuantas] = useState(10);

  const porPublicacao = recorte.data === 'publicacao';

  useEffect(() => {
    setLinhas(null);
    lerTudo<Linha>((de, ate) => {
      const base = supabase.from('v_mkt_peca_consolidada')
        .select('marca, rede, tipo, peca_ref, views, curtidas, comentarios, compartilhamentos, retencao_media_pct, link, dia_publicacao, apagada');
      // A régua da barra escolhe a coluna de data: publicação = quando saiu; leitura = quando foi
      // medida pela última vez. Mesma fonte, duas perguntas.
      const { q } = aplicar(base, recorte, {
        data: porPublicacao ? 'dia_publicacao' : 'ultima_leitura', marca: 'marca', rede: 'rede',
      });
      return q.order('views', { ascending: false, nullsFirst: false }).order('peca_ref').range(de, ate);
    }).then((l) => { setErro(null); setLinhas(l); })
      .catch((e) => { setErro(String(e?.message ?? e)); setLinhas([]); });
  }, [recorte, recarga, porPublicacao]);

  const vivas = (linhas ?? []).filter((l) => !l.apagada);
  const apagadas = (linhas ?? []).length - vivas.length;
  const medidas = vivas.filter((l) => l.views != null);
  const mostradas = medidas.slice(0, quantas);

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Trophy className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Qual peça deu resultado</span>
        <span className="font-mono text-[10px] text-muted">
          {recorte.rotulo} · {porPublicacao ? 'publicadas no recorte' : 'lidas no recorte'} · ordem por views
        </span>
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não consegui ler as peças: {erro}.</span>
        </div>
      ) : linhas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Medindo…</div>
      ) : medidas.length === 0 ? (
        <div className="px-4 py-3 text-sm text-on-surface-variant">
          Nenhuma peça com leitura neste recorte{vivas.length > 0 && ` — há ${vivas.length} peça(s), nenhuma com views coletadas`}.
        </div>
      ) : (
        <>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10 font-mono text-[9px] uppercase tracking-widest text-muted">
                <th className="px-4 py-1.5 text-left font-normal">#</th>
                <th className="px-4 py-1.5 text-left font-normal">marca</th>
                <th className="px-4 py-1.5 text-left font-normal">rede · formato</th>
                <th className="px-4 py-1.5 text-left font-normal">saiu</th>
                <th className="px-4 py-1.5 text-right font-normal">views</th>
                <th className="px-4 py-1.5 text-right font-normal">interações</th>
                <th className="px-4 py-1.5 text-right font-normal">retenção</th>
                <th className="px-4 py-1.5 text-right font-normal">peça</th>
              </tr>
            </thead>
            <tbody>
              {mostradas.map((l, i) => {
                const temInter = l.curtidas != null || l.comentarios != null || l.compartilhamentos != null;
                const inter = (l.curtidas ?? 0) + (l.comentarios ?? 0) + (l.compartilhamentos ?? 0);
                return (
                  <tr key={l.peca_ref} className="border-b border-outline/5 last:border-b-0">
                    <td className="px-4 py-1.5 tabular-nums text-muted">{i + 1}</td>
                    <td className="px-4 py-1.5 text-on-surface">{l.marca ?? '(sem marca)'}</td>
                    <td className="px-4 py-1.5 text-on-surface-variant">{l.rede}{l.tipo ? ` · ${l.tipo}` : ''}</td>
                    <td className="px-4 py-1.5 tabular-nums text-on-surface-variant">{dm(l.dia_publicacao)}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-on-surface font-semibold">{n(l.views ?? 0)}</td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">
                      {temInter ? n(inter) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">
                      {l.retencao_media_pct != null ? `${Math.round(l.retencao_media_pct)}%` : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-4 py-1.5 text-right">
                      {l.link
                        ? <a href={l.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-secondary hover:underline">abrir<ExternalLink className="w-3 h-3" /></a>
                        : <span className="text-muted">sem link</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {medidas.length > quantas && (
            <button onClick={() => setQuantas((q) => q + 20)}
              className="w-full px-4 py-2 border-t border-outline/10 font-mono text-[10px] uppercase tracking-widest text-secondary hover:bg-surface-highest/50">
              mostrar mais ({medidas.length - quantas} restantes)
            </button>
          )}

          <div className="px-4 py-2.5 border-t border-outline/10 text-xs text-on-surface-variant">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">o que esta lista não faz</span>{' '}
            Não ordena por engajamento: medido em 90 dias, o Instagram somou <strong>35</strong> interações
            por peça e o TikTok <strong>3.961</strong> — ordenar por isso ordenaria por qual rede a coleta
            lê, não por qual peça engajou. <strong className="text-on-surface">Retenção existe só no YouTube.</strong>{' '}
            {vivas.length - medidas.length > 0 && <>{vivas.length - medidas.length} peça(s) no recorte ainda sem views coletadas ficam fora da ordem, não no fim dela. </>}
            {apagadas > 0 && <>{apagadas} peça(s) apagada(s) ficam fora da lista. </>}
            Gatilho e formato de campanha não estão nesta fonte — pedido aberto ao MKT em 25/11.
          </div>
        </>
      )}
    </section>
  );
}
