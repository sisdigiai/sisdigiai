import React, { useState } from 'react';
import Sidebar, { ModuleId } from './components/Sidebar';
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
import { ModuleStub } from './modules/Stub';
import { useAuth } from './contexts/AuthContext';

const STUBS: Record<string, { numero: number; nome: string; descricao: string; entregaveis: string[] }> = {
  'lista-mestra': {
    numero: 4,
    nome: 'Lista Mestra',
    descricao: 'Todos os itens de implantacao filtraveis por area, prioridade, status, responsavel, fase e prazo.',
    entregaveis: [
      'Importacao dos itens da lista mestra canonica',
      'Filtros por area / prioridade / status / fase',
      'Vinculo com documentos e backlog',
      'Itens atrasados e criticos em destaque',
    ],
  },
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

export default function App() {
  const { session, loading } = useAuth();
  const [activeModule, setActiveModule] = useState<ModuleId>('visao');

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
      case 'visao': return <Visao />;
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
        return <Visao />;
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#0A0F1E] text-white overflow-hidden">
      <Sidebar active={activeModule} onSelect={setActiveModule} />
      <main className="flex-1 overflow-y-auto">
        {renderContent()}
      </main>
    </div>
  );
}
