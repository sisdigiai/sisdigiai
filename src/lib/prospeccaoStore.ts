import { supabase } from './supabase';
import { hojeBrasilia } from './datas';

// Placar da prospecção por WhatsApp — contrato do MKT `public.v_mkt_placar_prospeccao` (15/09/2026).
// Ordem do dono: resultado da prospecção se lê no digiai, não no MKT. A view é invoker e a RLS do
// MKT exige staff/admin/founder/vendas: quem não pode ler recebe as linhas de braço sem a linha
// 'estado'. Por isso "sem estado" é erro de permissão, nunca "tudo zero".

export type Braco = 'osi' | 'clearix';

export interface LinhaBraco {
  tipo: 'braco';
  dia: string;
  braco: Braco;
  agendadas: number | null;
  enviadas: number | null;
  entregues: number | null;
  lidas: number | null;
  responderam: number | null;
  interessados: number | null;
  link_enviado: number | null;
  sair: number | null;
  sem_whatsapp: number | null;
  falhas: number | null;
  /** Nulo = fonte ainda não existe (não medido), não zero. */
  clicaram: number | null;
  vendas: number | null;
  medido_em: string;
}

export interface LinhaEstado {
  tipo: 'estado';
  dia: string;
  ligada: boolean | null;
  pausada: boolean | null;
  pausa_motivo: string | null;
  pausada_em: string | null;
  meta_dia: number | null;
  passo_rampa: number | null;
  rampa: number[] | null;
  proximo_envio: string | null;
  dentro_da_janela: boolean | null;
  robo_rodou_em: string | null;
  robo_status: string | null;
  medido_em: string;
}

export interface PlacarProspeccao {
  estado: LinhaEstado | null;
  /** Braços do dia do estado (ou de hoje em Brasília, se o estado não veio). */
  hoje: Partial<Record<Braco, LinhaBraco>>;
  erro?: string;
}

export { hojeBrasilia };

export const prospeccaoStore = {
  async placar(): Promise<PlacarProspeccao> {
    const { data, error } = await supabase
      .from('v_mkt_placar_prospeccao')
      .select('*')
      .order('dia', { ascending: false });
    if (error) {
      console.error('[prospeccaoStore] placar', error);
      return { estado: null, hoje: {}, erro: error.message };
    }
    const linhas = (data ?? []) as (LinhaBraco | LinhaEstado)[];
    const estado = (linhas.find((l) => l.tipo === 'estado') as LinhaEstado | undefined) ?? null;
    const dia = estado?.dia ?? hojeBrasilia();
    const hoje: Partial<Record<Braco, LinhaBraco>> = {};
    for (const l of linhas) {
      if (l.tipo === 'braco' && l.dia === dia) hoje[l.braco] = l;
    }
    return { estado, hoje };
  },
};
