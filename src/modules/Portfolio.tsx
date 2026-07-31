import { useState, useEffect } from 'react';
import { ExternalLink, X, AlertTriangle, ArrowRight, Server } from 'lucide-react';
import { companyStore } from '../lib/companyStore';
import type { DigitalAsset } from '../lib/supabase';
import PageHeader from '../components/PageHeader';

// Estado real levantado das pastas em D:\projetos (docs/portfolio-estado-real.md, 2026-07-10).
// Maturidade = estimativa editorial do avanço (não é métrica automática).

export type Estado = 'no-ar' | 'funciona' | 'travado' | 'prototipo';
export type Tier = 'ancora' | 'alavanca' | 'suporte' | 'incubacao' | 'autonomo' | 'institucional' | 'infra';

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
  subApps?: { nome: string; desc: string }[]; // suítes (ex.: Clearix) — detalhe no drawer
}

const APPS: App[] = [
  {
    nome: 'Clearix', mono: 'CX', cor: 'var(--color-eco-clearix)', tagline: 'Ecossistema SaaS para varejo óptico — produto-âncora',
    tier: 'ancora', estado: 'no-ar', maturidade: 85, funcao: 'Suíte de 17 apps multi-tenant em produção · 1 cliente real (Mello)',
    stack: 'Polyrepo (17 sub-apps) · Next 16 / SvelteKit · React 19 · Supabase · SSO (AES-256)',
    repos: 'D:\\projetos\\clearix_eco_full (17 sub-apps — ver lista abaixo)',
    git: 'hub 17/jun · vendas/estoque 08/jul · lens 07/jul (2026)',
    proximo: 'Fechar 1º piloto externo — entrevistas com óticas de Suzano',
    bloqueio: 'Jurídico: minuta DPA / gap ADR-0020 trava a 1ª venda externa',
    urls: [{ label: 'clearix.app.br', url: 'https://clearix.app.br' }, { label: 'hub', url: 'https://clearixhub.netlify.app' }],
    subApps: [
      { nome: 'Hub', desc: 'Gateway SSO + admin multi-tenant (tenants, usuários, papéis)' },
      { nome: 'Vendas', desc: 'PDV: pedidos, caixa, carnês, entregas, financiamento' },
      { nome: 'Estoque', desc: 'Inventário, barcode, etiquetas QR, fotos de catálogo' },
      { nome: 'Lens', desc: 'Catálogo de lentes + pricing engine por tenant' },
      { nome: 'Finance', desc: 'DRE, fluxo, NF-e, conciliação, leitura fiscal por IA' },
      { nome: 'DCL / Lab', desc: 'Kanban de produção de lentes (receita → entrega)' },
      { nome: 'Clínicos', desc: 'Agenda, anamnese, prescrições, prontuário' },
      { nome: 'Paciente', desc: 'Portal B2C sem login (por token): receitas, histórico' },
      { nome: 'BI', desc: 'Command center executivo cross-app (~20 painéis)' },
      { nome: 'CRM', desc: 'Atendimento WhatsApp multicanal + chatbot builder' },
      { nome: 'Fone', desc: 'Ligações, campanhas telefônicas, follow-ups (RFM)' },
      { nome: 'RH', desc: 'Ponto, escalas, férias, comissões, folha' },
      { nome: 'Marketing', desc: 'Growth: campanhas, leads, estúdio criativo IA' },
      { nome: 'Express', desc: 'PDV rápido — converte lead de campanha em venda' },
      { nome: 'Loyalty', desc: 'Fidelidade: pontos, cashback, cupons, níveis' },
      { nome: 'AR Vision', desc: 'Prova virtual de armações (AR) + pupilometria' },
      { nome: 'Import', desc: 'Migração de legados — onboarding de tenant novo' },
    ],
  },
  {
    nome: 'Clearix Site', mono: 'CS', cor: 'var(--color-eco-clearix)', tagline: 'Landing institucional pública do ecossistema Clearix',
    tier: 'institucional', estado: 'no-ar', maturidade: 82, funcao: 'No ar (marca Clearix): hero de dor + 4 planos canônicos ADR-0022 (349/899/1499/sob consulta) + add-ons + ecossistema · WhatsApp',
    stack: 'Astro 5 (SSG) · Tailwind 3 · TypeScript · Cloudflare · sem banco',
    repos: 'D:\\projetos\\clearix-site',
    git: 'd8fc51e 11/jul/2026 (repo de deploy no README)',
    proximo: 'Confirmar self-serve do "grátis 30 dias" (provisiona trial?) · manter sincronia com produto/jurídico',
    bloqueio: '1ª venda externa depende de DPA (ADR-0020) · planos no Mercado Pago ainda no pricing antigo (397/797/1497) — recriar p/ bater com o site (billing, não é defeito do site)',
    urls: [{ label: 'clearix.app.br', url: 'https://clearix.app.br' }],
  },
  {
    nome: 'Ótica Sem Improviso', mono: 'OSI', cor: 'var(--color-eco-osi)', tagline: 'Primeira isca paga — funil pro Clearix',
    tier: 'alavanca', estado: 'no-ar', maturidade: 90, funcao: 'Build 100% (landing + app + checkout) · fase VENDER · 0 vendas',
    stack: 'React 19 · Vite 6 · Tailwind 4 · Hotmart+Kiwify · pixels Meta/TikTok · ebook-v3.pdf',
    repos: 'otica_sem_improviso (landing 20 seções + gerador PDF) · app_oticasemimproviso (leitor 28 págs/5 módulos)',
    git: 'landing 2d12fbc · leitor 6f5840a (jun/2026)',
    proximo: 'VENDER: prospecção ativa (WhatsApp óticas Suzano) + ativar afiliados',
    bloqueio: 'Falta tráfego/vendas (build 100%) · Central do Afiliado ainda sem material',
    urls: [{ label: 'landing', url: 'https://landingoticasemimproviso.netlify.app' }, { label: 'app leitor', url: 'https://oticasemimproviso.netlify.app' }],
  },
  {
    nome: 'Pulso', mono: 'PU', cor: 'var(--color-eco-pulso)', tagline: 'Produção de vídeos curtos faceless — produto autônomo',
    tier: 'autonomo', estado: 'no-ar', maturidade: 85, funcao: 'Canal PULSO VIVO no YouTube: 42,9k views vitalícias · 223 inscritos (+114 em 28d) · 21,7k views/28d · Shorts diários (verificado no Studio 31/07) — o app registra só 26,7k: coleta parada',
    stack: 'Next 16 · React 19 · Supabase · pg_cron · OpenAI/Claude · ElevenLabs',
    repos: 'D:\\projetos\\pulso_control',
    git: 'control 5fac8e3 07/jul/2026',
    proximo: 'Religar registro/coleta do pulso_control — a publicação roda POR FORA do app desde 16/06 e o canal explodiu depois disso',
    bloqueio: 'App cego: banco parou em 20/07 (26,7k reg.) enquanto o canal cresce — telemetria descolada da realidade',
    urls: [{ label: 'pulsoprojects.vercel.app', url: 'https://pulsoprojects.vercel.app' }],
  },
  {
    nome: 'Limelight', mono: 'LL', cor: 'var(--color-eco-app)', tagline: 'Fábrica de conteúdo da Mello — série "Transforme Sua Visão" (12 temporadas · 72 eps)',
    tier: 'suporte', estado: 'funciona', maturidade: 68, funcao: '144 episódios estruturados · motores de roteiro/imagem/áudio LIGADOS (T1E01 provado E2E, ~US$0,006/roteiro) · coleta diária 10h · publicação em DRY_RUN (gate humano R-011) — números vivos no espelho do Marketing',
    stack: 'Vite · React 19 · TS · Tailwind 4 · Supabase próprio (org Pulso) · Gemini/Claude · ElevenLabs · Veo · FFmpeg local',
    repos: 'D:\\projetos\\limelight_studio',
    git: '769ed9f (reconciliar kanban idempotente)',
    proximo: 'Kit avatar da Taty (dono) · desligar DRY_RUN quando autorizado · confirmar URL de produção',
    bloqueio: 'Publicação real travada em DRY_RUN até o dono autorizar · avatar/lip-sync aguardam kit',
    urls: [],
  },
  {
    nome: 'Lumina', mono: 'LU', cor: 'var(--color-eco-lumina)', tagline: 'Digital signage — plus do ecossistema Clearix',
    tier: 'suporte', estado: 'no-ar', maturidade: 72, funcao: 'Produção real · 4 telas (1 online) · 67 mídias · playlist ativa',
    stack: 'React 19 · Vite · TS · Supabase (Realtime) · player web · Lumina Signage DS v1.0',
    repos: 'D:\\projetos\\lumina_box',
    git: '90586c2 17/jun/2026 (heartbeat online/offline)',
    proximo: 'Externalizar: multitenancy/RLS + baseline de migrations + camada comercial',
    bloqueio: 'Single-workspace (sem multitenancy real) trava vender pra vários clientes',
    urls: [{ label: 'luminabox.netlify.app (landing + painel)', url: 'https://luminabox.netlify.app' }],
  },
  {
    nome: 'Nexus', mono: 'NX', cor: 'var(--color-eco-nexus)', tagline: 'Plataforma de aprendizado AI-first — abriga a Clearix Academy (Clearix University)',
    tier: 'suporte', estado: 'no-ar', maturidade: 70, funcao: 'Universidade Clearix: 18 módulos · 196 lições · 74 workshops · gamificação + certificados',
    stack: 'Vite · React 19 · Express · Supabase (próprio + Clearix read-only) · Firebase · Gemini (Nex/Doug)',
    repos: 'D:\\projetos\\nexus (Universidade Clearix + Manual OSI · landing vende OSI R$48,50)',
    git: '3224d3f 01/jul/2026 (módulos do Manual Clearix)',
    proximo: 'Levar a equipe a treinar (dono já em 21%) · corrigir SSO → /clearix',
    bloqueio: '⚠ 4 chaves de API expostas no .env (rotacionar) · adoção ainda só o dono · SSO /clearix quebrado',
    urls: [{ label: 'sisnexus.netlify.app', url: 'https://sisnexus.netlify.app' }],
  },
  {
    nome: 'Clearix Calc', mono: 'CC', cor: 'var(--color-eco-clearix)', tagline: 'Calculadora de grau — PWA pública, grátis, sem login (isca do Clearix)',
    tier: 'suporte', estado: 'no-ar', maturidade: 85, funcao: '12 calculadoras ópticas · fórmula + exemplo + enviar no WhatsApp · offline · isca Clearix/OSI',
    stack: 'Next 16 · React 19 · Tailwind 4 · Clearix Lens · PWA (sw.js) · sem banco/auth',
    repos: 'D:\\projetos\\clearix_eco_full\\clearix_calc',
    git: 'b14c5e6 16/jun/2026 (desenho da lente)',
    proximo: 'Captura de lead via digiai · ampliar tabela de lentes de contato · histórico opcional',
    bloqueio: 'Domínio custom calc.clearix.app.br ainda não ativo (SSL) — usar netlify.app na copy',
    urls: [{ label: 'clearixcalc.netlify.app', url: 'https://clearixcalc.netlify.app' }],
  },
  {
    nome: 'Polapetit', mono: 'PP', cor: 'var(--color-eco-polapetit)', tagline: 'Sistema operacional para festas infantis',
    tier: 'autonomo', estado: 'no-ar', maturidade: 72, funcao: 'ERP do Buffet Taty Mello em produção — 20 módulos admin (CRM, pipeline, propostas, contratos, financeiro, estoque) + portal do cliente + simulador 3D',
    stack: 'Vite · React 19 (Three.js/R3F) · Supabase · Firebase',
    repos: 'D:\\projetos\\polapetit',
    git: '766ac5d 25/mai/2026 (experimento Persol)',
    proximo: 'Validar experimento Persol (decisão binária) · futuro app.polapetit.com.br',
    urls: [{ label: 'polapetitapp.netlify.app', url: 'https://polapetitapp.netlify.app' }],
  },
  {
    nome: 'Polapetit Site', mono: 'PS', cor: 'var(--color-eco-polapetit)', tagline: 'Landing institucional do Buffet Taty Mello — festas infantis premium',
    tier: 'institucional', estado: 'no-ar', maturidade: 70, funcao: 'No ar: posicionamento premium ("12 anos · 1.200 famílias") + simulador de festa + CTA WhatsApp/consultora — capta leads da operação real',
    stack: 'Express · Drizzle · Radix · AWS S3 (fullstack)',
    repos: 'D:\\projetos\\polapetit_landing',
    git: '8a7f07d 29/mai/2026',
    proximo: 'Corrigir imagem do hero (quebrada na primeira dobra)',
    bloqueio: 'Domínio polapetit.com.br não resolve (DNS fora) — usar netlify.app na copy',
    urls: [{ label: 'polapetit.netlify.app', url: 'https://polapetit.netlify.app' }],
  },
  {
    nome: 'Qual a Foto', mono: 'QF', cor: 'var(--color-eco-qualafoto)', tagline: 'Aprovação de fotos para fotógrafos',
    tier: 'incubacao', estado: 'no-ar', maturidade: 58, funcao: 'Plataforma no ar e logada: 10 galerias, 82 fotos, análise IA RODADA (81 com score) · magic link COMPROVADO (29 fotos escolhidas por clientes) · 8 fotógrafos externos testaram em jan/26 · admin próprio (stats com bug)',
    stack: 'SvelteKit (web) · Worker Python (RawTherapee) · Supabase · Gemini',
    repos: 'D:\\projetos\\qual_foto (monorepo apps/web + worker)',
    git: '2d4d389 29/mai/2026 · AGENTS.md + docs/brand não commitados',
    proximo: 'Keep-alive do Supabase free · corrigir botão Entrar da landing · hospedar worker',
    bloqueio: 'Supabase free pausou (restaurado 13/jul FALTANDO 21 DIAS pro prazo final) · worker roda local (não hospedado)',
    urls: [{ label: 'qualfoto.netlify.app', url: 'https://qualfoto.netlify.app' }],
  },
  {
    nome: 'Easy Idiomas', mono: 'EI', cor: 'var(--color-muted)', tagline: 'SaaS para escolas de idiomas (Easy Aula+)',
    tier: 'incubacao', estado: 'no-ar', maturidade: 58, funcao: 'Plataforma completa no ar: admin (16 páginas) + portais aluno e professor · presença por QR Code · assistente IA (Gemini) · multi-tenant com RLS + signup por convite — dados demo (seed), sem escola real',
    stack: 'React 19 · Vite 6 · TS · Tailwind 4 · Supabase (18 migrations) · Gemini',
    repos: 'D:\\projetos\\easy-idiomas',
    git: 'e0538bf 29/mai/2026 · redesign de 3 dashboards NÃO commitado',
    proximo: 'Commitar + deployar redesign local dos dashboards · validar oferta com escolas reais',
    bloqueio: 'Zero uso real (9 alunos seed) · redesign só na máquina local — risco de perda',
    urls: [{ label: 'easyidioma.netlify.app', url: 'https://easyidioma.netlify.app' }],
  },
  {
    nome: 'Nipo School', mono: 'NP', cor: 'var(--color-eco-nipo)', tagline: 'Ensino musical comunitário · ADNIPO Suzano',
    tier: 'incubacao', estado: 'no-ar', maturidade: 55, funcao: 'Plataforma multi-tenant de ensino musical no ar: 66 rotas, gamificação, presença QR, portfólio do aluno, IA pedagógica (GPT-4o) · login RESTAURADO 13/jul (Supabase free tinha pausado)',
    stack: 'Next 16 · React 19 · TS · Supabase (71+ migrations) · OpenAI',
    repos: 'D:\\projetos\\nipo_school',
    git: 'main d46659f · piloto Nipo Wa (3e4afe4) em branch SÓ local',
    proximo: 'Retomar piloto ADNIPO · pushar branch do piloto Nipo Wa · keep-alive do Supabase free',
    bloqueio: 'Supabase free pausa por inatividade (causou o 503 do login) · piloto ADNIPO parado · branch do piloto não pushado',
    urls: [{ label: 'niposchool.vercel.app', url: 'https://niposchool.vercel.app' }],
  },
  {
    nome: 'Mello Eyewear', mono: 'ME', cor: 'var(--color-eco-app)', tagline: 'E-commerce de óculos + clube de fidelidade (∞ Club)',
    estado: 'no-ar', tier: 'autonomo', maturidade: 72, funcao: 'Software pronto (catálogo Clearix real 772 armações, carrinho, checkout MP blindado, webhook→ERP, auth, ∞ Club) — falta operacional pré-go-live',
    stack: 'React 19 · Vite · Express · Supabase (estoque Clearix) · Mercado Pago (prod) · Resend · Gemini · 5 functions Netlify',
    repos: 'D:\\projetos\\melloeyewear',
    git: '2eeba03 10/jul/2026 (autopreenchimento CEP ViaCEP)',
    proximo: 'Fotografar catálogo (grifes→Mello→Solar) · publicar Lentes Oftálmicas (receita+preço) · verificar domínio Resend · QA + 1 compra real+estorno',
    bloqueio: '🔴 Produtos sem foto (cards mostram placeholder) · categoria Óculos de Sol vazia · Lentes Oftálmicas "em construção" · e-mail transacional sem domínio verificado · compra real nunca validada',
    urls: [{ label: 'mellooticas.com.br', url: 'https://mellooticas.com.br' }],
  },
  {
    nome: 'DIGIAI App', mono: 'DA', cor: 'var(--color-secondary)', tagline: 'Painel de comando interno da holding (este app)',
    tier: 'infra', estado: 'no-ar', maturidade: 88, funcao: '33 módulos reais (0 stubs) · RBAC · tema DIGIAI House (claro/escuro) · painel de comando da holding',
    stack: 'React 19 · Vite · TS · Tailwind 4 · Supabase · Chart.js',
    repos: 'D:\\projetos\\digiai',
    git: 'f11fc2c 11/jul/2026 (revisão do Portfólio)',
    proximo: 'Publicar drafts legais (LGPD/ToS) · alimentar Roadmap com as pendências levantadas dos apps',
    bloqueio: 'CNPJ em transição na RFB · credenciais a rotacionar (ver task de segurança do Nexus)',
    urls: [{ label: 'app.digiai.app.br', url: 'https://app.digiai.app.br' }],
  },
  {
    nome: 'DIGIAI Site', mono: 'DS', cor: 'var(--color-secondary)', tagline: 'Landing institucional da holding',
    tier: 'institucional', estado: 'no-ar', maturidade: 85, funcao: 'No ar (DIGIAI House): hero + jornada + portfólio + "Operação Real" (20.708 vendas · 19.847 pacientes · 10 lojas, count-up)',
    stack: 'Astro 5 (SSG) · Tailwind 3 · Cloudflare Pages · assets Supabase',
    repos: 'D:\\projetos\\digiai-site',
    git: '6bc1a53 09/jul/2026 (métricas reais)',
    proximo: 'Deploy de dados pendentes (portfolio.ts/vitrines.ts não-commitados) · refinar copy (Nexus = Universidade Clearix)',
    urls: [{ label: 'digiai.app.br', url: 'https://digiai.app.br' }],
  },
  {
    nome: 'Pulso Hub', mono: 'PH', cor: 'var(--color-eco-pulso)', tagline: 'Site público do Pulso — catálogo de vídeos e redes',
    tier: 'institucional', estado: 'no-ar', maturidade: 95, funcao: 'Catálogo estilo Netflix: hero Originais + fileiras "Em alta"/"Histórias reais" · pôsteres lazy-load',
    stack: 'Next 16 · Tailwind 4 · Supabase (anon read-only)',
    repos: 'D:\\projetos\\pulso_hub',
    git: '888e29a 11/jul/2026',
    proximo: 'Domínio custom (.app.br) opcional · CTA "Seguir" ligar às redes reais',
    urls: [{ label: 'pulsohub.vercel.app', url: 'https://pulsohub.vercel.app' }],
  },
  {
    nome: 'DIGIAI MKT', mono: 'MK', cor: 'var(--color-eco-app)', tagline: 'Central de marketing multimarca — ideias → arte → agenda → publicação por IA',
    tier: 'infra', estado: 'no-ar', maturidade: 88, funcao: 'Mission-control vivo (orbita://nucleo): pipeline 198→132→49→81→88 no ar · 5 marcas · custo IA real ($6.79/$40) · 4 robôs cron · campanha 100 dias (dia 6) · TikTok+LinkedIn',
    stack: 'React 19 · Vite 6 · Tailwind 4 · Supabase (schema mkt) · pg_cron · edge functions IA · Ateliê de Convergência',
    repos: 'D:\\projetos\\digiai_mkt',
    git: '0a0437a 09/jul/2026 (skin Ateliê de Convergência)',
    proximo: 'Reconectar 2 tokens TikTok expirados (Mello Óticas + Pessoal) · escoar 49 mídias do acervo · fluxo ideias(digiai)→mkt ainda manual',
    bloqueio: '2 tokens TikTok expirados travam publicação dessas marcas · cota diária da campanha 100 dias ainda 0 hoje',
    urls: [{ label: 'mkt.digiai.app.br', url: 'https://mkt.digiai.app.br' }],
  },
];

const TIER_LABEL: Record<Tier, string> = {
  ancora: 'Produto-âncora', alavanca: 'Alavancas críticas', suporte: 'Suporte prioritário',
  autonomo: 'Autônomos', incubacao: 'Incubação', institucional: 'Institucional', infra: 'Infraestrutura interna',
};
const TIER_ORDER: Tier[] = ['ancora', 'alavanca', 'suporte', 'autonomo', 'incubacao', 'institucional', 'infra'];

// Faixa de maturidade (placar): pronto ≥85 · em obra 60–84 · cedo <60
const faixaCor = (m: number) => m >= 85 ? 'var(--color-success)' : m >= 60 ? 'var(--color-warning)' : 'var(--color-danger)';

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
  'Clearix': 'Netlify · polyrepo (17 sub-apps)',
  'Ótica Sem Improviso': 'Netlify (landing + app leitor)',
  'Pulso': 'Vercel · control',
  'Pulso Hub': 'Vercel · /hub (Supabase read-only)',
  'Lumina': 'Netlify · Supabase',
  'Nexus': 'Netlify · Supabase',
  'Clearix Calc': 'Netlify · PWA client-side (sem banco)',
  'Polapetit': 'Netlify · Supabase + Firebase',
  'Limelight': 'Netlify (URL a confirmar) · Supabase próprio',
  'Polapetit Site': 'Netlify · fullstack Express (S3)',
  'Qual a Foto': 'Netlify (web) · worker local',
  'Easy Idiomas': 'Netlify · Supabase',
  'Nipo School': 'Vercel · Supabase',
  'Mello Eyewear': 'Netlify + Functions · Supabase',
  'DIGIAI App': 'Netlify · Supabase',
  'DIGIAI Site': 'Cloudflare Pages',
  'Clearix Site': 'Cloudflare Pages',
  'DIGIAI MKT': 'Netlify · Supabase (schema mkt)',
};

// Slug canônico por produto = product_id no Backlog (ops.backlog_items).
const SLUG: Record<string, string> = {
  'Clearix': 'clearix', 'Clearix Site': 'clearix-site', 'Ótica Sem Improviso': 'osi',
  'Pulso': 'pulso', 'Lumina': 'lumina', 'Nexus': 'nexus', 'Clearix Calc': 'clearix-calc',
  'Polapetit': 'polapetit', 'Polapetit Site': 'polapetit-site', 'Limelight': 'limelight', 'Qual a Foto': 'qual-a-foto', 'Easy Idiomas': 'easy-idiomas',
  'Nipo School': 'nipo-school', 'Mello Eyewear': 'mello-eyewear', 'DIGIAI App': 'digiai-app',
  'DIGIAI Site': 'digiai-site', 'Pulso Hub': 'pulso-hub', 'DIGIAI MKT': 'digiai-mkt',
};

// Degrau na escada de prontidão (1 construído · 2 no ar · 3 uso real · 4 comercial · 5 escala).
// Só produtos de mercado; sites/infra não usam a escada (undefined).
const DEGRAU: Record<string, number> = {
  'Clearix': 3, 'Ótica Sem Improviso': 2, 'Pulso': 3, 'Lumina': 3, 'Nexus': 2,
  'Clearix Calc': 2, 'Polapetit': 3, 'Qual a Foto': 1, 'Easy Idiomas': 2,
  'Nipo School': 2, 'Mello Eyewear': 2,
};

export const DEGRAU_LABEL: Record<number, string> = {
  1: 'Construído', 2: 'No ar', 3: 'Uso real', 4: 'Comercial', 5: 'Escala',
};

export type ProdutoInfo = {
  slug: string; nome: string; maturidade: number; estado: Estado; tier: Tier;
  cor: string; mono: string; logo?: string; badge: boolean; degrau?: number;
  tagline: string; funcao: string; url?: string;
};

export const TIER_LABEL_CURTO: Record<Tier, string> = {
  ancora: 'Produto-âncora', alavanca: 'Alavanca crítica', suporte: 'Suporte prioritário',
  autonomo: 'Autônomo', incubacao: 'Incubação', institucional: 'Institucional', infra: 'Infra interna',
};

export const PRODUTOS: ProdutoInfo[] = APPS.map(a => ({
  slug: SLUG[a.nome] ?? a.nome.toLowerCase().replace(/\s+/g, '-'),
  nome: a.nome, maturidade: a.maturidade, estado: a.estado, tier: a.tier,
  cor: a.cor, mono: a.mono, logo: LOGO[a.nome], badge: BADGE.has(a.nome),
  degrau: DEGRAU[a.nome],
  tagline: a.tagline, funcao: a.funcao, url: a.urls[0]?.url,
}));

export const PRODUTO_BY_SLUG: Record<string, ProdutoInfo> =
  Object.fromEntries(PRODUTOS.map(p => [p.slug, p]));

export default function Portfolio() {
  const [sel, setSel] = useState<App | null>(null);
  const [modo, setModo] = useState<'placar' | 'detalhe'>('placar');
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
  const mediaMaturidade = Math.round(APPS.reduce((s, a) => s + a.maturidade, 0) / APPS.length);
  const comBloqueio = APPS.filter(a => a.bloqueio).length;
  const ranking = [...APPS].sort((a, b) => b.maturidade - a.maturidade);

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8">
      <PageHeader
        eyebrow="Hierarquia Canônica"
        title="Portfólio de Produtos"
        subtitle={`${APPS.length} frentes · ${noAr} no ar · ${travados} travadas · estado real 2026-07-13`}
      />

      {/* Alternador de visão */}
      <div className="flex items-center gap-1 mb-6 border border-outline/15 w-fit p-0.5">
        {(['placar', 'detalhe'] as const).map(m => (
          <button
            key={m}
            onClick={() => setModo(m)}
            className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors ${modo === m ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}
          >
            {m === 'placar' ? 'Placar' : 'Detalhe'}
          </button>
        ))}
      </div>

      {/* PLACAR — visão-resumo de uma página */}
      {modo === 'placar' && (
        <div className="mb-8">
          {/* KPIs-âncora */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Produtos', valor: String(APPS.length), cor: 'text-on-surface' },
              { label: 'No ar', valor: `${noAr}`, sub: `${travados} travado`, cor: 'text-success' },
              { label: 'Maturidade média', valor: `${mediaMaturidade}%`, cor: 'text-on-surface' },
              { label: 'Com bloqueio', valor: `${comBloqueio}`, cor: 'text-warning' },
            ].map(k => (
              <div key={k.label} className="border border-outline/15 bg-surface-container p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{k.label}</div>
                <div className={`font-serif text-3xl font-semibold tabular-nums mt-1 ${k.cor}`}>
                  {k.valor}{k.sub && <span className="font-sans text-[11px] font-normal text-muted ml-1">/ {k.sub}</span>}
                </div>
              </div>
            ))}
          </div>

          {/* Legenda das faixas */}
          <div className="flex flex-wrap items-center gap-4 mb-3 font-mono text-[10px] uppercase tracking-wider text-muted">
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{ background: 'var(--color-success)' }} />pronto ≥85</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{ background: 'var(--color-warning)' }} />em obra 60–84</span>
            <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5" style={{ background: 'var(--color-danger)' }} />cedo &lt;60</span>
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-warning" />tem bloqueio</span>
          </div>

          {/* Lista ranqueada por maturidade — 2 colunas (top na esquerda) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[ranking.slice(0, Math.ceil(ranking.length / 2)), ranking.slice(Math.ceil(ranking.length / 2))].map((coluna, ci) => (
              <div key={ci} className="border border-outline/15 bg-surface-container">
                {coluna.map(a => {
                  const isBadge = BADGE.has(a.nome);
                  const cor = faixaCor(a.maturidade);
                  return (
                    <button
                      key={a.nome}
                      onClick={() => setSel(a)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-outline/10 last:border-b-0 hover:bg-surface-high transition-colors text-left group"
                    >
                      <div className="w-8 h-8 flex items-center justify-center overflow-hidden font-mono text-[10px] font-bold shrink-0" style={isBadge ? undefined : { background: a.cor, color: 'var(--color-on-action)' }}>
                        {LOGO[a.nome]
                          ? <img src={LOGO[a.nome]} alt="" className={isBadge ? 'w-8 h-8 object-cover' : 'w-[18px] h-[18px] object-contain'} style={isBadge ? undefined : { filter: 'brightness(0) invert(1)' }} />
                          : a.mono}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif text-sm font-semibold text-on-surface truncate">{a.nome}</span>
                          {a.estado === 'travado' && <span className="font-mono text-[8px] uppercase tracking-wider text-danger border border-danger/40 px-1 shrink-0">travado</span>}
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{TIER_LABEL[a.tier]}</span>
                      </div>
                      <div className="hidden sm:block w-16 xl:w-24 h-1.5 bg-surface-lowest overflow-hidden shrink-0">
                        <div className="h-full" style={{ width: `${a.maturidade}%`, background: cor }} />
                      </div>
                      <span className="font-mono text-sm font-semibold tabular-nums w-10 text-right shrink-0" style={{ color: cor }}>{a.maturidade}%</span>
                      <span className="w-4 flex justify-center shrink-0">{a.bloqueio && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {modo === 'detalhe' && TIER_ORDER.filter(t => APPS.some(a => a.tier === t)).map(tier => (
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

              {sel.subApps && sel.subApps.length > 0 && (
                <div>
                  <div className="text-[10px] font-mono text-secondary uppercase tracking-widest mb-2">Sub-apps ({sel.subApps.length}) · todos em produção</div>
                  <div className="border border-outline/15 divide-y divide-outline/10">
                    {sel.subApps.map((s, i) => (
                      <div key={s.nome} className="flex items-start gap-3 px-3 py-2">
                        <span className="font-mono text-[10px] text-muted tabular-nums mt-0.5 w-5 shrink-0">{String(i + 1).padStart(2, '0')}</span>
                        <div className="min-w-0">
                          <span className="text-[13px] font-medium text-on-surface">{s.nome}</span>
                          <span className="block text-[11px] text-muted leading-snug">{s.desc}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

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
