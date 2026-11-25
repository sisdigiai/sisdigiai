import { useEffect, useMemo, useRef, useState } from 'react';
import { ExternalLink, RefreshCw, Info, Send, Target, CalendarClock } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { TravasBanner } from './TravasMarketing';
import ResultadoConteudoCard from './marketing/ResultadoConteudoCard';
import LeiturasCard from './marketing/LeiturasCard';
import Central, { PERIODOS, type Periodo } from './marketing/Central';
import HojeSai from './marketing/HojeSai';
import EstoquePorMarca from './marketing/EstoquePorMarca';
import Leituras from './marketing/Leituras';
import ControlePorMarca from './marketing/ControlePorMarca';
import MotoresDeConteudo from './marketing/MotoresDeConteudo';
import OQueFunciona from './marketing/OQueFunciona';
import ResultadoDeNegocio from './marketing/ResultadoDeNegocio';
import PlacarDeDecisao from './marketing/PlacarDeDecisao';
import CentralDeFontes from './marketing/CentralDeFontes';
import DesempenhoPorMarca from './marketing/DesempenhoPorMarca';
import RankingDePecas from './marketing/RankingDePecas';
import FatosPublicaveis, { type FatoMkt, type MedicaoFato } from './marketing/FatosPublicaveis';
import MktCrescimento, {
  Chip, RANGES, REDES, origemDaMarca, rotuloOrigem,
  type AbaRadar, type FiltrosMkt, type OrigemK,
} from './MktCrescimento';
import { espelhoMotores as motores } from '../lib/espelhoMotores';
import { supabase } from '../lib/supabase';
import { hojeBrasilia } from '../lib/datas';
import { useLeitura, horaCurta } from '../lib/useLeitura';
import { recorteDe } from '../lib/recorte';
import { espelhoMotores, resumoPola, type EspelhoLimelight, type EspelhoPulso, type EspelhoBlogs } from '../lib/espelhoMotores';

// Cadeia de resultados (v_marketing_cadeia + espelhos + uso vivo Clearix).
// Decisão do dono 2026-08-25: tudo que fazemos tem que aparecer LIGADO — produzir →
// alcançar → captar → prospectar → vender → provar. Elo sem data fresca é elo quebrado.
type Cadeia = {
  posts_7d: number; ultima_publicacao: string | null;
  seguidores: number; ultimo_censo: string | null;
  leads_30d: number; ultimo_lead: string | null;
  disparos_30d: number; ultimo_disparo: string | null;
  vendas_30d: number; receita_30d_brl: number; ultima_venda: string | null;
};


// Espelho READ-ONLY do DIGIAI MKT (decisão do dono, 2026-07-12): a produção de
// conteúdo (ideias → roteiro → arte → agenda → publicação) mora no app MKT
// (mkt.digiai.app.br, schema mkt). O digiai é o cérebro: vê, não opera.

type Espelho = {
  ideias: number; roteiros: number; assets: number; publicacoes: number;
  publicadas_7d: number; ultima_publicacao: string | null; marcas: number;
  custo_ia_usd_mes: number | null; fila_aberta: number;
};

type Marca = {
  id: string; code: string; name: string; accent_hex: string | null; logo_url: string | null;
  cadencia: { canais?: string[]; horario?: string; qtd_por_dia?: number; dias_semana?: number[] } | null;
  norte: { objetivo?: string; cta_principal?: string; pilares?: string[] } | null;
  regras_atualizadas: string | null;
  ideias: number; roteiros: number; assets: number; assets_aprovados: number;
  publicacoes: number; publicadas_7d: number; ultima_publicacao: string | null;
  plataformas: string[] | null;
};

type Publicacao = {
  id: string; platform: string | null; url: string | null;
  published_at: string | null; brand_name: string | null; accent_hex: string | null;
};

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Nulo vira travessao, nao "R$ 0,00" — ausencia de dado e diferente de zero. */
function brl(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function relativo(iso: string | null): string {
  if (!iso) return 'nunca';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'agora há pouco';
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

// UMA PÁGINA SÓ (21/11/2026, ordem do dono: "eu montaria uma página só, que nos traz nas abas todas
// as informações"). O Espelho do MKT e o Radar 360 viraram esta página. Não foi só juntar: o motivo
// de verdade era que **cada tela tinha a sua barra de filtro e a sua régua de data**, e foi daí que
// nasceu o 168k × 41,8k "na mesma janela" de 20/11. Uma barra, uma régua, um rótulo.
//
// Duas fileiras de aba, porque são duas perguntas diferentes:
//   · DECIDIR  — o que fazer hoje, e se está dando resultado;
//   · CONFERIR — de onde o número veio, e se dá para confiar nele.
//
// E a leitura carrega POR ABA: ver `GRUPOS_DA_ABA` abaixo e o mesmo desenho dentro do Radar.
const DECIDIR = [
  ['hoje', 'Hoje'], ['resultado', 'Resultado'], ['funciona', 'O que funciona'],
  ['folego', 'Fôlego'], ['publicacoes', 'Publicações'],
] as const;
const CONFERIR = [
  ['marca-rede', 'Marca × rede'], ['leitura', 'Leitura das peças'], ['motores', 'Vídeo & motores'],
  ['regua', 'Régua'], ['territorio', 'Território'], ['saude', 'Saúde'],
] as const;
export type AbaMkt = typeof DECIDIR[number][0] | typeof CONFERIR[number][0];
const TODAS_ABAS: AbaMkt[] = [...DECIDIR.map((x) => x[0]), ...CONFERIR.map((x) => x[0])];

// Qual aba do Radar cada aba da página desenha. O que não está aqui é desenhado pelos cartões do
// Espelho, que leem sozinhos.
const RADAR_DA_ABA: Partial<Record<AbaMkt, AbaRadar>> = {
  hoje: 'visao', funciona: 'conteudo', 'marca-rede': 'audiencia',
  motores: 'video', regua: 'regua', territorio: 'territorio', saude: 'saude',
};

export default function MarketingEspelho({ abaInicial = 'hoje' }: { abaInicial?: AbaMkt } = {}) {
  const [esp, setEsp] = useState<Espelho | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [pubs, setPubs] = useState<Publicacao[]>([]);
  const [limelight, setLimelight] = useState<EspelhoLimelight | null>(null);
  const [pulso, setPulso] = useState<EspelhoPulso | null>(null);
  const [blogs, setBlogs] = useState<EspelhoBlogs | null>(null);
  const [fatos, setFatos] = useState<FatoMkt[]>([]);
  const [medicoes, setMedicoes] = useState<MedicaoFato[]>([]);
  const [cadeia, setCadeia] = useState<Cadeia | null>(null);
  const [fila, setFila] = useState<{ atrasados: number; com_erro: number; ultima_publicacao: string | null } | null>(null);
  // O que a Lousa e os espelhos sabem de cada marca. A aba Marcas lê só o MKT, e por isso dizia do
  // Pulso "sem post 7d · nunca" — ele tem 42 em 7 dias e 97 na fila, só não passa pelo MKT. Marca que
  // publica noutro motor não é marca parada, e a tela dizia o contrário da aba ao lado.
  const [estoque, setEstoque] = useState<Array<{
    marca: string; publicadas_7d: number; na_fila: number; artes_prontas: number;
    ultima_marcada: string | null; tem_movimento: boolean;
  }> | null>(null);
  const [pola, setPola] = useState<Awaited<ReturnType<typeof resumoPola>> | null>(null);
  const [seo, setSeo] = useState<{ cliques: number; impressoes: number; sites: number; medido_em: string | null } | null>(null);

  // Página longa esconde o que importa: o dono rolava seis seções para chegar à cadeia de resultados.
  // Cada aba responde UMA pergunta; a primeira é sempre "está dando resultado?".
  // Oito abas desde 19/11, por ordem do dono: "a parte de resultado tem que trazer todas as
  // informações... se quiser dividir em mais abas, fique à vontade". Nada saiu da página; o que estava
  // empilhado em nove faixas numa aba só virou três abas, cada uma com UMA pergunta:
  //   Resultado → está dando resultado?   Audiência → quantos leram, e quanto disso medimos?
  //   Dia → sai hoje, e dá para continuar saindo?
  const [aba, setAba] = useState<AbaMkt>(abaInicial);
  // O RECORTE DA PÁGINA INTEIRA — uma barra só para as onze abas.
  //
  // `data` é a linha que faltava: uma peça publicada em julho e lida ontem entra numa régua e não na
  // outra. Antes o Espelho recortava por LEITURA e o Radar por PUBLICAÇÃO, cada um com o mesmo
  // rótulo "no período" — e os dois números discordavam sem que a tela dissesse por quê.
  const [fDias, setFDias] = useState(30);
  const [fDe, setFDe] = useState('');
  const [fAte, setFAte] = useState('');
  const [fOrigem, setFOrigem] = useState<OrigemK>('');
  const [fRede, setFRede] = useState('');
  const [fMarca, setFMarca] = useState('');
  const [fData, setFData] = useState<'publicacao' | 'leitura'>('publicacao');
  // O intervalo de datas só aparece quando pedido: dois campos de data vazios na barra convidavam
  // a preencher e não diziam para quê. As janelas prontas resolvem o caso de todo dia.
  const [intervaloAberto, setIntervaloAberto] = useState(false);
  const filtros: FiltrosMkt = { dias: fDias, de: fDe, ate: fAte, origem: fOrigem, rede: fRede, marca: fMarca, data: fData };

  // As marcas que entram nos chips: as da casa vêm do MKT; as do Pulso, do espelho dele (são três
  // canais, não uma marca só). 13 linhas, leitura barata, uma vez.
  const [marcasChip, setMarcasChip] = useState<Array<{ code: string; nome: string; cor: string | null; origem: OrigemK }>>([]);
  useEffect(() => {
    let vivo = true;
    (async () => {
      const [{ data: bs }, contasPulso] = await Promise.all([
        supabase.schema('mkt').from('brands').select('code, name, accent_hex').order('name'),
        motores.pulsoContas(),
      ]);
      if (!vivo) return;
      const daCasa = ((bs ?? []) as Array<{ code: string; name: string; accent_hex: string | null }>)
        .filter((b) => b.code !== 'pulso')
        .map((b) => ({ code: b.code, nome: b.name, cor: b.accent_hex, origem: origemDaMarca(b.code) }));
      const doPulso = [...new Set(contasPulso.map((x) => x.marca))].sort()
        .map((m) => ({ code: m, nome: m, cor: null, origem: 'pulso' as OrigemK }));
      setMarcasChip([...daCasa, ...doPulso]);
    })();
    return () => { vivo = false; };
  }, []);

  const trocarOrigem = (k: OrigemK) => { setFOrigem(k); setFMarca(''); };
  // Dentro do grupo do Pulso os canais ficavam "Bastidores" e "Cortes" -- e "Cortes" e tambem o nome
  // de um GRUPO (os canais da casa). Dois chips com o mesmo nome na mesma linha e trocar uma confusao
  // por outra, entao o canal do Pulso leva o sobrenome.
  const rotuloCanal = (nome: string) => nome
    .replace(/^Bastidores PULSO Histórias$/, 'bastidores do Pulso')
    .replace(/^Cortes PULSO Histórias$/, 'cortes do Pulso')
    .replace(/^PULSO Histórias$/, 'canal principal');
  const cls = 'font-mono text-[10px] uppercase tracking-widest text-muted';
  const custom = fDe !== '' && fAte !== '' && fDe <= fAte;

  // A BARRA FECHA QUANDO NÃO ESTÁ EM USO (23/11/2026). Medido no ar: do topo até o primeiro número
  // grande eram **807 px** — numa janela de 889 px, o número ficava raspando a borda, e num notebook
  // comum ficava abaixo da dobra. Só a barra custava 289 px, com 48 botões na primeira tela.
  //
  // Nada some: fechada, ela DIZ o recorte inteiro numa frase, e "ajustar" abre a caixa como estava.
  // A regra que eu não quebro aqui é a mesma do resto da página — o que está valendo fica escrito.
  const [filtroAberto, setFiltroAberto] = useState(false);
  const nomeDaMarca = fMarca ? (marcasChip.find((m) => m.code === fMarca)?.nome ?? fMarca) : '';
  const frase = [
    custom ? `${fDe} → ${fAte}` : (RANGES.find((r) => r.k === fDias)?.label ?? `${fDias}d`),
    nomeDaMarca || (fOrigem ? rotuloOrigem(fOrigem) : 'tudo'),
    fRede ? (REDES.find((r) => r.k === fRede)?.label ?? fRede) : 'todas as redes',
    fData === 'publicacao' ? 'por publicação' : 'por leitura',
  ].join(' · ');
  // As abas do Espelho leem em janelas de 7, 30 ou tudo — é o que as views delas aceitam. A barra
  // oferece mais; quando não dá para obedecer exatamente, a aba DIZ em que janela leu.
  const periodoEspelho: Periodo = fDias === 0 ? 'tudo' : fDias <= 7 ? '7' : '30';
  const periodoExato = fDias === 0 || fDias === 7 || fDias === 30;

  // O RECORTE INTEIRO, RESOLVIDO UMA VEZ (25/11/2026, pedido do dono no canal do MKT: "falta ligação
  // em tudo"). Até hoje a barra montava sete filtros e os cartões do Espelho recebiam UM —
  // `periodoEspelho`, que reduz qualquer escolha a 7, 30 ou tudo. Marca, rede, grupo e intervalo
  // livre morriam na barra. O Radar já recebia `filtros` inteiro; eram duas metades da mesma página
  // obedecendo a réguas diferentes, com a mesma barra acesa em cima das duas.
  //
  // `recorteDe` também é onde o grupo vira lista de marcas — ver o porquê em lib/recorte.ts: a coluna
  // `origem` das views diz quem MEDIU a peça, não de quem é o canal, e ligar o filtro nela daria
  // número certo para a pergunta errada.
  const recorte = useMemo(() => recorteDe(filtros, marcasChip), [
    fDias, fDe, fAte, fOrigem, fRede, fMarca, fData, marcasChip,
  ]); // eslint-disable-line react-hooks/exhaustive-deps

  // O ENDEREÇO GUARDA A ABA E O PERÍODO — o dono manda o link de uma leitura, e o botão voltar
  // funciona. Vai nos trechos do hash (`#/marketing/saude/30`) e não como `?p=30`: o roteador do app
  // escolhe o módulo pelo primeiro trecho, então uma interrogação cairia em Visão sem dizer nada.
  // Links antigos (`#/marketing/7`) continuam valendo: o trecho que for número é lido como período.
  const escreverHash = (a: AbaMkt, dias: number) => {
    if (typeof window !== 'undefined') window.location.hash = `#/marketing/${a}/${dias}`;
  };
  const trocarAba = (a: AbaMkt) => { setAba(a); escreverHash(a, fDias); };
  const trocarPeriodo = (dias: number) => { setFDias(dias); setFDe(''); setFAte(''); escreverHash(aba, dias); };

  useEffect(() => {
    const ler = () => {
      const partes = window.location.hash.replace(/^#\/?/, '').split('/');
      for (const t of partes.slice(1)) {
        if (TODAS_ABAS.includes(t as AbaMkt)) setAba(t as AbaMkt);
        else if (/^\d+$/.test(t)) setFDias(Number(t));
        else if (t === 'tudo') setFDias(0);
      }
    };
    ler();
    window.addEventListener('hashchange', ler);
    return () => window.removeEventListener('hashchange', ler);
  }, []);

  // ---- CADA ABA LÊ O QUE ELA MOSTRA, E SÓ NA PRIMEIRA VEZ (21/11/2026) ----
  //
  // Antes esta página lia as ONZE fontes de uma vez ao abrir, e as abas filhas liam as delas por
  // cima: medido no ar em 21/11, **23 leituras disparadas juntas e 24,6 s até a última chegar**. E
  // não era o banco: `v_mkt_fila_saude` roda em **3,8 ms** no servidor e levava **9,8 s** para
  // aparecer, `v_pontualidade` 11 ms contra 11,9 s. Pedido demais ao mesmo tempo não fica mais
  // rápido — fica na fila, e o banco atende em série.
  //
  // Dez das onze serviam abas que nem estavam abertas (marcas, publicações, motores, fatos, fontes).
  // Agora cada grupo carrega quando a aba dele aparece, uma vez só; `carregadas` guarda o que já veio
  // para a aba revisitada não pagar de novo. Recarregar pela setinha limpa tudo e refaz o da aba atual.
  const carregadas = useRef(new Set<string>());
  const [carregando, setCarregando] = useState(false);
  // A SETINHA TEM QUE RECARREGAR A ABA INTEIRA, FILHAS INCLUÍDAS (24/11/2026).
  //
  // Medido no ar pelo Orquestrador em 24/11: clicar em Recarregar na aba Hoje não disparava NENHUM
  // pedido ao banco. `load` só refazia os grupos desta página, e `GRUPOS_DA_ABA` é vazio em seis das
  // onze abas — Hoje, a que abre por padrão, entre elas: quem lê nessas abas são os blocos filhos,
  // que leem sozinhos e não ouviam o botão. `recarga` é o sinal que eles ouvem.
  const [recarga, setRecarga] = useState(0);
  const leitura = useLeitura();

  const GRUPOS: Record<string, () => Promise<void>> = {
    async base() {
      const { data } = await supabase.from('v_mkt_espelho').select('*').maybeSingle();
      if (data) setEsp(data as Espelho);
    },
    async marcas() {
      const [{ data: m }, est] = await Promise.all([
        supabase.from('v_mkt_marcas').select('*'),
        supabase.from('v_mkt_estoque_marca').select('marca, publicadas_7d, na_fila, artes_prontas, ultima_marcada, tem_movimento'),
      ]);
      setMarcas(((m ?? []) as Marca[]).sort((a, b) => b.publicadas_7d - a.publicadas_7d || b.publicacoes - a.publicacoes));
      setEstoque((est.data ?? []) as never);
      // A Polá vem do espelho do app dela, não do MKT: leitura própria, e o estado dela é escrito na
      // tela (sem credencial · banco bloqueado · com dado). Nunca zero por não ter conseguido ler.
      setPola(await resumoPola());
    },
    async publicacoes() {
      const { data } = await supabase.from('v_mkt_publicacoes_recentes').select('*');
      setPubs((data ?? []) as Publicacao[]);
    },
    async motores() {
      const [ll, pu, bl] = await Promise.all([
        espelhoMotores.limelight(), espelhoMotores.pulso(), espelhoMotores.blogs(),
      ]);
      setLimelight(ll); setPulso(pu); setBlogs(bl);
    },
    async fatos() {
      // O veredito do dia vem JUNTO. O verificador roda às 4h30 e grava em `ops.fato_medicao` desde
      // sempre; a view `v_ops_fatos_verificados` já existia com o último veredito de cada fato, e
      // **nenhuma tela lia**. Medição que não chega a lugar nenhum é medição que ninguém confere —
      // foi assim que um alarme falso ("a esteira ficou parada") viveu 76 dias sem ser visto.
      const [{ data }, { data: med }] = await Promise.all([
        supabase.from('v_mkt_fatos').select('*'),
        supabase.from('v_ops_fatos_verificados').select('chave, veredito, valor_medido, detalhe, medido_em'),
      ]);
      setFatos((data ?? []) as FatoMkt[]);
      setMedicoes((med ?? []) as MedicaoFato[]);
    },
    async fontes() {
      const [{ data: cad }, { data: fs }, { data: se }] = await Promise.all([
        supabase.from('v_marketing_cadeia').select('*').maybeSingle(),
        supabase.from('v_mkt_fila_saude').select('atrasados, com_erro, ultima_publicacao').maybeSingle(),
        supabase.from('v_seo_estado').select('cliques, impressoes, medido_em'),
      ]);
      setCadeia((cad ?? null) as Cadeia | null);
      setFila((fs ?? null) as { atrasados: number; com_erro: number; ultima_publicacao: string | null } | null);
      const seoRows = (se ?? []) as { cliques: number | null; impressoes: number | null; medido_em: string | null }[];
      setSeo(seoRows.length ? {
        cliques: seoRows.reduce((a, r) => a + (r.cliques ?? 0), 0),
        impressoes: seoRows.reduce((a, r) => a + (r.impressoes ?? 0), 0),
        sites: seoRows.length,
        medido_em: seoRows.reduce<string | null>((a, r) => (a == null || (r.medido_em ?? '') > a ? r.medido_em : a), null),
      } : null);
    },
  };

  // Quem cada aba precisa. Aba que não aparece aqui tem filhas que leem sozinhas.
  const GRUPOS_DA_ABA: Record<AbaMkt, string[]> = {
    hoje: [],
    resultado: ['base'],
    funciona: [],
    folego: ['marcas', 'motores'],
    publicacoes: ['publicacoes', 'fatos'],
    'marca-rede': [],
    leitura: [],
    motores: ['base', 'motores'],
    regua: [],
    territorio: [],
    saude: ['fontes', 'fatos', 'motores'],
  };

  useEffect(() => {
    const faltando = (GRUPOS_DA_ABA[aba] ?? []).filter((g) => !carregadas.current.has(g));
    if (faltando.length === 0) return;
    faltando.forEach((g) => carregadas.current.add(g));
    setCarregando(true);
    Promise.all(faltando.map((g) => GRUPOS[g]()))
      .catch((e) => { faltando.forEach((g) => carregadas.current.delete(g)); console.error('[espelho] falha ao carregar', faltando, e); })
      .finally(() => setCarregando(false));
  }, [aba]); // eslint-disable-line react-hooks/exhaustive-deps

  const load = () => {
    carregadas.current.clear();
    const grupos = GRUPOS_DA_ABA[aba] ?? [];
    grupos.forEach((g) => carregadas.current.add(g));
    setCarregando(true);
    Promise.all(grupos.map((g) => GRUPOS[g]())).finally(() => setCarregando(false));
    setRecarga((n) => n + 1);
  };

  const diasDesde = (d: string | null | undefined) =>
    d ? Math.floor((Date.now() - new Date(d + 'T12:00:00').getTime()) / 86400000) : null;
  const pulsoUltimaPubDias = diasDesde(pulso?.ultima_publicacao);

  // Publicado é o que já saiu. O resto é agenda, e vai dito à parte em vez de sumir.
  const agora = Date.now();
  const pubsPublicadas = pubs.filter((p) => !p.published_at || new Date(p.published_at).getTime() <= agora);
  const pubsAgendadas = pubs
    .filter((p) => p.published_at && new Date(p.published_at).getTime() > agora)
    .sort((a, b) => (a.published_at ?? '').localeCompare(b.published_at ?? ''));

  // Marca que não publica pelo MKT mas tem motor próprio: o número vem do espelho do motor.
  const noMotorProprio = (code: string): number | null =>
    code === 'pulso' ? (pulso?.publicacoes ?? null)
    : code === 'limelight' ? (limelight?.publicacoes ?? null)
    : null;

  return (
    <div>
      <PageHeader
        eyebrow="Distribuição & conteúdo"
        title="Marketing"
        subtitle="Em cima se decide, embaixo se confere de onde o número veio. Leitura apenas — a produção acontece no DIGIAI MKT."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="https://mkt.digiai.app.br"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-sm bg-secondary-container text-on-secondary-container border border-secondary/40 hover:bg-secondary-container/70 transition-colors flex items-center gap-2"
            >
              <ExternalLink size={14} /> Abrir DIGIAI MKT
            </a>
            <span className="font-mono text-[10px] uppercase tracking-widest text-muted">
              {leitura.carregando ? 'lendo…' : `lido ${horaCurta(leitura.ultima)}`}
            </span>
            <button onClick={load} disabled={leitura.carregando}
              className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface disabled:opacity-50"
              title="Recarregar esta aba">
              <RefreshCw size={16} className={leitura.carregando ? 'animate-spin' : undefined} />
            </button>
          </div>
        }
      />

      <div className="space-y-6">
        <TravasBanner compacto />

        {/* DUAS FILEIRAS DE ABA. A de cima decide, a de baixo confere — e quem não sabe qual quer
            começa em Hoje, que é a pergunta de todo dia. */}
        <div className="space-y-1.5">
          {([['decidir', DECIDIR], ['conferir', CONFERIR]] as const).map(([grupo, lista]) => (
            <div key={grupo} className="flex items-center gap-2 flex-wrap">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted w-16 shrink-0">{grupo}</span>
              <div className="flex items-center gap-1 border border-outline/15 w-fit p-0.5 overflow-x-auto">
                {lista.map(([id, rotulo]) => (
                  <button key={id} onClick={() => trocarAba(id)}
                    className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 whitespace-nowrap transition-colors ${
                      aba === id ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}>
                    {rotulo}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* UMA BARRA DE FILTRO PARA AS ONZE ABAS. Cada bloco diz quando não consegue obedecê-la.
            Fechada por padrão desde 23/11 — ver o comentário de `filtroAberto`. */}
        {!filtroAberto ? (
          <button onClick={() => setFiltroAberto(true)}
            className="w-full border border-outline/15 bg-surface-container px-3.5 py-2 flex items-center gap-2 text-left hover:bg-surface-highest/40">
            <span className={cls + ' shrink-0'}>recorte</span>
            <span className="text-[13px] text-on-surface truncate">{frase}</span>
            <span className="ml-auto shrink-0 font-mono text-[10px] uppercase tracking-widest text-secondary">ajustar</span>
          </button>
        ) : (
        <div className="border border-outline/15 bg-surface-container px-3.5 py-3 space-y-2.5">
          <div className="flex items-center gap-2">
            <span className={cls}>recorte</span>
            <span className="text-[12px] text-muted">{frase}</span>
            <button onClick={() => setFiltroAberto(false)}
              className="ml-auto font-mono text-[10px] uppercase tracking-widest text-secondary hover:text-on-surface">fechar</button>
          </div>
          {/* A FORMA DIZ A NATUREZA (23/11/2026). Antes as quatro linhas eram a MESMA coisa na tela:
              48 chips iguais, soltos, em quatro fileiras — e nada na forma dizia que período é
              escolha única, que quem tem família, que rede é um atalho que o olho já conhece, nem que
              a régua da data não recorta nada: ela muda o que todo número da página quer dizer.
              Agora cada linha tem o desenho do que ela faz. Isto não é enfeite — é o que deixa a
              barra ser lida de relance, que era a queixa ("a confusão da página"). */}
          <div className="flex flex-wrap items-center gap-2">
            <span className={cls + ' w-16 shrink-0'}>período</span>
            <Segmento valor={custom ? '' : String(fDias)}
              opcoes={RANGES.map((r) => ({ k: String(r.k), label: r.label }))}
              onPick={(k) => { setIntervaloAberto(false); trocarPeriodo(Number(k)); }} />
            <button
              onClick={() => { if (custom) { setFDe(''); setFAte(''); setIntervaloAberto(false); } else setIntervaloAberto((v) => !v); }}
              title={custom ? 'limpar o intervalo e voltar às janelas' : 'escolher um intervalo de datas'}
              className={'font-mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 border transition-colors ' +
                (custom ? 'border-secondary/60 text-on-surface bg-surface-highest' : 'border-outline/20 text-muted hover:text-on-surface hover:border-outline/40')}>
              {custom ? `${fDe} → ${fAte} ✕` : 'intervalo'}
            </button>
            {(intervaloAberto || custom) && (
              <span className="inline-flex items-center gap-1.5">
                <input type="date" value={fDe} onChange={(e) => setFDe(e.target.value)} aria-label="de"
                  className="bg-surface border border-outline/30 text-on-surface font-mono text-[11px] px-1.5 py-1" />
                <span className="text-muted text-xs">→</span>
                <input type="date" value={fAte} onChange={(e) => setFAte(e.target.value)} aria-label="até"
                  className="bg-surface border border-outline/30 text-on-surface font-mono text-[11px] px-1.5 py-1" />
              </span>
            )}
          </div>
          {/* UMA LINHA SÓ PARA "QUEM" (21/11/2026, no mesmo dia). Eu tinha posto origem numa linha e
              marca em outra, e as duas conversavam: escolher "casa" fazia os canais do Pulso
              DESAPARECEREM da linha de marca. O dono foi procurar o Pulso onde ele sempre esteve e
              não achou — "ficamos com os filtros confusos".
              Separei pela regra, e não por como se procura. Agora tudo fica à vista de uma vez, em
              grupos: o grupo ensina a diferença entre origem e marca em vez de esconder chip. O
              estado por baixo é o mesmo — clicar num canal escolhe a origem dele junto.
              Desde 23/11 cada canal leva o SELO dele: logo onde existe logo de verdade, sigla na cor
              da marca onde não existe. O nome do grupo é texto sublinhado, sem caixa — tem caixa
              quem é canal. A família se lê sem legenda. */}
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
            <span className={cls + ' w-16 shrink-0'}>quem</span>
            <BotaoGrupo on={fOrigem === '' && fMarca === ''} onClick={() => { setFOrigem(''); setFMarca(''); }}>tudo</BotaoGrupo>
            {([
              ['casa', 'casa'],
              ['cortes', 'Cortes'],
              ['pulso', 'Pulso'],
              ['limelight', 'Limelight'],
            ] as const).map(([k, rotulo]) => {
              const doGrupo = marcasChip.filter((m) => m.origem === k);
              return (
                <span key={k} className="inline-flex flex-nowrap items-center gap-1.5 pl-2 border-l border-outline/20">
                  <BotaoGrupo on={fOrigem === k && fMarca === ''} onClick={() => trocarOrigem(fOrigem === k && fMarca === '' ? '' : k)}>
                    {rotulo}{doGrupo.length > 1 ? ` · ${doGrupo.length}` : ''}
                  </BotaoGrupo>
                  {doGrupo.map((m) => (
                    <SeloMarca key={m.code} on={fMarca === m.code} code={m.code} origem={m.origem}
                      nome={rotuloCanal(m.nome)} cor={m.cor}
                      onClick={() => { if (fMarca === m.code) { setFMarca(''); setFOrigem(''); } else { setFMarca(m.code); setFOrigem(k); } }} />
                  ))}
                </span>
              );
            })}
          </div>
          <div className="text-[11px] text-muted">
            <b className="text-on-surface-variant">casa</b> são as contas das marcas da DIGIAI; <b className="text-on-surface-variant">Cortes</b>, os
            canais de Bastidores que o digiai_cortes abastece; <b className="text-on-surface-variant">Pulso</b> e <b className="text-on-surface-variant">Limelight</b> são
            motores com canais próprios. Clicar no nome do grupo pega o grupo inteiro; clicar num canal pega só ele.
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <span className={cls + ' w-16 shrink-0'}>rede</span>
            <BotaoGrupo on={fRede === ''} onClick={() => setFRede('')}>todas</BotaoGrupo>
            {REDES.filter((r) => r.k).map((r) => (
              <SeloRede key={r.k} k={r.k} label={r.label} on={fRede === r.k}
                onClick={() => setFRede(fRede === r.k ? '' : r.k)} />
            ))}
          </div>
          {/* A LINHA QUE FALTAVA, E QUE NÃO É UMA LINHA COMO AS OUTRAS. Em 20/11 o Espelho mostrava
              168k views em 961 peças e o Radar 41,8k em 469 — na MESMA janela, com o mesmo rótulo.
              Não era a janela: um contava por data de LEITURA e o outro por data de PUBLICAÇÃO. As
              duas contas estavam certas e respondiam a perguntas diferentes.
              Por isso ela ganhou MOLDURA PRÓPRIA: período, quem e rede recortam — mostram menos do
              mesmo. Esta troca o significado de cada número da página. Misturada com as outras, ela
              parecia um filtro a mais, e era a mais perigosa das quatro. */}
          <div className="border border-secondary/30 bg-surface-lowest px-3 py-2.5 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className={cls + ' shrink-0 text-on-surface-variant'}>a régua da data</span>
              <Segmento valor={fData}
                opcoes={[{ k: 'publicacao', label: 'por publicação' }, { k: 'leitura', label: 'por leitura' }]}
                onPick={(k) => setFData(k as 'publicacao' | 'leitura')} />
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted">não recorta — muda o que o número quer dizer</span>
            </div>
            <div className="text-[11px] text-muted">
              {fData === 'publicacao'
                ? 'quanto rendeu o que a casa PUBLICOU no período'
                : 'quanto a casa já somou do que foi MEDIDO no período — peça antiga lida ontem entra'}
            </div>
          </div>
          {/* O aviso de 7/30/tudo saiu em 25/11: deixou de ser verdade. Todas as abas passaram a
              ler a janela escolhida, inclusive 60d, 90d, 6m, 12m e o intervalo livre. O que ainda
              não obedece não é a JANELA — é marca ou rede, e quem não obedece diz na própria faixa,
              com o selo "não separa por…". Aviso que descreve uma limitação removida é pior que
              nenhum: manda procurar defeito onde não há. */}
          <div className="text-[11px] text-muted">
            Toda aba lê a janela escolhida. Onde um bloco não puder separar por marca ou por rede,
            ele diz isso na própria faixa — a fonte dele não tem a coluna.
          </div>
        </div>
        )}

        {/* HOJE — "o que está acontecendo, e sai hoje?". O tamanho do alcance no recorte vem do
            Radar; a agenda e a pontualidade do dia, do motor do MKT. */}
        {aba === 'hoje' && (
          <div className="space-y-6">
            <MktCrescimento aba="visao" filtros={filtros} recarga={recarga} />
            <HojeSai recorte={recorte} recarga={recarga} />
          </div>
        )}

        {/* RESULTADO — "está dando resultado?". Quatro números de decisão na primeira linha, depois o
            que o Google registra de gente indo à loja. A cadeia e as leituras ficam abaixo, como
            contexto. "O que funciona" ganhou aba própria. */}
        {aba === 'resultado' && (
          <div className="space-y-6">
            <PlacarDeDecisao pecas7d={esp?.publicadas_7d ?? null} recorte={recorte} recarga={recarga} />
            <ResultadoDeNegocio recorte={recorte} recarga={recarga} />
            <Central recorte={recorte} recarga={recarga} />
            <Leituras recorte={recorte} recarga={recarga} />
          </div>
        )}

        {/* O QUE FUNCIONA — "que formato e que gatilho produzir mais?". O cartão do Espelho responde
            por recorte de negócio; o bloco do Radar, por formato, gatilho e hora do dia. */}
        {aba === 'funciona' && (
          <div className="space-y-6">
            <OQueFunciona recorte={recorte} recarga={recarga} />
            {/* A mediana diz que TIPO de coisa repetir; a lista diz QUAL peça foi o pico. As duas
                perguntas se fazem no mesmo minuto, olhando o mesmo gráfico. */}
            <RankingDePecas recorte={recorte} recarga={recarga} />
            <ResultadoConteudoCard recorte={recorte} recarga={recarga} />
            <MktCrescimento aba="conteudo" filtros={filtros} recarga={recarga} />
          </div>
        )}

        {/* FÔLEGO — "até quando ainda sai conteúdo se ninguém fizer nada?". */}
        {aba === 'folego' && <EstoquePorMarca recorte={recorte} recarga={recarga} />}

        {/* LEITURA DAS PEÇAS — "quantos leram, e quanto disso a casa mede?". */}
        {aba === 'leitura' && (
          <div className="space-y-6">
            <LeiturasCard recorte={recorte} recarga={recarga} />
          </div>
        )}

        {/* MARCA × REDE, RÉGUA e TERRITÓRIO: o detalhe, direto do Radar. */}
        {/* MARCA × REDE — duas perguntas, nesta ordem (25/11/2026, pedido do dono).
            "O que rendeu" vem primeiro porque é o que ele foi procurar e não achou: a aba mede
            SEGUIDORES, que é estoque — o censo de hoje é o mesmo em "hoje" e em "6m", e por isso o
            número grande não mudava com a janela. Não era filtro quebrado; era outra pergunta. */}
        {aba === 'marca-rede' && (
          <div className="space-y-6">
            <DesempenhoPorMarca recorte={recorte} recarga={recarga} />
            <MktCrescimento aba="audiencia" filtros={filtros} recarga={recarga} />
          </div>
        )}
        {aba === 'regua' && <MktCrescimento aba="regua" filtros={filtros} recarga={recarga} />}
        {aba === 'territorio' && <MktCrescimento aba="territorio" filtros={filtros} recarga={recarga} />}

        {carregando && <div className="text-sm text-muted py-2">Carregando…</div>}
        {(
          <>
            {/* A CADEIA ANTIGA SAIU DAQUI. Ela lia janelas fixas (7 e 30 dias) e ficava na mesma
                página que a cadeia nova, com o filtro de período em cima: 453 contra 150 e 426 contra
                452, dois números para a mesma coisa na mesma tela. Dois números iguais em nome e
                diferentes em valor não informam — fazem desconfiar dos dois. O bloco "Estamos indo
                bem?" responde isto, obedecendo ao filtro. (Achado pelo Orquestrador em 18/11, 14h29.) */}

            {/* O "Motor no ar" SAIU DAQUI em 19/11 e não se perdeu: ideias, roteiros, artes, publicações,
                7 dias, custo de IA, fila e última publicação já estavam, um por um, no cartão do DIGIAI
                MKT na aba Motores. Eram duas faixas com os mesmos seis números em duas abas da mesma
                tela — a mesma queixa que o dono fez em 18/11 sobre a tabela de motores duplicada. */}

            {/* Cards por marca */}
            {aba === 'folego' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Marcas operadas ({marcas.length})</span>
                <span className="h-px flex-1 bg-outline/15" />
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                {marcas.map((m) => {
                  const cor = m.accent_hex || 'var(--color-secondary)';
                  const cad = m.cadencia;
                  const diasStr = cad?.dias_semana?.length
                    ? (cad.dias_semana.length >= 6 ? 'seg–sáb' : cad.dias_semana.map((d) => DIAS[d] ?? d).join('/'))
                    : null;
                  const fora = (estoque ?? []).find((e) => e.marca === m.code);
                  // 7 dias da casa inteira: o que o MKT publicou e o que a Lousa viu de outros motores.
                  const sete = Math.max(m.publicadas_7d, fora?.publicadas_7d ?? 0);
                  const ativa7d = sete > 0;
                  const semNada = fora ? !fora.tem_movimento : false;
                  const ehPola = m.code === 'polapetit';
                  return (
                    <div key={m.id} className="relative border border-outline/15 bg-surface-container p-5 pt-6">
                      {/* brackets — gramática Geometric Precision */}
                      <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: cor }} />
                      <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-outline/40" />

                      {/* identidade */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 flex items-center justify-center overflow-hidden shrink-0 font-mono font-bold text-sm" style={{ background: `color-mix(in srgb, ${cor} 18%, transparent)`, color: cor }}>
                          {m.logo_url
                            ? <img src={m.logo_url} alt="" className="w-12 h-12 object-cover" />
                            : m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-lg font-semibold text-on-surface leading-tight truncate">{m.name}</div>
                          {m.norte?.objetivo && <div className="text-[11px] text-muted leading-snug line-clamp-2 mt-0.5">{m.norte.objetivo}</div>}
                        </div>
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0 ${ativa7d ? 'text-success border-success/40 bg-success/10' : 'text-muted border-outline/20'}`}>
                          {ativa7d ? `${sete} em 7d`
                            : ehPola ? (pola?.estado === 'ok' ? `${pola.dias} dias medidos` : 'fonte própria')
                            : semNada ? 'ainda não publica' : 'sem post 7d'}
                        </span>
                      </div>

                      {/* pipeline da marca */}
                      <div className="mt-4 grid grid-cols-4 divide-x divide-outline/10 border border-outline/10 bg-surface-lowest">
                        {[
                          { label: 'ideias', v: m.ideias },
                          { label: 'roteiros', v: m.roteiros },
                          { label: 'artes', v: m.assets },
                          { label: 'no ar', v: m.publicacoes > 0 ? m.publicacoes : (fora?.na_fila ? `${fora.na_fila} na fila` : m.publicacoes) },
                        ].map((k) => (
                          <div key={k.label} className="py-2 text-center">
                            <div className="font-serif text-base font-semibold tabular-nums text-on-surface">{k.v}</div>
                            <div className="font-mono text-[8px] uppercase tracking-widest text-muted">{k.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* cadência + norte */}
                      <div className="mt-3 space-y-1.5">
                        {cad && (
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-on-surface-variant">
                            <CalendarClock className="w-3 h-3 text-muted shrink-0" />
                            {cad.qtd_por_dia ?? '—'}/dia · {cad.horario ?? '—'}{diasStr ? ` · ${diasStr}` : ''}
                          </div>
                        )}
                        {m.norte?.cta_principal && (
                          <div className="flex items-start gap-1.5 text-[10px] text-muted">
                            <Target className="w-3 h-3 shrink-0 mt-px" />
                            <span className="truncate">{m.norte.cta_principal}</span>
                          </div>
                        )}
                      </div>

                      {/* plataformas + última publicação */}
                      <div className="mt-3 pt-3 border-t border-outline/10 flex items-center gap-1.5 flex-wrap">
                        {(m.plataformas ?? []).map((p) => (
                          <span key={p} className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-surface-high text-on-surface-variant">{p}</span>
                        ))}
                        {/* "nenhuma publicação ainda" só vale se a marca não publica em lugar nenhum. O Pulso
                            publica no motor dele (1.288 publicações na aba Motores), e o cartão dizia o contrário
                            da outra aba da mesma tela — erro 7, Geral 18/11. */}
                        {(m.plataformas ?? []).length === 0 && (
                          noMotorProprio(m.code) != null
                            ? <span className="font-mono text-[9px] text-on-surface-variant">{noMotorProprio(m.code)!.toLocaleString('pt-BR')} no motor próprio · nada pelo MKT</span>
                            : <span className="font-mono text-[9px] text-muted">nenhuma publicação ainda</span>
                        )}
                        <span className="ml-auto font-mono text-[9px] text-muted">
                          {m.ultima_publicacao ? relativo(m.ultima_publicacao)
                            : ehPola ? (pola?.frase ?? 'lendo o espelho da Polá…')
                            : semNada ? 'nenhum dado chega'
                            : fora && fora.publicadas_7d > 0 ? `${fora.publicadas_7d} em 7d fora do MKT`
                            : 'nunca'}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
            )}

            {/* Publicações recentes */}
            {/* O controle por marca vem ANTES da lista: a lista diz o que saiu, o cartão diz o que
                fazer. O dono abre esta aba para decidir, não para conferir item a item. */}
            {aba === 'publicacoes' && <ControlePorMarca recorte={recorte} recarga={recarga} />}

            {aba === 'publicacoes' && (
            <div className="border border-outline/15 bg-surface-container mt-6">
              <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-secondary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Publicações recentes</span>
                <span className="ml-auto font-mono text-[10px] text-muted">fonte: v_mkt_publicacoes_recentes</span>
              </div>
              {/* AGENDADO NÃO É PUBLICADO. `mkt.publications` guarda os agendados do Facebook com
                  `published_at` no futuro — 61 linhas em 18/11, até 12/12 —, e esta lista mostrava
                  "recentes" com data de 27/11 a 11/12. Aqui as linhas vêm uma a uma, então eu filtro;
                  os agregados da tela (posts 7d, última publicação) são somados dentro das views do
                  MKT e só lá podem ser consertados. */}
              {pubsAgendadas.length > 0 && (
                <div className="px-4 py-2 border-b border-outline/10 font-mono text-[10px] text-warning">
                  {pubsAgendadas.length} agendada(s) fora desta lista — ainda não saíram
                  {pubsAgendadas[0]?.published_at && ` (a mais distante em ${new Date(pubsAgendadas[pubsAgendadas.length - 1].published_at!).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })})`}
                </div>
              )}
              {pubsPublicadas.length === 0 ? (
                /* "Nenhuma registrada" seria mentira: há mais de mil publicadas. O que acontece é que a
                   view tem `limit 20` DENTRO, ordenada por data, então as 20 que chegam aqui são todas
                   agendadas e nenhuma publicada alcança o app. Dizer o motivo é a diferença entre "não
                   há" e "não chega". */
                <div className="p-4 text-sm text-on-surface-variant">
                  {pubsAgendadas.length > 0
                    ? <>A fonte entrega as <strong>20 mais recentes por data</strong> e, hoje, as 20 são agendadas — nenhuma publicada chega até aqui. <span className="text-muted">Não é falta de publicação: é a view <code className="font-mono text-[11px]">v_mkt_publicacoes_recentes</code> cortando antes de separar agendado de publicado. Pedido ao MKT em 18/11.</span></>
                    : 'Nenhuma publicação registrada ainda.'}
                </div>
              ) : (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline/10">
                  {pubsPublicadas.map((p) => (
                    <div key={p.id} className="bg-surface-container flex items-center gap-3 px-4 py-2">
                      <span className="w-2.5 h-2.5 shrink-0" style={{ background: p.accent_hex || 'var(--color-muted)' }} />
                      <span className="text-sm text-on-surface truncate flex-1">{p.brand_name || '—'}</span>
                      <span className="font-mono text-[10px] uppercase text-muted shrink-0">{p.platform || '—'}</span>
                      <span className="font-mono text-[10px] text-muted shrink-0">{p.published_at ? new Date(p.published_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-secondary shrink-0" title="Abrir publicação">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
            )}
          </>
        )}

        {/* Outros motores de conteúdo — espelhos vivos dos bancos próprios (2026-07-30) */}
        {/* OS QUATRO MOTORES, no cartão que esta seção já usava. Antes eu tinha criado uma tabela
            nova ao lado dela, e a aba ficou com duas listas de motores — "criamos uma sessão sem
            precisar", disse o dono em 18/11. A tabela saiu e tudo o que ela mostrava entrou aqui. */}
        {aba === 'motores' && <MktCrescimento aba="video" filtros={filtros} recarga={recarga} />}
        {aba === 'motores' && (
          <MotoresDeConteudo
            recorte={recorte}
            limelight={limelight}
            pulso={pulso}
            espMkt={esp}
            hoje={hojeBrasilia()}
            brl={brl}
            pulsoUltimaPubDias={pulsoUltimaPubDias}
            mktUltimaPub={relativo(esp?.ultima_publicacao ?? null)}
            recarga={recarga}
          />
        )}

        {/* Central de fontes — o índice de comando: toda fonte de marketing da casa, um número-chave,
            o frescor e onde aprofundar. Pedido do dono em 25/08 ("este espelho tem que trazer tudo que
            temos de opções") e padronizada em 19/11 ("fontes eu padronizaria também"): agora é um
            número por azulejo, agrupado por família, e traço quer dizer não medido — nunca zero. */}
        {/* SAÚDE — "dá para confiar nos números das outras abas?". A coleta por conta vem do Radar;
            a central de fontes diz o frescor de cada fonte da casa. */}
        {aba === 'saude' && <MktCrescimento aba="saude" filtros={filtros} recarga={recarga} />}
        {aba === 'saude' && (
          <CentralDeFontes cadeia={cadeia} seo={seo} fila={fila} fatos={fatos}
                           pulso={pulso} limelight={limelight} blogs={blogs} recarga={recarga} />
        )}

        {/* Os fatos publicáveis moram com as publicações: são o que pode ser dito lá fora. */}
        {aba === 'publicacoes' && <FatosPublicaveis fatos={fatos} medicoes={medicoes} />}

        <div className="border border-outline/15 bg-surface-lowest p-3 flex items-start gap-2.5 text-[12px] text-on-surface-variant">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <span>
            Somente leitura — a produção, as marcas, os robôs e as travas por marca moram no{' '}
            <a href="https://mkt.digiai.app.br" target="_blank" rel="noreferrer" className="text-secondary hover:underline">DIGIAI MKT</a>{' '}
            (e os motores Limelight/Pulso nos seus próprios apps).
            Histórico da era anterior (schema <span className="font-mono">marketing</span>) permanece arquivado no banco.
          </span>
        </div>
      </div>
    </div>
  );
}

/** ESCOLHA ÚNICA TEM FORMA DE SEGMENTO COLADO. É a mesma forma das abas logo acima, e por isso se lê
 *  sem legenda: num segmento, um só pode estar aceso. Chip solto dizia o contrário — "marque quantos
 *  quiser" — e era mentira tanto no período quanto na régua da data. */
function Segmento({ opcoes, valor, onPick }: {
  opcoes: Array<{ k: string; label: string }>; valor: string; onPick: (k: string) => void;
}) {
  return (
    <div className="flex items-center border border-outline/15 w-fit p-0.5 overflow-x-auto">
      {opcoes.map((o) => (
        <button key={o.k} onClick={() => onPick(o.k)}
          className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 whitespace-nowrap transition-colors ${
            valor === o.k ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

/** Nome de FAMÍLIA — texto sublinhado, sem caixa. Quem tem caixa e selo é canal. A diferença entre
 *  "o grupo inteiro" e "este canal" passa a ser visível, em vez de explicada no rodapé. */
function BotaoGrupo({ on, onClick, children }: { on: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
      className={'font-mono text-[10px] uppercase tracking-widest px-1 pb-1 pt-1.5 border-b-2 transition-colors ' +
        (on ? 'border-secondary text-on-surface' : 'border-transparent text-muted hover:text-on-surface')}>
      {children}
    </button>
  );
}

/** O SELO DA MARCA — o padrão do Portfólio, trazido para o filtro: logo achatado em branco sobre a
 *  cor da marca, ou o logo cheio quando ele é um badge redondo.
 *  LOGO SÓ ONDE EXISTE LOGO DE VERDADE. Lancaster, Polá, Pessoal e os Bastidores não têm arquivo de
 *  marca no app: levam a sigla na cor da marca. Desenhar um logo que a marca não tem seria inventar
 *  um fato na tela, e é a única coisa que esta página não faz. */
const LOGO_DA_MARCA: Record<string, { src: string; cheio: boolean }> = {
  digiai: { src: '/brand/digiai.svg', cheio: false },
  mello: { src: '/brand/mello.png', cheio: true },
  pulso: { src: '/brand/pulso.png', cheio: true },
};
// A OSI TEM LOGO E MESMO ASSIM LEVA SIGLA. Conferido no ar: o arquivo dela e um LETREIRO, e letreiro
// a 24 px vira borrao -- ocupa o lugar de uma marca sem ser uma. Logo so onde o desenho sobrevive ao
// tamanho; nos outros, a sigla na cor da marca, que a 24 px diz mais.
const SIGLA_DA_MARCA: Record<string, string> = {
  lancaster: 'LA', pessoal: 'PE', polapetit: 'PP', osi: 'OS', bastidores: 'BD', bastidores2: 'B2',
};

/** A cor do texto da sigla sai da LUMINANCIA da cor da marca, nunca de um valor fixo. Conferido no
 *  ar: `Pessoal` e #1F2937 e a sigla saiu cinza-escuro sobre quase-preto, ilegivel, enquanto no
 *  dourado da Pola o mesmo valor ficava certo. Quem decide o contraste e o contraste. */
function textoSobre(hex: string | null) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex ?? '');
  if (!m) return '#fff';
  const n = parseInt(m[1], 16);
  const luz = (0.299 * ((n >> 16) & 255) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
  return luz > 0.6 ? '#111827' : '#fff';
}

function SeloMarca({ on, onClick, code, origem, nome, cor }: {
  on: boolean; onClick: () => void; code: string; origem: OrigemK; nome: string; cor: string | null;
}) {
  // Os três canais do Pulso vêm do espelho dele com o nome como código — o selo é o do motor, e é
  // honesto que sejam iguais: é a mesma marca em três canais. O nome ao lado é que os separa.
  const logo = LOGO_DA_MARCA[code] ?? (origem === 'pulso' ? LOGO_DA_MARCA.pulso : null);
  const sigla = SIGLA_DA_MARCA[code] ?? nome.replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 2).toUpperCase();
  return (
    <button onClick={onClick} title={nome}
      className={'inline-flex items-center gap-1.5 pl-1 pr-2.5 py-1 text-[12px] border transition-colors ' +
        (on ? 'text-on-surface bg-surface-highest' : 'border-outline/20 text-on-surface-variant hover:text-on-surface hover:border-outline/40')}
      style={on ? { borderColor: cor ?? 'var(--color-secondary)' } : undefined}>
      <span className="w-6 h-6 shrink-0 flex items-center justify-center overflow-hidden font-mono text-[9px] font-bold"
        style={logo?.cheio ? undefined : { background: cor ?? 'var(--color-muted)', color: textoSobre(cor) }}>
        {logo
          ? <img src={logo.src} alt="" className={logo.cheio ? 'w-6 h-6 object-cover' : 'w-4 h-4 object-contain'}
                 style={logo.cheio ? undefined : { filter: 'brightness(0) invert(1)' }} />
          : sigla}
      </span>
      <span className="whitespace-nowrap">{nome}</span>
    </button>
  );
}

/** REDE EM SIGLA COLORIDA. Oito redes em oito quadrados do mesmo tamanho, na cor que o olho já
 *  conhece — nenhum nome escrito, porque "Instagram" e "Pinterest" ocupavam metade da linha e não
 *  informavam nada que o roxo e o vermelho não informem. Acesa fica preenchida: dá para ver de longe
 *  que existe um recorte de rede valendo, que era o engano mais comum da tela antiga.
 *  O nome completo fica no `title` e no `aria-label` — a sigla não é a única porta. */
const REDE_SELO: Record<string, { sigla: string; cor: string }> = {
  instagram: { sigla: 'IG', cor: '#E1306C' }, facebook: { sigla: 'FB', cor: '#1877F2' },
  tiktok: { sigla: 'TT', cor: '#EE1D52' }, youtube: { sigla: 'YT', cor: '#FF0000' },
  kwai: { sigla: 'KW', cor: '#FF7A00' }, linkedin: { sigla: 'LI', cor: '#0A66C2' },
  x: { sigla: 'X', cor: '#71767B' }, pinterest: { sigla: 'PI', cor: '#E60023' },
};

function SeloRede({ k, label, on, onClick }: { k: string; label: string; on: boolean; onClick: () => void }) {
  const s = REDE_SELO[k] ?? { sigla: k.slice(0, 2).toUpperCase(), cor: 'var(--color-muted)' };
  return (
    <button onClick={onClick} title={label} aria-label={label} aria-pressed={on}
      className={'w-9 h-[30px] inline-flex items-center justify-center font-mono text-[11px] font-bold border transition-colors ' +
        (on ? 'text-white' : 'border-outline/20 hover:border-outline/50')}
      style={on ? { background: s.cor, borderColor: s.cor } : { color: s.cor }}>
      {s.sigla}
    </button>
  );
}
