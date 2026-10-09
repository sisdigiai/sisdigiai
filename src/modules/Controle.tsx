import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CircleHelp, Inbox, Lightbulb, UserCheck } from 'lucide-react';
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
}

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

  useEffect(() => {
    supabase.from('v_controle_itens').select('*')
      .order('ordem_tipo').order('data', { ascending: false }).order('agente')
      .then(({ data, error }) => {
        if (error) { setErro(error.message); return; }
        setItens((data ?? []) as Item[]);
      });
  }, []);

  const agentes = useMemo(
    () => [...new Set((itens ?? []).map((i) => i.agente))].sort(),
    [itens],
  );

  // Cada contador respeita o OUTRO filtro: o número do chip tem de ser o que aparece se eu clicar nele.
  const contaTipo = (t: string) =>
    (itens ?? []).filter((i) => (agente === 'todos' || i.agente === agente) && (t === 'todos' || i.tipo === t)).length;
  const contaAgente = (a: string) =>
    (itens ?? []).filter((i) => (tipo === 'todos' || i.tipo === tipo) && (a === 'todos' || i.agente === a)).length;

  const visiveis = (itens ?? []).filter(
    (i) => (agente === 'todos' || i.agente === agente) && (tipo === 'todos' || i.tipo === tipo),
  );

  const riscos = (itens ?? []).filter((i) => i.tipo === 'risco');
  const vencidos = riscos.filter((i) => i.risco_no_prazo_hoje);
  const ultimaData = (itens ?? []).reduce<string | null>((max, i) => (!max || i.data > max ? i.data : max), null);

  // 09/10: a carga ESPELHA o arquivo — a cada passada, item do dia que não está mais no estado é removido.
  // Isso conserta duplicata, e abre um buraco: passada que falhe ou leia vazio para um agente APAGA os
  // riscos dele, e a tela mostra menos risco sem dizer por quê. Numa página de controle isso é pior que a
  // tela vazia, porque parece plausível. Então a tela compara com o último dia anterior e avisa quem sumiu.
  // Não afirmo a causa: pode ser agente que não escreveu o estado, ou carga incompleta. As duas merecem olho.
  const sumiram = useMemo(() => {
    if (!itens || !ultimaData) return [];
    const anterior = itens.reduce<string | null>(
      (max, i) => (i.data < ultimaData && (!max || i.data > max) ? i.data : max), null);
    if (!anterior) return [];
    const hoje = new Set(itens.filter((i) => i.data === ultimaData).map((i) => i.agente));
    return [...new Set(itens.filter((i) => i.data === anterior).map((i) => i.agente))]
      .filter((a) => !hoje.has(a));
  }, [itens, ultimaData]);

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
      {itens && itens.length === 0 && (
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

      {itens && itens.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Quadro rotulo="Riscos" valor={riscos.length} tom={riscos.length ? 'text-danger' : 'text-muted'} />
          <Quadro rotulo="Com prazo vencido ou hoje" valor={vencidos.length}
                  tom={vencidos.length ? 'text-danger' : 'text-muted'} />
          <Quadro rotulo="Pendentes do dono" valor={contaTipo('pendente_dono')}
                  tom={contaTipo('pendente_dono') ? 'text-warning' : 'text-muted'} />
          <Quadro rotulo="Agentes com estado" valor={agentes.length} tom="text-on-surface"
                  nota={ultimaData ? `mais recente ${ultimaData.slice(8, 10)}/${ultimaData.slice(5, 7)}` : undefined} />
        </div>
      )}

      {itens && itens.length > 0 && (
        <div className="space-y-2">
          <Filtro rotulo="tipo" valor={tipo} aoTrocar={setTipo}
            opcoes={[{ id: 'todos', label: 'todos', n: contaTipo('todos') },
                     ...Object.entries(TIPO).map(([id, t]) => ({ id, label: t.rotulo, n: contaTipo(id) }))]} />
          <Filtro rotulo="agente" valor={agente} aoTrocar={setAgente}
            opcoes={[{ id: 'todos', label: 'todos', n: contaAgente('todos') },
                     ...agentes.map((a) => ({ id: a, label: a, n: contaAgente(a) }))]} />
        </div>
      )}

      <div className="space-y-1.5">
        {visiveis.map((i) => {
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

        {itens && itens.length > 0 && visiveis.length === 0 && (
          <div className="border border-outline/15 bg-surface-container p-3 text-[13px] text-muted">
            Nenhum item com estes filtros. Há {itens.length} no total — o vazio é do filtro, não da base.
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
