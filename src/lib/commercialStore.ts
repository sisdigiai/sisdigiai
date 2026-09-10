import { supabase } from './supabase';

// Estágios espelham o funil REAL do banco — conferido em 09/09/2026 contra a
// CHECK `commercial_leads_stage_vocabulario`, e ela discordava desta lista em DOIS
// pontos: aqui existia `lead`, que o banco NÃO aceita (o primeiro estágio é
// `captado`), e faltava `proposta`, que o banco aceita. Resultado: o primeiro
// estágio da tela falhava ao salvar e `proposta` era inalcançável — nos dois
// casos sem mensagem nenhuma, porque o `save()` ignorava o retorno.
export type LeadStage = 'captado' | 'contatado' | 'conversa' | 'demo' | 'proposta' | 'piloto' | 'cliente' | 'perdido';

/** Resultado de escrita. Existe porque a tela precisa saber que FALHOU — antes
 *  o store devolvia `void` e só registava no console, e o formulário fechava
 *  como se tivesse gravado. */
export type Resultado = { ok: true; erro?: undefined } | { ok: false; erro: string };

export interface MotivoPerda { chave: string; rotulo: string }

/** `lead` foi estágio válido nesta tela até 09/09 e pode estar no localStorage de
 *  quem usou antes. Sem esta tradução, esses cards sumiriam do quadro — nenhuma
 *  coluna os aceitaria. Traduzir na leitura é mais honesto que migrar em silêncio. */
function estagioLegado(s: string): LeadStage {
  return (s === 'lead' ? 'captado' : s) as LeadStage;
}

export interface CommercialLead {
  id?: string;
  name: string;
  company: string;
  product: string; // clearix | osi | academy | outro
  stage: LeadStage;
  source: string;
  contact: string;
  value_brl: number | null;
  owner: string;
  next_step: string;
  notes: string;
  updated_at?: string;
}

const LS_KEY = 'digiai_commercial_leads';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function readLocal(): CommercialLead[] {
  try {
    return JSON.parse(localStorage.getItem(LS_KEY) || '[]') as CommercialLead[];
  } catch {
    return [];
  }
}

function writeLocal(rows: CommercialLead[]) {
  localStorage.setItem(LS_KEY, JSON.stringify(rows));
}

export interface OutreachItem {
  id: string;
  kind: string;
  scheduled_date: string;
  variation: string | null;
  status: string;
  sent_at: string | null;
  lead_company: string | null;
  lead_stage: string | null;
}

export const commercialStore = {
  isOnline: isSupabaseReady,

  // Agenda de prospecção (marketing.outreach_schedule via view) — a esteira VENDER
  async listOutreach(): Promise<OutreachItem[]> {
    if (!isSupabaseReady()) return [];
    const { data, error } = await supabase.from('v_marketing_outreach').select('*');
    if (error) {
      console.error('[commercialStore] listOutreach', error);
      return [];
    }
    return (data ?? []) as OutreachItem[];
  },

  async list(): Promise<CommercialLead[]> {
    if (!isSupabaseReady()) return readLocal().map((l) => ({ ...l, stage: estagioLegado(l.stage) }));
    const { data, error } = await supabase.from('v_commercial_leads').select('*');
    if (error) {
      console.error('[commercialStore] list', error);
      return readLocal().map((l) => ({ ...l, stage: estagioLegado(l.stage) }));
    }
    const rows = ((data ?? []) as CommercialLead[]).map((l) => ({ ...l, stage: estagioLegado(l.stage) }));
    writeLocal(rows);
    return rows;
  },

  async upsert(lead: CommercialLead): Promise<Resultado> {
    const rows = readLocal();
    if (lead.id) {
      const i = rows.findIndex((r) => r.id === lead.id);
      if (i >= 0) rows[i] = lead; else rows.push(lead);
    } else {
      rows.push({ ...lead, id: crypto.randomUUID() });
    }
    writeLocal(rows);

    if (!isSupabaseReady()) return { ok: true };
    const { error } = await supabase.rpc('fn_upsert_commercial_lead', { p_lead: lead });
    if (error) { console.error('[commercialStore] upsert', error); return { ok: false, erro: error.message }; }
    return { ok: true };
  },

  async remove(id: string): Promise<Resultado> {
    writeLocal(readLocal().filter((r) => r.id !== id));
    if (!isSupabaseReady()) return { ok: true };
    const { error } = await supabase.rpc('fn_delete_commercial_lead', { p_id: id });
    if (error) { console.error('[commercialStore] remove', error); return { ok: false, erro: error.message }; }
    return { ok: true };
  },

  /** Perder é o único estágio que exige motivo (CHECK no banco desde antes desta
   *  tela existir). Vai pela RPC própria — ela valida o motivo e devolve a lista
   *  dos válidos na mensagem, em vez do código cru da constraint. */
  async marcarPerdido(id: string, motivo: string): Promise<Resultado> {
    if (!isSupabaseReady()) return { ok: false, erro: 'sem conexão' };
    const { error } = await supabase.rpc('fn_marcar_lead_perdido', { p_lead_id: id, p_motivo: motivo });
    if (error) { console.error('[commercialStore] marcarPerdido', error); return { ok: false, erro: error.message }; }
    return { ok: true };
  },

  /** Lista de motivos ATIVOS. Vem de `v_vendas_motivos`, que já existia para a
   *  tela /vendas do digiai_mkt — reusar em vez de criar uma segunda view sobre a
   *  mesma tabela, senão as duas telas passam a divergir sem ninguém reparar.
   *  Degrada em vazio: a tela diz que não conseguiu carregar, em vez de oferecer
   *  uma lista inventada que o banco depois recusa. */
  async motivosPerda(): Promise<MotivoPerda[]> {
    if (!isSupabaseReady()) return [];
    const { data, error } = await supabase.from('v_vendas_motivos').select('chave, rotulo').order('ordem');
    if (error) { console.error('[commercialStore] motivosPerda', error); return []; }
    return (data ?? []) as MotivoPerda[];
  },
};
