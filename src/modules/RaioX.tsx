import { useEffect, useMemo, useState } from 'react';
import { Activity, Boxes, GitBranch, Bot, AlertTriangle, RefreshCw, Loader2 } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { Chip } from './MktCrescimento';
import { supabase } from '../lib/supabase';
import { lerTudo } from '../lib/paginar';

// RAIO-X DO ECO (23/11/2026) — ordem do dono pelo canal do eco: "pode o primeiro raio-x… precisamos
// de tudo completo… chamar o agent digiai, para resolver as telas dele".
//
// O QUE ESTA TELA É: o retrato que o agente do eco gera cruzando o catálogo do banco do Clearix com
// o código dos 18 apps. Ele escreve `Cockpit/raio-x/latest.json`; o `raiox-carregar.mjs` traz para
// `ops.raiox_snapshot` do banco DESTE app; aqui se lê `public.v_raiox_*`.
//
// O BANCO DO CLEARIX CONTINUA ISOLADO: esta página não fala com ele. Lê o retrato, sem dado de
// pessoa. E a data de geração fica grande no alto, porque retrato velho que parece novo é a forma
// mais barata de mentir numa tela.
//
// "ALTA" APARECE COMO **A CONFERIR**, NÃO COMO FATO. O próprio eco avisou que esta primeira versão
// tem falso alarme (ele já tirou três à mão), e os `limites` no rodapé dizem o que o método não vê.
// Dizer "132 falhas de segurança" seria repetir, em tela, o erro que a tela existe para pegar.

type Estado = {
  contrato: string; gerado_em: string; carregado_em: string; projeto: string | null;
  banco: Record<string, number | string[]>; gaps_por_tipo: Record<string, number>;
  gaps_alta: number; gaps_media: number; gaps_info: number; apps: number; robos: number;
};
type App = {
  app: string; arquivos: number; telas: number; rotas_de_api: number; funcoes_chamadas: number;
  objetos_lidos: number; chamadas_que_gravam: number; edge_functions: number;
  gaps_altos: number; gaps_medios: number; gaps_info: number; tem_spec: boolean; tem_agents: boolean;
  spec_onde: 'propria' | 'guarda-chuva' | 'nao' | null;
  // Campos de deploy, mandados pelo eco em 23/11. As três contagens de "código fora do ar" são
  // coisas DIFERENTES e por isso não viram um número só: falta deploy, falta integrar, pode se perder.
  ultimo_deploy: string | null; versao_no_ar: string | null; deploy_lido: boolean;
  commits_fora_do_ar: number | null; commits_em_outro_ramo: number | null;
  arquivos_sem_commit: number | null; commits_inconclusivos: number | null;
};
type Gap = {
  tipo: string; rotulo: string; sev: 'alta' | 'media' | 'info'; app: string | null; objeto: string;
  detalhe: string | null; arq: string | null; linha: number | null;
  conferido: string | null; conferido_por: string | null; conferido_em: string | null; conferido_motivo: string | null;
};
type Ligacao = { objeto: string; apps: string[]; quantos: number };
type Robo = { id: number; nome: string; agenda: string; ativo: boolean; alvo: string; ultima: string | null; status: string | null };

const ABAS = [
  { k: 'apps', label: 'Apps', Icon: Boxes },
  { k: 'achados', label: 'Achados', Icon: AlertTriangle },
  { k: 'ligacoes', label: 'Ligações', Icon: GitBranch },
  { k: 'robos', label: 'Robôs', Icon: Bot },
] as const;
type AbaK = typeof ABAS[number]['k'];

const SEVS = [
  { k: '', label: 'todas' },
  { k: 'alta', label: 'a conferir' },
  { k: 'media', label: 'média' },
  { k: 'info', label: 'informativo' },
] as const;

const COR_OK = 'var(--color-action)';
const COR_WARN = 'var(--color-warning)';
const COR_DANGER = 'var(--color-danger)';
const COR_SEC = 'var(--color-secondary)';
const corDaSev = (s: string) => (s === 'alta' ? COR_DANGER : s === 'media' ? COR_WARN : COR_SEC);

const nf = (n: number) => n.toLocaleString('pt-BR');
const lbl = 'font-mono text-[10px] uppercase tracking-widest text-muted';

/** Quanto tempo o retrato tem. Retrato de ontem não é erro; retrato de ontem com cara de hoje é. */
function idade(iso: string): { texto: string; cor: string } {
  const h = (Date.now() - new Date(iso).getTime()) / 3600000;
  if (h < 1) return { texto: 'agora há pouco', cor: COR_OK };
  if (h < 24) return { texto: `há ${Math.floor(h)}h`, cor: COR_OK };
  const d = Math.floor(h / 24);
  return { texto: `há ${d} ${d === 1 ? 'dia' : 'dias'}`, cor: d >= 7 ? COR_DANGER : COR_WARN };
}

export default function RaioX() {
  const [aba, setAba] = useState<AbaK>('apps');
  const [estado, setEstado] = useState<Estado | null>(null);
  const [apps, setApps] = useState<App[]>([]);
  const [gaps, setGaps] = useState<Gap[]>([]);
  const [ligacoes, setLigacoes] = useState<Ligacao[]>([]);
  const [robos, setRobos] = useState<Robo[]>([]);
  const [limites, setLimites] = useState<string[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [fApp, setFApp] = useState('');
  const [fSev, setFSev] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [{ data: e, error: err }, { data: a }, { data: l }, { data: r }, { data: li }, g] = await Promise.all([
          supabase.from('v_raiox_estado').select('*').maybeSingle(),
          supabase.from('v_raiox_apps').select('*').order('app'),
          supabase.from('v_raiox_ligacoes').select('*').order('quantos', { ascending: false }).order('objeto'),
          supabase.from('v_raiox_robos').select('*').order('nome'),
          supabase.from('v_raiox_limites').select('*').order('ord'),
          // 1.466 achados passam do teto de mil da API — a mesma armadilha que esta tela veio
          // mostrar no eco (250 ocorrências lá). Lido em páginas, com ordem única.
          lerTudo<Gap>((de, ate) => supabase.from('v_raiox_gaps').select('*')
            .order('sev').order('tipo').order('app', { nullsFirst: true }).order('objeto').order('arq', { nullsFirst: true }).order('linha', { nullsFirst: true })
            .range(de, ate)),
        ]);
        if (err) throw new Error(err.message);
        setEstado((e ?? null) as Estado | null);
        setApps((a ?? []) as App[]);
        setLigacoes((l ?? []) as Ligacao[]);
        setRobos((r ?? []) as Robo[]);
        setLimites(((li ?? []) as { texto: string }[]).map((x) => x.texto));
        setGaps(g);
      } catch (x) {
        setErro(x instanceof Error ? x.message : String(x));
      } finally {
        setCarregando(false);
      }
    })();
  }, []);

  const gapsF = useMemo(() => gaps.filter((g) =>
    (!fApp || g.app === fApp) && (!fSev || g.sev === fSev)), [gaps, fApp, fSev]);
  const dispensados = useMemo(() => gapsF.filter((g) => g.conferido === 'dispensado').length, [gapsF]);
  const banco = estado?.banco ?? {};
  const n = (k: string) => (typeof banco[k] === 'number' ? (banco[k] as number) : null);

  if (carregando) return <div className="py-20 text-center text-muted"><Loader2 className="w-5 h-5 animate-spin inline" /></div>;

  if (erro || !estado) {
    return (
      <div>
        <PageHeader eyebrow="Ecossistema Clearix" title="Raio-X do eco" />
        <div className="border px-4 py-3 text-[13px]" style={{ borderColor: COR_WARN, color: COR_WARN }}>
          {erro
            ? <>Não consegui ler o retrato: {erro}</>
            : <>Ainda não há retrato carregado. Quem gera é o agente do eco (<code className="font-mono">Cockpit/scripts/raio-x-eco.mjs</code>);
                quem traz para cá é <code className="font-mono">Cockpit/scripts/raiox-carregar.mjs</code>. Vazio aqui quer dizer
                "ninguém carregou ainda", não "o eco está limpo".</>}
        </div>
      </div>
    );
  }

  const quando = idade(estado.gerado_em);

  return (
    <div>
      <PageHeader
        eyebrow="Ecossistema Clearix · retrato do código × banco"
        title="Raio-X do eco"
        subtitle="O que os 18 apps do Clearix usam do banco deles, o que não casa e o que está solto. Leitura de um retrato gerado pelo agente do eco — esta página não fala com o banco do Clearix."
        actions={
          <div className="text-right">
            <div className={lbl}>retrato gerado</div>
            <div className="font-mono text-[13px] text-on-surface">{new Date(estado.gerado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}</div>
            <div className="font-mono text-[11px]" style={{ color: quando.cor }}>{quando.texto}</div>
          </div>
        }
      />

      <section className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Cartao icon={<Activity className="w-4 h-4" />} titulo="funções no banco" valor={n('funcoes')}
          sub={`${nf(n('funcoes_public_usadas_por_app') ?? 0)} usadas por algum app · ${nf(n('funcoes_public_sem_uso_visivel') ?? 0)} sem uso visível`} cor={COR_SEC} />
        <Cartao icon={<Boxes className="w-4 h-4" />} titulo="tabelas e visões" valor={(n('tabelas') ?? 0) + (n('visoes') ?? 0)}
          sub={`${nf(n('tabelas') ?? 0)} tabelas · ${nf(n('visoes') ?? 0)} visões · ${nf(n('tabelas_em_public') ?? 0)} tabelas em public`} cor={COR_SEC} />
        <Cartao icon={<AlertTriangle className="w-4 h-4" />} titulo="achados a conferir" valor={estado.gaps_alta}
          sub={`${nf(estado.gaps_media)} médios · ${nf(estado.gaps_info)} informativos`} cor={COR_DANGER} />
        <Cartao icon={<Bot className="w-4 h-4" />} titulo="robôs" valor={estado.robos}
          sub={`${robos.filter((r) => r.ativo).length} ligados · ${robos.filter((r) => !r.ativo).length} desligados`} cor={COR_WARN} />
      </section>

      <div className="border-l-2 border-secondary bg-surface-container px-4 py-2.5 mb-5 text-[13px] text-on-surface-variant">
        <b className="text-on-surface">Os "a conferir" são indício, não veredito.</b> O próprio eco avisou que esta primeira
        versão dá falso alarme — ele já descartou três à mão. Cada linha traz o arquivo e a linha onde foi vista, para a
        conferência ser possível. O que o método não enxerga está escrito no pé da página.
      </div>

      <div className="flex gap-1 border-b border-outline/20 mb-4 overflow-x-auto">
        {ABAS.map(({ k, label, Icon }) => (
          <button key={k} onClick={() => setAba(k)}
            className={'flex items-center gap-1.5 px-3.5 py-2 font-mono text-[11px] uppercase tracking-wider whitespace-nowrap border-b-2 -mb-px transition-colors ' +
              (aba === k ? 'border-secondary text-on-surface' : 'border-transparent text-muted hover:text-on-surface-variant')}>
            <Icon className="w-3.5 h-3.5" />{label}
          </button>
        ))}
      </div>

      {aba === 'apps' && (
        <section className="border border-outline/15 bg-surface-container overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-outline/15">
                <th className={'text-left font-normal px-4 py-2 ' + lbl}>app</th>
                <th className={'text-right font-normal px-4 py-2 ' + lbl}>telas</th>
                <th className={'text-right font-normal px-4 py-2 ' + lbl}>funções que chama</th>
                <th className={'text-right font-normal px-4 py-2 ' + lbl}>objetos que lê</th>
                <th className={'text-right font-normal px-4 py-2 ' + lbl}>chamadas que gravam</th>
                <th className={'text-right font-normal px-4 py-2 ' + lbl}>a conferir</th>
                <th className={'text-left font-normal px-4 py-2 ' + lbl}>último deploy</th>
                <th className={'text-left font-normal px-4 py-2 ' + lbl}>fora do ar</th>
                <th className={'text-left font-normal px-4 py-2 ' + lbl}>doc</th>
              </tr>
            </thead>
            <tbody>
              {apps.map((a) => (
                <tr key={a.app} className="border-b border-outline/10 hover:bg-surface-highest/50">
                  <td className="px-4 py-2 text-on-surface font-mono text-[12px]">{a.app}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-on-surface-variant">{a.telas}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-on-surface-variant">{a.funcoes_chamadas}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-on-surface-variant">{a.objetos_lidos}</td>
                  <td className="px-4 py-2 text-right font-mono tabular-nums text-on-surface-variant">{a.chamadas_que_gravam}</td>
                  <td className="px-4 py-2 text-right">
                    <button onClick={() => { setFApp(a.app); setFSev('alta'); setAba('achados'); }}
                      className="font-mono tabular-nums hover:underline" style={{ color: a.gaps_altos > 0 ? COR_DANGER : 'var(--color-muted)' }}>
                      {a.gaps_altos}
                    </button>
                    <span className="text-muted font-mono text-[11px]"> · {a.gaps_medios} · {a.gaps_info}</span>
                  </td>
                  {/* DEPLOY. Traço aqui nunca quer dizer "em dia": quando o eco não conseguiu ler o
                      deploy do app, a célula diz **não lido**, que é desconhecido. A diferença entre
                      "nada pendente" e "ninguém olhou" é a diferença entre dormir tranquilo e achar que
                      dormiu tranquilo. */}
                  <td className="px-4 py-2 font-mono text-[11px] whitespace-nowrap">
                    {a.deploy_lido
                      ? <span className="text-on-surface-variant" title={a.versao_no_ar ?? ''}>{(a.ultimo_deploy ?? '—').slice(0, 10).split('-').reverse().join('/')}</span>
                      : <span style={{ color: 'var(--color-muted)' }}>não lido</span>}
                  </td>
                  <td className="px-4 py-2 font-mono text-[11px] whitespace-nowrap">
                    {!a.deploy_lido ? <span className="text-muted">—</span> : (() => {
                      const p = [];
                      if (a.commits_fora_do_ar) p.push(<span key="d" style={{ color: COR_DANGER }} title="commitado no ramo certo e ainda não publicado — falta deploy">{a.commits_fora_do_ar} falta deploy</span>);
                      if (a.commits_em_outro_ramo) p.push(<span key="r" style={{ color: COR_WARN }} title="existe, mas em outro ramo — falta integrar">{a.commits_em_outro_ramo} outro ramo</span>);
                      if (a.arquivos_sem_commit) p.push(<span key="s" style={{ color: COR_DANGER }} title="nem commitado está — some se a máquina morrer">{a.arquivos_sem_commit} sem commit</span>);
                      if (a.commits_inconclusivos) p.push(<span key="i" className="text-muted" title="o eco não conseguiu decidir se está no ar">{a.commits_inconclusivos} inconclusivo</span>);
                      return p.length === 0
                        ? <span style={{ color: COR_OK }}>em dia</span>
                        : <>{p.map((x, i) => <span key={i}>{i > 0 && <span className="text-muted"> · </span>}{x}</span>)}</>;
                    })()}
                  </td>
                  {/* "sem spec" dizia mentira para 14 sub-apps do Clearix: elas são cobertas pela Spec
                      guarda-chuva do eco. O defeito era do script dele e apareceu AQUI — ele corrigiu e
                      mandou `spec_onde`, que é o que a coluna mostra agora. Dizer "sem spec" para quem
                      tem spec é a mesma família de erro que esta página existe para pegar. */}
                  <td className="px-4 py-2 font-mono text-[11px]">
                    <span style={{ color: a.spec_onde === 'nao' || (!a.spec_onde && !a.tem_spec) ? COR_WARN : COR_OK }}>
                      {a.spec_onde === 'guarda-chuva' ? 'spec do eco'
                        : a.spec_onde === 'propria' ? 'spec própria'
                        : a.spec_onde === 'nao' ? 'sem spec'
                        : a.tem_spec ? 'spec' : 'sem spec'}
                    </span>
                    <span className="text-muted"> · </span>
                    <span style={{ color: a.tem_agents ? COR_OK : COR_WARN }}>{a.tem_agents ? 'agents' : 'sem agents'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="px-4 py-2 text-[11px] text-muted leading-relaxed">
            a conferir · médios · informativos — clique no primeiro número para ver os do app.<br />
            <b className="text-on-surface-variant">Fora do ar</b> separa três coisas que o resumo junta: <b>falta deploy</b> (está no
            ramo certo e não subiu), <b>outro ramo</b> (existe, falta integrar) e <b>sem commit</b> (nem commitado está — some
            se a máquina morrer). Cada uma se resolve de um jeito, e a terceira é a única que se perde sozinha.
          </div>
        </section>
      )}

      {aba === 'achados' && (
        <>
          <div className="border border-outline/15 bg-surface-container px-3.5 py-3 mb-4 space-y-2.5">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={lbl + ' mr-1 shrink-0'}>gravidade</span>
              {SEVS.map((s) => <Chip key={s.k} on={fSev === s.k} onClick={() => setFSev(s.k)}>{s.label}</Chip>)}
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              <span className={lbl + ' mr-1 shrink-0'}>app</span>
              <Chip on={fApp === ''} onClick={() => setFApp('')}>todos</Chip>
              {apps.map((a) => <Chip key={a.app} on={fApp === a.app} onClick={() => setFApp(fApp === a.app ? '' : a.app)}>{a.app.replace(/^clearix_/, '')}</Chip>)}
              <span className="ml-auto font-mono text-[11px] text-muted">
                {nf(gapsF.length)} de {nf(gaps.length)}{dispensados > 0 ? ` · ${dispensados} dispensado(s) pelo eco, mantidos à vista` : ''}
              </span>
            </div>
          </div>
          <section className="border border-outline/15 bg-surface-container divide-y divide-outline/10">
            {gapsF.slice(0, 300).map((g, i) => (
              <div key={i} className="px-4 py-2.5 hover:bg-surface-highest/40">
                <div className="flex items-baseline gap-2 flex-wrap">
                  <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0"
                    style={{ color: corDaSev(g.sev), borderColor: corDaSev(g.sev) }}>
                    {g.sev === 'alta' ? 'a conferir' : g.sev === 'media' ? 'média' : 'info'}
                  </span>
                  <span className="text-[13px] text-on-surface">{g.rotulo}</span>
                  {g.app && <span className="font-mono text-[11px] text-muted">{g.app}</span>}
                  {g.conferido && (
                    <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5"
                      style={{ background: 'var(--color-surface-highest)', color: g.conferido === 'dispensado' ? 'var(--color-muted)' : COR_DANGER }}>
                      {g.conferido === 'dispensado' ? 'dispensado' : 'confirmado'}{g.conferido_por ? ` · ${g.conferido_por}` : ''}
                    </span>
                  )}
                </div>
                <div className="text-[12px] text-on-surface-variant mt-0.5">
                  <span className="font-mono">{g.objeto}</span>{g.detalhe ? ` — ${g.detalhe}` : ''}
                </div>
                {(g.arq || g.conferido_motivo) && (
                  <div className="text-[11px] text-muted mt-0.5 font-mono">
                    {g.arq ? `${g.arq}${g.linha ? ':' + g.linha : ''}` : ''}
                    {g.conferido_motivo ? `${g.arq ? ' · ' : ''}${g.conferido_motivo}` : ''}
                  </div>
                )}
              </div>
            ))}
            {gapsF.length === 0 && <div className="px-4 py-10 text-center text-sm text-muted">Nada neste recorte — ajuste os filtros.</div>}
            {gapsF.length > 300 && (
              <div className="px-4 py-2.5 text-[12px] text-muted">
                mostrando os 300 primeiros de {nf(gapsF.length)} — filtre por app ou gravidade para ver o resto.
                <span className="text-on-surface-variant"> A lista é cortada aqui na tela, de propósito e dito; o número acima é o total real.</span>
              </div>
            )}
          </section>
        </>
      )}

      {aba === 'ligacoes' && (
        <section className="border border-outline/15 bg-surface-container divide-y divide-outline/10">
          <div className="px-4 py-2 text-[12px] text-muted">Objeto do banco usado por mais de um app — mexer nele mexe em todos eles.</div>
          {ligacoes.map((l) => (
            <div key={l.objeto} className="px-4 py-2.5 flex items-baseline gap-3 flex-wrap">
              <span className="font-mono text-[12px] text-on-surface">{l.objeto}</span>
              <span className="font-mono text-[11px] shrink-0" style={{ color: l.quantos >= 10 ? COR_DANGER : l.quantos >= 5 ? COR_WARN : COR_SEC }}>{l.quantos} apps</span>
              <span className="text-[11px] text-muted truncate">{l.apps.map((a) => a.replace(/^clearix_/, '')).join(' · ')}</span>
            </div>
          ))}
        </section>
      )}

      {aba === 'robos' && (
        <section className="border border-outline/15 bg-surface-container overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-outline/15">
                <th className={'text-left font-normal px-4 py-2 ' + lbl}>robô</th>
                <th className={'text-left font-normal px-4 py-2 ' + lbl}>agenda</th>
                <th className={'text-left font-normal px-4 py-2 ' + lbl}>última rodada</th>
                <th className={'text-left font-normal px-4 py-2 ' + lbl}>estado</th>
              </tr>
            </thead>
            <tbody>
              {robos.map((r) => (
                <tr key={r.id} className="border-b border-outline/10 hover:bg-surface-highest/50">
                  <td className="px-4 py-2 font-mono text-[12px] text-on-surface">{r.nome}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-muted">{r.agenda}</td>
                  <td className="px-4 py-2 font-mono text-[11px] text-on-surface-variant">{r.ultima ?? '—'}</td>
                  <td className="px-4 py-2 font-mono text-[11px]">
                    {!r.ativo
                      ? <span style={{ color: COR_WARN }}>desligado</span>
                      : <span style={{ color: r.status === 'succeeded' ? COR_OK : COR_DANGER }}>{r.status ?? 'sem rodada'}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      <section className="mt-6 border border-outline/15 bg-surface-lowest px-4 py-3">
        <div className={lbl + ' mb-1.5'}>o que este retrato NÃO enxerga</div>
        <ul className="text-[12px] text-on-surface-variant space-y-1 list-disc pl-5">
          {limites.map((l, i) => <li key={i}>{l}</li>)}
        </ul>
        <div className="text-[11px] text-muted mt-2 flex items-center gap-1.5">
          <RefreshCw className="w-3 h-3" />
          gerado por <code className="font-mono">Cockpit/scripts/raio-x-eco.mjs</code> (agente do eco) ·
          trazido por <code className="font-mono">raiox-carregar.mjs</code> ·
          contrato {estado.contrato} · carregado {new Date(estado.carregado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
        </div>
      </section>
    </div>
  );
}

function Cartao({ icon, titulo, valor, sub, cor }: { icon: React.ReactNode; titulo: string; valor: number | null; sub: string; cor: string }) {
  return (
    <div className="border border-outline/15 bg-surface-container px-3.5 py-3">
      <div className="flex items-center gap-1.5 text-on-surface-variant text-[11px] mb-1.5">{icon}{titulo}</div>
      <div className="text-xl font-semibold font-mono tabular-nums" style={{ color: cor }}>{valor == null ? '—' : nf(valor)}</div>
      <div className="text-[10px] text-muted mt-0.5">{sub}</div>
    </div>
  );
}
