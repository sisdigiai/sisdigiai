import { useEffect, useMemo, useState } from 'react';
import { CalendarClock, Target, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { resumoPola } from '../../lib/espelhoMotores';

// Controle por marca — ordem do dono em 18/11: primeiro o conteúdo (15h37, "publicado, pronto e em
// nível crítico"), depois a forma (16h31, "pode deixar os modelos de cards iguais? olha os cards das
// marcas e traz para o nosso publicações, com todas as informações, não é mudança de dados somente
// visual para ficar iguais").
//
// ELE PAROU A OBRA PARA DIZER ISSO, e tinha razão: eu tinha entregue linhas e tabela onde a casa usa
// cartão. Este componente usa **o cartão da aba Marcas** — as mesmas classes, a mesma grade de 340px,
// os mesmos brackets, a mesma faixa de quatro caixas —, e só troca o que vai dentro de cada parte:
//
//   logo e nome em serifa      → iguais
//   linha debaixo do nome      → o motivo do nível, por extenso
//   selo do canto              → o nível (ok · atenção · crítico)
//   as quatro caixas           → hoje · 7 dias · na fila · fôlego
//   linha do calendário        → agenda até <data> · biblioteca: N artes
//   linha do alvo              → última saída
//   etiquetas das redes        → as redes, cada uma com o seu estado
//   canto de baixo             → há quanto tempo saiu a última
//
// O CRITÉRIO DO NÍVEL FICA AQUI, NÃO NO BANCO, e o motivo vai escrito ao lado — alarme sem motivo é
// alarme que ninguém sabe desligar. Crítico: fôlego abaixo de 3 dias · peça que falhou hoje · rede
// **ativa** parada (saiu nos últimos 14 dias e está há 3 ou mais sem sair). Atenção: fôlego abaixo de
// 7 dias, ou marca sem ritmo para medir.
//
// Duas versões anteriores deste critério alarmaram o funcionamento normal — "rede sem próxima
// marcada" punha 4 de 8 marcas em crítico, porque marca agendada no próprio dia nunca tem próxima.
// Alarme que dispara para o normal ensina a ignorar alarme.

type Rede = {
  marca: string; rede: string; publicadas_7d: number; publicadas_hoje: number;
  ultima_saida: string | null; na_fila: number; proxima_saida: string | null;
  ultima_marcada: string | null; falhou_hoje: number; dias_sem_sair: number | null;
};
type Marca = {
  marca: string; marca_nome: string; accent_hex: string | null; logo_url: string | null;
  dias_de_estoque: number | null; dias_marcados: number; dias_biblioteca: number | null;
  artes_prontas: number; publicadas_7d: number; na_fila: number; ultima_marcada: string | null;
  tem_movimento: boolean;
};

type Resumo = Awaited<ReturnType<typeof resumoPola>>;

const PARADA_DESDE = 3;
const INATIVA_DEPOIS = 30;

const dma = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(new Date(iso)) : '—';
const dia = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', day: '2-digit', month: '2-digit' }).format(new Date(iso)) : '—';
const n1 = (v: number | null) => (v == null ? '—' : v.toLocaleString('pt-BR', { maximumFractionDigits: 1 }));

/** "há 4h" do canto do cartão, igual ao da aba Marcas. */
function relativo(iso: string | null): string {
  if (!iso) return 'nunca';
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3600000);
  if (h < 1) return 'agora há pouco';
  if (h < 24) return `há ${h}h`;
  return `há ${Math.floor(h / 24)}d`;
}

type Nivel = { nome: 'crítico' | 'atenção' | 'ok' | 'sem dado'; motivo: string; ordem: number; tom: string };

function nivelDa(m: Marca, redes: Rede[], pola?: Resumo | null): Nivel {
  // A Polá não passa pelo MKT nem pela Lousa: o que se sabe dela vem do espelho do app dela. Enquanto
  // o banco dela estiver bloqueado, a tela diz ISSO — e não "não publicou", que seria outra coisa.
  if (m.marca === 'polapetit' && pola) {
    if (pola.estado === 'ok') {
      return { nome: 'ok', motivo: pola.frase, ordem: 2, tom: 'text-success border-success/40 bg-success/10' };
    }
    return { nome: 'sem dado', motivo: pola.frase, ordem: 3, tom: 'text-muted border-outline/30' };
  }

  // Marca que não publica pela casa não é "atenção" nem "ok": não há o que medir. Dizer qualquer um
  // dos dois seria inventar um estado. O dono contou os cartões e viu 8 onde há 9 — a que faltava
  // tinha sido filtrada por mim justamente por não ter dado, e **sumir é pior que aparecer vazia**.
  if (!m.tem_movimento) {
    return { nome: 'sem dado', motivo: 'ainda não publica pela casa; nenhum dado chega', ordem: 3,
             tom: 'text-muted border-outline/30' };
  }

  const motivos: string[] = [];
  const falhas = redes.reduce((a, r) => a + r.falhou_hoje, 0);
  // Rede ATIVA parada. Rede sem sair há mais de 30 dias é rede que a casa não usa, e tratá-la como
  // urgência todo dia ensina a ignorar o alarme.
  const paradas = redes.filter((r) => r.dias_sem_sair != null
    && r.dias_sem_sair >= PARADA_DESDE && r.dias_sem_sair <= INATIVA_DEPOIS);

  if (falhas > 0) motivos.push(`${falhas} ${falhas === 1 ? 'peça falhou' : 'peças falharam'} hoje`);
  if (m.dias_de_estoque != null && m.dias_de_estoque < 3) motivos.push(`fôlego de ${n1(m.dias_de_estoque)} dias`);
  if (paradas.length > 0) motivos.push(paradas.map((r) => `${r.rede} parado há ${r.dias_sem_sair} dias`).join(' · '));
  if (motivos.length > 0) return { nome: 'crítico', motivo: motivos.join(' · '), ordem: 0, tom: 'text-danger border-danger/40 bg-danger/10' };

  if (m.dias_de_estoque != null && m.dias_de_estoque < 7) {
    return { nome: 'atenção', motivo: `fôlego de ${n1(m.dias_de_estoque)} dias`, ordem: 1, tom: 'text-warning border-warning/40 bg-warning/10' };
  }
  // Marca sem ritmo não é "ok": é marca de que não se sabe nada. Dizer ok seria aprovar o escuro.
  if (m.dias_de_estoque == null) {
    return { nome: 'atenção', motivo: 'não publicou nesta semana — sem ritmo, não dá para medir o fôlego', ordem: 1, tom: 'text-warning border-warning/40 bg-warning/10' };
  }
  return { nome: 'ok', motivo: 'em dia', ordem: 2, tom: 'text-success border-success/40 bg-success/10' };
}

function estadoDaRede(r: Rede) {
  if (r.dias_sem_sair == null) return { txt: 'nunca saiu', tom: 'text-muted' };
  if (r.dias_sem_sair > INATIVA_DEPOIS) return { txt: `inativa há ${r.dias_sem_sair}d`, tom: 'text-muted' };
  if (r.dias_sem_sair >= PARADA_DESDE) return { txt: `parada há ${r.dias_sem_sair}d`, tom: 'text-danger' };
  return { txt: 'em dia', tom: 'text-success' };
}

export default function ControlePorMarca() {
  const [redes, setRedes] = useState<Rede[] | null>(null);
  const [marcas, setMarcas] = useState<Marca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [pola, setPola] = useState<Resumo | null>(null);

  useEffect(() => { resumoPola().then(setPola); }, []);

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
      .map((m) => ({ m, redes: redes.filter((x) => x.marca === m.marca), nivel: nivelDa(m, redes.filter((x) => x.marca === m.marca), pola) }))
      .sort((a, b) => a.nivel.ordem - b.nivel.ordem || (a.m.dias_de_estoque ?? 1e9) - (b.m.dias_de_estoque ?? 1e9));
  }, [redes, marcas, pola]);

  if (erro) {
    return (
      <div className="border border-outline/15 bg-surface-container px-4 py-3 text-sm text-danger flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /><span>Não consegui ler o controle: {erro}.</span>
      </div>
    );
  }
  if (cartoes == null) return <div className="text-sm text-muted py-6">Carregando o controle…</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-4">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Controle por marca ({cartoes.length})</span>
        <span className="h-px flex-1 bg-outline/15" />
      </div>
      {/* A MESMA grade do cartão da aba Marcas: 340px mínimo, preenchendo a linha. */}
      <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))' }}>
        {cartoes.map(({ m, redes: rs, nivel }) => {
          const cor = m.accent_hex || 'var(--color-secondary)';
          const ultima = rs.map((r) => r.ultima_saida).filter(Boolean).sort().at(-1) ?? null;
          const hoje = rs.reduce((a, r) => a + r.publicadas_hoje, 0);
          return (
            <div key={m.marca} className="relative border border-outline/15 bg-surface-container p-5 pt-6">
              {/* brackets — gramática Geometric Precision, iguais aos da aba Marcas */}
              <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: cor }} />
              <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-outline/40" />

              {/* identidade */}
              <div className="flex items-start gap-3">
                <div className="w-12 h-12 flex items-center justify-center overflow-hidden shrink-0 font-mono font-bold text-sm" style={{ background: `color-mix(in srgb, ${cor} 18%, transparent)`, color: cor }}>
                  {m.logo_url
                    ? <img src={m.logo_url} alt="" className="w-12 h-12 object-cover" />
                    : m.marca_nome.slice(0, 2).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-serif text-lg font-semibold text-on-surface leading-tight truncate">{m.marca_nome}</div>
                  {/* onde a aba Marcas põe o objetivo, aqui vai o motivo do nível, por extenso */}
                  <div className="text-[11px] text-muted leading-snug line-clamp-2 mt-0.5">{nivel.motivo}</div>
                </div>
                <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0 ${nivel.tom}`}>
                  {nivel.nome}
                </span>
              </div>

              {/* as quatro caixas, no lugar do pipeline da marca */}
              <div className="mt-4 grid grid-cols-4 divide-x divide-outline/10 border border-outline/10 bg-surface-lowest">
                {/* Sem movimento, travessão em todas: zero aqui fingiria medição. */}
                {[
                  { label: 'hoje', v: m.tem_movimento ? String(hoje) : '—' },
                  { label: '7 dias', v: m.tem_movimento ? String(m.publicadas_7d) : '—' },
                  { label: 'na fila', v: m.tem_movimento ? String(m.na_fila) : '—' },
                  { label: 'fôlego', v: m.dias_de_estoque == null ? '—' : n1(m.dias_de_estoque) },
                ].map((k) => (
                  <div key={k.label} className="py-2 text-center">
                    <div className="font-serif text-base font-semibold tabular-nums text-on-surface">{k.v}</div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-muted">{k.label}</div>
                  </div>
                ))}
              </div>

              {/* pronto e publicado, nas duas linhas de ícone da aba Marcas */}
              <div className="mt-3 space-y-1.5">
                <div className="flex items-center gap-1.5 font-mono text-[10px] text-on-surface-variant">
                  <CalendarClock className="w-3 h-3 text-muted shrink-0" />
                  {!m.tem_movimento ? 'nenhuma agenda nem biblioteca' : m.ultima_marcada ? `agenda até ${dia(m.ultima_marcada)}` : 'sem agenda marcada'}
                  {' · '}biblioteca: {m.artes_prontas} {m.artes_prontas === 1 ? 'arte' : 'artes'}
                  {m.dias_biblioteca != null && ` (${n1(m.dias_biblioteca)}d)`}
                </div>
                <div className="flex items-start gap-1.5 text-[10px] text-muted">
                  <Target className="w-3 h-3 shrink-0 mt-px" />
                  <span className="truncate">última saída {dma(ultima)}</span>
                </div>
              </div>

              {/* etiquetas das redes, cada uma com o seu estado dito por palavra */}
              <div className="mt-3 pt-3 border-t border-outline/10 flex items-center gap-1.5 flex-wrap">
                {rs.map((r) => {
                  const e = estadoDaRede(r);
                  return (
                    <span key={r.rede} className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 bg-surface-high text-on-surface-variant">
                      {r.rede} <span className={e.tom}>· {e.txt}</span>
                    </span>
                  );
                })}
                {rs.length === 0 && <span className="font-mono text-[9px] text-muted">nenhuma rede com movimento</span>}
                <span className="ml-auto font-mono text-[9px] text-muted">{relativo(ultima)}</span>
              </div>

              {/* o detalhe por rede continua, dentro do cartão e na letra pequena dele */}
              {rs.length > 0 && (
                <div className="mt-2 overflow-x-auto">
                  <table className="w-full text-[10px]">
                    <thead>
                      <tr>
                        {['rede', 'última', 'próxima', 'fila', '7d'].map((h, i) => (
                          <th key={h} className={`font-mono text-[8px] uppercase tracking-widest text-muted pb-0.5 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {[...rs].sort((a, b) => b.publicadas_7d - a.publicadas_7d).map((r) => (
                        <tr key={r.rede} className="border-t border-outline/5">
                          <td className="py-0.5 text-on-surface-variant">{r.rede}</td>
                          <td className="py-0.5 text-right tabular-nums text-muted">{dma(r.ultima_saida)}</td>
                          {/* "sem próxima" é informação, não alarme: há marcas agendadas no próprio dia. */}
                          <td className="py-0.5 text-right tabular-nums text-muted">{r.proxima_saida ? dma(r.proxima_saida) : 'sem próxima'}</td>
                          <td className="py-0.5 text-right tabular-nums text-muted">{r.na_fila}</td>
                          <td className="py-0.5 text-right tabular-nums text-muted">{r.publicadas_7d}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-3 font-mono text-[9px] text-muted leading-relaxed">
        crítico: menos de 3 dias de fôlego · peça que falhou hoje · rede ativa parada (saiu nos últimos 14 dias e está há 3 ou mais sem sair)<br />
        atenção: menos de 7 dias de fôlego, ou sem ritmo para medir · rede sem sair há mais de 30 dias é inativa, não alarme
      </div>
    </div>
  );
}
