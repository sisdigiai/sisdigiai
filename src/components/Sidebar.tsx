import React, { useState, useEffect } from 'react';
import {
  Eye, LayoutGrid, Map, List, Zap, TrendingUp,
  BookOpen, DollarSign, GitBranch, Library, Palette, Building2, Network,
  Compass, Flame, LogOut, Store, Sparkles, Music2, Activity,
  Camera, Wand2, Boxes, Search, ShieldCheck, Workflow, ChevronDown,
  GraduationCap, Languages, Calendar as CalendarIcon, Globe, BarChart3,
  Lightbulb, Heart, Package, Users, Receipt, Radio, CalendarCheck,
  Sunrise, Calculator,
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import { canAccessModule } from '../lib/permissions';

export type ModuleId =
  | 'hoje'
  | 'visao' | 'semana' | 'portfolio' | 'trilha' | 'lista-mestra'
  | 'backlog' | 'comercial' | 'academy' | 'financeiro'
  | 'decisoes' | 'biblioteca' | 'brand' | 'cadastro-empresa'
  | 'clearix' | 'cobranca' | 'marketing'
  | 'marketplace' | 'ecossistemas' | 'mapa-vivo' | 'travas-marketing'
  | 'fluxo-osi' | 'guia'
  | 'marketing-engajamento' | 'inventario' | 'seo' | 'vendas'
  | 'mkt-crescimento' | 'mkt-calc';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
}


// ── Fase F (2026-08-15): 24 modulos viram 6 secoes ──────────────────────────
// Os modulos nao foram reescritos — eles funcionavam. O que estava errado era a
// navegacao: 24 itens numa lista plana obrigam a decidir onde clicar antes de
// saber o que fazer. Cada secao agora agrupa os modulos que respondem a MESMA
// pergunta, e o primeiro item de cada uma e a entrada natural.
//
// Reescrever 24 telas em 6 no fim de um dia de construcao seria trocar dispersao
// por bug. Agrupar e reversivel; reescrever nao.

// Consolidada (Fase F): a secao Hoje tem UM item. Semana, Roadmap, Lista Mestra
// e Backlog continuam roteaveis — viraram links no rodape da propria tela, e a
// Visao deixou de existir (KPIs viraram o placar). Menu nao e indice de arquivos:
// e a lista do que se decide todo dia.
const hoje: NavItem[] = [
  { id: 'hoje', label: 'Ordem do dia', icon: <Sunrise className="w-4 h-4" /> },
];

// Roteaveis sem cadeira no menu — alcancadas pelos links da tela Hoje.
const SEM_CADEIRA: ModuleId[] = ['visao', 'semana', 'trilha', 'lista-mestra', 'backlog'];

const dinheiro: NavItem[] = [
  { id: 'vendas',           label: 'Vendas',            icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'financeiro',       label: 'Financeiro',        icon: <DollarSign className="w-4 h-4" /> },
  { id: 'cobranca',         label: 'Cobrança',          icon: <Receipt className="w-4 h-4" /> },
  { id: 'marketplace',      label: 'Marketplace',       icon: <Store className="w-4 h-4" /> },
];

const mercado: NavItem[] = [
  { id: 'comercial',        label: 'Pipeline',          icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'fluxo-osi',        label: 'OSI',               icon: <Workflow className="w-4 h-4" /> },
  { id: 'marketing-engajamento', label: 'Engajamento',  icon: <Heart className="w-4 h-4" /> },
];

const produtos: NavItem[] = [
  { id: 'portfolio',        label: 'Portfólio',         icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'ecossistemas',     label: 'Ecossistemas',      icon: <Boxes className="w-4 h-4" /> },
  { id: 'mapa-vivo',        label: 'Mapa vivo',         icon: <Activity className="w-4 h-4" /> },
  { id: 'clearix',          label: 'Central Clearix',   icon: <Network className="w-4 h-4" /> },
  { id: 'academy',          label: 'Academy',           icon: <BookOpen className="w-4 h-4" /> },
  { id: 'seo',              label: 'SEO',               icon: <Globe className="w-4 h-4" /> },
];

const marketing: NavItem[] = [
  { id: 'marketing',        label: 'Espelho do MKT',    icon: <Radio className="w-4 h-4" /> },
  { id: 'mkt-crescimento',  label: 'Radar 360',         icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'mkt-calc',         label: 'Calc (isca)',       icon: <Calculator className="w-4 h-4" /> },
  { id: 'travas-marketing', label: 'Travas',            icon: <ShieldCheck className="w-4 h-4" /> },
];

const empresa: NavItem[] = [
  { id: 'inventario',       label: 'Inventário',        icon: <Package className="w-4 h-4" /> },
  { id: 'cadastro-empresa', label: 'Cadastro',          icon: <Building2 className="w-4 h-4" /> },
  { id: 'decisoes',         label: 'Decisões',          icon: <GitBranch className="w-4 h-4" /> },
  { id: 'brand',            label: 'Marca',             icon: <Palette className="w-4 h-4" /> },
  { id: 'biblioteca',       label: 'Biblioteca',        icon: <Library className="w-4 h-4" /> },
  { id: 'guia',             label: 'Guia',              icon: <Compass className="w-4 h-4" /> },
];

interface SidebarProps {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

type SectionKey = 'hoje' | 'dinheiro' | 'mercado' | 'produtos' | 'marketing' | 'empresa';

// A secao responde a pergunta que o dono tem na cabeca, nao a arquitetura do app.
const SECOES: { k: SectionKey; label: string; itens: NavItem[] }[] = [
  { k: 'hoje',      label: 'Hoje',      itens: hoje },
  { k: 'dinheiro',  label: 'Dinheiro',  itens: dinheiro },
  { k: 'mercado',   label: 'Mercado',   itens: mercado },
  { k: 'produtos',  label: 'Produtos',  itens: produtos },
  { k: 'marketing', label: 'Marketing', itens: marketing },
  { k: 'empresa',   label: 'Empresa',   itens: empresa },
];

function sectionOf(id: ModuleId): SectionKey {
  if (SEM_CADEIRA.includes(id)) return 'hoje';
  return SECOES.find(s => s.itens.some(i => i.id === id))?.k ?? 'hoje';
}

const COLLAPSE_KEY = 'digiai.sidebar.collapsed.v1';

function loadCollapsed(): Record<SectionKey, boolean> {
  // So a secao do dia nasce aberta: o resto se abre sozinho quando voce navega
  // para dentro dele. Seis cabecalhos cabem na tela; 24 itens nao cabiam.
  const fallback: Record<SectionKey, boolean> = {
    hoje: false, dinheiro: true, mercado: true, produtos: true, marketing: true, empresa: true,
  };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export default function Sidebar({ active, onSelect, mobileOpen = false, onClose }: SidebarProps) {
  const { user, role, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>(loadCollapsed);
  const secoesVisiveis = SECOES
    .map(s => ({ ...s, itens: s.itens.filter(item => canAccessModule(item.id, role)) }))
    .filter(s => s.itens.length > 0);
  const activeSection = sectionOf(active);

  const toggleSection = (k: SectionKey) => {
    setCollapsed(prev => {
      const next = { ...prev, [k]: !prev[k] };
      try { window.localStorage.setItem(COLLAPSE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  };

  // Ao navegar, abre a seção do módulo ativo (só em memória — não sobrescreve
  // a preferência salva, então o default recolhido volta no reload).
  useEffect(() => {
    setCollapsed(prev => (prev[activeSection] ? { ...prev, [activeSection]: false } : prev));
  }, [activeSection]);

  const isOpen = (k: SectionKey) => !collapsed[k];

  const GroupHeader = ({ k, label }: { k: SectionKey; label: string }) => (
    <button
      onClick={() => toggleSection(k)}
      className="w-full flex items-center justify-between px-3 mb-2 group/h"
      aria-expanded={isOpen(k)}
    >
      <span className="text-[10px] font-mono text-muted uppercase tracking-widest group-hover/h:text-on-surface-variant transition-colors">{label}</span>
      <ChevronDown className={`w-3.5 h-3.5 text-muted transition-transform duration-200 ${isOpen(k) ? '' : '-rotate-90'}`} />
    </button>
  );

  const NavButton = ({ item }: { item: NavItem }) => (
    <button
      onClick={() => onSelect(item.id)}
      className={`w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium transition-all duration-150 text-left border-l-2
        ${active === item.id
          ? 'bg-secondary-container text-on-secondary-container border-secondary'
          : 'text-on-surface-variant border-transparent hover:text-on-surface hover:bg-surface-highest'
        }`}
    >
      <span>{item.icon}</span>
      {item.label}
    </button>
  );

  return (
    <>
      {mobileOpen && <div className="fixed inset-0 z-40 bg-black/60 md:hidden" onClick={onClose} />}
      <div className={`w-60 shrink-0 h-screen bg-surface-container border-r border-outline/10 flex flex-col z-50 fixed inset-y-0 left-0 transition-transform duration-200 md:static md:translate-x-0 ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}`}>
      <div className="h-20 px-6 flex flex-col justify-center border-b border-outline/10">
        <Logo variant="horizontal" iconClassName="w-7 h-7" textClassName="text-xl" />
        <div className="mt-2 text-[10px] font-mono text-muted uppercase tracking-[0.25em]">Painel Operacional</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        {secoesVisiveis.map(sec => (
          <div key={sec.k}>
            <GroupHeader k={sec.k} label={sec.label} />
            {isOpen(sec.k) && (
              <div className="space-y-0.5">
                {sec.itens.map(item => <NavButton key={item.id} item={item} />)}
              </div>
            )}
          </div>
        ))}
      </nav>

      <div className="p-3 border-t border-outline/10 space-y-2">
        {user && (
          <div className="px-3 py-2 bg-surface-high border border-outline/15">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">Logado</div>
            <div className="text-xs text-on-surface-variant truncate" title={user.email ?? ''}>
              {user.email}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-danger hover:bg-danger/10 hover:border-danger/30 border border-transparent transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        <div className="text-[10px] font-mono text-muted text-center pt-1">
          Fase 2 de 8 · Zero aos Milhões
        </div>
      </div>
    </div>
    </>
  );
}
