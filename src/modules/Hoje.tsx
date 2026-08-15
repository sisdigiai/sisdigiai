import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Target, Bot, RefreshCw, Check, MessageSquareWarning } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { ordemStore, placarStore, type ItemOrdem, type BlocoOrdem, type PlacarHoje, type PontoMrr } from '../lib/ordemStore';

const BLOCOS: { id: BlocoOrdem; titulo: string; regra: string; icon: typeof Target; cor: string }[] = [
  { id: 'trava',   titulo: 'Trava',   regra: 'Apaga a empresa se ignorado',  icon: AlertTriangle, cor: 'text-danger border-danger/40' },
  { id: 'gate',    titulo: 'Gate',    regra: 'Destrava a fase atual',        icon: Target,        cor: 'text-warning border-warning/40' },
  { id: 'maquina', titulo: 'Máquina', regra: 'Já rodou — você só confere',   icon: Bot,           cor: 'text-secondary border-secondary/40' },
];

const dataLonga = (iso: string) =>
  new Date(iso + 'T00:00:00').toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

export default function Hoje() {
  const [itens, setItens] = useState<ItemOrdem[]>([]);
  const [placar, setPlacar] = useState<PlacarHoje | null>(null);
  const [loading, setLoading] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [justificando, setJustificando] = useState<string | null>(null);
  const [texto, setTexto] = useState('');

  const hoje = new Date().toISOString().slice(0, 10);

  const carregar = useCallback(() => {
    setLoading(true);
    ordemStore.doDia(hoje).then((r) => { setItens(r); setLoading(false); });
    placarStore.hoje().then(setPlacar);
  }, [hoje]);

  useEffect(carregar, [carregar]);

  const gerar = async () => {
    setErro(null);
    try {
      await ordemStore.gerar();
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao gerar a ordem.');
    }
  };

  const cumprir = async (item: ItemOrdem) => {
    setErro(null);
    try {
      await ordemStore.fechar(item.id, 'cumprido');
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao marcar como cumprido.');
    }
  };

  const justificar = async (item: ItemOrdem) => {
    setErro(null);
    try {
      await ordemStore.fechar(item.id, 'justificado', texto);
      setJustificando(null);
      setTexto('');
      carregar();
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Falha ao justificar.');
    }
  };

  const abertos = useMemo(() => itens.filter((i) => i.estado === 'aberto'), [itens]);
  const humanosAbertos = abertos.filter((i) => i.dono === 'humano').length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      <PageHeader
        eyebrow="Operacional · ordem do dia"
        title={dataLonga(hoje).replace(/^\w/, (c) => c.toUpperCase())}
        subtitle={
          itens.length === 0
            ? 'Nenhuma ordem gerada para hoje.'
            : `${humanosAbertos} obrigação(ões) sua(s) em aberto · ${itens.length} itens no total. Item só sai da lista cumprido ou justificado.`
        }
      >
        <div className="mt-4">
          <button
            onClick={gerar}
            className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-outline/20 text-on-surface hover:bg-surface-low transition"
          >
            <RefreshCw className="w-4 h-4 text-secondary" /> Regerar ordem
          </button>
        </div>
      </PageHeader>

      {placar && (
        <div className="mb-5 space-y-3">
          {/* A fase em uma linha: onde estamos e se o gate se sustenta no dado */}
          <div className="flex items-center gap-2 flex-wrap text-sm text-on-surface-variant">
            <span>
              Fase {placar.fase} · {placar.fase_nome} —{' '}
              <strong className="text-on-surface">elo {placar.elo_numero} de {placar.elo_total}</strong>
              {placar.elo_dias != null && (placar.elo_dias >= 0
                ? `, vence em ${placar.elo_dias} dia(s)`
                : `, passou do prazo`)}
            </span>
            {!placar.gate_ok && (
              <span
                title={placar.gate_veredito}
                className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border text-warning border-warning/40 bg-warning/10"
              >
                gate não sustentado pelo dado
              </span>
            )}
          </div>

          {/* Placar: os 4 KPIs da antiga Visão, sem os cards decorativos */}
          <div className="grid grid-cols-2 md:grid-cols-4 border border-outline/15 bg-surface-container">
            {[
              { rot: 'Caixa', val: brl(placar.caixa), zero: placar.caixa === 0 },
              { rot: 'Custo / mês', val: brl(placar.custo_mes), zero: false },
              { rot: 'Clientes pagantes', val: String(placar.pagantes), zero: placar.pagantes === 0 },
              { rot: 'MRR', val: brl(ultimoMrr(placar.mrr_serie)), zero: ultimoMrr(placar.mrr_serie) === 0,
                spark: placar.mrr_serie },
            ].map((k) => (
              <div key={k.rot} className="p-3 border-r border-outline/10 last:border-r-0">
                <div className="font-mono text-[9px] uppercase tracking-widest text-muted">{k.rot}</div>
                <div className={`font-serif text-xl font-semibold tabular-nums mt-0.5 ${k.zero ? 'text-danger' : 'text-on-surface'}`}>
                  {k.val}
                </div>
                {k.spark && <Sparkline serie={k.spark} />}
              </div>
            ))}
          </div>
        </div>
      )}

      {erro && (
        <div className="border border-danger/40 bg-danger/5 px-4 py-2.5 mb-5 text-sm text-on-surface">
          ⚠ {erro}
        </div>
      )}

      {loading ? (
        <div className="text-sm text-muted">Carregando a ordem…</div>
      ) : itens.length === 0 ? (
        <div className="border border-outline/15 bg-surface-container p-6 text-sm text-muted">
          A ordem é gerada de madrugada a partir do roadmap, do backlog e das pendências humanas.
          Clique em <span className="text-on-surface">Regerar ordem</span> para montar a de hoje agora.
        </div>
      ) : (
        <div className="space-y-5">
          {BLOCOS.map((bloco) => {
            const doBloco = itens.filter((i) => i.bloco === bloco.id);
            if (doBloco.length === 0) return null;
            const Icon = bloco.icon;
            return (
              <div key={bloco.id} className="border border-outline/15 bg-surface-container">
                <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2 flex-wrap">
                  <Icon className={`w-3.5 h-3.5 shrink-0 ${bloco.cor.split(' ')[0]}`} />
                  <span className={`font-mono text-[10px] uppercase tracking-widest ${bloco.cor.split(' ')[0]}`}>
                    {bloco.titulo}
                  </span>
                  <span className="font-mono text-[10px] text-muted">· {bloco.regra}</span>
                  <span className="ml-auto font-mono text-[10px] text-muted">
                    {doBloco.filter((i) => i.estado === 'aberto').length} de {doBloco.length} em aberto
                  </span>
                </div>

                <div className="divide-y divide-outline/10">
                  {doBloco.map((item) => {
                    const fechado = item.estado !== 'aberto';
                    return (
                      <div key={item.id} className={`px-4 py-3 ${fechado ? 'opacity-55' : ''}`}>
                        <div className="flex items-start gap-3 flex-wrap">
                          <div className="flex-1 min-w-[260px]">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`text-sm text-on-surface ${fechado ? 'line-through' : 'font-medium'}`}>
                                {item.titulo}
                              </span>
                              {item.estado === 'cumprido' && (
                                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border text-success border-success/40 bg-success/10">
                                  cumprido
                                </span>
                              )}
                              {item.estado === 'justificado' && (
                                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border text-muted border-outline/25">
                                  justificado
                                </span>
                              )}
                              {item.dono === 'maquina' && item.estado === 'aberto' && (
                                <span className="font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border text-secondary border-secondary/40 bg-secondary/10">
                                  automático
                                </span>
                              )}
                            </div>
                            {item.porque && (
                              <div className="text-[12px] text-on-surface-variant mt-1 leading-snug">{item.porque}</div>
                            )}
                            {item.justificativa && (
                              <div className="text-[12px] text-muted mt-1 leading-snug italic">
                                Justificativa: {item.justificativa}
                              </div>
                            )}
                            {item.origem_ref && (
                              <div className="font-mono text-[10px] text-muted mt-1">
                                {item.origem_tipo} · {item.origem_ref}
                              </div>
                            )}
                          </div>

                          {!fechado && item.dono === 'humano' && (
                            <div className="flex items-center gap-2 shrink-0">
                              <button
                                onClick={() => cumprir(item)}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs bg-success/10 text-success border border-success/40 hover:bg-success/20 transition-colors"
                              >
                                <Check className="w-3.5 h-3.5" /> Cumpri
                              </button>
                              <button
                                onClick={() => { setJustificando(justificando === item.id ? null : item.id); setTexto(''); }}
                                className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-outline/20 text-muted hover:text-on-surface transition-colors"
                              >
                                <MessageSquareWarning className="w-3.5 h-3.5" /> Hoje não
                              </button>
                            </div>
                          )}
                        </div>

                        {justificando === item.id && (
                          <div className="mt-3 flex items-start gap-2 flex-wrap">
                            <input
                              autoFocus
                              value={texto}
                              onChange={(e) => setTexto(e.target.value)}
                              placeholder="Por que não hoje? Fica registrado."
                              className="flex-1 min-w-[240px] bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface focus:border-secondary/50 outline-none"
                            />
                            <button
                              onClick={() => justificar(item)}
                              disabled={texto.trim().length <= 3}
                              className="px-3 py-1.5 text-xs font-medium bg-secondary text-on-secondary hover:opacity-90 disabled:opacity-40"
                            >
                              Registrar
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}
      {itens.length > 0 && (
        <div className="mt-6 pt-4 border-t border-outline/10 flex gap-5 flex-wrap font-mono text-[10px] uppercase tracking-wider">
          <a href="#/semana" className="text-secondary hover:underline">ver a semana →</a>
          <a href="#/lista-mestra" className="text-secondary hover:underline">ver a fila completa →</a>
          <a href="#/trilha" className="text-secondary hover:underline">ver o roadmap →</a>
        </div>
      )}
    </div>
  );
}

const brl = (v: number) =>
  Number(v).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

const ultimoMrr = (serie: PontoMrr[]) =>
  serie.length ? Number(serie[serie.length - 1].mrr) : 0;

// Sparkline em vez de bloco: a série de MRR fica visível sem ocupar um quarto da
// tela desenhando uma reta em zero.
function Sparkline({ serie }: { serie: PontoMrr[] }) {
  if (serie.length < 2) return null;
  const vals = serie.map((p) => Number(p.mrr));
  const max = Math.max(...vals, 1);
  const pts = vals
    .map((v, i) => `${(i / (vals.length - 1)) * 100},${20 - (v / max) * 18}`)
    .join(' ');
  return (
    <svg viewBox="0 0 100 20" preserveAspectRatio="none" className="w-full h-4 mt-1.5" aria-hidden="true">
      <polyline points={pts} fill="none" stroke="currentColor" strokeWidth="1"
        className="text-secondary/60" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
