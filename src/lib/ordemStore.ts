import { supabase } from './supabase';

// Mesmo guard do financeStore: dev sem .env cai em modo offline em vez de quebrar.
function isSupabaseReady(): boolean {
  return Boolean(import.meta.env.VITE_SUPABASE_URL && import.meta.env.VITE_SUPABASE_ANON_KEY);
}

// A ordem do dia (migrations 057/058). Três blocos, em ordem que não é estética:
// trava = o que apaga a empresa se ignorado · gate = o que destrava a fase ·
// maquina = o que já rodou sozinho e você só confere.
export type BlocoOrdem = 'trava' | 'gate' | 'maquina';
export type EstadoOrdem = 'aberto' | 'cumprido' | 'justificado';

export type ItemOrdem = {
  id: string;
  dia: string;
  bloco: BlocoOrdem;
  posicao: number;
  titulo: string;
  porque: string | null;
  dono: 'humano' | 'maquina';
  origem_tipo: string;
  origem_ref: string | null;
  estado: EstadoOrdem;
  justificativa: string | null;
  cumprido_em: string | null;
  gerado_em: string;
};

export const ordemStore = {
  async doDia(dia?: string): Promise<ItemOrdem[]> {
    if (!isSupabaseReady()) return [];
    const alvo = dia ?? new Date().toISOString().slice(0, 10);
    const { data, error } = await supabase
      .from('v_ops_ordem_do_dia')
      .select('*')
      .eq('dia', alvo);
    if (error) {
      console.error('[ordem] doDia', error);
      return [];
    }
    return (data as ItemOrdem[]) || [];
  },

  // A ordem impõe: a única saída é cumprir ou justificar por escrito.
  async fechar(id: string, estado: 'cumprido' | 'justificado', justificativa?: string): Promise<void> {
    const { error } = await supabase.rpc('fn_ordem_fechar', {
      p_id: id,
      p_estado: estado,
      p_justificativa: justificativa ?? null,
    });
    if (error) {
      console.error('[ordem] fechar', error);
      throw new Error(error.message);
    }
  },

  async gerar(): Promise<number> {
    const { data, error } = await supabase.rpc('fn_gerar_ordem_do_dia', {});
    if (error) {
      console.error('[ordem] gerar', error);
      throw new Error(error.message);
    }
    return (data as number) ?? 0;
  },
};

// Placar da tela Hoje (migration 069). Substitui os 4 cards de KPI da Visão —
// os mesmos números, sem o bloco decorativo. A série de MRR fica por decisão do
// dono (15/08), mas como sparkline: uma reta em zero não merece um quarto da tela.
export type PontoMrr = { mes: string; mrr: number };

export type PlacarHoje = {
  fase: number;
  fase_nome: string;
  metrica: string;
  elo_titulo: string | null;
  elo_numero: number | null;
  elo_total: number | null;
  elo_prazo: string | null;
  elo_dias: number | null;
  caixa: number;
  custo_mes: number;
  pagantes: number;
  gate_ok: boolean;
  gate_veredito: string;
  mrr_serie: PontoMrr[];
};

export const placarStore = {
  async hoje(): Promise<PlacarHoje | null> {
    if (!isSupabaseReady()) return null;
    const { data, error } = await supabase.from('v_ops_placar_hoje').select('*').maybeSingle();
    if (error) {
      console.error('[placar] hoje', error);
      return null;
    }
    return (data as PlacarHoje) ?? null;
  },
};
