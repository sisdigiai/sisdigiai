import React from 'react';
import {
  Eye, LayoutGrid, Map, List, Zap, TrendingUp,
  BookOpen, DollarSign, GitBranch, Library, Palette, Building2, Network,
  Compass, Flame, Megaphone, LogOut, Store, Sparkles, Music2, Activity,
  Camera, Wand2, Boxes, Search, ShieldCheck
} from 'lucide-react';
import { Logo } from './Logo';
import { useAuth } from '../contexts/AuthContext';
import EcossistemaLink, { EcossistemaStatus } from './EcossistemaLink';

export type ModuleId =
  | 'visao' | 'portfolio' | 'trilha' | 'lista-mestra'
  | 'backlog' | 'comercial' | 'academy' | 'funil' | 'financeiro'
  | 'decisoes' | 'biblioteca' | 'brand' | 'cadastro-empresa'
  | 'clearix' | 'referencias-design' | 'mock-estilos' | 'marketing'
  | 'marketing-seo' | 'ecossistemas' | 'travas-marketing';

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
const ATLAS_URL    = import.meta.env.VITE_ATLAS_URL    || 'https://digiaiatlas.netlify.app';
const OSI_URL      = import.meta.env.VITE_OSI_URL      || 'https://oticasemimproviso.netlify.app';
const CLEARIX_HUB_URL = import.meta.env.VITE_CLEARIX_HUB_URL || ''; // ainda nao deployado

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
  { id: 'marketing',        label: 'Marketing',         icon: <Megaphone className="w-4 h-4" /> },
  { id: 'marketing-seo',    label: 'Marketing & SEO',   icon: <Search className="w-4 h-4" /> },
  { id: 'clearix',          label: 'Central Clearix',   icon: <Network className="w-4 h-4" /> },
];

// Ecossistemas (links externos — ADR-0029)
// Ordem: ativos primeiro, depois em_construcao, depois em_concepcao
const ecossistemas: Ecossistema[] = [
  { key: 'clearix-hub',  icone: <Boxes    className="w-4 h-4" />, nome: 'Clearix Hub',    url: CLEARIX_HUB_URL || undefined, status: CLEARIX_HUB_URL ? 'ativo' : 'em_construcao' },
  { key: 'atlas',        icone: <Compass  className="w-4 h-4" />, nome: 'Clearix Atlas',  url: ATLAS_URL,                    status: 'ativo' },
  { key: 'osi',          icone: <Store    className="w-4 h-4" />, nome: 'OSI',            url: OSI_URL,                      status: 'ativo' },
  { key: 'polapetit',    icone: <Sparkles className="w-4 h-4" />, nome: 'Polapetit',                                          status: 'em_concepcao' },
  { key: 'niposchool',   icone: <Music2   className="w-4 h-4" />, nome: 'Nipo School',                                        status: 'em_concepcao' },
  { key: 'pulsocontrol', icone: <Activity className="w-4 h-4" />, nome: 'Pulso Control',                                      status: 'em_concepcao' },
  { key: 'qualafoto',    icone: <Camera   className="w-4 h-4" />, nome: 'Qual a Foto',                                        status: 'em_concepcao' },
  { key: 'lumina',       icone: <Wand2    className="w-4 h-4" />, nome: 'Lumina',                                             status: 'em_concepcao' },
];

const sistema: NavItem[] = [
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
}

export default function Sidebar({ active, onSelect }: SidebarProps) {
  const { user, signOut } = useAuth();

  const NavButton = ({ item }: { item: NavItem }) => (
    <button
      onClick={() => onSelect(item.id)}
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
          <div className="px-3 mt-2 text-[9px] font-mono text-white/20 leading-relaxed">
            Links externos · cada ecossistema tem banco e auth próprios (ADR-0029)
          </div>
        </div>

        <div>
          <div className="px-3 mb-2 text-[10px] font-mono text-white/25 uppercase tracking-widest">Sistema</div>
          <div className="space-y-0.5">
            {sistema.map(item => <NavButton key={item.id} item={item} />)}
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
