import { useEffect, useState } from 'react';
import { Store, ExternalLink, AlertTriangle, CheckCircle2, Circle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { TravasBanner } from './TravasMarketing';
import { supabase } from '../lib/supabase';
import { academyStore } from '../lib/academyStore';

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

const DOC_PRICE_BRL = 47.9; // plano-mestre §7

export default function Marketplace() {
  const [items, setItems] = useState<MarketplaceItem[]>([]);
  const [appPrice, setAppPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
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
    const cls = value == null ? 'text-muted' : ok ? 'text-emerald-400' : 'text-amber-300';
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
    <div className="p-8 max-w-6xl mx-auto">
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
        <div className={`border p-5 space-y-3 ${allMatch ? 'border-emerald-500/30 bg-emerald-500/[0.05]' : 'border-amber-500/30 bg-amber-500/[0.06]'}`}>
          <div className="flex items-center gap-2">
            {allMatch ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-amber-300" />}
            <span className="text-xs font-mono uppercase tracking-widest text-muted">Reconciliação de preço</span>
            <span className={`ml-auto text-[11px] font-mono tabular-nums ${allMatch ? 'text-emerald-300' : 'text-amber-200'}`}>
              {allMatch ? '✓ tudo bate' : '⚠ divergência'}
            </span>
          </div>
          <div className="text-xs text-muted">
            Pendência §13 do plano-mestre: 47,90 (doc) vs 48,50 (Hotmart). Reconciliar antes do lançamento 01/06.
          </div>
          <ul className="space-y-1.5">
            <PriceRow label="Plano-mestre §7" value={DOC_PRICE_BRL} expected={DOC_PRICE_BRL} source="docs/digiai/docs/05-marketing" />
            <PriceRow label="App (academy.products.price_brl)" value={appPrice} expected={DOC_PRICE_BRL} source="banco" />
            <PriceRow label="Hotmart (listing real)" value={hotmartPrice} expected={DOC_PRICE_BRL} source="digital_assets.observacoes" />
          </ul>
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
                    <span className={`ml-auto text-[10px] font-mono uppercase px-2 py-0.5 ${item.status === 'ativo' ? 'bg-emerald-500/20 text-emerald-300' : 'bg-muted/20 text-muted'}`}>
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
