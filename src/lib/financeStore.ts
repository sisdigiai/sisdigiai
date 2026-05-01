import { supabase } from './supabase';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

// ========== Types ==========

export type ExpenseCategory =
  | 'infra_cloud' | 'ai_api' | 'dev_tools' | 'hardware'
  | 'personnel' | 'legal_accounting' | 'marketing' | 'education'
  | 'payments_gateway' | 'integrations_sector' | 'other';

export const CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  infra_cloud: 'Infra & Cloud',
  ai_api: 'APIs de IA',
  dev_tools: 'Ferramentas Dev',
  hardware: 'Hardware',
  personnel: 'Pessoal',
  legal_accounting: 'Jurídico & Contábil',
  marketing: 'Marketing',
  education: 'Educação',
  payments_gateway: 'Gateway Pagamento',
  integrations_sector: 'Integrações Setor',
  other: 'Outros',
};

export const CATEGORY_COLORS: Record<ExpenseCategory, string> = {
  infra_cloud: '#3b82f6',
  ai_api: '#8b5cf6',
  dev_tools: '#06b6d4',
  hardware: '#f59e0b',
  personnel: '#ef4444',
  legal_accounting: '#6366f1',
  marketing: '#ec4899',
  education: '#14b8a6',
  payments_gateway: '#f97316',
  integrations_sector: '#84cc16',
  other: '#64748b',
};

export type Product = {
  id: string;
  name: string;
  is_active: boolean;
  sort_order: number;
};

export type Vendor = {
  id: string;
  slug: string;
  name: string;
  category: string;
  billing_currency: string;
  website?: string;
  is_active: boolean;
};

export type Expense = {
  id: string;
  product_id: string;
  product_name: string;
  vendor_id?: string;
  vendor_slug?: string;
  vendor_name?: string;
  category: ExpenseCategory;
  category_label: string;
  kind: 'subscription' | 'one_time';
  description: string;
  month: string;
  amount_brl: number;
  amount_original?: number;
  original_currency?: string;
  exchange_rate?: number;
  invoice_ref?: string;
  notes?: string;
  created_at: string;
};

export type Subscription = {
  id: string;
  vendor_id: string;
  vendor_slug: string;
  vendor_name: string;
  product_id: string;
  product_name: string;
  plan_name: string;
  monthly_amount_brl: number;
  started_on: string;
  ended_on?: string;
  is_active: boolean;
  notes?: string;
};

export type VendorSpend = {
  vendor_id: string;
  slug: string;
  name: string;
  category: string;
  total_items: number;
  total_brl: number;
  first_month?: string;
  last_month?: string;
};

export type MonthlyByCategory = {
  month: string;
  category: string;
  items: number;
  total_brl: number;
};

export type FounderTime = {
  month: string;
  hours_worked: number;
  hourly_rate_brl: number;
  valued_amount_brl: number;
  product_allocation: Record<string, number>;
  notes?: string;
};

// ========== Store ==========

export const financeStore = {
  isOnline: isSupabaseReady,

  // --- Products (via public view) ---
  async listProducts(): Promise<Product[]> {
    if (!isSupabaseReady()) return [];
    const { data } = await supabase
      .from('v_finance_products')
      .select('*');
    return (data as any[]) || [];
  },

  // --- Vendors (via public view) ---
  async listVendors(): Promise<Vendor[]> {
    if (!isSupabaseReady()) return [];
    const { data } = await supabase
      .from('v_finance_vendors')
      .select('*');
    return (data as any[]) || [];
  },

  // --- Expenses (via view) ---
  async listExpenses(limit = 200): Promise<Expense[]> {
    if (!isSupabaseReady()) return [];
    const { data } = await supabase
      .from('v_finance_expenses')
      .select('*')
      .limit(limit);
    return (data as any[]) || [];
  },

  // --- Monthly by category (view) ---
  async listMonthlyByCategory(): Promise<MonthlyByCategory[]> {
    if (!isSupabaseReady()) return [];
    const { data } = await supabase
      .from('v_finance_monthly_by_category')
      .select('*');
    return (data as any[]) || [];
  },

  // --- Subscriptions (view) ---
  async listSubscriptions(): Promise<Subscription[]> {
    if (!isSupabaseReady()) return [];
    const { data } = await supabase
      .from('v_finance_subscriptions_active')
      .select('*');
    return (data as any[]) || [];
  },

  // --- Vendor spend (view) ---
  async listVendorSpend(): Promise<VendorSpend[]> {
    if (!isSupabaseReady()) return [];
    const { data } = await supabase
      .from('v_finance_vendor_spend')
      .select('*');
    return (data as any[]) || [];
  },

  // --- Clearix investment total (view) ---
  async getClearixInvestment(): Promise<{ total_investido_brl: number; por_categoria: Record<string, number> } | null> {
    if (!isSupabaseReady()) return null;
    const { data } = await supabase
      .from('v_finance_clearix_investment_total')
      .select('*')
      .maybeSingle();
    return data as any;
  },

  // --- Founder time (view) ---
  async listFounderTime(): Promise<FounderTime[]> {
    if (!isSupabaseReady()) return [];
    const { data } = await supabase
      .from('v_finance_founder_time_summary')
      .select('*');
    return (data as any[]) || [];
  },

  // --- RPCs ---
  async addExpense(params: {
    product_id: string;
    vendor_id?: string;
    category: ExpenseCategory;
    kind: 'subscription' | 'one_time';
    description: string;
    month: string;
    amount_brl: number;
    amount_original?: number;
    original_currency?: string;
    exchange_rate?: number;
    invoice_ref?: string;
    notes?: string;
  }): Promise<string | null> {
    if (!isSupabaseReady()) return null;
    const { data, error } = await supabase.rpc('rpc_finance_add_expense', {
      p_product_id: params.product_id,
      p_vendor_id: params.vendor_id || null,
      p_category: params.category,
      p_kind: params.kind,
      p_description: params.description,
      p_month: params.month,
      p_amount_brl: params.amount_brl,
      p_amount_original: params.amount_original || null,
      p_original_currency: params.original_currency || null,
      p_exchange_rate: params.exchange_rate || null,
      p_invoice_ref: params.invoice_ref || null,
      p_notes: params.notes || null,
    });
    if (error) throw error;
    return data;
  },

  async addSubscription(params: {
    vendor_id: string;
    product_id: string;
    plan_name: string;
    monthly_amount_brl: number;
    started_on: string;
    notes?: string;
  }): Promise<string | null> {
    if (!isSupabaseReady()) return null;
    const { data, error } = await supabase.rpc('rpc_finance_add_subscription', {
      p_vendor_id: params.vendor_id,
      p_product_id: params.product_id,
      p_plan_name: params.plan_name,
      p_monthly_amount_brl: params.monthly_amount_brl,
      p_started_on: params.started_on,
      p_notes: params.notes || null,
    });
    if (error) throw error;
    return data;
  },

  async closeSubscription(id: string, endedOn?: string): Promise<void> {
    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('rpc_finance_close_subscription', {
      p_subscription_id: id,
      p_ended_on: endedOn || new Date().toISOString().slice(0, 10),
    });
    if (error) throw error;
  },

  async registerMonthFromSubscriptions(month?: string): Promise<number> {
    if (!isSupabaseReady()) return 0;
    const m = month || new Date().toISOString().slice(0, 7) + '-01';
    const { data, error } = await supabase.rpc('rpc_finance_register_month_from_subscriptions', {
      p_month: m,
    });
    if (error) throw error;
    return data || 0;
  },

  async deleteExpense(id: string): Promise<void> {
    if (!isSupabaseReady()) return;
    const { error } = await supabase.rpc('rpc_finance_soft_delete_expense' as any, {
      p_expense_id: id,
    });
    if (error) throw error;
  },

  // --- CSV export for pitch ---
  async exportClearixCSV(): Promise<string> {
    const expenses = await this.listExpenses(5000);
    const clearixExpenses = expenses.filter(e => e.product_id === 'clearix' || e.product_id === 'compartilhado');

    const catTotals: Record<string, number> = {};
    for (const e of clearixExpenses) {
      catTotals[e.category] = (catTotals[e.category] || 0) + e.amount_brl;
    }

    let csv = 'categoria,label,total_brl\n';
    for (const [cat, total] of Object.entries(catTotals).sort((a, b) => b[1] - a[1])) {
      csv += `${cat},${CATEGORY_LABELS[cat as ExpenseCategory] || cat},${total.toFixed(2)}\n`;
    }

    const grand = Object.values(catTotals).reduce((a, b) => a + b, 0);
    csv += `TOTAL,Total Investido,${grand.toFixed(2)}\n`;
    return csv;
  },
};
