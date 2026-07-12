import { useEffect, useState } from 'react';
import { Store, ExternalLink, AlertTriangle, CheckCircle2, Circle, Plug, ShoppingBag } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { TravasBanner } from './TravasMarketing';
import { supabase } from '../lib/supabase';
import { academyStore } from '../lib/academyStore';

interface WebhookStatus { source: string; eventos: number; ultimo_evento: string | null; processados: number }
interface HotmartSale {
  id: string; hotmart_transaction: string | null; product_name: string | null; status: string | null;
  buyer_name: string | null; price_value_cents: number | null; affiliate_name: string | null;
  payment_type: string | null; purchase_date: string | null; platform: string | null;
}

// M4.1 (RECONCILIACAO_marketing_2026-05-31.md) — esqueleto sem API:
// lê digital_assets (URL/observações) + academy.products (preço canônico).
// Quando API Hotmart entrar, plugamos os dados live (preço, capa, status real).

interface MarketplaceItem {
  key: 'hotmart' | 'kiwify';
  label: string;
  url: string | null;
  status: string | null;
  notes: string | null;
}

interface HotmartStats {
  sales_total: number;
  revenue_cents_total: number;
  refunds_total: number;
  chargebacks_total: number;
  unique_buyers: number;
  affiliate_sales: number;
  unique_affiliates: number;
  last_sale_at: string | null;
}

const DOC_PRICE_BRL = 48.5; // plano-mestre §7 (reconciliado 2026-06-02: doc/app/Hotmart/Kiwify)

export default function Marketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [appPrice, setAppPrice] = useState<number | null>(null);
  const [hot, setHot] = useState<HotmartStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [conexoes, setConexoes] = useState<WebhookStatus[]>([]);
  const [vendas, setVendas] = useState<HotmartSale[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase.from('v_marketplace_webhook_status').select('*');
        setConexoes(((data ?? []) as WebhookStatus[]).filter(c => c.source !== 'mercadopago'));
      } catch { /* silencioso */ }

      try {
        const { data } = await supabase.from('v_marketing_hotmart_sales').select('*').limit(20);
        setVendas((data ?? []) as HotmartSale[]);
      } catch { /* silencioso */ }
      try {
        const { data } = await supabase
          .from('v_company_digital_assets')
          .select('rotulo, valor, status, observacoes')
          .or('rotulo.ilike.%Hotmart%,rotulo.ilike.%Kiwify%');
        const mapped: MarketplaceItem[] = (data ?? []).map(d => ({
          key: (d.rotulo as string).toLowerCase().includes('hotmart') ? 'hotmart' : 'kiwify',
          label: d.rotulo as string,
          url: d.valor as string,
          status: d.status as string,
          notes: d.observacoes as string,
        }));
        setItems(mapped);
      } catch { /* silencioso */ }

      try {
        const w = await academyStore.getWorkspace();
        setAppPrice(w.product.price_brl ?? null);
      } catch { /* silencioso */ }

      try {
        const { data: stats } = await supabase
          .from('v_marketing_hotmart_stats')
          .select('*')
          .maybeSingle();
        if (stats) setHot(stats as HotmartStats);
      } catch { /* silencioso */ }

      setLoading(false);
    })();
  }, []);

  // Parse preço Hotmart da observação ("R$ 97 tabela, R$ 48,50 lançamento" → 48.50)
  const hotmartItem = items.find(i => i.key === 'hotmart');
  const hotmartPriceMatch = hotmartItem?.notes?.match(/R\$\s?(\d+[,.]?\d{0,2})\s*lan[çc]amento/i);
  const hotmartPrice = hotmartPriceMatch
    ? parseFloat(hotmartPriceMatch[1].replace(',', '.'))
    : null;

  // Reconciliação
  const docVsApp = appPrice === DOC_PRICE_BRL;
  const docVsHotmart = hotmartPrice === DOC_PRICE_BRL;
  const allMatch = docVsApp && docVsHotmart;

  const PriceRow = ({ label, value, expected, source }: { label: string; value: number | null; expected: number; source: string }) => {
    const ok = value === expected;
    const Icon = value == null ? Circle : ok ? CheckCircle2 : AlertTriangle;
    const cls = value == null ? 'text-muted' : ok ? 'text-success' : 'text-warning';
    return (
      <li className="flex items-center justify-between text-sm">
        <span className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${cls}`} />
          <span className="text-on-surface">{label}</span>
          <span className="text-[10px] font-mono text-muted">({source})</span>
        </span>
        <span className="font-mono tabular-nums text-on-surface">
          {value != null ? `R$ ${value.toFixed(2).replace('.', ',')}` : '—'}
        </span>
      </li>
    );
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Operacional · canal primário"
        title="Marketplace"
        subtitle={
          <>
            Hotmart e Kiwify são o <b className="text-on-surface-variant">canal primário</b> de aquisição
            (trava <b className="text-secondary">marketplace-first</b>). Esse painel mostra estado das
            listings e reconcilia preço entre doc canônico, app e marketplace.
          </>
        }
      />
      <div className="space-y-6">
        <TravasBanner />

        {/* Reconciliação de preço — divergência §13 do plano-mestre */}
        <div className={`border p-5 space-y-3 ${allMatch ? 'border-success/30 bg-success/[0.05]' : 'border-warning/30 bg-warning/[0.06]'}`}>
          <div className="flex items-center gap-2">
            {allMatch ? <CheckCircle2 className="w-4 h-4 text-success" /> : <AlertTriangle className="w-4 h-4 text-warning" />}
            <span className="text-xs font-mono uppercase tracking-widest text-muted">Reconciliação de preço</span>
            <span className={`ml-auto text-[11px] font-mono tabular-nums ${allMatch ? 'text-success' : 'text-warning'}`}>
              {allMatch ? '✓ tudo bate' : '⚠ divergência'}
            </span>
          </div>
          <div className="text-xs text-muted">
            Reconciliado 2026-06-02: R$ 48,50 em doc + app + Hotmart + Kiwify.
          </div>
          <ul className="space-y-1.5">
            <PriceRow label="Plano-mestre §7" value={DOC_PRICE_BRL} expected={DOC_PRICE_BRL} source="docs/digiai/docs/05-marketing" />
            <PriceRow label="App (academy.products.price_brl)" value={appPrice} expected={DOC_PRICE_BRL} source="banco" />
            <PriceRow label="Hotmart (listing real)" value={hotmartPrice} expected={DOC_PRICE_BRL} source="digital_assets.observacoes" />
          </ul>
        </div>

        {/* Conexões — estado real dos webhooks por marketplace */}
        <div className="border border-outline/15 bg-surface-container">
          <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2">
            <Plug className="w-3.5 h-3.5 text-secondary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Conexões (webhooks)</span>
            <span className="ml-auto font-mono text-[10px] text-muted">fonte: v_marketplace_webhook_status</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-outline/10 text-sm">
            {(['hotmart', 'kiwify'] as const).map(src => {
              const c = conexoes.find(x => x.source === src);
              const recebeu = (c?.eventos ?? 0) > 0;
              return (
                <div key={src} className="p-4 flex items-start gap-2.5">
                  {recebeu
                    ? <CheckCircle2 className="w-4 h-4 text-success shrink-0 mt-0.5" />
                    : <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />}
                  <div>
                    <div className="text-on-surface capitalize">{src} — webhook ativo (edge function no ar)</div>
                    <div className="text-[11px] text-muted">
                      {recebeu
                        ? `${c!.eventos} evento(s) · ${c!.processados} processado(s) · último ${c!.ultimo_evento ? new Date(c!.ultimo_evento).toLocaleString('pt-BR') : '—'}`
                        : '0 eventos recebidos até hoje — confirmar registro do webhook no painel do marketplace'}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Compras OSI — linha a linha (webhook → marketing.hotmart_sales) */}
        <div className="border border-outline/15 bg-surface-container">
          <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2">
            <ShoppingBag className="w-3.5 h-3.5 text-secondary" />
            <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Compras OSI (reais)</span>
            <span className="ml-auto font-mono text-[10px] text-muted">{vendas.length} registro(s)</span>
          </div>
          {vendas.length === 0 ? (
            <div className="p-4 text-xs text-muted italic">
              Nenhuma compra registrada — a lista popula pelo webhook Hotmart/Kiwify a cada venda. Fase VENDER: o gargalo é tráfego/prospecção, não o encanamento.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] font-mono text-muted uppercase tracking-widest border-b border-outline/10">
                    <th className="text-left px-4 py-2 font-medium">Data</th>
                    <th className="text-left px-4 py-2 font-medium">Comprador</th>
                    <th className="text-left px-4 py-2 font-medium">Status</th>
                    <th className="text-right px-4 py-2 font-medium">Valor</th>
                    <th className="text-left px-4 py-2 font-medium">Afiliado</th>
                    <th className="text-left px-4 py-2 font-medium">Plataforma</th>
                  </tr>
                </thead>
                <tbody>
                  {vendas.map(v => (
                    <tr key={v.id} className="border-b border-outline/5">
                      <td className="px-4 py-2 font-mono text-muted">{v.purchase_date ? new Date(v.purchase_date).toLocaleDateString('pt-BR') : '—'}</td>
                      <td className="px-4 py-2 text-on-surface">{v.buyer_name || '—'}</td>
                      <td className="px-4 py-2 text-on-surface-variant">{v.status || '—'}</td>
                      <td className="px-4 py-2 text-right font-mono tabular-nums">{v.price_value_cents != null ? `R$ ${(v.price_value_cents / 100).toFixed(2).replace('.', ',')}` : '—'}</td>
                      <td className="px-4 py-2 text-muted">{v.affiliate_name || '—'}</td>
                      <td className="px-4 py-2 text-muted capitalize">{v.platform || 'hotmart'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Vendas reais (Hotmart) — alimentado pelo webhook hotmart-webhook */}
        <div className="border border-outline/10 bg-surface-low p-5 space-y-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono uppercase tracking-widest text-muted">Vendas reais · Hotmart</span>
            <span className="ml-auto text-[10px] font-mono text-muted">fonte: v_marketing_hotmart_stats (webhook)</span>
          </div>
          {hot ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <div className="bg-surface-high p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-muted">Vendas</div><div className="text-xl font-semibold tabular-nums text-on-surface mt-1">{hot.sales_total}</div></div>
                <div className="bg-surface-high p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-muted">Receita</div><div className="text-xl font-semibold tabular-nums text-on-surface mt-1">R$ {(hot.revenue_cents_total / 100).toFixed(2).replace('.', ',')}</div></div>
                <div className="bg-surface-high p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-muted">Compradores</div><div className="text-xl font-semibold tabular-nums text-on-surface mt-1">{hot.unique_buyers}</div></div>
                <div className="bg-surface-high p-3"><div className="text-[10px] font-mono uppercase tracking-widest text-muted">Via afiliado</div><div className="text-xl font-semibold tabular-nums text-on-surface mt-1">{hot.affiliate_sales}</div></div>
              </div>
              <div className="text-[11px] text-muted">
                {hot.refunds_total} reembolsos · {hot.chargebacks_total} chargebacks · {hot.unique_affiliates} afiliados ·
                {hot.last_sale_at ? ` última venda ${new Date(hot.last_sale_at).toLocaleString('pt-BR')}` : ' sem venda ainda'}
                {hot.sales_total === 1 ? ' · inclui a venda TESTE (1ª venda real ainda pendente)' : ''}
              </div>
            </>
          ) : (
            <div className="text-xs text-muted italic">{loading ? 'Carregando…' : 'Sem vendas registradas ainda — o webhook popula quando houver compra.'}</div>
          )}
        </div>

        {/* Cards Hotmart + Kiwify */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['hotmart', 'kiwify'] as const).map(key => {
            const item = items.find(i => i.key === key);
            return (
              <div key={key} className="border border-outline/10 bg-surface-low p-5 space-y-3">
                <div className="flex items-center gap-2">
                  <Store className="w-4 h-4 text-secondary" />
                  <span className="text-base font-bold text-on-surface capitalize">{key}</span>
                  {item?.status && (
                    <span className={`ml-auto text-[10px] font-mono uppercase px-2 py-0.5 ${item.status === 'ativo' ? 'bg-success/20 text-success' : 'bg-muted/20 text-muted'}`}>
                      {item.status}
                    </span>
                  )}
                </div>
                {loading ? (
                  <div className="text-xs text-muted">Carregando...</div>
                ) : item ? (
                  <>
                    <div className="text-xs text-on-surface-variant">{item.label}</div>
                    {item.notes && <div className="text-xs text-muted leading-relaxed">{item.notes}</div>}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline"
                      >
                        <ExternalLink className="w-3 h-3" /> Abrir listing
                      </a>
                    )}
                  </>
                ) : (
                  <div className="text-xs text-muted italic">Sem cadastro em company.digital_assets ainda.</div>
                )}
              </div>
            );
          })}
        </div>

        {/* Próximos passos (V2 — integração API) */}
        <div className="border border-outline/10 bg-surface-low p-5 text-xs text-muted space-y-2">
          <div className="font-mono uppercase tracking-widest text-on-surface-variant">Próximos passos · V2</div>
          <ul className="space-y-1 list-disc list-inside">
            <li>Integrar API Hotmart (credencial nova no vault, fluxo igual GSC/Bing/Cloudflare) — preço/capa/status live</li>
            <li>Integrar API Kiwify (Kiwify webhook secret ainda vazio per ECOSSISTEMA §216-223)</li>
            <li>Painel "Programa de afiliados Hotmart": # afiliados Hotmart vs # cadastrados no app</li>
            <li>Alerta automático se preço/capa do marketplace mudarem sem atualização no doc canônico</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
