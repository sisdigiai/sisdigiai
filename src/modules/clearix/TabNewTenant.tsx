import { useEffect, useState } from 'react';
import { Building2, CheckCircle2 } from 'lucide-react';
import { listPackages, createTenantWithPackage } from './api';
import type { ClearixPackage } from '../../lib/clearixSupabase';

type Props = {
  onCreated: (tenantId: string) => void;
};

const inputClass =
  'w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary/40';

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
        <div className="border border-emerald-500/30 bg-emerald-500/5 p-5 space-y-3">
          <div className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 size={18} />
            <div className="font-medium">Tenant criado</div>
          </div>
          <div className="text-sm text-on-surface">{success.name}</div>
          <div className="text-[11px] font-mono text-muted">{success.tenant_id}</div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => onCreated(success.tenant_id)}
              className="bg-secondary text-surface text-sm px-3 py-1.5 hover:bg-secondary/90"
            >
              Abrir detalhe
            </button>
            <button
              onClick={() => setSuccess(null)}
              className="border border-outline/10 bg-surface-lowest text-sm px-3 py-1.5 text-on-surface-variant hover:text-on-surface hover:border-outline/30"
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
        <Building2 size={16} className="text-secondary" />
        <div className="text-lg font-medium text-on-surface">Novo tenant</div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant block mb-1">
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
          <label className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant block mb-1">
            CNPJ *
          </label>
          <input
            className={inputClass}
            value={cnpj}
            onChange={(e) => setCnpj(e.target.value)}
            placeholder="00.000.000/0000-00"
            required
          />
          <div className="text-[10px] text-muted mt-1">
            Obrigatório na regra do banco (pontuação é removida automaticamente).
          </div>
        </div>

        <div>
          <label className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant block mb-1">
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
            <div className="mt-2 border border-outline/10 bg-surface-low p-3">
              <div className="text-xs text-on-surface-variant">{selectedPackage.tagline}</div>
              <div className="text-[11px] text-muted mt-1">{selectedPackage.description}</div>
              <div className="text-[11px] text-on-surface-variant mt-2">
                max lojas: {selectedPackage.max_stores ?? '—'} · max usuários: {selectedPackage.max_users ?? '—'}
              </div>
              {selectedPackage.apps && selectedPackage.apps.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {selectedPackage.apps.map((a) => (
                    <span
                      key={a.slug}
                      className="text-[10px] font-mono border border-outline/10 bg-surface-lowest px-1.5 py-0.5 text-on-surface-variant"
                    >
                      {a.name}
                    </span>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-on-surface-variant">
          <input
            type="checkbox"
            checked={createDefaultStore}
            onChange={(e) => setCreateDefaultStore(e.target.checked)}
            className="border-outline/30"
          />
          Criar loja matriz padrão automaticamente
        </label>

        {error && (
          <div className="border border-rose-500/30 bg-rose-500/5 p-3 text-sm text-rose-300">
            {error}
          </div>
        )}

        <div className="flex gap-2 pt-2">
          <button
            type="submit"
            disabled={submitting || !name.trim() || !cnpj.trim() || !packageSlug}
            className="bg-secondary text-surface text-sm px-4 py-2 hover:bg-secondary/90 disabled:opacity-50"
          >
            {submitting ? 'Criando…' : 'Criar tenant'}
          </button>
        </div>
      </form>
    </div>
  );
}
