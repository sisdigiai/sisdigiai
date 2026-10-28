import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Loader2, MessageSquareWarning, Store, UserRound } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { diaBrasilia, hojeBrasilia } from '../lib/datas';

// Google Meu Negócio — avaliações, fichas, menções por nome e o que o Google mede (migration 205).
//
// Nasceu da pergunta do dono em 28/10: "não está saindo nada no Google, temos mais avaliações e não temos
// onde saber, e precisamos saber quais colaboradores vão melhor". Três coisas que a medição mudou ANTES
// da tela existir, e que estão aqui como regra, não como enfeite:
//
// 1. O NÚMERO QUE LIDERA NÃO É 1.745, É 14. São 9 anos de histórico (desde 2017) que chegaram de uma vez,
//    e 98% são 4–5 estrelas. O que custa dinheiro é avaliação ruim SEM RESPOSTA — e dessas há 14, sendo 8
//    na Lancaster. "1.745 avaliações" é contexto; a fila é essa.
//
// 2. MENÇÃO NÃO É DESEMPENHO. Thiago 73 × Kayllaine 7 × Nicolly 4, todos com média ~5 e zero menção ruim,
//    é volume de quem atendeu — não qualidade. Sem denominador (quantos clientes cada um atendeu, que vive
//    no banco do Clearix) um ranking premia quem faz mais turnos ou quem pede mais avaliação. A view nem
//    tem coluna de posição, e a tela escreve "menções" em todo lugar que alguém leria "placar".
//
// 3. A JANELA É OUTUBRO. A Lancaster saiu de 6 avaliações em setembro (0% citando nome) para 91 em outubro
//    (92%): começou uma campanha, e a atribuição só existe dentro dela. O corte está na view, não no jeito
//    de olhar.
//
// E a regra de sempre: não mostrar zero onde a resposta é "não sei". O relatório do Google atrasa dias, e a
// origem passou a dizer isso na própria coluna (`dia_fechado`, MKT 28/10): antes de fechar, `aparicoes`,
// `ligacoes` e `rotas` vêm NULAS, não zero. A tela nunca faz `?? 0` nesses campos — era exatamente assim
// que o zero de ontem ia virar número.
//
// POSTS GANHARAM TESTEMUNHA. Até 28/10 esta tela se recusava a mostrar publicação de post, porque o que a
// nossa tabela chamava de "publicado" era declaração do nosso próprio escritor (`posts_no_dia` é
// subconsulta em `mkt.gbp_posts`). Agora existe leitura de volta: `estado_google` vem da API do Google, e
// `posts_no_ar_google` conta só `estado_google = 'LIVE'` — conferido na definição da view antes de usar,
// porque comparar a nossa tabela com ela mesma é o erro que eu quase reportei ao dono.
//
// `estado_google` NULO não é falha: é "ainda não lido". Post publicado hoje nasce assim. O alarme é post
// publicado há mais de um dia que o Google ainda não confirma — hoje, zero.

interface Avaliacao {
  review_id: string; ficha: string; marca: string; estrelas: number;
  comentario: string | null; criada_em: string; status: string | null;
}
interface Post {
  id: number | string; ficha: string; status: string | null;
  estado_google: string | null; publicado_em: string | null; agendado_para: string | null;
}
interface Mencao {
  mes: string; marca: string; ficha: string; nome: string; confirmado: boolean;
  mencoes: number; media_estrelas: number; mencoes_ruins: number;
}
interface Cobertura {
  mes: string; marca: string; ficha: string; avaliacoes: number; com_nome: number; sem_nome: number;
}
interface MetricaDia {
  ficha: string; dia: string; aparicoes: number | null; ligacoes: number | null;
  cliques_site: number | null; rotas: number | null; lido_em: string | null;
  dia_fechado: boolean | null; posts_no_dia: number | null; posts_no_ar_google: number | null;
}

function diasAtras(iso: string) {
  const d = Math.round((Date.parse(hojeBrasilia()) - Date.parse(iso.slice(0, 10))) / 86400000);
  return d;
}

export default function Google() {
  const [avaliacoes, setAvaliacoes] = useState<Avaliacao[] | null>(null);
  const [mencoes, setMencoes] = useState<Mencao[]>([]);
  const [cobertura, setCobertura] = useState<Cobertura[]>([]);
  const [metricas, setMetricas] = useState<MetricaDia[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [a, m, c, d, p] = await Promise.all([
        supabase.from('v_mkt_gbp_avaliacoes')
          .select('review_id,ficha,marca,estrelas,comentario,criada_em,status'),
        supabase.from('v_gbp_mencoes_mes').select('*'),
        supabase.from('v_gbp_mencoes_cobertura_mes').select('*'),
        supabase.from('v_mkt_gbp_metricas_dia').select('*'),
        supabase.from('v_mkt_gbp_posts')
          .select('id,ficha,status,estado_google,publicado_em,agendado_para'),
      ]);
      if (a.error) { setErro(a.error.message); return; }
      setAvaliacoes((a.data ?? []) as Avaliacao[]);
      setMencoes((m.data ?? []) as Mencao[]);
      setCobertura((c.data ?? []) as Cobertura[]);
      setMetricas((d.data ?? []) as MetricaDia[]);
      setPosts((p.data ?? []) as Post[]);
    })();
  }, []);

  const fila = useMemo(
    () => (avaliacoes ?? [])
      .filter((r) => r.estrelas <= 3 && r.status !== 'publicada')
      .sort((x, y) => (x.estrelas - y.estrelas) || y.criada_em.localeCompare(x.criada_em)),
    [avaliacoes],
  );

  const porFicha = useMemo(() => {
    const limite = new Date(); limite.setDate(limite.getDate() - 90);
    const corte = diaBrasilia(limite);
    const mapa = new Map<string, {
      ficha: string; total: number; noventa: number; soma: number;
      ultima: string; semResposta: number; ruinsSemResposta: number;
    }>();
    for (const r of avaliacoes ?? []) {
      const e = mapa.get(r.ficha) ?? {
        ficha: r.ficha, total: 0, noventa: 0, soma: 0, ultima: '', semResposta: 0, ruinsSemResposta: 0,
      };
      e.total += 1;
      e.soma += r.estrelas;
      if (r.criada_em.slice(0, 10) >= corte) e.noventa += 1;
      if (r.criada_em > e.ultima) e.ultima = r.criada_em;
      if (r.status !== 'publicada') {
        e.semResposta += 1;
        if (r.estrelas <= 3) e.ruinsSemResposta += 1;
      }
      mapa.set(r.ficha, e);
    }
    return [...mapa.values()].sort((a, b) => b.noventa - a.noventa || b.total - a.total);
  }, [avaliacoes]);

  // Soma só o que a origem declarou FECHADO. Se qualquer ficha do dia ainda não fechou, o dia inteiro
  // aparece como "ainda não fechou": soma parcial com cara de número fechado é pior que dizer "espera".
  const dias = useMemo(() => {
    const mapa = new Map<string, {
      dia: string; aparicoes: number; rotas: number; ligacoes: number;
      nossos: number; noArGoogle: number; aberto: boolean;
    }>();
    for (const r of metricas) {
      const e = mapa.get(r.dia) ?? {
        dia: r.dia, aparicoes: 0, rotas: 0, ligacoes: 0, nossos: 0, noArGoogle: 0, aberto: false,
      };
      if (r.dia_fechado) {
        e.aparicoes += r.aparicoes ?? 0;
        e.rotas += r.rotas ?? 0;
        e.ligacoes += r.ligacoes ?? 0;
      } else {
        e.aberto = true;
      }
      // post não depende do relatório de desempenho: `estado_google` é leitura própria e vale sempre.
      e.nossos += r.posts_no_dia ?? 0;
      e.noArGoogle += r.posts_no_ar_google ?? 0;
      mapa.set(r.dia, e);
    }
    return [...mapa.values()].sort((a, b) => b.dia.localeCompare(a.dia)).slice(0, 14);
  }, [metricas]);

  // Post que a nossa tabela diz publicado e o Google não confirma. Publicado HOJE e sem leitura não é
  // falha — é "ainda não lido"; o alarme é o que passou de um dia.
  const semConfirmacao = useMemo(
    () => posts.filter((p) => p.status === 'publicado' && p.estado_google === null),
    [posts],
  );
  const alarmePosts = useMemo(
    () => semConfirmacao.filter((p) => p.publicado_em && diasAtras(p.publicado_em) > 1),
    [semConfirmacao],
  );
  const cancelados = useMemo(() => posts.filter((p) => p.status === 'cancelado'), [posts]);

  const mesAtual = useMemo(() => mencoes[0]?.mes ?? '', [mencoes]);
  const cobAtual = useMemo(
    () => cobertura.filter((c) => c.mes === mesAtual).reduce(
      (s, c) => ({ avaliacoes: s.avaliacoes + c.avaliacoes, com: s.com + c.com_nome, sem: s.sem + c.sem_nome }),
      { avaliacoes: 0, com: 0, sem: 0 },
    ),
    [cobertura, mesAtual],
  );
  const semConfirmar = mencoes.some((m) => !m.confirmado);

  if (erro) {
    return (
      <div className="border border-outline/15 bg-surface-container px-4 py-3">
        <span className="inline-flex items-center gap-2 text-warning">
          <AlertTriangle className="w-4 h-4" /> {erro}
        </span>
      </div>
    );
  }
  if (!avaliacoes) {
    return (
      <div className="px-4 py-3 text-muted">
        <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
          <Loader2 className="w-3 h-3 animate-spin" /> lendo o Google Meu Negócio
        </span>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-lg text-on-surface">Google Meu Negócio</h1>
        <p className="text-[13px] text-muted mt-1">
          {avaliacoes.length} avaliações desde 2017 nas {porFicha.length} fichas — mas o número que decide
          é o de cima: avaliação ruim sem resposta.
        </p>
      </div>

      {/* 1. a fila que custa dinheiro */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 flex items-center gap-2">
          <MessageSquareWarning className="w-3.5 h-3.5 text-warning" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Ruins sem resposta · {fila.length}
          </span>
        </div>
        {fila.length === 0 ? (
          <div className="px-3 py-3 text-[13px] text-muted">Nenhuma avaliação de ≤3 estrelas sem resposta.</div>
        ) : (
          <table className="w-full text-[13px]">
            <tbody>
              {fila.map((r) => (
                <tr key={r.review_id} className="border-t border-outline/10 align-top">
                  <td className="px-3 py-2 w-14 font-mono text-[11px] text-warning">{'★'.repeat(r.estrelas)}</td>
                  <td className="px-3 py-2 w-56 text-secondary">{r.ficha}</td>
                  <td className="px-3 py-2 w-20 font-mono text-[10px] text-muted">
                    {r.criada_em.slice(0, 10).split('-').reverse().slice(0, 2).join('/')}
                  </td>
                  <td className="px-3 py-2 text-on-surface">
                    {r.comentario?.split('\n')[0].slice(0, 120) || <span className="text-muted">sem comentário</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* 2. por ficha */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 flex items-center gap-2">
          <Store className="w-3.5 h-3.5 text-secondary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">Por ficha</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-muted">
                <th className="text-left px-3 py-2">Ficha</th>
                <th className="text-right px-3 py-2">Total</th>
                <th className="text-right px-3 py-2">90 dias</th>
                <th className="text-right px-3 py-2">Média</th>
                <th className="text-right px-3 py-2">Sem resposta</th>
                <th className="text-left px-3 py-2">Última avaliação</th>
              </tr>
            </thead>
            <tbody>
              {porFicha.map((f) => {
                const d = diasAtras(f.ultima);
                return (
                  <tr key={f.ficha} className="border-t border-outline/10">
                    <td className="px-3 py-2 text-on-surface">{f.ficha}</td>
                    <td className="px-3 py-2 text-right text-on-surface">{f.total}</td>
                    <td className="px-3 py-2 text-right">
                      {f.noventa === 0
                        ? <span className="text-warning font-mono text-[10px] uppercase">parada</span>
                        : <span className="text-on-surface">{f.noventa}</span>}
                    </td>
                    <td className="px-3 py-2 text-right text-on-surface">{(f.soma / f.total).toFixed(2)}</td>
                    <td className="px-3 py-2 text-right text-on-surface">
                      {f.semResposta}
                      {f.ruinsSemResposta > 0 && (
                        <span className="text-warning"> · {f.ruinsSemResposta} ruim</span>
                      )}
                    </td>
                    <td className="px-3 py-2">
                      <span className={d > 365 ? 'text-warning' : 'text-muted'}>
                        {f.ultima.slice(0, 10).split('-').reverse().join('/')} · {d} dias
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted">
          Ficha "parada" não recebe avaliação há mais de 90 dias. Quatro delas pararam em 2024 — isso casa
          com as lojas que aparecem "fechadas temporariamente" no Google, e é painel do dono, não do app.
        </div>
      </div>

      {/* 3. menções por nome */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 flex items-center gap-2">
          <UserRound className="w-3.5 h-3.5 text-secondary" />
          <span className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
            Menções por nome {mesAtual ? `· ${mesAtual.split('-').reverse().join('/')}` : ''}
          </span>
        </div>
        {mencoes.length === 0 ? (
          <div className="px-3 py-3 text-[13px] text-muted">
            Nenhum nome mapeado ainda — a lista vive em <code>ops.gbp_nome_citado</code>.
          </div>
        ) : (
          <table className="w-full text-[13px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-muted">
                <th className="text-left px-3 py-2">Nome citado</th>
                <th className="text-right px-3 py-2">Menções</th>
                <th className="text-right px-3 py-2">Média</th>
                <th className="text-right px-3 py-2">Menções ruins</th>
              </tr>
            </thead>
            <tbody>
              {mencoes.sort((a, b) => b.mencoes - a.mencoes).map((m) => (
                <tr key={`${m.mes}-${m.nome}`} className="border-t border-outline/10">
                  <td className="px-3 py-2 text-on-surface">
                    {m.nome}
                    {!m.confirmado && (
                      <span className="ml-2 font-mono text-[9px] uppercase tracking-wider text-warning">
                        a confirmar
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.mencoes}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.media_estrelas}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.mencoes_ruins}</td>
                </tr>
              ))}
              {cobAtual.sem > 0 && (
                <tr className="border-t border-outline/10">
                  <td className="px-3 py-2 text-muted">sem nome reconhecido</td>
                  <td className="px-3 py-2 text-right text-muted">{cobAtual.sem}</td>
                  <td className="px-3 py-2 text-right text-muted">—</td>
                  <td className="px-3 py-2 text-right text-muted">—</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted space-y-1">
          <p>
            <strong className="text-on-surface">Menção não é desempenho.</strong> Quem aparece mais pode
            simplesmente ter atendido mais, ou pedido mais avaliação. Para virar placar falta o denominador
            — quantos clientes cada um atendeu — que vive no banco do Clearix, fora do alcance deste app.
          </p>
          <p>
            Janela a partir de 10/2026: foi quando a campanha de avaliação começou. Antes disso quase
            ninguém citava nome ({cobAtual.com} de {cobAtual.avaliacoes} citam no mês atual).
          </p>
          {semConfirmar && (
            <p className="text-warning">
              Os nomes vieram medidos das avaliações, não de um cadastro — ninguém confirmou que são
              colaboradores. Falta a lista oficial por loja.
            </p>
          )}
        </div>
      </div>

      {/* 4. o que o Google mede */}
      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          O que o Google mede · últimos 14 dias
        </div>
        <div className="px-3 py-2 border-b border-outline/15 text-[13px] flex flex-wrap gap-x-6 gap-y-1">
          <span className="text-on-surface">
            {posts.filter((p) => p.estado_google === 'LIVE').length}
            <span className="text-muted"> posts confirmados no ar pelo Google</span>
          </span>
          <span className={alarmePosts.length ? 'text-warning' : 'text-on-surface'}>
            {alarmePosts.length}
            <span className={alarmePosts.length ? '' : 'text-muted'}> publicados sem confirmação há mais de 1 dia</span>
          </span>
          {semConfirmacao.length > alarmePosts.length && (
            <span className="text-muted">
              {semConfirmacao.length - alarmePosts.length} publicados hoje, ainda não lidos
            </span>
          )}
          <span className="text-on-surface">
            {cancelados.length}<span className="text-muted"> cancelados</span>
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-muted">
                <th className="text-left px-3 py-2">Dia</th>
                <th className="text-right px-3 py-2">Posts nossos</th>
                <th className="text-right px-3 py-2">No ar pelo Google</th>
                <th className="text-right px-3 py-2">Aparições</th>
                <th className="text-right px-3 py-2">Rotas</th>
                <th className="text-right px-3 py-2">Ligações</th>
                <th className="text-right px-3 py-2">Cliques no site</th>
              </tr>
            </thead>
            <tbody>
              {dias.map((d) => (
                <tr key={d.dia} className="border-t border-outline/10">
                  <td className="px-3 py-2 text-on-surface">{d.dia.split('-').reverse().join('/')}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{d.nossos}</td>
                  <td className={`px-3 py-2 text-right ${d.noArGoogle < d.nossos ? 'text-warning' : 'text-on-surface'}`}>
                    {d.noArGoogle}
                  </td>
                  {d.aberto ? (
                    <td colSpan={4} className="px-3 py-2">
                      <span className="font-mono text-[10px] uppercase tracking-wider text-muted">
                        ainda não fechou · o relatório do Google atrasa alguns dias
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-right text-on-surface">{d.aparicoes}</td>
                      <td className="px-3 py-2 text-right text-on-surface">{d.rotas}</td>
                      <td className="px-3 py-2 text-right text-on-surface">{d.ligacoes}</td>
                      <td className="px-3 py-2 text-right text-muted">não coletado</td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted space-y-1">
          <p>
            <strong className="text-on-surface">"No ar pelo Google" é leitura de volta, não a nossa
            tabela.</strong> A coluna conta só post que a API do Google devolve como publicado — é a
            testemunha que faltava: até 28/10 esta tela não mostrava post nenhum, porque "publicado" era
            declaração do nosso próprio escritor. Quando a coluna fica menor que "posts nossos", ela acende.
          </p>
          <p>
            Aparições, rotas e ligações só aparecem no dia que a origem marcou <strong>fechado</strong>;
            antes disso vêm nulas e a linha diz "ainda não fechou" em vez de somar zero. "Cliques no site"
            vem nulo da origem nas 6 fichas, todas com site cadastrado — não é zero, é não coletado, e fica
            assim até alguém conferir um dia no painel do Google.
          </p>
        </div>
      </div>
    </div>
  );
}
