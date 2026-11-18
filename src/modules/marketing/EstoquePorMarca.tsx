import { useEffect, useState } from 'react';
import { Package, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// O "coração da empresa" — palavra do dono em 18/11: por marca, o que está pronto e quanto tempo dura,
// "e já apareceria a parte fila baixa".
//
// Fôlego responde a uma pergunta só: **se ninguém fizer nada, até quando esta marca continua saindo?**
// São duas parcelas somadas, e cada uma pede uma ação diferente:
//   · **dias marcados** — até quando já há data na agenda. Acaba, alguém tem de AGENDAR.
//   · **dias de biblioteca** — arte pronta ÷ ritmo. Acaba, alguém tem de PRODUZIR.
//
// Esta conta errou duas vezes hoje, nos dois sentidos, e as duas foram apanhadas antes do dono:
//   1. medindo só a biblioteca, dizia "Bastidores, 0 dias" com 157 peças na fila deles;
//   2. medindo só a fila, dizia "Lancaster, 0,2 dia, fila baixa" — e fila curta na Lancaster é o
//      NORMAL: o motor agenda-a 3,5 h antes de sair (mediana de 119 jobs), tirando da biblioteca.
// Nenhuma das duas metades, sozinha, responde à pergunta.
//
// DUAS RECUSAS:
//  · **marca sem ritmo não tem fôlego infinito, tem fôlego desconhecido.** Dividir por zero daria a
//    resposta mais perigosa possível: "tem estoque de sobra" para uma marca que simplesmente parou.
//  · **estoque por REDE não existe no dado.** A arte nasce com tipo (imagem, vídeo), não com rede —
//    ela só ganha rede quando é agendada. Repartir o estoque da marca entre as redes dela seria
//    inventar uma distribuição e chamá-la de medição.

type Linha = {
  marca: string; marca_nome: string; accent_hex: string | null;
  na_fila: number; artes_prontas: number; publicadas_7d: number; ritmo_medido: number;
  ritmo_de: string | null; dias_de_estoque: number | null; ultima_marcada: string | null;
  dias_marcados: number; dias_biblioteca: number | null;
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
        <span className="font-mono text-[10px] text-muted">até quando a marca continua saindo se ninguém fizer nada</span>
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
                  {l.dias_marcados} dia(s) já marcados + {(l.dias_biblioteca ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de biblioteca
                </div>
                <div className="font-mono text-[9px] text-muted">
                  {l.na_fila} na fila · {l.artes_prontas} arte(s) pronta(s) · saíram {l.publicadas_7d} em 7 dias
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
fôlego = dias já marcados na agenda + biblioteca pronta ÷ ritmo · fila curta não é alarme por si: a Lancaster é agendada 3,5 h antes de sair, por desenho do motor
      </div>
    </section>
  );
}
