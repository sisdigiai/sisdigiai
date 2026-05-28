import { useEffect, useState } from 'react';
import { Building2, Users, Globe, Wrench, DollarSign, Shield, Download, Plus, Trash2, Cloud, HardDrive } from 'lucide-react';
import { companyStore } from '../lib/companyStore';
import PageHeader from '../components/PageHeader';
import type { CompanyIdentity, CompanyContact, DigitalAsset, Tool, FinancialSnapshot, LegalStatus } from '../lib/supabase';

type TabId = 'identidade' | 'contatos' | 'digital' | 'ferramentas' | 'financeiro' | 'lgpd';

const TABS: Array<{ id: TabId; label: string; icon: typeof Building2 }> = [
  { id: 'identidade', label: 'Identidade Legal', icon: Building2 },
  { id: 'contatos', label: 'Contatos', icon: Users },
  { id: 'digital', label: 'Identidade Digital', icon: Globe },
  { id: 'ferramentas', label: 'Ferramentas', icon: Wrench },
  { id: 'financeiro', label: 'Financeiro', icon: DollarSign },
  { id: 'lgpd', label: 'LGPD e Jurídico', icon: Shield },
];

export default function CadastroEmpresa() {
  const [tab, setTab] = useState<TabId>('identidade');
  const online = companyStore.isOnline();

  return (
    <div className="max-w-6xl mx-auto p-8">
      <PageHeader
        eyebrow="Registro Canônico"
        title="Cadastro Empresa"
        subtitle="Registro único e canônico da DIGIAI — dados reais usados em contratos, propostas e snapshots para agentes."
        actions={
          <>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium flex items-center gap-2 ${online ? 'bg-green-500/10 text-green-400 border border-green-500/30' : 'bg-yellow-500/10 text-yellow-400 border border-yellow-500/30'}`}>
              {online ? <Cloud size={14} /> : <HardDrive size={14} />}
              {online ? 'Supabase conectado' : 'localStorage (offline)'}
            </span>
            <button
              onClick={() => companyStore.downloadExport('json')}
              className="px-3 py-1.5 bg-surface-high hover:bg-surface-highest text-sm flex items-center gap-2"
            >
              <Download size={14} /> JSON
            </button>
            <button
              onClick={() => companyStore.downloadExport('md')}
              className="px-3 py-1.5 bg-secondary hover:bg-secondary/90 text-surface text-sm flex items-center gap-2"
            >
              <Download size={14} /> Markdown
            </button>
          </>
        }
      />

      <nav className="flex gap-1 border-b border-outline/10 mb-8">
        {TABS.map((t) => {
          const Icon = t.icon;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${
                tab === t.id
                  ? 'border-secondary text-on-surface'
                  : 'border-transparent text-muted hover:text-on-surface'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </nav>

      <section>
        {tab === 'identidade' && <IdentidadeTab />}
        {tab === 'contatos' && <ContatosTab />}
        {tab === 'digital' && <DigitalTab />}
        {tab === 'ferramentas' && <FerramentasTab />}
        {tab === 'financeiro' && <FinanceiroTab />}
        {tab === 'lgpd' && <LgpdTab />}
      </section>
    </div>
  );
}

// =========== Helper: input field ===========
function Field({ label, children, col = 1 }: { label: string; children: React.ReactNode; col?: 1 | 2 | 3 }) {
  const colClass = col === 3 ? 'md:col-span-3' : col === 2 ? 'md:col-span-2' : '';
  return (
    <div className={colClass}>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inputClass = 'w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary/40';
const selectClass = inputClass;

// =========== Tab 1: Identidade Legal ===========
function IdentidadeTab() {
  const [identity, setIdentity] = useState<CompanyIdentity>({ nome_fantasia: 'DIGIAI' });
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    companyStore.getIdentity().then(setIdentity);
  }, []);

  const update = <K extends keyof CompanyIdentity>(key: K, value: CompanyIdentity[K]) => {
    setIdentity((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    await companyStore.saveIdentity(identity);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-6">
      <section>
        <h2 className="text-lg font-semibold mb-3">Dados básicos</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Razão Social" col={2}>
            <input className={inputClass} value={identity.razao_social || ''} onChange={(e) => update('razao_social', e.target.value)} />
          </Field>
          <Field label="Nome Fantasia">
            <input className={inputClass} value={identity.nome_fantasia || ''} onChange={(e) => update('nome_fantasia', e.target.value)} />
          </Field>
          <Field label="CNPJ">
            <input className={inputClass} value={identity.cnpj || ''} onChange={(e) => update('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
          </Field>
          <Field label="Forma Jurídica">
            <select className={selectClass} value={identity.forma_juridica || ''} onChange={(e) => update('forma_juridica', e.target.value as any || null)}>
              <option value="">-- selecionar --</option>
              <option value="MEI">MEI</option>
              <option value="LTDA">LTDA</option>
              <option value="EIRELI">EIRELI</option>
              <option value="SA">S.A.</option>
              <option value="SLU">SLU</option>
              <option value="outro">Outro</option>
            </select>
          </Field>
          <Field label="Data de Abertura">
            <input type="date" className={inputClass} value={identity.data_abertura || ''} onChange={(e) => update('data_abertura', e.target.value)} />
          </Field>
          <Field label="Inscrição Municipal">
            <input className={inputClass} value={identity.inscricao_municipal || ''} onChange={(e) => update('inscricao_municipal', e.target.value)} />
          </Field>
          <Field label="Inscrição Estadual">
            <input className={inputClass} value={identity.inscricao_estadual || ''} onChange={(e) => update('inscricao_estadual', e.target.value)} placeholder="ou Isento" />
          </Field>
          <Field label="Capital Social (R$)">
            <input type="number" step="0.01" className={inputClass} value={identity.capital_social || ''} onChange={(e) => update('capital_social', parseFloat(e.target.value) || null)} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Endereço</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Logradouro" col={2}>
            <input className={inputClass} value={identity.endereco_logradouro || ''} onChange={(e) => update('endereco_logradouro', e.target.value)} />
          </Field>
          <Field label="Número">
            <input className={inputClass} value={identity.endereco_numero || ''} onChange={(e) => update('endereco_numero', e.target.value)} />
          </Field>
          <Field label="Complemento">
            <input className={inputClass} value={identity.endereco_complemento || ''} onChange={(e) => update('endereco_complemento', e.target.value)} />
          </Field>
          <Field label="Bairro">
            <input className={inputClass} value={identity.endereco_bairro || ''} onChange={(e) => update('endereco_bairro', e.target.value)} />
          </Field>
          <Field label="CEP">
            <input className={inputClass} value={identity.endereco_cep || ''} onChange={(e) => update('endereco_cep', e.target.value)} />
          </Field>
          <Field label="Cidade">
            <input className={inputClass} value={identity.endereco_cidade || ''} onChange={(e) => update('endereco_cidade', e.target.value)} />
          </Field>
          <Field label="UF">
            <input className={inputClass} maxLength={2} value={identity.endereco_uf || ''} onChange={(e) => update('endereco_uf', e.target.value.toUpperCase())} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Regime tributário e CNAEs</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Regime">
            <select className={selectClass} value={identity.regime_tributario || ''} onChange={(e) => update('regime_tributario', e.target.value as any || null)}>
              <option value="">-- selecionar --</option>
              <option value="simples_nacional">Simples Nacional</option>
              <option value="lucro_presumido">Lucro Presumido</option>
              <option value="lucro_real">Lucro Real</option>
              <option value="mei">MEI</option>
            </select>
          </Field>
          <Field label="Anexo (se Simples)">
            <input className={inputClass} value={identity.simples_anexo || ''} onChange={(e) => update('simples_anexo', e.target.value)} placeholder="III, V..." />
          </Field>
          <Field label="Alíquota estimada (%)">
            <input type="number" step="0.01" className={inputClass} value={identity.aliquota_estimada || ''} onChange={(e) => update('aliquota_estimada', parseFloat(e.target.value) || null)} />
          </Field>
          <Field label="CNAE Principal — código">
            <input className={inputClass} value={identity.cnae_principal_codigo || ''} onChange={(e) => update('cnae_principal_codigo', e.target.value)} placeholder="6202-3/00" />
          </Field>
          <Field label="CNAE Principal — descrição" col={2}>
            <input className={inputClass} value={identity.cnae_principal_descricao || ''} onChange={(e) => update('cnae_principal_descricao', e.target.value)} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Certificado digital</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Tipo">
            <select className={selectClass} value={identity.certificado_digital_tipo || ''} onChange={(e) => update('certificado_digital_tipo', e.target.value as any || null)}>
              <option value="">-- selecionar --</option>
              <option value="A1">A1 (arquivo)</option>
              <option value="A3">A3 (token/cartão)</option>
              <option value="nao_possui">Não possui</option>
            </select>
          </Field>
          <Field label="Vencimento">
            <input type="date" className={inputClass} value={identity.certificado_digital_vencimento || ''} onChange={(e) => update('certificado_digital_vencimento', e.target.value)} />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">Representante legal</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Nome" col={2}>
            <input className={inputClass} value={identity.representante_nome || ''} onChange={(e) => update('representante_nome', e.target.value)} />
          </Field>
          <Field label="CPF">
            <input className={inputClass} value={identity.representante_cpf || ''} onChange={(e) => update('representante_cpf', e.target.value)} />
          </Field>
          <Field label="RG">
            <input className={inputClass} value={identity.representante_rg || ''} onChange={(e) => update('representante_rg', e.target.value)} />
          </Field>
          <Field label="Email" col={2}>
            <input type="email" className={inputClass} value={identity.representante_email || ''} onChange={(e) => update('representante_email', e.target.value)} />
          </Field>
        </div>
      </section>

      <section>
        <Field label="Observações" col={3}>
          <textarea rows={3} className={inputClass} value={identity.notes || ''} onChange={(e) => update('notes', e.target.value)} />
        </Field>
      </section>

      <div className="flex items-center gap-4">
        <button onClick={save} className="px-6 py-2.5 bg-secondary hover:bg-secondary/90 text-surface font-medium">
          Salvar
        </button>
        {saved && <span className="text-green-400 text-sm">✓ Salvo</span>}
      </div>
    </div>
  );
}

// =========== Tab 2: Contatos ===========
function ContatosTab() {
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [editing, setEditing] = useState<CompanyContact | null>(null);

  const load = () => companyStore.listContacts().then(setContacts);
  useEffect(() => { load(); }, []);

  const newContact = (): CompanyContact => ({
    tipo: 'contador', nome: '', ativo: true,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Contatos profissionais</h2>
        <button onClick={() => setEditing(newContact())} className="px-3 py-2 bg-secondary hover:bg-secondary/90 text-surface text-sm flex items-center gap-2">
          <Plus size={14} /> Novo contato
        </button>
      </div>

      {editing && (
        <ContactForm
          contact={editing}
          onCancel={() => setEditing(null)}
          onSave={async (c) => { await companyStore.upsertContact(c); setEditing(null); load(); }}
        />
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {contacts.map((c) => (
          <div key={c.id} className="bg-surface-lowest border border-outline/10 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-xs uppercase text-secondary font-semibold">{c.tipo}</div>
                <div className="font-semibold">{c.nome}</div>
                {c.empresa && <div className="text-sm text-muted">{c.empresa}</div>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(c)} className="p-1.5 hover:bg-surface-highest">✎</button>
                <button onClick={() => c.id && companyStore.deleteContact(c.id).then(load)} className="p-1.5 hover:bg-surface-highest text-red-400">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            <div className="text-sm text-on-surface-variant space-y-1">
              {c.email && <div>📧 {c.email}</div>}
              {c.telefone && <div>📞 {c.telefone}</div>}
              {c.custo_mensal_brl && <div>R$ {c.custo_mensal_brl}/mês</div>}
            </div>
          </div>
        ))}
      </div>

      {contacts.length === 0 && !editing && (
        <div className="text-center py-12 text-muted border-2 border-dashed border-outline/10">
          Nenhum contato cadastrado ainda. Clique em "Novo contato" para começar.
        </div>
      )}
    </div>
  );
}

function ContactForm({ contact, onSave, onCancel }: { contact: CompanyContact; onSave: (c: CompanyContact) => void; onCancel: () => void }) {
  const [c, setC] = useState(contact);
  return (
    <div className="bg-surface-lowest border border-secondary/40 p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Tipo">
          <select className={selectClass} value={c.tipo} onChange={(e) => setC({ ...c, tipo: e.target.value as any })}>
            <option value="contador">Contador</option>
            <option value="advogado_tech">Advogado (Tech)</option>
            <option value="advogado_lgpd">Advogado (LGPD)</option>
            <option value="consultor_tributario">Consultor tributário</option>
            <option value="consultor_tecnico">Consultor técnico</option>
            <option value="outro">Outro</option>
          </select>
        </Field>
        <Field label="Nome" col={2}>
          <input className={inputClass} value={c.nome} onChange={(e) => setC({ ...c, nome: e.target.value })} />
        </Field>
        <Field label="Empresa / Escritório">
          <input className={inputClass} value={c.empresa || ''} onChange={(e) => setC({ ...c, empresa: e.target.value })} />
        </Field>
        <Field label="Email">
          <input className={inputClass} value={c.email || ''} onChange={(e) => setC({ ...c, email: e.target.value })} />
        </Field>
        <Field label="Telefone/WhatsApp">
          <input className={inputClass} value={c.telefone || ''} onChange={(e) => setC({ ...c, telefone: e.target.value })} />
        </Field>
        <Field label="Custo mensal (R$)">
          <input type="number" step="0.01" className={inputClass} value={c.custo_mensal_brl || ''} onChange={(e) => setC({ ...c, custo_mensal_brl: parseFloat(e.target.value) || null })} />
        </Field>
        <Field label="Modelo de cobrança">
          <select className={selectClass} value={c.modelo_cobranca || ''} onChange={(e) => setC({ ...c, modelo_cobranca: e.target.value as any || null })}>
            <option value="">—</option>
            <option value="mensal">Mensal</option>
            <option value="hora">Por hora</option>
            <option value="projeto">Por projeto</option>
            <option value="sob_demanda">Sob demanda</option>
          </select>
        </Field>
        <Field label="Observações" col={3}>
          <textarea rows={2} className={inputClass} value={c.observacoes || ''} onChange={(e) => setC({ ...c, observacoes: e.target.value })} />
        </Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(c)} className="px-4 py-2 bg-secondary text-surface text-sm">Salvar</button>
        <button onClick={onCancel} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
      </div>
    </div>
  );
}

// =========== Tab 3: Digital ===========
function DigitalTab() {
  const [assets, setAssets] = useState<DigitalAsset[]>([]);
  const [editing, setEditing] = useState<DigitalAsset | null>(null);

  const load = () => companyStore.listDigitalAssets().then(setAssets);
  useEffect(() => { load(); }, []);

  const newAsset = (): DigitalAsset => ({ categoria: 'dominio', rotulo: '', status: 'a_registrar' });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Identidade digital (domínios, emails, redes, sites)</h2>
        <button onClick={() => setEditing(newAsset())} className="px-3 py-2 bg-secondary hover:bg-secondary/90 text-surface text-sm flex items-center gap-2">
          <Plus size={14} /> Novo item
        </button>
      </div>

      {editing && (
        <DigitalForm asset={editing} onCancel={() => setEditing(null)} onSave={async (a) => { await companyStore.upsertDigitalAsset(a); setEditing(null); load(); }} />
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-outline/10">
            <th className="py-2">Categoria</th>
            <th>Rótulo</th>
            <th>Valor</th>
            <th>Produto</th>
            <th>Status</th>
            <th>Custo</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {assets.map((a) => (
            <tr key={a.id} className="border-b border-outline/10 hover:bg-surface-lowest/50">
              <td className="py-3 text-secondary">{a.categoria}</td>
              <td className="font-medium">{a.rotulo}</td>
              <td className="text-on-surface-variant">{a.valor || '—'}</td>
              <td className="text-muted">{a.owner_product || '—'}</td>
              <td><span className={`text-xs px-2 py-0.5 ${a.status === 'ativo' ? 'bg-green-500/20 text-green-400' : 'bg-yellow-500/20 text-yellow-400'}`}>{a.status}</span></td>
              <td>{a.custo_mensal_brl ? `R$ ${a.custo_mensal_brl}/mês` : '—'}</td>
              <td className="flex gap-1 py-3">
                <button onClick={() => setEditing(a)} className="p-1 hover:bg-surface-highest">✎</button>
                <button onClick={() => a.id && companyStore.deleteDigitalAsset(a.id).then(load)} className="p-1 hover:bg-surface-highest text-red-400">
                  <Trash2 size={14} />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {assets.length === 0 && !editing && (
        <div className="text-center py-12 text-muted border-2 border-dashed border-outline/10">
          Nenhum ativo digital cadastrado.
        </div>
      )}
    </div>
  );
}

function DigitalForm({ asset, onSave, onCancel }: { asset: DigitalAsset; onSave: (a: DigitalAsset) => void; onCancel: () => void }) {
  const [a, setA] = useState(asset);
  return (
    <div className="bg-surface-lowest border border-secondary/40 p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Categoria">
          <select className={selectClass} value={a.categoria} onChange={(e) => setA({ ...a, categoria: e.target.value as any })}>
            <option value="dominio">Domínio</option>
            <option value="email_corporativo">Email corporativo</option>
            <option value="site">Site</option>
            <option value="landing_page">Landing page</option>
            <option value="linkedin">LinkedIn</option>
            <option value="instagram">Instagram</option>
            <option value="youtube">YouTube</option>
            <option value="tiktok">TikTok</option>
            <option value="github">GitHub</option>
            <option value="outro">Outro</option>
          </select>
        </Field>
        <Field label="Rótulo" col={2}>
          <input className={inputClass} value={a.rotulo} onChange={(e) => setA({ ...a, rotulo: e.target.value })} placeholder="ex: Domínio DIGIAI principal" />
        </Field>
        <Field label="Valor (URL / handle / domínio)" col={2}>
          <input className={inputClass} value={a.valor || ''} onChange={(e) => setA({ ...a, valor: e.target.value })} />
        </Field>
        <Field label="Produto dono">
          <input className={inputClass} value={a.owner_product || ''} onChange={(e) => setA({ ...a, owner_product: e.target.value })} placeholder="digiai / clearix / ..." />
        </Field>
        <Field label="Status">
          <select className={selectClass} value={a.status} onChange={(e) => setA({ ...a, status: e.target.value as any })}>
            <option value="ativo">Ativo</option>
            <option value="a_registrar">A registrar</option>
            <option value="registrado_sem_uso">Registrado sem uso</option>
            <option value="arquivado">Arquivado</option>
          </select>
        </Field>
        <Field label="Provider">
          <input className={inputClass} value={a.provider || ''} onChange={(e) => setA({ ...a, provider: e.target.value })} placeholder="Cloudflare, GoDaddy..." />
        </Field>
        <Field label="Custo mensal (R$)">
          <input type="number" step="0.01" className={inputClass} value={a.custo_mensal_brl || ''} onChange={(e) => setA({ ...a, custo_mensal_brl: parseFloat(e.target.value) || null })} />
        </Field>
        <Field label="Vencimento">
          <input type="date" className={inputClass} value={a.vencimento || ''} onChange={(e) => setA({ ...a, vencimento: e.target.value })} />
        </Field>
        <Field label="Observações" col={3}>
          <textarea rows={2} className={inputClass} value={a.observacoes || ''} onChange={(e) => setA({ ...a, observacoes: e.target.value })} />
        </Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(a)} className="px-4 py-2 bg-secondary text-surface text-sm">Salvar</button>
        <button onClick={onCancel} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
      </div>
    </div>
  );
}

// =========== Tab 4: Ferramentas ===========
function FerramentasTab() {
  const [tools, setTools] = useState<Tool[]>([]);
  const [editing, setEditing] = useState<Tool | null>(null);

  const load = () => companyStore.listTools().then(setTools);
  useEffect(() => { load(); }, []);

  const newTool = (): Tool => ({ nome: '', categoria: 'infraestrutura', moeda: 'BRL', status: 'ativo', frequencia_cobranca: 'mensal' });

  const totalMensal = tools.filter((t) => t.status === 'ativo' && t.custo_mensal_brl)
    .reduce((s, t) => s + (t.custo_mensal_brl || 0), 0);

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <div>
          <h2 className="text-lg font-semibold">Ferramentas pagas</h2>
          <p className="text-sm text-muted">Total mensal ativo: <span className="text-secondary font-semibold">R$ {totalMensal.toFixed(2)}</span></p>
        </div>
        <button onClick={() => setEditing(newTool())} className="px-3 py-2 bg-secondary hover:bg-secondary/90 text-surface text-sm flex items-center gap-2">
          <Plus size={14} /> Nova ferramenta
        </button>
      </div>

      {editing && (
        <ToolForm tool={editing} onCancel={() => setEditing(null)} onSave={async (t) => { await companyStore.upsertTool(t); setEditing(null); load(); }} />
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-outline/10">
            <th className="py-2">Ferramenta</th>
            <th>Categoria</th>
            <th>Produto</th>
            <th>Plano</th>
            <th>Custo mensal</th>
            <th>Frequência</th>
            <th>Próx. venc.</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tools.map((t) => (
            <tr key={t.id} className="border-b border-outline/10 hover:bg-surface-lowest/50">
              <td className="py-3 font-medium">{t.nome}</td>
              <td className="text-secondary">{t.categoria}</td>
              <td className="text-muted">{t.owner_product || '—'}</td>
              <td className="text-on-surface-variant">{t.plano || '—'}</td>
              <td>{t.custo_mensal_brl ? `${t.moeda} ${t.custo_mensal_brl}` : '—'}</td>
              <td><span className="text-xs px-2 py-0.5 bg-surface-high text-on-surface-variant">{t.frequencia_cobranca || 'mensal'}</span></td>
              <td className="text-muted">{t.proximo_vencimento || '—'}</td>
              <td><span className={`text-xs px-2 py-0.5 ${t.status === 'ativo' ? 'bg-green-500/20 text-green-400' : 'bg-surface-high text-muted'}`}>{t.status}</span></td>
              <td className="flex gap-1 py-3">
                <button onClick={() => setEditing(t)} className="p-1 hover:bg-surface-highest">✎</button>
                <button onClick={() => t.id && companyStore.deleteTool(t.id).then(load)} className="p-1 hover:bg-surface-highest text-red-400"><Trash2 size={14} /></button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {tools.length === 0 && !editing && (
        <div className="text-center py-12 text-muted border-2 border-dashed border-outline/10">
          Nenhuma ferramenta cadastrada.
        </div>
      )}
    </div>
  );
}

function ToolForm({ tool, onSave, onCancel }: { tool: Tool; onSave: (t: Tool) => void; onCancel: () => void }) {
  const [t, setT] = useState(tool);
  return (
    <div className="bg-surface-lowest border border-secondary/40 p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Nome">
          <input className={inputClass} value={t.nome} onChange={(e) => setT({ ...t, nome: e.target.value })} />
        </Field>
        <Field label="Categoria">
          <select className={selectClass} value={t.categoria} onChange={(e) => setT({ ...t, categoria: e.target.value as any })}>
            <option value="infraestrutura">Infraestrutura</option>
            <option value="ia">IA</option>
            <option value="email">Email</option>
            <option value="financeiro">Financeiro</option>
            <option value="crm">CRM</option>
            <option value="marketing">Marketing</option>
            <option value="juridico">Jurídico</option>
            <option value="colaboracao">Colaboração</option>
            <option value="design">Design</option>
            <option value="monitoramento">Monitoramento</option>
            <option value="outro">Outro</option>
          </select>
        </Field>
        <Field label="Produto dono">
          <input className={inputClass} value={t.owner_product || ''} onChange={(e) => setT({ ...t, owner_product: e.target.value })} />
        </Field>
        <Field label="Plano">
          <input className={inputClass} value={t.plano || ''} onChange={(e) => setT({ ...t, plano: e.target.value })} placeholder="Free / Pro / Team..." />
        </Field>
        <Field label="Custo mensal">
          <input type="number" step="0.01" className={inputClass} value={t.custo_mensal_brl || ''} onChange={(e) => setT({ ...t, custo_mensal_brl: parseFloat(e.target.value) || null })} />
        </Field>
        <Field label="Moeda">
          <select className={selectClass} value={t.moeda} onChange={(e) => setT({ ...t, moeda: e.target.value as any })}>
            <option value="BRL">BRL</option>
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
        </Field>
        <Field label="Frequência de cobrança">
          <select className={selectClass} value={t.frequencia_cobranca || 'mensal'} onChange={(e) => setT({ ...t, frequencia_cobranca: e.target.value as any })}>
            <option value="mensal">Mensal</option>
            <option value="bimestral">Bimestral</option>
            <option value="trimestral">Trimestral</option>
            <option value="semestral">Semestral</option>
            <option value="anual">Anual</option>
            <option value="sob_demanda">Sob demanda (pay-per-use)</option>
            <option value="avulso">Avulso (cobrança única)</option>
          </select>
        </Field>
        <Field label="Próximo vencimento">
          <input type="date" className={inputClass} value={t.proximo_vencimento || ''} onChange={(e) => setT({ ...t, proximo_vencimento: e.target.value })} />
        </Field>
        <Field label="URL dashboard">
          <input className={inputClass} value={t.url_dashboard || ''} onChange={(e) => setT({ ...t, url_dashboard: e.target.value })} />
        </Field>
        <Field label="Email da conta">
          <input className={inputClass} value={t.email_conta || ''} onChange={(e) => setT({ ...t, email_conta: e.target.value })} />
        </Field>
        <Field label="Status">
          <select className={selectClass} value={t.status} onChange={(e) => setT({ ...t, status: e.target.value as any })}>
            <option value="ativo">Ativo</option>
            <option value="avaliando">Avaliando</option>
            <option value="congelado">Congelado</option>
            <option value="cancelado">Cancelado</option>
          </select>
        </Field>
        <Field label="Observações" col={3}>
          <textarea rows={2} className={inputClass} value={t.observacoes || ''} onChange={(e) => setT({ ...t, observacoes: e.target.value })} />
        </Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(t)} className="px-4 py-2 bg-secondary text-surface text-sm">Salvar</button>
        <button onClick={onCancel} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
      </div>
    </div>
  );
}

// =========== Tab 5: Financeiro ===========
function FinanceiroTab() {
  const [snapshots, setSnapshots] = useState<FinancialSnapshot[]>([]);
  const [editing, setEditing] = useState<FinancialSnapshot | null>(null);

  const load = () => companyStore.listSnapshots().then(setSnapshots);
  useEffect(() => { load(); }, []);

  const currentMonth = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  const newSnapshot = (): FinancialSnapshot => ({
    month: currentMonth(),
    mrr_total_brl: 0, receita_unica_brl: 0,
    custo_infra_brl: 0, custo_ferramentas_brl: 0, custo_pessoas_brl: 0, custo_outros_brl: 0,
    clientes_pagantes: 0, clientes_trial: 0, leads_qualificados: 0, demos_agendadas: 0,
  });

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-lg font-semibold">Snapshots financeiros mensais</h2>
        <button onClick={() => setEditing(newSnapshot())} className="px-3 py-2 bg-secondary hover:bg-secondary/90 text-surface text-sm flex items-center gap-2">
          <Plus size={14} /> Novo snapshot
        </button>
      </div>

      {editing && (
        <SnapshotForm s={editing} onCancel={() => setEditing(null)} onSave={async (s) => { await companyStore.upsertSnapshot(s); setEditing(null); load(); }} />
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-muted border-b border-outline/10">
            <th className="py-2">Mês</th>
            <th>MRR</th>
            <th>Custo total</th>
            <th>Resultado</th>
            <th>Clientes</th>
            <th>Saldo PJ</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((s) => {
            const custoTotal = s.custo_infra_brl + s.custo_ferramentas_brl + s.custo_pessoas_brl + s.custo_outros_brl;
            const resultado = (s.mrr_total_brl + s.receita_unica_brl) - custoTotal;
            return (
              <tr key={s.id || s.month} className="border-b border-outline/10">
                <td className="py-3 font-medium">{s.month}</td>
                <td className="text-secondary">R$ {s.mrr_total_brl.toFixed(2)}</td>
                <td className="text-red-400">R$ {custoTotal.toFixed(2)}</td>
                <td className={resultado >= 0 ? 'text-green-400' : 'text-red-400'}>R$ {resultado.toFixed(2)}</td>
                <td>{s.clientes_pagantes}</td>
                <td>{s.saldo_conta_pj_brl ? `R$ ${s.saldo_conta_pj_brl.toFixed(2)}` : '—'}</td>
                <td><button onClick={() => setEditing(s)} className="p-1 hover:bg-surface-highest">✎</button></td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {snapshots.length === 0 && !editing && (
        <div className="text-center py-12 text-muted border-2 border-dashed border-outline/10">
          Nenhum snapshot cadastrado. Crie um por mês para acompanhar a evolução financeira.
        </div>
      )}
    </div>
  );
}

function SnapshotForm({ s, onSave, onCancel }: { s: FinancialSnapshot; onSave: (s: FinancialSnapshot) => void; onCancel: () => void }) {
  const [v, setV] = useState(s);
  const num = (key: keyof FinancialSnapshot) => (
    <input type="number" step="0.01" className={inputClass} value={(v[key] as number | null) || ''} onChange={(e) => setV({ ...v, [key]: parseFloat(e.target.value) || 0 })} />
  );
  return (
    <div className="bg-surface-lowest border border-secondary/40 p-5 mb-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Field label="Mês (YYYY-MM-01)">
          <input type="date" className={inputClass} value={v.month} onChange={(e) => setV({ ...v, month: e.target.value })} />
        </Field>
        <Field label="MRR total (R$)">{num('mrr_total_brl')}</Field>
        <Field label="Receita única (R$)">{num('receita_unica_brl')}</Field>
        <Field label="Custo infra (R$)">{num('custo_infra_brl')}</Field>
        <Field label="Custo ferramentas (R$)">{num('custo_ferramentas_brl')}</Field>
        <Field label="Custo pessoas (R$)">{num('custo_pessoas_brl')}</Field>
        <Field label="Custo outros (R$)">{num('custo_outros_brl')}</Field>
        <Field label="Saldo conta PJ (R$)">{num('saldo_conta_pj_brl')}</Field>
        <Field label="Investimento acumulado (R$)">{num('investimento_acumulado_brl')}</Field>
        <Field label="Clientes pagantes">{num('clientes_pagantes')}</Field>
        <Field label="Clientes em trial">{num('clientes_trial')}</Field>
        <Field label="Leads qualificados">{num('leads_qualificados')}</Field>
        <Field label="Demos agendadas">{num('demos_agendadas')}</Field>
        <Field label="Observações" col={3}>
          <textarea rows={2} className={inputClass} value={v.observacoes || ''} onChange={(e) => setV({ ...v, observacoes: e.target.value })} />
        </Field>
      </div>
      <div className="flex gap-2 mt-4">
        <button onClick={() => onSave(v)} className="px-4 py-2 bg-secondary text-surface text-sm">Salvar</button>
        <button onClick={onCancel} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
      </div>
    </div>
  );
}

// =========== Tab 6: LGPD e Jurídico ===========
function LgpdTab() {
  const [ls, setLs] = useState<LegalStatus>({
    dpo_nomeado: false, politica_privacidade_publicada: false, tos_publicado: false,
    msa_template_pronto: false, dpa_template_pronto: false, advogado_revisao_feita: false,
    registro_operacoes_tratamento: false, canal_titular_ativo: false, plano_incidentes_pronto: false,
    criptografia_repouso: false, criptografia_transito: true, controle_acesso_minimo_privilegio: false,
    backup_definido: false, treinamento_lgpd_time: false,
  });
  const [saved, setSaved] = useState(false);

  useEffect(() => { companyStore.getLegalStatus().then(setLs); }, []);

  const save = async () => {
    await companyStore.saveLegalStatus(ls);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const check = (key: keyof LegalStatus, label: string) => (
    <label className="flex items-center gap-3 py-2">
      <input type="checkbox" checked={!!ls[key]} onChange={(e) => setLs({ ...ls, [key]: e.target.checked })} className="w-4 h-4" />
      <span className="text-sm">{label}</span>
    </label>
  );

  const progress = [
    ls.dpo_nomeado, ls.politica_privacidade_publicada, ls.tos_publicado,
    ls.msa_template_pronto, ls.dpa_template_pronto, ls.advogado_revisao_feita,
    ls.registro_operacoes_tratamento, ls.canal_titular_ativo, ls.plano_incidentes_pronto,
    ls.criptografia_repouso, ls.criptografia_transito, ls.controle_acesso_minimo_privilegio,
    ls.backup_definido, ls.treinamento_lgpd_time,
  ].filter(Boolean).length;

  return (
    <div className="space-y-8">
      <div className="bg-surface-lowest p-4">
        <div className="flex justify-between mb-2">
          <span className="text-sm">Progresso LGPD</span>
          <span className="text-sm text-secondary font-semibold">{progress}/14</span>
        </div>
        <div className="h-2 bg-surface-high rounded-full overflow-hidden">
          <div className="h-full bg-secondary" style={{ width: `${(progress / 14) * 100}%` }} />
        </div>
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-4">DPO (Encarregado de Dados)</h2>
        {check('dpo_nomeado', 'DPO nomeado formalmente')}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-2">
          <Field label="Nome do DPO"><input className={inputClass} value={ls.dpo_nome || ''} onChange={(e) => setLs({ ...ls, dpo_nome: e.target.value })} /></Field>
          <Field label="Email DPO"><input className={inputClass} value={ls.dpo_email || ''} onChange={(e) => setLs({ ...ls, dpo_email: e.target.value })} /></Field>
          <Field label="Telefone DPO"><input className={inputClass} value={ls.dpo_telefone || ''} onChange={(e) => setLs({ ...ls, dpo_telefone: e.target.value })} /></Field>
        </div>
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Documentos legais</h2>
        {check('politica_privacidade_publicada', 'Política de Privacidade publicada')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <Field label="URL Política"><input className={inputClass} value={ls.politica_privacidade_url || ''} onChange={(e) => setLs({ ...ls, politica_privacidade_url: e.target.value })} /></Field>
          <Field label="Versão"><input className={inputClass} value={ls.politica_privacidade_versao || ''} onChange={(e) => setLs({ ...ls, politica_privacidade_versao: e.target.value })} /></Field>
        </div>
        {check('tos_publicado', 'Termos de Uso publicados')}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-3">
          <Field label="URL ToS"><input className={inputClass} value={ls.tos_url || ''} onChange={(e) => setLs({ ...ls, tos_url: e.target.value })} /></Field>
          <Field label="Versão"><input className={inputClass} value={ls.tos_versao || ''} onChange={(e) => setLs({ ...ls, tos_versao: e.target.value })} /></Field>
        </div>
        {check('msa_template_pronto', 'MSA (Contrato SaaS) template pronto')}
        {check('dpa_template_pronto', 'DPA template pronto')}
        {check('advogado_revisao_feita', 'Advogado revisou os documentos')}
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-4">Checklist LGPD operacional</h2>
        {check('registro_operacoes_tratamento', 'Registro de operações de tratamento (art. 37 LGPD)')}
        {check('canal_titular_ativo', 'Canal de atendimento ao titular ativo')}
        {check('plano_incidentes_pronto', 'Plano de resposta a incidentes (72h)')}
        {check('criptografia_repouso', 'Criptografia de dados em repouso')}
        {check('criptografia_transito', 'Criptografia em trânsito (HTTPS)')}
        {check('controle_acesso_minimo_privilegio', 'Controle de acesso com mínimo privilégio')}
        {check('backup_definido', 'Política de backup definida com retenção')}
        {check('treinamento_lgpd_time', 'Treinamento LGPD do time')}
      </section>

      <section>
        <Field label="Observações gerais" col={3}>
          <textarea rows={3} className={inputClass} value={ls.observacoes || ''} onChange={(e) => setLs({ ...ls, observacoes: e.target.value })} />
        </Field>
      </section>

      <div className="flex items-center gap-4">
        <button onClick={save} className="px-6 py-2.5 bg-secondary hover:bg-secondary/90 text-surface font-medium">Salvar</button>
        {saved && <span className="text-green-400 text-sm">✓ Salvo</span>}
      </div>
    </div>
  );
}
