import { useEffect, useState, useCallback } from 'react';
import { Receipt, RefreshCw, AlertOctagon, DollarSign, Users, Plus, X } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { billingStore, type BillingSubscriber, type BillingMrr, type DunningStage } from '../lib/billingStore';

const brl = (v: number | null | undefined) =>
  v == null ? '—' : `R$ ${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const fmtDate = (iso: string | null) =>
  !iso ? '—' : new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });

const STAGE: Record<DunningStage, { label: string; cls: string }> = {
  em_dia:   { label: 'Em dia',    cls: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' },
  aviso:    { label: 'Aviso (D+3)',     cls: 'border-amber-400/30 bg-amber-400/10 text-amber-300' },
  restrito: { label: 'Restrito (D+7)',  cls: 'border-orange-400/30 bg-orange-400/10 text-orange-300' },
  bloqueio: { label: 'Bloqueio (D+15)', cls: 'border-red-400/30 bg-red-400/10 text-red-300' },
  suspenso: { label: 'Suspenso (D+30)', cls: 'border-red-500/40 bg-red-500/15 text-red-400' },
};

const EMPTY = { name: '', email: '', phone: '', plan_name: '', plan_amount_brl: '', mp_preapproval_id: '', tenant_ref: '', next_due_on: '' };

export default function Billing() {
  const [subs, setSubs] = useState<BillingSubscriber[]>([]);
  const [mrr, setMrr] = useState<BillingMrr | null>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState<Record<string, string>>({ ...EMPTY });
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, m] = await Promise.all([billingStore.list(), billingStore.mrr()]);
    setSubs(s); setMrr(m); setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    if (!form.name && !form.email) return;
    setSaving(true);
    await billingStore.upsert({
      ...form,
      plan_amount_brl: form.plan_amount_brl ? Number(form.plan_amount_brl.replace(',', '.')) : null,
    } as never);
    setSaving(false); setShowForm(false); setForm({ ...EMPTY }); load();
  };

  const inadimplentes = mrr?.inadimplentes ?? 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Control Plane · Cobrança"
        title="Cobrança Clearix"
        subtitle="Assinaturas recorrentes (Mercado Pago) + régua de inadimplência automática"
        actions={
          <div className="flex items-center gap-2">
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1.5 px-3 py-2 text-sm bg-secondary-container text-on-secondary-container border border-secondary/40 hover:bg-secondary-container/70 transition-colors">
              <Plus size={15} /> Novo assinante
            </button>
            <button onClick={load} className="p-2 hover:bg-surface-highest text-muted hover:text-on-surface transition-colors" title="Recarregar">
              <RefreshCw size={18} />
            </button>
          </div>
        }
      />

      <div className="space-y-8">
        {/* KPIs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <Kpi icon={<DollarSign className="w-4 h-4" />} label="MRR (assinaturas ativas)" value={brl(mrr?.mrr_brl ?? 0)} color="text-emerald-400" />
          <Kpi icon={<Users className="w-4 h-4" />} label="Assinantes ativos" value={String(mrr?.ativos ?? 0)} color="text-secondary" />
          <Kpi icon={<AlertOctagon className="w-4 h-4" />} label="Inadimplentes" value={String(inadimplentes)} color={inadimplentes > 0 ? 'text-red-400' : 'text-muted'} />
        </div>

        {inadimplentes > 0 && (
          <div className="bg-red-500/5 border border-red-500/30 p-4 flex items-center gap-3 text-sm">
            <AlertOctagon className="w-5 h-5 text-red-400 shrink-0" />
            <span className="text-on-surface-variant">{inadimplentes} assinante(s) em atraso — a régua já aplicou o estágio. Acompanhe abaixo.</span>
          </div>
        )}

        {/* Tabela */}
        <div className="bg-surface-low border border-outline/10">
          <div className="flex items-center gap-2 p-4 border-b border-outline/10">
            <Receipt className="w-5 h-5 text-secondary" />
            <h2 className="font-serif text-lg font-semibold text-on-surface">Assinantes</h2>
            <span className="text-xs font-mono text-muted ml-2">{subs.length}</span>
          </div>
          {loading ? (
            <div className="p-6 text-sm text-muted font-mono uppercase tracking-widest">Carregando…</div>
          ) : subs.length === 0 ? (
            <div className="p-6 text-sm text-muted italic">Nenhum assinante ainda. Quando uma ótica assinar no Mercado Pago, o webhook popula aqui automaticamente — ou adicione manualmente.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-mono text-muted uppercase tracking-widest border-b border-outline/10">
                    <th className="text-left px-4 py-2 font-medium">Assinante</th>
                    <th className="text-left px-4 py-2 font-medium">Plano</th>
                    <th className="text-right px-4 py-2 font-medium">Mensal</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-left px-4 py-2 font-medium">Próx. venc.</th>
                    <th className="text-right px-4 py-2 font-medium">Atraso</th>
                  </tr>
                </thead>
                <tbody>
                  {subs.map((s) => (
                    <tr key={s.id} className="border-b border-outline/5 hover:bg-surface-highest/40">
                      <td className="px-4 py-2.5">
                        <div className="text-on-surface">{s.name || s.email || '(sem nome)'}</div>
                        {s.name && s.email && <div className="text-[11px] text-muted">{s.email}</div>}
                        {s.tenant_ref && <div className="text-[10px] font-mono text-muted">tenant: {s.tenant_ref}</div>}
                      </td>
                      <td className="px-4 py-2.5 text-on-surface-variant">{s.plan_name || '—'}</td>
                      <td className="px-4 py-2.5 text-right font-mono tabular-nums text-on-surface">{brl(s.plan_amount_brl)}</td>
                      <td className="px-4 py-2.5">
                        <span className={`text-[10px] font-mono px-2 py-0.5 border ${STAGE[s.dunning_stage]?.cls ?? ''}`}>
                          {STAGE[s.dunning_stage]?.label ?? s.dunning_stage}
                        </span>
                        {s.status !== 'active' && <span className="ml-1 text-[10px] text-muted">({s.status})</span>}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-muted">{fmtDate(s.next_due_on)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono tabular-nums ${(s.dias_atraso ?? 0) > 0 ? 'text-red-400' : 'text-muted'}`}>
                        {s.dias_atraso ? `${s.dias_atraso}d` : '—'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted leading-relaxed">
          Fonte viva: <span className="font-mono">billing.subscribers</span> (Mercado Pago via webhook) · régua D+3/D+7/D+15/D+30 roda diária via cron.
          A suspensão de acesso real do tenant no Clearix é a próxima fase (cross-sistema).
        </p>
      </div>

      {/* Form */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-surface-container border border-outline/20 w-full max-w-md p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-serif text-lg font-semibold text-on-surface">Novo / editar assinante</h3>
              <button onClick={() => setShowForm(false)} className="text-muted hover:text-on-surface"><X size={18} /></button>
            </div>
            <div className="space-y-3">
              {([
                ['name', 'Nome da ótica'], ['email', 'E-mail'], ['phone', 'WhatsApp'],
                ['plan_name', 'Plano (Starter/Growth/Ecossistema)'], ['plan_amount_brl', 'Mensal (R$)'],
                ['mp_preapproval_id', 'ID da assinatura MP (preapproval)'], ['tenant_ref', 'Tenant no Clearix (ref)'],
                ['next_due_on', 'Próximo vencimento (AAAA-MM-DD)'],
              ] as [string, string][]).map(([k, label]) => (
                <div key={k}>
                  <label className="text-[10px] font-mono text-muted uppercase tracking-widest">{label}</label>
                  <input
                    value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
                    className="w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary mt-0.5"
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowForm(false)} className="px-3 py-2 text-sm text-muted hover:text-on-surface">Cancelar</button>
              <button onClick={save} disabled={saving} className="px-4 py-2 text-sm bg-secondary-container text-on-secondary-container border border-secondary/40 disabled:opacity-50">
                {saving ? 'Salvando…' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Kpi({ icon, label, value, color }: { icon: React.ReactNode; label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-low border border-outline/10 p-4">
      <div className={`flex items-center gap-2 text-xs ${color} mb-2`}>
        {icon}
        <span className="font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-serif font-bold text-on-surface">{value}</div>
    </div>
  );
}
