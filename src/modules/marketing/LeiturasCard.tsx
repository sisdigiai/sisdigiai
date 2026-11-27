import { useEffect, useState } from 'react';
import { Eye, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { motorNoRecorte, type Recorte } from '../../lib/recorte';
import { ultimaLeituraPorPeca, ganhoNaJanela, chaveDaPeca, somarCampo, pecasMedidas, type LeituraDeDia } from '../../lib/leituraPorPeca';
import { lerTudo } from '../../lib/paginar';
import { espelhoMotoresEstado, type PulsoDia, type PulsoLongoDia, type PulsoLeituraDia, type LimePubDia, type BlogDia, type EstadoEspelho } from '../../lib/espelhoMotores';

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
//       · **TikTok: a REDE não dá.** Corrigido em 25/11/2026 pelo MKT, depois que eu perguntei qual
//         buraco era coleta e qual era a rede: a API que ele tem (`video.list`) devolve views,
//         curtidas, comentários e compartilhamentos, e nada de tempo assistido — isso só existe no
//         app do criador. Em 17/11 a tela dizia "a coleta ainda não pede" também para o TikTok, e
//         isso mandava consertar o que não tem conserto;
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

// O RECORTE INTEIRO É DO PAI, não só o período (25/11/2026, pedido do dono no canal do MKT).
//
// Antes este cartão recebia `periodo`, que a página reduzia a 7, 30 ou "tudo". O dono escolhia 12
// meses e via o mesmo número de 30 dias; escolhia uma marca e nada mudava. Medido no banco em 25/11,
// o defeito era duplo:
//   · **o filtro não chegava**: marca, rede, grupo e intervalo livre paravam na barra;
//   · **e mesmo chegando, 12 meses ≈ 30 dias**, porque a leitura mais antiga é de 16/07/2026 e só
//     58 dias têm leitura. Consertar o primeiro sem dizer o segundo faria o dono olhar 301k → 304k e
//     concluir que continua quebrado. Por isso o cartão agora DIZ desde quando há leitura no recorte.
//
// O que a marca muda de verdade, medido em 30 dias: mello 117.239 · polapetit 113.405 ·
// lancaster 46.140 · digiai 519. Separar não é detalhe: é a diferença entre comparar e adivinhar.
export default function LeiturasCard({ recorte, recarga = 0 }: { recorte: Recorte; recarga?: number }) {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pulso, setPulso] = useState<{ linhas: PulsoDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  const [longos, setLongos] = useState<{ linhas: PulsoLongoDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  const [lime, setLime] = useState<{ linhas: LimePubDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  const [blogs, setBlogs] = useState<{ linhas: BlogDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  /** Data de publicação por peça, só para saber quem NASCEU na janela — quem nasceu nela ganhou
   *  tudo o que acumulou. Vem da consolidada porque a leitura do dia não guarda essa data. */
  const [pubs, setPubs] = useState<Map<string, { dia: string; estimada: boolean }> | null>(null);

  useEffect(() => {
    setLinhas(null);
    // Em páginas de mil: a API corta a resposta nas primeiras mil linhas e devolve isso como sucesso.
    // Hoje são 921 leituras e a conta ainda fecha; na semana que vier, não fecharia — e ninguém veria.
    // A LEITURA VEM DESDE O COMEÇO, só com o teto do recorte (27/11/2026). Para dizer o que ENTROU
    // na janela é preciso o ponto de ANTES dela — ganho é diferença, não acumulado. O recorte de
    // marca e rede continua valendo; só o piso da data sai, e por isso `aplicar` não entra aqui.
    lerTudo<Linha>((de, ate) => {
      let q = supabase.from('v_mkt_analytics_peca_dia')
        .select('origem, marca, conta, rede, tipo, peca_ref, data, views, curtidas, comentarios, compartilhamentos, retencao_media_pct');
      if (recorte.ate) q = q.lte('data', recorte.ate);
      // `marca` e `rede` existem nesta view; a coluna `origem` dela NÃO é o grupo da barra (é quem
      // mediu a peça), por isso o grupo entra resolvido em marcas e `origem` fica fora.
      if (recorte.marcas) q = recorte.marcas.length === 1 ? q.eq('marca', recorte.marcas[0]) : q.in('marca', recorte.marcas);
      if (recorte.rede) q = q.eq('rede', recorte.rede);
      return q.order('data').order('origem').order('conta').order('rede').order('peca_ref').range(de, ate);
    }).then((l) => { setErro(null); setLinhas(l); });

    lerTudo<{ origem: string; conta: string | null; rede: string; peca_ref: string; dia_publicacao: string; publicacao_estimada: boolean }>((de, ate) => {
      let q = supabase.from('v_mkt_peca_consolidada')
        .select('origem, conta, rede, peca_ref, dia_publicacao, publicacao_estimada');
      if (recorte.marcas) q = recorte.marcas.length === 1 ? q.eq('marca', recorte.marcas[0]) : q.in('marca', recorte.marcas);
      if (recorte.rede) q = q.eq('rede', recorte.rede);
      return q.order('origem').order('conta').order('rede').order('peca_ref').range(de, ate);
    }).then((l) => setPubs(new Map(l.map((c) => [
      chaveDaPeca(c as unknown as LeituraDeDia), { dia: c.dia_publicacao, estimada: c.publicacao_estimada },
    ])))).catch(() => setPubs(new Map()));
  }, [recorte, recarga]);

  // A FONTE DO PULSO SEGUE A RÉGUA (27/11/2026). `v_espelho_pulso_dias` e `_longos_dias` somam o
  // total ATUAL dos posts publicados no dia — isso é "por publicação". Com a régua em LEITURA a
  // pergunta é outra, e quem responde é `v_espelho_pulso_leituras_dias`, que dá o ganho do dia.
  const [pulsoLeituras, setPulsoLeituras] = useState<{ linhas: PulsoLeituraDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  useEffect(() => {
    espelhoMotoresEstado.pulsoDias().then(setPulso);
    espelhoMotoresEstado.pulsoLongosDias().then(setLongos);
    espelhoMotoresEstado.pulsoLeiturasDias().then(setPulsoLeituras);
    espelhoMotoresEstado.limelightPubDias().then(setLime);
    espelhoMotoresEstado.blogsDias().then(setBlogs);
    // `recarga` ENTRA AQUI (27/11/2026). A dependência era `[]`: a setinha de recarregar da página
    // relia a casa e **deixava os espelhos dos motores como estavam** — quem clicasse depois de o
    // Pulso coletar continuaria vendo o número velho, sem nada indicando isso. O dono perguntou se o
    // botão atualiza todas as redes; esta metade não atualizava.
  }, [recarga]);

  // OS ESPELHOS DOS MOTORES SÓ ENTRAM QUANDO SÃO DESTE RECORTE. Eles somam o motor inteiro por dia e
  // plataforma — não têm marca. Somá-los com "Lancaster" escolhido poria as views do Pulso dentro do
  // número da Lancaster, calado. A rede eles sabem separar (`plataforma`), e separam.
  const pulsoEntra = motorNoRecorte(recorte, 'pulso');
  // O Limelight deixou de ser grupo em 25/11: ele produz para a Mello, marca da casa.
  const limeEntra = motorNoRecorte(recorte, 'casa');
  const deDia = recorte.de ?? '0000-01-01';
  // RECORTE SEM FIM TERMINA HOJE, NÃO EM 9999 (27/11/2026). O `ateDia` servia só para filtrar, onde
  // um teto absurdo é inofensivo; desde hoje ele também VIRA RÓTULO ("na leitura de …"), e a tela
  // passou a escrever **31/12** num cartão aberto em 27/11 — achado pelo MKT na tela do dono, uma
  // hora depois de eu subir. Data de rótulo é dia do negócio, em BRT (R9 da régua dos números).
  const ateDia = recorte.ate ?? diaBRT(new Date());
  const noPeriodo = <T extends { dia: string; plataforma?: string }>(l: T[]) =>
    l.filter((x) => x.dia >= deDia && x.dia <= ateDia
      && (!recorte.rede || !x.plataforma || x.plataforma === recorte.rede));

  // UMA PEÇA, UMA LEITURA — consertado em 19/11/2026, ao medir os dois defeitos que o dono apontou no
  // Radar 360. Isto somava TODAS as leituras diárias da mesma peça, e `mkt.leitura_dia` guarda
  // acumulado, não diferença: a mesma peça lida 95 views e depois 103 entrava como 198. A conta velha
  // dava 48.204 views contra 45.885 reais — **2.319 a mais, 5%**. A regra agora mora em
  // lib/leituraPorPeca.ts, para esta tela e o Radar 360 nunca divergirem.
  // O ACERVO é das peças LIDAS no recorte; as leituras antigas vieram junto só para existir o ponto
  // de antes, e não podem entrar na contagem de peças do período.
  const noRecorte = (linhas ?? []).filter((l) => l.data >= deDia && l.data <= ateDia);
  const pecas = ultimaLeituraPorPeca(noRecorte);
  const naoMedidas = pecas.filter((p) => p.views == null);
  // O GANHO: o que entrou na janela, pela conta única de lib/leituraPorPeca.ts.
  const nasceuNaJanela = (chave: string) => {
    const c = pubs?.get(chave);
    return c != null && !c.estimada && c.dia >= deDia;
  };
  const ganhos = ganhoNaJanela(linhas ?? [], deDia, nasceuNaJanela);
  const casaGanho = ganhos.reduce((a, g) => a + (g.ganho ?? 0), 0);
  const comGanho = ganhos.filter((g) => g.ganho != null).length;
  const semReferencia = ganhos.filter((g) => g.ganho == null).length;
  // Curtida e comentário têm cobertura MUITO menor que view (68 de 647 linhas em 30 dias, medido em
  // 17/11). Somar os nulos como zero faria a tela dizer "8 curtidas em 602 peças", que é um juízo sobre
  // o conteúdo — quando a verdade é que 534 peças nunca tiveram curtida coletada.
  const comEngajamento = pecasMedidas(pecas, 'curtidas');

  const casaViews = somarCampo(pecas, 'views');
  // O Pulso entrega GANHO por dia nesta régua; somar os dias é somar ganho, que é a conta certa.
  const pulsoGanho = pulsoLeituras && pulsoEntra && pulsoLeituras.estado === 'ok'
    ? noPeriodo(pulsoLeituras.linhas).reduce((a, x) => a + (x.views ?? 0), 0) : 0;
  const pulsoCego = pulsoEntra && pulsoLeituras != null && pulsoLeituras.estado !== 'ok';
  // O acervo do Pulso (o que os posts publicados no período já juntaram) fica à parte, para a linha
  // de acervo não somar formas diferentes.
  const pulsoViews = pulso && pulsoEntra ? noPeriodo(pulso.linhas).reduce((a, x) => a + (x.views ?? 0), 0) : 0;
  const longosViews = longos && pulsoEntra ? noPeriodo(longos.linhas).reduce((a, x) => a + (x.views ?? 0), 0) : 0;
  const limeViews = lime && limeEntra ? noPeriodo(lime.linhas).reduce((a, x) => a + (x.views ?? 0), 0) : 0;
  // Blog não tem plataforma de rede: escolher uma rede tira os blogs do recorte, não os mantém inteiros.
  const blogsEntram = motorNoRecorte(recorte, 'casa') && !recorte.rede;
  const blogLeituras = blogs && blogsEntram ? noPeriodo(blogs.linhas).reduce((a, x) => a + (x.leituras ?? 0), 0) : 0;

  // DESDE QUANDO HÁ LEITURA, DENTRO DESTE RECORTE. Vem das linhas que chegaram, nunca de uma
  // constante: no dia em que o LinkedIn ligar a coleta, a frase se corrige sozinha.
  const comecoPorRede = (() => {
    const m = new Map<string, string>();
    for (const l of linhas ?? []) {
      const a = m.get(l.rede);
      if (!a || l.data < a) m.set(l.rede, l.data);
    }
    return [...m.entries()].sort((a, b) => a[1].localeCompare(b[1]));
  })();
  const dm = (iso: string) => iso.slice(8, 10) + '/' + iso.slice(5, 7);

  // Motor fora do recorte não é motor cego: dizer "não consegui ler o Pulso" quando ninguém pediu o
  // Pulso manda consertar o que não está quebrado. Só reclama de quem deveria estar aqui.
  const cego = [
    pulsoEntra && pulso?.estado !== 'ok' ? `Pulso (${pulso?.detalhe ?? 'não lido'})` : null,
    pulsoEntra && longos?.estado !== 'ok' ? `cortes e longos do Pulso (${longos?.detalhe ?? 'não lido'})` : null,
    limeEntra && lime?.estado !== 'ok' ? `Limelight (${lime?.detalhe ?? 'não lido'})` : null,
    blogsEntram && blogs?.estado !== 'ok' ? `Blogs (${blogs?.detalhe ?? 'não lido'})` : null,
  ].filter(Boolean) as string[];

  const foraDoRecorte = [
    !pulsoEntra ? 'Pulso' : null,
    !limeEntra ? 'Limelight' : null,
    !blogsEntram ? 'blogs' : null,
  ].filter(Boolean) as string[];

  const acervoSomado = casaViews + pulsoViews + longosViews + limeViews;
  // O NÚMERO GRANDE É O GANHO (27/11/2026). Era o acervo — "views somadas" com o período no cabeçalho
  // —, e acumulado de vida não leva nome de período: foi o erro que o dono achou pelo TikTok da Mello
  // (16.850 rotulado "hoje" num dia em que rendeu zero). Cockpit/Harness/regua-dos-numeros.md.
  // O Limelight fica fora: o espelho dele só responde por publicação, e parcela de outra pergunta não
  // entra na soma (R7).
  const totalGanho = casaGanho + pulsoGanho;

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
          {recorte.de == null ? 'tudo que já foi lido' : `peças LIDAS · ${recorte.rotulo}`}
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
          <div className="px-4 py-3 grid grid-cols-2 sm:grid-cols-5 gap-4 border-b border-outline/10">
            <Numero valor={kilo(totalGanho)} rotulo="views GANHAS no período"
              sub={`${kilo(casaGanho)} contas da casa · ${pulsoCego ? 'Pulso não medido' : kilo(pulsoGanho) + ' Pulso'} · Limelight fora (só sabe publicação)`} />
            <Numero valor={kilo(acervoSomado)} rotulo={`acervo lido, na leitura de ${dm(ateDia)}`}
              sub="o que essas peças já juntaram desde que nasceram — não é do período" />
            <Numero valor={n(pecas.length)} rotulo="peças nas contas da casa"
              sub={semReferencia > 0
                ? `${n(comGanho)} com ganho apurado · ${n(semReferencia)} são de antes da janela e só foram lidas agora`
                : naoMedidas.length > 0 ? `${naoMedidas.length} sem leitura coletada` : 'todas com leitura'} />
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
            <strong className="text-on-surface">O recorte aqui é por data de LEITURA</strong>: uma peça
            publicada em julho e lida ontem entra. O número grande é o que ela <strong className="text-on-surface">ganhou
            dentro da janela</strong> — a leitura de dentro menos a última de antes; peça que nasceu na
            janela ganhou tudo o que acumulou, e peça mais velha que só foi lida agora não tem ganho
            conhecido e fica de fora, contada à parte. O acervo, ao lado, é a outra pergunta: quanto
            essas peças já juntaram na vida, na leitura do fim do recorte.
            {foraDoRecorte.length > 0 && <> <strong className="text-on-surface">Fora deste recorte:</strong> {foraDoRecorte.join(', ')} — o espelho diário desses motores soma o motor inteiro e não separa por marca, então eles não entram quando se escolhe uma marca.</>}
            {cego.length > 0 && <> Hoje não consegui ler: <strong className="text-danger">{cego.join(' · ')}</strong> — isso é painel cego, não motor parado.</>}
          </div>

          {/* DESDE QUANDO HÁ LEITURA NESTE RECORTE (25/11/2026).
              Sem esta linha, o filtro consertado parece quebrado: medido em 25/11, 30 dias somam
              301.074 views e 12 meses somam 304.102 — quase o mesmo, porque a leitura mais antiga é
              de 16/07/2026. E cada rede começou num dia: num corte de 90 dias o Instagram tem 77
              dias de leitura e o TikTok 11. Comparar marcas "no mesmo período" compara, em parte,
              quando o coletor foi ligado — e isso tem de estar escrito onde o número aparece. */}
          {comecoPorRede.length > 0 && (
            <div className="px-4 py-2 border-b border-outline/10 text-xs text-on-surface-variant">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted">desde quando há leitura</span>{' '}
              {comecoPorRede.map(([rede, d]) => `${rede} ${dm(d)}`).join(' · ')}.{' '}
              <span className="text-muted">
                A janela escolhida é {recorte.rotulo}, mas cada rede só soma a partir da sua data —
                um recorte longo não torna o número maior onde a coleta é nova, e comparar redes ou
                marcas com datas de início diferentes compara também a idade da coleta.
              </span>
            </div>
          )}

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
            Reel do Instagram e vídeo do Facebook: a rede dá, a coleta ainda não pede — <strong>ainda não medimos</strong>.{' '}
            <strong>TikTok: a rede não dá</strong> tempo assistido — a API de que a casa dispõe devolve views, curtidas,
            comentários e compartilhamentos, e nada mais; retenção só no app do criador. (MKT, 17/11/2026, corrigido em 25/11.)
            Post de imagem, carrossel e story: <strong>a rede não dá</strong> esse número.
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
