import { useEffect, useState } from 'react';
import { Cpu } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  espelhoMotores, espelhoMotoresEstado,
  type PulsoDia, type PulsoLongoDia, type LimePubDia, type EstadoEspelho,
  type EspelhoLimelight, type EspelhoPulso,
} from '../../lib/espelhoMotores';
import type { Periodo } from './Central';

// Os quatro motores na mesma régua — pedido do dono em 18/11, 15h37: "4 motores, aparece 2 somente e
// deveria aparecer 4, correto?". Correto: o MKT e o DIGIAI Cortes faltavam.
//
// DUAS COISAS QUE EU ERREI AQUI E CORRIGI NO MESMO DIA, as duas sobre o significado de um número:
//
//  1. **"Espelho parado em 06/11"** — era falso. A view do Limelight agrupa pelo dia em que a PEÇA foi
//     publicada, não pelo dia da medição; o "dia mais novo" dela é a última peça que saiu, e a coleta
//     dele rodou hoje (408 leituras). Eu li a data como se fosse de medição e acusei de parada uma
//     coleta viva. Ele próprio me corrigiu.
//  2. **Peças do MKT vinham da analytics filtrada por `data`**, que é o dia da MEDIÇÃO: dava 222 peças
//     em 7 dias enquanto a cadeia dizia 150 publicadas. Dois números com o mesmo nome na mesma página.
//     Agora as peças de todos os motores saem da mesma fonte da Lousa: publicadas no período.
//
// E A ARMADILHA QUE FICA, dita na tela em vez de escondida: **"views no período" não quer dizer a mesma
// coisa nos quatro**. Nos espelhos é "views das peças publicadas no período" — motor que não publicou
// esta semana aparece com zero mesmo ganhando audiência. A medida comparável (views GANHAS por dia de
// leitura) foi pedida ao Limelight em 18/11; enquanto não existir, a coluna diz o que é.

type Linha = {
  motor: string;
  pecas: number | null; pecasNota?: string;
  views: number | null; viewsNota?: string;
  custo: string | null; custoNota?: string;
};

const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const diaBRT = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export default function QuatroMotores({ periodo }: { periodo: Periodo }) {
  const dias = periodo === 'tudo' ? null : Number(periodo);
  const [pecasPorMarca, setPecas] = useState<Array<{ origem: string; publicador: string }> | null>(null);
  const [viewsMkt, setViewsMkt] = useState<number | null>(null);
  const [cortes, setCortes] = useState<{ pecas: number; custo: number | null } | null>(null);
  const [pulsoDias, setPulsoDias] = useState<{ linhas: PulsoDia[]; estado: EstadoEspelho } | null>(null);
  const [longos, setLongos] = useState<{ linhas: PulsoLongoDia[]; estado: EstadoEspelho } | null>(null);
  const [limeDias, setLimeDias] = useState<{ linhas: LimePubDia[]; estado: EstadoEspelho } | null>(null);
  const [lime, setLime] = useState<EspelhoLimelight | null>(null);
  const [pulso, setPulso] = useState<EspelhoPulso | null>(null);

  useEffect(() => {
    const corte = dias ? diaBRT(new Date(Date.now() - dias * 86400000)) : '0000-01-01';
    // Peças publicadas no período, da MESMA fonte para todos: a Lousa. Antes o MKT vinha da analytics
    // por dia de medição e dava 222 contra as 150 da cadeia, na mesma página.
    supabase.from('v_lousa').select('origem, publicador').eq('estado', 'publicado')
      .gte('quando', `${corte}T00:00:00-03:00`).limit(5000)
      .then(({ data }) => setPecas((data ?? []) as never));
    supabase.from('v_mkt_analytics_peca_dia').select('views').gte('data', corte).limit(5000)
      .then(({ data }) => setViewsMkt((data ?? []).reduce((a: number, x: { views: number | null }) => a + Number(x.views ?? 0), 0)));
    supabase.from('v_cortes_pecas').select('id').then(({ data }) => {
      supabase.from('v_cortes_episodios').select('custo_brl').then(({ data: eps }) => {
        const medidos = (eps ?? []).filter((e: { custo_brl: number | null }) => e.custo_brl != null);
        setCortes({ pecas: (data ?? []).length,
          custo: medidos.length ? medidos.reduce((a: number, e: { custo_brl: number | null }) => a + Number(e.custo_brl), 0) : null });
      });
    });
    espelhoMotoresEstado.pulsoDias().then(setPulsoDias);
    espelhoMotoresEstado.pulsoLongosDias().then(setLongos);
    espelhoMotoresEstado.limelightPubDias().then(setLimeDias);
    espelhoMotores.limelight().then(setLime);
    espelhoMotores.pulso().then(setPulso);
  }, [periodo]);

  const corte = dias ? diaBRT(new Date(Date.now() - dias * 86400000)) : '0000-01-01';
  const janela = <T extends { dia: string }>(l: T[] | undefined) => (l ?? []).filter((x) => x.dia >= corte);
  const somar = <T extends Record<string, unknown>>(l: T[], c: string) =>
    l.reduce((a, x) => a + Number((x[c] as number) ?? 0), 0);
  const daLousa = (origem: string) => (pecasPorMarca ?? []).filter((p) => p.origem === origem).length;

  const limeJanela = janela(limeDias?.linhas);
  const pulsoJanela = [...janela(pulsoDias?.linhas), ...janela(longos?.linhas)];

  const linhas: Linha[] = [
    { motor: 'DIGIAI MKT',
      pecas: pecasPorMarca ? daLousa('mkt') : null,
      views: viewsMkt,
      custo: null, custoNota: 'só para admin do MKT' },
    { motor: 'DIGIAI Cortes',
      pecas: cortes?.pecas ?? null, pecasNota: 'entregues, não publicadas',
      views: null, viewsNota: 'não publica direto: sai pelo MKT',
      custo: cortes?.custo != null ? `R$ ${n(cortes.custo)}` : null,
      custoNota: cortes && cortes.custo == null ? 'sem custo medido' : undefined },
    { motor: 'Limelight',
      pecas: limeDias ? somar(limeJanela, 'publicacoes') : null,
      views: limeDias ? somar(limeJanela, 'views') : null,
      viewsNota: limeDias && somar(limeJanela, 'publicacoes') === 0 ? 'não publicou no período' : undefined,
      custo: lime?.custo_ia_usd != null ? `US$ ${lime.custo_ia_usd.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}` : null,
      custoNota: lime?.custo_ia_usd != null ? 'total, desde o início' : 'não vem no espelho' },
    { motor: 'Pulso',
      pecas: pulsoDias ? somar(pulsoJanela, 'publicacoes') : null,
      views: pulsoDias ? somar(pulsoJanela, 'views') : null,
      custo: pulso?.custo_caixa_total_brl != null ? `R$ ${n(pulso.custo_caixa_total_brl)}` : null,
      custoNota: pulso?.custo_caixa_total_brl != null ? 'caixa, total desde o início' : 'não vem no espelho' },
  ];

  const Celula = ({ v, nota }: { v: number | null; nota?: string }) => (
    <td className="px-4 py-1.5 text-right">
      {v == null
        ? <span className="font-mono text-[10px] text-muted">{nota ?? 'sem dado'}</span>
        : <span className="tabular-nums text-on-surface">{n(v)}{nota && <span className="font-mono text-[9px] text-muted"> {nota}</span>}</span>}
    </td>
  );

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Cpu className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Os quatro motores, na mesma régua</span>
        <span className="font-mono text-[10px] text-muted">
          peças e views: {periodo === 'tudo' ? 'desde o início' : `últimos ${periodo} dias`} · custo: total
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-outline/10">
              {['Motor', 'Peças publicadas', 'Views', 'Custo'].map((h, i) => (
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
                <td className="px-4 py-1.5 text-right">
                  {l.custo == null
                    ? <span className="font-mono text-[10px] text-muted">{l.custoNota ?? 'sem dado'}</span>
                    : <span className="tabular-nums text-on-surface">{l.custo}<span className="font-mono text-[9px] text-muted"> {l.custoNota}</span></span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {/* Custo por mil views NÃO aparece: o custo é total e as views são do período. Dividir um pelo
          outro daria um número com cara de eficiência e nenhuma. Entra quando houver custo por período. */}
      <div className="px-4 py-2 border-t border-outline/10 font-mono text-[9px] text-muted leading-relaxed">
        "views" não quer dizer o mesmo nos quatro: nos espelhos são as views das peças <strong>publicadas no período</strong>, então motor que não publicou aparece com zero mesmo ganhando audiência (pedida ao Limelight a medida comparável, views ganhas por dia).<br />
        custo por mil views não aparece porque o custo é total e as views são do período — dividir um pelo outro daria eficiência inventada.
      </div>
    </section>
  );
}
