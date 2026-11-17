import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CalendarRange, ChevronLeft, ChevronRight } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Lousa de publicação (ADR-0066; ordem do dono em 17/11/2026, pela curadoria do Geral).
//
// O QUE ELA RESPONDE: o que sai esta semana, de todas as marcas e contas, num lugar só. Antes disto, três
// motores publicavam em ~30 contas e ninguém via o conjunto — em 12/11 a Meta bloqueou um Instagram da casa
// e só se soube depois.
//
// ETAPA 1: só o que vem de `public.v_mkt_lousa` (MKT, e os cortes do Pulso que o MKT publica). Pulso e
// Limelight entram na etapa 2, pela função de entrada assinada, com a mesma chave (origem, publicador,
// origem_ref).
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

const DIAS = ['segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado', 'domingo'];

// Estado conhecido ganha tom; o que não conheço fica neutro E aparece escrito como veio.
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

  useEffect(() => {
    supabase.from('v_mkt_lousa').select('*').then(({ data, error }) => {
      if (error) { setErro(error.message); setPecas([]); return; }
      setPecas((data ?? []) as Peca[]);
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
  const casa = (p: Peca, f: { m?: string; r?: string }) =>
    ((f.m ?? marca) === 'todas' || p.marca === (f.m ?? marca))
    && ((f.r ?? rede) === 'todas' || p.rede === (f.r ?? rede));

  const contar = (lista: Peca[], k: (p: Peca) => string) => {
    const m = new Map<string, number>();
    for (const p of lista) m.set(k(p), (m.get(k(p)) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const marcas = useMemo(() => contar(naSemana.filter((p) => casa(p, { m: 'todas' })), (p) => p.marca), [naSemana, rede]);
  const redes = useMemo(() => contar(naSemana.filter((p) => casa(p, { r: 'todas' })), (p) => p.rede), [naSemana, marca]);

  const visiveis = useMemo(() => naSemana.filter((p) => casa(p, {})), [naSemana, marca, rede]);
  const semData = visiveis.filter((p) => !p.quando);
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
          O que sai esta semana, de todas as marcas e contas, num lugar só. Etapa 1: o que vem do motor de
          marketing (inclui os cortes do Pulso que ele publica). Pulso e Limelight entram na etapa 2.
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
      </div>

      <Filtro rotulo="marca" valor={marca} aoTrocar={setMarca}
        opcoes={[{ id: 'todas', label: 'todas', n: naSemana.filter((p) => casa(p, { m: 'todas' })).length },
                 ...marcas.map(([id, n]) => ({ id, label: id, n }))]} />
      <Filtro rotulo="rede" valor={rede} aoTrocar={setRede}
        opcoes={[{ id: 'todas', label: 'todas', n: naSemana.filter((p) => casa(p, { r: 'todas' })).length },
                 ...redes.map(([id, n]) => ({ id, label: id, n }))]} />

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
                  {lista.map((p) => <Cartao key={`${p.origem}-${p.publicador}-${p.origem_ref}`} p={p} />)}
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

function Cartao({ p }: { p: Peca }) {
  const tom = TOM[p.estado] ?? 'text-on-surface';
  return (
    <div className="px-2 py-1.5 flex gap-1.5" title={p.erro ?? undefined}>
      {/* cor da marca: dado da view, não valor escrito na tela */}
      <span className="w-0.5 shrink-0 rounded-sm" style={{ backgroundColor: p.accent_hex ?? 'transparent' }} />
      <div className="min-w-0 flex-1">
        <div className="font-mono text-[9px] uppercase tracking-wider text-muted truncate">
          {p.quando ? horaBRT(p.quando) : 'sem hora'} · {p.conta} · {p.rede}
        </div>
        <div className="text-[12px] text-on-surface leading-snug line-clamp-2">{p.titulo ?? p.tipo}</div>
        <div className={`font-mono text-[9px] uppercase tracking-wider ${tom}`}>
          {p.estado}{p.publicador !== p.origem && ` · ${p.origem}→${p.publicador}`}
          {p.erro && <span className="text-danger"> · erro</span>}
        </div>
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
