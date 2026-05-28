import React, { useState, useEffect } from 'react';
import {
  Eye, LayoutGrid, Map, List, Zap, TrendingUp,
  BookOpen, DollarSign, GitBranch, Library, Palette, Building2, Network,
  Compass, Flame, Megaphone, LogOut, Store, Sparkles, Music2, Activity,
  Camera, Wand2, Boxes, Search, ShieldCheck, Workflow, ChevronDown,
  GraduationCap, Languages
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import EcossistemaLink, { EcossistemaStatus } from './EcossistemaLink';

export type ModuleId =
  | 'visao' | 'portfolio' | 'trilha' | 'lista-mestra'
  | 'backlog' | 'comercial' | 'academy' | 'funil' | 'financeiro'
  | 'decisoes' | 'biblioteca' | 'brand' | 'cadastro-empresa'
  | 'clearix' | 'referencias-design' | 'mock-estilos' | 'marketing'
  | 'marketing-seo' | 'ecossistemas' | 'travas-marketing' | 'fluxo-osi'
  | 'guia';

interface NavItem {
  id: ModuleId;
  label: string;
  icon: React.ReactNode;
}

interface Ecossistema {
  key: string;
  icone: React.ReactNode;
  nome: string;
  url?: string;
  status: EcossistemaStatus;
}

// URLs externas dos ecossistemas (override via .env quando aplicavel)
// Verificado online em 2026-05-28 — todos respondendo 200.
const ATLAS_URL       = import.meta.env.VITE_ATLAS_URL       || 'https://digiaiatlas.netlify.app';
const OSI_URL         = import.meta.env.VITE_OSI_URL         || 'https://oticasemimproviso.netlify.app';
const CLEARIX_HUB_URL = import.meta.env.VITE_CLEARIX_HUB_URL || 'https://clearixhub.netlify.app';
const NEXUS_URL       = import.meta.env.VITE_NEXUS_URL       || 'https://sisnexus.netlify.app';
const POLAPETIT_URL   = import.meta.env.VITE_POLAPETIT_URL   || 'https://polapetit.netlify.app';
const PULSO_URL       = import.meta.env.VITE_PULSO_URL       || 'https://pulsoprojects.vercel.app';
const QUALFOTO_URL    = import.meta.env.VITE_QUALFOTO_URL    || 'https://qualfoto.netlify.app';
const LUMINA_URL      = import.meta.env.VITE_LUMINA_URL      || 'https://lumina.netlify.app';
const EASY_URL        = import.meta.env.VITE_EASY_URL        || 'https://easyidiomas.netlify.app';

const operacional: NavItem[] = [
  { id: 'visao',            label: 'Visão',             icon: <Eye className="w-4 h-4" /> },
  { id: 'portfolio',        label: 'Portfólio',         icon: <LayoutGrid className="w-4 h-4" /> },
  { id: 'trilha',           label: 'Roadmap',           icon: <Map className="w-4 h-4" /> },
  { id: 'lista-mestra',     label: 'Lista Mestra',      icon: <List className="w-4 h-4" /> },
  { id: 'backlog',          label: 'Backlog Executivo', icon: <Zap className="w-4 h-4" /> },
  { id: 'cadastro-empresa', label: 'Cadastro Empresa',  icon: <Building2 className="w-4 h-4" /> },
  { id: 'financeiro',       label: 'Financeiro',        icon: <DollarSign className="w-4 h-4" /> },
  { id: 'comercial',        label: 'Comercial',         icon: <TrendingUp className="w-4 h-4" /> },
  { id: 'academy',          label: 'Academy',           icon: <BookOpen className="w-4 h-4" /> },
  { id: 'funil',            label: 'Funil OSI',         icon: <Flame className="w-4 h-4" /> },
  { id: 'fluxo-osi',        label: 'Fluxo OSI',         icon: <Workflow className="w-4 h-4" /> },
  { id: 'marketing',        label: 'Marketing',         icon: <Megaphone className="w-4 h-4" /> },
  { id: 'marketing-seo',    label: 'Marketing & SEO',   icon: <Search className="w-4 h-4" /> },
  { id: 'clearix',          label: 'Central Clearix',   icon: <Network className="w-4 h-4" /> },
];

// Ecossistemas (links externos — ADR-0029)
// Ordem: ativos primeiro, depois em_construcao, depois em_concepcao
const ecossistemas: Ecossistema[] = [
  { key: 'clearix-hub',  icone: <Boxes        className="w-4 h-4" />, nome: 'Clearix Hub',   url: CLEARIX_HUB_URL, status: 'ativo' },
  { key: 'atlas',        icone: <Compass      className="w-4 h-4" />, nome: 'Clearix Atlas', url: ATLAS_URL,       status: 'ativo' },
  { key: 'osi',          icone: <Store        className="w-4 h-4" />, nome: 'OSI',           url: OSI_URL,         status: 'ativo' },
  { key: 'nexus',        icone: <GraduationCap className="w-4 h-4" />, nome: 'Nexus',        url: NEXUS_URL,       status: 'ativo' },
  { key: 'pulsocontrol', icone: <Activity     className="w-4 h-4" />, nome: 'Pulso Control', url: PULSO_URL,       status: 'ativo' },
  { key: 'polapetit',    icone: <Sparkles     className="w-4 h-4" />, nome: 'Polapetit',     url: POLAPETIT_URL,   status: 'ativo' },
  { key: 'lumina',       icone: <Wand2        className="w-4 h-4" />, nome: 'Lumina',        url: LUMINA_URL,      status: 'ativo' },
  { key: 'qualafoto',    icone: <Camera       className="w-4 h-4" />, nome: 'Qual a Foto',   url: QUALFOTO_URL,    status: 'ativo' },
  { key: 'easyidiomas',  icone: <Languages    className="w-4 h-4" />, nome: 'Easy Idiomas',  url: EASY_URL,        status: 'ativo' },
  { key: 'niposchool',   icone: <Music2       className="w-4 h-4" />, nome: 'Nipo School',                         status: 'em_concepcao' },
];

const sistema: NavItem[] = [
  { id: 'guia',               label: 'Guia Operacional',    icon: <Compass className="w-4 h-4" /> },
  { id: 'travas-marketing',   label: 'Travas Marketing',    icon: <ShieldCheck className="w-4 h-4" /> },
  { id: 'decisoes',           label: 'Decisões',            icon: <GitBranch className="w-4 h-4" /> },
  { id: 'biblioteca',         label: 'Biblioteca',          icon: <Library className="w-4 h-4" /> },
  { id: 'brand',              label: 'Brand Guidelines',    icon: <Palette className="w-4 h-4" /> },
  { id: 'referencias-design', label: 'Referências Design',  icon: <Palette className="w-4 h-4" /> },
  { id: 'mock-estilos',       label: 'Mock Vendas',         icon: <Palette className="w-4 h-4" /> },
];

interface SidebarProps {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
  mobileOpen?: boolean;
  onClose?: () => void;
}

type SectionKey = 'operacional' | 'ecossistemas' | 'sistema';

const SISTEMA_IDS = sistema.map(i => i.id) as ModuleId[];

function sectionOf(id: ModuleId): SectionKey {
  if (id === 'ecossistemas') return 'ecossistemas';
  if (SISTEMA_IDS.includes(id)) return 'sistema';
  return 'operacional';
}

const COLLAPSE_KEY = 'digiai.sidebar.collapsed.v1';

function loadCollapsed(): Record<SectionKey, boolean> {
  const fallback = { operacional: false, ecossistemas: true, sistema: false };
  if (typeof window === 'undefined') return fallback;
  try {
    const raw = window.localStorage.getItem(COLLAPSE_KEY);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

export default function Sidebar({ active, onSelect, mobileOpen = false, onClose }: SidebarProps) {
  const { user, signOut } = useAuth();
  const [collapsed, setCollapsed] = useState<Record<SectionKey, boolean>>(loadCollapsed);
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
              {operacional.map(item => <NavButton key={item.id} item={item} />)}
            </div>
          )}
        </div>

        <div>
          <GroupHeader k="ecossistemas" label="Ecossistemas" />
          {isOpen('ecossistemas') && (
            <>
              <div className="space-y-0.5">
                <NavButton item={{ id: 'ecossistemas', label: 'Painel', icon: <Boxes className="w-4 h-4" /> }} />
                {ecossistemas.map(e => (
                  <EcossistemaLink
                    key={e.key}
                    icone={e.icone}
                    nome={e.nome}
                    url={e.url}
                    status={e.status}
                  />
                ))}
              </div>
              <div className="px-3 mt-2 text-[9px] font-mono text-muted/70 leading-relaxed">
                Links externos · cada ecossistema tem banco e auth próprios (ADR-0029)
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
          <div className="px-3 py-2 bg-surface-high border border-outline/10">
            <div className="text-[10px] font-mono text-muted uppercase tracking-widest">Logado</div>
            <div className="text-xs text-on-surface-variant truncate" title={user.email ?? ''}>
              {user.email}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-on-surface-variant hover:text-white hover:bg-red-500/10 hover:border-red-500/30 border border-transparent transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        <div className="text-[10px] font-mono text-muted text-center pt-1">
          Fase 0–1 de 8 · Zero aos Milhões
        </div>
      </div>
    </div>
    </>
  );
}
