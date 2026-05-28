import { useEffect, useState } from 'react';
import { Workflow, BookOpen, Flame, Megaphone, Boxes, ArrowRight } from 'lucide-react';
import { academyStore } from '../lib/academyStore';
import { funnelStore, calculateFunnelSummary } from '../lib/funnelStore';
import { marketingStore } from '../lib/marketingStore';
import { TravasBanner } from './TravasMarketing';
import type { ModuleId } from '../components/Sidebar';

const brl = (v: number | null | undefined) =>
  v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Stage {
  produto: { nome: string; preco: number | null; status: string } | null;
  funil: { ticket: number; roas: number } | null;
  mkt: { posts: number; ideias: number; afiliados: number } | null;
}

export default function FluxoOSI({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  const [s, setS] = useState<Stage>({ produto: null, funil: null, mkt: null });

  useEffect(() => {
    // Funil é local (síncrono)
    try {
      const ws = funnelStore.getWorkspace();
      const sum = calculateFunnelSummary(ws);
      setS(prev => ({ ...prev, funil: { ticket: sum.averageOrderValue, roas: sum.projectedRoas } }));
    } catch { /* mantém null */ }

    academyStore.getWorkspace()
      .then(w => setS(prev => ({ ...prev, produto: { nome: w.product.product_name, preco: w.product.price_brl ?? null, status: w.product.status } })))
      .catch(() => {});

    Promise.all([marketingStore.listCalendar(), marketingStore.listIdeas(), marketingStore.listAffiliates()])
      .then(([cal, ideias, afi]) => setS(prev => ({ ...prev, mkt: { posts: cal.length, ideias: ideias.length, afiliados: afi.length } })))
      .catch(() => {});
  }, []);

  const Card = ({ icon, etapa, titulo, children }: { icon: React.ReactNode; etapa: string; titulo: string; children: React.ReactNode }) => (
    <div className="flex-1 min-w-[200px] border border-outline/10 bg-surface-low p-5">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
        {icon} {etapa}
      </div>
      <div className="font-bold text-base mb-3">{titulo}</div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );

  const Metric = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-on-surface font-medium text-right">{value}</span>
    </div>
  );

  const Arrow = () => (
    <div className="flex items-center justify-center text-muted py-2 md:py-0">
      <ArrowRight className="w-5 h-5 hidden md:block" />
      <ArrowRight className="w-5 h-5 md:hidden rotate-90" />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3 font-serif">
          <Workflow className="w-7 h-7 text-secondary" /> Fluxo OSI
        </h1>
        <p className="text-on-surface-variant mt-1">
          A espinha que conecta os três módulos em torno da Ótica Sem Improviso:
          <b className="text-on-surface-variant"> produto</b> (Academy) → <b className="text-on-surface-variant">captação</b> (Funil) →
          <b className="text-on-surface-variant"> distribuição</b> (Marketing) → <b className="text-secondary">Clearix</b>.
        </p>
      </div>

      <TravasBanner />

      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        <Card icon={<BookOpen className="w-3.5 h-3.5" />} etapa="Produto · Academy" titulo={s.produto?.nome || '…'}>
          <Metric label="Preço" value={brl(s.produto?.preco)} />
          <Metric label="Status" value={s.produto?.status || '—'} />
          <button onClick={() => onNavigate?.('academy')} className="text-[11px] text-secondary hover:text-secondary pt-1 transition-colors">Abrir Academy →</button>
        </Card>

        <Arrow />

        <Card icon={<Flame className="w-3.5 h-3.5" />} etapa="Captação · Funil OSI" titulo="Isca paga + esteira">
          <Metric label="Ticket médio" value={s.funil ? brl(s.funil.ticket) : '…'} />
          <Metric label="ROAS microteste" value={s.funil ? s.funil.roas.toFixed(2) : '…'} />
          <button onClick={() => onNavigate?.('funil')} className="text-[11px] text-secondary hover:text-secondary pt-1 transition-colors">Abrir Funil OSI →</button>
        </Card>

        <Arrow />

        <Card icon={<Megaphone className="w-3.5 h-3.5" />} etapa="Distribuição · Marketing" titulo="Calendário + afiliados">
          <Metric label="Posts no calendário" value={s.mkt ? String(s.mkt.posts) : '…'} />
          <Metric label="Ideias no banco" value={s.mkt ? String(s.mkt.ideias) : '…'} />
          <Metric label="Afiliados" value={s.mkt ? String(s.mkt.afiliados) : '…'} />
          <button onClick={() => onNavigate?.('marketing')} className="text-[11px] text-secondary hover:text-secondary pt-1 transition-colors">Abrir Marketing →</button>
        </Card>
      </div>

      <button onClick={() => onNavigate?.('clearix')} className="w-full text-left border border-secondary/40 bg-secondary-container/40 hover:bg-secondary-container/60 p-5 flex items-center gap-3 transition-colors">
        <Boxes className="w-5 h-5 text-secondary shrink-0" />
        <div className="text-sm text-on-surface-variant">
          <b className="text-on-surface">Destino: Clearix.</b> Academy/OSI são funil de entrada do ecossistema (decisão 17/04) —
          todo conteúdo do Marketing e toda venda do Funil devem puxar o comprador pro Clearix. É a trava
          <b className="text-on-surface"> "CTA pro Clearix em tudo"</b>. <span className="text-secondary">Abrir Central Clearix →</span>
        </div>
      </button>

      <div className="text-[11px] text-muted border-t border-outline/10 pt-4">
        Fonte viva: <span className="font-mono">academy.products</span> + funil (workspace local) +
        <span className="font-mono"> marketing.content_calendar/ideas/affiliates</span>. Esta é a visão consolidada;
        a edição continua em cada módulo.
      </div>
    </div>
  );
}
