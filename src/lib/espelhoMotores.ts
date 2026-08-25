// Espelhos read-only dos motores de conteúdo que vivem FORA do banco digiai:
// Limelight Studio (fábrica da Mello, projeto gfdpvasbrxwulvpvyfvr) e
// Pulso Control (canais faceless, projeto nlcisbfdiokmipyihtuz).
// Views agregadas v_espelho_* criadas em 2026-07-30 — só números, zero PII;
// anon keys são públicas por design (mesma classe do bundle de cada app).

const LIMELIGHT_URL = import.meta.env.VITE_LIMELIGHT_SUPABASE_URL || 'https://gfdpvasbrxwulvpvyfvr.supabase.co';
const LIMELIGHT_ANON = import.meta.env.VITE_LIMELIGHT_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmZHB2YXNicnh3dWx2cHZ5ZnZyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQ1NzMwNzYsImV4cCI6MjEwMDE0OTA3Nn0.Gr8I2e9Ot2d6fOq0eBp43yDWDxAohkzAcoa0dJ9_zOk';
const PULSO_URL = import.meta.env.VITE_PULSO_SUPABASE_URL || 'https://nlcisbfdiokmipyihtuz.supabase.co';
const BLOGS_URL = 'https://zgojkioieztikqhwcoae.supabase.co';
const PULSO_ANON = import.meta.env.VITE_PULSO_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5sY2lzYmZkaW9rbWlweWlodHV6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM1ODk0OTksImV4cCI6MjA3OTE2NTQ5OX0.-Cfzv9ebOYB8I93zNLghWTszawJk4G3rXwiTTY9PpOI';

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

async function lerEspelho<T>(base: string, anon: string, view: string): Promise<T | null> {
  try {
    const r = await fetch(`${base}/rest/v1/${view}?select=*`, {
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      signal: AbortSignal.timeout(12000),
    });
    if (!r.ok) return null;
    const rows = await r.json();
    return Array.isArray(rows) && rows.length ? (rows[0] as T) : null;
  } catch {
    return null;
  }
}

const BLOGS_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpnb2praW9pZXp0aWtxaHdjb2FlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcxNzk0NjYsImV4cCI6MjEwMjc1NTQ2Nn0.yV530Q6ZBTeGdega3rphtJFNKgShu1fR_ZV9mMZFHzY';

export const espelhoMotores = {
  limelight: () => lerEspelho<EspelhoLimelight>(LIMELIGHT_URL, LIMELIGHT_ANON, 'v_espelho_limelight'),
  pulso: () => lerEspelho<EspelhoPulso>(PULSO_URL, PULSO_ANON, 'v_espelho_pulso'),
  blogs: () => lerEspelho<EspelhoBlogs>(BLOGS_URL, BLOGS_ANON, 'v_espelho_blogs'),
};
