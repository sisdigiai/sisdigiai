import { supabase } from './supabase';
import type {
  CompanyIdentity, CompanyContact, DigitalAsset, Tool,
  FinancialSnapshot, LegalStatus
} from './supabase';

const LS_KEY = 'digiai_company_data';

type LocalData = {
  identity: CompanyIdentity;
  contacts: CompanyContact[];
  digital_assets: DigitalAsset[];
  tools: Tool[];
  financial_snapshots: FinancialSnapshot[];
  legal_status: LegalStatus;
};

const emptyLocalData: LocalData = {
  identity: { nome_fantasia: 'DIGIAI' },
  contacts: [],
  digital_assets: [],
  tools: [],
  financial_snapshots: [],
  legal_status: {
    dpo_nomeado: false,
    politica_privacidade_publicada: false,
    tos_publicado: false,
    msa_template_pronto: false,
    dpa_template_pronto: false,
    advogado_revisao_feita: false,
    registro_operacoes_tratamento: false,
    canal_titular_ativo: false,
    plano_incidentes_pronto: false,
    criptografia_repouso: false,
    criptografia_transito: true,
    controle_acesso_minimo_privilegio: false,
    backup_definido: false,
    treinamento_lgpd_time: false,
  },
};

function readLocal(): LocalData {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return emptyLocalData;
    const parsed = JSON.parse(raw);
    return { ...emptyLocalData, ...parsed };
  } catch {
    return emptyLocalData;
  }
}

function writeLocal(data: LocalData) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

export const companyStore = {
  isOnline: isSupabaseReady,

  // ========== Identity (singleton) ==========
  async getIdentity(): Promise<CompanyIdentity> {
    if (!isSupabaseReady()) return readLocal().identity;
    const { data } = await supabase
      .from('v_company_identity')
      .select('*')
      .maybeSingle();
    return data || readLocal().identity;
  },

  async saveIdentity(identity: CompanyIdentity): Promise<void> {
    const data = readLocal();
    data.identity = identity;
    writeLocal(data);

    if (!isSupabaseReady()) return;
    const { data: existing } = await supabase
      .from('v_company_identity')
      .select('id')
      .maybeSingle();

    if (existing?.id) {
      await supabase.schema('company').from('identity')
        .update(identity).eq('id', existing.id);
    } else {
      await supabase.schema('company').from('identity').insert(identity);
    }
  },

  // ========== Contacts ==========
  async listContacts(): Promise<CompanyContact[]> {
    if (!isSupabaseReady()) return readLocal().contacts;
    const { data } = await supabase.from('v_company_contacts').select('*');
    return (data as CompanyContact[]) || [];
  },

  async upsertContact(c: CompanyContact): Promise<void> {
    const data = readLocal();
    if (c.id) {
      data.contacts = data.contacts.map(x => x.id === c.id ? c : x);
    } else {
      c.id = crypto.randomUUID();
      data.contacts.push(c);
    }
    writeLocal(data);

    if (!isSupabaseReady()) return;
    if (c.id) {
      await supabase.schema('company').from('contacts').upsert(c);
    } else {
      await supabase.schema('company').from('contacts').insert(c);
    }
  },

  async deleteContact(id: string): Promise<void> {
    const data = readLocal();
    data.contacts = data.contacts.filter(x => x.id !== id);
    writeLocal(data);

    if (!isSupabaseReady()) return;
    await supabase.schema('company').from('contacts')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },

  // ========== Digital Assets ==========
  async listDigitalAssets(): Promise<DigitalAsset[]> {
    if (!isSupabaseReady()) return readLocal().digital_assets;
    const { data } = await supabase.from('v_company_digital_assets').select('*');
    return (data as DigitalAsset[]) || [];
  },

  async upsertDigitalAsset(a: DigitalAsset): Promise<void> {
    const data = readLocal();
    if (a.id) {
      data.digital_assets = data.digital_assets.map(x => x.id === a.id ? a : x);
    } else {
      a.id = crypto.randomUUID();
      data.digital_assets.push(a);
    }
    writeLocal(data);

    if (!isSupabaseReady()) return;
    await supabase.schema('company').from('digital_assets').upsert(a);
  },

  async deleteDigitalAsset(id: string): Promise<void> {
    const data = readLocal();
    data.digital_assets = data.digital_assets.filter(x => x.id !== id);
    writeLocal(data);

    if (!isSupabaseReady()) return;
    await supabase.schema('company').from('digital_assets')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },

  // ========== Tools ==========
  async listTools(): Promise<Tool[]> {
    if (!isSupabaseReady()) return readLocal().tools;
    const { data } = await supabase.from('v_company_tools').select('*');
    return (data as Tool[]) || [];
  },

  async upsertTool(t: Tool): Promise<void> {
    const data = readLocal();
    if (t.id) {
      data.tools = data.tools.map(x => x.id === t.id ? t : x);
    } else {
      t.id = crypto.randomUUID();
      data.tools.push(t);
    }
    writeLocal(data);

    if (!isSupabaseReady()) return;
    await supabase.schema('company').from('tools').upsert(t);
  },

  async deleteTool(id: string): Promise<void> {
    const data = readLocal();
    data.tools = data.tools.filter(x => x.id !== id);
    writeLocal(data);

    if (!isSupabaseReady()) return;
    await supabase.schema('company').from('tools')
      .update({ deleted_at: new Date().toISOString() }).eq('id', id);
  },

  // ========== Financial snapshots ==========
  async listSnapshots(): Promise<FinancialSnapshot[]> {
    if (!isSupabaseReady()) return readLocal().financial_snapshots;
    const { data } = await supabase.from('v_company_financial_snapshots').select('*');
    return (data as FinancialSnapshot[]) || [];
  },

  async upsertSnapshot(s: FinancialSnapshot): Promise<void> {
    const data = readLocal();
    const existing = data.financial_snapshots.findIndex(x => x.month === s.month);
    if (existing >= 0) {
      data.financial_snapshots[existing] = s;
    } else {
      s.id = s.id || crypto.randomUUID();
      data.financial_snapshots.push(s);
    }
    writeLocal(data);

    if (!isSupabaseReady()) return;
    await supabase.schema('company').from('financial_snapshots')
      .upsert(s, { onConflict: 'month' });
  },

  // ========== Legal status (singleton) ==========
  async getLegalStatus(): Promise<LegalStatus> {
    if (!isSupabaseReady()) return readLocal().legal_status;
    const { data } = await supabase.from('v_company_legal_status').select('*').maybeSingle();
    return (data as LegalStatus) || readLocal().legal_status;
  },

  async saveLegalStatus(ls: LegalStatus): Promise<void> {
    const data = readLocal();
    data.legal_status = ls;
    writeLocal(data);

    if (!isSupabaseReady()) return;
    const { data: existing } = await supabase
      .from('v_company_legal_status').select('id').maybeSingle();
    if (existing?.id) {
      await supabase.schema('company').from('legal_status')
        .update(ls).eq('id', existing.id);
    } else {
      await supabase.schema('company').from('legal_status').insert(ls);
    }
  },

  // ========== Export / Snapshot ==========
  async exportJSON(): Promise<string> {
    const data: LocalData = {
      identity: await this.getIdentity(),
      contacts: await this.listContacts(),
      digital_assets: await this.listDigitalAssets(),
      tools: await this.listTools(),
      financial_snapshots: await this.listSnapshots(),
      legal_status: await this.getLegalStatus(),
    };
    return JSON.stringify(data, null, 2);
  },

  async exportMarkdown(): Promise<string> {
    const i = await this.getIdentity();
    const contacts = await this.listContacts();
    const digital = await this.listDigitalAssets();
    const tools = await this.listTools();
    const snapshots = await this.listSnapshots();
    const legal = await this.getLegalStatus();

    const lines: string[] = [];
    lines.push('# Cadastro Empresa — Snapshot');
    lines.push('');
    lines.push(`> Gerado em ${new Date().toLocaleString('pt-BR')} — fonte: ${isSupabaseReady() ? 'Supabase' : 'localStorage'}`);
    lines.push('');

    lines.push('## 1. Identidade Legal');
    lines.push(`- Razão Social: ${i.razao_social || '[não preenchido]'}`);
    lines.push(`- Nome Fantasia: ${i.nome_fantasia || '[não preenchido]'}`);
    lines.push(`- CNPJ: ${i.cnpj || '[não preenchido]'}`);
    lines.push(`- Forma Jurídica: ${i.forma_juridica || '[não preenchido]'}`);
    lines.push(`- Data Abertura: ${i.data_abertura || '[não preenchido]'}`);
    lines.push(`- Regime Tributário: ${i.regime_tributario || '[não preenchido]'}`);
    lines.push(`- CNAE Principal: ${i.cnae_principal_codigo || ''} ${i.cnae_principal_descricao || ''}`);
    lines.push(`- Endereço: ${[i.endereco_logradouro, i.endereco_numero, i.endereco_bairro, i.endereco_cidade, i.endereco_uf, i.endereco_cep].filter(Boolean).join(', ') || '[não preenchido]'}`);
    lines.push(`- Representante: ${i.representante_nome || '[não preenchido]'} (${i.representante_cpf || '[CPF não preenchido]'})`);
    lines.push('');

    lines.push('## 2. Contatos Profissionais');
    if (contacts.length === 0) lines.push('*Nenhum contato cadastrado*');
    else for (const c of contacts) {
      lines.push(`- **${c.tipo}** — ${c.nome} ${c.empresa ? `(${c.empresa})` : ''} · ${c.email || ''} · ${c.telefone || ''} · Custo: ${c.custo_mensal_brl ? 'R$' + c.custo_mensal_brl + '/mês' : 'sob demanda'}`);
    }
    lines.push('');

    lines.push('## 3. Identidade Digital');
    if (digital.length === 0) lines.push('*Nenhum ativo cadastrado*');
    else for (const d of digital) {
      lines.push(`- **${d.categoria}** — ${d.rotulo}: ${d.valor || '[não preenchido]'} · Status: ${d.status} · ${d.provider || ''}`);
    }
    lines.push('');

    lines.push('## 4. Ferramentas Pagas');
    if (tools.length === 0) lines.push('*Nenhuma ferramenta cadastrada*');
    else {
      lines.push('| Ferramenta | Categoria | Plano | Custo mensal | Status |');
      lines.push('|------------|-----------|-------|--------------|--------|');
      for (const t of tools) {
        const custo = t.custo_mensal_brl ? `R$ ${t.custo_mensal_brl.toFixed(2)}` : '—';
        lines.push(`| ${t.nome} | ${t.categoria} | ${t.plano || '—'} | ${custo} | ${t.status} |`);
      }
      const totalMensal = tools.filter(t => t.status === 'ativo' && t.custo_mensal_brl)
        .reduce((s, t) => s + (t.custo_mensal_brl || 0), 0);
      lines.push('');
      lines.push(`**Total mensal ativo:** R$ ${totalMensal.toFixed(2)}`);
    }
    lines.push('');

    lines.push('## 5. Financeiro');
    if (snapshots.length === 0) lines.push('*Nenhum snapshot cadastrado*');
    else {
      lines.push('| Mês | MRR | Custo total | Resultado | Clientes | Runway (saldo) |');
      lines.push('|-----|-----|-------------|-----------|----------|----------------|');
      for (const s of snapshots.slice(0, 12)) {
        const resultado = (s.mrr_total_brl + s.receita_unica_brl) - (s.custo_total_brl || 0);
        lines.push(`| ${s.month} | R$ ${s.mrr_total_brl.toFixed(2)} | R$ ${(s.custo_total_brl || 0).toFixed(2)} | R$ ${resultado.toFixed(2)} | ${s.clientes_pagantes} | R$ ${(s.saldo_conta_pj_brl || 0).toFixed(2)} |`);
      }
    }
    lines.push('');

    lines.push('## 6. Status LGPD e Jurídico');
    lines.push(`- DPO nomeado: ${legal.dpo_nomeado ? '✓ ' + (legal.dpo_nome || '') : '✗ pendente'}`);
    lines.push(`- Política de Privacidade publicada: ${legal.politica_privacidade_publicada ? '✓' : '✗'}`);
    lines.push(`- Termos de Uso publicados: ${legal.tos_publicado ? '✓' : '✗'}`);
    lines.push(`- MSA template pronto: ${legal.msa_template_pronto ? '✓' : '✗'}`);
    lines.push(`- DPA template pronto: ${legal.dpa_template_pronto ? '✓' : '✗'}`);
    lines.push(`- Advogado revisou: ${legal.advogado_revisao_feita ? '✓' : '✗'}`);
    lines.push(`- Canal do titular ativo: ${legal.canal_titular_ativo ? '✓' : '✗'}`);
    lines.push(`- Plano de incidentes pronto: ${legal.plano_incidentes_pronto ? '✓' : '✗'}`);
    lines.push(`- Criptografia em repouso: ${legal.criptografia_repouso ? '✓' : '✗'}`);
    lines.push(`- Backup definido: ${legal.backup_definido ? '✓' : '✗'}`);

    return lines.join('\n');
  },

  async downloadExport(format: 'json' | 'md') {
    const content = format === 'json' ? await this.exportJSON() : await this.exportMarkdown();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cadastro-empresa-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
