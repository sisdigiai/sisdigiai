import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowRight, ExternalLink } from 'lucide-react';
import type { ModuleId } from '../components/Sidebar';
import { initEcosystemMesh, initReveal, type EcoMeshNode } from '../lib/dhMesh';
import { PRODUTOS, TIER_LABEL_CURTO, DEGRAU_LABEL, type ProdutoInfo } from './Portfolio';
import { roadmapStore } from '../lib/roadmapStore';
import { useAppsEstado, urlsDaFicha, type AppEstado } from '../lib/appsEstado';

// Os nós são os produtos do Portfólio (identidade); o estado de cada um vem de v_ops_apps_estado
// (mesma leitura do Placar e da Lista Mestra). Sem ficha no banco = sem estado, e o mapa diz isso.

interface Marca extends EcoMeshNode {
  produto: ProdutoInfo;
  estado?: AppEstado;
  modulo?: ModuleId;
}

// Frente com tração = uso real pra cima (degrau ≥ 3, medido ou declarado com fonte) ou alavanca de lançamento
function temTracao(p: ProdutoInfo, e?: AppEstado): boolean {
  return (e?.degrau ?? 0) >= 3 || p.tier === 'alavanca';
}

// Onde abre dentro do painel (senão, abre o app externo pela URL do Portfólio)
const MODULO_INTERNO: Partial<Record<string, ModuleId>> = {
  'clearix': 'clearix',
  'osi': 'fluxo-osi',
  'digiai-mkt': 'marketing',
  'digiai-app': 'visao',
};


interface Props { onNavigate?: (id: ModuleId) => void }

export default function MapaVivo({ onNavigate }: Props) {
  const { porSlug, carregando } = useAppsEstado();
  const MARCAS: Marca[] = useMemo(() => PRODUTOS.map((p) => {
    const e = p.ficha ? porSlug.get(p.ficha) : undefined;
    return {
      id: p.slug,
      label: p.nome,
      colorVar: p.cor.replace(/^var\(/, '').replace(/\)$/, ''),
      foco: temTracao(p, e),
      produto: p,
      estado: e,
      modulo: MODULO_INTERNO[p.slug],
    };
  }), [porSlug]);
  const [selId, setSelId] = useState<string>(PRODUTOS[0].slug);
  const selecionada = MARCAS.find(m => m.id === selId) ?? MARCAS[0];
  const setSelecionada = (m: Marca) => setSelId(m.id);
  const [faseAtual, setFaseAtual] = useState<number | null>(null);
  const selRef = useRef(MARCAS[0].id);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!canvasRef.current || carregando) return;
    return initEcosystemMesh(
      canvasRef.current,
      MARCAS,
      (id) => {
        const m = MARCAS.find(x => x.id === id);
        if (m) { selRef.current = m.id; setSelecionada(m); }
      },
      () => selRef.current,
    );
  }, [MARCAS, carregando]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => (rootRef.current ? initReveal(rootRef.current) : undefined), []);
  useEffect(() => {
    roadmapStore.listPhases().then((ps) => {
      const atual = ps.find((f) => !f.completed_at && f.started_at);
      if (atual) setFaseAtual(atual.phase_number);
    });
  }, []);

  const foco = MARCAS.filter(m => m.foco);
  const noAr = MARCAS.filter(m => (m.estado?.degrau ?? 0) >= 2).length;
  const sel = selecionada.produto;
  const selE = selecionada.estado;
  const selUrl = selE ? urlsDaFicha(selE.urls).find(u => !/github\.com/.test(u.url))?.url : undefined;

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

        {/* Contadores vivos (mesma fonte do Placar) */}
        <div className="absolute top-6 right-6 flex gap-6 pointer-events-none text-right">
          <div>
            <div className="font-serif text-2xl font-semibold text-on-surface leading-none">{noAr}<span className="text-muted text-base">/{PRODUTOS.length}</span></div>
            <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-muted">no ar</div>
          </div>
          <div>
            <div className="font-serif text-2xl font-semibold text-on-surface leading-none">{foco.length}</div>
            <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-muted">com tração</div>
          </div>
          <div>
            <div className="font-serif text-2xl font-semibold text-on-surface leading-none">{faseAtual ?? '—'}<span className="text-muted text-base">/8</span></div>
            <div className="mt-1 text-[9px] font-mono uppercase tracking-[0.18em] text-muted">fase</div>
          </div>
        </div>

        {/* Painel HUD da marca selecionada */}
        <div key={selecionada.id} className="absolute right-6 bottom-6 w-[340px] max-w-[calc(100%-3rem)] border border-outline/30 bg-surface/85 backdrop-blur-md">
          <div className="p-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="w-2.5 h-2.5 shrink-0" style={{ background: sel.cor }} />
              <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-on-surface-variant">{sel.nome} · {TIER_LABEL_CURTO[sel.tier]}</span>
            </div>
            <p className="font-serif text-base leading-relaxed text-on-surface mb-4">{selE?.tagline ?? (selE === undefined && !carregando ? 'Não declarado — sem ficha no banco.' : '')}</p>
            {selE && (
              <div className="mb-4">
                <div className="flex items-baseline justify-between gap-4 border-t border-outline/15 py-2">
                  <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Degrau</span>
                  <span className="text-sm text-right text-on-surface">{selE.degrau} · {DEGRAU_LABEL[selE.degrau]}</span>
                </div>
                <div className="border-t border-outline/15 py-2 text-[11px] text-muted">{selE.degrau_por}</div>
                {selE.funcao && (
                  <div className="border-t border-outline/15 py-2">
                    <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Função hoje</span>
                    <p className="text-[12px] text-on-surface leading-snug mt-1 line-clamp-3">{selE.funcao}</p>
                  </div>
                )}
              </div>
            )}
            {selecionada.modulo && (
              <button
                onClick={() => onNavigate?.(selecionada.modulo!)}
                className="w-full flex items-center justify-center gap-2 bg-action text-on-action px-4 py-2.5 text-sm font-medium hover:bg-action-hover transition-colors"
              >
                Abrir no painel <ArrowRight className="w-4 h-4" />
              </button>
            )}
            {!selecionada.modulo && selUrl && (
              <a
                href={selUrl} target="_blank" rel="noreferrer"
                className="w-full flex items-center justify-center gap-2 border border-outline/30 text-on-surface px-4 py-2.5 text-sm font-medium hover:border-action/50 transition-colors"
              >
                Abrir app externo <ExternalLink className="w-4 h-4" />
              </a>
            )}
          </div>
        </div>

        {/* Legenda */}
        <div className="absolute left-6 bottom-6 pointer-events-none text-[10px] font-mono text-muted leading-relaxed">
          linha sage = frente com tração (uso real / alavanca) · nó apagado = sem tração ainda<br />arraste o mouse pra orbitar · clique numa marca
        </div>
      </div>

      {/* Frentes com tração */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-outline/10 border-t border-outline/10">
        {foco.map(m => (
          <button
            key={m.id}
            onClick={() => { selRef.current = m.id; setSelecionada(m); }}
            className={`p-4 text-left transition-colors hover:bg-surface-low ${selecionada.id === m.id ? 'bg-surface-low' : 'bg-surface'}`}
            data-reveal
          >
            <div className="flex items-center gap-2 mb-1.5">
              <span className="w-2 h-2 shrink-0" style={{ background: m.produto.cor }} />
              <span className="text-[10px] font-mono uppercase tracking-widest text-on-surface-variant">{m.produto.nome}</span>
            </div>
            <div className="text-sm text-on-surface">{m.estado ? <>{DEGRAU_LABEL[m.estado.degrau]} <span className="text-muted">· degrau {m.estado.degrau}</span></> : <span className="text-muted">não declarado</span>}</div>
          </button>
        ))}
      </div>

      <div className="px-6 py-3 text-[10px] font-mono text-muted border-t border-outline/10">
        Fonte viva: v_ops_apps_estado (fichas + medição de deploy e repo; mesma leitura do Placar e da Lista Mestra) + fase atual do Roadmap
      </div>
    </div>
  );
}
