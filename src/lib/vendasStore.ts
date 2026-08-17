import { supabase } from './supabase';

// Vendas dos produtos DIGIAI — leitura de `public.v_vendas_eventos` e `v_vendas_canais`.
//
// A view devolve EVENTO classificado (nova / renovacao / cancelamento / avulsa), não
// total do dia. Em recorrência, um número único mistura crescimento com caixa: um dia
// com 20 renovações e 0 assinaturas novas parece ótimo somado, e é um dia sem venda.
// A soma acontece aqui, e sempre separada.

export type TipoEvento = 'nova' | 'renovacao' | 'cancelamento' | 'avulsa';

export interface VendaEvento {
  dia: string;
  produto: string | null;
  produto_nome: string | null;
  tipo: TipoEvento;
  valor: number | null;
  canal: string;
  plano: string | null;
  cliente: string | null;
  status_origem: string | null;
  produto_nome_origem: string | null;
}

export interface Canal {
  canal: string;
  cobre: string;
  vendas_reais: number;
  eventos_recebidos: number;
  eventos_validos: number;
  ultimo_evento: string | null;
  assinantes: number | null;
  dias_desde_evento: number | null;
  /** Cinco estados porque "zero venda" tem causas que pedem ações opostas. */
  estado: 'ativo' | 'recebendo sem venda' | 'validou uma vez, silencioso desde' | 'so teste manual' | 'nunca chamado';
  /** O que fazer. Nulo quando o canal já vende. */
  pendencia: string | null;
}

export interface Resumo {
  novas: number;
  novas_valor: number;
  renovacoes: number;
  renovacoes_valor: number;
  cancelamentos: number;
  cancelamentos_valor: number;
  avulsas: number;
  avulsas_valor: number;
  /** Movimento líquido de recorrência: entrou de novo menos o que saiu. Ignora renovação
   *  de propósito — renovação é caixa, não crescimento, e somá-la aqui inflaria o número. */
  liquido_recorrencia: number;
}

function vazio(): Resumo {
  return {
    novas: 0, novas_valor: 0,
    renovacoes: 0, renovacoes_valor: 0,
    cancelamentos: 0, cancelamentos_valor: 0,
    avulsas: 0, avulsas_valor: 0,
    liquido_recorrencia: 0,
  };
}

export function resumir(eventos: VendaEvento[]): Resumo {
  const r = vazio();
  for (const e of eventos) {
    const v = e.valor ?? 0;
    if (e.tipo === 'nova') { r.novas++; r.novas_valor += v; r.liquido_recorrencia += v; }
    else if (e.tipo === 'renovacao') { r.renovacoes++; r.renovacoes_valor += v; }
    else if (e.tipo === 'cancelamento') { r.cancelamentos++; r.cancelamentos_valor += v; r.liquido_recorrencia += v; }
    else if (e.tipo === 'avulsa') { r.avulsas++; r.avulsas_valor += v; }
  }
  return r;
}

/** Data local em ISO — `toISOString()` usaria UTC e jogaria venda da noite para o dia seguinte. */
function isoLocal(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function janelas(eventos: VendaEvento[]) {
  const hoje = isoLocal(new Date());
  const d7 = new Date(); d7.setDate(d7.getDate() - 6);
  const inicio7 = isoLocal(d7);
  const inicioMes = hoje.slice(0, 8) + '01';
  return {
    hoje: resumir(eventos.filter((e) => e.dia === hoje)),
    sete: resumir(eventos.filter((e) => e.dia >= inicio7)),
    mes: resumir(eventos.filter((e) => e.dia >= inicioMes)),
  };
}

export function porProduto(eventos: VendaEvento[]) {
  const grupos = new Map<string, { chave: string; nome: string; itens: VendaEvento[] }>();
  for (const e of eventos) {
    const chave = e.produto ?? '(nao mapeado)';
    if (!grupos.has(chave)) {
      grupos.set(chave, {
        chave,
        nome: e.produto_nome ?? e.produto_nome_origem ?? 'Produto não mapeado',
        itens: [],
      });
    }
    grupos.get(chave)!.itens.push(e);
  }
  return [...grupos.values()]
    .map((g) => ({ chave: g.chave, nome: g.nome, resumo: resumir(g.itens) }))
    .sort((a, b) => b.resumo.novas_valor - a.resumo.novas_valor);
}

export const vendasStore = {
  async carregar(): Promise<{ eventos: VendaEvento[]; canais: Canal[] }> {
    const [ev, ca] = await Promise.all([
      supabase.from('v_vendas_eventos').select('*').order('dia', { ascending: false }).limit(2000),
      supabase.from('v_vendas_canais').select('*'),
    ]);
    if (ev.error) {
      console.error('[vendasStore] eventos', ev.error);
      throw new Error(`Não foi possível ler as vendas: ${ev.error.message}`);
    }
    if (ca.error) {
      console.error('[vendasStore] canais', ca.error);
      throw new Error(`Não foi possível ler o estado dos canais: ${ca.error.message}`);
    }
    const eventos = (ev.data ?? []).map((e) => ({
      ...e,
      valor: e.valor != null ? Number(e.valor) : null,
    })) as VendaEvento[];
    return { eventos, canais: (ca.data ?? []) as Canal[] };
  },
};
