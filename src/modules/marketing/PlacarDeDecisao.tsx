import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// O placar de decisão — a faixa de quatro números que abre a aba Resultado.
//
// POR QUE ELA EXISTE: o dono, 19/11: "muita informação embolada". A aba abria com o placar do mês e
// descia por nove faixas de largura inteira; para chegar ao número que decide era preciso rolar quatro
// telas. Esta faixa põe na primeira linha os quatro números que mandam, e o resto vira cartão.
//
// A ESCOLHA DOS QUATRO, e ela não é estética:
//  1. **pedido de rota** — alguém pedindo o caminho da loja. É o que há de mais perto de dinheiro aqui.
//  2. **ligação** — alguém ligando. Mesma razão, em volume menor.
//  3. **peças publicadas em 7 dias** — esforço. Fica ao lado do resultado de propósito: os dois juntos
//     são a única comparação honesta que esta página sabe fazer hoje.
//  4. **interação mediana** — a verdade desconfortável do tamanho atual. Mediana, nunca média.
//
// DUAS RECUSAS:
//  · **este número não aparece duas vezes na mesma tela.** O cartão do Google perdeu a linha de totais
//    quando esta faixa nasceu: dois lugares com o mesmo número em nomes diferentes fazem desconfiar
//    dos dois (foi o que aconteceu com a cadeia antiga, achado em 18/11).
//  · **a semana que está correndo entra na soma e é dita**, porque somar oito semanas e esconder que a
//    última tem dois dias é inflar a régua do período anterior sem avisar.

type Semana = { semana: string; rotas: number | null; ligacoes: number | null; semana_completa: boolean };
type Peca = { engajamento: number | null; engajamento_confiavel: boolean };

const n = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR'));

function mediana(xs: number[]): number | null {
  if (!xs.length) return null;
  const o = [...xs].sort((a, b) => a - b);
  const m = Math.floor(o.length / 2);
  return o.length % 2 ? o[m] : Math.round((o[m - 1] + o[m]) / 2);
}

export default function PlacarDeDecisao({ pecas7d }: { pecas7d: number | null }) {
  const [sem, setSem] = useState<Semana[] | null>(null);
  const [interacao, setInteracao] = useState<{ v: number | null; base: number } | null>(null);

  useEffect(() => {
    supabase.from('v_mkt_negocio_semana').select('semana, rotas, ligacoes, semana_completa')
      .order('semana', { ascending: false }).limit(400)
      .then(({ data }) => setSem((data ?? []) as Semana[]));
    // a mediana de interação sai das peças com leitura confiável: engajamento zero só conta quando
    // outra métrica provou que a peça foi lida (o coletor sempre escreve número, mesmo sem ler nada).
    supabase.from('v_mkt_resultado_peca').select('engajamento, engajamento_confiavel').limit(3000)
      .then(({ data }) => {
        const l = (data ?? []) as Peca[];
        const vs = l.filter((p) => p.engajamento_confiavel && p.engajamento != null).map((p) => Number(p.engajamento));
        setInteracao({ v: mediana(vs), base: vs.length });
      });
  }, []);

  const semanas = [...new Set((sem ?? []).map((s) => s.semana))].sort().reverse().slice(0, 8);
  const noPeriodo = (sem ?? []).filter((s) => semanas.includes(s.semana));
  const rotas = sem ? noPeriodo.reduce((a, s) => a + (s.rotas ?? 0), 0) : null;
  const ligacoes = sem ? noPeriodo.reduce((a, s) => a + (s.ligacoes ?? 0), 0) : null;
  const correndo = noPeriodo.some((s) => !s.semana_completa);

  const itens = [
    { l: 'pedidos de rota · 8 semanas', v: n(rotas), c: 'gente pedindo o caminho da loja', bom: (rotas ?? 0) > 0 },
    { l: 'ligações · 8 semanas', v: n(ligacoes), c: 'o mais perto de dinheiro nesta página' },
    { l: 'peças publicadas · 7 dias', v: n(pecas7d), c: 'esforço, não resultado' },
    {
      l: 'interação mediana',
      v: interacao ? n(interacao.v) : '—',
      c: interacao ? `base de ${interacao.base} peças com leitura confiável` : 'calculando…',
      atencao: interacao?.v === 0,
    },
  ];

  return (
    <div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-outline/15 border border-outline/15">
        {itens.map((k) => (
          <div key={k.l} className="bg-surface-container p-4">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{k.l}</div>
            <div className={`font-serif text-3xl font-semibold tabular-nums mt-1 ${
              k.atencao ? 'text-warning' : k.bom ? 'text-success' : 'text-on-surface'}`}>{k.v}</div>
            <div className="font-mono text-[9.5px] text-muted mt-0.5 leading-snug">{k.c}</div>
          </div>
        ))}
      </div>
      {correndo && (
        <div className="font-mono text-[9.5px] text-muted mt-1.5">
          a semana que está correndo entra nesta soma com os dias que já tem · o cartão do Google abaixo marca qual é
        </div>
      )}
    </div>
  );
}
