import { useEffect, useMemo, useRef, useState } from 'react';
import { TrendingUp, Eye, Bookmark, Share2, RefreshCw, Loader2, ExternalLink, Sparkles, Film, Newspaper, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { hojeBrasilia, diaBrasilia } from '../lib/datas';
import OsiDiasCard from '../components/OsiDiasCard';
import MapaCobertura from '../components/MapaCobertura';
import { espelhoMotores, espelhoMotoresEstado, type PolaPetitDia, type EstadoEspelho, type PulsoContaDia, type PulsoLeituraDia, type PulsoSegDia, type PulsoConta, type LimelightDia, type LimePubDia, type BlogDia, type EspelhoBlogs } from '../lib/espelhoMotores';
import { lerTudo } from '../lib/paginar';
import { ultimaLeituraPorPeca, chaveDaPeca, type LeituraDeDia } from '../lib/leituraPorPeca';

// RADAR 360 (2026-08-25) — o analytics social completo do grupo, aprovado em mock.
// Decisão do dono: TODAS as redes, canais e marcas presentes na estrutura desde já;
// o que ainda não tem coleta aparece como "a ligar" — nunca some. Divisão canônica
// continua: digiai = cérebro (esta tela), MKT = mãos (motor de disparo).
// Fontes: schema mkt (nativo) + espelhos v_espelho_* (Pulso/Limelight/Blogs) +
// v_marketing_cadeia + v_mkt_fila_saude + v_seo_estado + v_mkt_accounts.

type Brand = { id: string; code: string; name: string; accent_hex: string | null; logo_url: string | null };
type Pub = { id: string; brand_id: string; platform: string; url: string | null; published_at: string;
  metadata: Record<string, unknown> | null };
type Perf = {
  publication_id: string; brand_id: string; gatilho: string | null; formato: string | null;
  engajamento: number | null; alcance: number | null; salvamentos: number | null; compartilhamentos: number | null;
  views: number | null;
};
type Aud = { brand_id: string; platform: string; seguidores: number; dia: string; account_id: string | null };
type Serie = { id: string; label: string; color: string; logo: string | null; pts: number[]; atual: number };
type Fila = { atrasados: number; com_erro: number; ultima_publicacao: string | null; ultima_audiencia: string | null };
type Conta = { id: string; brand_name: string | null; platform: string; handle: string | null; status: string | null };
type Cred = { platform: string; marca: string | null; status: string | null; expires_at: string | null };
/** Uma peça, uma linha — a consolidação que vivia em TypeScript mudou para a view
 *  `v_mkt_peca_consolidada` em 21/11/2026. A regra é a mesma (última leitura de cada campo, porque
 *  `leitura_dia` guarda acumulado); o que mudou é o lugar: o banco faz a conta uma vez e manda
 *  **473 linhas de uma janela de 30 dias** no lugar de 1.128 leituras cruas em duas páginas MAIS
 *  3.072 publicações em quatro páginas enfileiradas. */
type Peca = {
  origem: string; marca: string | null; conta: string | null; rede: string; tipo: string;
  peca_ref: string; leituras: number; primeira_leitura: string; ultima_leitura: string;
  views: number | null; publicada_em: string | null; apagada: boolean;
  dia_publicacao: string; publicacao_estimada: boolean;
  /** O QUE A PEÇA GANHOU DENTRO DA JANELA — leitura de dentro menos a última de ANTES dela.
   *  `null` quando não há leitura anterior: aí a peça não tem ganho conhecido, e isso se conta à
   *  parte (R2 da régua dos números). Só existe na régua de leitura. */
  ganho?: number | null;
};

// A FRONTEIRA COM O ESPELHO DO MKT, escrita em 20/11/2026 por ordem do dono ("pode fazer o corte
// agora"), depois de ele perguntar por que existem as duas telas.
//
// O corte NÃO é por assunto — seria desfazer ordem dele. Em 17/11 pediu os analytics TOTAIS no
// Espelho; em 18/11 reclamou que o número grande DAQUI não somava os posts do MKT. Ele quer o total
// nas duas. O corte é por **profundidade**:
//
//   · **Espelho do MKT** = o TOTAL e a DECISÃO. Resultado de negócio, o que funciona, o dia, o
//     fôlego, as publicações, os fatos, as fontes. É onde se decide o que fazer.
//   · **Radar 360** (aqui) = o DETALHE e a SAÚDE. Marca × rede × conta, seguidores dia a dia, régua,
//     território, e se dá para confiar na coleta. É onde se descobre ONDE o total veio.
//
// O QUE SAIU DAQUI em 20/11, e por quê: a aba **Funil** era duplicação inteira. A cadeia
// produzir→alcançar→captar→prospectar→vender é a mesma `v_marketing_cadeia` da Central do Espelho,
// e o bloco do Clearix Calc era a mesma `v_mkt_calc_funil` da página própria do Calc (#/mkt-calc) —
// mesmos quatro números, mesma fonte, três lugares. Saíram duas leituras do banco junto.
//
// O QUE NÃO É duplicação, e por isso ficou: "Motores" lá é ESTADO e custo de cada motor; "Vídeo &
// motores" aqui é DESEMPENHO por plataforma. Mesmas marcas, perguntas diferentes.
// As abas que este módulo sabe desenhar. Quem escolhe é a página de Marketing — desde 21/11/2026
// esta tela não tem endereço próprio nem barra própria: é metade de uma página só.
export type AbaRadar = 'visao' | 'audiencia' | 'conteudo' | 'video' | 'regua' | 'territorio' | 'saude';
type AbaK = AbaRadar;

// ORIGEM × MARCA (20/11/2026, ordem do dono de 19/11: "separar origem de marca").
//
// Estavam no mesmo filtro e não são a mesma pergunta. "PULSO" era um chip de MARCA, e clicar nele
// deixava a tela em branco: medido hoje, a marca `pulso` em `mkt.brands` tem ZERO publicações, ZERO
// censo de audiência e ZERO leituras — o dado do Pulso vive no banco DELE, no espelho. E clicar
// "Bastidores DIGIAI" escondia o cartão do Pulso, que é justamente quem publica e mede esses canais.
// O filtro mentia nos dois sentidos.
//
// QUEM = **QUEM PRODUZ**. São três, e não se sobrepõem (25/11/2026, desenho do dono).
//   · casa    — o que o MKT produz para as marcas da DIGIAI, **Limelight incluído**
//   · cortes  — o motor digiai_cortes (publica só em Bastidores DIGIAI e canal 2)
//   · pulso   — o Pulso, **com os cortes dele**: quem os produz é ele
//
// ERAM QUATRO ATÉ 25/11, e o Limelight saiu como grupo porque ele não é dono de canal: é uma
// fábrica de vídeo que produz PARA a Mello, marca da casa, e publica nos canais dela. Grupo próprio
// para ele obrigava a escolher "Limelight" para ver metade do que a Mello fez — e a outra metade
// sumia. Dentro de casa, a Mello fecha inteira.
//
// E OS CORTES DO PULSO FICAM NO PULSO. O dono propôs juntá-los ao grupo `cortes`; medi em 25/11 e o
// motor de cortes publica só em `bastidores` e `bastidores2`, nunca nos canais do Pulso. Juntar
// misturaria dois eixos — casa e pulso são produtor, cortes viraria formato — e a mesma peça caberia
// em dois chips que se excluem: escolhe `pulso` e perde os cortes dele, escolhe `cortes` e conta
// audiência que não é da casa. As somas parariam de fechar sem ninguém notar. Quem quiser ver todos
// os cortes juntos usa o chip de FORMATO, que atravessa os três grupos sem mexer nas somas.
//
// NÃO confundir com a coluna `origem` da `v_mkt_analytics_peca_dia`: aquela diz QUEM MEDIU a peça
// (mkt, pulso ou digiai_cortes lendo as MESMAS contas da casa) — é saúde de coleta, não dono de
// canal. Medido em 20/11: `cortes.da.digiai` aparece com origem 'pulso' E 'digiai_cortes'; duas
// coletas, nenhuma peça repetida (zero `peca_ref` em duas origens).
export const ORIGENS = [
  { k: '', label: 'tudo' },
  { k: 'casa', label: 'casa' },
  { k: 'cortes', label: 'cortes' },
  { k: 'pulso', label: 'Pulso' },
] as const;
export type OrigemK = typeof ORIGENS[number]['k'];
const ORIGEM_DA_MARCA: Record<string, OrigemK> = { bastidores: 'cortes', bastidores2: 'cortes', pulso: 'pulso' };
export const origemDaMarca = (code: string): OrigemK => ORIGEM_DA_MARCA[code] ?? 'casa';
export const rotuloOrigem = (k: OrigemK) => ORIGENS.find((o) => o.k === k)?.label ?? k;

/** O recorte da página de Marketing inteira. Uma barra só, uma régua só — inclusive a da DATA, que
 *  era o buraco entre as duas telas antigas: uma contava por data de publicação e a outra por data de
 *  leitura, com o mesmo rótulo. */
export type FiltrosMkt = {
  dias: number; de: string; ate: string;
  origem: OrigemK; rede: string; marca: string;
  data: 'publicacao' | 'leitura';
};

export const RANGES = [
  { k: 1, label: 'hoje' }, { k: 7, label: '7d' }, { k: 14, label: '14d' }, { k: 30, label: '30d' },
  { k: 60, label: '60d' }, { k: 90, label: '90d' }, { k: 180, label: '6m' }, { k: 365, label: '12m' }, { k: 0, label: 'tudo' },
];
// Todas as redes do grupo — inclusive as que ainda não têm coleta (aparecem "a ligar").
export const REDES = [
  { k: '', label: 'todas' }, { k: 'instagram', label: 'Instagram' }, { k: 'facebook', label: 'Facebook' },
  { k: 'tiktok', label: 'TikTok' }, { k: 'youtube', label: 'YouTube' }, { k: 'kwai', label: 'Kwai' },
  { k: 'linkedin', label: 'LinkedIn' }, { k: 'x', label: 'X' }, { k: 'pinterest', label: 'Pinterest' },
];
const ALL_NETS = ['instagram', 'facebook', 'tiktok', 'youtube', 'kwai', 'linkedin', 'x', 'pinterest'];
const METRICAS = [
  { k: 'seguidores', label: 'seguidores' }, { k: 'engajamento', label: 'engajamento' }, { k: 'alcance', label: 'alcance' },
] as const;
type MetricaK = typeof METRICAS[number]['k'];

const nf = (n: number) => n.toLocaleString('pt-BR');
const platName = (p: string) => ({ instagram: 'Instagram', facebook: 'Facebook', linkedin: 'LinkedIn', tiktok: 'TikTok', youtube: 'YouTube', kwai: 'Kwai', x: 'X', pinterest: 'Pinterest' }[p] ?? p);
const fmtDM = (iso: string) => {
  const d = new Date(iso.length === 10 ? iso + 'T12:00:00' : iso);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
};

const COR_OK = 'var(--color-action)';
const COR_WARN = 'var(--color-warning)';
const COR_DANGER = 'var(--color-danger)';
// Contrato da public.v_mkt_nivel_crescimento (MKT 20261005_01). Vários campos nascem nulos de propósito —
// marca sem comparação ainda, ou Reels cuja base não é do MKT. A tela tem de dizer isso em palavra, nunca 0.
interface Nivel {
  marca: string; marca_nome: string; seguidores_ig: number; posts_2sem: number;
  alcance_mediano_2sem: number | null; alcance_mediano_2sem_anterior: number | null;
  semanas_em_queda: number; nivel: number; nivel_anterior: number | null; nivel_desde: string | null;
  subiu_ou_desceu: string | null; nivel_max: number; stories_dia: number | null;
  reels_semana_base: number | null; reels_semana_extra: number | null; reels_semana: number | null;
  proximo_nivel: number | null; faltam_seguidores: number | null;
  motivo: string | null; limitado_por: string | null; medido_em: string | null;
}

const COR_SEC = 'var(--color-secondary)';
// Vale para todo número da CASA quando o recorte é um motor de fora. "0" seria medição e "a coletar"
// seria culpa do motor de coleta — as duas mentem, e mandam consertar o que não está quebrado.
const FORA_DA_CASA = 'não é deste recorte — isto mede as contas da casa';

export default function MktCrescimento({ aba, filtros, recarga = 0 }: { aba: AbaK; filtros: FiltrosMkt; recarga?: number }) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [pubs, setPubs] = useState<Pub[]>([]);
  const [perf, setPerf] = useState<Perf[]>([]);
  const [aud, setAud] = useState<Aud[]>([]);
  const [pulsoContasDias, setPulsoContasDias] = useState<PulsoContaDia[]>([]);
  // O MESMO DIA DO PULSO TEM DOIS NÚMEROS, e cada régua pede o seu (27/11/2026).
  //   · `contas_dias`   — o total ATUAL dos posts PUBLICADOS naquele dia  → régua publicação
  //   · `leituras_dias` — o que TODOS os posts, velhos e novos, GANHARAM naquele dia → régua leitura
  // Até hoje este bloco usava sempre o primeiro. Com a régua em leitura, o título mudava para "do
  // que foi LIDO", o número da casa mudava (526 → 12.571 em 26/11) e **o do Pulso ficava parado em
  // 1.116** — foi assim que o dono viu, e ele tinha razão: dois números iguais em duas perguntas
  // diferentes é sinal de que um deles não é resposta.
  //
  // E ELA VEM COM O MOTIVO JUNTO, não só com as linhas. Na primeira conferência em tela a view de
  // leitura do Pulso devolveu **500** (statement timeout) e o bloco simplesmente apagou o Pulso da
  // soma: o título dizia "views do que foi LIDO", o número era 12.598 e a linha de baixo listava só
  // Limelight e casa. Número que perde uma parcela calado é pior do que número que não aparece —
  // quem lê a tela não tem como saber que faltou. Agora a falha fica escrita na própria linha.
  const [pulsoLeituras, setPulsoLeituras] = useState<{ linhas: PulsoLeituraDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  const [pulsoSeg, setPulsoSeg] = useState<PulsoSegDia[]>([]);
  const [pulsoContas, setPulsoContas] = useState<PulsoConta[]>([]);
  const [pola, setPola] = useState<{ linhas: PolaPetitDia[]; estado: EstadoEspelho; detalhe?: string } | null>(null);
  const [limeDias, setLimeDias] = useState<LimelightDia[]>([]);
  const [limePub, setLimePub] = useState<LimePubDia[]>([]);
  const [blogDias, setBlogDias] = useState<BlogDia[]>([]);
  const [blogsEsp, setBlogsEsp] = useState<EspelhoBlogs | null>(null);
  const [fila, setFila] = useState<Fila | null>(null);
  const [contas, setContas] = useState<Conta[]>([]);
  // Régua de crescimento por marca (MKT 20261005_01). Só leitura: quem calcula é o MKT, toda segunda 6h15.
  const [regua, setRegua] = useState<Nivel[]>([]);
  const [creds, setCreds] = useState<Cred[]>([]);
  const [pecas, setPecas] = useState<Peca[]>([]);
  const [loading, setLoading] = useState(true);
  const [sincronizando, setSincronizando] = useState(false);
  // O recorte vem da página. Só o filtro de CONTEÚDO continua aqui: ele é de uma aba só.
  const { origem: fOrigem, marca: fMarca, rede: fRede, dias: fDias, de: fDe, ate: fAte } = filtros;
  const [fConteudo, setFConteudo] = useState('');
  const [metrica, setMetrica] = useState<MetricaK>('seguidores');

  // A API corta QUALQUER resposta em 1.000 linhas, por mais que o `.limit()` peça mais. Medido em
  // 19/11/2026: são 1.130 publicações, e as 130 mais antigas nunca chegavam à tela. Isso envenenava
  // tudo que esta tela conta no recorte 'tudo' — e, no conserto de hoje, fazia 99 peças perderem a
  // data de publicação e entrarem no recorte de 30 dias pela primeira leitura: **15.264 views a
  // mais**, que foi a diferença entre o que a tela mostrou e o que o banco diz. Teto silencioso é pior
  // que erro: a tela continua bonita e o número fica errado.
  //
  // AS OUTRAS DUAS LEITURAS, paginadas em 19/11 ÀS 20h, antes de quebrarem: o Geral contou as linhas e
  // avisou. `content_performance` tem 946; `audiencia_diaria` tem 951 e cresce 24 por dia (169 nos
  // últimos 7, 29 só hoje) — passa de mil **no fim de semana, 21 ou 22/11**. E essa é a pior das três,
  // porque vem em ordem CRESCENTE de dia: o corte come os dias mais NOVOS. O que ia acontecer, sem
  // conserto: `segAtual` congelaria os seguidores no último dia que sobrou, `ultimoCenso` ficaria
  // velho, e o aviso "contas sem censo nos últimos 3 dias" acusaria contas que estão sendo medidas
  // todo dia. Erro falso é pior que número errado: manda consertar o que não está quebrado.
  // ---- recorte de período (presets + personalizado) ----
  const custom = fDe !== '' && fAte !== '' && fDe <= fAte;
  const corteDia = useMemo(() => {
    if (custom) return fDe;
    if (fDias === 0) return '2000-01-01';
    const d = new Date(); d.setDate(d.getDate() - (fDias - 1));
    return diaBrasilia(d);
  }, [fDias, custom, fDe]);
  const fimDia = useMemo(() => (custom ? fAte : hojeBrasilia()), [custom, fAte]);
  const corteISO = corteDia + 'T00:00:00Z';
  const fimISO = fimDia + 'T23:59:59Z';
  const noRecorte = (dia: string) => dia >= corteDia && dia <= fimDia;

  // ---- CADA ABA LÊ O QUE ELA MOSTRA, E SÓ NA PRIMEIRA VEZ (21/11/2026) ----
  //
  // Esta tela lia QUINZE fontes ao abrir, e duas delas vinham em páginas enfileiradas: medido no ar
  // hoje, `publications` levava 3,9 s em 4 páginas (3.072 linhas) e a leitura por peça 4,1 s em 2.
  // Só que a aba aberta nunca precisa de tudo — a régua não precisa de publicação, o território não
  // precisa de nada, e a Visão não precisa das credenciais de OAuth.
  //
  // Duas fontes dependem do RECORTE e voltam a ser lidas quando a janela muda; as outras, uma vez só.
  // É isso que faz a troca de período não custar a página inteira.
  const carregadas = useRef(new Set<string>());

  const FONTES: Record<string, () => Promise<void>> = {
    async marcas() {
      const { data } = await supabase.schema('mkt').from('brands').select('id, code, name, accent_hex, logo_url').order('name');
      setBrands((data ?? []) as Brand[]);
    },
    // A consolidação mora no banco desde 21/11 (`v_mkt_peca_consolidada`): uma peça, uma linha, com
    // a data de publicação junto. No recorte de 30 dias são 473 linhas numa página.
    //
    // A RÉGUA DE LEITURA NÃO PODE USAR A CONSOLIDADA (27/11/2026). A `v_mkt_peca_consolidada` guarda
    // a última leitura **de todos os tempos** de cada peça. Filtrar essa coluna por uma janela passada
    // não responde "o que foi lido naquele dia": responde "quais peças foram lidas naquele dia **e
    // nunca mais**" — ou seja, as que PARARAM de ser lidas. O dono achou pelo buraco: os Bastidores
    // DIGIAI em 26/11 davam 138 por publicação e **zero** por leitura. Medido no banco: naquele dia
    // 73 peças dos Bastidores foram lidas, somando 2.210 views; todas foram lidas de novo em 27/11,
    // então a `ultima_leitura` delas é 27/11 e a janela de 26/11 ficava sem ninguém. Pela mesma razão
    // o número de um dia passado MUDA sozinho no dia seguinte, conforme a coleta passa.
    //
    // Na régua de leitura a fonte passa a ser a `v_mkt_analytics_peca_dia` (uma linha por peça por
    // dia) recortada à janela, consolidada **dentro dela** — a mesma regra que o bloco "O que rendeu
    // no recorte" já usava. A consolidada continua entrando, só para os campos que não vivem na
    // leitura do dia: se a peça foi apagada e qual é o dia de publicação dela.
    async pecas() {
      const consolidada = await lerTudo<Peca>((de, ate) => {
        let q = supabase.from('v_mkt_peca_consolidada')
          .select('origem, marca, conta, rede, tipo, peca_ref, leituras, primeira_leitura, ultima_leitura, views, publicada_em, apagada, dia_publicacao, publicacao_estimada');
        if (corteDia > '2000-01-01') q = q.or(`dia_publicacao.gte.${corteDia},ultima_leitura.gte.${corteDia}`);
        return q.order('origem').order('conta').order('rede').order('peca_ref').range(de, ate);
      });
      if (filtros.data !== 'leitura') { setPecas(consolidada); return; }

      // A LEITURA VEM DESDE O COMEÇO, não só da janela (27/11/2026).
      //
      // Para dizer o que a peça GANHOU no período é preciso a leitura de ANTES dele — ganho é
      // diferença, não acumulado (R2 e R4 da régua dos números). Sem a leitura anterior o ganho é
      // desconhecido, e desconhecido não é zero: conta-se à parte. A medição inteira do ano são
      // ~3.400 linhas, quatro páginas; a coleta começou em 16/07/2026.
      const dias = await lerTudo<LeituraDeDia & { marca: string | null; tipo: string }>((de, ate) =>
        supabase.from('v_mkt_analytics_peca_dia')
          .select('origem, marca, conta, rede, tipo, peca_ref, data, views, curtidas, comentarios, compartilhamentos, retencao_media_pct, horas_exibicao')
          .lte('data', fimDia)
          .order('data').order('peca_ref').range(de, ate));

      const porPeca = new Map<string, Array<LeituraDeDia & { marca: string | null; tipo: string }>>();
      for (const l of dias) {
        const k = chaveDaPeca(l);
        const a = porPeca.get(k);
        if (a) a.push(l); else porPeca.set(k, [l]);
      }
      const flags = new Map(consolidada.map((p) => [chaveDaPeca(p as unknown as LeituraDeDia), p]));
      const saida: Peca[] = [];
      for (const ls of porPeca.values()) {
        const naJanela = ls.filter((l) => l.data >= corteDia);
        if (naJanela.length === 0) continue;                       // peça não foi lida no recorte
        const dentro = ultimaLeituraPorPeca(naJanela)[0];
        const antes = ls.filter((l) => l.data < corteDia).pop();
        const c = flags.get(chaveDaPeca(dentro));
        // PEÇA QUE NASCEU DENTRO DA JANELA TEM GANHO IGUAL AO ACUMULADO (corrigido em 27/11, no mesmo
        // dia em que a primeira versão entrou). A primeira regra dizia "sem leitura anterior, ganho
        // desconhecido" — e era conservadora demais até virar erro: peça publicada em 19/11 que chegou
        // a 5.692 views em 27/11 ganhou os 5.692 DENTRO da janela de 30 dias. Não havia o que medir
        // antes porque ela não existia antes.
        //
        // São três casos, não dois, e a tela conta os três à parte:
        //   · tem leitura ANTES da janela  → ganho medido, diferença entre as duas;
        //   · nasceu na janela, com registro de publicação de verdade → ganho = tudo que acumulou;
        //   · nasceu antes e só foi lida agora → **desconhecido**. É o caso em que não se sabe quanto
        //     ela já tinha quando a janela começou, e inventar seria o erro que a régua proíbe.
        // A data de publicação ESTIMADA (a que vem da 1ª leitura, quando não há registro) não serve
        // para decidir isto: ela diz "nasceu quando eu vi", que é circular. Essas ficam em desconhecido.
        const nasceuNaJanela = c != null && !c.publicacao_estimada && c.dia_publicacao >= corteDia;
        saida.push({
          origem: dentro.origem, marca: dentro.marca, conta: dentro.conta ?? null, rede: dentro.rede,
          tipo: dentro.tipo, peca_ref: dentro.peca_ref, leituras: dentro.leituras,
          primeira_leitura: dentro.primeira_data, ultima_leitura: dentro.data,
          views: dentro.views ?? null,
          // Sem clamp: peça que PERDE view (post apagado, correção da rede) entra negativa. Aparar
          // para zero infla o total e esconde o que aconteceu de verdade.
          ganho: antes != null && antes.views != null && dentro.views != null
            ? dentro.views - antes.views
            : nasceuNaJanela ? dentro.views ?? null
            : null,
          publicada_em: c?.publicada_em ?? null,
          apagada: c?.apagada ?? false,
          // Peça lida na janela que a consolidada não conhece é peça sem registro de publicação:
          // vale a primeira leitura dela, como já valia antes — e sai marcada como estimada.
          dia_publicacao: c?.dia_publicacao ?? dentro.primeira_data,
          publicacao_estimada: c?.publicacao_estimada ?? true,
        });
      }
      setPecas(saida);
    },
    // Só as publicações do recorte. Eram 3.072 linhas em 4 páginas enfileiradas para mostrar um
    // total e uma lista de 12; no recorte de 30 dias são ~500, numa página.
    async publicacoes() {
      const [p, cp] = await Promise.all([
        lerTudo<Pub>((de, ate) => {
          let q = supabase.schema('mkt').from('publications')
            .select('id, brand_id, platform, url, published_at, metadata');
          if (corteDia > '2000-01-01') q = q.gte('published_at', corteISO).lte('published_at', fimISO);
          return q.order('published_at', { ascending: false }).order('id').range(de, ate);
        }),
        lerTudo<Perf>((de, ate) => supabase.schema('mkt').from('content_performance')
          .select('publication_id, brand_id, gatilho, formato, engajamento, alcance, salvamentos, compartilhamentos, views')
          .order('id').range(de, ate)),
      ]);
      setPubs(p); setPerf(cp);
    },
    async audiencia() {
      setAud(await lerTudo<Aud>((de, ate) => supabase.schema('mkt').from('audiencia_diaria')
        .select('brand_id, platform, seguidores, dia, account_id').order('dia').order('id').range(de, ate)));
    },
    async pulso() {
      const [pd, pld, psg, pct] = await Promise.all([
        espelhoMotores.pulsoContasDias(), espelhoMotoresEstado.pulsoLeiturasDias(),
        espelhoMotores.pulsoSeguidoresDias(), espelhoMotores.pulsoContas(),
      ]);
      setPulsoContasDias(pd); setPulsoLeituras(pld); setPulsoSeg(psg); setPulsoContas(pct);
    },
    async lime() {
      const [ld, lp] = await Promise.all([espelhoMotores.limelightDias(), espelhoMotores.limelightPubDias()]);
      setLimeDias(ld); setLimePub(lp);
    },
    async blogs() {
      const [bd, be] = await Promise.all([espelhoMotores.blogsDias(), espelhoMotores.blogs()]);
      setBlogDias(bd); setBlogsEsp(be);
    },
    async pola() {
      setPola(await espelhoMotoresEstado.polaPetitDias());
    },
    async saude() {
      const [{ data: fs }, { data: ac }, cr] = await Promise.all([
        supabase.from('v_mkt_fila_saude').select('atrasados, com_erro, ultima_publicacao, ultima_audiencia').maybeSingle(),
        supabase.from('v_mkt_accounts').select('id, brand_name, platform, handle, status'),
        supabase.from('v_mkt_credenciais_saude').select('platform, marca, status, expires_at'),
      ]);
      setFila((fs ?? null) as Fila | null);
      setContas((ac ?? []) as Conta[]);
      setCreds((cr.data ?? []) as Cred[]);
    },
    async regua() {
      const { data } = await supabase.from('v_mkt_nivel_crescimento').select('*');
      setRegua((data ?? []) as Nivel[]);
    },
  };

  /** Dependem do recorte — janela nova, leitura nova. O resto se lê uma vez. */
  const DA_JANELA = new Set(['pecas', 'publicacoes']);
  const FONTES_DA_ABA: Record<AbaK, string[]> = {
    visao: ['marcas', 'pecas', 'publicacoes', 'audiencia', 'pulso', 'lime', 'blogs'],
    audiencia: ['marcas', 'audiencia'],
    conteudo: ['marcas', 'publicacoes', 'pecas'],
    video: ['marcas', 'pulso', 'lime', 'blogs', 'pola'],
    regua: ['regua'],
    territorio: [],
    // 'blogs' entra porque o cartao de saude dos blogs dizia "espelho indisponivel" quando a fonte
    // apenas nao tinha sido lida ainda -- visto no ar em 21/11. Fonte nao lida nao e fonte quebrada.
    saude: ['marcas', 'audiencia', 'saude', 'pecas', 'pulso', 'blogs'],
  };

  // A régua entra na chave de `pecas` porque, desde 27/11, ela troca a FONTE da leitura das peças,
  // não só o filtro. Sem isto a tela trocaria o rótulo e mostraria o número da régua anterior.
  const chaveDaFonte = (f: string) =>
    f === 'pecas' ? `pecas|${corteDia}|${fimDia}|${filtros.data}`
    : DA_JANELA.has(f) ? `${f}|${corteDia}|${fimDia}` : f;

  // A TELA NÃO ESPERA A FONTE MAIS LENTA (21/11/2026). Cada fonte avisa quando chega, e o bloco que
  // depende dela escreve "medindo…" até lá — nunca 0, nunca em branco.
  //
  // Por que importa: a `v_mkt_peca_consolidada` roda em 108 ms no banco e leva ~3,5 s para chegar,
  // porque a view de baixo chama `mkt.pode_ver_marca(code)` LINHA A LINHA e, por ser SECURITY
  // DEFINER, o Postgres não consegue embutir a função na consulta: são milhares de chamadas para
  // responder o que seriam nove. Avisei o MKT, que é de quem é a função. Enquanto isso, a página
  // não fica parada por causa dela.
  const [emVoo, setEmVoo] = useState<string[]>([]);
  const chegando = (f: string) => emVoo.includes(f);

  // O RODOPIO TEM DE PARAR COM QUALQUER FONTE, NÃO SÓ COM `marcas` (25/11/2026).
  //
  // Antes isto ligava e desligava o `loading` olhando **uma** fonte: `if (faltando.includes('marcas'))
  // setLoading(true)` e, no fim, `if (f === 'marcas') setLoading(false)`. Como `loading` nasce `true`
  // e este componente é montado de novo a cada troca de aba, qualquer aba que NÃO carregue `marcas`
  // ficava rodopiando para sempre — o corpo inteiro do Radar é `loading ? <spinner/> : (…)`.
  //
  // Na prática, a aba **Régua** (`FONTES_DA_ABA.regua = ['regua']`) estava **em branco desde sempre**:
  // nem os cartões de nível, nem o aviso de que ela não obedece à barra, nem a frase "a régua ainda
  // não foi calculada". Só não apareceu antes porque Território carrega lista vazia (cai no
  // `faltando.length === 0` e desliga) e as outras nove carregam `marcas`. Visto no ar em 25/11 às
  // 13h52, ao varrer as onze abas atrás do que o dono disse que não funcionava.
  //
  // Agora o contador é de todas: o rodopio para quando as fontes DESTA aba chegam, quaisquer que sejam.
  function carregar(fontes: string[]) {
    const faltando = fontes.filter((f) => !carregadas.current.has(chaveDaFonte(f)));
    if (faltando.length === 0) { setLoading(false); return; }
    faltando.forEach((f) => carregadas.current.add(chaveDaFonte(f)));
    setEmVoo((atual) => [...new Set([...atual, ...faltando])]);
    setLoading(true);
    let restantes = faltando.length;
    faltando.forEach((f) => {
      FONTES[f]()
        .catch((e) => {
          carregadas.current.delete(chaveDaFonte(f));
          console.error('[radar] falha ao carregar', f, e);
        })
        .finally(() => {
          setEmVoo((atual) => atual.filter((x) => x !== f));
          restantes -= 1;
          if (restantes === 0) setLoading(false);
        });
    });
  }

  // `recarga` vem da setinha da página de cima. Sem limpar o que já veio, `carregar` não pede nada:
  // ele pula toda fonte que está em `carregadas`. Recarregar é esquecer e ler de novo.
  //
  // `filtros.data` ENTRA AQUI desde 27/11, e faltar era defeito em silêncio. A régua deixou de ser
  // só um filtro: ela troca a FONTE da leitura das peças (consolidada × leitura do dia, com ganho).
  // Sem a dependência, `carregar` nunca era chamado ao clicar na régua, a chave nova da fonte nunca
  // era pedida e a tela mostrava o rótulo novo em cima de dados velhos — foi assim que a Mello no
  // TikTok apareceu com "0 de 50 peças com leitura anterior" tendo as 50 leituras de ontem no banco.
  useEffect(() => {
    if (recarga > 0) carregadas.current.clear();
    carregar(FONTES_DA_ABA[aba] ?? []);
  }, [aba, corteDia, fimDia, recarga, filtros.data]); // eslint-disable-line react-hooks/exhaustive-deps

  async function sincronizar() {
    setSincronizando(true);
    try {
      await supabase.functions.invoke('sync-metricas', { body: {} });
      carregadas.current.clear();
      carregar(FONTES_DA_ABA[aba] ?? []);
    } finally { setSincronizando(false); }
  }

  // UM crivo só para marca+origem, usado por toda leitura da casa. Antes cada bloco repetia
  // `!fMarca || code === fMarca`, e por isso o cartão do Pulso usava uma regra e a tabela de
  // audiência outra — a mesma seleção dava respostas diferentes em abas diferentes.
  //
  // A marca `pulso` fica FORA de tudo que é da casa: ela existe em `mkt.brands` só como casca (0
  // publicações, 0 censo, 0 leituras, medido em 20/11) e o dado real dela vem do espelho.
  const marcaOk = (code?: string | null) => !!code && code !== 'pulso'
    && (!fOrigem || origemDaMarca(code) === fOrigem) && (!fMarca || code === fMarca);
  const brandById = useMemo(() => new Map(brands.map((b) => [b.id, b])), [brands]);
  const brandOf = (id: string) => brandById.get(id);
  const accent = (id: string) => brandOf(id)?.accent_hex || COR_SEC;


  // 05/10 (despacho do MKT): 88 publicações estão marcadas `excluido_em` — foram APAGADAS das redes na
  // limpeza dos rostos de IA e dos pins — e 2 são teste de conexão. Post que não existe mais não é alcance
  // nem cadência: contar aqui inflava tudo que esta tela mede. Story continua contando, porque foi ao ar.
  const pubsVivas = useMemo(() => pubs.filter((p) => {
    const m = (p.metadata ?? {}) as Record<string, unknown>;
    return m.excluido_em == null && m.teste_de_conexao !== true;
  }), [pubs]);

  // ---- VIEWS DAS PEÇAS DA CASA: fonte trocada em 19/11/2026 ----
  //
  // O dono somou marca a marca e não bateu, e o Geral mediu o porquê. Esta tela lia só
  // `mkt.content_performance`, que **não tem view de TikTok nem de YouTube**: medido hoje, Instagram
  // 31.457 e Facebook 13.272 — TikTok 0, YouTube 0. Por isso o Bastidores aparecia com 46 views (que
  // é a soma do Instagram das duas marcas dele) quando as peças tinham **1.069 no TikTok**: 759 em
  // cortes.da.digiai e 310 em bastidores.digiai. A tela não errava a conta — lia a fonte que não tem
  // o número. Total das postagens: **44.729 → 45.885**.
  //
  // A leitura por peça vive na `v_mkt_analytics_peca_dia`, a mesma que o Espelho do marketing usa, e a
  // consolidação (última leitura de cada peça, porque `leitura_dia` guarda acumulado) mora em
  // lib/leituraPorPeca.ts — um lugar só, para as duas telas não divergirem.
  //
  // A DATA DA PEÇA, e por que não é a da leitura: o recorte aqui é por data de PUBLICAÇÃO. Quando a
  // peça casa com uma publicação — o `peca_ref` é o id dela, ou o `corte_peca_id` do metadata — vale
  // a data de publicação. Quando não casa (corte que saiu em conta do Pulso, sem registro aqui: 14 de
  // 43 em 19/11), vale a PRIMEIRA leitura dela. É aproximação, não medição, e está escrita no pé.
  //
  // Publicação apagada da rede continua fora, como no resto da tela.
  // A RÉGUA DE DATA, que é escolhida na barra da página (21/11/2026):
  //   · publicação — "quanto rendeu o que a casa PUBLICOU no período";
  //   · leitura    — "quanto a casa já somou do que foi MEDIDO no período" (peça de julho lida
  //     ontem entra, com tudo que acumulou).
  // As duas contas sempre estiveram certas; o que faltava era a tela dizer qual estava usando. Era
  // isto o 168k × 41,8k "na mesma janela" de 20/11.
  const pecasF = useMemo(() => pecas.filter((pc) => {
    if (pc.apagada) return false;
    const dia = filtros.data === 'leitura' ? pc.ultima_leitura : pc.dia_publicacao;
    return dia >= corteDia && dia <= fimDia && marcaOk(pc.marca) && (!fRede || pc.rede === fRede);
  }), [pecas, corteDia, fimDia, fMarca, fOrigem, fRede, filtros.data]); // eslint-disable-line react-hooks/exhaustive-deps
  const estimadas = useMemo(() => pecasF.filter((pc) => pc.publicacao_estimada).length, [pecasF]);
  // ACERVO: o acumulado de vida das peças do recorte, na última leitura delas. Não leva período no
  // rótulo — leva data (R1 e a tabela das três formas, em Harness/regua-dos-numeros.md).
  const viewsCasa = useMemo(() => pecasF.reduce((a, pc) => a + (pc.views ?? 0), 0), [pecasF]);
  // GANHO: o que entrou NA JANELA. É o único número da casa que pode se chamar "hoje".
  const ganhoCasa = useMemo(() => pecasF.reduce((a, pc) => a + (pc.ganho ?? 0), 0), [pecasF]);
  const pecasComGanho = useMemo(() => pecasF.filter((pc) => pc.ganho != null).length, [pecasF]);
  const pecasSemAnterior = useMemo(() => pecasF.filter((pc) => pc.ganho == null).length, [pecasF]);
  const pecasComViews = useMemo(() => pecasF.filter((pc) => pc.views != null).length, [pecasF]);
  // A barra por rede reparte EXATAMENTE o número grande, por isso segue a mesma régua: ganho quando
  // o bloco mostra ganho. Barra que divide um total diferente do número de cima é a mesma mentira
  // em outro formato.
  const viewsCasaPorRede = useMemo(() => {
    const m = new Map<string, number>();
    const porLeitura = filtros.data === 'leitura';
    for (const pc of pecasF) {
      const v = porLeitura ? pc.ganho : pc.views;
      if (v != null) m.set(pc.rede, (m.get(pc.rede) ?? 0) + v);
    }
    return m;
  }, [pecasF, filtros.data]);
  // Views por publicação para a lista do Conteúdo: só quando o par (peça, rede) tem UMA peça. O mesmo
  // corte sai em várias contas e a publicação aqui não guarda a conta da leitura — repartir seria
  // inventar. Sem casamento único, a linha segue com o que a `content_performance` tiver.
  const viewsPorPecaRede = useMemo(() => {
    const m = new Map<string, { views: number; n: number }>();
    for (const pc of pecasF) {
      if (pc.views == null) continue;
      const k = `${pc.peca_ref}|${pc.rede}`;
      const a = m.get(k) ?? { views: 0, n: 0 };
      a.views += pc.views; a.n += 1;
      m.set(k, a);
    }
    return m;
  }, [pecasF]);
  const viewsDaPub = (pub: Pub) => {
    const meta = (pub.metadata ?? {}) as Record<string, unknown>;
    const corte = typeof meta.corte_peca_id === 'string' ? meta.corte_peca_id : '';
    for (const ref of [pub.id, corte]) {
      if (!ref) continue;
      const a = viewsPorPecaRede.get(`${ref}|${pub.platform}`);
      if (a && a.n === 1) return a.views;
    }
    return null;
  };

  const pubsF = useMemo(() => pubsVivas.filter((p) =>
    p.published_at >= corteISO && p.published_at <= fimISO &&
    marcaOk(brandOf(p.brand_id)?.code) &&
    (!fRede || p.platform === fRede)), [pubsVivas, corteISO, fimISO, fMarca, fOrigem, fRede, brands]); // eslint-disable-line react-hooks/exhaustive-deps
  const perfByPub = useMemo(() => new Map(perf.map((x) => [x.publication_id, x])), [perf]);
  const linhas = useMemo(() => pubsF.map((p) => ({ p, m: perfByPub.get(p.id) }))
    .filter((l) => !fConteudo || l.m?.gatilho === fConteudo || l.m?.formato === fConteudo), [pubsF, perfByPub, fConteudo]);

  const medidos = linhas.filter((l) => l.m);
  const engTotal = medidos.reduce((s, l) => s + (l.m!.engajamento || 0), 0);
  const alcanceTotal = medidos.reduce((s, l) => s + (l.m!.alcance || 0), 0);
  const savesTotal = medidos.reduce((s, l) => s + (l.m!.salvamentos || 0), 0);
  const sharesTotal = medidos.reduce((s, l) => s + (l.m!.compartilhamentos || 0), 0);
  const temAlcance = medidos.some((l) => l.m!.alcance != null);
  const taxaEng = temAlcance && alcanceTotal > 0 ? (engTotal / alcanceTotal * 100) : null;
  const engMed = medidos.length ? engTotal / medidos.length : 0;

  const audF = useMemo(() => aud.filter((a) => (!fRede || a.platform === fRede) && marcaOk(brandOf(a.brand_id)?.code)), [aud, fRede, fMarca, fOrigem, brands]); // eslint-disable-line react-hooks/exhaustive-deps
  const segAtual = useMemo(() => {
    const porConta = new Map<string, Aud>();
    for (const a of audF) if (a.dia <= fimDia) porConta.set(`${a.brand_id}:${a.platform}`, a);
    return [...porConta.values()].reduce((s, a) => s + a.seguidores, 0);
  }, [audF, fimDia]);
  const segDelta = useMemo(() => {
    const chaves = new Set(audF.map((a) => `${a.brand_id}:${a.platform}`));
    let delta = 0; let temBase = false;
    for (const k of chaves) {
      const dentro = audF.filter((a) => `${a.brand_id}:${a.platform}` === k && noRecorte(a.dia));
      if (dentro.length >= 2) { delta += dentro[dentro.length - 1].seguidores - dentro[0].seguidores; temBase = true; }
    }
    return temBase ? delta : null;
  }, [audF, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps

  const ultimoCenso = useMemo(() => aud.reduce<string | null>((m, a) => (m == null || a.dia > m ? a.dia : m), null), [aud]);
  const contasMedidas = useMemo(() => new Set(audF.map((a) => `${a.brand_id}:${a.platform}`)).size, [audF]);
  const diasEixo = useMemo(() => [...new Set(audF.filter((a) => noRecorte(a.dia)).map((a) => a.dia))].sort(), [audF, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps

  const seriesMetrica = useMemo<Serie[]>(() => {
    const out: Serie[] = [];
    for (const b of brands) {
      if (!marcaOk(b.code)) continue;
      let pts: number[];
      if (metrica === 'seguidores') {
        const contasB = [...new Set(audF.filter((a) => a.brand_id === b.id).map((a) => a.platform))];
        pts = diasEixo.map((d) => contasB.reduce((s, plat) => {
          const ate = audF.filter((a) => a.brand_id === b.id && a.platform === plat && a.dia <= d);
          return s + (ate.length ? ate[ate.length - 1].seguidores : 0);
        }, 0));
      } else {
        pts = diasEixo.map((d) => linhas
          .filter((l) => l.p.brand_id === b.id && l.p.published_at.slice(0, 10) === d)
          .reduce((s, l) => s + (metrica === 'engajamento' ? (l.m?.engajamento || 0) : (l.m?.alcance || 0)), 0));
      }
      if (pts.every((v) => v === 0)) continue;
      out.push({ id: b.id, label: b.name, color: b.accent_hex || COR_SEC, logo: b.logo_url, pts, atual: pts.length ? pts[pts.length - 1] : 0 });
    }
    return out;
  }, [brands, audF, linhas, diasEixo, metrica, fMarca, fOrigem]); // eslint-disable-line react-hooks/exhaustive-deps

  const seriePorMarca = useMemo(() => {
    const out = new Map<string, number[]>();
    const dias = [...new Set(audF.filter((a) => noRecorte(a.dia)).map((a) => a.dia))].sort();
    for (const b of brands) {
      const contasB = [...new Set(audF.filter((a) => a.brand_id === b.id).map((a) => a.platform))];
      out.set(b.id, dias.map((d) => contasB.reduce((s, plat) => {
        const ate = audF.filter((a) => a.brand_id === b.id && a.platform === plat && a.dia <= d);
        return s + (ate.length ? ate[ate.length - 1].seguidores : 0);
      }, 0)));
    }
    return out;
  }, [audF, brands, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps

  const crescimentoMarca = useMemo(() => brands.map((b) => {
    const serie = (seriePorMarca.get(b.id) ?? []).filter((v) => v > 0);
    if (serie.length < 2) return { b, delta: 0, pct: 0, atual: serie.length ? serie[0] : 0 };
    const first = serie[0]; const last = serie[serie.length - 1];
    return { b, delta: last - first, pct: first > 0 ? (last - first) / first * 100 : 0, atual: last };
  }).filter((x) => x.atual > 0).sort((a, b) => b.pct - a.pct), [brands, seriePorMarca]);

  const matriz = useMemo(() => brands.filter((b) => marcaOk(b.code)).map((b) => ({
    b,
    cells: ALL_NETS.filter((n) => !fRede || n === fRede).map((net) => {
      const serie = audF.filter((a) => a.brand_id === b.id && a.platform === net).sort((x, y) => x.dia.localeCompare(y.dia));
      if (!serie.length) return { net, seg: null as number | null, delta: null as number | null };
      const ate = serie.filter((a) => a.dia <= fimDia);
      if (!ate.length) return { net, seg: null as number | null, delta: null as number | null };
      const seg = ate[ate.length - 1].seguidores;
      const base = serie.find((a) => a.dia >= corteDia);
      return { net, seg, delta: base ? seg - base.seguidores : null };
    }),
  })), [brands, audF, fMarca, fOrigem, fRede, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps
  const redesMatriz = ALL_NETS.filter((n) => !fRede || n === fRede);

  const rankBy = (key: 'formato' | 'gatilho') => {
    const m = new Map<string, { n: number; eng: number; alc: number; alcN: number }>();
    for (const l of medidos) {
      const k = l.m![key]; if (!k) continue;
      const cur = m.get(k) ?? { n: 0, eng: 0, alc: 0, alcN: 0 };
      cur.n++; cur.eng += l.m!.engajamento || 0;
      const alc = l.m!.alcance;
      if (alc != null) { cur.alc += alc; cur.alcN++; }
      m.set(k, cur);
    }
    return [...m.entries()].map(([k, v]) => ({ k, n: v.n, engMed: v.eng / v.n, taxa: v.alcN > 0 && v.alc > 0 ? v.eng / v.alc * 100 : null }))
      .sort((a, b) => b.engMed - a.engMed);
  };
  const porFormato = useMemo(() => rankBy('formato'), [linhas]); // eslint-disable-line react-hooks/exhaustive-deps
  const porGatilho = useMemo(() => rankBy('gatilho'), [linhas]); // eslint-disable-line react-hooks/exhaustive-deps

  const porHora = useMemo(() => {
    const faixas = [{ k: 'manhã · 6–12h', lo: 6, hi: 12 }, { k: 'tarde · 12–18h', lo: 12, hi: 18 }, { k: 'noite · 18–24h', lo: 18, hi: 24 }, { k: 'madrugada · 0–6h', lo: 0, hi: 6 }];
    const buck = faixas.map((f) => ({ ...f, n: 0, eng: 0 }));
    for (const l of medidos) {
      const h = new Date(l.p.published_at).getHours();
      const b = buck.find((x) => h >= x.lo && h < x.hi);
      if (b) { b.n++; b.eng += l.m!.engajamento || 0; }
    }
    const list = buck.filter((b) => b.n >= 2).map((b) => ({ faixa: b.k, n: b.n, engMed: b.eng / b.n })).sort((a, b) => b.engMed - a.engMed);
    return { list, best: list[0] || null };
  }, [linhas]); // eslint-disable-line react-hooks/exhaustive-deps

  // Motores externos sob os mesmos filtros — views/pub é a coluna de decisão.
  const codeMello = useMemo(() => brands.find((b) => /mello/i.test(b.name))?.code ?? '__mello', [brands]);
  const codeDigiai = useMemo(() => brands.find((b) => /^digiai$/i.test(b.name))?.code ?? '__digiai', [brands]);
  const codeOsi = useMemo(() => brands.find((b) => /sem improviso/i.test(b.name))?.code ?? '__osi', [brands]);
  // A fonte segue a régua; as PUBLICAÇÕES continuam vindo de `contas_dias` em qualquer régua,
  // porque "quantos posts saíram" não muda conforme a data por que se olha.
  const pulsoFonte = filtros.data === 'leitura' ? (pulsoLeituras?.linhas ?? []) : pulsoContasDias;
  // A régua em leitura depende de uma view que já falhou em produção. Quando ela falha, o Pulso
  // **não é zero**: é desconhecido — e a linha de baixo tem de dizer isso em vez de somar sem ele.
  const pulsoCego = filtros.data === 'leitura' && pulsoLeituras != null && pulsoLeituras.estado !== 'ok';
  const pulsoF = useMemo(() => pulsoFonte.filter((d) => noRecorte(d.dia) && (!fRede || d.plataforma === fRede)), [pulsoFonte, corteDia, fimDia, fRede]); // eslint-disable-line react-hooks/exhaustive-deps
  const pulsoPubF = useMemo(() => pulsoContasDias.filter((d) => noRecorte(d.dia) && (!fRede || d.plataforma === fRede)), [pulsoContasDias, corteDia, fimDia, fRede]); // eslint-disable-line react-hooks/exhaustive-deps
  const limePubF = useMemo(() => limePub.filter((d) => noRecorte(d.dia) && (!fRede || d.plataforma === fRede)), [limePub, corteDia, fimDia, fRede]); // eslint-disable-line react-hooks/exhaustive-deps
  const blogF = useMemo(() => blogDias.filter((d) => noRecorte(d.dia)), [blogDias, corteDia, fimDia]); // eslint-disable-line react-hooks/exhaustive-deps
  const serieDe = (rows: { dia: string; v: number }[]) => {
    const m = new Map<string, number>();
    for (const r of rows) m.set(r.dia, (m.get(r.dia) ?? 0) + r.v);
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  };
  // `publicacoes` é opcional porque a view de LEITURA do Pulso não a tem — e não deveria ter:
  // "quantos posts saíram" é pergunta de publicação. Nessa régua a contagem vem por fora.
  const porPlataforma = (rows: { plataforma: string; publicacoes?: number; views: number; likes: number; comentarios: number; shares: number }[]) => {
    const m = new Map<string, { pubs: number; views: number; eng: number }>();
    for (const r of rows) {
      const c = m.get(r.plataforma) ?? { pubs: 0, views: 0, eng: 0 };
      c.pubs += r.publicacoes || 0; c.views += r.views || 0;
      c.eng += (r.likes || 0) + (r.comentarios || 0) + (r.shares || 0);
      m.set(r.plataforma, c);
    }
    return [...m.entries()].map(([plat, c]) => ({ plat, ...c, vpp: c.pubs > 0 ? c.views / c.pubs : 0 }))
      .sort((a, b) => b.views - a.views);
  };
  const pulsoPlats = useMemo(() => porPlataforma(pulsoF.filter((d) => !fMarca || d.marca === fMarca)), [pulsoF, fMarca]); // eslint-disable-line react-hooks/exhaustive-deps
  const limePlats = useMemo(() => porPlataforma(limePubF), [limePubF]); // eslint-disable-line react-hooks/exhaustive-deps
  // ---- O PULSO SÃO TRÊS CANAIS, não um (20/11/2026, ordem do dono) ----
  //
  // A tela lia `v_espelho_pulso_dias`, que é só o canal principal e só os curtos. Passa a ler
  // `v_espelho_pulso_contas_dias`, que reparte por marca e conta e inclui cortes e longos.
  // Conferido linha a linha em 20/11: a view nova é a soma exata das duas antigas — **+1.658 views
  // e +59 publicações** que o Radar não contava (o Espelho do MKT já contava, pela view dos longos,
  // e era mais uma razão de as duas telas discordarem).
  //
  // UMA COISA DIMINUI, e está dito no cartão: a view nova não traz `saves`. São 169 salvamentos em
  // ~25.750 interações do histórico inteiro. Pedi a coluna ao agente do Pulso; até ela chegar,
  // interação aqui = curtidas + comentários + compartilhamentos, escrito onde o número aparece.
  //
  // A conta nasce de `v_contas_pulso`, e não das leituras: canal sem leitura no recorte tem de
  // APARECER dizendo que não tem — inclusive o `corteshistoriaspulso`, bloqueado pela Meta desde
  // 12/11/2026. Canal que some da tela vira canal esquecido.
  const pulsoMarcas = useMemo(() => [...new Set([
    ...pulsoContas.map((x) => x.marca),
    ...pulsoContasDias.map((x) => x.marca),
  ])].sort(), [pulsoContas, pulsoContasDias]);
  const pulsoSegPorMarca = useMemo(() => {
    const ult = new Map<string, PulsoSegDia>();
    for (const s of pulsoSeg) {
      if (s.dia > fimDia) continue;
      if (fRede && s.rede !== fRede) continue;
      const k = `${s.conta}|${s.rede}`;
      const cur = ult.get(k);
      if (!cur || s.dia > cur.dia) ult.set(k, s);
    }
    const m = new Map<string, number>();
    for (const s of ult.values()) m.set(s.marca, (m.get(s.marca) ?? 0) + (s.seguidores ?? 0));
    return m;
  }, [pulsoSeg, fimDia, fRede]);
  const pulsoCards = useMemo(() => pulsoMarcas
    .filter((marca) => !fMarca || marca === fMarca)
    .map((marca) => {
      const rows = pulsoF.filter((d) => d.marca === marca);
      const pubRows = pulsoPubF.filter((d) => d.marca === marca);
      return {
        marca,
        views: rows.reduce((a, d) => a + (d.views || 0), 0),
        pubs: pubRows.reduce((a, d) => a + (d.publicacoes || 0), 0),
        eng: rows.reduce((a, d) => a + (d.likes || 0) + (d.comentarios || 0) + (d.shares || 0), 0),
        plats: porPlataforma(rows),
        serie: serieDe(rows.map((d) => ({ dia: d.dia, v: d.views || 0 }))),
        seguidores: pulsoSegPorMarca.get(marca) ?? 0,
        contas: pulsoContas.filter((x) => x.marca === marca),
      };
    })
    .sort((a, b) => b.views - a.views), [pulsoMarcas, pulsoF, pulsoPubF, fMarca, pulsoSegPorMarca, pulsoContas]); // eslint-disable-line react-hooks/exhaustive-deps
  const ultimaLeituraPulso = useMemo(() => pulsoContasDias.reduce<string | null>((m, d) => (m == null || d.dia > m ? d.dia : m), null), [pulsoContasDias]);
  const pulsoTot = useMemo(() => ({
    views: pulsoCards.reduce((a, x) => a + x.views, 0),
    pubs: pulsoCards.reduce((a, x) => a + x.pubs, 0),
    eng: pulsoCards.reduce((a, x) => a + x.eng, 0),
  }), [pulsoCards]);
  // O LIMELIGHT SÓ SABE RESPONDER "POR PUBLICAÇÃO" (27/11/2026, R7 da régua dos números).
  //
  // `v_espelho_limelight_pub_dias` dá, para cada dia, o acumulado ATUAL das peças publicadas naquele
  // dia — a mesma forma da `contas_dias` do Pulso. Não existe a irmã de leitura. Enquanto ela não
  // existir, somar essa coluna dentro da régua de LEITURA é juntar duas perguntas no mesmo número,
  // calado — foi exatamente o que o Pulso fazia até hoje de manhã. Então ela fica FORA da soma, e a
  // tela escreve que ficou. Pedido mandado ao agente do Limelight em 27/11.
  //
  // `limeTot` continua sendo o número do Limelight como ele é — o cartão próprio dele, na aba Vídeo
  // & motores, diz "views/dia de publicação" e está certo em qualquer régua. Quem não pode somar é a
  // VISÃO, onde a parcela entraria ao lado de parcelas de outra pergunta.
  const limeSoPublicacao = filtros.data === 'leitura';
  const limeTot = useMemo(() => ({
    views: limePubF.reduce((a, d) => a + (d.views || 0), 0),
    pubs: limePubF.reduce((a, d) => a + (d.publicacoes || 0), 0),
  }), [limePubF]);
  const limeSegAtual = useMemo(() => {
    const porPlat = new Map<string, LimelightDia>();
    for (const d of limeDias.filter((x) => (!fRede || x.plataforma === fRede) && x.dia <= fimDia)) {
      const cur = porPlat.get(d.plataforma);
      if (!cur || d.dia > cur.dia || (d.dia === cur.dia && (d.seguidores ?? 0) > (cur.seguidores ?? 0))) porPlat.set(d.plataforma, d);
    }
    return [...porPlat.values()].reduce((a, d) => a + (d.seguidores ?? 0), 0);
  }, [limeDias, fRede, fimDia]);
  // A POLÁ FICA FORA DA SOMA, de propósito — ver o comentário em lib/espelhoMotores.ts: o app dela
  // mede a mesma conta de Instagram que a casa já conta. O cartão mostra a medição DELA, e diz isso.
  const polaF = useMemo(() => (pola?.linhas ?? []).filter((d) => noRecorte(d.dia) && (!fRede || d.plataforma === fRede)),
    [pola, corteDia, fimDia, fRede]); // eslint-disable-line react-hooks/exhaustive-deps
  const polaTot = useMemo(() => ({
    views: polaF.reduce((a, d) => a + (d.views || 0), 0),
    pubs: polaF.reduce((a, d) => a + (d.publicacoes || 0), 0),
    seguidores: polaF.reduce<number>((a, d) => (d.seguidores != null && d.seguidores > a ? d.seguidores : a), 0),
  }), [polaF]);
  const polaPlats = useMemo(() => porPlataforma(polaF.map((d) => ({
    plataforma: d.plataforma, publicacoes: d.publicacoes ?? 0, views: d.views ?? 0,
    likes: d.likes ?? 0, comentarios: d.comentarios ?? 0, shares: d.shares ?? 0,
  }))), [polaF]);
  const blogTot = useMemo(() => blogF.reduce((a, d) => a + (d.leituras || 0), 0), [blogF]);
  const blogPorSlug = useMemo(() => {
    const m = new Map<string, { leituras: number; sessoes: number }>();
    for (const d of blogF) {
      const c = m.get(d.blog_slug) ?? { leituras: 0, sessoes: 0 };
      c.leituras += d.leituras || 0; c.sessoes += d.sessoes || 0;
      m.set(d.blog_slug, c);
    }
    return [...m.entries()].map(([slug, c]) => ({ slug, ...c })).sort((a, b) => b.leituras - a.leituras);
  }, [blogF]);
  const blogSerie = useMemo(() => serieDe(blogF.map((d) => ({ dia: d.dia, v: d.leituras || 0 }))), [blogF]); // eslint-disable-line react-hooks/exhaustive-deps
  // Quem aparece agora é a ORIGEM que decide, não a marca. `fMarca` segue valendo DENTRO da origem:
  // nas marcas do Pulso, escolhe o canal; na casa, a marca da DIGIAI.
  const marcaEhDoPulso = fMarca !== '' && pulsoMarcas.includes(fMarca);
  const mostrarPulso = (fOrigem === '' || fOrigem === 'pulso') && (fMarca === '' || marcaEhDoPulso) && pulsoCards.length > 0;
  // O Limelight produz para a Mello e publica nos canais dela: desde 25/11 ele vive dentro de CASA.
  const mostrarLime = (fOrigem === '' || fOrigem === 'casa') && (fMarca === '' || fMarca === codeMello) && limePub.length > 0;
  const mostrarBlogs = (fOrigem === '' || fOrigem === 'casa') && (!fMarca || fMarca === codeDigiai) && !fRede && blogDias.length > 0;
  const mostrarOsi = (fOrigem === '' || fOrigem === 'casa') && (!fMarca || fMarca === codeOsi) && !fRede;
  const codePola = 'polapetit';
  const mostrarPola = (fOrigem === '' || fOrigem === 'casa') && (!fMarca || fMarca === codePola);
  // Abas que medem as contas da CASA não têm o que mostrar quando o recorte é um motor de fora.
  // Vazio sem explicação é lido como "não aconteceu nada" — e aqui significa "não é aqui".
  const soMotor = fOrigem === 'pulso';

  // Visão: agregados do ecossistema no recorte
  const viewsRecorte = (mostrarPulso ? pulsoTot.views : 0) + (mostrarLime && !limeSoPublicacao ? limeTot.views : 0);
  const pubsRecorte = (mostrarPulso ? pulsoTot.pubs : 0) + (mostrarLime ? limeTot.pubs : 0);
  const engRecorte = (mostrarPulso ? pulsoTot.eng : 0) + (mostrarLime ? limePubF.reduce((a, d) => a + (d.likes || 0) + (d.comentarios || 0) + (d.shares || 0), 0) : 0);
  const sharePlats = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of [...(mostrarPulso ? pulsoPlats : []), ...(mostrarLime && !limeSoPublicacao ? limePlats : [])]) m.set(r.plat, (m.get(r.plat) ?? 0) + r.views);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [pulsoPlats, limePlats, mostrarPulso, mostrarLime, limeSoPublicacao]);
  const shareTot = Math.max(1, sharePlats.reduce((a, [, v]) => a + v, 0));
  const PLAT_COR: Record<string, string> = {
    facebook: '#3987e5', youtube: '#d95926', tiktok: '#199e70', kwai: '#c98500', instagram: '#d55181', linkedin: '#9085e9', x: 'var(--color-muted)',
  };

  // Saúde: cobertura — toda conta cadastrada × existe censo recente?
  //
  // CASAVA POR MARCA+REDE, e por isso mentia (visto no ar em 21/11). Quando uma marca tem duas contas
  // na mesma rede, o censo de UMA marcava as DUAS como medidas. Medido no mesmo dia: a tela dava 31
  // contas "✓ no censo" e o censo por conta são 29. As duas que pegavam carona:
  //   · `@pulsohistorias` no YouTube, cadastrada sob a marca Bastidores DIGIAI — é o canal do PULSO,
  //     cadastro errado que avisei ao MKT; e
  //   · uma segunda conta de Instagram da Lancaster, sem registro em `mkt.accounts` e parada desde
  //     25/08.
  // Conta que ninguém mede aparecendo como medida é o defeito exato que esta aba existe para pegar.
  // Agora casa por `account_id`, que a `audiencia_diaria` tem, e mostra a data do último censo DELA.
  const censoPorConta = useMemo(() => {
    const m = new Map<string, string>();
    for (const a of aud) if (a.account_id && (!m.has(a.account_id) || a.dia > m.get(a.account_id)!)) m.set(a.account_id, a.dia);
    return m;
  }, [aud]);
  // A régua É por marca, então ela PODE obedecer ao "quem" — e obedecer é sempre melhor que avisar.
  const reguaF = useMemo(() => regua.filter((r) => marcaOk(r.marca)), [regua, fOrigem, fMarca]);

  const cobertura = useMemo(() => {
    const limite = diaBrasilia(new Date(Date.now() - 3 * 864e5));
    return contas
      .filter((c) => !/whats/i.test(c.platform))
      .map((c) => { const ult = censoPorConta.get(c.id) ?? null; return { ...c, ultimoCensoConta: ult, medida: ult != null && ult >= limite }; })
      .sort((a, b) => Number(a.medida) - Number(b.medida));
  }, [contas, censoPorConta]);
  /** MARCA × REDE QUE SOMA MAIS DE UMA CONTA (23/11/2026).
   *
   *  Eu ia construir esta leitura sobre a `v_mkt_conta_dia`, que era o item da fila. Medi antes:
   *  ela tem **17.089 linhas desde 2012** e `seguidores` preenchido em **6.253** delas (Instagram:
   *  396 de 5.873), e **não tem TikTok**. É um join largo onde o censo é uma coluna esparsa.
   *  A `mkt.audiencia_diaria`, que esta aba já lê, tem **1.067 linhas, todas com número**, em cinco
   *  redes, 105 dias desde 02/07/2026. Trocar uma pela outra seria perder TikTok e trocar medição
   *  por buraco. O crescimento de seguidores com data **já está na aba Audiência**, e na fonte certa.
   *
   *  O que faltava de verdade era o grão: o painel soma as contas da mesma marca na mesma rede num
   *  número só. Medido no banco, isso acontece em **um** lugar — e é exatamente onde mora o defeito
   *  de cadastro que eu venho anotando: três canais de YouTube sob Bastidores DIGIAI, um deles o
   *  `@pulsohistorias`, que é do Pulso. Enquanto ficar somado, o total da casa fica certo por acaso.
   *  Agora a tela mostra as parcelas, e quem olha decide. */
  const contasSomadas = useMemo(() => {
    const porConta = new Map<string, { brand_id: string; platform: string; account_id: string; seguidores: number; dia: string }>();
    for (const a of aud) {
      if (!a.account_id) continue;
      const k = `${a.brand_id}:${a.platform}:${a.account_id}`;
      const atual = porConta.get(k);
      if (!atual || a.dia > atual.dia) porConta.set(k, { brand_id: a.brand_id, platform: a.platform, account_id: a.account_id, seguidores: a.seguidores, dia: a.dia });
    }
    const grupos = new Map<string, Array<{ account_id: string; seguidores: number; dia: string }>>();
    for (const v of porConta.values()) {
      const k = `${v.brand_id}:${v.platform}`;
      if (!grupos.has(k)) grupos.set(k, []);
      grupos.get(k)!.push({ account_id: v.account_id, seguidores: v.seguidores, dia: v.dia });
    }
    return [...grupos.entries()]
      .filter(([, l]) => l.length > 1)
      .map(([k, l]) => {
        const [brand_id, platform] = k.split(':');
        return {
          marca: brands.find((b) => b.id === brand_id)?.name ?? brand_id,
          platform,
          total: l.reduce((x, y) => x + y.seguidores, 0),
          contas: l.sort((x, y) => y.seguidores - x.seguidores),
        };
      })
      .sort((a, b) => b.contas.length - a.contas.length);
  }, [aud, brands]);

  const credsVencendo = useMemo(() => creds.filter((c) => c.expires_at).map((c) => ({
    ...c, dias: Math.floor((new Date(c.expires_at!).getTime() - Date.now()) / 864e5),
  })).sort((a, b) => a.dias - b.dias), [creds]);

  const conteudos = useMemo(() => {
    const g = new Set<string>(); perf.forEach((x) => { if (x.gatilho) g.add(x.gatilho); if (x.formato) g.add(x.formato); });
    return [...g].sort();
  }, [perf]);

  const chartMode: 'line' | 'bar' = metrica === 'seguidores' ? 'line' : 'bar';
  const lbl = 'font-mono text-[10px] uppercase tracking-widest text-muted';
  const rotuloRecorte = `${fmtDM(corteDia === '2000-01-01' ? (aud[0]?.dia ?? corteDia) : corteDia)} → ${fmtDM(fimDia)}`;

  return (
    <div>
      {soMotor && !loading && (
        <div className="border border-outline/15 bg-surface-container px-3.5 py-2.5 mb-4 text-[13px] text-on-surface-variant">
          Recorte <b className="text-on-surface">{rotuloOrigem(fOrigem)}</b>: são canais de fora da casa, e o dado deles vem do
          espelho do próprio motor — está em <b className="text-on-surface">Vídeo &amp; motores</b>. Audiência, conteúdo e
          régua medem as contas das marcas da DIGIAI; aqui elas aparecem vazias porque não é o lugar delas, não porque
          não houve movimento.
        </div>
      )}
      {loading ? <div className="py-20 text-center text-muted"><Loader2 className="w-5 h-5 animate-spin inline" /></div> : (
        <>
          {/* aviso de coleta parada — em toda aba, dado velho engana */}
          {(() => {
            const dias = ultimoCenso ? Math.floor((Date.now() - new Date(ultimoCenso + 'T12:00:00').getTime()) / 864e5) : null;
            if (dias === null || dias < 3) return null;
            const cor = dias >= 7 ? COR_DANGER : COR_WARN;
            return (
              <div className="border px-3 py-2.5 mb-4 bg-surface-container" style={{ borderColor: cor }}>
                <div className="text-[13px]" style={{ color: cor }}>⚠ Censo de audiência parado há {dias} dias (último {fmtDM(ultimoCenso!)}) — a curva de seguidores está congelada.</div>
              </div>
            );
          })()}

          {/* ═══ VISÃO ═══ */}
          {aba === 'visao' && (() => {
            // A Visão se ADAPTA à marca: quem tem motor de vídeo mostra views;
            // quem só tem redes mostra posts/engajamento — 0 gigante era falha
            // de desenho (marca sem motor parecia marca morta).
            //
            // O NÚMERO GRANDE SOMA, desde 19/11/2026. Antes ele ESCOLHIA: havendo motor, mostrava só
            // os motores e descartava as views das peças da casa — o dono somou marca a marca e não
            // bateu, com razão. Em 'todas' faltavam as postagens; na Mello, as 1.212 do MKT ao lado
            // das 26.502 do Limelight. Somar não duplica, e isso foi medido, não suposto: o espelho do
            // Pulso lê só as contas dele e a `leitura_dia` só as da DIGIAI (conferido em 17/11, zero
            // linhas cruzadas). As parcelas ficam escritas embaixo, para a soma ser conferível.
            const temMotor = viewsRecorte > 0;
            const porLeitura = filtros.data === 'leitura';
            // O NÚMERO DO PERÍODO É O GANHO, NÃO O ACERVO (27/11/2026).
            //
            // O dono viu 16.858 views do TikTok da Mello com o rótulo "hoje". Medido no banco, o
            // acumulado das 50 peças dele foi 16.712 em 24/11 → 16.843 → 16.850 → 16.850: **hoje
            // rendeu zero**. O número não estava bagunçado, estava com o nome errado — acumulado de
            // vida carregando nome de período, que é o erro que a régua dos números proíbe na
            // primeira linha (Cockpit/Harness/regua-dos-numeros.md).
            //
            // Na régua de LEITURA o número grande passa a ser o ganho: por peça, a leitura de dentro
            // da janela menos a última de antes dela; e o espelho do Pulso já entrega ganho por dia,
            // então as duas parcelas respondem a mesma pergunta. O acervo não some — desce para a
            // linha de baixo, com a data, que é o lugar onde ele não mente.
            //
            // Na régua de PUBLICAÇÃO o número continua sendo acumulado, e está certo: ali o período
            // qualifica O QUE FOI PUBLICADO, não quando as views aconteceram. O rótulo passa a dizer
            // isso com todas as letras.
            const viewsTotais = porLeitura ? viewsRecorte + ganhoCasa : viewsRecorte + viewsCasa;
            // `temViews` olha as duas parcelas porque a pergunta aqui é só "este recorte tem views".
            const temViews = viewsRecorte + viewsCasa > 0;
            const heroPostsRotulo = temViews
              ? porLeitura
                ? 'views GANHAS no período (motores + contas da casa)'
                : 'views acumuladas até hoje do que foi PUBLICADO no período'
              : 'engajamento nas redes no período';
            // share das redes das marcas: engajamento por plataforma (mkt real do recorte)
            const engPorRede = (() => {
              const m = new Map<string, number>();
              for (const l of medidos) m.set(l.p.platform, (m.get(l.p.platform) ?? 0) + (l.m!.engajamento || 0));
              return [...m.entries()].sort((a, b) => b[1] - a[1]);
            })();
            const engRedeTot = Math.max(1, engPorRede.reduce((a, [, v]) => a + v, 0));
            // A participação por plataforma soma as mesmas parcelas do número grande. Barra que divide
            // um total diferente do número de cima é a mesma mentira em outro formato.
            const shareViews = (() => {
              const m = new Map<string, number>();
              for (const [plat, v] of sharePlats) m.set(plat, (m.get(plat) ?? 0) + v);
              for (const [rede, v] of viewsCasaPorRede) m.set(rede, (m.get(rede) ?? 0) + v);
              return [...m.entries()].filter(([, v]) => v > 0).sort((a, b) => b[1] - a[1]);
            })();
            const share = temViews ? shareViews : engPorRede;
            const shTot = temViews ? Math.max(1, shareViews.reduce((a, [, v]) => a + v, 0)) : engRedeTot;
            return (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> o tamanho real do alcance e da atenção no recorte — e onde estão concentrados.</>} />
              <div className="grid gap-3 mb-4" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
                <div className="border border-outline/15 bg-surface-container p-5" style={{ gridColumn: 'span 2' }}>
                  <div className={lbl}>{heroPostsRotulo} · {rotuloRecorte}</div>
                  <div className="font-mono tabular-nums font-semibold text-on-surface" style={{ fontSize: 'clamp(30px,4.5vw,44px)', lineHeight: 1.1 }}>{nf(temViews ? viewsTotais : engTotal)}</div>
                  <div className="text-[12px] text-muted mt-1 mb-3">
                    {temViews
                      ? <>
                          {mostrarPulso && pulsoCego
                            ? <><span className="text-error">Pulso não medido</span> (não consegui ler o espelho de leitura{pulsoLeituras?.detalhe ? `: ${pulsoLeituras.detalhe}` : ''}) · </>
                            : mostrarPulso && pulsoTot.views > 0 && <>Pulso {nf(pulsoTot.views)} · </>}
                          {mostrarLime && limeSoPublicacao
                            ? <><span className="text-error">Limelight fora</span> (o espelho dele só responde por publicação) · </>
                            : mostrarLime && limeTot.views > 0 && <>Limelight {nf(limeTot.views)} · </>}
                          {chegando('pecas')
                            ? <>contas da casa <span className="animate-pulse">medindo…</span></>
                            : porLeitura && pecasComGanho === 0 && pecasF.length > 0
                            ? <><span className="text-error">contas da casa não medido</span> (nenhuma das {nf(pecasF.length)} peças do recorte nasceu na janela nem tem leitura anterior) · </>
                            : porLeitura
                            ? <>contas da casa {nf(ganhoCasa)} ({nf(pecasComGanho)} de {nf(pecasF.length)} peças com ganho apurado{pecasSemAnterior > 0 ? ` · ${nf(pecasSemAnterior)} são de antes da janela e só foram lidas agora: não dá para saber quanto renderam nela` : ''})</>
                            : viewsCasa > 0
                            ? <>contas da casa {nf(viewsCasa)} ({pecasComViews} de {pecasF.length} peças lidas{estimadas > 0 ? ` · ${estimadas} sem registro de publicação, datadas pela 1ª leitura` : ''})</>
                            : <>contas da casa sem leitura no recorte</>}
                        </>
                      : <>{linhas.length} publicações · {medidos.length} medidas{fMarca ? ' · esta marca não tem motor de vídeo — o dado dela vive nas redes' : ''}</>}
                  </div>
                  {/* O ACERVO NÃO SOME, MUDA DE LUGAR. Ele é a outra pergunta — "quanto essas peças
                      já juntaram na vida" — e leva data, não período. Em cima fica o que entrou. */}
                  {temViews && porLeitura && viewsCasa > 0 && (
                    <div className="text-[12px] text-on-surface-variant -mt-2 mb-3">
                      acervo das contas da casa no recorte: <b className="font-mono tabular-nums">{nf(viewsCasa)}</b> views somadas desde que cada peça nasceu, na leitura de {fimDia.slice(8, 10)}/{fimDia.slice(5, 7)} — os motores não entram aqui: o espelho deles entrega ganho, não acervo
                    </div>
                  )}
                  {share.length > 0 ? (
                    <>
                      <div className="flex h-6 gap-0.5">
                        {share.map(([p, v]) => (
                          <div key={p} title={`${platName(p)} ${nf(v)} (${Math.round(v / shTot * 100)}%)`}
                            style={{ width: `${(v / shTot * 100).toFixed(1)}%`, background: PLAT_COR[p] ?? COR_SEC, minWidth: 2 }} />
                        ))}
                      </div>
                      <div className="flex flex-wrap gap-x-4 gap-y-1 mt-2 text-[12px] text-on-surface-variant">
                        {share.map(([p, v]) => (
                          <span key={p}><span className="inline-block w-2.5 h-2.5 mr-1.5 align-[-1px]" style={{ background: PLAT_COR[p] ?? COR_SEC }} />{platName(p)} {nf(v)}</span>
                        ))}
                      </div>
                      <div className={lbl + ' mt-2'}>{temViews ? 'participação de views por plataforma · motores + contas da casa' : 'participação de engajamento por rede'}</div>
                    </>
                  ) : <div className="text-sm text-muted py-3">sem publicações medidas neste recorte — se a marca é nova no censo, a curva nasce com os próximos dias.</div>}
                </div>
                <div className="border border-outline/15 bg-surface-container p-5">
                  <div className={lbl}>seguidores (censo, fim do período)</div>
                  <div className="font-mono tabular-nums text-2xl font-semibold" style={{ color: COR_SEC }}>{soMotor ? '—' : segAtual ? nf(segAtual) : '—'}</div>
                  <div className="text-[11px] mt-0.5" style={{ color: soMotor ? 'var(--color-muted)' : (segDelta ?? 0) >= 0 ? COR_OK : COR_DANGER }}>
                    {soMotor ? 'o censo aqui é das contas da casa — os seguidores deste recorte estão no cartão de cada canal'
                      : segDelta != null ? `${segDelta >= 0 ? '+' : ''}${nf(segDelta)} no período` : 'sem série no recorte'}</div>
                  {mostrarBlogs && <>
                    <div className={lbl + ' mt-3'}>blogs no período</div>
                    <div className="text-[13px] text-on-surface-variant">{blogTot} leituras{blogsEsp ? ` · ${blogsEsp.posts_no_ar} posts no ar` : ''}</div>
                  </>}
                </div>
              </div>
              <section className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {/* "medidos" aqui é só engajamento: ele vem da `content_performance`, que não tem número
                    de TikTok nem de YouTube. Ao lado de "16 de 16 peças com leitura", um "0 medidos" sem
                    sobrenome parecia contradição na mesma tela — visto no ar em 19/11, logo após o
                    conserto das views. E **zero é medição**: rede sem coleta de engajamento mostra traço,
                    nunca 0, senão o TikTok aparece como conteúdo que ninguém curtiu. */}
                <Kpi icon={<Newspaper className="w-4 h-4" />} label="posts nas redes"
                  value={chegando('publicacoes') ? '…' : soMotor ? '—' : nf(linhas.length)}
                  sub={chegando('publicacoes') ? 'medindo…' : soMotor ? FORA_DA_CASA : `no recorte · ${medidos.length} com engajamento medido`} glow={COR_SEC} />
                <Kpi icon={<Sparkles className="w-4 h-4" />} label="engajamento redes" value={soMotor || medidos.length === 0 ? '—' : nf(engTotal)}
                  sub={soMotor ? FORA_DA_CASA : medidos.length === 0 ? 'engajamento não coletado nesta rede' : `média ${nf(Math.round(engMed))}/post`} glow={COR_OK} />
                <Kpi icon={<Film className="w-4 h-4" />} label="views motores" value={temMotor ? nf(viewsRecorte) : '—'} sub={temMotor ? `${nf(pubsRecorte)} pubs · ${nf(engRecorte)} interações` : fMarca ? 'sem motor nesta marca' : 'sem views no recorte'} glow={COR_WARN} />
                <Kpi icon={<Eye className="w-4 h-4" />}
                  label={porLeitura ? 'views que as peças da casa GANHARAM no período' : 'views acumuladas do que a casa publicou no período'}
                  value={chegando('pecas') ? '…' : soMotor || viewsCasa === 0 ? '—'
                    : porLeitura && pecasComGanho === 0 ? 'não medido'
                    : nf(porLeitura ? ganhoCasa : viewsCasa)}
                  sub={chegando('pecas') ? 'medindo…' : soMotor ? FORA_DA_CASA
                    : viewsCasa === 0 ? 'a coletar — despacho no MKT (sync-metricas)'
                    : porLeitura && pecasComGanho === 0 ? `nenhuma peça do recorte nasceu na janela nem tem leitura anterior — acervo delas: ${nf(viewsCasa)}`
                    : porLeitura ? `${nf(pecasComGanho)} de ${nf(pecasF.length)} peças com ganho apurado · acervo de todas: ${nf(viewsCasa)}`
                    : `${pecasComViews} de ${pecasF.length} peças com leitura · acumulado de vida, não é o que entrou no período`} glow={COR_SEC} />
              </section>
            </>
            );
          })()}

          {/* ═══ AUDIÊNCIA ═══ */}
          {aba === 'audiencia' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> em qual marca e rede investir presença. Toda marca aparece — fora do censo é aviso, não ausência.</>} />
              <div className={lbl + ' mb-2 flex flex-wrap items-center gap-x-2 gap-y-1'}>
                <span className="text-secondary">●</span> censo diário 7h
                <span>▸</span> último {ultimoCenso ? fmtDM(ultimoCenso) : '—'}
                <span>▸</span> {contasMedidas} contas medidas
                <span>▸</span> alcance {temAlcance ? <span style={{ color: COR_OK }}>ok</span> : <span style={{ color: COR_WARN }}>🔒 permissão Meta</span>}
              </div>
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                {brands.map((b) => {
                  const serie = (seriePorMarca.get(b.id) ?? []).filter((v) => v > 0);
                  const atual = serie.length ? serie[serie.length - 1] : 0;
                  const delta = serie.length >= 2 ? atual - serie[0] : null;
                  if (!marcaOk(b.code)) return null;
                  const semCenso = atual === 0;
                  const c = b.accent_hex || COR_SEC;
                  return (
                    <div key={b.id} className="border border-outline/15 bg-surface-container px-4 py-3.5" style={semCenso ? { opacity: 0.75 } : undefined}>
                      <div className="flex items-center gap-2 mb-2">
                        {b.logo_url ? <img src={b.logo_url} alt="" className="w-6 h-6 object-cover" /> : <span className="w-6 h-6 flex items-center justify-center text-[10px]" style={{ background: `color-mix(in srgb, ${c} 13%, transparent)`, color: c }}>{b.name[0]}</span>}
                        <span className="text-sm flex-1 truncate text-on-surface">{b.name}</span>
                        {delta != null && <span className="text-[11px] font-mono tabular-nums" style={{ color: delta >= 0 ? COR_OK : COR_DANGER }}>{delta >= 0 ? '+' : ''}{delta}</span>}
                      </div>
                      <div className="flex items-end justify-between gap-3">
                        <div className="text-2xl font-semibold font-mono tabular-nums" style={{ color: semCenso ? undefined : c }}>{semCenso ? '—' : nf(atual)}</div>
                        {!semCenso && <Spark serie={serie} color={c} />}
                      </div>
                      <div className="text-[10px] mt-1" style={{ color: semCenso ? COR_WARN : undefined }}>
                        {semCenso ? 'fora do censo — a ligar (ver aba Saúde)' : <span className="text-muted">{serie.length <= 1 ? 'baseline — a curva nasce amanhã' : `${serie.length} dias de série`}</span>}
                      </div>
                    </div>
                  );
                })}
              </section>
              <div className="flex flex-wrap items-center gap-2 mb-2.5">
                <TrendingUp className="w-4 h-4 text-secondary" /><h2 className="text-sm text-on-surface-variant">evolução no tempo</h2>
                <span className={lbl}>{diasEixo.length} dias no eixo</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {METRICAS.map((m) => <Chip key={m.k} on={metrica === m.k} onClick={() => setMetrica(m.k)}>{m.label}</Chip>)}
                </div>
              </div>
              <section className="border border-outline/15 bg-surface-container px-4 pt-4 pb-3 mb-6">
                <TrendChart series={seriesMetrica} dias={diasEixo} mode={chartMode} />
              </section>
              {crescimentoMarca.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-6">
                  {crescimentoMarca.map((cm) => (
                    <div key={cm.b.id} className="border border-outline/15 bg-surface-container inline-flex items-center gap-2 px-2.5 py-1.5">
                      {cm.b.logo_url ? <img src={cm.b.logo_url} alt="" className="w-4 h-4 object-cover" /> : <span className="w-2 h-2 rounded-full" style={{ background: cm.b.accent_hex || COR_SEC }} />}
                      <span className="text-[12px] text-on-surface-variant">{cm.b.name}</span>
                      <span className="font-mono tabular-nums text-[13px]" style={{ color: cm.delta >= 0 ? COR_OK : COR_DANGER }}>{cm.delta >= 0 ? '+' : ''}{nf(cm.delta)} · {cm.pct.toFixed(1)}%</span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">matriz marca × rede</h2><span className={lbl}>todas as redes do grupo · — = a ligar</span></div>
              <section className="border border-outline/15 bg-surface-container overflow-x-auto mb-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-outline/15">
                      <th className={'text-left font-normal px-4 py-2.5 ' + lbl}>marca</th>
                      {redesMatriz.map((n) => <th key={n} className={'px-3 py-2.5 font-normal ' + lbl}>{platName(n)}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {matriz.map(({ b, cells }) => (
                      <tr key={b.id} className="border-b border-outline/10 hover:bg-surface-highest/50">
                        <td className="px-4 py-2.5">
                          <span className="inline-flex items-center gap-2">
                            {b.logo_url && <img src={b.logo_url} alt="" className="w-5 h-5 object-cover" />}
                            <span className="truncate text-on-surface">{b.name}</span>
                          </span>
                        </td>
                        {cells.map((c) => (
                          <td key={c.net} className="px-3 py-2.5 text-center">
                            {c.seg == null ? <span className="text-muted">—</span> : (
                              <div className="leading-tight">
                                <div className="font-mono tabular-nums" style={{ color: b.accent_hex || undefined }}>{nf(c.seg)}</div>
                                {c.delta != null && c.delta !== 0 && <div className="font-mono tabular-nums text-[10px]" style={{ color: c.delta >= 0 ? COR_OK : COR_DANGER }}>{c.delta >= 0 ? '+' : ''}{nf(c.delta)}</div>}
                              </div>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </section>
            </>
          )}

          {/* ═══ CONTEÚDO ═══ */}
          {aba === 'conteudo' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> que formato produzir mais e em que janela publicar — provado pelo engajamento real do recorte.</>} />
              {conteudos.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 border border-outline/15 bg-surface-container px-3.5 py-2.5 mb-4">
                  <span className={lbl + ' mr-1 shrink-0'}>conteúdo</span>
                  <Chip on={fConteudo === ''} onClick={() => setFConteudo('')}>todos</Chip>
                  {conteudos.slice(0, 10).map((x) => <Chip key={x} on={fConteudo === x} onClick={() => setFConteudo(fConteudo === x ? '' : x)}>{x.length > 26 ? x.slice(0, 26) + '…' : x}</Chip>)}
                  <span className="text-[11px] text-muted ml-1">vale só nesta aba</span>
                </div>
              )}
              <section className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
                <Kpi icon={<TrendingUp className="w-4 h-4" />} label="engajamento" value={nf(engTotal)} sub={`${medidos.length} posts medidos · média ${nf(Math.round(engMed))}`} glow={COR_OK} />
                <Kpi icon={<Eye className="w-4 h-4" />} label="alcance" value={temAlcance ? nf(alcanceTotal) : '🔒'} sub={temAlcance ? (taxaEng != null ? `taxa ${taxaEng.toFixed(1)}%` : '') : 'aguarda permissão Meta'} glow={COR_WARN} />
                <Kpi icon={<Bookmark className="w-4 h-4" />} label="salvamentos" value={temAlcance ? nf(savesTotal) : '🔒'} sub="o que o público guarda" glow={COR_SEC} />
                <Kpi icon={<Share2 className="w-4 h-4" />} label="compartilhamentos" value={sharesTotal > 0 ? nf(sharesTotal) : (temAlcance ? '0' : '🔒')} sub="anúncio grátis" glow={COR_SEC} />
                <Kpi icon={<Newspaper className="w-4 h-4" />} label="publicações" value={nf(linhas.length)} sub="no recorte" glow={COR_SEC} />
              </section>
              <section className="grid grid-cols-1 lg:grid-cols-2 gap-3 mb-4">
                <RankPanel titulo="por formato" itens={porFormato} accent={COR_SEC} />
                <RankPanel titulo="por gatilho" itens={porGatilho} accent={COR_OK} />
              </section>
              {porHora.list.length > 0 && (
                <section className="border border-outline/15 bg-surface-container px-4 py-3.5 mb-6">
                  <div className={lbl + ' mb-2'}>janelas de horário · eng médio por post</div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {porHora.list.map((h) => {
                      const top = porHora.best && h.faixa === porHora.best.faixa;
                      return (
                        <div key={h.faixa} className="px-3 py-2.5 border" style={{ borderColor: top ? COR_WARN : 'color-mix(in srgb, var(--color-outline, #888) 30%, transparent)' }}>
                          <div className="font-mono tabular-nums text-lg" style={{ color: top ? COR_WARN : undefined }}>{nf(Math.round(h.engMed))}</div>
                          <div className="text-[11px] text-on-surface-variant">{h.faixa}</div>
                          <div className={lbl}>{h.n} posts</div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}
              <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">o que o público premiou</h2><span className={lbl}>{linhas.length} publicações no recorte</span></div>
              <section className="border border-outline/15 bg-surface-container overflow-hidden">
                <div className={'hidden sm:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 px-4 py-2 border-b border-outline/15 ' + lbl}>
                  <span>rede</span><span>marca · quando</span><span className="text-right">eng</span><span className="text-right">views</span><span className="text-right">alcance</span><span></span>
                </div>
                {linhas.slice().sort((a, b2) => (b2.m?.engajamento ?? -1) - (a.m?.engajamento ?? -1)).slice(0, 12).map(({ p, m }) => (
                  <div key={p.id} className="grid grid-cols-[auto_1fr_auto_auto] sm:grid-cols-[auto_1fr_auto_auto_auto_auto] gap-x-3 items-center px-4 py-2.5 border-b border-outline/10 hover:bg-surface-highest/50 text-sm">
                    <span className="w-6 h-6 flex items-center justify-center font-mono text-[9px] uppercase" style={{ background: `color-mix(in srgb, ${accent(p.brand_id)} 13%, transparent)`, color: accent(p.brand_id) }}>{platName(p.platform).slice(0, 2)}</span>
                    <span className="min-w-0 truncate text-on-surface">{brandOf(p.brand_id)?.name ?? '—'} <span className="text-muted text-xs">· {fmtDM(p.published_at)} · {platName(p.platform)}{m?.gatilho ? ' · ' + m.gatilho.slice(0, 22) : ''}</span></span>
                    <span className="text-right font-mono tabular-nums" style={{ color: COR_OK }}>{m ? m.engajamento : '—'}</span>
                    <span className="hidden sm:block text-right font-mono tabular-nums text-on-surface-variant">{viewsDaPub(p) ?? m?.views ?? '—'}</span>
                    <span className="hidden sm:block text-right font-mono tabular-nums text-on-surface-variant">{m?.alcance ?? '—'}</span>
                    {p.url ? <a href={p.url} target="_blank" rel="noreferrer" className="text-muted hover:text-secondary"><ExternalLink className="w-3.5 h-3.5" /></a> : <span />}
                  </div>
                ))}
                {linhas.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted">Nada neste recorte — ajuste os filtros.</div>}
              </section>
            </>
          )}

          {/* ═══ VÍDEO & MOTORES ═══ */}
          {aba === 'video' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> onde dobrar a aposta de vídeo. <b>Views/pub</b> é a coluna de decisão — mesmo esforço, retorno diferente.</>} />
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-3 mb-6">
                {mostrarPulso ? pulsoCards.map((pc) => (
                  <MotorCard key={pc.marca} titulo={`Pulso · ${pc.marca}`} cor={COR_SEC}
                    headline={pc.views > 0 ? `${nf(pc.views)} views` : '—'}
                    sub={pc.views > 0
                      ? `${pc.pubs} publicações · ${nf(pc.eng)} interações (curtidas+comentários+compart.) · ${nf(pc.seguidores)} seguidores`
                      : `sem leitura neste recorte · ${pc.contas.length} ${pc.contas.length === 1 ? 'conta' : 'contas'} · ${nf(pc.seguidores)} seguidores`}
                    serie={pc.serie} rotuloSerie="views/dia de publicação"
                    plats={pc.plats}
                    sacada={pc.plats.length >= 2 && pc.plats[0].pubs >= 2
                      ? (() => { const top = [...pc.plats].sort((a, b) => b.vpp - a.vpp)[0]; return `melhor eficiência: ${platName(top.plat)} (${nf(Math.round(top.vpp))} views/pub)`; })()
                      : pc.contas.find((x) => x.observacao)?.observacao ?? undefined} />
                )) : <MotorVazio titulo="Pulso · canais faceless" motivo={fOrigem ? `o recorte é ${rotuloOrigem(fOrigem)}` : 'o filtro de marca exclui os canais do Pulso'} />}
                {mostrarLime ? (
                  <MotorCard titulo="Limelight · fábrica Mello" cor={COR_OK}
                    headline={`${nf(limeTot.views)} views`} sub={`${limeTot.pubs} publicações no período · ${nf(limeSegAtual)} seguidores no censo próprio`}
                    serie={serieDe(limePubF.map((d) => ({ dia: d.dia, v: d.views || 0 })))} rotuloSerie="views/dia de publicação"
                    plats={limePlats}
                    sacada={limePlats.length >= 2 && limePlats[0].pubs >= 2 ? (() => { const top = [...limePlats].sort((a, b) => b.vpp - a.vpp)[0]; return `melhor eficiência: ${platName(top.plat)} (${nf(Math.round(top.vpp))} views/pub)`; })() : undefined} />
                ) : <MotorVazio titulo="Limelight · fábrica Mello" motivo={fOrigem ? `o recorte é ${rotuloOrigem(fOrigem)}` : 'o filtro de marca exclui a fábrica'} />}
                {mostrarBlogs ? (
                  <MotorCard titulo="Blogs regionais · 5 sites" cor={COR_WARN}
                    headline={`${nf(blogTot)} leituras`} sub="first-party, zero PII · medição desde 20/08"
                    serie={blogSerie} rotuloSerie="leituras/dia"
                    blogsDetalhe={blogPorSlug}
                    sacada={blogPorSlug.length >= 2 && blogPorSlug[0].leituras > 0 ? `${blogPorSlug[0].slug} puxa a rede (${blogPorSlug[0].leituras} leituras)` : undefined} />
                ) : <MotorVazio titulo="Blogs regionais · 5 sites" motivo={fRede ? 'blogs não têm recorte por rede' : fOrigem && fOrigem !== 'casa' ? `o recorte é ${rotuloOrigem(fOrigem)}` : 'o filtro de marca exclui os blogs'} />}
                {mostrarPola ? (
                  pola && pola.estado !== 'ok'
                    ? <MotorVazio titulo="Polá Petit · espelho próprio" motivo={pola.estado === 'sem_credencial'
                        ? 'falta a variável VITE_POLA_SUPABASE_ANON_KEY no painel — quem cola é o dono'
                        : `não consegui ler: ${pola.detalhe ?? pola.estado}`} />
                    : <MotorCard titulo="Polá Petit · espelho próprio" cor={COR_WARN}
                        headline={polaTot.views > 0 ? `${nf(polaTot.views)} views` : '—'}
                        sub={polaTot.views > 0
                          ? `${polaTot.pubs} publicações no período${polaTot.seguidores > 0 ? ` · ${nf(polaTot.seguidores)} seguidores` : ''}`
                          : 'sem leitura neste recorte'}
                        serie={serieDe(polaF.map((d) => ({ dia: d.dia, v: d.views || 0 })))} rotuloSerie="views/dia"
                        plats={polaPlats}
                        aviso={<><b className="text-on-surface-variant">Fora do número grande, de propósito.</b> A Polá não é motor como o Pulso e o Limelight:
                          eles publicam em canais próprios, e o app da Polá mede a <b>mesma conta de Instagram</b> que a casa já conta.
                          Medido em 21/11: a casa tem 96 peças de Instagram da Polá com <b>103.698 views</b>, e este espelho reporta <b>43.321</b>.
                          Somar contaria a mesma postagem duas vezes — e a diferença entre as duas medições é pergunta aberta para a Polá e o MKT.</>} />
                ) : <MotorVazio titulo="Polá Petit · espelho próprio" motivo={fOrigem && fOrigem !== 'casa' ? `o recorte é ${rotuloOrigem(fOrigem)}` : 'o filtro de marca exclui a Polá'} />}
                {mostrarOsi
                  ? <OsiDiasCard desde={corteDia} ate={fimDia} cor={COR_SEC} />
                  : <MotorVazio titulo="OSI · landing e leitor" motivo={fRede ? 'a OSI não tem recorte por rede' : fOrigem && fOrigem !== 'casa' ? `o recorte é ${rotuloOrigem(fOrigem)}` : 'o filtro de marca exclui a OSI'} />}
              </section>
            </>
          )}

          {/* ═══ FUNIL ═══ */}
          {/* ═══ RÉGUA POR MARCA ═══ */}
          {aba === 'regua' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> quanto cada marca pode postar esta semana. O nível não é meta — é permissão: sobe quando a audiência aguenta, desce quando o alcance cai duas semanas seguidas.</>} />
              <ForaDaBarra>
                o nível é semanal e vale <b>agora</b>: não há janela para recortar, e a régua é por marca — não existe
                nível por rede nem por data de leitura. O recorte de <b>quem</b> a aba obedece; período, rede e a régua da data, não.
              </ForaDaBarra>
              {reguaF.length === 0 ? (
                <div className="text-sm text-muted py-6">
                  {regua.length === 0
                    ? 'A régua ainda não foi calculada. O MKT recalcula toda segunda às 6h15.'
                    : `A régua tem ${regua.length} marcas, e nenhuma delas está no recorte de quem. Troque o "quem" na barra.`}
                </div>
              ) : (
                <>
                  <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))' }}>
                    {[...reguaF].sort((a, b) => b.nivel - a.nivel || b.seguidores_ig - a.seguidores_ig).map((r) => <CardNivel key={r.marca} r={r} />)}
                  </div>
                  <p className="text-xs text-muted mt-4 leading-relaxed">
                    Lido de <code className="font-mono">v_mkt_nivel_crescimento</code>; quem calcula é o DIGIAI MKT, toda
                    segunda às 6h15. Esta tela não faz conta nenhuma — se um número parecer errado, o conserto é lá.
                    Régua aprovada pelo dono em 03/10.
                  </p>
                </>
              )}
            </>
          )}

          {/* ═══ SAÚDE ═══ */}
          {aba === 'territorio' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> para onde levar a próxima raspagem. O branco manda mais que a cor — cidade sem raspagem é mercado que nem sabemos que existe.</>} />
              <ForaDaBarra>
                o mapa é a cobertura de raspagem <b>de agora</b>, do grupo inteiro: não tem janela, não tem rede e não tem
                marca. Com <b>Mello</b> escolhido lá em cima, o que se vê aqui continua sendo o território de todas.
              </ForaDaBarra>
              <MapaCobertura />
            </>
          )}

          {aba === 'saude' && (
            <>
              <Decide texto={<><b>O que se decide aqui:</b> se dá para confiar nos números das outras abas. Fonte sem data fresca congela em silêncio — esta aba é o antídoto.</>} />
              <ForaDaBarra>
                saúde é retrato de <b>agora</b>: censo, coletas, fila e credenciais não têm janela, e a cobertura mostra
                <b> toda conta cadastrada</b>, de propósito — esconder conta pelo recorte esconderia justamente a que parou.
                O único cartão que obedece à barra é <b>views das peças da casa</b>, que conta as peças do recorte.
              </ForaDaBarra>
              <div className="flex items-center gap-2 mb-4">
                <button onClick={sincronizar} disabled={sincronizando}
                  className="flex items-center gap-1.5 text-xs px-3 py-1.5 border border-outline/30 text-on-surface-variant hover:bg-surface-highest disabled:opacity-50">
                  {sincronizando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} sincronizar agora
                </button>
                <span className="text-[11px] text-muted">chama o motor do MKT e relê — o botão mora aqui porque é aqui que se vê se adiantou</span>
              </div>
              <section className="grid gap-2.5 mb-5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
                <Health cor={ultimoCenso === hojeBrasilia() ? COR_OK : COR_WARN} titulo="Censo de redes" sub={`${contasMedidas || '—'} contas · último ${ultimoCenso ? fmtDM(ultimoCenso) : '—'}`} />
                <Health cor={ultimaLeituraPulso === hojeBrasilia() ? COR_OK : COR_WARN} titulo="Pulso"
                  sub={`${pulsoMarcas.length} canais · ${pulsoContas.length} contas · últ. leitura ${ultimaLeituraPulso ? fmtDM(ultimaLeituraPulso) : '—'}`} />
                <Health cor={COR_OK} titulo="Limelight" sub="coleta própria da fábrica" />
                <Health cor={COR_OK} titulo="Blogs" sub={blogsEsp ? `últ. leitura ${blogsEsp.ultima_leitura ? fmtDM(blogsEsp.ultima_leitura) : '—'}` : 'espelho indisponível'} />
                {fila && <Health cor={fila.atrasados > 50 || fila.com_erro > 0 ? COR_DANGER : COR_OK} titulo="Fila do motor MKT" sub={`${fila.atrasados} atrasados · ${fila.com_erro} com erro`} />}
                <Health cor={pecasComViews > 0 ? COR_OK : COR_WARN} titulo="Views das peças da casa"
                  sub={pecasComViews > 0
                    ? `${pecasComViews} de ${pecasF.length} peças com leitura · ${[...viewsCasaPorRede.entries()].sort((a, b) => b[1] - a[1]).map(([r, v]) => `${platName(r)} ${nf(v)}`).join(' · ') || 'sem view'}`
                    : 'coluna pronta · coleta a ligar (MKT)'} />
                {credsVencendo.map((c) => (
                  <Health key={c.platform + (c.marca ?? '')} cor={c.dias <= 0 ? COR_DANGER : c.dias <= 3 && c.platform !== 'tiktok' ? COR_WARN : COR_OK}
                    titulo={`OAuth ${platName(c.platform)} · ${c.marca ?? '?'}`}
                    sub={c.dias < 0 ? `venceu há ${-c.dias}d` : c.dias === 0 ? 'vence HOJE' : c.platform === 'tiktok' ? `ciclo de 24h · cron renova (vence em ${c.dias}d)` : `vence em ${c.dias}d`} />
                ))}
              </section>
              <div className="flex items-baseline justify-between mb-2.5"><h2 className="text-sm text-on-surface-variant">cobertura — toda conta cadastrada × coleta</h2><span className={lbl}>fora do censo = número congelado sem aviso</span></div>
              <section className="border border-outline/15 bg-surface-container overflow-x-auto">
                <table className="w-full text-[13px]">
                  <thead>
                    <tr className="border-b border-outline/15">
                      <th className={'text-left font-normal px-4 py-2 ' + lbl}>marca</th>
                      <th className={'text-left font-normal px-4 py-2 ' + lbl}>rede</th>
                      <th className={'text-left font-normal px-4 py-2 ' + lbl}>conta</th>
                      <th className={'text-left font-normal px-4 py-2 ' + lbl}>coleta</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cobertura.map((c, i) => (
                      <tr key={i} className="border-b border-outline/10 hover:bg-surface-highest/50">
                        <td className="px-4 py-2 text-on-surface">{c.brand_name ?? '—'}</td>
                        <td className="px-4 py-2 text-on-surface-variant">{platName(c.platform)}</td>
                        <td className="px-4 py-2 font-mono text-[12px] text-on-surface-variant">{c.handle ?? '—'}</td>
                        <td className="px-4 py-2">
                          {c.medida
                            ? <span style={{ color: COR_OK }}>✓ no censo · {c.ultimoCensoConta ? fmtDM(c.ultimoCensoConta) : '—'}</span>
                            : c.ultimoCensoConta
                              ? <span style={{ color: COR_DANGER }}>parada — último censo {fmtDM(c.ultimoCensoConta)}</span>
                              : <span style={{ color: COR_WARN }}>a ligar{c.status === 'a_configurar' ? ' · a configurar no motor' : ''}</span>}
                        </td>
                      </tr>
                    ))}
                    {cobertura.length === 0 && <tr><td colSpan={4} className="px-4 py-8 text-center text-muted">sem contas cadastradas visíveis.</td></tr>}
                  </tbody>
                </table>
              </section>

              {contasSomadas.length > 0 && (
                <>
                  <div className="flex items-baseline justify-between mt-6 mb-2.5">
                    <h2 className="text-sm text-on-surface-variant">uma marca, mais de uma conta na mesma rede</h2>
                    <span className={lbl}>o painel soma — aqui ficam as parcelas</span>
                  </div>
                  <section className="border border-outline/15 bg-surface-container">
                    {contasSomadas.map((g) => (
                      <div key={g.marca + g.platform} className="px-4 py-3 border-b border-outline/10 last:border-0">
                        <div className="text-[13px] text-on-surface">
                          {g.marca} · {platName(g.platform)}
                          <span className="text-muted font-mono text-[11px]"> — {g.contas.length} contas somadas em {nf(g.total)} seguidores</span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap gap-x-5 gap-y-1">
                          {g.contas.map((c) => {
                            const h = contas.find((x) => x.id === c.account_id);
                            return (
                              <span key={c.account_id} className="font-mono text-[11px] text-on-surface-variant">
                                {h?.handle ?? c.account_id.slice(0, 8)}
                                <span className="text-muted"> · {nf(c.seguidores)} · censo {fmtDM(c.dia)}</span>
                              </span>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </section>
                  <p className="text-[11px] text-muted mt-2 leading-relaxed">
                    Somar contas da mesma marca numa rede só está certo quando as contas são da marca. Hoje
                    <b className="text-on-surface-variant"> @pulsohistorias</b> está cadastrada sob Bastidores DIGIAI e entra no censo da
                    casa todos os dias — o cadastro é do DIGIAI MKT e o conserto é lá. Até lá, o total da casa está certo
                    por acaso, e esta é a única tela onde dá para ver isso.
                  </p>
                </>
              )}

              {/* As contas do Pulso ficavam fora desta aba inteira (20/11): a cobertura lia só
                  `v_mkt_accounts`, que é da casa. Um canal do Pulso bloqueado pela Meta desde 12/11
                  não aparecia em lugar nenhum do painel — e conta parada sem aviso vira número
                  congelado, que é o defeito que esta aba existe para pegar. */}
              {pulsoContas.length > 0 && (
                <>
                  <div className="flex items-baseline justify-between mb-2.5 mt-6">
                    <h2 className="text-sm text-on-surface-variant">contas do Pulso — {pulsoMarcas.length} canais, {pulsoContas.length} contas</h2>
                    <span className={lbl}>canal de fora da casa também congela em silêncio</span>
                  </div>
                  <section className="border border-outline/15 bg-surface-container overflow-x-auto">
                    <table className="w-full text-[13px]">
                      <thead>
                        <tr className="border-b border-outline/15">
                          <th className={'text-left font-normal px-4 py-2 ' + lbl}>canal</th>
                          <th className={'text-left font-normal px-4 py-2 ' + lbl}>rede</th>
                          <th className={'text-left font-normal px-4 py-2 ' + lbl}>conta</th>
                          <th className={'text-left font-normal px-4 py-2 ' + lbl}>coleta</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pulsoContas.map((x, i) => (
                          <tr key={i} className="border-b border-outline/10 hover:bg-surface-highest/50">
                            <td className="px-4 py-2 text-on-surface">{x.marca}</td>
                            <td className="px-4 py-2 text-on-surface-variant">{platName(x.rede)}</td>
                            <td className="px-4 py-2 font-mono text-[12px] text-on-surface-variant">{x.conta}</td>
                            <td className="px-4 py-2">
                              {x.observacao
                                ? <span style={{ color: COR_WARN }}>{x.observacao}</span>
                                : x.mede_views && x.mede_seguidores
                                  ? <span style={{ color: COR_OK }}>✓ views e seguidores</span>
                                  : <span style={{ color: COR_WARN }}>{x.mede_views ? 'só views' : x.mede_seguidores ? 'só seguidores' : 'sem coleta'}</span>}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </section>
                </>
              )}
            </>
          )}
        </>
      )}
    </div>
  );
}

function Decide({ texto }: { texto: React.ReactNode }) {
  return <p className="border-l-2 border-secondary bg-surface-container px-4 py-2.5 mb-5 text-[13.5px] text-on-surface-variant">{texto}</p>;
}

function MotorVazio({ titulo, motivo }: { titulo: string; motivo: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container px-4 py-3.5 opacity-70">
      <div className="text-sm text-on-surface mb-2">{titulo}</div>
      <div className="text-[12px] text-muted">{motivo}</div>
    </div>
  );
}

function Health({ cor, titulo, sub }: { cor: string; titulo: string; sub: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container px-3.5 py-2.5 flex items-start gap-2.5">
      <span className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ background: cor }} />
      <div className="min-w-0">
        <div className="text-[13px] text-on-surface">{titulo}</div>
        <div className="text-[11.5px]" style={{ color: cor === 'var(--color-action)' ? 'var(--color-muted)' : cor }}>{sub}</div>
      </div>
    </div>
  );
}

/** O AVISO DE QUEM NÃO OBEDECE À BARRA (23/11/2026).
 *
 *  Três abas leem um retrato de AGORA e não têm janela nenhuma para recortar — mas a barra fica no
 *  alto da página dizendo "30d · Mello · Instagram · por publicação", e quem lê acredita. Recortar por
 *  Mello e ver o território inteiro é concluir que o território é da Mello.
 *  O conserto certo seria obedecer; onde não dá (não existe série, não existe rede), a aba **diz**. */
function ForaDaBarra({ children }: { children: React.ReactNode }) {
  return (
    <div className="border-l-2 border-warning/50 bg-warning/5 pl-3 pr-3 py-2 mb-4 text-[11.5px] text-on-surface-variant leading-snug">
      <b className="text-warning font-mono text-[10px] uppercase tracking-widest">a barra não vale aqui</b>
      <span className="ml-2">{children}</span>
    </div>
  );
}

export function Chip({ on, onClick, children, cor }: { on: boolean; onClick: () => void; children: React.ReactNode; cor?: string | null }) {
  return (
    <button onClick={onClick}
      className={'inline-flex items-center gap-1.5 px-2.5 py-1.5 text-[12px] border transition-colors ' +
        (on ? 'border-secondary/60 text-on-surface bg-surface-highest' : 'border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40')}
      style={on && cor ? { borderColor: cor } : undefined}>
      {children}
    </button>
  );
}

function Kpi({ icon, label, value, sub, glow }: { icon: React.ReactNode; label: string; value: string; sub?: string; glow: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] mb-1.5">{icon}{label}</div>
      <div className="text-xl font-semibold font-mono tabular-nums" style={{ color: glow }}>{value}</div>
      {sub && <div className="text-[10px] text-muted mt-0.5">{sub}</div>}
    </div>
  );
}

function RankPanel({ titulo, itens, accent }: { titulo: string; itens: { k: string; n: number; engMed: number; taxa: number | null }[]; accent: string }) {
  const max = Math.max(1, ...itens.map((i) => i.engMed));
  return (
    <div className="border border-outline/15 bg-surface-container px-4 py-3.5">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-2.5">{titulo}</div>
      {itens.length === 0 ? <div className="text-sm text-muted py-4 text-center">sem posts medidos com este dado.</div> : (
        <div className="space-y-2">
          {itens.slice(0, 6).map((i) => (
            <div key={i.k}>
              <div className="flex items-baseline justify-between gap-2 mb-0.5">
                <span className="text-[13px] text-on-surface truncate">{i.k}</span>
                <span className="shrink-0 flex items-baseline gap-2">
                  {i.taxa != null && <span className="font-mono text-[10px] uppercase tracking-widest text-muted">taxa {i.taxa.toFixed(1)}%</span>}
                  <span className="font-mono tabular-nums text-[13px]" style={{ color: accent }}>{Math.round(i.engMed).toLocaleString('pt-BR')}</span>
                  <span className="font-mono text-[10px] text-muted">· {i.n}</span>
                </span>
              </div>
              <div className="h-1.5 bg-surface-highest overflow-hidden">
                <div className="h-full" style={{ width: `${(i.engMed / max) * 100}%`, background: accent }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TrendChart({ series, dias, mode }: { series: Serie[]; dias: string[]; mode: 'line' | 'bar' }) {
  const W = 920, H = 240, padL = 6, padR = 48, padT = 14, padB = 24;
  if (series.length === 0 || dias.length < 2) {
    return <div className="py-16 text-center text-sm text-muted">sem série suficiente no recorte — a curva nasce com os próximos censos diários.</div>;
  }
  const stacked = dias.map((_, i) => series.reduce((s, se) => s + (se.pts[i] || 0), 0));
  const max = Math.max(1, mode === 'bar' ? Math.max(...stacked) : Math.max(...series.flatMap((s) => s.pts)));
  const min = mode === 'line' ? Math.min(...series.flatMap((s) => s.pts)) : 0;
  const span = Math.max(1, max - min);
  const X = (i: number) => padL + (dias.length === 1 ? 0 : (i / (dias.length - 1)) * (W - padL - padR));
  const Y = (v: number) => padT + (1 - (v - min) / span) * (H - padT - padB);
  const grid = [0, 0.25, 0.5, 0.75, 1].map((f) => ({ y: padT + f * (H - padT - padB), v: max - f * span }));
  const labIdx = [...new Set([0, Math.floor((dias.length - 1) / 2), dias.length - 1])];
  const bw = Math.max(2, ((W - padL - padR) / dias.length) * 0.6);
  const nf2 = (n: number) => n.toLocaleString('pt-BR');
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ maxHeight: 260 }}>
      {grid.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={W - padR} y1={g.y} y2={g.y} stroke="currentColor" className="text-outline/20" />
          <text x={W - padR + 5} y={g.y + 3} fill="currentColor" className="text-muted" fontSize="9" fontFamily="ui-monospace,monospace">{nf2(Math.round(g.v))}</text>
        </g>
      ))}
      {labIdx.map((i) => (
        <text key={i} x={X(i)} y={H - 6} fill="currentColor" className="text-muted" fontSize="9" fontFamily="ui-monospace,monospace" textAnchor="middle">{fmtDM(dias[i])}</text>
      ))}
      {mode === 'bar'
        ? dias.map((_, i) => {
            let acc = 0;
            return series.map((se) => {
              const v = se.pts[i] || 0; if (v <= 0) return null;
              const yTop = Y(min + acc + v); const h = (v / span) * (H - padT - padB); acc += v;
              return <rect key={se.id + i} x={X(i) - bw / 2} y={yTop} width={bw} height={Math.max(0, h)} style={{ fill: se.color }} opacity="0.82" />;
            });
          })
        : series.map((se) => {
            const pts = se.pts.map((v, i) => `${X(i)},${Y(v)}`).join(' ');
            const last = se.pts.length - 1;
            return (
              <g key={se.id}>
                <polyline points={pts} fill="none" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ stroke: se.color }} />
                <circle cx={X(last)} cy={Y(se.pts[last])} r="2.6" style={{ fill: se.color }} />
              </g>
            );
          })}
    </svg>
  );
}

function Spark({ serie, color }: { serie: number[]; color: string }) {
  if (serie.length < 2) return <div className="h-8 flex-1 max-w-[110px] bg-surface-highest border border-outline/20 flex items-center justify-center text-[9px] text-muted">dia 1</div>;
  const w = 110, h = 32, min = Math.min(...serie), max = Math.max(...serie), span = Math.max(1, max - min);
  const pts = serie.map((v, i) => `${(i / (serie.length - 1)) * w},${h - 3 - ((v - min) / span) * (h - 8)}`).join(' ');
  return (
    <svg width={w} height={h} className="shrink-0">
      <polyline points={pts} fill="none" strokeWidth="2" strokeLinecap="round" style={{ stroke: color }} />
    </svg>
  );
}

function MotorCard({ titulo, cor, headline, sub, serie, rotuloSerie, plats, blogsDetalhe, sacada, aviso }: {
  titulo: string; cor: string; headline: string; sub: string;
  serie: [string, number][]; rotuloSerie: string;
  plats?: { plat: string; pubs: number; views: number; eng: number; vpp: number }[];
  blogsDetalhe?: { slug: string; leituras: number; sessoes: number }[];
  sacada?: string;
  aviso?: React.ReactNode;
}) {
  const max = Math.max(1, ...serie.map(([, v]) => v));
  return (
    <div className="border border-outline/15 bg-surface-container px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
        <span className="text-sm text-on-surface truncate">{titulo}</span>
      </div>
      <div className="text-2xl font-semibold font-mono tabular-nums" style={{ color: cor }}>{headline}</div>
      <div className="text-[10px] text-muted mt-0.5 mb-2">{sub}</div>
      {serie.length >= 2 ? (
        <div className="flex items-end gap-[2px] h-12">
          {serie.slice(-45).map(([dia, v]) => (
            <div key={dia} title={`${fmtDM(dia)}: ${v.toLocaleString('pt-BR')}`} className="flex-1 min-h-[2px]"
              style={{ height: `${Math.max(3, (v / max) * 100)}%`, background: cor, opacity: v === 0 ? 0.15 : 0.85 }} />
          ))}
        </div>
      ) : (
        <div className="h-12 flex items-center justify-center text-[10px] text-muted border border-outline/15">série curta — cresce com os dias</div>
      )}
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-1">{rotuloSerie}</div>
      {plats && plats.length > 0 && (
        <table className="w-full mt-2.5 text-[11px]">
          <thead>
            <tr className="text-muted border-b border-outline/15 font-mono text-[9px] uppercase tracking-wider">
              <th className="text-left font-normal py-1">plataforma</th>
              <th className="text-right font-normal py-1">pubs</th>
              <th className="text-right font-normal py-1">views</th>
              <th className="text-right font-normal py-1">views/pub</th>
              <th className="text-right font-normal py-1">interações</th>
            </tr>
          </thead>
          <tbody>
            {plats.map((r) => (
              <tr key={r.plat} className="border-b border-outline/10 last:border-0">
                <td className="py-1 text-on-surface">{platName(r.plat)}</td>
                <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{r.pubs}</td>
                <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{r.views.toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right font-mono tabular-nums" style={{ color: cor }}>{Math.round(r.vpp).toLocaleString('pt-BR')}</td>
                <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{r.eng.toLocaleString('pt-BR')}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {blogsDetalhe && blogsDetalhe.length > 0 && (
        <table className="w-full mt-2.5 text-[11px]">
          <thead>
            <tr className="text-muted border-b border-outline/15 font-mono text-[9px] uppercase tracking-wider">
              <th className="text-left font-normal py-1">blog</th>
              <th className="text-right font-normal py-1">leituras</th>
              <th className="text-right font-normal py-1">sessões</th>
            </tr>
          </thead>
          <tbody>
            {blogsDetalhe.map((r) => (
              <tr key={r.slug} className="border-b border-outline/10 last:border-0">
                <td className="py-1 text-on-surface">{r.slug}</td>
                <td className="py-1 text-right font-mono tabular-nums" style={{ color: cor }}>{r.leituras}</td>
                <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{r.sessoes}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {sacada && (
        <div className="mt-2 text-[11px] flex items-center gap-1.5" style={{ color: cor }}>
          <span>▲</span><span className="text-on-surface-variant">{sacada}</span>
        </div>
      )}
      {aviso && (
        <div className="mt-2 pt-2 border-t border-outline/10 text-[11px] text-muted leading-snug">{aviso}</div>
      )}
    </div>
  );
}

// Um cartão por marca. Regra da tela: todo campo que a view pode mandar nulo vira PALAVRA, nunca zero —
// "sem comparação ainda" é diferente de "o alcance caiu para zero", e marca em primeira medição não pode
// parecer marca em queda. Nada aqui calcula: o que não vier da view, a tela não inventa.
function CardNivel({ r }: { r: Nivel }) {
  const subiu = r.subiu_ou_desceu === 'subiu';
  const desceu = r.subiu_ou_desceu === 'desceu';
  const Seta = subiu ? ArrowUp : desceu ? ArrowDown : Minus;
  const corMov = subiu ? 'text-success' : desceu ? 'text-danger' : 'text-muted';
  const emQueda = (r.semanas_em_queda ?? 0) > 0;

  const dias = r.nivel_desde
    ? Math.floor((Date.now() - new Date(r.nivel_desde + 'T12:00:00').getTime()) / 864e5)
    : null;

  // Reels: a Lancaster tem base fora do MKT, então o total vem nulo. Mostrar "2" sozinho faria parecer
  // que ela publica 2 por semana, quando são 2 ALÉM do que a loja já faz.
  const reels = r.reels_semana != null
    ? `${r.reels_semana}/sem`
    : r.reels_semana_extra != null
      ? `+${r.reels_semana_extra}/sem (base fora do MKT)`
      : 'sem dado';

  return (
    <div className="border border-outline/15 bg-surface-container p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="font-serif text-lg font-semibold text-on-surface truncate">{r.marca_nome}</div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted">
            {r.seguidores_ig.toLocaleString('pt-BR')} seguidores no IG
          </div>
        </div>
        <div className="text-right shrink-0">
          <div className="font-serif text-2xl font-semibold tabular-nums text-on-surface">
            {r.nivel}<span className="text-sm text-muted">/{r.nivel_max}</span>
          </div>
          <div className={`flex items-center justify-end gap-0.5 font-mono text-[9px] uppercase tracking-wider ${corMov}`}>
            <Seta className="w-2.5 h-2.5" />{r.subiu_ou_desceu ?? 'sem histórico'}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-1 mt-3">
        {Array.from({ length: r.nivel_max }, (_, i) => (
          <span key={i} className="h-1.5 flex-1"
            style={{ background: i < r.nivel ? COR_SEC : 'var(--color-outline)', opacity: i < r.nivel ? 1 : 0.25 }} />
        ))}
      </div>
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-1">
        {dias != null ? (dias === 0 ? 'neste nível desde hoje' : `neste nível há ${dias} dia${dias === 1 ? '' : 's'}`) : 'sem data de nível'}
      </div>

      <div className="grid grid-cols-2 gap-2 mt-3 pt-3 border-t border-outline/10">
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted">O nível dá</div>
          <div className="text-[13px] text-on-surface">
            {r.stories_dia != null ? `${r.stories_dia} ${r.stories_dia === 1 ? 'story' : 'stories'}/dia` : 'stories: sem dado'}
          </div>
          <div className="text-[13px] text-on-surface-variant">Reels {reels}</div>
        </div>
        <div>
          <div className="font-mono text-[9px] uppercase tracking-widest text-muted">Alcance mediano (2 sem)</div>
          <div className="text-[13px] text-on-surface tabular-nums">
            {r.alcance_mediano_2sem ?? '—'}
            {r.alcance_mediano_2sem_anterior != null && (
              <span className={`ml-1 font-mono text-[10px] ${(r.alcance_mediano_2sem ?? 0) < r.alcance_mediano_2sem_anterior ? 'text-danger' : 'text-success'}`}>
                vs {r.alcance_mediano_2sem_anterior}
              </span>
            )}
          </div>
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted">
            {r.alcance_mediano_2sem_anterior == null ? 'sem comparação ainda' : emQueda ? `${r.semanas_em_queda} sem. em queda` : 'sem queda'}
          </div>
        </div>
      </div>

      {r.proximo_nivel != null && r.faltam_seguidores != null && (
        <div className="mt-3 pt-3 border-t border-outline/10 text-[12px] text-on-surface-variant">
          Faltam <b className="text-on-surface tabular-nums">{r.faltam_seguidores.toLocaleString('pt-BR')}</b> seguidores
          para o nível {r.proximo_nivel}.
        </div>
      )}
      {emQueda && (
        <div className="mt-2 text-[12px] text-warning">
          Cai de nível se o alcance recuar mais {2 - (r.semanas_em_queda ?? 0)} semana(s) seguida(s).
        </div>
      )}
      {r.limitado_por && (
        <div className="mt-2 text-[11px] text-muted leading-snug"><b>Travado por:</b> {r.limitado_por}</div>
      )}
      {r.motivo && <div className="mt-1 text-[11px] text-muted leading-snug">{r.motivo}</div>}
      {r.medido_em && (
        <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-2">
          medido em {new Date(r.medido_em).toLocaleDateString('pt-BR')}
        </div>
      )}
    </div>
  );
}
