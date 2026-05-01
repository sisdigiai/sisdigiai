import React, { useState } from 'react';
import { ExternalLink, ChevronDown, ChevronUp } from 'lucide-react';

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
    subtitulo: 'Ecossistema SaaS vertical para varejo Ã³ptico',
    categoria: 'produto-ancora',
    prioridade: 'maxima',
    status: 'Empacotamento comercial em andamento',
    faseAtual: 'Fase 2 â€” Empacotamento',
    repo: 'D:\\projetos\\clearix_eco_full',
    stack: 'Next.js 15/SvelteKit 2/React 19 Â· Supabase Â· ~20 sub-apps',
    proximo: 'Formalizar pricing + fechar 1Âº piloto externo alÃ©m da loja de teste',
    bloqueio: 'Modelo comercial final e validaÃ§Ã£o externa pendentes',
  },
  {
    nome: 'Clearix Academy',
    subtitulo: 'Enxame de guias low ticket para educar o varejo optico e alimentar o ecossistema',
    categoria: 'alavanca-critica',
    prioridade: 'alta',
    status: 'Primeira isca em engenharia: Otica Sem Improviso',
    faseAtual: 'Fase 2 - Produto-isca + funil',
    repo: '(sem repositÃ³rio de cÃ³digo)',
    stack: 'Guias pagos · App de apoio · Nexus · Meta Ads · CRM/WhatsApp',
    proximo: 'Rodar OSI como isca paga, capturar dores e preparar ascensao para apps de otica',
    bloqueio: 'Definir primeiro modulo do ecossistema que recebera os compradores qualificados',
  },
  {
    nome: 'Otica Sem Improviso',
    subtitulo: 'Primeira isca paga do ecossistema de apps para oticas',
    categoria: 'alavanca-critica',
    prioridade: 'alta',
    status: 'Engenharia de funil implementada no DIGIAI App',
    faseAtual: 'Fase 2 - Teste de oferta e trafego',
    repo: 'D:\\OneDrive - Oticas Taty Mello\\Grupo Mello\\Marketing_e_Vendas\\digiai\\otica_sem_improviso',
    stack: 'PDF + App de apoio + Kiwify + Meta Ads + Automacao WhatsApp/Email',
    proximo: 'Configurar checkout, subir criativos ABO e medir dores compradoras',
    bloqueio: 'Primeiro modulo do app principal ainda precisa ser escolhido pelos dados do funil',
  },
  {
    nome: 'Nexus',
    subtitulo: 'Plataforma de aprendizado AI-first Â· metodologia Alpha School',
    categoria: 'suporte',
    prioridade: 'media',
    status: 'MVP funcional â€” 3 verticais (idioma, concurso, clearix)',
    faseAtual: 'Fase 1 â†’ aguardando ativaÃ§Ã£o comercial',
    repo: 'D:\\projetos\\diferentes\\nexus',
    stack: 'React 19 Â· TypeScript Â· Supabase Â· Gemini Â· 126 tabelas Â· 14 schemas',
    proximo: 'Ativar Clearix University como apoio ao Academy',
  },
  {
    nome: 'Lumina',
    subtitulo: 'SaaS de digital signage para lojas fÃ­sicas',
    categoria: 'suporte',
    prioridade: 'media',
    status: 'MVP tÃ©cnico funcional â€” nÃ£o validado comercialmente',
    faseAtual: 'Fase 1 â†’ upsell futuro',
    repo: 'D:\\projetos\\lumina_box',
    stack: 'React 19 Â· Vite Â· TypeScript Â· Supabase Â· TailwindCSS',
    proximo: 'Atualizar README e package.json Â· Avaliar como upsell para clientes Clearix',
    bloqueio: 'Sem modelo comercial nem onboarding definidos',
  },
  {
    nome: 'Pulso',
    subtitulo: 'Sistema operacional editorial para vÃ­deos faceless',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'MVP em execuÃ§Ã£o â€” uso interno da DIGIAI',
    faseAtual: 'Fase 1 â€” incubaÃ§Ã£o',
    repo: 'D:\\projetos\\diferentes\\pulso_control',
    stack: 'Next.js Â· Supabase Â· n8n Â· OpenAI/Claude Â· ElevenLabs',
    proximo: 'Usar como motor de conteÃºdo para o Academy (Regra 5: Pulso trabalha para a DIGIAI primeiro)',
    bloqueio: 'DecisÃ£o estratÃ©gica pendente: motor de mÃ­dia interno ou canal externo?',
  },
  {
    nome: 'Polapetit',
    subtitulo: 'Sistema operacional para empresa de eventos/festas infantis',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'MVP interno â€” single-tenant, operaÃ§Ã£o PolÃ¡ Petit',
    faseAtual: 'Fase 1 â€” incubaÃ§Ã£o',
    repo: 'D:\\projetos\\diferentes\\polapetit',
    stack: 'React Â· Vite Â· TypeScript Â· Supabase Â· Firebase',
    proximo: 'Fechar mocks/TODOs Â· DecisÃ£o: sistema interno ou SaaS vertical?',
  },
  {
    nome: 'Qual a Foto',
    subtitulo: 'Plataforma de aprovaÃ§Ã£o de fotos para fotÃ³grafos',
    categoria: 'incubacao',
    prioridade: 'baixa',
    status: 'MVP em construÃ§Ã£o â€” test fechado, bugs ativos',
    faseAtual: 'Fase 1 â€” incubaÃ§Ã£o',
    repo: 'D:\\projetos\\diferentes\\qual_foto',
    stack: 'SvelteKit 2 Â· TypeScript Â· Supabase Â· TailwindCSS Â· pgcrypto',
    proximo: 'Fechar UI de criaÃ§Ã£o de galeria Â· Corrigir bug de seleÃ§Ãµes Â· Ativar worker IA',
    bloqueio: 'IA worker (Gemini 2.0 Flash) nÃ£o confirmado em produÃ§Ã£o',
  },
  {
    nome: 'Nipo School',
    subtitulo: 'Plataforma educacional musical comunitÃ¡ria Â· ADNIPO Suzano',
    categoria: 'institucional',
    prioridade: 'baixa',
    status: 'Piloto robusto â€” pronto para piloto controlado',
    faseAtual: 'Fase 1 â€” institucional',
    repo: 'D:\\projetos\\diferentes\\nipo_school',
    stack: 'Next.js Â· TypeScript Â· Supabase Â· OpenAI Â· TailwindCSS',
    proximo: 'Iniciar piloto com ADNIPO Â· Resolver mÃ³dulo de pagamentos',
    bloqueio: 'Pagamentos ausentes bloqueiam rollout comercial',
  },
  {
    nome: 'DIGIAI App',
    subtitulo: 'Painel de comando interno da DIGIAI',
    categoria: 'infraestrutura',
    prioridade: 'alta',
    status: 'Designer system pronto Â· App operacional em construÃ§Ã£o',
    faseAtual: 'Fase 1 â€” em implementaÃ§Ã£o',
    repo: 'D:\\projetos\\digiai',
    stack: 'React 19 Â· Vite Â· TypeScript Â· TailwindCSS 4 Â· Motion',
    proximo: 'Implementar mÃ³dulos 1â†’5 (VisÃ£o, PortfÃ³lio, Trilha, Lista Mestra, Backlog)',
  },
];

const categoriaBadge: Record<string, { label: string; className: string }> = {
  'produto-ancora': { label: 'Produto-Ã¢ncora', className: 'bg-[#2563EB]/20 text-[#2563EB] border-[#2563EB]/30' },
  'alavanca-critica': { label: 'Alavanca crÃ­tica', className: 'bg-[#06B6D4]/20 text-[#06B6D4] border-[#06B6D4]/30' },
  suporte: { label: 'Suporte prioritÃ¡rio', className: 'bg-white/10 text-white/60 border-white/10' },
  incubacao: { label: 'IncubaÃ§Ã£o', className: 'bg-white/5 text-white/40 border-white/5' },
  institucional: { label: 'Institucional', className: 'bg-white/5 text-white/30 border-white/5' },
  infraestrutura: { label: 'Infraestrutura interna', className: 'bg-white/8 text-white/50 border-white/8' },
};

const prioridadeDot: Record<string, string> = {
  maxima: 'bg-[#2563EB]',
  alta: 'bg-[#06B6D4]',
  media: 'bg-white/40',
  baixa: 'bg-white/15',
};

export default function Portfolio() {
  const [expandido, setExpandido] = useState<string | null>('Clearix');

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PortfÃ³lio de Produtos</h1>
        <p className="text-white/50 mt-1">9 frentes Â· hierarquia canÃ´nica Â· atualizado 2026-04-16</p>
      </div>

      <div className="space-y-3">
        {PRODUTOS.map((p) => {
          const badge = categoriaBadge[p.categoria];
          const isOpen = expandido === p.nome;

          return (
            <div
              key={p.nome}
              className={`rounded-2xl border transition-all duration-200 overflow-hidden
                ${p.categoria === 'produto-ancora'
                  ? 'border-[#2563EB]/30 bg-[#2563EB]/5'
                  : p.categoria === 'alavanca-critica'
                  ? 'border-[#06B6D4]/20 bg-[#06B6D4]/3'
                  : 'border-white/8 bg-white/2'
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
                    <span className={`text-[10px] font-mono uppercase tracking-widest px-2 py-0.5 rounded border ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>
                  <div className="text-sm text-white/50 mt-0.5 truncate">{p.subtitulo}</div>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs font-mono text-white/30 hidden md:block">{p.faseAtual}</span>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-white/40" /> : <ChevronDown className="w-4 h-4 text-white/40" />}
                </div>
              </button>

              {isOpen && (
                <div className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Status</div>
                      <div className="text-sm text-white/80">{p.status}</div>
                    </div>
                    <div>
                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Fase</div>
                      <div className="text-sm text-white/80">{p.faseAtual}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">RepositÃ³rio</div>
                      <div className="text-sm font-mono text-white/60 bg-white/5 rounded-lg px-3 py-2">{p.repo}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest mb-1">Stack</div>
                      <div className="text-sm text-white/60">{p.stack}</div>
                    </div>
                    <div className="md:col-span-2">
                      <div className="text-[10px] font-mono text-[#06B6D4] uppercase tracking-widest mb-1">PrÃ³ximo passo</div>
                      <div className="text-sm text-white/80">{p.proximo}</div>
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
  );
}

