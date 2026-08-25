import { useEffect, useState } from 'react';
import { ExternalLink, RefreshCw, Info, Radio, DollarSign, Send, Target, CalendarClock } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { TravasBanner } from './TravasMarketing';
import { supabase } from '../lib/supabase';
import { clearixSupabase } from '../lib/clearixSupabase';
import { espelhoMotores, type EspelhoLimelight, type EspelhoPulso } from '../lib/espelhoMotores';

// Cadeia de resultados (v_marketing_cadeia + espelhos + uso vivo Clearix).
// Decisão do dono 2026-08-25: tudo que fazemos tem que aparecer LIGADO — produzir →
// alcançar → captar → prospectar → vender → provar. Elo sem data fresca é elo quebrado.
type Cadeia = {
  posts_7d: number; ultima_publicacao: string | null;
  seguidores: number; ultimo_censo: string | null;
  leads_30d: number; ultimo_lead: string | null;
  disparos_30d: number; ultimo_disparo: string | null;
  vendas_30d: number; receita_30d_brl: number; ultima_venda: string | null;
};

interface FatoMkt {
  brand_slug: string | null;
  chave: string;
  fato: string;
  fonte: string;
  verificado_em: string;
  valido_ate: string;
  fresco: boolean;
  publico: boolean;
}

// Espelho READ-ONLY do DIGIAI MKT (decisão do dono, 2026-07-12): a produção de
// conteúdo (ideias → roteiro → arte → agenda → publicação) mora no app MKT
// (mkt.digiai.app.br, schema mkt). O digiai é o cérebro: vê, não opera.

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

/** Nulo vira travessao, nao "R$ 0,00" — ausencia de dado e diferente de zero. */
function brl(v: number | null | undefined): string {
  if (v == null) return '—';
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

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
  const [limelight, setLimelight] = useState<EspelhoLimelight | null>(null);
  const [pulso, setPulso] = useState<EspelhoPulso | null>(null);
  const [fatos, setFatos] = useState<FatoMkt[]>([]);
  const [cadeia, setCadeia] = useState<Cadeia | null>(null);
  const [usoVivoTx, setUsoVivoTx] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const [{ data: e }, { data: m }, { data: p }, ll, pu, { data: f }, { data: cad }, vida] = await Promise.all([
      supabase.from('v_mkt_espelho').select('*').maybeSingle(),
      supabase.from('v_mkt_marcas').select('*'),
      supabase.from('v_mkt_publicacoes_recentes').select('*'),
      espelhoMotores.limelight(),
      espelhoMotores.pulso(),
      supabase.from('v_mkt_fatos').select('*'),
      supabase.from('v_marketing_cadeia').select('*').maybeSingle(),
      clearixSupabase.from('v_admin_tenant_vida').select('transacoes_30d').then((r) => r, () => ({ data: null })),
    ]);
    setCadeia((cad ?? null) as Cadeia | null);
    const rows = (vida as { data: { transacoes_30d: number }[] | null }).data;
    setUsoVivoTx(rows ? rows.reduce((s, t) => s + (t.transacoes_30d || 0), 0) : null);
    if (e) setEsp(e as Espelho);
    setMarcas(((m ?? []) as Marca[]).sort((a, b) => b.publicadas_7d - a.publicadas_7d || b.publicacoes - a.publicacoes));
    setPubs((p ?? []) as Publicacao[]);
    setLimelight(ll);
    setPulso(pu);
    setFatos((f ?? []) as FatoMkt[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const diasDesde = (d: string | null | undefined) =>
    d ? Math.floor((Date.now() - new Date(d + 'T12:00:00').getTime()) / 86400000) : null;
  const pulsoUltimaPubDias = diasDesde(pulso?.ultima_publicacao);

  return (
    <div className="max-w-7xl mx-auto p-8">
      <PageHeader
        eyebrow="Distribuição & conteúdo"
        title="Marketing"
        subtitle="Espelho do motor DIGIAI MKT — marcas, pipeline e publicações, somente leitura."
        actions={
          <div className="flex items-center gap-2">
            <a
              href="https://mkt.digiai.app.br"
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
            {/* Cadeia de resultados — o funil real, cada elo com carimbo de frescor */}
            {cadeia && (() => {
              const diasDe = (iso: string | null) => iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;
              const carimbo = (iso: string | null, limite: number) => {
                const d = diasDe(iso);
                if (d === null) return { txt: 'nunca', ruim: true };
                return { txt: d === 0 ? 'hoje' : `há ${d}d`, ruim: d > limite };
              };
              const elos: { rotulo: string; valor: string; sub: string; stamp: { txt: string; ruim: boolean }; zero?: boolean }[] = [
                { rotulo: 'produzir', valor: String(cadeia.posts_7d), sub: 'posts 7d (MKT)', stamp: carimbo(cadeia.ultima_publicacao, 2) },
                { rotulo: 'alcançar', valor: (cadeia.seguidores + (pulso?.views_total ?? 0)).toLocaleString('pt-BR'), sub: `${cadeia.seguidores.toLocaleString('pt-BR')} seg + ${(pulso?.views_total ?? 0).toLocaleString('pt-BR')} views Pulso`, stamp: carimbo(cadeia.ultimo_censo ? cadeia.ultimo_censo + 'T12:00:00' : null, 2) },
                { rotulo: 'captar', valor: String(cadeia.leads_30d), sub: 'leads 30d', stamp: carimbo(cadeia.ultimo_lead, 14), zero: cadeia.leads_30d === 0 },
                { rotulo: 'prospectar', valor: String(cadeia.disparos_30d), sub: 'disparos OSI 30d', stamp: carimbo(cadeia.ultimo_disparo, 7), zero: cadeia.disparos_30d === 0 },
                { rotulo: 'vender', valor: cadeia.vendas_30d > 0 ? `${cadeia.vendas_30d} · ${brl(cadeia.receita_30d_brl)}` : '0', sub: 'vendas 30d', stamp: carimbo(cadeia.ultima_venda, 30), zero: cadeia.vendas_30d === 0 },
                { rotulo: 'provar', valor: usoVivoTx != null ? usoVivoTx.toLocaleString('pt-BR') : '—', sub: 'transações 30d no Clearix · só nosso', stamp: usoVivoTx != null ? { txt: 'vivo', ruim: false } : { txt: 'sem leitura', ruim: true } },
              ];
              return (
                <div className="border border-outline/15 bg-surface-container">
                  <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2 flex-wrap">
                    <Target className="w-3.5 h-3.5 text-secondary" />
                    <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Cadeia de resultados</span>
                    <span className="ml-auto font-mono text-[10px] text-muted">elo sem data fresca é elo quebrado</span>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 divide-x divide-outline/10">
                    {elos.map((e2, i) => (
                      <div key={e2.rotulo} className="p-4 relative">
                        {i > 0 && <span className="hidden lg:block absolute -left-1.5 top-1/2 -translate-y-1/2 text-muted text-xs">→</span>}
                        <div className="font-mono text-[9px] uppercase tracking-widest text-muted mb-1">{e2.rotulo}</div>
                        <div className={'text-xl font-semibold font-mono tabular-nums ' + (e2.zero ? 'text-danger' : 'text-on-surface')}>{e2.valor}</div>
                        <div className="text-[10px] text-muted mt-0.5">{e2.sub}</div>
                        <div className={'font-mono text-[9px] uppercase tracking-wider mt-1 ' + (e2.stamp.ruim ? 'text-danger' : 'text-secondary')}>{e2.stamp.txt}</div>
                      </div>
                    ))}
                  </div>
                  <div className="px-4 py-2 border-t border-outline/10 font-mono text-[10px] text-muted flex flex-wrap gap-x-4 gap-y-1">
                    <span>motores: MKT{limelight ? ` · Limelight (${limelight.publicacoes} pubs)` : ''}{pulso ? ` · Pulso (${pulso.publicacoes} pubs)` : ''}</span>
                    <span className="ml-auto">Clearix = prova interna; pra fora, só o agregado dos fatos (trava por marca)</span>
                  </div>
                </div>
              );
            })()}

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

        {/* Outros motores de conteúdo — espelhos vivos dos bancos próprios (2026-07-30) */}
        <div className="border border-outline/15 bg-surface-container">
          <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2">
            <Radio className="w-3.5 h-3.5 text-secondary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Outros motores de conteúdo</span>
            <span className="ml-auto font-mono text-[10px] text-muted">fonte: v_espelho_* (bancos Limelight e Pulso)</span>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline/10">
            <div className="bg-surface-container p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 shrink-0" style={{ background: 'var(--color-eco-app)' }} />
                <span className="text-sm font-semibold text-on-surface">Limelight Studio · Mello</span>
                <span className="ml-auto font-mono text-[10px] text-muted">série "Transforme Sua Visão"</span>
              </div>
              {limelight ? (
                <>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><div className="text-lg font-bold tabular-nums text-on-surface">{limelight.episodios}</div><div className="text-[10px] font-mono uppercase text-muted">episódios</div></div>
                    <div><div className="text-lg font-bold tabular-nums text-on-surface">{limelight.publicacoes}</div><div className="text-[10px] font-mono uppercase text-muted">publicações</div></div>
                    <div><div className="text-lg font-bold tabular-nums text-on-surface">{limelight.fila}</div><div className="text-[10px] font-mono uppercase text-muted">na fila</div></div>
                    <div><div className="text-lg font-bold tabular-nums text-on-surface">${limelight.custo_ia_usd}</div><div className="text-[10px] font-mono uppercase text-muted">custo IA</div></div>
                  </div>
                  <div className="text-[11px] text-muted">
                    Seguidores: {Object.entries(limelight.seguidores).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
                    {' · '}coleta {limelight.ultima_coleta === new Date().toISOString().slice(0, 10) ? <span className="text-success">hoje ✓</span> : limelight.ultima_coleta ?? '—'}
                  </div>
                </>
              ) : <div className="text-sm text-muted italic">Espelho indisponível.</div>}
            </div>
            <div className="bg-surface-container p-4 space-y-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 shrink-0" style={{ background: 'var(--color-eco-pulso)' }} />
                <span className="text-sm font-semibold text-on-surface">Pulso Control · canais faceless</span>
                <span className="ml-auto font-mono text-[10px] text-muted">{pulso?.canais ?? '—'} canais</span>
              </div>
              {pulso ? (
                <>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    <div><div className="text-lg font-bold tabular-nums text-on-surface">{pulso.publicacoes}</div><div className="text-[10px] font-mono uppercase text-muted">publicações</div></div>
                    <div><div className="text-lg font-bold tabular-nums text-on-surface">{(pulso.views_total / 1000).toFixed(0)}k</div><div className="text-[10px] font-mono uppercase text-muted">views</div></div>
                    <div><div className="text-lg font-bold tabular-nums text-on-surface">{(pulso.pipeline['PRONTO_PUBLICACAO'] ?? 0) + (pulso.pipeline['EM_EDICAO'] ?? 0) + (pulso.pipeline['ROTEIRO_PRONTO'] ?? 0)}</div><div className="text-[10px] font-mono uppercase text-muted">no pipeline</div></div>
                    <div><div className="text-lg font-bold tabular-nums text-on-surface">{pulso.ideias}</div><div className="text-[10px] font-mono uppercase text-muted">ideias</div></div>
                  </div>
                  <div className="text-[11px] text-muted">
                    Views: {Object.entries(pulso.views_por_plataforma).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${(v / 1000).toFixed(0)}k`).join(' · ')}
                  </div>
                  <div className="text-[11px] text-muted">
                    {pulsoUltimaPubDias != null && pulsoUltimaPubDias <= 2
                      ? <span className="text-success">esteira automática viva — última publicação {pulsoUltimaPubDias === 0 ? 'hoje ✓' : `há ${pulsoUltimaPubDias}d`}</span>
                      : <span className="text-warning">última publicação {pulso.ultima_publicacao ?? '—'}</span>}
                    {' · '}coleta diária 11h (Vercel Crons)
                  </div>

                  {/* Financeiro do Pulso. Caixa e consumo aparecem SEPARADOS e nunca
                      somados: o topup e dinheiro saindo, o consumo e uso do credito ja
                      comprado. Somar os dois da R$ 9.873 e infla o burn em ~3,8x — o
                      mesmo erro que este painel ja cometeu com o aporte intelectual. */}
                  {pulso.custo_caixa_total_brl != null && (
                    <div className="border-t border-outline pt-2 mt-1 space-y-1">
                      <div className="grid grid-cols-3 gap-2">
                        <div>
                          <div className="text-sm font-bold tabular-nums text-on-surface">{brl(pulso.custo_caixa_total_brl)}</div>
                          <div className="text-[10px] font-mono uppercase text-muted leading-tight">custo de caixa<br /><span className="text-[9px]">dinheiro que saiu</span></div>
                        </div>
                        <div>
                          <div className="text-sm font-bold tabular-nums text-on-surface-variant">{brl(pulso.custo_consumo_total_brl)}</div>
                          <div className="text-[10px] font-mono uppercase text-muted leading-tight">crédito consumido<br /><span className="text-[9px]">gerencial, não é despesa</span></div>
                        </div>
                        <div>
                          <div className="text-sm font-bold tabular-nums text-on-surface">{brl(pulso.custo_caixa_por_video_brl)}</div>
                          <div className="text-[10px] font-mono uppercase text-muted leading-tight">por vídeo<br /><span className="text-[9px]">caixa ÷ publicações</span></div>
                        </div>
                      </div>
                      <div className="text-[11px] text-muted">
                        Receita: {brl(pulso.receita_total_brl)} · recebido {brl(pulso.receita_recebida_brl)}
                        {(pulso.receita_total_brl ?? 0) === 0 && <span className="text-warning"> — nenhum gate de monetização aberto ainda</span>}
                      </div>
                      <div className="text-[10px] text-muted leading-snug">
                        Os dois custos <strong>não se somam</strong>: o crédito consumido é uso do
                        topup já pago. Somar inflaria o burn em ~3,8×.
                      </div>
                    </div>
                  )}
                </>
              ) : <div className="text-sm text-muted italic">Espelho indisponível.</div>}
            </div>
          </div>
        </div>

        {/* FATOS publicáveis — o que a IA do MKT PODE citar (fonte: mkt.fatos, com validade) */}
        <div className="border border-outline/15 bg-surface-container">
          <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2">
            <Target className="w-3.5 h-3.5 text-secondary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Fatos publicáveis · o que a IA pode citar</span>
            <span className="ml-auto font-mono text-[10px] text-muted">fonte: v_mkt_fatos · vencido = a IA silencia o número</span>
          </div>
          {fatos.length === 0 ? (
            <div className="p-4 text-sm text-muted italic">Nenhum fato cadastrado.</div>
          ) : (
            <div className="divide-y divide-outline/10">
              {fatos.map((f) => (
                <div key={f.chave} className="px-4 py-2.5 flex items-start gap-3">
                  <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0 mt-0.5 ${f.fresco ? 'border-success/40 text-success bg-success/10' : 'border-danger/40 text-danger bg-danger/10'}`}>
                    {f.fresco ? 'fresco' : 'vencido'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-[13px] text-on-surface leading-snug">{f.fato}</div>
                    <div className="text-[10px] font-mono text-muted mt-0.5 truncate">
                      {f.brand_slug ?? 'geral'} · verificado {f.verificado_em} · vale até {f.valido_ate} · {f.fonte}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="border border-outline/15 bg-surface-lowest p-3 flex items-start gap-2.5 text-[12px] text-on-surface-variant">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <span>
            Somente leitura — a produção, as marcas, os robôs e as travas por marca moram no{' '}
            <a href="https://mkt.digiai.app.br" target="_blank" rel="noreferrer" className="text-secondary hover:underline">DIGIAI MKT</a>{' '}
            (e os motores Limelight/Pulso nos seus próprios apps).
            Histórico da era anterior (schema <span className="font-mono">marketing</span>) permanece arquivado no banco.
          </span>
        </div>
      </div>
    </div>
  );
}
