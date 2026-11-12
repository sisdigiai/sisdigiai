import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Aviso, Carregando, quando } from './ReceitaIdeias';

// Aba Aula da página Receita (migration 228; pedido do dono em 12/11/2026).
//
// O controle de cada edição da aula paga: quantas vagas vendeu, quantas faltam para acontecer ao vivo, quantas
// ligações de convite foram feitas e o que ainda trava. É SÓ LEITURA: a base vem da carga, as vendas vêm da
// view de vendas do app e as ligações vêm da Lista do dia.
//
// A regra desta tela: ZERO VENDA COM PRODUTO NÃO CRIADO NÃO É "NINGUÉM QUIS". Enquanto o produto não existe na
// plataforma de pagamento não há como vender, e a tela diz isso em vez de mostrar um zero seco.

interface Aula {
  slug: string; titulo: string; quando: string; preco_brl: string; minimo_ao_vivo: number;
  prazo_vendas: string; prazo_produto: string | null; produto_filtro: string; produto_criado: boolean;
  link_inscricao: string | null; pode_do_dono: boolean; atualizado_em: string;
  vendas: number; vendas_brl: string; ultima_venda: string | null;
  ligacoes_na_lista: number; ligacoes_faladas: number; ligacoes_nao_atenderam: number; ligacoes_nao_ligar: number;
}

const foco = 'focus-visible:outline focus-visible:outline-2 focus-visible:outline-action';
const botao = `min-h-[44px] inline-flex items-center gap-2 border px-3 font-mono text-[10px] uppercase tracking-wider ${foco}`;
const brl = (v: string | number) => Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const hojeBrt = () => new Date().toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
const diaEscrito = (d: string) => { const [a, m, j] = d.slice(0, 10).split('-'); return `${j}/${m}/${a}`; };
// Diferença em dias de calendário entre duas datas AAAA-MM-DD (as duas no fuso do negócio).
const diasAte = (alvo: string, hoje: string) =>
  Math.round((Date.parse(`${alvo.slice(0, 10)}T12:00:00Z`) - Date.parse(`${hoje}T12:00:00Z`)) / 86400000);

export default function ReceitaAula() {
  const [aulas, setAulas] = useState<Aula[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    supabase.from('v_receita_aula').select('*').order('quando', { ascending: false }).then(({ data, error }) => {
      if (error) { setErro(error.message); return; }
      setAulas((data ?? []) as Aula[]);
    });
  }, []);

  if (erro) {
    const semBanco = /v_receita_aula|does not exist|schema cache/i.test(erro);
    return (
      <Aviso tom="danger">
        {semBanco
          ? 'A aba Aula ainda não está ligada ao banco: falta aplicar a migration 228 e rodar a carga do controle.'
          : 'A aula não carregou.'}{' '}
        <span className="font-mono text-[11px]">({erro})</span>
      </Aviso>
    );
  }
  if (!aulas) return <Carregando />;
  if (aulas.length === 0) {
    return (
      <Aviso tom="warning">
        Nenhuma aula no banco. Isto não quer dizer que não há aula marcada: quer dizer que a carga do controle ainda não rodou.
      </Aviso>
    );
  }
  return <div className="space-y-8">{aulas.map((a) => <Edicao key={a.slug} aula={a} />)}</div>;
}

function Edicao({ aula: a }: { aula: Aula }) {
  const hoje = hojeBrt();
  const diaDaAula = new Date(a.quando).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const faltamAula = diasAte(diaDaAula, hoje);
  const faltamVendas = diasAte(a.prazo_vendas, hoje);
  const faltamProduto = a.prazo_produto ? diasAte(a.prazo_produto, hoje) : null;
  const faltamVagas = Math.max(0, a.minimo_ao_vivo - a.vendas);
  const ligadas = a.ligacoes_faladas + a.ligacoes_nao_atenderam + a.ligacoes_nao_ligar;

  const prazo = (n: number) => (n > 1 ? `faltam ${n} dias` : n === 1 ? 'falta 1 dia' : n === 0 ? 'é hoje' : `passou há ${-n} ${n === -1 ? 'dia' : 'dias'}`);

  return (
    <section aria-labelledby={`aula-${a.slug}`} className="space-y-4">
      <div>
        <h2 id={`aula-${a.slug}`} className="font-serif text-2xl text-on-surface">{a.titulo}</h2>
        <p className="mt-1 text-[13px] text-on-surface-variant tabular-nums">
          {quando(a.quando)} · {brl(a.preco_brl)} por vaga · {prazo(faltamAula)}
        </p>
      </div>

      {!a.produto_criado && (
        <Aviso tom="danger">
          O produto ainda não foi criado na plataforma de pagamento: hoje ninguém consegue comprar a vaga. As
          zero vendas abaixo não são “ninguém quis”.
          {faltamProduto !== null && <> O prazo para criar é {diaEscrito(a.prazo_produto!)} ({prazo(faltamProduto)}).</>}
        </Aviso>
      )}
      {a.produto_criado && !a.link_inscricao && (
        <Aviso tom="warning">O produto está criado, mas o link de inscrição ainda não foi escrito no pacote: os convites saem sem ter para onde mandar.</Aviso>
      )}
      {!a.pode_do_dono && (
        <Aviso tom="warning">O pacote da aula ainda espera o teu “pode”: nenhum convite sai da casa antes dele.</Aviso>
      )}

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Quadro r="Vagas pagas" v={String(a.vendas)} n={a.produto_criado ? `${brl(a.vendas_brl)} recebidos` : 'produto não criado'} />
        <Quadro r="Faltam para acontecer ao vivo" v={String(faltamVagas)}
                n={`mínimo ${a.minimo_ao_vivo} até ${diaEscrito(a.prazo_vendas)} (${prazo(faltamVendas)})`} />
        <Quadro r="Ligações de convite faladas" v={String(a.ligacoes_faladas)} n={`${ligadas} ligadas de ${a.ligacoes_na_lista} que entraram na lista`} />
        <Quadro r="Não atenderam / não ligar mais" v={`${a.ligacoes_nao_atenderam} / ${a.ligacoes_nao_ligar}`} n="pela Lista do dia" />
      </dl>

      <div className="max-w-3xl space-y-2 text-[13px] text-on-surface-variant">
        <p>
          <strong className="font-semibold text-on-surface">A regra desta edição:</strong> com {a.minimo_ao_vivo} ou mais vagas pagas
          até {diaEscrito(a.prazo_vendas)}, a aula acontece ao vivo. Abaixo disso vale o que está escrito no pacote
          (conversa individual com quem comprou, ou não acontece nesta data).
        </p>
        <p>
          As vendas são as da plataforma de pagamento cujo produto tem “{a.produto_filtro}” no nome
          {a.ultima_venda ? `; a última foi em ${diaEscrito(a.ultima_venda)}` : ''}. As ligações são as marcadas na Lista do dia
          até a data da aula; elas ligam para óticas que o marketing abordou sobre outros produtos, então nem toda
          ligação falada foi um convite para a aula.
        </p>
        {a.link_inscricao && (
          <p>Link de inscrição: <a href={a.link_inscricao} target="_blank" rel="noopener noreferrer" className={`underline break-all hover:text-on-surface ${foco}`}>{a.link_inscricao}</a></p>
        )}
      </div>

      <div className="flex flex-wrap gap-2">
        <a href="#/receita/lista" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>Lista do dia</a>
        <a href="#/receita/pacotes/aula-paga" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>O pacote da aula</a>
        <a href="#/receita/pacotes/aula-paga/pecas.md" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>Convites e roteiro</a>
      </div>

      <p className="font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">base carregada em {quando(a.atualizado_em)}</p>
    </section>
  );
}

function Quadro({ r, v, n }: { r: string; v: string; n?: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container p-3">
      <dt className="font-mono text-[9px] uppercase tracking-wider text-muted">{r}</dt>
      <dd className="mt-1 font-serif text-2xl text-on-surface tabular-nums">{v}</dd>
      {n && <dd className="mt-1 text-[12px] text-muted">{n}</dd>}
    </div>
  );
}
