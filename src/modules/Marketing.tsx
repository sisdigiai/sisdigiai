import { useState } from 'react';
import { Calendar as CalendarIcon, Lightbulb, Megaphone } from 'lucide-react';
import { CalendarioEditorial } from './marketing/CalendarioEditorial';
import { BancoIdeias } from './marketing/BancoIdeias';

type SubTab = 'calendario' | 'banco';

const SUBTABS: { id: SubTab; label: string; icon: typeof CalendarIcon }[] = [
  { id: 'calendario', label: 'Calendário Editorial', icon: CalendarIcon },
  { id: 'banco', label: 'Banco de Ideias', icon: Lightbulb },
];

export default function Marketing() {
  const [active, setActive] = useState<SubTab>('calendario');

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="border-b border-white/5 px-8 py-5">
        <div className="flex items-center gap-3 mb-1">
          <Megaphone className="w-5 h-5 text-[#06B6D4]" />
          <h1 className="text-xl font-semibold">Marketing</h1>
        </div>
        <p className="text-xs text-white/40">
          Calendário editorial + banco de ideias orgânicas para Ótica Sem Improviso. Postar sempre, com método.
        </p>
      </div>

      {/* Tabs */}
      <div className="border-b border-white/5 px-8">
        <div className="flex gap-1">
          {SUBTABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = active === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActive(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors
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

      {/* Conteúdo */}
      <div className="flex-1 overflow-y-auto">
        {active === 'calendario' && <CalendarioEditorial />}
        {active === 'banco' && <BancoIdeias />}
      </div>
    </div>
  );
}
