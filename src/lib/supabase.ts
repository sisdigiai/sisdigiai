import { createClient } from '@supabase/supabase-js';

export type UserRole = 'super_admin' | 'admin' | 'founder' | 'staff' | 'viewer';

export const ROLE_HIERARCHY: Record<UserRole, number> = {
  super_admin: 100,
  founder: 100,
  admin: 80,
  staff: 50,
  viewer: 10,
};

export function hasRole(userRole: UserRole | null, minRole: UserRole): boolean {
  if (!userRole) return false;
  return ROLE_HIERARCHY[userRole] >= ROLE_HIERARCHY[minRole];
}

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn(
    '[supabase] VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY not set. ' +
    'Copy .env.example to .env and fill in the values.'
  );
}

export const supabase = createClient(
  supabaseUrl || 'https://placeholder.supabase.co',
  supabaseAnonKey || 'placeholder-key'
);

export type CompanyIdentity = {
  id?: string;
  razao_social?: string | null;
  nome_fantasia?: string | null;
  cnpj?: string | null;
  inscricao_estadual?: string | null;
  inscricao_municipal?: string | null;
  forma_juridica?: 'MEI' | 'LTDA' | 'EIRELI' | 'SA' | 'SLU' | 'outro' | null;
  natureza_juridica?: string | null;
  data_abertura?: string | null;
  capital_social?: number | null;
  endereco_logradouro?: string | null;
  endereco_numero?: string | null;
  endereco_complemento?: string | null;
  endereco_bairro?: string | null;
  endereco_cep?: string | null;
  endereco_cidade?: string | null;
  endereco_uf?: string | null;
  regime_tributario?: 'simples_nacional' | 'lucro_presumido' | 'lucro_real' | 'mei' | null;
  simples_anexo?: string | null;
  aliquota_estimada?: number | null;
  cnae_principal_codigo?: string | null;
  cnae_principal_descricao?: string | null;
  cnaes_secundarios?: Array<{ codigo: string; descricao: string }>;
  certificado_digital_tipo?: 'A1' | 'A3' | 'nao_possui' | null;
  certificado_digital_vencimento?: string | null;
  representante_nome?: string | null;
  representante_cpf?: string | null;
  representante_rg?: string | null;
  representante_email?: string | null;
  notes?: string | null;
};

export type CompanyContact = {
  id?: string;
  tipo: 'contador' | 'advogado_tech' | 'advogado_lgpd' | 'consultor_tributario' | 'consultor_tecnico' | 'outro';
  nome: string;
  empresa?: string | null;
  email?: string | null;
  telefone?: string | null;
  whatsapp?: string | null;
  custo_mensal_brl?: number | null;
  custo_hora_brl?: number | null;
  modelo_cobranca?: 'mensal' | 'hora' | 'projeto' | 'sob_demanda' | null;
  observacoes?: string | null;
  ativo: boolean;
};

export type DigitalAsset = {
  id?: string;
  categoria: 'dominio' | 'email_corporativo' | 'site' | 'landing_page' | 'linkedin' | 'instagram' | 'youtube' | 'tiktok' | 'twitter' | 'github' | 'outro';
  rotulo: string;
  valor?: string | null;
  owner_product?: string | null;
  status: 'ativo' | 'a_registrar' | 'registrado_sem_uso' | 'arquivado';
  provider?: string | null;
  custo_mensal_brl?: number | null;
  custo_anual_brl?: number | null;
  vencimento?: string | null;
  observacoes?: string | null;
};

export type Tool = {
  id?: string;
  nome: string;
  categoria: 'infraestrutura' | 'ia' | 'email' | 'financeiro' | 'crm' | 'marketing' | 'juridico' | 'colaboracao' | 'design' | 'monitoramento' | 'outro';
  owner_product?: string | null;
  plano?: string | null;
  custo_mensal_brl?: number | null;
  custo_anual_brl?: number | null;
  moeda: 'BRL' | 'USD' | 'EUR';
  data_inicio?: string | null;
  proximo_vencimento?: string | null;
  renovacao_automatica?: boolean;
  url_dashboard?: string | null;
  email_conta?: string | null;
  status: 'ativo' | 'avaliando' | 'cancelado' | 'congelado';
  observacoes?: string | null;
};

export type FinancialSnapshot = {
  id?: string;
  month: string;
  mrr_total_brl: number;
  receita_unica_brl: number;
  custo_infra_brl: number;
  custo_ferramentas_brl: number;
  custo_pessoas_brl: number;
  custo_outros_brl: number;
  custo_total_brl?: number;
  saldo_conta_pj_brl?: number | null;
  investimento_acumulado_brl?: number | null;
  clientes_pagantes: number;
  clientes_trial: number;
  leads_qualificados: number;
  demos_agendadas: number;
  observacoes?: string | null;
};

export type LegalStatus = {
  id?: string;
  dpo_nomeado: boolean;
  dpo_nome?: string | null;
  dpo_email?: string | null;
  dpo_telefone?: string | null;
  dpo_nomeado_em?: string | null;
  politica_privacidade_publicada: boolean;
  politica_privacidade_url?: string | null;
  politica_privacidade_versao?: string | null;
  politica_privacidade_publicada_em?: string | null;
  tos_publicado: boolean;
  tos_url?: string | null;
  tos_versao?: string | null;
  tos_publicado_em?: string | null;
  msa_template_pronto: boolean;
  msa_template_url?: string | null;
  dpa_template_pronto: boolean;
  dpa_template_url?: string | null;
  advogado_revisao_feita: boolean;
  advogado_revisao_data?: string | null;
  registro_operacoes_tratamento: boolean;
  canal_titular_ativo: boolean;
  plano_incidentes_pronto: boolean;
  criptografia_repouso: boolean;
  criptografia_transito: boolean;
  controle_acesso_minimo_privilegio: boolean;
  backup_definido: boolean;
  treinamento_lgpd_time: boolean;
  observacoes?: string | null;
};
