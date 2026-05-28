import React, { useState, useEffect } from 'react';
import Sidebar, { ModuleId } from './components/Sidebar';
import CommandPalette from './components/CommandPalette';
import { Menu } from 'lucide-react';
import BrandGuidelines from './components/BrandGuidelines';
import Login from './components/Login';
import TestimonialPublicForm from './components/TestimonialPublicForm';
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
import Funil from './modules/Funil';
import Marketing from './modules/Marketing';
import MarketingSEO from './modules/MarketingSEO';
import ReferenciasDesign from './modules/ReferenciasDesign';
import MockClearixEstilos from './modules/MockClearixEstilos';
import Ecossistemas from './modules/Ecossistemas';
import ListaMestra from './modules/ListaMestra';
import TravasMarketing from './modules/TravasMarketing';
import FluxoOSI from './modules/FluxoOSI';
import { ModuleStub } from './modules/Stub';
import { useAuth } from './contexts/AuthContext';

const STUBS: Record<string, { numero: number; nome: string; descricao: string; entregaveis: string[] }> = {
  comercial: {
    numero: 6,
    nome: 'Comercial',
    descricao: 'Acompanhar leads, reunioes, propostas, pilotos e evolucao do Clearix no mercado.',
    entregaveis: [
      'CRM minimo: leads + status de negociacao',
      'Reunioes agendadas e realizadas',
      'Propostas enviadas e em aberto',
      'Pilotos ativos e resultados da loja de teste',
      'Objecoes registradas',
    ],
  },
};

// Rotas públicas (não passam pelo gate de login)
const PUBLIC_ROUTES = ['/osi/depoimento'];

// Todos os módulos roteáveis — usado pelo deep-link por hash (#/<modulo>).
const MODULES: ModuleId[] = [
  'visao', 'portfolio', 'trilha', 'lista-mestra', 'backlog', 'comercial',
  'cadastro-empresa', 'financeiro', 'academy', 'funil', 'fluxo-osi',
  'marketing', 'marketing-seo', 'clearix', 'ecossistemas',
  'decisoes', 'biblioteca', 'brand', 'travas-marketing',
  'referencias-design', 'mock-estilos',
];

function moduleFromHash(): ModuleId {
  if (typeof window === 'undefined') return 'visao';
  const h = window.location.hash.replace(/^#\/?/, '');
  return (MODULES as string[]).includes(h) ? (h as ModuleId) : 'visao';
}

export default function App() {
  const { session, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleId>(moduleFromHash);
  const [navOpen, setNavOpen] = useState(false);

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
  }

  if (loading && authEnabled) {
    return (
      <div className="min-h-screen bg-[#0A0F1E] text-white flex items-center justify-center">
        <div className="text-sm text-white/40">Carregando...</div>
      </div>
    );
  }

  if (authEnabled && !session) {
    return <Login />;
  }

  const renderContent = () => {
    switch (activeModule) {
      case 'visao': return <Visao onNavigate={navigate} />;
      case 'portfolio': return <Portfolio />;
      case 'trilha': return <Trilha />;
      case 'backlog': return <Backlog />;
      case 'biblioteca': return <Biblioteca />;
      case 'brand': return <BrandGuidelines />;
      case 'cadastro-empresa': return <CadastroEmpresa />;
      case 'clearix': return <Clearix />;
      case 'decisoes': return <Decisoes />;
      case 'financeiro': return <Financeiro />;
      case 'academy': return <Academy />;
      case 'funil': return <Funil />;
      case 'marketing': return <Marketing />;
      case 'marketing-seo': return <MarketingSEO />;
      case 'referencias-design': return <ReferenciasDesign />;
      case 'mock-estilos': return <MockClearixEstilos />;
      case 'ecossistemas': return <Ecossistemas />;
      case 'lista-mestra': return <ListaMestra />;
      case 'travas-marketing': return <TravasMarketing />;
      case 'fluxo-osi': return <FluxoOSI onNavigate={navigate} />;
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
    <div className="flex h-screen bg-[#0A0F1E] text-white overflow-hidden">
      <button
        onClick={() => setNavOpen(true)}
        className="md:hidden fixed top-3 left-3 z-30 p-2 rounded-lg bg-[#0F1729]/90 border border-white/10 text-white/70 backdrop-blur"
        aria-label="Abrir menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <Sidebar active={activeModule} onSelect={navigate} mobileOpen={navOpen} onClose={() => setNavOpen(false)} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
      <CommandPalette onNavigate={navigate} />
    </div>
  );
}
