import { useEffect, useState } from 'react';
import { Building2, CheckCircle2 } from 'lucide-react';
import { listPackages, createTenantWithPackage } from './api';
import type { ClearixPackage } from '../../lib/clearixSupabase';

type Props = {
  onCreated: (tenantId: string) => void;
};

const inputClass =
  'w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4]';

function formatPrice(n: number | null | undefined) {
  if (n === null || n === undefined) return '—';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(n));
}

export default function TabNewTenant({ onCreated }: Props) {
  const [packages, setPackages] = useState<ClearixPackage[]>([]);
  const [name, setName] = useState('');
  const [cnpj, setCnpj] = useState('');
  const [packageSlug, setPackageSlug] = useState<string>('');
  const [createDefaultStore, setCreateDefaultStore] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ tenant_id: string; name: string } | null>(null);

  useEffect(() => {
    listPackages()
      .then((pkgs) => {
        setPackages(pkgs);
        if (!packageSlug && pkgs.length > 0) {
          // default: primeiro pacote não-demo; se só tiver demo, usa esse
          const nonDemo = pkgs.find((p) => !p.is_demo);
          setPackageSlug((nonDemo ?? pkgs[0]).slug);
        }
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
  }, []);

  const selectedPackage = packages.find((p) => p.slug === packageSlug) ?? null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !cnpj.trim() || !packageSlug) return;
    setSubmitting(true);
    setError(null);
    try {
      const { tenant_id } = await createTenantWithPackage({
        name: name.trim(),
        cnpj: cnpj.trim(),
        package_slug: packageSlug,
        create_default_store: createDefaultStore,
      });
      setSuccess({ tenant_id, name: name.trim() });
      setName('');
      setCnpj('');
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (success) {
    return (
      <div className="p-6 max-w-xl">
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 size={18} />
            <div className="font-medium">Tenant criado</div>
          </div>
          <div className="text-sm text-white/80">{success.name}</div>
          <div className="text-[11px] font-mono text-white/40">{success.tenant_id}</div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onCreated(success.tenant_id)}
              className="rounded-md bg-[#2563EB] text-white text-sm px-3 py-1.5 hover:bg-[#1D4ED8]"
            >
              Abrir detalhe
            </button>
            <button
              onClick={() => setSuccess(null)}
              className="rounded-md border border-white/10 bg-black/20 text-sm px-3 py-1.5 text-white/70 hover:text-white hover:border-white/20"
            >
              Criar outro
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-2 mb-5">
        <Building2 size={16} className="text-[#06B6D4]" />
        <div className="text-lg font-medium text-white">Novo tenant</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">
            Razão social / Nome *
          </label>
          <input
            className={inputClass}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ex.: Ótica ABC Ltda"
            required
          />
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">
            CNPJ *
          </label>
          <input
            className={inputClass}
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            required
          />
          <div className="text-[10px] text-white/30 mt-1">
            Obrigatório na regra do banco (pontuação é removida automaticamente).
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-white/50 block mb-1">
            Pacote *
          </label>
          <select
            className={inputClass}
            value={packageSlug}
            onChange={(e) => setPackageSlug(e.target.value)}
            required
          >
            <option value="" disabled>Selecionar pacote…</option>
            {packages.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.name} {p.is_demo && '(demo)'} — {formatPrice(p.base_price_monthly)}/mês
              </option>
            ))}
          </select>
          {selectedPackage && (
            <div className="mt-2 rounded-md border border-white/10 bg-white/[0.02] p-3">
              <div className="text-xs text-white/70">{selectedPackage.tagline}</div>
              <div className="text-[11px] text-white/40 mt-1">{selectedPackage.description}</div>
              <div className="text-[11px] text-white/50 mt-2">
                max lojas: {selectedPackage.max_stores ?? '—'} · max usuários: {selectedPackage.max_users ?? '—'}
              </div>
              {selectedPackage.apps && selectedPackage.apps.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedPackage.apps.map((a) => (
                    <span
                      key={a.slug}
                      className="text-[10px] font-mono rounded border border-white/10 bg-black/20 px-1.5 py-0.5 text-white/60"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-white/70">
          <input
            type="checkbox"
            checked={createDefaultStore}
            onChange={(e) => setCreateDefaultStore(e.target.checked)}
            className="rounded border-slate-700"
          />
          Criar loja matriz padrão automaticamente
        </label>

        {error && (
          <div className="rounded-md border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting || !name.trim() || !cnpj.trim() || !packageSlug}
            className="rounded-md bg-[#2563EB] text-white text-sm px-4 py-2 hover:bg-[#1D4ED8] disabled:opacity-50"
          >
            {submitting ? 'Criando…' : 'Criar tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}
