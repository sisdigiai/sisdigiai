import { useState, type ReactNode } from 'react';
import { Calendar as CalendarIcon, Crown, MessageSquareQuote, TrendingUp, Trophy } from 'lucide-react';
import { MateriaisAfiliados } from './marketing/MateriaisAfiliados';
import { AfiliadosDashboard } from './marketing/AfiliadosDashboard';
import { Validacao } from './marketing/Validacao';
import { Depoimentos } from './marketing/Depoimentos';
import { Comunidade } from './marketing/Comunidade';
import { Desafios } from './marketing/Desafios';
import { TravasBanner } from './TravasMarketing';
import PageHeader from '../components/PageHeader';

// Emagrecimento 2026-07-12 (decisão do dono): a produção de conteúdo
// (calendário, planejador, redes, performance, ideias, prompts) migrou 100%
// pro app DIGIAI MKT — aqui ficou o lado de VENDAS/prova social do OSI:
// Engajamento (validação · depoimentos · comunidade · desafios), Materiais
// e Afiliados. O espelho do MKT vive em MarketingEspelho.tsx.
export type MarketingView = 'engajamento' | 'materiais' | 'afiliados';

const VIEW_META: Record<MarketingView, { eyebrow: string; title: string; subtitle: string }> = {
  engajamento: { eyebrow: 'Comunidade & prova', title: 'Engajamento', subtitle: 'Validação de pilares, depoimentos, comunidade OSI e desafios — tudo num lugar só.' },
  materiais:   { eyebrow: 'Afiliados',          title: 'Materiais',   subtitle: 'Kit de materiais prontos pros afiliados divulgarem (banners, copy, reels).' },
  afiliados:   { eyebrow: 'Afiliados',          title: 'Afiliados',   subtitle: 'CRM de afiliados: cadastro, comissões, payouts e leaderboard.' },
};

interface SubTab { id: string; label: string; icon: typeof CalendarIcon; render: () => ReactNode }

const ENGAJAMENTO_TABS: SubTab[] = [
  { id: 'validacao',   label: 'Validação',      icon: TrendingUp,         render: () => <Validacao /> },
  { id: 'depoimentos', label: 'Depoimentos',    icon: MessageSquareQuote, render: () => <Depoimentos /> },
  { id: 'comunidade',  label: 'Comunidade OSI', icon: Crown,              render: () => <Comunidade /> },
  { id: 'desafios',    label: 'Desafios',       icon: Trophy,             render: () => <Desafios /> },
];

const SINGLE_VIEW: Partial<Record<MarketingView, () => ReactNode>> = {
  materiais: () => <MateriaisAfiliados />,
  afiliados: () => <AfiliadosDashboard />,
};

export default function Marketing({ view = 'engajamento' }: { view?: MarketingView }) {
  const meta = VIEW_META[view] ?? VIEW_META.engajamento;
  const tabs = view === 'engajamento' ? ENGAJAMENTO_TABS : null;

  return (
    <div className="h-full flex flex-col max-w-7xl mx-auto w-full">
      <div className="px-8 pt-8">
        <PageHeader eyebrow={meta.eyebrow} title={meta.title} subtitle={meta.subtitle} />
        <TravasBanner />
      </div>

      {tabs ? (
        <TabbedView tabs={tabs} />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {SINGLE_VIEW[view]?.()}
        </div>
      )}
    </div>
  );
}

function TabbedView({ tabs }: { tabs: SubTab[] }) {
  const [active, setActive] = useState(tabs[0].id);

  return (
    <>
      <div className="border-b border-outline/10 px-8">
        <div className="flex gap-1 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${isActive
                    ? 'border-secondary text-on-surface'
                    : 'border-transparent text-muted hover:text-on-surface-variant'
                  }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {tabs.find((t) => t.id === active)?.render()}
      </div>
    </>
  );
}
