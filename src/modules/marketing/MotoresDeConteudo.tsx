import { useEffect, useState } from 'react';
import { Radio } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { type Recorte } from '../../lib/recorte';
import { lerTudo } from '../../lib/paginar';
import { ultimaLeituraPorPeca, somarCampo, type LeituraDeDia } from '../../lib/leituraPorPeca';
import {
  espelhoMotoresEstado,
  type PulsoDia, type PulsoLongoDia, type PulsoLeituraDia, type LimePubDia, type EstadoEspelho,
  type EspelhoLimelight, type EspelhoPulso,
} from '../../lib/espelhoMotores';
import { rotuloJanela, type Periodo } from './Central';

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
  recorte: Recorte;
  limelight: EspelhoLimelight | null;
  pulso: EspelhoPulso | null;
  espMkt: { ideias: number; roteiros: number; assets: number; publicacoes: number; fila_aberta: number; custo_ia_usd_mes: number | null } | null;
  hoje: string;
  brl: (v: number | null | undefined) => string;
  pulsoUltimaPubDias: number | null;
  mktUltimaPub: string;
};

const n = (v: number) => v.toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const mil = (v: number) => (v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v));
const diaBRT = (d: Date) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

// ───────────────────────────────────────────────────────────────────────────────────────────────
// O CARTÃO DA ABA MARCAS, aplicado aqui. Ordem do dono em 19/11: "a aba marcas e publicações está bem
// organizada, temos que melhorar motor e levar o padrão das outras 2 com os cards".
//
// É o mesmo desenho, peça por peça: cantoneira na cor, sigla, nome em serifa, motivo por extenso
// embaixo, selo de estado no canto, faixa de quatro números com moldura, linhas curtas e o pé.
//
// O QUE ISSO CONSERTOU, e não era só visual: cada motor despejava três a quatro parágrafos de
// ressalva no meio dos números, e o do Pulso trazia um bloco financeiro inteiro. A ressalva não sumiu
// — foi para o pé do cartão, uma linha, onde se lê depois do número e não por cima dele.

function Caixas({ itens }: { itens: Array<{ v: string; label: string }> }) {
  return (
    <div className="mt-4 grid grid-cols-4 divide-x divide-outline/10 border border-outline/10 bg-surface-lowest">
      {itens.map((k) => (
        <div key={k.label} className="py-2 text-center">
          <div className="font-serif text-base font-semibold tabular-nums text-on-surface">{k.v}</div>
          <div className="font-mono text-[8px] uppercase tracking-widest text-muted leading-tight">{k.label}</div>
        </div>
      ))}
    </div>
  );
}

function Linha({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 font-mono text-[10px] text-on-surface-variant leading-snug">
      <span className="text-muted shrink-0 w-[72px]">{k}</span>
      <span className="min-w-0">{children}</span>
    </div>
  );
}

// O selo diz o ESTADO do motor, não o volume: é o que o dono lê primeiro no cartão de marca.
const TONS = {
  ok: 'text-success border-success/40 bg-success/10',
  atencao: 'text-warning border-warning/40 bg-warning/10',
  neutro: 'text-muted border-outline/20',
} as const;

function Cartao({ cor, sigla, titulo, sub, selo, tom = 'neutro', children }: {
  cor: string; sigla: string; titulo: string; sub: string;
  selo: string; tom?: keyof typeof TONS; children: React.ReactNode;
}) {
  return (
    <div className="relative bg-surface-container p-5 pt-6">
      <span className="absolute -top-px -left-px w-3 h-3 border-t-2 border-l-2" style={{ borderColor: cor }} />
      <span className="absolute -top-px -right-px w-3 h-3 border-t-2 border-r-2 border-outline/40" />
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 flex items-center justify-center shrink-0 font-mono font-bold text-sm"
             style={{ background: `color-mix(in srgb, ${cor} 18%, transparent)`, color: cor }}>
          {sigla}
        </div>
        <div className="flex-1 min-w-0">
          <div className="font-serif text-lg font-semibold text-on-surface leading-tight truncate">{titulo}</div>
          <div className="text-[11px] text-muted leading-snug mt-0.5">{sub}</div>
        </div>
        <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border shrink-0 ${TONS[tom]}`}>{selo}</span>
      </div>
      {children}
    </div>
  );
}

function Pe({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-3 pt-2 border-t border-outline/10 font-mono text-[9.5px] text-muted leading-relaxed">
      {children}
    </div>
  );
}

// A JANELA DOS MOTORES PASSOU A SER A DA BARRA (25/11/2026). Antes vinha reduzida a 7, 30 ou tudo.
// Marca e rede NÃO entram aqui: os espelhos diários do Pulso e do Limelight somam o motor inteiro
// por dia e plataforma — não sabem de que marca é cada linha. Por isso este bloco mostra o motor,
// e quem quiser marca olha o bloco de marca × rede.
export default function MotoresDeConteudo({ recorte, limelight, pulso, espMkt, hoje, brl, pulsoUltimaPubDias, mktUltimaPub, recarga = 0 }: Props & { recarga?: number }) {
  const dias = recorte.dias;   // vem pronto do recorte desde 26/11: a fórmula local dava 29 ou 30 para a mesma janela, conforme a hora
  const rotuloPeriodo = recorte.de == null ? 'desde o início' : recorte.rotulo;

  const [pecasLousa, setPecas] = useState<Array<{ origem: string }> | null>(null);
  const [viewsMkt, setViewsMkt] = useState<number | null>(null);
  const [cortes, setCortes] = useState<{ pecas: number; episodios: number; custo: number | null } | null>(null);
  const [pulsoDias, setPulsoDias] = useState<{ linhas: PulsoDia[]; estado: EstadoEspelho } | null>(null);
  const [pulsoLeituras, setPulsoLeituras] = useState<{ linhas: PulsoLeituraDia[]; estado: EstadoEspelho } | null>(null);
  const [longos, setLongos] = useState<{ linhas: PulsoLongoDia[]; estado: EstadoEspelho } | null>(null);
  const [limeDias, setLimeDias] = useState<{ linhas: LimePubDia[]; estado: EstadoEspelho } | null>(null);

  useEffect(() => {
    const corte = dias ? diaBRT(new Date(Date.now() - dias * 86400000)) : '0000-01-01';
    // Peças do período, da MESMA fonte para todos: a Lousa. Antes o MKT vinha da analytics por dia de
    // MEDIÇÃO e dava 222 contra as 150 da cadeia, na mesma página.
    lerTudo<{ origem: string }>((de, ate) => supabase.from('v_lousa').select('origem')
      .eq('estado', 'publicado').gte('quando', `${corte}T00:00:00-03:00`)
      .order('quando').order('origem').order('origem_ref').range(de, ate))
      .then((l) => setPecas(l as never));
    // Views do MKT: ÚLTIMA leitura de cada peça, não a soma das leituras diárias — `leitura_dia`
    // guarda acumulado (19/11/2026: somar tudo dava 48.204 contra 45.885 reais). Em páginas de mil,
    // porque a API corta qualquer resposta aí e devolve isso como sucesso.
    lerTudo<LeituraDeDia>((de, ate) => supabase.from('v_mkt_analytics_peca_dia')
      .select('origem, conta, rede, peca_ref, data, views').gte('data', corte)
      .order('data').order('origem').order('conta').order('rede').order('peca_ref').range(de, ate))
      .then((l) => setViewsMkt(somarCampo(ultimaLeituraPorPeca(l), 'views')));
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
    // O GANHO DO PULSO, que é a única coluna deste cartão que responde "quanto entrou no período"
    // (27/11/2026). `pulsoDias` e `pulsoLongosDias` somam o acumulado ATUAL das peças publicadas no
    // dia: isso é "por publicação", e estava rotulado "views período". Ver Harness/regua-dos-numeros.md.
    espelhoMotoresEstado.pulsoLeiturasDias().then(setPulsoLeituras);
    espelhoMotoresEstado.pulsoLongosDias().then(setLongos);
    espelhoMotoresEstado.limelightPubDias().then(setLimeDias);
  }, [dias, recarga]);

  const corte = dias ? diaBRT(new Date(Date.now() - dias * 86400000)) : '0000-01-01';
  const janela = <T extends { dia: string }>(l: T[] | undefined) => (l ?? []).filter((x) => x.dia >= corte);
  // `T extends object`, e não `Record<string, unknown>`: uma INTERFACE do TypeScript não ganha
  // índice de string implícito, então `LimePubDia` e `PulsoDia` não casavam com o Record e o
  // typecheck ficava vermelho (oito erros, de antes de hoje). A conversão fica dentro do helper.
  const somar = <T extends object>(l: T[], c: string) =>
    l.reduce((a, x) => a + Number((x as Record<string, unknown>)[c] ?? 0), 0);
  const daLousa = (origem: string) => (pecasLousa ?? []).filter((p) => p.origem === origem).length;

  const limeJanela = janela(limeDias?.linhas);
  const pulsoJanela = [...janela(pulsoDias?.linhas), ...janela(longos?.linhas)];
  const pulsoGanho = pulsoLeituras?.estado === 'ok' ? somar(janela(pulsoLeituras.linhas), 'views') : null;

  return (
    <div className="border border-outline/15 bg-surface-container">
      <div className="px-4 py-2.5 border-b border-outline/10 flex items-center gap-2 flex-wrap">
        <Radio className="w-3.5 h-3.5 text-secondary" />
        {/* deixou de ser "outros": são todos */}
        <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">Motores de conteúdo</span>
        <span className="font-mono text-[10px] text-muted">peças: {rotuloPeriodo} · views: acervo, salvo onde diz GANHAS · custo: total</span>
        <span className="ml-auto font-mono text-[10px] text-muted">fonte: Lousa, cortes e espelhos dos motores</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-px bg-outline/10">
        {/* ------------------------------------------------------------------ DIGIAI MKT */}
        <Cartao cor="var(--color-secondary)" sigla="MK" titulo="DIGIAI MKT" sub="publica a casa"
                selo={espMkt ? `publicou ${mktUltimaPub}` : 'sem espelho'} tom={espMkt ? 'ok' : 'neutro'}>
          {espMkt ? (
            <>
              <Caixas itens={[
                { v: pecasLousa ? n(daLousa('mkt')) : '—', label: `peças ${rotuloPeriodo}` },
                { v: viewsMkt != null ? mil(viewsMkt) : '—', label: 'views acervo' },
                { v: n(espMkt.publicacoes), label: 'no ar' },
                { v: n(espMkt.fila_aberta), label: 'fila' },
              ]} />
              <div className="mt-3 space-y-1.5">
                <Linha k="pipeline">{n(espMkt.ideias)} ideias · {n(espMkt.roteiros)} roteiros · {n(espMkt.assets)} artes</Linha>
                {/* custo zero e custo sem acesso não são a mesma coisa */}
                <Linha k="custo IA mês">
                  {espMkt.custo_ia_usd_mes != null
                    ? `US$ ${espMkt.custo_ia_usd_mes.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}`
                    : <span className="text-muted">só para admin do MKT — não é custo zero</span>}
                </Linha>
              </div>
              <Pe>fila é fila ABERTA, não atraso: inclui o que já está agendado para as próximas semanas. As views são <strong>acervo</strong>, não ganho do período: o Instagram e o Facebook são lidos uma vez e não são relidos, então não há segunda leitura para tirar a diferença (medido em 27/11: 1,2 leitura por peça).</Pe>
            </>
          ) : <div className="text-sm text-muted italic mt-4">Espelho indisponível.</div>}
        </Cartao>

        {/* ------------------------------------------------------------------ DIGIAI Cortes */}
        <Cartao cor="var(--color-warning)" sigla="CO" titulo="DIGIAI Cortes" sub="fábrica de cortes"
                selo={cortes?.custo == null ? 'sem custo medido' : 'custo medido'}
                tom={cortes?.custo == null ? 'atencao' : 'ok'}>
          {cortes ? (
            <>
              <Caixas itens={[
                { v: n(cortes.episodios), label: 'episódios' },
                { v: n(cortes.pecas), label: 'peças' },
                { v: '—', label: 'views' },
                { v: cortes.custo != null ? brl(cortes.custo) : '—', label: 'custo' },
              ]} />
              <div className="mt-3 space-y-1.5">
                <Linha k="views">saem no motor que publicou (MKT) — contar aqui também seria contar duas vezes</Linha>
                <Linha k="custo">
                  {cortes.custo == null
                    ? <><span className="text-warning">sem custo em reais medido</span> — a coluna existe desde 18/11 e espera o número do motor</>
                    : <>medido: {brl(cortes.custo)}</>}
                </Linha>
              </div>
              <Pe>traço nesta faixa quer dizer "não medido"; zero medido aparece como 0 — <strong>não é custo zero</strong></Pe>
            </>
          ) : <div className="text-sm text-muted italic mt-4">Espelho indisponível.</div>}
        </Cartao>

        {/* ------------------------------------------------------------------ Limelight */}
        {/* A view de publicações agrupa pelo dia em que a PEÇA saiu, não pelo da medição: motor que não
            publicou no período aparece com zero mesmo ganhando audiência. Já me levou a acusar esta
            coleta de parada quando ela rodava todo dia — por isso o selo fala de publicação, e a coleta
            aparece na linha de baixo. */}
        <Cartao cor="var(--color-eco-app)" sigla="LI" titulo="Limelight Studio" sub='série da Mello · "Transforme Sua Visão"'
                selo={limeDias && somar(limeJanela, 'publicacoes') === 0 ? `não publicou em ${rotuloPeriodo}` : `publicando · ${rotuloPeriodo}`}
                tom={limeDias && somar(limeJanela, 'publicacoes') === 0 ? 'atencao' : 'ok'}>
          {limelight ? (
            <>
              <Caixas itens={[
                { v: n(limelight.episodios), label: 'episódios' },
                { v: limeDias ? n(somar(limeJanela, 'publicacoes')) : '—', label: `peças ${rotuloPeriodo}` },
                { v: mil(limelight.views_total ?? 0), label: 'views acervo' },
                { v: n(limelight.fila), label: 'na fila' },
              ]} />
              <div className="mt-3 space-y-1.5">
                <Linha k="views">
                  {limelight.views_por_plataforma
                    ? Object.entries(limelight.views_por_plataforma).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${mil(v)}`).join(' · ')
                    : '—'}
                  {' · '}custo IA US$ {limelight.custo_ia_usd} (total)
                </Linha>
                <Linha k="seguidores">
                  {Object.entries(limelight.seguidores).filter(([, v]) => v > 0).map(([k, v]) => `${k} ${v}`).join(' · ') || '—'}
                  {' · '}coleta {limelight.ultima_coleta === hoje ? <span className="text-success">hoje ✓</span> : limelight.ultima_coleta ?? '—'}
                </Linha>
              </div>
              <Pe>
                {limeDias && somar(limeJanela, 'publicacoes') === 0
                  ? 'as views acima são do acervo, não da semana — motor que não publicou aparece com zero mesmo ganhando audiência'
                  : 'views do acervo inteiro; as peças do período estão na segunda caixa'}
              </Pe>
            </>
          ) : <div className="text-sm text-muted italic mt-4">Espelho indisponível.</div>}
        </Cartao>

        {/* ------------------------------------------------------------------ Pulso */}
        <Cartao cor="var(--color-eco-pulso)" sigla="PU" titulo="Pulso Control"
                sub={`canais faceless · ${pulso?.canais ?? '—'} canais`}
                selo={pulsoUltimaPubDias != null && pulsoUltimaPubDias <= 2 ? 'esteira viva' : 'esteira parada'}
                tom={pulsoUltimaPubDias != null && pulsoUltimaPubDias <= 2 ? 'ok' : 'atencao'}>
          {pulso ? (
            <>
              <Caixas itens={[
                { v: pulsoDias ? n(somar(pulsoJanela, 'publicacoes')) : '—', label: `peças ${rotuloPeriodo}` },
                { v: pulsoGanho != null ? mil(pulsoGanho) : '—', label: `views GANHAS ${rotuloPeriodo}` },
                { v: n(pulso.publicacoes), label: 'no ar (total)' },
                { v: mil(pulso.views_total), label: 'views acervo' },
              ]} />

              {/* Financeiro do Pulso, na mesma moldura dos números de cima — era um bloco solto com
                  três colunas de texto. Caixa e consumo continuam SEPARADOS e nunca somados: o topup é
                  dinheiro saindo, o consumo é uso do crédito já comprado. Somar infla o burn ~3,8×. */}
              {pulso.custo_caixa_total_brl != null && (
                <div className="mt-2 grid grid-cols-3 divide-x divide-outline/10 border border-outline/10 bg-surface-lowest">
                  <div className="py-2 text-center">
                    <div className="font-serif text-base font-semibold tabular-nums text-on-surface">{brl(pulso.custo_caixa_total_brl)}</div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-muted leading-tight">caixa · dinheiro que saiu</div>
                  </div>
                  <div className="py-2 text-center">
                    <div className="font-serif text-base font-semibold tabular-nums text-on-surface-variant">{brl(pulso.custo_consumo_total_brl)}</div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-muted leading-tight">crédito consumido · gerencial</div>
                  </div>
                  <div className="py-2 text-center">
                    <div className="font-serif text-base font-semibold tabular-nums text-on-surface">{brl(pulso.custo_caixa_por_video_brl)}</div>
                    <div className="font-mono text-[8px] uppercase tracking-widest text-muted leading-tight">por vídeo · caixa ÷ peças</div>
                  </div>
                </div>
              )}

              <div className="mt-3 space-y-1.5">
                <Linha k="views">
                  {Object.entries(pulso.views_por_plataforma).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${mil(v)}`).join(' · ')}
                </Linha>
                <Linha k="última peça">
                  {pulsoUltimaPubDias != null && pulsoUltimaPubDias <= 2
                    ? <span className="text-success">{pulsoUltimaPubDias === 0 ? 'hoje ✓' : `há ${pulsoUltimaPubDias}d`}</span>
                    : <span className="text-warning">{pulso.ultima_publicacao ?? '—'}</span>}
                  {' · '}coleta diária 11h
                </Linha>
                {pulso.custo_caixa_total_brl != null && (
                  <Linha k="receita">
                    {brl(pulso.receita_total_brl)} · recebido {brl(pulso.receita_recebida_brl)}
                    {(pulso.receita_total_brl ?? 0) === 0 && <span className="text-warning"> — nenhum gate de monetização aberto</span>}
                  </Linha>
                )}
              </div>
              <Pe>caixa e crédito consumido <strong>não se somam</strong>: o crédito é uso do topup já pago, e somar inflaria o burn ~3,8×</Pe>
            </>
          ) : <div className="text-sm text-muted italic mt-4">Espelho indisponível.</div>}
        </Cartao>
      </div>

      <div className="px-4 py-2 border-t border-outline/10 font-mono text-[9px] text-muted leading-relaxed">
        "views" ainda não quer dizer o mesmo nos quatro, e a caixa diz qual é. <strong>GANHAS</strong> é o que entrou na janela (leitura do dia menos a anterior) — só o Pulso entrega isso, desde 27/11. <strong>acervo</strong> é o total de vida das peças, que não pertence a período nenhum: o MKT fica aí porque o Meta não é relido, e o Limelight porque o espelho dele só responde por publicação. Pedido aberto com os dois. Régua: Cockpit/Harness/regua-dos-numeros.md.<br />
        custo por mil views não aparece porque o custo é total e as views são do período: dividir um pelo outro daria eficiência inventada.
      </div>
    </div>
  );
}
