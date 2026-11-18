import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import {
  espelhoMotoresEstado,
  type PulsoDia, type PulsoLongoDia, type LimePubDia, type EstadoEspelho,
  type EspelhoLimelight, type EspelhoPulso,
} from '../../lib/espelhoMotores';
import type { Periodo } from './Central';

// Motores de conteúdo — os QUATRO, no cartão que esta seção já usava para o Limelight e o Pulso.
//
// Ordem do dono em 18/11, 16h33: "criamos uma sessão sem precisar, já tínhamos o outros motores de
// conteúdo, colocar tudo juntos com todas as informações". Ele tinha razão: eu criei uma tabela nova
// ao lado de uma seção que já fazia isso, e a aba passou a ter duas listas de motores. A tabela saiu;
// o que ela mostrava entrou no cartão de cada motor, e o título deixou de dizer "outros" — porque
// agora não há outros: são todos.
//
// NENHUM NÚMERO NOVO. O que a tabela trazia (peças e views do período, custo como total, e o que não
// tem dado dito por extenso) ficou, junto do que o cartão já tinha.
//
// O QUE CADA CÉLULA VAZIA DIZ, porque na mesma régua um branco vira zero na cabeça de quem lê:
//   · "sem custo medido" não é custo zero — o Cortes ainda não manda o número;
//   · "sai pelo MKT" não é zero views — o Cortes entrega e quem publica é o MKT; contar aqui também
//     seria contar duas vezes;
//   · "só para admin do MKT" é falta de acesso.

type Props = {
  periodo: Periodo;
  limelight: EspelhoLimelight | null;
  pulso: EspelhoPulso | null;
  espMkt: { ideias: number; roteiros: number; assets: number; publicacoes: number; fila_aberta: number; custo_ia_usd_mes: number | null } | null;
  hoje: string;
  brl: (v: number | null | undefined) => string;
  pulsoUltimaPubDias: number | null;
};

const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const mil = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));
const diaBRT = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

function Caixas({ itens }: { itens: Array<{ v: string; label: string }> }) {
  return (
    <div className="grid grid-cols-4 gap-2 text-center">
      {itens.map((k) => (
        <div key={k.label}>
          <div className="text-lg font-bold tabular-nums text-on-surface">{k.v}</div>
          <div className="text-[10px] font-mono uppercase text-muted">{k.label}</div>
        </div>
      ))}
    </div>
  );
}

function Cartao({ cor, titulo, direita, children }: { cor: string; titulo: string; direita: string; children: React.ReactNode }) {
  return (
    <div className="bg-surface-container p-4 space-y-2">
      <div className="flex items-center gap-2">
        <span className="w-2.5 h-2.5 shrink-0" style={{ background: cor }} />
        <span className="text-sm font-semibold text-on-surface">{titulo}</span>
        <span className="ml-auto font-mono text-[10px] text-muted">{direita}</span>
      </div>
      {children}
    </div>
  );
}

export default function MotoresDeConteudo({ periodo, limelight, pulso, espMkt, hoje, brl, pulsoUltimaPubDias }: Props) {
  const dias = periodo === 'tudo' ? null : Number(periodo);
  const rotuloPeriodo = periodo === 'tudo' ? 'desde o início' : `${periodo} dias`;

  const [pecasLousa, setPecas] = useState<Array<{ origem: string }> | null>(null);
  const [viewsMkt, setViewsMkt] = useState<number | null>(null);
  const [cortes, setCortes] = useState<{ pecas: number; episodios: number; custo: number | null } | null>(null);
  const [pulsoDias, setPulsoDias] = useState<{ linhas: PulsoDia[]; estado: EstadoEspelho } | null>(null);
  const [longos, setLongos] = useState<{ linhas: PulsoLongoDia[]; estado: EstadoEspelho } | null>(null);
  const [limeDias, setLimeDias] = useState<{ linhas: LimePubDia[]; estado: EstadoEspelho } | null>(null);

  useEffect(() => {
    const corte = dias ? diaBRT(new Date(Date.now() - dias * 86400000)) : '0000-01-01';
    // Peças do período, da MESMA fonte para todos: a Lousa. Antes o MKT vinha da analytics por dia de
    // MEDIÇÃO e dava 222 contra as 150 da cadeia, na mesma página.
    supabase.from('v_lousa').select('origem').eq('estado', 'publicado')
      .gte('quando', `${corte}T00:00:00-03:00`).limit(5000)
      .then(({ data }) => setPecas((data ?? []) as never));
    supabase.from('v_mkt_analytics_peca_dia').select('views').gte('data', corte).limit(5000)
      .then(({ data }) => setViewsMkt((data ?? []).reduce((a: number, x: { views: number | null }) => a + Number(x.views ?? 0), 0)));
    supabase.from('v_cortes_pecas').select('id').then(({ data: pecas }) => {
      supabase.from('v_cortes_episodios').select('custo_brl').then(({ data: eps }) => {
        const medidos = (eps ?? []).filter((e: { custo_brl: number | null }) => e.custo_brl != null);
        setCortes({
          pecas: (pecas ?? []).length,
          episodios: (eps ?? []).length,
          custo: medidos.length ? medidos.reduce((a: number, e: { custo_brl: number | null }) => a + Number(e.custo_brl), 0) : null,
        });
      });
    });
    espelhoMotoresEstado.pulsoDias().then(setPulsoDias);
    espelhoMotoresEstado.pulsoLongosDias().then(setLongos);
    espelhoMotoresEstado.limelightPubDias().then(setLimeDias);
  }, [periodo]);

  const corte = dias ? diaBRT(new Date(Date.now() - dias * 86400000)) : '0000-01-01';
  const janela = <T extends { dia: string }>(l: T[] | undefined) => (l ?? []).filter((x) => x.dia >= corte);
  const somar = <T extends Record<string, unknown>>(l: T[], c: string) =>
    l.reduce((a, x) => a + Number((x[c] as number) ?? 0), 0);
  const daLousa = (origem: string) => (pecasLousa ?? []).filter((p) => p.origem === origem).length;

  const limeJanela = janela(limeDias?.linhas);
  const pulsoJanela = [...janela(pulsoDias?.linhas), ...janela(longos?.linhas)];

  return (
    <div className="border border-outline/15 bg-surface-container">
      <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2 flex-wrap">
        <Radio className="w-3.5 h-3.5 text-secondary" />
        {/* deixou de ser "outros": são todos */}
        <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Motores de conteúdo</span>
        <span className="font-mono text-[10px] text-muted">peças e views: {rotuloPeriodo} · custo: total</span>
        <span className="ml-auto font-mono text-[10px] text-muted">fonte: Lousa, cortes e espelhos dos motores</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline/10">
        {/* ------------------------------------------------------------------ DIGIAI MKT */}
        <Cartao cor="var(--color-secondary)" titulo="DIGIAI MKT · publica a casa" direita={espMkt ? `fila ${espMkt.fila_aberta}` : '—'}>
          {espMkt ? (
            <>
              <Caixas itens={[
                { v: pecasLousa ? n(daLousa('mkt')) : '—', label: `peças ${rotuloPeriodo}` },
                { v: viewsMkt != null ? mil(viewsMkt) : '—', label: 'views' },
                { v: n(espMkt.assets), label: 'artes' },
                { v: n(espMkt.ideias), label: 'ideias' },
              ]} />
              <div className="text-[11px] text-muted">
                Pipeline: {n(espMkt.ideias)} ideias · {n(espMkt.roteiros)} roteiros · {n(espMkt.assets)} artes · {n(espMkt.publicacoes)} no ar
              </div>
              <div className="text-[11px] text-muted">
                {/* custo zero e custo sem acesso não são a mesma coisa */}
                Custo de IA no mês: {espMkt.custo_ia_usd_mes != null
                  ? `US$ ${espMkt.custo_ia_usd_mes.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
                  : <span className="text-muted">só para admin do MKT — não é custo zero</span>}
              </div>
            </>
          ) : <div className="text-sm text-muted italic">Espelho indisponível.</div>}
        </Cartao>

        {/* ------------------------------------------------------------------ DIGIAI Cortes */}
        <Cartao cor="var(--color-eco-cortes, var(--color-warning))" titulo="DIGIAI Cortes · fábrica de cortes" direita={cortes ? `${cortes.episodios} episódio(s)` : '—'}>
          {cortes ? (
            <>
              <Caixas itens={[
                { v: n(cortes.episodios), label: 'episódios' },
                { v: n(cortes.pecas), label: 'peças entregues' },
                { v: '—', label: 'views' },
                { v: cortes.custo != null ? brl(cortes.custo) : '—', label: 'custo' },
              ]} />
              <div className="text-[11px] text-muted">
                As peças dele saem pelo MKT — <strong>as views aparecem no motor que publicou</strong>, e contá-las aqui também seria contar duas vezes.
              </div>
              <div className="text-[11px] text-muted">
                {cortes.custo == null
                  ? <>Custo: <span className="text-warning">sem custo em reais medido</span> — a coluna existe desde 18/11 e espera o número do motor. Não é custo zero.</>
                  : <>Custo medido: {brl(cortes.custo)}</>}
              </div>
            </>
          ) : <div className="text-sm text-muted italic">Espelho indisponível.</div>}
        </Cartao>

        {/* ------------------------------------------------------------------ Limelight */}
        <Cartao cor="var(--color-eco-app)" titulo="Limelight Studio · Mello" direita='série "Transforme Sua Visão"'>
          {limelight ? (
            <>
              <Caixas itens={[
                { v: n(limelight.episodios), label: 'episódios' },
                { v: limeDias ? n(somar(limeJanela, 'publicacoes')) : '—', label: `peças ${rotuloPeriodo}` },
                { v: mil(limelight.views_total ?? 0), label: 'views (total)' },
                { v: n(limelight.fila), label: 'na fila' },
              ]} />
              <div className="text-[11px] text-muted">
                Views: {limelight.views_por_plataforma
                  ? Object.entries(limelight.views_por_plataforma).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${mil(v)}`).join(' · ')
                  : '—'}
                {' · '}custo IA US$ {limelight.custo_ia_usd} <span className="text-muted">(total)</span>
              </div>
              <div className="text-[11px] text-muted">
                Seguidores: {Object.entries(limelight.seguidores).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
                {' · '}coleta {limelight.ultima_coleta === hoje ? <span className="text-success">hoje ✓</span> : limelight.ultima_coleta ?? '—'}
              </div>
              {/* A view de publicações agrupa pelo dia em que a PEÇA saiu, não pelo da medição: motor
                  que não publicou no período aparece com zero mesmo ganhando audiência. Já me levou a
                  acusar esta coleta de parada quando ela rodava todo dia. */}
              {limeDias && somar(limeJanela, 'publicacoes') === 0 && (
                <div className="text-[11px] text-warning">
                  Não publicou no período — as views acima são do acervo, não da semana.
                </div>
              )}
            </>
          ) : <div className="text-sm text-muted italic">Espelho indisponível.</div>}
        </Cartao>

        {/* ------------------------------------------------------------------ Pulso */}
        <Cartao cor="var(--color-eco-pulso)" titulo="Pulso Control · canais faceless" direita={`${pulso?.canais ?? '—'} canais`}>
          {pulso ? (
            <>
              <Caixas itens={[
                { v: pulsoDias ? n(somar(pulsoJanela, 'publicacoes')) : '—', label: `peças ${rotuloPeriodo}` },
                { v: pulsoDias ? mil(somar(pulsoJanela, 'views')) : '—', label: 'views' },
                { v: n((pulso.pipeline['PRONTO_PUBLICACAO'] ?? 0) + (pulso.pipeline['EM_EDICAO'] ?? 0) + (pulso.pipeline['ROTEIRO_PRONTO'] ?? 0)), label: 'no pipeline' },
                { v: n(pulso.ideias), label: 'ideias' },
              ]} />
              <div className="text-[11px] text-muted">
                Total: {n(pulso.publicacoes)} publicações · {mil(pulso.views_total)} views ·{' '}
                {Object.entries(pulso.views_por_plataforma).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${mil(v)}`).join(' · ')}
              </div>
              <div className="text-[11px] text-muted">
                {pulsoUltimaPubDias != null && pulsoUltimaPubDias <= 2
                  ? <span className="text-success">esteira automática viva — última publicação {pulsoUltimaPubDias === 0 ? 'hoje ✓' : `há ${pulsoUltimaPubDias}d`}</span>
                  : <span className="text-warning">última publicação {pulso.ultima_publicacao ?? '—'}</span>}
                {' · '}coleta diária 11h (Vercel Crons)
              </div>

              {/* Financeiro do Pulso. Caixa e consumo aparecem SEPARADOS e nunca somados: o topup é
                  dinheiro saindo, o consumo é uso do crédito já comprado. Somar infla o burn ~3,8×. */}
              {pulso.custo_caixa_total_brl != null && (
                <div className="border-t border-outline pt-2 mt-1 space-y-1">
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <div className="text-sm font-bold tabular-nums text-on-surface">{brl(pulso.custo_caixa_total_brl)}</div>
                      <div className="text-[10px] font-mono uppercase text-muted leading-tight">custo de caixa<br /><span className="text-[9px]">dinheiro que saiu</span></div>
                    </div>
                    <div>
                      <div className="text-sm font-bold tabular-nums text-on-surface-variant">{brl(pulso.custo_consumo_total_brl)}</div>
                      <div className="text-[10px] font-mono uppercase text-muted leading-tight">crédito consumido<br /><span className="text-[9px]">gerencial, não é despesa</span></div>
                    </div>
                    <div>
                      <div className="text-sm font-bold tabular-nums text-on-surface">{brl(pulso.custo_caixa_por_video_brl)}</div>
                      <div className="text-[10px] font-mono uppercase text-muted leading-tight">por vídeo<br /><span className="text-[9px]">caixa ÷ publicações</span></div>
                    </div>
                  </div>
                  <div className="text-[11px] text-muted">
                    Receita: {brl(pulso.receita_total_brl)} · recebido {brl(pulso.receita_recebida_brl)}
                    {(pulso.receita_total_brl ?? 0) === 0 && <span className="text-warning"> — nenhum gate de monetização aberto ainda</span>}
                  </div>
                  <div className="text-[10px] text-muted leading-snug">
                    Os dois custos <strong>não se somam</strong>: o crédito consumido é uso do topup já pago. Somar inflaria o burn em ~3,8×.
                  </div>
                </div>
              )}
            </>
          ) : <div className="text-sm text-muted italic">Espelho indisponível.</div>}
        </Cartao>
      </div>

      <div className="px-4 py-2 border-t border-outline/10 font-mono text-[9px] text-muted leading-relaxed">
        "views" não quer dizer o mesmo nos quatro: nos espelhos são as views das peças publicadas no período, então motor que não publicou aparece com zero mesmo ganhando audiência — medida comparável pedida ao Limelight e ao Pulso em 18/11.<br />
        custo por mil views não aparece porque o custo é total e as views são do período: dividir um pelo outro daria eficiência inventada.
      </div>
    </div>
  );
}
