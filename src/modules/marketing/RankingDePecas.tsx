import { useEffect, useState } from 'react';
import { Trophy, ExternalLink, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { lerTudo } from '../../lib/paginar';
import { aplicar, type Recorte } from '../../lib/recorte';

// QUAL PEÇA DEU RESULTADO (25/11/2026).
//
// Terceiro pedido do dono no canal do MKT, 25/11, com a lista de campos dita por ele: "views,
// engajamento, compartilhamentos, retenção no YouTube, com marca, rede, formato e gatilho, e link
// para a peça". A página sabia responder por FORMATO e por GATILHO em mediana (bloco ao lado) e não
// sabia dizer **qual peça**. Mediana responde "que tipo de coisa repetir"; a lista responde "o que
// foi esse pico" — e as duas perguntas se fazem no mesmo minuto, olhando o mesmo gráfico.
//
// A FONTE É `v_mkt_resultado_peca`, e a escolha dela corrigiu um erro meu do mesmo dia. Eu tinha
// escrito este bloco sobre `v_mkt_peca_consolidada` e mandado ao MKT um pedido de coluna para
// gatilho e formato — que **já existiam**. Medido em 25/11: `v_mkt_resultado_peca` tem 1.364 peças,
// todas com link e com as três datas, `tema` em 503 e `formato` em 512, mais `alcance`,
// `retencao_pct` e — o que mais importa — as travas de confiança já prontas:
// `lida`, `engajamento_confiavel` (1.035) e `alcance_e_fornecido` (890). Pedir coluna que existe
// custa o tempo de outro agente; medir primeiro custa uma consulta.
//
// TRÊS RECUSAS, e as três são da fonte, não minhas:
//  1. **Engajamento só onde a própria view diz que é confiável.** Mostrar o número onde
//     `engajamento_confiavel` é falso seria publicar um número que a casa já sabe que não presta.
//  2. **Alcance só onde a rede fornece** (`alcance_e_fornecido`). Em branco não é zero.
//  3. **A ordem é por views, nunca por engajamento.** Medido em 90 dias: Instagram somou 35
//     interações por peça e TikTok 3.961 — ordenar por engajamento ordenaria por qual rede a coleta
//     lê, não por qual peça engajou.

type Linha = {
  marca: string | null; marca_nome: string | null; rede: string; tipo: string | null;
  formato: string | null; tema: string | null; peca: string; link: string | null;
  dia: string | null; views: number | null; alcance: number | null; engajamento: number | null;
  compartilhamentos: number | null; retencao_pct: number | null;
  lida: boolean; engajamento_confiavel: boolean; alcance_e_fornecido: boolean;
};

const n = (v: number) => v.toLocaleString('pt-BR');
const dm = (iso: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '—');
const Vazio = ({ txt = '—' }: { txt?: string }) => <span className="text-muted">{txt}</span>;

export default function RankingDePecas({ recorte, recarga = 0 }: { recorte: Recorte; recarga?: number }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [quantas, setQuantas] = useState(10);

  const porPublicacao = recorte.data === 'publicacao';

  useEffect(() => {
    setLinhas(null);
    setQuantas(10);
    lerTudo<Linha>((de, ate) => {
      const base = supabase.from('v_mkt_resultado_peca')
        .select('marca, marca_nome, rede, tipo, formato, tema, peca, link, dia, views, alcance, engajamento, compartilhamentos, retencao_pct, lida, engajamento_confiavel, alcance_e_fornecido');
      // A régua da barra escolhe a coluna de data: publicação = o dia em que saiu; leitura = quando
      // foi medida. Mesma fonte, duas perguntas — e foi a confusão entre as duas que produziu o
      // 168k × 41,8k de 20/11, quando duas telas chamavam as duas coisas de "no período".
      const { q } = aplicar(base, recorte, {
        data: porPublicacao ? 'dia' : 'coletado_em', marca: 'marca', rede: 'rede',
      });
      return q.order('views', { ascending: false, nullsFirst: false }).order('peca').range(de, ate);
    }).then((l) => { setErro(null); setLinhas(l); })
      .catch((e) => { setErro(String(e?.message ?? e)); setLinhas([]); });
  }, [recorte, recarga, porPublicacao]);

  const todas = linhas ?? [];
  const medidas = todas.filter((l) => l.views != null);
  const mostradas = medidas.slice(0, quantas);
  const semLeitura = todas.length - medidas.length;
  const semGatilho = medidas.filter((l) => !l.tema).length;

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Trophy className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Qual peça deu resultado</span>
        <span className="font-mono text-[10px] text-muted">
          {recorte.rotulo} · {porPublicacao ? 'publicadas no recorte' : 'lidas no recorte'} · ordem por views <strong className="text-on-surface">acumuladas de vida</strong>
        </span>
        {/* O RANKING É POR ACERVO, E ISSO PRECISA ESTAR ESCRITO (27/11/2026). `v_mkt_resultado_peca`
            traz o acumulado de vida de cada peça; não existe ranking por GANHO enquanto o Instagram e
            o Facebook forem lidos uma vez só (1,2 leitura por peça, medido em 27/11). Numa janela
            curta a ordem favorece peça velha, e quem olha precisa saber disso.
            Régua: Cockpit/Harness/regua-dos-numeros.md */}
        <span className="font-mono text-[9px] text-muted">peça mais antiga tende a vir na frente</span>
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
          Nenhuma peça com leitura neste recorte
          {todas.length > 0 && ` — há ${todas.length} peça(s), nenhuma com views coletadas`}.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/10 font-mono text-[9px] uppercase tracking-widest text-muted">
                  <th className="px-3 py-1.5 text-left font-normal">#</th>
                  <th className="px-3 py-1.5 text-left font-normal">marca</th>
                  <th className="px-3 py-1.5 text-left font-normal">rede · formato</th>
                  <th className="px-3 py-1.5 text-left font-normal">gatilho</th>
                  <th className="px-3 py-1.5 text-left font-normal">saiu</th>
                  <th className="px-3 py-1.5 text-right font-normal">views</th>
                  <th className="px-3 py-1.5 text-right font-normal">alcance</th>
                  <th className="px-3 py-1.5 text-right font-normal">engaj.</th>
                  <th className="px-3 py-1.5 text-right font-normal">compart.</th>
                  <th className="px-3 py-1.5 text-right font-normal">retenção</th>
                  <th className="px-3 py-1.5 text-right font-normal">peça</th>
                </tr>
              </thead>
              <tbody>
                {mostradas.map((l, i) => (
                  <tr key={l.peca} className="border-b border-outline/5 last:border-b-0">
                    <td className="px-3 py-1.5 tabular-nums text-muted">{i + 1}</td>
                    <td className="px-3 py-1.5 text-on-surface whitespace-nowrap">{l.marca_nome ?? l.marca ?? '(sem marca)'}</td>
                    <td className="px-3 py-1.5 text-on-surface-variant whitespace-nowrap">
                      {l.rede}{(l.formato ?? l.tipo) ? ` · ${l.formato ?? l.tipo}` : ''}
                    </td>
                    {/* Gatilho em branco é falta de rótulo nossa, não característica da peça —
                        por isso "sem rótulo", e não um traço que parece ausência de dado. */}
                    <td className="px-3 py-1.5 text-on-surface-variant max-w-[14rem] truncate" title={l.tema ?? undefined}>
                      {l.tema ?? <Vazio txt="sem rótulo" />}
                    </td>
                    <td className="px-3 py-1.5 tabular-nums text-on-surface-variant">{dm(l.dia)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-on-surface font-semibold">{n(l.views ?? 0)}</td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-on-surface-variant">
                      {l.alcance_e_fornecido && l.alcance != null ? n(l.alcance) : <Vazio txt="a rede não dá" />}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-on-surface-variant">
                      {l.engajamento_confiavel && l.engajamento != null ? n(l.engajamento) : <Vazio txt="sem prova" />}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-on-surface-variant">
                      {l.compartilhamentos != null ? n(l.compartilhamentos) : <Vazio />}
                    </td>
                    <td className="px-3 py-1.5 text-right tabular-nums text-on-surface-variant">
                      {l.retencao_pct != null ? `${Math.round(l.retencao_pct)}%` : <Vazio />}
                    </td>
                    <td className="px-3 py-1.5 text-right">
                      {l.link
                        ? <a href={l.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-secondary hover:underline">abrir<ExternalLink className="w-3 h-3" /></a>
                        : <Vazio txt="sem link" />}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {medidas.length > quantas && (
            <button onClick={() => setQuantas((q) => q + 20)}
              className="w-full px-4 py-2 border-t border-outline/10 font-mono text-[10px] uppercase tracking-widest text-secondary hover:bg-surface-highest/50">
              mostrar mais ({medidas.length - quantas} restantes)
            </button>
          )}

          <div className="px-4 py-2.5 border-t border-outline/10 text-xs text-on-surface-variant">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">o que esta lista não faz</span>{' '}
            <strong className="text-on-surface">Não ordena por engajamento.</strong> Medido em 90 dias, o
            Instagram somou 35 interações por peça e o TikTok 3.961 — ordenar por isso ordenaria por qual
            rede a coleta lê, não por qual peça engajou. Engajamento e alcance aparecem só onde a própria
            fonte os dá por confiáveis (<code className="font-mono text-[10px]">engajamento_confiavel</code>,{' '}
            <code className="font-mono text-[10px]">alcance_e_fornecido</code>); onde não, fica escrito o motivo,
            nunca zero. <strong className="text-on-surface">Retenção só no YouTube, e alcance só no Instagram e no
            Facebook — porque as outras redes não entregam</strong>, não porque a casa deixou de coletar: a API do
            TikTok devolve views e interações e nada de tempo assistido, e a de Analytics do YouTube não tem alcance
            por vídeo (MKT, 25/11/2026). Coluna vazia aqui é limite da rede, não tarefa pendente.{' '}
            {semLeitura > 0 && <>{semLeitura} peça(s) do recorte ainda sem views coletadas ficam fora da ordem, não no fim dela. </>}
            {semGatilho > 0 && <>{semGatilho} das mostradas estão <strong>sem rótulo de gatilho</strong> — isso é falta nossa de marcação, não característica da peça.</>}
          </div>

          {/* ATÉ ONDE ESTA LISTA PODE CHEGAR (25/11/2026).
              O dono cobrou a UTM por peça ao MKT hoje, para a lista deixar de ordenar por view e
              passar a ordenar por gente que chegou. O MKT respondeu em que redes o link é clicável,
              e medi o que isso significa no que a casa publica. O número é grande o bastante para
              ficar escrito aqui: mesmo com o carimbo, a maior parte da audiência continua fora. */}
          <div className="px-4 py-2.5 border-t border-outline/10 text-xs text-on-surface-variant">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">por que isto ainda é view, e não cliente</span>{' '}
            Nenhuma peça sai hoje com etiqueta de origem, então não há como dizer qual delas trouxe lead
            ou venda. A etiqueta foi cobrada ao MKT em 25/11. Mas <strong className="text-on-surface">ela
            não vai alcançar tudo</strong>: o link só é clicável em post do Facebook, vídeo longo do
            YouTube, LinkedIn, X, WhatsApp, Google Meu Negócio e Pinterest. No feed e no Reels do
            Instagram, no TikTok e nos Shorts, não é — e esses são, medidos em 90 dias,{' '}
            <strong className="text-on-surface">647 das 876 peças e 78% das views da casa</strong>.
            Lá a pergunta "qual peça trouxe" vai continuar sem resposta por peça; o que dá é por conta
            e por dia. Quem decidir orçamento por este bloco precisa saber disso.
          </div>
        </>
      )}
    </section>
  );
}
