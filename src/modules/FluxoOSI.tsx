import { useEffect, useState } from 'react';
import { BookOpen, Flame, Megaphone, Boxes, ArrowRight, CheckCircle2, Circle, AlertCircle, Rocket, MapPin, Heart } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { academyStore } from '../lib/academyStore';
import { funnelStore, calculateFunnelSummary } from '../lib/funnelStore';
import { marketingStore } from '../lib/marketingStore';
import { supabase } from '../lib/supabase';
import { fetchOsiOnboardingSummary, nexusReady, OsiOnboardingSummary } from '../lib/nexusClient';
import { TravasBanner } from './TravasMarketing';
import type { ModuleId } from '../components/Sidebar';

const brl = (v: number | null | undefined) =>
  v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

interface Stage {
  produto: { nome: string; preco: number | null; status: string } | null;
  funil: { ticket: number; roas: number } | null;
  mkt: { posts: number; ideias: number; afiliados: number } | null;
}

type Fase0Status = 'done' | 'partial' | 'pending';
interface Fase0Item {
  key: string;
  label: string;
  status: Fase0Status;
  detail?: string;
}

interface GeoRow {
  city: string;
  state: string;
  community_count: number;
  affiliate_count: number;
  testimonial_count: number;
  total: number;
}

export default function FluxoOSI({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  const [s, setS] = useState<Stage>({ produto: null, funil: null, mkt: null });
  const [fase0, setFase0] = useState<Fase0Item[]>([]);
  const [geo, setGeo] = useState<GeoRow[]>([]);
  const [nexus, setNexus] = useState<{ data: OsiOnboardingSummary | null; error: string | null } | null>(null);

  useEffect(() => {
    // Funil é local (síncrono)
    try {
      const ws = funnelStore.getWorkspace();
      const sum = calculateFunnelSummary(ws);
      setS(prev => ({ ...prev, funil: { ticket: sum.averageOrderValue, roas: sum.projectedRoas } }));
    } catch { /* mantém null */ }

    academyStore.getWorkspace()
      .then(w => setS(prev => ({ ...prev, produto: { nome: w.product.product_name, preco: w.product.price_brl ?? null, status: w.product.status } })))
      .catch(() => {});

    Promise.all([marketingStore.listCalendar(), marketingStore.listIdeas(), marketingStore.listAffiliates()])
      .then(([cal, ideias, afi]) => setS(prev => ({ ...prev, mkt: { posts: cal.length, ideias: ideias.length, afiliados: afi.length } })))
      .catch(() => {});

    // FASE 0 — bloqueadores humanos do lançamento OSI 01/06 (plano-de-largada FASE 0)
    (async () => {
      const items: Fase0Item[] = [];

      // 1. Contas sociais primárias OSI (IG + TT)
      try {
        const { data: socials } = await supabase
          .from('v_company_digital_assets')
          .select('categoria, status, rotulo')
          .in('categoria', ['instagram', 'tiktok'])
          .ilike('rotulo', '%OSI%');
        const active = (socials ?? []).filter(x => x.status === 'ativo');
        items.push({
          key: 'social',
          label: 'Contas sociais primárias OSI (Instagram + TikTok)',
          status: active.length >= 2 ? 'done' : active.length === 1 ? 'partial' : 'pending',
          detail: `${active.length}/2 ativas — ${active.map(a => a.categoria).join(', ') || 'nenhuma criada'}`,
        });
      } catch {
        items.push({ key: 'social', label: 'Contas sociais primárias OSI (Instagram + TikTok)', status: 'pending', detail: '(erro ao consultar digital_assets)' });
      }

      // 2. 5 peças de estreia 01-05/06 (sem fonte estrutural; manual)
      items.push({
        key: 'estreia',
        label: '5 peças de estreia (01-05/06)',
        status: 'pending',
        detail: 'Roteiros + capturas. Marcar com tag "estreia" no calendário quando entrar.',
      });

      // 3. Pixel Meta + TikTok (manual; sem fonte estrutural ainda)
      items.push({
        key: 'pixel',
        label: 'Pixel Meta + TikTok instalados na landing OSI',
        status: 'pending',
        detail: 'Sem retargeting, R$50/dia queima cego. Confirmar inspecionando o HTML da landing.',
      });

      // 4. Preço reconciliado (plano-mestre §13: pendência aberta 47,90 vs 48,50)
      // Doc canônico (plano-mestre §7): R$ 47,90 / Hotmart real (digital_assets): R$ 48,50
      try {
        const w = await academyStore.getWorkspace();
        const appPrice = w.product.price_brl ?? null;
        const docPrice = 47.9;
        items.push({
          key: 'preco',
          label: 'Preço reconciliado (plano-mestre vs Hotmart vs app)',
          status: appPrice === docPrice ? 'done' : 'pending',
          detail: `Doc: R$ 47,90 · App: ${appPrice ? `R$ ${appPrice.toFixed(2)}` : '—'} · Hotmart: R$ 48,50 (§13 pendência)`,
        });
      } catch {
        items.push({ key: 'preco', label: 'Preço reconciliado (plano-mestre vs Hotmart vs app)', status: 'pending' });
      }

      // 5. Capa Hotmart (manual)
      items.push({
        key: 'capa',
        label: 'Capa Hotmart atualizada (brand OSI)',
        status: 'pending',
        detail: 'Trocar capa do listing pra padrão visual atual.',
      });

      // 6. 1ª prova social antes de recrutar afiliados (plano-mestre §12 passo 10)
      try {
        const stats = await marketingStore.getHotmartStats();
        const sales = stats?.unique_buyers ?? 0;
        items.push({
          key: 'afiliados',
          label: '1ª prova social registrada (destrava recrutamento de afiliados)',
          status: sales > 0 ? 'done' : 'pending',
          detail: `${sales} comprador(es) Hotmart únicos · plano-mestre §12 passo 10.`,
        });
      } catch {
        items.push({ key: 'afiliados', label: '1ª prova social registrada (destrava recrutamento de afiliados)', status: 'pending' });
      }

      setFase0(items);
    })();

    // Cidade-foco "efeito caracol" (plano-mestre §1)
    (async () => {
      try {
        const { data } = await supabase
          .from('v_marketing_geo_funnel')
          .select('city, state, community_count, affiliate_count, testimonial_count, total')
          .limit(10);
        setGeo((data ?? []) as GeoRow[]);
      } catch { /* silencioso */ }
    })();

    // M4.2 — Nexus 90 dias (cross-DB read)
    (async () => {
      const result = await fetchOsiOnboardingSummary();
      setNexus(result);
    })();
  }, []);

  const Card = ({ icon, etapa, titulo, children }: { icon: React.ReactNode; etapa: string; titulo: string; children: React.ReactNode }) => (
    <div className="flex-1 min-w-[200px] border border-outline/10 bg-surface-low p-5">
      <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest text-muted mb-2">
        {icon} {etapa}
      </div>
      <div className="font-bold text-base mb-3">{titulo}</div>
      <div className="space-y-1.5 text-sm">{children}</div>
    </div>
  );

  const Metric = ({ label, value }: { label: string; value: string }) => (
    <div className="flex justify-between gap-2">
      <span className="text-muted">{label}</span>
      <span className="text-on-surface font-medium text-right">{value}</span>
    </div>
  );

  const Arrow = () => (
    <div className="flex items-center justify-center text-muted py-2 md:py-0">
      <ArrowRight className="w-5 h-5 hidden md:block" />
      <ArrowRight className="w-5 h-5 md:hidden rotate-90" />
    </div>
  );

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <PageHeader
        eyebrow="Espinha do ecossistema"
        title="Mapa OSI"
        subtitle={
          <>
            A espinha que conecta os três módulos em torno da Ótica Sem Improviso:
            <b className="text-on-surface-variant"> produto</b> (Academy) → <b className="text-on-surface-variant">captação</b> (Funil) →
            <b className="text-on-surface-variant"> distribuição</b> (Marketing) → <b className="text-secondary">Clearix</b>.
          </>
        }
      />
      <div className="space-y-6">
      <TravasBanner />

      {/* FASE 0 — bloqueadores humanos do lançamento OSI 01/06 */}
      {fase0.length > 0 && (() => {
        const done = fase0.filter(i => i.status === 'done').length;
        const total = fase0.length;
        return (
          <div className="border border-outline/10 bg-surface-low p-5 space-y-3">
            <div className="flex items-center gap-2">
              <Rocket className="w-4 h-4 text-amber-300" />
              <span className="text-xs font-mono uppercase tracking-widest text-muted">FASE 0 · Lançamento OSI 01/06</span>
              <span className="ml-auto text-[11px] text-on-surface-variant font-mono tabular-nums">{done}/{total} prontos</span>
            </div>
            <div className="text-xs text-muted">
              Bloqueadores humanos do plano-de-largada — itens ❌ trancam o lançamento, 🟡 dependem de validação manual.
            </div>
            <ul className="space-y-2">
              {fase0.map(i => {
                const Icon = i.status === 'done' ? CheckCircle2 : i.status === 'partial' ? AlertCircle : Circle;
                const colorClass = i.status === 'done' ? 'text-emerald-400' : i.status === 'partial' ? 'text-amber-300' : 'text-muted';
                return (
                  <li key={i.key} className="flex items-start gap-2 text-sm">
                    <Icon className={`w-4 h-4 shrink-0 mt-0.5 ${colorClass}`} />
                    <div className="min-w-0">
                      <div className="text-on-surface">{i.label}</div>
                      {i.detail && <div className="text-[11px] text-muted mt-0.5">{i.detail}</div>}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })()}

      {/* M4.7 — Cidade-foco "efeito caracol" (plano-mestre §1) */}
      {geo.length > 0 && (() => {
        const totalAll = geo.reduce((acc, g) => acc + g.total, 0);
        const suzano = geo.find(g => g.city.toLowerCase() === 'suzano' && g.state === 'SP');
        return (
          <div className="border border-outline/10 bg-surface-low p-5 space-y-3">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-secondary" />
              <span className="text-xs font-mono uppercase tracking-widest text-muted">Cidade-foco · efeito caracol</span>
              <span className="ml-auto text-[11px] text-on-surface-variant font-mono tabular-nums">{totalAll} pessoas · {geo.length} cidades</span>
            </div>
            <div className="text-xs text-muted">
              Suzano → região → BR → mundo (plano-mestre §1). Cold-start prefere densidade local antes de dispersar tráfego.
            </div>
            {suzano ? (
              <div className="bg-secondary-container/20 border border-secondary/30 px-3 py-2 text-xs text-on-surface-variant">
                <b className="text-secondary">Suzano-SP em foco:</b> {suzano.total} pessoas
                ({suzano.community_count} comunidade · {suzano.affiliate_count} afiliados · {suzano.testimonial_count} depoimentos)
              </div>
            ) : (
              <div className="bg-amber-500/[0.08] border border-amber-500/20 px-3 py-2 text-xs text-on-surface-variant">
                <b className="text-amber-200">Suzano-SP ainda sem registros.</b> Cold-start começa aqui — comunicar localmente antes de escalar mídia paga.
              </div>
            )}
            <ul className="space-y-1">
              {geo.slice(0, 10).map((g, i) => {
                const isSuzano = g.city.toLowerCase() === 'suzano' && g.state === 'SP';
                return (
                  <li key={`${g.city}-${g.state}`} className={`flex items-center justify-between text-xs ${isSuzano ? 'text-secondary font-semibold' : 'text-on-surface-variant'}`}>
                    <span className="truncate">
                      <span className="text-muted font-mono mr-2">#{i + 1}</span>
                      {g.city} <span className="text-muted">/ {g.state}</span>
                    </span>
                    <span className="font-mono tabular-nums shrink-0 ml-2">
                      {g.total} <span className="text-muted">({g.community_count}/{g.affiliate_count}/{g.testimonial_count})</span>
                    </span>
                  </li>
                );
              })}
            </ul>
            <div className="text-[10px] text-muted font-mono">total (comunidade/afiliados/depoimentos)</div>
          </div>
        );
      })()}

      {/* M4.2 — Entrega Nexus 90 dias (cross-DB read, anon key) */}
      {nexus && (
        <div className="border border-outline/10 bg-surface-low p-5 space-y-3">
          <div className="flex items-center gap-2">
            <Heart className="w-4 h-4 text-secondary" />
            <span className="text-xs font-mono uppercase tracking-widest text-muted">Nexus · ativação 90 dias</span>
            {nexus.data && (
              <span className="ml-auto text-[11px] text-on-surface-variant font-mono tabular-nums">
                {nexus.data.total_buyers} compradores
              </span>
            )}
          </div>
          {!nexusReady ? (
            <div className="text-xs text-amber-200 leading-relaxed">
              <b>VITE_NEXUS_SUPABASE_URL / VITE_NEXUS_SUPABASE_ANON_KEY ausentes no .env.</b> Adicione pra ativar leitura cross-DB do banco Nexus.
            </div>
          ) : nexus.error === 'view_not_created_in_nexus' ? (
            <div className="text-xs text-on-surface-variant leading-relaxed space-y-1.5">
              <div className="text-amber-200"><b>View <code className="font-mono">v_osi_onboarding_summary</code> ainda não existe no Nexus.</b></div>
              <div>Credencial cross-DB OK (anon key configurada e respondendo). Falta criar a view no repo Nexus com este formato:</div>
              <pre className="font-mono text-[10px] bg-surface-lowest p-2 overflow-x-auto whitespace-pre">{`CREATE VIEW public.v_osi_onboarding_summary AS
SELECT
  COUNT(*) FILTER (WHERE compra_origem='osi') AS total_buyers,
  COUNT(*) FILTER (WHERE ultimo_login_at > now() - interval '7 days') AS active_last_7d,
  COUNT(*) FILTER (WHERE ultimo_login_at > now() - interval '30 days') AS active_last_30d,
  COUNT(*) FILTER (WHERE progresso_pct >= 50) AS with_progress_50_plus,
  COUNT(*) FILTER (WHERE certificado_emitido) AS certificates_issued,
  AVG(progresso_pct) AS avg_progress_pct
FROM learning.osi_buyers_progress;
GRANT SELECT ON public.v_osi_onboarding_summary TO anon, authenticated;`}</pre>
              <div className="text-muted">arquitetura-de-venda-e-entrega §38-46 / §88-107 · plano-mestre §11 (fundo de funil).</div>
            </div>
          ) : nexus.error ? (
            <div className="text-xs text-red-300">Erro inesperado: {nexus.error}</div>
          ) : nexus.data ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              <Metric label="Compradores OSI" value={String(nexus.data.total_buyers)} />
              <Metric label="Ativos últimos 7d" value={String(nexus.data.active_last_7d)} />
              <Metric label="Ativos últimos 30d" value={String(nexus.data.active_last_30d)} />
              <Metric label="≥ 50% progresso" value={String(nexus.data.with_progress_50_plus)} />
              <Metric label="Certificados" value={String(nexus.data.certificates_issued)} />
              <Metric label="Progresso médio" value={nexus.data.avg_progress_pct != null ? `${nexus.data.avg_progress_pct.toFixed(0)}%` : '—'} />
            </div>
          ) : (
            <div className="text-xs text-muted">Carregando...</div>
          )}
        </div>
      )}

      <div className="flex flex-col md:flex-row gap-3 items-stretch">
        <Card icon={<BookOpen className="w-3.5 h-3.5" />} etapa="Produto · Academy" titulo={s.produto?.nome || '…'}>
          <Metric label="Preço" value={brl(s.produto?.preco)} />
          <Metric label="Status" value={s.produto?.status || '—'} />
          <button onClick={() => onNavigate?.('academy')} className="text-[11px] text-secondary hover:text-secondary pt-1 transition-colors">Abrir Academy →</button>
        </Card>

        <Arrow />

        <Card icon={<Flame className="w-3.5 h-3.5" />} etapa="Captação · Funil OSI" titulo="Isca paga + esteira">
          <Metric label="Ticket médio" value={s.funil ? brl(s.funil.ticket) : '…'} />
          <Metric label="ROAS microteste" value={s.funil ? s.funil.roas.toFixed(2) : '…'} />
          <button onClick={() => onNavigate?.('funil')} className="text-[11px] text-secondary hover:text-secondary pt-1 transition-colors">Abrir Funil OSI →</button>
        </Card>

        <Arrow />

        <Card icon={<Megaphone className="w-3.5 h-3.5" />} etapa="Distribuição · Marketing" titulo="Calendário + afiliados">
          <Metric label="Posts no calendário" value={s.mkt ? String(s.mkt.posts) : '…'} />
          <Metric label="Ideias no banco" value={s.mkt ? String(s.mkt.ideias) : '…'} />
          <Metric label="Afiliados" value={s.mkt ? String(s.mkt.afiliados) : '…'} />
          <button onClick={() => onNavigate?.('marketing')} className="text-[11px] text-secondary hover:text-secondary pt-1 transition-colors">Abrir Marketing →</button>
        </Card>
      </div>

      <button onClick={() => onNavigate?.('clearix')} className="w-full text-left border border-secondary/40 bg-secondary-container/40 hover:bg-secondary-container/60 p-5 flex items-center gap-3 transition-colors">
        <Boxes className="w-5 h-5 text-secondary shrink-0" />
        <div className="text-sm text-on-surface-variant">
          <b className="text-on-surface">Destino: Clearix.</b> Academy/OSI são funil de entrada do ecossistema (decisão 17/04) —
          conteúdo e venda devem <b className="text-on-surface">abrir ponte sutil</b> pro Clearix, nunca empurrar.
          Clearix é sobremesa (plano-mestre §5). <span className="text-secondary">Abrir Central Clearix →</span>
        </div>
      </button>

      <div className="text-[11px] text-muted border-t border-outline/10 pt-4">
        Fonte viva: <span className="font-mono">academy.products</span> + funil (workspace local) +
        <span className="font-mono"> marketing.content_calendar/ideas/affiliates</span>. Esta é a visão consolidada;
        a edição continua em cada módulo.
      </div>
      </div>
    </div>
  );
}
