import { useEffect, useRef, useState } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { ModuleId } from '../components/Sidebar';
import { initEcosystemMesh, initReveal, type EcoMeshNode } from '../lib/dhMesh';

// Telemetria estática v1 — retrato manual do portfólio (2026-07).
// Próxima iteração liga aos stores (financeiro, funil, marketing, clearix).

interface Marca extends EcoMeshNode {
  tierLabel: string;
  descricao: string;
  metricas: { label: string; valor: string; destaque?: boolean }[];
  modulo?: ModuleId;
  url?: string;
}

const MARCAS: Marca[] = [
  {
    id: 'clearix', label: 'Clearix', colorVar: '--color-eco-clearix', foco: true, tierLabel: 'Produto-âncora',
    descricao: 'ERP/CRM B2B para óticas. Prioridade máxima da casa: 1 tenant piloto vivo, planos publicados no Mercado Pago e régua de cobrança ativa.',
    metricas: [
      { label: 'MRR piloto', valor: 'R$ 198,50', destaque: true },
      { label: 'Planos MP', valor: '3 tabela + 3 piloto' },
      { label: 'Próximo marco', valor: '3 tenants pagantes' },
    ],
    modulo: 'clearix',
  },
  {
    id: 'osi', label: 'OSI', colorVar: '--color-eco-osi', foco: true, tierLabel: 'Em lançamento',
    descricao: 'Ótica Sem Improviso — curso low-ticket da Academy. Setup 100% pronto; fase atual é VENDER: chamar óticas no WhatsApp.',
    metricas: [
      { label: 'Checkout', valor: 'R$ 48,50 · 2 canais', destaque: true },
      { label: 'Fase', valor: 'VENDER' },
      { label: 'Funil', valor: 'módulo Funil OSI' },
    ],
    modulo: 'funil',
  },
  {
    id: 'pulso', label: 'Pulso', colorVar: '--color-eco-pulso', foco: true, tierLabel: 'Publicando',
    descricao: 'Frente editorial de conteúdo. SO editorial completo rodando em 4 redes, alimentando audiência para o resto do portfólio.',
    metricas: [
      { label: 'Views 30d', valor: '~25 mil', destaque: true },
      { label: 'Redes', valor: '4 ativas' },
      { label: 'Cadência', valor: 'SO editorial' },
    ],
    modulo: 'marketing',
  },
  {
    id: 'academy', label: 'Academy', colorVar: '--color-eco-academy', foco: false, tierLabel: 'No ar',
    descricao: 'Educação low-ticket da DIGIAI. O OSI é o primeiro produto; a esteira de cursos vem na sequência.',
    metricas: [
      { label: '1º produto', valor: 'OSI (no ar)' },
      { label: 'Telemetria', valor: 'a ligar' },
    ],
    modulo: 'academy',
  },
  {
    id: 'nexus', label: 'Nexus', colorVar: '--color-eco-nexus', foco: false, tierLabel: 'No ar',
    descricao: 'Frente de gestão educacional. App no ar com banco e auth próprios (ADR-0029).',
    metricas: [{ label: 'Telemetria', valor: 'a ligar' }],
    url: 'https://sisnexus.netlify.app',
  },
  {
    id: 'nipo', label: 'Nipo', colorVar: '--color-eco-nipo', foco: false, tierLabel: 'No ar',
    descricao: 'Nipo School — ensino musical. App no ar; frente sem foco comercial neste ciclo.',
    metricas: [{ label: 'Telemetria', valor: 'a ligar' }],
    url: 'https://niposchool.vercel.app',
  },
  {
    id: 'qualafoto', label: 'Qual a Foto', colorVar: '--color-eco-qualafoto', foco: false, tierLabel: 'No ar',
    descricao: 'Jogo/dinâmica de fotos. No ar, aguardando ciclo de tração.',
    metricas: [{ label: 'Telemetria', valor: 'a ligar' }],
    url: 'https://qualfoto.netlify.app',
  },
  {
    id: 'app', label: 'App', colorVar: '--color-eco-app', foco: false, tierLabel: 'Infra interna',
    descricao: 'Este painel. Infraestrutura interna da holding — não é produto de mercado neste estágio.',
    metricas: [{ label: 'Módulos', valor: '30+' }],
    modulo: 'visao',
  },
  {
    id: 'lumina', label: 'Lumina', colorVar: '--color-eco-lumina', foco: false, tierLabel: 'No ar',
    descricao: 'Frente Lumina. App no ar com identidade própria em construção.',
    metricas: [{ label: 'Telemetria', valor: 'a ligar' }],
    url: 'https://luminabox.netlify.app',
  },
  {
    id: 'polapetit', label: 'Polapetit', colorVar: '--color-eco-polapetit', foco: false, tierLabel: 'No ar',
    descricao: 'Festas infantis. App no ar; frente sem foco comercial neste ciclo.',
    metricas: [{ label: 'Telemetria', valor: 'a ligar' }],
    url: 'https://polapetit.netlify.app',
  },
];

interface Props { onNavigate?: (id: ModuleId) => void }

export default function MapaVivo({ onNavigate }: Props) {
  const [selecionada, setSelecionada] = useState<Marca>(MARCAS[0]);
  const selRef = useRef(MARCAS[0].id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    return initEcosystemMesh(
      canvasRef.current,
      MARCAS,
      (id) => {
        const m = MARCAS.find(x => x.id === id);
        if (m) { selRef.current = m.id; setSelecionada(m); }
      },
      () => selRef.current,
    );
  }, []);
  useEffect(() => (rootRef.current ? initReveal(rootRef.current) : undefined), []);

  const foco = MARCAS.filter(m => m.foco);

  return (
    <div ref={rootRef} className="min-h-full flex flex-col">
      {/* Palco — malha viva em tela cheia com HUD */}
      <div className="relative flex-1 min-h-[560px] bg-surface-lowest overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full" aria-label="Mapa vivo do ecossistema DIGIAI — clique numa marca" />

        {/* Kicker */}
        <div className="absolute top-6 left-6 pointer-events-none">
          <div className="text-[10px] font-mono uppercase tracking-[0.25em] text-secondary mb-1.5">Ecossistema · constelação</div>
          <h2 className="font-serif text-2xl font-semibold tracking-tight text-on-surface">Mapa Vivo</h2>
        </div>

        {/* Contadores discretos */}
        <div className="absolute top-6 right-6 flex gap-6 pointer-events-none text-right">
          <div>
            <div className="font-serif text-2xl font-semibold text-on-surface leading-none">10</div>
            <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-muted">no ar</div>
          </div>
          <div>
            <div className="font-serif text-2xl font-semibold text-on-surface leading-none">3</div>
            <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-muted">com tração</div>
          </div>
          <div>
            <div className="font-serif text-2xl font-semibold text-on-surface leading-none">2<span className="text-muted text-base">/8</span></div>
            <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-muted">fase</div>
          </div>
        </div>

        {/* Painel HUD da marca selecionada */}
        <div key={selecionada.id} className="absolute right-6 bottom-6 w-[340px] max-w-[calc(100%-3rem)] border border-outline/30 bg-surface/85 backdrop-blur-md">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 shrink-0" style={{ background: `var(${selecionada.colorVar})` }} />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant">{selecionada.label} · {selecionada.tierLabel}</span>
            </div>
            <p className="font-serif text-base leading-relaxed text-on-surface mb-4">{selecionada.descricao}</p>
            <div className="mb-4">
              {selecionada.metricas.map(mt => (
                <div key={mt.label} className="flex items-baseline justify-between gap-4 border-t border-outline/15 py-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{mt.label}</span>
                  <span className={`text-sm text-right ${mt.destaque ? 'text-success font-medium' : 'text-on-surface'}`}>{mt.valor}</span>
                </div>
              ))}
            </div>
            {selecionada.modulo && (
              <button
                onClick={() => onNavigate?.(selecionada.modulo!)}
                className="w-full flex items-center justify-center gap-2 bg-action text-on-action px-4 py-2.5 text-sm font-medium hover:bg-action-hover transition-colors"
              >
                Abrir no painel <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {!selecionada.modulo && selecionada.url && (
              <a
                href={selecionada.url} target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-outline/30 text-on-surface px-4 py-2.5 text-sm font-medium hover:border-action/50 transition-colors"
              >
                Abrir app externo <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Legenda */}
        <div className="absolute left-6 bottom-6 pointer-events-none text-[10px] font-mono text-muted leading-relaxed">
          linha sage = frente com tração · nó apagado = no ar, sem foco<br />arraste o mouse pra orbitar · clique numa marca
        </div>
      </div>

      {/* Frentes com tração */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-outline/10 border-t border-outline/10">
        {foco.map(m => (
          <button
            key={m.id}
            onClick={() => { selRef.current = m.id; setSelecionada(m); }}
            className={`p-4 text-left transition-colors hover:bg-surface-low ${selecionada.id === m.id ? 'bg-surface-low' : 'bg-surface'}`}
            data-reveal
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 shrink-0" style={{ background: `var(${m.colorVar})` }} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">{m.label}</span>
            </div>
            <div className="text-sm text-on-surface">{m.metricas[0].label}: <span className="text-success">{m.metricas[0].valor}</span></div>
          </button>
        ))}
      </div>

      <div className="px-6 py-3 text-[10px] font-mono text-muted border-t border-outline/10">
        Telemetria estática v1 (retrato manual 2026-07) · próxima iteração liga aos stores do painel
      </div>
    </div>
  );
}
