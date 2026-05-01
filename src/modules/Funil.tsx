import { useMemo, useState, type ReactNode } from 'react';
import {
  Activity,
  BarChart3,
  BookOpen,
  CheckCircle2,
  Circle,
  ClipboardCheck,
  DollarSign,
  FileText,
  Flame,
  GitBranch,
  Mail,
  MessageCircle,
  Network,
  RefreshCw,
  Route,
  Save,
  ShoppingCart,
  Target,
  TrendingUp,
} from 'lucide-react';
import {
  calculateFunnelSummary,
  creativeDecision,
  funnelStore,
  type CreativeStatus,
  type FunnelActuals,
  type FunnelAssumptions,
  type FunnelStepStatus,
  type FunnelWorkspace,
} from '../lib/funnelStore';
import CopysTab from './funnel/CopysTab';

type TabId = 'dashboard' | 'controle' | 'produto' | 'oferta' | 'trafego' | 'automacao' | 'guias' | 'copys' | 'proximos';

const tabs: Array<{ id: TabId; label: string; icon: typeof BarChart3 }> = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
  { id: 'controle', label: 'Controle', icon: DollarSign },
  { id: 'produto', label: 'Produto', icon: BookOpen },
  { id: 'oferta', label: 'Oferta', icon: ShoppingCart },
  { id: 'trafego', label: 'Trafego', icon: Target },
  { id: 'automacao', label: 'Automacao', icon: MessageCircle },
  { id: 'guias', label: 'Esteira', icon: Network },
  { id: 'copys', label: 'Copys', icon: FileText },
  { id: 'proximos', label: 'Proximos passos', icon: ClipboardCheck },
];

const statusLabel: Record<FunnelStepStatus, string> = {
  done: 'Feito',
  doing: 'Em execucao',
  next: 'Proximo',
  blocked: 'Bloqueado',
};

const statusClass: Record<FunnelStepStatus, string> = {
  done: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  doing: 'border-[#06B6D4]/30 bg-[#06B6D4]/10 text-[#06B6D4]',
  next: 'border-white/10 bg-white/5 text-white/60',
  blocked: 'border-red-400/30 bg-red-400/10 text-red-300',
};

const creativeClass: Record<CreativeStatus, string> = {
  validar: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
  ajustar: 'border-amber-400/30 bg-amber-400/10 text-amber-300',
  cortar: 'border-red-400/30 bg-red-400/10 text-red-300',
};

const inputClass = 'w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:border-[#06B6D4]';

function brl(value: number): string {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function pct(value: number): string {
  return `${(value * 100).toFixed(1)}%`;
}

function numberValue(value: number): string {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
}

export default function Funil() {
  const [tab, setTab] = useState<TabId>('dashboard');
  const [workspace, setWorkspace] = useState<FunnelWorkspace>(() => funnelStore.getWorkspace());
  const summary = useMemo(() => calculateFunnelSummary(workspace), [workspace]);

  const updateAssumption = (key: keyof FunnelAssumptions, value: number) => {
    setWorkspace(funnelStore.updateAssumptions({ [key]: value }));
  };

  const updateActual = (key: keyof FunnelActuals, value: number) => {
    setWorkspace(funnelStore.updateActuals({ [key]: value }));
  };

  const updateTaskStatus = (id: string, status: FunnelStepStatus) => {
    setWorkspace(funnelStore.updateTask(id, { status }));
  };

  const reset = () => {
    if (!confirm('Resetar a engenharia de funil para os dados base do OSI?')) return;
    setWorkspace(funnelStore.reset());
  };

  return (
    <div className="max-w-7xl mx-auto p-8 space-y-7">
      <header className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-3">
            <Flame className="w-7 h-7 text-[#06B6D4]" />
            <h1 className="text-3xl font-bold tracking-tight">Engenharia de Funil OSI</h1>
          </div>
          <p className="text-white/50 mt-2 max-w-4xl">
            Controle vivo da isca paga Otica Sem Improviso, da esteira de guias e da ponte para o ecossistema de apps para oticas.
          </p>
          <div className="text-xs font-mono text-white/25 mt-2">
            Atualizado em {new Date(workspace.updatedAt).toLocaleString('pt-BR')} · fonte local do app
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setWorkspace(funnelStore.getWorkspace())}
            className="p-2 hover:bg-white/5 rounded-lg text-white/50 hover:text-white"
            title="Recarregar"
          >
            <RefreshCw size={18} />
          </button>
          <button
            onClick={reset}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 rounded-md text-sm text-white/70"
          >
            Reset
          </button>
        </div>
      </header>

      <div className="bg-[#2563EB]/8 border border-[#2563EB]/20 rounded-2xl p-5 flex items-start gap-3">
        <Route className="w-5 h-5 text-[#06B6D4] shrink-0 mt-0.5" />
        <div>
          <div className="text-sm font-semibold text-white">Tese operacional</div>
          <p className="text-sm text-white/65 mt-1">
            O guia resolve uma parte da dor. O ecossistema resolve a rotina. O OSI precisa vender, mas principalmente comprar compradores,
            marcar dores e preparar ascensao para os apps.
          </p>
        </div>
      </div>

      <nav className="flex gap-1 border-b border-white/5 overflow-x-auto">
        {tabs.map((item) => {
          const Icon = item.icon;
          return (
            <button
              key={item.id}
              onClick={() => setTab(item.id)}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 whitespace-nowrap transition-colors ${
                tab === item.id
                  ? 'border-[#06B6D4] text-white'
                  : 'border-transparent text-white/40 hover:text-white/70'
              }`}
            >
              <Icon size={16} /> {item.label}
            </button>
          );
        })}
      </nav>

      {tab === 'dashboard' && <DashboardTab workspace={workspace} summary={summary} updateAssumption={updateAssumption} />}
      {tab === 'controle' && <ControleTab workspace={workspace} summary={summary} updateActual={updateActual} />}
      {tab === 'produto' && <ProdutoTab />}
      {tab === 'oferta' && <OfertaTab workspace={workspace} summary={summary} updateAssumption={updateAssumption} />}
      {tab === 'trafego' && <TrafegoTab workspace={workspace} />}
      {tab === 'automacao' && <AutomacaoTab workspace={workspace} />}
      {tab === 'guias' && <GuiasTab workspace={workspace} />}
      {tab === 'copys' && <CopysTab />}
      {tab === 'proximos' && <ProximosTab workspace={workspace} updateTaskStatus={updateTaskStatus} />}
    </div>
  );
}

function DashboardTab({
  workspace,
  summary,
  updateAssumption,
}: {
  workspace: FunnelWorkspace;
  summary: ReturnType<typeof calculateFunnelSummary>;
  updateAssumption: (key: keyof FunnelAssumptions, value: number) => void;
}) {
  const progress = summary.totalTasks > 0 ? Math.round((summary.completedTasks / summary.totalTasks) * 100) : 0;
  const a = workspace.assumptions;

  return (
    <div className="space-y-7">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign size={18} />} label="Ticket medio" value={brl(summary.averageOrderValue)} sub="principal + bumps + upsell" color="text-emerald-300" />
        <KpiCard icon={<Target size={18} />} label="CPA maximo" value={brl(summary.maxCpaTarget)} sub={`ROAS alvo ${a.roasTarget.toFixed(1)}`} color="text-[#06B6D4]" />
        <KpiCard icon={<TrendingUp size={18} />} label="ROAS microteste" value={summary.projectedRoas.toFixed(2)} sub={`${brl(summary.projectedRevenue)} receita proj.`} color={summary.projectedRoas >= a.roasTarget ? 'text-emerald-300' : 'text-amber-300'} />
        <KpiCard icon={<Activity size={18} />} label="Execucao" value={`${progress}%`} sub={`${summary.completedTasks}/${summary.totalTasks} tarefas feitas`} color="text-white/70" />
      </div>

      <section className="bg-[#0A0F1E] border border-white/8 rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <Target className="w-5 h-5 text-[#06B6D4] shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-semibold">Recomendacao do app</div>
            <p className="text-sm text-white/65 mt-1">{summary.recommendedAction}</p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 xl:grid-cols-[1.1fr_0.9fr] gap-5">
        <section className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <div className="flex items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-xl font-semibold">Projecao do microteste</h2>
              <p className="text-sm text-white/45 mt-1">Baseada nas premissas editaveis do painel.</p>
            </div>
            <span className="text-xs font-mono text-white/35">{brl(summary.microtestSpend)} em ads</span>
          </div>

          <div className="space-y-4">
            <MetricRow label="Compras projetadas" value={numberValue(summary.projectedPurchases)} max={8} />
            <MetricRow label="Compras recuperadas" value={numberValue(summary.recoveredPurchases)} max={2} />
            <MetricRow label="Receita bruta" value={brl(summary.projectedRevenue)} max={summary.microtestSpend * a.roasTarget * 2} current={summary.projectedRevenue} />
            <MetricRow label="Lucro apos ads/taxas" value={brl(summary.projectedProfitAfterAds)} max={summary.projectedRevenue} current={Math.max(0, summary.projectedProfitAfterAds)} />
          </div>
        </section>

        <section className="bg-white/3 border border-white/8 rounded-2xl p-5 space-y-5">
          <div>
            <h2 className="text-xl font-semibold">Premissas rapidas</h2>
            <p className="text-sm text-white/45 mt-1">Editar aqui muda todo o dashboard.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <NumberField label="Bump WhatsApp" value={a.bumpWhatsappTakeRate * 100} suffix="%" onChange={(v) => updateAssumption('bumpWhatsappTakeRate', v / 100)} />
            <NumberField label="Bump Checklist" value={a.bumpChecklistTakeRate * 100} suffix="%" onChange={(v) => updateAssumption('bumpChecklistTakeRate', v / 100)} />
            <NumberField label="Upsell" value={a.upsellConversion * 100} suffix="%" onChange={(v) => updateAssumption('upsellConversion', v / 100)} />
            <NumberField label="Recuperacao" value={a.cartRecoveryRate * 100} suffix="%" onChange={(v) => updateAssumption('cartRecoveryRate', v / 100)} />
            <NumberField label="ROAS alvo" value={a.roasTarget} onChange={(v) => updateAssumption('roasTarget', v)} />
            <NumberField label="Adsets" value={a.adsets} onChange={(v) => updateAssumption('adsets', v)} />
          </div>
        </section>
      </div>

      <section className="grid grid-cols-1 md:grid-cols-5 gap-3">
        {summary.strategicTags.map((tag) => (
          <div key={tag} className="bg-[#0A0F1E] border border-white/8 rounded-xl p-4">
            <div className="text-[10px] font-mono uppercase tracking-widest text-[#06B6D4]">Tag estrategica</div>
            <div className="text-sm text-white/75 mt-2 break-words">{tag}</div>
          </div>
        ))}
      </section>
    </div>
  );
}

function ControleTab({
  workspace,
  summary,
  updateActual,
}: {
  workspace: FunnelWorkspace;
  summary: ReturnType<typeof calculateFunnelSummary>;
  updateActual: (key: keyof FunnelActuals, value: number) => void;
}) {
  const actual = workspace.actuals;
  const fields: Array<{ key: keyof FunnelActuals; label: string; hint: string; money?: boolean }> = [
    { key: 'adSpend', label: 'Gasto em ads', hint: 'Total gasto no Meta Ads', money: true },
    { key: 'visits', label: 'Visitas/cliques', hint: 'Cliques qualificados ou visitas na pagina' },
    { key: 'checkouts', label: 'Checkouts iniciados', hint: 'InitiateCheckout' },
    { key: 'abandonedCarts', label: 'Carrinhos abandonados', hint: 'Checkouts sem compra' },
    { key: 'purchases', label: 'Compras', hint: 'Compras aprovadas' },
    { key: 'grossRevenue', label: 'Receita bruta', hint: 'Valor bruto aprovado', money: true },
    { key: 'refundedRevenue', label: 'Reembolsos', hint: 'Receita devolvida', money: true },
    { key: 'bumpWhatsappSales', label: 'Bump WhatsApp', hint: 'Quantidade vendida' },
    { key: 'bumpChecklistSales', label: 'Bump Checklist', hint: 'Quantidade vendida' },
    { key: 'upsellSales', label: 'Upsells', hint: 'Quantidade vendida' },
    { key: 'recoveredSales', label: 'Vendas recuperadas', hint: 'Compras vindas da regua' },
    { key: 'qualifiedLeads', label: 'Leads qualificados', hint: 'Pessoas com dor identificada' },
    { key: 'ecosystemCandidates', label: 'Candidatos ao app', hint: 'Compradores com perfil para ecossistema' },
  ];

  return (
    <div className="space-y-6">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={<DollarSign size={18} />} label="Receita liquida" value={brl(summary.actualNetRevenue)} sub={`taxas estimadas ${brl(summary.actualFees)}`} color="text-emerald-300" />
        <KpiCard icon={<TrendingUp size={18} />} label="ROAS real" value={summary.actualRoas.toFixed(2)} sub={summary.actualRoas >= workspace.assumptions.roasTarget ? 'acima da meta' : 'abaixo/sem volume'} color={summary.actualRoas >= workspace.assumptions.roasTarget ? 'text-emerald-300' : 'text-amber-300'} />
        <KpiCard icon={<Target size={18} />} label="CPA real" value={brl(summary.actualCpa)} sub={`teto ${brl(summary.maxCpaTarget)}`} color={summary.actualCpa > 0 && summary.actualCpa <= summary.maxCpaTarget ? 'text-emerald-300' : 'text-white/60'} />
        <KpiCard icon={<Network size={18} />} label="Candidatos app" value={pct(summary.ecosystemCandidateRate)} sub={`${actual.ecosystemCandidates} de ${actual.purchases} compradores`} color="text-[#06B6D4]" />
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1fr_0.85fr] gap-5">
        <div className="bg-white/3 border border-white/8 rounded-2xl p-5">
          <h2 className="text-xl font-semibold">Entradas reais do teste</h2>
          <p className="text-sm text-white/45 mt-1 mb-5">Preencha estes campos depois de cada leitura do Ads/Kiwify/CRM.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {fields.map((field) => (
              <NumberField
                key={field.key}
                label={field.label}
                value={Number(actual[field.key])}
                suffix={field.money ? 'R$' : undefined}
                onChange={(value) => updateActual(field.key, value)}
              />
            ))}
          </div>
        </div>

        <div className="space-y-4">
          <section className="bg-[#2563EB]/8 border border-[#2563EB]/20 rounded-2xl p-5">
            <h2 className="text-xl font-semibold">Leitura de decisao</h2>
            <p className="text-sm text-white/65 mt-2">{summary.recommendedAction}</p>
            <div className="grid grid-cols-2 gap-3 mt-5">
              <InfoBox label="Checkout rate" value={pct(summary.checkoutRate)} />
              <InfoBox label="Abandono" value={pct(summary.cartAbandonRate)} />
              <InfoBox label="Recuperacao" value={pct(summary.recoveryRateActual)} />
              <InfoBox label="AOV real" value={brl(summary.actualAov)} />
            </div>
          </section>

          <section className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <h2 className="text-xl font-semibold">Regras de caminho</h2>
            <div className="space-y-3 mt-4">
              <Callout icon={<CheckCircle2 size={16} />} text="ROAS acima da meta e 3+ compras: duplicar vencedor e escalar devagar." />
              <Callout icon={<Activity size={16} />} text="Checkout alto e venda baixa: revisar oferta, prova, checkout e recuperacao." />
              <Callout icon={<Target size={16} />} text="Poucos checkouts com muitas visitas: problema de criativo, promessa ou landing." />
              <Callout icon={<Network size={16} />} text="Muitos candidatos ao app: antecipar beta/oferta do modulo principal." />
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

function ProdutoTab() {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[0.9fr_1.1fr] gap-5">
      <section className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
        <div>
          <div className="text-xs font-mono text-[#06B6D4] uppercase tracking-widest">Produto-isca ativo</div>
          <h2 className="text-2xl font-bold mt-2">Otica Sem Improviso</h2>
          <p className="text-white/55 mt-2">
            Manual visual + app de apoio para atendimento, WhatsApp e objecoes em oticas.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <InfoBox label="Papel" value="Isca paga" />
          <InfoBox label="Preco" value="R$ 97" />
          <InfoBox label="Status" value="Engenharia pronta" />
          <InfoBox label="Destino" value="Apps de otica" />
        </div>

        <div className="bg-[#2563EB]/8 border border-[#2563EB]/20 rounded-xl p-4">
          <div className="text-sm font-semibold text-white mb-1">Promessa</div>
          <p className="text-sm text-white/65">
            Sair do atendimento no improviso, responder melhor no WhatsApp e vender com mais seguranca sem depender de desconto precoce.
          </p>
        </div>
      </section>

      <section className="bg-white/3 border border-white/8 rounded-2xl p-6 space-y-5">
        <h2 className="text-xl font-semibold">Como o produto prepara o app principal</h2>
        <div className="space-y-3">
          <BridgeRow from="Atendimento sem metodo" to="App de scripts e conducoes por situacao" />
          <BridgeRow from="Cliente sumiu no WhatsApp" to="CRM de orcamentos e retomada com contexto" />
          <BridgeRow from="Objeção de preco" to="IA de treino e biblioteca de argumentos" />
          <BridgeRow from="Dificuldade com lentes" to="Consultor de indicacao e comparador de beneficios" />
          <BridgeRow from="Time sem padrao" to="Onboarding, trilhas e checklist de equipe" />
        </div>
      </section>
    </div>
  );
}

function OfertaTab({
  workspace,
  summary,
  updateAssumption,
}: {
  workspace: FunnelWorkspace;
  summary: ReturnType<typeof calculateFunnelSummary>;
  updateAssumption: (key: keyof FunnelAssumptions, value: number) => void;
}) {
  const a = workspace.assumptions;
  const rows: Array<{ label: string; priceKey: keyof FunnelAssumptions; take?: string; role: string }> = [
    { label: 'Manual OSI + App', priceKey: 'mainPrice', role: 'Produto principal e porta de entrada.' },
    { label: 'Kit WhatsApp', priceKey: 'bumpWhatsappPrice', take: pct(a.bumpWhatsappTakeRate), role: 'Bump de aplicacao imediata.' },
    { label: 'Checklist 30 segundos', priceKey: 'bumpChecklistPrice', take: pct(a.bumpChecklistTakeRate), role: 'Bump operacional de rotina.' },
    { label: 'Treinamento OSI na Pratica', priceKey: 'upsellPrice', take: pct(a.upsellConversion), role: 'Upsell de engajamento e ascensao.' },
  ];

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <KpiCard icon={<ShoppingCart size={18} />} label="AOV calculado" value={brl(summary.averageOrderValue)} sub="ticket medio esperado" color="text-emerald-300" />
        <KpiCard icon={<Target size={18} />} label="CPA alvo" value={brl(summary.maxCpaTarget)} sub="teto para ROAS 2.5" color="text-[#06B6D4]" />
        <KpiCard icon={<Save size={18} />} label="Funcao real" value="Aquisicao" sub="comprar compradores qualificados" color="text-white/70" />
      </section>

      <section className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1.1fr_120px_120px_1.4fr] gap-0 bg-white/5 text-xs font-mono uppercase tracking-widest text-white/40">
          <div className="p-3">Item</div>
          <div className="p-3">Preco</div>
          <div className="p-3">Take</div>
          <div className="p-3">Papel</div>
        </div>
        {rows.map((row) => (
          <div key={row.label} className="grid grid-cols-[1.1fr_120px_120px_1.4fr] gap-0 border-t border-white/6 items-center">
            <div className="p-4">
              <div className="font-medium text-white">{row.label}</div>
            </div>
            <div className="p-3">
              <input
                type="number"
                className={inputClass}
                value={Number(a[row.priceKey])}
                onChange={(e) => updateAssumption(row.priceKey, parseFloat(e.target.value || '0'))}
              />
            </div>
            <div className="p-4 text-sm text-white/65">{row.take || '100%'}</div>
            <div className="p-4 text-sm text-white/60">{row.role}</div>
          </div>
        ))}
      </section>

      <section className="bg-[#0A0F1E] border border-white/8 rounded-2xl p-5">
        <h3 className="font-semibold mb-3">Easter eggs do ecossistema</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            'O OSI resolve a fala. O ecossistema resolve a rotina.',
            'O script ajuda na resposta. O app ajuda a lembrar quando responder.',
            'Aqui voce aprende o metodo. No ecossistema, o metodo vira processo.',
            'O checklist resolve manualmente. O app transforma em rotina acompanhada.',
          ].map((text) => (
            <div key={text} className="border border-white/8 bg-white/3 rounded-xl p-4 text-sm text-white/70">
              {text}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function TrafegoTab({ workspace }: { workspace: FunnelWorkspace }) {
  const a = workspace.assumptions;
  return (
    <div className="space-y-5">
      <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <KpiCard icon={<Target size={18} />} label="CPV max." value={brl(a.cpvMax)} sub="limite de corte" color="text-[#06B6D4]" />
        <KpiCard icon={<TrendingUp size={18} />} label="CTR minimo" value={pct(a.ctrMin)} sub="validacao de criativo" color="text-emerald-300" />
        <KpiCard icon={<DollarSign size={18} />} label="Budget/adset" value={brl(a.adsetBudgetDay)} sub={`${a.testDays} dias ABO`} color="text-white/70" />
        <KpiCard icon={<Activity size={18} />} label="Gasto teste" value={brl(a.adsetBudgetDay * a.testDays * a.adsets)} sub={`${a.adsets} conjuntos`} color="text-amber-300" />
      </section>

      <section className="bg-white/3 border border-white/8 rounded-2xl overflow-hidden">
        <div className="grid grid-cols-[1fr_1.4fr_90px_90px_110px_1.2fr] bg-white/5 text-xs font-mono uppercase tracking-widest text-white/40">
          <div className="p-3">Angulo</div>
          <div className="p-3">Gancho</div>
          <div className="p-3">CTR</div>
          <div className="p-3">CPV</div>
          <div className="p-3">Decisao</div>
          <div className="p-3">Sinal</div>
        </div>
        {workspace.creatives.map((creative) => {
          const decision = creativeDecision(creative, a);
          return (
            <div key={creative.id} className="grid grid-cols-[1fr_1.4fr_90px_90px_110px_1.2fr] border-t border-white/6 items-center">
              <div className="p-4 font-medium">{creative.angle}</div>
              <div className="p-4 text-sm text-white/65">{creative.hook}</div>
              <div className="p-4 text-sm">{pct(creative.ctr)}</div>
              <div className="p-4 text-sm">{brl(creative.cpv)}</div>
              <div className="p-4">
                <span className={`text-[10px] font-mono uppercase tracking-widest border rounded-full px-2 py-1 ${creativeClass[decision]}`}>
                  {decision}
                </span>
              </div>
              <div className="p-4 text-sm text-white/55">{creative.signal}</div>
            </div>
          );
        })}
      </section>
    </div>
  );
}

function AutomacaoTab({ workspace }: { workspace: FunnelWorkspace }) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.85fr] gap-5">
      <section className="space-y-3">
        {workspace.automation.map((step) => (
          <div key={step.id} className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                step.channel === 'WhatsApp' ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300' : 'border-[#06B6D4]/30 bg-[#06B6D4]/10 text-[#06B6D4]'
              }`}>
                {step.channel === 'WhatsApp' ? <MessageCircle size={18} /> : <Mail size={18} />}
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-mono text-white/35">{step.moment}</span>
                  <span className="text-xs font-mono text-white/25">·</span>
                  <span className="text-xs font-mono text-[#06B6D4]">{step.channel}</span>
                </div>
                <h3 className="font-semibold mt-1">{step.objective}</h3>
                <p className="text-sm text-white/60 mt-2">{step.message}</p>
              </div>
            </div>
          </div>
        ))}
      </section>
      <section className="bg-[#2563EB]/8 border border-[#2563EB]/20 rounded-2xl p-5 h-fit">
        <h2 className="text-xl font-semibold">Qualificacao durante recuperacao</h2>
        <p className="text-sm text-white/55 mt-2">
          Mesmo quando a compra nao acontece, a conversa precisa marcar a dor e indicar qual app vender depois.
        </p>
        <div className="space-y-3 mt-5">
          {[
            'A maior dificuldade hoje esta no balcao ou no WhatsApp?',
            'O que mais trava a venda: preco, lente ou cliente que some?',
            'Voce quer usar sozinho ou padronizar uma equipe?',
            'Hoje voces usam algum app para acompanhar atendimento e orcamentos?',
          ].map((question) => (
            <div key={question} className="bg-black/20 border border-white/8 rounded-xl p-3 text-sm text-white/75">
              {question}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function GuiasTab({ workspace }: { workspace: FunnelWorkspace }) {
  return (
    <div className="space-y-4">
      {workspace.guides.map((guide) => (
        <section key={guide.id} className={`border rounded-2xl p-5 ${
          guide.role === 'app_principal'
            ? 'bg-[#2563EB]/8 border-[#2563EB]/25'
            : guide.role === 'isca_paga'
              ? 'bg-[#06B6D4]/5 border-[#06B6D4]/20'
              : 'bg-white/3 border-white/8'
        }`}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg font-bold">{guide.name}</h2>
                <span className={`text-[10px] font-mono uppercase tracking-widest border rounded-full px-2 py-1 ${statusClass[guide.status]}`}>
                  {statusLabel[guide.status]}
                </span>
              </div>
              <p className="text-sm text-white/55 mt-2">{guide.promise}</p>
            </div>
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/35 border border-white/10 rounded-full px-2 py-1">
              {guide.role}
            </span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-5">
            <InfoBox label="Dor capturada" value={guide.pain} />
            <InfoBox label="Ponte para app" value={guide.appBridge} />
            <InfoBox label="Proximo passo" value={guide.nextStep} />
          </div>
        </section>
      ))}
    </div>
  );
}


function ProximosTab({
  workspace,
  updateTaskStatus,
}: {
  workspace: FunnelWorkspace;
  updateTaskStatus: (id: string, status: FunnelStepStatus) => void;
}) {
  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_0.85fr] gap-5">
      <section className="space-y-3">
        {workspace.tasks.map((task) => (
          <div key={task.id} className="bg-white/3 border border-white/8 rounded-2xl p-5">
            <div className="flex items-start gap-4">
              <button
                onClick={() => updateTaskStatus(task.id, task.status === 'done' ? 'next' : 'done')}
                className="mt-0.5"
                title="Alternar feito"
              >
                {task.status === 'done' ? <CheckCircle2 className="w-5 h-5 text-emerald-300" /> : <Circle className="w-5 h-5 text-white/25" />}
              </button>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`text-[10px] font-mono uppercase tracking-widest border rounded-full px-2 py-1 ${statusClass[task.status]}`}>
                    {statusLabel[task.status]}
                  </span>
                  <span className="text-[10px] font-mono text-white/30">{task.area}</span>
                  <span className="text-[10px] font-mono text-white/30">owner: {task.owner}</span>
                </div>
                <h3 className="font-semibold mt-2">{task.title}</h3>
                <p className="text-sm text-white/55 mt-2">{task.nextStep}</p>
                <div className="mt-4 grid grid-cols-1 lg:grid-cols-3 gap-3">
                  <div className="bg-[#0A0F1E] border border-white/8 rounded-xl p-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#06B6D4] mb-2">Por que importa</div>
                    <div className="text-sm text-white/65">{task.why}</div>
                  </div>
                  <div className="bg-[#0A0F1E] border border-white/8 rounded-xl p-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#06B6D4] mb-2">Criterio de aceite</div>
                    <ul className="space-y-1.5">
                      {task.acceptanceCriteria.map((item) => (
                        <li key={item} className="text-sm text-white/65 flex gap-2">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300 mt-0.5 shrink-0" />
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="bg-[#0A0F1E] border border-white/8 rounded-xl p-3">
                    <div className="text-[10px] font-mono uppercase tracking-widest text-[#06B6D4] mb-2">Regra de decisao</div>
                    <div className="text-sm text-white/65">{task.decisionRule}</div>
                  </div>
                </div>
                <div className="mt-4 bg-black/15 border border-white/6 rounded-xl p-3">
                  <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-3">Checklist de execucao</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {task.checklist.map((item) => (
                      <div key={item} className="flex items-start gap-2 text-sm text-white/65">
                        <Circle className="w-3.5 h-3.5 text-white/25 mt-0.5 shrink-0" />
                        <span>{item}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <select
                className="bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white"
                value={task.status}
                onChange={(e) => updateTaskStatus(task.id, e.target.value as FunnelStepStatus)}
              >
                {Object.entries(statusLabel).map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </section>
      <section className="bg-white/3 border border-white/8 rounded-2xl p-5 h-fit">
        <h2 className="text-xl font-semibold">Veredito operacional</h2>
        <p className="text-sm text-white/60 mt-3">
          O app vira o controle da empresa quando cada estrategia vira uma fila de decisao, tarefa e metrica.
          Docs continuam como memoria. O painel vira comando.
        </p>
        <div className="mt-5 space-y-3">
          <Callout icon={<GitBranch size={16} />} text="Toda isca deve apontar para uma dor, uma tag e um app futuro." />
          <Callout icon={<BarChart3 size={16} />} text="Todo teste de trafego deve gerar decisao: escalar, ajustar ou cortar." />
          <Callout icon={<Network size={16} />} text="Todo comprador low ticket deve virar sinal para o ecossistema." />
        </div>
      </section>
    </div>
  );
}

function KpiCard({ icon, label, value, sub, color }: { icon: ReactNode; label: string; value: string; sub: string; color: string }) {
  return (
    <div className="bg-white/3 border border-white/8 rounded-2xl p-4">
      <div className={`flex items-center gap-2 text-xs ${color} mb-2`}>
        {icon}
        <span className="font-mono uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-2xl font-bold text-white">{value}</div>
      <div className="text-[11px] text-white/40 mt-1">{sub}</div>
    </div>
  );
}

function MetricRow({ label, value, max, current }: { label: string; value: string; max: number; current?: number }) {
  const numeric = current ?? (parseFloat(value.replace(/[^\d,.-]/g, '').replace(',', '.')) || 0);
  const width = Math.min(100, Math.max(4, (numeric / Math.max(1, max)) * 100));
  return (
    <div>
      <div className="flex items-center justify-between text-sm mb-1.5">
        <span className="text-white/55">{label}</span>
        <span className="font-mono text-white/80">{value}</span>
      </div>
      <div className="h-2 bg-black/30 rounded-full overflow-hidden">
        <div className="h-full bg-gradient-to-r from-[#06B6D4] to-[#2563EB]" style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

function NumberField({ label, value, suffix, onChange }: { label: string; value: number; suffix?: string; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="block text-xs text-white/40 mb-1">{label}</span>
      <div className="relative">
        <input
          type="number"
          step="0.1"
          className={`${inputClass} ${suffix ? 'pr-9' : ''}`}
          value={Number.isFinite(value) ? value : 0}
          onChange={(e) => onChange(parseFloat(e.target.value || '0'))}
        />
        {suffix && <span className="absolute right-3 top-2.5 text-xs text-white/35">{suffix}</span>}
      </div>
    </label>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#0A0F1E] border border-white/8 rounded-xl p-4">
      <div className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">{label}</div>
      <div className="text-sm text-white/75">{value}</div>
    </div>
  );
}

function BridgeRow({ from, to }: { from: string; to: string }) {
  return (
    <div className="grid grid-cols-[1fr_34px_1fr] gap-3 items-center">
      <div className="bg-[#0A0F1E] border border-white/8 rounded-xl p-3 text-sm text-white/70">{from}</div>
      <div className="text-white/25 flex justify-center">
        <Route size={16} />
      </div>
      <div className="bg-[#2563EB]/8 border border-[#2563EB]/20 rounded-xl p-3 text-sm text-white/75">{to}</div>
    </div>
  );
}

function Callout({ icon, text }: { icon: ReactNode; text: string }) {
  return (
    <div className="flex items-start gap-3 bg-[#0A0F1E] border border-white/8 rounded-xl p-3">
      <div className="text-[#06B6D4] mt-0.5">{icon}</div>
      <div className="text-sm text-white/65">{text}</div>
    </div>
  );
}
