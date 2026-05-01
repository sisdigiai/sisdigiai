import {
  clearixSupabase,
  type ClearixPackage,
  type ClearixAddon,
  type ClearixApp,
  type TenantCatalogRow,
  type TenantSummary,
  type PackageChangeRequest,
} from '../../lib/clearixSupabase';

// ------- Leituras via views -------

export async function listPackages(): Promise<ClearixPackage[]> {
  const { data, error } = await clearixSupabase
    .from('v_clearix_packages')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClearixPackage[];
}

export async function listAddons(): Promise<ClearixAddon[]> {
  const { data, error } = await clearixSupabase
    .from('v_clearix_addons')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClearixAddon[];
}

export async function listApps(): Promise<ClearixApp[]> {
  const { data, error } = await clearixSupabase
    .from('v_clearix_apps')
    .select('*')
    .order('sort_order', { ascending: true });
  if (error) throw error;
  return (data ?? []) as ClearixApp[];
}

export async function listTenantCatalog(): Promise<TenantCatalogRow[]> {
  const { data, error } = await clearixSupabase
    .from('v_admin_tenant_catalog')
    .select('*')
    .order('package_sort', { ascending: true, nullsFirst: false })
    .order('tenant_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TenantCatalogRow[];
}

export async function listTenantSummaries(): Promise<TenantSummary[]> {
  const { data, error } = await clearixSupabase
    .from('v_iam_tenants')
    .select('*')
    .order('business_name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as TenantSummary[];
}

export async function listPackageChangeRequests(): Promise<PackageChangeRequest[]> {
  const { data, error } = await clearixSupabase
    .from('v_admin_package_change_requests')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as PackageChangeRequest[];
}

// ------- Escritas via RPCs (SECURITY DEFINER, guard is_super_admin) -------

export type CreateTenantInput = {
  name: string;
  cnpj: string;
  package_slug: string;
  create_default_store?: boolean;
};

export async function createTenantWithPackage(
  input: CreateTenantInput
): Promise<{ tenant_id: string; package_slug: string }> {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_create_tenant_with_package', {
    p_name: input.name,
    p_cnpj: input.cnpj,
    p_package_slug: input.package_slug,
    p_create_default_store: input.create_default_store ?? true,
  });
  if (error) throw error;
  const res = (data ?? {}) as { tenant_id?: string; package_slug?: string };
  if (!res.tenant_id) {
    throw new Error('rpc_iam_create_tenant_with_package não retornou tenant_id');
  }
  return { tenant_id: res.tenant_id, package_slug: res.package_slug ?? input.package_slug };
}

export async function suspendTenant(tenantId: string, reason: string) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_suspend_tenant', {
    p_tenant_id: tenantId,
    p_reason: reason,
  });
  if (error) throw error;
  return data;
}

export async function reactivateTenant(tenantId: string, notes?: string | null) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_reactivate_tenant', {
    p_tenant_id: tenantId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data;
}

export async function forceChangePackage(
  tenantId: string,
  packageSlug: string,
  reason: string
) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_force_change_package', {
    p_tenant_id: tenantId,
    p_package_slug: packageSlug,
    p_reason: reason,
  });
  if (error) throw error;
  return data as {
    tenant_id: string;
    previous_package: string | null;
    new_package: string;
    direction: 'assign' | 'upgrade' | 'downgrade' | 'same';
  };
}

export async function assignTenantPackage(tenantId: string, packageSlug: string) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_assign_tenant_package', {
    p_tenant_id: tenantId,
    p_package_slug: packageSlug,
  });
  if (error) throw error;
  return data;
}

export async function assignTenantAddon(
  tenantId: string,
  addonSlug: string,
  customPrice?: number | null,
  notes?: string | null
) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_assign_tenant_addon', {
    p_tenant_id: tenantId,
    p_addon_slug: addonSlug,
    p_custom_price: customPrice ?? null,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data;
}

export async function approveTenantAddon(
  tenantId: string,
  addonSlug: string,
  customPrice?: number | null
) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_approve_tenant_addon', {
    p_tenant_id: tenantId,
    p_addon_slug: addonSlug,
    p_custom_price: customPrice ?? null,
  });
  if (error) throw error;
  return data;
}

export async function cancelTenantAddon(tenantId: string, addonSlug: string) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_cancel_tenant_addon', {
    p_tenant_id: tenantId,
    p_addon_slug: addonSlug,
  });
  if (error) throw error;
  return data;
}

export async function approvePackageChangeRequest(
  requestId: string,
  notes?: string | null
) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_approve_package_change_request', {
    p_request_id: requestId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data;
}

export async function rejectPackageChangeRequest(
  requestId: string,
  notes?: string | null
) {
  const { data, error } = await clearixSupabase.rpc('rpc_iam_reject_package_change_request', {
    p_request_id: requestId,
    p_notes: notes ?? null,
  });
  if (error) throw error;
  return data;
}
