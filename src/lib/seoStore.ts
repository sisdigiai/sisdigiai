import { supabase } from './supabase';

// Estado de SEO por site — leitura de `public.v_seo_estado`.
//
// A view junta configuração (`company.seo_sites`) com a última medição
// (`company.seo_medicoes`) e deriva o diagnóstico. O diagnóstico NÃO vem daqui:
// vem do banco, para que a regra seja uma só e não divirja entre telas.

export type Diagnostico = 'cobertura' | 'ranking' | 'ctr' | 'sem impressao' | 'sem medicao' | 'saudavel';

export interface SeoEstado {
  site: string;
  label: string;
  color: string | null;
  gsc_property: string | null;
  tem_bing: boolean;
  tem_cloudflare: boolean;
  github_repo: string | null;
  sort_order: number;
  medido_em: string | null;
  janela: string | null;
  paginas_sitemap: number | null;
  sitemap_url: string | null;
  sitemap_lido_em: string | null;
  dias_desde_leitura: number | null;
  cliques: number | null;
  impressoes: number | null;
  posicao_media: number | null;
  ctr: number | null;
  obs: string | null;
  cliques_antes: number | null;
  impressoes_antes: number | null;
  posicao_antes: number | null;
  medido_antes_em: string | null;
  diagnostico: Diagnostico;
  sitemap_frio: boolean;
}

/**
 * O que cada diagnóstico significa e o que se faz com ele. Mora no app e não no
 * banco porque é texto de interface — a REGRA que escolhe o diagnóstico é do banco.
 */
export const DIAGNOSTICOS: Record<Diagnostico, { rotulo: string; tom: 'ruim' | 'atencao' | 'bom' | 'neutro'; oque: string; acao: string }> = {
  cobertura: {
    rotulo: 'Cobertura',
    tom: 'ruim',
    oque: 'Há poucas páginas no sitemap — o site não tem o que ranquear.',
    acao: 'Publicar páginas. Antes disso, mexer em título ou link não muda nada.',
  },
  ranking: {
    rotulo: 'Ranking',
    tom: 'ruim',
    oque: 'As páginas existem mas aparecem fora da primeira página de resultados.',
    acao: 'Conteúdo e autoridade. Otimizar CTR aqui não serve: ninguém chega a ver.',
  },
  ctr: {
    rotulo: 'CTR',
    tom: 'atencao',
    oque: 'O site aparece bem posicionado e não é clicado.',
    acao: 'Reescrever título e meta description. É o conserto mais barato dos três.',
  },
  'sem impressao': {
    rotulo: 'Sem impressão',
    tom: 'ruim',
    oque: 'O Google não mostrou o site para ninguém na janela medida.',
    acao: 'Conferir indexação e se o sitemap foi aceito.',
  },
  'sem medicao': {
    rotulo: 'Sem medição',
    tom: 'neutro',
    oque: 'Nunca foi medido. Ausência de número não é ausência de problema.',
    acao: 'Ler o Search Console e registrar a medição.',
  },
  saudavel: {
    rotulo: 'Saudável',
    tom: 'bom',
    oque: 'Cobertura, posição e CTR dentro do esperado.',
    acao: 'Manter e acompanhar a tendência.',
  },
};

export const seoStore = {
  async estado(): Promise<SeoEstado[]> {
    const { data, error } = await supabase.from('v_seo_estado').select('*');
    if (error) {
      console.error('[seoStore] estado', error);
      throw new Error(`Não foi possível ler o estado de SEO: ${error.message}`);
    }
    // A view devolve numeric como string no PostgREST; converter aqui evita
    // toFixed em string e comparação de texto na tela.
    return (data ?? []).map((r) => ({
      ...r,
      posicao_media: r.posicao_media != null ? Number(r.posicao_media) : null,
      ctr: r.ctr != null ? Number(r.ctr) : null,
      posicao_antes: r.posicao_antes != null ? Number(r.posicao_antes) : null,
    })) as SeoEstado[];
  },
};
