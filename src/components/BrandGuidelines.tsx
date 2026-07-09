import { useEffect, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { Download, CheckCircle2, Copy, Layers, Type, Palette, Square, Minus } from 'lucide-react';
import { Logo } from './Logo';
import { initConvergenceMesh, initReveal } from '../lib/dhMesh';
import BrandMktAtelie from './BrandMktAtelie';

type BrandTab = 'house' | 'mkt';

export default function BrandGuidelines() {
  const [tab, setTab] = useState<BrandTab>('house');
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => (tab === 'house' && canvasRef.current ? initConvergenceMesh(canvasRef.current) : undefined), [tab]);
  useEffect(() => (tab === 'house' && rootRef.current ? initReveal(rootRef.current) : undefined), [tab]);

  const handleCopy = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  // Swatches = CONTEÚDO (mostram as cores reais do brand). Hex propositais.
  const ColorCard = ({ name, role, hex, rgb, bg, ring }: { name: string; role: string; hex: string; rgb: string; bg: string; ring?: boolean }) => (
    <div className="flex flex-col gap-3 group" data-reveal>
      <div className={`h-32 w-full relative overflow-hidden border ${ring ? 'border-outline/30' : 'border-outline/10'} ${bg}`}>
        <button
          onClick={() => handleCopy(hex)}
          className="absolute inset-0 flex items-center justify-center bg-surface/50 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          {copiedColor === hex
            ? <CheckCircle2 className="w-6 h-6 text-on-surface" />
            : <Copy className="w-6 h-6 text-on-surface" />}
        </button>
      </div>
      <div>
        <h3 className="font-serif text-lg font-semibold text-on-surface">{name}</h3>
        <div className="text-[10px] font-mono uppercase tracking-widest text-secondary mt-0.5">{role}</div>
        <div className="text-xs text-muted mt-1.5 font-mono space-y-0.5">
          <p>HEX {hex}</p>
          <p>RGB {rgb}</p>
        </div>
      </div>
    </div>
  );

  const SectionLabel = ({ icon, kicker, title }: { icon: React.ReactNode; kicker: string; title: string }) => (
    <div className="mb-12">
      <div className="flex items-center gap-2 text-secondary mb-3">
        {icon}
        <span className="font-mono text-[11px] uppercase tracking-[0.2em]">{kicker}</span>
      </div>
      <h2 className="font-serif text-3xl md:text-4xl font-semibold tracking-tight text-on-surface">{title}</h2>
      <div data-draw className="h-0.5 w-24 bg-action mt-4" />
    </div>
  );

  const TabButton = ({ id, kicker, label }: { id: BrandTab; kicker: string; label: string }) => (
    <button
      onClick={() => setTab(id)}
      aria-current={tab === id ? 'page' : undefined}
      className={`px-5 py-3 font-mono text-[11px] uppercase tracking-[0.2em] border-b-2 transition-colors ${
        tab === id
          ? 'border-action text-on-surface'
          : 'border-transparent text-muted hover:text-on-surface-variant'
      }`}
    >
      <span className="opacity-60">{kicker} · </span>{label}
    </button>
  );

  return (
    <div className="min-h-screen bg-surface text-on-surface">
      {/* Abas: identidade da holding + temas de produto registrados no brand */}
      <nav className="sticky top-0 z-20 bg-surface/95 backdrop-blur-sm border-b border-outline/20 px-6 flex gap-2" aria-label="Abas do Brand Guidelines">
        <TabButton id="house" kicker="Holding" label="DIGIAI House" />
        <TabButton id="mkt" kicker="Produto" label="MKT · Ateliê de Convergência" />
      </nav>

      {tab === 'mkt' ? <BrandMktAtelie /> : (
    <div ref={rootRef} className="min-h-screen bg-surface text-on-surface selection:bg-secondary selection:text-on-action pb-32">
      {/* Cover — malha de convergência 3D (dhMesh) */}
      <section className="relative overflow-hidden border-b border-outline/10 min-h-[88vh] flex items-center">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" aria-hidden />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-secondary/[0.04] blur-[120px] pointer-events-none" />

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center px-6 py-24 w-full">
          <span className="font-mono text-[11px] uppercase tracking-[0.25em] text-secondary mb-8">Brand System · Geometric Precision</span>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
          >
            <Logo variant="stacked" iconClassName="w-28 h-28 md:w-40 md:h-40" textClassName="text-5xl md:text-7xl" tagline={true} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-12 text-lg md:text-xl text-on-surface-variant max-w-2xl leading-relaxed font-light"
          >
            A holding tech operada por IA. Poder silencioso, precisão geométrica e inteligência escalável — uma estética editorial de "Quiet Tech" enraizada no design suíço.
          </motion.p>
        </div>
      </section>

      {/* Sistema em números — count-up (dhMesh/initReveal) */}
      <section className="py-16 px-6 border-b border-outline/10">
        <div className="max-w-7xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-px bg-outline/10 border border-outline/10">
          {[
            { n: '10', label: 'Marcas no ecossistema' },
            { n: '3', label: 'Vozes tipográficas' },
            { n: '6', label: 'Níveis de superfície' },
            { n: '2', label: 'Temas · claro / escuro' },
          ].map((m) => (
            <div key={m.label} className="bg-surface p-8 flex flex-col items-center text-center" data-reveal>
              <div data-count={m.n} className="font-serif text-5xl md:text-6xl font-semibold tracking-tight text-on-surface">{m.n}</div>
              <div className="mt-3 text-[10px] font-mono uppercase tracking-[0.2em] text-secondary">{m.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Logo Variations */}
      <section className="py-24 px-6 border-b border-outline/10 bg-surface-low/40">
        <div className="max-w-7xl mx-auto">
          <SectionLabel icon={<Layers className="w-4 h-4" />} kicker="Identidade" title="Variações do Logo" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-surface p-12 border border-outline/10 flex flex-col items-center justify-center min-h-[300px] relative" data-reveal>
              <div className="absolute top-6 left-6 text-[10px] font-mono text-muted uppercase tracking-widest">Primário · Escuro</div>
              <Logo variant="horizontal" iconClassName="w-12 h-12" textClassName="text-4xl" />
            </div>
            <div className="bg-white p-12 border border-outline/10 flex flex-col items-center justify-center min-h-[300px] relative" data-reveal>
              <div className="absolute top-6 left-6 text-[10px] font-mono text-black/40 uppercase tracking-widest">Primário · Claro</div>
              <Logo theme="light" variant="horizontal" iconClassName="w-12 h-12" textClassName="text-4xl" />
            </div>
            <div className="bg-surface p-12 border border-outline/10 flex flex-col items-center justify-center min-h-[400px] relative" data-reveal>
              <div className="absolute top-6 left-6 text-[10px] font-mono text-muted uppercase tracking-widest">Empilhado · Escuro</div>
              <Logo variant="stacked" iconClassName="w-24 h-24" textClassName="text-5xl" />
            </div>
            <div className="grid grid-rows-2 gap-6" data-reveal>
              <div className="bg-forest p-12 border border-outline/10 flex flex-col items-center justify-center relative">
                <div className="absolute top-6 left-6 text-[10px] font-mono text-on-surface/60 uppercase tracking-widest">Mono · Sobre Forest</div>
                <Logo theme="mono-white" variant="horizontal" iconClassName="w-10 h-10" textClassName="text-3xl" />
              </div>
              <div className="bg-white p-12 border border-outline/10 flex flex-col items-center justify-center relative">
                <div className="absolute top-6 left-6 text-[10px] font-mono text-black/40 uppercase tracking-widest">Mono · Escuro</div>
                <Logo theme="mono-dark" variant="horizontal" iconClassName="w-10 h-10" textClassName="text-3xl" />
              </div>
            </div>
            <div className="bg-surface p-12 border border-outline/10 flex flex-col items-center justify-center relative md:col-span-2" data-reveal>
              <div className="absolute top-6 left-6 text-[10px] font-mono text-muted uppercase tracking-widest">Ecossistema & Símbolo</div>
              <div className="flex flex-wrap justify-center gap-16 items-center w-full mt-8">
                <Logo variant="icon" iconClassName="w-20 h-20" />
                <div className="h-20 w-px bg-outline/20 hidden md:block" />
                <div className="flex flex-col gap-6">
                  <Logo variant="horizontal" iconClassName="w-8 h-8" textClassName="text-2xl" productName="Lab" />
                  <Logo variant="horizontal" iconClassName="w-8 h-8" textClassName="text-2xl" productName="Ventures" />
                  <Logo variant="horizontal" iconClassName="w-8 h-8" textClassName="text-2xl" productName="Studio" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Color Palette */}
      <section className="py-24 px-6 border-b border-outline/10">
        <div className="max-w-7xl mx-auto">
          <SectionLabel icon={<Palette className="w-4 h-4" />} kicker="Paleta" title="Cores" />
          <p className="text-on-surface-variant max-w-2xl mb-12 -mt-6 leading-relaxed">
            Fundação monocromática profunda para transmitir estabilidade. O verde-floresta entra com parcimônia, como contraponto orgânico ao base técnico — só em ações primárias e indicadores de status.
          </p>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <ColorCard name="Deep Forest" role="Ação primária" hex="#2D4B3E" rgb="45, 75, 62" bg="bg-forest" />
            <ColorCard name="Sage" role="Acento no escuro" hex="#ADCEBD" rgb="173, 206, 189" bg="bg-secondary" />
            <ColorCard name="Dark Navy" role="Base / Surface" hex="#0D131F" rgb="13, 19, 31" bg="bg-surface" ring />
            <ColorCard name="Container" role="Camada / separação" hex="#1A202C" rgb="26, 32, 44" bg="bg-surface-container" />
            <ColorCard name="Clarity" role="Texto / ícones" hex="#DDE2F3" rgb="221, 226, 243" bg="bg-on-surface" />
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="py-24 px-6 border-b border-outline/10 bg-surface-low/40">
        <div className="max-w-7xl mx-auto">
          <SectionLabel icon={<Type className="w-4 h-4" />} kicker="Tipografia" title="Três Vozes" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-px bg-outline/10 border border-outline/10">
            <div className="bg-surface p-8" data-reveal>
              <div className="flex items-baseline justify-between mb-6">
                <h3 className="font-serif text-3xl font-semibold text-on-surface">Source Serif 4</h3>
                <span className="text-secondary font-mono text-[10px] uppercase tracking-widest">Títulos</span>
              </div>
              <div className="font-serif text-6xl font-semibold tracking-tight text-on-surface">Aa</div>
              <p className="text-sm text-muted mt-4 leading-relaxed">Autoridade literária e editorial nos títulos. Tracking apertado para um ar "travado".</p>
            </div>
            <div className="bg-surface p-8" data-reveal>
              <div className="flex items-baseline justify-between mb-6">
                <h3 className="font-sans text-3xl font-bold text-on-surface">Inter</h3>
                <span className="text-secondary font-mono text-[10px] uppercase tracking-widest">Corpo</span>
              </div>
              <div className="font-sans text-6xl font-semibold tracking-tight text-on-surface">Aa</div>
              <p className="text-sm text-muted mt-4 leading-relaxed">Legibilidade máxima em interfaces densas de dados.</p>
            </div>
            <div className="bg-surface p-8" data-reveal>
              <div className="flex items-baseline justify-between mb-6">
                <h3 className="font-mono text-2xl font-semibold text-on-surface">JetBrains Mono</h3>
                <span className="text-secondary font-mono text-[10px] uppercase tracking-widest">Metadados</span>
              </div>
              <div className="font-mono text-6xl font-medium tracking-tight text-on-surface">Aa</div>
              <p className="text-sm text-muted mt-4 leading-relaxed">Labels, chips e dados — reforça a "precisão geométrica".</p>
            </div>
          </div>

          {/* Usage Example */}
          <div className="mt-8 bg-surface p-10 border border-outline/10" data-reveal>
            <div className="text-[10px] font-mono text-secondary uppercase tracking-[0.2em] mb-3">Exemplo de uso</div>
            <h1 className="font-serif text-4xl font-semibold tracking-tight mb-4 text-on-surface">Transformando Informação em Decisão</h1>
            <p className="text-lg text-on-surface-variant leading-relaxed mb-6 max-w-2xl">
              A DIGIAI é uma holding tech operada por IA que constrói e escala ecossistemas digitais verticais com inteligência aplicada.
            </p>
            <div className="flex items-center gap-4">
              <button className="bg-action text-on-action px-6 py-3 font-medium hover:bg-action-hover transition-colors">Ação primária</button>
              <button className="text-on-surface px-6 py-3 font-medium border border-outline/30 hover:border-action/50 transition-colors">Secundária</button>
            </div>
          </div>
        </div>
      </section>

      {/* Principles */}
      <section className="py-24 px-6 border-b border-outline/10">
        <div className="max-w-7xl mx-auto">
          <SectionLabel icon={<Square className="w-4 h-4" />} kicker="Princípios" title="Geometric Precision" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: <Square className="w-5 h-5" />, t: 'Cantos retos · 0px', d: 'Botões, inputs, cards e modais a 90°. Engenharia, não decoração.' },
              { icon: <Minus className="w-5 h-5" />, t: 'Bordas 1px', d: 'Off-white a baixa opacidade definem limites — sem sombras nem blur.' },
              { icon: <Layers className="w-5 h-5" />, t: 'Camadas tonais', d: 'Profundidade por tons de surface, não por elevação física.' },
              { icon: <Type className="w-5 h-5" />, t: 'Chips mono caixa-alta', d: 'Categorização e status sem imitar botões.' },
            ].map((p) => (
              <div key={p.t} className="bg-surface-container border border-outline/15 p-6" data-reveal>
                <div className="text-secondary mb-4">{p.icon}</div>
                <h3 className="font-serif text-lg font-semibold text-on-surface mb-1.5">{p.t}</h3>
                <p className="text-sm text-muted leading-relaxed">{p.d}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Assets */}
      <section className="py-24 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary">Recursos</span>
          <h2 className="font-serif text-3xl font-semibold tracking-tight mt-3 mb-6 text-on-surface">Brand Assets</h2>
          <p className="text-on-surface-variant max-w-2xl mx-auto mb-12 leading-relaxed">
            Logo oficial DIGIAI em SVG vetorial. (Pacote completo com PNGs em alta resolução e favicons está em preparação.)
          </p>
          <a
            href="/favicon.svg"
            download="digiai-logo.svg"
            className="inline-flex items-center gap-3 bg-action text-on-action px-8 py-4 font-semibold text-base hover:bg-action-hover transition-colors"
          >
            <Download className="w-5 h-5" />
            Baixar logo (SVG)
          </a>
        </div>
      </section>
    </div>
      )}
    </div>
  );
}
