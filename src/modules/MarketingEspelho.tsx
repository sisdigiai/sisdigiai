import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Info, Radio, DollarSign, Send, Target, CalendarClock } from 'lucide-react';
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

type Marca = {
  id: string; code: string; name: string; accent_hex: string | null; logo_url: string | null;
  cadencia: { canais?: string[]; horario?: string; qtd_por_dia?: number; dias_semana?: number[] } | null;
  norte: { objetivo?: string; cta_principal?: string; pilares?: string[] } | null;
  regras_atualizadas: string | null;
  ideias: number; roteiros: number; assets: number; assets_aprovados: number;
  publicacoes: number; publicadas_7d: number; ultima_publicacao: string | null;
  plataformas: string[] | null;
};

type Publicacao = {
  id: string; platform: string | null; url: string | null;
  published_at: string | null; brand_name: string | null; accent_hex: string | null;
};

const DIAS = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

function relativo(iso: string | null): string {
  if (!iso) return 'nunca';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'agora há pouco';
  if (h < 24) return `há ${h}h`;
  const d = Math.floor(h / 24);
  return `há ${d}d`;
}

export default function MarketingEspelho() {
  const [esp, setEsp] = useState<Espelho | null>(null);
  const [marcas, setMarcas] = useState<Marca[]>([]);
  const [pubs, setPubs] = useState<Publicacao[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: e }, { data: m }, { data: p }] = await Promise.all([
      supabase.from('v_mkt_espelho').select('*').maybeSingle(),
      supabase.from('v_mkt_marcas').select('*'),
      supabase.from('v_mkt_publicacoes_recentes').select('*'),
    ]);
    if (e) setEsp(e as Espelho);
    setMarcas(((m ?? []) as Marca[]).sort((a, b) => b.publicadas_7d - a.publicadas_7d || b.publicacoes - a.publicacoes));
    setPubs((p ?? []) as Publicacao[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <PageHeader
        eyebrow="Distribuição & conteúdo"
        title="Marketing"
        subtitle="Espelho do motor DIGIAI MKT — marcas, pipeline e publicações, somente leitura."
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

      <div className="space-y-6">
        <TravasBanner />

        {loading ? (
          <div className="text-sm text-muted py-6">Carregando espelho…</div>
        ) : (
          <>
            {/* Placar do motor */}
            {esp && (
              <div className="border border-outline/15 bg-surface-container">
                <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2 flex-wrap">
                  <Radio className="w-3.5 h-3.5 text-secondary" />
                  <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Motor no ar</span>
                  <span className="ml-auto font-mono text-[10px] text-muted">
                    fila aberta {esp.fila_aberta} · última publicação {relativo(esp.ultima_publicacao)}
                  </span>
                </div>
                <div className="grid grid-cols-3 md:grid-cols-6 divide-x divide-outline/10">
                  {[
                    { label: 'Ideias', v: esp.ideias },
                    { label: 'Roteiros', v: esp.roteiros },
                    { label: 'Artes', v: esp.assets },
                    { label: 'Publicações', v: esp.publicacoes },
                    { label: 'Últimos 7d', v: esp.publicadas_7d, destaque: true },
                    { label: 'IA no mês', v: esp.custo_ia_usd_mes != null ? `$${esp.custo_ia_usd_mes}` : '—', icon: true },
                  ].map((k) => (
                    <div key={k.label} className="p-4 text-center">
                      <div className="font-mono text-[9px] uppercase tracking-widest text-muted flex items-center justify-center gap-1">
                        {k.icon && <DollarSign className="w-3 h-3" />}{k.label}
                      </div>
                      <div className={`font-serif text-2xl font-semibold tabular-nums mt-1 ${k.destaque ? 'text-success' : 'text-on-surface'}`}>{k.v}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Cards por marca */}
            <div>
              <div className="flex items-center gap-3 mb-4">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Marcas operadas ({marcas.length})</span>
                <span className="h-px flex-1 bg-outline/15" />
              </div>
              <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
                {marcas.map((m) => {
                  const cor = m.accent_hex || 'var(--color-secondary)';
                  const cad = m.cadencia;
                  const diasStr = cad?.dias_semana?.length
                    ? (cad.dias_semana.length >= 6 ? 'seg–sáb' : cad.dias_semana.map((d) => DIAS[d] ?? d).join('/'))
                    : null;
                  const ativa7d = m.publicadas_7d > 0;
                  return (
                    <div key={m.id} className="relative border border-outline/15 bg-surface-container p-5 pt-6">
                      {/* brackets — gramática Geometric Precision */}
                      <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: cor }} />
                      <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-outline/40" />

                      {/* identidade */}
                      <div className="flex items-start gap-3">
                        <div className="w-12 h-12 flex items-center justify-center overflow-hidden shrink-0 font-mono font-bold text-sm" style={{ background: `color-mix(in srgb, ${cor} 18%, transparent)`, color: cor }}>
                          {m.logo_url
                            ? <img src={m.logo_url} alt="" className="w-12 h-12 object-cover" />
                            : m.name.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-serif text-lg font-semibold text-on-surface leading-tight truncate">{m.name}</div>
                          {m.norte?.objetivo && <div className="text-[11px] text-muted leading-snug line-clamp-2 mt-0.5">{m.norte.objetivo}</div>}
                        </div>
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0 ${ativa7d ? 'text-success border-success/40 bg-success/10' : 'text-muted border-outline/20'}`}>
                          {ativa7d ? `${m.publicadas_7d} em 7d` : 'sem post 7d'}
                        </span>
                      </div>

                      {/* pipeline da marca */}
                      <div className="mt-4 grid grid-cols-4 divide-x divide-outline/10 border border-outline/10 bg-surface-lowest">
                        {[
                          { label: 'ideias', v: m.ideias },
                          { label: 'roteiros', v: m.roteiros },
                          { label: 'artes', v: m.assets },
                          { label: 'no ar', v: m.publicacoes },
                        ].map((k) => (
                          <div key={k.label} className="py-2 text-center">
                            <div className="font-serif text-base font-semibold tabular-nums text-on-surface">{k.v}</div>
                            <div className="font-mono text-[8px] uppercase tracking-widest text-muted">{k.label}</div>
                          </div>
                        ))}
                      </div>

                      {/* cadência + norte */}
                      <div className="mt-3 space-y-1.5">
                        {cad && (
                          <div className="flex items-center gap-1.5 font-mono text-[10px] text-on-surface-variant">
                            <CalendarClock className="w-3 h-3 text-muted shrink-0" />
                            {cad.qtd_por_dia ?? '—'}/dia · {cad.horario ?? '—'}{diasStr ? ` · ${diasStr}` : ''}
                          </div>
                        )}
                        {m.norte?.cta_principal && (
                          <div className="flex items-start gap-1.5 text-[10px] text-muted">
                            <Target className="w-3 h-3 shrink-0 mt-px" />
                            <span className="truncate">{m.norte.cta_principal}</span>
                          </div>
                        )}
                      </div>

                      {/* plataformas + última publicação */}
                      <div className="mt-3 pt-3 border-t border-outline/10 flex items-center gap-1.5 flex-wrap">
                        {(m.plataformas ?? []).map((p) => (
                          <span key={p} className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-surface-high text-on-surface-variant">{p}</span>
                        ))}
                        {(m.plataformas ?? []).length === 0 && <span className="font-mono text-[9px] text-muted">nenhuma publicação ainda</span>}
                        <span className="ml-auto font-mono text-[9px] text-muted">{relativo(m.ultima_publicacao)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline/10">
                  {pubs.map((p) => (
                    <div key={p.id} className="bg-surface-container flex items-center gap-3 px-4 py-2">
                      <span className="w-2.5 h-2.5 shrink-0" style={{ background: p.accent_hex || 'var(--color-muted)' }} />
                      <span className="text-sm text-on-surface truncate flex-1">{p.brand_name || '—'}</span>
                      <span className="font-mono text-[10px] uppercase text-muted shrink-0">{p.platform || '—'}</span>
                      <span className="font-mono text-[10px] text-muted shrink-0">{p.published_at ? new Date(p.published_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}</span>
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

        <div className="border border-outline/15 bg-surface-lowest p-3 flex items-start gap-2.5 text-[12px] text-on-surface-variant">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <span>
            Somente leitura — a produção, as marcas, os robôs e as travas por marca moram no{' '}
            <a href="https://digiaimkt.netlify.app" target="_blank" rel="noreferrer" className="text-secondary hover:underline">DIGIAI MKT</a>.
            Histórico da era anterior (schema <span className="font-mono">marketing</span>) permanece arquivado no banco.
          </span>
        </div>
      </div>
    </div>
  );
}
