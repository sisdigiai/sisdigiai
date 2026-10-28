import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquareWarning, Store, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { diaBrasilia, hojeBrasilia, horaBrasilia } from '../lib/datas';
import { MetricStat } from '../components/marketing-seo/MetricCard';

// Google Meu Negócio — avaliações, fichas, menções por nome e o que o Google mede (migration 205).
//
// Nasceu da pergunta do dono em 28/10: "não está saindo nada no Google, temos mais avaliações e não temos
// onde saber, e precisamos saber quais colaboradores vão melhor". Três coisas que a medição mudou ANTES
// da tela existir, e que estão aqui como regra, não como enfeite:
//
// 1. O NÚMERO QUE LIDERA NÃO É 1.745, É 14. São 9 anos de histórico (desde 2017) que chegaram de uma vez,
//    e 98% são 4–5 estrelas. O que custa dinheiro é avaliação ruim SEM RESPOSTA — e dessas há 14, sendo 8
//    na Lancaster. "1.745 avaliações" é contexto; a fila é essa.
//
// 2. MENÇÃO NÃO É DESEMPENHO. Thiago 73 × Kayllaine 7 × Nicolly 4, todos com média ~5 e zero menção ruim,
//    é volume de quem atendeu — não qualidade. Sem denominador (quantos clientes cada um atendeu, que vive
//    no banco do Clearix) um ranking premia quem faz mais turnos ou quem pede mais avaliação. A view nem
//    tem coluna de posição, e a tela escreve "menções" em todo lugar que alguém leria "placar".
//
// 3. A JANELA É OUTUBRO. A Lancaster saiu de 6 avaliações em setembro (0% citando nome) para 91 em outubro
//    (92%): começou uma campanha, e a atribuição só existe dentro dela. O corte está na view, não no jeito
//    de olhar.
//
// E a regra de sempre: não mostrar zero onde a resposta é "não sei". O relatório do Google atrasa dias, e a
// origem passou a dizer isso na própria coluna (`dia_fechado`, MKT 28/10): antes de fechar, `aparicoes`,
// `ligacoes` e `rotas` vêm NULAS, não zero. A tela nunca soma esses campos sem antes checar que o dia
// fechou — era exatamente assim que o zero de ontem ia virar número.
//
// POSTS GANHARAM TESTEMUNHA. Até 28/10 esta tela se recusava a mostrar publicação de post, porque o que a
// nossa tabela chamava de "publicado" era declaração do nosso próprio escritor (`posts_no_dia` é
// subconsulta em `mkt.gbp_posts`). Agora existe leitura de volta: `estado_google` vem da API do Google, e
// `posts_no_ar_google` conta só `estado_google = 'LIVE'` — conferido na definição da view antes de usar,
// porque comparar a nossa tabela com ela mesma é o erro que eu quase reportei ao dono.
//
// FILTRO E KPI (pedido do dono em 28/10: "dados da página do Google com filtros, kpis com dados
// atualizados"). Três coisas que a medição impôs ao desenho, e que são o motivo de a barra de cima não ser
// um seletor de datas comum:
//
// a) SÃO DUAS ÂNCORAS DE TEMPO, não uma. O relatório de desempenho do Google atrasa — medido em 28/10: o
//    último dia FECHADO é 23/10, cinco dias atrás. "Últimos 7 dias" contados de hoje somariam só 2 dias
//    fechados, e mostrariam uma queda que é atraso de relatório, não queda de verdade. Então desempenho
//    (aparições/rotas/ligações) ancora no último dia fechado, e avaliação/post — que chegam na hora —
//    ancoram em hoje. Cada KPI escreve as datas que usou; esconder a diferença seria pior que mostrá-la.
//
// b) VARIAÇÃO SÓ COM BASE COMPLETA. A série começa em 22/09 (36 dias, 32 fechados). Em "30 dias" o período
//    anterior tem apenas 2 dias de dados — comparar daria "+1483%" com cara de notícia boa. A regra é: só
//    mostra variação quando o período anterior tem o MESMO número de dias fechados; senão escreve "sem
//    base anterior completa". E marca "base pequena" quando o anterior é menor que 10, porque variação
//    sobre 3 ligações é ruído com duas casas decimais.
//
// c) O TOTAL TEM DE BATER COM A ORIGEM. São 1.745 avaliações e o PostgREST pagina; uma página silenciosa
//    de 1.000 faria a tela dizer "1.000 avaliações desde 2017" e errar toda média e todo total sem um
//    único erro na console. `lerTudo` pede a contagem exata, pagina até fechar, e se ainda faltar linha a
//    tela avisa em vez de exibir número truncado.

interface Avaliacao {
  review_id: string; ficha: string; marca: string; estrelas: number;
  comentario: string | null; criada_em: string; status: string | null;
}
interface Post {
  id: number | string; ficha: string; status: string | null;
  estado_google: string | null; publicado_em: string | null; agendado_para: string | null;
  erro: string | null;
}
interface Mencao {
  mes: string; marca: string; ficha: string; nome: string; confirmado: boolean;
  mencoes: number; media_estrelas: number; mencoes_ruins: number;
}
interface Cobertura {
  mes: string; marca: string; ficha: string; avaliacoes: number; com_nome: number; sem_nome: number;
}
interface MetricaDia {
  ficha: string; dia: string; aparicoes: number | null; ligacoes: number | null;
  cliques_site: number | null; rotas: number | null; lido_em: string | null;
  dia_fechado: boolean | null; posts_no_dia: number | null; posts_no_ar_google: number | null;
}

const JANELAS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 14, rotulo: '14 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 0, rotulo: 'Tudo' },
];

const TODAS = '__todas__';

function somaDias(iso: string, n: number) {
  const d = new Date(`${iso}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
function diasAtras(iso: string) {
  return Math.round((Date.parse(hojeBrasilia()) - Date.parse(iso.slice(0, 10))) / 86400000);
}
function br(iso: string) {
  return iso.slice(0, 10).split('-').reverse().join('/');
}
function brCurto(iso: string) {
  return iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
}

// Lê a view inteira. Sem `order` a paginação do PostgREST pode repetir ou pular linha entre as páginas, e
// o total sairia errado de um jeito que nenhum erro denuncia — por isso a ordem é obrigatória aqui.
async function lerTudo<T>(tabela: string, cols: string, ordem: string) {
  const PAG = 1000;
  const p1 = await supabase.from(tabela).select(cols, { count: 'exact' }).order(ordem).range(0, PAG - 1);
  if (p1.error) throw new Error(`${tabela}: ${p1.error.message}`);
  const linhas = (p1.data ?? []) as T[];
  const total = p1.count;
  while (total !== null && linhas.length < total) {
    const pn = await supabase.from(tabela).select(cols)
      .order(ordem).range(linhas.length, linhas.length + PAG - 1);
    if (pn.error) throw new Error(`${tabela}: ${pn.error.message}`);
    const lote = (pn.data ?? []) as T[];
    if (lote.length === 0) break;
    linhas.push(...lote);
  }
  return { linhas, total };
}

function Variacao({ atual, anterior, dias }: { atual: number; anterior: number | null; dias: number }) {
  if (anterior === null) return <span className="text-muted">sem base anterior completa</span>;
  if (anterior === 0) return <span className="text-muted">período anterior em zero</span>;
  const p = Math.round(((atual - anterior) / anterior) * 100);
  const tom = p > 0 ? 'text-success' : p < 0 ? 'text-danger' : 'text-muted';
  return (
    <span className={tom}>
      {p > 0 ? '+' : ''}{p}%<span className="text-muted"> vs {anterior} nos {dias} dias anteriores</span>
      {anterior < 10 && <span className="text-muted"> · base pequena</span>}
    </span>
  );
}

export default function Google() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [totalAvaliacoes, setTotalAvaliacoes] = useState<number | null>(null);
  const [mencoes, setMencoes] = useState<Mencao[]>([]);
  const [cobertura, setCobertura] = useState<Cobertura[]>([]);
  const [metricas, setMetricas] = useState<MetricaDia[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [ficha, setFicha] = useState<string>(TODAS);
  const [janela, setJanela] = useState<number>(14);

  useEffect(() => {
    (async () => {
      try {
        const [a, m, c, d, p] = await Promise.all([
          lerTudo<Avaliacao>('v_mkt_gbp_avaliacoes',
            'review_id,ficha,marca,estrelas,comentario,criada_em,status', 'review_id'),
          lerTudo<Mencao>('v_gbp_mencoes_mes', '*', 'nome'),
          lerTudo<Cobertura>('v_gbp_mencoes_cobertura_mes', '*', 'ficha'),
          lerTudo<MetricaDia>('v_mkt_gbp_metricas_dia', '*', 'dia'),
          lerTudo<Post>('v_mkt_gbp_posts',
            'id,ficha,status,estado_google,publicado_em,agendado_para,erro', 'id'),
        ]);
        setAvaliacoes(a.linhas);
        setTotalAvaliacoes(a.total);
        setMencoes(m.linhas);
        setCobertura(c.linhas);
        setMetricas(d.linhas);
        setPosts(p.linhas);
      } catch (e) {
        setErro(e instanceof Error ? e.message : String(e));
      }
    })();
  }, []);

  const fichas = useMemo(() => {
    const s = new Set<string>();
    for (const r of avaliacoes ?? []) s.add(r.ficha);
    for (const r of metricas) s.add(r.ficha);
    for (const r of posts) s.add(r.ficha);
    return [...s].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [avaliacoes, metricas, posts]);

  const hoje = hojeBrasilia();
  const inicioJanelaHoje = janela ? somaDias(hoje, -(janela - 1)) : '0000-01-01';

  const metricasF = useMemo(
    () => (ficha === TODAS ? metricas : metricas.filter((r) => r.ficha === ficha)),
    [metricas, ficha],
  );
  const postsF = useMemo(
    () => (ficha === TODAS ? posts : posts.filter((r) => r.ficha === ficha)),
    [posts, ficha],
  );
  const avaliacoesF = useMemo(
    () => (ficha === TODAS ? (avaliacoes ?? []) : (avaliacoes ?? []).filter((r) => r.ficha === ficha)),
    [avaliacoes, ficha],
  );

  // Carimbo de atualização: o que a origem leu por último, e quanto do que ela leu já fechou.
  const leitura = useMemo(() => {
    const lidos = metricasF.map((r) => r.lido_em).filter((x): x is string => !!x).sort();
    const fechados = metricasF.filter((r) => r.dia_fechado).map((r) => r.dia).sort();
    const ultimo = fechados[fechados.length - 1] ?? null;
    return {
      lidoEm: lidos[lidos.length - 1] ?? null,
      ultimoFechado: ultimo,
      atraso: ultimo ? diasAtras(ultimo) : null,
    };
  }, [metricasF]);

  // Desempenho: ancora no último dia FECHADO, não em hoje. Soma só dia fechado. `incompleto` acende se
  // algum dia fechado vier com campo nulo — não é esperado (medido: 0 em 192 linhas fechadas), mas somar
  // zero num dia que a origem disse fechado seria inventar número sem avisar.
  const perf = useMemo(() => {
    const fechados = [...new Set(metricasF.filter((r) => r.dia_fechado).map((r) => r.dia))].sort();
    if (fechados.length === 0) return null;
    const fim = fechados[fechados.length - 1];
    const n = janela || fechados.length;
    const ini = janela ? somaDias(fim, -(n - 1)) : fechados[0];
    const fimAnt = somaDias(ini, -1);
    const iniAnt = somaDias(fimAnt, -(n - 1));

    const soma = (de: string, ate: string) => {
      let aparicoes = 0, rotas = 0, ligacoes = 0, incompleto = false;
      const dias = new Set<string>();
      for (const r of metricasF) {
        if (!r.dia_fechado || r.dia < de || r.dia > ate) continue;
        if (r.aparicoes === null || r.rotas === null || r.ligacoes === null) incompleto = true;
        aparicoes += r.aparicoes ?? 0;
        rotas += r.rotas ?? 0;
        ligacoes += r.ligacoes ?? 0;
        dias.add(r.dia);
      }
      return { aparicoes, rotas, ligacoes, dias: dias.size, incompleto };
    };

    const atual = soma(ini, fim);
    const anterior = janela ? soma(iniAnt, fimAnt) : null;
    const comparavel = !!anterior && anterior.dias === n && atual.dias === n;
    return {
      ini, fim, n, atual, fechados: fechados.length,
      anterior: comparavel ? anterior : null,
    };
  }, [metricasF, janela]);

  const avalJanela = useMemo(
    () => avaliacoesF.filter((r) => r.criada_em.slice(0, 10) >= inicioJanelaHoje),
    [avaliacoesF, inicioJanelaHoje],
  );

  const fila = useMemo(
    () => avaliacoesF
      .filter((r) => r.estrelas <= 3 && r.status !== 'publicada')
      .sort((x, y) => (x.estrelas - y.estrelas) || y.criada_em.localeCompare(x.criada_em)),
    [avaliacoesF],
  );

  const porFicha = useMemo(() => {
    const limite = new Date(); limite.setDate(limite.getDate() - 90);
    const corte = diaBrasilia(limite);
    const mapa = new Map<string, {
      ficha: string; total: number; noventa: number; soma: number;
      ultima: string; semResposta: number; ruinsSemResposta: number;
    }>();
    for (const r of avaliacoes ?? []) {
      const e = mapa.get(r.ficha) ?? {
        ficha: r.ficha, total: 0, noventa: 0, soma: 0, ultima: '', semResposta: 0, ruinsSemResposta: 0,
      };
      e.total += 1;
      e.soma += r.estrelas;
      if (r.criada_em.slice(0, 10) >= corte) e.noventa += 1;
      if (r.criada_em > e.ultima) e.ultima = r.criada_em;
      if (r.status !== 'publicada') {
        e.semResposta += 1;
        if (r.estrelas <= 3) e.ruinsSemResposta += 1;
      }
      mapa.set(r.ficha, e);
    }
    return [...mapa.values()].sort((a, b) => b.noventa - a.noventa || b.total - a.total);
  }, [avaliacoes]);

  // Soma só o que a origem declarou FECHADO. Se qualquer ficha do dia ainda não fechou, o dia inteiro
  // aparece como "ainda não fechou": soma parcial com cara de número fechado é pior que dizer "espera".
  const dias = useMemo(() => {
    const mapa = new Map<string, {
      dia: string; aparicoes: number; rotas: number; ligacoes: number;
      nossos: number; noArGoogle: number; aberto: boolean;
    }>();
    for (const r of metricasF) {
      const e = mapa.get(r.dia) ?? {
        dia: r.dia, aparicoes: 0, rotas: 0, ligacoes: 0, nossos: 0, noArGoogle: 0, aberto: false,
      };
      if (r.dia_fechado) {
        e.aparicoes += r.aparicoes ?? 0;
        e.rotas += r.rotas ?? 0;
        e.ligacoes += r.ligacoes ?? 0;
      } else {
        e.aberto = true;
      }
      // post não depende do relatório de desempenho: `estado_google` é leitura própria e vale sempre.
      e.nossos += r.posts_no_dia ?? 0;
      e.noArGoogle += r.posts_no_ar_google ?? 0;
      mapa.set(r.dia, e);
    }
    return [...mapa.values()]
      .sort((a, b) => b.dia.localeCompare(a.dia))
      .slice(0, janela || undefined);
  }, [metricasF, janela]);

  // Post que a nossa tabela diz publicado e o Google não confirma. Publicado HOJE e sem leitura não é
  // falha — é "ainda não lido"; o alarme é o que passou de um dia.
  const semConfirmacao = useMemo(
    () => postsF.filter((p) => p.status === 'publicado' && p.estado_google === null),
    [postsF],
  );
  const alarmePosts = useMemo(
    () => semConfirmacao.filter((p) => p.publicado_em && diasAtras(p.publicado_em) > 1),
    [semConfirmacao],
  );
  const cancelados = useMemo(() => postsF.filter((p) => p.status === 'cancelado'), [postsF]);
  const agendados = useMemo(() => postsF.filter((p) => p.status === 'agendado'), [postsF]);
  const liveJanela = useMemo(
    () => postsF.filter((p) => p.estado_google === 'LIVE'
      && (p.publicado_em ?? '').slice(0, 10) >= inicioJanelaHoje).length,
    [postsF, inicioJanelaHoje],
  );

  // Post cancelado agrupado pelo MOTIVO escrito. Cancelamento aqui é DECISÃO (o MKT cancelou 42 em 08/10
  // com a palavra do dono, trocados pelo acervo do grupo), não defeito — contagem sem motivo faz o dono
  // olhar 42 e procurar culpado onde houve escolha.
  const motivos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of cancelados) {
      const k = p.erro?.trim() || 'sem motivo escrito';
      mapa.set(k, (mapa.get(k) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [cancelados]);

  // A coluna da origem se chama `erro` e hoje carrega MOTIVO de cancelamento — está preenchida nos 42
  // cancelados e em nenhum publicado ou agendado (medido 28/10). Decisão e defeito são coisas opostas, e a
  // separação fica na estrutura: `erro` em post NÃO cancelado é falha de publicação de verdade. Hoje são
  // zero, e esse zero é medido — ao contrário de `cliques_site`, que é ausência de coleta.
  const falhas = useMemo(
    () => postsF.filter((p) => p.status !== 'cancelado' && (p.erro?.trim() ?? '') !== ''),
    [postsF],
  );

  const mencoesF = useMemo(
    () => (ficha === TODAS ? mencoes : mencoes.filter((m) => m.ficha === ficha)),
    [mencoes, ficha],
  );
  const mesAtual = useMemo(() => mencoesF[0]?.mes ?? '', [mencoesF]);
  const cobAtual = useMemo(
    () => (ficha === TODAS ? cobertura : cobertura.filter((c) => c.ficha === ficha))
      .filter((c) => c.mes === mesAtual)
      .reduce(
        (s, c) => ({
          avaliacoes: s.avaliacoes + c.avaliacoes, com: s.com + c.com_nome, sem: s.sem + c.sem_nome,
        }),
        { avaliacoes: 0, com: 0, sem: 0 },
      ),
    [cobertura, mesAtual, ficha],
  );
  const semConfirmar = mencoesF.some((m) => !m.confirmado);
  const truncado = totalAvaliacoes !== null && (avaliacoes?.length ?? 0) < totalAvaliacoes;

  if (erro) {
    return (
      <div className="border border-outline/15 bg-surface-container px-4 py-3">
        <span className="inline-flex items-center gap-2 text-warning">
          <AlertTriangle className="w-4 h-4" /> {erro}
        </span>
      </div>
    );
  }
  if (!avaliacoes) {
    return (
      <div className="px-4 py-3 text-muted">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
          <Loader2 className="w-3 h-3 animate-spin" /> lendo o Google Meu Negócio
        </span>
      </div>
    );
  }

  const janelaRotulo = janela ? `${janela} dias` : 'série inteira';
  const periodoPerf = perf
    ? `${brCurto(perf.ini)}–${brCurto(perf.fim)} · ${perf.atual.dias} ${perf.atual.dias === 1 ? 'dia' : 'dias'} fechados`
    : 'sem dia fechado';
  const periodoHoje = janela ? `${brCurto(inicioJanelaHoje)}–${brCurto(hoje)}` : 'desde 2017';

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-lg text-on-surface">Google Meu Negócio</h1>
          <p className="text-[13px] text-muted mt-1">
            {avaliacoes.length} avaliações desde 2017 nas {porFicha.length} fichas — mas o número que decide
            é o de cima: avaliação ruim sem resposta.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted text-right leading-relaxed">
          {leitura.lidoEm
            ? <>lido do Google em {horaBrasilia(leitura.lidoEm)}</>
            : <span className="text-warning">sem leitura registrada</span>}
          <br />
          {leitura.ultimoFechado ? (
            <>
              último dia fechado {br(leitura.ultimoFechado)}
              {leitura.atraso !== null && (
                <span className={leitura.atraso > 7 ? 'text-warning' : ''}>
                  {' '}· {leitura.atraso} dias de atraso
                </span>
              )}
            </>
          ) : <span className="text-warning">nenhum dia fechado nesta ficha</span>}
        </div>
      </div>

      {truncado && (
        <div className="border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          A origem tem {totalAvaliacoes} avaliações e a tela recebeu {avaliacoes.length}. Os números abaixo
          estão truncados — não decida por eles.
        </div>
      )}

      {/* filtro */}
      <div className="border border-outline/15 bg-surface-container px-3 py-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">Ficha</span>
          <select
            value={ficha}
            onChange={(e) => setFicha(e.target.value)}
            className="bg-surface-low border border-outline/20 px-2 py-1 text-[13px] text-on-surface"
          >
            <option value={TODAS}>Todas as {fichas.length} fichas</option>
            {fichas.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
        </label>
        <div className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">Janela</span>
          <div className="flex">
            {JANELAS.map((j) => (
              <button
                key={j.dias}
                onClick={() => setJanela(j.dias)}
                className={`px-2.5 py-1 text-[12px] border -ml-px first:ml-0 transition-colors ${
                  janela === j.dias
                    ? 'border-outline-strong bg-surface-highest text-on-surface'
                    : 'border-outline/20 text-muted hover:text-on-surface'
                }`}
              >
                {j.rotulo}
              </button>
            ))}
          </div>
        </div>
        <span className="text-[12px] text-muted">
          desempenho {periodoPerf} · avaliação e post {periodoHoje}
        </span>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricStat
          label="Aparições"
          value={perf ? perf.atual.aparicoes.toLocaleString('pt-BR') : '—'}
          hint={perf
            ? <Variacao atual={perf.atual.aparicoes} anterior={perf.anterior?.aparicoes ?? null} dias={perf.n} />
            : 'nenhum dia fechado'}
        />
        <MetricStat
          label="Rotas pedidas"
          value={perf ? perf.atual.rotas.toLocaleString('pt-BR') : '—'}
          hint={perf
            ? <Variacao atual={perf.atual.rotas} anterior={perf.anterior?.rotas ?? null} dias={perf.n} />
            : 'nenhum dia fechado'}
        />
        <MetricStat
          label="Ligações"
          value={perf ? perf.atual.ligacoes.toLocaleString('pt-BR') : '—'}
          hint={perf
            ? <Variacao atual={perf.atual.ligacoes} anterior={perf.anterior?.ligacoes ?? null} dias={perf.n} />
            : 'nenhum dia fechado'}
        />
        <MetricStat
          label="Cliques no site"
          value={<span className="text-muted text-base">não coletado</span>}
          hint="vem nulo da origem nas 6 fichas — não é zero"
        />
        <MetricStat
          label="No ar pelo Google"
          value={liveJanela.toLocaleString('pt-BR')}
          hint={`posts confirmados pela API · ${periodoHoje}`}
        />
        <MetricStat
          label="Avaliações no período"
          value={avalJanela.length.toLocaleString('pt-BR')}
          hint={avalJanela.length > 0
            ? `média ${(avalJanela.reduce((s, r) => s + r.estrelas, 0) / avalJanela.length).toFixed(2)} · ${periodoHoje}`
            : `nenhuma em ${periodoHoje}`}
        />
        <MetricStat
          label="Ruins sem resposta"
          value={<span className={fila.length ? 'text-warning' : undefined}>{fila.length}</span>}
          hint="fila inteira, sem corte de período — avaliação velha sem resposta custa igual"
        />
        <MetricStat
          label="Agendados"
          value={agendados.length.toLocaleString('pt-BR')}
          hint={falhas.length
            ? <span className="text-warning">{falhas.length} com falha de publicação</span>
            : 'nenhuma falha de publicação'}
        />
      </div>

      {perf?.atual.incompleto && (
        <div className="border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
          Algum dia marcado como fechado veio com campo nulo. Os totais acima somaram esses dias como zero
          — confira a origem antes de usar o número.
        </div>
      )}

      {/* 1. a fila que custa dinheiro */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 flex items-center gap-2">
          <MessageSquareWarning className="w-3.5 h-3.5 text-warning" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Ruins sem resposta · {fila.length}
          </span>
        </div>
        {fila.length === 0 ? (
          <div className="px-3 py-3 text-[13px] text-muted">Nenhuma avaliação de ≤3 estrelas sem resposta.</div>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {fila.map((r) => (
                <tr key={r.review_id} className="border-t border-outline/10 align-top">
                  <td className="px-3 py-2 w-14 font-mono text-[11px] text-warning">{'★'.repeat(r.estrelas)}</td>
                  <td className="px-3 py-2 w-56 text-secondary">{r.ficha}</td>
                  <td className="px-3 py-2 w-20 font-mono text-[10px] text-muted">{brCurto(r.criada_em)}</td>
                  <td className="px-3 py-2 text-on-surface">
                    {r.comentario?.split('\n')[0].slice(0, 120) || <span className="text-muted">sem comentário</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 2. por ficha */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 flex items-center gap-2">
          <Store className="w-3.5 h-3.5 text-secondary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Por ficha · todas, para comparar
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-muted">
                <th className="text-left px-3 py-2">Ficha</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">90 dias</th>
                <th className="text-right px-3 py-2">Média</th>
                <th className="text-right px-3 py-2">Sem resposta</th>
                <th className="text-left px-3 py-2">Última avaliação</th>
              </tr>
            </thead>
            <tbody>
              {porFicha.map((f) => {
                const d = diasAtras(f.ultima);
                const sel = ficha === f.ficha;
                return (
                  <tr
                    key={f.ficha}
                    className={`border-t border-outline/10 cursor-pointer ${
                      sel ? 'bg-surface-highest' : 'hover:bg-surface-low'
                    }`}
                    onClick={() => setFicha(sel ? TODAS : f.ficha)}
                  >
                    <td className="px-3 py-2 text-on-surface">{f.ficha}</td>
                    <td className="px-3 py-2 text-right text-on-surface">{f.total}</td>
                    <td className="px-3 py-2 text-right">
                      {f.noventa === 0
                        ? <span className="text-warning font-mono text-[10px] uppercase">parada</span>
                        : <span className="text-on-surface">{f.noventa}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-on-surface">{(f.soma / f.total).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-on-surface">
                      {f.semResposta}
                      {f.ruinsSemResposta > 0 && (
                        <span className="text-warning"> · {f.ruinsSemResposta} ruim</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={d > 365 ? 'text-warning' : 'text-muted'}>
                        {br(f.ultima)} · {d} dias
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted">
          Clicar na linha filtra a tela inteira por aquela ficha. Esta tabela fica sempre com as seis —
          tirar as outras tiraria a comparação, que é a razão dela existir. Ficha "parada" não recebe
          avaliação há mais de 90 dias: quatro pararam em 2024, o que casa com as lojas que aparecem
          "fechadas temporariamente" no Google — isso é painel do dono, não do app.
        </div>
      </div>

      {/* 3. menções por nome */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 flex items-center gap-2">
          <UserRound className="w-3.5 h-3.5 text-secondary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Menções por nome {mesAtual ? `· ${mesAtual.split('-').reverse().join('/')}` : ''}
          </span>
        </div>
        {mencoesF.length === 0 ? (
          <div className="px-3 py-3 text-[13px] text-muted">
            Nenhum nome mapeado {ficha === TODAS ? 'ainda' : 'nesta ficha'} — a lista vive em{' '}
            <code>ops.gbp_nome_citado</code>.
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-muted">
                <th className="text-left px-3 py-2">Nome citado</th>
                <th className="text-right px-3 py-2">Menções</th>
                <th className="text-right px-3 py-2">Média</th>
                <th className="text-right px-3 py-2">Menções ruins</th>
              </tr>
            </thead>
            <tbody>
              {[...mencoesF].sort((a, b) => b.mencoes - a.mencoes).map((m) => (
                <tr key={`${m.mes}-${m.ficha}-${m.nome}`} className="border-t border-outline/10">
                  <td className="px-3 py-2 text-on-surface">
                    {m.nome}
                    {!m.confirmado && (
                      <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-warning">
                        a confirmar
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.mencoes}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.media_estrelas}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.mencoes_ruins}</td>
                </tr>
              ))}
              {cobAtual.sem > 0 && (
                <tr className="border-t border-outline/10">
                  <td className="px-3 py-2 text-muted">sem nome reconhecido</td>
                  <td className="px-3 py-2 text-right text-muted">{cobAtual.sem}</td>
                  <td className="px-3 py-2 text-right text-muted">—</td>
                  <td className="px-3 py-2 text-right text-muted">—</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted space-y-1">
          <p>
            <strong className="text-on-surface">Menção não é desempenho.</strong> Quem aparece mais pode
            simplesmente ter atendido mais, ou pedido mais avaliação. Para virar placar falta o denominador
            — quantos clientes cada um atendeu — que vive no banco do Clearix, fora do alcance deste app.
          </p>
          <p>
            Janela a partir de 10/2026: foi quando a campanha de avaliação começou. Antes disso quase
            ninguém citava nome ({cobAtual.com} de {cobAtual.avaliacoes} citam no mês atual). O filtro de
            janela acima não mexe neste bloco — o corte dele é mensal, e está na view.
          </p>
          {semConfirmar && (
            <p className="text-warning">
              Os nomes vieram medidos das avaliações, não de um cadastro — ninguém confirmou que são
              colaboradores. Falta a lista oficial por loja.
            </p>
          )}
        </div>
      </div>

      {/* 4. o que o Google mede */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          O que o Google mede · {janelaRotulo}
        </div>
        <div className="px-3 py-2 border-b border-outline/15 text-[13px] flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-on-surface">
            {postsF.filter((p) => p.estado_google === 'LIVE').length}
            <span className="text-muted"> posts confirmados no ar pelo Google (total)</span>
          </span>
          <span className={alarmePosts.length ? 'text-warning' : 'text-on-surface'}>
            {alarmePosts.length}
            <span className={alarmePosts.length ? '' : 'text-muted'}> publicados sem confirmação há mais de 1 dia</span>
          </span>
          {semConfirmacao.length > alarmePosts.length && (
            <span className="text-muted">
              {semConfirmacao.length - alarmePosts.length} publicados hoje, ainda não lidos
            </span>
          )}
          <span className="text-on-surface">
            {cancelados.length}<span className="text-muted"> cancelados</span>
          </span>
          <span className={falhas.length ? 'text-warning' : 'text-on-surface'}>
            {falhas.length}
            <span className={falhas.length ? '' : 'text-muted'}> falhas de publicação</span>
          </span>
        </div>
        {motivos.length > 0 && (
          <div className="px-3 py-2 border-b border-outline/15 text-[12px] space-y-1">
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
              Por que foram cancelados
            </span>
            {motivos.map(([motivo, n]) => (
              <div key={motivo} className="flex gap-2">
                <span className="text-on-surface tabular-nums w-7 text-right">{n}</span>
                <span className={motivo === 'sem motivo escrito' ? 'text-warning' : 'text-muted'}>{motivo}</span>
              </div>
            ))}
            <p className="text-muted pt-1">
              Cancelamento aqui é <strong className="text-on-surface">decisão, não defeito</strong>: o
              Marketing cancelou estes em 08/10 com a palavra do dono, e trocou pelo acervo do grupo. Falha
              de publicação de verdade conta na linha de cima, separada — e hoje é zero medido.
            </p>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-muted">
                <th className="text-left px-3 py-2">Dia</th>
                <th className="text-right px-3 py-2">Posts nossos</th>
                <th className="text-right px-3 py-2">No ar pelo Google</th>
                <th className="text-right px-3 py-2">Aparições</th>
                <th className="text-right px-3 py-2">Rotas</th>
                <th className="text-right px-3 py-2">Ligações</th>
                <th className="text-right px-3 py-2">Cliques no site</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d.dia} className="border-t border-outline/10">
                  <td className="px-3 py-2 text-on-surface">{br(d.dia)}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{d.nossos}</td>
                  <td className={`px-3 py-2 text-right ${d.noArGoogle < d.nossos ? 'text-warning' : 'text-on-surface'}`}>
                    {d.noArGoogle}
                  </td>
                  {d.aberto ? (
                    <td colSpan={4} className="px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        ainda não fechou · o relatório do Google atrasa alguns dias
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-right text-on-surface">{d.aparicoes}</td>
                      <td className="px-3 py-2 text-right text-on-surface">{d.rotas}</td>
                      <td className="px-3 py-2 text-right text-on-surface">{d.ligacoes}</td>
                      <td className="px-3 py-2 text-right text-muted">não coletado</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted space-y-1">
          <p>
            <strong className="text-on-surface">Os KPIs de cima e esta tabela terminam em dias
            diferentes, de propósito.</strong> O desempenho do Google fecha com atraso
            {leitura.atraso !== null ? ` (hoje ${leitura.atraso} dias)` : ''}, então o KPI soma a última
            janela FECHADA — {periodoPerf}. A tabela mostra os dias crus, inclusive os que ainda não
            fecharam, para você ver o atraso em vez de só sofrer com ele.
          </p>
          <p>
            <strong className="text-on-surface">"No ar pelo Google" é leitura de volta, não a nossa
            tabela.</strong> A coluna conta só post que a API do Google devolve como publicado — é a
            testemunha que faltava: até 28/10 esta tela não mostrava post nenhum, porque "publicado" era
            declaração do nosso próprio escritor. Quando a coluna fica menor que "posts nossos", ela acende.
          </p>
          <p>
            Aparições, rotas e ligações só aparecem no dia que a origem marcou <strong>fechado</strong>;
            antes disso vêm nulas e a linha diz "ainda não fechou" em vez de somar zero. "Cliques no site"
            vem nulo da origem nas 6 fichas, todas com site cadastrado — não é zero, é não coletado, e fica
            assim até alguém conferir um dia no painel do Google.
          </p>
        </div>
      </div>
    </div>
  );
}
