import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Info, Radio, DollarSign, Layers, Send } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { TravasBanner } from './TravasMarketing';
import { supabase } from '../lib/supabase';

// Espelho READ-ONLY do DIGIAI MKT (decisão do dono, 2026-07-12): a produção de
// conteúdo (ideias → roteiro → arte → agenda → publicação) mora no app MKT
// (digiaimkt.netlify.app, schema mkt). O digiai é o cérebro: vê, não opera.

type Espelho = {
  ideias: number; roteiros: number; assets: number; publicacoes: number;
  publicadas_7d: number; ultima_publicacao: string | null; marcas: number;
  custo_ia_usd_mes: number | null; fila_aberta: number;
};

type Publicacao = {
  id: string; platform: string | null; url: string | null;
  published_at: string | null; brand_name: string | null; accent_hex: string | null;
};

export default function MarketingEspelho() {
  const [esp, setEsp] = useState<Espelho | null>(null);
  const [pubs, setPubs] = useState<Publicacao[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: e }, { data: p }] = await Promise.all([
      supabase.from('v_mkt_espelho').select('*').maybeSingle(),
      supabase.from('v_mkt_publicacoes_recentes').select('*'),
    ]);
    if (e) setEsp(e as Espelho);
    setPubs((p ?? []) as Publicacao[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const kpis = esp ? [
    { label: 'Ideias', valor: esp.ideias, icon: <Layers className="w-4 h-4" /> },
    { label: 'Roteiros', valor: esp.roteiros, icon: <Layers className="w-4 h-4" /> },
    { label: 'Artes / assets', valor: esp.assets, icon: <Layers className="w-4 h-4" /> },
    { label: 'Publicações', valor: esp.publicacoes, icon: <Send className="w-4 h-4" /> },
    { label: 'Últimos 7 dias', valor: esp.publicadas_7d, icon: <Radio className="w-4 h-4" /> },
    { label: 'Custo IA (mês)', valor: esp.custo_ia_usd_mes != null ? `$${esp.custo_ia_usd_mes}` : '—', icon: <DollarSign className="w-4 h-4" /> },
  ] : [];

  return (
    <div className="max-w-7xl mx-auto p-8">
      <PageHeader
        eyebrow="Distribuição & conteúdo"
        title="Marketing"
        subtitle="Espelho do motor DIGIAI MKT — pipeline, publicações e custo, somente leitura."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="https://digiaimkt.netlify.app"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-2 text-sm bg-secondary-container text-on-secondary-container border border-secondary/40 hover:bg-secondary-container/70 transition-colors flex items-center gap-2"
            >
              <ExternalLink size={14} /> Abrir DIGIAI MKT
            </a>
            <button onClick={load} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Recarregar">
              <RefreshCw size={16} />
            </button>
          </div>
        }
      />

      <div className="space-y-5">
        <TravasBanner />

        <div className="border border-outline/15 bg-surface-lowest p-3 flex items-start gap-2.5 text-[12px] text-on-surface-variant">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <span>
            A produção (ideias → roteiro → arte → agenda → publicação), as marcas, os robôs e as travas por marca moram no{' '}
            <a href="https://digiaimkt.netlify.app" target="_blank" rel="noreferrer" className="text-secondary hover:underline">DIGIAI MKT</a>.
            Este módulo lê o schema <span className="font-mono">mkt</span> ao vivo — o digiai vê, não opera.
          </span>
        </div>

        {loading ? (
          <div className="text-sm text-muted py-6">Carregando espelho…</div>
        ) : (
          <>
            {/* Pipeline em números */}
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
              {kpis.map((k) => (
                <div key={k.label} className="border border-outline/15 bg-surface-container p-4">
                  <div className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-widest text-muted">{k.icon}{k.label}</div>
                  <div className="font-serif text-2xl font-semibold tabular-nums text-on-surface mt-1">{k.valor}</div>
                </div>
              ))}
            </div>

            {esp && (
              <div className="flex flex-wrap items-center gap-4 font-mono text-[11px] text-muted">
                <span>{esp.marcas} marca(s) operadas</span>
                <span>· fila aberta: {esp.fila_aberta}</span>
                {esp.ultima_publicacao && <span>· última publicação {new Date(esp.ultima_publicacao).toLocaleString('pt-BR')}</span>}
              </div>
            )}

            {/* Publicações recentes */}
            <div className="border border-outline/15 bg-surface-container">
              <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2">
                <Send className="w-3.5 h-3.5 text-secondary" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Publicações recentes</span>
                <span className="ml-auto font-mono text-[10px] text-muted">fonte: v_mkt_publicacoes_recentes</span>
              </div>
              {pubs.length === 0 ? (
                <div className="p-4 text-sm text-muted italic">Nenhuma publicação registrada ainda.</div>
              ) : (
                <div className="divide-y divide-outline/10">
                  {pubs.map((p) => (
                    <div key={p.id} className="flex items-center gap-3 px-4 py-2">
                      <span className="w-2.5 h-2.5 shrink-0" style={{ background: p.accent_hex || 'var(--color-muted)' }} />
                      <span className="text-sm text-on-surface truncate flex-1">{p.brand_name || '—'}</span>
                      <span className="font-mono text-[10px] uppercase text-muted shrink-0">{p.platform || '—'}</span>
                      <span className="font-mono text-[10px] text-muted shrink-0">{p.published_at ? new Date(p.published_at).toLocaleString('pt-BR') : '—'}</span>
                      {p.url && (
                        <a href={p.url} target="_blank" rel="noreferrer" className="text-secondary shrink-0" title="Abrir publicação">
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        <div className="text-[11px] text-muted">
          Histórico da era anterior (schema <span className="font-mono">marketing</span>: calendário/ideias/redes até jun/2026) permanece no banco como arquivo — a produção viva é 100% MKT.
        </div>
      </div>
    </div>
  );
}
