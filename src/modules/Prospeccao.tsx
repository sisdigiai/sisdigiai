import { useEffect, useMemo, useState } from 'react';
import { Snowflake, RefreshCw } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import ToqueVenda from '../components/ToqueVenda';
import { supabase } from '../lib/supabase';

// Kanban da prospecção — pedido do dono (29/09/2026), fonte public.v_mkt_funil_leads (MKT).
//
// A tela responde DUAS perguntas que se confundem quando ficam juntas:
//   1. "quantos chegaram até aqui?" → a régua de cima, por MARCO alcançado (carimbo de data no lead).
//      Cumulativa: quem clicou também foi abordado, e continua contando nos dois.
//   2. "onde cada lead está AGORA?" → as colunas do kanban, por etapa atual. Um lead vive em uma só.
// Somar as duas leituras numa coluna só é o erro clássico do funil: dá conversão maior que 100%.
//
// "Esfriou" não é etapa, é estado: o lead continua na coluna onde parou, com marca própria. Virar coluna
// misturaria "sumiu depois de abordado" com "disse não" — e a segunda informa muito mais que a primeira.
//
// Leitura pura (R-044): nada aqui escreve. Sem telefone e sem nome de pessoa — a view já não os traz.

interface Lead {
  lead_id: string; otica: string | null; cidade: string | null; uf: string | null;
  porte: string | null; ramal: string | null; etapa: string; etapa_desde: string | null;
  toques: number; ultimo_toque_em: string | null; proximo_toque_em: string | null;
  abordada_em: string | null; robo_em: string | null; pessoa_em: string | null;
  interesse_em: string | null; link_enviado_em: string | null; clicou_em: string | null;
  comprou_em: string | null; saiu_em: string | null; esfriou: boolean;
}

// 166: "morno" é o lead que o DONO tocou (ligação, demo ou piloto registrado em 1 toque). Não é etapa do
// MKT e não pedi que virasse: a coluna é derivada aqui, do nosso próprio registro. Fica ANTES das colunas do
// robô porque quem falou com uma pessoa está na frente de quem recebeu mensagem automática — e misturar os
// dois foi exatamente o que fez "48 responderam" parecer pipeline quando 39 eram resposta a robô.
const MORNO = 'morno';

const ORDEM: { id: string; rotulo: string }[] = [
  { id: 'captada', rotulo: 'Captada' },
  { id: 'abordada', rotulo: 'Abordada' },
  { id: MORNO, rotulo: 'Morno · o dono tocou' },
  { id: 'respondeu_robo', rotulo: 'Respondeu ao robô' },
  { id: 'respondeu_a_conferir', rotulo: 'Respondeu · a conferir' },
  { id: 'respondeu_pessoa', rotulo: 'Falou com pessoa' },
  { id: 'interessada', rotulo: 'Interessada' },
  { id: 'link_enviado', rotulo: 'Link enviado' },
  { id: 'clicou', rotulo: 'Clicou' },
  { id: 'comprou', rotulo: 'Comprou' },
];
const FIM: { id: string; rotulo: string }[] = [
  { id: 'saiu', rotulo: 'Saiu' },
  { id: 'perdida', rotulo: 'Perdida' },
];

// Marco = carimbo no lead. A régua de conversão lê isto, não a etapa atual.
const MARCOS: { campo: keyof Lead; rotulo: string }[] = [
  { campo: 'abordada_em', rotulo: 'Abordada' },
  { campo: 'robo_em', rotulo: 'Respondeu' },
  { campo: 'pessoa_em', rotulo: 'Falou com pessoa' },
  { campo: 'interesse_em', rotulo: 'Interessada' },
  { campo: 'link_enviado_em', rotulo: 'Link enviado' },
  { campo: 'clicou_em', rotulo: 'Clicou' },
  { campo: 'comprou_em', rotulo: 'Comprou' },
];

const dias = (iso: string | null): number | null =>
  iso ? Math.floor((Date.now() - new Date(iso).getTime()) / 86400000) : null;

export default function Prospeccao() {
  const [leads, setLeads] = useState<Lead[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [uf, setUf] = useState<string>('todas');
  const [frente, setFrente] = useState<string>('todas');
  const [carregando, setCarregando] = useState(true);
  const [tocados, setTocados] = useState<Map<string, { tipo: string; quando: string }>>(new Map());

  const carregar = () => {
    setCarregando(true);
    supabase.from('v_ops_toques_lead').select('*').then(({ data }) => {
      setTocados(new Map(((data ?? []) as { lead_id: string; tipo: string; quando: string }[])
        .filter((t) => t.lead_id).map((t) => [t.lead_id, { tipo: t.tipo, quando: t.quando }])));
    });
    supabase.from('v_mkt_funil_leads').select('*').then(({ data, error }) => {
      if (error) { setErro(error.message); setLeads([]); }
      else { setErro(null); setLeads((data ?? []) as Lead[]); }
      setCarregando(false);
    });
  };
  useEffect(carregar, []);

  const contar = (lista: Lead[], chave: (l: Lead) => string) => {
    const m = new Map<string, number>();
    for (const l of lista) { const k = chave(l); m.set(k, (m.get(k) ?? 0) + 1); }
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  };
  const daFrente = (l: Lead) => l.ramal ?? 'sem frente';

  // Cada contador respeita o OUTRO filtro: botão cujo número não muda quando o vizinho muda faz a pessoa
  // clicar e achar que a tela quebrou.
  const frentes = useMemo(
    () => contar((leads ?? []).filter((l) => uf === 'todas' || (l.uf ?? '?') === uf), daFrente),
    [leads, uf],
  );
  const ufs = useMemo(
    () => contar((leads ?? []).filter((l) => frente === 'todas' || daFrente(l) === frente), (l) => l.uf ?? '?'),
    [leads, frente],
  );

  const visiveis = useMemo(
    () => (leads ?? []).filter((l) =>
      (uf === 'todas' || (l.uf ?? '?') === uf) && (frente === 'todas' || daFrente(l) === frente)),
    [leads, uf, frente],
  );

  // Lead tocado pelo dono sai da coluna do robô e vai para "morno" — a menos que já tenha andado além
  // (interessada, link, clicou, comprou), onde a etapa do MKT diz mais que o nosso registro.
  const ADIANTE = new Set(['interessada', 'link_enviado', 'clicou', 'comprou', 'saiu', 'perdida']);
  const porEtapa = useMemo(() => {
    const m = new Map<string, Lead[]>();
    for (const l of visiveis) {
      const etapa = tocados.has(l.lead_id) && !ADIANTE.has(l.etapa) ? MORNO : l.etapa;
      m.set(etapa, [...(m.get(etapa) ?? []), l]);
    }
    return m;
  }, [visiveis, tocados]);

  // Etapa que a view devolve e esta tela não conhece: aparece no fim, nomeada, em vez de sumir.
  const desconhecidas = useMemo(
    () => [...porEtapa.keys()].filter((e) => !ORDEM.some((o) => o.id === e) && !FIM.some((f) => f.id === e)),
    [porEtapa],
  );
  const recarregarToques = () =>
    supabase.from('v_ops_toques_lead').select('*').then(({ data }) => {
      setTocados(new Map(((data ?? []) as { lead_id: string; tipo: string; quando: string }[])
        .filter((t) => t.lead_id).map((t) => [t.lead_id, { tipo: t.tipo, quando: t.quando }])));
    });

  if (erro) {
    return (
      <div>
        <PageHeader eyebrow="Mercado" title="Prospecção" subtitle="Kanban do funil de prospecção." />
        <div className="border border-danger/40 bg-danger/5 p-4 text-sm text-on-surface">
          <b>Não foi possível ler o funil</b> (<span className="font-mono text-[12px]">v_mkt_funil_leads</span>): {erro}.
          A tela não mostra funil antigo no lugar.
        </div>
      </div>
    );
  }

  const total = visiveis.length;
  const esfriaram = visiveis.filter((l) => l.esfriou).length;
  const semFrente = visiveis.filter((l) => !l.ramal).length;

  return (
    <div>
      <PageHeader
        eyebrow="Mercado"
        title="Prospecção"
        subtitle={`${total} óticas no funil · ${esfriaram} esfriaram sem responder · ${semFrente} ainda sem frente definida · lido de v_mkt_funil_leads, sem telefone nem nome de pessoa`}
        actions={
          <button onClick={carregar} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Recarregar">
            <RefreshCw size={16} className={carregando ? 'animate-spin' : ''} />
          </button>
        }
      />

      <div className="mb-6"><ToqueVenda aoRegistrar={recarregarToques} /></div>

      <div className="flex flex-wrap items-start gap-x-6 gap-y-3 mb-6">
        <Filtro rotulo="Frente" valor={frente} opcoes={frentes} aoTrocar={setFrente}
          total={(leads ?? []).filter((l) => uf === 'todas' || (l.uf ?? '?') === uf).length} />
        <Filtro rotulo="UF" valor={uf} opcoes={ufs} aoTrocar={setUf}
          total={(leads ?? []).filter((l) => frente === 'todas' || daFrente(l) === frente).length} />
      </div>

      {/* Régua de conversão: quantos ALCANÇARAM cada marco, não quantos estão nele agora. */}
      <div className="border border-outline/15 bg-surface-container p-4 mb-6">
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary mb-3">
          Chegaram até aqui · por marco carimbado no lead
        </div>
        <div className="flex flex-wrap gap-x-6 gap-y-3">
          <Marco rotulo="No funil" n={total} base={null} />
          {MARCOS.map((m, i) => {
            const n = visiveis.filter((l) => l[m.campo] != null).length;
            const anterior = i === 0 ? total : visiveis.filter((l) => l[MARCOS[i - 1].campo] != null).length;
            return <Marco key={m.rotulo} rotulo={m.rotulo} n={n} base={anterior} />;
          })}
        </div>
        <p className="text-[11px] text-muted mt-3 leading-snug">
          Cumulativo: quem clicou também foi abordado e conta nos dois. Já as colunas abaixo dizem onde cada
          lead está <em>agora</em> — somar as duas leituras dá conversão maior que 100%.
        </p>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-3">
        {ORDEM.map((c) => <Coluna key={c.id} rotulo={c.rotulo} leads={porEtapa.get(c.id) ?? []} />)}
      </div>

      <div className="flex items-center gap-3 mt-8 mb-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-muted">Fora do funil</span>
        <span className="h-px flex-1 bg-outline/15" />
      </div>
      <div className="flex gap-3 overflow-x-auto pb-3">
        {FIM.map((c) => <Coluna key={c.id} rotulo={c.rotulo} leads={porEtapa.get(c.id) ?? []} apagado />)}
        {desconhecidas.map((e) => <Coluna key={e} rotulo={`${e} · etapa nova`} leads={porEtapa.get(e) ?? []} apagado />)}
      </div>

      <p className="text-xs text-muted mt-6 leading-relaxed">
        A esteira do DIGIAI MKT move o lead pelas etapas; <b>Morno</b> é nosso: sai do registro em 1 toque
        acima, e some quando o lead anda além (interessada em diante), porque aí a etapa do MKT diz mais. <b>Esfriou</b> é o lead que parou de
        responder onde estava, não uma recusa: fica na própria coluna, com o floco. Compra vem das vendas da
        Hotmart cruzadas por <span className="font-mono">utm_content</span>; enquanto ninguém comprou, a coluna
        fica vazia — e vazio aqui é medição, não falta de dado.
      </p>
    </div>
  );
}

function Filtro({ rotulo, valor, opcoes, aoTrocar, total }: {
  rotulo: string; valor: string; opcoes: [string, number][]; aoTrocar: (v: string) => void; total: number;
}) {
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted mb-1">{rotulo}</div>
      <div className="flex flex-wrap items-center gap-1 border border-outline/15 w-fit p-0.5">
        {([['todas', total] as [string, number]]).concat(opcoes).map(([id, n]) => (
          <button key={id} onClick={() => aoTrocar(id)}
            className={`font-mono text-[10px] uppercase tracking-widest px-3 py-1.5 transition-colors ${
              valor === id ? 'bg-secondary text-on-action' : 'text-muted hover:text-on-surface'}`}>
            {id === 'todas' ? 'Todas' : id} <span className="opacity-60">{n}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function Marco({ rotulo, n, base }: { rotulo: string; n: number; base: number | null }) {
  const pct = base && base > 0 ? (n / base) * 100 : null;
  return (
    <div>
      <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{rotulo}</div>
      <div className="flex items-baseline gap-1.5">
        <span className={`font-serif text-2xl font-semibold tabular-nums ${n === 0 ? 'text-muted' : 'text-on-surface'}`}>{n}</span>
        {pct != null && (
          <span className={`font-mono text-[10px] ${pct >= 20 ? 'text-success' : pct > 0 ? 'text-warning' : 'text-muted'}`}>
            {pct.toFixed(pct < 10 ? 1 : 0)}%
          </span>
        )}
      </div>
    </div>
  );
}

const MOSTRA = 10;

function Coluna({ rotulo, leads, apagado }: { rotulo: string; leads: Lead[]; apagado?: boolean }) {
  const [tudo, setTudo] = useState(false);
  const frios = leads.filter((l) => l.esfriou).length;
  const diasMedio = leads.length
    ? Math.round(leads.reduce((s, l) => s + (dias(l.etapa_desde) ?? 0), 0) / leads.length)
    : null;
  const lista = tudo ? leads : leads.slice(0, MOSTRA);

  return (
    <div className={`min-w-[220px] w-[220px] shrink-0 border border-outline/15 bg-surface-container ${apagado ? 'opacity-70' : ''}`}>
      <div className="px-3 py-2 border-b border-outline/10">
        <div className="flex items-baseline justify-between gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-on-surface truncate">{rotulo}</span>
          <span className={`font-serif text-lg font-semibold tabular-nums ${leads.length ? 'text-on-surface' : 'text-muted'}`}>
            {leads.length}
          </span>
        </div>
        <div className="font-mono text-[9px] uppercase tracking-wider text-muted flex items-center gap-2">
          {diasMedio != null ? `${diasMedio} d na etapa` : 'vazia'}
          {frios > 0 && <span className="flex items-center gap-0.5 text-warning"><Snowflake className="w-2.5 h-2.5" />{frios}</span>}
        </div>
      </div>

      <div className="max-h-[520px] overflow-y-auto">
        {lista.map((l) => {
          const d = dias(l.etapa_desde);
          return (
            <div key={l.lead_id} className="px-3 py-2 border-b border-outline/10 last:border-b-0">
              <div className="flex items-start gap-1.5">
                <span className="text-[12px] text-on-surface leading-snug flex-1 min-w-0">{l.otica ?? 'sem nome'}</span>
                {l.esfriou && <Snowflake className="w-3 h-3 text-warning shrink-0 mt-0.5" />}
              </div>
              <div className="font-mono text-[9px] uppercase tracking-wider text-muted truncate">
                {l.cidade ?? '—'}{l.uf ? `/${l.uf}` : ''}{l.porte ? ` · ${l.porte}` : ''}
              </div>
              <div className="font-mono text-[9px] text-muted">
                {d != null ? `há ${d} d` : 'sem data'} · {l.toques} toque{l.toques === 1 ? '' : 's'}
              </div>
            </div>
          );
        })}
        {leads.length > MOSTRA && !tudo && (
          <button onClick={() => setTudo(true)}
            className="w-full px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-secondary hover:bg-surface-high">
            + {leads.length - MOSTRA} mais
          </button>
        )}
        {leads.length === 0 && <div className="px-3 py-3 text-[11px] text-muted">nenhuma aqui</div>}
      </div>
    </div>
  );
}
