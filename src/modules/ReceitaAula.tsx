import { useEffect, useState } from 'react';
import { AlertTriangle, CalendarClock, Check, Lock, Phone, Ticket, Wallet } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Aviso, Carregando, quando } from './ReceitaIdeias';
import { botao, brl, Coluna, ComoLer, diaCurto, diaEscrito, diasAte, emDias, foco, Funil, hojeBrt, Quadro, Tile, TituloSecao } from './ReceitaUI';

// Aba Aula da página Receita (migrations 228 e 230).
//
// Uma pergunta só: O QUE FALTA PARA A AULA ACONTECER, E DE QUEM É. Por isso a tela é um quadro de passos
// (o que é teu, o que é dos outros, o que está pronto), uma linha do tempo e um funil — e o texto ficou
// guardado no "como ler".
//
// SÓ LEITURA. A base e os passos vêm da carga (`Cockpit/scripts/receita-controle-sync.mjs`); as vendas vêm da
// view de vendas do app; as ligações vêm da Lista do dia.
//
// A regra que não mudou: ZERO VENDA COM PRODUTO NÃO CRIADO NÃO É "NINGUÉM QUIS". O tile de vagas diz
// "não dá para comprar ainda" em vez de mostrar um zero seco.

interface Passo { ordem: number; passo: string; quem: string; ate: string | null; estado: 'feito' | 'falta' | 'travado'; nota: string | null }
interface Aula {
  slug: string; titulo: string; quando: string; preco_brl: string; minimo_ao_vivo: number;
  prazo_vendas: string; prazo_produto: string | null; produto_filtro: string; produto_criado: boolean;
  link_inscricao: string | null; pode_do_dono: boolean; atualizado_em: string;
  vendas: number; vendas_brl: string; ultima_venda: string | null;
  ligacoes_na_lista: number; ligacoes_faladas: number; ligacoes_nao_atenderam: number; ligacoes_nao_ligar: number;
  passos: Passo[] | null;
}

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
        {semBanco ? 'A aba Aula ainda não está ligada ao banco: falta aplicar as migrations 228 e 230 e rodar a carga do controle.' : 'A aula não carregou.'}{' '}
        <span className="font-mono text-[11px]">({erro})</span>
      </Aviso>
    );
  }
  if (!aulas) return <Carregando />;
  if (aulas.length === 0) {
    return <Aviso tom="warning">Nenhuma aula no banco: a carga do controle ainda não rodou.</Aviso>;
  }
  return <div className="space-y-10">{aulas.map((a) => <Edicao key={a.slug} aula={a} />)}</div>;
}

function Edicao({ aula: a }: { aula: Aula }) {
  const hoje = hojeBrt();
  const diaDaAula = new Date(a.quando).toLocaleDateString('en-CA', { timeZone: 'America/Sao_Paulo' });
  const faltamAula = diasAte(diaDaAula, hoje);
  const passos = [...(a.passos ?? [])].sort((x, y) => x.ordem - y.ordem);
  const ehDoDono = (p: Passo) => /dono/i.test(p.quem);
  const teus = passos.filter((p) => p.estado === 'falta' && ehDoDono(p));
  const outros = passos.filter((p) => p.estado !== 'feito' && !(p.estado === 'falta' && ehDoDono(p)));
  const feitos = passos.filter((p) => p.estado === 'feito');
  const atrasados = teus.filter((p) => p.ate && diasAte(p.ate, hoje) < 0).length;
  const paraHoje = teus.filter((p) => p.ate && diasAte(p.ate, hoje) >= 0 && diasAte(p.ate, hoje) <= 1);
  const ligadas = a.ligacoes_faladas + a.ligacoes_nao_atenderam + a.ligacoes_nao_ligar;

  return (
    <section aria-labelledby={`aula-${a.slug}`} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h2 id={`aula-${a.slug}`} className="font-serif text-2xl text-on-surface">{a.titulo}</h2>
          <p className="mt-1 text-[13px] text-on-surface-variant tabular-nums">{quando(a.quando)} · {brl(a.preco_brl)} por vaga</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href="#/receita/lista" className={`${botao} border-action bg-action text-on-action`}><Phone className="w-3.5 h-3.5" aria-hidden="true" /> Lista do dia</a>
          <a href="#/receita/pacotes/aula-paga/pecas.md" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>Roteiro e convites</a>
          <a href="#/receita/pacotes/aula-paga" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>O pacote</a>
        </div>
      </div>

      {paraHoje.length > 0 && (
        <div className="flex items-start gap-3 border border-warning-bd bg-warning-bg p-3">
          <AlertTriangle className="w-5 h-5 shrink-0 text-warning" aria-hidden="true" />
          <div className="text-[14px] text-on-surface">
            <strong className="font-semibold">Para {paraHoje.some((p) => diasAte(p.ate!, hoje) === 0) ? 'hoje' : 'amanhã'}, e só tu fazes:</strong>
            <ul className="mt-1 list-disc pl-5">{paraHoje.map((p) => <li key={p.ordem}>{p.passo}</li>)}</ul>
          </div>
        </div>
      )}

      <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <Tile rotulo="Dias até a aula" valor={String(Math.max(0, faltamAula))} nota={`${diaEscrito(diaDaAula)} · ${emDias(faltamAula)}`}
              icone={<CalendarClock className="w-3 h-3" aria-hidden="true" />} />
        <Tile rotulo="Vagas pagas" valor={`${a.vendas} de ${a.minimo_ao_vivo}`}
              tom={a.vendas >= a.minimo_ao_vivo ? 'bom' : a.produto_criado ? 'neutro' : 'ruim'}
              de={{ feito: a.vendas, total: a.minimo_ao_vivo }}
              nota={a.produto_criado ? `mínimo para acontecer ao vivo, até ${diaCurto(a.prazo_vendas)}` : 'não dá para comprar ainda: o produto não foi criado'}
              icone={<Ticket className="w-3 h-3" aria-hidden="true" />} />
        <Tile rotulo="Recebido" valor={brl(a.vendas_brl)} nota={a.ultima_venda ? `última venda em ${diaCurto(a.ultima_venda)}` : 'nenhuma venda'}
              icone={<Wallet className="w-3 h-3" aria-hidden="true" />} />
        <Tile rotulo="Teus passos em aberto" valor={String(teus.length)} tom={atrasados > 0 ? 'ruim' : teus.length ? 'atencao' : 'bom'}
              de={{ feito: passos.length - teus.length - outros.length, total: Math.max(1, passos.length) }}
              nota={atrasados > 0 ? `${atrasados} com o prazo vencido` : `${feitos.length} de ${passos.length} passos prontos`} />
      </dl>

      <div>
        <TituloSecao>O que falta, e de quem é</TituloSecao>
        {passos.length === 0
          ? <Aviso tom="warning">Os passos desta aula ainda não foram carregados.</Aviso>
          : (
            <Quadro rotulo="Passos até a aula, por quem faz">
              <Coluna titulo="Só tu fazes" n={teus.length} tom={atrasados > 0 ? 'ruim' : 'atencao'} vazio="nada teu em aberto" largura="w-[300px] min-w-[300px]">
                {teus.map((p) => <CartaoPasso key={p.ordem} passo={p} hoje={hoje} />)}
              </Coluna>
              <Coluna titulo="Dos outros, ou travado" n={outros.length} vazio="nada esperando os outros" largura="w-[300px] min-w-[300px]">
                {outros.map((p) => <CartaoPasso key={p.ordem} passo={p} hoje={hoje} />)}
              </Coluna>
              <Coluna titulo="Pronto" n={feitos.length} tom="bom" vazio="nada pronto ainda" largura="w-[300px] min-w-[300px]">
                {feitos.map((p) => <CartaoPasso key={p.ordem} passo={p} hoje={hoje} />)}
              </Coluna>
            </Quadro>
          )}
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div>
          <TituloSecao>Linha do tempo</TituloSecao>
          <LinhaDoTempo passos={passos} hoje={hoje} diaDaAula={diaDaAula} />
        </div>
        <div>
          <TituloSecao>Do convite à vaga</TituloSecao>
          <Funil degraus={[
            { rotulo: 'Entraram na lista', n: a.ligacoes_na_lista },
            { rotulo: 'Ligadas', n: ligadas },
            { rotulo: 'Faladas', n: a.ligacoes_faladas },
            { rotulo: 'Vagas pagas', n: a.vendas },
          ]} />
          <p className="mt-2 text-[12px] text-muted tabular-nums">
            {a.ligacoes_nao_atenderam} não atenderam · {a.ligacoes_nao_ligar} pediram para não ligar mais
          </p>
        </div>
      </div>

      <ComoLer>
        <p>
          <strong className="font-semibold text-on-surface">A regra desta edição:</strong> com {a.minimo_ao_vivo} ou mais vagas pagas até {diaEscrito(a.prazo_vendas)},
          a aula acontece ao vivo. Com uma ou duas, vira conversa individual com quem comprou. Com zero, não acontece nesta data.
        </p>
        <p>
          As vagas são as vendas da plataforma de pagamento cujo produto tem “{a.produto_filtro}” no nome. Enquanto o produto não existir,
          ninguém consegue comprar, e o zero não quer dizer que ninguém quis.
        </p>
        <p>
          As ligações são as marcadas na Lista do dia até a data da aula. Elas ligam para óticas que o marketing abordou sobre a OSI ou o
          Clearix, então nem toda ligação falada foi um convite para a aula.
        </p>
        <p>
          “Travado” é o passo que depende de outro que ainda falta. Os passos e as datas vêm do pacote da aula; mudou lá, o Receita roda a carga.
        </p>
        {a.link_inscricao && (
          <p>Link de inscrição: <a href={a.link_inscricao} target="_blank" rel="noopener noreferrer" className={`underline break-all hover:text-on-surface ${foco}`}>{a.link_inscricao}</a></p>
        )}
        <p className="font-mono text-[10px] uppercase tracking-wider text-muted tabular-nums">base carregada em {quando(a.atualizado_em)}</p>
      </ComoLer>
    </section>
  );
}

function CartaoPasso({ passo: p, hoje }: { passo: Passo; hoje: string }) {
  const d = p.ate ? diasAte(p.ate, hoje) : null;
  const vencido = p.estado !== 'feito' && d !== null && d < 0;
  const urgente = p.estado !== 'feito' && d !== null && d >= 0 && d <= 1;
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start gap-2">
        {p.estado === 'feito' && <Check className="w-4 h-4 mt-0.5 shrink-0 text-success" aria-label="feito" />}
        {p.estado === 'travado' && <Lock className="w-4 h-4 mt-0.5 shrink-0 text-muted" aria-label="travado" />}
        {p.estado === 'falta' && <span className={`mt-1.5 h-2 w-2 shrink-0 ${vencido ? 'bg-danger' : urgente ? 'bg-warning' : 'bg-outline-strong'}`} aria-hidden="true" />}
        <span className={`text-[13px] leading-snug ${p.estado === 'feito' ? 'text-on-surface-variant' : 'text-on-surface'}`}>{p.passo}</span>
      </div>
      <div className="mt-1 pl-6 font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">
        {p.quem}
        {p.ate && p.estado !== 'feito' && (
          <span className={vencido ? ' text-danger' : urgente ? ' text-warning' : ''}> · até {diaCurto(p.ate)} ({emDias(d!)})</span>
        )}
        {p.ate && p.estado === 'feito' && <> · {diaCurto(p.ate)}</>}
      </div>
      {p.nota && <p className="mt-1 pl-6 text-[12px] text-muted">{p.nota}</p>}
    </li>
  );
}

// As datas dos passos em aberto, na ordem, com o hoje marcado. Uma linha por data: é o que cabe no celular.
function LinhaDoTempo({ passos, hoje, diaDaAula }: { passos: Passo[]; hoje: string; diaDaAula: string }) {
  const datas = [...new Set([...passos.filter((p) => p.ate && p.estado !== 'feito').map((p) => p.ate!), diaDaAula])].sort();
  if (datas.length === 0) return <p className="text-[13px] text-muted">Nenhuma data em aberto.</p>;
  return (
    <ol className="border border-outline/15 bg-surface-container">
      {datas.map((dt) => {
        const d = diasAte(dt, hoje);
        const itens = passos.filter((p) => p.ate === dt && p.estado !== 'feito');
        const ponto = d < 0 ? 'bg-danger' : d <= 1 ? 'bg-warning' : dt === diaDaAula ? 'bg-action' : 'bg-outline-strong';
        return (
          <li key={dt} className="grid grid-cols-[4.5rem_1rem_1fr] items-start gap-2 border-b border-outline/10 px-3 py-2 last:border-b-0">
            <div className="tabular-nums">
              <div className="font-serif text-sm text-on-surface">{diaCurto(dt)}</div>
              <div className={`font-mono text-[9px] uppercase tracking-wider ${d < 0 ? 'text-danger' : d <= 1 ? 'text-warning' : 'text-muted'}`}>{emDias(d)}</div>
            </div>
            <span className={`mt-1.5 h-2.5 w-2.5 ${ponto}`} aria-hidden="true" />
            <ul className="space-y-0.5 text-[13px] text-on-surface">
              {itens.length === 0 && dt === diaDaAula && <li>A aula</li>}
              {itens.map((p) => (
                <li key={p.ordem}>
                  {p.passo} <span className="font-mono text-[9px] uppercase tracking-wider text-muted">· {p.quem}{p.estado === 'travado' ? ' · travado' : ''}</span>
                </li>
              ))}
            </ul>
          </li>
        );
      })}
    </ol>
  );
}
