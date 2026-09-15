import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Resultado do conteúdo e teto de IA — ordem do dono (15/09/2026): "não temos analytics ou resultado
// no mkt, sempre no digiai". Contratos do MKT: v_mkt_performance (engajamento por post publicado,
// invoker) e v_mkt_ai_custo (definer com trava mkt.is_admin() no corpo: quem não é admin do MKT
// recebe zero linhas — isso é "sem acesso", não "custo zero").

type Post = { brand_code: string; brand_name: string; platform: string; published_at: string; engajamento: number | null; coletado_em: string | null };
type Ia = { teto_mensal: number | null; teto_diario: number | null; pausado: boolean | null; gasto_mes: number; gasto_dia: number };
type Marca = { code: string; nome: string; posts: number; medidos: number; media: number | null; max: number | null };

const DIAS = 30;
const usd = (v: number | null) => (v == null ? '—' : `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export default function ResultadoConteudoCard() {
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  const [coletado, setColetado] = useState<string | null>(null);
  const [ia, setIa] = useState<Ia | null | 'sem_acesso'>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const desde = new Date(Date.now() - DIAS * 86400000).toISOString();
    supabase.from('v_mkt_performance').select('brand_code, brand_name, platform, published_at, engajamento, coletado_em').gte('published_at', desde)
      .then(({ data, error }) => {
        if (error) { setErro(error.message); setMarcas([]); return; }
        const posts = (data ?? []) as Post[];
        const por = new Map<string, Post[]>();
        for (const p of posts) por.set(p.brand_code, [...(por.get(p.brand_code) ?? []), p]);
        const lista: Marca[] = [...por.entries()].map(([code, ps]) => {
          const med = ps.map((p) => p.engajamento).filter((v): v is number => v != null);
          return {
            code, nome: ps[0].brand_name, posts: ps.length, medidos: med.length,
            media: med.length ? med.reduce((a, b) => a + b, 0) / med.length : null,
            max: med.length ? Math.max(...med) : null,
          };
        }).sort((a, b) => (b.media ?? -1) - (a.media ?? -1));
        setMarcas(lista);
        setColetado(posts.map((p) => p.coletado_em).filter(Boolean).sort().pop() ?? null);
      });
    supabase.from('v_mkt_ai_custo').select('*').maybeSingle()
      .then(({ data, error }) => { setIa(error || !data ? 'sem_acesso' : (data as Ia)); });
  }, []);

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <BarChart3 className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Resultado do conteúdo</span>
        <span className="font-mono text-[10px] text-muted">posts publicados nos últimos {DIAS} dias</span>
        {coletado && (
          <span className="ml-auto font-mono text-[10px] text-muted tabular-nums">
            engajamento coletado em {new Date(coletado).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
          </span>
        )}
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>Não consegui ler o resultado: {erro}.</span>
        </div>
      ) : marcas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
      ) : marcas.length === 0 ? (
        <div className="px-4 py-3 text-sm text-on-surface-variant">Nenhum post publicado nos últimos {DIAS} dias.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10">
                {['Marca', 'Posts', 'Engajamento médio', 'Melhor post'].map((h, i) => (
                  <th key={h} className={`font-mono text-[9px] uppercase tracking-widest text-muted px-4 py-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {marcas.map((m) => (
                <tr key={m.code} className="border-b border-outline/5 last:border-b-0">
                  <td className="px-4 py-1.5 text-on-surface">{m.nome}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant"
                    title={m.medidos < m.posts ? `${m.posts - m.medidos} sem engajamento coletado` : undefined}>
                    {m.posts}{m.medidos < m.posts && <span className="text-muted"> ({m.medidos} medidos)</span>}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">{m.media == null ? '—' : m.media.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">{m.max ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-4 py-2.5 border-t border-outline/10 flex flex-wrap gap-x-5 gap-y-1 text-xs text-on-surface-variant">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted self-center">IA do MKT</span>
        {ia == null ? (
          <span className="text-muted">Carregando…</span>
        ) : ia === 'sem_acesso' ? (
          <span className="text-muted">Teto e gasto só aparecem para admin do MKT — não é custo zero.</span>
        ) : (
          <>
            <span>{ia.pausado ? <strong className="text-warning">IA pausada</strong> : <strong className="text-success">IA ligada</strong>}</span>
            <span>Mês: <strong className="text-on-surface tabular-nums">{usd(ia.gasto_mes)}</strong> de {usd(ia.teto_mensal)}</span>
            <span>Hoje: <strong className="text-on-surface tabular-nums">{usd(ia.gasto_dia)}</strong> de {usd(ia.teto_diario)}</span>
          </>
        )}
      </div>
    </section>
  );
}
