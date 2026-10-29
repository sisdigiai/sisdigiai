import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquareWarning, Store, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hojeBrasilia, horaBrasilia } from '../lib/datas';
import { MetricStat } from '../components/marketing-seo/MetricCard';

// Google Meu Negócio — avaliações, fichas, menções por nome e o que o Google mede (migrations 205 e 206).
//
// Nasceu da pergunta do dono em 28/10: "não está saindo nada no Google, temos mais avaliações e não temos
// onde saber, e precisamos saber quais colaboradores vão melhor". Quatro coisas que a medição impôs, e que
// estão aqui como regra, não como enfeite:
//
// 1. O NÚMERO QUE LIDERA NÃO É 1.747, É 9. São 9 anos de histórico (desde 2017) que chegaram de uma vez, e
//    98% são 4–5 estrelas. O que custa dinheiro é avaliação ruim SEM RESPOSTA — e dessas há 9 em loja
//    aberta, mais 5 em loja que fechou de vez. "1.747 avaliações" é contexto; a fila é essa.
//
// 2. MENÇÃO NÃO É DESEMPENHO. É volume de quem atendeu, não qualidade. Sem denominador (quantos clientes
//    cada um atendeu, que vive no banco do Clearix) um ranking premia quem faz mais turnos ou quem pede
//    mais avaliação. A view nem tem coluna de posição, e a tela escreve "menções" em todo lugar que
//    alguém leria "placar".
//
// 3. NÃO MOSTRAR ZERO ONDE A RESPOSTA É "NÃO SEI". O relatório do Google atrasa e a origem diz isso na
//    própria coluna (`dia_fechado`): antes de fechar, `aparicoes`, `ligacoes` e `rotas` vêm NULAS, não
//    zero. `cliques_site` é NULL literal na view — a tela escreve "não coletado", nunca 0.
//
// 4. POSTS GANHARAM TESTEMUNHA. O que a nossa tabela chama de "publicado" é declaração do nosso próprio
//    escritor; `estado_google` vem da API do Google, e "no ar" conta só `estado_google = 'LIVE'`. Comparar
//    a nossa tabela com ela mesma é o erro que eu quase reportei ao dono.
//
// ═════ QUATRO DAS SEIS FICHAS SÃO DE LOJA QUE FECHOU DE VEZ (medido 29/10) ═════
// As quatro da Mello estão `situacao = fechada_definitivamente` com `posts_motor = false` desde 28/10 às
// 22:32 BRT, e os 8 posts que cada uma tinha agendados até 03/11 foram cancelados com o motivo escrito
// "loja física fechou de vez; posts parados (dono 28/10)". É DECISÃO do dono, registrada pelo MKT, não
// defeito — li o motivo antes de reportar, e foi isso que impediu um alarme falso.
//
// O defeito era a tela: somando as seis, 1.054 das 1.747 avaliações (60%) e 116 dos 146 posts no ar (79%)
// vinham de loja que não existe mais, misturados com a única que opera. Então a base é SÓ FICHA ABERTA,
// com chip para incluir as fechadas, e a base escrita no cabeçalho e no filtro. Escolher uma ficha fechada
// no seletor continua valendo: ato explícito do dono vale mais que o padrão.
//
// ═════ FRESCOR: EU PEDI O CARIMBO ERRADO E O MKT RECUSOU COM RAZÃO (29/10) ═════
// Eu li `max(sincronizada_em)` por ficha e concluí "a coleta parou em 06/10 em quatro fichas, 23 dias".
// Errado, e do lado de inventar alarme: o carimbo fica na LINHA da avaliação e a leitura diária varre 90
// dias, então ficha sem avaliação nova no período não tem linha para recarimbar e congela sem nada ter
// parado. Conferi a premissa contra o dado antes de aceitar — casa nos seis casos. São duas perguntas
// diferentes, e a tela mostra as duas separadas:
//   · `avaliacoes_lidas_em` → "quando NÓS lemos" (carimbado em todas as fichas quando a leitura fecha sem
//     erro). É o que responde "não lemos", e está no cabeçalho.
//   · `ultima_avaliacao_em` → "quando ALGUÉM avaliou" (Polá Petit: 04/08/2021, cinco anos). É o que
//     responde "ninguém avaliou", e está na tabela por ficha.
//
// ═════ R-049: OS NÚMEROS NASCEM NO BANCO, COM O FILTRO DENTRO (migration 206) ═════
// Até hoje esta tela lia 1.745 avaliações + 216 métricas + 184 posts e somava em `useMemo` para exibir 8
// números. Agora chama três funções com ficha, janela e base como PARÂMETRO:
//   · `rpc_gbp_painel`    → a linha de KPIs, com as duas âncoras de tempo e a regra de comparabilidade;
//   · `rpc_gbp_por_dia`   → a tabela por dia, na MESMA janela do painel;
//   · `rpc_gbp_por_ficha` → a tabela de comparação, que de propósito não recebe base (tirar as fechadas
//     tiraria a razão dela existir).
// Três ganhos que não são estéticos: sumiu a paginação manual e com ela a classe de erro "página
// silenciosa de 1.000 truncou todo total"; as regras difíceis passaram a viver num lugar só, provadas na
// própria migration; e o mesmo número deixa de divergir quando outra tela quiser exibi-lo (a lição da
// 192). A prova que a R-049 pede roda na migration — o número de cima tem de bater com a soma das linhas
// — e ela achou um defeito meu antes de a função existir: a `por_dia` pegava os N dias mais RECENTES, que
// incluem os ainda abertos, enquanto o KPI somava os N ancorados no último fechado; tabela e número
// falariam de períodos diferentes na mesma tela. A tela confere isso ao vivo também, no aviso de
// divergência da fila.
//
// O QUE AINDA SOMA NO FRONT, dito em voz alta: o bloco de posts (cancelados por motivo, publicado sem
// confirmação) conta sobre uma leitura limitada de 184 linhas. É dívida menor da mesma R-049 e está na
// fila — não chamo de cumprido o que não está.

interface Painel {
  base_fichas: number; serie_fechados: number;
  perf_ini: string | null; perf_fim: string | null; perf_dias: number | null;
  aparicoes: number | null; rotas: number | null; ligacoes: number | null;
  cliques_site: number | null; incompleto: boolean;
  ant_dias: number | null; ant_aparicoes: number | null;
  ant_rotas: number | null; ant_ligacoes: number | null; comparavel: boolean;
  hoje: string; janela_ini: string;
  aval_periodo: number; aval_media: string | number | null;
  ruins_sem_resposta: number; ruins_fora_da_base: number;
  no_ar_janela: number; agendados: number; falhas: number;
  lido_em: string | null; ultimo_fechado: string | null;
  avaliacoes_lidas_em: string | null; leitura_divergente: boolean;
}
interface DiaLinha {
  dia: string; aberto: boolean;
  aparicoes: number | null; rotas: number | null; ligacoes: number | null;
  nossos: number | null; no_ar_google: number | null;
}
interface FichaLinha {
  ficha: string; situacao: string | null; posts_motor: boolean | null;
  total: number; noventa: number; media: string | number | null;
  sem_resposta: number; ruins_sem_resposta: number;
  ultima_avaliacao_em: string | null; avaliacoes_lidas_em: string | null;
}
interface Avaliacao {
  review_id: string; ficha: string; estrelas: number; comentario: string | null; criada_em: string;
}
interface Post {
  id: number | string; ficha: string; status: string | null;
  estado_google: string | null; publicado_em: string | null; erro: string | null;
}
interface Mencao {
  mes: string; marca: string; ficha: string; nome: string; confirmado: boolean;
  mencoes: number; media_estrelas: number; mencoes_ruins: number;
}
interface Cobertura {
  mes: string; marca: string; ficha: string; avaliacoes: number; com_nome: number; sem_nome: number;
}

const JANELAS = [
  { dias: 7, rotulo: '7 dias' },
  { dias: 14, rotulo: '14 dias' },
  { dias: 30, rotulo: '30 dias' },
  { dias: 0, rotulo: 'Tudo' },
];

const TODAS = '__todas__';
const FECHADA = 'fechada_definitivamente';

function diasAtras(iso: string) {
  return Math.round((Date.parse(hojeBrasilia()) - Date.parse(iso.slice(0, 10))) / 86400000);
}
function br(iso: string) {
  return iso.slice(0, 10).split('-').reverse().join('/');
}
function brCurto(iso: string) {
  return iso.slice(0, 10).split('-').reverse().slice(0, 2).join('/');
}
// `numeric` do Postgres chega como string no PostgREST; tratar como número sem converter dá "4.99".toFixed
function num(v: string | number | null): number | null {
  if (v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function Variacao({ atual, anterior, dias, comparavel }: {
  atual: number | null; anterior: number | null; dias: number; comparavel: boolean;
}) {
  if (!comparavel || anterior === null || atual === null) {
    return <span className="text-muted">sem base anterior completa</span>;
  }
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
  const [painel, setPainel] = useState<Painel | null>(null);
  const [dias, setDias] = useState<DiaLinha[]>([]);
  const [porFicha, setPorFicha] = useState<FichaLinha[]>([]);
  const [fila, setFila] = useState<Avaliacao[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [mencoes, setMencoes] = useState<Mencao[]>([]);
  const [cobertura, setCobertura] = useState<Cobertura[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [pronto, setPronto] = useState(false);

  const [ficha, setFicha] = useState<string>(TODAS);
  const [janela, setJanela] = useState<number>(14);
  const [incluirFechadas, setIncluirFechadas] = useState(false);

  // o que não depende do filtro: a tabela de comparação, as menções e os posts
  useEffect(() => {
    (async () => {
      const [f, m, c, p] = await Promise.all([
        supabase.rpc('rpc_gbp_por_ficha'),
        supabase.from('v_gbp_mencoes_mes').select('*').order('nome'),
        supabase.from('v_gbp_mencoes_cobertura_mes').select('*').order('ficha'),
        supabase.from('v_mkt_gbp_posts')
          .select('id,ficha,status,estado_google,publicado_em,erro').order('id'),
      ]);
      const ruim = f.error ?? m.error ?? c.error ?? p.error;
      if (ruim) { setErro(ruim.message); return; }
      setPorFicha((f.data ?? []) as FichaLinha[]);
      setMencoes((m.data ?? []) as Mencao[]);
      setCobertura((c.data ?? []) as Cobertura[]);
      setPosts((p.data ?? []) as Post[]);
    })();
  }, []);

  // o que o filtro muda: painel, tabela por dia e a fila. Os três refazem a leitura com os filtros como
  // parâmetro — é o que a R-049 pede, e é também o que impede a tela de exibir um número de outra base.
  // `vivo` não é zelo: trocar de janela duas vezes rápido faria a resposta velha chegar por último, e a
  // tela mostraria o período que o dono acabou de abandonar.
  useEffect(() => {
    let vivo = true;
    (async () => {
      const args = {
        p_ficha: ficha === TODAS ? null : ficha,
        p_janela: janela,
        p_incluir_fechadas: incluirFechadas,
      };
      let q = supabase.from('v_mkt_gbp_avaliacoes')
        .select('review_id,ficha,estrelas,comentario,criada_em')
        .lte('estrelas', 3).neq('status', 'publicada')
        .order('estrelas').order('criada_em', { ascending: false });
      if (ficha !== TODAS) q = q.eq('ficha', ficha);

      const [pa, di, av] = await Promise.all([
        supabase.rpc('rpc_gbp_painel', args),
        supabase.rpc('rpc_gbp_por_dia', args),
        q,
      ]);
      if (!vivo) return;
      const ruim = pa.error ?? di.error ?? av.error;
      if (ruim) { setErro(ruim.message); return; }
      setPainel(((pa.data ?? [])[0] ?? null) as Painel | null);
      setDias((di.data ?? []) as DiaLinha[]);
      setFila((av.data ?? []) as Avaliacao[]);
      setPronto(true);
    })();
    return () => { vivo = false; };
  }, [ficha, janela, incluirFechadas]);

  const infoFicha = useMemo(() => new Map(porFicha.map((f) => [f.ficha, f])), [porFicha]);
  const fechadas = useMemo(
    () => porFicha.filter((f) => f.situacao === FECHADA).map((f) => f.ficha),
    [porFicha],
  );
  const dentro = useMemo(() => {
    return (nome: string) => {
      if (ficha !== TODAS) return nome === ficha;
      if (incluirFechadas) return true;
      return infoFicha.get(nome)?.situacao !== FECHADA;
    };
  }, [ficha, incluirFechadas, infoFicha]);

  // A fila vem filtrada por ficha no servidor, mas a base (aberta × fechada) ainda se aplica aqui, porque
  // o filtro é por situação e ela mora na outra consulta. Se a contagem divergir do painel, a tela avisa —
  // é a prova da R-049 feita ao vivo, não só na migration.
  const filaBase = useMemo(() => fila.filter((r) => dentro(r.ficha)), [fila, dentro]);
  const divergeFila = !!painel && painel.ruins_sem_resposta !== filaBase.length;

  const postsF = useMemo(() => posts.filter((p) => dentro(p.ficha)), [posts, dentro]);
  const semConfirmacao = useMemo(
    () => postsF.filter((p) => p.status === 'publicado' && p.estado_google === null),
    [postsF],
  );
  // Publicado HOJE e sem leitura não é falha — é "ainda não lido"; o alarme é o que passou de um dia.
  const alarmePosts = useMemo(
    () => semConfirmacao.filter((p) => p.publicado_em && diasAtras(p.publicado_em) > 1),
    [semConfirmacao],
  );
  const cancelados = useMemo(() => postsF.filter((p) => p.status === 'cancelado'), [postsF]);
  const noArTotal = useMemo(() => postsF.filter((p) => p.estado_google === 'LIVE').length, [postsF]);
  // Cancelado agrupado pelo MOTIVO escrito: contagem sem motivo faz o dono procurar culpado onde houve
  // escolha — e aqui os motivos dizem "dono 08/10" e "dono 28/10".
  const motivos = useMemo(() => {
    const mapa = new Map<string, number>();
    for (const p of cancelados) {
      const k = p.erro?.trim() || 'sem motivo escrito';
      mapa.set(k, (mapa.get(k) ?? 0) + 1);
    }
    return [...mapa.entries()].sort((a, b) => b[1] - a[1]);
  }, [cancelados]);

  const mencoesF = useMemo(() => mencoes.filter((m) => dentro(m.ficha)), [mencoes, dentro]);
  const mesAtual = useMemo(() => mencoesF[0]?.mes ?? '', [mencoesF]);
  const cobAtual = useMemo(
    () => cobertura.filter((c) => dentro(c.ficha)).filter((c) => c.mes === mesAtual)
      .reduce(
        (s, c) => ({
          avaliacoes: s.avaliacoes + c.avaliacoes, com: s.com + c.com_nome, sem: s.sem + c.sem_nome,
        }),
        { avaliacoes: 0, com: 0, sem: 0 },
      ),
    [cobertura, mesAtual, dentro],
  );
  const semConfirmar = mencoesF.some((m) => !m.confirmado);

  if (erro) {
    return (
      <div className="border border-outline/15 bg-surface-container px-4 py-3">
        <span className="inline-flex items-center gap-2 text-warning">
          <AlertTriangle className="w-4 h-4" /> {erro}
        </span>
      </div>
    );
  }
  if (!pronto || !painel) {
    return (
      <div className="px-4 py-3 text-muted">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
          <Loader2 className="w-3 h-3 animate-spin" /> lendo o Google Meu Negócio
        </span>
      </div>
    );
  }

  const fichas = porFicha.map((f) => f.ficha);
  const abertas = fichas.filter((f) => infoFicha.get(f)?.situacao !== FECHADA).length;
  const baseRotulo = ficha !== TODAS
    ? `uma ficha (${infoFicha.get(ficha)?.situacao === FECHADA ? 'loja fechada de vez' : 'loja aberta'})`
    : incluirFechadas
      ? `todas as ${fichas.length} fichas, incluindo ${fechadas.length} de loja fechada de vez`
      : `${abertas} ${abertas === 1 ? 'ficha aberta' : 'fichas abertas'}` +
        (fechadas.length ? ` · ${fechadas.length} de loja fechada de vez fora do total` : '');

  const janelaRotulo = janela ? `${janela} dias` : 'série inteira';
  const periodoPerf = painel.perf_ini && painel.perf_fim
    ? `${brCurto(painel.perf_ini)}–${brCurto(painel.perf_fim)} · ${painel.perf_dias} ${
        painel.perf_dias === 1 ? 'dia' : 'dias'} fechados`
    : 'sem dia fechado';
  const periodoHoje = janela ? `${brCurto(painel.janela_ini)}–${brCurto(painel.hoje)}` : 'desde 2017';
  const atraso = painel.ultimo_fechado ? diasAtras(painel.ultimo_fechado) : null;
  const media = num(painel.aval_media);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <div>
          <h1 className="text-lg text-on-surface">Google Meu Negócio</h1>
          <p className="text-[13px] text-muted mt-1">
            Base desta tela: {baseRotulo}. O número que decide é o de cima: avaliação ruim sem resposta.
          </p>
        </div>
        <div className="font-mono text-[10px] uppercase tracking-wider text-muted text-right leading-relaxed">
          {painel.lido_em
            ? <>lido do Google em {horaBrasilia(painel.lido_em)}</>
            : <span className="text-warning">sem leitura registrada</span>}
          <br />
          {painel.ultimo_fechado ? (
            <>
              último dia fechado {br(painel.ultimo_fechado)}
              {atraso !== null && (
                <span className={atraso > 7 ? 'text-warning' : ''}> · {atraso} dias de atraso</span>
              )}
            </>
          ) : <span className="text-warning">nenhum dia fechado nesta ficha</span>}
          <br />
          {painel.avaliacoes_lidas_em
            ? <>
                avaliações lidas em {horaBrasilia(painel.avaliacoes_lidas_em)}
                {painel.leitura_divergente && (
                  <span className="text-warning"> · ficha atrasada na leitura</span>
                )}
              </>
            : <span className="text-warning">sem carimbo de leitura de avaliação</span>}
        </div>
      </div>

      {divergeFila && (
        <div className="border border-warning/30 bg-warning/10 px-3 py-2 text-[13px] text-warning">
          <AlertTriangle className="w-3.5 h-3.5 inline mr-1.5 -mt-0.5" />
          O painel diz {painel.ruins_sem_resposta} ruins sem resposta e a lista trouxe {filaBase.length}.
          É a mesma pergunta em duas leituras — enquanto discordarem, não decida por nenhuma das duas.
        </div>
      )}

      {/* filtro — tudo aqui vira parâmetro da consulta, não corte depois da soma */}
      <div className="border border-outline/15 bg-surface-container px-3 py-2 flex flex-wrap items-center gap-x-5 gap-y-2">
        <label className="flex items-center gap-2">
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">Ficha</span>
          <select
            value={ficha}
            onChange={(e) => setFicha(e.target.value)}
            className="bg-surface-low border border-outline/20 px-2 py-1 text-[13px] text-on-surface"
          >
            <option value={TODAS}>
              {incluirFechadas ? `Todas as ${fichas.length} fichas` : `${abertas} fichas abertas`}
            </option>
            {fichas.map((f) => (
              <option key={f} value={f}>
                {f}{infoFicha.get(f)?.situacao === FECHADA ? ' · fechada de vez' : ''}
              </option>
            ))}
          </select>
        </label>
        {fechadas.length > 0 && ficha === TODAS && (
          <button
            onClick={() => setIncluirFechadas((v) => !v)}
            className={`px-2.5 py-1 text-[12px] border transition-colors ${
              incluirFechadas
                ? 'border-outline-strong bg-surface-highest text-on-surface'
                : 'border-outline/20 text-muted hover:text-on-surface'
            }`}
          >
            incluir {fechadas.length} de loja fechada
          </button>
        )}
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

      {/* KPIs — todos vindos de rpc_gbp_painel, nenhum somado aqui */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <MetricStat
          label="Aparições"
          value={painel.aparicoes !== null ? painel.aparicoes.toLocaleString('pt-BR') : '—'}
          hint={<Variacao atual={painel.aparicoes} anterior={painel.ant_aparicoes}
                          dias={painel.perf_dias ?? 0} comparavel={painel.comparavel} />}
        />
        <MetricStat
          label="Rotas pedidas"
          value={painel.rotas !== null ? painel.rotas.toLocaleString('pt-BR') : '—'}
          hint={<Variacao atual={painel.rotas} anterior={painel.ant_rotas}
                          dias={painel.perf_dias ?? 0} comparavel={painel.comparavel} />}
        />
        <MetricStat
          label="Ligações"
          value={painel.ligacoes !== null ? painel.ligacoes.toLocaleString('pt-BR') : '—'}
          hint={<Variacao atual={painel.ligacoes} anterior={painel.ant_ligacoes}
                          dias={painel.perf_dias ?? 0} comparavel={painel.comparavel} />}
        />
        <MetricStat
          label="Cliques no site"
          value={painel.cliques_site === null
            ? <span className="text-muted text-base">não coletado</span>
            : painel.cliques_site.toLocaleString('pt-BR')}
          hint={painel.cliques_site === null
            ? 'vem nulo da origem nas 6 fichas — não é zero'
            : periodoPerf}
        />
        <MetricStat
          label="No ar pelo Google"
          value={painel.no_ar_janela.toLocaleString('pt-BR')}
          hint={`posts confirmados pela API · ${periodoHoje}`}
        />
        <MetricStat
          label="Avaliações no período"
          value={painel.aval_periodo.toLocaleString('pt-BR')}
          hint={painel.aval_periodo > 0 && media !== null
            ? `média ${media.toFixed(2)} · ${periodoHoje}`
            : `nenhuma em ${periodoHoje}`}
        />
        <MetricStat
          label="Ruins sem resposta"
          value={<span className={painel.ruins_sem_resposta ? 'text-warning' : undefined}>
            {painel.ruins_sem_resposta}
          </span>}
          hint={ficha === TODAS && !incluirFechadas && painel.ruins_fora_da_base > 0
            ? <>fila inteira, sem corte de período<span className="text-muted">
                {' '}· mais {painel.ruins_fora_da_base} em loja fechada de vez, fora deste número</span></>
            : 'fila inteira, sem corte de período — avaliação velha sem resposta custa igual'}
        />
        <MetricStat
          label="Agendados"
          value={painel.agendados.toLocaleString('pt-BR')}
          hint={painel.falhas
            ? <span className="text-warning">{painel.falhas} com falha de publicação</span>
            : 'nenhuma falha de publicação'}
        />
      </div>

      {painel.incompleto && (
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
            Ruins sem resposta · {filaBase.length}
          </span>
        </div>
        {filaBase.length === 0 ? (
          <div className="px-3 py-3 text-[13px] text-muted">Nenhuma avaliação de ≤3 estrelas sem resposta.</div>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {filaBase.map((r) => (
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
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted">
          "Sem resposta" aqui é <code>status</code> diferente de <code>publicada</code>, e não{' '}
          <code>publicada_em</code> nulo. A diferença são 7 avaliações ruins já respondidas que não têm
          carimbo de publicação (127 no total, todas com texto de resposta gravado). Eu medi pelo carimbo
          primeiro e reportei 21 ruins sem resposta; a fila de verdade é esta. A migration 206 trava essa
          diferença em 7, para as duas leituras não voltarem a se confundir em silêncio.
        </div>
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
                <th className="text-left px-3 py-2">Loja</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">90 dias</th>
                <th className="text-right px-3 py-2">Média</th>
                <th className="text-right px-3 py-2">Sem resposta</th>
                <th className="text-left px-3 py-2">Última avaliação</th>
              </tr>
            </thead>
            <tbody>
              {porFicha.map((f) => {
                const sel = ficha === f.ficha;
                const d = f.ultima_avaliacao_em ? diasAtras(f.ultima_avaliacao_em) : null;
                const m = num(f.media);
                return (
                  <tr
                    key={f.ficha}
                    className={`border-t border-outline/10 cursor-pointer ${
                      sel ? 'bg-surface-highest' : 'hover:bg-surface-low'
                    }`}
                    onClick={() => setFicha(sel ? TODAS : f.ficha)}
                  >
                    <td className="px-3 py-2 text-on-surface">{f.ficha}</td>
                    <td className="px-3 py-2">
                      {f.situacao === FECHADA ? (
                        <span className="text-muted font-mono text-[10px] uppercase">fechada de vez</span>
                      ) : (
                        <span className="font-mono text-[10px] uppercase text-success">
                          aberta
                          {f.posts_motor === false && <span className="text-warning"> · motor off</span>}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-right text-on-surface">{f.total}</td>
                    <td className="px-3 py-2 text-right">
                      {f.noventa === 0
                        ? <span className="text-muted font-mono text-[10px] uppercase">nenhuma</span>
                        : <span className="text-on-surface">{f.noventa}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-on-surface">
                      {m !== null ? m.toFixed(2) : <span className="text-muted">—</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-on-surface">
                      {f.sem_resposta}
                      {f.ruins_sem_resposta > 0 && (
                        <span className="text-warning"> · {f.ruins_sem_resposta} ruim</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      {f.ultima_avaliacao_em && d !== null ? (
                        <span className={d > 365 ? 'text-warning' : 'text-muted'}>
                          {br(f.ultima_avaliacao_em)} · {d} dias
                        </span>
                      ) : <span className="text-muted">nenhuma</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted">
          Clicar na linha filtra a tela inteira por aquela ficha. Esta tabela fica sempre com as{' '}
          {porFicha.length} — tirar as fechadas tiraria a comparação, que é a razão dela existir, e por isso
          a função que a alimenta nem recebe o chip de base. <span className="text-on-surface">A coluna
          "Loja" vem de <code>situacao</code>:</span> as quatro da Mello estão fechadas de vez desde 28/10
          às 22:32, com os posts até 03/11 cancelados pelo motivo escrito "loja física fechou de vez; posts
          parados (dono 28/10)". É decisão registrada, não falha.
          <br />
          <span className="text-on-surface">"Nenhuma" na coluna de 90 dias é a ficha calada, não a nossa
          coleta parada</span> — os dois carimbos separam as duas coisas: <code>avaliacoes_lidas_em</code>{' '}
          (no cabeçalho) diz quando <em>nós</em> lemos, e "Última avaliação" diz quando <em>alguém</em>{' '}
          avaliou. Eu pedi ao MKT o carimbo errado e concluí que a coleta tinha parado; não tinha.
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
            {noArTotal}
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
          <span className={painel.falhas ? 'text-warning' : 'text-on-surface'}>
            {painel.falhas}
            <span className={painel.falhas ? '' : 'text-muted'}> falhas de publicação</span>
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
              motivo escrito diz quem decidiu e quando. Falha de publicação de verdade conta na linha de
              cima, separada — e hoje é zero medido.
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
                  <td className="px-3 py-2 text-right text-on-surface">{d.nossos ?? 0}</td>
                  <td className={`px-3 py-2 text-right ${
                    (d.no_ar_google ?? 0) < (d.nossos ?? 0) ? 'text-warning' : 'text-on-surface'
                  }`}>
                    {d.no_ar_google ?? 0}
                  </td>
                  {d.aberto ? (
                    <td colSpan={4} className="px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        ainda não fechou · o relatório do Google atrasa alguns dias
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-right text-on-surface">{d.aparicoes ?? 0}</td>
                      <td className="px-3 py-2 text-right text-on-surface">{d.rotas ?? 0}</td>
                      <td className="px-3 py-2 text-right text-on-surface">{d.ligacoes ?? 0}</td>
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
            <strong className="text-on-surface">Os KPIs de cima e esta tabela terminam no mesmo dia, e
            isso é correção de hoje.</strong> As duas usam a janela ancorada no último dia fechado
            ({painel.perf_fim ? br(painel.perf_fim) : '—'}
            {atraso !== null ? `, ${atraso} dias de atraso` : ''}); os dias seguintes aparecem como "ainda
            não fechou". A primeira versão da função por dia pegava os dias mais recentes e falava de um
            período diferente do número de cima — quem pegou foi a prova da migration 206, que exige o
            total bater com a soma das linhas. Série com {painel.serie_fechados} dias fechados.
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
