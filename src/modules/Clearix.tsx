import { useState } from 'react';
import { Network } from 'lucide-react';
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
      <div>
        <header className="px-6 pt-6 pb-4 border-b border-white/5">
          <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-white/40">
            <Network size={10} className="text-[#06B6D4]" />
            Ecossistemas · Clearix
          </div>
          <div className="mt-1 text-2xl font-semibold text-white">Central Clearix</div>
          <div className="text-xs text-white/40 mt-0.5">
            Comando operacional do ecossistema multi-tenant
          </div>

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
        </header>

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
      className={`px-3 py-1.5 rounded-md transition-colors ${
        active
          ? 'bg-[#2563EB]/20 text-white border border-[#2563EB]/40'
          : 'text-white/50 hover:text-white/80 hover:bg-white/5 border border-transparent'
      }`}
    >
      {children}
    </button>
  );
}
