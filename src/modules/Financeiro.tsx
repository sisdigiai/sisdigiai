import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, PlusCircle, RefreshCw, CreditCard, FileDown,
  Trash2, X, DollarSign, TrendingDown, Repeat, Download,
  ChevronDown, ChevronUp, XCircle,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import {
  financeStore,
  CATEGORY_LABELS, CATEGORY_COLORS,
  type Product, type Vendor, type Expense, type Subscription,
  type VendorSpend, type MonthlyByCategory, type ExpenseCategory,
} from '../lib/financeStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type TabId = 'dashboard' | 'lancar' | 'subscriptions' | 'relatorio';

const TABS: Array<{ id: TabId; label: string; icon: typeof BarChart3 }> = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'lancar', label: 'Lançar Despesa', icon: PlusCircle },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'relatorio', label: 'Relatório', icon: FileDown },
];

const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4]';

function brl(v: number | null | undefined): string {
  if (v == null) return 'R$ 0,00';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function monthLabel(d: string): string {
  const [y, m] = d.split('-');
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  return `${months[parseInt(m, 10) - 1]}/${y?.slice(2)}`;
}

// =====================================================================
export default function Financeiro() {
  const [tab, setTab] = useState<TabId>('dashboard');

  return (
    <div className="max-w-7xl mx-auto p-8">
      <header className="mb-8">
        <h1 className="text-3xl font-bold">Financeiro</h1>
        <p className="text-slate-400 mt-1">
          Investimento real da DigiAI — segmentado por produto, categoria e vendor.
        </p>

        <nav className="flex gap-1 border-b border-slate-800 mt-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-[#06B6D4] text-white'
                    : 'border-transparent text-slate-400 hover:text-white'
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </nav>
      </header>

      <section>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'lancar' && <LancarTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'relatorio' && <RelatorioTab />}
      </section>
    </div>
  );
}

// =====================================================================
// TAB 1 — Dashboard
// =====================================================================
function DashboardTab() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [monthlyByCat, setMonthlyByCat] = useState<MonthlyByCategory[]>([]);
  const [vendorSpend, setVendorSpend] = useState<VendorSpend[]>([]);
  const [allSubs, setAllSubs] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterProduct, setFilterProduct] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [e, m, v, s, p] = await Promise.all([
      financeStore.listExpenses(5000),
      financeStore.listMonthlyByCategory(),
      financeStore.listVendorSpend(),
      financeStore.listSubscriptions(),
      financeStore.listProducts(),
    ]);
    setAllExpenses(e);
    setMonthlyByCat(m);
    setVendorSpend(v);
    setAllSubs(s);
    setProducts(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filter by product
  const expenses = filterProduct === 'all'
    ? allExpenses
    : allExpenses.filter(e => e.product_id === filterProduct);
  const subs = filterProduct === 'all'
    ? allSubs
    : allSubs.filter(s => s.product_id === filterProduct);

  // KPIs
  const total12m = expenses.reduce((a, e) => a + Number(e.amount_brl), 0);

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);
  const recentExpenses = expenses.filter(e => e.month >= threeMonthsAgo);
  const uniqueRecentMonths = new Set(recentExpenses.map(e => e.month)).size || 1;
  const burnRate3m = recentExpenses.reduce((a, e) => a + Number(e.amount_brl), 0) / uniqueRecentMonths;

  const activeSubs = subs.filter(s => s.is_active);
  const monthlySubsTotal = activeSubs.reduce((a, s) => a + Number(s.monthly_amount_brl), 0);

  // Chart data — recompute from filtered expenses (not from monthlyByCat view which has no product filter)
  const expByMonthCat: Record<string, Record<string, number>> = {};
  for (const e of expenses) {
    if (!expByMonthCat[e.month]) expByMonthCat[e.month] = {};
    expByMonthCat[e.month][e.category] = (expByMonthCat[e.month][e.category] || 0) + Number(e.amount_brl);
  }
  const monthSet = Object.keys(expByMonthCat).sort();
  const last12Months = monthSet.slice(-12);
  const categories = [...new Set(expenses.map(e => e.category))] as ExpenseCategory[];

  const chartData = {
    labels: last12Months.map(monthLabel),
    datasets: categories.map(cat => ({
      label: CATEGORY_LABELS[cat] || cat,
      data: last12Months.map(m => expByMonthCat[m]?.[cat] || 0),
      backgroundColor: CATEGORY_COLORS[cat] || '#64748b',
    })),
  };

  // Top vendors — recompute from filtered expenses
  const vendorTotals: Record<string, { name: string; total: number }> = {};
  for (const e of expenses) {
    const key = e.vendor_name || 'Sem vendor';
    if (!vendorTotals[key]) vendorTotals[key] = { name: key, total: 0 };
    vendorTotals[key].total += Number(e.amount_brl);
  }
  const topVendors = Object.values(vendorTotals).sort((a, b) => b.total - a.total).slice(0, 10);
  const maxVendor = topVendors[0]?.total || 1;

  if (loading) return <div className="text-slate-400 py-8">Carregando...</div>;

  const filterLabel = filterProduct === 'all' ? 'Todos' : products.find(p => p.id === filterProduct)?.name || filterProduct;

  return (
    <div className="space-y-8">
      {/* Product filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-wide">Projeto:</span>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterProduct('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterProduct === 'all' ? 'bg-[#2563EB]/20 text-white border border-[#2563EB]/40' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterProduct(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterProduct === p.id ? 'bg-[#2563EB]/20 text-white border border-[#2563EB]/40' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p.id === 'clearix' ? 'Clearix' : p.id === 'digiai' ? 'DigiAI' : p.id === 'compartilhado' ? 'Compartilhado' : p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label={`Total Investido${filterProduct !== 'all' ? '' : ' (geral)'}`} value={brl(total12m)} icon={<DollarSign size={20} />} color="text-blue-400" />
        <KpiCard label="Lançamentos" value={String(expenses.length)} sub="despesas registradas" icon={<TrendingDown size={20} />} color="text-cyan-400" />
        <KpiCard label="Burn Rate (média)" value={brl(burnRate3m)} sub="/mês" icon={<BarChart3 size={20} />} color="text-orange-400" />
        <KpiCard label="Subscriptions ativas" value={brl(monthlySubsTotal)} sub={`${activeSubs.length} serviços`} icon={<Repeat size={20} />} color="text-purple-400" />
      </div>

      {/* Stacked bar chart */}
      {last12Months.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Despesas Mensais por Categoria</h3>
          <div className="h-72">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: '#94a3b8', boxWidth: 12, font: { size: 11 } } },
                  tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${brl(ctx.parsed.y)}` },
                  },
                },
                scales: {
                  x: { stacked: true, ticks: { color: '#64748b' }, grid: { display: false } },
                  y: { stacked: true, ticks: { color: '#64748b', callback: (v) => `R$${v}` }, grid: { color: '#1e293b' } },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Top vendors */}
      {topVendors.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Top 10 Vendors por Gasto</h3>
          <div className="space-y-3">
            {topVendors.map((v) => (
              <div key={v.name} className="flex items-center gap-3">
                <div className="w-32 text-sm text-slate-300 truncate">{v.name}</div>
                <div className="flex-1 h-5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 rounded-full"
                    style={{ width: `${(v.total / maxVendor) * 100}%` }}
                  />
                </div>
                <div className="w-28 text-right text-sm font-mono text-slate-300">{brl(v.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      {expenses.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Últimos Lançamentos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase">
                  <th className="text-left pb-3">Mês</th>
                  <th className="text-left pb-3">Descrição</th>
                  <th className="text-left pb-3">Produto</th>
                  <th className="text-left pb-3">Categoria</th>
                  <th className="text-right pb-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 20).map((e) => (
                  <tr key={e.id} className="border-t border-slate-800/50">
                    <td className="py-2 text-slate-400">{monthLabel(e.month)}</td>
                    <td className="py-2 text-white">{e.description}</td>
                    <td className="py-2 text-slate-400">{e.product_name}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">
                        {e.category_label}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-white">{brl(Number(e.amount_brl))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="text-center py-16 text-slate-500">
          Nenhuma despesa registrada. Use a aba "Lançar Despesa" para começar.
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-slate-400 uppercase tracking-wide">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
}

// =====================================================================
// TAB 2 — Lançar Despesa
// =====================================================================
function LancarTab() {
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  const [showCsv, setShowCsv] = useState(false);
  const [csvText, setCsvText] = useState('');

  const emptyDraft = {
    product_id: 'clearix',
    vendor_id: '',
    category: 'infra_cloud' as ExpenseCategory,
    kind: 'one_time' as 'subscription' | 'one_time',
    description: '',
    month: new Date().toISOString().slice(0, 7) + '-01',
    amount_brl: 0,
    amount_original: undefined as number | undefined,
    original_currency: '' as string,
    exchange_rate: undefined as number | undefined,
    invoice_ref: '' as string,
    notes: '' as string,
  };
  const [draft, setDraft] = useState(emptyDraft);

  const load = useCallback(async () => {
    setLoading(true);
    const [p, v, e] = await Promise.all([
      financeStore.listProducts(),
      financeStore.listVendors(),
      financeStore.listExpenses(50),
    ]);
    setProducts(p);
    setVendors(v);
    setExpenses(e);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSave() {
    if (!draft.description || draft.amount_brl <= 0) {
      setMsg('Preencha descrição e valor.');
      return;
    }
    setSaving(true);
    setMsg('');
    try {
      await financeStore.addExpense({
        ...draft,
        vendor_id: draft.vendor_id || undefined,
        original_currency: draft.original_currency || undefined,
        invoice_ref: draft.invoice_ref || undefined,
        notes: draft.notes || undefined,
      });
      setDraft(emptyDraft);
      setMsg('Despesa salva!');
      const e = await financeStore.listExpenses(50);
      setExpenses(e);
    } catch (err: any) {
      setMsg('Erro: ' + (err?.message || 'falha'));
    }
    setSaving(false);
  }

  async function handleDelete(id: string) {
    try {
      await financeStore.deleteExpense(id);
      setExpenses(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      setMsg('Erro ao excluir: ' + (err?.message || 'falha'));
    }
  }

  async function handleCsvImport() {
    if (!csvText.trim()) return;
    setSaving(true);
    setMsg('');
    const lines = csvText.trim().split('\n').slice(1); // skip header
    let count = 0;
    for (const line of lines) {
      const cols = line.split(',').map(c => c.trim());
      if (cols.length < 6) continue;
      const [product_id, category, kind, description, month, amount_brl_str] = cols;
      const amount_brl = parseFloat(amount_brl_str);
      if (isNaN(amount_brl)) continue;
      try {
        await financeStore.addExpense({
          product_id,
          category: category as ExpenseCategory,
          kind: kind as 'subscription' | 'one_time',
          description,
          month: month.length === 7 ? month + '-01' : month,
          amount_brl,
        });
        count++;
      } catch { /* skip bad rows */ }
    }
    setMsg(`${count} despesas importadas.`);
    setCsvText('');
    setShowCsv(false);
    const e = await financeStore.listExpenses(50);
    setExpenses(e);
    setSaving(false);
  }

  if (loading) return <div className="text-slate-400 py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-slate-300">Nova Despesa</h3>
          <button
            onClick={() => setShowCsv(!showCsv)}
            className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
          >
            {showCsv ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Importar CSV
          </button>
        </div>

        {showCsv && (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-slate-500">
              Formato: product_id,category,kind,description,month,amount_brl (uma linha por despesa, com header)
            </p>
            <textarea
              className={inputClass + ' h-28 font-mono text-xs'}
              placeholder="product_id,category,kind,description,month,amount_brl&#10;clearix,infra_cloud,subscription,Supabase Pro,2025-04,125.00"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
            <button
              onClick={handleCsvImport}
              disabled={saving}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 rounded-md text-sm disabled:opacity-50"
            >
              {saving ? 'Importando...' : 'Importar'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Produto</label>
            <select className={inputClass} value={draft.product_id} onChange={e => setDraft({ ...draft, product_id: e.target.value })}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Vendor</label>
            <select className={inputClass} value={draft.vendor_id} onChange={e => setDraft({ ...draft, vendor_id: e.target.value })}>
              <option value="">(sem vendor)</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Categoria</label>
            <select className={inputClass} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as ExpenseCategory })}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Tipo</label>
            <select className={inputClass} value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as any })}>
              <option value="one_time">One-time</option>
              <option value="subscription">Subscription</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Mês de competência</label>
            <input type="month" className={inputClass} value={draft.month.slice(0, 7)} onChange={e => setDraft({ ...draft, month: e.target.value + '-01' })} />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Valor BRL</label>
            <input type="number" step="0.01" min="0" className={inputClass} value={draft.amount_brl || ''} onChange={e => setDraft({ ...draft, amount_brl: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Descrição</label>
            <input type="text" className={inputClass} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Supabase Pro plan / MacBook Pro 14 / Figma Professional" />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Moeda original</label>
            <select className={inputClass} value={draft.original_currency} onChange={e => setDraft({ ...draft, original_currency: e.target.value })}>
              <option value="">BRL (sem conversão)</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          {draft.original_currency && (
            <>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Valor original ({draft.original_currency})</label>
                <input type="number" step="0.01" min="0" className={inputClass} value={draft.amount_original || ''} onChange={e => setDraft({ ...draft, amount_original: parseFloat(e.target.value) || undefined })} />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Cotação</label>
                <input type="number" step="0.0001" min="0" className={inputClass} value={draft.exchange_rate || ''} onChange={e => setDraft({ ...draft, exchange_rate: parseFloat(e.target.value) || undefined })} />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-slate-400 mb-1">Nota fiscal / ref</label>
            <input type="text" className={inputClass} value={draft.invoice_ref} onChange={e => setDraft({ ...draft, invoice_ref: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-slate-400 mb-1">Observações</label>
            <input type="text" className={inputClass} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-[#2563EB] hover:bg-blue-600 rounded-md text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Despesa'}
          </button>
          {msg && <span className={`text-sm ${msg.startsWith('Erro') ? 'text-red-400' : 'text-green-400'}`}>{msg}</span>}
        </div>
      </div>

      {/* Recent list */}
      {expenses.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Últimas Despesas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-slate-500 text-xs uppercase">
                  <th className="text-left pb-3">Mês</th>
                  <th className="text-left pb-3">Descrição</th>
                  <th className="text-left pb-3">Produto</th>
                  <th className="text-left pb-3">Categoria</th>
                  <th className="text-left pb-3">Tipo</th>
                  <th className="text-right pb-3">Valor</th>
                  <th className="text-right pb-3"></th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((e) => (
                  <tr key={e.id} className="border-t border-slate-800/50">
                    <td className="py-2 text-slate-400">{monthLabel(e.month)}</td>
                    <td className="py-2 text-white">{e.description}</td>
                    <td className="py-2 text-slate-400">{e.product_name}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 rounded-full text-xs bg-slate-800 text-slate-300">{e.category_label}</span>
                    </td>
                    <td className="py-2 text-slate-400">{e.kind === 'subscription' ? 'Sub' : 'One-time'}</td>
                    <td className="py-2 text-right font-mono text-white">{brl(Number(e.amount_brl))}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleDelete(e.id)} className="text-slate-600 hover:text-red-400 transition-colors">
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// TAB 3 — Subscriptions
// =====================================================================
function SubscriptionsTab() {
  const [subs, setSubs] = useState<Subscription[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [showForm, setShowForm] = useState(false);

  const emptyDraft = {
    vendor_id: '',
    product_id: 'clearix',
    plan_name: '',
    monthly_amount_brl: 0,
    started_on: new Date().toISOString().slice(0, 10),
    notes: '',
  };
  const [draft, setDraft] = useState(emptyDraft);

  const load = useCallback(async () => {
    setLoading(true);
    const [s, p, v] = await Promise.all([
      financeStore.listSubscriptions(),
      financeStore.listProducts(),
      financeStore.listVendors(),
    ]);
    setSubs(s);
    setProducts(p);
    setVendors(v);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleAdd() {
    if (!draft.vendor_id || !draft.plan_name || draft.monthly_amount_brl <= 0) {
      setMsg('Preencha vendor, plano e valor.');
      return;
    }
    setMsg('');
    try {
      await financeStore.addSubscription(draft);
      setDraft(emptyDraft);
      setShowForm(false);
      setMsg('Subscription adicionada!');
      load();
    } catch (err: any) {
      setMsg('Erro: ' + (err?.message || 'falha'));
    }
  }

  async function handleClose(id: string) {
    try {
      await financeStore.closeSubscription(id);
      setMsg('Subscription encerrada.');
      load();
    } catch (err: any) {
      setMsg('Erro: ' + (err?.message || 'falha'));
    }
  }

  async function handleGenerate() {
    setMsg('');
    try {
      const count = await financeStore.registerMonthFromSubscriptions();
      setMsg(count > 0 ? `${count} despesas geradas para este mês!` : 'Nenhuma nova despesa (já existem ou sem subs ativas).');
    } catch (err: any) {
      setMsg('Erro: ' + (err?.message || 'falha'));
    }
  }

  const activeSubs = subs.filter(s => s.is_active);
  const inactiveSubs = subs.filter(s => !s.is_active);
  const monthlyTotal = activeSubs.reduce((a, s) => a + Number(s.monthly_amount_brl), 0);

  if (loading) return <div className="text-slate-400 py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-slate-400 text-sm">{activeSubs.length} ativas</span>
          <span className="text-slate-600 mx-2">·</span>
          <span className="text-sm font-mono text-white">{brl(monthlyTotal)}/mês</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleGenerate} className="px-4 py-2 bg-slate-700 hover:bg-slate-600 rounded-md text-sm flex items-center gap-2">
            <RefreshCw size={14} /> Gerar despesas do mês
          </button>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-[#2563EB] hover:bg-blue-600 rounded-md text-sm flex items-center gap-2">
            <PlusCircle size={14} /> Nova Subscription
          </button>
        </div>
      </div>

      {msg && <div className={`text-sm ${msg.startsWith('Erro') ? 'text-red-400' : 'text-green-400'}`}>{msg}</div>}

      {showForm && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-slate-300">Nova Subscription</h3>
            <button onClick={() => setShowForm(false)} className="text-slate-500 hover:text-white"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1">Vendor</label>
              <select className={inputClass} value={draft.vendor_id} onChange={e => setDraft({ ...draft, vendor_id: e.target.value })}>
                <option value="">Selecione...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Produto</label>
              <select className={inputClass} value={draft.product_id} onChange={e => setDraft({ ...draft, product_id: e.target.value })}>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Plano</label>
              <input type="text" className={inputClass} value={draft.plan_name} onChange={e => setDraft({ ...draft, plan_name: e.target.value })} placeholder="Pro / Team / Professional" />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Valor Mensal (BRL)</label>
              <input type="number" step="0.01" min="0" className={inputClass} value={draft.monthly_amount_brl || ''} onChange={e => setDraft({ ...draft, monthly_amount_brl: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Início</label>
              <input type="date" className={inputClass} value={draft.started_on} onChange={e => setDraft({ ...draft, started_on: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-slate-400 mb-1">Notas</label>
              <input type="text" className={inputClass} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>
          <button onClick={handleAdd} className="mt-4 px-5 py-2 bg-[#2563EB] hover:bg-blue-600 rounded-md text-sm font-medium">
            Salvar
          </button>
        </div>
      )}

      {/* Active subs */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Ativas</h3>
        {activeSubs.length === 0 ? (
          <div className="text-slate-500 text-sm">Nenhuma subscription ativa.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-slate-500 text-xs uppercase">
                <th className="text-left pb-3">Vendor</th>
                <th className="text-left pb-3">Plano</th>
                <th className="text-left pb-3">Produto</th>
                <th className="text-right pb-3">R$/mês</th>
                <th className="text-left pb-3">Desde</th>
                <th className="text-right pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {activeSubs.map((s) => (
                <tr key={s.id} className="border-t border-slate-800/50">
                  <td className="py-2 text-white">{s.vendor_name}</td>
                  <td className="py-2 text-slate-300">{s.plan_name}</td>
                  <td className="py-2 text-slate-400">{s.product_name}</td>
                  <td className="py-2 text-right font-mono text-white">{brl(Number(s.monthly_amount_brl))}</td>
                  <td className="py-2 text-slate-400">{s.started_on}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleClose(s.id)}
                      className="text-xs text-slate-500 hover:text-red-400 flex items-center gap-1 ml-auto"
                    >
                      <XCircle size={14} /> Encerrar
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Inactive subs */}
      {inactiveSubs.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6 opacity-60">
          <h3 className="text-sm font-semibold text-slate-500 mb-4">Encerradas</h3>
          <table className="w-full text-sm">
            <tbody>
              {inactiveSubs.map((s) => (
                <tr key={s.id} className="border-t border-slate-800/50">
                  <td className="py-2 text-slate-500">{s.vendor_name}</td>
                  <td className="py-2 text-slate-600">{s.plan_name}</td>
                  <td className="py-2 text-slate-600">{s.product_name}</td>
                  <td className="py-2 text-right font-mono text-slate-500">{brl(Number(s.monthly_amount_brl))}</td>
                  <td className="py-2 text-slate-600">{s.started_on} → {s.ended_on}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// =====================================================================
// TAB 4 — Relatório (genérico com filtro de projeto)
// =====================================================================
function RelatorioTab() {
  const [allExpenses, setAllExpenses] = useState<Expense[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [filterProduct, setFilterProduct] = useState<string>('all');

  const load = useCallback(async () => {
    setLoading(true);
    const [e, p] = await Promise.all([
      financeStore.listExpenses(5000),
      financeStore.listProducts(),
    ]);
    setAllExpenses(e);
    setProducts(p);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const filtered = filterProduct === 'all'
    ? allExpenses
    : allExpenses.filter(e => e.product_id === filterProduct);
  const totalFiltered = filtered.reduce((a, e) => a + Number(e.amount_brl), 0);

  // By category
  const catTotals: Record<string, number> = {};
  for (const e of filtered) {
    catTotals[e.category] = (catTotals[e.category] || 0) + Number(e.amount_brl);
  }
  const sortedCats = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);

  // By vendor
  const vendorTotals: Record<string, { name: string; total: number; count: number }> = {};
  for (const e of filtered) {
    const key = e.vendor_name || 'Sem vendor';
    if (!vendorTotals[key]) vendorTotals[key] = { name: key, total: 0, count: 0 };
    vendorTotals[key].total += Number(e.amount_brl);
    vendorTotals[key].count++;
  }
  const sortedVendors = Object.values(vendorTotals).sort((a, b) => b.total - a.total);

  // By month
  const monthTotals: Record<string, number> = {};
  for (const e of filtered) {
    monthTotals[e.month] = (monthTotals[e.month] || 0) + Number(e.amount_brl);
  }
  const sortedMonths = Object.entries(monthTotals).sort((a, b) => a[0].localeCompare(b[0]));

  const filterLabel = filterProduct === 'all' ? 'Todos os Projetos' : products.find(p => p.id === filterProduct)?.name || filterProduct;

  async function handleExport() {
    setExporting(true);
    let csv = 'mes,categoria,label,vendor,descricao,usd,cotacao,brl\n';
    for (const e of filtered) {
      csv += `${e.month},${e.category},${e.category_label},${e.vendor_name || ''},${e.description.replace(/,/g, ';')},${e.amount_original || ''},${e.exchange_rate || ''},${Number(e.amount_brl).toFixed(2)}\n`;
    }
    csv += `\n,,TOTAL,,,,,${totalFiltered.toFixed(2)}\n`;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const slug = filterProduct === 'all' ? 'digiai_todos' : filterProduct;
    a.download = `investimento_${slug}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setExporting(false);
  }

  if (loading) return <div className="text-slate-400 py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Product filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-500 uppercase tracking-wide">Projeto:</span>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterProduct('all')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              filterProduct === 'all' ? 'bg-[#2563EB]/20 text-white border border-[#2563EB]/40' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            Todos
          </button>
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterProduct(p.id)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                filterProduct === p.id ? 'bg-[#2563EB]/20 text-white border border-[#2563EB]/40' : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {p.id === 'clearix' ? 'Clearix' : p.id === 'digiai' ? 'DigiAI' : p.id === 'compartilhado' ? 'Compartilhado' : p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Hero card */}
      <div className="bg-gradient-to-br from-blue-900/30 to-cyan-900/20 border border-blue-500/20 rounded-xl p-8 text-center">
        <div className="text-xs text-slate-400 uppercase tracking-widest mb-2">Investimento Total — {filterLabel}</div>
        <div className="text-5xl font-bold text-white mb-1">{brl(totalFiltered)}</div>
        <div className="text-sm text-slate-400">
          {filtered.length} lançamentos
          {sortedMonths.length > 0 && ` · ${monthLabel(sortedMonths[0][0])} a ${monthLabel(sortedMonths[sortedMonths.length - 1][0])}`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By category */}
        {sortedCats.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Por Categoria</h3>
            <div className="space-y-3">
              {sortedCats.map(([cat, total]) => {
                const pct = totalFiltered > 0 ? (total / totalFiltered) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-36 text-sm text-slate-300 truncate">{CATEGORY_LABELS[cat as ExpenseCategory] || cat}</div>
                    <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat as ExpenseCategory] || '#64748b' }}
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-mono text-slate-300">{brl(total)}</div>
                    <div className="w-12 text-right text-xs text-slate-500">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* By vendor */}
        {sortedVendors.length > 0 && (
          <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-slate-300 mb-4">Por Vendor</h3>
            <div className="space-y-3">
              {sortedVendors.map((v) => {
                const pct = totalFiltered > 0 ? (v.total / totalFiltered) * 100 : 0;
                return (
                  <div key={v.name} className="flex items-center gap-3">
                    <div className="w-36 text-sm text-slate-300 truncate">{v.name}</div>
                    <div className="flex-1 h-4 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-cyan-500" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-24 text-right text-sm font-mono text-slate-300">{brl(v.total)}</div>
                    <div className="w-12 text-right text-xs text-slate-500">{v.count}x</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Monthly breakdown */}
      {sortedMonths.length > 0 && (
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-slate-300 mb-4">Por Mês</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sortedMonths.map(([month, total]) => (
              <div key={month} className="bg-slate-800/50 rounded-lg p-3 text-center">
                <div className="text-xs text-slate-500">{monthLabel(month)}</div>
                <div className="text-sm font-mono text-white mt-1">{brl(total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export button */}
      <div className="flex justify-center">
        <button
          onClick={handleExport}
          disabled={exporting || filtered.length === 0}
          className="px-6 py-3 bg-[#2563EB] hover:bg-blue-600 rounded-lg text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Download size={16} />
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-slate-500 text-sm py-4">
          Nenhuma despesa registrada{filterProduct !== 'all' ? ' para este projeto' : ''}.
        </div>
      )}
    </div>
  );
}
