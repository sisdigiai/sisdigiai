import { useEffect, useState } from 'react';
import { Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { type Periodo } from './Central';
import { ultimaLeituraPorPeca, somarCampo, pecasMedidas } from '../../lib/leituraPorPeca';
import { lerTudo } from '../../lib/paginar';
import { espelhoMotoresEstado, type PulsoDia, type PulsoLongoDia, type LimePubDia, type BlogDia, type EstadoEspelho } from '../../lib/espelhoMotores';

// Leituras do conteúdo — ordem do dono em 17/11/2026: "já temos os analytics do cortes do pulso no
// próprio pulso, precisamos agora nos analíticos total no espelho do marketing".
//
// O QUE ESTA TELA RESPONDE: quantas pessoas leram/viram o que a casa publicou, somando as fontes que
// hoje se pode somar — e dizendo quais ainda não entram.
//
// TRÊS COISAS QUE ELA SE RECUSA A FAZER, e as três nasceram de medição:
//
//  1. **Somar sem saber se há sobreposição.** O `v_mkt_analytics_peca_dia` traz 68 peças com
//     origem='pulso' (os cortes que o MKT publica nas contas da DIGIAI). Perguntei ao Pulso em 17/11 se
//     essas peças também estão no espelho dele; a resposta foi não — `v_espelho_pulso_dias` lê só
//     `pulso_content.metricas_publicacao`, as contas do próprio Pulso. **Por isso somo.** Sem essa
//     resposta a soma estaria inflada e com cara de medição.
//
//  2. **Esconder a fonte que falta.** Os cortes das contas de cortes do Pulso e os longos viviam em
//     `pulso_analytics.leituras_longos`, sem espelho — fora do painel do dono. Pedi ao Pulso em 17/11 e
//     ele publicou `v_espelho_pulso_longos_dias` no mesmo dia. **Conferi por conta própria como anon**,
//     não pelo relato: 30 linhas, 34 publicações, 1.084 views, retenção só no YouTube, e **0 linhas com
//     conta da DIGIAI** — que é a prova de que somar não duplica.
//     Fonte que não se consegue ler continua sendo escrita na tela, nomeada: painel cego e motor parado
//     levam a decisões opostas.
//
//  3. **Chamar "não medido" de zero.** Peça sem leitura coletada aparece contada à parte, nunca somada
//     como 0 — e a razão da ausência é diferente por rede (resposta do MKT em 17/11):
//       · retenção e horas de exibição existem só no YouTube (coleta do `cortes-tick`);
//       · Instagram reel e vídeo do Facebook: a rede dá, a coleta ainda não pede — "ainda não medimos";
//       · post de imagem, carrossel e story: a rede não dá esse número;
//       · TikTok: sai como rascunho e a coleta não lê métrica — também "ainda não medimos".
//
// Leitura de blog NÃO entra na conta de views: são unidades diferentes (uma página lida não é um vídeo
// visto). Aparece na própria linha, com o próprio nome.

type Linha = {
  origem: string; marca: string | null; conta: string; rede: string; tipo: string;
  peca_ref: string; data: string; views: number | null; curtidas: number | null;
  comentarios: number | null; compartilhamentos: number | null; retencao_media_pct: number | null;
};


const n = (v: number) => v.toLocaleString('pt-BR');
const kilo = (v: number) => (v >= 10000 ? `${(v / 1000).toFixed(0)}k` : n(v));

/** Dia do negócio em BRT. `toISOString()` jogaria o corte para o dia seguinte depois das 21h. */
const diaBRT = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

// O período é do PAI, não deste cartão. Antes ele vivia aqui e o "Resultado do conteúdo" ao lado era
// sempre 30 dias: um filtro que vale para metade da tela é pior que nenhum, porque quem lê acredita
// que mudou tudo. (Erro apontado pelo Geral em 18/11, item 3.)
export default function LeiturasCard({ periodo }: { periodo: Periodo }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pulso, setPulso] = useState<{ linhas: PulsoDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  const [longos, setLongos] = useState<{ linhas: PulsoLongoDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  const [lime, setLime] = useState<{ linhas: LimePubDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  const [blogs, setBlogs] = useState<{ linhas: BlogDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);

  useEffect(() => {
    setLinhas(null);
    const corte = periodo === 'tudo' ? null : diaBRT(new Date(Date.now() - Number(periodo) * 86400000));
    // Em páginas de mil: a API corta a resposta nas primeiras mil linhas e devolve isso como sucesso.
    // Hoje são 921 leituras e a conta ainda fecha; na semana que vier, não fecharia — e ninguém veria.
    lerTudo<Linha>((de, ate) => {
      let q = supabase.from('v_mkt_analytics_peca_dia')
        .select('origem, marca, conta, rede, tipo, peca_ref, data, views, curtidas, comentarios, compartilhamentos, retencao_media_pct');
      if (corte) q = q.gte('data', corte);
      return q.order('data').order('origem').order('conta').order('rede').order('peca_ref').range(de, ate);
    }).then((l) => { setErro(null); setLinhas(l); });
  }, [periodo]);

  useEffect(() => {
    espelhoMotoresEstado.pulsoDias().then(setPulso);
    espelhoMotoresEstado.pulsoLongosDias().then(setLongos);
    espelhoMotoresEstado.limelightPubDias().then(setLime);
    espelhoMotoresEstado.blogsDias().then(setBlogs);
  }, []);

  const corte = periodo === 'tudo' ? '0000-01-01' : diaBRT(new Date(Date.now() - Number(periodo) * 86400000));
  const noPeriodo = <T extends { dia: string }>(l: T[]) => l.filter((x) => x.dia >= corte);

  // UMA PEÇA, UMA LEITURA — consertado em 19/11/2026, ao medir os dois defeitos que o dono apontou no
  // Radar 360. Isto somava TODAS as leituras diárias da mesma peça, e `mkt.leitura_dia` guarda
  // acumulado, não diferença: a mesma peça lida 95 views e depois 103 entrava como 198. A conta velha
  // dava 48.204 views contra 45.885 reais — **2.319 a mais, 5%**. A regra agora mora em
  // lib/leituraPorPeca.ts, para esta tela e o Radar 360 nunca divergirem.
  const pecas = ultimaLeituraPorPeca(linhas ?? []);
  const naoMedidas = pecas.filter((p) => p.views == null);
  // Curtida e comentário têm cobertura MUITO menor que view (68 de 647 linhas em 30 dias, medido em
  // 17/11). Somar os nulos como zero faria a tela dizer "8 curtidas em 602 peças", que é um juízo sobre
  // o conteúdo — quando a verdade é que 534 peças nunca tiveram curtida coletada.
  const comEngajamento = pecasMedidas(pecas, 'curtidas');

  const casaViews = somarCampo(pecas, 'views');
  const pulsoViews = pulso ? noPeriodo(pulso.linhas).reduce((a, x) => a + (x.views ?? 0), 0) : 0;
  const longosViews = longos ? noPeriodo(longos.linhas).reduce((a, x) => a + (x.views ?? 0), 0) : 0;
  const limeViews = lime ? noPeriodo(lime.linhas).reduce((a, x) => a + (x.views ?? 0), 0) : 0;
  const blogLeituras = blogs ? noPeriodo(blogs.linhas).reduce((a, x) => a + (x.leituras ?? 0), 0) : 0;

  const cego = [
    pulso?.estado !== 'ok' ? `Pulso (${pulso?.detalhe ?? 'não lido'})` : null,
    longos?.estado !== 'ok' ? `cortes e longos do Pulso (${longos?.detalhe ?? 'não lido'})` : null,
    lime?.estado !== 'ok' ? `Limelight (${lime?.detalhe ?? 'não lido'})` : null,
    blogs?.estado !== 'ok' ? `Blogs (${blogs?.detalhe ?? 'não lido'})` : null,
  ].filter(Boolean) as string[];

  const totalViews = casaViews + pulsoViews + longosViews + limeViews;

  const agrupar = (chave: (l: Linha) => string) => {
    const m = new Map<string, { pecas: Set<string>; views: number; medidas: number }>();
    for (const l of pecas) {
      const k = chave(l);
      const a = m.get(k) ?? { pecas: new Set<string>(), views: 0, medidas: 0 };
      a.pecas.add(l.peca_ref);
      a.views += l.views ?? 0;
      if (l.views != null) a.medidas += 1;
      m.set(k, a);
    }
    return [...m.entries()].sort((a, b) => b[1].views - a[1].views);
  };

  const Numero = ({ valor, rotulo, sub }: { valor: string; rotulo: string; sub?: string }) => (
    <div>
      <div className="text-xl font-bold tabular-nums text-on-surface">{valor}</div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{rotulo}</div>
      {sub && <div className="font-mono text-[9px] text-muted">{sub}</div>}
    </div>
  );

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Eye className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Leituras do conteúdo</span>
        <span className="font-mono text-[10px] text-muted">todas as fontes que hoje se podem somar</span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted">
          {periodo === 'tudo' ? 'desde o início' : `últimos ${periodo} dias`}
        </span>
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não consegui ler as leituras: {erro}.</span>
        </div>
      ) : linhas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
      ) : (
        <>
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-4 gap-4 border-b border-outline/10">
            <Numero valor={kilo(totalViews)} rotulo="views somadas"
              sub={`${kilo(casaViews)} contas da casa · ${kilo(pulsoViews + longosViews)} Pulso · ${kilo(limeViews)} Limelight`} />
            <Numero valor={n(pecas.length)} rotulo="peças nas contas da casa"
              sub={naoMedidas.length > 0 ? `${naoMedidas.length} sem leitura coletada` : 'todas com leitura'} />
            <Numero valor={comEngajamento === 0 ? '—' : n(somarCampo(pecas, 'curtidas'))} rotulo="curtidas"
              sub={comEngajamento === 0
                ? 'nenhuma peça com curtida coletada'
                : `só ${comEngajamento} de ${pecas.length} peças medidas · ${n(somarCampo(pecas, 'comentarios'))} coment. · ${n(somarCampo(pecas, 'compartilhamentos'))} compart.`} />
            <Numero valor={blogLeituras > 0 ? kilo(blogLeituras) : '—'} rotulo="leituras de blog"
              sub="unidade diferente: não entra nas views" />
          </div>

          {/* De onde vem cada parcela. Total sem origem escrita é total que ninguém pode conferir. */}
          <div className="px-4 py-2 border-b border-outline/10 bg-surface-container-high/30 text-xs text-on-surface-variant">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">fontes somadas</span>{' '}
            contas da casa (MKT e os cortes do Pulso que o MKT publica) · canais do Pulso ·
            cortes e longos das contas do Pulso · Limelight. Nenhuma peça entra duas vezes: as contas da
            DIGIAI ficam fora dos espelhos do Pulso, conferido por mim em 17/11.{' '}
            <strong className="text-on-surface">Este mesmo total aparece no Radar 360</strong>, com o
            recorte DELE — se os dois números não baterem, compare as duas janelas antes de desconfiar
            da conta: a fonte é a mesma e a regra de consolidação também. Lá está a repartição por
            marca, rede e conta; aqui está o total da casa.
            {cego.length > 0 && <> Hoje não consegui ler: <strong className="text-danger">{cego.join(' · ')}</strong> — isso é painel cego, não motor parado.</>}
          </div>

          {pecas.length === 0 ? (
            <div className="px-4 py-3 text-sm text-on-surface-variant">Nenhuma leitura coletada neste período.</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-outline/10">
              <Tabela titulo="por rede" linhas={agrupar((l) => l.rede)} />
              <Tabela titulo="quem produziu" linhas={agrupar((l) => l.origem)} />
            </div>
          )}

          <div className="px-4 py-2.5 border-t border-outline/10 text-xs text-on-surface-variant">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">por que falta número em rede</span>{' '}
            retenção e horas de exibição existem só no <strong>YouTube</strong> (coleta do <code className="font-mono text-[10px]">cortes-tick</code> aqui, e do próprio Pulso nos cortes dele).
            Reel do Instagram, vídeo do Facebook e TikTok: a rede dá, a coleta ainda não pede — <strong>ainda não medimos</strong>.
            Post de imagem, carrossel e story: <strong>a rede não dá</strong> esse número. (MKT, 17/11/2026.)
          </div>
        </>
      )}
    </section>
  );
}

function Tabela({ titulo, linhas }: { titulo: string; linhas: [string, { pecas: Set<string>; views: number; medidas: number }][] }) {
  return (
    <div>
      <div className="px-4 py-1.5 font-mono text-[9px] uppercase tracking-widest text-muted border-b border-outline/10">{titulo}</div>
      <table className="w-full text-sm">
        <tbody>
          {linhas.map(([k, a]) => (
            <tr key={k} className="border-b border-outline/5 last:border-b-0">
              <td className="px-4 py-1.5 text-on-surface">{k}</td>
              <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">{a.pecas.size} peça(s)</td>
              <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">
                {a.medidas === 0 ? <span className="text-muted">não medido</span> : n(a.views)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
