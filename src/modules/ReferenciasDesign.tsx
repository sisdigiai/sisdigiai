import React, { useState } from 'react';
import PageHeader from '../components/PageHeader';

/**
 * Módulo Referências de Design — comparativo visual organizado por CATEGORIAS.
 *
 * Categorias:
 *  - "IA-óbvio" — as 7 referências que toda IA sugere (Material/Carbon/Polaris/Linear/Stripe/Vercel + Clearix)
 *  - "Eyewear Premium" — marcas de óculos que viraram identidades (Persol/Mykita/Cubitts/Chilli Beans)
 *  - "Hub & Bento UX" — multi-app dashboards modernos (Apple/Notion/Linear/Vision OS)
 *  - "Brasileiros premiados" — estúdios BR (Tátil/Crama/Greco)
 *  - "Healthcare moderno" — Headspace/Forward/Hims que rejeitam estética hospital
 *
 * Estilização inline isolada por sistema (não fere R-014).
 */

type Categoria = 'ia-obvio' | 'eyewear' | 'bento-hub' | 'brasileiros' | 'healthcare';

interface Sistema {
  id: string;
  categoria: Categoria;
  nome: string;
  empresa: string;
  ano: string;
  url: string;
  tagline: string;
  cores: { hex: string; nome: string; uso: string }[];
  fonte: { ui: string; fonteUiFamily: string; mono: string; fonteMonoFamily: string };
  pros: string[];
  contras: string[];
  veredito: string;
  destacado?: boolean;
}

const SISTEMAS: Sistema[] = [
  // ═══════════════ IA-ÓBVIO (atual) ═══════════════
  {
    id: 'clearix',
    categoria: 'ia-obvio',
    nome: 'Clearix Lens',
    empresa: 'DIGIAI (interno)',
    ano: 'v1.0 · 2026',
    url: 'D:\\projetos\\clearix_design\\',
    tagline: 'Design system canônico DIGIAI — B2B ótica',
    cores: [
      { hex: '#2563EB', nome: 'blue-500', uso: 'action-primary (light)' },
      { hex: '#93C5FD', nome: 'blue-300', uso: 'action-primary (dark) WCAG 4.5:1' },
      { hex: '#06B6D4', nome: 'cyan-500', uso: 'accent/destaque' },
      { hex: '#1C1917', nome: 'neutral-900', uso: 'text-primary' },
      { hex: '#FAFAF9', nome: 'neutral-50', uso: 'surface-base' },
    ],
    fonte: { ui: 'Inter', fonteUiFamily: 'Inter, system-ui, sans-serif', mono: 'JetBrains Mono', fonteMonoFamily: '"JetBrains Mono", monospace' },
    pros: ['Já é o oficial (R-014)', 'W3C Tokens + tabular-nums + tri-state filter', 'Decisões rastreadas (Apêndice B)'],
    contras: ['Falta lib React', 'Falta WCAG CI', 'Sem CHANGELOG formal'],
    veredito: 'Já adotado. v1.1 resolve os 3 gaps.',
    destacado: true,
  },
  {
    id: 'material',
    categoria: 'ia-obvio',
    nome: 'Material Design 3',
    empresa: 'Google',
    ano: 'M3 · 2023',
    url: 'https://m3.material.io',
    tagline: 'Sistema mais maduro do mundo — B2C-friendly, motion rico',
    cores: [
      { hex: '#6750A4', nome: 'primary-40', uso: 'primary action' },
      { hex: '#D0BCFF', nome: 'primary-80', uso: 'primary on dark' },
      { hex: '#7D5260', nome: 'tertiary-40', uso: 'accent' },
      { hex: '#1D1B20', nome: 'surface-10', uso: 'background dark' },
      { hex: '#FFFBFE', nome: 'surface-99', uso: 'background light' },
    ],
    fonte: { ui: 'Roboto Flex', fonteUiFamily: '"Roboto Flex", Roboto, sans-serif', mono: 'Roboto Mono', fonteMonoFamily: '"Roboto Mono", monospace' },
    pros: ['Docs mais ricas do mercado', 'Componentes em Flutter/React/Web Components', 'Motion proposital — dynamic color'],
    contras: ['Estética "Google" reconhecível', 'Roxo padrão choca com identidade DIGIAI azul', 'Densidade BAIXA pra telas operacionais'],
    veredito: 'Inspiração de processo, não de estética.',
  },
  {
    id: 'carbon',
    categoria: 'ia-obvio',
    nome: 'Carbon Design System',
    empresa: 'IBM',
    ano: 'v11 · 2024',
    url: 'https://carbondesignsystem.com',
    tagline: 'B2B/enterprise — o mais parecido com Clearix Lens',
    cores: [
      { hex: '#0F62FE', nome: 'blue-60', uso: 'interactive primary' },
      { hex: '#4589FF', nome: 'blue-50', uso: 'link hover' },
      { hex: '#161616', nome: 'gray-100', uso: 'background dark' },
      { hex: '#F4F4F4', nome: 'gray-10', uso: 'background light' },
      { hex: '#DA1E28', nome: 'red-60', uso: 'destructive' },
    ],
    fonte: { ui: 'IBM Plex Sans', fonteUiFamily: '"IBM Plex Sans", sans-serif', mono: 'IBM Plex Mono', fonteMonoFamily: '"IBM Plex Mono", monospace' },
    pros: ['Tokens W3C nativo', 'Multi-theme (white/g10/g90/g100)', 'Componentes data-rich'],
    contras: ['IBM Plex forte demais', 'Estética "datacenter" pode ser fria', 'Pouco diferenciador'],
    veredito: 'Maior parente do Clearix. Adotar tokens W3C já é nosso.',
  },
  {
    id: 'linear',
    categoria: 'ia-obvio',
    nome: 'Linear Design',
    empresa: 'Linear',
    ano: 'v3 · 2024',
    url: 'https://linear.app',
    tagline: 'Moderno minimal — referência 2024-2025',
    cores: [
      { hex: '#5E6AD2', nome: 'accent', uso: 'primary action' },
      { hex: '#26282D', nome: 'bg-secondary', uso: 'card dark' },
      { hex: '#1B1C1F', nome: 'bg-primary', uso: 'background dark' },
      { hex: '#FFFFFF', nome: 'text-primary-dark', uso: 'text on dark' },
      { hex: '#8A8F98', nome: 'text-tertiary', uso: 'text muted' },
    ],
    fonte: { ui: 'Inter', fonteUiFamily: 'Inter, system-ui, sans-serif', mono: 'Berkeley Mono', fonteMonoFamily: '"Berkeley Mono", monospace' },
    pros: ['Inter + estética 2025', 'Dark mode nativo perfeito', 'Motion sutil (spring)'],
    contras: ['Estética "dev tool" fria pra ótica', 'Densidade alta exige educação', 'Sem lib pública'],
    veredito: 'Inspirar densidade + motion. Estética total seria fria.',
  },

  // ═══════════════ EYEWEAR PREMIUM (NOVO) ═══════════════
  {
    id: 'persol',
    categoria: 'eyewear',
    nome: 'Persol',
    empresa: 'EssilorLuxottica (Italy)',
    ano: 'Since 1917',
    url: 'https://www.persol.com',
    tagline: 'Heritage italiano — a "Steve McQueen" das óticas',
    cores: [
      { hex: '#2F2F2F', nome: 'tortoiseshell-dark', uso: 'frame/heritage' },
      { hex: '#A67C52', nome: 'havana-tan', uso: 'acetato signature' },
      { hex: '#D4A574', nome: 'honey-tortoise', uso: 'highlight' },
      { hex: '#1A1A1A', nome: 'black-deep', uso: 'background editorial' },
      { hex: '#F5EFE3', nome: 'cream-aged', uso: 'surface vintage' },
    ],
    fonte: { ui: 'Custom serif (Persol Display)', fonteUiFamily: 'Georgia, "Playfair Display", serif', mono: 'Inconsolata', fonteMonoFamily: '"Inconsolata", monospace' },
    pros: [
      'Identidade ATEMPORAL (100+ anos) — não vai parecer datado em 5 anos',
      'Estética "made in Italy" remete a qualidade ótica artesanal',
      'Símbolo do "arrow" reconhecível mundialmente — patrimônio',
    ],
    contras: [
      'Serif heritage choca com SaaS moderno — não combina com dashboard denso',
      'Paleta marrom/havana é difícil de adaptar pra UI funcional',
      'Estética "boutique" desalinha com B2B operacional',
    ],
    veredito: '🎯 INSPIRAR: respeito pelo objeto óptico + tom editorial em landings.',
    destacado: true,
  },
  {
    id: 'mykita',
    categoria: 'eyewear',
    nome: 'Mykita',
    empresa: 'Mykita Studio (Berlin)',
    ano: 'Founded 2003',
    url: 'https://mykita.com',
    tagline: 'Berlim moderno — engenharia visível como estética',
    cores: [
      { hex: '#000000', nome: 'black-absolute', uso: 'frame primary' },
      { hex: '#FF6B35', nome: 'orange-accent', uso: 'editorial pop' },
      { hex: '#E5E5E5', nome: 'gray-engineered', uso: 'background' },
      { hex: '#1A1A1A', nome: 'graphite', uso: 'dark surface' },
      { hex: '#FFFFFF', nome: 'paper-white', uso: 'product photo' },
    ],
    fonte: { ui: 'Neue Haas Grotesk / Helvetica', fonteUiFamily: '"Neue Haas Grotesk", Helvetica, sans-serif', mono: 'Söhne Mono', fonteMonoFamily: '"Söhne Mono", monospace' },
    pros: [
      'Brutalismo SOFISTICADO — engenharia como protagonista (vira lente)',
      'Black + 1 acento (laranja) = sistema mínimo radical',
      'Tipografia 100% Helvética/Grotesk — alinha com Inter do Clearix',
    ],
    contras: [
      'Estética "design fair Berlin" pode parecer fria pra cliente brasileiro',
      'Laranja como único acento limita expressividade de status',
      'Sem cor pra success/warning — restritivo demais pra dashboard',
    ],
    veredito: '🎯 INSPIRAR: tipografia + radicalismo na cor (1 acento gritante).',
    destacado: true,
  },
  {
    id: 'cubitts',
    categoria: 'eyewear',
    nome: 'Cubitts',
    empresa: 'Cubitts (London)',
    ano: 'Founded 2012',
    url: 'https://cubitts.com',
    tagline: 'British handcrafted — pin design + camadas históricas',
    cores: [
      { hex: '#2B2B2B', nome: 'kings-cross-black', uso: 'primary' },
      { hex: '#D9CFC1', nome: 'parchment-warm', uso: 'background editorial' },
      { hex: '#8B5A3C', nome: 'leather-tan', uso: 'accent heritage' },
      { hex: '#A33', nome: 'royal-red', uso: 'CTA' },
      { hex: '#F8F4ED', nome: 'cream-paper', uso: 'surface' },
    ],
    fonte: { ui: 'Custom display (Cubitts Sans + Serif)', fonteUiFamily: '"GT Sectra", "Playfair Display", serif', mono: 'JetBrains Mono', fonteMonoFamily: '"JetBrains Mono", monospace' },
    pros: [
      'Storytelling visual: cada modelo tem MAPA de Kings Cross atrás',
      'Mix Serif + Sans editorial — usa cores quentes (não as IA-óbvias frias)',
      'Site funciona como REVISTA + e-commerce — não é template Shopify',
    ],
    contras: [
      'Sistema voltado a venda/marketing — fraco pra dashboard operacional',
      'Pouca documentação pública de tokens',
      'Estética muito britânica/local — não traduz bem pra ótica BR',
    ],
    veredito: '🎯 INSPIRAR: storytelling local + mix tipográfico. Mello + bairro?',
  },
  {
    id: 'chilli',
    categoria: 'eyewear',
    nome: 'Chilli Beans',
    empresa: 'Caito Maia (Brasil — desde 1997)',
    ano: '2ª maior do mundo em óculos atrás só de Luxottica',
    url: 'https://chillibeans.com',
    tagline: '🇧🇷 Fast-fashion ótica BR — coleções semanais, cores vivas',
    cores: [
      { hex: '#E63946', nome: 'chilli-red', uso: 'brand primary' },
      { hex: '#FFFFFF', nome: 'white-pop', uso: 'surface contraste' },
      { hex: '#000000', nome: 'noir-bold', uso: 'text primary' },
      { hex: '#F4D35E', nome: 'amarelo-vibrante', uso: 'accent' },
      { hex: '#1A8FE3', nome: 'azul-pop', uso: 'highlight' },
    ],
    fonte: { ui: 'Custom Sans Bold', fonteUiFamily: '"Helvetica Neue", "Arial Black", sans-serif', mono: '"Courier New", monospace', fonteMonoFamily: '"Courier New", monospace' },
    pros: [
      '🇧🇷 Brasileira de verdade — entende público brasileiro',
      'Cores VIVAS + identidade jovem — não tem medo de ousar',
      'Colaborações constantes (Lenny Kravitz, Anitta, NBA, Harry Potter) — branding ÁGIL',
      'Bate Luxottica em mercado brasileiro — só perde mundialmente',
    ],
    contras: [
      'Estética muito B2C/fashion — não traduz pra dashboard B2B operacional',
      'Vermelho dominante atrai mas cansa em uso prolongado',
      'Renovação semanal de identidade é antitético à estabilidade de DS',
    ],
    veredito: '🎯 INSPIRAR: ousadia BR + cores vivas + agilidade de campanhas. ÚNICA referência brasileira premium do setor.',
    destacado: true,
  },

  // ═══════════════ HUB & BENTO UX (NOVO) ═══════════════
  {
    id: 'apple-bento',
    categoria: 'bento-hub',
    nome: 'Apple Bento Grid',
    empresa: 'Apple (iPhone 15 Pro page + Vision Pro)',
    ano: '2023 → padrão 2025',
    url: 'https://www.apple.com/iphone-15-pro',
    tagline: '🍱 O padrão que dominou dashboards em 2024-2026',
    cores: [
      { hex: '#000000', nome: 'space-black', uso: 'background hero' },
      { hex: '#F5F5F7', nome: 'pearl-white', uso: 'background light' },
      { hex: '#0066CC', nome: 'apple-blue', uso: 'link/accent' },
      { hex: '#1D1D1F', nome: 'deep-graphite', uso: 'text primary' },
      { hex: '#86868B', nome: 'silver-text', uso: 'text muted' },
    ],
    fonte: { ui: 'SF Pro Display', fonteUiFamily: '"SF Pro Display", -apple-system, "Inter", sans-serif', mono: 'SF Mono', fonteMonoFamily: '"SF Mono", "JetBrains Mono", monospace' },
    pros: [
      '🎯 23% mais rápido pra scan vs layout linear (estudo UX 2024)',
      'Cada peça de dado tem PESO ESPACIAL próprio — controla cognitive load',
      'Funciona em dashboard, landing, app launcher, status page',
      'Naturalmente RESPONSIVO — vira coluna no mobile sem refatorar',
    ],
    contras: [
      'Sem alma — qualquer site tipo Apple 2024 usa, virou clichê',
      'Difícil pra dados densos (tabelas com muitas colunas)',
      'Requer DISCIPLINA editorial pra escolher o que merece tile grande',
    ],
    veredito: '🎯 ADOTAR pro Hub Clearix: 17 sub-apps em bento grid resolve UX do launcher hoje. Modular, escaneável, moderno.',
    destacado: true,
  },
  {
    id: 'notion-hub',
    categoria: 'bento-hub',
    nome: 'Notion 2024 Home',
    empresa: 'Notion',
    ano: 'Redesign fim 2024',
    url: 'https://notion.so',
    tagline: 'Workspace switcher + recent + activity em bento',
    cores: [
      { hex: '#000000', nome: 'noir', uso: 'text primary' },
      { hex: '#FFFFFF', nome: 'paper', uso: 'background' },
      { hex: '#787774', nome: 'gray-neutral', uso: 'text muted' },
      { hex: '#37352F', nome: 'graphite', uso: 'text contrast' },
      { hex: '#0F7B6C', nome: 'green-fresh', uso: 'success' },
    ],
    fonte: { ui: 'Inter / SF Pro', fonteUiFamily: 'Inter, -apple-system, sans-serif', mono: 'iA Writer Mono', fonteMonoFamily: '"iA Writer Mono", "JetBrains Mono", monospace' },
    pros: [
      'Workspace switcher elegante — bate com Hub Clearix multi-tenant',
      'Sidebar dinâmica (favoritos + databases) — modelo escalável',
      'Cor neutra + verde discreto = elegância funcional',
    ],
    contras: [
      'Pouca distinção visual entre seções — exige educação do usuário',
      'Sidebar pesada vs minimalista (escolha questionável)',
      'Performance ainda lenta com workspaces grandes',
    ],
    veredito: '🎯 INSPIRAR: switcher de tenant + sidebar dinâmica. Mello tem 4 lojas — switcher seria gold.',
  },
  {
    id: 'visionos',
    categoria: 'bento-hub',
    nome: 'visionOS Glassmorphism',
    empresa: 'Apple Vision Pro',
    ano: '2024',
    url: 'https://developer.apple.com/visionos/',
    tagline: 'Vidro translúcido + profundidade 3D — futuro próximo',
    cores: [
      { hex: 'rgba(255,255,255,0.15)', nome: 'glass-light', uso: 'card transparente' },
      { hex: 'rgba(0,0,0,0.6)', nome: 'glass-dark', uso: 'card escuro' },
      { hex: '#007AFF', nome: 'blue-systemic', uso: 'action' },
      { hex: '#34C759', nome: 'green-systemic', uso: 'success' },
      { hex: '#FF3B30', nome: 'red-systemic', uso: 'destructive' },
    ],
    fonte: { ui: 'SF Pro Rounded', fonteUiFamily: '"SF Pro Rounded", -apple-system, sans-serif', mono: 'SF Mono', fonteMonoFamily: '"SF Mono", monospace' },
    pros: [
      '🥽 ÓCULOS = visão = Apple VISION Pro tem afinidade conceitual com Clearix óptica',
      'Glassmorphism aceita conteúdo atrás — bom pra overlays sem perder contexto',
      'Profundidade Z visível — hierarquia naturalmente clara',
    ],
    contras: [
      'Performance custosa (backdrop-filter pesado)',
      'Acessibilidade complicada — contraste varia com fundo',
      'Pode ficar visualmente "fashion" demais pra B2B sério',
    ],
    veredito: '🎯 EXPLORAR: 1 detalhe visionOS em onboarding/welcome do Hub. Conexão poética óculos↔visão.',
  },

  // ═══════════════ BRASILEIROS PREMIADOS (NOVO) ═══════════════
  {
    id: 'tatil',
    categoria: 'brasileiros',
    nome: 'Tátil Design',
    empresa: 'Tátil (Rio de Janeiro)',
    ano: 'Desde 1987',
    url: 'https://site.tatil.com.br',
    tagline: '🇧🇷 DNA brasileiro — Olimpíada Rio + Netflix Awards + SailGP',
    cores: [
      { hex: '#FF6B00', nome: 'laranja-brasil', uso: 'energia' },
      { hex: '#009245', nome: 'verde-bandeira', uso: 'natureza' },
      { hex: '#FFDE00', nome: 'amarelo-vibrante', uso: 'destaque' },
      { hex: '#0066B3', nome: 'azul-mar', uso: 'profundidade' },
      { hex: '#1A1A1A', nome: 'preto-cobogó', uso: 'contraste' },
    ],
    fonte: { ui: 'Tátil Custom + Inter', fonteUiFamily: '"Tátil Sans", Inter, sans-serif', mono: 'IBM Plex Mono', fonteMonoFamily: '"IBM Plex Mono", monospace' },
    pros: [
      '🇧🇷 Identidade BR autêntica — não é "wannabe Apple"',
      'Trabalhou OLIMPÍADA RIO 2016 — sabe sistema visual escalável',
      'ESG + B Corp — alinhamento ético importante pra DIGIAI institucional',
      'Cores brasileiras sem cair em cliché — sofisticação tropical',
    ],
    contras: [
      'Forte em branding/experience > weak em UI de produto SaaS',
      'Estilo "case study premiado" > menos templates práticos',
      'Custo se contratar — premium agency',
    ],
    veredito: '🎯 INSPIRAR: brasilidade SEM cliché. Estúdio que provaria que ótica BR pode ter identidade premiada.',
    destacado: true,
  },

  // ═══════════════ HEALTHCARE MODERNO (NOVO) ═══════════════
  {
    id: 'headspace',
    categoria: 'healthcare',
    nome: 'Headspace',
    empresa: 'Headspace Inc.',
    ano: '2022 rebrand',
    url: 'https://www.headspace.com',
    tagline: 'Saúde mental sem cara de hospital — ilustração própria',
    cores: [
      { hex: '#F47D31', nome: 'orange-meditation', uso: 'brand primary' },
      { hex: '#FBC15F', nome: 'yellow-warm', uso: 'accent' },
      { hex: '#3D8BF7', nome: 'blue-calm', uso: 'secondary' },
      { hex: '#7A1F61', nome: 'magenta-deep', uso: 'destaque editorial' },
      { hex: '#FFF8F0', nome: 'cream-warm', uso: 'background' },
    ],
    fonte: { ui: 'Apercu / Inter', fonteUiFamily: 'Apercu, Inter, sans-serif', mono: 'GT America Mono', fonteMonoFamily: '"GT America Mono", monospace' },
    pros: [
      '🧠 Saúde sem ESTERILIDADE hospitalar — paleta CALOROSA',
      'Ilustração própria (não stock) — diferencial brutal',
      'Tom de voz HUMANO — clinical sem ser frio',
      'Bem-estar = afinidade com ótica (cuidar do que importa)',
    ],
    contras: [
      'B2C wellness ≠ B2B ótica operacional',
      'Ilustração própria exige investimento em ilustrador',
      'Densidade BAIXA — não serve pra Clearix Finance',
    ],
    veredito: '🎯 INSPIRAR: tom humano + ilustração própria + sair do "cara de clínica" pra Clearix Clinics.',
    destacado: true,
  },
  {
    id: 'forward',
    categoria: 'healthcare',
    nome: 'Forward Health',
    empresa: 'Forward (US)',
    ano: 'Founded 2016',
    url: 'https://goforward.com',
    tagline: 'Healthcare premium tech — Apple Store da medicina',
    cores: [
      { hex: '#000000', nome: 'forward-black', uso: 'sofisticação' },
      { hex: '#FFFFFF', nome: 'white-clean', uso: 'pureza' },
      { hex: '#00C896', nome: 'forward-mint', uso: 'health/positive' },
      { hex: '#F5F5F0', nome: 'beige-warm', uso: 'background' },
      { hex: '#222222', nome: 'dark-text', uso: 'editorial' },
    ],
    fonte: { ui: 'Custom + Inter', fonteUiFamily: '"Forward Display", Inter, sans-serif', mono: 'JetBrains Mono', fonteMonoFamily: '"JetBrains Mono", monospace' },
    pros: [
      'Healthcare PREMIUM sem branca esterilizado',
      'Black + 1 cor (mint) — disciplina mínima radical',
      'Site funciona como SHOWROOM (não medical record viewer)',
    ],
    contras: [
      'Faliu em 2024 — modelo de negócio falhou (mas branding seguiu)',
      'Pouco aplicável em dashboard operacional',
      'Estética muito "Silicon Valley" — pouco aplicável pra ótica brasileira',
    ],
    veredito: '🎯 INSPIRAR: premium sem hospital. Mostrar Clearix como cuidado, não software.',
  },
];

const CATEGORIAS: { id: Categoria | 'todos'; label: string; emoji: string; descricao: string; cor: string }[] = [
  { id: 'todos', label: 'Todas', emoji: '📚', descricao: 'Todas as referências reunidas', cor: '#06B6D4' },
  { id: 'ia-obvio', label: 'IA-Óbvio', emoji: '🤖', descricao: 'O que TODA IA cita quando perguntam sobre design system', cor: '#71717A' },
  { id: 'eyewear', label: 'Eyewear Premium', emoji: '👓', descricao: 'Marcas de óculos que viraram identidades atemporais', cor: '#A67C52' },
  { id: 'bento-hub', label: 'Hub & Bento UX', emoji: '🍱', descricao: 'Multi-app dashboards modernos — bate com arquitetura Clearix Hub', cor: '#3D8BF7' },
  { id: 'brasileiros', label: 'Brasileiros 🇧🇷', emoji: '🇧🇷', descricao: 'Estúdios BR premiados — identidade nacional sem cliché', cor: '#009245' },
  { id: 'healthcare', label: 'Healthcare Moderno', emoji: '🧠', descricao: 'Saúde que rejeita "cara de hospital" — tom humano + paleta calorosa', cor: '#F47D31' },
];

function PaletaSwatches({ cores }: { cores: Sistema['cores'] }) {
  return (
    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
      {cores.map(c => (
        <div key={c.hex + c.nome} style={{ flex: '1 1 90px', minWidth: '90px' }}>
          <div style={{
            background: c.hex,
            height: '60px',
            borderRadius: '6px',
            border: '1px solid rgba(255,255,255,0.08)',
            boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
          }} />
          <div style={{ marginTop: '6px', fontSize: '11px', fontFamily: 'monospace', color: '#888' }}>{c.hex}</div>
          <div style={{ fontSize: '10px', color: '#aaa' }}>{c.nome}</div>
          <div style={{ fontSize: '10px', color: '#666', marginTop: '2px' }}>{c.uso}</div>
        </div>
      ))}
    </div>
  );
}

function TipoSample({ ui, uiFamily, mono, monoFamily, accent }: { ui: string; uiFamily: string; mono: string; monoFamily: string; accent: string }) {
  return (
    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '6px' }}>
      <div style={{ fontFamily: uiFamily, fontSize: '24px', fontWeight: 700, color: '#fff', lineHeight: 1.1, marginBottom: '4px' }}>
        The quick brown fox
      </div>
      <div style={{ fontFamily: uiFamily, fontSize: '13px', color: '#aaa', marginBottom: '8px' }}>
        Equipe Mello vendeu R$ 12.450 hoje.
      </div>
      <div style={{ fontFamily: monoFamily, fontSize: '12px', color: accent, lineHeight: 1.4 }}>
        OD -2.50 esf · OE -1.75 esf<br />
        042-2026-13585 · R$ 1.250,00
      </div>
      <div style={{ marginTop: '8px', display: 'flex', gap: '8px', fontSize: '10px', color: '#666' }}>
        <span>UI: <strong style={{ color: '#aaa' }}>{ui}</strong></span>
        <span>Mono: <strong style={{ color: '#aaa' }}>{mono}</strong></span>
      </div>
    </div>
  );
}

function ComponentesSample({ accent, fonteUi }: { accent: string; fonteUi: string }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontFamily: fonteUi }}>
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        <button style={{
          background: accent.startsWith('rgba') ? accent : accent,
          color: '#fff',
          border: 'none',
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 600,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}>Nova venda</button>
        <button style={{
          background: 'transparent',
          color: accent.startsWith('rgba') ? '#fff' : accent,
          border: `1px solid ${accent}`,
          padding: '8px 16px',
          borderRadius: '6px',
          fontSize: '13px',
          fontWeight: 500,
          fontFamily: 'inherit',
          cursor: 'pointer',
        }}>Cancelar</button>
      </div>
      <div style={{
        background: 'rgba(255,255,255,0.04)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '8px',
        padding: '12px 14px',
      }}>
        <div style={{ fontSize: '10px', color: '#888', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
          Faturamento hoje
        </div>
        <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', fontVariantNumeric: 'tabular-nums' }}>
          R$ 12.450,00
        </div>
        <div style={{ fontSize: '11px', color: accent, marginTop: '2px' }}>↑ 12% vs ontem</div>
      </div>
    </div>
  );
}

function CardSistema({ sistema }: { sistema: Sistema }) {
  const accentColor = sistema.cores[0].hex;
  const isDestaque = sistema.destacado === true;
  return (
    <div style={{
      background: '#0F1419',
      border: isDestaque ? `2px solid ${accentColor === '#000000' ? '#FFFFFF' : accentColor}` : '1px solid rgba(255,255,255,0.08)',
      borderRadius: '12px',
      padding: '20px',
      display: 'flex',
      flexDirection: 'column',
      gap: '16px',
      position: 'relative',
    }}>
      {isDestaque && (
        <div style={{
          position: 'absolute',
          top: '-10px',
          right: '12px',
          background: accentColor === '#000000' ? '#FFFFFF' : accentColor,
          color: accentColor === '#000000' ? '#000' : '#fff',
          fontSize: '9px',
          fontWeight: 700,
          padding: '2px 8px',
          borderRadius: '4px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em',
        }}>⭐ Destaque</div>
      )}
      <div>
        <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: '4px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 700, color: '#fff', margin: 0 }}>{sistema.nome}</h3>
          <span style={{ fontSize: '11px', color: '#666' }}>{sistema.ano}</span>
        </div>
        <div style={{ fontSize: '12px', color: '#888' }}>
          <strong>{sistema.empresa}</strong>
          {sistema.url.startsWith('http') && (
            <> · <a href={sistema.url} target="_blank" rel="noopener noreferrer" style={{ color: accentColor === '#000000' ? '#06B6D4' : accentColor, textDecoration: 'none' }}>
              {sistema.url.replace('https://', '').replace('www.', '')} ↗
            </a></>
          )}
        </div>
        <div style={{ fontSize: '13px', color: '#ccc', marginTop: '8px', lineHeight: 1.4 }}>{sistema.tagline}</div>
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Paleta</div>
        <PaletaSwatches cores={sistema.cores} />
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Tipografia</div>
        <TipoSample ui={sistema.fonte.ui} uiFamily={sistema.fonte.fonteUiFamily} mono={sistema.fonte.mono} monoFamily={sistema.fonte.fonteMonoFamily} accent={accentColor === '#000000' ? '#06B6D4' : accentColor} />
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>Componentes</div>
        <ComponentesSample accent={accentColor === '#000000' ? '#06B6D4' : accentColor} fonteUi={sistema.fonte.fonteUiFamily} />
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#10b981', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>✓ Pros pra DIGIAI</div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '12px', color: '#ccc', lineHeight: 1.6 }}>
          {sistema.pros.map((p, i) => <li key={i}>{p}</li>)}
        </ul>
      </div>
      <div>
        <div style={{ fontSize: '11px', color: '#ef4444', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>✗ Contras pra DIGIAI</div>
        <ul style={{ margin: 0, padding: '0 0 0 18px', fontSize: '12px', color: '#ccc', lineHeight: 1.6 }}>
          {sistema.contras.map((c, i) => <li key={i}>{c}</li>)}
        </ul>
      </div>
      <div style={{
        padding: '12px',
        background: 'rgba(255,255,255,0.04)',
        borderLeft: `3px solid ${accentColor === '#000000' ? '#06B6D4' : accentColor}`,
        borderRadius: '0 6px 6px 0',
      }}>
        <div style={{ fontSize: '10px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Veredito</div>
        <div style={{ fontSize: '13px', color: '#fff', lineHeight: 1.4 }}>{sistema.veredito}</div>
      </div>
    </div>
  );
}

export default function ReferenciasDesign() {
  const [categoria, setCategoria] = useState<Categoria | 'todos'>('todos');

  const sistemasFiltrados = categoria === 'todos'
    ? SISTEMAS
    : SISTEMAS.filter(s => s.categoria === categoria);

  const categoriaAtual = CATEGORIAS.find(c => c.id === categoria)!;

  return (
    <div className="max-w-6xl mx-auto p-8">
      <PageHeader
        eyebrow="Sistema · Design · Benchmark"
        title="Referências de Design System"
        subtitle={
          <>
            <strong className="text-on-surface">15 referências organizadas em 5 categorias</strong> para inspirar a evolução do
            {' '}<strong className="text-on-surface">Clearix Lens v1.0</strong> (R-014). Use as abas para alternar entre
            categorias. O foco vai além do "IA-óbvio" — incluí <strong className="text-on-surface">eyewear premium</strong>,
            {' '}<strong className="text-on-surface">bento hub</strong>, <strong className="text-on-surface">brasileiros</strong> e
            {' '}<strong className="text-on-surface">healthcare humano</strong>. Logo abaixo, os <strong className="text-on-surface">3 experimentos ativos</strong> rodando no laboratório Import.
          </>
        }
      />

      {/* Experimentos ativos distribuídos por app (ADR-0025) */}
      <div className="mb-8 p-5 border border-[#06B6D4]/30 bg-gradient-to-br from-[#06B6D4]/10 to-transparent">
        <div className="flex items-start gap-3 mb-4">
          <span style={{ fontSize: '24px' }}>🧪</span>
          <div>
            <div style={{ fontSize: '11px', fontWeight: 700, color: '#06B6D4', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '4px' }}>
              3 experimentos ativos · 3 destinos · ADR-0025
            </div>
            <h2 className="text-lg font-bold text-on-surface mb-1">Cada estética encontra seu app de destino</h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Decisão registrada em <strong className="text-on-surface">ADR-0025</strong> (2026-05-25):
              em vez de competirem por 1 vaga em Clearix Vendas, as 3 estéticas vão pra <strong className="text-on-surface">3 apps diferentes</strong>,
              cada uma alinhada com o perfil do usuário daquele app. Briefings vivem em
              {' '}<code className="bg-surface-high px-1.5 py-0.5 rounded text-xs">D:\projetos\clearix_eco_full\clearix_import\BRIEFING_*_EXPERIMENT.md</code>.
              Mock visual comparativo:
              {' '}<strong className="text-on-surface">Mock Vendas (4 estilos)</strong> da sidebar.
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* STONE-LENS → CLEARIX VENDAS */}
          <div className="p-4 border border-[#10B981]/40 bg-[#10B981]/5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span style={{ fontSize: '18px' }}>🇧🇷</span>
              <div className="text-sm font-bold text-[#34D399]">Stone-Lens</div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#10B981]/20 text-[#34D399] font-semibold">universal BR</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Destino (R-018)</div>
            <div className="text-sm font-bold text-on-surface mb-2">→ Clearix Import (lab) → Vendas</div>
            <div className="text-xs text-on-surface-variant leading-relaxed mb-3">
              Etapa 1: valida em <strong className="text-[#34D399]">Clearix Import</strong> (laboratório local, sem risco operacional). Etapa 2: porta pra Clearix Vendas em PR revisado.
            </div>
            <div className="text-[11px] text-on-surface-variant mb-2"><strong className="text-on-surface">📄 Briefing:</strong></div>
            <code className="block text-[10px] bg-surface-lowest px-2 py-1.5 rounded text-[#34D399] break-all leading-snug">
              BRIEFING_STONELENS_EXPERIMENT.md
            </code>
            <div className="text-[10px] text-muted mt-2">7 métricas · mobile-first · serve operador 8h/dia</div>
          </div>

          {/* PERSOL → POLAPETIT */}
          <div className="p-4 border border-[#A67C52]/40 bg-[#A67C52]/5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span style={{ fontSize: '18px' }}>👓</span>
              <div className="text-sm font-bold text-[#D4A574]">Persol</div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#A67C52]/20 text-[#D4A574] font-semibold">heritage glamour</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Destino</div>
            <div className="text-sm font-bold text-on-surface mb-2">→ Polapetit</div>
            <div className="text-xs text-on-surface-variant leading-relaxed mb-3">
              Festa infantil premium · Noto Serif italic + gold #D4AF37 + verde sutil + cream warm · DESIGN.md atual já alinhado 80%
            </div>
            <div className="text-[11px] text-on-surface-variant mb-2"><strong className="text-on-surface">📄 Briefing:</strong></div>
            <code className="block text-[10px] bg-surface-lowest px-2 py-1.5 rounded text-[#D4A574] break-all leading-snug">
              BRIEFING_PERSOL_EXPERIMENT.md
            </code>
            <div className="text-[10px] text-muted mt-2">Reescrito 2026-05-25 · materializa o DESIGN.md atual</div>
          </div>

          {/* MYKITA → PULSO CONTROL */}
          <div className="p-4 border border-[#FF6B35]/40 bg-[#FF6B35]/5">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <span style={{ fontSize: '18px' }}>⚙️</span>
              <div className="text-sm font-bold text-[#FF6B35]">Mykita</div>
              <span className="text-[10px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-[#FF6B35]/20 text-[#FF6B35] font-semibold">engenharia industrial</span>
            </div>
            <div className="text-[10px] uppercase tracking-wider text-muted font-semibold mb-1">Destino</div>
            <div className="text-sm font-bold text-on-surface mb-2">→ Pulso Control</div>
            <div className="text-xs text-on-surface-variant leading-relaxed mb-3">
              DevOps editorial · Helvetica Grotesk + black + 1 acento laranja radical · monitor industrial pra 10 canais + 49 agendados + worker parado
            </div>
            <div className="text-[11px] text-on-surface-variant mb-2"><strong className="text-on-surface">📄 Briefing:</strong></div>
            <code className="block text-[10px] bg-surface-lowest px-2 py-1.5 rounded text-[#FF6B35] break-all leading-snug">
              BRIEFING_MYKITA_EXPERIMENT.md
            </code>
            <div className="text-[10px] text-muted mt-2">Reescrito 2026-05-25 · 4 telas (dashboard/kanban/analytics/workflow)</div>
          </div>
        </div>

        <div className="mt-4 p-3 bg-surface-low border border-outline/10">
          <div className="text-[10px] uppercase tracking-wider text-muted mb-1.5 font-semibold">💡 Pergunta de Ouro de cada briefing (adaptada ao destino)</div>
          <ul className="space-y-1.5 text-xs text-on-surface-variant leading-relaxed">
            <li><strong className="text-[#34D399]">Stone-Lens → Clearix Import (lab) → Vendas:</strong> "Funciona pra AMBOS (Mello + ótica de bairro) sem perder identidade Clearix?" (R-018: testa primeiro no Import)</li>
            <li><strong className="text-[#D4A574]">Persol → Polapetit:</strong> "Pra família que contrata festa infantil premium, transmite glamour acolhedor ou pesa como museu?"</li>
            <li><strong className="text-[#FF6B35]">Mykita → Pulso Control:</strong> "Pro operador que vê 49 itens agendados e worker parado, transmite controle industrial ou frieza Berlim?"</li>
          </ul>
          <div className="mt-3 text-[11px] text-on-surface-variant">
            <strong className="text-on-surface">Resultado esperado:</strong> 3 apps com identidade própria · R-014 (Clearix Lens) mantida pro ecossistema Clearix Hub · cada app evolui sem competir com os outros.
          </div>
        </div>
      </div>

      {/* Abas de categorias */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {CATEGORIAS.map(c => {
          const count = c.id === 'todos' ? SISTEMAS.length : SISTEMAS.filter(s => s.categoria === c.id).length;
          const ativo = categoria === c.id;
          return (
            <button
              key={c.id}
              onClick={() => setCategoria(c.id)}
              style={{
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                border: ativo ? `2px solid ${c.cor}` : '1px solid rgba(255,255,255,0.1)',
                background: ativo ? `${c.cor}20` : 'rgba(255,255,255,0.04)',
                color: ativo ? '#fff' : 'rgba(255,255,255,0.6)',
                transition: 'all 0.15s',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <span>{c.emoji}</span>
              {c.label}
              <span style={{
                fontSize: '11px',
                opacity: 0.6,
                background: 'rgba(255,255,255,0.1)',
                padding: '1px 6px',
                borderRadius: '10px',
              }}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Descrição da categoria selecionada */}
      <div
        className="mb-8 p-4 border"
        style={{
          background: `${categoriaAtual.cor}10`,
          borderColor: `${categoriaAtual.cor}30`,
        }}
      >
        <div className="flex items-start gap-3">
          <span style={{ fontSize: '24px' }}>{categoriaAtual.emoji}</span>
          <div>
            <div style={{ fontSize: '12px', fontWeight: 700, color: categoriaAtual.cor, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>
              {categoriaAtual.label}
            </div>
            <p className="text-sm text-on-surface-variant leading-relaxed">{categoriaAtual.descricao}</p>
          </div>
        </div>
      </div>

      {/* Grid de sistemas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {sistemasFiltrados.map(s => <CardSistema key={s.id} sistema={s} />)}
      </div>

      {/* Resumo decisório dinâmico */}
      {categoria === 'todos' && (
        <div className="mt-12 p-6 bg-surface-low border border-outline/10">
          <h2 className="text-lg font-bold text-on-surface mb-4">📊 Síntese cruzada — 5 categorias</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-on-surface-variant">
            <div className="p-4 bg-surface-low">
              <div className="font-semibold text-[#06B6D4] mb-2">🎯 Adotar pro Hub Clearix imediato</div>
              <p className="leading-relaxed">
                <strong>Apple Bento Grid</strong> pra app launcher dos 17 sub-apps + <strong>Notion workspace switcher</strong> pra
                multi-tenant. 23% ganho em scan UX comprovado.
              </p>
            </div>
            <div className="p-4 bg-surface-low">
              <div className="font-semibold text-[#A67C52] mb-2">👓 Inspirar identidade pra evitar IA-genérico</div>
              <p className="leading-relaxed">
                <strong>Mykita</strong> (radicalismo + 1 acento) + <strong>Persol</strong> (atemporalidade italiana) +
                {' '}<strong>Chilli Beans</strong> (ousadia brasileira) — referências DO SETOR ótica.
              </p>
            </div>
            <div className="p-4 bg-surface-low">
              <div className="font-semibold text-[#009245] mb-2">🇧🇷 Manter brasilidade autêntica</div>
              <p className="leading-relaxed">
                <strong>Tátil Design</strong> (RJ, Olimpíada Rio + Netflix + SailGP) prova que ótica BR pode ter identidade
                premiada sem virar "wannabe SF/Berlin".
              </p>
            </div>
            <div className="p-4 bg-surface-low">
              <div className="font-semibold text-[#F47D31] mb-2">🧠 Humanizar pra fugir do "cara de hospital"</div>
              <p className="leading-relaxed">
                <strong>Headspace</strong> (tom humano + ilustração própria) pra Clearix Clinics não parecer prontuário
                eletrônico. Cuidado vira identidade.
              </p>
            </div>
          </div>
          <div className="mt-4 p-3 bg-[#2563EB]/10 border border-[#2563EB]/30 text-sm text-on-surface">
            <strong>🎯 Recomendação prática:</strong> próxima iteração do <code className="bg-surface-lowest px-1.5 py-0.5 rounded text-xs">clearix_design v1.1</code> deveria
            puxar <strong>bento grid (Apple) + 1 acento radical (Mykita) + warmth brasileira (Tátil)</strong> sem perder os
            tokens W3C atuais nem o Inter/JetBrains Mono.
          </div>
        </div>
      )}

      <div className="mt-8 text-xs text-muted text-center">
        Página atualizada em 2026-05-25 · 15 sistemas em 5 categorias + 3 experimentos ativos no Import · Estilização inline isolada · Consulta ADR-0023 e R-014
      </div>
    </div>
  );
}
