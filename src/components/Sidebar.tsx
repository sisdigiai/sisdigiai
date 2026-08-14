import React, { useState, useEffect } from 'react';
import {
  Eye, LayoutGrid, Map, List, Zap, TrendingUp,
  BookOpen, DollarSign, GitBranch, Library, Palette, Building2, Network,
  Compass, Flame, LogOut, Store, Sparkles, Music2, Activity,
  Camera, Wand2, Boxes, Search, ShieldCheck, Workflow, ChevronDown,
  GraduationCap, Languages, Calendar as CalendarIcon, Globe, BarChart3,
  Lightbulb, Heart, Package, Users, Receipt, Radio, CalendarCheck,
  Sunrise,
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
  | 'marketing-engajamento';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
}


const operacional: NavItem[] = [
  { id: 'hoje',             label: 'Hoje',              icon: <Sunrise className="w-4 h-4" /> },
  { id: 'visao',            label: 'Visão',             icon: <Eye className="w-4 h-4" /> },
  { id: 'semana',           label: 'Semana',            icon: <CalendarCheck className="w-4 h-4" /> },
  { id: 'portfolio',        label: 'Portfólio',         icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'trilha',           label: 'Roadmap',           icon: <Map className="w-4 h-4" /> },
  { id: 'lista-mestra',     label: 'Lista Mestra',      icon: <List className="w-4 h-4" /> },
  { id: 'backlog',          label: 'Backlog Executivo', icon: <Zap className="w-4 h-4" /> },
  { id: 'cadastro-empresa', label: 'Cadastro Empresa',  icon: <Building2 className="w-4 h-4" /> },
  { id: 'financeiro',       label: 'Financeiro',        icon: <DollarSign className="w-4 h-4" /> },
  { id: 'comercial',        label: 'Comercial',         icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'academy',          label: 'Academy',           icon: <BookOpen className="w-4 h-4" /> },
  { id: 'marketplace',      label: 'Marketplace',       icon: <Store className="w-4 h-4" /> },
  { id: 'clearix',          label: 'Central Clearix',   icon: <Network className="w-4 h-4" /> },
  { id: 'cobranca',         label: 'Cobrança',          icon: <Receipt className="w-4 h-4" /> },
];

// Marketing — enxuto pós-emagrecimento 2026-07-30: espelho MKT + engajamento +
// OSI (Mapa/Economia/Materiais/Afiliados em abas) + travas. Produção mora no MKT.
const marketing: NavItem[] = [
  { id: 'marketing',             label: 'Marketing (MKT)',  icon: <Radio className="w-4 h-4" /> },
  { id: 'marketing-engajamento', label: 'Engajamento',      icon: <Heart className="w-4 h-4" /> },
  { id: 'fluxo-osi',             label: 'OSI',              icon: <Workflow className="w-4 h-4" /> },
  { id: 'travas-marketing',      label: 'Travas Marketing', icon: <ShieldCheck className="w-4 h-4" /> },
];

const sistema: NavItem[] = [
  { id: 'guia',               label: 'Guia Operacional',    icon: <Compass className="w-4 h-4" /> },
  { id: 'decisoes',           label: 'Decisões',            icon: <GitBranch className="w-4 h-4" /> },
  { id: 'biblioteca',         label: 'Biblioteca',          icon: <Library className="w-4 h-4" /> },
  { id: 'brand',              label: 'Brand Guidelines',    icon: <Palette className="w-4 h-4" /> },
];

interface SidebarProps {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

type SectionKey = 'operacional' | 'marketing' | 'ecossistemas' | 'sistema';

const SISTEMA_IDS = sistema.map(i => i.id) as ModuleId[];
const MARKETING_IDS = marketing.map(i => i.id) as ModuleId[];

function sectionOf(id: ModuleId): SectionKey {
  if (id === 'ecossistemas' || id === 'mapa-vivo') return 'ecossistemas';
  if (MARKETING_IDS.includes(id)) return 'marketing';
  if (SISTEMA_IDS.includes(id)) return 'sistema';
  return 'operacional';
}

const COLLAPSE_KEY = 'digiai.sidebar.collapsed.v1';

function loadCollapsed(): Record<SectionKey, boolean> {
  const fallback = { operacional: false, marketing: false, ecossistemas: true, sistema: false };
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
  const visibleOperacional = operacional.filter(item => canAccessModule(item.id, role));
  const visibleMarketing = marketing.filter(item => canAccessModule(item.id, role));
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
        <div>
          <GroupHeader k="operacional" label="Operacional" />
          {isOpen('operacional') && (
            <div className="space-y-0.5">
              {visibleOperacional.map(item => <NavButton key={item.id} item={item} />)}
            </div>
          )}
        </div>

        <div>
          <GroupHeader k="marketing" label="Marketing" />
          {isOpen('marketing') && (
            <div className="space-y-0.5">
              {visibleMarketing.map(item => <NavButton key={item.id} item={item} />)}
            </div>
          )}
        </div>

        <div>
          <GroupHeader k="ecossistemas" label="Ecossistemas" />
          {isOpen('ecossistemas') && (
            <>
              <div className="space-y-0.5">
                <NavButton item={{ id: 'mapa-vivo', label: 'Mapa Vivo', icon: <Network className="w-4 h-4" /> }} />
                <NavButton item={{ id: 'ecossistemas', label: 'Painel', icon: <Boxes className="w-4 h-4" /> }} />
              </div>
              <div className="px-3 mt-2 text-[9px] font-mono text-muted/70 leading-relaxed">
                Links e status de cada app moram no Painel (fonte: digital_assets · ADR-0029)
              </div>
            </>
          )}
        </div>

        <div>
          <GroupHeader k="sistema" label="Sistema" />
          {isOpen('sistema') && (
            <div className="space-y-0.5">
              {sistema.map(item => <NavButton key={item.id} item={item} />)}
            </div>
          )}
        </div>
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
