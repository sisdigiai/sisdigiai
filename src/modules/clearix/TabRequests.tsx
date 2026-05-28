import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, CheckCircle2, XCircle, ArrowRight } from 'lucide-react';
import {
  listTenantCatalog,
  listPackageChangeRequests,
  approveTenantAddon,
  cancelTenantAddon,
  approvePackageChangeRequest,
  rejectPackageChangeRequest,
} from './api';
import type { TenantCatalogRow, PackageChangeRequest } from '../../lib/clearixSupabase';

type AddonRequestRow = {
  tenant_id: string;
  tenant_name: string;
  addon_slug: string;
  addon_name: string;
  notes: string | null;
};

type Props = {
  onSelectTenant: (tenantId: string) => void;
};

function formatDate(iso: string | null | undefined) {
  if (!iso) return '';
  try {
    return new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(iso));
  } catch {
    return iso ?? '';
  }
}

export default function TabRequests({ onSelectTenant }: Props) {
  const [catalog, setCatalog] = useState<TenantCatalogRow[]>([]);
  const [pkgRequests, setPkgRequests] = useState<PackageChangeRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [notesDraft, setNotesDraft] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, pkgs] = await Promise.all([listTenantCatalog(), listPackageChangeRequests()]);
      setCatalog(cat);
      setPkgRequests(pkgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const addonRequests: AddonRequestRow[] = useMemo(() => {
    const out: AddonRequestRow[] = [];
    for (const t of catalog) {
      for (const a of t.addons) {
        if (a.status === 'pending_review') {
          out.push({
            tenant_id: t.tenant_id,
            tenant_name: t.tenant_name,
            addon_slug: a.addon_slug,
            addon_name: a.addon_name,
            notes: a.notes,
          });
        }
      }
    }
    return out;
  }, [catalog]);

  const pendingPkgRequests = useMemo(
    () => pkgRequests.filter((r) => r.status === 'pending'),
    [pkgRequests]
  );

  const historyPkgRequests = useMemo(
    () => pkgRequests.filter((r) => r.status !== 'pending'),
    [pkgRequests]
  );

  const wrapAction = async (key: string, fn: () => Promise<unknown>) => {
    setBusy(key);
    try {
      await fn();
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-medium text-on-surface">Solicitações</div>
          <div className="text-xs text-on-surface-variant mt-0.5">
            {addonRequests.length} add-on{addonRequests.length === 1 ? '' : 's'} em análise ·{' '}
            {pendingPkgRequests.length} mudança{pendingPkgRequests.length === 1 ? '' : 's'} de pacote pendente{pendingPkgRequests.length === 1 ? '' : 's'}
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs border border-outline/10 bg-surface-lowest px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:border-outline/30"
        >
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      {error && (
        <div className="border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">{error}</div>
      )}

      <section className="space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
          Add-ons pendentes de aprovação
        </div>
        {loading ? (
          <div className="text-sm text-on-surface-variant">Carregando…</div>
        ) : addonRequests.length === 0 ? (
          <div className="border border-outline/10 bg-surface-low p-6 text-center text-sm text-on-surface-variant">
            Nada pendente.
          </div>
        ) : (
          <div className="border border-outline/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-low text-[10px] uppercase tracking-widest text-on-surface-variant font-mono">
                  <th className="text-left px-3 py-2">Tenant</th>
                  <th className="text-left px-3 py-2">Add-on</th>
                  <th className="text-left px-3 py-2">Observações do tenant</th>
                  <th className="px-3 py-2 text-right">Ações</th>
                </tr>
              </thead>
              <tbody>
                {addonRequests.map((r) => {
                  const key = `${r.tenant_id}:${r.addon_slug}`;
                  const isBusy = busy === key;
                  return (
                    <tr key={key} className="border-t border-outline/10">
                      <td className="px-3 py-2.5">
                        <button
                          onClick={() => onSelectTenant(r.tenant_id)}
                          className="text-on-surface hover:text-secondary text-left"
                        >
                          {r.tenant_name}
                        </button>
                      </td>
                      <td className="px-3 py-2.5">
                        <div className="text-on-surface">{r.addon_name}</div>
                        <div className="text-[11px] font-mono text-muted">{r.addon_slug}</div>
                      </td>
                      <td className="px-3 py-2.5 text-xs text-on-surface-variant max-w-md">
                        {r.notes || <span className="text-muted italic">—</span>}
                      </td>
                      <td className="px-3 py-2.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => wrapAction(key, () => approveTenantAddon(r.tenant_id, r.addon_slug))}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 text-[11px] border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          <CheckCircle2 size={11} /> Aprovar
                        </button>
                        <button
                          onClick={() => wrapAction(key, () => cancelTenantAddon(r.tenant_id, r.addon_slug))}
                          disabled={isBusy}
                          className="inline-flex items-center gap-1 text-[11px] border border-rose-500/30 bg-rose-500/5 px-2 py-1 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          <XCircle size={11} /> Rejeitar
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
          Mudanças de pacote pendentes
        </div>
        {loading ? null : pendingPkgRequests.length === 0 ? (
          <div className="border border-outline/10 bg-surface-low p-6 text-center text-sm text-on-surface-variant">
            Nada pendente.
          </div>
        ) : (
          <div className="space-y-2">
            {pendingPkgRequests.map((r) => {
              const busyKey = `pkg:${r.id}`;
              const isBusy = busy === busyKey;
              const note = notesDraft[r.id] ?? '';
              return (
                <div key={r.id} className="border border-outline/10 bg-surface-low p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <button
                        onClick={() => onSelectTenant(r.tenant_id)}
                        className="text-sm text-on-surface hover:text-secondary"
                      >
                        {r.tenant_name}
                      </button>
                      <div className="flex items-center gap-2 mt-1 text-xs text-on-surface-variant">
                        <span className="font-mono text-muted">{r.current_package_slug ?? '—'}</span>
                        <ArrowRight size={12} className="text-muted" />
                        <span className="text-on-surface">{r.requested_package_name}</span>
                        <span className="text-muted">({r.requested_package_slug})</span>
                      </div>
                      {r.reason && (
                        <div className="mt-2 text-xs text-on-surface-variant max-w-2xl">
                          <span className="text-muted">Motivo:</span> {r.reason}
                        </div>
                      )}
                      <div className="mt-1 text-[11px] text-muted">
                        Solicitado em {formatDate(r.created_at)}
                      </div>
                    </div>
                    <div className="shrink-0 flex flex-col gap-1.5 w-64">
                      <input
                        value={note}
                        onChange={(e) => setNotesDraft((d) => ({ ...d, [r.id]: e.target.value }))}
                        placeholder="Observações (opcional)"
                        className="w-full bg-surface-lowest border border-outline/30 px-2 py-1 text-xs text-on-surface focus:outline-none focus:border-secondary/40"
                      />
                      <div className="flex gap-1.5">
                        <button
                          onClick={() => wrapAction(busyKey, () => approvePackageChangeRequest(r.id, note || null))}
                          disabled={isBusy}
                          className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          <CheckCircle2 size={11} /> Aprovar
                        </button>
                        <button
                          onClick={() => wrapAction(busyKey, () => rejectPackageChangeRequest(r.id, note || null))}
                          disabled={isBusy}
                          className="flex-1 inline-flex items-center justify-center gap-1 text-[11px] border border-rose-500/30 bg-rose-500/5 px-2 py-1 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          <XCircle size={11} /> Rejeitar
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {historyPkgRequests.length > 0 && (
        <section className="space-y-3">
          <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">
            Histórico de mudanças de pacote
          </div>
          <div className="border border-outline/10 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-surface-low text-[10px] uppercase tracking-widest text-on-surface-variant font-mono">
                  <th className="text-left px-3 py-2">Tenant</th>
                  <th className="text-left px-3 py-2">De → Para</th>
                  <th className="text-left px-3 py-2">Status</th>
                  <th className="text-left px-3 py-2">Decidido em</th>
                  <th className="text-left px-3 py-2">Notas</th>
                </tr>
              </thead>
              <tbody>
                {historyPkgRequests.slice(0, 30).map((r) => (
                  <tr key={r.id} className="border-t border-outline/10">
                    <td className="px-3 py-2.5 text-on-surface">{r.tenant_name}</td>
                    <td className="px-3 py-2.5 text-xs text-on-surface-variant font-mono">
                      {r.current_package_slug ?? '—'} → {r.requested_package_slug}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="text-[10px] font-mono uppercase px-1.5 py-0.5 border border-outline/10 text-on-surface-variant">
                        {r.status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-on-surface-variant">{formatDate(r.reviewed_at)}</td>
                    <td className="px-3 py-2.5 text-xs text-on-surface-variant max-w-sm">{r.reviewer_notes ?? ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
