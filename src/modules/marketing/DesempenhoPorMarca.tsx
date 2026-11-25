import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { lerTudo } from '../../lib/paginar';
import { aplicar, type Recorte } from '../../lib/recorte';
import { espelhoMotoresEstado, type PulsoContaDia, type EstadoEspelho } from '../../lib/espelhoMotores';

// O QUE CADA MARCA RENDEU NO RECORTE (25/11/2026).
//
// De onde vem: o dono, canal do MKT, 25/11 — mostrou a aba Marca × Rede e disse que "hoje" e "6m"
// mostram o mesmo número grande, só a variação muda. Estava certo, e não era defeito de filtro: a
// aba mede SEGUIDORES, que é um estoque — o censo de hoje é o censo de hoje em qualquer janela.
// Faltava a outra pergunta, que é a dele: **quanto a marca rendeu no período**.
//
// A RÉGUA É A DA BARRA, e muda a fonte, não só o filtro:
//   · por PUBLICAÇÃO → `v_mkt_peca_consolidada` por `dia_publicacao`: o que a casa publicou na
//     janela e quanto isso rendeu até agora;
//   · por LEITURA    → `v_mkt_analytics_peca_dia` por `data`: o que foi MEDIDO na janela, peça
//     antiga incluída.
// São dois números diferentes e as duas contas estão certas — foi o 168k × 41,8k de 20/11, quando as
// duas telas chamavam as duas coisas de "no período".
//
// O ALCANCE NÃO VEM DA PEÇA. Medido em 25/11: `v_mkt_analytics_peca_dia` não tem alcance, e
// `v_mkt_conta_dia` tem — mas por CONTA e por DIA, e só onde a rede entrega: Instagram 720 de 728
// dias, Facebook 672 de 728, **YouTube 0, TikTok 0**. Então o alcance aparece em coluna própria,
// marcado como medida da conta, e fica em branco onde não existe. Somar alcance de conta com views
// de peça numa coluna só seria juntar duas unidades e chamar de desempenho.

type Peca = { marca: string | null; rede: string; views: number | null; curtidas: number | null; comentarios: number | null; compartilhamentos: number | null; peca_ref: string };
/** Quem PRODUZ a peça. Três grupos, um eixo só — ver ORIGENS em MktCrescimento. */
const grupoDaMarca = (marca: string | null) =>
  marca === 'bastidores' || marca === 'bastidores2' ? 'cortes' : 'casa';
type Conta = { marca: string | null; rede: string; alcance: number | null; interacoes: number | null };

const n = (v: number) => v.toLocaleString('pt-BR');

export default function DesempenhoPorMarca({ recorte, recarga = 0 }: { recorte: Recorte; recarga?: number }) {
  const [pecas, setPecas] = useState<Peca[] | null>(null);
  const [contas, setContas] = useState<Conta[] | null>(null);
  const [pulso, setPulso] = useState<{ linhas: PulsoContaDia[]; estado: EstadoEspelho } | null>(null);
  const [erro, setErro] = useState<string | null>(null);

  const porPublicacao = recorte.data === 'publicacao';

  useEffect(() => {
    setPecas(null);
    lerTudo<Peca>((de, ate) => {
      const base = porPublicacao
        ? supabase.from('v_mkt_peca_consolidada')
            .select('marca, rede, views, curtidas, comentarios, compartilhamentos, peca_ref')
            .eq('apagada', false)
        : supabase.from('v_mkt_analytics_peca_dia')
            .select('marca, rede, views, curtidas, comentarios, compartilhamentos, peca_ref');
      const { q } = aplicar(base, recorte, {
        data: porPublicacao ? 'dia_publicacao' : 'data', marca: 'marca', rede: 'rede',
      });
      return q.order('marca', { nullsFirst: false }).order('rede').order('peca_ref').range(de, ate);
    }).then((l) => { setErro(null); setPecas(l); })
      .catch((e) => { setErro(String(e?.message ?? e)); setPecas([]); });
  }, [recorte, recarga, porPublicacao]);

  // O Pulso vive no espelho dele, e `v_espelho_pulso_contas_dias` é a soma exata das outras duas
  // views (curtos + cortes e longos), com rede e tipo. Por isso a coluna do Pulso fecha por rede,
  // e não só no total.
  useEffect(() => { espelhoMotoresEstado.pulsoContasDias().then(setPulso); }, [recarga]);

  useEffect(() => {
    setContas(null);
    lerTudo<Conta>((de, ate) => {
      const base = supabase.from('v_mkt_conta_dia').select('marca, rede, alcance, interacoes');
      const { q } = aplicar(base, recorte, { data: 'data', marca: 'marca', rede: 'rede' });
      return q.order('data').order('marca', { nullsFirst: false }).order('rede').range(de, ate);
    }).then(setContas).catch(() => setContas([]));
  }, [recorte, recarga]);

  // UMA PEÇA, UMA LINHA. Na régua de leitura a mesma peça aparece em vários dias e `leitura_dia`
  // guarda ACUMULADO, não diferença: somar os dias contaria a mesma peça várias vezes. A regra é a
  // mesma do Leituras e do Radar — última leitura de cada peça.
  const unicas = (() => {
    if (!pecas) return [];
    if (porPublicacao) return pecas;                     // a consolidada já traz uma linha por peça
    const m = new Map<string, Peca>();
    for (const p of pecas) m.set(p.peca_ref, p);         // vem ordenado por data: fica a última
    return [...m.values()];
  })();

  const linhas = (() => {
    type Acc = { marca: string; rede: string; pecas: number; views: number; medidas: number; inter: number; comInter: number; alcance: number; comAlcance: number };
    const m = new Map<string, Acc>();
    const chave = (marca: string, rede: string) => `${marca}\u0000${rede}`;
    for (const p of unicas) {
      const k = chave(p.marca ?? '(sem marca)', p.rede);
      const a = m.get(k) ?? { marca: p.marca ?? '(sem marca)', rede: p.rede, pecas: 0, views: 0, medidas: 0, inter: 0, comInter: 0, alcance: 0, comAlcance: 0 };
      a.pecas += 1;
      if (p.views != null) { a.views += p.views; a.medidas += 1; }
      const i = (p.curtidas ?? 0) + (p.comentarios ?? 0) + (p.compartilhamentos ?? 0);
      if (p.curtidas != null || p.comentarios != null || p.compartilhamentos != null) { a.inter += i; a.comInter += 1; }
      m.set(k, a);
    }
    for (const c of contas ?? []) {
      const k = chave(c.marca ?? '(sem marca)', c.rede);
      const a = m.get(k);
      if (!a) continue;                                   // conta sem peça no recorte não inventa linha
      if (c.alcance != null) { a.alcance += c.alcance; a.comAlcance += 1; }
    }
    return [...m.values()].sort((x, y) => y.views - x.views);
  })();

  const total = linhas.reduce((a, l) => ({
    pecas: a.pecas + l.pecas, views: a.views + l.views, inter: a.inter + l.inter, alcance: a.alcance + l.alcance,
  }), { pecas: 0, views: 0, inter: 0, alcance: 0 });

  // CADA LINHA NOS TRÊS GRUPOS (25/11/2026, desenho do dono). A pergunta que isto responde e a
  // tabela de baixo não: "desta rede, quanto é da casa, quanto é dos cortes, quanto é do Pulso".
  // A marca diz o grupo da casa e dos cortes; o Pulso vem do espelho dele, pela mesma janela.
  const deDia = recorte.de ?? '0000-01-01';
  const ateDia = recorte.ate ?? '9999-12-31';
  const porGrupo = (() => {
    const m = new Map<string, { rede: string; casa: number; cortes: number; pulso: number }>();
    const pega = (rede: string) => {
      const a = m.get(rede) ?? { rede, casa: 0, cortes: 0, pulso: 0 };
      m.set(rede, a); return a;
    };
    for (const p of unicas) {
      if (p.views == null) continue;
      const a = pega(p.rede);
      if (grupoDaMarca(p.marca) === 'cortes') a.cortes += p.views; else a.casa += p.views;
    }
    for (const d of pulso?.linhas ?? []) {
      if (d.dia < deDia || d.dia > ateDia) continue;
      if (recorte.rede && d.plataforma !== recorte.rede) continue;
      pega(d.plataforma).pulso += d.views ?? 0;
    }
    // Grupo escolhido na barra: as outras colunas não somem, zeram — e a tabela diz isso em palavra.
    return [...m.values()].sort((x, y) => (y.casa + y.cortes + y.pulso) - (x.casa + x.cortes + x.pulso));
  })();
  const totGrupo = porGrupo.reduce((a, l) => ({ casa: a.casa + l.casa, cortes: a.cortes + l.cortes, pulso: a.pulso + l.pulso }), { casa: 0, cortes: 0, pulso: 0 });
  const pulsoForaDoRecorte = recorte.origem !== '' && recorte.origem !== 'pulso';

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <BarChart3 className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">O que rendeu no recorte</span>
        <span className="font-mono text-[10px] text-muted">
          {recorte.rotulo} · {porPublicacao ? 'por data de PUBLICAÇÃO' : 'por data de LEITURA'}
        </span>
        <span className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted">
          marca × rede · desempenho, não seguidores
        </span>
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>Não consegui ler o desempenho: {erro}.</span>
        </div>
      ) : pecas == null ? (
        <div className="px-4 py-3 text-sm text-muted">Medindo…</div>
      ) : linhas.length === 0 ? (
        <div className="px-4 py-3 text-sm text-on-surface-variant">
          Nenhuma peça {porPublicacao ? 'publicada' : 'lida'} neste recorte.
        </div>
      ) : (
        <>
          {/* CADA REDE ABERTA NOS TRÊS GRUPOS. Vem antes do detalhe por marca porque é a pergunta
              que se faz primeiro: desta rede, quanto é da casa, quanto é dos cortes, quanto é do
              Pulso. Abaixo, a mesma coisa marca a marca. */}
          <table className="w-full text-sm border-b border-outline/15">
            <thead>
              <tr className="border-b border-outline/10 font-mono text-[9px] uppercase tracking-widest text-muted">
                <th className="px-4 py-1.5 text-left font-normal">rede</th>
                <th className="px-4 py-1.5 text-right font-normal text-secondary">casa</th>
                <th className="px-4 py-1.5 text-right font-normal text-secondary">cortes</th>
                <th className="px-4 py-1.5 text-right font-normal text-secondary">Pulso</th>
                <th className="px-4 py-1.5 text-right font-normal text-on-surface">total</th>
              </tr>
            </thead>
            <tbody>
              {porGrupo.map((l) => (
                <tr key={`g-${l.rede}`} className="border-b border-outline/5">
                  <td className="px-4 py-1.5 text-on-surface">{l.rede}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">{l.casa === 0 ? <span className="text-muted">—</span> : n(l.casa)}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">{l.cortes === 0 ? <span className="text-muted">—</span> : n(l.cortes)}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">
                    {pulso == null ? <span className="text-muted">lendo…</span>
                      : pulso.estado !== 'ok' ? <span className="text-muted">espelho não lido</span>
                      : l.pulso === 0 ? <span className="text-muted">—</span> : n(l.pulso)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface font-semibold">{n(l.casa + l.cortes + l.pulso)}</td>
                </tr>
              ))}
              <tr className="border-t border-outline/15 font-semibold">
                <td className="px-4 py-1.5 text-on-surface">views no recorte</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">{n(totGrupo.casa)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">{n(totGrupo.cortes)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">{n(totGrupo.pulso)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">{n(totGrupo.casa + totGrupo.cortes + totGrupo.pulso)}</td>
              </tr>
            </tbody>
          </table>

          <div className="px-4 py-2 border-b border-outline/10 text-xs text-on-surface-variant">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">os três grupos</span>{' '}
            <strong className="text-on-surface">casa</strong> é o que o MKT produz para as marcas da DIGIAI,
            Limelight incluído; <strong className="text-on-surface">cortes</strong> é o motor de cortes, que
            publica só em Bastidores DIGIAI e no canal 2; <strong className="text-on-surface">Pulso</strong> é
            o Pulso, com os cortes dele — quem os produz é ele, medido em 25/11.
            {pulsoForaDoRecorte && <> Com <strong className="text-on-surface">{recorte.origem}</strong> escolhido na barra, a coluna do Pulso fica zerada de propósito: ele não é deste recorte.</>}
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-outline/10 font-mono text-[9px] uppercase tracking-widest text-muted">
                <th className="px-4 py-1.5 text-left font-normal">marca</th>
                <th className="px-4 py-1.5 text-left font-normal">rede</th>
                <th className="px-4 py-1.5 text-right font-normal">peças</th>
                <th className="px-4 py-1.5 text-right font-normal">views</th>
                <th className="px-4 py-1.5 text-right font-normal">interações</th>
                <th className="px-4 py-1.5 text-right font-normal">alcance (conta)</th>
              </tr>
            </thead>
            <tbody>
              {linhas.map((l) => (
                <tr key={`${l.marca}-${l.rede}`} className="border-b border-outline/5 last:border-b-0">
                  <td className="px-4 py-1.5 text-on-surface">{l.marca}</td>
                  <td className="px-4 py-1.5 text-on-surface-variant">{l.rede}</td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">{n(l.pecas)}</td>
                  {/* Zero medido e ausência de medição levam a ações opostas: uma é conteúdo ruim, a
                      outra é coleta que não existe. Nunca se escrevem igual. */}
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">
                    {l.medidas === 0 ? <span className="text-muted">não medido</span> : n(l.views)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">
                    {l.comInter === 0 ? <span className="text-muted">não medido</span> : n(l.inter)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">
                    {l.comAlcance === 0 ? <span className="text-muted">a rede não dá</span> : n(l.alcance)}
                  </td>
                </tr>
              ))}
              <tr className="border-t border-outline/15 font-semibold">
                <td className="px-4 py-1.5 text-on-surface" colSpan={2}>total do recorte</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">{n(total.pecas)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">{n(total.views)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">{total.inter === 0 ? '—' : n(total.inter)}</td>
                <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">{total.alcance === 0 ? '—' : n(total.alcance)}</td>
              </tr>
            </tbody>
          </table>

          <div className="px-4 py-2.5 border-t border-outline/10 text-xs text-on-surface-variant">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted">como ler</span>{' '}
            <strong className="text-on-surface">Views e interações são da peça</strong> ({porPublicacao
              ? 'v_mkt_peca_consolidada, uma linha por peça'
              : 'v_mkt_analytics_peca_dia, a última leitura de cada peça — somar os dias contaria a mesma peça várias vezes'}).{' '}
            <strong className="text-on-surface">Alcance é da conta</strong> (v_mkt_conta_dia, somado no recorte):
            o Instagram e o Facebook entregam, o <strong>YouTube e o TikTok não</strong> — por isso a coluna
            fica em branco neles, e não zerada. Interação por peça hoje só existe de verdade no TikTok;
            no Instagram a coleta pede o número da conta, não o da peça.
          </div>
        </>
      )}
    </section>
  );
}
