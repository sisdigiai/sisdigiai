import { useEffect, useState } from 'react';
import {
  ArrowLeft, RefreshCw, CheckCircle2, XCircle, Plus, Ban, PlayCircle,
  Shuffle, AlertTriangle, X,
} from 'lucide-react';
import {
  listPackages,
  listAddons,
  listTenantCatalog,
  assignTenantAddon,
  approveTenantAddon,
  cancelTenantAddon,
  suspendTenant,
  reactivateTenant,
  forceChangePackage,
} from './api';
import type {
  ClearixPackage,
  ClearixAddon,
  TenantCatalogRow,
  TenantAddonEntry,
} from '../../lib/clearixSupabase';

type Props = {
  tenantId: string;
  onBack: () => void;
};

const ADDON_STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  pending_review: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  cancelled: 'bg-surface-low text-muted border-outline/10',
};

function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));
}

type ModalKind = 'suspend' | 'reactivate' | 'change_package' | null;

export default function TabTenantDetail({ tenantId, onBack }: Props) {
  const [tenant, setTenant] = useState<TenantCatalogRow | null>(null);
  const [packages, setPackages] = useState<ClearixPackage[]>([]);
  const [addons, setAddons] = useState<ClearixAddon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyAddon, setBusyAddon] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalKind>(null);
  const [modalBusy, setModalBusy] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [suspendReason, setSuspendReason] = useState('');
  const [reactivateNotes, setReactivateNotes] = useState('');
  const [changeSlug, setChangeSlug] = useState('');
  const [changeReason, setChangeReason] = useState('');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, pkgs, ads] = await Promise.all([listTenantCatalog(), listPackages(), listAddons()]);
      setTenant(cat.find((t) => t.tenant_id === tenantId) ?? null);
      setPackages(pkgs);
      setAddons(ads);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [tenantId]);

  const activePackage = packages.find((p) => p.slug === tenant?.package_slug) ?? null;

  const tenantBySlug = new Map(
    (tenant?.addons ?? []).map((a) => [a.addon_slug, a] as [string, TenantAddonEntry])
  );

  const handleAssign = async (slug: string) => {
    setBusyAddon(slug);
    try {
      await assignTenantAddon(tenantId, slug);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyAddon(null);
    }
  };

  const handleApprove = async (slug: string) => {
    setBusyAddon(slug);
    try {
      await approveTenantAddon(tenantId, slug);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyAddon(null);
    }
  };

  const handleCancel = async (slug: string) => {
    if (!confirm(`Cancelar add-on "${slug}" neste tenant?`)) return;
    setBusyAddon(slug);
    try {
      await cancelTenantAddon(tenantId, slug);
      await load();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setBusyAddon(null);
    }
  };

  const openModal = (kind: ModalKind) => {
    setModalError(null);
    setSuspendReason('');
    setReactivateNotes('');
    setChangeReason('');
    setChangeSlug(tenant?.package_slug ?? '');
    setModal(kind);
  };
  const closeModal = () => {
    if (modalBusy) return;
    setModal(null);
    setModalError(null);
  };

  const confirmSuspend = async () => {
    if (!suspendReason.trim()) {
      setModalError('Motivo é obrigatório.');
      return;
    }
    setModalBusy(true);
    setModalError(null);
    try {
      await suspendTenant(tenantId, suspendReason.trim());
      await load();
      setModal(null);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setModalBusy(false);
    }
  };

  const confirmReactivate = async () => {
    setModalBusy(true);
    setModalError(null);
    try {
      await reactivateTenant(tenantId, reactivateNotes.trim() || null);
      await load();
      setModal(null);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setModalBusy(false);
    }
  };

  const confirmChangePackage = async () => {
    if (!changeSlug) {
      setModalError('Escolha um pacote.');
      return;
    }
    if (changeSlug === tenant?.package_slug) {
      setModalError('Pacote escolhido é igual ao atual.');
      return;
    }
    if (!changeReason.trim()) {
      setModalError('Motivo é obrigatório (fica registrado no audit log).');
      return;
    }
    setModalBusy(true);
    setModalError(null);
    try {
      await forceChangePackage(tenantId, changeSlug, changeReason.trim());
      await load();
      setModal(null);
    } catch (e) {
      setModalError((e as Error).message);
    } finally {
      setModalBusy(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-sm text-muted">Carregando detalhe…</div>;
  }
  if (error) {
    return (
      <div className="p-6">
        <div className="border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">{error}</div>
      </div>
    );
  }
  if (!tenant) {
    return (
      <div className="p-6 space-y-3">
        <button onClick={onBack} className="inline-flex items-center gap-1 text-xs text-on-surface-variant hover:text-on-surface">
          <ArrowLeft size={12} /> Voltar
        </button>
        <div className="text-sm text-muted">Tenant não encontrado.</div>
      </div>
    );
  }

  const apps = activePackage?.apps ?? [];

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <button onClick={onBack} className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-on-surface">
          <ArrowLeft size={12} /> Tenants
        </button>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs border border-outline/10 bg-surface-lowest px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:border-outline/30"
        >
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      <div>
        <div className="flex items-center gap-2">
          <div className="text-lg font-medium text-on-surface">{tenant.tenant_name}</div>
          <StatusBadge status={tenant.tenant_status} />
        </div>
        <div className="text-[11px] font-mono text-muted mt-0.5">{tenant.tenant_id}</div>
        {tenant.tenant_cnpj && (
          <div className="text-[11px] font-mono text-muted">CNPJ {tenant.tenant_cnpj}</div>
        )}
      </div>

      {tenant.tenant_status === 'suspended' && (
        <div className="border border-amber-500/30 bg-amber-500/5 p-4">
          <div className="flex items-start gap-2">
            <AlertTriangle size={16} className="text-amber-300 mt-0.5 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="text-sm text-amber-300 font-medium">Tenant suspenso</div>
              {tenant.suspended_reason && (
                <div className="text-xs text-on-surface-variant mt-1">Motivo: {tenant.suspended_reason}</div>
              )}
              {tenant.suspended_at && (
                <div className="text-[11px] text-muted mt-1">
                  Desde {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(tenant.suspended_at))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="border border-outline/10 bg-surface-low p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">Pacote atual</div>
            <button
              onClick={() => openModal('change_package')}
              className="inline-flex items-center gap-1 text-[11px] border border-outline/10 bg-surface-lowest px-2 py-1 text-on-surface-variant hover:text-on-surface hover:border-outline/30"
            >
              <Shuffle size={11} /> Forçar mudança
            </button>
          </div>
          {activePackage ? (
            <>
              <div className="text-base text-on-surface">{activePackage.name}</div>
              <div className="text-xs text-on-surface-variant mt-0.5">{activePackage.tagline}</div>
              <div className="text-sm text-on-surface mt-2">{formatPrice(activePackage.base_price_monthly)}/mês</div>
              <div className="text-[11px] text-muted mt-3">
                max lojas: {activePackage.max_stores ?? '—'} · max usuários: {activePackage.max_users ?? '—'}
              </div>
              <div className="text-[11px] text-muted mt-3 leading-relaxed">
                Mudança normal passa por solicitação do admin do tenant no hub.
                "Forçar mudança" é override do super_admin (inadimplência, ajuste interno).
              </div>
            </>
          ) : (
            <div className="text-sm text-muted italic">Sem pacote atribuído</div>
          )}
        </div>

        <div className="border border-outline/10 bg-surface-low p-4">
          <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-3">Acesso</div>
          {tenant.tenant_status === 'active' ? (
            <>
              <div className="text-sm text-on-surface-variant leading-relaxed mb-3">
                Tenant com acesso liberado. Suspender trava login nos apps Clearix
                até a reativação.
              </div>
              <button
                onClick={() => openModal('suspend')}
                className="w-full inline-flex items-center justify-center gap-1.5 border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-sm text-amber-300 hover:bg-amber-500/10"
              >
                <Ban size={13} /> Suspender acesso
              </button>
            </>
          ) : tenant.tenant_status === 'suspended' ? (
            <>
              <div className="text-sm text-on-surface-variant leading-relaxed mb-3">
                Reativar libera o acesso e limpa o motivo da suspensão.
              </div>
              <button
                onClick={() => openModal('reactivate')}
                className="w-full inline-flex items-center justify-center gap-1.5 border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 text-sm text-emerald-300 hover:bg-emerald-500/10"
              >
                <PlayCircle size={13} /> Reativar tenant
              </button>
            </>
          ) : (
            <div className="text-sm text-muted italic">
              Status <span className="font-mono">{tenant.tenant_status}</span> não tem ação direta aqui.
            </div>
          )}
        </div>
      </div>

      {apps.length > 0 && (
        <div>
          <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant mb-2">Apps inclusos no pacote</div>
          <div className="flex flex-wrap gap-1.5">
            {apps.map((a) => (
              <span
                key={a.slug}
                className="text-[11px] font-mono border border-outline/10 bg-surface-low px-2 py-1 text-on-surface-variant"
                title={a.category ?? ''}
              >
                {a.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div>
        <div className="flex items-center justify-between mb-2">
          <div className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">Add-ons</div>
        </div>
        <div className="border border-outline/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-surface-low text-[10px] uppercase tracking-widest text-on-surface-variant font-mono">
                <th className="text-left px-3 py-2">Add-on</th>
                <th className="text-left px-3 py-2">Pricing</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Preço custom</th>
                <th className="px-3 py-2 text-right">Ações</th>
              </tr>
            </thead>
            <tbody>
              {addons.map((addon) => {
                const tRow = tenantBySlug.get(addon.slug);
                const busy = busyAddon === addon.slug;
                const status = tRow?.status;
                const statusClass = status ? ADDON_STATUS_COLORS[status] ?? ADDON_STATUS_COLORS.cancelled : '';
                const pkgSort = tenant.package_sort ?? -Infinity;
                const minSort = addon.min_package_sort ?? -Infinity;
                const tierOk = !addon.min_package_slug || pkgSort >= minSort;
                return (
                  <tr key={addon.slug} className="border-t border-outline/10">
                    <td className="px-3 py-2.5">
                      <div className="text-on-surface">{addon.name}</div>
                      <div className="text-[11px] text-muted">{addon.slug}</div>
                      {!tierOk && (
                        <div className="text-[10px] text-amber-300/80 mt-0.5">
                          Requer pacote {addon.min_package_name} ou superior
                        </div>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-on-surface-variant">
                      <div className="text-xs">{addon.pricing_model}</div>
                      {addon.base_price !== null && (
                        <div className="text-[10px] text-muted">{formatPrice(addon.base_price)}</div>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      {status ? (
                        <span className={`inline-flex text-[10px] font-mono uppercase px-1.5 py-0.5 border ${statusClass}`}>
                          {status}
                        </span>
                      ) : (
                        <span className="text-xs text-muted">—</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-xs text-on-surface-variant">
                      {tRow?.custom_price !== null && tRow?.custom_price !== undefined
                        ? formatPrice(tRow.custom_price)
                        : '—'}
                    </td>
                    <td className="px-3 py-2.5 text-right space-x-1.5">
                      {status === 'pending_review' && (
                        <button
                          onClick={() => handleApprove(addon.slug)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 text-[11px] border border-emerald-500/30 bg-emerald-500/5 px-2 py-1 text-emerald-300 hover:bg-emerald-500/10 disabled:opacity-50"
                        >
                          <CheckCircle2 size={11} /> Aprovar
                        </button>
                      )}
                      {(status === 'active' || status === 'pending_review') && (
                        <button
                          onClick={() => handleCancel(addon.slug)}
                          disabled={busy}
                          className="inline-flex items-center gap-1 text-[11px] border border-rose-500/30 bg-rose-500/5 px-2 py-1 text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                        >
                          <XCircle size={11} /> Cancelar
                        </button>
                      )}
                      {(!status || status === 'cancelled') && (
                        <button
                          onClick={() => handleAssign(addon.slug)}
                          disabled={busy || !tierOk}
                          className="inline-flex items-center gap-1 text-[11px] border border-outline/10 bg-surface-low px-2 py-1 text-on-surface-variant hover:bg-surface-highest disabled:opacity-40"
                          title={!tierOk ? 'Tier do pacote atual não atende' : undefined}
                        >
                          <Plus size={11} /> Atribuir
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {addons.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-3 py-6 text-center text-muted text-sm">
                    Nenhum add-on cadastrado no catálogo.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modal === 'suspend' && (
        <Modal
          title="Suspender tenant"
          onClose={closeModal}
          busy={modalBusy}
          error={modalError}
          submitLabel="Suspender"
          submitClass="bg-amber-600 hover:bg-amber-500"
          onSubmit={confirmSuspend}
          icon={<Ban size={16} className="text-amber-300" />}
        >
          <p className="text-sm text-on-surface-variant mb-3">
            Trava o acesso de <span className="text-on-surface">{tenant.tenant_name}</span> aos apps Clearix.
            O motivo fica registrado no audit log.
          </p>
          <label className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant block mb-1">
            Motivo *
          </label>
          <textarea
            value={suspendReason}
            onChange={(e) => setSuspendReason(e.target.value)}
            rows={3}
            placeholder="Ex.: inadimplência 60 dias / solicitação cliente / investigação de fraude"
            className="w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary/40"
          />
        </Modal>
      )}

      {modal === 'reactivate' && (
        <Modal
          title="Reativar tenant"
          onClose={closeModal}
          busy={modalBusy}
          error={modalError}
          submitLabel="Reativar"
          submitClass="bg-emerald-600 hover:bg-emerald-500"
          onSubmit={confirmReactivate}
          icon={<PlayCircle size={16} className="text-emerald-300" />}
        >
          <p className="text-sm text-on-surface-variant mb-3">
            Restaura o acesso de <span className="text-on-surface">{tenant.tenant_name}</span> aos apps Clearix
            e limpa o motivo da suspensão.
          </p>
          <label className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant block mb-1">
            Notas (opcional)
          </label>
          <textarea
            value={reactivateNotes}
            onChange={(e) => setReactivateNotes(e.target.value)}
            rows={3}
            placeholder="Ex.: pagamento regularizado"
            className="w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary/40"
          />
        </Modal>
      )}

      {modal === 'change_package' && (
        <Modal
          title="Forçar mudança de pacote"
          onClose={closeModal}
          busy={modalBusy}
          error={modalError}
          submitLabel="Aplicar"
          submitClass="bg-secondary hover:bg-secondary/90"
          onSubmit={confirmChangePackage}
          icon={<Shuffle size={16} className="text-secondary" />}
        >
          <p className="text-sm text-on-surface-variant mb-3">
            Override do super_admin — aplica imediatamente, sem passar pela fila de solicitações.
          </p>
          <label className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant block mb-1">
            Pacote alvo *
          </label>
          <select
            value={changeSlug}
            onChange={(e) => setChangeSlug(e.target.value)}
            className="w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary/40 mb-3"
          >
            <option value="">—</option>
            {packages.map((p) => {
              const atual = p.slug === tenant.package_slug;
              const currentSort = tenant.package_sort ?? -Infinity;
              const dir = atual
                ? ' (atual)'
                : p.sort_order > currentSort
                ? ' — upgrade'
                : p.sort_order < currentSort
                ? ' — downgrade'
                : '';
              return (
                <option key={p.slug} value={p.slug}>
                  {p.name}{dir}
                </option>
              );
            })}
          </select>
          <label className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant block mb-1">
            Motivo *
          </label>
          <textarea
            value={changeReason}
            onChange={(e) => setChangeReason(e.target.value)}
            rows={3}
            placeholder="Ex.: downgrade por inadimplência / upgrade combinado por fora do fluxo"
            className="w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary/40"
          />
        </Modal>
      )}
    </div>
  );
}

// --- sub-componentes ---

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === 'active'
      ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20'
      : status === 'suspended'
      ? 'bg-amber-500/10 text-amber-300 border-amber-500/20'
      : status === 'cancelled'
      ? 'bg-rose-500/10 text-rose-300 border-rose-500/20'
      : 'bg-surface-low text-on-surface-variant border-outline/10';
  return (
    <span className={`inline-flex text-[10px] font-mono uppercase px-1.5 py-0.5 border ${cls}`}>
      {status}
    </span>
  );
}

type ModalProps = {
  title: string;
  icon?: React.ReactNode;
  onClose: () => void;
  onSubmit: () => void;
  submitLabel: string;
  submitClass: string;
  busy: boolean;
  error: string | null;
  children: React.ReactNode;
};

function Modal({ title, icon, onClose, onSubmit, submitLabel, submitClass, busy, error, children }: ModalProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-surface-lowest/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md border border-outline/10 bg-surface-container shadow-2xl">
        <div className="flex items-center justify-between px-4 py-3 border-b border-outline/10">
          <div className="flex items-center gap-2">
            {icon}
            <div className="text-sm font-medium text-on-surface">{title}</div>
          </div>
          <button
            onClick={onClose}
            disabled={busy}
            className="text-muted hover:text-on-surface disabled:opacity-30"
          >
            <X size={14} />
          </button>
        </div>
        <div className="p-4">
          {children}
          {error && (
            <div className="mt-3 border border-rose-500/30 bg-rose-500/5 p-2 text-xs text-rose-300">
              {error}
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 px-4 py-3 border-t border-outline/10">
          <button
            onClick={onClose}
            disabled={busy}
            className="border border-outline/10 bg-surface-lowest text-sm px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:border-outline/30 disabled:opacity-30"
          >
            Cancelar
          </button>
          <button
            onClick={onSubmit}
            disabled={busy}
            className={`text-surface text-sm px-4 py-1.5 disabled:opacity-50 ${submitClass}`}
          >
            {busy ? 'Processando…' : submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
