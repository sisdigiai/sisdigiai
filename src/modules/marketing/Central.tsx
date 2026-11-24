import { useEffect, useMemo, useState } from 'react';
import { Target, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { lerTudo } from '../../lib/paginar';

// Central de comando do marketing — ordem do dono em 18/11/2026, 14h07: "ter a central de comando do
// marketing, leitura e resultados, e insights, fazer as melhores escolhas".
//
// O QUE ESTE BLOCO RESPONDE: "estamos indo bem?". O placar do mês e a cadeia inteira, cada elo com o
// período escolhido e o anterior do mesmo tamanho ao lado.
//
// AS REGRAS QUE ELE NÃO NEGOCIA, e cada uma nasceu de um erro medido nesta casa:
//
//  1. **Fluxo soma, estoque não.** Seguidores é censo: no período vale o ÚLTIMO valor, nunca a soma —
//     somar sete dias de censo daria sete vezes a audiência da casa. A view diz a natureza de cada
//     elo; a tela obedece.
//  2. **Sem base, sem seta.** Elo com menos de 4 dias medidos no período anterior mostra o número e
//     diz "sem base". Medido em 17/11: `captar` tem 5 leads em toda a história — comparar 1 com 1 é
//     ruído com cara de tendência.
//  3. **Nunca houve ≠ caiu.** Elo com zero no período e zero em toda a história diz "nunca houve",
//     não "-100%". `vender` é esse caso: a integração está viva e a única compra foi marcada como
//     teste por desenho.
//  4. **Agendado não é publicado.** A série por dia corta o futuro na origem; nenhum elo pode contar
//     o que ainda vai sair (foi o defeito que fez a página mostrar "há -24d" até hoje às 14h08).
//  5. **Cor nunca informa sozinha.** Subiu, caiu e igual vêm escritos e com seta, não só pintados.

type Dia = { dia: string; elo: string; medida: string; natureza: 'fluxo' | 'estoque'; n: number };
type Meta = {
  meta_brl: number; dinheiro_novo_brl: number; falta_brl: number;
  dias_restantes: number; ritmo_semanal_brl: number; linhas_medidas: number; linhas_so_proposta: number;
};

export type Periodo = '7' | '30' | 'tudo';
export const PERIODOS: Array<[Periodo, string]> = [['7', '7 dias'], ['30', '30 dias'], ['tudo', 'tudo']];

/** Como se escreve a janela na tela. Existe para "no período" nunca mais aparecer sozinho.
 *
 *  23/11/2026: varri o app atrás da frase e achei **26 ocorrências**. A maioria era comentário, mas
 *  as de tela diziam "no período" sem dizer QUAL período nem por QUAL régua — e foi exatamente esse
 *  rótulo, igual nas duas telas, que escondeu o 168k × 41,8k de 20/11: um contava por data de
 *  publicação, o outro por data de leitura, e os dois se chamavam "no período".
 *  Quem obedece à barra diz **"no recorte"** e deixa a barra falar (ela escreve janela e régua).
 *  Quem lê uma janela própria diz a janela, com esta função. */
export const rotuloJanela = (p: Periodo) => (p === 'tudo' ? 'desde o início' : `${p} dias`);

const DIAS_DE = (p: Periodo) => (p === 'tudo' ? null : Number(p));

/** Dia do negócio em BRT. `toISOString` depois das 21h joga tudo para o dia seguinte. */
const diaBRT = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const maisDias = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };

const num = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const brl = (v: number | null | undefined) =>
  v == null ? '—' : `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`;

const ELOS: Array<{ elo: string; medida: string; rotulo: string; sufixo?: string }> = [
  { elo: 'produzir', medida: 'publicacoes', rotulo: 'produzir', sufixo: 'peças' },
  { elo: 'alcancar', medida: 'seguidores', rotulo: 'alcançar', sufixo: 'seguidores' },
  { elo: 'captar', medida: 'leads', rotulo: 'captar', sufixo: 'leads' },
  { elo: 'prospectar', medida: 'disparos', rotulo: 'prospectar', sufixo: 'disparos' },
  { elo: 'vender', medida: 'vendas', rotulo: 'vender', sufixo: 'vendas' },
];

type Leitura = {
  rotulo: string; sufixo?: string;
  agora: number | null; antes: number | null;
  natureza: 'fluxo' | 'estoque';
  diasMedidosAntes: number;
  nuncaHouve: boolean;
  /** Para o censo: quantas contas entraram na medição de cada ponta. Cesta diferente não se compara. */
  cestaAgora?: number | null;
  cestaAntes?: number | null;
};

function medir(linhas: Dia[], elo: string, medida: string, periodo: Periodo): Leitura | null {
  const alvo = linhas.filter((l) => l.elo === elo && l.medida === medida);
  if (alvo.length === 0 && periodo !== 'tudo') return null;
  const natureza = (alvo[0]?.natureza ?? 'fluxo') as 'fluxo' | 'estoque';
  const dias = DIAS_DE(periodo);
  const hoje = new Date();

  const janela = (de: Date, ate: Date) => {
    const d0 = diaBRT(de), d1 = diaBRT(ate);
    return alvo.filter((l) => l.dia > d0 && l.dia <= d1);
  };

  // Estoque não se soma: no período vale o último censo. Fluxo soma.
  const valor = (ls: Dia[]) =>
    ls.length === 0 ? null
    : natureza === 'estoque' ? Number([...ls].sort((a, b) => a.dia.localeCompare(b.dia)).at(-1)!.n)
    : ls.reduce((a, l) => a + Number(l.n), 0);

  const agoraLs = dias ? janela(maisDias(hoje, -dias), hoje) : alvo;
  const antesLs = dias ? janela(maisDias(hoje, -dias * 2), maisDias(hoje, -dias)) : [];

  // Para o estoque, a COBERTURA de cada ponta: o censo cobria 8 contas em 03/11 e cobre 22 hoje, e
  // comparar totais de cestas diferentes transforma crescimento da medição em crescimento de
  // audiência. Vi isso na tela como "subiu 74%" quinze minutos depois de publicar.
  const cesta = (ls: Dia[]) => {
    const c = linhas.filter((l) => l.elo === elo && l.medida === 'contas');
    const diasDaPonta = new Set(ls.map((l) => l.dia));
    const ult = [...c].filter((l) => diasDaPonta.has(l.dia)).sort((a, b) => a.dia.localeCompare(b.dia)).at(-1);
    return ult ? Number(ult.n) : null;
  };

  return {
    rotulo: '', agora: dias ? valor(agoraLs) ?? 0 : valor(alvo),
    antes: dias ? valor(antesLs) : null,
    natureza,
    diasMedidosAntes: antesLs.length,
    nuncaHouve: alvo.length === 0 || alvo.every((l) => Number(l.n) === 0),
    cestaAgora: natureza === 'estoque' ? cesta(agoraLs) : null,
    cestaAntes: natureza === 'estoque' ? cesta(antesLs) : null,
  };
}

function Seta({ agora, antes }: { agora: number; antes: number }) {
  const d = agora - antes;
  const pct = antes === 0 ? null : Math.round((d / antes) * 100);
  const Icone = d > 0 ? TrendingUp : d < 0 ? TrendingDown : Minus;
  const tom = d > 0 ? 'text-success' : d < 0 ? 'text-danger' : 'text-muted';
  const palavra = d > 0 ? 'subiu' : d < 0 ? 'caiu' : 'igual';
  return (
    <span className={`font-mono text-[10px] inline-flex items-center gap-1 ${tom}`}>
      <Icone className="w-3 h-3" />
      {/* A palavra vai junto da seta: cor nunca informa sozinha. */}
      {palavra}{pct != null && d !== 0 && ` ${Math.abs(pct)}%`}
      <span className="text-muted">· antes {num(antes)}</span>
    </span>
  );
}

export default function Central({ periodo, recarga = 0 }: { periodo: Periodo; recarga?: number }) {
  const [linhas, setLinhas] = useState<Dia[] | null>(null);
  const [meta, setMeta] = useState<Meta | null | 'sem_acesso'>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Pede só a janela que a tela usa (o período e o anterior, com folga), não a série inteira: a
    // view é `security_invoker`, então do lado do app ela passa pela RLS das tabelas de baixo e o
    // custo aparece. Em "tudo" não há como recortar — e aí a espera é honesta, porque é tudo mesmo.
    const corteDias = periodo === 'tudo' ? null : Number(periodo) * 2 + 2;
    const corte = corteDias ? diaBRT(maisDias(new Date(), -corteDias)) : null;
    // Paginado em 19/11: o `.limit(5000)` era fantasia — a API devolve no máximo mil linhas e chama
    // isso de sucesso. Hoje a view tem 588 linhas, longe do teto, mas "tudo" não tem recorte: o dia
    // em que passar, a série perderia a ponta sem avisar.
    lerTudo<Dia>((de, ate) => {
      const q = supabase.from('v_marketing_cadeia_dia').select('*')
        .order('dia').order('elo').order('medida').range(de, ate);
      return corte ? q.gte('dia', corte) : q;
    }).then(setLinhas).catch((e) => { setErro(String(e?.message ?? e)); setLinhas([]); });
    supabase.from('v_receita_meta').select('*').maybeSingle()
      .then(({ data, error }) => setMeta(error || !data ? 'sem_acesso' : (data as Meta)));
  }, [periodo, recarga]);

  const leituras = useMemo(
    () => ELOS.map((e) => ({ ...e, m: linhas ? medir(linhas, e.elo, e.medida, periodo) : null })),
    [linhas, periodo],
  );

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <Target className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Estamos indo bem?</span>
        <span className="font-mono text-[10px] text-muted">
          {periodo === 'tudo' ? 'desde o início' : `últimos ${periodo} dias`}
          {periodo !== 'tudo' && ', comparados com os anteriores'}
        </span>
      </div>

      {/* Placar do mês — o mesmo da página Receita, lido da mesma fonte e não recalculado aqui. */}
      <div className="px-4 py-3 border-b border-outline/10">
        {meta === null ? (
          <div className="text-sm text-muted">Carregando o placar…</div>
        ) : meta === 'sem_acesso' ? (
          <div className="text-sm text-on-surface-variant">
            O placar do mês só aparece para quem tem acesso à Receita — <span className="text-muted">isso é falta de acesso, não meta zerada.</span>
          </div>
        ) : (
          <div className="flex flex-wrap items-baseline gap-x-6 gap-y-2">
            <div>
              <div className="text-2xl font-bold tabular-nums text-on-surface">{brl(meta.dinheiro_novo_brl)}</div>
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted">dinheiro novo no mês</div>
            </div>
            <div className="text-sm text-on-surface-variant">
              de <strong className="text-on-surface">{brl(meta.meta_brl)}</strong> ·
              falta <strong className="text-on-surface">{brl(meta.falta_brl)}</strong> em{' '}
              <strong className="text-on-surface">{meta.dias_restantes}</strong> dia(s)
            </div>
            {/* Proposta não é dinheiro: o que ainda não foi medido aparece à parte, nunca somado. */}
            {meta.linhas_so_proposta > 0 && (
              <span className="font-mono text-[10px] text-warning">
                {meta.linhas_so_proposta} linha(s) ainda são proposta, fora da conta
              </span>
            )}
          </div>
        )}
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger">Não consegui ler a cadeia: {erro}.</div>
      ) : linhas === null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando a cadeia…</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-y md:divide-y-0 divide-outline/10">
          {leituras.map(({ rotulo, sufixo, m }) => (
            <div key={rotulo} className="px-4 py-3">
              <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{rotulo}</div>
              <div className="text-xl font-bold tabular-nums text-on-surface mt-0.5">
                {m == null ? '—' : num(m.agora ?? 0)}
              </div>
              <div className="font-mono text-[9px] text-muted">{sufixo}</div>
              <div className="mt-1 min-h-[1.1rem]">
                {m == null ? (
                  <span className="font-mono text-[10px] text-muted">sem dado</span>
                ) : m.nuncaHouve ? (
                  /* "Nunca houve" e "caiu 100%" levam a ações opostas: uma é esperar, a outra é correr. */
                  <span className="font-mono text-[10px] text-muted">nunca houve registro</span>
                ) : periodo === 'tudo' ? (
                  <span className="font-mono text-[10px] text-muted">sem período anterior</span>
                ) : m.natureza === 'estoque' && m.cestaAgora != null && m.cestaAntes != null && m.cestaAgora !== m.cestaAntes ? (
                  /* Cesta diferente não se compara: a diferença seria da régua, não do resultado. */
                  <span className="font-mono text-[10px] text-warning">
                    sem base: a medição mudou de tamanho ({m.cestaAntes} → {m.cestaAgora} contas)
                  </span>
                ) : m.antes == null || m.diasMedidosAntes < 4 ? (
                  <span className="font-mono text-[10px] text-muted">
                    sem base{m.diasMedidosAntes > 0 && ` (${m.diasMedidosAntes} dia(s) antes)`}
                  </span>
                ) : (
                  <Seta agora={m.agora ?? 0} antes={m.antes} />
                )}
              </div>
              {m?.natureza === 'estoque' && (
                <div className="font-mono text-[9px] text-muted mt-0.5">censo: vale o último dia, não a soma</div>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
