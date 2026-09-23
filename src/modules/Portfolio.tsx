import { useState, type ReactNode } from 'react';
import { ExternalLink, X, AlertTriangle, ArrowRight, FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { useAppsEstado, haQuanto, urlsDaFicha, type AppEstado } from '../lib/appsEstado';

// Passo 5 do contrato do estado automático (docs/contrato-estado-automatico-dos-apps-2026-09-16.md).
// Aqui mora só a IDENTIDADE de cada produto (nome, marca, hierarquia canônica, slug do Backlog).
// O ESTADO — degrau, no ar, próximo passo, bloqueio, maturidade — vem de public.v_ops_apps_estado:
// medido pela máquina ou declarado na ficha do agente do app, sempre com data. Nada de estado neste arquivo.

export type Tier = 'ancora' | 'alavanca' | 'suporte' | 'incubacao' | 'autonomo' | 'institucional' | 'infra';

export type ProdutoInfo = {
  slug: string;          // product_id no Backlog (ops.backlog_items)
  ficha?: string;        // slug em ops.apps (Cockpit/Apps/<app>/ficha.md); sem ficha = não declarado
  nome: string; tier: Tier; cor: string; mono: string; logo?: string; badge: boolean;
};

const P = (slug: string, ficha: string | undefined, nome: string, tier: Tier, mono: string, cor: string, logo?: string, badge = false): ProdutoInfo =>
  ({ slug, ficha, nome, tier, mono, cor, logo, badge });

export const PRODUTOS: ProdutoInfo[] = [
  P('clearix', 'clearix_eco_full', 'Clearix', 'ancora', 'CX', 'var(--color-eco-clearix)', '/brand/clearix.svg'),
  P('osi', 'otica_sem_improviso', 'Ótica Sem Improviso', 'alavanca', 'OSI', 'var(--color-eco-osi)', '/brand/osi.png'),
  P('osi-leitor', 'app_oticasemimproviso', 'OSI · App leitor', 'alavanca', 'OL', 'var(--color-eco-osi)', '/brand/osi.png'),
  P('nexus', 'nexus', 'Nexus', 'suporte', 'NX', 'var(--color-eco-nexus)', '/brand/nexus.svg'),
  P('limelight', 'limelight_studio', 'Limelight', 'suporte', 'LL', 'var(--color-eco-app)'),
  P('lumina', 'lumina_box', 'Lumina', 'suporte', 'LU', 'var(--color-eco-lumina)', '/brand/lumina.svg'),
  P('clearix-calc', undefined, 'Clearix Calc', 'suporte', 'CC', 'var(--color-eco-clearix)', '/brand/clearix.svg'),
  P('blogs', 'blogs', 'Ecoax · blogs regionais', 'suporte', 'EC', 'var(--color-eco-app)'),
  P('pulso', 'pulso_control', 'Pulso', 'autonomo', 'PU', 'var(--color-eco-pulso)', '/brand/pulso.png', true),
  P('polapetit', 'polapetit', 'Polapetit', 'autonomo', 'PP', 'var(--color-eco-polapetit)'),
  P('mello-eyewear', 'melloeyewear', 'Mello Eyewear', 'autonomo', 'ME', 'var(--color-eco-app)', '/brand/mello.png', true),
  P('qual-a-foto', 'qual_foto', 'Qual a Foto', 'incubacao', 'QF', 'var(--color-eco-qualafoto)', '/brand/qualfoto.png'),
  P('easy-idiomas', 'easy-idiomas', 'Easy Idiomas', 'incubacao', 'EI', 'var(--color-muted)'),
  P('nipo-school', 'nipo_school', 'Nipo School', 'incubacao', 'NP', 'var(--color-eco-nipo)', '/brand/nipo.svg', true),
  P('clearix-site', 'clearix-site', 'Clearix Site', 'institucional', 'CS', 'var(--color-eco-clearix)', '/brand/clearix.svg'),
  P('polapetit-site', 'polapetit_landing', 'Polapetit Site', 'institucional', 'PS', 'var(--color-eco-polapetit)'),
  P('digiai-site', 'digiai-site', 'DIGIAI Site', 'institucional', 'DS', 'var(--color-secondary)', '/brand/digiai.svg'),
  P('pulso-hub', 'pulso_hub', 'Pulso Hub', 'institucional', 'PH', 'var(--color-eco-pulso)', '/brand/pulso.png', true),
  P('digiai-app', 'digiai', 'DIGIAI App', 'infra', 'DA', 'var(--color-secondary)', '/brand/digiai.svg'),
  P('digiai-mkt', 'digiai_mkt', 'DIGIAI MKT', 'infra', 'MK', 'var(--color-eco-app)', '/brand/digiai.svg'),
  P('digiai-telao', 'digiai_telao', 'DIGIAI Telão', 'infra', 'TV', 'var(--color-secondary)', '/brand/digiai.svg'),
  P('gj', 'gj', 'GJ', 'infra', 'GJ', 'var(--color-muted)'),
];

export const PRODUTO_BY_SLUG: Record<string, ProdutoInfo> = Object.fromEntries(PRODUTOS.map(p => [p.slug, p]));

export const DEGRAU_LABEL: Record<number, string> = {
  1: 'Construído', 2: 'No ar', 3: 'Uso real', 4: 'Comercial', 5: 'Escala',
};

export const TIER_LABEL_CURTO: Record<Tier, string> = {
  ancora: 'Produto-âncora', alavanca: 'Alavanca crítica', suporte: 'Suporte prioritário',
  autonomo: 'Autônomo', incubacao: 'Incubação', institucional: 'Institucional', infra: 'Infra interna',
};

const TIER_LABEL: Record<Tier, string> = {
  ancora: 'Produto-âncora', alavanca: 'Alavancas críticas', suporte: 'Suporte prioritário',
  autonomo: 'Autônomos', incubacao: 'Incubação', institucional: 'Institucional', infra: 'Infraestrutura interna',
};
const TIER_ORDER: Tier[] = ['ancora', 'alavanca', 'suporte', 'autonomo', 'incubacao', 'institucional', 'infra'];

const DEGRAU_COR: Record<number, string> = {
  1: 'var(--color-muted)', 2: 'var(--color-secondary)', 3: 'var(--color-warning)', 4: 'var(--color-success)', 5: 'var(--color-success)',
};

export function Marca({ p, px = 8 }: { p: ProdutoInfo; px?: 8 | 12 }) {
  const box = px === 12 ? 'w-12 h-12' : 'w-8 h-8';
  const img = px === 12 ? 'w-7 h-7' : 'w-[18px] h-[18px]';
  return (
    <div className={`${box} flex items-center justify-center overflow-hidden font-mono text-[10px] font-bold shrink-0`}
      style={p.badge ? undefined : { background: p.cor, color: 'var(--color-on-action)' }}>
      {p.logo
        ? <img src={p.logo} alt="" className={p.badge ? `${box} object-cover` : `${img} object-contain`} style={p.badge ? undefined : { filter: 'brightness(0) invert(1)' }} />
        : p.mono}
    </div>
  );
}

function Degraus({ degrau }: { degrau: number }) {
  return (
    <span className="flex items-center gap-1" title={DEGRAU_LABEL[degrau]}>
      {[1, 2, 3, 4, 5].map(i => (
        <span key={i} className="w-1.5 h-1.5 rounded-full"
          style={i <= degrau ? { background: DEGRAU_COR[degrau] } : { border: '1px solid var(--color-muted)' }} />
      ))}
    </span>
  );
}

export default function Portfolio() {
  const { porSlug, carregando, erro } = useAppsEstado();
  const [sel, setSel] = useState<ProdutoInfo | null>(null);
  const [modo, setModo] = useState<'placar' | 'detalhe'>('placar');

  const est = (p: ProdutoInfo) => (p.ficha ? porSlug.get(p.ficha) : undefined);
  const declarados = PRODUTOS.filter(p => est(p));
  const noAr = declarados.filter(p => est(p)!.degrau >= 2).length;
  const usoReal = declarados.filter(p => est(p)!.degrau >= 3).length;
  const vencidas = declarados.filter(p => est(p)!.declaracao_vencida).length;
  const comBloqueio = declarados.filter(p => temBloqueio(est(p)!)).length;
  const ranking = [...PRODUTOS].sort((a, b) => (est(b)?.degrau ?? 0) - (est(a)?.degrau ?? 0) || TIER_ORDER.indexOf(a.tier) - TIER_ORDER.indexOf(b.tier));

  return (
    <div>
      <PageHeader
        eyebrow="Hierarquia Canônica"
        title="Portfólio de Produtos"
        subtitle={`${PRODUTOS.length} frentes · ${declarados.length} com ficha declarada · estado lido do banco, medido ou declarado com data`}
      />

      {erro && (
        <div className="border border-danger/40 bg-danger/5 p-4 mb-6 text-sm text-on-surface">
          <b>Não foi possível ler o estado dos apps</b> (<span className="font-mono text-[12px]">v_ops_apps_estado</span>): {erro}.
          A tela não mostra estado antigo no lugar.
        </div>
      )}
      {!erro && !carregando && declarados.length === 0 && (
        <div className="border border-warning/40 bg-warning/5 p-4 mb-6 text-sm text-on-surface">
          Nenhuma ficha chegou ao banco ainda. As fichas entram pelo runner local do Cockpit (<span className="font-mono text-[12px]">Cockpit/scripts/estado-runner.mjs</span>) a cada 30 min.
        </div>
      )}

      <div className="flex items-center gap-1 mb-6 border border-outline/15 w-fit p-0.5">
        {(['placar', 'detalhe'] as const).map(m => (
          <button key={m} onClick={() => setModo(m)}
            className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors ${modo === m ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}>
            {m === 'placar' ? 'Placar' : 'Detalhe'}
          </button>
        ))}
      </div>

      {modo === 'placar' && (
        <div className="mb-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'No ar (medido)', valor: `${noAr}`, sub: `de ${declarados.length}`, cor: 'text-success' },
              { label: 'Uso real (medido)', valor: `${usoReal}`, cor: 'text-warning' },
              { label: 'Ficha vencida', valor: `${vencidas}`, sub: 'reconfirmar', cor: vencidas ? 'text-danger' : 'text-on-surface' },
              { label: 'Com bloqueio', valor: `${comBloqueio}`, cor: 'text-warning' },
            ].map(k => (
              <div key={k.label} className="border border-outline/15 bg-surface-container p-4">
                <div className="font-mono text-[10px] uppercase tracking-widest text-muted">{k.label}</div>
                <div className={`font-serif text-3xl font-semibold tabular-nums mt-1 ${k.cor}`}>
                  {carregando ? '…' : k.valor}{k.sub && <span className="font-sans text-[11px] font-normal text-muted ml-1">/ {k.sub}</span>}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-4 mb-3 font-mono text-[10px] uppercase tracking-wider text-muted">
            {[1, 2, 3, 4, 5].map(d => (
              <span key={d} className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full" style={{ background: DEGRAU_COR[d] }} />{d} {DEGRAU_LABEL[d]}</span>
            ))}
            <span className="flex items-center gap-1.5"><AlertTriangle className="w-3 h-3 text-warning" />tem bloqueio</span>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {[ranking.slice(0, Math.ceil(ranking.length / 2)), ranking.slice(Math.ceil(ranking.length / 2))].map((coluna, ci) => (
              <div key={ci} className="border border-outline/15 bg-surface-container">
                {coluna.map(p => {
                  const e = est(p);
                  return (
                    <button key={p.slug} onClick={() => setSel(p)}
                      className="w-full flex items-center gap-2.5 px-3 py-2.5 border-b border-outline/10 last:border-b-0 hover:bg-surface-high transition-colors text-left">
                      <Marca p={p} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-serif text-sm font-semibold text-on-surface truncate">{p.nome}</span>
                          {e?.declaracao_vencida && <span className="font-mono text-[8px] uppercase tracking-wider text-danger border border-danger/40 px-1 shrink-0">reconfirmar</span>}
                        </div>
                        <span className="font-mono text-[9px] uppercase tracking-wider text-muted truncate block">
                          {e ? e.degrau_por : p.ficha ? 'ficha sem frontmatter · não declarado' : 'sem ficha · não declarado'}
                        </span>
                      </div>
                      {e ? <Degraus degrau={e.degrau} /> : <span className="font-mono text-[9px] text-muted">—</span>}
                      <span className="font-mono text-[11px] w-20 text-right shrink-0" style={{ color: e ? DEGRAU_COR[e.degrau] : 'var(--color-muted)' }}>
                        {e ? DEGRAU_LABEL[e.degrau] : ''}
                      </span>
                      <span className="w-4 flex justify-center shrink-0">{e && temBloqueio(e) && <AlertTriangle className="w-3.5 h-3.5 text-warning" />}</span>
                    </button>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}

      {modo === 'detalhe' && TIER_ORDER.filter(t => PRODUTOS.some(p => p.tier === t)).map(tier => (
        <div key={tier} className="mb-8">
          <div className="flex items-center gap-3 mb-4">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{TIER_LABEL[tier]}</span>
            <span className="h-px flex-1 bg-outline/15" />
          </div>
          <div className="grid gap-3" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))' }}>
            {PRODUTOS.filter(p => p.tier === tier).map(p => {
              const e = est(p);
              return (
                <button key={p.slug} onClick={() => setSel(p)}
                  className="relative text-left border border-outline/15 bg-surface-container p-5 pt-6 hover:bg-surface-high transition-colors group">
                  <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: p.cor }} />
                  <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-outline/40" />
                  <div className="flex items-start justify-between gap-3">
                    <Marca p={p} px={12} />
                    {e
                      ? <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border" style={{ color: DEGRAU_COR[e.degrau], borderColor: DEGRAU_COR[e.degrau] }}>{DEGRAU_LABEL[e.degrau]}</span>
                      : <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border border-outline/30 text-muted">não declarado</span>}
                  </div>
                  <div className="mt-4 font-serif text-xl font-semibold text-on-surface leading-tight tracking-tight">{p.nome}</div>
                  <div className="text-[12px] text-muted mt-1 leading-snug line-clamp-2 min-h-[2.5em]">{e?.tagline ?? '—'}</div>
                  {e && <div className="mt-3"><Degraus degrau={e.degrau} /><div className="font-mono text-[10px] text-muted mt-1 truncate">{e.degrau_por}</div></div>}
                  <div className="mt-3 pt-3 border-t border-outline/10 flex items-center justify-between gap-2">
                    <span className="text-[11px] text-on-surface-variant truncate">{e ? `ficha ${haQuanto(e.declarado_em)}${e.declaracao_vencida ? ' · vencida' : ''}` : 'sem estado no banco'}</span>
                    <span className="font-mono text-[9px] text-secondary opacity-0 group-hover:opacity-100 transition-opacity shrink-0 flex items-center gap-1">detalhes <ArrowRight className="w-3 h-3" /></span>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      ))}

      {sel && <Gaveta p={sel} e={est(sel)} onClose={() => setSel(null)} />}
    </div>
  );
}

function temBloqueio(e: AppEstado): boolean {
  return !!e.bloqueio && !/^nenhum\b/i.test(e.bloqueio.trim());
}

function Gaveta({ p, e, onClose }: { p: ProdutoInfo; e?: AppEstado; onClose: () => void }) {
  const urls = e ? urlsDaFicha(e.urls) : [];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative w-full max-w-md h-full bg-surface border-l border-outline/20 overflow-y-auto" onClick={ev => ev.stopPropagation()}>
        <div className="sticky top-0 bg-surface/95 backdrop-blur-md border-b border-outline/15 p-5 flex items-start gap-3">
          <Marca p={p} px={12} />
          <div className="flex-1 min-w-0">
            <div className="font-serif text-xl font-semibold text-on-surface">{p.nome}</div>
            <div className="text-[12px] text-muted mt-0.5">{e?.tagline ?? TIER_LABEL_CURTO[p.tier]}</div>
          </div>
          <button onClick={onClose} className="p-1.5 text-muted hover:text-on-surface" aria-label="Fechar"><X className="w-4 h-4" /></button>
        </div>

        {!e ? (
          <div className="p-5 text-sm text-on-surface-variant space-y-2">
            <p><b>Não declarado.</b> {p.ficha
              ? <>A ficha <span className="font-mono text-[12px]">Cockpit/Apps/{p.ficha}/ficha.md</span> ainda não tem o bloco de frontmatter que o runner lê.</>
              : 'Este produto ainda não tem ficha em Cockpit/Apps/.'}</p>
            <p className="text-muted">Sem ficha, a tela não mostra estado — nem velho, nem estimado.</p>
          </div>
        ) : (
          <div className="p-5 space-y-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border" style={{ color: DEGRAU_COR[e.degrau], borderColor: DEGRAU_COR[e.degrau] }}>{e.degrau} · {DEGRAU_LABEL[e.degrau]}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-outline/20 text-muted">{TIER_LABEL[p.tier]}</span>
              {e.maturidade && <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-outline/20 text-muted">{e.maturidade}</span>}
            </div>
            <div className="text-[12px] text-muted -mt-3">Degrau {e.degrau_por}</div>

            <Bloco titulo="Medido pela máquina">
              <Linha rot="No ar" val={e.deploy_medido_em
                ? `${e.deploy_ok ? 'respondendo' : 'NÃO respondeu'}${e.deploy_build ? ` · build ${e.deploy_build}` : ''} · ${haQuanto(e.deploy_medido_em)}`
                : 'sem medição ainda'} ruim={e.deploy_ok === false || e.deploy_sem_sinal_recente} />
              <Linha rot="Repositório" val={e.repo_medido_em
                ? `${e.repo_commit ?? '—'} · ${e.repo_push_em_dia ? 'push em dia' : 'push atrasado ou sem upstream'} · ${haQuanto(e.repo_medido_em)}`
                : 'sem medição ainda'} ruim={e.repo_push_em_dia === false} />
              <Linha rot="Uso real (30 dias)" val={`${e.eventos_30d} evento(s) de pessoa · ${e.vendas_mercado} venda(s) de mercado`} />
            </Bloco>

            <Bloco titulo={`Declarado na ficha · ${haQuanto(e.declarado_em)}${e.declaracao_vencida ? ' · VENCIDA, reconfirmar' : ''}`}>
              {e.funcao && <Linha rot="Função" val={e.funcao} />}
              {e.proximo && <Linha rot="Próximo passo" val={e.proximo} />}
              {e.bloqueio && <Linha rot="Bloqueio" val={e.bloqueio} ruim={temBloqueio(e)} />}
              <div className="flex items-center gap-1.5 text-[11px] font-mono text-muted pt-1"><FileText className="w-3 h-3" />{e.ficha_fonte} · válida até {e.declaracao_valida_ate.split('-').reverse().join('/')}</div>
            </Bloco>

            {urls.length > 0 && (
              <div>
                <div className="text-[10px] font-mono text-muted uppercase tracking-widest mb-2">Links</div>
                <div className="space-y-1.5">
                  {urls.map(u => (
                    <a key={u.url} href={u.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm font-mono text-success hover:underline">
                      {u.label} <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function Bloco({ titulo, children }: { titulo: string; children: ReactNode }) {
  return (
    <div className="border border-outline/15 bg-surface-lowest p-3 space-y-2">
      <div className="text-[10px] font-mono text-secondary uppercase tracking-widest">{titulo}</div>
      {children}
    </div>
  );
}

function Linha({ rot, val, ruim }: { rot: string; val: string; ruim?: boolean }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-muted uppercase tracking-widest">{rot}</div>
      <div className={`text-sm ${ruim ? 'text-danger' : 'text-on-surface-variant'}`}>{val}</div>
    </div>
  );
}
