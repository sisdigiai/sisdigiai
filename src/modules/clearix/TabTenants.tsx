import { useEffect, useMemo, useState } from 'react';
import { Search, RefreshCw, ChevronRight, Package } from 'lucide-react';
import { listPackages, listTenantCatalog } from './api';
import type { ClearixPackage, TenantCatalogRow } from '../../lib/clearixSupabase';

type Props = {
  onSelectTenant: (tenantId: string) => void;
};

const STATUS_COLORS: Record<string, string> = {
  active: 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20',
  suspended: 'bg-amber-500/10 text-amber-300 border-amber-500/20',
  inactive: 'bg-white/5 text-white/50 border-white/10',
  trial: 'bg-[#06B6D4]/10 text-[#06B6D4] border-[#06B6D4]/20',
};

export default function TabTenants({ onSelectTenant }: Props) {
  const [rows, setRows] = useState<TenantCatalogRow[]>([]);
  const [packages, setPackages] = useState<ClearixPackage[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [packageFilter, setPackageFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const load = async () => {
    setLoading(true);
    setError(null);
    try {
      const [cat, pkgs] = await Promise.all([listTenantCatalog(), listPackages()]);
      setRows(cat);
      setPackages(pkgs);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (packageFilter !== 'all' && r.package_slug !== packageFilter) return false;
      if (statusFilter !== 'all' && r.tenant_status !== statusFilter) return false;
      if (q && !r.tenant_name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [rows, search, packageFilter, statusFilter]);

  const byPackage = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const r of rows) {
      const k = r.package_slug ?? '—';
      counts[k] = (counts[k] ?? 0) + 1;
    }
    return counts;
  }, [rows]);

  const pendingAddons = useMemo(
    () => rows.reduce((acc, r) => acc + r.addons.filter((a) => a.status === 'pending_review').length, 0),
    [rows]
  );

  const allStatuses = useMemo(
    () => Array.from(new Set(rows.map((r) => r.tenant_status))).sort(),
    [rows]
  );

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-lg font-medium text-white">Tenants</div>
          <div className="text-xs text-white/40 mt-0.5">
            {rows.length} tenant{rows.length === 1 ? '' : 's'}
            {pendingAddons > 0 && (
              <> · <span className="text-amber-300">{pendingAddons} add-on{pendingAddons === 1 ? '' : 's'} em análise</span></>
            )}
          </div>
        </div>
        <button
          onClick={load}
          className="inline-flex items-center gap-1.5 text-xs rounded-md border border-white/10 bg-black/20 px-3 py-1.5 text-white/70 hover:text-white hover:border-white/20"
        >
          <RefreshCw size={12} /> Atualizar
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {packages.map((p) => (
          <div key={p.slug} className="rounded-lg border border-white/10 bg-white/[0.02] p-3">
            <div className="flex items-center gap-1.5 text-[10px] font-mono uppercase tracking-widest text-white/40">
              <Package size={10} /> {p.slug}
            </div>
            <div className="text-xl font-medium text-white mt-1">{byPackage[p.slug] ?? 0}</div>
            <div className="text-[11px] text-white/50">{p.name}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[220px]">
          <Search size={12} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar tenant…"
            className="w-full bg-slate-900 border border-slate-700 rounded-md pl-7 pr-3 py-1.5 text-sm text-white focus:outline-none focus:border-[#06B6D4]"
          />
        </div>
        <select
          value={packageFilter}
          onChange={(e) => setPackageFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#06B6D4]"
        >
          <option value="all">Todos pacotes</option>
          {packages.map((p) => (
            <option key={p.slug} value={p.slug}>{p.name}</option>
          ))}
          <option value="">Sem pacote</option>
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-sm text-white focus:outline-none focus:border-[#06B6D4]"
        >
          <option value="all">Todos status</option>
          {allStatuses.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
      </div>

      {loading ? (
        <div className="text-sm text-white/40">Carregando…</div>
      ) : error ? (
        <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">{error}</div>
      ) : filtered.length === 0 ? (
        <div className="text-sm text-white/40 py-8 text-center">
          Nenhum tenant bate com o filtro.
        </div>
      ) : (
        <div className="rounded-lg border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-white/[0.03] text-[10px] uppercase tracking-widest text-white/40 font-mono">
                <th className="text-left px-3 py-2">Tenant</th>
                <th className="text-left px-3 py-2">Pacote</th>
                <th className="text-left px-3 py-2">Status</th>
                <th className="text-left px-3 py-2">Add-ons</th>
                <th className="px-3 py-2"></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => {
                const pending = r.addons.filter((a) => a.status === 'pending_review').length;
                const active = r.addons.filter((a) => a.status === 'active').length;
                const statusClass = STATUS_COLORS[r.tenant_status] ?? STATUS_COLORS.inactive;
                return (
                  <tr
                    key={r.tenant_id}
                    onClick={() => onSelectTenant(r.tenant_id)}
                    className="border-t border-white/5 hover:bg-white/[0.02] cursor-pointer"
                  >
                    <td className="px-3 py-2.5 text-white">{r.tenant_name}</td>
                    <td className="px-3 py-2.5">
                      {r.package_slug ? (
                        <span className="inline-flex items-center text-xs text-white/80">{r.package_name}</span>
                      ) : (
                        <span className="text-xs text-white/30 italic">sem pacote</span>
                      )}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`inline-flex text-[10px] font-mono uppercase px-1.5 py-0.5 rounded border ${statusClass}`}>
                        {r.tenant_status}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-xs text-white/60">
                      {active > 0 && <span>{active} ativo{active === 1 ? '' : 's'}</span>}
                      {active > 0 && pending > 0 && <span className="text-white/20"> · </span>}
                      {pending > 0 && <span className="text-amber-300">{pending} análise</span>}
                      {active === 0 && pending === 0 && <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-3 py-2.5 text-white/30">
                      <ChevronRight size={14} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
