import React from 'react';
import { Construction } from 'lucide-react';

interface StubProps {
  numero: number;
  nome: string;
  descricao: string;
  entregaveis: string[];
}

export function ModuleStub({ numero, nome, descricao, entregaveis }: StubProps) {
  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">{nome}</h1>
        <p className="text-white/50 mt-1">Módulo {numero} · em implementação</p>
      </div>

      <div className="border border-amber-400/20 bg-amber-400/5 rounded-2xl p-8 flex flex-col items-center text-center gap-4">
        <Construction className="w-12 h-12 text-amber-400/60" />
        <div>
          <div className="text-lg font-semibold text-white/80">Módulo em construção</div>
          <div className="text-sm text-white/50 mt-1 max-w-md">{descricao}</div>
        </div>
      </div>

      <div>
        <div className="text-xs font-mono text-white/30 uppercase tracking-widest mb-3">O que será implementado</div>
        <div className="space-y-2">
          {entregaveis.map((e, i) => (
            <div key={i} className="flex items-center gap-3 bg-white/2 border border-white/6 rounded-xl px-4 py-3">
              <div className="w-2 h-2 rounded-full bg-white/15 shrink-0" />
              <span className="text-sm text-white/60">{e}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
