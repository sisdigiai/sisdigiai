import React, { useState, useEffect } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';
import { companyStore } from '../lib/companyStore';
import type { DigitalAsset } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

interface Produto {
  nome: string;
  subtitulo: string;
  categoria: 'produto-ancora' | 'alavanca-critica' | 'suporte' | 'incubacao' | 'institucional' | 'infraestrutura' | 'autonomo';
  prioridade: 'maxima' | 'alta' | 'media' | 'baixa';
  status: string;
  faseAtual: string;
  repo: string;
  stack: string;
  proximo: string;
  bloqueio?: string;
  site?: string; // URL pública do produto (landing/site no ar), quando existe
}

const PRODUTOS: Produto[] = [
  {
    nome: 'Clearix',
    subtitulo: 'Ecossistema SaaS vertical para varejo óptico',
    categoria: 'produto-ancora',
    prioridade: 'maxima',
    status: 'Produção real (1 cliente: Grupo Mello, 5 sub-apps em uso) · pricing publicado (4 pacotes, ADR-0022)',
    faseAtual: 'Fase 2 — buscando 1º piloto externo',
    repo: 'D:\\projetos\\clearix_eco_full',
    stack: 'Next.js 16 · React 19 · Supabase · ~20 sub-apps',
    proximo: 'Fechar 1º piloto externo — entrevistas com óticas de Suzano em curso (Fase 0)',
    bloqueio: 'Validação externa em andamento (métrica única: 20 entrevistas + 3 cartas)',
    site: 'https://clearix.app.br',
  },
  {
    nome: 'DIGIAI Academy',
    subtitulo: 'Enxame de guias low ticket (company-level, ADR-0037) para educar o varejo óptico e alimentar o portfólio DIGIAI',
    categoria: 'alavanca-critica',
    prioridade: 'alta',
    status: 'Primeira isca no ar: Ótica Sem Improviso · 0 aulas gravadas',
    faseAtual: 'Fase 2 — Produto-isca + funil',
    repo: '(sem repositório de código)',
    stack: 'Guias pagos · App de apoio · Nexus · Meta Ads · CRM/WhatsApp',
    proximo: 'Gravar as 4-6 aulas · rodar OSI como isca paga e capturar dores',
    bloqueio: 'Conteúdo (aulas) ainda não produzido',
  },
  {
    nome: 'Ótica Sem Improviso',
    subtitulo: 'Primeira isca paga — funil pro Clearix',
    categoria: 'alavanca-critica',
    prioridade: 'alta',
    status: 'Funil 100% no ar (landing + checkout Hotmart+Kiwify + captura de lead) · 0 vendas ainda',
    faseAtual: 'Fase 2 — falta tráfego',
    repo: 'D:\\projetos\\otica_sem_improviso (landing) · app_oticasemimproviso (leitor)',
    stack: 'Vite/React · Hotmart+Kiwify · pixels Meta/TikTok · captura → lead-capture',
    proximo: 'Tráfego: contatar as óticas-alvo (entrevistas em curso) + ativar afiliados',
    bloqueio: 'Sem tráfego qualificado ainda (42 visitas / 0 conversão)',
  },
  {
    nome: 'Clearix Calc (Calculadora de Grau)',
    subtitulo: 'Isca da vertical óticas — calculadora de grau com a cara do Clearix (ADR-0040)',
    categoria: 'alavanca-critica',
    prioridade: 'media',
    status: 'MVP construído (não comitado) · veste o design Clearix · isca pública/grátis, sem banco Clearix',
    faseAtual: 'MVP → publicar como lead-magnet',
    repo: 'D:\\projetos\\clearix_eco_full\\clearix_calc',
    stack: 'Next.js 16 · React 19 · Tailwind 4 · Clearix Lens · PWA · client-side',
    proximo: 'Aprovar + deploy + divulgar pras óticas (contato com o Clearix sem ter Clearix)',
  },
  {
    nome: 'Nexus',
    subtitulo: 'Camada-complemento de aprendizado AI-first (refocado, ADR-0038)',
    categoria: 'suporte',
    prioridade: 'media',
    status: 'Refocado (ADR-0038, idiomas/concursos deprecados) · deployado · adoção zero',
    faseAtual: 'Fase 1 → ativar (ADR-0040)',
    repo: 'D:\\projetos\\nexus',
    stack: 'React 19 · TypeScript · Supabase · Gemini · 126 tabelas',
    proximo: 'Ativar uso real (apoio ao Academy / Clearix University)',
    bloqueio: 'Pendente commit/push/deploy da refocagem pelo agente do Nexus',
  },
  {
    nome: 'Lumina',
    subtitulo: 'SaaS de digital signage — plus do ecossistema Clearix (ADR-0040)',
    categoria: 'suporte',
    prioridade: 'media',
    status: '✅ Produção interna validada (Lancaster Suzano ~3 meses)',
    faseAtual: 'Produção → entrar como plus/upsell do Clearix',
    repo: 'D:\\projetos\\lumina_box',
    stack: 'React 19 · Vite · TypeScript · Supabase · Lumina Signage DS v1.0',
    proximo: 'Monetização externa como plus do ecossistema Clearix (ADR-0021/0040)',
  },
  {
    nome: 'Pulso',
    subtitulo: 'Produção de vídeos curtos faceless — produto autônomo',
    categoria: 'autonomo',
    prioridade: 'baixa',
    status: '✅ Produção real — SO editorial completo: ideias→roteiro→áudio→montagem→publicação assistida em 4 redes (IG/YouTube/TikTok via API + Facebook) · analytics/BI · travas anti-dup (lexical+LLM) · ~65 publicações, ~25k views (jun/26)',
    faseAtual: 'Produção · autônomo (fora do ecossistema Clearix, ADR-0040). Automação AI-native (Supabase + pg_cron; n8n aposentado). Site público: Pulso Hub (a confirmar deploy).',
    repo: 'D:\\projetos\\pulso_control (+ pulso_hub site público)',
    stack: 'Next.js 16 · React 19 · Supabase · pg_cron · OpenAI/Claude · ElevenLabs · Higgsfield · Python (make_video)',
    proximo: 'Operar como produto autônomo (NÃO é motor do Academy — ADR-0040). Gargalo atual: manter a fila de vídeos prontos.',
  },
  {
    nome: 'Polapetit',
    subtitulo: 'Sistema operacional para eventos/festas infantis',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: '✅ Produção real (Buffet Taty Mello + landing polapetit.com.br captando leads)',
    faseAtual: 'Produção (vertical própria, mantida — ADR-0040)',
    repo: 'D:\\projetos\\polapetit',
    stack: 'React · Vite · TypeScript · Supabase · Firebase',
    proximo: 'Validar experimento Persol · seguir como vertical própria',
  },
  {
    nome: 'Qual a Foto',
    subtitulo: 'Plataforma de aprovação de fotos para fotógrafos',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'MVP — backend ok, frontend com bugs, IA worker fora de produção',
    faseAtual: 'Fase 1 — MVP (mantido — ADR-0040)',
    repo: 'D:\\projetos\\qual_foto',
    stack: 'SvelteKit 2 · TypeScript · Supabase · TailwindCSS · pgcrypto',
    proximo: 'Fechar UI de galeria · corrigir seleções · ativar worker IA · sem git remote',
    bloqueio: 'IA worker (Gemini 2.0 Flash) não confirmado em produção',
  },
  {
    nome: 'Easy Idiomas',
    subtitulo: 'SaaS para escolas de idiomas',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'Protótipo — schema/RLS prontos, ainda não deployado',
    faseAtual: 'Fase 1 — MVP/protótipo',
    repo: 'D:\\projetos\\easy-idiomas',
    stack: 'React 19 · Vite · Supabase · Google Gemini',
    proximo: 'Definir deploy de produção e validar oferta com escolas',
    bloqueio: 'Sem deploy nem validação comercial',
  },
  {
    nome: 'Nipo School',
    subtitulo: 'Plataforma educacional musical comunitária · ADNIPO Suzano',
    categoria: 'institucional',
    prioridade: 'baixa',
    status: 'Piloto robusto (v4.1) — pronto para piloto controlado',
    faseAtual: 'Fase 1 — institucional',
    repo: 'D:\\projetos\\nipo_school',
    stack: 'Next.js · TypeScript · Supabase · OpenAI · TailwindCSS',
    proximo: 'Iniciar piloto com ADNIPO · resolver módulo de pagamentos',
    bloqueio: 'Pagamentos ausentes bloqueiam rollout comercial',
  },
  {
    nome: 'melloeyewear',
    subtitulo: 'E-commerce de óculos + provador virtual (Mello)',
    categoria: 'autonomo',
    prioridade: 'baixa',
    status: 'Produção (mellooticas.netlify.app) · Firebase real · Stripe ainda dummy',
    faseAtual: 'Produção — falta faturar online',
    repo: 'D:\\projetos\\melloeyewear',
    stack: 'React 19 · Vite · Express · Firebase · Stripe (dummy)',
    proximo: 'Ligar Stripe real + integração Clearix (ADR-0002/0040) · pull do origin (HEAD local atrasado)',
    bloqueio: 'Stripe dummy (não fatura) · integração Clearix mock',
  },
  {
    nome: 'DIGIAI App',
    subtitulo: 'Painel de comando interno da DIGIAI',
    categoria: 'infraestrutura',
    prioridade: 'alta',
    status: '✅ Produção (sisdigiai.netlify.app) · /health 200 (mig 042) · RBAC · SEO (GSC+Bing+Cloudflare) · 23 módulos · guard anti-teste',
    faseAtual: 'Fase 1 → 2 — operação interna ativa',
    repo: 'D:\\projetos\\digiai',
    stack: 'React 19 · Vite · TypeScript · TailwindCSS 4 · Supabase · Chart.js',
    proximo: 'Publicar drafts legais (Política/ToS) · UptimeRobot (feito) · rotação credenciais (26/08)',
    bloqueio: 'CNPJ em transição na RFB',
    site: 'https://sisdigiai.netlify.app',
  },
];

const categoriaBadge: Record<string, { label: string; className: string }> = {
  'produto-ancora': { label: 'Produto-âncora', className: 'bg-secondary-container/40 text-secondary border-secondary/40' },
  'alavanca-critica': { label: 'Alavanca crítica', className: 'bg-secondary/15 text-secondary border-secondary/40' },
  suporte: { label: 'Suporte prioritário', className: 'bg-surface-high text-on-surface-variant border-outline/10' },
  incubacao: { label: 'Incubação', className: 'bg-surface-low text-muted border-outline/10' },
  autonomo: { label: 'Autônomo (fora do ecossistema)', className: 'bg-surface-high text-on-surface-variant border-outline/10' },
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
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Hierarquia Canônica"
        title="Portfólio de Produtos"
        subtitle={`${PRODUTOS.length} frentes · realidade re-baseada (ADR-0040) · atualizado 2026-06-15`}
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
                <div className={`w-2.5 h-2.5 shrink-0 ${prioridadeDot[p.prioridade]}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-bold text-base">{p.nome}</span>
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 border ${badge.className}`}>
                      {badge.label}
                    </span>
                    {liveCount(p.nome) > 0 && (
                      <span className="text-[10px] font-mono px-2 py-0.5 border border-success/30 bg-success/10 text-success inline-flex items-center gap-1">
                        <span className="w-1.5 h-1.5 bg-success" /> {liveCount(p.nome)} no ar
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
                    {p.site && (
                      <div className="md:col-span-2">
                        <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">Site público</div>
                        <a
                          href={p.site}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-sm font-mono text-success hover:text-success transition-colors"
                        >
                          {p.site.replace(/^https?:\/\//, '')}
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    )}
                    {p.bloqueio && (
                      <div className="md:col-span-2">
                        <div className="text-[10px] font-mono text-warning/70 uppercase tracking-widest mb-1">Bloqueio</div>
                        <div className="text-sm text-warning/80">{p.bloqueio}</div>
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
