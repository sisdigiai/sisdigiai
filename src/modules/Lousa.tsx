import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Lousa de publicação (ADR-0066; ordem do dono em 17/11/2026, pela curadoria do Geral).
//
// O QUE ELA RESPONDE: o que sai esta semana, de todas as marcas e contas, num lugar só. Antes disto, três
// motores publicavam em ~30 contas e ninguém via o conjunto — em 12/11 a Meta bloqueou um Instagram da casa
// e só se soube depois.
//
// ETAPA 2 (17/11, 03h): a tela lê `public.v_lousa` — o que o MKT publica MAIS o que Pulso e Limelight
// enviam pela `lousa-entrada`, assinado com Ed25519. A chave é (origem, publicador, origem_ref): o
// publicador entrou nela depois de eu medir que a v_mkt_lousa já traz 135 linhas com origem='pulso'
// publicadas pelo MKT — sem ele, o envio do Pulso apagaria essas linhas em silêncio.
//
// O FILTRO POR PUBLICADOR existe por causa disso: a mesma peça pode sair pela conta do MKT e pela conta
// de quem a produziu, e são publicações diferentes, não repetição.
//
// DUAS RECUSAS DE PROPÓSITO, as duas medidas antes de escrever:
//   · **Estado que eu não conheço aparece com o nome dele**, nunca engolido. A view devolve 7 estados e o
//     ADR-0066 lista 5 (`no_planner` e `rascunho` são de lá, não daqui). Tela que esconde o que não
//     reconhece faz o item sumir — e some justo o que ninguém previu.
//   · **Peça sem data aparece num bloco próprio.** São 4 de 1.056 hoje, todas `planejado`. Numa grade por
//     dia elas não teriam onde cair, e cair fora da tela é o mesmo que não existir.
//
// A cor da marca vem do dado (`accent_hex`, da view), não de valor escrito aqui: é identidade de marca
// guardada no banco. O resto da tela é token do design system (R-014).

interface Peca {
  origem: string; origem_ref: string; publicador: string;
  marca: string; marca_nome: string | null; accent_hex: string | null;
  conta: string; conta_nome: string | null; rede: string; tipo: string;
  quando: string | null; estado: string; link: string | null; erro: string | null;
  titulo: string | null;
}

// Projeção (etapa 1b). A base vem de `public.v_lousa_base`, onde o critério mora escrito — e mora lá,
// e não aqui, porque eu e o Orquestrador medimos o mesmo número hoje e demos valores diferentes (28 e
// 31), por causa da janela de 28 dias andando com a hora. Dois números para a mesma coisa é pior que
// nenhum.
//
// O que a tela NUNCA faz com o previsto: somar com o medido, e pintar com a cor de resultado. Previsto
// é hipótese; se ele usar o verde do publicado, vira promessa.
interface Base {
  conta: string; rede: string; tipo: string;
  pecas: number; mediana: number; p25: number; p75: number; maior: number; serve_de_base: boolean;
}
const chaveBase = (x: { conta: string; rede: string; tipo: string }) => `${x.conta}|${x.rede}|${x.tipo}`;

const DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

// Estado conhecido ganha tom; o que não conheço fica neutro E aparece escrito como veio.
// O que a tela escreve, quando o nome cru não é o nome que a casa usa. Estado que não estiver aqui sai
// como veio — continua valendo a regra de não engolir o que eu não conheço.
const ROTULO: Record<string, string> = { no_planner: 'no Planner' };

const TOM: Record<string, string> = {
  publicado: 'text-success',
  agendado: 'text-secondary',
  falhou: 'text-danger',
  no_planner: 'text-warning',
  planejado: 'text-muted',
  rascunho: 'text-muted',
  cancelado: 'text-muted line-through',
};

// O dia do negócio é BRT. `toISOString()` jogaria tudo para o dia seguinte depois das 21h — já aconteceu
// nesta casa, em outra tela, e esvaziou o dia do dono.
const diaBRT = (iso: string) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' })
    .format(new Date(iso));
const horaBRT = (iso: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'America/Sao_Paulo', hour: '2-digit', minute: '2-digit' })
    .format(new Date(iso));

function segundaDaSemana(base: Date) {
  const d = new Date(base);
  const dow = (d.getDay() + 6) % 7;           // 0 = segunda
  d.setDate(d.getDate() - dow);
  d.setHours(12, 0, 0, 0);                    // meio-dia evita a virada por fuso ao somar dias
  return d;
}
const maisDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
const chave = (d: Date) => diaBRT(d.toISOString());
const rotuloCurto = (d: Date) => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;

export default function Lousa() {
  const [pecas, setPecas] = useState<Peca[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [semana, setSemana] = useState(() => segundaDaSemana(new Date()));
  const [marca, setMarca] = useState('todas');
  const [rede, setRede] = useState('todas');
  const [publicador, setPublicador] = useState('todos');
  const [base, setBase] = useState<Map<string, Base> | null>(null);
  // Cancelado fica escondido por padrão (pedido do dono em 17/11): a fila do motor acumula cancelamento
  // antigo, e 330 peças canceladas empurram para fora da vista o que ainda vai sair.
  const [verCancelados, setVerCancelados] = useState(false);

  useEffect(() => {
    supabase.from('v_lousa').select('*').then(({ data, error }) => {
      if (error) { setErro(error.message); setPecas([]); return; }
      setPecas((data ?? []) as Peca[]);
    });
    // A base não derruba a Lousa se falhar: a agenda é o que a tela existe para mostrar, e a projeção é
    // o acréscimo. Mas também não fica em silêncio — sem base, o cartão diz "sem base", não some.
    supabase.from('v_lousa_base').select('*').then(({ data }) => {
      setBase(new Map(((data ?? []) as Base[]).map((b) => [chaveBase(b), b])));
    });
  }, []);

  const dias = useMemo(() => Array.from({ length: 7 }, (_, i) => maisDias(semana, i)), [semana]);
  const chavesDaSemana = useMemo(() => new Set(dias.map(chave)), [dias]);

  // Cada contador respeita o OUTRO filtro: botão cujo número não muda quando o vizinho muda faz a pessoa
  // clicar e achar que a tela quebrou.
  const naSemana = useMemo(
    () => (pecas ?? []).filter((p) => !p.quando || chavesDaSemana.has(diaBRT(p.quando))),
    [pecas, chavesDaSemana],
  );
  const casa = (p: Peca, f: { m?: string; r?: string; p?: string }) =>
    ((f.m ?? marca) === 'todas' || p.marca === (f.m ?? marca))
    && ((f.r ?? rede) === 'todas' || p.rede === (f.r ?? rede))
    && ((f.p ?? publicador) === 'todos' || p.publicador === (f.p ?? publicador))
    && (verCancelados || p.estado !== 'cancelado');

  const contar = (lista: Peca[], k: (p: Peca) => string) => {
    const m = new Map<string, number>();
    for (const p of lista) m.set(k(p), (m.get(k(p)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const marcas = useMemo(() => contar(naSemana.filter((p) => casa(p, { m: 'todas' })), (p) => p.marca), [naSemana, rede, publicador, verCancelados]);
  const redes = useMemo(() => contar(naSemana.filter((p) => casa(p, { r: 'todas' })), (p) => p.rede), [naSemana, marca, publicador, verCancelados]);
  const publicadores = useMemo(() => contar(naSemana.filter((p) => casa(p, { p: 'todos' })), (p) => p.publicador), [naSemana, marca, rede, verCancelados]);

  const visiveis = useMemo(() => naSemana.filter((p) => casa(p, {})), [naSemana, marca, rede, publicador, verCancelados]);
  const cancelados = naSemana.filter((p) => p.estado === 'cancelado'
    && (marca === 'todas' || p.marca === marca) && (rede === 'todas' || p.rede === rede)
    && (publicador === 'todos' || p.publicador === publicador)).length;
  const semData = visiveis.filter((p) => !p.quando);

  // Só peça que ainda vai sair recebe projeção: prever o que já foi publicado é enfeite, e ainda por
  // cima competiria com o número medido ao lado.
  const AINDA_VAI_SAIR = ['agendado', 'planejado', 'no_planner', 'rascunho'];
  const futuras = visiveis.filter((p) => p.quando && diaBRT(p.quando) >= hoje && AINDA_VAI_SAIR.includes(p.estado));
  const futurasComBase = futuras.map((p) => base?.get(chaveBase(p))).filter((b): b is Base => !!b?.serve_de_base);
  const previsto = futurasComBase.reduce((a, b) => a + b.mediana, 0);
  // A quarta trava, minha: "esta conta é nova" e "os dois lados não falam a mesma língua" pedem ações
  // opostas. Se NENHUMA peça futura encontra grupo e a base existe, isso não é falta de história.
  const nenhumaCasa = base != null && base.size > 0 && futuras.length > 0
    && futuras.every((p) => !base.get(chaveBase(p)));
  const porDia = useMemo(() => {
    const m = new Map<string, Peca[]>();
    for (const p of visiveis) {
      if (!p.quando) continue;
      const k = diaBRT(p.quando);
      m.set(k, [...(m.get(k) ?? []), p]);
    }
    for (const [, lista] of m) lista.sort((a, b) => (a.quando ?? '').localeCompare(b.quando ?? ''));
    return m;
  }, [visiveis]);

  const conta = (e: string) => visiveis.filter((p) => p.estado === e).length;
  const hoje = chave(new Date());

  return (
    <div className="space-y-4">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Lousa</div>
        <p className="mt-1 text-[13px] text-muted max-w-3xl">
          O que sai esta semana, de todas as marcas e contas, num lugar só: o que o motor de marketing
          publica (inclui os cortes do Pulso que ele publica) e o que Pulso e Limelight enviam assinado,
          das contas deles. Quando as duas origens publicarem na mesma semana, aparece o filtro de quem
          publica — a mesma peça pode sair por duas contas, e são publicações diferentes, não repetição.
        </p>
      </div>

      {erro && (
        <div className="flex items-start gap-2 border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Não consegui ler a agenda (<code className="text-[11px]">v_mkt_lousa</code>): {erro}. A lousa
            abaixo está vazia por falha de leitura, não por não haver peça.</span>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center border border-outline/20">
          <button onClick={() => setSemana(maisDias(semana, -7))} className="px-2 py-1 text-muted hover:text-on-surface" title="semana anterior">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={() => setSemana(segundaDaSemana(new Date()))}
            className="px-3 py-1 font-mono text-[10px] uppercase tracking-wider text-muted hover:text-on-surface border-x border-outline/20">
            esta semana
          </button>
          <button onClick={() => setSemana(maisDias(semana, 7))} className="px-2 py-1 text-muted hover:text-on-surface" title="próxima semana">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <span className="font-mono text-[10px] uppercase tracking-wider text-secondary flex items-center gap-1.5">
          <CalendarRange className="w-3.5 h-3.5" />
          {rotuloCurto(dias[0])} a {rotuloCurto(dias[6])}
        </span>
        <span className="h-px flex-1 bg-outline/15" />
        <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
          {visiveis.length} peça(s) · {conta('publicado')} publicadas · {conta('agendado')} agendadas
          {conta('falhou') > 0 && <span className="text-danger"> · {conta('falhou')} falhou</span>}
        </span>
        {base != null && futuras.length > 0 && (
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
            {nenhumaCasa ? (
              <span className="text-warning">
                nenhuma das {futuras.length} peças futuras encontra história — não é conta nova, é a
                agenda e a medição falando línguas diferentes
              </span>
            ) : (
              <>previsto ~{previsto.toLocaleString('pt-BR')} views em {futurasComBase.length} de {futuras.length} que ainda vão sair</>
            )}
          </span>
        )}
        {cancelados > 0 && (
          <button onClick={() => setVerCancelados(!verCancelados)}
            className={`font-mono text-[9px] uppercase tracking-wider px-2 py-0.5 border transition-colors ${
              verCancelados ? 'border-secondary bg-secondary/15 text-on-surface'
                            : 'border-outline/20 text-muted hover:text-on-surface hover:border-outline/40'}`}>
            {verCancelados ? 'escondendo' : 'mostrar'} {cancelados} cancelada(s)
          </button>
        )}
      </div>

      <Filtro rotulo="marca" valor={marca} aoTrocar={setMarca}
        opcoes={[{ id: 'todas', label: 'todas', n: naSemana.filter((p) => casa(p, { m: 'todas' })).length },
                 ...marcas.map(([id, n]) => ({ id, label: id, n }))]} />
      <Filtro rotulo="rede" valor={rede} aoTrocar={setRede}
        opcoes={[{ id: 'todas', label: 'todas', n: naSemana.filter((p) => casa(p, { r: 'todas' })).length },
                 ...redes.map(([id, n]) => ({ id, label: id, n }))]} />
      {publicadores.length > 1 && (
        <Filtro rotulo="quem publica" valor={publicador} aoTrocar={setPublicador}
          opcoes={[{ id: 'todos', label: 'todos', n: naSemana.filter((p) => casa(p, { p: 'todos' })).length },
                   ...publicadores.map(([id, n]) => ({ id, label: id, n }))]} />
      )}

      {pecas === null ? (
        <div className="border border-outline/15 bg-surface-container p-3 font-mono text-[10px] uppercase tracking-wider text-muted">lendo…</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-7 gap-px bg-outline/15 border border-outline/15">
          {dias.map((d) => {
            const k = chave(d);
            const lista = porDia.get(k) ?? [];
            return (
              <div key={k} className={`bg-surface-container min-h-[7rem] ${k === hoje ? 'ring-1 ring-inset ring-secondary/40' : ''}`}>
                <div className="px-2 py-1.5 border-b border-outline/10 flex items-baseline justify-between">
                  <span className="font-mono text-[9px] uppercase tracking-wider text-muted">
                    {DIAS[dias.indexOf(d)].slice(0, 3)} {rotuloCurto(d)}
                  </span>
                  {lista.length > 0 && <span className="font-mono text-[9px] text-muted">{lista.length}</span>}
                </div>
                <div className="divide-y divide-outline/10">
                  {lista.map((p) => <Cartao key={`${p.origem}-${p.publicador}-${p.origem_ref}`} p={p}
                    base={base?.get(chaveBase(p))} futura={p.quando != null && diaBRT(p.quando) >= hoje && AINDA_VAI_SAIR.includes(p.estado)} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {semData.length > 0 && (
        <div className="border border-warning/30 bg-warning-bg/30">
          <div className="px-3 py-2 font-mono text-[9px] uppercase tracking-wider text-warning border-b border-outline/10">
            {semData.length} peça(s) sem data — não cabem em nenhum dia, e por isso aparecem aqui
          </div>
          <div className="divide-y divide-outline/10">{semData.map((p) => <Cartao key={`${p.origem}-${p.publicador}-${p.origem_ref}`} p={p} />)}</div>
        </div>
      )}

      {pecas !== null && visiveis.length === 0 && !erro && (
        <div className="border border-outline/15 bg-surface-container p-3 text-[13px] text-muted">
          Nenhuma peça nesta semana com os filtros atuais. A leitura funcionou — isto é ausência medida, não
          falha de leitura.
        </div>
      )}
    </div>
  );
}

function Cartao({ p, base, futura }: { p: Peca; base?: Base; futura?: boolean }) {
  const tom = TOM[p.estado] ?? 'text-on-surface';
  const rotulado = ROTULO[p.estado] ?? p.estado;
  // Conta que é só número é id de Página (Facebook) ou de empresa (LinkedIn) — um número na tela não diz
  // nada a quem lê. Nesse caso vale o nome de exibição; nas outras, o arroba continua sendo o nome real.
  const conta = /^\d+$/.test(p.conta) ? (p.conta_nome ?? p.conta) : p.conta;
  return (
    <div className="px-2 py-1.5 flex gap-1.5" title={p.erro ?? undefined}>
      {/* cor da marca: dado da view, não valor escrito na tela */}
      <span className="w-0.5 shrink-0 rounded-sm" style={{ backgroundColor: p.accent_hex ?? 'transparent' }} />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] uppercase tracking-wider text-muted truncate">
          {p.quando ? horaBRT(p.quando) : 'sem hora'} · {conta} · {p.rede}
        </div>
        <div className="text-[12px] text-on-surface leading-snug line-clamp-2">{p.titulo ?? p.tipo}</div>
        <div className={`font-mono text-[9px] tracking-wider ${rotulado === p.estado ? 'uppercase' : 'normal-case'} ${tom}`}>
          {rotulado}{p.publicador !== p.origem && ` · ${p.origem}→${p.publicador}`}
          {/* Cancelado não leva marca de erro: a fila guarda o motivo do cancelamento no mesmo campo, e
              "cancelado · erro" faz parecer que algo quebrou quando alguém só desmarcou a peça. */}
          {p.erro && p.estado !== 'cancelado' && <span className="text-danger"> · erro</span>}
        </div>
        {/* Previsto: cor neutra sempre, e o tamanho da base junto. Número sem denominador é palpite
            com cara de medição. */}
        {futura && (
          <div className="font-mono text-[9px] tracking-wider text-muted normal-case">
            {base?.serve_de_base
              ? `~${base.mediana} views · ${base.p25}–${base.p75} · base ${base.pecas}`
              : base
                ? (base.maior === 0
                    ? 'sem leitura nesta conta'
                    : `base curta (${base.pecas} de 4)`)
                : 'sem base'}
          </div>
        )}
      </div>
    </div>
  );
}

function Filtro({ rotulo, valor, aoTrocar, opcoes }:
  { rotulo: string; valor: string; aoTrocar: (v: string) => void; opcoes: { id: string; label: string; n: number }[] }) {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="font-mono text-[9px] uppercase tracking-[0.18em] text-muted mr-0.5 w-12">{rotulo}</span>
      {opcoes.map((o) => (
        <button key={o.id} onClick={() => aoTrocar(o.id)}
          className={`font-mono text-[10px] uppercase tracking-wider px-2 py-0.5 border transition-colors ${
            valor === o.id ? 'border-secondary bg-secondary/15 text-on-surface'
                           : 'border-outline/20 text-muted hover:text-on-surface hover:border-outline/40'}`}>
          {o.label} <span className="text-muted">{o.n}</span>
        </button>
      ))}
    </div>
  );
}
