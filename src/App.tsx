import React, { useState, useEffect } from 'react';
import Sidebar, { ModuleId } from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import { Menu, Search, Sun, Moon } from 'lucide-react';
import BrandGuidelines from './components/BrandGuidelines';
import { useTheme } from './hooks/useTheme';
import Login from './components/Login';
import TestimonialPublicForm from './components/TestimonialPublicForm';
import OsiPublicLanding from './components/OsiPublicLanding';
import Visao from './modules/Visao';
import Portfolio from './modules/Portfolio';
import Trilha from './modules/Trilha';
import Backlog from './modules/Backlog';
import Biblioteca from './modules/Biblioteca';
import CadastroEmpresa from './modules/CadastroEmpresa';
import Clearix from './modules/Clearix';
import Decisoes from './modules/Decisoes';
import Financeiro from './modules/Financeiro';
import Academy from './modules/Academy';
import Marketing from './modules/Marketing';
import MarketingEspelho from './modules/MarketingEspelho';
import Marketplace from './modules/Marketplace';
import Ecossistemas from './modules/Ecossistemas';
import MapaVivo from './modules/MapaVivo';
import ListaMestra from './modules/ListaMestra';
import TravasMarketing from './modules/TravasMarketing';
import OsiHub from './modules/OsiHub';
import Semana from './modules/Semana';
import Guia from './modules/Guia';
import Comercial from './modules/Comercial';
import Billing from './modules/Billing';
import { ModuleStub } from './modules/Stub';
import { useAuth } from './contexts/AuthContext';
import { canAccessModule } from './lib/permissions';

// Comercial deixou de ser stub (2026-06-02) — agora é módulo real (CRM de pipeline).
const STUBS: Record<string, { numero: number; nome: string; descricao: string; entregaveis: string[] }> = {};

// Rotas públicas (não passam pelo gate de login)
const PUBLIC_ROUTES = ['/osi/depoimento', '/osi'];

// Todos os módulos roteáveis — usado pelo deep-link por hash (#/<modulo>).
const MODULES: ModuleId[] = [
  'visao', 'semana', 'portfolio', 'trilha', 'lista-mestra', 'backlog', 'comercial',
  'cadastro-empresa', 'financeiro', 'academy', 'marketplace', 'clearix', 'cobranca',
  'marketing', 'marketing-engajamento', 'fluxo-osi', 'travas-marketing',
  'ecossistemas', 'mapa-vivo', 'decisoes', 'biblioteca', 'brand', 'guia',
];

function moduleFromHash(): ModuleId {
  if (typeof window === 'undefined') return 'visao';
  const h = window.location.hash.replace(/^#\/?/, '');
  return (MODULES as string[]).includes(h) ? (h as ModuleId) : 'visao';
}

const MODULE_LABEL: Record<ModuleId, string> = {
  visao: 'Visão', semana: 'Semana', portfolio: 'Portfólio', trilha: 'Roadmap', 'lista-mestra': 'Lista Mestra',
  backlog: 'Backlog Executivo', comercial: 'Comercial', 'cadastro-empresa': 'Cadastro Empresa',
  financeiro: 'Financeiro', academy: 'Academy', 'fluxo-osi': 'OSI',
  marketing: 'Marketing', 'marketing-engajamento': 'Engajamento',
  marketplace: 'Marketplace', clearix: 'Central Clearix', cobranca: 'Cobrança',
  ecossistemas: 'Ecossistemas', 'mapa-vivo': 'Mapa Vivo', decisoes: 'Decisões', biblioteca: 'Biblioteca', brand: 'Brand Guidelines',
  'travas-marketing': 'Travas Marketing',
  guia: 'Guia Operacional',
};

// Seção da navegação a que cada módulo pertence — usado como breadcrumb no header.
const MODULE_SECTION: Record<ModuleId, string> = {
  visao: 'Operacional', semana: 'Operacional', portfolio: 'Operacional', trilha: 'Operacional', 'lista-mestra': 'Operacional',
  backlog: 'Operacional', comercial: 'Operacional', 'cadastro-empresa': 'Operacional', financeiro: 'Operacional',
  academy: 'Operacional', marketplace: 'Operacional', clearix: 'Operacional', cobranca: 'Operacional',
  marketing: 'Marketing', 'marketing-engajamento': 'Marketing',
  'fluxo-osi': 'Marketing', 'travas-marketing': 'Marketing',
  ecossistemas: 'Ecossistemas', 'mapa-vivo': 'Ecossistemas',
  decisoes: 'Sistema', biblioteca: 'Sistema', brand: 'Sistema', guia: 'Sistema',
};

export default function App() {
  const { session, role, loading } = useAuth();
  const { theme, toggle: toggleTheme } = useTheme();
  const [activeModule, setActiveModule] = useState<ModuleId>(moduleFromHash);
  const [navOpen, setNavOpen] = useState(false);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // Deep links: refresh mantém o módulo + back/forward do navegador funcionam.
  useEffect(() => {
    const onHash = () => setActiveModule(moduleFromHash());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);

  const navigate = (id: ModuleId) => {
    if (window.location.hash !== `#/${id}`) window.location.hash = `/${id}`;
    setActiveModule(id);
    setNavOpen(false);
  };

  // Modo offline: sem .env configurado, app roda sem auth e usa fallback local onde existir.
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const authEnabled = !!supabaseUrl && !!supabaseKey && !supabaseUrl.includes('placeholder');

  // Bypass de auth pra rotas públicas
  const path = typeof window !== 'undefined' ? window.location.pathname : '';
  if (PUBLIC_ROUTES.includes(path)) {
    if (path === '/osi/depoimento') return <TestimonialPublicForm />;
    if (path === '/osi') return <OsiPublicLanding />;
  }

  if (loading && authEnabled) {
    return (
      <div className="min-h-screen bg-surface text-on-surface flex items-center justify-center">
        <div className="text-sm font-mono uppercase tracking-widest text-muted">Carregando...</div>
      </div>
    );
  }

  if (authEnabled && !session) {
    return <Login />;
  }

  const renderContent = () => {
    if (!canAccessModule(activeModule, role)) {
      return (
        <div className="h-full flex items-center justify-center p-8">
          <div className="text-center max-w-sm">
            <div className="text-sm font-mono uppercase tracking-widest text-muted mb-2">Acesso restrito</div>
            <p className="text-on-surface-variant text-sm">Seu perfil não tem acesso a este módulo. Fale com um administrador.</p>
          </div>
        </div>
      );
    }
    switch (activeModule) {
      case 'visao': return <Visao onNavigate={navigate} />;
      case 'portfolio': return <Portfolio />;
      case 'semana': return <Semana onNavigate={navigate} />;
      case 'trilha': return <Trilha />;
      case 'backlog': return <Backlog />;
      case 'biblioteca': return <Biblioteca />;
      case 'brand': return <BrandGuidelines />;
      case 'cadastro-empresa': return <CadastroEmpresa />;
      case 'clearix': return <Clearix />;
      case 'cobranca': return <Billing />;
      case 'decisoes': return <Decisoes />;
      case 'financeiro': return <Financeiro />;
      case 'academy': return <Academy />;
      case 'marketing': return <MarketingEspelho />;
      case 'marketing-engajamento': return <Marketing view="engajamento" />;
      case 'marketplace': return <Marketplace />;
      case 'ecossistemas': return <Ecossistemas />;
      case 'mapa-vivo': return <MapaVivo onNavigate={navigate} />;
      case 'lista-mestra': return <ListaMestra />;
      case 'travas-marketing': return <TravasMarketing />;
      case 'fluxo-osi': return <OsiHub onNavigate={navigate} />;
      case 'guia': return <Guia onNavigate={navigate} />;
      case 'comercial': return <Comercial />;
      default: {
        const stub = STUBS[activeModule];
        if (stub) {
          return (
            <ModuleStub
              numero={stub.numero}
              nome={stub.nome}
              descricao={stub.descricao}
              entregaveis={stub.entregaveis}
            />
          );
        }
        return <Visao onNavigate={navigate} />;
      }
    }
  };

  return (
    <div className="flex h-screen bg-surface text-on-surface overflow-hidden">
      <Sidebar active={activeModule} onSelect={navigate} mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Barra de comando — testeira única de todos os módulos (gramática mission-control) */}
        <header className="shrink-0 z-20 h-12 flex items-center border-b border-outline/15 bg-surface/90 backdrop-blur-md">
          <div className="w-full max-w-7xl mx-auto flex items-center gap-4 px-4 md:px-8">
            <button
              onClick={() => setNavOpen(true)}
              className="md:hidden p-1.5 -ml-1 text-on-surface-variant hover:text-on-surface hover:bg-surface-highest"
              aria-label="Abrir menu"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary truncate">
              {MODULE_SECTION[activeModule] ?? 'Operacional'} <span className="text-muted">/</span> <span className="text-on-surface">{MODULE_LABEL[activeModule] ?? 'Visão'}</span>
            </div>
            <div className="hidden lg:flex items-center gap-5 font-mono text-[10px] tracking-[0.08em] text-muted uppercase">
              <span className="flex items-center gap-1.5 text-secondary"><span className="w-1.5 h-1.5 bg-action inline-block animate-pulse" />Sistema nominal</span>
              <span className="tabular-nums">{now.toLocaleTimeString('pt-BR', { hour12: false })}</span>
            </div>
            <button
              onClick={() => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }))}
              className="ml-auto hidden md:flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted border border-outline/30 px-2.5 py-1.5 hover:text-on-surface hover:border-secondary/50 transition-colors"
            >
              <Search className="w-3 h-3" /> Buscar <kbd className="font-mono text-[9px] text-muted border border-outline/30 px-1">⌘K</kbd>
            </button>
            <button
              onClick={toggleTheme}
              aria-label={theme === 'dark' ? 'Ativar tema claro' : 'Ativar tema escuro'}
              className="ml-auto md:ml-0 p-1.5 text-muted border border-outline/30 hover:text-on-surface hover:border-action/50 transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
            </button>
          </div>
        </header>
        <main key={activeModule} className="flex-1 overflow-y-auto">
          {renderContent()}
        </main>
      </div>
      <CommandPalette onNavigate={navigate} />
    </div>
  );
}
