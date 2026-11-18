import { useEffect, useMemo, useState } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Periodo } from './Central';

// "Hoje sai" e a pontualidade — ordem do dono em 17 e 18/11: "saiu no horário o vídeo, saiu o rascunho
// normal". A Lousa mostra o que está MARCADO; este bloco mostra o que SAIU, e se saiu na hora.
//
// O que ele recusa fazer, e cada recusa nasceu de uma medição:
//  · **sem as duas horas não há pontualidade.** Peça sem hora marcada não é pontual nem atrasada.
//  · **janela de dois lados (±15 min).** Com a regra de um lado só, as 9 peças do MKT que saíram
//    ADIANTADAS apareceriam como pontuais, e as duas do Kwai que saíram 22h antes também.
//  · **passou da hora ≠ falhou.** Uma ainda pode sair hoje; a outra precisa de alguém agora.
//  · **cancelada não é falha.**

type Peca = {
  conta: string; conta_nome: string | null; marca: string; rede: string; tipo: string;
  quando: string | null; estado: string; titulo: string | null; publicador: string;
  saiu_em: string | null; saiu_por: string | null; erro: string | null;
};
type Pont = { origem: string; marca: string; rede: string; dia: string; minutos: number; pontualidade: string; saiu_por: string | null };

const diaBRT = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const horaBRT = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' }).format(new Date(iso));

const JA_SAIU = ['publicado'];
// Rascunho NÃO é peça que vai sair sozinha: é peça entregue para alguém publicar à mão. Contá-la em
// "passou da hora" acusa o motor de um atraso que não é dele, e esconde o que é da pessoa.
const AINDA_SAI = ['agendado', 'planejado', 'no_planner'];
const RASCUNHO = ['rascunho'];

export default function HojeSai({ periodo }: { periodo: Periodo }) {
  const [pecas, setPecas] = useState<Peca[] | null>(null);
  const [pont, setPont] = useState<Pont[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    const hoje = diaBRT(new Date());
    supabase.from('v_lousa').select('*')
      .gte('quando', `${hoje}T00:00:00-03:00`).lt('quando', `${hoje}T23:59:59-03:00`).limit(500)
      .then(({ data, error }) => {
        if (error) { setErro(error.message); setPecas([]); return; }
        setPecas((data ?? []) as Peca[]);
      });
  }, []);

  useEffect(() => {
    const dias = periodo === 'tudo' ? null : Number(periodo);
    let q = supabase.from('v_pontualidade').select('origem, marca, rede, dia, minutos, pontualidade, saiu_por').limit(5000);
    if (dias) q = q.gte('dia', diaBRT(new Date(Date.now() - dias * 86400000)));
    q.then(({ data }) => setPont((data ?? []) as Pont[]));
  }, [periodo]);

  const agora = Date.now();
  const grupos = useMemo(() => {
    const l = pecas ?? [];
    const passou = (p: Peca) => p.quando != null && new Date(p.quando).getTime() < agora;
    return {
      saiu: l.filter((p) => JA_SAIU.includes(p.estado)),
      porSair: l.filter((p) => AINDA_SAI.includes(p.estado) && !passou(p)),
      passouDaHora: l.filter((p) => AINDA_SAI.includes(p.estado) && passou(p)),
      rascunho: l.filter((p) => RASCUNHO.includes(p.estado)),
      falhou: l.filter((p) => p.estado === 'falhou'),
      cancelado: l.filter((p) => p.estado === 'cancelado'),
    };
  }, [pecas, agora]);

  const resumo = useMemo(() => {
    const l = pont ?? [];
    const c = (q: string) => l.filter((x) => x.pontualidade === q).length;
    const atrasadas = l.filter((x) => x.pontualidade === 'atrasada');
    const porChave = new Map<string, number>();
    for (const a of atrasadas) {
      const k = `${a.marca} · ${a.rede}`;
      porChave.set(k, (porChave.get(k) ?? 0) + 1);
    }
    const pior = [...porChave.entries()].sort((a, b) => b[1] - a[1])[0];
    return { total: l.length, noHorario: c('no horario'), atrasadas: c('atrasada'), adiantadas: c('adiantada'), pior };
  }, [pont]);

  const Coluna = ({ titulo, lista, tom, nota }: { titulo: string; lista: Peca[]; tom: string; nota?: string }) => (
    <div className="px-4 py-3">
      <div className={`font-mono text-[9px] uppercase tracking-widest ${tom}`}>{titulo}</div>
      <div className="text-xl font-bold tabular-nums text-on-surface">{lista.length}</div>
      {nota && <div className="font-mono text-[9px] text-muted">{nota}</div>}
      <div className="mt-1.5 space-y-1">
        {lista.slice(0, 4).map((p, i) => (
          <div key={i} className="text-[11px] text-on-surface-variant leading-tight truncate">
            <span className="font-mono text-muted">{p.quando ? horaBRT(p.quando) : '--:--'}</span>{' '}
            {/* Marca primeiro: "oticalancastersuzano" é o endereço da conta, não o nome que a casa usa. */}
            {p.marca} · {p.rede}
            {p.saiu_por === 'mao' && <span className="text-secondary"> · à mão</span>}
          </div>
        ))}
        {lista.length > 4 && <div className="font-mono text-[9px] text-muted">e mais {lista.length - 4}</div>}
      </div>
    </div>
  );

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Clock className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Hoje sai</span>
        <span className="font-mono text-[10px] text-muted">
          {pecas == null ? 'lendo…' : `${pecas.length} peça(s) marcadas para hoje`}
        </span>
        {grupos.cancelado.length > 0 && (
          <span className="font-mono text-[10px] text-muted">· {grupos.cancelado.length} cancelada(s), fora da conta</span>
        )}
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>Não consegui ler a agenda de hoje: {erro}.</span>
        </div>
      ) : pecas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
      ) : pecas.length === 0 ? (
        <div className="px-4 py-3 text-sm text-on-surface-variant">Nada marcado para hoje.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-outline/10">
          <Coluna titulo="já saiu" lista={grupos.saiu} tom="text-success" />
          <Coluna titulo="falhou" lista={grupos.falhou} tom="text-danger" nota="não saiu" />
          <Coluna titulo="por sair" lista={grupos.porSair} tom="text-secondary" />
          {/* Passou da hora e falhou são colunas diferentes de propósito: a primeira ainda pode sair
              hoje, a segunda precisa de alguém agora. Somá-las esconderia qual é qual. */}
          <Coluna titulo="passou da hora" lista={grupos.passouDaHora} tom="text-warning" nota="ainda pode sair" />
          <Coluna titulo="à mão" lista={grupos.rascunho} tom="text-secondary" nota="entregue para publicar" />
        </div>
      )}

      {/* Pontualidade do período — a pergunta do dono: "saiu no horário o vídeo?" */}
      <div className="px-4 py-2.5 border-t border-outline/10 flex flex-wrap items-baseline gap-x-4 gap-y-1 text-xs">
        <span className="font-mono text-[9px] uppercase tracking-widest text-muted">
          pontualidade {periodo === 'tudo' ? 'de sempre' : `· ${periodo} dias`}
        </span>
        {pont == null ? (
          <span className="text-muted">lendo…</span>
        ) : resumo.total === 0 ? (
          <span className="text-on-surface-variant">Nenhuma peça com hora marcada <strong>e</strong> hora real no período — <span className="text-muted">sem as duas, não há pontualidade.</span></span>
        ) : (
          <>
            <span><strong className="text-on-surface tabular-nums">{Math.round((resumo.noHorario / resumo.total) * 100)}%</strong> no horário</span>
            <span className="text-on-surface-variant">{resumo.noHorario} de {resumo.total} peças</span>
            {resumo.atrasadas > 0 && <span className="text-danger">{resumo.atrasadas} atrasada(s)</span>}
            {/* Adiantada tem nome próprio: sair um dia antes não é cumprir a agenda. */}
            {resumo.adiantadas > 0 && <span className="text-warning">{resumo.adiantadas} adiantada(s)</span>}
            {resumo.pior && <span className="text-muted">onde mais atrasa: {resumo.pior[0]} ({resumo.pior[1]})</span>}
            <span className="text-muted">tolerância de 15 min, para os dois lados</span>
          </>
        )}
      </div>
    </section>
  );
}
