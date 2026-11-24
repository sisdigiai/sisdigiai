import { Target, Lock, AlertTriangle } from 'lucide-react';

// Fatos publicáveis — a fonte única de NÚMEROS que a IA do MKT pode citar.
//
// REFEITA EM 19/11, por ordem do dono ("levar o padrão das outras 2... fontes eu padronizaria"): era
// uma lista de 34 linhas iguais, misturando marca, validade e trava, ordenada por chave. Quem abria não
// via o que importa — **quantos números a IA pode usar hoje** — porque isso não estava escrito em lugar
// nenhum da tela.
//
// O QUE A FAIXA DE CIMA DIZ, e por que não é "frescos": o motor do MKT lê `fresco E público`. Fato
// fresco mas preso a um uso não chega ao prompt, e fato público mas vencido também não. Medido em
// 19/11: 34 existem, 12 estão frescos, 26 são públicos — e só **6** são citáveis. Mostrar "12 frescos"
// como se fosse o que a IA pode citar seria a tela mentindo com número certo.
//
// AS TRÊS RECUSAS:
//  · **trava aparece como trava.** Desde 19/11 há fatos presos a um uso (os seis do episódio 2 do
//    Pulso). Eles têm cadeado e dizem a que estão presos — um número que só vale num lugar, mostrado
//    como se valesse em todos, é o começo de um número solto numa peça.
//  · **marca sem nenhum fato citável leva aviso no grupo.** Silêncio por vencimento é invisível: a IA
//    simplesmente para de citar número e ninguém fica sabendo.
//  · **vencido não some da lista.** Ele fica, em vermelho, porque é trabalho a fazer — e some da
//    cabeça de quem lê se sumir da tela.

export type FatoMkt = {
  brand_slug: string | null;
  chave: string;
  fato: string;
  fonte: string;
  verificado_em: string;
  valido_ate: string;
  fresco: boolean;
  publico: boolean;
  uso_restrito?: string | null;
};

/** O que a máquina mediu hoje na fonte que o próprio fato declara. */
export type MedicaoFato = {
  chave: string;
  veredito: 'confirmado' | 'divergente' | 'fonte_inacessivel' | 'nao_verificavel' | string;
  valor_medido: string | number | null;
  detalhe: string | null;
  medido_em: string | null;
};

// Quatro vereditos, quatro coisas diferentes — e a diferença entre os dois últimos é a que custou
// 76 dias de cegueira: "a porta não abriu" estava escrito como "alguém precisa medir isso à mão".
const VEREDITO: Record<string, { rotulo: string; tom: string }> = {
  confirmado: { rotulo: 'a fonte confirma', tom: 'text-success' },
  divergente: { rotulo: 'a fonte diz outro número', tom: 'text-danger' },
  fonte_inacessivel: { rotulo: 'não deu para ler a fonte', tom: 'text-warning' },
  nao_verificavel: { rotulo: 'só gente mede essa fonte', tom: 'text-muted' },
};

type Estado = { rotulo: string; tom: string };

function estadoDo(f: FatoMkt): Estado {
  if (f.uso_restrito) return { rotulo: 'preso a um uso', tom: 'text-warning border-warning/40 bg-warning/10' };
  if (!f.publico) return { rotulo: 'interno', tom: 'text-muted border-outline/25' };
  if (!f.fresco) return { rotulo: 'vencido', tom: 'text-danger border-danger/40 bg-danger/10' };
  return { rotulo: 'citável', tom: 'text-success border-success/40 bg-success/10' };
}

const dia = (d: string | null) => (d ? new Date(d + 'T12:00:00').toLocaleDateString('pt-BR') : '—');

// O VEREDITO VEM COM HORA, E HORA TEM FUSO. `medido_em` é timestamptz: o verificador das 4h30 grava
// em UTC, e eu rodei a medição às 22h45 de 23/11 — a tela disse **24/11**, porque eu cortei os dez
// primeiros caracteres do ISO. É o mesmo defeito de fuso que esta casa já consertou duas vezes;
// achei na conferência da própria entrega. Data de dia se corta do ISO; data de instante se converte.
const diaBR = (iso: string | null) => (iso
  ? new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  : '—');

export default function FatosPublicaveis({ fatos, medicoes = [] }: { fatos: FatoMkt[]; medicoes?: MedicaoFato[] }) {
  const medicaoDe = new Map(medicoes.map((m) => [m.chave, m]));
  const citaveis = fatos.filter((f) => f.fresco && f.publico);
  const vencidos = fatos.filter((f) => f.publico && !f.fresco);
  const presos = fatos.filter((f) => !!f.uso_restrito);

  const marcas = [...new Set(fatos.map((f) => f.brand_slug ?? '(geral)'))]
    .sort((a, b) => fatos.filter((f) => (f.brand_slug ?? '(geral)') === b).length
                  - fatos.filter((f) => (f.brand_slug ?? '(geral)') === a).length);

  const kpis = [
    { l: 'fatos ativos', v: fatos.length, c: 'o que existe na tabela', tom: 'text-on-surface' },
    { l: 'citáveis hoje', v: citaveis.length, c: 'fresco E público — o que a IA recebe',
      tom: citaveis.length === 0 ? 'text-danger' : citaveis.length < 10 ? 'text-warning' : 'text-success' },
    { l: 'públicos mas vencidos', v: vencidos.length, c: 'a IA silencia o número', tom: vencidos.length ? 'text-warning' : 'text-on-surface' },
    { l: 'presos a um uso', v: presos.length, c: 'só valem onde a folha única disse', tom: 'text-on-surface' },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-px bg-outline/15 border border-outline/15">
        {kpis.map((k) => (
          <div key={k.l} className="bg-surface-container p-4">
            <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{k.l}</div>
            <div className={`font-serif text-3xl font-semibold tabular-nums mt-1 ${k.tom}`}>{k.v}</div>
            <div className="font-mono text-[9.5px] text-muted mt-0.5 leading-snug">{k.c}</div>
          </div>
        ))}
      </div>

      {vencidos.length > 0 && (
        <div className="border border-warning/30 bg-warning-bg/40 px-4 py-2.5 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
          <span className="text-[12.5px] text-on-surface-variant leading-snug">
            <strong className="text-on-surface">{vencidos.length} fatos públicos estão vencidos.</strong> Fato vencido
            não chega ao prompt do gerador: a IA fala do tema sem quantificar. Não quebra nada e não aparece em lugar
            nenhum — por isso está escrito aqui. Revalidar é curadoria, e a curadoria de <span className="font-mono">mkt.fatos</span> é do app digiai.
          </span>
        </div>
      )}

      {fatos.length === 0 ? (
        <div className="border border-outline/15 bg-surface-container p-4 text-sm text-muted italic">Nenhum fato cadastrado.</div>
      ) : marcas.map((marca) => {
        const doGrupo = fatos.filter((f) => (f.brand_slug ?? '(geral)') === marca);
        const citaveisGrupo = doGrupo.filter((f) => f.fresco && f.publico).length;
        return (
          <div key={marca}>
            <div className="flex items-center gap-3 mb-2 flex-wrap">
              <Target className="w-3.5 h-3.5 text-secondary" />
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">
                {marca} · {doGrupo.length} {doGrupo.length === 1 ? 'fato' : 'fatos'}
              </span>
              <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${
                citaveisGrupo === 0 ? 'text-danger border-danger/40 bg-danger/10' : 'text-success border-success/40 bg-success/10'}`}>
                {citaveisGrupo === 0 ? 'nenhum número citável hoje' : `${citaveisGrupo} citáveis`}
              </span>
              <span className="h-px flex-1 bg-outline/15" />
            </div>
            <div className="border border-outline/15 bg-surface-container divide-y divide-outline/10">
              {doGrupo.map((f) => {
                const e = estadoDo(f);
                return (
                  <div key={f.chave} className="px-4 py-2.5 flex items-start gap-3">
                    <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0 mt-0.5 ${e.tom}`}>
                      {e.rotulo}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] text-on-surface leading-snug">{f.fato}</div>
                      {f.uso_restrito && (
                        <div className="flex items-start gap-1.5 mt-1 text-[11px] text-warning leading-snug">
                          <Lock className="w-3 h-3 shrink-0 mt-0.5" />
                          <span>{f.uso_restrito}</span>
                        </div>
                      )}
                      <div className="text-[10px] font-mono text-muted mt-1 leading-snug">
                        verificado {dia(f.verificado_em)} · vale até {dia(f.valido_ate)} · {f.fonte}
                      </div>
                      {(() => {
                        const m = medicaoDe.get(f.chave);
                        if (!m) return null;
                        const v = VEREDITO[m.veredito] ?? { rotulo: m.veredito, tom: 'text-muted' };
                        return (
                          <div className={`text-[10px] font-mono mt-0.5 leading-snug ${v.tom}`} title={m.detalhe ?? ''}>
                            medido {diaBR(m.medido_em)}: {v.rotulo}
                            {m.valor_medido !== null && m.valor_medido !== undefined
                              ? ` — ${Number(m.valor_medido).toLocaleString('pt-BR')}` : ''}
                          </div>
                        );
                      })()}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <div className="font-mono text-[9.5px] text-muted">
        fonte: v_mkt_fatos · veredito diário: v_ops_fatos_verificados (verificar-fatos, 4h30) · o gerador do MKT lê fresco E público; qualquer outro estado é silêncio por construção
      </div>
    </div>
  );
}
