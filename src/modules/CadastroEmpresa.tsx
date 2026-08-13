import { useEffect, useState } from 'react';
import { Building2, Users, Globe, Wrench, DollarSign, Shield, Download, Plus, Trash2, Cloud, HardDrive, FileText, BookOpen, Pencil, CheckCircle2, XCircle, AlertTriangle } from 'lucide-react';
import { companyStore, type CompanyPartner } from '../lib/companyStore';
import PageHeader from '../components/PageHeader';
import type { CompanyIdentity, CompanyContact, DigitalAsset, Tool, FinancialSnapshot, LegalStatus } from '../lib/supabase';

type TabId = 'ficha' | 'docs' | 'identidade' | 'contatos' | 'digital' | 'ferramentas' | 'financeiro' | 'lgpd';

const TABS: Array<{ id: TabId; label: string; icon: typeof Building2 }> = [
  { id: 'ficha', label: 'Ficha Técnica', icon: BookOpen },
  { id: 'docs', label: 'Documentos', icon: FileText },
  { id: 'contatos', label: 'Contatos', icon: Users },
  { id: 'digital', label: 'Identidade Digital', icon: Globe },
  { id: 'ferramentas', label: 'Ferramentas', icon: Wrench },
  { id: 'financeiro', label: 'Snapshots', icon: DollarSign },
  { id: 'lgpd', label: 'LGPD e Jurídico', icon: Shield },
  { id: 'identidade', label: 'Editar Dados', icon: Pencil },
];

export default function CadastroEmpresa() {
  const [tab, setTab] = useState<TabId>('ficha');
  const online = companyStore.isOnline();

  return (
    <div className="max-w-7xl mx-auto p-8">
      <PageHeader
        eyebrow="Registro Canônico"
        title="Cadastro Empresa"
        subtitle="Registro único e canônico da DIGIAI — dados reais usados em contratos, propostas e snapshots para agentes."
        actions={
          <>
            <span className={`px-3 py-1.5 text-xs font-medium flex items-center gap-2 ${online ? 'bg-success/10 text-success border border-success/30' : 'bg-warning/10 text-warning border border-warning/30'}`}>
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
        {tab === 'ficha' && <FichaTab onEditar={() => setTab('identidade')} />}
        {tab === 'docs' && <DocsTab />}
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

// =========== Ficha Técnica (leitura — a cara do módulo) ===========
function Item({ label, value, mono = false }: { label: string; value?: string | number | null; mono?: boolean }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">{label}</div>
      <div className={`text-sm text-on-surface ${mono ? 'font-mono' : ''}`}>{value ?? '—'}</div>
    </div>
  );
}

function Bloco({ titulo, children, acao }: { titulo: string; children: React.ReactNode; acao?: React.ReactNode }) {
  return (
    <div className="border border-outline/15 bg-surface-container">
      <div className="px-5 py-3 border-b border-outline/10 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">{titulo}</span>
        {acao}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function brlFmt(v?: number | null): string {
  return v == null ? '—' : v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dataFmt(iso?: string | null): string {
  if (!iso) return '—';
  return new Date(iso + (iso.length === 10 ? 'T00:00:00' : '')).toLocaleDateString('pt-BR');
}

const PAPEL_LABEL: Record<string, string> = {
  socio_administrador: 'Sócio-administrador',
  socio: 'Sócio',
  administrador: 'Administrador',
};

function FichaTab({ onEditar }: { onEditar: () => void }) {
  const [identity, setIdentity] = useState<CompanyIdentity | null>(null);
  const [partners, setPartners] = useState<CompanyPartner[]>([]);
  const [contacts, setContacts] = useState<CompanyContact[]>([]);
  const [ls, setLs] = useState<LegalStatus | null>(null);
  const [tools, setTools] = useState<Tool[]>([]);
  const [assets, setAssets] = useState<DigitalAsset[]>([]);

  useEffect(() => {
    companyStore.getIdentity().then(setIdentity);
    companyStore.listPartners().then(setPartners);
    companyStore.listContacts().then(setContacts);
    companyStore.getLegalStatus().then(setLs);
    companyStore.listTools().then(setTools);
    companyStore.listDigitalAssets().then(setAssets);
  }, []);

  if (!identity) return <div className="text-muted text-sm py-8">Carregando ficha…</div>;

  const emTransicao = (identity.notes || '').toLowerCase().includes('transição');
  const lgpdChecks = ls ? [
    ls.dpo_nomeado, ls.politica_privacidade_publicada, ls.tos_publicado, ls.msa_template_pronto,
    ls.dpa_template_pronto, ls.advogado_revisao_feita, ls.registro_operacoes_tratamento,
    ls.canal_titular_ativo, ls.plano_incidentes_pronto, ls.criptografia_repouso,
    ls.criptografia_transito, ls.controle_acesso_minimo_privilegio, ls.backup_definido, ls.treinamento_lgpd_time,
  ].filter(Boolean).length : 0;
  const toolsAtivas = tools.filter(t => t.status === 'ativo');
  const custoFerramentas = toolsAtivas.reduce((s, t) => s + (t.custo_mensal_brl || 0), 0);
  const assetsAtivos = assets.filter(a => a.status === 'ativo').length;

  return (
    <div className="space-y-5">
      {/* Cabeçalho da ficha */}
      <div className="border border-outline/15 bg-surface-container p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="font-serif text-2xl font-semibold text-on-surface">{identity.razao_social || identity.nome_fantasia}</div>
            <div className="font-mono text-xs text-muted mt-1">{identity.nome_fantasia} · CNPJ {identity.cnpj || '—'}</div>
          </div>
          <button onClick={onEditar} className="px-3 py-1.5 text-xs font-mono uppercase tracking-widest border border-outline/20 text-muted hover:text-on-surface hover:bg-surface-high transition-colors flex items-center gap-1.5">
            <Pencil size={12} /> Editar dados
          </button>
        </div>
        <div className="flex flex-wrap gap-2 mt-4">
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-outline/20 text-on-surface-variant">{identity.natureza_juridica || identity.forma_juridica || '—'}</span>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-outline/20 text-on-surface-variant">Microempresa (LC 123/2006)</span>
          <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-success/40 text-success bg-success/10">Simples · Anexo {identity.simples_anexo || '—'} · {identity.aliquota_estimada ?? '—'}%</span>
          {emTransicao && <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-warning/40 text-warning bg-warning/10 flex items-center gap-1"><AlertTriangle size={10} /> CNPJ em transição na RFB</span>}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Bloco titulo="Identificação">
          <div className="grid grid-cols-2 gap-4">
            <Item label="CNPJ" value={identity.cnpj} mono />
            <Item label="Abertura (contrato social)" value={dataFmt(identity.data_abertura)} mono />
            <Item label="Capital social" value={brlFmt(identity.capital_social)} mono />
            <Item label="Inscrição Estadual" value={identity.inscricao_estadual} mono />
            <Item label="Inscrição Municipal" value={identity.inscricao_municipal} mono />
            <Item label="Certificado digital" value={identity.certificado_digital_tipo ? `e-CNPJ ${identity.certificado_digital_tipo}${identity.certificado_digital_vencimento ? ` · vence ${dataFmt(identity.certificado_digital_vencimento)}` : ''}` : '—'} />
          </div>
        </Bloco>

        <Bloco titulo="Endereço fiscal">
          <div className="text-sm text-on-surface leading-relaxed">
            {identity.endereco_logradouro}, {identity.endereco_numero}{identity.endereco_complemento ? ` — ${identity.endereco_complemento}` : ''}<br />
            {identity.endereco_bairro} · {identity.endereco_cidade}/{identity.endereco_uf} · CEP {identity.endereco_cep}
          </div>
        </Bloco>

        <Bloco titulo="Quadro societário">
          {partners.length === 0 ? <div className="text-sm text-muted">Nenhum sócio registrado.</div> : (
            <div className="space-y-3">
              {partners.map(p => (
                <div key={p.id} className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-medium text-on-surface">{p.nome}</div>
                    <div className="font-mono text-[11px] text-muted">{PAPEL_LABEL[p.papel || ''] || p.papel} · CPF {p.cpf}</div>
                  </div>
                  <div className="font-serif text-xl font-semibold text-secondary tabular-nums">{p.percent_cotas ?? '—'}%</div>
                </div>
              ))}
            </div>
          )}
        </Bloco>

        <Bloco titulo="Representante legal">
          <div className="grid grid-cols-2 gap-4">
            <Item label="Nome" value={identity.representante_nome} />
            <Item label="CPF" value={identity.representante_cpf} mono />
            <Item label="RG" value={identity.representante_rg} mono />
            <Item label="E-mail" value={identity.representante_email} mono />
          </div>
        </Bloco>
      </div>

      <Bloco titulo="Atividades (CNAE)">
        <div className="space-y-2">
          <div className="flex items-start gap-3">
            <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 bg-secondary text-on-action shrink-0 mt-0.5">principal</span>
            <div className="text-sm text-on-surface"><span className="font-mono text-muted mr-2">{identity.cnae_principal_codigo}</span>{identity.cnae_principal_descricao}</div>
          </div>
          {(identity.cnaes_secundarios || []).map(c => (
            <div key={c.codigo} className="flex items-start gap-3">
              <span className="font-mono text-[10px] uppercase px-1.5 py-0.5 bg-surface-high text-muted shrink-0 mt-0.5">secundário</span>
              <div className="text-sm text-on-surface-variant"><span className="font-mono text-muted mr-2">{c.codigo}</span>{c.descricao}</div>
            </div>
          ))}
        </div>
      </Bloco>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <Bloco titulo="Rede de apoio (contatos ativos)">
          <div className="space-y-2">
            {contacts.filter(c => c.ativo !== false).map(c => (
              <div key={c.id || c.nome} className="flex items-center gap-3">
                <span className="font-mono text-[10px] uppercase tracking-wider text-secondary w-40 shrink-0">{c.tipo}</span>
                <span className="text-sm text-on-surface truncate">{c.nome}</span>
              </div>
            ))}
            {contacts.length === 0 && <div className="text-sm text-muted">Nenhum contato.</div>}
          </div>
        </Bloco>

        <Bloco titulo="Situação operacional">
          <div className="grid grid-cols-3 gap-4 mb-4">
            <Item label="LGPD" value={ls ? `${lgpdChecks}/14 checks` : '—'} mono />
            <Item label="Ativos digitais" value={`${assetsAtivos} ativos`} mono />
            <Item label="Ferramentas" value={`${toolsAtivas.length} · ${brlFmt(custoFerramentas)}/mês`} mono />
          </div>
          <div className="h-1.5 bg-surface-lowest overflow-hidden">
            <div className="h-full bg-secondary" style={{ width: `${(lgpdChecks / 14) * 100}%` }} />
          </div>
        </Bloco>
      </div>

      {identity.notes && (
        <Bloco titulo="Histórico e observações (registro canônico)">
          <div className="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-line">{identity.notes}</div>
        </Bloco>
      )}
    </div>
  );
}

// =========== Documentos (dossiê derivado do banco) ===========
type DocStatus = 'ok' | 'pendente' | 'atencao';

function DocsTab() {
  const [identity, setIdentity] = useState<CompanyIdentity | null>(null);
  const [ls, setLs] = useState<LegalStatus | null>(null);

  useEffect(() => {
    companyStore.getIdentity().then(setIdentity);
    companyStore.getLegalStatus().then(setLs);
  }, []);

  if (!identity || !ls) return <div className="text-muted text-sm py-8">Carregando documentos…</div>;

  const emTransicao = (identity.notes || '').toLowerCase().includes('transição');
  const docs: Array<{ nome: string; status: DocStatus; detalhe: string; url?: string | null; grupo: string }> = [
    { grupo: 'Constituição', nome: 'Contrato social', status: identity.data_abertura ? 'ok' : 'pendente', detalhe: identity.data_abertura ? `Assinado em ${dataFmt(identity.data_abertura)} · capital ${brlFmt(identity.capital_social)} · 100% Gilberto` : 'Não registrado' },
    { grupo: 'Constituição', nome: 'Cartão CNPJ', status: emTransicao ? 'atencao' : identity.cnpj ? 'ok' : 'pendente', detalhe: emTransicao ? `${identity.cnpj} — migração de natureza jurídica/endereço em andamento (JUCESP/RFB)` : identity.cnpj || 'Sem CNPJ' },
    { grupo: 'Constituição', nome: 'Inscrição Estadual', status: identity.inscricao_estadual ? 'ok' : 'pendente', detalhe: identity.inscricao_estadual || 'Não obtida' },
    { grupo: 'Constituição', nome: 'Inscrição Municipal (CCM Suzano)', status: identity.inscricao_municipal ? 'ok' : 'pendente', detalhe: identity.inscricao_municipal ? `${identity.inscricao_municipal} — habilita NFS-e (ISS)` : 'Não obtida — bloqueia NFS-e' },
    { grupo: 'Constituição', nome: 'Certificado digital e-CNPJ', status: identity.certificado_digital_tipo === 'nao_possui' || !identity.certificado_digital_tipo ? 'pendente' : identity.certificado_digital_vencimento ? 'ok' : 'atencao', detalhe: identity.certificado_digital_tipo ? `Tipo ${identity.certificado_digital_tipo}${identity.certificado_digital_vencimento ? ` · vence ${dataFmt(identity.certificado_digital_vencimento)}` : ' · vencimento não informado'}` : 'Não possui' },
    { grupo: 'Tributário', nome: 'Enquadramento Simples Nacional', status: identity.regime_tributario === 'simples_nacional' ? 'ok' : 'pendente', detalhe: `Anexo ${identity.simples_anexo || '—'} via Fator R · alíquota efetiva ${identity.aliquota_estimada ?? '—'}% — confirmar com contador antes da 1ª NF` },
    { grupo: 'Legal · público', nome: 'Política de Privacidade', status: ls.politica_privacidade_publicada ? 'ok' : 'pendente', detalhe: ls.politica_privacidade_publicada ? `Publicada${ls.politica_privacidade_versao ? ` · v${ls.politica_privacidade_versao}` : ''}` : 'Minuta existe; publicar exige advogado resolver [A DEFINIR] + controles pendentes', url: ls.politica_privacidade_url },
    { grupo: 'Legal · público', nome: 'Termos de Uso', status: ls.tos_publicado ? 'ok' : 'pendente', detalhe: ls.tos_publicado ? `Publicados${ls.tos_versao ? ` · v${ls.tos_versao}` : ''}` : 'Minuta existe; mesma trava da Política', url: ls.tos_url },
    { grupo: 'Legal · contratos', nome: 'MSA (contrato SaaS)', status: ls.msa_template_pronto ? 'ok' : 'pendente', detalhe: ls.msa_template_pronto ? 'Template pronto' : 'Template não finalizado' },
    { grupo: 'Legal · contratos', nome: 'DPA (tratamento de dados)', status: ls.dpa_template_pronto ? 'ok' : 'pendente', detalhe: ls.dpa_template_pronto ? 'Template pronto' : 'Template não finalizado — trava a 1ª venda externa do Clearix (ADR-0020)' },
    { grupo: 'Legal · contratos', nome: 'Revisão de advogado', status: ls.advogado_revisao_feita ? 'ok' : 'pendente', detalhe: ls.advogado_revisao_feita ? 'Documentos revisados' : 'Nenhum documento revisado por advogado humano' },
    { grupo: 'LGPD operacional', nome: 'DPO nomeado', status: ls.dpo_nomeado ? 'ok' : 'pendente', detalhe: ls.dpo_nomeado ? `${ls.dpo_nome || ''} ${ls.dpo_email ? `· ${ls.dpo_email}` : ''}`.trim() || 'Nomeado' : 'Não nomeado' },
    { grupo: 'LGPD operacional', nome: 'Registro de operações (art. 37)', status: ls.registro_operacoes_tratamento ? 'ok' : 'pendente', detalhe: ls.registro_operacoes_tratamento ? 'Mantido' : 'Não iniciado' },
    { grupo: 'LGPD operacional', nome: 'Plano de resposta a incidentes (72h)', status: ls.plano_incidentes_pronto ? 'ok' : 'pendente', detalhe: ls.plano_incidentes_pronto ? 'Pronto' : 'Não elaborado' },
    { grupo: 'LGPD operacional', nome: 'Canal do titular', status: ls.canal_titular_ativo ? 'ok' : 'pendente', detalhe: ls.canal_titular_ativo ? 'Ativo' : 'Não ativo' },
  ];

  const grupos = [...new Set(docs.map(d => d.grupo))];
  const okCount = docs.filter(d => d.status === 'ok').length;

  const ICON: Record<DocStatus, React.ReactNode> = {
    ok: <CheckCircle2 size={15} className="text-success" />,
    pendente: <XCircle size={15} className="text-danger" />,
    atencao: <AlertTriangle size={15} className="text-warning" />,
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between border border-outline/15 bg-surface-container p-4">
        <span className="font-mono text-[10px] uppercase tracking-widest text-muted">Dossiê documental — derivado do registro canônico (banco), não é upload</span>
        <span className="font-serif text-lg font-semibold text-on-surface tabular-nums">{okCount}<span className="text-muted text-sm font-sans">/{docs.length} ok</span></span>
      </div>
      {grupos.map(g => (
        <Bloco key={g} titulo={g}>
          <div className="divide-y divide-outline/10 -my-2">
            {docs.filter(d => d.grupo === g).map(d => (
              <div key={d.nome} className="flex items-start gap-3 py-2.5">
                <span className="mt-0.5 shrink-0">{ICON[d.status]}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-on-surface">{d.nome}</div>
                  <div className="text-[12px] text-muted leading-snug">{d.detalhe}</div>
                </div>
                {d.url && <a href={d.url} target="_blank" rel="noreferrer" className="font-mono text-[10px] text-secondary hover:underline shrink-0 mt-1">abrir ↗</a>}
              </div>
            ))}
          </div>
        </Bloco>
      ))}
      <div className="text-[11px] text-muted">
        Status vem de <span className="font-mono">company.identity</span> + <span className="font-mono">company.legal_status</span> — atualizar é nas abas "LGPD e Jurídico" e "Editar Dados".
      </div>
    </div>
  );
}

// =========== Tab 1: Identidade Legal ===========
function IdentidadeTab() {
  const [identity, setIdentity] = useState<CompanyIdentity>({ nome_fantasia: 'DIGIAI' });
  const [saved, setSaved] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    companyStore.getIdentity().then(setIdentity);
  }, []);

  const update = <K extends keyof CompanyIdentity>(key: K, value: CompanyIdentity[K]) => {
    setIdentity((prev) => ({ ...prev, [key]: value }));
  };

  const save = async () => {
    setErro(null);
    try {
      await companyStore.saveIdentity(identity);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar no servidor.');
      return;
    }
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
        {saved && <span className="text-success text-sm">✓ Salvo</span>}
        {erro && <span className="text-danger text-sm">⚠ {erro}</span>}
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
          <div key={c.id} className="bg-surface-lowest border border-outline/15 p-4">
            <div className="flex justify-between items-start mb-2">
              <div>
                <div className="text-xs uppercase text-secondary font-semibold">{c.tipo}</div>
                <div className="font-semibold">{c.nome}</div>
                {c.empresa && <div className="text-sm text-muted">{c.empresa}</div>}
              </div>
              <div className="flex gap-1">
                <button onClick={() => setEditing(c)} className="p-1.5 hover:bg-surface-highest">✎</button>
                <button onClick={() => c.id && companyStore.deleteContact(c.id).then(load)} className="p-1.5 hover:bg-surface-highest text-danger">
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
              <td><span className={`text-xs px-2 py-0.5 ${a.status === 'ativo' ? 'bg-success/20 text-success' : 'bg-warning/20 text-warning'}`}>{a.status}</span></td>
              <td>{a.custo_mensal_brl ? `R$ ${a.custo_mensal_brl}/mês` : '—'}</td>
              <td className="flex gap-1 py-3">
                <button onClick={() => setEditing(a)} className="p-1 hover:bg-surface-highest">✎</button>
                <button onClick={() => a.id && companyStore.deleteDigitalAsset(a.id).then(load)} className="p-1 hover:bg-surface-highest text-danger">
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
              <td><span className={`text-xs px-2 py-0.5 ${t.status === 'ativo' ? 'bg-success/20 text-success' : 'bg-surface-high text-muted'}`}>{t.status}</span></td>
              <td className="flex gap-1 py-3">
                <button onClick={() => setEditing(t)} className="p-1 hover:bg-surface-highest">✎</button>
                <button onClick={() => t.id && companyStore.deleteTool(t.id).then(load)} className="p-1 hover:bg-surface-highest text-danger"><Trash2 size={14} /></button>
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
                <td className="text-danger">R$ {custoTotal.toFixed(2)}</td>
                <td className={resultado >= 0 ? 'text-success' : 'text-danger'}>R$ {resultado.toFixed(2)}</td>
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
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => { companyStore.getLegalStatus().then(setLs); }, []);

  const save = async () => {
    setErro(null);
    try {
      await companyStore.saveLegalStatus(ls);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao salvar no servidor.');
      return;
    }
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
        <div className="h-2 bg-surface-high overflow-hidden">
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
        {saved && <span className="text-success text-sm">✓ Salvo</span>}
        {erro && <span className="text-danger text-sm">⚠ {erro}</span>}
      </div>
    </div>
  );
}
