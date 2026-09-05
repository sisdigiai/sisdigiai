import { useCallback, useEffect, useState } from 'react';
import {
  BarChart3, PlusCircle, RefreshCw, CreditCard, FileDown,
  Trash2, X, DollarSign, TrendingDown, Repeat, Download,
  ChevronDown, ChevronUp, XCircle, AlertTriangle, Server, Landmark,
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, BarElement, Tooltip, Legend,
} from 'chart.js';
import { Bar } from 'react-chartjs-2';
import PageHeader from '../components/PageHeader';
import { Sparkline, DeltaBadge, deltaPct } from '../components/ChartKit';
import {
  financeStore,
  CATEGORY_LABELS, CATEGORY_COLORS,
  type Product, type Vendor, type Expense, type Subscription,
  type VendorSpend, type MonthlyByCategory, type ExpenseCategory,
  type RevenueRow, type FounderTime, type InfraCost, type Aporte,
} from '../lib/financeStore';

ChartJS.register(CategoryScale, LinearScale, BarElement, Tooltip, Legend);

type TabId = 'dashboard' | 'lancar' | 'subscriptions' | 'infra' | 'relatorio';

const TABS: Array<{ id: TabId; label: string; icon: typeof BarChart3 }> = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'lancar', label: 'Lançar Despesa', icon: PlusCircle },
  { id: 'subscriptions', label: 'Subscriptions', icon: CreditCard },
  { id: 'infra', label: 'Infra (aporte)', icon: Server },
  { id: 'relatorio', label: 'Relatório', icon: FileDown },
];

const inputClass = 'w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary';

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
      <PageHeader
        eyebrow="Investimento Real"
        title="Financeiro"
        subtitle="Investimento real da DigiAI — segmentado por produto, categoria e vendor."
      >
        <nav className="flex gap-1 border-b border-outline/10 mt-6">
          {TABS.map((t) => {
            const Icon = t.icon;
            return (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                  tab === t.id
                    ? 'border-secondary text-on-surface'
                    : 'border-transparent text-muted hover:text-on-surface'
                }`}
              >
                <Icon size={16} /> {t.label}
              </button>
            );
          })}
        </nav>
      </PageHeader>

      <section>
        {tab === 'dashboard' && <DashboardTab />}
        {tab === 'lancar' && <LancarTab />}
        {tab === 'subscriptions' && <SubscriptionsTab />}
        {tab === 'infra' && <InfraTab />}
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
  const [excludeAporte, setExcludeAporte] = useState(false);

  // Cores do chart.js seguem o tema (canvas não lê var() — resolve por data-theme)
  const [themeAttr, setThemeAttr] = useState(() => document.documentElement.getAttribute('data-theme'));
  useEffect(() => {
    const mo = new MutationObserver(() => setThemeAttr(document.documentElement.getAttribute('data-theme')));
    mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    return () => mo.disconnect();
  }, []);
  const isLight = themeAttr === 'light';
  const chartTick = isLight ? '#5a5f6b' : '#64748b';
  const chartGrid = isLight ? '#dde2f3' : '#1e293b';
  const chartLegend = isLight ? '#46464c' : '#94a3b8';

  const [revenue, setRevenue] = useState<RevenueRow[]>([]);
  const [founder, setFounder] = useState<FounderTime[]>([]);
  const [aportes, setAportes] = useState<Aporte[]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    const [e, m, v, s, p, r, f, a] = await Promise.all([
      financeStore.listExpenses(5000),
      financeStore.listMonthlyByCategory(),
      financeStore.listVendorSpend(),
      financeStore.listSubscriptions(),
      financeStore.listProducts(),
      financeStore.listRevenue(),
      financeStore.listFounderTime(),
      financeStore.listAportes(),
    ]);
    setAllExpenses(e);
    setMonthlyByCat(m);
    setVendorSpend(v);
    setAllSubs(s);
    setProducts(p);
    setRevenue(r);
    setFounder(f);
    setAportes(a);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  // Filters: aporte intelectual + projeto
  const APORTE_SLUG = 'aporte-fundador';
  const baseExpenses = excludeAporte
    ? allExpenses.filter(e => e.vendor_slug !== APORTE_SLUG)
    : allExpenses;
  const expenses = filterProduct === 'all'
    ? baseExpenses
    : baseExpenses.filter(e => e.product_id === filterProduct);

  const baseSubs = excludeAporte
    ? allSubs.filter(s => s.vendor_slug !== APORTE_SLUG)
    : allSubs;
  const subs = filterProduct === 'all'
    ? baseSubs
    : baseSubs.filter(s => s.product_id === filterProduct);

  const aporteTotal = allExpenses
    .filter(e => e.vendor_slug === APORTE_SLUG)
    .reduce((a, e) => a + Number(e.amount_brl), 0);

  // KPIs
  const total12m = expenses.reduce((a, e) => a + Number(e.amount_brl), 0);

  const now = new Date();
  const threeMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 3, 1).toISOString().slice(0, 10);
  // Burn = saída de CAIXA. O aporte intelectual (sweat equity) é não-caixa — nunca entra no burn.
  const recentExpenses = expenses.filter(e => e.month >= threeMonthsAgo && e.kind !== 'aporte_intelectual');
  const uniqueRecentMonths = new Set(recentExpenses.map(e => e.month)).size || 1;
  const burnRate3m = recentExpenses.reduce((a, e) => a + Number(e.amount_brl), 0) / uniqueRecentMonths;

  const activeSubs = subs.filter(s => s.is_active);
  const monthlySubsTotal = activeSubs.reduce((a, s) => a + Number(s.monthly_amount_brl), 0);

  // ===== Saúde financeira: receita × caixa × fundador =====
  const filteredRevenue = filterProduct === 'all' ? revenue : revenue.filter(r => r.product_id === filterProduct);
  const receitaTotal = filteredRevenue.reduce((a, r) => a + Number(r.mrr_brl || 0) + Number(r.one_time_brl || 0), 0);
  const ultimoMesReceita = [...filteredRevenue].sort((a, b) => b.month.localeCompare(a.month))[0]?.month;
  const mrrAtual = filteredRevenue.filter(r => r.month === ultimoMesReceita).reduce((a, r) => a + Number(r.mrr_brl || 0), 0);
  // Caixa = tudo que saiu de verdade (exclui aporte intelectual, que é não-caixa)
  const caixaTotal = expenses.filter(e => e.kind !== 'aporte_intelectual').reduce((a, e) => a + Number(e.amount_brl), 0);
  const resultadoCaixa = receitaTotal - caixaTotal;
  const founderHoras = founder.reduce((a, f) => a + Number(f.hours_worked || 0), 0);
  const founderValor = founder.reduce((a, f) => a + Number(f.valued_amount_brl || 0), 0);
  const preReceita = receitaTotal === 0;

  // Aportes de CAIXA (finance.aportes): quem financiou o buraco. Não passa pelo filtro de
  // projeto — aporte entra na empresa, não num produto. NUNCA somar com o aporte intelectual.
  const somaAporte = (n: Aporte['natureza']) => aportes.filter(a => a.natureza === n).reduce((s, a) => s + Number(a.valor_brl), 0);
  const aporteInvestimento = somaAporte('investimento');
  const aporteEmprestimo = somaAporte('emprestimo');
  const aporteDevolucao = somaAporte('devolucao');
  const aporteCaixaLiquido = aporteInvestimento + aporteEmprestimo - aporteDevolucao;
  const NATUREZA_LABEL: Record<Aporte['natureza'], string> = { investimento: 'Investimento', emprestimo: 'Empréstimo', devolucao: 'Devolução' };
  const dataBr = (iso: string) => new Date(`${iso}T00:00:00`).toLocaleDateString('pt-BR');

  // Chart data — recompute from filtered expenses (not from monthlyByCat view which has no product filter)
  const expByMonthCat: Record<string, Record<string, number>> = {};
  for (const e of expenses) {
    if (!expByMonthCat[e.month]) expByMonthCat[e.month] = {};
    expByMonthCat[e.month][e.category] = (expByMonthCat[e.month][e.category] || 0) + Number(e.amount_brl);
  }
  const monthSet = Object.keys(expByMonthCat).sort();
  const last12Months = monthSet.slice(-12);
  const categories = [...new Set(expenses.map(e => e.category))] as ExpenseCategory[];

  // Série mensal de gasto total (real) — sparkline nos KPIs.
  const monthlyTotals = last12Months.map(m => Object.values(expByMonthCat[m] || {}).reduce((a, b) => a + b, 0));

  // Delta do BURN: série própria, por dois motivos que já produziram um número falso.
  //
  // 1. SÓ CAIXA. `monthlyTotals` inclui aporte intelectual, que é não-caixa. Usá-lo no
  //    selo do card "Burn de Caixa · só caixa" fazia rótulo e selo medirem coisas
  //    diferentes: maio somava R$ 27.247 COM aporte contra R$ 3.214 sem.
  // 2. NUNCA CONTRA MÊS NÃO FECHADO. O mês mais recente do razão é sempre suspeito —
  //    ou é o mês corrente (parcial por natureza), ou o razão parou no meio dele, que é
  //    o caso hoje: último lançamento em 12/06. Comparar contra ele mostrava
  //    "▼ 94,0% vs mês anterior", lido como economia quando era extrato faltando.
  //    Mesma trava que o `parcial` já faz em finance.infra_costs.
  const caixaByMonth: Record<string, number> = {};
  for (const e of expenses) {
    if (e.kind === 'aporte_intelectual') continue;
    caixaByMonth[e.month] = (caixaByMonth[e.month] || 0) + Number(e.amount_brl);
  }
  const mesesCaixa = Object.keys(caixaByMonth).sort();
  const mesesFechados = mesesCaixa.slice(0, -1);
  const burnDelta = deltaPct(mesesFechados.map(m => caixaByMonth[m]));
  const burnComparados = mesesFechados.slice(-2);

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

  if (loading) return <div className="text-muted py-8">Carregando...</div>;

  const filterLabel = filterProduct === 'all' ? 'Todos' : products.find(p => p.id === filterProduct)?.name || filterProduct;

  return (
    <div className="space-y-8">
      {/* Filtros: projeto + aporte */}
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted uppercase tracking-wide">Projeto:</span>
          <div className="flex gap-1 flex-wrap">
            <button
              onClick={() => setFilterProduct('all')}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                filterProduct === 'all' ? 'bg-secondary-container/40 text-on-surface border border-secondary/40' : 'bg-surface-high text-muted hover:text-on-surface'
              }`}
            >
              Todos
            </button>
            {products.map(p => (
              <button
                key={p.id}
                onClick={() => setFilterProduct(p.id)}
                className={`px-3 py-1 text-xs font-medium transition-colors ${
                  filterProduct === p.id ? 'bg-secondary-container/40 text-on-surface border border-secondary/40' : 'bg-surface-high text-muted hover:text-on-surface'
                }`}
              >
                {p.id === 'clearix' ? 'Clearix' : p.id === 'digiai' ? 'DigiAI' : p.id === 'compartilhado' ? 'Compartilhado' : p.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={() => setExcludeAporte(v => !v)}
          title={`Aporte intelectual do fundador: ${brl(aporteTotal)} em despesas valoradas — clique para ocultar/mostrar`}
          className={`px-3 py-1 text-xs font-medium transition-colors border ${
            excludeAporte
              ? 'bg-warning/15 text-warning border-warning/40'
              : 'bg-surface-high text-muted hover:text-on-surface border-transparent'
          }`}
        >
          {excludeAporte ? `Aporte oculto (−${brl(aporteTotal)})` : `Ocultar aporte intelectual (${brl(aporteTotal)})`}
        </button>
      </div>

      {/* Frescor dos dados — extrato é a fonte da verdade; sem import recente, tudo aqui é verdade VELHA.
          O selo mede a DATA DO LANÇAMENTO (created_at), não o mês coberto: um import feito hoje de
          extratos velhos zera o contador. Por isso a legenda ao lado diz até que mês o razão vai. */}
      {(() => {
        const ultimo = expenses.reduce<string | null>((max, e) => (e.created_at && (!max || e.created_at > max) ? e.created_at : max), null);
        const dias = ultimo ? Math.floor((Date.now() - new Date(ultimo).getTime()) / 86400000) : null;
        const ultimoMesRazao = mesesCaixa[mesesCaixa.length - 1];
        return (
          <div className="space-y-2">
            {ultimo && (
              <div className="font-mono text-[10px] uppercase tracking-wider text-muted">
                razão de caixa até {ultimoMesRazao ? monthLabel(ultimoMesRazao) : '—'} · último lançamento em {new Date(ultimo).toLocaleDateString('pt-BR')}
              </div>
            )}
            {dias != null && dias > 30 && (
              <div className="border border-warning/40 bg-warning/10 px-4 py-2.5 text-[12px] text-on-surface flex items-center gap-2">
                <span className="font-mono text-[10px] uppercase tracking-wider text-warning shrink-0">dados defasados</span>
                <span>Último lançamento há <strong>{dias} dias</strong> — importar o extrato antes de usar estes números em decisão ou venda (extrato = fonte da verdade).</span>
              </div>
            )}
          </div>
        );
      })()}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label={`Total Investido${filterProduct !== 'all' ? '' : ' (geral)'}`} value={brl(total12m)} icon={<DollarSign size={20} />} color="text-secondary" spark={monthlyTotals} />
        <KpiCard label="Lançamentos" value={String(expenses.length)} sub="despesas registradas" icon={<TrendingDown size={20} />} color="text-secondary" />
        <KpiCard label="Burn de Caixa (média)" value={brl(burnRate3m)} sub={burnComparados.length === 2 ? `/mês · só caixa · ${monthLabel(burnComparados[0] )} → ${monthLabel(burnComparados[1])}` : '/mês · só caixa'} icon={<BarChart3 size={20} />} color="text-secondary" delta={burnDelta} invert />
        <KpiCard label="Subscriptions ativas" value={brl(monthlySubsTotal)} sub={`${activeSubs.length} serviços`} icon={<Repeat size={20} />} color="text-secondary" />
      </div>

      {/* Saúde financeira: receita × caixa */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-5 py-3 border-b border-outline/10 flex items-center justify-between flex-wrap gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Saúde financeira — receita × caixa</span>
          {preReceita && (
            <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border border-warning/40 text-warning bg-warning/10">
              pré-receita · MRR virá do billing (Mercado Pago) e vendas OSI
            </span>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-outline/10">
          <div className="p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Receita acumulada</div>
            <div className="font-serif text-2xl font-semibold tabular-nums mt-1 text-on-surface">{brl(receitaTotal)}</div>
          </div>
          <div className="p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">MRR atual</div>
            <div className="font-serif text-2xl font-semibold tabular-nums mt-1 text-on-surface">{brl(mrrAtual)}</div>
          </div>
          <div className="p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Resultado de caixa</div>
            <div className={`font-serif text-2xl font-semibold tabular-nums mt-1 ${resultadoCaixa >= 0 ? 'text-success' : 'text-danger'}`}>{brl(resultadoCaixa)}</div>
            <div className="text-[10px] text-muted mt-0.5">receita − caixa investido ({brl(caixaTotal)})</div>
            {aportes.length > 0 && (
              <div className="text-[10px] text-muted mt-0.5">bancado por aportes de caixa: {brl(aporteCaixaLiquido)} líquidos ↓</div>
            )}
          </div>
          <div className="p-4">
            <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Fundador (sweat equity)</div>
            <div className="font-serif text-2xl font-semibold tabular-nums mt-1 text-on-surface">{founderHoras.toLocaleString('pt-BR')}h</div>
            <div className="text-[10px] text-muted mt-0.5">{brl(founderValor)} valorados (não-caixa)</div>
          </div>
        </div>
      </div>

      {/* Aportes de CAIXA — quem financiou o buraco. Bloco próprio, nunca somado ao aporte intelectual. */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-5 py-3 border-b border-outline/10 flex items-center justify-between flex-wrap gap-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-secondary flex items-center gap-2">
            <Landmark size={12} /> Aportes de caixa — quem financiou o gasto
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
            dinheiro que entrou · separado do aporte intelectual (não-caixa) · não filtra por projeto
          </span>
        </div>
        {aportes.length === 0 ? (
          <div className="p-4 text-xs text-muted">
            Nenhum aporte de caixa visível — ou não há registro em <code className="font-mono">finance.aportes</code>, ou este login não é super_admin (a RLS só libera leitura ao dono).
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 divide-x divide-outline/10">
              <div className="p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Investimento</div>
                <div className="font-serif text-2xl font-semibold tabular-nums mt-1 text-success">{brl(aporteInvestimento)}</div>
                <div className="text-[10px] text-muted mt-0.5">capital · não volta</div>
              </div>
              <div className="p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Empréstimos</div>
                <div className="font-serif text-2xl font-semibold tabular-nums mt-1 text-on-surface">{brl(aporteEmprestimo)}</div>
                <div className="text-[10px] text-muted mt-0.5">passivo · volta</div>
              </div>
              <div className="p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Devoluções</div>
                <div className="font-serif text-2xl font-semibold tabular-nums mt-1 text-danger">−{brl(aporteDevolucao)}</div>
                <div className="text-[10px] text-muted mt-0.5">saiu no sentido inverso</div>
              </div>
              <div className="p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">Líquido em caixa</div>
                <div className={`font-serif text-2xl font-semibold tabular-nums mt-1 ${aporteCaixaLiquido >= 0 ? 'text-success' : 'text-danger'}`}>{brl(aporteCaixaLiquido)}</div>
                <div className="text-[10px] text-muted mt-0.5">investimento + empréstimos − devoluções</div>
              </div>
            </div>
            <div className="px-5 py-3 border-t border-outline/10 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-muted text-xs uppercase">
                    <th className="text-left pb-2">Data</th>
                    <th className="text-left pb-2">Origem</th>
                    <th className="text-left pb-2">Natureza</th>
                    <th className="text-right pb-2">Valor</th>
                  </tr>
                </thead>
                <tbody>
                  {aportes.map((a) => (
                    <tr key={a.id} className="border-t border-outline/10" title={a.observacao || undefined}>
                      <td className="py-2 text-muted whitespace-nowrap">{dataBr(a.data)}</td>
                      <td className="py-2 text-on-surface">{a.origem}</td>
                      <td className="py-2">
                        <span className={`px-2 py-0.5 text-xs border ${
                          a.natureza === 'devolucao' ? 'border-danger/40 text-danger bg-danger/10'
                          : a.natureza === 'emprestimo' ? 'border-warning/40 text-warning bg-warning/10'
                          : 'border-success/40 text-success bg-success/10'
                        }`}>{NATUREZA_LABEL[a.natureza]}</span>
                      </td>
                      <td className={`py-2 text-right font-mono ${a.natureza === 'devolucao' ? 'text-danger' : 'text-on-surface'}`}>
                        {a.natureza === 'devolucao' ? '−' : ''}{brl(Number(a.valor_brl))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Stacked bar chart */}
      {last12Months.length > 0 && (
        <div className="bg-surface-lowest border border-outline/15 p-6">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Despesas Mensais por Categoria</h3>
          <div className="h-72">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: 'bottom', labels: { color: chartLegend, boxWidth: 12, font: { size: 11 } } },
                  tooltip: {
                    callbacks: { label: (ctx) => `${ctx.dataset.label}: ${brl(ctx.parsed.y)}` },
                  },
                },
                scales: {
                  x: { stacked: true, ticks: { color: chartTick }, grid: { display: false } },
                  y: { stacked: true, ticks: { color: chartTick, callback: (v) => `R$${v}` }, grid: { color: chartGrid } },
                },
              }}
            />
          </div>
        </div>
      )}

      {/* Top vendors */}
      {topVendors.length > 0 && (
        <div className="bg-surface-lowest border border-outline/15 p-6">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Top 10 Vendors por Gasto</h3>
          <div className="space-y-3">
            {topVendors.map((v) => (
              <div key={v.name} className="flex items-center gap-3">
                <div className="w-32 text-sm text-on-surface-variant truncate">{v.name}</div>
                <div className="flex-1 h-5 bg-surface-high overflow-hidden">
                  <div
                    className="h-full bg-secondary"
                    style={{ width: `${(v.total / maxVendor) * 100}%` }}
                  />
                </div>
                <div className="w-28 text-right text-sm font-mono text-on-surface-variant">{brl(v.total)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent expenses */}
      {expenses.length > 0 && (
        <div className="bg-surface-lowest border border-outline/15 p-6">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Últimos Lançamentos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase">
                  <th className="text-left pb-3">Mês</th>
                  <th className="text-left pb-3">Descrição</th>
                  <th className="text-left pb-3">Produto</th>
                  <th className="text-left pb-3">Categoria</th>
                  <th className="text-right pb-3">Valor</th>
                </tr>
              </thead>
              <tbody>
                {expenses.slice(0, 20).map((e) => (
                  <tr key={e.id} className="border-t border-outline/10">
                    <td className="py-2 text-muted">{monthLabel(e.month)}</td>
                    <td className="py-2 text-on-surface">{e.description}</td>
                    <td className="py-2 text-muted">{e.product_name}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 text-xs bg-surface-high text-on-surface-variant">
                        {e.category_label}
                      </span>
                    </td>
                    <td className="py-2 text-right font-mono text-on-surface">{brl(Number(e.amount_brl))}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {expenses.length === 0 && (
        <div className="text-center py-16 text-muted">
          Nenhuma despesa registrada. Use a aba "Lançar Despesa" para começar.
        </div>
      )}
    </div>
  );
}

function KpiCard({ label, value, sub, icon, color, spark, delta, invert }: { label: string; value: string; sub?: string; icon: React.ReactNode; color: string; spark?: number[]; delta?: number | null; invert?: boolean }) {
  return (
    <div className="bg-surface-lowest border border-outline/15 p-5">
      <div className="flex items-center gap-2 mb-2">
        <span className={color}>{icon}</span>
        <span className="text-xs text-muted uppercase tracking-wide">{label}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div className="text-2xl font-bold text-on-surface tabular-nums">{value}</div>
        {spark && <Sparkline data={spark} />}
      </div>
      {delta != null
        ? <div className="mt-1"><DeltaBadge pct={delta} invert={invert} /></div>
        : sub && <div className="text-xs text-muted mt-1">{sub}</div>}
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

  /**
   * Divide uma linha de CSV respeitando aspas. `split(',')` cru desloca todas as
   * colunas quando a descricao tem virgula — e descricao de extrato bancario tem
   * virgula o tempo todo ("PAGAMENTO FORNECEDOR, LTDA"). O resultado seria valor
   * gravado no campo errado, sem erro nenhum.
   */
  function dividirCsv(linha: string): string[] {
    const cols: string[] = [];
    let atual = '';
    let dentroDeAspas = false;
    for (let i = 0; i < linha.length; i++) {
      const c = linha[i];
      if (c === '"') {
        if (dentroDeAspas && linha[i + 1] === '"') { atual += '"'; i++; }
        else dentroDeAspas = !dentroDeAspas;
      } else if (c === ',' && !dentroDeAspas) {
        cols.push(atual.trim()); atual = '';
      } else {
        atual += c;
      }
    }
    cols.push(atual.trim());
    return cols;
  }

  async function handleCsvImport() {
    if (!csvText.trim()) return;
    setSaving(true);
    setMsg('');
    const lines = csvText.trim().split('\n').slice(1); // pula o cabecalho
    let count = 0;
    // Linha pulada NUNCA some em silencio. O codigo anterior tinha
    // `catch { skip bad rows }` e anunciava so o total importado: 40 de 60 linhas
    // podiam falhar e a mensagem dizia "20 despesas importadas", que se le como
    // sucesso. Em razao financeiro, importacao parcial silenciosa e pior que
    // importacao que falha inteira.
    const puladas: string[] = [];
    const mesesTocados = new Set<string>();

    for (const [idx, line] of lines.entries()) {
      const nLinha = idx + 2; // +1 do cabecalho, +1 para numerar a partir de 1
      if (!line.trim()) continue;
      const cols = dividirCsv(line);
      // Recusa numero de colunas diferente de 6 em vez de pegar as 6 primeiras.
      // O caso que motiva: valor em formato brasileiro sem aspas ("1.234,56") vira
      // duas colunas, e aceitar as 6 primeiras importaria 1.234 no lugar de 1.234,56 —
      // corrupcao silenciosa em razao financeiro. Melhor recusar e dizer por que.
      if (cols.length !== 6) {
        puladas.push(`linha ${nLinha}: ${cols.length} colunas, precisa de 6`
          + (cols.length > 6 ? ' — se a descricao ou o valor tem virgula, coloque o campo entre aspas' : ''));
        continue;
      }
      const [product_id, category, kind, description, month, amount_brl_str] = cols;
      const amount_brl = parseFloat(amount_brl_str.replace(/[R$\s]/g, '').replace(/\.(?=\d{3}\b)/g, '').replace(',', '.'));
      if (isNaN(amount_brl)) { puladas.push(`linha ${nLinha}: valor "${amount_brl_str}" nao e numero`); continue; }
      const mesNormalizado = month.length === 7 ? month + '-01' : month;
      try {
        await financeStore.addExpense({
          product_id,
          category: category as ExpenseCategory,
          kind: kind as 'subscription' | 'one_time' | 'aporte_intelectual',
          description,
          month: mesNormalizado,
          amount_brl,
        });
        count++;
        mesesTocados.add(mesNormalizado);
      } catch (err) {
        puladas.push(`linha ${nLinha}: ${err instanceof Error ? err.message : 'erro ao gravar'}`);
      }
    }

    // Alerta de duplicata: nao ha chave que impeca importar o mesmo extrato duas
    // vezes, e junho ja esta parcialmente carregado (o razao para em 12/06).
    // Importar junho inteiro por cima duplicaria o que ja existe.
    const jaExistiam = [...mesesTocados].filter(m => expenses.some(e => e.month === m));

    let aviso = `${count} despesa(s) importada(s).`;
    if (puladas.length) {
      aviso += ` ${puladas.length} pulada(s): ` + puladas.slice(0, 5).join(' · ')
             + (puladas.length > 5 ? ` · e mais ${puladas.length - 5}` : '');
    }
    if (jaExistiam.length) {
      aviso += ` ATENCAO: ${jaExistiam.join(', ')} ja tinha(m) lancamento antes desta importacao`
             + ' — confira duplicatas em Relatorio antes de usar os numeros.';
    }
    setMsg(aviso);
    setCsvText('');
    setShowCsv(false);
    const e = await financeStore.listExpenses(50);
    setExpenses(e);
    setSaving(false);
  }

  if (loading) return <div className="text-muted py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-surface-lowest border border-outline/15 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-on-surface-variant">Nova Despesa</h3>
          <button
            onClick={() => setShowCsv(!showCsv)}
            className="text-xs text-secondary hover:text-secondary/90 flex items-center gap-1"
          >
            {showCsv ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            Importar CSV
          </button>
        </div>

        {showCsv && (
          <div className="mb-4 space-y-2">
            <p className="text-xs text-muted">
              Formato: product_id,category,kind,description,month,amount_brl (uma linha por despesa, com header)
            </p>
            <textarea
              className={inputClass + ' h-28 font-mono text-xs'}
              placeholder="product_id,category,kind,description,month,amount_brl&#10;clearix,infra_cloud,subscription,Supabase Pro,2025-04,125.00&#10;clearix,personnel,aporte_intelectual,Mão de obra fundador,2025-05,18200.00"
              value={csvText}
              onChange={e => setCsvText(e.target.value)}
            />
            <button
              onClick={handleCsvImport}
              disabled={saving}
              className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm disabled:opacity-50"
            >
              {saving ? 'Importando...' : 'Importar'}
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs text-muted mb-1">Produto</label>
            <select className={inputClass} value={draft.product_id} onChange={e => setDraft({ ...draft, product_id: e.target.value })}>
              {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Vendor</label>
            <select className={inputClass} value={draft.vendor_id} onChange={e => setDraft({ ...draft, vendor_id: e.target.value })}>
              <option value="">(sem vendor)</option>
              {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Categoria</label>
            <select className={inputClass} value={draft.category} onChange={e => setDraft({ ...draft, category: e.target.value as ExpenseCategory })}>
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Tipo</label>
            <select className={inputClass} value={draft.kind} onChange={e => setDraft({ ...draft, kind: e.target.value as any })}>
              <option value="one_time">One-time</option>
              <option value="subscription">Subscription</option>
              <option value="aporte_intelectual">Aporte intelectual (não-caixa)</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Mês de competência</label>
            <input type="month" className={inputClass} value={draft.month.slice(0, 7)} onChange={e => setDraft({ ...draft, month: e.target.value + '-01' })} />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Valor BRL</label>
            <input type="number" step="0.01" min="0" className={inputClass} value={draft.amount_brl || ''} onChange={e => setDraft({ ...draft, amount_brl: parseFloat(e.target.value) || 0 })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted mb-1">Descrição</label>
            <input type="text" className={inputClass} value={draft.description} onChange={e => setDraft({ ...draft, description: e.target.value })} placeholder="Supabase Pro plan / MacBook Pro 14 / Figma Professional" />
          </div>
          <div>
            <label className="block text-xs text-muted mb-1">Moeda original</label>
            <select className={inputClass} value={draft.original_currency} onChange={e => setDraft({ ...draft, original_currency: e.target.value })}>
              <option value="">BRL (sem conversão)</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          {draft.original_currency && (
            <>
              <div>
                <label className="block text-xs text-muted mb-1">Valor original ({draft.original_currency})</label>
                <input type="number" step="0.01" min="0" className={inputClass} value={draft.amount_original || ''} onChange={e => setDraft({ ...draft, amount_original: parseFloat(e.target.value) || undefined })} />
              </div>
              <div>
                <label className="block text-xs text-muted mb-1">Cotação</label>
                <input type="number" step="0.0001" min="0" className={inputClass} value={draft.exchange_rate || ''} onChange={e => setDraft({ ...draft, exchange_rate: parseFloat(e.target.value) || undefined })} />
              </div>
            </>
          )}
          <div>
            <label className="block text-xs text-muted mb-1">Nota fiscal / ref</label>
            <input type="text" className={inputClass} value={draft.invoice_ref} onChange={e => setDraft({ ...draft, invoice_ref: e.target.value })} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs text-muted mb-1">Observações</label>
            <input type="text" className={inputClass} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
          </div>
        </div>

        <div className="flex items-center gap-4 mt-4">
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 bg-secondary hover:bg-secondary/90 text-sm font-medium disabled:opacity-50"
          >
            {saving ? 'Salvando...' : 'Salvar Despesa'}
          </button>
          {msg && <span className={`text-sm ${msg.startsWith('Erro') ? 'text-danger' : 'text-success'}`}>{msg}</span>}
        </div>
      </div>

      {/* Recent list */}
      {expenses.length > 0 && (
        <div className="bg-surface-lowest border border-outline/15 p-6">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Últimas Despesas</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-muted text-xs uppercase">
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
                  <tr key={e.id} className="border-t border-outline/10">
                    <td className="py-2 text-muted">{monthLabel(e.month)}</td>
                    <td className="py-2 text-on-surface">{e.description}</td>
                    <td className="py-2 text-muted">{e.product_name}</td>
                    <td className="py-2">
                      <span className="px-2 py-0.5 text-xs bg-surface-high text-on-surface-variant">{e.category_label}</span>
                    </td>
                    <td className="py-2 text-muted">{e.kind === 'subscription' ? 'Sub' : e.kind === 'aporte_intelectual' ? 'Aporte' : 'One-time'}</td>
                    <td className="py-2 text-right font-mono text-on-surface">{brl(Number(e.amount_brl))}</td>
                    <td className="py-2 text-right">
                      <button onClick={() => handleDelete(e.id)} className="text-muted hover:text-danger transition-colors">
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
// notes das subs auto-derivadas terminam com a data da derivação ("… 2026-06-06.")
function derivadoEm(notes?: string): string | null {
  if (!notes || !/Auto-derivado/i.test(notes)) return null;
  return notes.match(/(\d{4}-\d{2}-\d{2})/)?.[1] ?? null;
}

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

  // Valor auto-derivado é MÉDIA de um retrato antigo, não contrato confirmado. Como
  // "Gerar despesas do mês" grava esse valor em finance.expenses, número velho vira
  // lançamento errado no razão — por isso o aviso vive colado no botão.
  const derivadas = activeSubs.filter(s => derivadoEm(s.notes) !== null);
  const derivacaoMaisAntiga = derivadas
    .map(s => derivadoEm(s.notes)!)
    .sort()[0] ?? null;
  const diasDesdeDerivacao = derivacaoMaisAntiga
    ? Math.floor((Date.now() - new Date(derivacaoMaisAntiga).getTime()) / 86400000)
    : 0;

  if (loading) return <div className="text-muted py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-muted text-sm">{activeSubs.length} ativas</span>
          <span className="text-muted mx-2">·</span>
          <span className="text-sm font-mono text-on-surface">{brl(monthlyTotal)}/mês</span>
        </div>
        <div className="flex gap-2">
          <button onClick={handleGenerate} className="px-4 py-2 bg-surface-high hover:bg-surface-highest text-sm flex items-center gap-2">
            <RefreshCw size={14} /> Gerar despesas do mês
          </button>
          <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2">
            <PlusCircle size={14} /> Nova Subscription
          </button>
        </div>
      </div>

      {msg && <div className={`text-sm ${msg.startsWith('Erro') ? 'text-danger' : 'text-success'}`}>{msg}</div>}

      {derivadas.length > 0 && diasDesdeDerivacao >= 60 && (
        <div className="border border-warning/40 bg-warning/5 p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <div className="text-sm text-on-surface-variant leading-relaxed">
            <span className="font-medium text-on-surface">
              {derivadas.length} de {activeSubs.length} assinaturas usam valor auto-derivado de {new Date(derivacaoMaisAntiga + 'T00:00:00').toLocaleDateString('pt-BR')}
            </span>{' '}
            — média de despesas passadas, não contrato confirmado, e sem revisão há {diasDesdeDerivacao} dias.
            Serviço usage-based (Supabase, Anthropic, Netlify) varia muito mês a mês.
            <div className="mt-1 text-muted">
              <strong>Gerar despesas do mês</strong> grava esses valores em <code className="font-mono text-[11px]">finance.expenses</code>:
              confira contra a fatura real antes de usar, ou o razão herda o número velho.
            </div>
          </div>
        </div>
      )}

      {showForm && (
        <div className="bg-surface-lowest border border-outline/15 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-on-surface-variant">Nova Subscription</h3>
            <button onClick={() => setShowForm(false)} className="text-muted hover:text-on-surface"><X size={16} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-muted mb-1">Vendor</label>
              <select className={inputClass} value={draft.vendor_id} onChange={e => setDraft({ ...draft, vendor_id: e.target.value })}>
                <option value="">Selecione...</option>
                {vendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Produto</label>
              <select className={inputClass} value={draft.product_id} onChange={e => setDraft({ ...draft, product_id: e.target.value })}>
                {products.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Plano</label>
              <input type="text" className={inputClass} value={draft.plan_name} onChange={e => setDraft({ ...draft, plan_name: e.target.value })} placeholder="Pro / Team / Professional" />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Valor Mensal (BRL)</label>
              <input type="number" step="0.01" min="0" className={inputClass} value={draft.monthly_amount_brl || ''} onChange={e => setDraft({ ...draft, monthly_amount_brl: parseFloat(e.target.value) || 0 })} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Início</label>
              <input type="date" className={inputClass} value={draft.started_on} onChange={e => setDraft({ ...draft, started_on: e.target.value })} />
            </div>
            <div>
              <label className="block text-xs text-muted mb-1">Notas</label>
              <input type="text" className={inputClass} value={draft.notes} onChange={e => setDraft({ ...draft, notes: e.target.value })} />
            </div>
          </div>
          <button onClick={handleAdd} className="mt-4 px-5 py-2 bg-secondary hover:bg-secondary/90 text-sm font-medium">
            Salvar
          </button>
        </div>
      )}

      {/* Active subs */}
      <div className="bg-surface-lowest border border-outline/15 p-6">
        <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Ativas</h3>
        {activeSubs.length === 0 ? (
          <div className="text-muted text-sm">Nenhuma subscription ativa.</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-muted text-xs uppercase">
                <th className="text-left pb-3">Vendor</th>
                <th className="text-left pb-3">Plano</th>
                <th className="text-left pb-3">Produto</th>
                <th className="text-right pb-3 pr-6">R$/mês</th>
                <th className="text-left pb-3">Desde</th>
                <th className="text-right pb-3"></th>
              </tr>
            </thead>
            <tbody>
              {activeSubs.map((s) => (
                <tr key={s.id} className="border-t border-outline/10">
                  <td className="py-2 text-on-surface">{s.vendor_name}</td>
                  <td className="py-2 text-on-surface-variant">{s.plan_name}</td>
                  <td className="py-2 text-muted">{s.product_name}</td>
                  <td className="py-2 text-right font-mono text-on-surface pr-6 whitespace-nowrap">
                    {brl(Number(s.monthly_amount_brl))}
                    {derivadoEm(s.notes) && (
                      <span
                        className="ml-2 font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border text-warning border-warning/40 bg-warning/10"
                        title={`Média auto-derivada em ${derivadoEm(s.notes)} — não é contrato confirmado`}
                      >
                        derivado
                      </span>
                    )}
                  </td>
                  <td className="py-2 text-muted">{s.started_on}</td>
                  <td className="py-2 text-right">
                    <button
                      onClick={() => handleClose(s.id)}
                      className="text-xs text-muted hover:text-danger flex items-center gap-1 ml-auto"
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
        <div className="bg-surface-lowest border border-outline/15 p-6 opacity-60">
          <h3 className="text-sm font-semibold text-muted mb-4">Encerradas</h3>
          <table className="w-full text-sm">
            <tbody>
              {inactiveSubs.map((s) => (
                <tr key={s.id} className="border-t border-outline/10">
                  <td className="py-2 text-muted">{s.vendor_name}</td>
                  <td className="py-2 text-muted">{s.plan_name}</td>
                  <td className="py-2 text-muted">{s.product_name}</td>
                  <td className="py-2 text-right font-mono text-muted">{brl(Number(s.monthly_amount_brl))}</td>
                  <td className="py-2 text-muted">{s.started_on} → {s.ended_on}</td>
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
// TAB 4 — Infra (aporte 7.4, espelho do Finance)
// =====================================================================
function InfraTab() {
  const [linhas, setLinhas] = useState<InfraCost[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    financeStore.listInfraCosts().then((r) => { setLinhas(r); setLoading(false); });
  }, []);

  if (loading) return <div className="text-muted py-8">Carregando...</div>;
  if (linhas.length === 0) {
    return <div className="text-muted py-8">Espelho ainda não sincronizado. O cron roda às 04:20.</div>;
  }

  const total = linhas.reduce((a, l) => a + Number(l.cost_brl), 0);
  const extratoAte = linhas.map((l) => l.extrato_ate).filter(Boolean).sort().pop() ?? null;
  const sincronizado = linhas.map((l) => l.sincronizado_em).filter(Boolean).sort().pop() ?? null;
  const dataExtrato = extratoAte ? new Date(extratoAte + 'T00:00:00').toLocaleDateString('pt-BR') : '—';

  // Mês parcial NUNCA entra em comparativo: o extrato de origem ainda não cobre o
  // mês inteiro, e a queda aparente seria lida como economia.
  const porMes = new Map<string, { total: number; parcial: boolean }>();
  for (const l of linhas) {
    const k = l.month.slice(0, 7);
    const cur = porMes.get(k) ?? { total: 0, parcial: false };
    porMes.set(k, { total: cur.total + Number(l.cost_brl), parcial: cur.parcial || l.parcial });
  }
  const meses = [...porMes.entries()].sort((a, b) => b[0].localeCompare(a[0]));
  const fechados = meses.filter(([, v]) => !v.parcial);
  const ultimoFechado = fechados[0] ?? null;
  const emAndamento = meses.find(([, v]) => v.parcial) ?? null;
  const ultimos3 = fechados.slice(0, 3);
  const mediaFechados3 = ultimos3.reduce((a, [, v]) => a + v.total, 0) / (ultimos3.length || 1);
  const maiorMes = Math.max(...meses.map(([, v]) => v.total), 1);

  const porFerramenta = new Map<string, { total: number; digiai: number; otica: number }>();
  for (const l of linhas) {
    const cur = porFerramenta.get(l.service) ?? { total: 0, digiai: 0, otica: 0 };
    const v = Number(l.cost_brl);
    cur.total += v;
    if ((l.conta_pagadora ?? '').toUpperCase() === 'DIGIAI') cur.digiai += v;
    else cur.otica += v;
    porFerramenta.set(l.service, cur);
  }
  const ferramentas = [...porFerramenta.entries()].sort((a, b) => b[1].total - a[1].total);
  const maiorFerramenta = ferramentas[0]?.[1].total ?? 1;

  return (
    <div className="space-y-6">
      <div className="border border-outline/15 bg-surface-container px-4 py-2.5 flex items-center gap-2 flex-wrap text-[12px]">
        <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Espelho do Finance · conta 7.4</span>
        <span className="text-muted">
          Extrato até <strong className="text-on-surface">{dataExtrato}</strong>
          {sincronizado && ` · sincronizado ${new Date(sincronizado).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}`}
        </span>
        <span
          className="ml-auto font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-warning/40 text-warning bg-warning/10"
          title="Cashback e reembolso (~0,9%) não estão abatidos"
        >
          valor bruto
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard label="Aporte acumulado" value={brl(total)} sub="desde ago/2025" icon={<Server size={20} />} color="text-secondary" />
        <KpiCard label="Último mês fechado" value={brl(ultimoFechado?.[1].total ?? 0)} sub={ultimoFechado ? monthLabel(ultimoFechado[0] + '-01') : '—'} icon={<BarChart3 size={20} />} color="text-secondary" />
        <KpiCard label="Média (3 fechados)" value={brl(mediaFechados3)} sub="/mês · exclui parciais" icon={<TrendingDown size={20} />} color="text-secondary" />
        <KpiCard label="Ferramentas" value={String(ferramentas.length)} sub="serviços pagos" icon={<CreditCard size={20} />} color="text-secondary" />
      </div>

      {emAndamento && (
        <div className="border border-warning/40 bg-warning/5 p-4 flex items-start gap-3">
          <AlertTriangle size={16} className="text-warning shrink-0 mt-0.5" />
          <div className="text-sm text-on-surface-variant leading-relaxed">
            <span className="font-medium text-on-surface">
              {monthLabel(emAndamento[0] + '-01')} está em andamento ({brl(emAndamento[1].total)})
            </span>{' '}
            — o extrato de origem só vai até {dataExtrato}. Esse número <strong>não</strong> é comparável
            com o mês anterior: a diferença é extrato faltando, não economia.
          </div>
        </div>
      )}

      <div className="border border-outline/15 bg-surface-lowest p-6">
        <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Por ferramenta · quem pagou</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-muted text-xs uppercase">
              <th className="text-left pb-3">Ferramenta</th>
              <th className="text-right pb-3">Total</th>
              <th className="text-right pb-3">Conta DIGIAI</th>
              <th className="text-right pb-3">Conta ótica</th>
              <th className="pb-3 w-1/4"></th>
            </tr>
          </thead>
          <tbody>
            {ferramentas.map(([nome, v]) => (
              <tr key={nome} className="border-t border-outline/10">
                <td className="py-2 text-on-surface">{nome}</td>
                <td className="py-2 text-right font-mono text-on-surface">{brl(v.total)}</td>
                <td className="py-2 text-right font-mono text-secondary">{v.digiai > 0 ? brl(v.digiai) : '—'}</td>
                <td className="py-2 text-right font-mono text-muted">{v.otica > 0 ? brl(v.otica) : '—'}</td>
                <td className="py-2 pl-4">
                  <div className="h-1.5 bg-surface-high">
                    <div className="h-1.5 bg-secondary" style={{ width: `${(v.total / maiorFerramenta) * 100}%` }} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="border border-outline/15 bg-surface-lowest p-6">
        <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Mês a mês</h3>
        <div className="space-y-1.5">
          {meses.map(([mes, v]) => (
            <div key={mes} className="flex items-center gap-3 text-sm">
              <span className="font-mono text-muted w-16 shrink-0">{monthLabel(mes + '-01')}</span>
              <div className="flex-1 h-2 bg-surface-high">
                <div className={`h-2 ${v.parcial ? 'bg-warning/50' : 'bg-secondary'}`} style={{ width: `${(v.total / maiorMes) * 100}%` }} />
              </div>
              <span className="font-mono tabular-nums text-on-surface w-24 text-right shrink-0">{brl(v.total)}</span>
              {v.parcial && (
                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-warning/40 text-warning bg-warning/10 shrink-0">
                  em andamento
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="border border-outline/15 bg-surface-container p-4 text-[12px] text-muted leading-relaxed">
        <strong className="text-on-surface">Por que este número difere do Dashboard.</strong>{' '}
        Aqui é o espelho do Finance (conta contábil 7.4), sincronizado automático e cobrindo até {dataExtrato}.
        O Dashboard soma <code className="font-mono text-[11px]">finance.expenses</code>, cuja última importação
        foi em <strong className="text-on-surface">12/06/2026</strong> — as mesmas ferramentas aparecem nas duas
        fontes, então <strong>não some os dois totais</strong>: seria contar o mesmo dinheiro duas vezes.
      </div>
    </div>
  );
}

// =====================================================================
// TAB 5 — Relatório (genérico com filtro de projeto)
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

  if (loading) return <div className="text-muted py-8">Carregando...</div>;

  return (
    <div className="space-y-6">
      {/* Product filter */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted uppercase tracking-wide">Projeto:</span>
        <div className="flex gap-1 flex-wrap">
          <button
            onClick={() => setFilterProduct('all')}
            className={`px-3 py-1 text-xs font-medium transition-colors ${
              filterProduct === 'all' ? 'bg-secondary-container/40 text-on-surface border border-secondary/40' : 'bg-surface-high text-muted hover:text-on-surface'
            }`}
          >
            Todos
          </button>
          {products.map(p => (
            <button
              key={p.id}
              onClick={() => setFilterProduct(p.id)}
              className={`px-3 py-1 text-xs font-medium transition-colors ${
                filterProduct === p.id ? 'bg-secondary-container/40 text-on-surface border border-secondary/40' : 'bg-surface-high text-muted hover:text-on-surface'
              }`}
            >
              {p.id === 'clearix' ? 'Clearix' : p.id === 'digiai' ? 'DigiAI' : p.id === 'compartilhado' ? 'Compartilhado' : p.name.split(' ')[0]}
            </button>
          ))}
        </div>
      </div>

      {/* Hero card */}
      <div className="bg-secondary-container/40 border border-secondary/40 p-8 text-center">
        <div className="text-xs text-muted uppercase tracking-widest mb-2">Investimento Total — {filterLabel}</div>
        <div className="text-5xl font-bold text-on-surface mb-1">{brl(totalFiltered)}</div>
        <div className="text-sm text-muted">
          {filtered.length} lançamentos
          {sortedMonths.length > 0 && ` · ${monthLabel(sortedMonths[0][0])} a ${monthLabel(sortedMonths[sortedMonths.length - 1][0])}`}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* By category */}
        {sortedCats.length > 0 && (
          <div className="bg-surface-lowest border border-outline/15 p-6">
            <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Por Categoria</h3>
            <div className="space-y-3">
              {sortedCats.map(([cat, total]) => {
                const pct = totalFiltered > 0 ? (total / totalFiltered) * 100 : 0;
                return (
                  <div key={cat} className="flex items-center gap-3">
                    <div className="w-36 text-sm text-on-surface-variant truncate">{CATEGORY_LABELS[cat as ExpenseCategory] || cat}</div>
                    <div className="flex-1 h-4 bg-surface-high overflow-hidden">
                      <div
                        className="h-full"
                        style={{ width: `${pct}%`, backgroundColor: CATEGORY_COLORS[cat as ExpenseCategory] || '#64748b' }}
                      />
                    </div>
                    <div className="w-24 text-right text-sm font-mono text-on-surface-variant">{brl(total)}</div>
                    <div className="w-12 text-right text-xs text-muted">{pct.toFixed(1)}%</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* By vendor */}
        {sortedVendors.length > 0 && (
          <div className="bg-surface-lowest border border-outline/15 p-6">
            <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Por Vendor</h3>
            <div className="space-y-3">
              {sortedVendors.map((v) => {
                const pct = totalFiltered > 0 ? (v.total / totalFiltered) * 100 : 0;
                return (
                  <div key={v.name} className="flex items-center gap-3">
                    <div className="w-36 text-sm text-on-surface-variant truncate">{v.name}</div>
                    <div className="flex-1 h-4 bg-surface-high overflow-hidden">
                      <div className="h-full bg-secondary" style={{ width: `${pct}%` }} />
                    </div>
                    <div className="w-24 text-right text-sm font-mono text-on-surface-variant">{brl(v.total)}</div>
                    <div className="w-12 text-right text-xs text-muted">{v.count}x</div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Monthly breakdown */}
      {sortedMonths.length > 0 && (
        <div className="bg-surface-lowest border border-outline/15 p-6">
          <h3 className="text-sm font-semibold text-on-surface-variant mb-4">Por Mês</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {sortedMonths.map(([month, total]) => (
              <div key={month} className="bg-surface-high p-3 text-center">
                <div className="text-xs text-muted">{monthLabel(month)}</div>
                <div className="text-sm font-mono text-on-surface mt-1">{brl(total)}</div>
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
          className="px-6 py-3 bg-secondary hover:bg-secondary/90 text-sm font-medium flex items-center gap-2 disabled:opacity-50"
        >
          <Download size={16} />
          {exporting ? 'Exportando...' : 'Exportar CSV'}
        </button>
      </div>

      {filtered.length === 0 && (
        <div className="text-center text-muted text-sm py-4">
          Nenhuma despesa registrada{filterProduct !== 'all' ? ' para este projeto' : ''}.
        </div>
      )}
    </div>
  );
}
