import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Download, CheckCircle2, Copy, Layers, Type, Palette } from 'lucide-react';
import { Logo } from './Logo';

export default function BrandGuidelines() {
  const [copiedColor, setCopiedColor] = useState<string | null>(null);

  const handleCopy = (color: string) => {
    navigator.clipboard.writeText(color);
    setCopiedColor(color);
    setTimeout(() => setCopiedColor(null), 2000);
  };

  const ColorCard = ({ name, hex, rgb, cmyk, className }: any) => (
    <div className="flex flex-col gap-3 group">
      <div className={`h-32 rounded-2xl w-full shadow-lg border border-white/5 relative overflow-hidden ${className}`}>
        <button
          onClick={() => handleCopy(hex)}
          className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
        >
          {copiedColor === hex ? (
            <CheckCircle2 className="w-6 h-6 text-white" />
          ) : (
            <Copy className="w-6 h-6 text-white" />
          )}
        </button>
      </div>
      <div>
        <h3 className="font-bold text-lg">{name}</h3>
        <div className="text-sm text-white/60 mt-1 font-mono space-y-1">
          <p>HEX: {hex}</p>
          <p>RGB: {rgb}</p>
          <p>CMYK: {cmyk}</p>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0A0F1E] text-white selection:bg-[#2563EB] selection:text-white pb-32">
      {/* Hero Section */}
      <section className="pt-16 pb-32 px-6 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-[#2563EB]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <Logo variant="stacked" iconClassName="w-32 h-32 md:w-48 md:h-48" textClassName="text-5xl md:text-7xl" tagline={true} />
          </motion.div>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4, duration: 0.8 }}
            className="mt-12 text-lg md:text-xl text-white/60 max-w-2xl font-light"
          >
            A holding tech operada por IA. Transformando informação em decisão com poder silencioso, precisão geométrica e inteligência escalável.
          </motion.p>
        </div>
      </section>

      {/* Logo Variations */}
      <section className="py-24 px-6 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <Layers className="w-6 h-6 text-[#06B6D4]" />
            <h2 className="text-3xl font-bold tracking-tight">Logo Variations</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="bg-[#0A0F1E] p-12 rounded-3xl border border-white/10 flex flex-col items-center justify-center min-h-[300px] relative group">
              <div className="absolute top-6 left-6 text-xs font-mono text-white/40 uppercase tracking-widest">Primary Dark</div>
              <Logo variant="horizontal" iconClassName="w-12 h-12" textClassName="text-4xl" />
            </div>
            <div className="bg-white p-12 rounded-3xl border border-black/10 flex flex-col items-center justify-center min-h-[300px] relative group">
              <div className="absolute top-6 left-6 text-xs font-mono text-black/40 uppercase tracking-widest">Primary Light</div>
              <Logo theme="light" variant="horizontal" iconClassName="w-12 h-12" textClassName="text-4xl" />
            </div>
            <div className="bg-[#0A0F1E] p-12 rounded-3xl border border-white/10 flex flex-col items-center justify-center min-h-[400px] relative group">
              <div className="absolute top-6 left-6 text-xs font-mono text-white/40 uppercase tracking-widest">Stacked Dark</div>
              <Logo variant="stacked" iconClassName="w-24 h-24" textClassName="text-5xl" />
            </div>
            <div className="grid grid-rows-2 gap-8">
              <div className="bg-[#2563EB] p-12 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative group">
                <div className="absolute top-6 left-6 text-xs font-mono text-white/60 uppercase tracking-widest">Mono White</div>
                <Logo theme="mono-white" variant="horizontal" iconClassName="w-10 h-10" textClassName="text-3xl" />
              </div>
              <div className="bg-white p-12 rounded-3xl border border-black/10 flex flex-col items-center justify-center relative group">
                <div className="absolute top-6 left-6 text-xs font-mono text-black/40 uppercase tracking-widest">Mono Dark</div>
                <Logo theme="mono-dark" variant="horizontal" iconClassName="w-10 h-10" textClassName="text-3xl" />
              </div>
            </div>
            <div className="bg-[#0A0F1E] p-12 rounded-3xl border border-white/10 flex flex-col items-center justify-center relative group md:col-span-2">
              <div className="absolute top-6 left-6 text-xs font-mono text-white/40 uppercase tracking-widest">Ecosystem & Icon</div>
              <div className="flex flex-wrap justify-center gap-16 items-center w-full mt-8">
                <Logo variant="icon" iconClassName="w-20 h-20" />
                <div className="h-20 w-px bg-white/10 hidden md:block" />
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
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <Palette className="w-6 h-6 text-[#06B6D4]" />
            <h2 className="text-3xl font-bold tracking-tight">Color Palette</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ColorCard name="Professional Blue" hex="#2563EB" rgb="37, 99, 235" cmyk="84, 58, 0, 8" className="bg-[#2563EB]" />
            <ColorCard name="Sober Cyan" hex="#06B6D4" rgb="6, 182, 212" cmyk="97, 14, 0, 17" className="bg-[#06B6D4]" />
            <ColorCard name="Dark Navy" hex="#0A0F1E" rgb="10, 15, 30" cmyk="67, 50, 0, 88" className="bg-[#0A0F1E]" />
          </div>
        </div>
      </section>

      {/* Typography */}
      <section className="py-24 px-6 border-t border-white/5 bg-black/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center gap-3 mb-12">
            <Type className="w-6 h-6 text-[#06B6D4]" />
            <h2 className="text-3xl font-bold tracking-tight">Typography</h2>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16">
            <div>
              <div className="flex items-baseline justify-between border-b border-white/10 pb-4 mb-8">
                <h3 className="text-4xl font-bold">Inter</h3>
                <span className="text-white/50 font-mono text-sm">Primary Typeface</span>
              </div>
              <div className="space-y-8">
                <div>
                  <div className="text-sm text-white/50 mb-2 font-mono">Bold (700) - Logotype & Headers</div>
                  <div className="text-5xl font-bold tracking-tight">Aa Bb Cc Dd Ee</div>
                </div>
                <div>
                  <div className="text-sm text-white/50 mb-2 font-mono">Medium (500) - Subtitles</div>
                  <div className="text-4xl font-medium tracking-tight">Aa Bb Cc Dd Ee</div>
                </div>
                <div>
                  <div className="text-sm text-white/50 mb-2 font-mono">Regular (400) - Body</div>
                  <div className="text-3xl font-normal tracking-tight">Aa Bb Cc Dd Ee</div>
                </div>
              </div>
            </div>
            <div className="bg-[#0A0F1E] p-10 rounded-3xl border border-white/10">
              <div className="text-sm text-white/50 mb-6 font-mono">Usage Example</div>
              <h1 className="text-4xl font-bold tracking-tight mb-4">Transformando Informação em Decisão</h1>
              <p className="text-lg text-white/70 leading-relaxed mb-6">
                A DIGIAI é uma holding tech operada por IA que constrói e escala ecossistemas digitais verticais com inteligência aplicada.
              </p>
              <div className="flex items-center gap-4">
                <button className="bg-[#2563EB] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#1D4ED8] transition-colors">Primary Action</button>
                <button className="bg-white/5 text-white px-6 py-3 rounded-lg font-medium hover:bg-white/10 transition-colors">Secondary</button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Downloads */}
      <section className="py-24 px-6 border-t border-white/5">
        <div className="max-w-7xl mx-auto text-center">
          <h2 className="text-3xl font-bold tracking-tight mb-6">Brand Assets</h2>
          <p className="text-white/60 max-w-2xl mx-auto mb-12">
            Download the official DIGIAI logo pack, including SVG vectors, high-resolution PNGs, and favicons for all your product needs.
          </p>
          <button
            onClick={() => alert("In a real environment, this would trigger a ZIP download containing all SVG and PNG assets.")}
            className="inline-flex items-center gap-3 bg-white text-[#0A0F1E] px-8 py-4 rounded-full font-bold text-lg hover:scale-105 transition-transform"
          >
            <Download className="w-5 h-5" />
            Download Full Logo Pack
          </button>
        </div>
      </section>
    </div>
  );
}
