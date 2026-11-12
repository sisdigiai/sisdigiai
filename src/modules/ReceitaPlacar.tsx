import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, CircleDashed, Clock, Target, XCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Aviso, Carregando, quando } from './ReceitaIdeias';
import { botao, brl, Coluna, ComoLer, diaCurto, Funil, Quadro, Tile, TituloSecao } from './ReceitaUI';

// Aba Placar da página Receita (migration 219; redesenhada em 12/11/2026).
//
// Lugar único da meta de mais R$ 100 mil por mês de DINHEIRO NOVO (R-051). A primeira versão eram nove seções
// escritas; o dono pediu forma em vez de texto. Agora são: a meta em quatro números, as três linhas, as
// frentes em quadro, o funil das óticas por produto e o estado das rotinas. A explicação está no "como ler".
//
// Duas regras continuam valendo, e a forma não pode escondê-las:
//  - SEM DADO DIZ "NÃO MEDIDO", nunca R$ 0. Zero e "ninguém mediu" pedem ações opostas.
//  - O número nasce no banco (R-049): tudo que é conta mora nas views; aqui só se formata.

interface Meta {
  mes: string; meta_brl: string | null; dinheiro_novo_brl: string; linhas_medidas: number; linhas_so_proposta: number;
  falta_brl: string | null; dias_restantes: number; ritmo_semanal_brl: string | null;
}
interface Linha {
  linha: number; mes: string; estado: string; dinheiro_novo_brl: string; data_leitura: string;
  dias_desde_leitura: number; leitura_velha: boolean; parte_relacionada: boolean;
}
interface Alavanca {
  id: number; nome: string; linha: number; executor: string; inicio: string | null; dias_em_curso: number | null;
  resultado_brl: string; estado: string; veredito: string | null; obs: string | null;
  nao_iniciada: boolean; zero_ha_tres_semanas: boolean;
}
interface Rotina {
  nome: string; hora: string | null; ligada: boolean; ultima_execucao: string | null; ultima_falha: string | null;
  detalhe_falha: string | null; ligada_sem_prova: boolean; sem_rodar_ha_2_dias: boolean;
}
interface LeadFunil {
  ramal: string | null; abordada_em: string | null; pessoa_em: string | null; interesse_em: string | null;
  clicou_em: string | null; comprou_em: string | null; saiu_em: string | null;
}
interface Pendencia { agente: string; titulo: string | null; texto: string; nivel: number; dias_esperando: number }

const LINHAS: Record<number, string> = { 1: 'Lojas com fonte nova', 2: 'Clearix para outras óticas', 3: 'Publicações' };

export default function ReceitaPlacar() {
  const [meta, setMeta] = useState<Meta | null | undefined>(undefined);
  const [placar, setPlacar] = useState<Linha[] | null>(null);
  const [alavancas, setAlavancas] = useState<Alavanca[] | null>(null);
  const [rotinas, setRotinas] = useState<Rotina[] | null>(null);
  const [funil, setFunil] = useState<LeadFunil[] | null>(null);
  const [pendencias, setPendencias] = useState<Pendencia[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Cada leitura falha por conta própria: uma view que não responde não apaga as outras seções.
    const pega = <T,>(p: PromiseLike<{ data: unknown; error: { message: string } | null }>, set: (v: T) => void, nome: string) =>
      p.then(({ data, error }) => {
        if (error) { setErro((e) => [e, `${nome}: ${error.message}`].filter(Boolean).join(' · ')); return; }
        set(data as T);
      });
    pega<Meta[]>(supabase.from('v_receita_meta').select('*'), (d) => setMeta(d[0] ?? null), 'meta');
    pega<Linha[]>(supabase.from('v_receita_placar').select('*').order('linha'), setPlacar, 'placar');
    pega<Alavanca[]>(supabase.from('v_receita_alavancas').select('*').order('linha'), setAlavancas, 'frentes');
    pega<Rotina[]>(supabase.from('v_receita_rotinas').select('*').order('nome'), setRotinas, 'rotinas');
    pega<LeadFunil[]>(supabase.from('v_mkt_funil_leads').select('ramal, abordada_em, pessoa_em, interesse_em, clicou_em, comprou_em, saiu_em'), setFunil, 'funil das óticas');
    pega<Pendencia[]>(supabase.from('v_receita_esperando_dono').select('agente, titulo, texto, nivel, dias_esperando').order('nivel').order('dias_esperando', { ascending: false }), setPendencias, 'esperando o dono');
  }, []);

  const doMes = (placar ?? []).filter((l) => l.mes === meta?.mes);
  const medidas = doMes.filter((l) => l.estado === 'medido');
  const emCurso = (alavancas ?? []).filter((a) => a.estado === 'em_curso');
  const congeladas = (alavancas ?? []).filter((a) => a.estado === 'congelada');
  const encerradas = (alavancas ?? []).filter((a) => a.estado === 'encerrada');
  const semMedida = meta ? meta.linhas_medidas === 0 : false;

  return (
    <div className="space-y-7">
      {erro && (
        <Aviso tom="danger">Parte da tela não carregou ({erro}). O que falta abaixo falta por erro de leitura, não por ausência de dado.</Aviso>
      )}

      {/* 1 — a meta em quatro números */}
      {meta === undefined ? <Carregando /> : meta === null || meta.meta_brl === null ? (
        <Aviso tom="warning">O mês corrente não tem meta escrita. Sem meta não existe “quanto falta” nem “ritmo”.</Aviso>
      ) : (
        <dl className="grid grid-cols-2 md:grid-cols-4 gap-2">
          <Tile rotulo="Dinheiro novo no mês" icone={<Target className="w-3 h-3" aria-hidden="true" />}
                valor={semMedida ? 'não medido' : brl(meta.dinheiro_novo_brl)} tom={semMedida ? 'atencao' : 'neutro'}
                de={{ feito: Number(meta.dinheiro_novo_brl), total: Number(meta.meta_brl) }}
                nota={`meta de ${brl(meta.meta_brl)} · ${meta.linhas_medidas} de 3 linhas medidas`} />
          <Tile rotulo="Falta" valor={brl(semMedida ? meta.meta_brl : meta.falta_brl)} />
          <Tile rotulo="Dias restantes no mês" valor={String(meta.dias_restantes)} />
          <Tile rotulo="Ritmo para fechar" valor={meta.ritmo_semanal_brl ? brl(meta.ritmo_semanal_brl) : '—'} nota="por semana" />
        </dl>
      )}

      {/* 2 — as três linhas */}
      <div>
        <TituloSecao>As três linhas</TituloSecao>
        <dl className="grid md:grid-cols-3 gap-2">
          {[1, 2, 3].map((n) => {
            const m = medidas.find((l) => l.linha === n);
            return (
              <Tile key={n} rotulo={`${n}. ${LINHAS[n]}`} valor={m ? brl(m.dinheiro_novo_brl) : 'não medido'} tom={m ? 'neutro' : 'atencao'}
                    nota={m
                      ? `leitura de ${diaCurto(m.data_leitura)}${m.leitura_velha ? `, com ${m.dias_desde_leitura} dias` : ''}${m.parte_relacionada ? ' · loja da casa' : ''}`
                      : 'nenhuma leitura medida neste mês'} />
            );
          })}
        </dl>
      </div>

      {/* 3 — as frentes, em quadro */}
      <div>
        <TituloSecao>Frentes</TituloSecao>
        {alavancas === null ? <Carregando /> : (
          <Quadro rotulo="Frentes do Agente de Receita, por estado">
            <Coluna titulo="Em curso" n={emCurso.length} vazio="nenhuma frente em curso registrada" largura="w-[320px] min-w-[320px]">
              {emCurso.map((a) => <CartaoFrente key={a.id} a={a} />)}
            </Coluna>
            <Coluna titulo="Congeladas" n={congeladas.length} tom="atencao" vazio="nenhuma congelada" largura="w-[320px] min-w-[320px]">
              {congeladas.map((a) => <CartaoFrente key={a.id} a={a} />)}
            </Coluna>
            <Coluna titulo="Encerradas" n={encerradas.length} vazio="nenhuma encerrada" largura="w-[320px] min-w-[320px]">
              {encerradas.map((a) => <CartaoFrente key={a.id} a={a} />)}
            </Coluna>
          </Quadro>
        )}
        <div className="mt-2 flex flex-wrap gap-2">
          <a href="#/receita/aula" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>Aula</a>
          <a href="#/receita/prospeccao" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>Prospecção a empresas</a>
          <a href="#/receita/ideias" className={`${botao} border-outline/30 text-on-surface hover:bg-surface-highest`}>Ideias</a>
        </div>
      </div>

      {/* 4 — o funil das óticas, por produto */}
      <div>
        <TituloSecao>Óticas abordadas pelo marketing, por produto</TituloSecao>
        {funil === null ? <Carregando /> : <FunilPorProduto leads={funil} />}
      </div>

      {/* 5 — rotinas */}
      <div>
        <TituloSecao>Rotinas automáticas</TituloSecao>
        {rotinas === null ? <Carregando /> : rotinas.length === 0 ? <Aviso tom="warning">Nenhuma rotina registrada.</Aviso> : (
          <ul className="grid md:grid-cols-2 xl:grid-cols-4 gap-2">
            {rotinas.map((r) => <CartaoRotina key={r.nome} r={r} />)}
          </ul>
        )}
      </div>

      {/* 6 — esperando o dono */}
      <div>
        <TituloSecao>Esperando o dono</TituloSecao>
        {pendencias === null ? <Carregando /> : (
          <div className="grid md:grid-cols-[14rem_1fr] gap-2">
            <dl><Tile rotulo="Pendências de todos os agentes" valor={String(pendencias.length)} tom={pendencias.length ? 'atencao' : 'bom'}
                      nota={pendencias.length ? `a mais antiga espera há ${Math.max(...pendencias.map((p) => p.dias_esperando))} dias` : 'nada esperando'} /></dl>
            <ComoLer titulo={`Ver as ${Math.min(12, pendencias.length)} mais urgentes`}>
              <ul className="space-y-1.5">
                {pendencias.slice(0, 12).map((p, i) => (
                  <li key={`${p.agente}-${i}`}>
                    <span className="font-mono text-[9px] uppercase tracking-wider text-muted">{p.agente} · há {p.dias_esperando} d · </span>
                    <span className="text-on-surface">{p.titulo ?? p.texto}</span>
                  </li>
                ))}
              </ul>
              <p>A lista completa está na página Controle.</p>
            </ComoLer>
          </div>
        )}
      </div>

      <ComoLer>
        <p><strong className="font-semibold text-on-surface">Dinheiro novo</strong> é só o que não existiria sem a ação do Agente de Receita, já tirado o custo de trazer. O que a loja recebe normalmente é piso, não resultado, e não entra aqui.</p>
        <p><strong className="font-semibold text-on-surface">“Não medido” não é zero.</strong> Zero manda correr atrás de venda; “não medido” manda ir medir. Leitura em proposta não entra no placar.</p>
        <p><strong className="font-semibold text-on-surface">Frente em curso há três semanas com R$ 0</strong> ganha a marca de trava: é decisão tua continuar, mudar ou encerrar.</p>
        <p><strong className="font-semibold text-on-surface">O funil</strong> vem do marketing: cada ótica recebeu a oferta de um produto só. Quem clicou também foi abordada e conta nos dois degraus.</p>
        <p><strong className="font-semibold text-on-surface">Rotina “ligada, sem prova”</strong> está agendada e ainda não rodou sozinha. Só conta como rodando quando a própria rotina grava a execução.</p>
        <p><strong className="font-semibold text-on-surface">Ainda não medido nesta página:</strong> quanto custa o esforço (ninguém grava o custo de agente) e o veredito mensal dos apps (julgamento que sai no dia 1).</p>
      </ComoLer>
    </div>
  );
}

function CartaoFrente({ a }: { a: Alavanca }) {
  // O texto vem de uma tabela em markdown do Cockpit: sai a marcação (asterisco, crase) e o prefixo que a
  // carga escreve. No cartão cabe a frase, não a sintaxe.
  const bruto = a.estado === 'em_curso' ? a.obs : a.veredito ?? a.obs;
  const texto = bruto?.replace(/\*\*|`/g, '').replace(/^estado escrito:\s*/i, '').replace(/\s*·\s*margem.*$/i, '').trim() || null;
  return (
    <li className="px-3 py-2.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[13px] leading-snug text-on-surface">{a.nome}</span>
        <span className={`shrink-0 font-serif text-sm tabular-nums ${Number(a.resultado_brl) > 0 ? 'text-success' : 'text-muted'}`}>{brl(a.resultado_brl)}</span>
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">
        linha {a.linha}
        {a.estado === 'em_curso' && (a.nao_iniciada ? <span className="text-warning"> · não iniciada</span> : a.inicio ? ` · desde ${diaCurto(a.inicio)} (${a.dias_em_curso} d)` : '')}
      </div>
      {a.zero_ha_tres_semanas && (
        <p className="mt-1 flex items-start gap-1.5 text-[12px] text-warning">
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" /> três semanas e R$ 0: decisão tua
        </p>
      )}
      {texto && <p className="mt-1 line-clamp-3 text-[12px] text-muted" title={texto}>{texto}</p>}
    </li>
  );
}

function FunilPorProduto({ leads }: { leads: LeadFunil[] }) {
  const conta = (ramal: string) => {
    const l = leads.filter((x) => x.ramal === ramal);
    const n = (campo: keyof LeadFunil) => l.filter((x) => x[campo]).length;
    return [
      { rotulo: 'Abordadas', n: n('abordada_em') },
      { rotulo: 'Resposta de pessoa', n: n('pessoa_em') },
      { rotulo: 'Interesse', n: n('interesse_em') },
      { rotulo: 'Clicaram no link', n: n('clicou_em') },
      { rotulo: 'Compraram', n: n('comprou_em') },
    ];
  };
  const nunca = leads.filter((x) => !x.abordada_em).length;
  const sairam = leads.filter((x) => x.saiu_em).length;
  return (
    <div className="space-y-2">
      <div className="grid lg:grid-cols-2 gap-2">
        <Funil titulo="OSI (Ótica Sem Improviso)" degraus={conta('osi')} />
        <Funil titulo="Clearix (o sistema)" degraus={conta('clearix')} />
      </div>
      <p className="text-[12px] text-muted tabular-nums">
        {leads.length} óticas na base · {nunca} nunca abordadas · {sairam} pediram para sair
      </p>
      {/* O servidor devolve no máximo 1.000 linhas por consulta. Chegou no teto, a conta pode estar cortada: dizer. */}
      {leads.length >= 1000 && <Aviso tom="warning">A base passou de mil óticas e esta contagem pode estar cortada. Avisar o Agente de Receita.</Aviso>}
    </div>
  );
}

function CartaoRotina({ r }: { r: Rotina }) {
  const falhou = !!r.ultima_falha && (!r.ultima_execucao || r.ultima_falha > r.ultima_execucao);
  const [Icone, estado, cor] = !r.ligada ? [XCircle, 'não ligada', 'text-danger'] as const
    : falhou ? [XCircle, 'falhou', 'text-danger'] as const
    : r.ligada_sem_prova ? [CircleDashed, 'ligada, ainda não rodou sozinha', 'text-warning'] as const
    : r.sem_rodar_ha_2_dias ? [Clock, 'sem rodar há 2 dias', 'text-warning'] as const
    : [CheckCircle2, 'rodando', 'text-success'] as const;
  return (
    <li className="border border-outline/15 bg-surface-container p-3">
      <div className="text-[13px] text-on-surface first-letter:uppercase">{r.nome}</div>
      <div className={`mt-1 flex items-center gap-1.5 text-[12px] ${cor}`}>
        <Icone className="w-3.5 h-3.5 shrink-0" aria-hidden="true" /> {estado}
      </div>
      <div className="mt-1 font-mono text-[9px] uppercase tracking-wider text-muted tabular-nums">
        {r.hora ?? 'sem hora'}{r.ultima_execucao ? ` · última ${quando(r.ultima_execucao)}` : ''}
      </div>
      {falhou && r.detalhe_falha && <p className="mt-1 line-clamp-2 text-[12px] text-danger" title={r.detalhe_falha}>{r.detalhe_falha}</p>}
    </li>
  );
}
