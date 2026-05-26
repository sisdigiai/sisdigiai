import React from 'react';
import {
  Eye, LayoutGrid, Map, List, Zap, TrendingUp,
  BookOpen, DollarSign, GitBranch, Library, Palette, Building2, Network,
  Compass, ExternalLink, Flame, Megaphone, LogOut
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';

export type ModuleId =
  | 'visao' | 'portfolio' | 'trilha' | 'lista-mestra'
  | 'backlog' | 'comercial' | 'academy' | 'funil' | 'financeiro'
  | 'decisoes' | 'biblioteca' | 'brand' | 'cadastro-empresa'
  | 'clearix' | 'referencias-design' | 'mock-estilos' | 'marketing';

interface NavItem {
  id: ModuleId | string;
  label: string;
  icon: React.ReactNode;
  group: 'operacional' | 'ecossistemas' | 'apoio' | 'outros';
  href?: string;
}

const ATLAS_URL = import.meta.env.VITE_ATLAS_URL || 'https://digiaiatlas.netlify.app';

const navItems: NavItem[] = [
  { id: 'visao', label: 'Visão', icon: <Eye className="w-4 h-4" />, group: 'operacional' },
  { id: 'portfolio', label: 'Portfólio', icon: <LayoutGrid className="w-4 h-4" />, group: 'operacional' },
  { id: 'trilha', label: 'Roadmap', icon: <Map className="w-4 h-4" />, group: 'operacional' },
  { id: 'lista-mestra', label: 'Lista Mestra', icon: <List className="w-4 h-4" />, group: 'operacional' },
  { id: 'backlog', label: 'Backlog Executivo', icon: <Zap className="w-4 h-4" />, group: 'operacional' },
  { id: 'cadastro-empresa', label: 'Cadastro Empresa', icon: <Building2 className="w-4 h-4" />, group: 'operacional' },
  { id: 'clearix', label: 'Clearix', icon: <Network className="w-4 h-4" />, group: 'ecossistemas' },
  { id: 'atlas', label: 'Atlas', icon: <Compass className="w-4 h-4" />, group: 'ecossistemas', href: ATLAS_URL },
  { id: 'comercial', label: 'Comercial', icon: <TrendingUp className="w-4 h-4" />, group: 'apoio' },
  { id: 'academy', label: 'Academy', icon: <BookOpen className="w-4 h-4" />, group: 'apoio' },
  { id: 'funil', label: 'Funil OSI', icon: <Flame className="w-4 h-4" />, group: 'apoio' },
  { id: 'marketing', label: 'Marketing', icon: <Megaphone className="w-4 h-4" />, group: 'apoio' },
  { id: 'financeiro', label: 'Financeiro', icon: <DollarSign className="w-4 h-4" />, group: 'apoio' },
  { id: 'decisoes', label: 'Decisões', icon: <GitBranch className="w-4 h-4" />, group: 'apoio' },
  { id: 'biblioteca', label: 'Biblioteca', icon: <Library className="w-4 h-4" />, group: 'apoio' },
  { id: 'brand', label: 'Brand Guidelines', icon: <Palette className="w-4 h-4" />, group: 'outros' },
  { id: 'referencias-design', label: 'Referências Design', icon: <Palette className="w-4 h-4" />, group: 'outros' },
  { id: 'mock-estilos', label: 'Mock Vendas (4 estilos)', icon: <Palette className="w-4 h-4" />, group: 'outros' },
];

interface SidebarProps {
  active: ModuleId;
  onSelect: (id: ModuleId) => void;
}

export default function Sidebar({ active, onSelect }: SidebarProps) {
  const { user, signOut } = useAuth();
  const operacional = navItems.filter(i => i.group === 'operacional');
  const ecossistemas = navItems.filter(i => i.group === 'ecossistemas');
  const apoio = navItems.filter(i => i.group === 'apoio');
  const outros = navItems.filter(i => i.group === 'outros');

  const NavButton = ({ item }: { item: NavItem }) => {
    if (item.href) {
      return (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left text-white/50 hover:text-white/80 hover:bg-white/5"
        >
          <span>{item.icon}</span>
          <span className="flex-1">{item.label}</span>
          <ExternalLink className="w-3 h-3 text-white/30" />
        </a>
      );
    }
    return (
      <button
        onClick={() => onSelect(item.id as ModuleId)}
        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 text-left
          ${active === item.id
            ? 'bg-[#2563EB]/20 text-white border border-[#2563EB]/40'
            : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
      >
        <span className={active === item.id ? 'text-[#06B6D4]' : ''}>{item.icon}</span>
        {item.label}
      </button>
    );
  };

  return (
    <div className="w-60 shrink-0 h-screen sticky top-0 bg-[#0A0F1E] border-r border-white/5 flex flex-col">
      <div className="p-5 border-b border-white/5">
        <Logo variant="horizontal" iconClassName="w-7 h-7" textClassName="text-xl" />
        <div className="mt-2 text-[10px] font-mono text-white/30 uppercase tracking-widest">Painel Operacional</div>
      </div>

      <nav className="flex-1 overflow-y-auto p-3 space-y-5">
        <div>
          <div className="px-3 mb-2 text-[10px] font-mono text-white/25 uppercase tracking-widest">Operacional</div>
          <div className="space-y-0.5">
            {operacional.map(item => <NavButton key={item.id} item={item} />)}
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-mono text-white/25 uppercase tracking-widest">Ecossistemas</div>
          <div className="space-y-0.5">
            {ecossistemas.map(item => <NavButton key={item.id} item={item} />)}
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-mono text-white/25 uppercase tracking-widest">Apoio</div>
          <div className="space-y-0.5">
            {apoio.map(item => <NavButton key={item.id} item={item} />)}
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-mono text-white/25 uppercase tracking-widest">Sistema</div>
          <div className="space-y-0.5">
            {outros.map(item => <NavButton key={item.id} item={item} />)}
          </div>
        </div>
      </nav>

      <div className="p-3 border-t border-white/5 space-y-2">
        {user && (
          <div className="px-3 py-2 rounded-lg bg-white/[0.03] border border-white/5">
            <div className="text-[10px] font-mono text-white/40 uppercase tracking-widest">Logado</div>
            <div className="text-xs text-white/70 truncate" title={user.email ?? ''}>
              {user.email}
            </div>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium text-white/50 hover:text-white hover:bg-red-500/10 hover:border-red-500/30 border border-transparent transition-all duration-150"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
        <div className="text-[10px] font-mono text-white/20 text-center pt-1">
          Fase 0–1 de 8 · Zero aos Milhões
        </div>
      </div>
    </div>
  );
}
