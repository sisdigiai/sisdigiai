import React from 'react';
import {
  Building2, Library, Palette, Eye, LayoutGrid, Map, GitBranch, List, Zap,
  Flame, BookOpen, Megaphone, Search, Network, Workflow, ShieldCheck,
  DollarSign, Boxes, Target, ArrowDown, RotateCcw, ChevronRight,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import type { ModuleId } from '../components/Sidebar';

type Mod = { id: ModuleId; label: string; nota: string; icon: React.ReactNode };

const I = "w-4 h-4";

const FUNDACAO: Mod[] = [
  { id: 'cadastro-empresa', label: 'Cadastro Empresa', nota: 'Identidade, CNPJ, LGPD/DPO, snapshot financeiro', icon: <Building2 className={I} /> },
  { id: 'biblioteca',       label: 'Biblioteca',        nota: '9 verdades canônicas + docs-mãe',             icon: <Library className={I} /> },
  { id: 'brand',            label: 'Brand Guidelines',  nota: 'Sistema visual Geometric Precision',          icon: <Palette className={I} /> },
];

interface Fase {
  etapa: string;
  nome: string;
  objetivo: string;
  mods: Mod[];
}

const FASES: Fase[] = [
  {
    etapa: 'Passo 1',
    nome: 'Decidir',
    objetivo: 'Onde estou e pra onde vou — antes de tocar em qualquer coisa.',
    mods: [
      { id: 'visao',     label: 'Visão',     nota: 'Pulso geral + alertas críticos', icon: <Eye className={I} /> },
      { id: 'portfolio', label: 'Portfólio', nota: '11 frentes · hierarquia canônica', icon: <LayoutGrid className={I} /> },
      { id: 'trilha',    label: 'Roadmap',   nota: 'Fase atual + métrica única',     icon: <Map className={I} /> },
      { id: 'decisoes',  label: 'Decisões',  nota: 'Registra o porquê (ADR)',        icon: <GitBranch className={I} /> },
    ],
  },
  {
    etapa: 'Passo 2',
    nome: 'Planejar',
    objetivo: 'Transformar a direção em tarefas concretas desta semana.',
    mods: [
      { id: 'lista-mestra', label: 'Lista Mestra',      nota: 'Backlog estratégico macro', icon: <List className={I} /> },
      { id: 'backlog',      label: 'Backlog Executivo', nota: 'O que fazer agora',         icon: <Zap className={I} /> },
    ],
  },
  {
    etapa: 'Passo 3',
    nome: 'Executar',
    objetivo: 'Tocar a operação — aquisição, distribuição e produto-âncora.',
    mods: [
      { id: 'funil',        label: 'Funil OSI',       nota: 'Aquisição / isca paga',       icon: <Flame className={I} /> },
      { id: 'academy',      label: 'Academy',         nota: 'Produto low-ticket de entrada', icon: <BookOpen className={I} /> },
      { id: 'fluxo-osi',    label: 'Mapa OSI',        nota: 'Mapa da espinha do ecossistema', icon: <Workflow className={I} /> },
      { id: 'marketing',    label: 'Marketing',       nota: 'Calendário + distribuição',   icon: <Megaphone className={I} /> },
      { id: 'marketing-seo',label: 'Marketing & SEO', nota: 'Tráfego orgânico',            icon: <Search className={I} /> },
      { id: 'clearix',      label: 'Central Clearix', nota: 'Produto-âncora · tenants',    icon: <Network className={I} /> },
    ],
  },
  {
    etapa: 'Passo 4',
    nome: 'Medir',
    objetivo: 'Fechar o ciclo com dados reais — e recomeçar.',
    mods: [
      { id: 'financeiro',   label: 'Financeiro',   nota: 'Burn rate + runway',     icon: <DollarSign className={I} /> },
      { id: 'ecossistemas', label: 'Ecossistemas', nota: 'Status vivo dos apps',   icon: <Boxes className={I} /> },
    ],
  },
];

function ModChip({ m, onNavigate }: { m: Mod; onNavigate?: (id: ModuleId) => void }) {
  return (
    <button
      onClick={() => onNavigate?.(m.id)}
      className="group flex items-start gap-3 text-left w-full bg-surface-low border border-outline/10 p-4 transition-all hover:border-secondary/40 hover:bg-secondary-container/15"
    >
      <span className="text-secondary mt-0.5 shrink-0">{m.icon}</span>
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1 text-sm font-medium text-on-surface">
          {m.label}
          <ChevronRight className="w-3.5 h-3.5 text-muted group-hover:text-secondary group-hover:translate-x-0.5 transition-all" />
        </span>
        <span className="block text-xs text-muted mt-0.5 leading-relaxed">{m.nota}</span>
      </span>
    </button>
  );
}

function Connector({ label }: { label?: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-1">
      <ArrowDown className="w-5 h-5 text-outline/60" />
      {label && <span className="font-mono text-[10px] uppercase tracking-widest text-muted">{label}</span>}
    </div>
  );
}

export default function Guia({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Como Operar"
        title="Guia Operacional"
        subtitle="O joystick do painel: a sequência de operação, da fundação ao loop diário. Cada cartão leva direto ao módulo."
      />

      <div className="space-y-10">
        {/* Gate — Pergunta de Ouro */}
        <div className="border border-secondary/40 bg-secondary-container/20 p-6">
          <div className="flex items-center gap-2 text-secondary mb-2">
            <Target className="w-4 h-4" />
            <span className="font-mono text-[10px] uppercase tracking-[0.2em]">Filtro de toda decisão · Pergunta de Ouro</span>
          </div>
          <p className="font-serif text-lg md:text-xl text-on-surface leading-snug">
            Isso fortalece a DIGIAI, o Clearix e a implantação da empresa segundo a verdade canônica atual?
          </p>
        </div>

        {/* Fundação */}
        <section>
          <div className="flex items-baseline gap-3 mb-4">
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">Fundação</span>
            <span className="text-xs text-muted">configura uma vez · base que não muda sem ADR</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {FUNDACAO.map((m) => <ModChip key={m.id} m={m} onNavigate={onNavigate} />)}
          </div>
        </section>

        <Connector label="com a base pronta, entra o ciclo" />

        {/* O Loop */}
        <section>
          <div className="flex items-center gap-2 mb-6">
            <RotateCcw className="w-4 h-4 text-secondary" />
            <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">O Loop</span>
            <span className="text-xs text-muted">repete a cada ciclo de execução</span>
          </div>

          <div className="space-y-6">
            {FASES.map((f, idx) => (
              <React.Fragment key={f.nome}>
                <div>
                  <div className="flex items-start gap-4 mb-4">
                    <div className="w-10 h-10 shrink-0 bg-secondary-container border border-secondary/40 flex items-center justify-center font-serif text-lg font-bold text-secondary">
                      {idx + 1}
                    </div>
                    <div className="min-w-0">
                      <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{f.etapa}</div>
                      <h3 className="font-serif text-xl font-semibold text-on-surface leading-tight">{f.nome}</h3>
                      <p className="text-sm text-on-surface-variant mt-0.5">{f.objetivo}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:pl-14">
                    {f.mods.map((m) => <ModChip key={m.id} m={m} onNavigate={onNavigate} />)}
                  </div>
                  {f.nome === 'Executar' && (
                    <div className="md:pl-14 mt-3">
                      <button
                        onClick={() => onNavigate?.('travas-marketing')}
                        className="group flex items-center gap-2 w-full text-left bg-amber-500/5 border border-amber-500/30 px-4 py-3 transition-colors hover:bg-amber-500/10"
                      >
                        <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0" />
                        <span className="text-sm text-on-surface">
                          <span className="font-medium">Travas de Marketing</span>
                          <span className="text-muted"> — gate inegociável: nada publica sem passar por aqui</span>
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted ml-auto group-hover:text-amber-400 transition-colors" />
                      </button>
                    </div>
                  )}
                </div>
                {idx < FASES.length - 1 && <Connector />}
              </React.Fragment>
            ))}
          </div>
        </section>

        {/* Loop back */}
        <div className="flex items-center justify-center gap-2 border-t border-outline/10 pt-6 text-muted">
          <RotateCcw className="w-4 h-4 text-secondary" />
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">Volta pra Visão</span>
          <span className="text-xs">— o ciclo recomeça com os dados novos em mãos.</span>
        </div>
      </div>
    </div>
  );
}
