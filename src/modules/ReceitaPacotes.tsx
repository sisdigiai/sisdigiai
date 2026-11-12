import { useEffect, useRef, useState } from 'react';
import { AlertTriangle, ArrowLeft, FileText, Paperclip } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Aviso, Carregando, quando } from './ReceitaIdeias';

// Aba Pacotes da página Receita (migration 225; pedido do dono em 12/11/2026).
//
// O detalhe de cada pacote do Agente de Receita (plano, peças, listas, testes), lido no app em vez de na
// pasta do Cockpit. É SÓ LEITURA: nada aqui envia, aprova ou muda estado. O "pode" de cada pacote continua
// sendo dito pelo dono no canal de quem executa.
//
// O texto chega do banco já partido em blocos pela carga (`Cockpit/scripts/receita-pacotes-sync.mjs`). A
// tela desenha bloco por bloco e NÃO interpreta HTML: negrito, código e riscado são lidos aqui, à mão.

type Bloco =
  | { t: 'h'; n: number; x: string }
  | { t: 'p'; x: string }
  | { t: 'q'; blocos: Bloco[] }
  | { t: 'l'; itens: { m: string; n: number; x: string }[] }
  | { t: 'tab'; cab: string[]; linhas: string[][] }
  | { t: 'hr' };
interface Doc { arquivo: string; titulo: string; blocos: Bloco[] }
interface Pacote {
  slug: string; ordem: number; titulo: string; risco: string | null; caminho: string;
  docs: Doc[]; anexos: { arquivo: string; bytes: number }[];
  ideias: { slug: string; codigo: string; titulo: string }[]; atualizado_em: string;
}

const foco = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-action';
const tamanho = (b: number) => (b >= 1048576 ? `${(b / 1048576).toFixed(1).replace('.', ',')} MB` : `${Math.max(1, Math.round(b / 1024))} KB`);

export default function ReceitaPacotes({ slug, doc }: { slug: string | null; doc: string | null }) {
  const [pacotes, setPacotes] = useState<Pacote[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('v_receita_pacotes').select('*').order('ordem').then(({ data, error }) => {
      if (error) { setErro(error.message); return; }
      setPacotes((data ?? []) as Pacote[]);
    });
  }, []);

  if (erro) {
    const semBanco = /v_receita_pacotes|does not exist|schema cache/i.test(erro);
    return (
      <Aviso tom="danger">
        {semBanco
          ? 'A aba Pacotes ainda não está ligada ao banco: falta aplicar a migration 225 e rodar a carga dos pacotes.'
          : 'Os pacotes não carregaram.'}{' '}
        <span className="font-mono text-[11px]">({erro})</span>
      </Aviso>
    );
  }
  if (!pacotes) return <Carregando />;
  if (pacotes.length === 0) {
    return (
      <Aviso tom="warning">
        Nenhum pacote no banco. Isto não quer dizer que não há pacotes: quer dizer que a carga de{' '}
        <code className="text-[11px]">Cockpit/receita/pacotes/</code> ainda não rodou.
      </Aviso>
    );
  }

  if (slug) {
    const pacote = pacotes.find((p) => p.slug === slug);
    if (!pacote) {
      return (
        <div className="space-y-3">
          <Voltar />
          <Aviso tom="warning">Não existe pacote com o endereço “{slug}”. Pode ter mudado de nome na carga.</Aviso>
        </div>
      );
    }
    return <Pagina pacote={pacote} arquivo={doc} />;
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="text-[13px] text-muted max-w-3xl">
          O detalhe de cada pacote do Agente de Receita: o plano, as peças, as listas e os testes. Aqui é só
          leitura. Nada sai da casa por esta tela; o “pode” de cada pacote continua sendo teu, no canal de quem executa.
        </p>
        <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant tabular-nums">
          {pacotes.length} pacotes · {pacotes.reduce((n, p) => n + p.docs.length, 0)} documentos
        </p>
      </div>
      <ul className="grid md:grid-cols-2 gap-3">
        {pacotes.map((p) => (
          <li key={p.slug}>
            <a href={`#/receita/pacotes/${encodeURIComponent(p.slug)}`}
               className={`flex h-full flex-col gap-2 border border-outline/15 bg-surface-container p-4 hover:bg-surface-high ${foco}`}>
              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{p.slug}</span>
              <h3 className="font-serif text-base font-semibold text-on-surface">{p.titulo}</h3>
              {p.risco
                ? (
                  <p className="flex items-start gap-2 text-[13px] text-on-surface-variant">
                    <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" aria-hidden="true" />
                    <span className="line-clamp-4">{formatar(p.risco)}</span>
                  </p>
                )
                : <p className="text-[13px] text-muted">Este pacote não abre com risco escrito.</p>}
              <p className="mt-auto border-t border-outline/10 pt-2 font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">
                {p.docs.length} {p.docs.length === 1 ? 'documento' : 'documentos'}
                {p.anexos.length > 0 && <> · {p.anexos.length} {p.anexos.length === 1 ? 'anexo fora do app' : 'anexos fora do app'}</>}
                {p.ideias.length > 0 && <> · ideias {p.ideias.map((i) => i.codigo).join(', ')}</>}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}

// ─────────────────────────────────────────────────────────── página de um pacote

function Pagina({ pacote, arquivo }: { pacote: Pacote; arquivo: string | null }) {
  const topo = useRef<HTMLDivElement>(null);
  const doc = pacote.docs.find((d) => d.arquivo === arquivo) ?? pacote.docs[0];
  const naoAchou = arquivo !== null && doc.arquivo !== arquivo;

  useEffect(() => { topo.current?.scrollIntoView({ block: 'start' }); }, [pacote.slug, doc.arquivo]);

  const aba = (ativa: boolean) =>
    `min-h-[44px] inline-flex items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-wider ${foco} `
    + (ativa ? 'border-action bg-action text-on-action' : 'border-outline/30 text-on-surface hover:bg-surface-highest');

  return (
    <div ref={topo} className="space-y-5">
      <Voltar />

      <div className="space-y-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{pacote.caminho}</span>
        <h2 className="font-serif text-2xl text-on-surface">{pacote.titulo}</h2>
      </div>

      {pacote.ideias.length > 0 && (
        <p className="text-[13px] text-on-surface-variant">
          Ideias que usam este pacote:{' '}
          {pacote.ideias.map((i, k) => (
            <span key={i.slug}>
              {k > 0 && ' · '}
              <a href={`#/receita/ideias/${encodeURIComponent(i.slug)}`} className={`underline hover:text-on-surface ${foco}`}>
                {i.codigo} {i.titulo}
              </a>
            </span>
          ))}
        </p>
      )}

      {pacote.docs.length > 1 && (
        <nav aria-label="Documentos do pacote" className="flex flex-wrap gap-2">
          {pacote.docs.map((d) => (
            <a key={d.arquivo} href={`#/receita/pacotes/${encodeURIComponent(pacote.slug)}/${encodeURIComponent(d.arquivo)}`}
               aria-current={d.arquivo === doc.arquivo ? 'page' : undefined} className={aba(d.arquivo === doc.arquivo)}>
              <FileText className="w-3.5 h-3.5" aria-hidden="true" /> {d.arquivo.replace(/\.md$/, '')}
            </a>
          ))}
        </nav>
      )}

      {naoAchou && <Aviso tom="warning">Este pacote não tem o documento “{arquivo}”. Mostrando o primeiro.</Aviso>}

      <article aria-labelledby="titulo-doc" className="space-y-3">
        <h3 id="titulo-doc" className="font-serif text-lg font-semibold text-on-surface">{doc.titulo}</h3>
        <Blocos blocos={doc.blocos} />
      </article>

      {pacote.anexos.length > 0 && (
        <section aria-labelledby="titulo-anexos" className="border border-outline/15 bg-surface-container p-3 space-y-2">
          <h3 id="titulo-anexos" className="flex items-center gap-2 font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">
            <Paperclip className="w-3.5 h-3.5" aria-hidden="true" /> Anexos que não estão no app
          </h3>
          <p className="text-[13px] text-on-surface-variant">
            Planilha e lista grande ficam na pasta <code className="text-[11px]">{pacote.caminho}</code>:
          </p>
          <ul className="list-disc pl-5 text-[13px] text-on-surface">
            {pacote.anexos.map((a) => <li key={a.arquivo}>{a.arquivo} <span className="text-muted tabular-nums">({tamanho(a.bytes)})</span></li>)}
          </ul>
        </section>
      )}

      <p className="font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">
        pacote carregado em {quando(pacote.atualizado_em)}
      </p>
      <Voltar />
    </div>
  );
}

// ─────────────────────────────────────────────────────────── blocos de texto

function Blocos({ blocos }: { blocos: Bloco[] }) {
  return (
    <div className="space-y-3 max-w-4xl text-[14px] leading-relaxed text-on-surface">
      {blocos.map((b, k) => <BlocoTexto key={k} bloco={b} />)}
    </div>
  );
}

function BlocoTexto({ bloco: b }: { bloco: Bloco }) {
  if (b.t === 'h') {
    // O título do documento já é o h3 da página: seção vira h4, subseção h5.
    return b.n <= 2
      ? (
        <div className="flex items-center gap-3 pt-3">
          <h4 className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">{formatar(b.x)}</h4>
          <span className="h-px flex-1 bg-outline/15" />
        </div>
      )
      : <h5 className="pt-1 font-serif text-base font-semibold text-on-surface">{formatar(b.x)}</h5>;
  }
  if (b.t === 'p') return <p className="whitespace-pre-line">{formatar(b.x)}</p>;
  if (b.t === 'hr') return <hr className="border-outline/15" />;
  if (b.t === 'q') {
    return (
      <blockquote className="space-y-2 border-l-2 border-outline/30 bg-surface-container p-3 text-on-surface-variant">
        {b.blocos.map((d, k) => <BlocoTexto key={k} bloco={d} />)}
      </blockquote>
    );
  }
  if (b.t === 'l') {
    return (
      <ul className="space-y-1">
        {b.itens.map((it, k) => (
          <li key={k} className={`flex gap-2 ${it.n > 0 ? 'pl-6' : ''}`}>
            <span className="shrink-0 text-muted tabular-nums" aria-hidden={it.m === '•'}>{it.m}</span>
            <span>{formatar(it.x)}</span>
          </li>
        ))}
      </ul>
    );
  }
  return (
    <div className="overflow-x-auto border border-outline/15" tabIndex={0} role="region" aria-label="Tabela (rola para o lado)">
      <table className="w-full border-collapse text-left text-[13px]">
        {b.cab.length > 0 && (
          <thead>
            <tr className="bg-surface-high">
              {b.cab.map((c, k) => (
                <th key={k} scope="col" className="border-b border-outline/15 p-2 align-bottom font-mono text-[9px] font-normal uppercase tracking-wider text-muted">{formatar(c)}</th>
              ))}
            </tr>
          </thead>
        )}
        <tbody>
          {b.linhas.map((l, k) => (
            <tr key={k} className="border-b border-outline/10 last:border-b-0">
              {l.map((c, j) => <td key={j} className="min-w-[7rem] p-2 align-top">{formatar(c)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Marcação simples dentro do texto: **negrito**, `código`, ~~riscado~~, *itálico* e [texto](https://…).
// O que não casa com nenhuma fica como está escrito. Nada vira HTML.
const MARCA = /(\*\*(?!\s)[^\n]+?(?<!\s)\*\*|`[^`\n]+`|~~[^~\n]+~~|\[[^\]\n]+\]\(https?:\/\/[^\s)]+\)|\*(?![\s*])[^*\n]+?(?<![\s*])\*)/;

function formatar(texto: string): React.ReactNode {
  const partes = texto.split(MARCA);
  if (partes.length === 1) return texto;
  return partes.map((p, k) => {
    if (k % 2 === 0) return p;
    if (p.startsWith('**')) return <strong key={k} className="font-semibold text-on-surface">{formatar(p.slice(2, -2))}</strong>;
    if (p.startsWith('`')) return <code key={k} className="break-words bg-surface-high px-1 font-mono text-[12px]">{p.slice(1, -1)}</code>;
    if (p.startsWith('~~')) return <s key={k} className="text-muted">{formatar(p.slice(2, -2))}</s>;
    if (p.startsWith('[')) {
      const m = p.match(/^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/);
      if (!m) return p;
      return <a key={k} href={m[2]} target="_blank" rel="noopener noreferrer" className={`underline hover:text-on-surface ${foco}`}>{m[1]}</a>;
    }
    return <em key={k}>{formatar(p.slice(1, -1))}</em>;
  });
}

function Voltar() {
  return (
    <a href="#/receita/pacotes"
       className={`inline-flex min-h-[44px] items-center gap-2 font-mono text-[10px] uppercase tracking-wider text-on-surface-variant hover:text-on-surface ${foco}`}>
      <ArrowLeft className="w-3.5 h-3.5" aria-hidden="true" /> Todos os pacotes
    </a>
  );
}
