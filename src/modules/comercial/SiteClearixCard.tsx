import { useEffect, useState } from 'react';
import { Globe, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Demanda que chega pelo site clearix.app.br (eventos da 127 via events-ingest). Lê o agregado
// v_analytics_funnel_summary (product 'clearix-site'), que desde a 129 já tira preview local e
// eventos de outro produto. Os pedidos em si viram lead (128) e aparecem no pipeline.

type Linha = { event_code: string; n_7d: number; n_30d: number; last_at: string | null };

const CODIGOS: { code: string; rotulo: string }[] = [
  { code: 'clearix_site_visit', rotulo: 'Páginas vistas' },
  { code: 'clearix_cta_click', rotulo: 'Cliques em CTA' },
  { code: 'clearix_whatsapp_click', rotulo: 'Cliques no WhatsApp' },
  { code: 'clearix_demo_solicitada', rotulo: 'Pedidos de demo' },
];

export default function SiteClearixCard() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('v_analytics_funnel_summary').select('event_code, n_7d, n_30d, last_at').eq('product', 'clearix-site')
      .then(({ data, error }) => {
        if (error) { setErro(error.message); setLinhas([]); return; }
        setLinhas((data ?? []) as Linha[]);
      });
  }, []);

  const de = (code: string) => linhas?.find((l) => l.event_code === code) ?? null;
  const ultimo = linhas?.map((l) => l.last_at).filter(Boolean).sort().pop() ?? null;

  return (
    <section className="border border-outline/15 bg-surface-container mb-5">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Globe className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Site do Clearix</span>
        <span className="font-mono text-[10px] text-muted">últimos 7 dias · clearix.app.br</span>
        <span className="ml-auto font-mono text-[10px] text-muted tabular-nums">
          {ultimo ? `último evento ${new Date(ultimo).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}` : ''}
        </span>
      </div>
      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não consegui ler os eventos do site: {erro}.</span>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4">
          {CODIGOS.map((c) => {
            const l = de(c.code);
            return (
              <div key={c.code} className="p-3 border-r border-outline/10 last:border-r-0">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{c.rotulo}</div>
                <div className={`font-serif text-xl font-semibold tabular-nums mt-0.5 ${l ? 'text-on-surface' : 'text-muted'}`}
                  title={linhas && !l ? 'código não está no catálogo' : undefined}>
                  {linhas == null ? '…' : l ? l.n_7d : '—'}
                </div>
                {l && <div className="font-mono text-[10px] text-muted tabular-nums">{l.n_30d} em 30 dias</div>}
              </div>
            );
          })}
        </div>
      )}
      <p className="px-4 py-2 text-[11px] text-muted border-t border-outline/10">
        Envios de teste marcados (sessão "teste-…") ainda entram nesta conta; o preview local já não.
      </p>
    </section>
  );
}
