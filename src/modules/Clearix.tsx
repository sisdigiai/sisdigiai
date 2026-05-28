import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import ClearixAuthGate from './clearix/ClearixAuthGate';
import TabTenants from './clearix/TabTenants';
import TabTenantDetail from './clearix/TabTenantDetail';
import TabNewTenant from './clearix/TabNewTenant';
import TabRequests from './clearix/TabRequests';

type Tab = 'tenants' | 'detail' | 'new' | 'requests';

export default function Clearix() {
  const [tab, setTab] = useState<Tab>('tenants');
  const [selectedTenant, setSelectedTenant] = useState<string | null>(null);

  const goToDetail = (tenantId: string) => {
    setSelectedTenant(tenantId);
    setTab('detail');
  };

  return (
    <ClearixAuthGate>
      <div className="max-w-6xl mx-auto">
        <div className="px-6 pt-6">
          <PageHeader
            eyebrow="Produto-âncora"
            title="Central Clearix"
            subtitle="Comando operacional do ecossistema multi-tenant"
          >
            <nav className="mt-5 flex gap-1 text-sm">
              <TabButton active={tab === 'tenants'} onClick={() => setTab('tenants')}>Tenants</TabButton>
              {selectedTenant && (
                <TabButton active={tab === 'detail'} onClick={() => setTab('detail')}>
                  Detalhe
                </TabButton>
              )}
              <TabButton active={tab === 'new'} onClick={() => setTab('new')}>Novo tenant</TabButton>
              <TabButton active={tab === 'requests'} onClick={() => setTab('requests')}>Solicitações</TabButton>
            </nav>
          </PageHeader>
        </div>

        {tab === 'tenants' && <TabTenants onSelectTenant={goToDetail} />}
        {tab === 'detail' && selectedTenant && (
          <TabTenantDetail
            tenantId={selectedTenant}
            onBack={() => setTab('tenants')}
          />
        )}
        {tab === 'new' && <TabNewTenant onCreated={goToDetail} />}
        {tab === 'requests' && <TabRequests onSelectTenant={goToDetail} />}
      </div>
    </ClearixAuthGate>
  );
}

function TabButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-1.5 transition-colors ${
        active
          ? 'bg-secondary-container/40 text-on-surface border border-secondary/40'
          : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-highest border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
