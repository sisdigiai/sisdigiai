import { useState, type ReactNode } from 'react';
import { BarChart3, Calendar as CalendarIcon, Crown, MessageSquareQuote, TrendingUp, Trophy, Wand2 } from 'lucide-react';
import { Redes } from './marketing/Redes';
import { Performance } from './marketing/Performance';
import { CalendarioEditorial } from './marketing/CalendarioEditorial';
import { BancoIdeias } from './marketing/BancoIdeias';
import { MateriaisAfiliados } from './marketing/MateriaisAfiliados';
import { AfiliadosDashboard } from './marketing/AfiliadosDashboard';
import { PromptsIA } from './marketing/PromptsIA';
import { Validacao } from './marketing/Validacao';
import { Depoimentos } from './marketing/Depoimentos';
import { Planejador } from './marketing/Planejador';
import { Comunidade } from './marketing/Comunidade';
import { Desafios } from './marketing/Desafios';
import { TravasBanner } from './TravasMarketing';
import PageHeader from '../components/PageHeader';

// As antigas sub-abas do módulo Marketing viraram itens de 1º nível na sidebar
// (seção "Marketing"). Cada item vira uma `MarketingView`. Duas views agregam
// várias telas em sub-abas internas: "calendario" (+ Planejador) e "engajamento"
// (Validação / Depoimentos / Comunidade / Desafios).
export type MarketingView =
  | 'calendario' | 'redes' | 'performance' | 'banco' | 'prompts'
  | 'engajamento' | 'materiais' | 'afiliados';

const VIEW_META: Record<MarketingView, { eyebrow: string; title: string; subtitle: string }> = {
  calendario:  { eyebrow: 'Distribuição & conteúdo', title: 'Calendário',     subtitle: 'Calendário editorial das 3 camadas + o Planejador que gera a agenda em lote.' },
  redes:       { eyebrow: 'Distribuição & conteúdo', title: 'Redes',          subtitle: 'Contas travadas por camada (pessoal · DIGIAI · OSI) + log eterno de atualizações.' },
  performance: { eyebrow: 'Distribuição & conteúdo', title: 'Performance',    subtitle: 'Placar de seguidores e métricas por post das contas conectadas.' },
  banco:       { eyebrow: 'Distribuição & conteúdo', title: 'Banco de Ideias', subtitle: 'Repositório de ganchos por pilar — agende uma ideia direto pro calendário.' },
  prompts:     { eyebrow: 'Distribuição & conteúdo', title: 'Prompts IA',     subtitle: 'Templates de prompt por pilar e canal — AI produz, humano publica (R-011).' },
  engajamento: { eyebrow: 'Comunidade & prova',      title: 'Engajamento',    subtitle: 'Validação de pilares, depoimentos, comunidade OSI e desafios — tudo num lugar só.' },
  materiais:   { eyebrow: 'Afiliados',               title: 'Materiais',      subtitle: 'Kit de materiais prontos pros afiliados divulgarem (banners, copy, reels).' },
  afiliados:   { eyebrow: 'Afiliados',               title: 'Afiliados',      subtitle: 'CRM de afiliados: cadastro, comissões, payouts e leaderboard.' },
};

interface SubTab { id: string; label: string; icon: typeof CalendarIcon; render: () => ReactNode }

const CALENDARIO_TABS: SubTab[] = [
  { id: 'calendario', label: 'Calendário Editorial', icon: CalendarIcon, render: () => <CalendarioEditorial /> },
  { id: 'planejador', label: 'Planejador',           icon: Wand2,        render: () => <Planejador /> },
];

const ENGAJAMENTO_TABS: SubTab[] = [
  { id: 'validacao',   label: 'Validação',     icon: TrendingUp,         render: () => <Validacao /> },
  { id: 'depoimentos', label: 'Depoimentos',   icon: MessageSquareQuote, render: () => <Depoimentos /> },
  { id: 'comunidade',  label: 'Comunidade OSI', icon: Crown,             render: () => <Comunidade /> },
  { id: 'desafios',    label: 'Desafios',      icon: Trophy,             render: () => <Desafios /> },
];

const SINGLE_VIEW: Partial<Record<MarketingView, () => ReactNode>> = {
  redes:       () => <Redes />,
  performance: () => <Performance />,
  banco:       () => <BancoIdeias />,
  prompts:     () => <PromptsIA />,
  materiais:   () => <MateriaisAfiliados />,
  afiliados:   () => <AfiliadosDashboard />,
};

export default function Marketing({ view = 'calendario' }: { view?: MarketingView }) {
  const meta = VIEW_META[view] ?? VIEW_META.calendario;
  const tabs = view === 'calendario' ? CALENDARIO_TABS : view === 'engajamento' ? ENGAJAMENTO_TABS : null;

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
