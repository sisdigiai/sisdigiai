// Espelhos read-only dos motores de conteúdo que vivem FORA do banco digiai:
// Limelight Studio (fábrica da Mello, projeto gfdpvasbrxwulvpvyfvr) e
// Pulso Control (canais faceless, projeto nlcisbfdiokmipyihtuz).
// Views agregadas v_espelho_* criadas em 2026-07-30 — só números, zero PII;
// anon keys são públicas por design (mesma classe do bundle de cada app).
import { supabase } from './supabase';

// Chaves e URLs vêm SÓ do ambiente, sem literal de reserva (09/09/2026).
//
// Antes era `import.meta.env.X || 'eyJ...'`. Parecia reserva e não era: conferido
// pelo bundle publicado em 08/09, as variáveis não existiam em lugar nenhum, então
// o literal era a ÚNICA fonte — em produção. Chave fixa em código é chave que
// ninguém troca, e R-021 manda rotacionar a cada 90 dias; esse é o motivo, não
// sigilo (anon key é pública por desenho).
//
// Sem a variável, o espelho DESLIGA e diz por quê — não cai num valor escondido.
const LIMELIGHT_URL = import.meta.env.VITE_LIMELIGHT_SUPABASE_URL;
const LIMELIGHT_ANON = import.meta.env.VITE_LIMELIGHT_SUPABASE_ANON_KEY;
const PULSO_URL = import.meta.env.VITE_PULSO_SUPABASE_URL;
const PULSO_ANON = import.meta.env.VITE_PULSO_SUPABASE_ANON_KEY;
const BLOGS_URL = import.meta.env.VITE_BLOGS_SUPABASE_URL;

export interface EspelhoLimelight {
  episodios: number;
  episodios_prontos: number;
  ideias: number;
  publicacoes: number;
  fila: number;
  custo_ia_usd: number;
  ultima_coleta: string | null;
  seguidores: Record<string, number>;
  // Views adicionadas em 2026-08-25: existiam em limelight_medicao.leituras mas o
  // espelho nao expunha — 23 mil views da fabrica Mello invisiveis no painel.
  views_total?: number | null;
  views_por_plataforma?: Record<string, number> | null;
  ultima_leitura?: string | null;
}

// Rede de 5 blogs regionais (projeto blogs/ — AI Visibility Lab). Audiencia
// first-party ADR-0036, zero PII. Numeros pequenos e REAIS: medicao desde 20/08.
export interface EspelhoBlogs {
  posts_publicados: number;
  posts_no_ar: number;
  ultima_publicacao: string | null;
  leituras_total: number;
  leituras_30d: number;
  sessoes_total: number;
  ultima_leitura: string | null;
  leituras_por_blog: Record<string, number>;
}

export interface EspelhoPulso {
  publicacoes: number;
  views_total: number;
  views_por_plataforma: Record<string, number>;
  ultima_publicacao: string | null;
  ultima_descoberta: string | null;
  pipeline: Record<string, number>;
  ideias: number;
  canais: number;

  // Financeiro (o Pulso passou a publicar em 2026-08-24).
  //
  // TRAVA: `custo_caixa_*` e `custo_consumo_*` NUNCA se somam. O Pulso compra
  // credito do Higgsfield (topup, dinheiro saindo) e depois consome esse credito
  // gerando video (higgsfield, uso do que ja foi pago). Somar da R$ 9.873 e infla
  // o burn em ~3,8x. E o mesmo erro que o proprio digiai cometeu em junho/2026,
  // somando aporte intelectual ao caixa e mostrando burn de ~R$ 45k/mes quando o
  // real era R$ 1-3k -- corrigido pela migration 026 com coluna separada.
  custo_caixa_total_brl?: number | null;
  custo_caixa_mes_brl?: number | null;
  /** Uso de credito ja comprado. Metrica gerencial de eficiencia, NAO despesa. */
  custo_consumo_total_brl?: number | null;
  custo_por_servico?: Record<string, number> | null;
  receita_total_brl?: number | null;
  receita_mes_brl?: number | null;
  /** So o que ja caiu na conta. */
  receita_recebida_brl?: number | null;
  custo_caixa_por_video_brl?: number | null;
}

// Series diarias dos motores externos (2026-08-25) — pro Crescimento aplicar
// periodo/rede/marca sobre TODAS as fontes, nao so as redes Meta do schema mkt.
export interface PulsoDia { dia: string; plataforma: string; publicacoes: number; views: number; likes: number; comentarios: number; shares: number; saves: number }
export interface LimePubDia { dia: string; plataforma: string; publicacoes: number; views: number; likes: number; comentarios: number; shares: number }
export interface LimelightDia { dia: string; plataforma: string; seguidores: number | null; alcance: number | null }
export interface BlogDia { dia: string; blog_slug: string; leituras: number; sessoes: number }

// Os tres leitores abaixo devolvem vazio quando falham — e isso e proposital: espelho de outro
// produto fora do ar nao pode derrubar a tela do digiai. Mas ficar em silencio TAMBEM nao serve:
// era assim que 'motor rodando, painel cego' passava por normalidade. Falha agora vai ao console
// com a view e o status; a tela continua degradando sem quebrar. (08/09/2026)
// 09/10: o console não basta. A tela do comparativo põe os motores lado a lado, e ali "0 publicações"
// e "não consegui ler o espelho" levam a decisões opostas — o primeiro é o motor parado, o segundo é o
// painel cego. Então o leitor passa a devolver o MOTIVO junto das linhas, e a tela escreve qual é.
// `lerLinhas` continua existindo com a assinatura antiga porque as outras telas dependem dela.
// `bloqueado` existe à parte porque o Supabase devolve **402** quando o projeto está restrito (cota
// estourada), e isso não é "não consegui ler": é "o banco daquele app está fora do ar". Quem lê a tela
// precisa saber qual das duas, porque uma se resolve com credencial e a outra com plano ou espaço.
export type EstadoEspelho = 'ok' | 'sem_credencial' | 'erro' | 'bloqueado';

// O ESPELHO TAMBÉM TEM TETO. (20/11/2026) A API corta QUALQUER resposta em 1.000 linhas e devolve
// isso como sucesso — vale para o banco do digiai e vale para o de cada motor. Medido hoje na base do
// Pulso: `v_espelho_pulso_contas_dias` 757 linhas, `v_seguidores_pulso_dias` 683, e as duas crescem
// todo dia. Sem página, o dia em que passarem de mil o painel some com as linhas mais novas (a ordem
// é crescente por dia) sem erro nenhum — exatamente o que ia acontecer com a `audiencia_diaria` no
// fim de semana. Pagina-se até vir página curta.
//
// A ORDEM PRECISA SER ÚNICA, e por isso `ordem` é argumento: cada página é uma consulta nova, e
// linhas empatadas na coluna de ordenação podem repetir numa página e sumir de outra — em silêncio.
// `dia` sozinho empata em quase tudo aqui (várias contas e redes no mesmo dia).
const PAGINA_ESPELHO = 1000;

async function lerLinhasEstado<T>(base: string | undefined, anon: string | undefined, view: string, ordem = 'dia.asc'):
  Promise<{ linhas: T[]; estado: EstadoEspelho; detalhe?: string }> {
  if (!base || !anon) {
    console.error('[espelho] %s: variavel de ambiente ausente — espelho desligado', view);
    return { linhas: [], estado: 'sem_credencial', detalhe: 'variável de ambiente ausente' };
  }
  const todas: T[] = [];
  try {
    for (let de = 0; de < 50000; de += PAGINA_ESPELHO) {
      const r = await fetch(`${base}/rest/v1/${view}?select=*&order=${ordem}&limit=${PAGINA_ESPELHO}&offset=${de}`, {
        headers: { apikey: anon, Authorization: `Bearer ${anon}` },
        signal: AbortSignal.timeout(12000),
      });
      if (r.status === 402) {
        console.error('[espelho] %s: projeto restrito pelo Supabase (402)', view);
        return { linhas: [], estado: 'bloqueado', detalhe: 'banco do app está restrito pelo Supabase' };
      }
      if (!r.ok) {
        console.error('[espelho] %s: HTTP %s', view, r.status);
        return { linhas: [], estado: 'erro', detalhe: `HTTP ${r.status}` };
      }
      const rows = await r.json();
      const lote = Array.isArray(rows) ? (rows as T[]) : [];
      todas.push(...lote);
      if (lote.length < PAGINA_ESPELHO) break;
    }
    return { linhas: todas, estado: 'ok' };
  } catch (e) {
    console.error('[espelho] %s inacessivel', view, e);
    return { linhas: [], estado: 'erro', detalhe: e instanceof Error ? e.message : 'inacessível' };
  }
}

async function lerLinhas<T>(base: string | undefined, anon: string | undefined, view: string, ordem = 'dia.asc'): Promise<T[]> {
  return (await lerLinhasEstado<T>(base, anon, view, ordem)).linhas;
}

async function lerEspelho<T>(base: string | undefined, anon: string | undefined, view: string): Promise<T | null> {
  if (!base || !anon) { console.error('[espelho] %s: variavel de ambiente ausente — espelho desligado', view); return null; }
  try {
    const r = await fetch(`${base}/rest/v1/${view}?select=*`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) { console.error('[espelho] %s: HTTP %s', view, r.status); return null; }
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? (rows[0] as T) : null;
  } catch (e) {
    console.error('[espelho] %s inacessivel', view, e);
    return null;
  }
}

const BLOGS_ANON = import.meta.env.VITE_BLOGS_SUPABASE_ANON_KEY;

// 2026-09-08: v_espelho_pulso (agregado COM custo/receita do Pulso) deixou de ser lida com a
// anon key do Pulso — era legível por qualquer portador da chave do bundle. Agora vem pela edge
// function `espelho-pulso` do PRÓPRIO digiai, gateada pela sessão do usuário (auth.getUser no
// servidor), que lê o Pulso com credencial de servidor. Sem sessão = null, nunca dado.
// v_espelho_pulso_dias (só engajamento por dia) segue anon por desenho.
const DIGIAI_URL = import.meta.env.VITE_SUPABASE_URL as string;
const DIGIAI_ANON = import.meta.env.VITE_SUPABASE_ANON_KEY as string;
async function lerPulsoGateado(): Promise<EspelhoPulso | null> {
  try {
    const { data } = await supabase.auth.getSession();
    const jwt = data.session?.access_token;
    if (!jwt || !DIGIAI_URL) return null; // sem sessao e estado normal, nao erro
    const r = await fetch(`${DIGIAI_URL}/functions/v1/espelho-pulso`, {
      headers: { apikey: DIGIAI_ANON, Authorization: `Bearer ${jwt}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) { console.error('[espelho] espelho-pulso: HTTP %s', r.status); return null; }
    const row = await r.json();
    return row && typeof row === 'object' ? (row as EspelhoPulso) : null;
  } catch (e) {
    console.error('[espelho] espelho-pulso inacessivel', e);
    return null;
  }
}

// 09/10: espelho do Polá (`v_pola_redes_metricas_dia`, só números, sem PII, BRT). As variáveis ainda não
// existem no painel do Cloudflare — e é por isso que o estado importa: sem elas a linha do Polá tem de
// dizer "falta credencial", não "0 publicações".
const POLA_URL = import.meta.env.VITE_POLA_SUPABASE_URL as string | undefined;
const POLA_ANON = import.meta.env.VITE_POLA_SUPABASE_ANON_KEY as string | undefined;
// As colunas REAIS da view da Polá, conferidas no painel dela em 18/11. O tipo anterior
// (`plataforma, publicacoes, views`) era um palpite de quando o leitor foi escrito: a view entrega
// `rede` e `posts_no_dia`, e não tem "views" — tem alcance, impressões e interações, que são coisas
// diferentes. Ler uma pela outra daria zero em tudo sem erro nenhum.
export interface PolaDia {
  dia: string; rede: string;
  posts_no_dia: number | null;
  alcance: number | null; impressoes: number | null; interacoes: number | null;
  seguidores: number | null; aparicoes: number | null; ligacoes: number | null;
  cliques_site: number | null; rotas: number | null;
  hora_do_post: string | null; lido_em: string | null;
}

// Cortes e longos do Pulso, nas contas DELE (2026-11-17, pedido meu ao Pulso no mesmo dia). Ficavam em
// `pulso_analytics.leituras_longos`, sem espelho, e por isso não entravam no total do painel do dono.
// As contas da DIGIAI ficam FORA desta view de propósito: elas já estão na v_mkt_analytics_peca_dia, e
// somar as duas contaria a mesma peça duas vezes. Conferido por mim como anon em 17/11: 30 linhas,
// 1.084 views, 0 linhas com conta da DIGIAI.
export interface PulsoLongoDia {
  dia: string; plataforma: string; conta: string; tipo: 'corte' | 'longo';
  publicacoes: number; views: number; likes: number; comentarios: number; shares: number;
  horas_exibicao: number | null; retencao_media_pct: number | null;
}

// O PULSO POR CONTA (20/11/2026, por ordem do dono: "o cartão PULSO vira três").
//
// `v_espelho_pulso_contas_dias` é a soma exata das duas views anteriores — `v_espelho_pulso_dias`
// (os curtos do canal principal) mais `v_espelho_pulso_longos_dias` (cortes e longos) — e acrescenta
// MARCA e CONTA. Conferido por mim como anon em 20/11, linha a linha: 757 linhas, 813.022 views,
// 1.371 publicações; as 53 linhas que não são 'curto' batem com as 53 dos longos, 1.658 views, zero
// chave divergente. Não há soma dupla — há a mesma soma, repartiível.
//
// Por que isso importa: o Radar lia só a `v_espelho_pulso_dias`, então os cortes e os longos do Pulso
// (1.658 views) não entravam no número grande, e o PULSO aparecia como UM canal quando são três
// marcas — PULSO Histórias, Cortes e Bastidores — com desempenho muito diferente.
//
// AS DUAS VIEWS DATAM O MESMO DIA DE FORMA DIFERENTE, e isso foi medido antes de trocar a fonte:
// o total histórico bate exato (811.364 views nas duas), mas em 544 pares (dia, plataforma) a view
// ANTIGA põe as mesmas views **um dia depois**. É desvio de fuso: a `v_espelho_pulso_dias` nasceu
// datando em UTC, e as duas novas (contas e longos, feitas em 17 e 20/11) datam no dia do negócio,
// BRT — que é a regra da casa. Consequência prática: num recorte de 30 dias a borda muda, medido
// hoje em 107.600 → 105.452 views no canal principal. Não é view perdida, é view no dia certo.
// Pedi ao agente do Pulso que confirme a coluna de data das três views.
//
// As contas da DIGIAI continuam FORA destas views, de propósito: elas já estão na
// v_mkt_analytics_peca_dia, e somar as duas contaria a mesma peça duas vezes.
export interface PulsoContaDia {
  dia: string; marca: string; conta: string; plataforma: string; tipo: 'curto' | 'corte' | 'longo';
  publicacoes: number; views: number; likes: number; comentarios: number; shares: number;
}
// O QUE OS POSTS DO PULSO GANHARAM NO DIA (27/11/2026, view nova do Pulso, `111`).
//
// `v_espelho_pulso_contas_dias` responde "por publicação": soma o total ATUAL dos posts publicados
// naquele dia. Esta responde "por leitura": o que TODOS os posts, antigos e novos, ganharam naquele
// dia — leitura do dia menos a anterior, e a primeira leitura conta inteira.
//
// São perguntas diferentes e o painel tem as duas réguas; até 27/11 o Pulso entrava nas duas com a
// primeira, então a coluna dele por LEITURA mostrava outra coisa.
//
// `posts_com_movimento` é o que torna o número lido: 1.067 posts lidos em 26/11 e só 62 com
// movimento. Sem ele, "1.824 views" parece vir de mil peças. Kwai fica de fora (só print manual).
// Conferido por mim como anon em 27/11, contra os números que o Pulso declarou: batem exatos.
export interface PulsoLeituraDia {
  dia: string; marca: string; conta: string; plataforma: string; tipo: 'curto' | 'corte' | 'longo';
  posts_lidos: number; posts_com_movimento: number;
  views: number; likes: number; comentarios: number; shares: number;
}
export interface PulsoSegDia { dia: string; marca: string; conta: string; rede: string; seguidores: number | null }
/** Toda conta do Pulso, inclusive a que não mede — conta sem leitura precisa APARECER dizendo isso. */
export interface PulsoConta {
  marca: string; conta: string; rede: string;
  mede_views: boolean; mede_seguidores: boolean; observacao: string | null;
}

// Espelho da Polá Petit no formato de MOTOR (`v_espelho_polapetit_dias`, publicada pelo agente da
// Polá em 21/11/2026, projeto cvqoqnjitqvuopqadfbh). Mesmas colunas dos espelhos do Pulso e do
// Limelight — só número, leitura anon.
//
// ATENÇÃO, E ISTO FOI MEDIDO ANTES DE LIGAR: a Polá NÃO é um motor como o Pulso e o Limelight. Eles
// publicam em canais PRÓPRIOS (conferido em 17/11: zero linhas cruzadas). A Polá é marca da casa, e
// o app dela mede a **mesma conta de Instagram** que o MKT já publica e lê. Medido em 21/11: a casa
// tem 96 peças de Instagram da Polá com **103.698 views**, e o espelho dela reporta **43.321** no
// mesmo Instagram. Somar os dois contaria a mesma postagem duas vezes.
//
// Por isso o cartão da Polá fica FORA do número grande e diz isso na tela. E a divergência entre as
// duas medições é pergunta aberta para a Polá e o MKT — não se resolve com média nem escolhendo a
// maior.
export interface PolaPetitDia {
  dia: string; plataforma: string;
  publicacoes: number | null; views: number | null;
  likes: number | null; comentarios: number | null; shares: number | null; saves: number | null;
  seguidores: number | null; views_conta: number | null; alcance_conta: number | null;
}

// Leitores com motivo, para a tela do comparativo. Os sem estado continuam para as telas antigas.
export const espelhoMotoresEstado = {
  pulsoDias: () => lerLinhasEstado<PulsoDia>(PULSO_URL, PULSO_ANON, 'v_espelho_pulso_dias', 'dia.asc,plataforma.asc'),
  pulsoLongosDias: () => lerLinhasEstado<PulsoLongoDia>(PULSO_URL, PULSO_ANON, 'v_espelho_pulso_longos_dias', 'dia.asc,conta.asc,plataforma.asc,tipo.asc'),
  pulsoContasDias: () => lerLinhasEstado<PulsoContaDia>(PULSO_URL, PULSO_ANON, 'v_espelho_pulso_contas_dias', 'dia.asc,conta.asc,plataforma.asc,tipo.asc'),
  pulsoLeiturasDias: () => lerLinhasEstado<PulsoLeituraDia>(PULSO_URL, PULSO_ANON, 'v_espelho_pulso_leituras_dias', 'dia.asc,conta.asc,plataforma.asc,tipo.asc'),
  pulsoSeguidoresDias: () => lerLinhasEstado<PulsoSegDia>(PULSO_URL, PULSO_ANON, 'v_seguidores_pulso_dias', 'dia.asc,conta.asc,rede.asc'),
  pulsoContas: () => lerLinhasEstado<PulsoConta>(PULSO_URL, PULSO_ANON, 'v_contas_pulso', 'marca.asc,conta.asc,rede.asc'),
  limelightPubDias: () => lerLinhasEstado<LimePubDia>(LIMELIGHT_URL, LIMELIGHT_ANON, 'v_espelho_limelight_pub_dias', 'dia.asc,plataforma.asc'),
  blogsDias: () => lerLinhasEstado<BlogDia>(BLOGS_URL, BLOGS_ANON, 'v_espelho_blogs_dias', 'dia.asc,blog_slug.asc'),
  polaDias: () => lerLinhasEstado<PolaDia>(POLA_URL, POLA_ANON, 'v_pola_redes_metricas_dia', 'dia.asc,rede.asc'),
  polaPetitDias: () => lerLinhasEstado<PolaPetitDia>(POLA_URL, POLA_ANON, 'v_espelho_polapetit_dias', 'dia.asc,plataforma.asc'),
};

export const espelhoMotores = {
  limelight: () => lerEspelho<EspelhoLimelight>(LIMELIGHT_URL, LIMELIGHT_ANON, 'v_espelho_limelight'),
  pulso: () => lerPulsoGateado(),
  blogs: () => lerEspelho<EspelhoBlogs>(BLOGS_URL, BLOGS_ANON, 'v_espelho_blogs'),
  pulsoDias: () => lerLinhas<PulsoDia>(PULSO_URL, PULSO_ANON, 'v_espelho_pulso_dias', 'dia.asc,plataforma.asc'),
  pulsoContasDias: () => lerLinhas<PulsoContaDia>(PULSO_URL, PULSO_ANON, 'v_espelho_pulso_contas_dias', 'dia.asc,conta.asc,plataforma.asc,tipo.asc'),
  pulsoSeguidoresDias: () => lerLinhas<PulsoSegDia>(PULSO_URL, PULSO_ANON, 'v_seguidores_pulso_dias', 'dia.asc,conta.asc,rede.asc'),
  pulsoContas: () => lerLinhas<PulsoConta>(PULSO_URL, PULSO_ANON, 'v_contas_pulso', 'marca.asc,conta.asc,rede.asc'),
  limelightDias: () => lerLinhas<LimelightDia>(LIMELIGHT_URL, LIMELIGHT_ANON, 'v_espelho_limelight_dias', 'dia.asc,plataforma.asc'),
  limelightPubDias: () => lerLinhas<LimePubDia>(LIMELIGHT_URL, LIMELIGHT_ANON, 'v_espelho_limelight_pub_dias', 'dia.asc,plataforma.asc'),
  blogsDias: () => lerLinhas<BlogDia>(BLOGS_URL, BLOGS_ANON, 'v_espelho_blogs_dias', 'dia.asc,blog_slug.asc'),
  polaPetitDias: () => lerLinhasEstado<PolaPetitDia>(POLA_URL, POLA_ANON, 'v_espelho_polapetit_dias', 'dia.asc,plataforma.asc'),
};

/**
 * A Polá em uma linha, para as três abas dizerem a mesma coisa sem repetir regra.
 *
 * Três estados escritos, e eles pedem ações diferentes:
 *   · `sem_credencial` — falta a variável no ambiente (hoje, em produção);
 *   · `bloqueado` — o banco dela está restrito pelo Supabase por cota estourada (HTTP 402);
 *   · `ok` — há leitura; aí o número entra sozinho, sem ninguém mexer na tela.
 *
 * Nenhum deles é "não publicou": a tela nunca mostra zero por não ter conseguido ler.
 */
export async function resumoPola(): Promise<{
  estado: EstadoEspelho; frase: string;
  dias: number; redes: string[]; seguidores: number | null; ultimoDia: string | null;
}> {
  const { linhas, estado } = await espelhoMotoresEstado.polaDias();
  if (estado !== 'ok') {
    return {
      estado, dias: 0, redes: [], seguidores: null, ultimoDia: null,
      frase: estado === 'bloqueado'
        ? 'o banco da Polá está bloqueado pelo Supabase (cota estourada) — não é falta de publicação'
        : estado === 'sem_credencial'
          ? 'falta a credencial da Polá no ambiente — não é falta de publicação'
          : 'não consegui ler o espelho da Polá — painel cego, não motor parado',
    };
  }
  const dias = new Set(linhas.map((l) => l.dia)).size;
  const redes = [...new Set(linhas.map((l) => l.rede).filter(Boolean))];
  // Seguidores é censo: vale o último dia de cada rede, nunca a soma dos dias.
  const porRede = new Map<string, number>();
  for (const l of [...linhas].sort((a, b) => a.dia.localeCompare(b.dia))) {
    if (l.seguidores != null) porRede.set(l.rede, Number(l.seguidores));
  }
  const seguidores = porRede.size ? [...porRede.values()].reduce((a, b) => a + b, 0) : null;
  const ultimoDia = linhas.length ? [...linhas].map((l) => l.dia).sort().at(-1)! : null;
  return {
    estado, dias, redes, seguidores, ultimoDia,
    frase: `${dias} dia(s) medidos em ${redes.join(', ')}${seguidores != null ? ` · ${seguidores.toLocaleString('pt-BR')} seguidores` : ''}`,
  };
}
