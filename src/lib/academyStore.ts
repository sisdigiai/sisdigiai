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
    line: 'digiai_academy',
    product_name: 'Ótica Sem Improviso',
    subtitle: 'Manual Visual + App para Atendimento, WhatsApp e Objecoes em Oticas',
    status: 'in_production',
    offer_type: 'low_ticket',
    // Sem preço de propósito: o preço mora em academy.products e só é lido de lá. O
    // 48.50 + "preço de estreia" que estava aqui era o que um cache vazio mostrava.
    price_brl: null,
    launch_condition: '',
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
      title: 'Definir regra de acesso no Nexus por 30 dias',
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
      // Preço e condição nunca saem do cache: guardado de uma sessão antiga, ele mostrava
      // o preço de então (48,50) como se fosse o de hoje quando o banco não respondia.
      // Sem o banco, as telas dizem "sem dado" em vez de afirmar um número.
      product: { ...fallback.product, ...(parsed.product || {}), price_brl: null, launch_condition: '' },
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

async function fetchRemoteWorkspace(slug = DEFAULT_SLUG): Promise<AcademyWorkspace | null> {
  if (!isSupabaseReady()) return null;

  const { data: product, error: productError } = await supabase
    .from('v_academy_products')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (productError) {
    console.error('[academyStore] fetch product', productError);
    return null;
  }

  // Sem produto no banco não se cria um daqui: academy.products é a fonte do preço, e
  // gravá-lo a partir do cache ou do padrão do app punha lá um preço que ninguém decidiu.
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

export const academyStore = {
  async getWorkspace(slug = DEFAULT_SLUG): Promise<AcademyWorkspace> {
    const remote = await fetchRemoteWorkspace(slug);
    return remote || readLocal();
  },
};
