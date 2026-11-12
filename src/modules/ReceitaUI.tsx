import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

// Peças visuais da página Receita (12/11/2026).
//
// POR QUE EXISTE: a página nasceu em seis abas escritas em parágrafos, e o dono disse o óbvio: "muita coisa
// escrita, é complicado para entender". A regra daqui em diante é: o NÚMERO e o ESTADO aparecem como forma
// (tile, barra, quadro, linha do tempo); a EXPLICAÇÃO fica guardada num "como ler", fechado por padrão.
//
// Tudo aqui é HTML e CSS com os tokens do app. Sem biblioteca de gráfico: são barras e quadros, e uma barra
// que o leitor de tela lê como "3 de 10" vale mais que um canvas mudo. Nenhuma forma informa só por cor:
// toda barra tem o número escrito ao lado.

export const foco = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-action';
export const botao = `min-h-[44px] inline-flex items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-wider disabled:opacity-50 ${foco}`;

export const brl = (v: string | number | null | undefined) =>
  v === null || v === undefined ? '—'
    : Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
export const hojeBrt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
export const diaCurto = (d: string) => { const [, m, j] = d.slice(0, 10).split('-'); return `${j}/${m}`; };
export const diaEscrito = (d: string) => { const [a, m, j] = d.slice(0, 10).split('-'); return `${j}/${m}/${a}`; };
// Dias de calendário entre duas datas AAAA-MM-DD, as duas no fuso do negócio.
export const diasAte = (alvo: string, hoje: string) =>
  Math.round((Date.parse(`${alvo.slice(0, 10)}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86400000);
export const emDias = (n: number) =>
  (n > 1 ? `faltam ${n} dias` : n === 1 ? 'falta 1 dia' : n === 0 ? 'é hoje' : n === -1 ? 'passou há 1 dia' : `passou há ${-n} dias`);

type Tom = 'neutro' | 'bom' | 'atencao' | 'ruim';
const TOM_TEXTO: Record<Tom, string> = { neutro: 'text-on-surface', bom: 'text-success', atencao: 'text-warning', ruim: 'text-danger' };
const TOM_BARRA: Record<Tom, string> = { neutro: 'bg-action', bom: 'bg-success', atencao: 'bg-warning', ruim: 'bg-danger' };

// Número grande com rótulo. `de` desenha a barra de progresso embaixo.
export function Tile({ rotulo, valor, nota, tom = 'neutro', de, icone }: {
  rotulo: string; valor: string; nota?: string; tom?: Tom; de?: { feito: number; total: number }; icone?: React.ReactNode;
}) {
  return (
    <div className="border border-outline/15 bg-surface-container p-3">
      <dt className="flex items-center gap-1.5 font-mono text-[9px] uppercase tracking-wider text-muted">
        {icone}{rotulo}
      </dt>
      <dd className={`mt-1 font-serif text-2xl tabular-nums ${TOM_TEXTO[tom]}`}>{valor}</dd>
      {de && <Barra feito={de.feito} total={de.total} tom={tom} semTexto />}
      {nota && <dd className="mt-1 text-[12px] text-muted">{nota}</dd>}
    </div>
  );
}

// Barra de progresso. O número vai escrito (a não ser que quem chama já o mostre ao lado).
export function Barra({ feito, total, tom = 'neutro', rotulo, semTexto }: {
  feito: number; total: number; tom?: Tom; rotulo?: string; semTexto?: boolean;
}) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (feito / total) * 100)) : 0;
  return (
    <div className="mt-1.5">
      {!semTexto && (
        <div className="flex items-baseline justify-between gap-2 text-[12px]">
          <span className="text-on-surface-variant">{rotulo}</span>
          <span className="tabular-nums text-on-surface">{feito} de {total}</span>
        </div>
      )}
      <div className="h-1.5 w-full bg-surface-highest" role="progressbar" aria-valuemin={0} aria-valuemax={total}
           aria-valuenow={Math.min(feito, total)} aria-label={rotulo ?? `${feito} de ${total}`}>
        <div className={`h-full ${TOM_BARRA[tom]}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// Funil: cada degrau é uma barra proporcional ao primeiro, com o número e a queda escritos.
export function Funil({ titulo, degraus }: { titulo?: string; degraus: { rotulo: string; n: number }[] }) {
  const topo = Math.max(1, degraus[0]?.n ?? 1);
  return (
    <div className="border border-outline/15 bg-surface-container p-3">
      {titulo && <div className="mb-2 font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{titulo}</div>}
      <ol className="space-y-1.5">
        {degraus.map((d, k) => (
          <li key={d.rotulo} className="grid grid-cols-[minmax(7rem,11rem)_1fr_auto] items-center gap-2 text-[12px]">
            <span className="text-on-surface-variant">{d.rotulo}</span>
            <span className="h-4 bg-surface-highest" aria-hidden="true">
              <span className={`block h-full ${k === 0 ? 'bg-outline-strong' : 'bg-action'}`} style={{ width: `${Math.max(d.n > 0 ? 1.5 : 0, (d.n / topo) * 100)}%` }} />
            </span>
            <span className="w-12 text-right font-serif text-sm tabular-nums text-on-surface">{d.n}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}

// Quadro (kanban): colunas lado a lado que rolam para o lado em tela estreita.
export function Quadro({ children, rotulo }: { children: React.ReactNode; rotulo: string }) {
  return (
    <div className="flex gap-3 overflow-x-auto pb-2" role="region" aria-label={rotulo} tabIndex={0}>
      {children}
    </div>
  );
}

export function Coluna({ titulo, n, tom = 'neutro', vazio, largura = 'w-[240px] min-w-[240px]', children }: {
  titulo: string; n: number; tom?: Tom; vazio?: string; largura?: string; children?: React.ReactNode;
}) {
  return (
    <section className={`${largura} shrink-0 border border-outline/15 bg-surface-container`} aria-label={`${titulo}: ${n}`}>
      <div className="flex items-baseline justify-between gap-2 border-b border-outline/10 px-3 py-2">
        <h3 className="font-mono text-[10px] uppercase tracking-wider text-on-surface">{titulo}</h3>
        <span className={`font-serif text-lg font-semibold tabular-nums ${n ? TOM_TEXTO[tom] : 'text-muted'}`}>{n}</span>
      </div>
      {n === 0
        ? <p className="px-3 py-3 text-[12px] text-muted">{vazio ?? 'nada aqui'}</p>
        : <ul className="max-h-[460px] divide-y divide-outline/10 overflow-y-auto">{children}</ul>}
    </section>
  );
}

// Explicação guardada: o texto longo continua existindo, mas não é a primeira coisa que se vê.
export function ComoLer({ titulo = 'Como ler esta tela', children }: { titulo?: string; children: React.ReactNode }) {
  const [aberto, setAberto] = useState(false);
  return (
    <div className="border border-outline/15">
      <button type="button" aria-expanded={aberto} onClick={() => setAberto((v) => !v)}
              className={`flex min-h-[44px] w-full items-center gap-2 px-3 text-left font-mono text-[10px] uppercase tracking-wider text-muted hover:text-on-surface ${foco}`}>
        {aberto ? <ChevronDown className="w-3.5 h-3.5" aria-hidden="true" /> : <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />}
        {titulo}
      </button>
      {aberto && <div className="space-y-2 border-t border-outline/10 p-3 text-[13px] leading-relaxed text-on-surface-variant max-w-3xl">{children}</div>}
    </div>
  );
}

export function TituloSecao({ children, icone }: { children: React.ReactNode; icone?: React.ReactNode }) {
  return (
    <div className="mb-2 flex items-center gap-3">
      {icone && <span className="text-secondary">{icone}</span>}
      <h2 className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{children}</h2>
      <span className="h-px flex-1 bg-outline/15" />
    </div>
  );
}
