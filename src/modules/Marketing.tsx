import { useState } from 'react';
import { Calendar as CalendarIcon, Crown, Lightbulb, Megaphone, MessageSquareQuote, Package, Sparkles, TrendingUp, Users, Wand2 } from 'lucide-react';
import { CalendarioEditorial } from './marketing/CalendarioEditorial';
import { BancoIdeias } from './marketing/BancoIdeias';
import { MateriaisAfiliados } from './marketing/MateriaisAfiliados';
import { Afiliados } from './marketing/Afiliados';
import { PromptsIA } from './marketing/PromptsIA';
import { Validacao } from './marketing/Validacao';
import { Depoimentos } from './marketing/Depoimentos';
import { Planejador } from './marketing/Planejador';
import { Comunidade } from './marketing/Comunidade';

type SubTab = 'calendario' | 'planejador' | 'banco' | 'prompts' | 'validacao' | 'depoimentos' | 'comunidade' | 'materiais' | 'afiliados';

const SUBTABS: { id: SubTab; label: string; icon: typeof CalendarIcon }[] = [
  { id: 'calendario', label: 'Calendário Editorial', icon: CalendarIcon },
  { id: 'planejador', label: 'Planejador', icon: Wand2 },
  { id: 'banco', label: 'Banco de Ideias', icon: Lightbulb },
  { id: 'prompts', label: 'Prompts IA', icon: Sparkles },
  { id: 'validacao', label: 'Validação', icon: TrendingUp },
  { id: 'depoimentos', label: 'Depoimentos', icon: MessageSquareQuote },
  { id: 'comunidade', label: 'Comunidade OSI', icon: Crown },
  { id: 'materiais', label: 'Materiais (afiliados)', icon: Package },
  { id: 'afiliados', label: 'Afiliados', icon: Users },
];

export default function Marketing() {
  const [active, setActive] = useState<SubTab>('calendario');

  return (
    <div className="h-full flex flex-col">
      <div className="border-b border-white/5 px-8 py-5">
        <div className="flex items-center gap-3 mb-1">
          <Megaphone className="w-5 h-5 text-[#06B6D4]" />
          <h1 className="text-xl font-semibold">Marketing</h1>
        </div>
        <p className="text-xs text-white/40">
          Calendário editorial + banco de ideias + materiais de afiliados + CRM de afiliados. Tudo num lugar só.
        </p>
      </div>

      <div className="border-b border-white/5 px-8">
        <div className="flex gap-1 overflow-x-auto">
          {SUBTABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap
                  ${isActive
                    ? 'border-[#06B6D4] text-white'
                    : 'border-transparent text-white/40 hover:text-white/70'
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
        {active === 'calendario' && <CalendarioEditorial />}
        {active === 'planejador' && <Planejador />}
        {active === 'banco' && <BancoIdeias />}
        {active === 'prompts' && <PromptsIA />}
        {active === 'validacao' && <Validacao />}
        {active === 'depoimentos' && <Depoimentos />}
        {active === 'comunidade' && <Comunidade />}
        {active === 'materiais' && <MateriaisAfiliados />}
        {active === 'afiliados' && <Afiliados />}
      </div>
    </div>
  );
}
