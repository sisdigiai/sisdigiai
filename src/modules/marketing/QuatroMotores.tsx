import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { espelhoMotoresEstado, type PulsoDia, type PulsoLongoDia, type LimePubDia, type EstadoEspelho } from '../../lib/espelhoMotores';

// Os quatro motores na mesma régua — pedido do dono em 18/11, 15h37: "4 motores, aparece 2 somente e
// deveria aparecer 4, correto?". Correto: o MKT e o DIGIAI Cortes faltavam.
//
// A RÉGUA É A MESMA PARA OS QUATRO, e por isso cada célula vazia tem de dizer o que é:
//   · **"sem custo medido"** não é custo zero. O Cortes ainda não manda o custo em reais (a coluna
//     existe desde hoje, migration 243, e espera o número dele).
//   · **"não publica direto"** não é zero views. O Cortes entrega ao MKT, e as views das peças dele
//     aparecem no motor que publicou — contá-las aqui também seria contar duas vezes.
//   · **"só para admin do MKT"** não é custo zero: é falta de acesso.
//
// Custo por mil views só aparece quando as DUAS pontas existem. Dividir um custo conhecido por views
// que não existem dá um número grande e falso, e é o tipo de número que decide errado uma comparação.

type Linha = {
  motor: string;
  pecas: number | null; pecasNota?: string;
  views: number | null; viewsNota?: string;
  custo: number | null; custoNota?: string;
};

const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const brl = (v: number) => `R$ ${v.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`;
const diaBRT = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export default function QuatroMotores() {
  const [analytics, setAnalytics] = useState<Array<{ origem: string; peca_ref: string; views: number | null }> | null>(null);
  const [cortes, setCortes] = useState<{ pecas: number; custo: number | null } | null>(null);
  const [pulso, setPulso] = useState<{ linhas: PulsoDia[]; estado: EstadoEspelho } | null>(null);
  const [longos, setLongos] = useState<{ linhas: PulsoLongoDia[]; estado: EstadoEspelho } | null>(null);
  const [lime, setLime] = useState<{ linhas: LimePubDia[]; estado: EstadoEspelho } | null>(null);

  useEffect(() => {
    const desde = diaBRT(new Date(Date.now() - 7 * 86400000));
    supabase.from('v_mkt_analytics_peca_dia').select('origem, peca_ref, views').gte('data', desde)
      .then(({ data }) => setAnalytics((data ?? []) as never));
    supabase.from('v_cortes_pecas').select('id').then(({ data, error }) => {
      if (error) { setCortes(null); return; }
      supabase.from('v_cortes_episodios').select('custo_brl').then(({ data: eps }) => {
        const medidos = (eps ?? []).filter((e: { custo_brl: number | null }) => e.custo_brl != null);
        setCortes({
          pecas: (data ?? []).length,
          custo: medidos.length ? medidos.reduce((a: number, e: { custo_brl: number | null }) => a + Number(e.custo_brl), 0) : null,
        });
      });
    });
    espelhoMotoresEstado.pulsoDias().then(setPulso);
    espelhoMotoresEstado.pulsoLongosDias().then(setLongos);
    espelhoMotoresEstado.limelightPubDias().then(setLime);
  }, []);

  const corte = diaBRT(new Date(Date.now() - 7 * 86400000));
  const janela = <T extends { dia: string }>(l: T[] | undefined) => (l ?? []).filter((x) => x.dia >= corte);

  // ESPELHO PARADO NÃO É MOTOR PARADO. O espelho do Limelight é legível e tem 153 dias de história,
  // mas o dia mais novo é 06/11 — doze dias atrás. Somar a janela de 7 dias dá ZERO, e zero aqui diria
  // "não publicou nada" quando a verdade é "ninguém mediu desde 06/11". As duas coisas pedem ações
  // opostas: uma é falar com o motor, a outra é consertar a coleta.
  const parado = (l: Array<{ dia: string }> | undefined) => {
    const novo = (l ?? []).map((x) => x.dia).sort().at(-1);
    return !novo || novo < corte ? novo ?? null : null;
  };
  const limeParado = lime ? parado(lime.linhas) : null;
  const pulsoParado = pulso ? parado([...(pulso.linhas ?? []), ...(longos?.linhas ?? [])]) : null;
  const dataCurta = (d: string) => d.slice(8, 10) + '/' + d.slice(5, 7);
  const somar = <T extends { views?: number; publicacoes?: number }>(l: T[], c: 'views' | 'publicacoes') =>
    l.reduce((a, x) => a + Number(x[c] ?? 0), 0);

  const porOrigem = (o: string) => {
    const l = (analytics ?? []).filter((x) => x.origem === o);
    return { pecas: new Set(l.map((x) => x.peca_ref)).size, views: l.reduce((a, x) => a + Number(x.views ?? 0), 0) };
  };

  const pulsoCanais = janela(pulso?.linhas);
  const pulsoLongos = janela(longos?.linhas);
  const limePub = janela(lime?.linhas);
  const mkt = porOrigem('mkt');

  const linhas: Linha[] = [
    { motor: 'DIGIAI MKT', pecas: analytics ? mkt.pecas : null, views: analytics ? mkt.views : null,
      custo: null, custoNota: 'só para admin do MKT' },
    { motor: 'DIGIAI Cortes', pecas: cortes?.pecas ?? null, pecasNota: 'entregues, não publicadas',
      views: null, viewsNota: 'não publica direto: sai pelo MKT',
      custo: cortes?.custo ?? null, custoNota: cortes && cortes.custo == null ? 'sem custo medido' : undefined },
    { motor: 'Limelight',
      pecas: limeParado ? null : (lime ? somar(limePub, 'publicacoes') : null),
      pecasNota: limeParado ? `espelho parado em ${dataCurta(limeParado)}` : undefined,
      views: limeParado ? null : (lime ? somar(limePub, 'views') : null),
      viewsNota: limeParado ? 'sem medição no período' : undefined,
      custo: null, custoNota: 'não vem no espelho' },
    { motor: 'Pulso',
      pecas: pulsoParado ? null : (pulso ? somar(pulsoCanais, 'publicacoes') + somar(pulsoLongos, 'publicacoes') : null),
      pecasNota: pulsoParado ? `espelho parado em ${dataCurta(pulsoParado)}` : undefined,
      views: pulsoParado ? null : (pulso ? somar(pulsoCanais, 'views') + somar(pulsoLongos, 'views') : null),
      viewsNota: pulsoParado ? 'sem medição no período' : undefined,
      custo: null, custoNota: 'não vem no espelho' },
  ];

  const Celula = ({ v, nota, fmt }: { v: number | null; nota?: string; fmt?: (x: number) => string }) => (
    <td className="px-4 py-1.5 text-right">
      {v == null
        ? <span className="font-mono text-[10px] text-muted">{nota ?? 'sem dado'}</span>
        : <span className="tabular-nums text-on-surface">{(fmt ?? n)(v)}{nota && <span className="font-mono text-[9px] text-muted"> {nota}</span>}</span>}
    </td>
  );

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Cpu className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Os quatro motores, na mesma régua</span>
        <span className="font-mono text-[10px] text-muted">últimos 7 dias</span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline/10">
              {['Motor', 'Peças', 'Views', 'Custo', 'Custo / mil views'].map((h, i) => (
                <th key={h} className={`font-mono text-[9px] uppercase tracking-widest text-muted px-4 py-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {linhas.map((l) => (
              <tr key={l.motor} className="border-b border-outline/5 last:border-b-0">
                <td className="px-4 py-1.5 text-on-surface">{l.motor}</td>
                <Celula v={l.pecas} nota={l.pecasNota} />
                <Celula v={l.views} nota={l.viewsNota} />
                <Celula v={l.custo} nota={l.custoNota} fmt={brl} />
                {/* Só com as duas pontas. Custo conhecido dividido por views que não existem dá um
                    número grande e falso — e é exatamente o número que decidiria errado a comparação. */}
                <td className="px-4 py-1.5 text-right">
                  {l.custo != null && l.views ? (
                    <span className="tabular-nums text-on-surface">{brl((l.custo / l.views) * 1000)}</span>
                  ) : (
                    <span className="font-mono text-[10px] text-muted">
                      {l.custo == null ? 'falta o custo' : 'faltam as views'}
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="px-4 py-2 border-t border-outline/10 font-mono text-[9px] text-muted">
        célula vazia diz o que falta: "sem custo medido" não é custo zero, "não publica direto" não é zero views e "espelho parado" não é motor parado
      </div>
    </section>
  );
}
