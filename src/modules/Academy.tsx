import { useEffect, useMemo, useState, type ReactNode } from 'react';
import {
  BookOpen,
  CheckCircle2,
  Circle,
  Cloud,
  Download,
  FileText,
  HardDrive,
  Image,
  Layers3,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Trash2,
  Workflow,
  X,
} from 'lucide-react';
import {
  academyStore,
  type AcademyAsset,
  type AcademyAssetStatus,
  type AcademyAssetType,
  type AcademyChecklistArea,
  type AcademyChecklistItem,
  type AcademyCreationRecord,
  type AcademyCreationRecordType,
  type AcademyOfferType,
  type AcademyProduct,
  type AcademyProductStatus,
  type AcademyQuestion,
  type AcademyQuestionStatus,
  type AcademyScenario,
  type AcademyScenarioStatus,
  type AcademyWorkspace,
} from '../lib/academyStore';
import { companyStore } from '../lib/companyStore';
import PageHeader from '../components/PageHeader';
import { TravasBanner } from './TravasMarketing';
import { backlogStore } from '../lib/backlogStore';
import { decisionsStore } from '../lib/decisionsStore';
import { roadmapStore } from '../lib/roadmapStore';

const inputClass = 'w-full bg-surface-lowest border border-outline/30 px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary';
const textareaClass = `${inputClass} min-h-[88px]`;

const scenarioStatusLabel: Record<AcademyScenarioStatus, string> = {
  recommended: 'Recomendado',
  testing: 'Em teste',
  draft: 'Rascunho',
  hold: 'Em espera',
  rejected: 'Descartado',
};

const scenarioStatusClass: Record<AcademyScenarioStatus, string> = {
  recommended: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
  testing: 'bg-secondary/15 text-secondary border-secondary/40',
  draft: 'bg-secondary-container/40 text-secondary border-secondary/40',
  hold: 'bg-amber-400/10 text-amber-300 border-amber-400/30',
  rejected: 'bg-surface-low text-muted border-outline/10',
};

const questionStatusLabel: Record<AcademyQuestionStatus, string> = {
  open: 'Aberta',
  deciding: 'Em decisao',
  blocked: 'Bloqueada',
  done: 'Fechada',
};

const questionStatusClass: Record<AcademyQuestionStatus, string> = {
  open: 'bg-surface-low text-on-surface-variant border-outline/10',
  deciding: 'bg-secondary-container/40 text-secondary border-secondary/40',
  blocked: 'bg-red-400/10 text-red-300 border-red-400/30',
  done: 'bg-emerald-400/10 text-emerald-300 border-emerald-400/30',
};

const checklistAreaLabel: Record<AcademyChecklistArea, string> = {
  offer: 'Oferta',
  sales: 'Venda',
  delivery: 'Entrega',
  analytics: 'Analytics',
  support: 'Suporte',
};

const productStatusLabel: Record<AcademyProductStatus, string> = {
  draft: 'Draft',
  planned: 'Planejado',
  in_production: 'Em producao',
  ready_for_sale: 'Pronto para venda',
  live: 'Ao vivo',
  archived: 'Arquivado',
};

const offerTypeLabel: Record<AcademyOfferType, string> = {
  lead_magnet: 'Lead magnet',
  low_ticket: 'Low ticket',
  workshop: 'Workshop',
  manual: 'Manual',
  course: 'Curso',
  consulting: 'Consultoria',
  other: 'Outro',
};

const assetTypeLabel: Record<AcademyAssetType, string> = {
  cover: 'Capa',
  pdf: 'PDF',
  mockup: 'Mockup',
  thumbnail: 'Thumbnail',
  bonus: 'Bonus',
  checkout: 'Checkout',
  supporting_doc: 'Documento',
  other: 'Outro',
};

const assetStatusLabel: Record<AcademyAssetStatus, string> = {
  draft: 'Draft',
  ready: 'Pronto',
  archived: 'Arquivado',
};

const creationTypeLabel: Record<AcademyCreationRecordType, string> = {
  brief: 'Brief',
  prompt: 'Prompt',
  copy: 'Copy',
  design: 'Design',
  research: 'Research',
  editorial: 'Editorial',
  operation: 'Operacao',
  decision: 'Decisao',
  other: 'Outro',
};

function emptyAsset(): AcademyAsset {
  return {
    id: crypto.randomUUID(),
    asset_type: 'cover',
    title: '',
    status: 'draft',
    version_label: '',
    storage_provider: 'supabase_storage',
    storage_bucket: '',
    storage_path: '',
    file_url: '',
    mime_type: '',
    file_size_bytes: null,
    is_primary: false,
    notes: '',
    metadata: {},
  };
}

function emptyCreationRecord(): AcademyCreationRecord {
  return {
    id: crypto.randomUUID(),
    record_type: 'brief',
    title: '',
    status: 'draft',
    content_md: '',
    source_path: '',
    external_url: '',
    model_name: '',
    created_via: '',
    tags: [],
    notes: '',
    metadata: {},
  };
}

function emptyScenario(): AcademyScenario {
  return {
    id: crypto.randomUUID(),
    name: '',
    status: 'draft',
    landing: '',
    checkout: '',
    delivery: '',
    access_release: '',
    support: '',
    summary: '',
    pros: '',
    cons: '',
    notes: '',
    sort_order: 0,
  };
}

function emptyQuestion(): AcademyQuestion {
  return {
    id: crypto.randomUUID(),
    title: '',
    status: 'open',
    owner: '',
    next_step: '',
    notes: '',
    sort_order: 0,
  };
}

function emptyChecklistItem(nextOrder: number): AcademyChecklistItem {
  return {
    id: crypto.randomUUID(),
    title: '',
    area: 'offer',
    done: false,
    notes: '',
    sort_order: nextOrder,
  };
}

export default function Academy() {
  const [workspace, setWorkspace] = useState<AcademyWorkspace | null>(null);
  const [productDraft, setProductDraft] = useState<AcademyProduct | null>(null);
  const [assetDraft, setAssetDraft] = useState<AcademyAsset | null>(null);
  const [creationDraft, setCreationDraft] = useState<AcademyCreationRecord | null>(null);
  const [scenarioDraft, setScenarioDraft] = useState<AcademyScenario | null>(null);
  const [questionDraft, setQuestionDraft] = useState<AcademyQuestion | null>(null);
  const [checklistDraft, setChecklistDraft] = useState<AcademyChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [tagInput, setTagInput] = useState('');

  const load = async () => {
    setLoading(true);
    const data = await academyStore.getWorkspace();
    setWorkspace(data);
    setProductDraft(data.product);
    setChecklistDraft(data.checklist);
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!saveMessage) return;
    const timer = window.setTimeout(() => setSaveMessage(null), 2400);
    return () => window.clearTimeout(timer);
  }, [saveMessage]);

  const supabaseReady = companyStore.isOnline();

  const persistenceAudit = useMemo(() => {
    return [
      {
        module: 'Cadastro Empresa',
        target: supabaseReady ? 'Supabase + localStorage' : 'localStorage',
        status: supabaseReady ? 'Gravando com redundancia local' : 'Gravando so localmente',
        tone: supabaseReady ? 'good' : 'warn',
      },
      {
        module: 'Backlog Executivo',
        target: backlogStore.isOnline() ? 'Supabase + cache local' : 'localStorage',
        status: backlogStore.isOnline() ? 'Frontend grava no banco e mantem cache local' : 'Frontend grava localmente ate o Supabase voltar',
        tone: backlogStore.isOnline() ? 'good' : 'warn',
      },
      {
        module: 'Decisoes',
        target: decisionsStore.isOnline() ? 'Supabase + cache local' : 'localStorage',
        status: decisionsStore.isOnline() ? 'Frontend grava no banco e mantem cache local' : 'Frontend grava localmente ate o Supabase voltar',
        tone: decisionsStore.isOnline() ? 'good' : 'warn',
      },
      {
        module: 'Roadmap / Trilha',
        target: roadmapStore.isOnline() ? 'Supabase' : 'Leitura sem persistencia',
        status: roadmapStore.isOnline() ? 'Toggle de tarefas grava no banco' : 'Sem Supabase ativo, nao salva alteracoes',
        tone: roadmapStore.isOnline() ? 'good' : 'warn',
      },
      {
        module: 'Academy / Produtos Digitais',
        target: academyStore.isOnline() ? 'Supabase + localStorage' : 'localStorage',
        status: academyStore.isOnline()
          ? 'Tenta gravar no banco e mantem fallback local se a migration ainda nao estiver aplicada'
          : 'Funciona em fallback local ate o banco estar pronto',
        tone: academyStore.isOnline() ? 'good' : 'warn',
      },
      {
        module: 'Portfolio / Biblioteca / Visao / Brand',
        target: 'Somente leitura',
        status: 'Esses modulos nao possuem CRUD proprio hoje',
        tone: 'neutral',
      },
    ];
  }, [supabaseReady]);

  const checklistProgress = checklistDraft.length === 0
    ? 0
    : Math.round((checklistDraft.filter((item) => item.done).length / checklistDraft.length) * 100);

  if (loading || !workspace || !productDraft) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="text-muted text-sm">Carregando workspace do Academy...</div>
      </div>
    );
  }

  const saveProduct = async () => {
    const next = await academyStore.saveProduct(productDraft);
    setWorkspace(next);
    setProductDraft(next.product);
    setChecklistDraft(next.checklist);
    setSaveMessage('Produto salvo');
  };

  const saveAsset = async () => {
    if (!assetDraft?.title) {
      alert('Titulo do asset obrigatorio.');
      return;
    }
    const next = await academyStore.saveAsset(assetDraft);
    setWorkspace(next);
    setAssetDraft(null);
    setSaveMessage('Asset salvo');
  };

  const saveCreationRecord = async () => {
    if (!creationDraft?.title) {
      alert('Titulo do registro obrigatorio.');
      return;
    }
    const next = await academyStore.saveCreationRecord(creationDraft);
    setWorkspace(next);
    setCreationDraft(null);
    setTagInput('');
    setSaveMessage('Registro de criacao salvo');
  };

  const saveScenario = async () => {
    if (!scenarioDraft?.name) {
      alert('Nome do cenario obrigatorio.');
      return;
    }
    const next = await academyStore.saveScenario(scenarioDraft);
    setWorkspace(next);
    setScenarioDraft(null);
    setSaveMessage('Cenario salvo');
  };

  const saveQuestion = async () => {
    if (!questionDraft?.title || !questionDraft.next_step) {
      alert('Preencha pelo menos titulo e proximo passo.');
      return;
    }
    const next = await academyStore.saveQuestion(questionDraft);
    setWorkspace(next);
    setQuestionDraft(null);
    setSaveMessage('Questao salva');
  };

  const saveChecklist = async () => {
    const validItems = checklistDraft.filter((item) => item.title.trim().length > 0);
    const next = await academyStore.saveChecklist(validItems);
    setWorkspace(next);
    setChecklistDraft(next.checklist);
    setSaveMessage('Checklist salvo');
  };

  const removeAsset = async (id: string) => {
    if (!confirm('Remover este asset?')) return;
    const next = await academyStore.deleteAsset(id);
    setWorkspace(next);
    setSaveMessage('Asset removido');
  };

  const removeCreationRecord = async (id: string) => {
    if (!confirm('Remover este registro de criacao?')) return;
    const next = await academyStore.deleteCreationRecord(id);
    setWorkspace(next);
    setSaveMessage('Registro removido');
  };

  const removeScenario = async (id: string) => {
    if (!confirm('Remover este cenario?')) return;
    const next = await academyStore.deleteScenario(id);
    setWorkspace(next);
    setSaveMessage('Cenario removido');
  };

  const removeQuestion = async (id: string) => {
    if (!confirm('Remover esta questao?')) return;
    const next = await academyStore.deleteQuestion(id);
    setWorkspace(next);
    setSaveMessage('Questao removida');
  };

  const updateChecklistItem = (id: string, patch: Partial<AcademyChecklistItem>) => {
    setChecklistDraft((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  const addTag = () => {
    if (!creationDraft || !tagInput.trim()) return;
    const tag = tagInput.trim();
    if (!creationDraft.tags.includes(tag)) {
      setCreationDraft({ ...creationDraft, tags: [...creationDraft.tags, tag] });
    }
    setTagInput('');
  };

  const removeTag = (tag: string) => {
    if (!creationDraft) return;
    setCreationDraft({ ...creationDraft, tags: creationDraft.tags.filter((item) => item !== tag) });
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Educação"
        title="Academy"
        subtitle={
          <>
            Base operacional dos produtos digitais do Academy: oferta, assets, PDF final, dados de criacao e cenarios de venda.
            <span className="block text-xs font-mono text-muted mt-2">
              Atualizado em {new Date(workspace.updated_at).toLocaleString('pt-BR')}
            </span>
          </>
        }
        actions={
          <>
            <span className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-2 ${
              academyStore.isOnline()
                ? 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300'
                : 'border-amber-400/30 bg-amber-400/10 text-amber-300'
            }`}>
              {academyStore.isOnline() ? <Cloud size={14} /> : <HardDrive size={14} />}
              {academyStore.isOnline() ? 'Academy pronto para Supabase' : 'Academy em fallback local'}
            </span>
            <button onClick={load} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Recarregar">
              <RefreshCw size={16} />
            </button>
            <button
              onClick={() => academyStore.downloadExport('json')}
              className="px-3 py-2 bg-surface-high hover:bg-surface-highest text-sm flex items-center gap-2"
            >
              <Download size={14} /> JSON
            </button>
            <button
              onClick={() => academyStore.downloadExport('md')}
              className="px-3 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2"
            >
              <Download size={14} /> Markdown
            </button>
          </>
        }
      />

      <div className="space-y-8">
      <TravasBanner />

      {saveMessage && (
        <div className="bg-emerald-400/10 border border-emerald-400/30 px-4 py-3 text-sm text-emerald-300">
          {saveMessage}
        </div>
      )}

      <section className="bg-surface-low border border-outline/10 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className="text-xl font-semibold">Produto em foco</h2>
            <p className="text-sm text-on-surface-variant">O produto principal do workspace, pronto para crescer para outros produtos depois.</p>
          </div>
          <button onClick={saveProduct} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2">
            <Save size={14} /> Salvar produto
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Field label="Slug">
            <input className={inputClass} value={productDraft.slug} onChange={(e) => setProductDraft({ ...productDraft, slug: e.target.value })} />
          </Field>
          <Field label="Status">
            <select className={inputClass} value={productDraft.status} onChange={(e) => setProductDraft({ ...productDraft, status: e.target.value as AcademyProductStatus })}>
              {Object.entries(productStatusLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Tipo de oferta">
            <select className={inputClass} value={productDraft.offer_type} onChange={(e) => setProductDraft({ ...productDraft, offer_type: e.target.value as AcademyOfferType })}>
              {Object.entries(offerTypeLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </Field>
          <Field label="Nome do produto" col={2}>
            <input className={inputClass} value={productDraft.product_name} onChange={(e) => setProductDraft({ ...productDraft, product_name: e.target.value })} />
          </Field>
          <Field label="Linha">
            <input className={inputClass} value={productDraft.line} onChange={(e) => setProductDraft({ ...productDraft, line: e.target.value })} />
          </Field>
          <Field label="Subtitulo" col={3}>
            <input className={inputClass} value={productDraft.subtitle} onChange={(e) => setProductDraft({ ...productDraft, subtitle: e.target.value })} />
          </Field>
          <Field label="Promessa" col={3}>
            <textarea className={textareaClass} value={productDraft.promise} onChange={(e) => setProductDraft({ ...productDraft, promise: e.target.value })} />
          </Field>
          <Field label="Preco (BRL)">
            <input
              type="number"
              step="0.01"
              className={inputClass}
              value={productDraft.price_brl ?? ''}
              onChange={(e) => setProductDraft({ ...productDraft, price_brl: e.target.value ? parseFloat(e.target.value) : null })}
            />
          </Field>
          <Field label="Duracao de acesso (dias)">
            <input
              type="number"
              className={inputClass}
              value={productDraft.access_duration_days ?? ''}
              onChange={(e) => setProductDraft({ ...productDraft, access_duration_days: e.target.value ? parseInt(e.target.value, 10) : null })}
            />
          </Field>
          <Field label="Condicao de lancamento">
            <input className={inputClass} value={productDraft.launch_condition} onChange={(e) => setProductDraft({ ...productDraft, launch_condition: e.target.value })} />
          </Field>
          <Field label="CTA principal">
            <input className={inputClass} value={productDraft.main_cta} onChange={(e) => setProductDraft({ ...productDraft, main_cta: e.target.value })} />
          </Field>
          <Field label="CTA secundario">
            <input className={inputClass} value={productDraft.secondary_cta} onChange={(e) => setProductDraft({ ...productDraft, secondary_cta: e.target.value })} />
          </Field>
          <Field label="Delivery mode">
            <input className={inputClass} value={productDraft.delivery_mode} onChange={(e) => setProductDraft({ ...productDraft, delivery_mode: e.target.value })} />
          </Field>
          <Field label="Delivery provider">
            <input className={inputClass} value={productDraft.delivery_provider} onChange={(e) => setProductDraft({ ...productDraft, delivery_provider: e.target.value })} />
          </Field>
          <Field label="Sales page URL" col={2}>
            <input className={inputClass} value={productDraft.sales_page_url} onChange={(e) => setProductDraft({ ...productDraft, sales_page_url: e.target.value })} />
          </Field>
          <Field label="Checkout URL">
            <input className={inputClass} value={productDraft.checkout_url} onChange={(e) => setProductDraft({ ...productDraft, checkout_url: e.target.value })} />
          </Field>
          <Field label="Publico principal">
            <textarea className={textareaClass} value={productDraft.primary_audience} onChange={(e) => setProductDraft({ ...productDraft, primary_audience: e.target.value })} />
          </Field>
          <Field label="Publico secundario">
            <textarea className={textareaClass} value={productDraft.secondary_audience} onChange={(e) => setProductDraft({ ...productDraft, secondary_audience: e.target.value })} />
          </Field>
          <Field label="Entrega central" col={3}>
            <textarea className={textareaClass} value={productDraft.core_delivery} onChange={(e) => setProductDraft({ ...productDraft, core_delivery: e.target.value })} />
          </Field>
          <Field label="Foco atual">
            <textarea className={textareaClass} value={productDraft.current_focus} onChange={(e) => setProductDraft({ ...productDraft, current_focus: e.target.value })} />
          </Field>
          <Field label="Notas">
            <textarea className={textareaClass} value={productDraft.notes} onChange={(e) => setProductDraft({ ...productDraft, notes: e.target.value })} />
          </Field>
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-surface-low border border-outline/10 p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Image className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-semibold">Assets do produto</h2>
              </div>
              <p className="text-sm text-on-surface-variant">Capas, PDF final, mockups e qualquer arquivo importante da oferta.</p>
            </div>
            <button onClick={() => setAssetDraft(emptyAsset())} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2">
              <Plus size={14} /> Novo asset
            </button>
          </div>

          {assetDraft && (
            <div className="bg-surface-lowest border border-secondary p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Editar asset</h3>
                <button onClick={() => setAssetDraft(null)} className="p-1 hover:bg-surface-highest">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Titulo">
                  <input className={inputClass} value={assetDraft.title} onChange={(e) => setAssetDraft({ ...assetDraft, title: e.target.value })} />
                </Field>
                <Field label="Tipo">
                  <select className={inputClass} value={assetDraft.asset_type} onChange={(e) => setAssetDraft({ ...assetDraft, asset_type: e.target.value as AcademyAssetType })}>
                    {Object.entries(assetTypeLabel).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={inputClass} value={assetDraft.status} onChange={(e) => setAssetDraft({ ...assetDraft, status: e.target.value as AcademyAssetStatus })}>
                    {Object.entries(assetStatusLabel).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Versao">
                  <input className={inputClass} value={assetDraft.version_label} onChange={(e) => setAssetDraft({ ...assetDraft, version_label: e.target.value })} />
                </Field>
                <Field label="Storage provider">
                  <input className={inputClass} value={assetDraft.storage_provider} onChange={(e) => setAssetDraft({ ...assetDraft, storage_provider: e.target.value })} />
                </Field>
                <Field label="Bucket">
                  <input className={inputClass} value={assetDraft.storage_bucket} onChange={(e) => setAssetDraft({ ...assetDraft, storage_bucket: e.target.value })} />
                </Field>
                <Field label="Storage path" col={2}>
                  <input className={inputClass} value={assetDraft.storage_path} onChange={(e) => setAssetDraft({ ...assetDraft, storage_path: e.target.value })} />
                </Field>
                <Field label="File URL" col={2}>
                  <input className={inputClass} value={assetDraft.file_url} onChange={(e) => setAssetDraft({ ...assetDraft, file_url: e.target.value })} />
                </Field>
                <Field label="Mime type">
                  <input className={inputClass} value={assetDraft.mime_type} onChange={(e) => setAssetDraft({ ...assetDraft, mime_type: e.target.value })} />
                </Field>
                <Field label="Tamanho em bytes">
                  <input
                    type="number"
                    className={inputClass}
                    value={assetDraft.file_size_bytes ?? ''}
                    onChange={(e) => setAssetDraft({ ...assetDraft, file_size_bytes: e.target.value ? parseInt(e.target.value, 10) : null })}
                  />
                </Field>
                <div className="md:col-span-2">
                  <label className="flex items-center gap-3 py-2">
                    <input
                      type="checkbox"
                      checked={assetDraft.is_primary}
                      onChange={(e) => setAssetDraft({ ...assetDraft, is_primary: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="text-sm text-on-surface">Marcar como asset principal deste tipo</span>
                  </label>
                </div>
                <Field label="Notas" col={2}>
                  <textarea className={textareaClass} value={assetDraft.notes} onChange={(e) => setAssetDraft({ ...assetDraft, notes: e.target.value })} />
                </Field>
              </div>
              <div className="flex gap-2">
                <button onClick={saveAsset} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm">Salvar asset</button>
                <button onClick={() => setAssetDraft(null)} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {workspace.assets.map((asset) => (
              <div key={asset.id} className="bg-surface border border-outline/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-on-surface">{asset.title}</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-low text-muted border border-outline/10">
                        {assetTypeLabel[asset.asset_type]}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/40">
                        {assetStatusLabel[asset.status]}
                      </span>
                      {asset.is_primary && (
                        <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-emerald-400/10 text-emerald-300 border border-emerald-400/30">
                          principal
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-muted mt-2 break-all">
                      {asset.file_url || asset.storage_path || 'Sem URL ou path ainda'}
                    </div>
                    {asset.notes && <div className="text-sm text-on-surface-variant mt-2">{asset.notes}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setAssetDraft({ ...asset })} className="p-1.5 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface text-sm">Edit</button>
                    <button onClick={() => removeAsset(asset.id)} className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-low border border-outline/10 p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-semibold">Dados de criacao</h2>
              </div>
              <p className="text-sm text-on-surface-variant">Prompts, copy, editorial, design e referencias do produto.</p>
            </div>
            <button onClick={() => setCreationDraft(emptyCreationRecord())} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2">
              <Plus size={14} /> Novo registro
            </button>
          </div>

          {creationDraft && (
            <div className="bg-surface-lowest border border-secondary p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Editar registro de criacao</h3>
                <button onClick={() => { setCreationDraft(null); setTagInput(''); }} className="p-1 hover:bg-surface-highest">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Titulo" col={2}>
                  <input className={inputClass} value={creationDraft.title} onChange={(e) => setCreationDraft({ ...creationDraft, title: e.target.value })} />
                </Field>
                <Field label="Tipo">
                  <select className={inputClass} value={creationDraft.record_type} onChange={(e) => setCreationDraft({ ...creationDraft, record_type: e.target.value as AcademyCreationRecordType })}>
                    {Object.entries(creationTypeLabel).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Status">
                  <select className={inputClass} value={creationDraft.status} onChange={(e) => setCreationDraft({ ...creationDraft, status: e.target.value as AcademyAssetStatus })}>
                    {Object.entries(assetStatusLabel).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Source path" col={2}>
                  <input className={inputClass} value={creationDraft.source_path} onChange={(e) => setCreationDraft({ ...creationDraft, source_path: e.target.value })} />
                </Field>
                <Field label="External URL" col={2}>
                  <input className={inputClass} value={creationDraft.external_url} onChange={(e) => setCreationDraft({ ...creationDraft, external_url: e.target.value })} />
                </Field>
                <Field label="Modelo / IA">
                  <input className={inputClass} value={creationDraft.model_name} onChange={(e) => setCreationDraft({ ...creationDraft, model_name: e.target.value })} />
                </Field>
                <Field label="Criado via">
                  <input className={inputClass} value={creationDraft.created_via} onChange={(e) => setCreationDraft({ ...creationDraft, created_via: e.target.value })} />
                </Field>
                <Field label="Conteudo / resumo" col={2}>
                  <textarea className={textareaClass} value={creationDraft.content_md} onChange={(e) => setCreationDraft({ ...creationDraft, content_md: e.target.value })} />
                </Field>
                <Field label="Notas" col={2}>
                  <textarea className={textareaClass} value={creationDraft.notes} onChange={(e) => setCreationDraft({ ...creationDraft, notes: e.target.value })} />
                </Field>
                <div className="md:col-span-2">
                  <label className="block text-xs font-medium text-muted mb-1.5">Tags</label>
                  <div className="flex gap-2 mb-2">
                    <input
                      className={inputClass}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addTag(); } }}
                      placeholder="ex: landing"
                    />
                    <button onClick={addTag} className="px-3 py-2 bg-surface-high text-xs">Add</button>
                  </div>
                  <div className="flex gap-1.5 flex-wrap">
                    {creationDraft.tags.map((tag) => (
                      <span key={tag} className="text-xs px-2 py-1 bg-secondary/15 text-secondary rounded flex items-center gap-1">
                        #{tag}
                        <button onClick={() => removeTag(tag)}><X size={10} /></button>
                      </span>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={saveCreationRecord} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm">Salvar registro</button>
                <button onClick={() => { setCreationDraft(null); setTagInput(''); }} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {workspace.creation_records.map((record) => (
              <div key={record.id} className="bg-surface border border-outline/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-on-surface">{record.title}</span>
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-surface-low text-muted border border-outline/10">
                        {creationTypeLabel[record.record_type]}
                      </span>
                      <span className="text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded-full bg-secondary-container/40 text-secondary border border-secondary/40">
                        {assetStatusLabel[record.status]}
                      </span>
                    </div>
                    <div className="text-xs text-muted mt-2 break-all">
                      {record.source_path || record.external_url || 'Sem referencia registrada'}
                    </div>
                    {record.tags.length > 0 && (
                      <div className="flex gap-1.5 flex-wrap mt-2">
                        {record.tags.map((tag) => (
                          <span key={tag} className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-secondary/15 text-secondary border border-secondary/40">
                            #{tag}
                          </span>
                        ))}
                      </div>
                    )}
                    {record.notes && <div className="text-sm text-on-surface-variant mt-2">{record.notes}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => { setCreationDraft({ ...record }); setTagInput(''); }} className="p-1.5 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface text-sm">Edit</button>
                    <button onClick={() => removeCreationRecord(record.id)} className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-low border border-outline/10 p-6 space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <Workflow className="w-5 h-5 text-secondary" />
              <h2 className="text-xl font-semibold">Cenarios de venda e entrega</h2>
            </div>
            <p className="text-sm text-on-surface-variant">Aqui a gente compara os trilhos antes de fechar o fluxo definitivo.</p>
          </div>
          <button onClick={() => setScenarioDraft(emptyScenario())} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2">
            <Plus size={14} /> Novo cenario
          </button>
        </div>

        {scenarioDraft && (
          <div className="bg-surface-lowest border border-secondary p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="font-semibold text-sm">Editar cenario</h3>
              <button onClick={() => setScenarioDraft(null)} className="p-1 hover:bg-surface-highest">
                <X size={16} />
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Field label="Nome do cenario">
                <input className={inputClass} value={scenarioDraft.name} onChange={(e) => setScenarioDraft({ ...scenarioDraft, name: e.target.value })} />
              </Field>
              <Field label="Status">
                <select className={inputClass} value={scenarioDraft.status} onChange={(e) => setScenarioDraft({ ...scenarioDraft, status: e.target.value as AcademyScenarioStatus })}>
                  {Object.entries(scenarioStatusLabel).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </Field>
              <Field label="Landing">
                <input className={inputClass} value={scenarioDraft.landing} onChange={(e) => setScenarioDraft({ ...scenarioDraft, landing: e.target.value })} />
              </Field>
              <Field label="Checkout">
                <input className={inputClass} value={scenarioDraft.checkout} onChange={(e) => setScenarioDraft({ ...scenarioDraft, checkout: e.target.value })} />
              </Field>
              <Field label="Entrega">
                <input className={inputClass} value={scenarioDraft.delivery} onChange={(e) => setScenarioDraft({ ...scenarioDraft, delivery: e.target.value })} />
              </Field>
              <Field label="Liberacao de acesso">
                <input className={inputClass} value={scenarioDraft.access_release} onChange={(e) => setScenarioDraft({ ...scenarioDraft, access_release: e.target.value })} />
              </Field>
              <Field label="Sort order">
                <input
                  type="number"
                  className={inputClass}
                  value={scenarioDraft.sort_order}
                  onChange={(e) => setScenarioDraft({ ...scenarioDraft, sort_order: parseInt(e.target.value || '0', 10) })}
                />
              </Field>
              <Field label="Suporte">
                <input className={inputClass} value={scenarioDraft.support} onChange={(e) => setScenarioDraft({ ...scenarioDraft, support: e.target.value })} />
              </Field>
              <Field label="Resumo" col={2}>
                <textarea className={textareaClass} value={scenarioDraft.summary} onChange={(e) => setScenarioDraft({ ...scenarioDraft, summary: e.target.value })} />
              </Field>
              <Field label="Pros">
                <textarea className={textareaClass} value={scenarioDraft.pros} onChange={(e) => setScenarioDraft({ ...scenarioDraft, pros: e.target.value })} />
              </Field>
              <Field label="Contras">
                <textarea className={textareaClass} value={scenarioDraft.cons} onChange={(e) => setScenarioDraft({ ...scenarioDraft, cons: e.target.value })} />
              </Field>
              <Field label="Notas" col={2}>
                <textarea className={textareaClass} value={scenarioDraft.notes} onChange={(e) => setScenarioDraft({ ...scenarioDraft, notes: e.target.value })} />
              </Field>
            </div>
            <div className="flex gap-2">
              <button onClick={saveScenario} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm">Salvar cenario</button>
              <button onClick={() => setScenarioDraft(null)} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {workspace.scenarios.map((scenario) => (
            <div key={scenario.id} className="bg-surface border border-outline/10 p-5 space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className={`inline-flex px-2 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border ${scenarioStatusClass[scenario.status]}`}>
                    {scenarioStatusLabel[scenario.status]}
                  </div>
                  <h3 className="text-lg font-semibold mt-2">{scenario.name}</h3>
                  <p className="text-sm text-on-surface-variant mt-1">{scenario.summary}</p>
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setScenarioDraft({ ...scenario })} className="p-1.5 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface text-sm">Edit</button>
                  <button onClick={() => removeScenario(scenario.id)} className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoItem label="Landing" value={scenario.landing} />
                <InfoItem label="Checkout" value={scenario.checkout} />
                <InfoItem label="Entrega" value={scenario.delivery} />
                <InfoItem label="Acesso" value={scenario.access_release} />
              </div>

              <div className="space-y-2 text-sm">
                <LongInfo label="Suporte" value={scenario.support} />
                <LongInfo label="Pros" value={scenario.pros} />
                <LongInfo label="Contras" value={scenario.cons} />
                {scenario.notes && <LongInfo label="Notas" value={scenario.notes} />}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[1.2fr_0.8fr] gap-6">
        <div className="bg-surface-low border border-outline/10 p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <Layers3 className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-semibold">Questoes e decisoes em aberto</h2>
              </div>
              <p className="text-sm text-on-surface-variant">Pontos que ainda precisam fechar para nao misturar plataforma, checkout, acesso e entrega.</p>
            </div>
            <button onClick={() => setQuestionDraft(emptyQuestion())} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2">
              <Plus size={14} /> Nova questao
            </button>
          </div>

          {questionDraft && (
            <div className="bg-surface-lowest border border-secondary p-5 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h3 className="font-semibold text-sm">Editar questao</h3>
                <button onClick={() => setQuestionDraft(null)} className="p-1 hover:bg-surface-highest">
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Field label="Titulo" col={2}>
                  <input className={inputClass} value={questionDraft.title} onChange={(e) => setQuestionDraft({ ...questionDraft, title: e.target.value })} />
                </Field>
                <Field label="Status">
                  <select className={inputClass} value={questionDraft.status} onChange={(e) => setQuestionDraft({ ...questionDraft, status: e.target.value as AcademyQuestionStatus })}>
                    {Object.entries(questionStatusLabel).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Owner">
                  <input className={inputClass} value={questionDraft.owner} onChange={(e) => setQuestionDraft({ ...questionDraft, owner: e.target.value })} />
                </Field>
                <Field label="Sort order">
                  <input
                    type="number"
                    className={inputClass}
                    value={questionDraft.sort_order}
                    onChange={(e) => setQuestionDraft({ ...questionDraft, sort_order: parseInt(e.target.value || '0', 10) })}
                  />
                </Field>
                <Field label="Proximo passo" col={2}>
                  <textarea className={textareaClass} value={questionDraft.next_step} onChange={(e) => setQuestionDraft({ ...questionDraft, next_step: e.target.value })} />
                </Field>
                <Field label="Notas" col={2}>
                  <textarea className={textareaClass} value={questionDraft.notes} onChange={(e) => setQuestionDraft({ ...questionDraft, notes: e.target.value })} />
                </Field>
              </div>
              <div className="flex gap-2">
                <button onClick={saveQuestion} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm">Salvar questao</button>
                <button onClick={() => setQuestionDraft(null)} className="px-4 py-2 bg-surface-high text-sm">Cancelar</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {workspace.questions.map((question) => (
              <div key={question.id} className="bg-surface border border-outline/10 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1">
                    <div className={`inline-flex px-2 py-1 rounded-full text-[10px] font-mono uppercase tracking-widest border ${questionStatusClass[question.status]}`}>
                      {questionStatusLabel[question.status]}
                    </div>
                    <div className="font-medium text-on-surface mt-2">{question.title}</div>
                    <div className="text-xs font-mono text-muted mt-1">owner: {question.owner || 'sem owner'}</div>
                    <div className="text-sm text-on-surface-variant mt-3">{question.next_step}</div>
                    {question.notes && <div className="text-sm text-on-surface-variant mt-2">{question.notes}</div>}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <button onClick={() => setQuestionDraft({ ...question })} className="p-1.5 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface text-sm">Edit</button>
                    <button onClick={() => removeQuestion(question.id)} className="p-1.5 hover:bg-red-500/10 rounded text-muted hover:text-red-400">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-surface-low border border-outline/10 p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-secondary" />
                <h2 className="text-xl font-semibold">Checklist operacional</h2>
              </div>
              <p className="text-sm text-on-surface-variant">O que precisa estar redondo antes de colocar o fluxo para rodar.</p>
            </div>
            <button onClick={saveChecklist} className="px-4 py-2 bg-secondary hover:bg-secondary/90 text-sm flex items-center gap-2">
              <Save size={14} /> Salvar checklist
            </button>
          </div>

          <button
            onClick={() => setChecklistDraft((prev) => {
              const last = prev.length > 0 ? prev[prev.length - 1] : null;
              return [...prev, emptyChecklistItem((last?.sort_order || 0) + 10)];
            })}
            className="px-3 py-2 bg-surface-high hover:bg-surface-highest text-sm flex items-center gap-2"
          >
            <Plus size={14} /> Novo item
          </button>

          <div className="bg-surface border border-outline/10 p-4">
            <div className="flex items-center justify-between text-sm mb-2">
              <span className="text-on-surface-variant">Progresso</span>
              <span className="font-mono text-secondary">{checklistProgress}%</span>
            </div>
            <div className="h-2 bg-surface-lowest rounded-full overflow-hidden">
              <div className="h-full bg-secondary" style={{ width: `${checklistProgress}%` }} />
            </div>
          </div>

          <div className="space-y-3">
            {checklistDraft.map((item) => (
              <div key={item.id} className="bg-surface border border-outline/10 p-4">
                <div className="flex items-start gap-3">
                  <button
                    onClick={() => updateChecklistItem(item.id, { done: !item.done })}
                    className="mt-0.5 hover:scale-105 transition-transform"
                    title="Alternar status"
                  >
                    {item.done ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-300" />
                    ) : (
                      <Circle className="w-5 h-5 text-muted" />
                    )}
                  </button>
                  <div className="flex-1 space-y-3">
                    <div className="grid grid-cols-1 md:grid-cols-[1fr_140px_120px] gap-3">
                      <input
                        className={inputClass}
                        value={item.title}
                        onChange={(e) => updateChecklistItem(item.id, { title: e.target.value })}
                        placeholder="Titulo do item"
                      />
                      <select
                        className={inputClass}
                        value={item.area}
                        onChange={(e) => updateChecklistItem(item.id, { area: e.target.value as AcademyChecklistArea })}
                      >
                        {Object.entries(checklistAreaLabel).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                      <input
                        type="number"
                        className={inputClass}
                        value={item.sort_order}
                        onChange={(e) => updateChecklistItem(item.id, { sort_order: parseInt(e.target.value || '0', 10) })}
                      />
                    </div>
                    <textarea
                      className={`${inputClass} min-h-[72px]`}
                      value={item.notes}
                      onChange={(e) => updateChecklistItem(item.id, { notes: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-surface-low border border-outline/10 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-secondary" />
          <h2 className="text-xl font-semibold">Auditoria de persistencia do frontend</h2>
        </div>
        <p className="text-sm text-on-surface-variant">
          Resumo rapido para sabermos o que o app ja grava de verdade e onde ainda existe gap de persistencia.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {persistenceAudit.map((item) => (
            <div key={item.module} className="bg-surface border border-outline/10 p-4 space-y-2">
              <div className="font-medium text-on-surface">{item.module}</div>
              <div className={`text-xs inline-flex px-2 py-1 rounded-full border ${
                item.tone === 'good'
                  ? 'text-emerald-300 bg-emerald-400/10 border-emerald-400/30'
                  : item.tone === 'warn'
                  ? 'text-amber-300 bg-amber-400/10 border-amber-400/30'
                  : item.tone === 'bad'
                  ? 'text-red-300 bg-red-400/10 border-red-400/30'
                  : 'text-on-surface-variant bg-surface-low border-outline/10'
              }`}>
                {item.target}
              </div>
              <p className="text-sm text-on-surface-variant">{item.status}</p>
            </div>
          ))}
        </div>
      </section>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
  col = 1,
}: {
  label: string;
  children: ReactNode;
  col?: 1 | 2 | 3;
}) {
  const colClass = col === 3 ? 'md:col-span-3' : col === 2 ? 'md:col-span-2' : '';
  return (
    <div className={colClass}>
      <label className="block text-xs font-medium text-muted mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function InfoItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">{label}</div>
      <div className="text-on-surface">{value || '-'}</div>
    </div>
  );
}

function LongInfo({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1">{label}</div>
      <div className="text-on-surface-variant">{value || '-'}</div>
    </div>
  );
}
