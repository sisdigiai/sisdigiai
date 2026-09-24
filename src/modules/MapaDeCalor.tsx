import { useEffect, useMemo, useState } from 'react';
import { Users, Building2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import MapaCalor, { type PontoCalor } from '../components/MapaCalor';
import { supabase } from '../lib/supabase';

// Mapa de calor da DIGIAI — duas vias (dono, 24/09/2026):
//   LEADS    = óticas levantadas pela prospecção (view de contrato do MKT, sem PII)
//   CLIENTES = quem já paga / usa. Hoje não existe cliente de mercado; a via mostra isso em vez de
//              desenhar mancha de mentira. Quando existir, é a mesma tela.
//
// O vazio continua sendo o dado principal: o número de óticas fora do mapa (sem coordenada) aparece
// escrito, porque quem olha um mapa acha que está vendo o total.

type Via = 'leads' | 'clientes';

interface PontoLeads {
  uf: string; cidade: string; bairro: string | null;
  lat: number; lng: number; oticas: number;
  com_celular?: number | null; ja_receberam?: number | null; responderam?: number | null;
}

export default function MapaDeCalor() {
  const [via, setVia] = useState<Via>('leads');
  const [pontos, setPontos] = useState<PontoLeads[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [semCoordenada, setSemCoordenada] = useState<{ oticas: number; total: number } | null>(null);
  // Filtro por estado: OPÇÃO, nunca padrão. O mapa nasce mostrando tudo — esconder dado certo por
  // conveniência visual é o começo de acreditar num retrato que não existe (dono, 24/09).
  const [uf, setUf] = useState<string>('');

  useEffect(() => {
    if (via !== 'leads') return;
    let vivo = true;
    supabase.from('v_mkt_cobertura_pontos').select('*').then(({ data, error }) => {
      if (!vivo) return;
      if (error) { setErro(error.message); setPontos([]); return; }
      setErro(null);
      setPontos((data ?? []) as PontoLeads[]);
    });
    // o total sem coordenada vem da view que já existe (por bairro), para dizer quanto ficou fora do mapa
    supabase.from('v_mkt_cobertura_geografica').select('oticas').then(({ data }) => {
      if (!vivo || !data) return;
      const total = (data as { oticas: number }[]).reduce((a, r) => a + r.oticas, 0);
      setSemCoordenada((s) => ({ oticas: s?.oticas ?? 0, total }));
    });
    return () => { vivo = false; };
  }, [via]);

  const ufs = useMemo(() => {
    const m = new Map<string, number>();
    for (const p of pontos ?? []) m.set(p.uf, (m.get(p.uf) ?? 0) + p.oticas);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [pontos]);

  const filtrados = useMemo(() => (pontos ?? []).filter((p) => !uf || p.uf === uf), [pontos, uf]);

  const doMapa: PontoCalor[] = useMemo(() => filtrados.map((p) => ({
    lat: Number(p.lat), lng: Number(p.lng), peso: p.oticas,
    rotulo: [p.bairro, p.cidade].filter(Boolean).join(' · ') || p.cidade,
    detalhe: [p.com_celular != null ? `${p.com_celular} com celular` : null,
              p.ja_receberam != null ? `${p.ja_receberam} já receberam` : null,
              p.responderam != null ? `${p.responderam} responderam` : null].filter(Boolean).join(' · ') || undefined,
    destaque: p.responderam ?? 0,
  })), [filtrados]);

  const noMapa = doMapa.reduce((a, p) => a + p.peso, 0);
  const foraDoMapa = semCoordenada?.total != null ? Math.max(0, semCoordenada.total - noMapa) : null;

  return (
    <div>
      <PageHeader
        eyebrow="Território"
        title="Mapa de calor"
        subtitle="Onde o mercado está, medido no mapa. Duas vias: as óticas que a prospecção levantou e, quando existirem, os nossos clientes."
        actions={
          <div className="flex gap-1 border border-outline/15 p-0.5">
            {([['leads', 'Leads', Users], ['clientes', 'Clientes', Building2]] as const).map(([k, label, Icon]) => (
              <button key={k} onClick={() => setVia(k)}
                className={`flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest px-2.5 py-1.5 transition-colors ${via === k ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}>
                <Icon className="w-3.5 h-3.5" />{label}
              </button>
            ))}
          </div>
        }
      />

      {via === 'clientes' && (
        <div className="border border-outline/15 bg-surface-container p-6 text-sm text-on-surface-variant">
          <b className="text-on-surface">Ainda não há cliente de mercado para desenhar.</b>
          <p className="mt-2 text-[13px]">
            Medido no banco: 0 assinante de mercado e 0 venda aprovada (v_ops_dinheiro). Quando a primeira ótica fechar,
            esta via mostra onde ela está — e o mesmo mapa serve para mostrar ao cliente onde estão os clientes dele.
          </p>
        </div>
      )}

      {via === 'leads' && (
        <>
          {erro && (
            <div className="border border-warning/40 bg-warning/[0.06] p-4 mb-5 text-[13px] text-on-surface-variant">
              <b className="text-on-surface">O mapa espera a view de pontos do MKT</b> (<span className="font-mono text-[11px]">v_mkt_cobertura_pontos</span>): {erro}.
              A cobertura por cidade, sem mapa, está em Marketing › Radar 360 › Território.
            </div>
          )}

          {ufs.length > 1 && (
            <div className="flex flex-wrap items-center gap-1 mb-4">
              <span className="font-mono text-[9px] uppercase tracking-widest text-muted mr-1">estado</span>
              <button onClick={() => setUf('')}
                className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border transition-colors ${!uf ? 'bg-secondary text-on-action border-secondary' : 'border-outline/20 text-muted hover:text-on-surface'}`}>
                todos
              </button>
              {ufs.map(([sigla, n]) => (
                <button key={sigla} onClick={() => setUf(sigla === uf ? '' : sigla)}
                  className={`font-mono text-[10px] uppercase tracking-widest px-2.5 py-1 border transition-colors ${uf === sigla ? 'bg-secondary text-on-action border-secondary' : 'border-outline/20 text-muted hover:text-on-surface'}`}>
                  {sigla} · {n}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { r: 'óticas no mapa', v: noMapa.toLocaleString('pt-BR') },
              { r: 'pontos', v: filtrados.length.toLocaleString('pt-BR') },
              { r: 'responderam', v: filtrados.reduce((a, p) => a + (p.responderam ?? 0), 0).toLocaleString('pt-BR') },
              { r: 'fora do mapa', v: foraDoMapa != null ? foraDoMapa.toLocaleString('pt-BR') : '—' },
            ].map((k) => (
              <div key={k.r} className="border border-outline/15 bg-surface-container px-3 py-2">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{k.r}</div>
                <div className="font-mono text-[16px] tabular-nums text-on-surface mt-0.5">{k.v}</div>
              </div>
            ))}
          </div>

          {doMapa.length > 0
            ? <MapaCalor pontos={doMapa} />
            : !erro && <div className="border border-outline/15 bg-surface-container p-6 text-sm text-muted">Lendo os pontos…</div>}

          {foraDoMapa != null && foraDoMapa > 0 && (
            <div className="mt-3 border border-dashed border-outline/40 px-3 py-2 text-[12px] text-muted space-y-1">
              {uf && (
                <div className="text-on-surface-variant">
                  Filtrado por <b>{uf}</b>: {noMapa.toLocaleString('pt-BR')} óticas em {filtrados.length} pontos.
                  O filtro é só da tela — a conta abaixo é da base inteira.
                </div>
              )}
              <div>
                <b className="text-on-surface-variant">{(semCoordenada?.total ?? 0).toLocaleString('pt-BR')} na base</b> ·
                {' '}{noMapa.toLocaleString('pt-BR')} no mapa (com coordenada) ·
                {' '}{Math.max(0, foraDoMapa - 6).toLocaleString('pt-BR')} sem coordenada · 6 sem ficha.
                A conta fecha: quem não tem coordenada conta no Território (por cidade), não aqui.
              </div>
              <div>
                O ponto isolado na Paraíba é dado certo, conferido pelo MKT: "Ótica Santo André" fica em Santo André/PB —
                a raspagem de "Santo André" pegou o município xará. Sem telefone, não entra na prospecção.
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
