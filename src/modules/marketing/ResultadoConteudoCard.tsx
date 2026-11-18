import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Resultado do conteúdo e teto de IA — ordem do dono (15/09/2026): "não temos analytics ou resultado
// no mkt, sempre no digiai". Contratos do MKT: v_mkt_performance (engajamento por post publicado,
// invoker) e v_mkt_ai_custo (definer com trava mkt.is_admin() no corpo: quem não é admin do MKT
// recebe zero linhas — isso é "sem acesso", não "custo zero").

type Post = { brand_code: string; brand_name: string; platform: string; published_at: string; engajamento: number | null; coletado_em: string | null };
type Ia = { teto_mensal: number | null; teto_diario: number | null; pausado: boolean | null; gasto_mes: number; gasto_dia: number };
type Marca = { code: string; nome: string; posts: number; medidos: number; media: number | null; max: number | null; motivo?: string };

// Quantos dias cada período pede. Vem do pai, junto com o cartão de Leituras: os dois mostram a mesma
// janela ou a tela mente para quem clica.
const DIAS_POR_PERIODO: Record<string, number | null> = { '7': 7, '30': 30, tudo: null };
const usd = (v: number | null) => (v == null ? '—' : `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);

export default function ResultadoConteudoCard({ periodo = '30' }: { periodo?: string }) {
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  const [coletado, setColetado] = useState<string | null>(null);
  const [agendados, setAgendados] = useState(0);
  // A lista canónica das marcas da casa. Sem ela, só aparecem as que têm post medido — e o dono
  // contou os cartões: 9 numa aba, 8 noutra, 7 aqui. Marca sem medição fica, com o motivo escrito.
  const [todas, setTodas] = useState<Array<{ marca: string; marca_nome: string; tem_movimento: boolean }> | null>(null);
  const [ia, setIa] = useState<Ia | null | 'sem_acesso'>(null);
  const [erro, setErro] = useState<string | null>(null);

  const dias = DIAS_POR_PERIODO[periodo] ?? null;

  useEffect(() => {
    supabase.from('v_mkt_estoque_marca').select('marca, marca_nome, tem_movimento')
      .then(({ data }) => setTodas((data ?? []) as never));
  }, []);

  useEffect(() => {
    setMarcas(null);
    let q = supabase.from('v_mkt_performance')
      .select('brand_code, brand_name, platform, published_at, engajamento, coletado_em');
    if (dias) q = q.gte('published_at', new Date(Date.now() - dias * 86400000).toISOString());
    q.then(({ data, error }) => {
        if (error) { setErro(error.message); setMarcas([]); return; }
        const todos = (data ?? []) as Post[];
        // POST AGENDADO NÃO ENTRA NA MÉDIA. `mkt.publications` guarda os agendados do Facebook com
        // `published_at` no futuro — 31 dos 404 de 30 dias, medido em 18/11. Média de desempenho com
        // peça que ainda não saiu não é média de nada: ela só puxa o número para baixo, e a tela não
        // dava sinal disso. Enquanto o dado não separar agendado de publicado, o corte é aqui.
        const agora = Date.now();
        const posts = todos.filter((p) => !p.published_at || new Date(p.published_at).getTime() <= agora);
        setAgendados(todos.length - posts.length);
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
        <span className="font-mono text-[10px] text-muted">
          posts publicados {dias ? `nos últimos ${dias} dias` : 'desde o início'}
          {agendados > 0 && <span className="text-warning"> · {agendados} agendada(s) fora da conta</span>}
        </span>
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
        <div className="px-4 py-3 text-sm text-on-surface-variant">
          Nenhum post publicado {dias ? `nos últimos ${dias} dias` : 'até agora'}.
          {agendados > 0 && ` Há ${agendados} agendada(s), que não contam como publicadas.`}
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10">
                {['Marca', 'Posts medidos', 'Engajamento médio', 'Melhor post'].map((h, i) => (
                  <th key={h} className={`font-mono text-[9px] uppercase tracking-widest text-muted px-4 py-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {/* As marcas sem post medido entram no fim, com o motivo — nunca somem, e nunca
                  aparecem com zero fingindo medição. */}
              {[...marcas, ...((todas ?? [])
                  .filter((t) => !marcas.some((m) => m.code === t.marca))
                  .map((t) => ({
                    code: t.marca, nome: t.marca_nome, posts: 0, medidos: 0, media: null, max: null,
                    motivo: t.tem_movimento
                      ? 'publica fora do MKT — engajamento não medido aqui'
                      : 'ainda não publica pela casa; nenhum dado chega',
                  } as Marca)))].map((m) => (
                <tr key={m.code} className="border-b border-outline/5 last:border-b-0">
                  <td className="px-4 py-1.5 text-on-surface">
                    {m.nome}
                    {m.motivo && <div className="font-mono text-[9px] text-muted leading-tight">{m.motivo}</div>}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant"
                    title={m.medidos < m.posts ? `${m.posts - m.medidos} sem engajamento coletado` : undefined}>
                    {m.motivo ? '—' : m.posts}{!m.motivo && m.medidos < m.posts && <span className="text-muted"> ({m.medidos} medidos)</span>}
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
