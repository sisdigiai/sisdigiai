import { useEffect, useMemo, useState } from 'react';
import { TrendingUp, DollarSign, RefreshCw, AlertCircle, Users, Calendar, ArrowUpRight } from 'lucide-react';
import { marketingStore, type CalendarPost } from '../../lib/marketingStore';

type Stats = NonNullable<Awaited<ReturnType<typeof marketingStore.getHotmartStats>>>;
type Ranking = Awaited<ReturnType<typeof marketingStore.getValidationRanking>>;

type PostWithSales = CalendarPost & {
  sales_count: number;
  revenue_cents: number;
  commission_cents: number;
};

function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function dateBR(iso: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function Validacao() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [ranking, setRanking] = useState<Ranking>([]);
  const [topPosts, setTopPosts] = useState<PostWithSales[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = async () => {
    setLoading(true);
    const [s, r, posts] = await Promise.all([
      marketingStore.getHotmartStats(),
      marketingStore.getValidationRanking(),
      marketingStore.listCalendar(),
    ]);
    setStats(s);
    setRanking(r);

    // Cruza com vendas — busca de cada post via getPostSales (paralelo)
    const withSales = await Promise.all(
      posts.map(async (p) => {
        const sales = await marketingStore.getPostSales(p.id);
        return {
          ...p,
          sales_count: sales?.sales_count ?? 0,
          revenue_cents: sales?.revenue_cents ?? 0,
          commission_cents: sales?.commission_cents ?? 0,
        } as PostWithSales;
      })
    );
    setTopPosts(
      withSales
        .filter((p) => p.sales_count > 0)
        .sort((a, b) => b.revenue_cents - a.revenue_cents)
        .slice(0, 10)
    );
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const attributionRate = useMemo(() => {
    if (!stats || stats.sales_total === 0) return 0;
    return Math.round((stats.attributed_sales / stats.sales_total) * 100);
  }, [stats]);

  const maxRev = useMemo(
    () => Math.max(1, ...ranking.map((r) => r.revenue_cents)),
    [ranking]
  );

  return (
    <div className="p-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-[#10B981]" />
            <h2 className="text-lg font-semibold">Validação de hipóteses</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Quais hooks, pilares e posts realmente convertem em venda no Hotmart.
          </p>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-outline/10 hover:bg-surface-highest"
        >
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm">Carregando vendas...</div>
      ) : !stats ? (
        <div className="text-center py-12 text-muted text-sm">Sem dados ainda.</div>
      ) : stats.sales_total === 0 ? (
        <div className="bg-surface-low border border-outline/10 p-12 text-center">
          <AlertCircle className="w-10 h-10 mx-auto mb-3 text-muted" />
          <h3 className="text-sm font-semibold mb-2">Nenhuma venda registrada ainda</h3>
          <p className="text-xs text-muted max-w-md mx-auto">
            Quando o Hotmart confirmar a 1ª venda via webhook, ela aparece aqui atribuída ao post correto via UTM.
            Cada PostDrawer gera a URL UTM automaticamente — cola na bio/stories/feed e o tracking corre sozinho.
          </p>
        </div>
      ) : (
        <>
          {/* Stats topo */}
          <div className="grid grid-cols-4 gap-3 mb-6">
            <StatCard
              label="Vendas totais"
              value={String(stats.sales_total)}
              color="#10B981"
              icon={<DollarSign className="w-3.5 h-3.5" />}
            />
            <StatCard
              label="Receita acumulada"
              value={brl(stats.revenue_cents_total)}
              color="#10B981"
            />
            <StatCard
              label="Compradores únicos"
              value={String(stats.unique_buyers)}
              color="#06B6D4"
              icon={<Users className="w-3.5 h-3.5" />}
            />
            <StatCard
              label="Última venda"
              value={stats.last_sale_at ? dateBR(stats.last_sale_at) : '—'}
              color="#8B5CF6"
              icon={<Calendar className="w-3.5 h-3.5" />}
            />
          </div>

          {/* Segunda linha: atribuição + afiliados + problemas */}
          <div className="grid grid-cols-4 gap-3 mb-8">
            <StatCard
              label="Atribuídas a post"
              value={`${stats.attributed_sales} (${attributionRate}%)`}
              color={attributionRate >= 60 ? '#10B981' : attributionRate >= 30 ? '#F59E0B' : '#EF4444'}
            />
            <StatCard
              label="Via afiliado"
              value={`${stats.affiliate_sales} de ${stats.unique_affiliates}`}
              color="#8B5CF6"
            />
            <StatCard
              label="Reembolsos"
              value={String(stats.refunds_total)}
              color={stats.refunds_total > 0 ? '#F59E0B' : '#6B7280'}
            />
            <StatCard
              label="Chargebacks"
              value={String(stats.chargebacks_total)}
              color={stats.chargebacks_total > 0 ? '#EF4444' : '#6B7280'}
            />
          </div>

          {/* Ranking pilares */}
          <div className="mb-8">
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted mb-3">
              Receita por pilar (ranking)
            </h3>
            <div className="bg-surface-low border border-outline/10 p-4 space-y-3">
              {ranking.length === 0 ? (
                <div className="text-xs text-muted">Sem ranking ainda.</div>
              ) : (
                ranking.map((p) => {
                  const widthPct = Math.round((p.revenue_cents / maxRev) * 100);
                  return (
                    <div key={p.pillar_code}>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium" style={{ color: p.pillar_color }}>
                          {p.pillar_name}
                        </span>
                        <div className="flex items-center gap-3 text-on-surface-variant">
                          <span>{p.posts_count} posts</span>
                          <span>{p.sales_count} vendas</span>
                          <span className="font-semibold text-on-surface" style={{ color: p.pillar_color }}>
                            {brl(p.revenue_cents)}
                          </span>
                          <span className="text-muted text-[10px]">
                            ({p.sales_per_post.toFixed(2)} v/post)
                          </span>
                        </div>
                      </div>
                      <div className="h-1.5 bg-surface-low overflow-hidden">
                        <div
                          className="h-full transition-all"
                          style={{
                            width: `${widthPct}%`,
                            background: p.pillar_color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Top posts */}
          <div>
            <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted mb-3">
              Top 10 posts por receita
            </h3>
            {topPosts.length === 0 ? (
              <div className="bg-surface-low border border-outline/10 p-8 text-center text-xs text-muted">
                Nenhum post com venda atribuída ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {topPosts.map((p, i) => (
                  <div
                    key={p.id}
                    className="bg-surface-low border border-outline/10 p-3 flex items-center gap-3 border-l-4"
                    style={{ borderLeftColor: p.pillar_color ?? '#06B6D4' }}
                  >
                    <div className="text-2xl font-bold text-muted w-8 text-center">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 text-[10px] uppercase tracking-widest font-bold text-muted mb-1">
                        <span style={{ color: p.pillar_color ?? '#06B6D4' }}>{p.pillar_name}</span>
                        <span>·</span>
                        <span>{dateBR(p.scheduled_date)}</span>
                        {p.content_type && <><span>·</span><span>{p.content_type}</span></>}
                      </div>
                      <div className="text-sm truncate">{p.hook ?? '(sem hook)'}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-semibold text-[#10B981] flex items-center gap-1 justify-end">
                        <ArrowUpRight className="w-3.5 h-3.5" />
                        {brl(p.revenue_cents)}
                      </div>
                      <div className="text-[10px] text-muted">{p.sales_count} vendas · {brl(p.commission_cents)} comissão</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface-low border border-outline/10 p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-muted mb-1">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}
