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

/** Sair do funil tem DOIS sentidos, e o banco separa-os desde a 109:
 *  `perda` — a ótica avaliou e disse não (fica no funil, coluna Perdido);
 *  `descarte` — o cadastro não presta (sai da base, fica na aba Descartados).
 *  Com 254 dos 260 leads vindos de raspagem, misturá-los fazia o relatório de
 *  perda ser sobre higiene de dado e não sobre o mercado. */
export type TipoSaida = 'perda' | 'descarte';
export interface MotivoSaida { chave: string; rotulo: string; tipo: TipoSaida }

export interface LeadDescartado {
  id: string;
  company: string;
  contact: string | null;
  source: string | null;
  motivo_perda: string | null;
  /** Nulo = saiu pela lixeira antiga, que não pedia motivo (a 111 fecha essa porta). */
  motivo_rotulo: string | null;
  deleted_at: string;
}

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
  /** Só leitura, vêm da view (106/107). A escrita não os envia: o upsert só lê
   *  as chaves que conhece. */
  motivo_perda?: string | null;
  motivo_rotulo?: string | null;
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

  /** Devolve as linhas E se elas vieram do banco ou do recurso local.
   *
   *  O recurso local existe de propósito (modo offline). O problema era não
   *  distinguir "estou offline por configuração" de "a leitura falhou": em
   *  09/09/2026 um grant em falta fez esta consulta morrer com 42501, e a tela
   *  mostrou dado velho do localStorage sem uma palavra. Ninguém reparou até
   *  outro app cair. Lista vazia e lista desatualizada são indistinguíveis de
   *  "não há leads" — e é a mesma falha em silêncio que o salvar tinha. */
  async list(): Promise<{ rows: CommercialLead[]; erro?: string }> {
    const local = () => readLocal().map((l) => ({ ...l, stage: estagioLegado(l.stage) }));
    if (!isSupabaseReady()) return { rows: local() };
    const { data, error } = await supabase.from('v_commercial_leads').select('*');
    if (error) {
      console.error('[commercialStore] list', error);
      return { rows: local(), erro: error.message };
    }
    const rows = ((data ?? []) as CommercialLead[]).map((l) => ({ ...l, stage: estagioLegado(l.stage) }));
    writeLocal(rows);
    return { rows };
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

  /** Tira o lead da base POR DEFEITO DO CADASTRO — não é perda de venda.
   *  Substitui o antigo `remove()`, que gravava a saída sem motivo e deixava
   *  "descartado" e "alguém carregou no lixo" indistinguíveis (a 111 aposenta essa
   *  RPC e passa a exigir motivo). A linha fica guardada no banco: é a memória do
   *  que já se rejeitou. A cópia local só perde o lead DEPOIS de o banco aceitar —
   *  o `remove()` apagava antes, e uma recusa deixava as duas cópias a discordar. */
  async descartar(id: string, motivo: string): Promise<Resultado> {
    if (!isSupabaseReady()) return { ok: false, erro: 'sem conexão' };
    const { error } = await supabase.rpc('fn_descartar_lead', { p_lead_id: id, p_motivo: motivo });
    if (error) { console.error('[commercialStore] descartar', error); return { ok: false, erro: error.message }; }
    writeLocal(readLocal().filter((r) => r.id !== id));
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

  /** Motivos ATIVOS dos dois tipos, de `v_motivos_saida` — a view única que serve
   *  as duas telas (`v_vendas_motivos` fica só como compatibilidade até o MKT a
   *  apagar). Quem chama separa por `tipo`.
   *  Degrada em vazio: a tela diz que não conseguiu carregar, em vez de oferecer
   *  uma lista inventada que o banco depois recusa. */
  async motivosSaida(): Promise<MotivoSaida[]> {
    if (!isSupabaseReady()) return [];
    const { data, error } = await supabase.from('v_motivos_saida').select('chave, rotulo, tipo').order('ordem');
    if (error) { console.error('[commercialStore] motivosSaida', error); return []; }
    return (data ?? []) as MotivoSaida[];
  },

  /** Os que saíram da base. Devolve o erro em vez de engolir — a mesma lição do
   *  `list()`: lista vazia por falha é indistinguível de "nunca se descartou nada". */
  async listDescartados(): Promise<{ rows: LeadDescartado[]; erro?: string }> {
    if (!isSupabaseReady()) return { rows: [] };
    const { data, error } = await supabase.from('v_leads_descartados').select('*');
    if (error) { console.error('[commercialStore] listDescartados', error); return { rows: [], erro: error.message }; }
    return { rows: (data ?? []) as LeadDescartado[] };
  },
};
