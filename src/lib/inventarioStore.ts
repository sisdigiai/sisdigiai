import { supabase } from './supabase';

// Inventário de contas e serviços da empresa.
//
// A verdade vive em `ops.contas_servicos`. Desde a ORDEM 2 (17/08/2026) o `ops.*` é
// ESCRITO pelo digiai e lido pelo digiai_mkt por view — inventário é ativo de empresa,
// e antes disso ficava sem dono claro. A tela em si continua só lendo, pela
// `public.v_ops_contas_servicos`, que filtra inativos, calcula dias para renovar e
// marca verificação velha.

export interface ContaServico {
  id: string;
  servico: string;
  identificador: string;
  conta_dona: string | null;
  plano: string | null;
  custo_mensal: number | null;
  moeda: string | null;
  status: string | null;
  ultima_verificacao: string | null;
  ultimo_detalhe: string | null;
  dono_humano: string | null;
  url_painel: string | null;
  obs: string | null;
  dias_para_renovar: number | null;
  verificacao_velha: boolean | null;
  empresa_slug: string | null;
  categoria: string | null;
  situacao: string | null;
}

// Agrupa os `servico` técnicos em famílias que fazem sentido para quem decide.
// Um serviço não mapeado cai em "Outros" em vez de sumir da tela.
const FAMILIAS: { chave: string; label: string; servicos: string[] }[] = [
  { chave: 'meta',        label: 'Meta',              servicos: ['meta_bm', 'meta_pixel'] },
  { chave: 'redes',       label: 'Redes sociais',     servicos: ['rede_facebook', 'rede_instagram', 'rede_linkedin', 'rede_tiktok', 'rede_whatsapp', 'rede_x', 'rede_pinterest'] },
  { chave: 'google',      label: 'Google',            servicos: ['google_search_console', 'google_analytics', 'google_workspace', 'google_business_profile'] },
  { chave: 'infra',       label: 'Infraestrutura',    servicos: ['supabase', 'cloudflare', 'netlify', 'github'] },
  { chave: 'dev',         label: 'Apps de dev',       servicos: ['tiktok_dev', 'tiktok_pixel', 'linkedin_dev', 'pinterest_dev'] },
  { chave: 'plataformas', label: 'Plataformas e IA',  servicos: ['hotmart', 'openai', 'telegram_bot'] },
];

export function familiaDe(servico: string): { chave: string; label: string } {
  const f = FAMILIAS.find((x) => x.servicos.includes(servico));
  return f ? { chave: f.chave, label: f.label } : { chave: 'outros', label: 'Outros' };
}

export const FAMILIAS_ORDEM = [...FAMILIAS.map((f) => ({ chave: f.chave, label: f.label })), { chave: 'outros', label: 'Outros' }];

/**
 * Um item foi conferido nesta varredura se o `obs` carrega um dos marcadores que
 * as migrations 072–077 gravaram. É proposital ler o marcador em vez da data:
 * `ultima_verificacao` pode ser tocada por qualquer rotina, o marcador só existe
 * onde alguém realmente olhou a plataforma.
 */
export function foiConferido(c: ContaServico): boolean {
  const o = c.obs ?? '';
  return o.includes('[mapa-paginas') || o.includes('[mapa-ads') || o.includes('[mapa-extra') || o.includes('[estado-real');
}

/** Extrai os blocos de conferência do `obs`, já sem o marcador, para exibição. */
export function blocosDe(c: ContaServico): { titulo: string; texto: string }[] {
  const o = c.obs ?? '';
  const rotulos: Record<string, string> = {
    'mapa-paginas': 'Páginas',
    'mapa-ads': 'Contas de anúncio',
    'mapa-extra': 'Pixels, Instagram e acessos',
    'estado-real': 'Estado verificado',
  };
  const partes: { titulo: string; texto: string }[] = [];
  const re = /\[(mapa-paginas|mapa-ads|mapa-extra|estado-real)[^\]]*\]\s*([\s\S]*?)(?=\n\[(?:mapa-paginas|mapa-ads|mapa-extra|estado-real)|$)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(o)) !== null) {
    const texto = m[2].trim();
    if (texto) partes.push({ titulo: rotulos[m[1]] ?? m[1], texto });
  }
  return partes;
}

/** Texto do `obs` que veio antes de qualquer marcador — a nota original do inventário. */
export function notaOriginal(c: ContaServico): string {
  const o = c.obs ?? '';
  const i = o.search(/\[(mapa-paginas|mapa-ads|mapa-extra|estado-real)/);
  return (i >= 0 ? o.slice(0, i) : o).trim();
}

export const inventarioStore = {
  async listar(): Promise<ContaServico[]> {
    const { data, error } = await supabase
      .from('v_ops_contas_servicos')
      .select('*');
    if (error) {
      console.error('[inventarioStore] listar', error);
      throw new Error(`Não foi possível ler o inventário: ${error.message}`);
    }
    return (data ?? []) as ContaServico[];
  },
};
