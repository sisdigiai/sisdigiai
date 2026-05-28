import React, { useState } from 'react';

/**
 * Mock visual: MESMA TELA do Clearix Vendas em 4 estéticas × 2 modos (dark/light).
 *
 *  1. Clearix Lens (R-014) — Inter + blue-500
 *  2. Persol — heritage italiano, serif + paleta havana
 *  3. Mykita — Berlim brutal, sans grotesque + acento laranja
 *  4. Stone-Lens — universal BR funcional, Inter + paleta funcional rica + mobile-first
 *
 * Cada estética tem toggle ☀️/🌙 próprio. Dados reais Mello em todas.
 * Estilização inline isolada (não fere R-014).
 *
 * Briefings de execução vivem em D:\projetos\clearix_eco_full\clearix_import\BRIEFING_*_EXPERIMENT.md
 */

type Estilo = 'clearix' | 'persol' | 'mykita' | 'stonelens';
type Modo = 'dark' | 'light';

const VENDAS_MOCK = [
  { num: '042-2026-13585', cliente: 'PERICLES SOARES DE JESUS', loja: 'Lancaster Suzano', valor: 22.00, qtd: 1, data: '22 mai', status: 'PAGO' },
  { num: '042-2026-13584', cliente: 'JOÃO FELIPE PARRO DA SILVA', loja: 'Lancaster Suzano', valor: 550.00, qtd: 2, data: '22 mai', status: 'PARCIAL', falta: 530.00 },
  { num: '042-2026-13582', cliente: 'BRUNA PRADO SANTOS', loja: 'Lancaster Suzano', valor: 890.04, qtd: 2, data: '22 mai', status: 'PAGO' },
  { num: '042-2026-13469', cliente: 'JOAO EVANGELISTA DOS SANTOS', loja: 'Lancaster Suzano', valor: 1250.00, qtd: 3, data: '14 mai', status: 'CHEGOU' },
  { num: '042-2026-13388', cliente: 'JOSE FERREIRA DA SILVA', loja: 'Lancaster Suzano', valor: 750.50, qtd: 1, data: '28 abr', status: 'CHEGOU' },
];

const KPIS = {
  totalRegistros: 20399,
  faturamento: 10262412.77,
  ticketMedio: 503.10,
  itens: 32480,
};

function formatBRL(n: number) {
  return n.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// Toggle component reusável
function ToggleModo({ modo, onChange, accent }: { modo: Modo; onChange: (m: Modo) => void; accent: string }) {
  return (
    <div style={{
      display: 'inline-flex',
      gap: '0',
      background: modo === 'dark' ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
      borderRadius: '999px',
      padding: '3px',
      fontFamily: 'Inter, system-ui, sans-serif',
    }}>
      <button
        onClick={() => onChange('light')}
        style={{
          background: modo === 'light' ? accent : 'transparent',
          color: modo === 'light' ? '#fff' : (modo === 'dark' ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)'),
          border: 'none',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >☀️ light</button>
      <button
        onClick={() => onChange('dark')}
        style={{
          background: modo === 'dark' ? accent : 'transparent',
          color: modo === 'dark' ? '#fff' : 'rgba(0,0,0,0.6)',
          border: 'none',
          padding: '4px 12px',
          borderRadius: '999px',
          fontSize: '11px',
          fontWeight: 600,
          cursor: 'pointer',
        }}
      >🌙 dark</button>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// VERSÃO 1: CLEARIX LENS
// ═══════════════════════════════════════════════════════
function VersaoClearixLens({ modo }: { modo: Modo }) {
  const dark = modo === 'dark';
  const c = {
    bg: dark ? '#0A0F1E' : '#FAFAF9',
    text: dark ? '#fff' : '#1C1917',
    textMuted: dark ? 'rgba(255,255,255,0.6)' : 'rgba(28,25,23,0.6)',
    textDim: dark ? 'rgba(255,255,255,0.4)' : 'rgba(28,25,23,0.4)',
    card: dark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.04)',
    border: dark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.08)',
    borderStrong: dark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.12)',
    accent: dark ? '#93C5FD' : '#2563EB', // blue-300 dark / blue-500 light (WCAG)
    accentBg: dark ? 'rgba(147,197,253,0.15)' : 'rgba(37,99,235,0.15)',
    cyan: '#06B6D4',
    success: dark ? '#34D399' : '#10b981',
    warn: '#FB923C',
  };

  return (
    <div style={{
      background: c.bg,
      color: c.text,
      padding: '32px',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, sans-serif',
      minHeight: '600px',
      border: `1px solid ${c.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', paddingBottom: '16px', borderBottom: `1px solid ${c.border}` }}>
        <div>
          <div style={{ fontSize: '11px', color: c.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>CLEARIX VENDAS</div>
          <h1 style={{ fontSize: '24px', fontWeight: 700, margin: 0, color: c.text }}>Vendas</h1>
          <div style={{ fontSize: '13px', color: c.textMuted, marginTop: '4px' }}>
            {KPIS.totalRegistros.toLocaleString('pt-BR')} registros encontrados
          </div>
        </div>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button style={{ background: c.accent, color: dark ? '#000' : '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>+ Nova Venda</button>
          <button style={{ background: c.warn, color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Nova Garantia</button>
          <button style={{ background: c.cyan, color: '#fff', border: 'none', padding: '10px 16px', borderRadius: '8px', fontSize: '13px', fontWeight: 500, cursor: 'pointer', fontFamily: 'inherit' }}>Pendentes →</button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'TOTAL', valor: '0', sub: '' },
          { label: 'FATURAMENTO', valor: `R$ ${formatBRL(KPIS.faturamento / 1000)}k`, sub: `ENTRADAS R$ ${formatBRL(KPIS.faturamento)}` },
          { label: 'TICKET MÉDIO', valor: `R$ ${formatBRL(KPIS.ticketMedio)}`, sub: '' },
          { label: 'ITENS', valor: KPIS.itens.toLocaleString('pt-BR'), sub: '' },
        ].map((k) => (
          <div key={k.label} style={{ background: c.card, border: `1px solid ${c.border}`, padding: '14px', borderRadius: '8px' }}>
            <div style={{ fontSize: '10px', color: c.textDim, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>{k.label}</div>
            <div style={{ fontSize: '20px', fontWeight: 700, fontVariantNumeric: 'tabular-nums', color: c.text }}>{k.valor}</div>
            {k.sub && <div style={{ fontSize: '10px', color: c.success, marginTop: '4px', fontVariantNumeric: 'tabular-nums' }}>{k.sub}</div>}
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', borderBottom: `1px solid ${c.border}` }}>
        {['$ Vendas', '◯ Garantias', '☷ Todas'].map((t, i) => (
          <button key={t} style={{
            background: i === 0 ? c.accentBg : 'transparent',
            color: i === 0 ? c.text : c.textMuted,
            border: 'none',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 500,
            cursor: 'pointer',
            borderBottom: i === 0 ? `2px solid ${c.accent}` : '2px solid transparent',
            fontFamily: 'inherit',
          }}>{t}</button>
        ))}
      </div>

      <input type="text" placeholder="Buscar por número da venda ou cliente..." style={{
        width: '100%',
        background: c.card,
        border: `1px solid ${c.borderStrong}`,
        color: c.text,
        padding: '10px 14px',
        borderRadius: '8px',
        fontSize: '13px',
        marginBottom: '16px',
        fontFamily: 'inherit',
        boxSizing: 'border-box',
      }} />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
        {VENDAS_MOCK.map(v => (
          <div key={v.num} style={{ background: c.card, border: `1px solid ${c.border}`, borderRadius: '8px', padding: '14px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', background: c.accentBg, display: 'flex', alignItems: 'center', justifyContent: 'center', color: c.cyan, fontSize: '12px', fontWeight: 700 }}>$</div>
              <div style={{ fontSize: '14px', fontWeight: 700, color: c.text }}>Venda #{v.num}</div>
            </div>
            <div style={{ fontSize: '12px', color: c.textMuted, marginBottom: '8px', textTransform: 'uppercase' }}>{v.cliente}</div>
            <div style={{ display: 'inline-block', fontSize: '10px', color: c.textMuted, background: c.card, padding: '2px 8px', borderRadius: '4px', marginBottom: '10px', border: `1px solid ${c.border}` }}>
              📍 {v.loja}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
              <span style={{
                fontSize: '10px',
                fontWeight: 700,
                padding: '3px 10px',
                borderRadius: '4px',
                background: v.status === 'PAGO' ? `${c.success}30` : v.status === 'PARCIAL' ? `${c.warn}30` : `${c.cyan}30`,
                color: v.status === 'PAGO' ? c.success : v.status === 'PARCIAL' ? c.warn : c.cyan,
              }}>{v.status}</span>
              {v.falta && <span style={{ fontSize: '11px', color: c.warn }}>Falta: R$ {formatBRL(v.falta)}</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: c.textMuted, fontVariantNumeric: 'tabular-nums' }}>
              <span><strong style={{ color: c.success }}>R$ {formatBRL(v.valor)}</strong></span>
              <span>📦 {v.qtd}</span>
              <span>📅 {v.data}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// VERSÃO 2: PERSOL
// ═══════════════════════════════════════════════════════
function VersaoPersol({ modo }: { modo: Modo }) {
  const dark = modo === 'dark';
  const c = {
    bg: dark ? '#1A1410' : '#F5EFE3',
    bgPattern: dark ? 'radial-gradient(circle at 20% 0%, rgba(166,124,82,0.15) 0%, transparent 50%)' : 'radial-gradient(circle at 20% 0%, rgba(166,124,82,0.08) 0%, transparent 50%)',
    text: dark ? '#F5EFE3' : '#1A1A1A',
    textMuted: dark ? 'rgba(245,239,227,0.65)' : '#666',
    accent: '#A67C52', // havana — mesmo em ambos
    accentDark: dark ? '#D4A574' : '#2F2F2F',
    cardBg: dark ? '#2A2218' : '#FFFFFF',
    cardBorder: '#A67C52',
    rowBorder: dark ? 'rgba(166,124,82,0.3)' : '#E5DDD0',
  };

  return (
    <div style={{
      background: c.bg,
      color: c.text,
      padding: '40px',
      borderRadius: '12px',
      fontFamily: 'Georgia, "Playfair Display", "Times New Roman", serif',
      minHeight: '600px',
      border: `1px solid ${c.accent}`,
      backgroundImage: c.bgPattern,
    }}>
      <div style={{ marginBottom: '32px', paddingBottom: '24px', borderBottom: `2px solid ${c.accentDark}` }}>
        <div style={{ fontSize: '10px', color: c.accent, textTransform: 'uppercase', letterSpacing: '0.15em', marginBottom: '8px', fontFamily: '"Helvetica Neue", sans-serif' }}>
          CLEARIX · VENDAS · LANCASTER SUZANO
        </div>
        <h1 style={{ fontSize: '48px', fontWeight: 400, margin: 0, lineHeight: 1, letterSpacing: '-0.02em', fontStyle: 'italic', color: c.text }}>
          Vendas
        </h1>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: '12px' }}>
          <div style={{ fontSize: '14px', color: c.textMuted, fontFamily: '"Helvetica Neue", sans-serif' }}>
            {KPIS.totalRegistros.toLocaleString('pt-BR')} registros · desde 2017
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button style={{ background: c.accentDark, color: c.bg, border: 'none', padding: '12px 24px', borderRadius: '0', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: '"Helvetica Neue", sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Nova Venda
            </button>
            <button style={{ background: 'transparent', color: c.text, border: `1px solid ${c.accentDark}`, padding: '12px 24px', borderRadius: '0', fontSize: '12px', fontWeight: 500, cursor: 'pointer', fontFamily: '"Helvetica Neue", sans-serif', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
              Pendentes
            </button>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '40px' }}>
        {[
          { label: 'Faturamento', valor: `R$ ${formatBRL(KPIS.faturamento / 1000000)}M`, sub: 'desde a fundação' },
          { label: 'Ticket médio', valor: `R$ ${formatBRL(KPIS.ticketMedio)}`, sub: 'por atendimento' },
          { label: 'Vendas', valor: KPIS.totalRegistros.toLocaleString('pt-BR'), sub: 'no histórico' },
          { label: 'Itens', valor: KPIS.itens.toLocaleString('pt-BR'), sub: 'comercializados' },
        ].map((k) => (
          <div key={k.label} style={{ paddingBottom: '16px', borderBottom: `1px solid ${c.accent}` }}>
            <div style={{ fontSize: '11px', color: c.accent, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '12px', fontFamily: '"Helvetica Neue", sans-serif' }}>{k.label}</div>
            <div style={{ fontSize: '36px', fontWeight: 400, fontStyle: 'italic', lineHeight: 1, color: c.text }}>{k.valor}</div>
            <div style={{ fontSize: '11px', color: c.textMuted, marginTop: '8px', fontFamily: '"Helvetica Neue", sans-serif', fontStyle: 'italic' }}>{k.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ background: c.cardBg, padding: '24px', border: `1px solid ${c.accent}` }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: '20px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 400, margin: 0, fontStyle: 'italic', color: c.text }}>Atendimentos recentes</h2>
          <div style={{ fontSize: '11px', color: c.accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '"Helvetica Neue", sans-serif' }}>Maio 2026</div>
        </div>
        {VENDAS_MOCK.map((v, i) => (
          <div key={v.num} style={{
            display: 'grid',
            gridTemplateColumns: '120px 1fr auto auto',
            gap: '24px',
            padding: '20px 0',
            borderBottom: i < VENDAS_MOCK.length - 1 ? `1px solid ${c.rowBorder}` : 'none',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: '14px', color: c.accent, fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>{v.num.split('-').slice(-1)[0]}</div>
            <div>
              <div style={{ fontSize: '18px', fontWeight: 400, color: c.text, marginBottom: '2px' }}>{v.cliente.split(' ').slice(0, 3).join(' ')}</div>
              <div style={{ fontSize: '11px', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.05em', fontFamily: '"Helvetica Neue", sans-serif' }}>
                {v.loja} · {v.data} · {v.qtd} {v.qtd > 1 ? 'itens' : 'item'}
              </div>
            </div>
            <div style={{ fontSize: '11px', color: c.accent, textTransform: 'uppercase', letterSpacing: '0.1em', fontFamily: '"Helvetica Neue", sans-serif', textAlign: 'right' }}>
              {v.status === 'PAGO' ? 'liquidado' : v.status === 'PARCIAL' ? `falta R$ ${formatBRL(v.falta!)}` : 'em loja'}
            </div>
            <div style={{ fontSize: '24px', fontWeight: 400, color: c.text, fontStyle: 'italic', fontFamily: 'Georgia, serif', minWidth: '160px', textAlign: 'right' }}>
              R$ {formatBRL(v.valor)}
            </div>
          </div>
        ))}
      </div>
      <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '10px', color: c.accent, textTransform: 'uppercase', letterSpacing: '0.2em', fontFamily: '"Helvetica Neue", sans-serif' }}>
        Clearix · Crafted for vision specialists since 1917
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// VERSÃO 3: MYKITA
// ═══════════════════════════════════════════════════════
function VersaoMykita({ modo }: { modo: Modo }) {
  const dark = modo === 'dark';
  const c = {
    bg: dark ? '#000000' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#000000',
    textMuted: dark ? '#888' : '#666',
    accent: '#FF6B35', // laranja sempre
    divider: dark ? '#1A1A1A' : '#E5E5E5',
    gridGap: dark ? '#1A1A1A' : '#E5E5E5',
  };

  return (
    <div style={{
      background: c.bg,
      color: c.text,
      padding: '32px',
      borderRadius: '0',
      fontFamily: '"Neue Haas Grotesk", "Helvetica Neue", Helvetica, Arial, sans-serif',
      minHeight: '600px',
      border: `1px solid ${c.accent}`,
      borderRight: `8px solid ${c.accent}`,
    }}>
      <div style={{ marginBottom: '40px', paddingBottom: '16px', borderBottom: `1px solid ${c.divider}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
          <div style={{ width: '32px', height: '6px', background: c.accent }} />
          <div style={{ fontSize: '10px', textTransform: 'uppercase', letterSpacing: '0.2em', color: c.textMuted }}>
            CLEARIX / VENDAS / 2026-05-22
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <h1 style={{ fontSize: '64px', fontWeight: 700, margin: 0, lineHeight: 0.95, letterSpacing: '-0.04em', textTransform: 'uppercase', color: c.text }}>
            Vendas<span style={{ color: c.accent }}>.</span>
          </h1>
          <button style={{ background: c.accent, color: '#000', border: 'none', padding: '14px 28px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
            + Nova venda
          </button>
        </div>
        <div style={{ fontSize: '12px', color: c.textMuted, marginTop: '8px', letterSpacing: '0.05em' }}>
          {KPIS.totalRegistros.toLocaleString('pt-BR').replace(/\./g, ' ')} REGISTROS
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1px', marginBottom: '40px', background: c.gridGap }}>
        {[
          { label: 'TOTAL', valor: '0', destaque: false },
          { label: 'FATURAMENTO', valor: `R$ ${formatBRL(KPIS.faturamento / 1000000)}M`, destaque: true },
          { label: 'TICKET', valor: `R$ ${formatBRL(KPIS.ticketMedio)}`, destaque: false },
          { label: 'ITENS', valor: KPIS.itens.toLocaleString('pt-BR').replace(/\./g, ' '), destaque: false },
        ].map((k) => (
          <div key={k.label} style={{ background: c.bg, padding: '24px 20px' }}>
            <div style={{ fontSize: '10px', color: c.textMuted, letterSpacing: '0.2em', marginBottom: '12px' }}>{k.label}</div>
            <div style={{ fontSize: '32px', fontWeight: 700, color: k.destaque ? c.accent : c.text, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums', lineHeight: 1 }}>
              {k.valor}
            </div>
          </div>
        ))}
      </div>

      <div style={{ display: 'flex', gap: '0', marginBottom: '24px' }}>
        {['VENDAS', 'GARANTIAS', 'TODAS'].map((t, i) => (
          <button key={t} style={{
            background: 'transparent',
            color: i === 0 ? c.text : c.textMuted,
            border: 'none',
            padding: '12px 24px 12px 0',
            fontSize: '11px',
            fontWeight: 700,
            cursor: 'pointer',
            fontFamily: 'inherit',
            letterSpacing: '0.15em',
            borderBottom: i === 0 ? `2px solid ${c.accent}` : 'none',
            marginRight: '24px',
          }}>{t}</button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '0', border: `1px solid ${c.divider}` }}>
        {VENDAS_MOCK.map((v, i) => (
          <div key={v.num} style={{
            display: 'grid',
            gridTemplateColumns: '160px 1fr 100px 140px 120px',
            gap: '20px',
            padding: '18px 20px',
            borderBottom: i < VENDAS_MOCK.length - 1 ? `1px solid ${c.divider}` : 'none',
            alignItems: 'center',
          }}>
            <div style={{ fontSize: '11px', color: c.textMuted, fontFamily: '"Söhne Mono", "JetBrains Mono", monospace', letterSpacing: '0.05em' }}>
              {v.num}
            </div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: c.text, textTransform: 'uppercase', letterSpacing: '0.02em' }}>
              {v.cliente}
            </div>
            <div style={{ fontSize: '10px', color: c.textMuted, textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {v.data}
            </div>
            <div style={{
              fontSize: '10px',
              fontWeight: 700,
              letterSpacing: '0.15em',
              color: v.status === 'PAGO' ? c.accent : v.status === 'PARCIAL' ? c.text : c.textMuted,
              textTransform: 'uppercase',
              borderLeft: `3px solid ${v.status === 'PAGO' ? c.accent : v.status === 'PARCIAL' ? c.text : c.textMuted}`,
              paddingLeft: '10px',
            }}>
              {v.status}
            </div>
            <div style={{ fontSize: '18px', fontWeight: 700, color: c.text, fontVariantNumeric: 'tabular-nums', textAlign: 'right' }}>
              R$ {formatBRL(v.valor)}
            </div>
          </div>
        ))}
      </div>

      <div style={{ marginTop: '32px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '10px', color: c.textMuted, letterSpacing: '0.2em', textTransform: 'uppercase' }}>
        <span>HANDCRAFTED IN SUZANO</span>
        <span>CLEARIX × MELLO ÓTICAS</span>
        <span>2026</span>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// VERSÃO 4: STONE-LENS (universal BR funcional)
// ═══════════════════════════════════════════════════════
function VersaoStoneLens({ modo }: { modo: Modo }) {
  const dark = modo === 'dark';
  const c = {
    bg: dark ? '#0A0F1E' : '#FAFAFA',
    surface: dark ? '#0F172A' : '#FFFFFF',
    elevated: dark ? '#1E293B' : '#FFFFFF',
    text: dark ? '#FFFFFF' : '#171717',
    textMuted: dark ? '#D4D4D4' : '#404040',
    textSubtle: dark ? '#737373' : '#737373',
    border: dark ? 'rgba(255,255,255,0.08)' : '#E5E5E5',
    borderStrong: dark ? 'rgba(255,255,255,0.16)' : '#D4D4D4',
    primary: dark ? '#60A5FA' : '#2563EB',         // blue-400 dark / blue-600 light
    primaryHover: dark ? '#3B82F6' : '#1D4ED8',
    cyan: '#06B6D4',
    // Status funcionais (cada um com fg + bg sutil)
    successFg: dark ? '#34D399' : '#059669',
    successBg: dark ? 'rgba(52,211,153,0.15)' : '#D1FAE5',
    warningFg: dark ? '#FBBF24' : '#D97706',
    warningBg: dark ? 'rgba(251,191,36,0.15)' : '#FEF3C7',
    dangerFg: dark ? '#F87171' : '#DC2626',
    dangerBg: dark ? 'rgba(248,113,113,0.15)' : '#FEE2E2',
    infoFg: dark ? '#60A5FA' : '#2563EB',
    infoBg: dark ? 'rgba(96,165,250,0.15)' : '#DBEAFE',
  };

  const statusMap: Record<string, { fg: string; bg: string; icone: string; label: string }> = {
    PAGO:    { fg: c.successFg, bg: c.successBg, icone: '✓', label: 'Pago' },
    PARCIAL: { fg: c.warningFg, bg: c.warningBg, icone: '⏱', label: 'Parcial' },
    CHEGOU:  { fg: c.infoFg, bg: c.infoBg, icone: '↓', label: 'Em loja' },
  };

  return (
    <div style={{
      background: c.bg,
      color: c.text,
      padding: '24px',
      borderRadius: '12px',
      fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
      minHeight: '600px',
      border: `1px solid ${c.border}`,
    }}>
      {/* Header funcional com breadcrumb + CTA */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px', fontSize: '13px', color: c.textSubtle }}>
          <span>Clearix Vendas</span>
          <span>›</span>
          <span style={{ color: c.text }}>Vendas</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
          <div>
            <h1 style={{ fontSize: '30px', fontWeight: 700, margin: 0, color: c.text, letterSpacing: '-0.02em' }}>
              Vendas
            </h1>
            <div style={{ fontSize: '14px', color: c.textMuted, marginTop: '4px' }}>
              <strong style={{ color: c.text, fontVariantNumeric: 'tabular-nums' }}>{KPIS.totalRegistros.toLocaleString('pt-BR')}</strong> registros · Lancaster Suzano
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button style={{
              background: c.surface,
              color: c.text,
              border: `1px solid ${c.borderStrong}`,
              padding: '10px 18px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
            }}>
              Pendentes
            </button>
            <button style={{
              background: c.primary,
              color: '#fff',
              border: 'none',
              padding: '10px 20px',
              borderRadius: '12px',
              fontSize: '14px',
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
              boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}>
              <span style={{ fontSize: '16px' }}>+</span> Nova venda
            </button>
          </div>
        </div>
      </div>

      {/* KPIs friendly */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '12px', marginBottom: '24px' }}>
        {[
          { label: 'Faturamento', valor: `R$ ${formatBRL(KPIS.faturamento / 1000000)}M`, delta: '+12% vs mês anterior', positive: true },
          { label: 'Ticket médio', valor: `R$ ${formatBRL(KPIS.ticketMedio)}`, delta: '+5%', positive: true },
          { label: 'Vendas', valor: KPIS.totalRegistros.toLocaleString('pt-BR'), delta: '+847 este mês', positive: true },
          { label: 'Itens vendidos', valor: KPIS.itens.toLocaleString('pt-BR'), delta: '+1.250', positive: true },
        ].map((k) => (
          <div key={k.label} style={{
            background: c.elevated,
            border: `1px solid ${c.border}`,
            borderRadius: '12px',
            padding: '16px',
            boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)',
          }}>
            <div style={{ fontSize: '12px', color: c.textSubtle, fontWeight: 500, marginBottom: '8px' }}>{k.label}</div>
            <div style={{ fontSize: '28px', fontWeight: 700, color: c.text, lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{k.valor}</div>
            <div style={{ fontSize: '12px', color: c.successFg, marginTop: '6px', fontWeight: 500, fontVariantNumeric: 'tabular-nums' }}>↑ {k.delta}</div>
          </div>
        ))}
      </div>

      {/* Filtros + busca friendly */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center' }}>
        <input type="text" placeholder="🔍 Buscar venda, cliente, OS..." style={{
          flex: 1,
          background: c.surface,
          border: `1px solid ${c.border}`,
          color: c.text,
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '14px',
          fontFamily: 'inherit',
          outline: 'none',
        }} />
        <button style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          color: c.text,
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}>Filtros · 2</button>
        <button style={{
          background: c.surface,
          border: `1px solid ${c.border}`,
          color: c.text,
          padding: '10px 14px',
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: 500,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}>Hoje ▾</button>
      </div>

      {/* Tabela densa friendly */}
      <div style={{ background: c.elevated, border: `1px solid ${c.border}`, borderRadius: '12px', overflow: 'hidden' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '140px 1fr 100px 130px 130px 80px',
          gap: '16px',
          padding: '12px 16px',
          borderBottom: `1px solid ${c.border}`,
          background: dark ? 'rgba(255,255,255,0.02)' : '#FAFAFA',
          fontSize: '12px',
          fontWeight: 600,
          color: c.textMuted,
          textTransform: 'uppercase',
          letterSpacing: '0.025em',
        }}>
          <div>Venda</div>
          <div>Cliente</div>
          <div>Data</div>
          <div>Status</div>
          <div style={{ textAlign: 'right' }}>Valor</div>
          <div></div>
        </div>
        {VENDAS_MOCK.map((v, i) => {
          const status = statusMap[v.status];
          return (
            <div key={v.num} style={{
              display: 'grid',
              gridTemplateColumns: '140px 1fr 100px 130px 130px 80px',
              gap: '16px',
              padding: '14px 16px',
              borderBottom: i < VENDAS_MOCK.length - 1 ? `1px solid ${c.border}` : 'none',
              alignItems: 'center',
              transition: 'background 150ms',
            }}>
              <div style={{ fontSize: '13px', fontFamily: '"JetBrains Mono", monospace', color: c.textMuted, fontVariantNumeric: 'tabular-nums' }}>
                #{v.num.split('-').slice(-1)[0]}
              </div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 500, color: c.text }}>{v.cliente.split(' ').slice(0, 3).join(' ')}</div>
                <div style={{ fontSize: '12px', color: c.textSubtle, marginTop: '2px' }}>📍 {v.loja}</div>
              </div>
              <div style={{ fontSize: '13px', color: c.textMuted, fontVariantNumeric: 'tabular-nums' }}>{v.data}</div>
              <div>
                <span style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                  fontSize: '12px',
                  fontWeight: 600,
                  padding: '3px 10px',
                  borderRadius: '9999px',
                  background: status.bg,
                  color: status.fg,
                }}>
                  <span style={{ fontSize: '11px' }}>{status.icone}</span>
                  {status.label}
                  {v.falta && <span style={{ opacity: 0.7, fontSize: '11px' }}>· falta R$ {formatBRL(v.falta)}</span>}
                </span>
              </div>
              <div style={{ fontSize: '15px', fontWeight: 700, color: c.text, fontVariantNumeric: 'tabular-nums', textAlign: 'right', fontFamily: '"JetBrains Mono", monospace' }}>
                R$ {formatBRL(v.valor)}
              </div>
              <div style={{ textAlign: 'right' }}>
                <button style={{
                  background: 'transparent',
                  border: 'none',
                  color: c.textMuted,
                  cursor: 'pointer',
                  padding: '4px 8px',
                  borderRadius: '6px',
                  fontSize: '16px',
                }}>···</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer friendly */}
      <div style={{ marginTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px', color: c.textSubtle }}>
        <span>Mostrando 5 de 20.399 vendas</span>
        <div style={{ display: 'flex', gap: '4px' }}>
          <button style={{ background: 'transparent', border: `1px solid ${c.border}`, color: c.textMuted, padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontFamily: 'inherit' }}>← Anterior</button>
          <button style={{ background: c.primary, border: 'none', color: '#fff', padding: '6px 12px', borderRadius: '6px', fontSize: '12px', cursor: 'pointer', fontWeight: 600, fontFamily: 'inherit' }}>Próxima →</button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════
// COMPONENTE PRINCIPAL
// ═══════════════════════════════════════════════════════

interface BlocoEsteticaProps {
  numero: number;
  nome: string;
  desc: string;
  cor: string;
  modo: Modo;
  onChange: (m: Modo) => void;
  children: React.ReactNode;
}

function BlocoEstetica({ numero, nome, desc, cor, modo, onChange, children }: BlocoEsteticaProps) {
  return (
    <div>
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="flex items-baseline gap-3">
          <h2 className="text-xl font-bold text-white">{numero}. {nome}</h2>
          <span className="text-xs text-white/40">{desc}</span>
        </div>
        <ToggleModo modo={modo} onChange={onChange} accent={cor} />
      </div>
      {children}
    </div>
  );
}

export default function MockClearixEstilos() {
  const [estilo, setEstilo] = useState<Estilo | 'comparar'>('comparar');
  const [modoClearix, setModoClearix] = useState<Modo>('dark');
  const [modoPersol, setModoPersol] = useState<Modo>('light');
  const [modoMykita, setModoMykita] = useState<Modo>('dark');
  const [modoStoneLens, setModoStoneLens] = useState<Modo>('light');

  return (
    <div className="p-8 max-w-[1900px] mx-auto">
      <div className="mb-6">
        <span className="text-xs uppercase tracking-wider text-white/40">Apoio · Design · Galeria viva dos 4 destinos (ADR-0025)</span>
        <h1 className="text-3xl font-bold text-white mb-2 mt-2">4 estéticas × 4 destinos × 2 modos</h1>
        <p className="text-white/60 text-sm max-w-3xl leading-relaxed">
          Após <strong className="text-white">ADR-0025</strong> (2026-05-25), as 4 estéticas deixaram de competir por 1 vaga em Clearix Vendas
          e foram <strong className="text-white">distribuídas por app</strong>:
          {' '}<strong style={{ color: '#2563EB' }}>Clearix Lens</strong> = ecossistema Clearix (R-014) ·
          {' '}<strong style={{ color: '#34D399' }}>Stone-Lens</strong> → Clearix Import (lab, R-018) → Vendas ·
          {' '}<strong style={{ color: '#D4A574' }}>Persol</strong> → Polapetit ·
          {' '}<strong style={{ color: '#FF6B35' }}>Mykita</strong> → Pulso Control.
          Dados visuais reais Mello em todas pra comparação justa. Briefings em
          {' '}<code className="bg-white/10 px-1.5 py-0.5 rounded text-xs">clearix_eco_full/clearix_import/BRIEFING_*_EXPERIMENT.md</code>.
        </p>
      </div>

      <div className="flex gap-2 mb-8 flex-wrap">
        {[
          { id: 'comparar', label: '⚡ Comparar lado-a-lado', cor: '#06B6D4' },
          { id: 'clearix', label: '🛡️ Clearix Lens · ecossistema Clearix (R-014)', cor: '#2563EB' },
          { id: 'stonelens', label: '🇧🇷 Stone-Lens → Clearix Import (lab)', cor: '#10B981' },
          { id: 'persol', label: '👓 Persol → Polapetit', cor: '#A67C52' },
          { id: 'mykita', label: '⚙️ Mykita → Pulso Control', cor: '#FF6B35' },
        ].map(t => (
          <button
            key={t.id}
            onClick={() => setEstilo(t.id as any)}
            style={{
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: 600,
              cursor: 'pointer',
              border: estilo === t.id ? `2px solid ${t.cor}` : '1px solid rgba(255,255,255,0.1)',
              background: estilo === t.id ? `${t.cor}20` : 'rgba(255,255,255,0.04)',
              color: estilo === t.id ? '#fff' : 'rgba(255,255,255,0.6)',
              transition: 'all 0.15s',
            }}
          >{t.label}</button>
        ))}
      </div>

      {estilo === 'comparar' && (
        <div className="space-y-12">
          <BlocoEstetica
            numero={1}
            nome="Clearix Lens · ecossistema Clearix"
            desc="Inter · blue-500/blue-300 · R-014 mantida (Hub + 17 sub-apps)"
            cor="#2563EB"
            modo={modoClearix}
            onChange={setModoClearix}
          >
            <VersaoClearixLens modo={modoClearix} />
          </BlocoEstetica>

          <BlocoEstetica
            numero={2}
            nome="Stone-Lens → Clearix Import (lab) → Vendas"
            desc="R-018: experimento Clearix sempre no Import primeiro (lab roda local) · valida visual · depois porta pra Clearix Vendas em PR revisado"
            cor="#10B981"
            modo={modoStoneLens}
            onChange={setModoStoneLens}
          >
            <VersaoStoneLens modo={modoStoneLens} />
          </BlocoEstetica>

          <BlocoEstetica
            numero={3}
            nome="Persol → Polapetit"
            desc="Noto Serif italic · gold #D4AF37 + sage #7A8D80 · festa infantil premium (materializa DESIGN.md atual)"
            cor="#A67C52"
            modo={modoPersol}
            onChange={setModoPersol}
          >
            <VersaoPersol modo={modoPersol} />
          </BlocoEstetica>

          <BlocoEstetica
            numero={4}
            nome="Mykita → Pulso Control"
            desc="Helvetica Grotesk · 1 acento laranja · monitor industrial · DevOps editorial (10 canais · worker parado)"
            cor="#FF6B35"
            modo={modoMykita}
            onChange={setModoMykita}
          >
            <VersaoMykita modo={modoMykita} />
          </BlocoEstetica>

          <div className="mt-12 p-6 bg-white/5 border border-white/10 rounded-lg">
            <h2 className="text-lg font-bold text-white mb-1">🎯 4 estéticas, 4 destinos (ADR-0025)</h2>
            <p className="text-sm text-white/60 mb-4">Em vez de competirem por 1 vaga, cada estética encontra o app onde ela faz sentido natural.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm text-white/80">
              <div className="p-4 bg-[#2563EB]/10 border border-[#2563EB]/20 rounded-lg">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Destino</div>
                <div className="font-bold text-white mb-1">Ecossistema Clearix</div>
                <div className="text-xs text-white/50 mb-3">17 sub-apps · R-014</div>
                <div className="font-semibold text-[#06B6D4] mb-2 text-sm">🛡️ Clearix Lens</div>
                <ul className="space-y-1 list-disc list-inside leading-relaxed text-xs">
                  <li>Inter + blue-500/blue-300</li>
                  <li>SaaS moderno previsível</li>
                  <li><strong>Status:</strong> em produção (mantido)</li>
                </ul>
              </div>
              <div className="p-4 bg-[#10B981]/10 border border-[#10B981]/30 rounded-lg">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Destino (R-018)</div>
                <div className="font-bold text-white mb-1">Clearix Import (lab)</div>
                <div className="text-xs text-white/50 mb-3">etapa 1 · valida no lab antes de Vendas</div>
                <div className="font-semibold text-[#34D399] mb-2 text-sm">🇧🇷 Stone-Lens</div>
                <ul className="space-y-1 list-disc list-inside leading-relaxed text-xs">
                  <li>Inter + paleta funcional rica</li>
                  <li>tabela densa · mobile-first</li>
                  <li><strong>Status:</strong> Import valida → depois porta pra Vendas</li>
                </ul>
              </div>
              <div className="p-4 bg-[#A67C52]/10 border border-[#A67C52]/30 rounded-lg">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Destino</div>
                <div className="font-bold text-white mb-1">Polapetit</div>
                <div className="text-xs text-white/50 mb-3">festa infantil premium</div>
                <div className="font-semibold text-[#D4A574] mb-2 text-sm">👓 Persol</div>
                <ul className="space-y-1 list-disc list-inside leading-relaxed text-xs">
                  <li>Noto Serif italic + gold #D4AF37</li>
                  <li>heritage glamour acolhedor</li>
                  <li><strong>Status:</strong> DESIGN.md já alinhado 80%</li>
                </ul>
              </div>
              <div className="p-4 bg-[#FF6B35]/10 border border-[#FF6B35]/30 rounded-lg">
                <div className="text-[10px] uppercase tracking-wider text-white/40 mb-1">Destino</div>
                <div className="font-bold text-white mb-1">Pulso Control</div>
                <div className="text-xs text-white/50 mb-3">DevOps editorial · 10 canais</div>
                <div className="font-semibold text-[#FF6B35] mb-2 text-sm">⚙️ Mykita</div>
                <ul className="space-y-1 list-disc list-inside leading-relaxed text-xs">
                  <li>Helvetica Grotesk + 1 acento laranja</li>
                  <li>monitor industrial · datacenter</li>
                  <li><strong>Status:</strong> briefing pronto</li>
                </ul>
              </div>
            </div>

            <div className="mt-6 p-4 bg-[#06B6D4]/10 border border-[#06B6D4]/30 rounded-lg">
              <div className="text-xs font-semibold uppercase tracking-wider text-[#06B6D4] mb-2">💡 Por que distribuir e não escolher 1</div>
              <p className="text-sm text-white/90 leading-relaxed">
                Cada app tem perfil de usuário diferente. Operador 8h/dia do Mello pede densidade Stone-Lens.
                Família contratando festa infantil pede glamour Persol. Operador editorial vendo worker parado pede industrial Mykita.
                Forçar uma estética única para todos os apps desperdiça o ajuste fino de cada destino.
              </p>
              <ul className="mt-3 space-y-1 list-disc list-inside text-sm text-white/80 leading-relaxed">
                <li><strong className="text-white">R-014 segue canônica</strong> pro ecossistema Clearix (Hub + 17 sub-apps)</li>
                <li><strong className="text-white">Polapetit e Pulso</strong> ganham autonomia visual com tokens próprios (mas mesmo padrão W3C DTCG)</li>
                <li><strong className="text-white">3 briefings em paralelo</strong> — Stone-Lens, Persol e Mykita podem rodar independentemente</li>
                <li><strong className="text-white">Mock fica como galeria viva</strong> de pré-visualização dos 4 destinos</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {estilo === 'clearix' && (
        <BlocoEstetica numero={1} nome="Clearix Lens · ecossistema Clearix" desc="Inter · blue-500/blue-300 · R-014 mantida" cor="#2563EB" modo={modoClearix} onChange={setModoClearix}>
          <VersaoClearixLens modo={modoClearix} />
        </BlocoEstetica>
      )}
      {estilo === 'stonelens' && (
        <BlocoEstetica numero={2} nome="Stone-Lens → Clearix Import (lab)" desc="Inter + paleta funcional rica · tabela densa · operador 8h/dia (Mello + bairro)" cor="#10B981" modo={modoStoneLens} onChange={setModoStoneLens}>
          <VersaoStoneLens modo={modoStoneLens} />
        </BlocoEstetica>
      )}
      {estilo === 'persol' && (
        <BlocoEstetica numero={3} nome="Persol → Polapetit" desc="Noto Serif italic + gold #D4AF37 · festa infantil premium (DESIGN.md já alinhado 80%)" cor="#A67C52" modo={modoPersol} onChange={setModoPersol}>
          <VersaoPersol modo={modoPersol} />
        </BlocoEstetica>
      )}
      {estilo === 'mykita' && (
        <BlocoEstetica numero={4} nome="Mykita → Pulso Control" desc="Helvetica Grotesk + 1 acento laranja radical · monitor industrial · DevOps editorial" cor="#FF6B35" modo={modoMykita} onChange={setModoMykita}>
          <VersaoMykita modo={modoMykita} />
        </BlocoEstetica>
      )}

      <div className="mt-8 text-xs text-white/40 text-center">
        Página atualizada em 2026-05-25 · 4 estéticas distribuídas em 4 destinos (ADR-0025) · Dados reais Mello visualizados em todas pra comparação justa · Briefings em <code className="bg-white/10 px-1 rounded">clearix_import/BRIEFING_*_EXPERIMENT.md</code>
      </div>
    </div>
  );
}
