import { supabase } from './supabase';

// Control plane de cobrança recorrente do Clearix (Mercado Pago).
// Lê das views públicas v_billing_*; escreve via RPC public.billing_upsert_subscriber.

export type DunningStage = 'em_dia' | 'aviso' | 'restrito' | 'bloqueio' | 'suspenso';

export type BillingSubscriber = {
  id: string;
  product: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  plan_name: string | null;
  plan_amount_brl: number | null;
  status: string;
  dunning_stage: DunningStage;
  started_on: string | null;
  last_paid_on: string | null;
  next_due_on: string | null;
  tenant_ref: string | null;
  dias_atraso: number | null;
  updated_at: string;
};

export type BillingMrr = { mrr_brl: number; ativos: number; inadimplentes: number };

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

export const billingStore = {
  isOnline: isSupabaseReady,

  async list(): Promise<BillingSubscriber[]> {
    if (!isSupabaseReady()) return [];
    const { data, error } = await supabase
      .from('v_billing_subscriptions')
      .select('*')
      .order('dias_atraso', { ascending: false, nullsFirst: false });
    if (error) {
      console.error('[billingStore] list', error);
      return [];
    }
    return (data as BillingSubscriber[]) || [];
  },

  async mrr(): Promise<BillingMrr | null> {
    if (!isSupabaseReady()) return null;
    const { data, error } = await supabase.from('v_billing_mrr').select('*').maybeSingle();
    if (error) {
      console.error('[billingStore] mrr', error);
      return null;
    }
    return (data as BillingMrr) || null;
  },

  async upsert(patch: Partial<BillingSubscriber>): Promise<boolean> {
    if (!isSupabaseReady()) return false;
    const { error } = await supabase.rpc('billing_upsert_subscriber', { p_patch: patch });
    if (error) {
      console.error('[billingStore] upsert', error);
      return false;
    }
    return true;
  },
};
