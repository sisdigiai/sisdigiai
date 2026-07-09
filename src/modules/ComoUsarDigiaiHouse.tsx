import React from 'react';
import { Check, X, Square, Layers, Zap, Volume2, Palette, Type as TypeIcon } from 'lucide-react';
import PageHeader from '../components/PageHeader';

/**
 * Módulo "Como usar o DIGIAI House" — o guia de APLICAÇÃO do design system
 * (complementa o /brand, que mostra o sistema, e o /referencias-design, que é benchmark).
 * Princípios · tokens · do/don't · voz · co-branding · checklist de adoção.
 *
 * 100% token-aware (bg-surface / text-on-surface / border-outline / text-secondary…),
 * então acompanha o toggle claro/escuro do app. Hex só aparece como CONTEÚDO
 * (swatches de cor e paleta de ecossistema), nunca como cor de UI.
 */

const PRINCIPIOS = [
  { icon: <Volume2 className="w-5 h-5" />, t: 'Quiet Tech', d: 'Autoridade calma. Sem clichês neon de "IA". Resultado fala mais alto que marketing.' },
  { icon: <Square className="w-5 h-5" />, t: 'Precisão geométrica', d: 'Grade rígida, cantos retos (0px), ângulos de 90°. Ortogonal e intencional.' },
  { icon: <Layers className="w-5 h-5" />, t: 'Profundidade por outline', d: 'Bordas de 1px definem camadas — sem sombra, sem blur, sem vidro fosco.' },
  { icon: <Zap className="w-5 h-5" />, t: 'Forest = ação', d: 'O verde âncora é para ação e status. Nunca decoração nem gradiente.' },
];

const TOKENS = [
  { grupo: 'Superfície', itens: ['--color-surface', '--color-surface-container', '--color-surface-high', '--color-surface-lowest'] },
  { grupo: 'Texto', itens: ['--color-on-surface', '--color-on-surface-variant', '--color-muted'] },
  { grupo: 'Ação / acento', itens: ['--color-action', '--color-action-hover', '--color-on-action', '--color-secondary', '--color-forest'] },
  { grupo: 'Contorno', itens: ['--color-outline', '--color-outline-strong'] },
  { grupo: 'Status', itens: ['--color-success', '--color-warning', '--color-danger', '--color-info'] },
];

const DOS = [
  'Carregar index.css (tokens @theme) antes de qualquer estilo',
  'Cor/tipo/espaço sempre via token — hex hardcoded nunca (na UI)',
  'Cantos retos (0px); profundidade por outline de 1px',
  'action-primary no dark = tom claro do hue (WCAG 4.5:1)',
  'Respeitar prefers-reduced-motion em toda animação',
];
const DONTS = [
  'Cantos arredondados em botões/inputs/cards',
  'Sombra, blur ou glassmorphism pra criar profundidade',
  'Gradiente neon ou cyan fora de contexto de produto',
  'Forest como cor decorativa ou de fundo',
  'Sequestrar o scroll ou animar sem fallback',
];

const VOZ = [
  { ctx: 'CTA', ok: 'Explorar infraestrutura', no: 'Garanta já o seu desconto!!!' },
  { ctx: 'Erro', ok: 'Ocorreu uma inconsistência no processamento do dado.', no: 'Ops! Algo deu errado!' },
  { ctx: 'Headline', ok: 'Gestão óptica orientada por dados. Sem ruído.', no: 'A revolução mágica da sua ótica!' },
];

const ECO = [
  { nome: 'Clearix', hex: '#10B981' }, { nome: 'Ótica Sem Improviso', hex: '#CB5A43' },
  { nome: 'Nexus', hex: '#64748B' }, { nome: 'Lumina', hex: '#818CF8' },
  { nome: 'Pulso', hex: '#991B1B' }, { nome: 'Polapetit', hex: '#DB2777' },
  { nome: 'Qual a Foto', hex: '#7C3AED' }, { nome: 'Nipo School', hex: '#0D9488' },
  { nome: 'Clearix Academy', hex: '#D97706' }, { nome: 'App', hex: '#94A3B8' },
];

const CHECKLIST = [
  'index.css importado antes de tudo; data-theme no <html>',
  'Zero hex hardcoded fora do index.css (exceto swatch/produto)',
  'Cantos retos; profundidade por outline',
  'action-primary no dark = tom claro do hue',
  'Forest só em ação/status; sem gradiente/neon',
  'prefers-reduced-motion respeitado',
];

function SectionLabel({ icon, kicker, title }: { icon: React.ReactNode; kicker: string; title: string }) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-2 text-secondary mb-3">
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">{kicker}</span>
      </div>
      <h2 className="font-serif text-2xl md:text-3xl font-semibold tracking-tight text-on-surface">{title}</h2>
      <div className="h-0.5 w-16 bg-action mt-4" />
    </div>
  );
}

export default function ComoUsarDigiaiHouse() {
  return (
    <div className="max-w-7xl mx-auto p-8 pb-24">
      <PageHeader
        eyebrow="Sistema · Design · Como usar"
        title="Como usar o DIGIAI House"
        subtitle={
          <>
            O guia de <strong className="text-on-surface">aplicação</strong> do design system canônico (v1.0).
            O <strong className="text-on-surface">/brand</strong> mostra o que o sistema é; aqui está <em>como</em> usá-lo.
            Regra de ouro: <strong className="text-on-surface">a fundação governa, a marca veste</strong>.
          </>
        }
      />

      {/* Princípios */}
      <section className="mb-16">
        <SectionLabel icon={<Square className="w-4 h-4" />} kicker="§ 01 — Princípios" title="Geometric Precision" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-px bg-outline/10 border border-outline/10">
          {PRINCIPIOS.map((p) => (
            <div key={p.t} className="bg-surface p-6">
              <div className="text-secondary mb-4">{p.icon}</div>
              <h3 className="font-serif text-lg font-semibold text-on-surface mb-1.5">{p.t}</h3>
              <p className="text-sm text-muted leading-relaxed">{p.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Tokens */}
      <section className="mb-16">
        <SectionLabel icon={<Palette className="w-4 h-4" />} kicker="§ 02 — Tokens" title="A fonte da verdade" />
        <p className="text-on-surface-variant max-w-2xl mb-8 text-sm leading-relaxed">
          Todos resolvem no tema ativo (claro/escuro). Consuma via Tailwind (<code className="font-mono text-xs bg-surface-high px-1.5 py-0.5">bg-surface</code>,
          {' '}<code className="font-mono text-xs bg-surface-high px-1.5 py-0.5">text-on-surface</code>) ou CSS var.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-outline/10 border border-outline/10">
          {TOKENS.map((g) => (
            <div key={g.grupo} className="bg-surface p-6">
              <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary mb-3">{g.grupo}</div>
              <ul className="space-y-1.5">
                {g.itens.map((tk) => (
                  <li key={tk} className="flex items-center gap-2 text-sm">
                    <span className="w-4 h-4 border border-outline/40 shrink-0" style={{ background: `var(${tk})` }} />
                    <code className="font-mono text-xs text-on-surface-variant">{tk}</code>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      {/* Do / Don't */}
      <section className="mb-16">
        <SectionLabel icon={<Check className="w-4 h-4" />} kicker="§ 03 — Do / Don't" title="Faça / Não faça" />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-outline/10 border border-outline/10">
          <div className="bg-surface p-6">
            <div className="flex items-center gap-2 text-success mb-4"><Check className="w-4 h-4" /><span className="font-mono text-[11px] uppercase tracking-[0.15em]">Faça</span></div>
            <ul className="space-y-3">
              {DOS.map((d) => (
                <li key={d} className="flex gap-3 text-sm text-on-surface-variant leading-relaxed">
                  <Check className="w-4 h-4 text-success shrink-0 mt-0.5" />{d}
                </li>
              ))}
            </ul>
          </div>
          <div className="bg-surface p-6">
            <div className="flex items-center gap-2 text-danger mb-4"><X className="w-4 h-4" /><span className="font-mono text-[11px] uppercase tracking-[0.15em]">Não faça</span></div>
            <ul className="space-y-3">
              {DONTS.map((d) => (
                <li key={d} className="flex gap-3 text-sm text-muted leading-relaxed">
                  <X className="w-4 h-4 text-danger shrink-0 mt-0.5" />{d}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Voz */}
      <section className="mb-16">
        <SectionLabel icon={<Volume2 className="w-4 h-4" />} kicker="§ 04 — Voz da marca" title="Poder silencioso, sem ruído" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-outline/10 border border-outline/10">
          {VOZ.map((v) => (
            <div key={v.ctx} className="bg-surface">
              <div className="font-mono text-[10px] uppercase tracking-[0.15em] text-muted px-5 py-3 border-b border-outline/10">{v.ctx}</div>
              <div className="px-5 py-4 border-b border-outline/10 flex gap-3 items-start">
                <span className="font-mono text-[10px] text-success shrink-0 mt-1">FAÇA</span>
                <span className="text-sm text-on-surface">{v.ok}</span>
              </div>
              <div className="px-5 py-4 flex gap-3 items-start">
                <span className="font-mono text-[10px] text-danger shrink-0 mt-1">NÃO</span>
                <span className="text-sm text-muted line-through">{v.no}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Co-branding */}
      <section className="mb-16">
        <SectionLabel icon={<Layers className="w-4 h-4" />} kicker="§ 05 — Co-branding" title="DIGIAI / Produto" />
        <p className="text-on-surface-variant max-w-2xl mb-8 text-sm leading-relaxed">
          Wordmark serif + barra + nome do produto na cor atribuída. Uma cor por produto — assinatura, nunca UI funcional.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-px bg-outline/10 border border-outline/10">
          {ECO.map((p) => (
            <div key={p.nome} className="bg-surface px-5 py-4 flex items-center gap-3">
              <span className="w-2.5 h-2.5 shrink-0" style={{ background: p.hex }} />
              <span className="font-serif text-lg text-on-surface">DIGIAI <span className="text-muted">/</span> {p.nome}</span>
              <span className="ml-auto font-mono text-[10px] text-muted">{p.hex}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Checklist */}
      <section>
        <SectionLabel icon={<TypeIcon className="w-4 h-4" />} kicker="§ 06 — Adoção" title="Checklist por tela" />
        <div className="border border-outline/10">
          {CHECKLIST.map((c) => (
            <div key={c} className="flex items-center gap-3 px-5 py-3.5 border-b border-outline/10 last:border-0 bg-surface">
              <span className="w-4 h-4 bg-action flex items-center justify-center shrink-0"><Check className="w-3 h-3 text-on-action" /></span>
              <span className="text-sm text-on-surface">{c}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
