/**
 * OsiHub — módulo único da frente OSI (emagrecimento 2026-07-30).
 * Funde os antigos módulos Mapa OSI + Funil OSI (economia) + Materiais + Afiliados
 * em abas: a frente é uma só, a sidebar não precisava de 4 entradas.
 */
import { useState } from 'react';
import type { ModuleId } from '../components/Sidebar';
import FluxoOSI from './FluxoOSI';
import Funil from './Funil';
import Marketing from './Marketing';

type Aba = 'mapa' | 'economia' | 'materiais' | 'afiliados';

const ABAS: { id: Aba; label: string }[] = [
  { id: 'mapa', label: 'Mapa' },
  { id: 'economia', label: 'Economia do funil' },
  { id: 'materiais', label: 'Materiais' },
  { id: 'afiliados', label: 'Afiliados' },
];

export default function OsiHub({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  const [aba, setAba] = useState<Aba>('mapa');

  return (
    <div>
      <div className="sticky top-0 z-10 flex gap-1 px-6 pt-4 pb-0 bg-surface border-b border-outline/10">
        {ABAS.map((a) => (
          <button
            key={a.id}
            onClick={() => setAba(a.id)}
            className={`px-3 py-2 text-xs font-mono uppercase tracking-widest border-b-2 -mb-px transition-colors ${
              aba === a.id
                ? 'border-action text-on-surface'
                : 'border-transparent text-muted hover:text-on-surface-variant'
            }`}
          >
            {a.label}
          </button>
        ))}
      </div>
      {aba === 'mapa' && <FluxoOSI onNavigate={onNavigate} />}
      {aba === 'economia' && <Funil />}
      {aba === 'materiais' && <Marketing view="materiais" />}
      {aba === 'afiliados' && <Marketing view="afiliados" />}
    </div>
  );
}
