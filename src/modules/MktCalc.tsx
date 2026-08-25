import { useEffect, useMemo, useState } from 'react';
import { Calculator, Loader2, ExternalLink } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Clearix Calc — MOVIDO do app MKT em 2026-08-25 (mesma decisão do Crescimento:
// dados no digiai, motor de postagem no MKT). A telemetria é first-party do
// próprio calc (analytics.events_log product='clearix-calc' + marketing.landing_leads),
// lida por views públicas sem PII — tudo neste mesmo banco.
type Uso = { calc_slug: string | null; calc_label: string | null; usos: number; sessoes: number; ultimo_uso: string | null };
type Camp = { utm_source: string; utm_campaign: string; usos: number; sessoes: number; leads: number; taxa_conversao_pct: number | null };
type Dia = { dia: string; usos: number; sessoes: number; leads: number };

const nf = (n: number) => n.toLocaleString('pt-BR');
const CALC_URL = 'https://clearixcalc.netlify.app';

export default function MktCalc() {
  const [uso, setUso] = useState<Uso[]>([]);
  const [camp, setCamp] = useState<Camp[]>([]);
  const [dias, setDias] = useState<Dia[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const [u, c, d] = await Promise.all([
        supabase.from('v_mkt_calc_uso').select('calc_slug, calc_label, usos, sessoes, ultimo_uso').limit(50),
        supabase.from('v_mkt_calc_campanhas').select('utm_source, utm_campaign, usos, sessoes, leads, taxa_conversao_pct').limit(100),
        supabase.from('v_mkt_calc_funil').select('dia, usos, sessoes, leads').limit(90),
      ]);
      setUso((u.data ?? []) as Uso[]);
      setCamp((c.data ?? []) as Camp[]);
      setDias((d.data ?? []) as Dia[]);
      setLoading(false);
    })();
  }, []);

  const tot = useMemo(() => {
    const usos = uso.reduce((s, x) => s + (x.usos ?? 0), 0);
    const sessoes = uso.reduce((s, x) => s + (x.sessoes ?? 0), 0);
    const leads = camp.reduce((s, x) => s + (x.leads ?? 0), 0);
    return { usos, sessoes, leads, conv: sessoes > 0 ? Math.round((leads / sessoes) * 1000) / 10 : 0 };
  }, [uso, camp]);

  // série dos últimos 30 dias, do mais antigo pro mais novo (a view devolve desc)
  const serie = useMemo(() => [...dias].slice(0, 30).reverse(), [dias]);
  const maxSerie = Math.max(1, ...serie.map((d) => d.usos));

  if (loading) {
    return <div className="py-24 text-center text-muted"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;
  }

  const semTrafego = tot.usos === 0;
  const lbl = 'font-mono text-[10px] uppercase tracking-widest text-muted';

  return (
    <div className="max-w-7xl mx-auto p-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2.5 font-serif text-2xl font-semibold text-on-surface">
          <Calculator className="w-5 h-5 text-secondary" /> Clearix Calc
        </h1>
        <div className={lbl + ' mt-1'}>isca do funil · telemetria first-party</div>
        <p className="text-[13px] text-on-surface-variant mt-2 max-w-2xl">
          A isca do funil do Clearix. Quem usa a calculadora vira público de retargeting —
          e quem deixa contato vira lead.{' '}
          <a href={CALC_URL} target="_blank" rel="noreferrer" className="text-secondary inline-flex items-center gap-1 hover:underline">
            abrir o calc <ExternalLink className="w-3 h-3" />
          </a>
        </p>
      </header>

      <div className={lbl + ' mb-2'}>funil da isca ▸ 90 dias</div>
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-2 mb-6">
        {[
          { l: 'usos', v: nf(tot.usos), c: undefined as string | undefined },
          { l: 'sessões', v: nf(tot.sessoes), c: 'var(--color-secondary)' },
          { l: 'leads', v: nf(tot.leads), c: tot.leads > 0 ? 'var(--color-action)' : undefined },
          { l: 'conversão sessão→lead', v: `${tot.conv}%`, c: 'var(--color-warning)' },
        ].map((k) => (
          <div key={k.l} className="border border-outline/15 bg-surface-container px-3 py-2.5">
            <div className="font-mono tabular-nums text-lg" style={{ color: k.c }}>{k.v}</div>
            <div className={lbl}>{k.l}</div>
          </div>
        ))}
      </section>

      {semTrafego && (
        <section className="border border-outline/15 bg-surface-container px-4 py-3 mb-6 text-[13px] text-on-surface-variant">
          Sem tráfego registrado ainda. Os números aparecem quando a distribuição do kit rodar
          (UTMs <span className="font-mono text-muted">utm_campaign=distribuicao_&lt;publico&gt;_&lt;AAAA_MM&gt;</span>).
          Público de anúncio só fica acionável a partir de ~1.000 pessoas.
        </section>
      )}

      {/* qual isca puxa mais */}
      <div className={lbl + ' mb-2'}>uso por calculadora</div>
      <section className="border border-outline/15 bg-surface-container mb-6 overflow-x-auto">
        {uso.length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-muted">nenhuma calculadora usada ainda.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-muted border-b border-outline/15">
                <th className="text-left font-normal px-4 py-2">calculadora</th>
                <th className="text-right font-normal px-4 py-2">usos</th>
                <th className="text-right font-normal px-4 py-2">sessões</th>
                <th className="text-right font-normal px-4 py-2">último uso</th>
              </tr>
            </thead>
            <tbody>
              {[...uso].sort((a, b) => b.usos - a.usos).map((u) => (
                <tr key={u.calc_slug ?? '?'} className="border-b border-outline/10 last:border-0">
                  <td className="px-4 py-2 text-on-surface">{u.calc_label ?? u.calc_slug ?? '—'}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums">{nf(u.usos)}</td>
                  <td className="px-4 py-2 text-right text-on-surface-variant">{nf(u.sessoes)}</td>
                  <td className="px-4 py-2 text-right text-muted">
                    {u.ultimo_uso ? new Date(u.ultimo_uso).toLocaleDateString('pt-BR') : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* o que a distribuição trouxe */}
      <div className={lbl + ' mb-2'}>campanhas ▸ usos × leads</div>
      <section className="border border-outline/15 bg-surface-container mb-6 overflow-x-auto">
        {camp.length === 0 ? (
          <div className="px-4 py-6 text-[13px] text-muted">nenhuma campanha registrada.</div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="text-muted border-b border-outline/15">
                <th className="text-left font-normal px-4 py-2">origem</th>
                <th className="text-left font-normal px-4 py-2">campanha</th>
                <th className="text-right font-normal px-4 py-2">sessões</th>
                <th className="text-right font-normal px-4 py-2">leads</th>
                <th className="text-right font-normal px-4 py-2">conversão</th>
              </tr>
            </thead>
            <tbody>
              {[...camp].sort((a, b) => b.sessoes - a.sessoes).map((c) => (
                <tr key={`${c.utm_source}|${c.utm_campaign}`} className="border-b border-outline/10 last:border-0">
                  <td className="px-4 py-2 text-on-surface-variant">{c.utm_source}</td>
                  <td className="px-4 py-2 text-on-surface font-mono text-[12px]">{c.utm_campaign}</td>
                  <td className="px-4 py-2 text-right text-on-surface-variant">{nf(c.sessoes)}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums" style={{ color: c.leads > 0 ? 'var(--color-action)' : undefined }}>{nf(c.leads)}</td>
                  <td className="px-4 py-2 text-right text-muted">
                    {c.taxa_conversao_pct == null ? '—' : `${c.taxa_conversao_pct}%`}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      {/* ritmo diário */}
      <div className={lbl + ' mb-2'}>últimos 30 dias ▸ usos por dia</div>
      <section className="border border-outline/15 bg-surface-container px-4 py-4">
        <div className="flex items-end gap-[3px] h-24">
          {serie.map((d) => (
            <div
              key={d.dia}
              title={`${new Date(d.dia + 'T12:00:00').toLocaleDateString('pt-BR')}: ${d.usos} usos · ${d.leads} leads`}
              className="flex-1 min-h-[2px]"
              style={{
                height: `${Math.max(2, (d.usos / maxSerie) * 100)}%`,
                background: d.leads > 0 ? 'var(--color-action)' : 'var(--color-secondary)',
                opacity: d.usos === 0 ? 0.15 : 1,
              }}
            />
          ))}
        </div>
        <div className={lbl + ' mt-2'}>barra verde = dia com lead</div>
      </section>
    </div>
  );
}
