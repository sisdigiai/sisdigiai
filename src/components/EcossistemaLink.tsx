import React from 'react';
import { ExternalLink } from 'lucide-react';

export type EcossistemaStatus = 'ativo' | 'em_construcao' | 'em_concepcao' | 'pausado';

interface Props {
  icone: React.ReactNode;
  nome: string;
  url?: string;
  status: EcossistemaStatus;
}

const STATUS_STYLE: Record<EcossistemaStatus, { label: string; dotClass: string; textClass: string }> = {
  ativo:          { label: 'Ativo',     dotClass: 'bg-emerald-400',       textClass: 'text-emerald-300/80' },
  em_construcao:  { label: 'Em obra',   dotClass: 'bg-amber-400',         textClass: 'text-amber-300/80' },
  em_concepcao:   { label: 'Concepção', dotClass: 'bg-white/30',          textClass: 'text-white/40' },
  pausado:        { label: 'Pausado',   dotClass: 'bg-rose-400/70',       textClass: 'text-rose-300/70' },
};

export default function EcossistemaLink({ icone, nome, url, status }: Props) {
  const style = STATUS_STYLE[status];
  const isClickable = !!url && (status === 'ativo' || status === 'em_construcao');

  const inner = (
    <>
      <span className={isClickable ? '' : 'opacity-40'}>{icone}</span>
      <span className="flex-1 flex items-center gap-2 min-w-0">
        <span className={`truncate ${isClickable ? '' : 'text-white/30'}`}>{nome}</span>
        <span className={`shrink-0 inline-flex items-center gap-1 text-[9px] font-mono uppercase tracking-wider ${style.textClass}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${style.dotClass}`} />
          {style.label}
        </span>
      </span>
      {isClickable && <ExternalLink className="w-3 h-3 text-white/30 shrink-0" />}
    </>
  );

  if (isClickable && url) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left text-white/60 hover:text-white/90 hover:bg-white/5"
      >
        {inner}
      </a>
    );
  }

  return (
    <div
      title={url ? 'Em breve' : 'Sem URL ainda'}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-white/30 cursor-not-allowed"
    >
      {inner}
    </div>
  );
}
