import React, { useState, useEffect } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { companyStore } from '../lib/companyStore';
import type { DigitalAsset } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

interface Produto {
  nome: string;
  subtitulo: string;
  categoria: 'produto-ancora' | 'alavanca-critica' | 'suporte' | 'incubacao' | 'institucional' | 'infraestrutura';
  prioridade: 'maxima' | 'alta' | 'media' | 'baixa';
  status: string;
  faseAtual: string;
  repo: string;
  stack: string;
  proximo: string;
  bloqueio?: string;
}

const PRODUTOS: Produto[] = [
  {
    nome: 'Clearix',
    subtitulo: 'Ecossistema SaaS vertical para varejo óptico',
    categoria: 'produto-ancora',
    prioridade: 'maxima',
    status: 'Empacotamento comercial em andamento',
    faseAtual: 'Fase 2 — Empacotamento',
    repo: 'D:\\projetos\\clearix_eco_full',
    stack: 'Next.js 15/SvelteKit 2/React 19 · Supabase · ~20 sub-apps',
    proximo: 'Formalizar pricing + fechar 1º piloto externo além da loja de teste',
    bloqueio: 'Modelo comercial final e validação externa pendentes',
  },
  {
    nome: 'Clearix Academy',
    subtitulo: 'Enxame de guias low ticket para educar o varejo óptico e alimentar o ecossistema',
    categoria: 'alavanca-critica',
    prioridade: 'alta',
    status: 'Primeira isca em engenharia: Ótica Sem Improviso',
    faseAtual: 'Fase 2 — Produto-isca + funil',
    repo: '(sem repositório de código)',
    stack: 'Guias pagos · App de apoio · Nexus · Meta Ads · CRM/WhatsApp',
    proximo: 'Rodar OSI como isca paga, capturar dores e preparar ascensão para apps de ótica',
    bloqueio: 'Definir primeiro módulo do ecossistema que receberá os compradores qualificados',
  },
  {
    nome: 'Ótica Sem Improviso',
    subtitulo: 'Primeira isca paga — funil pro Clearix',
    categoria: 'alavanca-critica',
    prioridade: 'alta',
    status: 'Engenharia de funil implementada no DIGIAI App',
    faseAtual: 'Fase 2 — Teste de oferta e tráfego',
    repo: 'D:\\OneDrive - Óticas Taty Mello\\Grupo Mello\\Marketing_e_Vendas\\digiai\\otica_sem_improviso',
    stack: 'PDF + App de apoio + Hotmart + Meta Ads + Automação WhatsApp/Email',
    proximo: 'Configurar checkout, subir criativos ABO e medir dores compradoras',
    bloqueio: 'Primeira ponte concreta pro Clearix ainda precisa ser escolhida pelos dados do funil',
  },
  {
    nome: 'Nexus',
    subtitulo: 'Plataforma de aprendizado AI-first · metodologia Alpha School',
    categoria: 'suporte',
    prioridade: 'media',
    status: 'MVP funcional — 3 verticais (idioma, concurso, clearix)',
    faseAtual: 'Fase 1 → aguardando ativação comercial',
    repo: 'D:\\projetos\\nexus',
    stack: 'React 19 · TypeScript · Supabase · Gemini · 126 tabelas · 14 schemas',
    proximo: 'Ativar Clearix University como apoio ao Academy',
  },
  {
    nome: 'Lumina',
    subtitulo: 'SaaS de digital signage para lojas físicas',
    categoria: 'suporte',
    prioridade: 'media',
    status: 'MVP técnico funcional — não validado comercialmente',
    faseAtual: 'Fase 1 → upsell futuro',
    repo: 'D:\\projetos\\lumina_box',
    stack: 'React 19 · Vite · TypeScript · Supabase · TailwindCSS',
    proximo: 'Atualizar README e package.json · Avaliar como upsell para clientes Clearix',
    bloqueio: 'Sem modelo comercial nem onboarding definidos',
  },
  {
    nome: 'Pulso',
    subtitulo: 'Sistema operacional editorial para vídeos faceless',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'MVP em execução — uso interno da DIGIAI',
    faseAtual: 'Fase 1 — incubação',
    repo: 'D:\\projetos\\pulso_control',
    stack: 'Next.js · Supabase · n8n · OpenAI/Claude · ElevenLabs',
    proximo: 'Usar como motor de conteúdo para o Academy (Regra 5: Pulso trabalha para a DIGIAI primeiro)',
    bloqueio: 'Decisão estratégica pendente: motor de mídia interno ou canal externo?',
  },
  {
    nome: 'Polapetit',
    subtitulo: 'Sistema operacional para empresa de eventos/festas infantis',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'MVP interno — single-tenant, operação Polá Petit',
    faseAtual: 'Fase 1 — incubação',
    repo: 'D:\\projetos\\polapetit',
    stack: 'React · Vite · TypeScript · Supabase · Firebase',
    proximo: 'Fechar mocks/TODOs · Decisão: sistema interno ou SaaS vertical?',
  },
  {
    nome: 'Qual a Foto',
    subtitulo: 'Plataforma de aprovação de fotos para fotógrafos',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'MVP em construção — teste fechado, bugs ativos',
    faseAtual: 'Fase 1 — incubação',
    repo: 'D:\\projetos\\qual_foto',
    stack: 'SvelteKit 2 · TypeScript · Supabase · TailwindCSS · pgcrypto',
    proximo: 'Fechar UI de criação de galeria · Corrigir bug de seleções · Ativar worker IA',
    bloqueio: 'IA worker (Gemini 2.0 Flash) não confirmado em produção',
  },
  {
    nome: 'Easy Idiomas',
    subtitulo: 'SaaS para escolas de idiomas',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'MVP em construção — ainda não deployado',
    faseAtual: 'Fase 1 — incubação',
    repo: 'D:\\projetos\\easy-idiomas',
    stack: 'React 19 · Vite · Supabase · Google Gemini',
    proximo: 'Definir deploy de produção e validar oferta com escolas de idiomas',
    bloqueio: 'Sem deploy nem validação comercial definidos',
  },
  {
    nome: 'Nipo School',
    subtitulo: 'Plataforma educacional musical comunitária · ADNIPO Suzano',
    categoria: 'institucional',
    prioridade: 'baixa',
    status: 'Piloto robusto — pronto para piloto controlado',
    faseAtual: 'Fase 1 — institucional',
    repo: 'D:\\projetos\\nipo_school',
    stack: 'Next.js · TypeScript · Supabase · OpenAI · TailwindCSS',
    proximo: 'Iniciar piloto com ADNIPO · Resolver módulo de pagamentos',
    bloqueio: 'Pagamentos ausentes bloqueiam rollout comercial',
  },
  {
    nome: 'DIGIAI App',
    subtitulo: 'Painel de comando interno da DIGIAI',
    categoria: 'infraestrutura',
    prioridade: 'alta',
    status: 'Operacional · 16 módulos roteados + 2 stubs · schema company populado · finanças reconciliadas via OFX · Marketing/Marketing & SEO ativos',
    faseAtual: 'Fase 1 → 2 — operação interna ativa',
    repo: 'D:\\projetos\\digiai',
    stack: 'React 19 · Vite · TypeScript · TailwindCSS 4 · Motion · Supabase · Chart.js',
    proximo: 'Publicar drafts legais (Política, MSA, DPA) · Migrar iam.users para R-013 · Nomear DPO formal',
    bloqueio: 'CNPJ em transição na RFB · Domínio próprio pendente · DPO formal não nomeado',
  },
];

const categoriaBadge: Record<string, { label: string; className: string }> = {
  'produto-ancora': { label: 'Produto-âncora', className: 'bg-secondary-container/40 text-secondary border-secondary/40' },
  'alavanca-critica': { label: 'Alavanca crítica', className: 'bg-secondary/15 text-secondary border-secondary/40' },
  suporte: { label: 'Suporte prioritário', className: 'bg-surface-high text-on-surface-variant border-outline/10' },
  incubacao: { label: 'Incubação', className: 'bg-surface-low text-muted border-outline/10' },
  institucional: { label: 'Institucional', className: 'bg-surface-low text-muted border-outline/10' },
  infraestrutura: { label: 'Infraestrutura interna', className: 'bg-surface-high text-on-surface-variant border-outline/10' },
};

const prioridadeDot: Record<string, string> = {
  maxima: 'bg-secondary',
  alta: 'bg-secondary',
  media: 'bg-muted',
  baixa: 'bg-muted',
};

const OWNER_BY_NAME: Record<string, string> = {
  'Clearix': 'clearix',
  'Ótica Sem Improviso': 'osi',
  'Nexus': 'nexus',
  'Lumina': 'lumina',
  'Pulso': 'pulso',
  'Polapetit': 'polapetit',
  'DIGIAI App': 'digiai',
};

export default function Portfolio() {
  const [expandido, setExpandido] = useState<string | null>('Clearix');
  const [liveSites, setLiveSites] = useState<Record<string, number>>({});

  useEffect(() => {
    companyStore.listDigitalAssets().then((assets: DigitalAsset[]) => {
      const counts: Record<string, number> = {};
      for (const a of assets) {
        if (a.categoria === 'site' && a.status === 'ativo' && a.owner_product) {
          counts[a.owner_product] = (counts[a.owner_product] || 0) + 1;
        }
      }
      setLiveSites(counts);
    }).catch(() => {});
  }, []);

  const liveCount = (nome: string) => liveSites[OWNER_BY_NAME[nome] ?? ''] || 0;

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Hierarquia Canônica"
        title="Portfólio de Produtos"
        subtitle={`${PRODUTOS.length} frentes · hierarquia canônica · atualizado 2026-05-28`}
      />

      <div className="space-y-6">
      <div className="space-y-3">
        {PRODUTOS.map((p) => {
          const badge = categoriaBadge[p.categoria];
          const isOpen = expandido === p.nome;

          return (
            <div
              key={p.nome}
              className={`border transition-all duration-200 overflow-hidden
                ${p.categoria === 'produto-ancora'
                  ? 'border-secondary/40 bg-secondary-container/40'
                  : p.categoria === 'alavanca-critica'
                  ? 'border-secondary/40 bg-secondary/15'
                  : 'border-outline/10 bg-surface-low'
                }`}
            >
              <button
                className="w-full flex items-center gap-4 p-5 text-left"
                onClick={() => setExpandido(isOpen ? null : p.nome)}
              >
                <div className={`w-2.5 h-2.5 rounded-full shrink-0 ${prioridadeDot[p.prioridade]}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-base">{p.nome}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border ${badge.className}`}>
                      {badge.label}
                    </span>
                    {liveCount(p.nome) > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded border border-emerald-500/30 bg-emerald-500/10 text-emerald-300 inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" /> {liveCount(p.nome)} no ar
                      </span>
                    )}
                  </div>
                  <div className="text-sm text-on-surface-variant mt-0.5 truncate">{p.subtitulo}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-muted hidden md:block">{p.faseAtual}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted" /> : <ChevronDown className="w-4 h-4 text-muted" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-outline/10 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">Status</div>
                      <div className="text-sm text-on-surface">{p.status}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">Fase</div>
                      <div className="text-sm text-on-surface">{p.faseAtual}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">Repositório</div>
                      <div className="text-sm font-mono text-on-surface-variant bg-surface-low px-3 py-2">{p.repo}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">Stack</div>
                      <div className="text-sm text-on-surface-variant">{p.stack}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-1">Próximo passo</div>
                      <div className="text-sm text-on-surface">{p.proximo}</div>
                    </div>
                    {p.bloqueio && (
                      <div className="md:col-span-2">
                        <div className="text-[10px] font-mono text-amber-400/70 uppercase tracking-widest mb-1">Bloqueio</div>
                        <div className="text-sm text-amber-400/80">{p.bloqueio}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}
