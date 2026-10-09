import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, KeyRound, Loader2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { espelhoMotoresEstado, type EstadoEspelho } from '../lib/espelhoMotores';
import { semanasAnteriores, ultimaSemanaCompleta } from '../lib/datas';

// Comparativo de motores por semana (migration 193; pedido do Geral em 07/10, aprovado pelo dono).
//
// Abre o placar de segunda, e por isso tem uma regra acima de qualquer outra: NÃO MOSTRAR ZERO ONDE A
// RESPOSTA É "NÃO SEI". Três casos diferentes caem na mesma célula vazia se ninguém separar, e levam a
// decisões opostas:
//   · o motor publicou e não deu resultado  → 0, e é o número
//   · a métrica ainda não foi medida        → "ainda não" (ex.: views_d7, que o MKT começou a preencher em 09/10)
//   · o espelho não foi lido                → "falta credencial" ou "não li", com o motivo
//
// POR QUE MOTOR E RESULTADO SÃO DUAS TABELAS: venda é da MARCA, não do motor. O Mello publica por dois
// motores ao mesmo tempo (MKT no IG/FB, Limelight no TikTok/YouTube); venda na linha de cada motor viraria
// venda somada duas vezes. A view de esforço nem tem coluna de venda — a trava é estrutural, não visual.
//
// DE ONDE VEM CADA LINHA: o motor `mkt` sai do banco do digiai (v_comparativo_motores_semana). Pulso,
// Limelight, blogs e Polá vivem em projetos Supabase SEPARADOS e são lidos pelo navegador com a anon key
// de cada um — uma view do digiai não os alcança, e a tela diz isso em vez de fingir cobertura.

interface MotorSemana {
  motor: string; marca: string; marca_nome: string | null; semana: string;
  publicacoes: number; dias_com_publicacao: number; engajamento: number;
  views: number | null; views_medidas: number;
}
interface ResultadoSemana {
  marca: string; semana: string; visitas: number; cliques: number; vendas: number;
}
interface Linha {
  motor: string; frente: string; publicacoes: number; dias: number;
  engajamento: number | null; views: number | null; viewsMedidas: number;
  estado: EstadoEspelho; detalhe?: string;
}

const MOTOR_ROTULO: Record<string, string> = {
  mkt: 'MKT', pulso: 'Pulso', limelight: 'Limelight', blogs: 'Blogs', pola: 'Polá',
};

/** Soma linhas diárias de um espelho na semana pedida. `dia` vem como data de Brasília do próprio espelho. */
function somarSemana<T extends { dia: string }>(linhas: T[], semana: string, campos: (r: T) => { pub: number; views: number }) {
  const fim = new Date(`${semana}T12:00:00Z`);
  fim.setUTCDate(fim.getUTCDate() + 6);
  const ate = fim.toISOString().slice(0, 10);
  const dentro = linhas.filter((r) => r.dia >= semana && r.dia <= ate);
  const dias = new Set(dentro.filter((r) => campos(r).pub > 0).map((r) => r.dia));
  return {
    pub: dentro.reduce((s, r) => s + campos(r).pub, 0),
    views: dentro.reduce((s, r) => s + campos(r).views, 0),
    dias: dias.size,
  };
}

export default function ComparativoMotores() {
  const semanas = useMemo(() => semanasAnteriores(9), []);
  const [semana, setSemana] = useState(() => ultimaSemanaCompleta());
  const [motores, setMotores] = useState<MotorSemana[]>([]);
  const [resultado, setResultado] = useState<ResultadoSemana[]>([]);
  const [espelhos, setEspelhos] = useState<Linha[] | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const [m, r] = await Promise.all([
        supabase.from('v_comparativo_motores_semana').select('*'),
        supabase.from('v_comparativo_resultado_semana').select('*'),
      ]);
      if (m.error) { setErro(m.error.message); return; }
      setMotores((m.data ?? []) as MotorSemana[]);
      setResultado((r.data ?? []) as ResultadoSemana[]);
    })();
  }, []);

  // Os espelhos vêm uma vez e são reagrupados por semana no cliente — são projetos de fora, não se pede
  // de novo a cada troca de semana.
  const [brutos, setBrutos] = useState<Awaited<ReturnType<typeof carregarEspelhos>> | null>(null);
  useEffect(() => { carregarEspelhos().then(setBrutos); }, []);

  useEffect(() => {
    if (!brutos) return;
    const linhas: Linha[] = [];

    const pulso = somarSemana(brutos.pulso.linhas, semana, (r) => ({ pub: r.publicacoes, views: r.views }));
    linhas.push({ motor: 'pulso', frente: 'canais', publicacoes: pulso.pub, dias: pulso.dias,
      engajamento: null, views: pulso.views, viewsMedidas: pulso.views > 0 ? 1 : 0,
      estado: brutos.pulso.estado, detalhe: brutos.pulso.detalhe });

    const lime = somarSemana(brutos.limelight.linhas, semana, (r) => ({ pub: r.publicacoes, views: r.views }));
    linhas.push({ motor: 'limelight', frente: 'mello · TikTok/YouTube', publicacoes: lime.pub, dias: lime.dias,
      engajamento: null, views: lime.views, viewsMedidas: lime.views > 0 ? 1 : 0,
      estado: brutos.limelight.estado, detalhe: brutos.limelight.detalhe });

    const blogs = somarSemana(brutos.blogs.linhas, semana, (r) => ({ pub: 0, views: r.leituras }));
    linhas.push({ motor: 'blogs', frente: 'leituras', publicacoes: 0, dias: blogs.dias,
      engajamento: null, views: blogs.views, viewsMedidas: blogs.views > 0 ? 1 : 0,
      estado: brutos.blogs.estado, detalhe: brutos.blogs.detalhe });

    const pola = somarSemana(brutos.pola.linhas, semana, (r) => ({ pub: r.publicacoes, views: r.views }));
    linhas.push({ motor: 'pola', frente: 'redes', publicacoes: pola.pub, dias: pola.dias,
      engajamento: null, views: pola.views, viewsMedidas: pola.views > 0 ? 1 : 0,
      estado: brutos.pola.estado, detalhe: brutos.pola.detalhe });

    setEspelhos(linhas);
  }, [brutos, semana]);

  const doMkt = motores.filter((m) => m.semana === semana);
  const res = resultado.filter((r) => r.semana === semana);
  const semViewMedida = doMkt.length > 0 && doMkt.every((m) => m.views_medidas === 0);

  const rotulo = (s: string) => {
    const f = new Date(`${s}T12:00:00Z`); f.setUTCDate(f.getUTCDate() + 6);
    const br = (x: string) => x.slice(8, 10) + '/' + x.slice(5, 7);
    return `${br(s)}–${br(f.toISOString().slice(0, 10))}`;
  };

  return (
    <div className="space-y-5">
      <div>
        <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-secondary">Comparativo de motores</div>
        <p className="mt-1 text-[13px] text-muted max-w-3xl">
          Esforço por motor e resultado por marca, na mesma semana. Tabela crua, sem gráfico — o número é o
          argumento. A semana corrente não aparece: meia semana sempre parece queda contra uma semana inteira.
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {semanas.map((s) => (
          <button key={s} onClick={() => setSemana(s)}
            className={`font-mono text-[10px] uppercase tracking-wider px-2.5 py-1 border transition-colors ${
              semana === s ? 'border-secondary bg-secondary/15 text-on-surface'
                           : 'border-outline/20 text-muted hover:text-on-surface hover:border-outline/40'}`}>
            {rotulo(s)}{s === semanas[0] ? ' · última' : ''}
          </button>
        ))}
      </div>

      {erro && (
        <div className="flex items-start gap-2 border border-danger/30 bg-danger/5 p-3 text-[13px] text-danger">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>Não foi possível ler o comparativo: {erro}</span>
        </div>
      )}

      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Esforço · o que cada motor publicou
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-muted">
                <th className="text-left px-3 py-2">Motor</th>
                <th className="text-left px-3 py-2">Marca ou canal</th>
                <th className="text-right px-3 py-2">Publicações</th>
                <th className="text-right px-3 py-2">Dias com publicação</th>
                <th className="text-right px-3 py-2">Views</th>
                <th className="text-right px-3 py-2">Views/post</th>
                <th className="text-right px-3 py-2">Engajamento</th>
              </tr>
            </thead>
            <tbody>
              {doMkt.map((m) => (
                <tr key={`mkt-${m.marca}`} className="border-t border-outline/10">
                  <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-secondary">MKT</td>
                  <td className="px-3 py-2 text-on-surface">{m.marca_nome ?? m.marca}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.publicacoes}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.dias_com_publicacao}</td>
                  <td className="px-3 py-2 text-right">
                    {m.views_medidas === 0
                      ? <span className="text-muted font-mono text-[10px] uppercase">ainda não</span>
                      : <span className="text-on-surface">{m.views}</span>}
                  </td>
                  <td className="px-3 py-2 text-right">
                    {m.views_medidas === 0 || !m.views
                      ? <span className="text-muted">—</span>
                      : <span className="text-on-surface">{(m.views / m.publicacoes).toFixed(1)}</span>}
                  </td>
                  <td className="px-3 py-2 text-right text-on-surface">{m.engajamento}</td>
                </tr>
              ))}

              {espelhos?.map((l) => (
                <tr key={`${l.motor}-${l.frente}`} className="border-t border-outline/10">
                  <td className="px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-secondary">
                    {MOTOR_ROTULO[l.motor] ?? l.motor}
                  </td>
                  <td className="px-3 py-2 text-on-surface">{l.frente}</td>
                  {l.estado !== 'ok' ? (
                    <td colSpan={5} className="px-3 py-2">
                      <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-warning">
                        <KeyRound className="w-3 h-3" />
                        {l.estado === 'sem_credencial' ? 'falta credencial' : 'não li o espelho'}
                        {l.detalhe ? <span className="text-muted normal-case tracking-normal">· {l.detalhe}</span> : null}
                      </span>
                    </td>
                  ) : (
                    <>
                      <td className="px-3 py-2 text-right text-on-surface">{l.publicacoes || '—'}</td>
                      <td className="px-3 py-2 text-right text-on-surface">{l.dias || '—'}</td>
                      <td className="px-3 py-2 text-right text-on-surface">{l.views || '—'}</td>
                      <td className="px-3 py-2 text-right text-on-surface">
                        {l.publicacoes && l.views ? (l.views / l.publicacoes).toFixed(1) : '—'}
                      </td>
                      <td className="px-3 py-2 text-right text-muted">—</td>
                    </>
                  )}
                </tr>
              ))}

              {!espelhos && (
                <tr className="border-t border-outline/10">
                  <td colSpan={7} className="px-3 py-3 text-muted">
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider">
                      <Loader2 className="w-3 h-3 animate-spin" /> lendo os espelhos dos outros projetos
                    </span>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border border-outline/15 bg-surface-container">
        <div className="px-3 py-2 border-b border-outline/15 font-mono text-[10px] uppercase tracking-[0.18em] text-muted">
          Resultado · por marca, não por motor
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead>
              <tr className="font-mono text-[9px] uppercase tracking-wider text-muted">
                <th className="text-left px-3 py-2">Marca</th>
                <th className="text-right px-3 py-2">Visitas</th>
                <th className="text-right px-3 py-2">Cliques</th>
                <th className="text-right px-3 py-2">Vendas</th>
              </tr>
            </thead>
            <tbody>
              {res.length === 0 ? (
                <tr className="border-t border-outline/10">
                  <td colSpan={4} className="px-3 py-3 text-muted text-[13px]">
                    Nenhum evento de site nesta semana. Vazio aqui é vazio medido: o funil lê
                    <code className="mx-1 text-[11px]">analytics</code>, já sem robô, teste, preview e rajada de clique.
                  </td>
                </tr>
              ) : res.map((r) => (
                <tr key={r.marca} className="border-t border-outline/10">
                  <td className="px-3 py-2 text-on-surface">{r.marca}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{r.visitas}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{r.cliques}</td>
                  <td className="px-3 py-2 text-right text-on-surface">{r.vendas}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="px-3 py-2 border-t border-outline/15 text-[12px] text-muted">
          A <strong className="text-on-surface font-normal">lancaster</strong> publica e não tem site medido —
          aparece no esforço e não aqui. É declaração, não falta de dado.
        </div>
      </div>

      {semViewMedida && (
        <div className="flex items-start gap-2 border border-outline/20 bg-surface-container p-3 text-[12px] text-muted">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0 text-warning" />
          <span>
            A coluna <strong className="text-on-surface font-normal">Views</strong> do MKT diz “ainda não” porque a
            foto de 7 dias do post (<code className="text-[11px]">views_d7</code>) começou a ser coletada em 09/10 —
            o primeiro número real aparece por volta de 16/10. Não é zero: é não medido. O engajamento ao lado está
            medido e vale, com a ressalva do próprio MKT de que mistura posts de idades diferentes.
          </span>
        </div>
      )}
    </div>
  );
}

async function carregarEspelhos() {
  const [pulso, limelight, blogs, pola] = await Promise.all([
    espelhoMotoresEstado.pulsoDias(),
    espelhoMotoresEstado.limelightPubDias(),
    espelhoMotoresEstado.blogsDias(),
    espelhoMotoresEstado.polaDias(),
  ]);
  return { pulso, limelight, blogs, pola };
}
