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
async function lerLinhas<T>(base: string | undefined, anon: string | undefined, view: string): Promise<T[]> {
  if (!base || !anon) { console.error('[espelho] %s: variavel de ambiente ausente — espelho desligado', view); return []; }
  try {
    const r = await fetch(`${base}/rest/v1/${view}?select=*&order=dia.asc`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) { console.error('[espelho] %s: HTTP %s', view, r.status); return []; }
    const rows = await r.json();
    return Array.isArray(rows) ? (rows as T[]) : [];
  } catch (e) {
    console.error('[espelho] %s inacessivel', view, e);
    return [];
  }
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

export const espelhoMotores = {
  limelight: () => lerEspelho<EspelhoLimelight>(LIMELIGHT_URL, LIMELIGHT_ANON, 'v_espelho_limelight'),
  pulso: () => lerPulsoGateado(),
  blogs: () => lerEspelho<EspelhoBlogs>(BLOGS_URL, BLOGS_ANON, 'v_espelho_blogs'),
  pulsoDias: () => lerLinhas<PulsoDia>(PULSO_URL, PULSO_ANON, 'v_espelho_pulso_dias'),
  limelightDias: () => lerLinhas<LimelightDia>(LIMELIGHT_URL, LIMELIGHT_ANON, 'v_espelho_limelight_dias'),
  limelightPubDias: () => lerLinhas<LimePubDia>(LIMELIGHT_URL, LIMELIGHT_ANON, 'v_espelho_limelight_pub_dias'),
  blogsDias: () => lerLinhas<BlogDia>(BLOGS_URL, BLOGS_ANON, 'v_espelho_blogs_dias'),
};
