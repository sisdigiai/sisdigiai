import { useEffect, useState } from 'react';
import { AlertTriangle, Target, Gauge, Rocket, History, Filter, Coins, Repeat, UserCheck, Scale } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Página Receita (migration 219; decisão do dono em 10/11/2026, R-051).
//
// Lugar único da meta de mais R$ 100 mil por mês de DINHEIRO NOVO. A página não traz dinheiro — é leitura.
// Por isso ela nasce enxuta e com uma regra acima de todas as outras:
//
// SEÇÃO SEM DADO DIZ "NÃO MEDIDO", COM O MOTIVO — e nunca mostra R$ 0.
// Zero e "ninguém mediu" pedem ações opostas: um manda correr atrás de venda, o outro manda ir medir.
// Foi por confundir os dois que esta casa já leu tela vazia como tranquilidade.
//
// O número nasce no banco (R-049): tudo que é conta mora nas views da 219; aqui só se formata.

interface Meta {
  mes: string; hoje: string; meta_brl: string | null; dinheiro_novo_brl: string;
  linhas_medidas: number; linhas_so_proposta: number; falta_brl: string | null;
  dias_restantes: number; ritmo_semanal_brl: string | null;
}
interface Linha {
  linha: number; mes: string; estado: string;
  entrada_bruta_brl: string; custo_para_trazer_brl: string; regua_brl: string; dinheiro_novo_brl: string;
  parte_relacionada: boolean; data_leitura: string; dias_desde_leitura: number; leitura_velha: boolean;
  fonte: string; medido_por: string; obs: string | null;
}
interface Alavanca {
  id: number; nome: string; linha: number; executor: string; inicio: string; dias_em_curso: number;
  margem_prevista_pct: string | null; dias_ate_primeiro_real: number | null; resultado_brl: string;
  estado: string; veredito: string | null; obs: string | null;
  nao_iniciada: boolean; zero_ha_tres_semanas: boolean;
}
interface Rotina {
  nome: string; descricao: string | null; hora: string | null; ligada: boolean;
  ultima_execucao: string | null; ultima_falha: string | null; detalhe_falha: string | null;
  ligada_sem_prova: boolean; sem_rodar_ha_2_dias: boolean;
}
interface RotinaCron {
  nome: string; agendamento: string; ativa: boolean; disparou_em: string | null;
  status_ultimo: string | null; execucoes: number;
}
interface Funil {
  leads: number; sem_nenhum_toque: number; com_algum_toque: number;
  captado: number; contatado: number; conversa: number; cliente: number; ultimo_toque_em: string | null;
}
interface Pendencia {
  agente: string; tipo: string; titulo: string | null; texto: string; data: string;
  nivel: number; dias_esperando: number;
}

const LINHAS = {
  1: 'Lojas com fonte nova',
  2: 'Clearix para outras óticas',
  3: 'Publicações',
} as const;

const brl = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '—'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

// Coluna `date` é dia, não instante. `new Date('2026-11-10')` vira meia-noite UTC e, lido em São Paulo,
// volta 09/11 — a tela mostrava a leitura de hoje como de ontem. Dia escrito se formata como texto.
const dia = (d: string | null) => {
  if (!d) return '—';
  const [a, m, j] = d.slice(0, 10).split('-');
  return `${j}/${m}/${a}`;
};
const quando = (d: string | null) =>
  d ? new Date(d).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' }) : '—';

export default function Receita() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [placar, setPlacar] = useState<Linha[] | null>(null);
  const [alavancas, setAlavancas] = useState<Alavanca[] | null>(null);
  const [rotinas, setRotinas] = useState<Rotina[] | null>(null);
  const [cron, setCron] = useState<RotinaCron[] | null>(null);
  const [funil, setFunil] = useState<Funil | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Cada leitura falha por conta própria: uma view que não responde não pode apagar as outras oito
    // seções da tela. O que não veio aparece como erro escrito, não como seção vazia.
    const pega = <T,>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>,
                      set: (v: T) => void, nome: string) =>
      p.then(({ data, error }) => {
        if (error) { setErro((e) => [e, `${nome}: ${error.message}`].filter(Boolean).join(' · ')); return; }
        set(data as T);
      });

    pega<Meta[]>(supabase.from('v_receita_meta').select('*'), (d) => setMeta(d[0] ?? null), 'meta');
    pega<Linha[]>(supabase.from('v_receita_placar').select('*').order('linha'), setPlacar, 'placar');
    pega<Alavanca[]>(supabase.from('v_receita_alavancas').select('*').order('inicio', { ascending: false }), setAlavancas, 'alavancas');
    pega<Rotina[]>(supabase.from('v_receita_rotinas').select('*').order('nome'), setRotinas, 'rotinas');
    pega<Funil[]>(supabase.from('v_receita_funil').select('*'), (d) => setFunil(d[0] ?? null), 'funil');
    pega<Pendencia[]>(supabase.from('v_receita_esperando_dono').select('*').order('nivel').order('dias_esperando', { ascending: false }), setPendencias, 'esperando o dono');
    pega<RotinaCron[]>(supabase.rpc('rpc_receita_rotinas_cron'), setCron, 'rotinas do cron');
  }, []);

  const mesCorrente = meta?.mes ?? null;
  const doMes = (placar ?? []).filter((l) => l.mes === mesCorrente);
  const medidas = doMes.filter((l) => l.estado === 'medido');
  const propostas = doMes.filter((l) => l.estado === 'proposta');
  const emCurso = (alavancas ?? []).filter((a) => a.estado === 'em_curso');
  const encerradas = (alavancas ?? []).filter((a) => a.estado !== 'em_curso');

  return (
    <div className="space-y-6">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Receita</div>
        <p className="mt-1 text-[13px] text-muted max-w-3xl">
          Lugar único da meta de dinheiro novo (R-051). O que está medido aparece como número; o que não
          está medido aparece dizendo isso. Esta página é leitura — quem traz dinheiro é o trabalho.
        </p>
      </div>

      {erro && (
        <div className="flex items-start gap-2 border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Parte da página não carregou — {erro}. O que falta abaixo está em falta por erro de leitura, não por ausência de dado.</span>
        </div>
      )}

      {/* 1 — A meta e o ritmo */}
      <Secao icone={<Target className="w-3.5 h-3.5" />} titulo="A meta e o ritmo">
        {!meta ? <Carregando /> : meta.meta_brl === null ? (
          <NaoMedido>
            O mês corrente não tem meta escrita em <code className="text-[11px]">receita.meta</code>. Sem meta,
            “quanto falta” e “ritmo por semana” não existem — e inventar um valor aqui seria pior que o vazio.
          </NaoMedido>
        ) : (
          <div className="grid md:grid-cols-4 gap-3">
            <div className="md:col-span-2 border border-outline/15 bg-surface-container p-4">
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted">Dinheiro novo medido neste mês</div>
              {meta.linhas_medidas === 0 ? (
                <>
                  <div className="font-serif text-2xl text-warning mt-1">sem leitura medida</div>
                  <div className="text-[12px] text-muted mt-1">
                    Nenhuma das três linhas tem leitura <strong className="font-normal">medida</strong> neste mês.
                    {meta.linhas_so_proposta > 0 && ` Há ${meta.linhas_so_proposta} leitura(s) em proposta — proposta não entra no placar.`}
                  </div>
                </>
              ) : (
                <>
                  <div className="font-serif text-3xl text-on-surface mt-1">{brl(meta.dinheiro_novo_brl)}</div>
                  <div className="text-[12px] text-muted mt-1">
                    de {brl(meta.meta_brl)} · {meta.linhas_medidas} linha(s) medida(s)
                  </div>
                </>
              )}
            </div>
            <Quadro rotulo="Falta" valor={meta.linhas_medidas === 0 ? brl(meta.meta_brl) : brl(meta.falta_brl)} />
            <Quadro rotulo="Dias restantes no mês" valor={String(meta.dias_restantes)}
                    nota={meta.ritmo_semanal_brl ? `ritmo necessário ${brl(meta.ritmo_semanal_brl)}/semana` : undefined} />
          </div>
        )}
      </Secao>

      {/* 2 — Placar das três linhas */}
      <Secao icone={<Gauge className="w-3.5 h-3.5" />} titulo="Placar das três linhas">
        <div className="border border-outline/15 bg-surface-container divide-y divide-outline/10">
          {[1, 2, 3].map((n) => {
            const m = medidas.find((l) => l.linha === n);
            const p = propostas.find((l) => l.linha === n);
            return (
              <div key={n} className="px-3 py-3">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-sm font-semibold text-on-surface">
                    {LINHAS[n as 1 | 2 | 3]}
                  </span>
                  <span className={`font-serif text-lg ${m ? 'text-on-surface' : 'text-warning'}`}>
                    {m ? brl(m.dinheiro_novo_brl) : 'não medido'}
                  </span>
                </div>
                {m ? (
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-1">
                    bruta {brl(m.entrada_bruta_brl)} · custo {brl(m.custo_para_trazer_brl)} · régua {brl(m.regua_brl)}
                    {' · '}leitura de {dia(m.data_leitura)} por {m.medido_por}
                    {m.parte_relacionada && ' · PARTE RELACIONADA (loja da casa)'}
                    {m.leitura_velha && <span className="text-warning"> · leitura com {m.dias_desde_leitura} dias</span>}
                  </div>
                ) : (
                  <div className="text-[12px] text-muted mt-1">
                    Nenhuma leitura <strong className="font-normal">medida</strong> deste mês.
                    {p && ` Há proposta de ${brl(p.dinheiro_novo_brl)} (${dia(p.data_leitura)}), que não entra no placar.`}
                  </div>
                )}
                {m?.fonte && <div className="text-[11px] text-muted mt-0.5 truncate">fonte: {m.fonte}</div>}
              </div>
            );
          })}
        </div>
      </Secao>

      {/* 3 — O que estamos fazendo */}
      <Secao icone={<Rocket className="w-3.5 h-3.5" />} titulo="O que estamos fazendo">
        {alavancas === null ? <Carregando /> : emCurso.length === 0 ? (
          <NaoMedido>
            Nenhuma alavanca em curso registrada. Enquanto o Agente de Receita não gravar
            (<code className="text-[11px]">rpc_receita_gravar_alavanca</code>), esta seção não tem o que mostrar
            — e “nenhuma registrada” não é o mesmo que “ninguém está fazendo nada”.
          </NaoMedido>
        ) : (
          <div className="border border-outline/15 bg-surface-container divide-y divide-outline/10">
            {emCurso.map((a) => (
              <div key={a.id} className="px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-sm text-on-surface">{a.nome}</span>
                  <span className={`font-serif text-sm ${Number(a.resultado_brl) > 0 ? 'text-success' : 'text-muted'}`}>
                    {brl(a.resultado_brl)}
                  </span>
                </div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-1">
                  linha {a.linha} · {a.executor}
                  {a.nao_iniciada ? ' · NÃO INICIADA' : ` · desde ${dia(a.inicio)} (${a.dias_em_curso} dias)`}
                  {a.margem_prevista_pct && ` · margem prevista ${a.margem_prevista_pct}%`}
                  {a.dias_ate_primeiro_real !== null && ` · 1.º real em ${a.dias_ate_primeiro_real} dias`}
                </div>
                {a.obs && <div className="text-[12px] text-muted mt-1">{a.obs}</div>}
                {a.zero_ha_tres_semanas && (
                  <div className="text-[12px] text-warning mt-1">
                    Três semanas em curso e R$ 0 — é a trava do mandato. Decisão do dono: continuar, mudar ou encerrar.
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </Secao>

      {/* 4 — O que já tentamos */}
      <Secao icone={<History className="w-3.5 h-3.5" />} titulo="O que já tentamos">
        {alavancas === null ? <Carregando /> : encerradas.length === 0 ? (
          <NaoMedido>Nenhuma alavanca encerrada ou congelada ainda. O histórico começa quando a primeira fechar, com o veredito escrito.</NaoMedido>
        ) : (
          <div className="border border-outline/15 bg-surface-container divide-y divide-outline/10">
            {encerradas.map((a) => (
              <div key={a.id} className="px-3 py-2.5">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-serif text-sm text-on-surface">{a.nome}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{a.estado}</span>
                </div>
                <div className="text-[12px] text-muted mt-1">{a.veredito ?? 'sem veredito escrito'}</div>
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-0.5">
                  linha {a.linha} · {dia(a.inicio)} · resultado {brl(a.resultado_brl)}
                </div>
              </div>
            ))}
          </div>
        )}
      </Secao>

      {/* 5 — Funil da venda do Clearix */}
      <Secao icone={<Filter className="w-3.5 h-3.5" />} titulo="Funil da venda do Clearix">
        {!funil ? <Carregando /> : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
              <Quadro rotulo="Leads" valor={String(funil.leads)} />
              <Quadro rotulo="Sem nenhum toque" valor={String(funil.sem_nenhum_toque)}
                      tom={funil.sem_nenhum_toque > 0 ? 'text-warning' : undefined} />
              <Quadro rotulo="Contatados" valor={String(funil.contatado)} />
              <Quadro rotulo="Em conversa" valor={String(funil.conversa)} />
              <Quadro rotulo="Clientes" valor={String(funil.cliente)} />
            </div>
            <p className="text-[12px] text-muted mt-2">
              Último toque registrado em qualquer lead: <strong className="font-normal">{quando(funil.ultimo_toque_em)}</strong>.
              {' '}Não há estágio “demo” nesta base — o que existe é o que está acima. Só contagem: a origem tem nome e telefone.
            </p>
          </>
        )}
      </Secao>

      {/* 6 — Quanto custa o esforço */}
      <Secao icone={<Coins className="w-3.5 h-3.5" />} titulo="Quanto custa o esforço">
        <NaoMedido>
          <strong className="font-normal">Não medido, e com três motivos escritos.</strong> (1) O custo de token
          e crédito do Agente de Receita não é gravado em lugar nenhum hoje — falta decidir quem grava.
          (2) Das 102 contas de serviço ativas, só 7 têm custo mensal declarado. (3) O resumo de custo da casa
          ainda soma dólar com real (<code className="text-[11px]">v_ops_cofre_resumo</code>), então pôr “custo
          contra ganho” aqui hoje daria um número errado com cara de certo.
        </NaoMedido>
      </Secao>

      {/* 7 — Rotinas */}
      <Secao icone={<Repeat className="w-3.5 h-3.5" />} titulo="Rotinas">
        <div className="flex items-start gap-2 border border-outline/20 bg-surface-container p-3 text-[12px] text-muted mb-2">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
          <span>
            <strong className="font-normal text-on-surface">“Disparou” não é “funcionou”.</strong> O agendador marca
            sucesso quando o comando SQL rodou — uma função que devolveu 401 entra como sucesso. Por isso a coluna
            abaixo diz <em>disparou</em>. Rotina que precise provar trabalho tem de gravar a própria execução
            (as de cima, em <code className="text-[11px]">receita.rotina</code>).
          </span>
        </div>

        {rotinas === null ? <Carregando /> : rotinas.length === 0 ? (
          <NaoMedido>
            Nenhuma rotina gravou a própria execução ainda. O que aparece abaixo é só o agendador — ele diz que
            disparou, não que o trabalho foi feito.
          </NaoMedido>
        ) : (
          <div className="border border-outline/15 bg-surface-container divide-y divide-outline/10 mb-2">
            {rotinas.map((r) => (
              <div key={r.nome} className="flex items-center gap-3 px-3 py-2">
                <div className="flex-1 min-w-0">
                  <span className="font-serif text-sm text-on-surface">{r.nome}</span>
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted block truncate">
                    {r.hora ?? 'sem hora'} · última execução {quando(r.ultima_execucao)}
                    {r.ultima_falha && ` · última falha ${quando(r.ultima_falha)}`}
                  </span>
                </div>
                <span className={`font-mono text-[9px] uppercase tracking-wider shrink-0 ${
                  !r.ligada ? 'text-danger' : r.ligada_sem_prova || r.sem_rodar_ha_2_dias ? 'text-warning' : 'text-success'}`}>
                  {!r.ligada ? 'não ligada'
                    : r.ligada_sem_prova ? 'ligada, sem prova de execução'
                    : r.sem_rodar_ha_2_dias ? 'sem rodar há 2 dias' : 'rodando'}
                </span>
              </div>
            ))}
          </div>
        )}

        {cron === null ? null : (
          <details className="border border-outline/15 bg-surface-container">
            <summary className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-muted cursor-pointer">
              agendador: {cron.length} rotina(s), {cron.filter((c) => c.ativa).length} ativa(s)
            </summary>
            <div className="divide-y divide-outline/10 border-t border-outline/10">
              {cron.map((c) => (
                <div key={c.nome} className="flex items-center gap-3 px-3 py-1.5">
                  <span className="flex-1 min-w-0 font-mono text-[10px] text-on-surface truncate">{c.nome}</span>
                  <span className="font-mono text-[9px] text-muted shrink-0">{c.agendamento}</span>
                  <span className="font-mono text-[9px] text-muted w-36 text-right shrink-0">
                    disparou {quando(c.disparou_em)}
                  </span>
                </div>
              ))}
            </div>
          </details>
        )}
      </Secao>

      {/* 8 — Esperando o dono */}
      <Secao icone={<UserCheck className="w-3.5 h-3.5" />} titulo="Esperando o dono">
        {pendencias === null ? <Carregando /> : pendencias.length === 0 ? (
          <NaoMedido>Nenhuma pendência do dono nos últimos 30 dias de estado de agente.</NaoMedido>
        ) : (
          <div className="border border-outline/15 bg-surface-container divide-y divide-outline/10">
            {pendencias.slice(0, 12).map((p, i) => (
              <div key={`${p.agente}-${i}`} className="px-3 py-2">
                <div className="font-mono text-[9px] uppercase tracking-wider text-muted">
                  {p.agente} · nível {p.nivel} · esperando há {p.dias_esperando} dia(s)
                </div>
                <div className="text-[13px] text-on-surface mt-0.5">{p.titulo ?? p.texto}</div>
              </div>
            ))}
            {pendencias.length > 12 && (
              <div className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-muted">
                e mais {pendencias.length - 12} na tela Controle
              </div>
            )}
          </div>
        )}
      </Secao>

      {/* 9 — Veredito mensal dos apps */}
      <Secao icone={<Scale className="w-3.5 h-3.5" />} titulo="Veredito mensal dos apps">
        <NaoMedido>
          Não medido: não existe fonte para “gera · sustenta quem gera · não gera” por app. O veredito é
          julgamento escrito, não conta automática — quando o Agente de Receita o escrever, ele aparece aqui
          com a data. Até lá, esta seção fica vazia de propósito.
        </NaoMedido>
      </Secao>
    </div>
  );
}

function Secao({ icone, titulo, children }: { icone: React.ReactNode; titulo: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="flex items-center gap-3 mb-2">
        <span className="text-secondary">{icone}</span>
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{titulo}</span>
        <span className="h-px flex-1 bg-outline/15" />
      </div>
      {children}
    </section>
  );
}

function NaoMedido({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 border border-outline/20 bg-surface-container p-3 text-[13px] text-muted">
      <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
      <span>{children}</span>
    </div>
  );
}

function Carregando() {
  return <div className="border border-outline/15 bg-surface-container p-3 font-mono text-[10px] uppercase tracking-wider text-muted">lendo…</div>;
}

function Quadro({ rotulo, valor, nota, tom }: { rotulo: string; valor: string; nota?: string; tom?: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container p-3">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted">{rotulo}</div>
      <div className={`font-serif text-xl mt-0.5 ${tom ?? 'text-on-surface'}`}>{valor}</div>
      {nota && <div className="font-mono text-[9px] uppercase tracking-wider text-muted mt-0.5">{nota}</div>}
    </div>
  );
}
