import { useEffect, useMemo, useState } from 'react';
import { LayoutGrid, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// O controle por marca — pedido do dono em 18/11, 15h37, olhando a aba Publicações: "não temos os
// card com a ideia que passei: publicado, pronto e em nível crítico, que seria ideal controlar tudo
// nesta aba".
//
// Cada marca tem três partes: **PUBLICADO** (o que já saiu), **PRONTO** (o que vai sair e por quanto
// tempo) e **NÍVEL** (ok, atenção, crítico). Dentro, uma linha por rede: última, próxima e na fila.
//
// O CRITÉRIO DO NÍVEL FICA NA TELA, NÃO NO BANCO — e escrito ao lado do estado, não só na cor:
//   · **crítico**: fôlego abaixo de 3 dias · peça que falhou hoje · rede que já publicou e não tem
//     próxima marcada;
//   · **atenção**: fôlego abaixo de 7 dias;
//   · **ok**: o resto.
// Critério guardado no banco é critério que muda sem ninguém ver. Aqui ele está à vista e o motivo
// aparece por extenso — "crítico" sem motivo é um alarme que ninguém sabe como desligar.

type Rede = {
  marca: string; rede: string; publicadas_7d: number; publicadas_hoje: number;
  ultima_saida: string | null; na_fila: number; proxima_saida: string | null;
  ultima_marcada: string | null; falhou_hoje: number;
};
type Marca = {
  marca: string; marca_nome: string; accent_hex: string | null;
  dias_de_estoque: number | null; dias_marcados: number; dias_biblioteca: number | null;
  artes_prontas: number; publicadas_7d: number; na_fila: number;
};

const dma = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
const n1 = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

type Nivel = { nome: 'crítico' | 'atenção' | 'ok'; motivos: string[]; ordem: number };

function nivelDa(m: Marca, redes: Rede[]): Nivel {
  const motivos: string[] = [];
  const falhas = redes.reduce((a, r) => a + r.falhou_hoje, 0);
  const paradas = redes.filter((r) => r.ultima_saida && !r.proxima_saida);

  if (falhas > 0) motivos.push(`${falhas} ${falhas === 1 ? 'peça falhou' : 'peças falharam'} hoje`);
  if (m.dias_de_estoque != null && m.dias_de_estoque < 3) motivos.push(`${n1(m.dias_de_estoque)} dias de fôlego`);
  if (paradas.length > 0) motivos.push(`${paradas.map((r) => r.rede).join(', ')} sem próxima marcada`);
  if (motivos.length > 0) return { nome: 'crítico', motivos, ordem: 0 };

  if (m.dias_de_estoque != null && m.dias_de_estoque < 7) {
    return { nome: 'atenção', motivos: [`${n1(m.dias_de_estoque)} dias de fôlego`], ordem: 1 };
  }
  // Marca sem ritmo não é "ok": é marca de que não se sabe nada. Dizer ok seria aprovar o escuro.
  if (m.dias_de_estoque == null) {
    return { nome: 'atenção', motivos: ['não publicou nesta semana — sem ritmo, não dá para medir o fôlego'], ordem: 1 };
  }
  return { nome: 'ok', motivos: [], ordem: 2 };
}

const TOM: Record<string, string> = {
  'crítico': 'text-danger border-danger/40 bg-danger/10',
  'atenção': 'text-warning border-warning/40 bg-warning/10',
  ok: 'text-success border-success/40 bg-success/10',
};

export default function ControlePorMarca() {
  const [redes, setRedes] = useState<Rede[] | null>(null);
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('v_mkt_controle_marca_rede').select('*').then(({ data, error }) => {
      if (error) { setErro(error.message); setRedes([]); return; }
      setRedes((data ?? []) as Rede[]);
    });
    supabase.from('v_mkt_estoque_marca').select('*').then(({ data }) => setMarcas((data ?? []) as Marca[]));
  }, []);

  const cartoes = useMemo(() => {
    if (!redes || !marcas) return null;
    return marcas
      .map((m) => {
        const r = redes.filter((x) => x.marca === m.marca);
        return { m, redes: r, nivel: nivelDa(m, r) };
      })
      .sort((a, b) => a.nivel.ordem - b.nivel.ordem
        || (a.m.dias_de_estoque ?? 1e9) - (b.m.dias_de_estoque ?? 1e9));
  }, [redes, marcas]);

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <LayoutGrid className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Controle por marca</span>
        <span className="font-mono text-[10px] text-muted">publicado · pronto · nível, e por rede dentro de cada marca</span>
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>Não consegui ler o controle: {erro}.</span>
        </div>
      ) : cartoes == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
      ) : (
        <div className="divide-y divide-outline/10">
          {cartoes.map(({ m, redes: rs, nivel }) => (
            <div key={m.marca} className="px-4 py-3">
              <div className="flex items-start gap-3 flex-wrap">
                <span className="w-1 self-stretch shrink-0" style={{ background: m.accent_hex || 'var(--color-outline)' }} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-on-surface">{m.marca_nome}</span>
                    {/* O nível vem escrito, e o motivo junto: alarme sem motivo ninguém sabe desligar. */}
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${TOM[nivel.nome]}`}>
                      {nivel.nome}
                    </span>
                    {nivel.motivos.length > 0 && (
                      <span className="font-mono text-[9px] text-muted">{nivel.motivos.join(' · ')}</span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1 mt-1.5">
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-muted">publicado</div>
                      <div className="text-[12px] text-on-surface-variant">
                        {m.publicadas_7d} em 7 dias
                        {rs.some((r) => r.publicadas_hoje > 0) && ` · ${rs.reduce((a, r) => a + r.publicadas_hoje, 0)} hoje`}
                        {' · última '}
                        {dma(rs.map((r) => r.ultima_saida).filter(Boolean).sort().at(-1) ?? null)}
                      </div>
                    </div>
                    <div>
                      <div className="font-mono text-[9px] uppercase tracking-widest text-muted">pronto</div>
                      <div className="text-[12px] text-on-surface-variant">
                        {m.na_fila} marcada(s) · {n1(m.dias_de_estoque)} dias de fôlego
                        <span className="text-muted"> ({m.dias_marcados} na agenda + {n1(m.dias_biblioteca)} de biblioteca)</span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-2 overflow-x-auto">
                    <table className="w-full text-[11px]">
                      <thead>
                        <tr className="text-left">
                          {['rede', 'última saída', 'próxima', 'na fila', '7 dias'].map((h, i) => (
                            <th key={h} className={`font-mono text-[9px] uppercase tracking-widest text-muted pb-0.5 ${i ? 'text-right' : ''}`}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {rs.sort((a, b) => b.publicadas_7d - a.publicadas_7d).map((r) => (
                          <tr key={r.rede} className="border-t border-outline/5">
                            <td className="py-0.5 text-on-surface">{r.rede}</td>
                            <td className="py-0.5 text-right text-on-surface-variant tabular-nums">{dma(r.ultima_saida)}</td>
                            <td className={`py-0.5 text-right tabular-nums ${r.ultima_saida && !r.proxima_saida ? 'text-danger' : 'text-on-surface-variant'}`}>
                              {r.proxima_saida ? dma(r.proxima_saida) : (r.ultima_saida ? 'sem próxima' : '—')}
                            </td>
                            <td className="py-0.5 text-right tabular-nums text-on-surface-variant">{r.na_fila}</td>
                            <td className="py-0.5 text-right tabular-nums text-on-surface-variant">{r.publicadas_7d}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-2 border-t border-outline/10 font-mono text-[9px] text-muted">
        crítico: menos de 3 dias de fôlego, peça que falhou hoje, ou rede que publicou e não tem próxima · atenção: menos de 7 dias, ou sem ritmo para medir
      </div>
    </section>
  );
}
