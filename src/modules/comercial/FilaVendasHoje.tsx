import { useEffect, useState } from 'react';
import { MessageSquare, Clock, PhoneOff, ExternalLink, AlertTriangle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { supabase } from '../../lib/supabase';

// Fila de vendas do dia — contrato do MKT `public.v_mkt_vendas_hoje` (20260914_01).
// Até 15/09/2026 só aparecia no /vendas do MKT, que saiu quando o dono decidiu "vendas no digiai":
// desde então ninguém via quem precisava de gente hoje. A conversa em si continua no MKT
// (/conversas, operação); aqui fica o que falta fazer e a contagem.

type OQue = 'resposta_sem_tratar' | 'sla_vencido' | 'opt_out';
type Item = { o_que: OQue; lead_id: string | null; empresa: string | null; etapa: string | null; horas: number | null; texto: string | null };

const CONVERSAS_URL = 'https://mkt.digiai.app.br/conversas';
const MOSTRAR = 10;

const GRUPOS: { id: OQue; titulo: string; porque: string; icon: LucideIcon; cor: string }[] = [
  // primeiro de propósito: a pessoa levantou a mão e está esperando
  { id: 'resposta_sem_tratar', titulo: 'Responderam e ninguém voltou', porque: 'A pessoa respondeu e não houve mensagem nossa depois.', icon: MessageSquare, cor: 'text-danger' },
  { id: 'sla_vencido', titulo: 'Toque prometido venceu', porque: 'Passou da hora marcada para voltar a falar. Fica aqui até alguém agir.', icon: Clock, cor: 'text-warning' },
  { id: 'opt_out', titulo: 'Pediram para sair', porque: 'Para ser visto, não tratado: opt-out que ninguém enxerga é opt-out que alguém desfaz sem querer.', icon: PhoneOff, cor: 'text-muted' },
];

export default function FilaVendasHoje() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [conversas, setConversas] = useState<{ total: number; aguardam: number } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('v_mkt_vendas_hoje').select('o_que, lead_id, empresa, etapa, horas, texto').order('horas', { ascending: false })
      .then(({ data, error }) => {
        if (error) { setErro(error.message); setItens([]); return; }
        setItens((data ?? []) as Item[]);
      });
    supabase.from('v_mkt_vendas_conversas').select('aguarda_nos')
      .then(({ data, error }) => {
        if (error) return; // a contagem é secundária; a fila acima já diz se a leitura falhou
        const linhas = (data ?? []) as { aguarda_nos: boolean | null }[];
        setConversas({ total: linhas.length, aguardam: linhas.filter((l) => l.aguarda_nos).length });
      });
  }, []);

  const total = itens?.filter((i) => i.o_que !== 'opt_out').length ?? 0;

  return (
    <section className="border border-outline/15 bg-surface-container mb-5">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Clock className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Fila de vendas do dia</span>
        {itens && !erro && <span className="font-mono text-[10px] text-muted tabular-nums">{total} precisam de gente</span>}
        <a href={CONVERSAS_URL} target="_blank" rel="noreferrer"
          className="ml-auto inline-flex items-center gap-1 text-xs text-secondary hover:underline">
          {conversas ? `${conversas.total} conversas · ${conversas.aguardam} aguardam resposta nossa` : 'Conversas'}
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      {itens == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando a fila…</div>
      ) : erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não consegui ler a fila: {erro}. Isto não é "fila vazia".</span>
        </div>
      ) : itens.length === 0 ? (
        <div className="px-4 py-3 text-sm text-on-surface-variant">Nada pendente hoje.</div>
      ) : (
        <div className="divide-y divide-outline/10">
          {GRUPOS.map((g) => {
            const lista = itens.filter((i) => i.o_que === g.id);
            if (lista.length === 0) return null;
            const Icon = g.icon;
            return (
              <div key={g.id} className="px-4 py-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-on-surface">
                  <Icon className={`w-4 h-4 ${g.cor}`} /> {g.titulo}
                  <span className="font-normal text-muted tabular-nums">· {lista.length}</span>
                </div>
                <p className="text-xs text-muted mt-0.5">{g.porque}</p>
                <ul className="mt-2 space-y-1">
                  {lista.slice(0, MOSTRAR).map((i, n) => (
                    <li key={`${i.lead_id ?? 'sem'}-${n}`} className="flex flex-wrap items-baseline gap-x-3 text-sm">
                      <span className="text-on-surface">{i.empresa ?? '—'}</span>
                      {i.etapa && <span className="font-mono text-[9px] uppercase text-muted">{i.etapa}</span>}
                      {i.horas != null && <span className="font-mono text-[10px] text-muted tabular-nums">há {i.horas}h</span>}
                      {i.texto && <span className="text-xs italic text-on-surface-variant truncate max-w-full">“{i.texto}”</span>}
                    </li>
                  ))}
                </ul>
                {lista.length > MOSTRAR && (
                  <a href={CONVERSAS_URL} target="_blank" rel="noreferrer" className="text-xs text-secondary hover:underline mt-1 inline-block">
                    +{lista.length - MOSTRAR} — ver todas nas Conversas
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}
