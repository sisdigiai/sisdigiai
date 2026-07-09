import React from 'react';
import { Construction } from 'lucide-react';
import PageHeader from '../components/PageHeader';

interface StubProps {
  numero: number;
  nome: string;
  descricao: string;
  entregaveis: string[];
}

export function ModuleStub({ numero, nome, descricao, entregaveis }: StubProps) {
  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader eyebrow={`Módulo ${numero}`} title={nome} subtitle={descricao} />
      <div className="space-y-8">
      <div className="border border-warning/20 bg-warning/5 p-8 flex flex-col items-center text-center gap-4">
        <Construction className="w-12 h-12 text-warning/60" />
        <div>
          <div className="text-lg font-semibold text-on-surface">Módulo em construção</div>
          <div className="text-sm text-on-surface-variant mt-1 max-w-md">{descricao}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-mono text-muted uppercase tracking-widest mb-3">O que será implementado</div>
        <div className="space-y-2">
          {entregaveis.map((e, i) => (
            <div key={i} className="flex items-center gap-3 bg-surface-container border border-outline/15 px-4 py-3">
              <div className="w-2 h-2 bg-muted shrink-0" />
              <span className="text-sm text-on-surface-variant">{e}</span>
            </div>
          ))}
        </div>
      </div>
      </div>
    </div>
  );
}
