import { useEffect, useState } from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// O "coração da empresa" — palavra do dono em 18/11: por marca, o que está pronto e quanto tempo dura,
// "e já apareceria a parte fila baixa".
//
// Fôlego = pronto ÷ ritmo. O ritmo é o MEDIDO (o que saiu nos últimos 7 dias), e a conta aparece ao
// lado para quem ler poder conferi-la.
//
// DUAS RECUSAS:
//  · **marca sem ritmo não tem fôlego infinito, tem fôlego desconhecido.** Dividir por zero daria a
//    resposta mais perigosa possível: "tem estoque de sobra" para uma marca que simplesmente parou.
//  · **estoque por REDE não existe no dado.** A arte nasce com tipo (imagem, vídeo), não com rede —
//    ela só ganha rede quando é agendada. Repartir o estoque da marca entre as redes dela seria
//    inventar uma distribuição e chamá-la de medição.

type Linha = {
  marca: string; marca_nome: string; accent_hex: string | null;
  prontos: number; publicadas_7d: number; ritmo_medido: number;
  ritmo_de: string | null; dias_de_estoque: number | null;
};

const dias = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

export default function EstoquePorMarca() {
  const [linhas, setLinhas] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('v_mkt_estoque_marca').select('*').then(({ data, error }) => {
      if (error) { setErro(error.message); setLinhas([]); return; }
      const l = (data ?? []) as Linha[];
      // Quem tem menos fôlego primeiro; quem não tem ritmo vai para o fim, não para o topo — o alarme
      // é para quem publica e está a ficar sem, não para quem parou.
      setLinhas([...l].sort((a, b) => {
        if (a.dias_de_estoque == null) return 1;
        if (b.dias_de_estoque == null) return -1;
        return a.dias_de_estoque - b.dias_de_estoque;
      }));
    });
  }, []);

  const baixa = (l: Linha) => l.dias_de_estoque != null && l.publicadas_7d > 0 && l.dias_de_estoque < 7;

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Package className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">O que está pronto para publicar</span>
        <span className="font-mono text-[10px] text-muted">estoque ÷ ritmo dos últimos 7 dias = dias de fôlego</span>
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>Não consegui ler o estoque: {erro}.</span>
        </div>
      ) : linhas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-px bg-outline/10">
          {linhas.map((l) => (
            <div key={l.marca} className="bg-surface-container px-4 py-3 flex items-start gap-3">
              <span className="w-1 self-stretch shrink-0" style={{ background: l.accent_hex || 'var(--color-outline)' }} />
              <div className="min-w-0 flex-1">
                <div className="text-sm text-on-surface truncate">{l.marca_nome}</div>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <span className={`text-xl font-bold tabular-nums ${baixa(l) ? 'text-danger' : 'text-on-surface'}`}>
                    {dias(l.dias_de_estoque)}
                  </span>
                  <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
                    {l.dias_de_estoque == null ? 'sem ritmo' : 'dias de fôlego'}
                  </span>
                  {/* O alarme vem escrito, não só pintado. */}
                  {baixa(l) && <span className="font-mono text-[9px] uppercase tracking-wider text-danger">fila baixa</span>}
                </div>
                <div className="font-mono text-[9px] text-muted mt-0.5">
                  {l.prontos} pronta(s) · saíram {l.publicadas_7d} em 7 dias
                </div>
                {l.dias_de_estoque == null && (
                  <div className="font-mono text-[9px] text-muted">
                    não publicou nesta semana — sem ritmo, não dá para saber o fôlego
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="px-4 py-2 border-t border-outline/10 font-mono text-[9px] text-muted">
        o estoque é da marca, não da rede: a arte só ganha rede quando é agendada — repartir entre as redes seria inventar
      </div>
    </section>
  );
}
