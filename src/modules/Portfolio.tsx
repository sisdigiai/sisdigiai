import { useState, useEffect } from 'react';
import { ExternalLink, X, AlertTriangle, ArrowRight, Server } from 'lucide-react';
import { companyStore } from '../lib/companyStore';
import type { DigitalAsset } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

// Estado real levantado das pastas em D:\projetos (docs/portfolio-estado-real.md, 2026-07-10).
// Maturidade = estimativa editorial do avanço (não é métrica automática).

type Estado = 'no-ar' | 'funciona' | 'travado' | 'prototipo';
type Tier = 'ancora' | 'alavanca' | 'suporte' | 'incubacao' | 'autonomo' | 'institucional' | 'infra';

interface App {
  nome: string;
  mono: string;         // monograma no card
  cor: string;          // token eco-*
  tagline: string;
  tier: Tier;
  estado: Estado;
  maturidade: number;   // 0-100
  funcao: string;       // 1 métrica/função básica na frente
  stack: string;
  repos: string;
  git: string;
  proximo: string;
  bloqueio?: string;
  urls: { label: string; url: string }[];
}

const APPS: App[] = [
  {
    nome: 'Clearix', mono: 'CX', cor: 'var(--color-eco-clearix)', tagline: 'Ecossistema SaaS para varejo óptico — produto-âncora',
    tier: 'ancora', estado: 'no-ar', maturidade: 80, funcao: '17 sub-apps · 1 cliente real (Mello)',
    stack: 'Polyrepo · Next 16 / SvelteKit · React 19 · Supabase (SSO gateway)',
    repos: 'D:\\projetos\\clearix_eco_full (hub, vendas, finance, bi, estoque, paciente, client, calc, atlas, lens…)',
    git: 'Atlas no ar · vendas/estoque commit 08/jul/2026',
    proximo: 'Fechar 1º piloto externo — entrevistas com óticas de Suzano',
    bloqueio: 'Jurídico: minuta DPA / gap ADR-0020 trava a 1ª venda externa',
    urls: [{ label: 'clearix.app.br', url: 'https://clearix.app.br' }, { label: 'Atlas (admin)', url: 'https://digiaiatlas.netlify.app' }],
  },
  {
    nome: 'Clearix Site', mono: 'CS', cor: 'var(--color-eco-clearix)', tagline: 'Landing institucional pública do ecossistema Clearix',
    tier: 'institucional', estado: 'no-ar', maturidade: 80, funcao: 'No ar · Cloudflare · clearix.app.br',
    stack: 'Astro 5 (SSG) · Tailwind 3 · TypeScript · sem banco',
    repos: 'D:\\projetos\\clearix-site',
    git: '88fd99f 08/jun/2026 (minuta DPA)',
    proximo: 'Manter em sincronia com o produto e o jurídico',
    urls: [{ label: 'clearix.app.br', url: 'https://clearix.app.br' }],
  },
  {
    nome: 'Ótica Sem Improviso', mono: 'OSI', cor: 'var(--color-eco-osi)', tagline: 'Primeira isca paga — funil pro Clearix',
    tier: 'alavanca', estado: 'no-ar', maturidade: 70, funcao: 'Funil 100% no ar · 0 vendas ainda',
    stack: 'React 19 · Vite 6 · Tailwind 4 · Hotmart+Kiwify · pixels Meta/TikTok',
    repos: 'app_oticasemimproviso (leitor) · otica_sem_improviso (landing)',
    git: 'leitor 6f5840a · landing 2d12fbc (jun/2026)',
    proximo: 'Tráfego: contatar óticas-alvo + ativar afiliados',
    bloqueio: 'Sem tráfego qualificado; fix de tracking/leads pendente de deploy',
    urls: [{ label: 'oticasemimproviso.netlify.app', url: 'https://oticasemimproviso.netlify.app' }],
  },
  {
    nome: 'Pulso', mono: 'PU', cor: 'var(--color-eco-pulso)', tagline: 'Produção de vídeos curtos faceless — produto autônomo',
    tier: 'autonomo', estado: 'no-ar', maturidade: 84, funcao: '248 posts · 124k views · 5 redes · esteira viva',
    stack: 'Next 16 · React 19 · Supabase · pg_cron · OpenAI/Claude · ElevenLabs',
    repos: 'D:\\projetos\\pulso_control',
    git: 'control 5fac8e3 07/jul/2026',
    proximo: 'APIs por rede rodando; teste API vs manual pela entrega; app cobre a diária travada; humano autoriza sempre (R-011)',
    urls: [{ label: 'pulsoprojects.vercel.app', url: 'https://pulsoprojects.vercel.app' }],
  },
  {
    nome: 'Lumina', mono: 'LU', cor: 'var(--color-eco-lumina)', tagline: 'Digital signage — plus do ecossistema Clearix',
    tier: 'suporte', estado: 'no-ar', maturidade: 70, funcao: 'Produção interna (Lancaster Suzano ~50d)',
    stack: 'React 19 · Vite · TS · Supabase · Lumina Signage DS v1.0',
    repos: 'D:\\projetos\\lumina_box',
    git: '90586c2 17/jun/2026 (heartbeat online/offline)',
    proximo: 'Monetização externa como plus do Clearix',
    bloqueio: 'Falta oferta comercial externa',
    urls: [{ label: 'luminabox.netlify.app', url: 'https://luminabox.netlify.app' }],
  },
  {
    nome: 'Nexus', mono: 'NX', cor: 'var(--color-eco-nexus)', tagline: 'Plataforma de aprendizado AI-first — abriga a Clearix Academy (Clearix University)',
    tier: 'suporte', estado: 'no-ar', maturidade: 55, funcao: 'Abriga a Clearix Academy · adoção zero',
    stack: 'React 19 · Vite · Express · Supabase · Firebase · Gemini',
    repos: 'D:\\projetos\\nexus (126 tabelas)',
    git: '3224d3f 01/jul/2026 (14 módulos Clearix Uni)',
    proximo: 'Ativar uso real (apoio ao Academy / Clearix University)',
    bloqueio: 'MVP em dev; verticais idiomas/concursos deprecadas (ADR-0038)',
    urls: [{ label: 'sisnexus.netlify.app', url: 'https://sisnexus.netlify.app' }],
  },
  {
    nome: 'Clearix Calc', mono: 'CC', cor: 'var(--color-eco-clearix)', tagline: 'Calculadora de grau — PWA pública, grátis, sem login (isca do Clearix)',
    tier: 'suporte', estado: 'no-ar', maturidade: 60, funcao: 'Grátis · sem login · 100% client-side',
    stack: 'Next 16 · React 19 · Tailwind 4 · Clearix Lens · sem banco/auth',
    repos: 'D:\\projetos\\clearix_eco_full\\clearix_calc',
    git: 'b14c5e6 16/jun/2026 (desenho da lente)',
    proximo: 'Domínio calc.clearix.app.br (SSL) · captura de lead via digiai',
    bloqueio: 'Domínio custom ainda não ativo (usar netlify.app na copy)',
    urls: [{ label: 'clearixcalc.netlify.app', url: 'https://clearixcalc.netlify.app' }],
  },
  {
    nome: 'Polapetit', mono: 'PP', cor: 'var(--color-eco-polapetit)', tagline: 'Sistema operacional para festas infantis',
    tier: 'incubacao', estado: 'no-ar', maturidade: 70, funcao: 'Produção (Buffet Taty Mello + landing)',
    stack: 'Vite · React 19 (Three.js/R3F) · Supabase · Firebase',
    repos: 'polapetit (app) · polapetit_landing (site)',
    git: 'app 766ac5d · landing 8a7f07d (mai/2026)',
    proximo: 'Validar experimento Persol · configurar domínio polapetit.com.br (DNS fora)',
    urls: [{ label: 'polapetit.netlify.app', url: 'https://polapetit.netlify.app' }],
  },
  {
    nome: 'Qual a Foto', mono: 'QF', cor: 'var(--color-eco-qualafoto)', tagline: 'Aprovação de fotos para fotógrafos',
    tier: 'incubacao', estado: 'no-ar', maturidade: 50, funcao: 'Site no ar · worker IA roda local',
    stack: 'SvelteKit (web) · Worker Python (RawTherapee) · Supabase',
    repos: 'D:\\projetos\\qual_foto (monorepo apps/web + worker)',
    git: '2d4d389 29/mai/2026',
    proximo: 'Fechar UI de galeria · confirmar worker IA em produção',
    bloqueio: 'Worker de processamento roda local (não hospedado)',
    urls: [{ label: 'qualfoto.netlify.app', url: 'https://qualfoto.netlify.app' }],
  },
  {
    nome: 'Easy Idiomas', mono: 'EI', cor: 'var(--color-muted)', tagline: 'SaaS para escolas de idiomas (Easy Aula+)',
    tier: 'incubacao', estado: 'no-ar', maturidade: 55, funcao: 'Dashboard no ar e logado (Easy Aula+)',
    stack: 'React 19 · Vite · TS · Supabase · Gemini',
    repos: 'D:\\projetos\\easy-idiomas',
    git: 'e0538bf 29/mai/2026',
    proximo: 'Validar oferta com escolas · commitar pendências locais',
    urls: [{ label: 'easyidioma.netlify.app', url: 'https://easyidioma.netlify.app' }],
  },
  {
    nome: 'Nipo School', mono: 'NP', cor: 'var(--color-eco-nipo)', tagline: 'Ensino musical comunitário · ADNIPO Suzano',
    tier: 'incubacao', estado: 'travado', maturidade: 50, funcao: 'Landing no ar · piloto interno travado',
    stack: 'Next 16 · React 19 · TS · Supabase · OpenAI',
    repos: 'D:\\projetos\\nipo_school',
    git: '3e4afe4 31/mai/2026 (design system DIGIAI)',
    proximo: 'Corrigir tabela profiles · fechar checklist go/no-go · piloto ADNIPO',
    bloqueio: 'Bug de acesso à tabela profiles + checklist de piloto incompleto',
    urls: [{ label: 'niposchool.vercel.app', url: 'https://niposchool.vercel.app' }],
  },
  {
    nome: 'Mello Eyewear', mono: 'ME', cor: 'var(--color-eco-app)', tagline: 'E-commerce de óculos + provador virtual',
    tier: 'autonomo', estado: 'funciona', maturidade: 65, funcao: 'Infra Netlify + 5 functions · DNS a confirmar',
    stack: 'React 19 · Vite · Express · Supabase · Mercado Pago',
    repos: 'D:\\projetos\\melloeyewear',
    git: '9c90a08 09/jul/2026 (domínio oficial)',
    proximo: 'Confirmar DNS/publicação · integração Clearix (ADR-0002/0040)',
    bloqueio: 'Publicação de domínio a confirmar',
    urls: [{ label: 'mellooticas.com.br', url: 'https://mellooticas.com.br' }],
  },
  {
    nome: 'DIGIAI App', mono: 'DA', cor: 'var(--color-secondary)', tagline: 'Painel de comando interno da holding (este app)',
    tier: 'infra', estado: 'no-ar', maturidade: 85, funcao: '33 módulos · RBAC · SEO · /health 200',
    stack: 'React 19 · Vite · TS · Tailwind 4 · Supabase · Chart.js',
    repos: 'D:\\projetos\\digiai',
    git: 'main atualizada (jul/2026)',
    proximo: 'Publicar drafts legais · rotação de credenciais',
    bloqueio: 'CNPJ em transição na RFB',
    urls: [{ label: 'sisdigiai.netlify.app', url: 'https://sisdigiai.netlify.app' }],
  },
  {
    nome: 'DIGIAI Site', mono: 'DS', cor: 'var(--color-secondary)', tagline: 'Landing institucional da holding',
    tier: 'institucional', estado: 'no-ar', maturidade: 80, funcao: 'No ar · auto-deploy Cloudflare',
    stack: 'Astro 5 (SSG) · Tailwind 3 · assets Supabase',
    repos: 'D:\\projetos\\digiai-site',
    git: '6bc1a53 09/jul/2026 (métricas reais)',
    proximo: 'Manter métricas sincronizadas com o banco',
    urls: [{ label: 'digiai.app.br', url: 'https://digiai.app.br' }],
  },
  {
    nome: 'Pulso Hub', mono: 'PH', cor: 'var(--color-eco-pulso)', tagline: 'Site público do Pulso — catálogo de vídeos e redes',
    tier: 'institucional', estado: 'no-ar', maturidade: 70, funcao: 'No ar em /hub · catálogo + "em alta"',
    stack: 'Next 16 · Tailwind 4 · Supabase (anon read-only)',
    repos: 'D:\\projetos\\pulso_hub',
    git: '7d3e072 29/jun/2026',
    proximo: 'Definir domínio próprio (hoje servido em /hub)',
    urls: [{ label: 'pulsoprojects.vercel.app/hub', url: 'https://pulsoprojects.vercel.app/hub' }],
  },
  {
    nome: 'DIGIAI MKT', mono: 'MK', cor: 'var(--color-eco-app)', tagline: 'Central de marketing multimarca — ideias → arte → agenda → publicação por IA',
    tier: 'infra', estado: 'no-ar', maturidade: 80, funcao: 'Pipeline 198→90 no ar · 5 marcas · robôs + custo IA',
    stack: 'React 19 · Vite 6 · Tailwind 4 · Supabase (schema mkt) · pg_cron · IA · Ateliê de Convergência',
    repos: 'D:\\projetos\\digiai_mkt',
    git: '0a0437a 09/jul/2026 (skin Ateliê de Convergência)',
    proximo: 'Publicação híbrida: API onde há (em teste), manual-guiado via navegador logado onde não há (ex.: Pessoal)',
    urls: [{ label: 'digiaimkt.netlify.app', url: 'https://digiaimkt.netlify.app' }],
  },
];

const TIER_LABEL: Record<Tier, string> = {
  ancora: 'Produto-âncora', alavanca: 'Alavancas críticas', suporte: 'Suporte prioritário',
  autonomo: 'Autônomos', incubacao: 'Incubação', institucional: 'Institucional', infra: 'Infraestrutura interna',
};
const TIER_ORDER: Tier[] = ['ancora', 'alavanca', 'suporte', 'autonomo', 'incubacao', 'institucional', 'infra'];

const ESTADO_META: Record<Estado, { label: string; cls: string; dot: string }> = {
  'no-ar':     { label: 'No ar',     cls: 'text-success border-success/40 bg-success/10',  dot: 'bg-success' },
  funciona:    { label: 'Funciona',  cls: 'text-secondary border-secondary/40 bg-secondary/10', dot: 'bg-secondary' },
  travado:     { label: 'Travado',   cls: 'text-danger border-danger/40 bg-danger/10',     dot: 'bg-danger' },
  prototipo:   { label: 'Protótipo', cls: 'text-warning border-warning/40 bg-warning/10',  dot: 'bg-warning' },
};

const OWNER_BY_NAME: Record<string, string> = {
  'Clearix': 'clearix', 'Ótica Sem Improviso': 'osi', 'Nexus': 'nexus', 'Lumina': 'lumina',
  'Pulso': 'pulso', 'Polapetit': 'polapetit', 'DIGIAI App': 'digiai',
};

// Logos reais (brancos, sobre o quadrado eco). Sem logo → monograma.
// Faltam criar no designer: Pulso, Polapetit, Qual a Foto, Easy, Nipo, Lumina, Mello, Academy.
// Brand book (brancos) para os prontos; public/ de cada app para os demais.
// Filtro CSS deixa todos brancos sobre o quadrado eco. Faltam: Polapetit, Easy, Academy.
const LOGO: Record<string, string> = {
  'Clearix': '/brand/clearix.svg',
  'Clearix Calc': '/brand/clearix.svg', // veste a cara do Clearix (é a isca)
  'Clearix Site': '/brand/clearix.svg',
  'Ótica Sem Improviso': '/brand/osi.png',
  'Nexus': '/brand/nexus.svg',
  'DIGIAI App': '/brand/digiai.svg',
  'DIGIAI Site': '/brand/digiai.svg',
  'DIGIAI MKT': '/brand/digiai.svg',
  'Pulso': '/brand/pulso.png',
  'Pulso Hub': '/brand/pulso.png',
  'Lumina': '/brand/lumina.svg',
  'Nipo School': '/brand/nipo.svg',
  'Mello Eyewear': '/brand/mello.png',
  'Qual a Foto': '/brand/qualfoto.png',
};

// Logos "badge" (têm fundo próprio) → mostrados inteiros no tile, sem filtro branco.
const BADGE = new Set(['Pulso', 'Pulso Hub', 'Nipo School', 'Mello Eyewear']);

// Onde cada frente vive (hospedagem real — levantamento 2026-07-10).
const HOST: Record<string, string> = {
  'Clearix': 'Netlify · polyrepo (17 repos)',
  'Ótica Sem Improviso': 'Netlify (leitor + landing)',
  'Pulso': 'Vercel · control',
  'Pulso Hub': 'Vercel · /hub (Supabase read-only)',
  'Lumina': 'Netlify · Supabase',
  'Nexus': 'Netlify · Supabase',
  'Clearix Calc': 'Netlify · PWA client-side (sem banco)',
  'Polapetit': 'Netlify (app + landing)',
  'Qual a Foto': 'Netlify (web) · worker local',
  'Easy Idiomas': 'Netlify · Supabase',
  'Nipo School': 'Vercel · Supabase',
  'Mello Eyewear': 'Netlify + Functions · Supabase',
  'DIGIAI App': 'Netlify · Supabase',
  'DIGIAI Site': 'Cloudflare Pages',
  'Clearix Site': 'Cloudflare Pages',
  'DIGIAI MKT': 'Netlify · Supabase (schema mkt)',
};

export default function Portfolio() {
  const [sel, setSel] = useState<App | null>(null);
  const [liveSites, setLiveSites] = useState<Record<string, number>>({});

  useEffect(() => {
    companyStore.listDigitalAssets().then((assets: DigitalAsset[]) => {
      const counts: Record<string, number> = {};
      for (const a of assets) {
        if (a.categoria === 'site' && a.status === 'ativo' && a.owner_product) counts[a.owner_product] = (counts[a.owner_product] || 0) + 1;
      }
      setLiveSites(counts);
    }).catch(() => {});
  }, []);
  const liveCount = (nome: string) => liveSites[OWNER_BY_NAME[nome] ?? ''] || 0;

  const noAr = APPS.filter(a => a.estado === 'no-ar').length;
  const travados = APPS.filter(a => a.estado === 'travado').length;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <PageHeader
        eyebrow="Hierarquia Canônica"
        title="Portfólio de Produtos"
        subtitle={`${APPS.length} frentes · ${noAr} no ar · ${travados} travadas · estado real 2026-07-10`}
      />

      {TIER_ORDER.filter(t => APPS.some(a => a.tier === t)).map(tier => (
        <div key={tier} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{TIER_LABEL[tier]}</span>
            <span className="h-px flex-1 bg-outline/15" />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {APPS.filter(a => a.tier === tier).map(a => {
              const est = ESTADO_META[a.estado];
              return (
                <button
                  key={a.nome}
                  onClick={() => setSel(a)}
                  className="relative text-left border border-outline/15 bg-surface-container p-5 pt-6 hover:bg-surface-high transition-colors group"
                >
                  {/* Cantos com bracket — gramática Geometric Precision (/brand) */}
                  <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: a.cor }} />
                  <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-outline/40" />

                  <div className="flex items-start justify-between gap-3">
                    <div className="w-12 h-12 flex items-center justify-center overflow-hidden font-mono font-bold shrink-0" style={BADGE.has(a.nome) ? undefined : { background: a.cor, color: 'var(--color-on-action)' }}>
                      {LOGO[a.nome]
                        ? <img src={LOGO[a.nome]} alt="" className={BADGE.has(a.nome) ? 'w-12 h-12 object-cover' : 'w-7 h-7 object-contain'} style={BADGE.has(a.nome) ? undefined : { filter: 'brightness(0) invert(1)' }} />
                        : a.mono}
                    </div>
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${est.cls}`}>{est.label}</span>
                  </div>

                  <div className="mt-4 font-serif text-xl font-semibold text-on-surface leading-tight tracking-tight">{a.nome}</div>
                  <div className="text-[12px] text-muted mt-1 leading-snug line-clamp-2 min-h-[2.5em]">{a.tagline}</div>

                  <div className="mt-3 flex items-center gap-1.5 font-mono text-[10px] text-on-surface-variant truncate">
                    <Server className="w-3 h-3 text-muted shrink-0" /> {HOST[a.nome] ?? '—'}
                  </div>

                  <div className="mt-3">
                    <div className="flex items-center justify-between text-[10px] font-mono text-muted mb-1">
                      <span>Maturidade</span><span className="tabular-nums">{a.maturidade}%</span>
                    </div>
                    <div className="h-1 bg-surface-lowest overflow-hidden">
                      <div className="h-full transition-all" style={{ width: `${a.maturidade}%`, background: a.cor }} />
                    </div>
                  </div>

                  <div className="mt-3 pt-3 border-t border-outline/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-on-surface-variant truncate">{a.funcao}</span>
                    {liveCount(a.nome) > 0
                      ? <span className="font-mono text-[9px] text-success shrink-0 flex items-center gap-1"><span className="w-1.5 h-1.5 bg-success" />{liveCount(a.nome)}</span>
                      : <span className="font-mono text-[9px] text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1">detalhes <ArrowRight className="w-3 h-3" /></span>}
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {/* Drawer de detalhe */}
      {sel && (
        <div className="fixed inset-0 z-50 flex justify-end" onClick={() => setSel(null)}>
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
          <div className="relative w-full max-w-md h-full bg-surface border-l border-outline/20 overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-outline/15 p-5 flex items-start gap-3">
              <div className="w-12 h-12 flex items-center justify-center overflow-hidden font-mono font-bold shrink-0" style={BADGE.has(sel.nome) ? undefined : { background: sel.cor, color: 'var(--color-on-action)' }}>
                {LOGO[sel.nome]
                  ? <img src={LOGO[sel.nome]} alt="" className={BADGE.has(sel.nome) ? 'w-12 h-12 object-cover' : 'w-7 h-7 object-contain'} style={BADGE.has(sel.nome) ? undefined : { filter: 'brightness(0) invert(1)' }} />
                  : sel.mono}
              </div>
              <div className="flex-1 min-w-0">
                <div className="font-serif text-xl font-semibold text-on-surface">{sel.nome}</div>
                <div className="text-[12px] text-muted mt-0.5">{sel.tagline}</div>
              </div>
              <button onClick={() => setSel(null)} className="p-1.5 text-muted hover:text-on-surface" aria-label="Fechar"><X className="w-4 h-4" /></button>
            </div>

            <div className="p-5 space-y-5">
              <div className="flex items-center gap-2">
                <span className={`font-mono text-[10px] uppercase tracking-wider px-2 py-1 border ${ESTADO_META[sel.estado].cls}`}>{ESTADO_META[sel.estado].label}</span>
                <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-outline/20 text-muted">{TIER_LABEL[sel.tier]}</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] font-mono text-muted mb-1"><span>Maturidade</span><span className="tabular-nums">{sel.maturidade}%</span></div>
                <div className="h-1.5 bg-surface-lowest overflow-hidden"><div className="h-full" style={{ width: `${sel.maturidade}%`, background: sel.cor }} /></div>
              </div>

              <div className="border border-outline/15 bg-surface-lowest p-3 flex items-start gap-2.5">
                <Server className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
                <div>
                  <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-0.5">Onde está</div>
                  <div className="text-sm text-on-surface">{HOST[sel.nome] ?? '—'}</div>
                </div>
              </div>

              <Field label="Stack" value={sel.stack} />
              <Field label="Repositórios" value={sel.repos} mono />
              <Field label="Git" value={sel.git} mono />
              <div>
                <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-1">Próximo passo</div>
                <div className="text-sm text-on-surface flex items-start gap-2"><ArrowRight className="w-4 h-4 text-secondary shrink-0 mt-0.5" />{sel.proximo}</div>
              </div>
              {sel.bloqueio && (
                <div className="border border-danger/30 bg-danger/5 p-3">
                  <div className="text-[10px] font-mono text-danger uppercase tracking-widest mb-1 flex items-center gap-1.5"><AlertTriangle className="w-3.5 h-3.5" />Bloqueio</div>
                  <div className="text-sm text-on-surface-variant">{sel.bloqueio}</div>
                </div>
              )}
              {sel.urls.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Links</div>
                  <div className="space-y-1.5">
                    {sel.urls.map(u => (
                      <a key={u.url} href={u.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-mono text-success hover:underline">
                        {u.label} <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-1">{label}</div>
      <div className={`text-sm text-on-surface-variant ${mono ? 'font-mono text-[12px] bg-surface-lowest border border-outline/15 px-2.5 py-1.5 break-words' : ''}`}>{value}</div>
    </div>
  );
}
