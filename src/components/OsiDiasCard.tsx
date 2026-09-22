import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { diaBrasilia, hojeBrasilia } from '../lib/datas';

// Fonte: public.v_mkt_osi_dias (migration 146) — 90 dias em BRT, só origem real
// (analytics.fn_origem_real: fora localhost, prévia de deploy e campanha teste.*).
// Mesmo molde do card dos blogs em Mkt › Crescimento; aparece lá e em OSI › Mapa.

interface OsiDia {
  dia: string;
  visitas: number; sessoes: number;
  cliques_comprar: number; cliques_calc: number; cliques_whatsapp: number; leads: number;
  gatilho_views: number; gatilho_clicks: number;
  vendas: number; receita_cents: number;
}

const nf = (n: number) => n.toLocaleString('pt-BR');
const fmtDM = (iso: string) => `${iso.slice(8, 10)}/${iso.slice(5, 7)}`;

export default function OsiDiasCard({ desde, ate, cor = 'var(--color-secondary)' }: { desde?: string; ate?: string; cor?: string }) {
  const [dias, setDias] = useState<OsiDia[] | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from('v_mkt_osi_dias').select('*').order('dia');
      if (error) { setErro(true); return; }
      setDias((data ?? []) as OsiDia[]);
    })();
  }, []);

  const ini = desde ?? diaBrasilia(new Date(Date.now() - 29 * 864e5));
  const fim = ate ?? hojeBrasilia();
  const rec = useMemo(() => (dias ?? []).filter((d) => d.dia >= ini && d.dia <= fim), [dias, ini, fim]);
  const tot = useMemo(() => rec.reduce((a, d) => {
    for (const k of Object.keys(a) as (keyof typeof a)[]) a[k] += Number(d[k]) || 0;
    return a;
  }, { visitas: 0, sessoes: 0, cliques_comprar: 0, cliques_calc: 0, cliques_whatsapp: 0, leads: 0, gatilho_views: 0, gatilho_clicks: 0, vendas: 0, receita_cents: 0 }), [rec]);
  const max = Math.max(1, ...rec.map((d) => d.visitas));

  const linhas: [string, string][] = [
    ['sessões', nf(tot.sessoes)],
    ['cliques em comprar', nf(tot.cliques_comprar)],
    ['cliques na calculadora', nf(tot.cliques_calc)],
    ['cliques no WhatsApp', nf(tot.cliques_whatsapp)],
    ['leads', nf(tot.leads)],
    ['gatilhos do leitor (vistos · clicados)', `${nf(tot.gatilho_views)} · ${nf(tot.gatilho_clicks)}`],
    ['vendas Hotmart', tot.vendas > 0 ? `${nf(tot.vendas)} · R$ ${nf(Math.round(tot.receita_cents / 100))}` : '0'],
  ];

  return (
    <div className="border border-outline/15 bg-surface-container px-4 py-3.5">
      <div className="flex items-center gap-2 mb-1.5">
        <span className="w-2 h-2 rounded-full shrink-0" style={{ background: cor }} />
        <span className="text-sm text-on-surface truncate">OSI · landing e leitor</span>
      </div>
      {erro ? (
        <div className="text-[12px] text-muted py-4">Não foi possível ler os dados da OSI agora.</div>
      ) : dias === null ? (
        <div className="text-[12px] text-muted py-4">Carregando…</div>
      ) : (
        <>
          <div className="text-2xl font-semibold font-mono tabular-nums" style={{ color: cor }}>{nf(tot.visitas)} visitas</div>
          <div className="text-[10px] text-muted mt-0.5 mb-2">só gente de fora · {fmtDM(ini)} a {fmtDM(fim)} · sem teste, prévia ou localhost</div>
          {rec.length >= 2 ? (
            <div className="flex items-end gap-[2px] h-12">
              {rec.slice(-45).map((d) => (
                <div key={d.dia} title={`${fmtDM(d.dia)}: ${nf(d.visitas)} visitas · ${nf(d.cliques_comprar)} comprar`} className="flex-1 min-h-[2px]"
                  style={{ height: `${Math.max(3, (d.visitas / max) * 100)}%`, background: cor, opacity: d.visitas === 0 ? 0.15 : 0.85 }} />
              ))}
            </div>
          ) : (
            <div className="h-12 flex items-center justify-center text-[10px] text-muted border border-outline/15">série curta — cresce com os dias</div>
          )}
          <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-1">visitas/dia</div>
          <table className="w-full mt-2.5 text-[11px]">
            <tbody>
              {linhas.map(([k, v]) => (
                <tr key={k} className="border-b border-outline/10 last:border-0">
                  <td className="py-1 text-on-surface">{k}</td>
                  <td className="py-1 text-right font-mono tabular-nums text-on-surface-variant">{v}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
