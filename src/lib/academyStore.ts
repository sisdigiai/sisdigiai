import { supabase } from './supabase';

export type AcademyScenarioStatus = 'recommended' | 'testing' | 'draft' | 'hold' | 'rejected';
export type AcademyQuestionStatus = 'open' | 'deciding' | 'blocked' | 'done';
export type AcademyChecklistArea = 'offer' | 'sales' | 'delivery' | 'analytics' | 'support';
export type AcademyProductStatus = 'draft' | 'planned' | 'in_production' | 'ready_for_sale' | 'live' | 'archived';
export type AcademyOfferType = 'lead_magnet' | 'low_ticket' | 'workshop' | 'manual' | 'course' | 'consulting' | 'other';
export type AcademyAssetType = 'cover' | 'pdf' | 'mockup' | 'thumbnail' | 'bonus' | 'checkout' | 'supporting_doc' | 'other';
export type AcademyAssetStatus = 'draft' | 'ready' | 'archived';
export type AcademyCreationRecordType = 'brief' | 'prompt' | 'copy' | 'design' | 'research' | 'editorial' | 'operation' | 'decision' | 'other';

export type AcademyProduct = {
  id?: string;
  slug: string;
  line: string;
  product_name: string;
  subtitle: string;
  status: AcademyProductStatus;
  offer_type: AcademyOfferType;
  price_brl: number | null;
  launch_condition: string;
  promise: string;
  main_cta: string;
  secondary_cta: string;
  primary_audience: string;
  secondary_audience: string;
  core_delivery: string;
  current_focus: string;
  notes: string;
  sales_page_url: string;
  checkout_url: string;
  delivery_mode: string;
  delivery_provider: string;
  access_duration_days: number | null;
  metadata: Record<string, unknown>;
  updated_at?: string;
};

export type AcademyAsset = {
  id: string;
  product_id?: string;
  asset_type: AcademyAssetType;
  title: string;
  status: AcademyAssetStatus;
  version_label: string;
  storage_provider: string;
  storage_bucket: string;
  storage_path: string;
  file_url: string;
  mime_type: string;
  file_size_bytes: number | null;
  is_primary: boolean;
  notes: string;
  metadata: Record<string, unknown>;
};

export type AcademyCreationRecord = {
  id: string;
  product_id?: string;
  record_type: AcademyCreationRecordType;
  title: string;
  status: AcademyAssetStatus;
  content_md: string;
  source_path: string;
  external_url: string;
  model_name: string;
  created_via: string;
  tags: string[];
  notes: string;
  metadata: Record<string, unknown>;
};

export type AcademyScenario = {
  id: string;
  product_id?: string;
  name: string;
  status: AcademyScenarioStatus;
  landing: string;
  checkout: string;
  delivery: string;
  access_release: string;
  support: string;
  summary: string;
  pros: string;
  cons: string;
  notes: string;
  sort_order: number;
};

export type AcademyQuestion = {
  id: string;
  product_id?: string;
  title: string;
  status: AcademyQuestionStatus;
  owner: string;
  next_step: string;
  notes: string;
  sort_order: number;
};

export type AcademyChecklistItem = {
  id: string;
  product_id?: string;
  title: string;
  area: AcademyChecklistArea;
  done: boolean;
  notes: string;
  sort_order: number;
};

export type AcademyWorkspace = {
  version: 2;
  updated_at: string;
  product: AcademyProduct;
  assets: AcademyAsset[];
  creation_records: AcademyCreationRecord[];
  scenarios: AcademyScenario[];
  questions: AcademyQuestion[];
  checklist: AcademyChecklistItem[];
};

const LS_KEY = 'digiai_academy_workspace';
const DEFAULT_SLUG = 'otica-sem-improviso';

function isSupabaseReady(): boolean {
  const url = import.meta.env.VITE_SUPABASE_URL;
  const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
  return !!url && !!key && !url.includes('placeholder');
}

function defaultProduct(): AcademyProduct {
  return {
    slug: DEFAULT_SLUG,
    line: 'clearix_academy',
    product_name: 'Ótica Sem Improviso',
    subtitle: 'Manual Visual + App para Atendimento, WhatsApp e Objecoes em Oticas',
    status: 'in_production',
    offer_type: 'low_ticket',
    price_brl: 47.90,
    launch_condition: 'Preco de estreia para a turma inicial',
    promise: 'Sair do atendimento no improviso, responder melhor no WhatsApp e vender com mais seguranca enquanto a otica e apresentada de forma sutil ao Clearix.',
    main_cta: 'Quero atender sem improviso',
    secondary_cta: 'Ver o que vem dentro',
    primary_audience: 'Vendedor, atendente, consultor optico e colaborador de linha de frente.',
    secondary_audience: 'Gestores e donos que querem treinar a equipe sem virar curso generico.',
    core_delivery: 'PDF visual principal + app de apoio + scripts de WhatsApp + respostas para objecoes + ponte sutil pro Clearix.',
    current_focus: 'Rodar OSI como isca paga, capturar compradores qualificados e mapear dores para abrir caminho ao Clearix.',
    notes: 'O guia resolve uma parte da dor. O Clearix resolve a rotina. Nexus entra como apoio e continuidade.',
    sales_page_url: '',
    checkout_url: '',
    delivery_mode: 'nexus',
    delivery_provider: 'Nexus',
    access_duration_days: 90,
    metadata: {},
  };
}

function defaultAssets(): AcademyAsset[] {
  return [
    {
      id: crypto.randomUUID(),
      asset_type: 'cover',
      title: 'Capa principal',
      status: 'draft',
      version_label: 'v1',
      storage_provider: 'supabase_storage',
      storage_bucket: '',
      storage_path: '',
      file_url: '',
      mime_type: 'image/png',
      file_size_bytes: null,
      is_primary: true,
      notes: 'Registrar aqui a capa final aprovada do produto.',
      metadata: {},
    },
    {
      id: crypto.randomUUID(),
      asset_type: 'pdf',
      title: 'PDF master do produto',
      status: 'draft',
      version_label: 'v1',
      storage_provider: 'supabase_storage',
      storage_bucket: '',
      storage_path: '',
      file_url: '',
      mime_type: 'application/pdf',
      file_size_bytes: null,
      is_primary: true,
      notes: 'Subir aqui o PDF pronto para entrega e marcar a versao final.',
      metadata: {},
    },
  ];
}

function defaultCreationRecords(): AcademyCreationRecord[] {
  return [
    {
      id: crypto.randomUUID(),
      record_type: 'decision',
      title: 'Arquitetura do ecossistema Clearix',
      status: 'ready',
      content_md: '',
      source_path: 'docs_sync/05-marketing/produtos/otica-sem-improviso/01-estrategia/arquitetura-ecossistema-apps-oticas.md',
      external_url: '',
      model_name: '',
      created_via: 'manual',
      tags: ['ecossistema', 'apps', 'academy', 'low-ticket'],
      notes: 'Tese central: guias pagos compram compradores e preparam ascensao para apps.',
      metadata: {},
    },
    {
      id: crypto.randomUUID(),
      record_type: 'operation',
      title: 'Plano de funil e configuracao OSI',
      status: 'ready',
      content_md: '',
      source_path: 'docs_sync/05-marketing/produtos/otica-sem-improviso/04-operacao-e-venda/plano-configuracao-funil-osi.md',
      external_url: '',
      model_name: '',
      created_via: 'manual',
      tags: ['funil', 'kiwify', 'trafego', 'roas'],
      notes: 'Configura checkout, bumps, upsell, teste ABO, KPIs e easter eggs.',
      metadata: {},
    },
    {
      id: crypto.randomUUID(),
      record_type: 'operation',
      title: 'Regua de recuperacao de carrinho OSI',
      status: 'ready',
      content_md: '',
      source_path: 'docs_sync/05-marketing/produtos/otica-sem-improviso/04-operacao-e-venda/regua-recuperacao-carrinho-osi.md',
      external_url: '',
      model_name: '',
      created_via: 'manual',
      tags: ['recuperacao', 'whatsapp', 'email', 'qualificacao'],
      notes: 'Recupera venda e qualifica dor pro Clearix.',
      metadata: {},
    },
  ];
}

function defaultScenarios(): AcademyScenario[] {
  return [
    {
      id: crypto.randomUUID(),
      name: 'Landing propria + Kiwify + App/Nexus',
      status: 'recommended',
      landing: 'Landing publica propria da oferta',
      checkout: 'Kiwify com bumps e upsell 1-click',
      delivery: 'App de apoio + Nexus quando aplicavel',
      access_release: 'Liberacao apos pagamento aprovado na plataforma',
      support: 'WhatsApp DIGIAI + email complementar',
      summary: 'Cenario principal para validar OSI como isca paga e capturar compradores qualificados.',
      pros: 'Rapidez operacional, order bumps, upsell 1-click e boa leitura de funil.',
      cons: 'Precisa manter tags e UTMs para nao virar infoproduto solto.',
      notes: 'O objetivo nao e apenas vender o PDF; e preparar ascensao para apps.',
      sort_order: 10,
    },
    {
      id: crypto.randomUUID(),
      name: 'Sequencia de guias por dor + ecossistema',
      status: 'testing',
      landing: 'Landing publica propria da oferta',
      checkout: 'Kiwify por guia',
      delivery: 'PDF + app de apoio por guia',
      access_release: 'Liberacao apos compra confirmada',
      support: 'WhatsApp DIGIAI + onboarding por dor',
      summary: 'Expande OSI para outros guias: WhatsApp, preco, lentes, equipe, pos-venda e indicadores.',
      pros: 'Cria enxame no varejo optico e segmenta a base por dor real.',
      cons: 'Exige governanca editorial para nao dispersar o foco.',
      notes: 'Cada guia deve ter easter eggs sutis do Clearix.',
      sort_order: 20,
    },
    {
      id: crypto.randomUUID(),
      name: 'Tudo na plataforma de venda',
      status: 'hold',
      landing: 'Pagina interna da plataforma',
      checkout: 'Hotmart/Kiwify/HeroSpark',
      delivery: 'Area de membros da propria plataforma',
      access_release: 'Automatico dentro da plataforma',
      support: 'Suporte da plataforma + suporte DIGIAI',
      summary: 'Menos integracao propria, mais rapidez, mas reduz controle do ativo Nexus.',
      pros: 'Operacao mais simples no curto prazo.',
      cons: 'Entrega premium cai, Nexus perde protagonismo e a experiencia fica terceirizada.',
      notes: 'Vale como contingencia, nao como narrativa principal do ecossistema.',
      sort_order: 30,
    },
    {
      id: crypto.randomUUID(),
      name: 'Landing no app + formulario/lista de espera',
      status: 'draft',
      landing: 'Pagina publica no proprio app',
      checkout: 'Sem checkout imediato',
      delivery: 'Definir depois',
      access_release: 'Contato manual ou futura automacao',
      support: 'WhatsApp DIGIAI',
      summary: 'Bom para capturar demanda enquanto a esteira comercial final nao fecha.',
      pros: 'Ja podemos publicar narrativa e captar leads qualificados.',
      cons: 'Nao fecha venda imediata e pode atrasar validacao de ticket.',
      notes: 'Util para pre-lancamento ou lista de espera controlada.',
      sort_order: 40,
    },
  ];
}

function defaultQuestions(): AcademyQuestion[] {
  return [
    {
      id: crypto.randomUUID(),
      title: 'Qual plataforma sera o seller of record principal no MVP?',
      status: 'deciding',
      owner: 'Fundador',
      next_step: 'Comparar Hotmart x Kiwify com criterio de operacao, taxa e confianca percebida.',
      notes: 'Hoje a recomendacao documental pende para Hotmart como trilho principal.',
      sort_order: 10,
    },
    {
      id: crypto.randomUUID(),
      title: 'Como sera a liberacao de acesso no Nexus apos pagamento aprovado?',
      status: 'open',
      owner: 'App + Nexus',
      next_step: 'Definir se a primeira versao sera manual, webhook ou rotina assistida.',
      notes: 'Nao prometer automacao plena antes de testar 1 compra ponta a ponta.',
      sort_order: 20,
    },
    {
      id: crypto.randomUUID(),
      title: 'Precisamos de pagina de obrigado padronizada fora da plataforma?',
      status: 'open',
      owner: 'Academy',
      next_step: 'Fechar fluxo entre landing, obrigado, onboarding e suporte.',
      notes: 'Importante para manter consistencia mesmo com checkout externo.',
      sort_order: 30,
    },
  ];
}

function defaultChecklist(): AcademyChecklistItem[] {
  return [
    {
      id: crypto.randomUUID(),
      title: 'Fechar narrativa oficial da oferta e promessa curta',
      area: 'offer',
      done: true,
      notes: 'Produto, subtitulo, promessa e CTA principal ja estao documentados.',
      sort_order: 10,
    },
    {
      id: crypto.randomUUID(),
      title: 'Publicar landing publica com CTA preparado para checkout ou formulario',
      area: 'sales',
      done: false,
      notes: 'Pode nascer no proprio app com rota publica minima.',
      sort_order: 20,
    },
    {
      id: crypto.randomUUID(),
      title: 'Definir seller of record principal',
      area: 'sales',
      done: false,
      notes: 'Hotmart lidera como cenario principal; Kiwify fica como teste.',
      sort_order: 30,
    },
    {
      id: crypto.randomUUID(),
      title: 'Padronizar pagina de obrigado e onboarding',
      area: 'delivery',
      done: false,
      notes: 'Fluxo recomendado: compra aprovada -> obrigado -> acesso Nexus -> onboarding.',
      sort_order: 40,
    },
    {
      id: crypto.randomUUID(),
      title: 'Definir regra de acesso no Nexus por 90 dias',
      area: 'delivery',
      done: false,
      notes: 'Consumo e curto, mas precisa janela para revisao e suporte.',
      sort_order: 50,
    },
    {
      id: crypto.randomUUID(),
      title: 'Mapear eventos minimos de analytics',
      area: 'analytics',
      done: false,
      notes: 'Landing visit, click checkout, checkout started, purchase approved, first login Nexus.',
      sort_order: 60,
    },
    {
      id: crypto.randomUUID(),
      title: 'Centralizar canal de suporte do lancamento',
      area: 'support',
      done: false,
      notes: 'WhatsApp DIGIAI deve aparecer em obrigado, onboarding e email complementar.',
      sort_order: 70,
    },
  ];
}

function cloneDefaults(): AcademyWorkspace {
  return {
    version: 2,
    updated_at: new Date().toISOString(),
    product: { ...defaultProduct() },
    assets: defaultAssets().map((item) => ({ ...item })),
    creation_records: defaultCreationRecords().map((item) => ({ ...item, tags: [...item.tags] })),
    scenarios: defaultScenarios().map((item) => ({ ...item })),
    questions: defaultQuestions().map((item) => ({ ...item })),
    checklist: defaultChecklist().map((item) => ({ ...item })),
  };
}

function readLocal(slug = DEFAULT_SLUG): AcademyWorkspace {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<AcademyWorkspace>;
    const fallback = cloneDefaults();
    if (parsed.product?.slug && parsed.product.slug !== slug) {
      return fallback;
    }
    return {
      ...fallback,
      ...parsed,
      version: 2,
      product: { ...fallback.product, ...(parsed.product || {}) },
      assets: (parsed.assets || fallback.assets).map((item) => ({
        ...item,
        metadata: item.metadata || {},
      })),
      creation_records: (parsed.creation_records || fallback.creation_records).map((item) => ({
        ...item,
        tags: item.tags || [],
        metadata: item.metadata || {},
      })),
      scenarios: parsed.scenarios || fallback.scenarios,
      questions: parsed.questions || fallback.questions,
      checklist: parsed.checklist || fallback.checklist,
    };
  } catch {
    return cloneDefaults();
  }
}

function writeLocal(data: AcademyWorkspace) {
  localStorage.setItem(LS_KEY, JSON.stringify(data));
}

function withUpdatedAt(data: AcademyWorkspace): AcademyWorkspace {
  return { ...data, updated_at: new Date().toISOString() };
}

function productPayload(product: AcademyProduct) {
  return {
    id: product.id,
    slug: product.slug,
    line: product.line,
    product_name: product.product_name,
    subtitle: product.subtitle || null,
    status: product.status,
    offer_type: product.offer_type,
    price_brl: product.price_brl,
    launch_condition: product.launch_condition || null,
    promise: product.promise || null,
    main_cta: product.main_cta || null,
    secondary_cta: product.secondary_cta || null,
    primary_audience: product.primary_audience || null,
    secondary_audience: product.secondary_audience || null,
    core_delivery: product.core_delivery || null,
    current_focus: product.current_focus || null,
    notes: product.notes || null,
    sales_page_url: product.sales_page_url || null,
    checkout_url: product.checkout_url || null,
    delivery_mode: product.delivery_mode || null,
    delivery_provider: product.delivery_provider || null,
    access_duration_days: product.access_duration_days,
    metadata: product.metadata || {},
  };
}

function assetPayload(asset: AcademyAsset, productId: string) {
  return {
    id: asset.id,
    product_id: productId,
    asset_type: asset.asset_type,
    title: asset.title,
    status: asset.status,
    version_label: asset.version_label || null,
    storage_provider: asset.storage_provider || null,
    storage_bucket: asset.storage_bucket || null,
    storage_path: asset.storage_path || null,
    file_url: asset.file_url || null,
    mime_type: asset.mime_type || null,
    file_size_bytes: asset.file_size_bytes,
    is_primary: asset.is_primary,
    notes: asset.notes || null,
    metadata: asset.metadata || {},
  };
}

function creationPayload(record: AcademyCreationRecord, productId: string) {
  return {
    id: record.id,
    product_id: productId,
    record_type: record.record_type,
    title: record.title,
    status: record.status,
    content_md: record.content_md || null,
    source_path: record.source_path || null,
    external_url: record.external_url || null,
    model_name: record.model_name || null,
    created_via: record.created_via || null,
    tags: record.tags || [],
    notes: record.notes || null,
    metadata: record.metadata || {},
  };
}

function scenarioPayload(scenario: AcademyScenario, productId: string) {
  return {
    id: scenario.id,
    product_id: productId,
    name: scenario.name,
    status: scenario.status,
    landing: scenario.landing || null,
    checkout: scenario.checkout || null,
    delivery: scenario.delivery || null,
    access_release: scenario.access_release || null,
    support: scenario.support || null,
    summary: scenario.summary || null,
    pros: scenario.pros || null,
    cons: scenario.cons || null,
    notes: scenario.notes || null,
    sort_order: scenario.sort_order,
  };
}

function questionPayload(question: AcademyQuestion, productId: string) {
  return {
    id: question.id,
    product_id: productId,
    title: question.title,
    status: question.status,
    owner: question.owner || null,
    next_step: question.next_step || null,
    notes: question.notes || null,
    sort_order: question.sort_order,
  };
}

function checklistPayload(item: AcademyChecklistItem, productId: string) {
  return {
    id: item.id,
    product_id: productId,
    title: item.title,
    area: item.area,
    done: item.done,
    notes: item.notes || null,
    sort_order: item.sort_order,
  };
}

async function fetchRemoteWorkspace(slug = DEFAULT_SLUG): Promise<AcademyWorkspace | null> {
  if (!isSupabaseReady()) return null;

  const local = readLocal();

  let { data: product, error: productError } = await supabase
    .from('v_academy_products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (productError) {
    console.error('[academyStore] fetch product', productError);
    return null;
  }

  if (!product) {
    const bootstrap = productPayload(local.product);
    const { data: inserted, error: insertError } = await supabase
      .schema('academy')
      .from('products')
      .upsert(bootstrap, { onConflict: 'slug' })
      .select()
      .maybeSingle();

    if (insertError) {
      console.error('[academyStore] bootstrap product', insertError);
      return null;
    }

    product = inserted || null;
  }

  if (!product?.id) return null;

  const productId = product.id as string;

  const [
    assetsRes,
    creationRes,
    scenariosRes,
    questionsRes,
    checklistRes,
  ] = await Promise.all([
    supabase.from('v_academy_product_assets').select('*').eq('product_id', productId),
    supabase.from('v_academy_product_creation_records').select('*').eq('product_id', productId),
    supabase.from('v_academy_product_scenarios').select('*').eq('product_id', productId),
    supabase.from('v_academy_product_questions').select('*').eq('product_id', productId),
    supabase.from('v_academy_product_checklist_items').select('*').eq('product_id', productId),
  ]);

  const errors = [
    assetsRes.error,
    creationRes.error,
    scenariosRes.error,
    questionsRes.error,
    checklistRes.error,
  ].filter(Boolean);

  if (errors.length > 0) {
    console.error('[academyStore] fetch workspace children', errors);
    return null;
  }

  const workspace: AcademyWorkspace = withUpdatedAt({
    version: 2,
    updated_at: new Date().toISOString(),
    product: {
      ...defaultProduct(),
      ...(product as Partial<AcademyProduct>),
      metadata: ((product as any)?.metadata || {}) as Record<string, unknown>,
    },
    assets: ((assetsRes.data as any[]) || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      asset_type: item.asset_type,
      title: item.title,
      status: item.status,
      version_label: item.version_label || '',
      storage_provider: item.storage_provider || '',
      storage_bucket: item.storage_bucket || '',
      storage_path: item.storage_path || '',
      file_url: item.file_url || '',
      mime_type: item.mime_type || '',
      file_size_bytes: item.file_size_bytes ?? null,
      is_primary: !!item.is_primary,
      notes: item.notes || '',
      metadata: item.metadata || {},
    })),
    creation_records: ((creationRes.data as any[]) || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      record_type: item.record_type,
      title: item.title,
      status: item.status,
      content_md: item.content_md || '',
      source_path: item.source_path || '',
      external_url: item.external_url || '',
      model_name: item.model_name || '',
      created_via: item.created_via || '',
      tags: item.tags || [],
      notes: item.notes || '',
      metadata: item.metadata || {},
    })),
    scenarios: ((scenariosRes.data as any[]) || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      name: item.name,
      status: item.status,
      landing: item.landing || '',
      checkout: item.checkout || '',
      delivery: item.delivery || '',
      access_release: item.access_release || '',
      support: item.support || '',
      summary: item.summary || '',
      pros: item.pros || '',
      cons: item.cons || '',
      notes: item.notes || '',
      sort_order: item.sort_order ?? 0,
    })),
    questions: ((questionsRes.data as any[]) || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      title: item.title,
      status: item.status,
      owner: item.owner || '',
      next_step: item.next_step || '',
      notes: item.notes || '',
      sort_order: item.sort_order ?? 0,
    })),
    checklist: ((checklistRes.data as any[]) || []).map((item) => ({
      id: item.id,
      product_id: item.product_id,
      title: item.title,
      area: item.area,
      done: !!item.done,
      notes: item.notes || '',
      sort_order: item.sort_order ?? 0,
    })),
  });

  writeLocal(workspace);
  return workspace;
}

async function refreshAfterRemote(slug = DEFAULT_SLUG): Promise<AcademyWorkspace> {
  const remote = await fetchRemoteWorkspace(slug);
  return remote || readLocal();
}

function saveLocalOnly(mutator: (current: AcademyWorkspace) => AcademyWorkspace): AcademyWorkspace {
  const current = readLocal();
  const next = withUpdatedAt(mutator(current));
  writeLocal(next);
  return next;
}

async function ensureRemoteProduct(product: AcademyProduct): Promise<AcademyProduct | null> {
  if (!isSupabaseReady()) return null;

  const payload = productPayload(product);
  const { data, error } = await supabase
    .schema('academy')
    .from('products')
    .upsert(payload, { onConflict: 'slug' })
    .select()
    .single();

  if (error) {
    console.error('[academyStore] ensureRemoteProduct', error);
    return null;
  }

  return {
    ...defaultProduct(),
    ...(data as Partial<AcademyProduct>),
    metadata: ((data as any)?.metadata || {}) as Record<string, unknown>,
  };
}

export const academyStore = {
  isOnline: isSupabaseReady,

  async getWorkspace(slug = DEFAULT_SLUG): Promise<AcademyWorkspace> {
    const remote = await fetchRemoteWorkspace(slug);
    return remote || readLocal();
  },

  async saveProduct(product: AcademyProduct): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => ({ ...current, product }));
    if (!isSupabaseReady()) return local;

    const remoteProduct = await ensureRemoteProduct(product);
    if (!remoteProduct) return local;
    return refreshAfterRemote(remoteProduct.slug);
  },

  async saveAsset(asset: AcademyAsset): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => {
      const assets = current.assets.some((item) => item.id === asset.id)
        ? current.assets.map((item) => (item.id === asset.id ? asset : item))
        : [...current.assets, asset];
      return { ...current, assets };
    });

    if (!isSupabaseReady()) return local;

    const remoteProduct = await ensureRemoteProduct(local.product);
    if (!remoteProduct?.id) return local;

    const { error } = await supabase
      .schema('academy')
      .from('product_assets')
      .upsert(assetPayload(asset, remoteProduct.id), { onConflict: 'id' });

    if (error) {
      console.error('[academyStore] saveAsset', error);
      return local;
    }

    return refreshAfterRemote(remoteProduct.slug);
  },

  async deleteAsset(id: string): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => ({
      ...current,
      assets: current.assets.filter((item) => item.id !== id),
    }));

    if (!isSupabaseReady()) return local;

    const { error } = await supabase
      .schema('academy')
      .from('product_assets')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[academyStore] deleteAsset', error);
      return local;
    }

    return refreshAfterRemote(local.product.slug);
  },

  async saveCreationRecord(record: AcademyCreationRecord): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => {
      const creation_records = current.creation_records.some((item) => item.id === record.id)
        ? current.creation_records.map((item) => (item.id === record.id ? record : item))
        : [...current.creation_records, record];
      return { ...current, creation_records };
    });

    if (!isSupabaseReady()) return local;

    const remoteProduct = await ensureRemoteProduct(local.product);
    if (!remoteProduct?.id) return local;

    const { error } = await supabase
      .schema('academy')
      .from('product_creation_records')
      .upsert(creationPayload(record, remoteProduct.id), { onConflict: 'id' });

    if (error) {
      console.error('[academyStore] saveCreationRecord', error);
      return local;
    }

    return refreshAfterRemote(remoteProduct.slug);
  },

  async deleteCreationRecord(id: string): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => ({
      ...current,
      creation_records: current.creation_records.filter((item) => item.id !== id),
    }));

    if (!isSupabaseReady()) return local;

    const { error } = await supabase
      .schema('academy')
      .from('product_creation_records')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[academyStore] deleteCreationRecord', error);
      return local;
    }

    return refreshAfterRemote(local.product.slug);
  },

  async saveScenario(input: AcademyScenario): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => {
      const scenarios = current.scenarios.some((item) => item.id === input.id)
        ? current.scenarios.map((item) => (item.id === input.id ? input : item))
        : [...current.scenarios, input];
      return { ...current, scenarios };
    });

    if (!isSupabaseReady()) return local;

    const remoteProduct = await ensureRemoteProduct(local.product);
    if (!remoteProduct?.id) return local;

    const { error } = await supabase
      .schema('academy')
      .from('product_scenarios')
      .upsert(scenarioPayload(input, remoteProduct.id), { onConflict: 'id' });

    if (error) {
      console.error('[academyStore] saveScenario', error);
      return local;
    }

    return refreshAfterRemote(remoteProduct.slug);
  },

  async deleteScenario(id: string): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => ({
      ...current,
      scenarios: current.scenarios.filter((item) => item.id !== id),
    }));

    if (!isSupabaseReady()) return local;

    const { error } = await supabase
      .schema('academy')
      .from('product_scenarios')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[academyStore] deleteScenario', error);
      return local;
    }

    return refreshAfterRemote(local.product.slug);
  },

  async saveQuestion(input: AcademyQuestion): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => {
      const questions = current.questions.some((item) => item.id === input.id)
        ? current.questions.map((item) => (item.id === input.id ? input : item))
        : [...current.questions, input];
      return { ...current, questions };
    });

    if (!isSupabaseReady()) return local;

    const remoteProduct = await ensureRemoteProduct(local.product);
    if (!remoteProduct?.id) return local;

    const { error } = await supabase
      .schema('academy')
      .from('product_questions')
      .upsert(questionPayload(input, remoteProduct.id), { onConflict: 'id' });

    if (error) {
      console.error('[academyStore] saveQuestion', error);
      return local;
    }

    return refreshAfterRemote(remoteProduct.slug);
  },

  async deleteQuestion(id: string): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => ({
      ...current,
      questions: current.questions.filter((item) => item.id !== id),
    }));

    if (!isSupabaseReady()) return local;

    const { error } = await supabase
      .schema('academy')
      .from('product_questions')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[academyStore] deleteQuestion', error);
      return local;
    }

    return refreshAfterRemote(local.product.slug);
  },

  async saveChecklist(items: AcademyChecklistItem[]): Promise<AcademyWorkspace> {
    const local = saveLocalOnly((current) => ({ ...current, checklist: items }));

    if (!isSupabaseReady()) return local;

    const remoteProduct = await ensureRemoteProduct(local.product);
    if (!remoteProduct?.id) return local;

    const payload = items.map((item) => checklistPayload(item, remoteProduct.id));
    const { error } = await supabase
      .schema('academy')
      .from('product_checklist_items')
      .upsert(payload, { onConflict: 'id' });

    if (error) {
      console.error('[academyStore] saveChecklist', error);
      return local;
    }

    return refreshAfterRemote(remoteProduct.slug);
  },

  async exportJSON(): Promise<string> {
    const data = await this.getWorkspace();
    return JSON.stringify(data, null, 2);
  },

  async exportMarkdown(): Promise<string> {
    const data = await this.getWorkspace();
    const lines: string[] = [];

    lines.push('# Academy - Workspace Operacional');
    lines.push('');
    lines.push(`> Atualizado em ${new Date(data.updated_at).toLocaleString('pt-BR')} - fonte: ${isSupabaseReady() ? 'Supabase + cache local' : 'localStorage'}`);
    lines.push('');

    lines.push('## Produto');
    lines.push(`- Nome: ${data.product.product_name}`);
    lines.push(`- Slug: ${data.product.slug}`);
    lines.push(`- Status: ${data.product.status}`);
    lines.push(`- Tipo: ${data.product.offer_type}`);
    lines.push(`- Subtitulo: ${data.product.subtitle}`);
    lines.push(`- Promessa: ${data.product.promise}`);
    lines.push(`- Preco: ${data.product.price_brl != null ? `R$ ${data.product.price_brl}` : '[nao definido]'}`);
    lines.push(`- Condicao: ${data.product.launch_condition}`);
    lines.push(`- CTA principal: ${data.product.main_cta}`);
    lines.push(`- CTA secundario: ${data.product.secondary_cta}`);
    lines.push(`- Publico principal: ${data.product.primary_audience}`);
    lines.push(`- Publico secundario: ${data.product.secondary_audience}`);
    lines.push(`- Entrega central: ${data.product.core_delivery}`);
    lines.push(`- Foco atual: ${data.product.current_focus}`);
    lines.push(`- Checkout URL: ${data.product.checkout_url || '[nao definido]'}`);
    lines.push(`- Sales page URL: ${data.product.sales_page_url || '[nao definido]'}`);
    lines.push(`- Entrega: ${data.product.delivery_provider || '[nao definido]'}`);
    if (data.product.notes) lines.push(`- Notas: ${data.product.notes}`);
    lines.push('');

    lines.push('## Assets');
    if (data.assets.length === 0) {
      lines.push('*Nenhum asset registrado*');
    } else {
      for (const asset of data.assets) {
        lines.push(`- [${asset.status}] ${asset.asset_type} - ${asset.title}`);
        lines.push(`  url: ${asset.file_url || '[nao definido]'}`);
        lines.push(`  caminho: ${asset.storage_path || '[nao definido]'}`);
        if (asset.notes) lines.push(`  notas: ${asset.notes}`);
      }
    }
    lines.push('');

    lines.push('## Dados de criacao');
    if (data.creation_records.length === 0) {
      lines.push('*Nenhum registro de criacao*');
    } else {
      for (const record of data.creation_records) {
        lines.push(`- [${record.status}] ${record.record_type} - ${record.title}`);
        if (record.source_path) lines.push(`  source_path: ${record.source_path}`);
        if (record.external_url) lines.push(`  external_url: ${record.external_url}`);
        if (record.tags.length > 0) lines.push(`  tags: ${record.tags.join(', ')}`);
        if (record.notes) lines.push(`  notas: ${record.notes}`);
      }
    }
    lines.push('');

    lines.push('## Cenarios');
    for (const scenario of data.scenarios) {
      lines.push(`### ${scenario.name}`);
      lines.push(`- Status: ${scenario.status}`);
      lines.push(`- Landing: ${scenario.landing}`);
      lines.push(`- Checkout: ${scenario.checkout}`);
      lines.push(`- Entrega: ${scenario.delivery}`);
      lines.push(`- Liberacao de acesso: ${scenario.access_release}`);
      lines.push(`- Suporte: ${scenario.support}`);
      lines.push(`- Resumo: ${scenario.summary}`);
      lines.push(`- Pros: ${scenario.pros}`);
      lines.push(`- Contras: ${scenario.cons}`);
      if (scenario.notes) lines.push(`- Notas: ${scenario.notes}`);
      lines.push('');
    }

    lines.push('## Questoes em Aberto');
    for (const question of data.questions) {
      lines.push(`- [${question.status}] ${question.title} - owner: ${question.owner}`);
      lines.push(`  proximo passo: ${question.next_step}`);
      if (question.notes) lines.push(`  notas: ${question.notes}`);
    }
    lines.push('');

    lines.push('## Checklist');
    for (const item of data.checklist) {
      lines.push(`- ${item.done ? '[x]' : '[ ]'} ${item.title} (${item.area})`);
      if (item.notes) lines.push(`  notas: ${item.notes}`);
    }

    return lines.join('\n');
  },

  async downloadExport(format: 'json' | 'md') {
    const content = format === 'json' ? await this.exportJSON() : await this.exportMarkdown();
    const blob = new Blob([content], { type: format === 'json' ? 'application/json' : 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `academy-workspace-${new Date().toISOString().split('T')[0]}.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  },
};
