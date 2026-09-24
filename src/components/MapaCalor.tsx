import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import 'leaflet.heat';

// Mapa de calor de verdade (Leaflet + OpenStreetMap — sem chave de API e sem cobrança por carregamento).
// Genérico de propósito: recebe pontos com peso e rótulo, não sabe se são óticas da prospecção ou clientes
// nossos. A página escolhe a via; este componente só desenha (pedido do dono, 24/09: "usaremos no futuro
// para os próprios clientes").
//
// Três leituras conforme o zoom, porque a pergunta muda com a distância:
//   longe  → mancha de calor: onde está a massa
//   médio  → bolha por ponto agregado, com o número dentro: quanto tem ali
//   perto  → círculo por ponto, com o rótulo: qual é cada um
// Sem pino de endereço exato: o ponto vem arredondado da fonte (~110 m), que é a granularidade de decisão.

export interface PontoCalor {
  lat: number; lng: number; peso: number;
  rotulo: string; detalhe?: string; destaque?: number;   // destaque: nº que merece cor (ex.: respostas)
  // De onde veio a posição. Nunca some no desenho: 'medida' é a coordenada da raspagem, 'endereco' é derivada
  // de rua+número (MKT) e 'bairro' é o centro do bairro (nossa). Cada uma tem cara própria.
  precisao?: 'medida' | 'endereco' | 'bairro';
}

export const PRECISAO = {
  medida:   { rotulo: 'medida (raspagem)',        cor: 'var(--color-action)',    traco: 'solid' },
  endereco: { rotulo: 'derivada do endereço',     cor: 'var(--color-secondary)', traco: 'dotted' },
  bairro:   { rotulo: 'centro do bairro',         cor: 'var(--color-warning)',   traco: 'dashed' },
} as const;

interface Props {
  pontos: PontoCalor[];
  altura?: number;
  centro?: [number, number];
  zoom?: number;
}

const COR = { calor: 'var(--color-action)' };

export default function MapaCalor({ pontos, altura = 520, centro = [-23.55, -46.63], zoom = 9 }: Props) {
  const div = useRef<HTMLDivElement>(null);
  const mapa = useRef<L.Map | null>(null);
  const camadas = useRef<{ heat?: L.Layer; bolhas?: L.LayerGroup; pontos?: L.LayerGroup }>({});
  const enquadrar = useRef<() => void>(() => {});

  useEffect(() => {
    if (!div.current || mapa.current) return;
    const m = L.map(div.current, { center: centro, zoom, scrollWheelZoom: true, attributionControl: true });
    // OpenStreetMap padrão: a única base que não pede chave (a dark da CARTO passou a exigir — marca
    // d'água "API KEY REQUIRED" em 24/09). O escuro vem por filtro de estilo aqui na casa, não do servidor.
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
      className: 'mapa-escuro',
    }).addTo(m);
    mapa.current = m;
    // o contêiner nasce sem altura medida; sem isto o primeiro enquadramento sai errado
    setTimeout(() => { if (mapa.current === m) m.invalidateSize(); }, 0);
    return () => { m.remove(); mapa.current = null; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const m = mapa.current;
    if (!m) return;

    for (const c of Object.values(camadas.current)) if (c && m.hasLayer(c as L.Layer)) m.removeLayer(c as L.Layer);
    camadas.current = {};
    if (pontos.length === 0) return;

    const max = Math.max(...pontos.map((p) => p.peso));
    // deno-lint-ignore no-explicit-any
    const heat = (L as unknown as { heatLayer: (p: [number, number, number][], o: unknown) => L.Layer })
      .heatLayer(pontos.map((p) => [p.lat, p.lng, p.peso / max] as [number, number, number]),
        { radius: 28, blur: 22, maxZoom: 13, minOpacity: 0.35 });

    const bolhas = L.layerGroup(pontos.map((p) => {
      const r = 10 + Math.min(26, Math.sqrt(p.peso) * 5);
      const pr = PRECISAO[p.precisao ?? 'medida'];
      const exata = (p.precisao ?? 'medida') === 'medida';
      const fundo = exata
        ? `color-mix(in srgb, ${pr.cor} ${Math.round(45 + (p.peso / max) * 50)}%, var(--color-surface-lowest))`
        : 'transparent';
      return L.marker([p.lat, p.lng], {
        icon: L.divIcon({
          className: '',
          iconSize: [r * 2, r * 2],
          html: `<div style="width:${r * 2}px;height:${r * 2}px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                   background:${fundo};
                   border:1.5px ${pr.traco} ${pr.cor};
                   color:${exata ? 'var(--color-surface-lowest)' : pr.cor};
                   ${exata ? `text-shadow:0 1px 0 color-mix(in srgb, ${pr.cor} 60%, transparent);` : ''}
                   font:600 ${r > 16 ? 13 : 11}px ui-monospace,monospace">${p.peso}</div>`,
        }),
      }).bindPopup(`<b>${p.rotulo}</b><br>${p.peso} no ponto${p.detalhe ? `<br>${p.detalhe}` : ''}<br><i>posição ${pr.rotulo}</i>`);
    }));

    const finos = L.layerGroup(pontos.map((p) => {
      const pr = PRECISAO[p.precisao ?? 'medida'];
      const exata = (p.precisao ?? 'medida') === 'medida';
      return L.circleMarker([p.lat, p.lng], {
        radius: 5, weight: 1.5, dashArray: exata ? undefined : (p.precisao === 'endereco' ? '1 2' : '3 2'),
        color: pr.cor,
        fillColor: exata ? (p.destaque ? 'var(--color-success)' : pr.cor) : 'transparent',
        fillOpacity: exata ? 0.85 : 0,
      }).bindPopup(`<b>${p.rotulo}</b><br>${p.peso} aqui${p.detalhe ? `<br>${p.detalhe}` : ''}<br><i>posição ${pr.rotulo}</i>`);
    }));

    camadas.current = { heat, bolhas, pontos: finos };

    const vivo = () => mapa.current === m && !!m.getContainer()?.isConnected;
    const aplicar = () => {
      if (!vivo()) return;
      const z = m.getZoom();
      const quero = z < 11 ? 'heat' : z < 15 ? 'bolhas' : 'pontos';
      for (const [nome, camada] of Object.entries(camadas.current)) {
        if (!camada) continue;
        const tem = m.hasLayer(camada as L.Layer);
        if (nome === quero && !tem) m.addLayer(camada as L.Layer);
        if (nome !== quero && tem) m.removeLayer(camada as L.Layer);
      }
    };
    aplicar();
    m.on('zoomend', aplicar);

    const limites = L.latLngBounds(pontos.map((p) => [p.lat, p.lng] as [number, number]));
    enquadrar.current = () => { if (mapa.current !== m) return; m.invalidateSize(); m.fitBounds(limites.pad(0.15), { maxZoom: 11 }); };
    if (limites.isValid()) {
      m.invalidateSize();
      m.fitBounds(limites.pad(0.15), { maxZoom: 11 });
      setTimeout(() => { if (!vivo()) return; m.invalidateSize(); m.fitBounds(limites.pad(0.15), { maxZoom: 11 }); aplicar(); }, 60);
    }

    return () => { m.off('zoomend', aplicar); };
  }, [pontos]);

  return (
    <div className="relative border border-outline/15">
      <div ref={div} style={{ height: altura }} className="w-full" />
      <button onClick={() => enquadrar.current()}
        className="absolute top-2 right-2 z-[400] bg-surface/90 backdrop-blur-sm border border-outline/30 px-2.5 py-1.5 font-mono text-[10px] uppercase tracking-widest text-on-surface-variant hover:text-on-surface">
        ver tudo
      </button>
      <div className="absolute bottom-2 left-2 z-[400] bg-surface/90 backdrop-blur-sm border border-outline/20 px-2.5 py-1.5 font-mono text-[9px] uppercase tracking-wider text-muted">
        afaste = mancha de calor · aproxime = bolha com número · mais perto = ponto a ponto
      </div>
    </div>
  );
}
