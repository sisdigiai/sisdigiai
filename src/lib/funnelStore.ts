export type FunnelProductRole = 'isca_paga' | 'guia_planejado' | 'app_principal';
export type FunnelStepStatus = 'done' | 'doing' | 'next' | 'blocked';
export type CreativeStatus = 'validar' | 'ajustar' | 'cortar';

export type FunnelAssumptions = {
  mainPrice: number;
  bumpWhatsappPrice: number;
  bumpChecklistPrice: number;
  upsellPrice: number;
  bumpWhatsappTakeRate: number;
  bumpChecklistTakeRate: number;
  upsellConversion: number;
  feesRate: number;
  roasTarget: number;
  adsetBudgetDay: number;
  testDays: number;
  adsets: number;
  clickToPurchase: number;
  cartRecoveryRate: number;
  cpvMax: number;
  ctrMin: number;
};

export type FunnelGuide = {
  id: string;
  name: string;
  role: FunnelProductRole;
  pain: string;
  promise: string;
  appBridge: string;
  status: FunnelStepStatus;
  nextStep: string;
};

export type FunnelCreative = {
  id: string;
  angle: string;
  hook: string;
  ctr: number;
  cpv: number;
  signal: string;
};

export type FunnelAutomationStep = {
  id: string;
  moment: string;
  channel: 'WhatsApp' | 'Email';
  objective: string;
  message: string;
};

export type FunnelTask = {
  id: string;
  title: string;
  area: 'oferta' | 'trafego' | 'checkout' | 'automacao' | 'produto' | 'dados';
  status: FunnelStepStatus;
  owner: string;
  nextStep: string;
  why: string;
  checklist: string[];
  acceptanceCriteria: string[];
  decisionRule: string;
};

export type FunnelActuals = {
  adSpend: number;
  visits: number;
  checkouts: number;
  abandonedCarts: number;
  purchases: number;
  bumpWhatsappSales: number;
  bumpChecklistSales: number;
  upsellSales: number;
  grossRevenue: number;
  refundedRevenue: number;
  recoveredSales: number;
  qualifiedLeads: number;
  ecosystemCandidates: number;
};

export type FunnelWorkspace = {
  version: 1;
  updatedAt: string;
  assumptions: FunnelAssumptions;
  actuals: FunnelActuals;
  guides: FunnelGuide[];
  creatives: FunnelCreative[];
  automation: FunnelAutomationStep[];
  tasks: FunnelTask[];
};

export type FunnelSummary = {
  averageOrderValue: number;
  maxCpaTarget: number;
  microtestSpend: number;
  projectedPurchases: number;
  recoveredPurchases: number;
  projectedRevenue: number;
  estimatedFees: number;
  projectedProfitAfterAds: number;
  projectedRoas: number;
  actualNetRevenue: number;
  actualFees: number;
  actualProfitAfterAds: number;
  actualRoas: number;
  actualCpa: number;
  actualAov: number;
  checkoutRate: number;
  cartAbandonRate: number;
  recoveryRateActual: number;
  ecosystemCandidateRate: number;
  recommendedAction: string;
  completedTasks: number;
  totalTasks: number;
  strategicTags: string[];
};

const LS_KEY = 'digiai_funnel_osi_workspace';

const defaultAssumptions: FunnelAssumptions = {
  mainPrice: 97, // preco cheio modelado; estreia da turma inicial e R$47,90 (regua OSI)
  bumpWhatsappPrice: 27,
  bumpChecklistPrice: 19,
  upsellPrice: 197,
  bumpWhatsappTakeRate: 0.35,
  bumpChecklistTakeRate: 0.28,
  upsellConversion: 0.12,
  feesRate: 0.09,
  roasTarget: 2.5,
  adsetBudgetDay: 12.5,
  testDays: 2,
  adsets: 4,
  clickToPurchase: 0.025,
  cartRecoveryRate: 0.08,
  cpvMax: 1.39,
  ctrMin: 0.015,
};

const defaultActuals: FunnelActuals = {
  adSpend: 0,
  visits: 0,
  checkouts: 0,
  abandonedCarts: 0,
  purchases: 0,
  bumpWhatsappSales: 0,
  bumpChecklistSales: 0,
  upsellSales: 0,
  grossRevenue: 0,
  refundedRevenue: 0,
  recoveredSales: 0,
  qualifiedLeads: 0,
  ecosystemCandidates: 0,
};

const defaultGuides: FunnelGuide[] = [
  {
    id: 'osi',
    name: 'Otica Sem Improviso',
    role: 'isca_paga',
    pain: 'Atendimento sem metodo no balcao e no WhatsApp.',
    promise: 'Sair do improviso e conduzir atendimento, indicacao e objecoes com mais seguranca.',
    appBridge: 'App de atendimento, scripts e IA de objecoes.',
    status: 'doing',
    nextStep: 'Rodar primeiro teste ABO e medir dor compradora.',
  },
  {
    id: 'whatsapp-sem-cliente-sumido',
    name: 'WhatsApp Sem Cliente Sumido',
    role: 'guia_planejado',
    pain: 'Orcamentos enviados e clientes que somem.',
    promise: 'Retomar conversas com contexto, sem parecer cobranca.',
    appBridge: 'CRM de orcamentos, lembretes e mensagens sugeridas.',
    status: 'next',
    nextStep: 'Montar outline depois dos dados iniciais do OSI.',
  },
  {
    id: 'preco-sem-desespero',
    name: 'Preco Sem Desespero',
    role: 'guia_planejado',
    pain: 'Vendedor corre para desconto quando ouve caro.',
    promise: 'Defender valor antes de mexer no preco.',
    appBridge: 'Simulador de objecoes e biblioteca de argumentos.',
    status: 'next',
    nextStep: 'Validar se dor de preco vence nos criativos.',
  },
  {
    id: 'lentes-linguagem-cliente',
    name: 'Lentes em Linguagem de Cliente',
    role: 'guia_planejado',
    pain: 'Termos tecnicos confundem o cliente e viram comparacao de preco.',
    promise: 'Traduzir lente, tratamento e beneficio para linguagem comercial simples.',
    appBridge: 'Consultor de indicacao e comparador de beneficios.',
    status: 'next',
    nextStep: 'Coletar duvidas reais de lente durante atendimento.',
  },
  {
    id: 'ecossistema-apps',
    name: 'Ecossistema de Apps para Oticas',
    role: 'app_principal',
    pain: 'A otica depende de memoria, improviso e rotina manual.',
    promise: 'Transformar metodo em processo diario com apps, IA, CRM e indicadores.',
    appBridge: 'Produto principal de maior LTV.',
    status: 'doing',
    nextStep: 'Definir primeiro modulo vendido aos compradores OSI.',
  },
];

const defaultCreatives: FunnelCreative[] = [
  {
    id: 'improviso-balcao',
    angle: 'Improviso no balcao',
    hook: 'Seu atendimento perde venda quando vira improviso?',
    ctr: 0.018,
    cpv: 1.2,
    signal: 'Dor ampla para abrir categoria.',
  },
  {
    id: 'cliente-caro',
    angle: 'Cliente diz caro',
    hook: "Quando o cliente diz 'esta caro', voce explica valor ou corre para o desconto?",
    ctr: 0.016,
    cpv: 1.39,
    signal: 'Dor quente de conversao e upsell.',
  },
  {
    id: 'whatsapp-parado',
    angle: 'WhatsApp parado',
    hook: 'Orcamento enviado e cliente sumiu? O problema pode estar na retomada.',
    ctr: 0.014,
    cpv: 1.55,
    signal: 'Pode virar segundo guia se houver respostas.',
  },
  {
    id: 'explicacao-lentes',
    angle: 'Explicacao de lentes',
    hook: 'Se o cliente nao entende a lente, ele compara so o preco.',
    ctr: 0.021,
    cpv: 1.05,
    signal: 'Forte para guia de lentes e app de indicacao.',
  },
  {
    id: 'time-sem-padrao',
    angle: 'Time sem padrao',
    hook: 'Cada vendedor da sua otica explica de um jeito?',
    ctr: 0.012,
    cpv: 1.7,
    signal: 'Mais B2B, bom para dono/gestor.',
  },
];

const defaultAutomation: FunnelAutomationStep[] = [
  {
    id: 'wpp-15m',
    moment: 'T+15 minutos',
    channel: 'WhatsApp',
    objective: 'Retomar sem cobranca.',
    message: 'Vi que voce chegou no acesso do OSI. Se a ideia era atender, explicar lentes e responder objecoes sem improviso, esse e exatamente o ponto do manual + app.',
  },
  {
    id: 'email-1h',
    moment: 'T+1 hora',
    channel: 'Email',
    objective: 'Reforcar entrega e simplicidade.',
    message: 'Seu acesso ficou pendente. Voce recebe manual visual em PDF e app de apoio para consultar situacoes reais do dia a dia.',
  },
  {
    id: 'wpp-6h',
    moment: 'T+6 horas',
    channel: 'WhatsApp',
    objective: 'Atacar dor de preco.',
    message: 'Quando o cliente diz caro, quase nunca e so sobre preco. Muitas vezes ele ainda nao entendeu valor, lente ou beneficio.',
  },
  {
    id: 'email-24h',
    moment: 'T+24 horas',
    channel: 'Email',
    objective: 'Reposicionar metodo.',
    message: 'O objetivo nao e decorar frase pronta. E dar estrutura para entender o cliente, explicar com clareza e conduzir melhor.',
  },
  {
    id: 'wpp-48h',
    moment: 'T+48 horas',
    channel: 'WhatsApp',
    objective: 'Microvalor + ponte para app.',
    message: 'No ecossistema completo, a retomada vira processo: saber quem chamar, por qual motivo e com qual mensagem.',
  },
];

const defaultTasks: FunnelTask[] = [
  {
    id: 'checkout-kiwify',
    title: 'Configurar produto, bumps e upsell na Hotmart',
    area: 'checkout',
    status: 'next',
    owner: 'Growth',
    nextStep: 'Criar checkout na Hotmart: OSI estreia R$47,90 (cheio R$97), bumps R$27/R$19 e upsell R$197.',
    why: 'Sem checkout limpo, nao existe leitura confiavel de conversao, ticket medio, bumps e upsell.',
    checklist: [
      'Criar produto principal Manual OSI + App: estreia R$47,90 (turma inicial) e cheio R$97.',
      'Adicionar bump Kit WhatsApp por R$27 com texto de uso imediato.',
      'Adicionar bump Checklist 30 segundos por R$19 com promessa operacional.',
      'Criar upsell 1-click Treinamento OSI na Pratica por R$197.',
      'Revisar pagina de obrigado com orientacao de acesso e proximo passo.',
      'Fazer compra teste com cupom ou pagamento real de baixo risco.',
    ],
    acceptanceCriteria: [
      'Compra teste aprovada aparece na plataforma.',
      'Bumps podem ser marcados/desmarcados sem quebrar checkout.',
      'Upsell aparece apos compra e registra aceite/recusa.',
      'Pagina de obrigado informa acesso, suporte e proximo passo.',
    ],
    decisionRule: 'So liberar trafego pago depois de uma compra teste ponta a ponta.',
  },
  {
    id: 'eventos',
    title: 'Configurar pixel, CAPI e UTMs',
    area: 'dados',
    status: 'next',
    owner: 'Growth',
    nextStep: 'Validar ViewContent, InitiateCheckout e Purchase.',
    why: 'Sem eventos e UTMs, o trafego vira achismo e nao da para decidir escala, corte ou iteracao.',
    checklist: [
      'Instalar/verificar Pixel Meta.',
      'Ativar API de Conversoes quando disponivel.',
      'Configurar eventos ViewContent, InitiateCheckout e Purchase.',
      'Padronizar UTMs de campanha, conjunto e criativo.',
      'Testar evento de compra real ou sandbox.',
      'Registrar no app onde os dados serao lidos.',
    ],
    acceptanceCriteria: [
      'Evento ViewContent dispara na landing.',
      'Evento InitiateCheckout dispara no checkout.',
      'Evento Purchase dispara com valor correto.',
      'UTM aparece nos relatórios da plataforma ou CRM.',
    ],
    decisionRule: 'Se Purchase nao registra valor correto, pausar escala e corrigir tracking antes de gastar.',
  },
  {
    id: 'criativos',
    title: 'Produzir primeira bateria de criativos',
    area: 'trafego',
    status: 'doing',
    owner: 'Marketing',
    nextStep: 'Criar pelo menos 5 angulos baseados nas dores do painel.',
    why: 'O criativo vai descobrir qual dor compra: atendimento, preco, WhatsApp, lentes ou equipe.',
    checklist: [
      'Criar 1 criativo para improviso no balcao.',
      'Criar 1 criativo para cliente dizendo caro.',
      'Criar 1 criativo para WhatsApp parado.',
      'Criar 1 criativo para explicacao de lentes.',
      'Criar 1 criativo para time sem padrao.',
      'Nomear criativos com dor + formato + versao.',
    ],
    acceptanceCriteria: [
      'Todos os criativos possuem gancho claro nos 3 primeiros segundos ou primeira linha.',
      'Cada criativo aponta para uma dor unica.',
      'Nenhum criativo promete o Clearix como entrega do ebook.',
      'Todos possuem CTA coerente com OSI.',
    ],
    decisionRule: 'Duplicar o angulo vencedor; nao misturar dores antes de saber qual compra.',
  },
  {
    id: 'automacao',
    title: 'Subir regua de recuperacao',
    area: 'automacao',
    status: 'next',
    owner: 'CRM',
    nextStep: 'Implementar WhatsApp + email e parar fluxo apos compra.',
    why: 'Recuperacao aumenta receita e tambem qualifica a dor de quem quase comprou.',
    checklist: [
      'Subir WhatsApp T+15min.',
      'Subir Email T+1h.',
      'Subir WhatsApp T+6h com dor de preco.',
      'Subir Email T+24h com reposicionamento.',
      'Subir WhatsApp T+48h com microvalor e ponte para app.',
      'Criar regra de parada apos compra ou pedido de descadastro.',
      'Criar tags de dor no CRM/planilha/app.',
    ],
    acceptanceCriteria: [
      'Lead que comprou nao recebe cobranca de carrinho.',
      'Resposta humana pode assumir conversa.',
      'Cada resposta relevante gera tag de dor.',
      'Receita recuperada pode ser registrada no app.',
    ],
    decisionRule: 'Se houver resposta negativa acima de 3%, reduzir insistencia e deixar mensagens mais consultivas.',
  },
  {
    id: 'app-principal',
    title: 'Definir primeiro modulo do ecossistema',
    area: 'produto',
    status: 'blocked',
    owner: 'Produto',
    nextStep: 'Escolher entre WhatsApp/CRM, IA de objecoes ou scripts de atendimento.',
    why: 'O produto principal deve nascer da dor compradora, nao da nossa ansiedade de construir tudo.',
    checklist: [
      'Comparar vendas por angulo de criativo.',
      'Comparar respostas da recuperacao por dor.',
      'Ler comentarios e mensagens recebidas.',
      'Classificar compradores por perfil: vendedor, gestor ou dono.',
      'Escolher primeiro modulo com maior sinal comercial.',
    ],
    acceptanceCriteria: [
      'Existe dor vencedora documentada.',
      'Existe publico comprador claro.',
      'Existe promessa de app vinculada a essa dor.',
      'Existe proxima oferta ou beta definido.',
    ],
    decisionRule: 'Se a dor vencedora for WhatsApp, priorizar CRM/retomada; se for preco, priorizar IA de objecoes; se for lentes, priorizar consultor de indicacao.',
  },
];

function cloneDefaults(): FunnelWorkspace {
  return {
    version: 1,
    updatedAt: new Date().toISOString(),
    assumptions: { ...defaultAssumptions },
    actuals: { ...defaultActuals },
    guides: defaultGuides.map((item) => ({ ...item })),
    creatives: defaultCreatives.map((item) => ({ ...item })),
    automation: defaultAutomation.map((item) => ({ ...item })),
    tasks: defaultTasks.map((item) => ({ ...item })),
  };
}

function readLocal(): FunnelWorkspace {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return cloneDefaults();
    const parsed = JSON.parse(raw) as Partial<FunnelWorkspace>;
    const fallback = cloneDefaults();
    return {
      ...fallback,
      ...parsed,
      version: 1,
      assumptions: { ...fallback.assumptions, ...(parsed.assumptions || {}) },
      actuals: { ...fallback.actuals, ...(parsed.actuals || {}) },
      guides: parsed.guides || fallback.guides,
      creatives: parsed.creatives || fallback.creatives,
      automation: parsed.automation || fallback.automation,
      tasks: (parsed.tasks || fallback.tasks).map((task) => {
        const defaultTask = fallback.tasks.find((item) => item.id === task.id);
        return {
          ...defaultTask,
          ...task,
          why: task.why || defaultTask?.why || '',
          checklist: task.checklist || defaultTask?.checklist || [],
          acceptanceCriteria: task.acceptanceCriteria || defaultTask?.acceptanceCriteria || [],
          decisionRule: task.decisionRule || defaultTask?.decisionRule || '',
        };
      }),
    };
  } catch {
    return cloneDefaults();
  }
}

function writeLocal(data: FunnelWorkspace) {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...data, updatedAt: new Date().toISOString() }));
}

export function calculateFunnelSummary(workspace: FunnelWorkspace): FunnelSummary {
  const a = workspace.assumptions;
  const averageOrderValue =
    a.mainPrice +
    a.bumpWhatsappPrice * a.bumpWhatsappTakeRate +
    a.bumpChecklistPrice * a.bumpChecklistTakeRate +
    a.upsellPrice * a.upsellConversion;

  const microtestSpend = a.adsetBudgetDay * a.testDays * a.adsets;
  const projectedPurchases = (microtestSpend / 1.15) * a.clickToPurchase;
  const recoveredPurchases = projectedPurchases * a.cartRecoveryRate;
  const totalPurchases = projectedPurchases + recoveredPurchases;
  const projectedRevenue = totalPurchases * averageOrderValue;
  const estimatedFees = projectedRevenue * a.feesRate;
  const projectedProfitAfterAds = projectedRevenue - estimatedFees - microtestSpend;
  const projectedRoas = microtestSpend > 0 ? projectedRevenue / microtestSpend : 0;
  const completedTasks = workspace.tasks.filter((task) => task.status === 'done').length;
  const actualNetRevenue = Math.max(0, workspace.actuals.grossRevenue - workspace.actuals.refundedRevenue);
  const actualFees = actualNetRevenue * a.feesRate;
  const actualProfitAfterAds = actualNetRevenue - actualFees - workspace.actuals.adSpend;
  const actualRoas = workspace.actuals.adSpend > 0 ? actualNetRevenue / workspace.actuals.adSpend : 0;
  const actualCpa = workspace.actuals.purchases > 0 ? workspace.actuals.adSpend / workspace.actuals.purchases : 0;
  const actualAov = workspace.actuals.purchases > 0 ? actualNetRevenue / workspace.actuals.purchases : 0;
  const checkoutRate = workspace.actuals.visits > 0 ? workspace.actuals.checkouts / workspace.actuals.visits : 0;
  const cartAbandonRate = workspace.actuals.checkouts > 0 ? workspace.actuals.abandonedCarts / workspace.actuals.checkouts : 0;
  const recoveryRateActual = workspace.actuals.abandonedCarts > 0 ? workspace.actuals.recoveredSales / workspace.actuals.abandonedCarts : 0;
  const ecosystemCandidateRate = workspace.actuals.purchases > 0 ? workspace.actuals.ecosystemCandidates / workspace.actuals.purchases : 0;
  let recommendedAction = 'Preencher resultados reais para o app recomendar o proximo caminho.';
  if (workspace.actuals.adSpend > 0) {
    if (actualRoas >= a.roasTarget && workspace.actuals.purchases >= 3) {
      recommendedAction = 'Escalar com cuidado: duplicar criativo vencedor e subir budget em etapas pequenas.';
    } else if (actualRoas >= 1 && checkoutRate >= 0.05) {
      recommendedAction = 'Ajustar oferta/checkout/recuperacao antes de escalar. Existe interesse, mas a conversao ainda nao esta madura.';
    } else if (checkoutRate < 0.03 && workspace.actuals.visits >= 100) {
      recommendedAction = 'Revisar promessa, criativo e landing. O trafego nao esta chegando qualificado ao checkout.';
    } else {
      recommendedAction = 'Continuar teste ate volume minimo ou cortar criativos abaixo dos limites.';
    }
  }

  return {
    averageOrderValue,
    maxCpaTarget: averageOrderValue / a.roasTarget,
    microtestSpend,
    projectedPurchases: totalPurchases,
    recoveredPurchases,
    projectedRevenue,
    estimatedFees,
    projectedProfitAfterAds,
    projectedRoas,
    actualNetRevenue,
    actualFees,
    actualProfitAfterAds,
    actualRoas,
    actualCpa,
    actualAov,
    checkoutRate,
    cartAbandonRate,
    recoveryRateActual,
    ecosystemCandidateRate,
    recommendedAction,
    completedTasks,
    totalTasks: workspace.tasks.length,
    strategicTags: [
      'dor_atendimento_improviso',
      'dor_whatsapp_orcamento',
      'dor_preco_desconto',
      'dor_lentes_argumentacao',
      'candidato_ecossistema_apps',
    ],
  };
}

export function creativeDecision(creative: FunnelCreative, assumptions: FunnelAssumptions): CreativeStatus {
  if (creative.ctr >= assumptions.ctrMin && creative.cpv <= assumptions.cpvMax) return 'validar';
  if (creative.ctr >= assumptions.ctrMin * 0.8 && creative.cpv <= assumptions.cpvMax * 1.15) return 'ajustar';
  return 'cortar';
}

export const funnelStore = {
  getWorkspace(): FunnelWorkspace {
    return readLocal();
  },

  saveWorkspace(workspace: FunnelWorkspace): FunnelWorkspace {
    const next = { ...workspace, updatedAt: new Date().toISOString() };
    writeLocal(next);
    return next;
  },

  updateAssumptions(patch: Partial<FunnelAssumptions>): FunnelWorkspace {
    const current = readLocal();
    const next = {
      ...current,
      assumptions: { ...current.assumptions, ...patch },
      updatedAt: new Date().toISOString(),
    };
    writeLocal(next);
    return next;
  },

  updateTask(id: string, patch: Partial<FunnelTask>): FunnelWorkspace {
    const current = readLocal();
    const next = {
      ...current,
      tasks: current.tasks.map((task) => (task.id === id ? { ...task, ...patch } : task)),
      updatedAt: new Date().toISOString(),
    };
    writeLocal(next);
    return next;
  },

  updateActuals(patch: Partial<FunnelActuals>): FunnelWorkspace {
    const current = readLocal();
    const next = {
      ...current,
      actuals: { ...current.actuals, ...patch },
      updatedAt: new Date().toISOString(),
    };
    writeLocal(next);
    return next;
  },

  reset(): FunnelWorkspace {
    const next = cloneDefaults();
    writeLocal(next);
    return next;
  },
};
