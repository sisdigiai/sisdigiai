import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, Crosshair, Lightbulb } from 'lucide-react';
import { supabase } from '../lib/supabase';

// Aba Ideias da página Receita (migration 224; pedido do dono em 11/11/2026).
//
// Um lugar só para as ideias do Agente de Receita: cards para comparar, a ficha completa de cada uma e a
// ESCOLHA do dono (foco, depois, não). A escolha é o que esta aba produz — o resto é leitura.
//
// A ficha vem de `Cockpit/receita/ideias/*.md` pela carga. Toda "conta" que aparece aqui é hipótese do
// Receita, salvo quando o próprio texto diz "medido": por isso ela é mostrada como TEXTO, nunca somada
// nem formatada como dinheiro do placar. Somar hipótese daria um total com cara de previsão.

interface Item { tipo: 'p' | 'li'; texto: string }
interface SecaoFicha { titulo: string; itens: Item[] }
type Escolha = 'foco' | 'depois' | 'nao';
interface Ideia {
  slug: string; codigo: string; ordem: number; titulo: string; grupo: string; veredito: string;
  resumo: string; conta: string | null; dias: string | null; prova: string | null; origem: string | null;
  secoes: SecaoFicha[]; escolha: Escolha | null; escolha_nota: string | null;
  escolha_por: string | null; escolha_em: string | null; atualizado_em: string;
}

// Classe escrita inteira, não montada: o Tailwind só gera o que encontra literal no código.
const VEREDITO: Record<string, { rotulo: string; classe: string }> = {
  norte:        { rotulo: 'norte',        classe: 'bg-action text-on-action border-action' },
  forte:        { rotulo: 'forte',        classe: 'bg-success-bg text-success border-success-bd' },
  media:        { rotulo: 'média',        classe: 'bg-info-bg text-info border-info-bd' },
  fraca:        { rotulo: 'fraca',        classe: 'bg-surface-high text-muted border-outline/30' },
  nao_fazer:    { rotulo: 'não fazer',    classe: 'bg-danger-bg text-danger border-danger-bd' },
  congelada:    { rotulo: 'congelada',    classe: 'bg-warning-bg text-warning border-warning-bd' },
  estacionada:  { rotulo: 'estacionada',  classe: 'bg-warning-bg text-warning border-warning-bd' },
  em_andamento: { rotulo: 'em andamento', classe: 'bg-info-bg text-info border-info-bd' },
  morta:        { rotulo: 'morta',        classe: 'bg-danger-bg text-danger border-danger-bd' },
};

const ESCOLHA: Record<Escolha, { rotulo: string; botao: string; classe: string }> = {
  foco:   { rotulo: 'em foco',     botao: 'Focar nesta',  classe: 'bg-action text-on-action border-action' },
  depois: { rotulo: 'para depois', botao: 'Deixar para depois', classe: 'bg-info-bg text-info border-info-bd' },
  nao:    { rotulo: 'descartada',  botao: 'Descartar',    classe: 'bg-surface-high text-muted border-outline/30' },
};

// Passou disto, a tela avisa. Não é trava: quem decide quantas frentes abre é o dono.
const FOCO_DEMAIS = 3;

const quando = (iso: string) =>
  new Date(iso).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });

export function subRotaReceita(): { aba: 'placar' | 'ideias'; slug: string | null } {
  if (typeof window === 'undefined') return { aba: 'placar', slug: null };
  const partes = window.location.hash.replace(/^#\/?/, '').split('/');
  if (partes[0] !== 'receita' || partes[1] !== 'ideias') return { aba: 'placar', slug: null };
  return { aba: 'ideias', slug: partes[2] ? decodeURIComponent(partes[2]) : null };
}

export function useSubRotaReceita() {
  const [sub, setSub] = useState(subRotaReceita);
  useEffect(() => {
    const onHash = () => setSub(subRotaReceita());
    window.addEventListener('hashchange', onHash);
    return () => window.removeEventListener('hashchange', onHash);
  }, []);
  return sub;
}

export default function ReceitaIdeias({ slug }: { slug: string | null }) {
  const [ideias, setIdeias] = useState<Ideia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const carregar = () =>
    supabase.from('v_receita_ideias').select('*').order('ordem').then(({ data, error }) => {
      if (error) { setErro(error.message); return; }
      setErro(null);
      setIdeias((data ?? []) as Ideia[]);
    });

  useEffect(() => { carregar(); }, []);

  if (erro) {
    // Relação ausente tem causa conhecida e conserto conhecido: dizer qual, em vez de mostrar o erro cru.
    const semBanco = /v_receita_ideias|does not exist|schema cache/i.test(erro);
    return (
      <Aviso tom="danger">
        {semBanco
          ? 'A aba Ideias ainda não está ligada ao banco: falta aplicar a migration 224 e rodar a carga das fichas.'
          : 'As ideias não carregaram.'}{' '}
        <span className="font-mono text-[11px]">({erro})</span>
      </Aviso>
    );
  }
  if (!ideias) return <Carregando />;
  if (ideias.length === 0) {
    return (
      <Aviso tom="warning">
        Nenhuma ficha no banco. Isto não quer dizer que não há ideias: quer dizer que a carga de{' '}
        <code className="text-[11px]">Cockpit/receita/ideias/</code> ainda não rodou.
      </Aviso>
    );
  }

  if (slug) {
    const ideia = ideias.find((i) => i.slug === slug);
    if (!ideia) {
      return (
        <div className="space-y-3">
          <Voltar />
          <Aviso tom="warning">Não existe ideia com o endereço “{slug}”. Pode ter mudado de nome na carga.</Aviso>
        </div>
      );
    }
    return <Ficha ideia={ideia} emFoco={ideias.filter((i) => i.escolha === 'foco').length} aoGravar={carregar} />;
  }
  return <Lista ideias={ideias} />;
}

// ─────────────────────────────────────────────────────────── lista de cards

function Lista({ ideias }: { ideias: Ideia[] }) {
  const [grupo, setGrupo] = useState('');
  const [veredito, setVeredito] = useState('');
  const [escolha, setEscolha] = useState('');

  const grupos = useMemo(() => [...new Set(ideias.map((i) => i.grupo))], [ideias]);
  const vereditos = useMemo(() => [...new Set(ideias.map((i) => i.veredito))], [ideias]);
  const emFoco = ideias.filter((i) => i.escolha === 'foco').length;
  const semEscolha = ideias.filter((i) => i.escolha === null).length;

  const visiveis = ideias.filter((i) =>
    (!grupo || i.grupo === grupo)
    && (!veredito || i.veredito === veredito)
    && (!escolha || (escolha === 'sem' ? i.escolha === null : i.escolha === escolha)));

  const campo = 'min-h-[44px] border border-outline/30 bg-surface-container px-2 text-[13px] text-on-surface '
    + 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-action';

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] text-muted max-w-3xl">
          Todas as ideias do Agente de Receita, com a ficha completa de cada uma. A conta de cada card é
          hipótese, salvo quando diz “medido”. Abre a ficha para escolher o que a casa foca.
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant tabular-nums">
          {ideias.length} ideias · {emFoco} em foco · {semEscolha} sem escolha
        </p>
      </div>

      {emFoco > FOCO_DEMAIS && (
        <Aviso tom="warning">
          {emFoco} ideias em foco ao mesmo tempo. A casa já se perdeu por abrir frente demais: vale conferir se
          alguma pode ir para “depois”.
        </Aviso>
      )}

      <div className="flex flex-wrap gap-2">
        <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-wider text-muted">
          Grupo
          <select value={grupo} onChange={(e) => setGrupo(e.target.value)} className={campo}>
            <option value="">todos os grupos</option>
            {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-wider text-muted">
          Veredito do Receita
          <select value={veredito} onChange={(e) => setVeredito(e.target.value)} className={campo}>
            <option value="">todos</option>
            {vereditos.map((v) => <option key={v} value={v}>{VEREDITO[v]?.rotulo ?? v}</option>)}
          </select>
        </label>
        <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-wider text-muted">
          Escolha do dono
          <select value={escolha} onChange={(e) => setEscolha(e.target.value)} className={campo}>
            <option value="">todas</option>
            <option value="foco">em foco</option>
            <option value="depois">para depois</option>
            <option value="nao">descartadas</option>
            <option value="sem">sem escolha</option>
          </select>
        </label>
      </div>

      {visiveis.length === 0 ? (
        <Aviso tom="warning">Nenhuma ideia com esse filtro. As {ideias.length} continuam lá: é o filtro que não achou.</Aviso>
      ) : (
        <ul className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {visiveis.map((i) => (
            <li key={i.slug}>
              <a href={`#/receita/ideias/${encodeURIComponent(i.slug)}`}
                 className="flex h-full flex-col gap-2 border border-outline/15 bg-surface-container p-4 hover:bg-surface-high focus-visible:outline focus-visible:outline-2 focus-visible:outline-action">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">{i.codigo}</span>
                  <Selo classe={VEREDITO[i.veredito]?.classe}>{VEREDITO[i.veredito]?.rotulo ?? i.veredito}</Selo>
                  {i.escolha && <Selo classe={ESCOLHA[i.escolha].classe}>{ESCOLHA[i.escolha].rotulo}</Selo>}
                </div>
                <h3 className="font-serif text-base font-semibold text-on-surface">{i.titulo}</h3>
                <p className="text-[13px] text-on-surface-variant">{i.resumo}</p>
                <dl className="mt-auto space-y-1 border-t border-outline/10 pt-2 text-[12px]">
                  <Linha rotulo="Conta">{i.conta ?? 'não medida'}</Linha>
                  <Linha rotulo="Dias até o primeiro real">{i.dias ?? 'não estimado'}</Linha>
                </dl>
                <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{i.grupo}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────── ficha completa

function Ficha({ ideia, emFoco, aoGravar }: { ideia: Ideia; emFoco: number; aoGravar: () => PromiseLike<unknown> }) {
  const [nota, setNota] = useState(ideia.escolha_nota ?? '');
  const [gravando, setGravando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const topo = useRef<HTMLDivElement>(null);

  // Abrir a ficha a partir de um card lá embaixo deixaria a tela no meio do texto.
  useEffect(() => {
    topo.current?.scrollIntoView({ block: 'start' });
    setNota(ideia.escolha_nota ?? '');
    setErro(null);
  }, [ideia.slug]);

  const escolher = async (valor: Escolha | null) => {
    setGravando(true);
    setErro(null);
    const { error } = await supabase.rpc('rpc_receita_escolher_ideia',
      { p_slug: ideia.slug, p_escolha: valor, p_nota: valor ? nota : null });
    if (error) setErro(error.message); else await aoGravar();
    setGravando(false);
  };

  const botao = 'min-h-[44px] border px-3 font-mono text-[10px] uppercase tracking-wider disabled:opacity-50 '
    + 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-action';
  const viraQuarto = ideia.escolha !== 'foco' && emFoco >= FOCO_DEMAIS;

  return (
    <div ref={topo} className="space-y-5">
      <Voltar />

      <div className="space-y-2">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">{ideia.codigo}</span>
          <Selo classe={VEREDITO[ideia.veredito]?.classe}>{VEREDITO[ideia.veredito]?.rotulo ?? ideia.veredito}</Selo>
          {ideia.escolha && <Selo classe={ESCOLHA[ideia.escolha].classe}>{ESCOLHA[ideia.escolha].rotulo}</Selo>}
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{ideia.grupo}</span>
        </div>
        <h2 className="font-serif text-2xl text-on-surface">{ideia.titulo}</h2>
        <p className="text-[14px] text-on-surface-variant max-w-3xl">{ideia.resumo}</p>
      </div>

      <dl className="grid md:grid-cols-2 gap-3">
        <Fato rotulo="Conta (hipótese, salvo se disser medido)">{ideia.conta ?? 'não medida'}</Fato>
        <Fato rotulo="Dias até o primeiro real">{ideia.dias ?? 'não estimado'}</Fato>
        <Fato rotulo="Prova">{ideia.prova ?? 'sem prova registrada'}</Fato>
        <Fato rotulo="Onde está escrito">{ideia.origem ?? 'sem origem registrada'}</Fato>
      </dl>

      <section aria-labelledby="titulo-escolha" className="border border-outline/30 bg-surface-container p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Crosshair className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
          <h3 id="titulo-escolha" className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">A escolha do dono</h3>
        </div>

        <p className="text-[13px] text-on-surface-variant" role="status">
          {ideia.escolha && ideia.escolha_em
            ? <>Marcada como <strong className="font-semibold text-on-surface">{ESCOLHA[ideia.escolha].rotulo}</strong> por {ideia.escolha_por} em <span className="tabular-nums">{quando(ideia.escolha_em)}</span>.{ideia.escolha_nota && <> Nota: “{ideia.escolha_nota}”.</>}</>
            : 'Ainda sem escolha.'}
        </p>

        {viraQuarto && (
          <p className="text-[12px] text-warning">
            Já há {emFoco} ideias em foco. Esta seria mais uma.
          </p>
        )}

        <label className="flex flex-col gap-1 font-mono text-[9px] uppercase tracking-wider text-muted">
          Nota (opcional; é gravada junto com a escolha)
          <textarea value={nota} onChange={(e) => setNota(e.target.value)} rows={2} maxLength={500}
                    className="border border-outline/30 bg-surface p-2 font-sans text-[13px] normal-case tracking-normal text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-action" />
        </label>

        <div className="flex flex-wrap gap-2">
          {(Object.keys(ESCOLHA) as Escolha[]).map((e) => (
            <button key={e} type="button" disabled={gravando} aria-pressed={ideia.escolha === e}
                    onClick={() => escolher(e)}
                    className={`${botao} ${ideia.escolha === e ? ESCOLHA[e].classe : 'border-outline/30 text-on-surface hover:bg-surface-highest'}`}>
              {ESCOLHA[e].botao}
            </button>
          ))}
          {ideia.escolha && (
            <button type="button" disabled={gravando} onClick={() => escolher(null)}
                    className={`${botao} border-transparent text-muted underline hover:text-on-surface`}>
              Limpar a escolha
            </button>
          )}
        </div>

        {gravando && <p className="font-mono text-[10px] uppercase tracking-wider text-muted" role="status">gravando…</p>}
        {erro && (
          <p className="flex items-start gap-2 text-[13px] text-danger" role="alert">
            <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <span>A escolha não foi gravada: {erro}. O que aparece acima é o que está no banco.</span>
          </p>
        )}
      </section>

      {ideia.secoes.map((s) => (
        <section key={s.titulo}>
          <div className="flex items-center gap-3 mb-2">
            <Lightbulb className="w-3.5 h-3.5 text-secondary" aria-hidden="true" />
            <h3 className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{s.titulo}</h3>
            <span className="h-px flex-1 bg-outline/15" />
          </div>
          <div className="space-y-2 max-w-3xl text-[14px] leading-relaxed text-on-surface">
            {agrupar(s.itens).map((bloco, k) => bloco.tipo === 'li'
              ? <ul key={k} className="list-disc pl-5 space-y-1">{bloco.textos.map((t, j) => <li key={j}>{t}</li>)}</ul>
              : <p key={k}>{bloco.textos[0]}</p>)}
          </div>
        </section>
      ))}

      <p className="font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">
        ficha carregada em {quando(ideia.atualizado_em)}
      </p>
      <Voltar />
    </div>
  );
}

// Itens `li` seguidos viram uma lista só; parágrafo fica sozinho.
function agrupar(itens: Item[]): { tipo: 'p' | 'li'; textos: string[] }[] {
  const blocos: { tipo: 'p' | 'li'; textos: string[] }[] = [];
  for (const it of itens) {
    const ultimo = blocos[blocos.length - 1];
    if (it.tipo === 'li' && ultimo?.tipo === 'li') ultimo.textos.push(it.texto);
    else blocos.push({ tipo: it.tipo, textos: [it.texto] });
  }
  return blocos;
}

// ─────────────────────────────────────────────────────────── peças pequenas

function Voltar() {
  return (
    <a href="#/receita/ideias"
       className="inline-flex min-h-[44px] items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-on-surface focus-visible:outline focus-visible:outline-2 focus-visible:outline-action">
      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Todas as ideias
    </a>
  );
}

function Selo({ classe, children }: { classe?: string; children: React.ReactNode }) {
  return (
    <span className={`border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider ${classe ?? 'border-outline/30 text-muted'}`}>
      {children}
    </span>
  );
}

function Linha({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="font-mono text-[9px] uppercase tracking-wider text-muted">{rotulo}</dt>
      <dd className="text-on-surface">{children}</dd>
    </div>
  );
}

function Fato({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="border border-outline/15 bg-surface-container p-3">
      <dt className="font-mono text-[9px] uppercase tracking-wider text-muted">{rotulo}</dt>
      <dd className="mt-1 text-[13px] text-on-surface">{children}</dd>
    </div>
  );
}

function Aviso({ tom, children }: { tom: 'warning' | 'danger'; children: React.ReactNode }) {
  const classe = tom === 'danger' ? 'border-danger/30 bg-danger/5 text-danger' : 'border-outline/20 bg-surface-container text-muted';
  return (
    <div className={`flex items-start gap-2 border p-3 text-[13px] ${classe}`}>
      <AlertTriangle className={`w-4 h-4 mt-0.5 shrink-0 ${tom === 'danger' ? '' : 'text-warning'}`} aria-hidden="true" />
      <span>{children}</span>
    </div>
  );
}

function Carregando() {
  return <div className="border border-outline/15 bg-surface-container p-3 font-mono text-[10px] uppercase tracking-wider text-muted">lendo…</div>;
}
