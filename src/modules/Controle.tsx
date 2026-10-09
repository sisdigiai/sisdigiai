import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Check, CircleHelp, Inbox, Lightbulb, RotateCcw, UserCheck } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Página Controle (migration 194; pedido do Geral em 09/10, aprovado pelo dono).
//
// Junta o estado escrito por cada agente (`Cockpit/sessoes/<data>-<agente>.md`) e a lista de decisões do
// dono. A carga é do Geral (`Cockpit/scripts/controle-sync.mjs`, via Management API); aqui só se lê.
//
// A DECISÃO MAIS IMPORTANTE DESTA TELA É O ESTADO VAZIO. Numa página de controle, "0 riscos" e "a carga não
// rodou" são a mesma tela se ninguém separar — e a primeira leitura tranquiliza quando deveria alarmar.
// Então: sem nenhum item no banco, a tela diz que NÃO SABE, com o que falta acontecer. Só diz "nenhum risco"
// quando há itens carregados e nenhum deles é risco.
//
// A ordem (risco, depois pendente do dono) vem da view, não daqui: regra de leitura em uma fonte só.
// O texto vem de arquivo escrito por outro agente — é dado, e a tela o renderiza como texto.

interface Item {
  id: number; origem: string; agente: string; tipo: string;
  titulo: string | null; texto: string; data: string;
  numero: number | null; estado: string | null;
  risco_data: string | null; ordem_tipo: number; risco_no_prazo_hoje: boolean;
  nivel: number;
  resolvido: boolean; resolvido_em: string | null; nota_resolucao: string | null;
}

// Nível do problema (195, ordem do dono em 09/10): 1 = dinheiro, dado exposto ou prazo <= 7 dias;
// 2 = risco sem data ou pendência que trava venda/agente; 3 = o resto. Quem classifica é o gerador do
// Geral; aqui só se agrupa. Nível 1 em cima, e dentro do nível a ordem que já existia (risco primeiro).
const NIVEL = {
  1: { rotulo: 'Nível 1 · dinheiro, dado exposto ou prazo em 7 dias', cor: 'border-danger/40' },
  2: { rotulo: 'Nível 2 · risco sem data, ou o que trava venda e agente', cor: 'border-warning/30' },
  3: { rotulo: 'Nível 3 · o resto', cor: 'border-outline/15' },
} as const;

const TIPO = {
  risco:         { rotulo: 'Risco',            Icone: AlertTriangle, cor: 'text-danger' },
  pendente_dono: { rotulo: 'Pendente do dono', Icone: UserCheck,     cor: 'text-warning' },
  aberto:        { rotulo: 'Em aberto',        Icone: Inbox,         cor: 'text-secondary' },
  ideia:         { rotulo: 'Ideia',            Icone: Lightbulb,     cor: 'text-muted' },
  feito:         { rotulo: 'Feito',            Icone: CircleHelp,    cor: 'text-success' },
} as const;

export default function Controle() {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [agente, setAgente] = useState<string>('todos');
  const [tipo, setTipo] = useState<string>('todos');
  const [nivel, setNivel] = useState<string>('todos');
  const [verResolvidos, setVerResolvidos] = useState(false);
  const [emCurso, setEmCurso] = useState<number | null>(null);
  const [erroAcao, setErroAcao] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('v_controle_itens').select('*')
      .order('nivel').order('ordem_tipo').order('data', { ascending: false }).order('agente')
      .then(({ data, error }) => {
        if (error) { setErro(error.message); return; }
        setItens((data ?? []) as Item[]);
      });
  }, []);

  // A lista de decisões do dono vem de VÁRIOS arquivos (30/09, 01/10, 05/10) e a mesma decisão pode estar em
  // mais de um — medido em 09/10: 112 linhas para 109 números, e a de número 19 é um RISCO repetido. Contar
  // duas vezes o mesmo risco numa tela de controle é pior que não mostrá-lo, porque infla a urgência. Fica a
  // ocorrência mais recente de cada número, que é a que carrega o estado atual.
  const itensUnicos = useMemo(() => {
    if (!itens) return null;
    const maisNovo = new Map<number, Item>();
    for (const i of itens) {
      if (i.origem !== 'decisao' || i.numero === null) continue;
      const atual = maisNovo.get(i.numero);
      if (!atual || i.data > atual.data) maisNovo.set(i.numero, i);
    }
    return itens.filter(
      (i) => i.origem !== 'decisao' || i.numero === null || maisNovo.get(i.numero)?.id === i.id,
    );
  }, [itens]);

  const marcar = async (id: number, resolver: boolean) => {
    setEmCurso(id); setErroAcao(null);
    const { error } = await supabase.rpc(
      resolver ? 'rpc_controle_resolver' : 'rpc_controle_reabrir',
      resolver ? { p_id: id } : { p_id: id });
    setEmCurso(null);
    if (error) { setErroAcao(error.message); return; }
    setItens((ant) => (ant ?? []).map((i) => (i.id === id
      ? { ...i, resolvido: resolver, resolvido_em: resolver ? new Date().toISOString() : null }
      : i)));
  };

  const agentes = useMemo(
    () => [...new Set((itensUnicos ?? []).map((i) => i.agente))].sort(),
    [itensUnicos],
  );

  // Cada contador respeita o OUTRO filtro: o número do chip tem de ser o que aparece se eu clicar nele.
  const casa = (i: Item, f: { a?: string; t?: string; n?: string }) =>
    ((f.a ?? agente) === 'todos' || i.agente === (f.a ?? agente))
    && ((f.t ?? tipo) === 'todos' || i.tipo === (f.t ?? tipo))
    && ((f.n ?? nivel) === 'todos' || String(i.nivel) === (f.n ?? nivel))
    && (verResolvidos || !i.resolvido);

  const contaTipo = (t: string) => (itensUnicos ?? []).filter((i) => casa(i, { t })).length;
  const contaAgente = (a: string) => (itensUnicos ?? []).filter((i) => casa(i, { a })).length;
  const contaNivel = (n: string) => (itensUnicos ?? []).filter((i) => casa(i, { n })).length;

  const visiveis = (itensUnicos ?? []).filter((i) => casa(i, {}));
  const niveisVisiveis = [...new Set(visiveis.map((i) => i.nivel))].sort((x, y) => x - y);

  // A lista do dono é CUMULATIVA, não diária: a conta dela é por estado, não por data. Mostrar "N abertas
  // de M" em vez de contar linhas evita que decisão já riscada apareça como coisa a fazer.
  const decisoes = (itensUnicos ?? []).filter((i) => i.origem === 'decisao' && i.numero !== null);
  const decisoesAbertas = decisoes.filter((i) => i.estado === 'aberto' && !i.resolvido);

  const riscos = (itensUnicos ?? []).filter((i) => i.tipo === 'risco' && !i.resolvido);
  const qtdResolvidos = (itensUnicos ?? []).filter((i) => i.resolvido).length;
  const vencidos = riscos.filter((i) => i.risco_no_prazo_hoje);
  const ultimaData = (itensUnicos ?? []).reduce<string | null>((max, i) => (!max || i.data > max ? i.data : max), null);

  // 09/10: a carga ESPELHA o arquivo — a cada passada, item do dia que não está mais no estado é removido.
  // Isso conserta duplicata, e abre um buraco: passada que falhe ou leia vazio para um agente APAGA os
  // riscos dele, e a tela mostra menos risco sem dizer por quê. Numa página de controle isso é pior que a
  // tela vazia, porque parece plausível. Então a tela compara com o último dia anterior e avisa quem sumiu.
  // Não afirmo a causa: pode ser agente que não escreveu o estado, ou carga incompleta. As duas merecem olho.
  // SÓ `origem = 'agente'`: a lista de decisões do dono tem a data do arquivo dela, não é estado diário.
  // Sem este filtro o aviso dispararia dizendo que o "agente dono" sumiu — medi em 09/10 e era exatamente
  // isso que ia aparecer. Falso alarme numa tela de controle ensina a ignorar o aviso verdadeiro.
  const sumiram = useMemo(() => {
    const deAgente = (itens ?? []).filter((i) => i.origem === 'agente');
    const ultima = deAgente.reduce<string | null>((max, i) => (!max || i.data > max ? i.data : max), null);
    if (!ultima) return [];
    const anterior = deAgente.reduce<string | null>(
      (max, i) => (i.data < ultima && (!max || i.data > max) ? i.data : max), null);
    if (!anterior) return [];
    const agora = new Set(deAgente.filter((i) => i.data === ultima).map((i) => i.agente));
    return [...new Set(deAgente.filter((i) => i.data === anterior).map((i) => i.agente))]
      .filter((a) => !agora.has(a));
  }, [itens]);

  return (
    <div className="space-y-5">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Controle</div>
        <p className="mt-1 text-[13px] text-muted max-w-3xl">
          O que cada agente escreveu no estado do dia e o que está na sua lista de decisões. Risco primeiro,
          depois o que espera a sua palavra. Carga pelo Geral; esta tela só lê.
        </p>
      </div>

      {erro && (
        <div className="flex items-start gap-2 border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Não foi possível ler o controle: {erro}</span>
        </div>
      )}

      {/* Estado vazio honesto: sem itens, a tela NÃO diz "nenhum risco" — diz que não sabe. */}
      {itensUnicos && itensUnicos.length === 0 && (
        <div className="flex items-start gap-2 border border-warning/30 bg-warning-bg/40 p-3 text-[13px]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
          <span className="text-on-surface">
            <strong className="font-normal">Esta tela está vazia porque a carga ainda não rodou</strong> — não
            porque não há risco. Os agentes escrevem o estado em <code className="text-[11px]">Cockpit/sessoes/</code> e
            o Geral carrega por <code className="text-[11px]">controle-sync.mjs</code>. Enquanto não houver uma
            passada, o número honesto aqui é “não sei”, e não zero.
          </span>
        </div>
      )}

      {erroAcao && (
        <div className="flex items-start gap-2 border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Não gravou — o item ficou onde estava: {erroAcao}</span>
        </div>
      )}

      {sumiram.length > 0 && (
        <div className="flex items-start gap-2 border border-warning/30 bg-warning-bg/40 p-3 text-[13px]">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
          <span className="text-on-surface">
            <strong className="font-normal">
              {sumiram.length === 1 ? 'Um agente tinha estado e hoje não tem' : `${sumiram.length} agentes tinham estado e hoje não têm`}
            </strong>: {sumiram.join(', ')}. A carga espelha o arquivo, então isto pode ser estado não escrito
            <em> ou</em> passada incompleta — e nos dois casos o risco dele sai da contagem acima sem avisar.
            Vale olhar antes de confiar no número.
          </span>
        </div>
      )}

      {itensUnicos && itensUnicos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
          <Quadro rotulo="Riscos" valor={riscos.length} tom={riscos.length ? 'text-danger' : 'text-muted'} />
          <Quadro rotulo="Com prazo vencido ou hoje" valor={vencidos.length}
                  tom={vencidos.length ? 'text-danger' : 'text-muted'} />
          <Quadro rotulo="Pendentes do dono" valor={contaTipo('pendente_dono')}
                  tom={contaTipo('pendente_dono') ? 'text-warning' : 'text-muted'} />
          <Quadro rotulo="Lista do dono" valor={decisoesAbertas.length}
                  tom={decisoesAbertas.length ? 'text-warning' : 'text-muted'}
                  nota={decisoes.length ? `abertas de ${decisoes.length}` : undefined} />
          <Quadro rotulo="Agentes com estado" valor={agentes.filter((a) => a !== 'dono').length}
                  tom="text-on-surface"
                  nota={ultimaData ? `mais recente ${ultimaData.slice(8, 10)}/${ultimaData.slice(5, 7)}` : undefined} />
        </div>
      )}

      {itensUnicos && itensUnicos.length > 0 && (
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted mr-0.5 w-12">ver</span>
            <button onClick={() => setVerResolvidos(!verResolvidos)}
              className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
                verResolvidos ? 'border-secondary bg-secondary/15 text-on-surface'
                              : 'border-outline/20 text-muted hover:text-on-surface hover:border-outline/40'}`}>
              mostrar resolvidos <span className="text-muted">{qtdResolvidos}</span>
            </button>
          </div>
          <Filtro rotulo="nível" valor={nivel} aoTrocar={setNivel}
            opcoes={[{ id: 'todos', label: 'todos', n: contaNivel('todos') },
                     ...[1, 2, 3].map((n) => ({ id: String(n), label: `nível ${n}`, n: contaNivel(String(n)) }))]} />
          <Filtro rotulo="tipo" valor={tipo} aoTrocar={setTipo}
            opcoes={[{ id: 'todos', label: 'todos', n: contaTipo('todos') },
                     ...Object.entries(TIPO).map(([id, t]) => ({ id, label: t.rotulo, n: contaTipo(id) }))]} />
          <Filtro rotulo="agente" valor={agente} aoTrocar={setAgente}
            opcoes={[{ id: 'todos', label: 'todos', n: contaAgente('todos') },
                     ...agentes.map((a) => ({ id: a, label: a, n: contaAgente(a) }))]} />
        </div>
      )}

      {niveisVisiveis.map((nv) => (
        <div key={nv} className="space-y-1.5">
          <div className={`border-l-2 pl-2 font-mono text-[10px] uppercase tracking-[0.18em] ${
            nv === 1 ? 'border-danger text-danger' : nv === 2 ? 'border-warning text-warning' : 'border-outline/30 text-muted'}`}>
            {NIVEL[nv as 1 | 2 | 3]?.rotulo ?? `Nível ${nv}`}
            <span className="ml-2 text-muted">{visiveis.filter((i) => i.nivel === nv).length}</span>
          </div>
          {visiveis.filter((i) => i.nivel === nv).map((i) => {
          const t = TIPO[i.tipo as keyof typeof TIPO] ?? TIPO.aberto;
          return (
            <div key={i.id}
              className={`border bg-surface-container p-3 ${
                i.risco_no_prazo_hoje ? 'border-danger/40' : 'border-outline/15'}`}>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider ${t.cor}`}>
                  <t.Icone className="w-3 h-3" /> {t.rotulo}
                </span>
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{i.agente}</span>
                {i.numero !== null && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted">item {i.numero}</span>
                )}
                {i.estado && (
                  <span className="font-mono text-[9px] uppercase tracking-wider text-secondary">{i.estado}</span>
                )}
                <span className="font-mono text-[9px] text-muted ml-auto">
                  {i.data.slice(8, 10)}/{i.data.slice(5, 7)}
                </span>
                <button onClick={() => marcar(i.id, !i.resolvido)} disabled={emCurso === i.id}
                  title={i.resolvido ? 'volta para a lista' : 'some da lista; a linha não é apagada'}
                  className={`inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 border transition-colors disabled:opacity-40 ${
                    i.resolvido ? 'border-outline/25 text-muted hover:text-on-surface'
                                : 'border-success/40 text-success hover:bg-success/10'}`}>
                  {i.resolvido ? <><RotateCcw className="w-3 h-3" /> reabrir</>
                               : <><Check className="w-3 h-3" /> resolvido</>}
                </button>
              </div>
              {i.titulo && <div className="text-[13px] text-on-surface font-medium">{i.titulo}</div>}
              <div className="text-[13px] text-on-surface whitespace-pre-wrap">{i.texto}</div>
              {i.tipo === 'risco' && (
                <div className="mt-1.5 font-mono text-[9px] uppercase tracking-wider text-muted">
                  {i.risco_data
                    ? <>prazo {i.risco_data.slice(8, 10)}/{i.risco_data.slice(5, 7)}
                        {i.risco_no_prazo_hoje && <span className="text-danger"> · vencido ou hoje</span>}</>
                    : 'sem data marcada'}
                </div>
              )}
            </div>
          );
          })}
        </div>
      ))}

      <div className="space-y-1.5">
        {itensUnicos && itensUnicos.length > 0 && visiveis.length === 0 && (
          <div className="border border-outline/15 bg-surface-container p-3 text-[13px] text-muted">
            Nenhum item com estes filtros. Há {itensUnicos.length} no total — o vazio é do filtro, não da base.
          </div>
        )}
      </div>
    </div>
  );
}

function Quadro({ rotulo, valor, tom, nota }: { rotulo: string; valor: number; tom: string; nota?: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container p-3">
      <div className="font-mono text-[9px] uppercase tracking-wider text-muted">{rotulo}</div>
      <div className={`text-2xl font-light mt-0.5 ${tom}`}>{valor}</div>
      {nota && <div className="font-mono text-[9px] uppercase tracking-wider text-muted">{nota}</div>}
    </div>
  );
}

function Filtro({ rotulo, valor, opcoes, aoTrocar }: {
  rotulo: string; valor: string; aoTrocar: (v: string) => void;
  opcoes: { id: string; label: string; n: number }[];
}) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted mr-0.5 w-12">{rotulo}</span>
      {opcoes.map((o) => (
        <button key={o.id} onClick={() => aoTrocar(o.id)}
          className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
            valor === o.id ? 'border-secondary bg-secondary/15 text-on-surface'
                           : 'border-outline/20 text-muted hover:text-on-surface hover:border-outline/40'}`}>
          {o.label} <span className="text-muted">{o.n}</span>
        </button>
      ))}
    </div>
  );
}
