import { useEffect, useState } from 'react';
import { Lightbulb } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { lerTudo } from '../../lib/paginar';
import { rotuloJanela, type Periodo } from './Central';

// "Leituras para escolher" — o bloco de insights que o dono pediu em 18/11: "e insights, fazer as
// melhores escolhas e etc".
//
// REGRA POR REGRA, CALCULADA DO DADO. Sem IA: a do MKT está pausada, e uma leitura que depende de
// alguém ligar um motor não é leitura, é promessa. Cada uma tem quatro partes, e as quatro são
// obrigatórias: **o fato com número e período**, **a base** (de quantas peças ou dias saiu), **a
// escolha que sugere** e **com quem está**.
//
// O QUE ESTE BLOCO SE RECUSA A FAZER:
//  · **sugerir em cima de base curta.** Menos de 4 peças ou dias: mostra o fato, não sugere nada.
//    Conselho com base de 2 é palpite com cara de método.
//  · **inventar leitura para encher.** Se nenhuma regra tiver base, o bloco diz que ainda não há o
//    que ler — em vez de mostrar a menos ruim como se fosse achado.
//  · **mandar tarefa ao dono.** O que é conserto de agente vai ao Controle de quem resolve; aqui só
//    fica o que é escolha dele.

type Leitura = {
  fato: string; base: string; escolha: string | null; comQuem: string; peso: number;
};

type Estoque = { marca_nome: string; na_fila: number; artes_prontas: number; publicadas_7d: number; dias_de_estoque: number | null; dias_marcados: number; dias_biblioteca: number | null };
type Pont = { marca: string; rede: string; pontualidade: string; dia: string };
type Dia = { dia: string; elo: string; medida: string; n: number };

const DIAS_DE = (p: Periodo) => (p === 'tudo' ? null : Number(p));
const diaBRT = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

export default function Leituras({ periodo }: { periodo: Periodo }) {
  const [estoque, setEstoque] = useState<Estoque[] | null>(null);
  const [pont, setPont] = useState<Pont[] | null>(null);
  const [cadeia, setCadeia] = useState<Dia[] | null>(null);

  useEffect(() => {
    supabase.from('v_mkt_estoque_marca').select('marca_nome, na_fila, artes_prontas, publicadas_7d, dias_de_estoque, dias_marcados, dias_biblioteca')
      .then(({ data }) => setEstoque((data ?? []) as Estoque[]));
    lerTudo<Dia>((de, ate) => supabase.from('v_marketing_cadeia_dia')
      .select('dia, elo, medida, n').order('dia').order('elo').order('medida').range(de, ate)).then(setCadeia);
  }, []);

  useEffect(() => {
    const dias = DIAS_DE(periodo);
    const corte = dias ? diaBRT(new Date(Date.now() - dias * 86400000)) : null;
    lerTudo<Pont>((de, ate) => {
      const q = supabase.from('v_pontualidade').select('marca, rede, pontualidade, dia')
        .order('dia').order('marca').order('rede').order('saiu_em').order('minutos').range(de, ate);
      return corte ? q.gte('dia', corte) : q;
    }).then(setPont);
  }, [periodo]);

  const pronto = estoque != null && pont != null && cadeia != null;
  const leituras: Leitura[] = [];

  if (pronto) {
    // 1. A marca com menos fôlego, entre as que publicam.
    const comRitmo = estoque.filter((e) => e.dias_de_estoque != null && e.publicadas_7d > 0);
    const pior = [...comRitmo].sort((a, b) => a.dias_de_estoque! - b.dias_de_estoque!)[0];
    if (pior) {
      leituras.push({
        fato: `${pior.marca_nome} tem ${pior.dias_de_estoque!.toLocaleString('pt-BR')} dias de fôlego: ${pior.dias_marcados} já na agenda e ${(pior.dias_biblioteca ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} de biblioteca, para um ritmo de ${pior.publicadas_7d} por semana.`,
        base: `${pior.publicadas_7d} publicações nos últimos 7 dias`,
        // "Agendar" só resolve se a biblioteca AGUENTAR. A OSI tinha 5 artes — que no ritmo dela são
        // 2,7 dias: agendar as cinco adia o problema por dois dias e meio e chama isso de solução.
        // Biblioteca curta pede produzir, mesmo havendo arte pronta.
        escolha: pior.dias_de_estoque! < 7
          ? ((pior.dias_biblioteca ?? 0) >= 7
              ? `Agendar: a biblioteca desta marca tem ${pior.artes_prontas} artes, que dão ${(pior.dias_biblioteca ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias no ritmo dela.`
              : `Produzir para esta marca antes das outras: a biblioteca tem ${pior.artes_prontas} arte${pior.artes_prontas === 1 ? '' : 's'}, que dão só ${(pior.dias_biblioteca ?? 0).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} dias.`)
          : null,
        comQuem: 'MKT (produção)',
        peso: pior.dias_de_estoque! < 7 ? 100 : 40,
      });
    }

    // 2. Onde mais atrasa — marca e rede.
    const atrasos = pont.filter((p) => p.pontualidade === 'atrasada');
    const porChave = new Map<string, number>();
    for (const a of atrasos) porChave.set(`${a.marca} · ${a.rede}`, (porChave.get(`${a.marca} · ${a.rede}`) ?? 0) + 1);
    const top = [...porChave.entries()].sort((a, b) => b[1] - a[1])[0];
    if (top && pont.length >= 4) {
      const pct = Math.round((atrasos.length / pont.length) * 100);
      leituras.push({
        fato: `${pct}% das peças saíram fora do horário em ${rotuloJanela(periodo)}, por data de publicação (${atrasos.length} de ${pont.length}); onde mais atrasa é ${top[0]}, com ${top[1]}.`,
        base: `${pont.length} peças com hora marcada e hora real`,
        escolha: top[1] >= 4 ? `Olhar a rodada de ${top[0]}: atraso concentrado numa conta é quase sempre o motor, não a agenda.` : null,
        comQuem: 'o motor da origem',
        peso: 80,
      });
    }

    // 3. O gargalo da cadeia: onde o número mais cai de um passo para o seguinte.
    const dias = DIAS_DE(periodo);
    const corte = dias ? diaBRT(new Date(Date.now() - dias * 86400000)) : '0000-01-01';
    const soma = (elo: string, medida: string) =>
      cadeia.filter((l) => l.elo === elo && l.medida === medida && l.dia > corte)
            .reduce((a, l) => a + Number(l.n), 0);
    const passos: Array<[string, number, string, number]> = [
      ['produzir', soma('produzir', 'publicacoes'), 'captar', soma('captar', 'leads')],
      ['prospectar', soma('prospectar', 'disparos'), 'vender', soma('vender', 'vendas')],
    ];
    for (const [de, nDe, para, nPara] of passos) {
      if (nDe >= 4) {
        leituras.push({
          fato: `De ${de} para ${para}: ${nDe.toLocaleString('pt-BR')} → ${nPara.toLocaleString('pt-BR')} em ${rotuloJanela(periodo)}.`,
          base: `${nDe.toLocaleString('pt-BR')} no primeiro passo`,
          escolha: nPara === 0
            ? `Nenhum resultado no passo seguinte. Ou o caminho entre os dois não existe, ou não está medido — e as duas coisas pedem conserto, não mais volume.`
            : null,
          comQuem: para === 'vender' ? 'Receita' : 'MKT',
          peso: nPara === 0 ? 90 : 30,
        });
      }
    }
  }

  const mostrar = leituras.sort((a, b) => b.peso - a.peso).slice(0, 5);

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Lightbulb className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Leituras para escolher</span>
        <span className="font-mono text-[10px] text-muted">calculadas do dado, sem IA · base curta não sugere nada</span>
      </div>

      {!pronto ? (
        <div className="px-4 py-3 text-sm text-muted">Lendo…</div>
      ) : mostrar.length === 0 ? (
        /* Melhor dizer que não há o que ler do que mostrar a menos ruim como se fosse achado. */
        <div className="px-4 py-3 text-sm text-on-surface-variant">
          Ainda não há leitura com base suficiente neste período.
        </div>
      ) : (
        <div className="divide-y divide-outline/10">
          {mostrar.map((l, i) => (
            <div key={i} className="px-4 py-3">
              <div className="text-sm text-on-surface leading-snug">{l.fato}</div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-1">
                base: {l.base} · com {l.comQuem}
              </div>
              {l.escolha ? (
                <div className="text-[12px] text-secondary mt-1 leading-snug">→ {l.escolha}</div>
              ) : (
                <div className="font-mono text-[9px] text-muted mt-1">sem sugestão: o número não pede decisão ainda</div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
