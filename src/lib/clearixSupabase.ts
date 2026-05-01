import { createClient, type SupabaseClient } from '@supabase/supabase-js';

// Segundo cliente Supabase — banco do ecossistema Clearix (crm_erp).
// Isolado do cliente principal do DigiAI via `storageKey` próprio,
// para permitir duas sessões simultâneas no mesmo navegador.
//
// Padrão C11 (Zero Trust): só chave `anon` no frontend; escritas
// passam por RPCs `rpc_iam_*` SECURITY DEFINER que checam `is_super_admin()`.

const url = import.meta.env.VITE_CLEARIX_SUPABASE_URL;
const anonKey = import.meta.env.VITE_CLEARIX_SUPABASE_ANON_KEY;

export const clearixConfigured =
  !!url &&
  !!anonKey &&
  !url.includes('placeholder') &&
  !anonKey.includes('placeholder');

if (!clearixConfigured) {
  console.warn(
    '[clearixSupabase] VITE_CLEARIX_SUPABASE_URL ou VITE_CLEARIX_SUPABASE_ANON_KEY não definidos. ' +
    'Copie .env.example para .env e preencha os valores do projeto Clearix (mhgbuplnxtfgipbemchb).'
  );
}

export const clearixSupabase: SupabaseClient = createClient(
  url || 'https://placeholder.supabase.co',
  anonKey || 'placeholder-key',
  {
    auth: {
      storageKey: 'digiai.clearix.auth',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

// --------- Types das views públicas do Clearix ---------

export type ClearixPackage = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  target_audience: string | null;
  base_price_monthly: number | null;
  max_stores: number | null;
  max_users: number | null;
  max_patients: number | null;
  max_orders_per_month: number | null;
  is_demo: boolean;
  sort_order: number;
  apps: Array<{ slug: string; name: string; category: string | null }> | null;
};

export type ClearixAddon = {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  description: string | null;
  pricing_model: 'one_time' | 'monthly' | 'custom' | string;
  base_price: number | null;
  min_package_slug: string | null;
  min_package_name: string | null;
  min_package_sort: number | null;
  requires_review: boolean;
  unlocks_app_slug: string | null;
  is_active: boolean;
  sort_order: number;
};

export type ClearixApp = {
  slug: string;
  name: string;
  category: string | null;
  description: string | null;
  sort_order: number;
};

export type TenantAddonEntry = {
  addon_slug: string;
  addon_name: string;
  status: 'pending_review' | 'active' | 'cancelled';
  custom_price: number | null;
  activated_at: string | null;
  notes: string | null;
};

export type TenantCatalogRow = {
  tenant_id: string;
  tenant_name: string;
  tenant_status: 'active' | 'suspended' | 'cancelled' | string;
  package_slug: string | null;
  package_name: string | null;
  package_sort: number | null;
  addons: TenantAddonEntry[];
  tenant_cnpj: string | null;
  suspended_at: string | null;
  suspended_reason: string | null;
  suspended_by: string | null;
};

export type TenantSummary = {
  id: string;
  business_name: string;
  document_cnpj: string | null;
  status: string;
  created_at: string;
};

export type PackageChangeRequest = {
  id: string;
  tenant_id: string;
  tenant_name: string;
  current_package_slug: string | null;
  requested_package_slug: string;
  requested_package_name: string | null;
  requested_package_price: number | null;
  reason: string | null;
  status: 'pending' | 'approved' | 'rejected' | 'cancelled';
  requested_by: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_notes: string | null;
  created_at: string;
  updated_at: string;
};

// --------- Helpers ---------

export type ClearixJwtPayload = {
  sub?: string;
  email?: string;
  role_code?: string;
};

export function decodeClearixJwt(accessToken: string | null): ClearixJwtPayload | null {
  if (!accessToken) return null;
  try {
    const payload = accessToken.split('.')[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(json) as ClearixJwtPayload;
  } catch {
    return null;
  }
}
