import { useEffect, useState } from 'react';
import { Workflow, BookOpen, Flame, Megaphone, Boxes, ArrowRight } from 'lucide-react';
import { academyStore } from '../lib/academyStore';
import { funnelStore, calculateFunnelSummary } from '../lib/funnelStore';
import { marketingStore } from '../lib/marketingStore';
import { TravasBanner } from './TravasMarketing';

const brl = (v: number | null | undefined) =>
  v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Stage {
  produto: { nome: string; preco: number | null; status: string } | null;
  funil: { ticket: number; roas: number } | null;
  mkt: { posts: number; ideias: number; afiliados: number } | null;
}

export default function FluxoOSI() {
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
    <div className="flex-1 min-w-[200px] rounded-2xl border border-white/8 bg-white/[0.02] p-5">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">
        {icon} {etapa}
      </div>
      <div className="font-bold text-base mb-3">{titulo}</div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );

  const Metric = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between gap-2">
      <span className="text-white/40">{label}</span>
      <span className="text-white/85 font-medium text-right">{value}</span>
    </div>
  );

  const Arrow = () => (
    <div className="flex items-center justify-center text-white/20 py-2 md:py-0">
      <ArrowRight className="w-5 h-5 hidden md:block" />
      <ArrowRight className="w-5 h-5 md:hidden rotate-90" />
    </div>
  );

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
          <Workflow className="w-7 h-7 text-[#06B6D4]" /> Fluxo OSI
        </h1>
        <p className="text-white/50 mt-1">
          A espinha que conecta os três módulos em torno da Ótica Sem Improviso:
          <b className="text-white/70"> produto</b> (Academy) → <b className="text-white/70">captação</b> (Funil) →
          <b className="text-white/70"> distribuição</b> (Marketing) → <b className="text-[#06B6D4]">Clearix</b>.
        </p>
      </div>

      <TravasBanner />

      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        <Card icon={<BookOpen className="w-3.5 h-3.5" />} etapa="Produto · Academy" titulo={s.produto?.nome || '…'}>
          <Metric label="Preço" value={brl(s.produto?.preco)} />
          <Metric label="Status" value={s.produto?.status || '—'} />
          <div className="text-[11px] text-white/30 pt-1">Editar em Operacional → Academy</div>
        </Card>

        <Arrow />

        <Card icon={<Flame className="w-3.5 h-3.5" />} etapa="Captação · Funil OSI" titulo="Isca paga + esteira">
          <Metric label="Ticket médio" value={s.funil ? brl(s.funil.ticket) : '…'} />
          <Metric label="ROAS microteste" value={s.funil ? s.funil.roas.toFixed(2) : '…'} />
          <div className="text-[11px] text-white/30 pt-1">Editar em Operacional → Funil OSI</div>
        </Card>

        <Arrow />

        <Card icon={<Megaphone className="w-3.5 h-3.5" />} etapa="Distribuição · Marketing" titulo="Calendário + afiliados">
          <Metric label="Posts no calendário" value={s.mkt ? String(s.mkt.posts) : '…'} />
          <Metric label="Ideias no banco" value={s.mkt ? String(s.mkt.ideias) : '…'} />
          <Metric label="Afiliados" value={s.mkt ? String(s.mkt.afiliados) : '…'} />
          <div className="text-[11px] text-white/30 pt-1">Editar em Operacional → Marketing</div>
        </Card>
      </div>

      <div className="rounded-2xl border border-[#2563EB]/20 bg-[#2563EB]/[0.06] p-5 flex items-center gap-3">
        <Boxes className="w-5 h-5 text-[#06B6D4] shrink-0" />
        <div className="text-sm text-white/70">
          <b className="text-white">Destino: Clearix.</b> Academy/OSI são funil de entrada do ecossistema (decisão 17/04) —
          todo conteúdo do Marketing e toda venda do Funil devem puxar o comprador pro Clearix. É a trava
          <b className="text-white/85"> "CTA pro Clearix em tudo"</b>.
        </div>
      </div>

      <div className="text-[11px] text-white/30 border-t border-white/5 pt-4">
        Fonte viva: <span className="font-mono">academy.products</span> + funil (workspace local) +
        <span className="font-mono"> marketing.content_calendar/ideas/affiliates</span>. Esta é a visão consolidada;
        a edição continua em cada módulo.
      </div>
    </div>
  );
}
