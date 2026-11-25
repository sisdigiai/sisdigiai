import { useEffect, useState } from 'react';
import { BarChart3, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
// Este arquivo já tem um tipo local chamado `Recorte` (o corte do resultado: marca, formato, gatilho).
// O recorte DA BARRA entra com outro nome para as duas coisas nunca se confundirem numa linha.
import { aplicar, type Recorte as RecorteBarra } from '../../lib/recorte';
import NaoObedece from './NaoObedece';
import { resumoPola } from '../../lib/espelhoMotores';

// Resultado do conteúdo e teto de IA — ordem do dono (15/09/2026): "não temos analytics ou resultado
// no mkt, sempre no digiai".
//
// REFEITO EM 18/11, por ordem dele ("resultados complexos e misturados… nada de dados sérios para tomada
// de decisão"), e o que mudou não é o desenho, é a conta:
//
//  1. **Saiu a média, entrou a mediana.** Este cartão mostrava "engajamento médio". Com uma peça de 11.333
//     views no meio de medianas de 14, a média descreve a peça viral e não o trabalho. Agora: mediana, p90
//     e o tamanho da base, que sem ele nenhuma das duas significa nada.
//  2. **Saiu `v_mkt_performance`, entraram `v_mkt_cobertura_leitura` e `v_mkt_resultado_recorte`.** A view
//     antiga expunha só `engajamento` — a coluna com MENOS dado (290 de 770 peças). `views` (562) e
//     `alcance` (469) estavam coletados e invisíveis na tela desde julho.
//  3. **Não medido deixou de parecer desempenho ruim.** Nulo e zero eram a mesma coisa aqui. Medido por
//     rede: no Facebook a Meta não devolve alcance em nenhuma peça (MKT, testado 17/08 na v23) e `views`
//     tem 39 nulos contra 118 zeros de verdade. Agora cada estado tem seu nome.
//  4. **Engajamento zero só conta quando a peça foi lida por outra métrica.** `engajamento` nunca é nulo nas
//     770 peças — coletor que sempre escreve número nunca admite falha. Em 287 peças o zero é confiável; em
//     71 não há prova nenhuma, e essas não entram na mediana.
//
// `v_mkt_ai_custo` segue definer com trava `mkt.is_admin()`: quem não é admin do MKT recebe zero linhas, e
// isso é "sem acesso", não "custo zero".

type Cobertura = {
  marca: string; marca_nome: string; rede: string; fonte: string;
  pecas: number; lidas: number; sem_leitura: number; com_views: number; views_zero_medido: number;
  com_alcance: number; alcance_e_fornecido: boolean; com_causa: number; sem_causa: number;
  com_segunda_leitura: number; engaj_confiavel: number; engaj_sem_prova: number; coletado_em: string | null;
};
type Recorte = {
  valor: string; rede_recorte: string | null; com_views: number;
  views_mediana: number | null; views_p90: number | null; views_melhor: number | null;
  engaj_confiaveis: number; engaj_mediana: number | null; engaj_melhor: number | null; serve_de_base: boolean;
};
type Ia = { teto_mensal: number | null; teto_diario: number | null; pausado: boolean | null; gasto_mes: number; gasto_dia: number };

const usd = (v: number | null) => (v == null ? '—' : `US$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`);
const num = (n: number | null) => (n == null ? '—' : Number(n).toLocaleString('pt-BR'));

export default function ResultadoConteudoCard({ recorte: barra, recarga = 0 }: { recorte: RecorteBarra; recarga?: number }) {
  const [cob, setCob] = useState<Cobertura[] | null>(null);
  const [rec, setRec] = useState<Recorte[] | null>(null);
  // A lista canónica das marcas da casa. Sem ela, só aparecem as que têm post medido — e o dono
  // contou os cartões: 9 numa aba, 8 noutra, 7 aqui. Marca sem medição fica, com o motivo escrito.
  const [todas, setTodas] = useState<Array<{ marca: string; marca_nome: string; tem_movimento: boolean }> | null>(null);
  const [pola, setPola] = useState<Awaited<ReturnType<typeof resumoPola>> | null>(null);
  const [ia, setIa] = useState<Ia | null | 'sem_acesso'>(null);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    // Nenhuma destas três tem data: são estado de agora (cobertura da coleta, custo de IA do mês,
    // quem tem movimento). Marca e rede, onde existem, obedecem.
    const semData = { ...barra, de: null, ate: null };
    aplicar(supabase.from('v_mkt_estoque_marca').select('marca, marca_nome, tem_movimento'),
      semData, { marca: 'marca' }).q
      .then(({ data }: { data: unknown }) => setTodas((data ?? []) as never));
    resumoPola().then(setPola);
    supabase.from('v_mkt_ai_custo').select('*').maybeSingle()
      .then(({ data, error }) => { setIa(error || !data ? 'sem_acesso' : (data as Ia)); });

    aplicar(supabase.from('v_mkt_cobertura_leitura')
      .select('marca, marca_nome, rede, fonte, pecas, lidas, sem_leitura, com_views, views_zero_medido, com_alcance, alcance_e_fornecido, com_causa, sem_causa, com_segunda_leitura, engaj_confiavel, engaj_sem_prova, coletado_em'),
      semData, { marca: 'marca', rede: 'rede' }).q
      .limit(500)
      .then(({ data, error }: { data: unknown; error: { message: string } | null }) => { if (error) setErro(error.message); setCob((data ?? []) as Cobertura[]); });

    supabase.from('v_mkt_resultado_recorte')
      .select('valor, rede_recorte, com_views, views_mediana, views_p90, views_melhor, engaj_confiaveis, engaj_mediana, engaj_melhor, serve_de_base')
      .eq('recorte', 'marca').is('rede_recorte', null).limit(200)
      .then(({ data, error }) => { if (error) setErro(error.message); setRec((data ?? []) as Recorte[]); });
  }, [barra, recarga]);

  // uma linha por marca: a cobertura somada das redes, e a mediana do recorte da marca
  const porMarca = (() => {
    if (!cob) return null;
    const m = new Map<string, Cobertura & { redes: string[]; fb_sem_alcance: boolean }>();
    for (const c of cob) {
      const a = m.get(c.marca);
      if (!a) { m.set(c.marca, { ...c, redes: [c.rede], fb_sem_alcance: !c.alcance_e_fornecido }); continue; }
      m.set(c.marca, {
        ...a, redes: [...new Set([...a.redes, c.rede])], fb_sem_alcance: a.fb_sem_alcance || !c.alcance_e_fornecido,
        pecas: a.pecas + c.pecas, lidas: a.lidas + c.lidas, sem_leitura: a.sem_leitura + c.sem_leitura,
        com_views: a.com_views + c.com_views, views_zero_medido: a.views_zero_medido + c.views_zero_medido,
        com_alcance: a.com_alcance + c.com_alcance, com_causa: a.com_causa + c.com_causa, sem_causa: a.sem_causa + c.sem_causa,
        com_segunda_leitura: a.com_segunda_leitura + c.com_segunda_leitura,
        engaj_confiavel: a.engaj_confiavel + c.engaj_confiavel, engaj_sem_prova: a.engaj_sem_prova + c.engaj_sem_prova,
        coletado_em: [a.coletado_em, c.coletado_em].filter(Boolean).sort().pop() ?? null,
      });
    }
    return [...m.values()].sort((a, b) => b.lidas - a.lidas);
  })();

  const medianaDe = (nome: string) => (rec ?? []).find((r) => r.valor === nome) ?? null;
  const coletado = (cob ?? []).map((c) => c.coletado_em).filter(Boolean).sort().pop() ?? null;
  const semCausa = (cob ?? []).reduce((a, c) => a + c.sem_causa, 0);
  const totalPecas = (cob ?? []).reduce((a, c) => a + c.pecas, 0);
  const semSegunda = totalPecas - (cob ?? []).reduce((a, c) => a + c.com_segunda_leitura, 0);

  const faltantes = (todas ?? []).filter((t) => !(porMarca ?? []).some((p) => p.marca === t.marca));

  return (
    <section className="border border-outline/15 bg-surface-container">
      <div className="flex items-center gap-2 flex-wrap px-4 py-2.5 border-b border-outline/10">
        <BarChart3 className="w-4 h-4 text-secondary" />
        <span className="text-sm font-semibold text-on-surface">Resultado do conteúdo</span>
        <span className="font-mono text-[10px] text-muted">
          mediana por peça, nunca média — e nunca contando peça não medida como zero
        </span>
        {/* A cobertura e o custo de IA obedecem à marca e à rede; as MEDIANAS vêm de
            `v_mkt_resultado_recorte`, que não tem data, marca nem rede. O selo diz isso em vez de
            deixar a barra acesa prometendo o que esta parte não entrega. */}
        <NaoObedece recorte={barra} data
          porque="as medianas vêm de v_mkt_resultado_recorte, que não tem coluna de data (medido em 25/11/2026); a cobertura e o custo de IA deste cartão obedecem à marca e à rede" />
        {coletado && (
          <span className="ml-auto font-mono text-[10px] text-muted tabular-nums">
            coletado em {new Date(coletado).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZone: 'America/Sao_Paulo' })}
          </span>
        )}
      </div>

      {erro ? (
        <div className="px-4 py-3 text-sm text-danger flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" /> <span>Não consegui ler o resultado: {erro}.</span>
        </div>
      ) : porMarca == null ? (
        <div className="px-4 py-3 text-sm text-muted">Carregando…</div>
      ) : (
        <>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-outline/10">
                  {['Marca', 'Peças lidas', 'Views mediana', 'p90', 'Interação mediana', 'Não medido'].map((h, i) => (
                    <th key={h} className={`font-mono text-[9px] uppercase tracking-widest text-muted px-4 py-2 ${i ? 'text-right' : 'text-left'}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {porMarca.map((m) => {
                  const r = medianaDe(m.marca_nome);
                  return (
                    <tr key={m.marca} className="border-b border-outline/5">
                      <td className="px-4 py-1.5 text-on-surface">
                        {m.marca_nome}
                        <div className="font-mono text-[9px] text-muted leading-tight">
                          {m.redes.join(' · ')}
                          {m.fb_sem_alcance && <span> · a Meta não fornece alcance no Facebook</span>}
                        </div>
                      </td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">
                        {m.lidas} <span className="text-muted">de {m.pecas}</span>
                      </td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-on-surface">
                        {r && r.serve_de_base ? num(r.views_mediana) : <span className="text-muted" title="menos de 4 peças lidas na janela de 7 a 90 dias">base curta</span>}
                      </td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-muted">{r?.serve_de_base ? num(r.views_p90) : '—'}</td>
                      <td className="px-4 py-1.5 text-right tabular-nums text-on-surface-variant">
                        {m.engaj_confiavel === 0
                          ? <span className="text-muted">sem prova</span>
                          : r?.serve_de_base ? num(r.engaj_mediana) : '—'}
                      </td>
                      <td className="px-4 py-1.5 text-right font-mono text-[10px] tabular-nums text-muted">
                        {m.sem_leitura > 0 && <span className="text-warning">{m.sem_leitura} sem leitura</span>}
                        {m.sem_leitura > 0 && m.views_zero_medido > 0 && ' · '}
                        {m.views_zero_medido > 0 && <span>{m.views_zero_medido} zero medido</span>}
                        {m.sem_leitura === 0 && m.views_zero_medido === 0 && '—'}
                      </td>
                    </tr>
                  );
                })}

                {/* Marca sem nenhuma peça medida nunca desaparece: fica com o motivo escrito. */}
                {faltantes.map((t) => (
                  <tr key={t.marca} className="border-b border-outline/5">
                    <td className="px-4 py-1.5 text-on-surface">
                      {t.marca_nome}
                      <div className="font-mono text-[9px] text-muted leading-tight">
                        {t.marca === 'polapetit'
                          ? (pola?.frase ?? 'lendo o espelho da Polá…')
                          : t.tem_movimento
                            ? 'publica fora do MKT — resultado não medido aqui'
                            : 'ainda não publica pela casa; nenhum dado chega'}
                      </div>
                    </td>
                    <td className="px-4 py-1.5 text-right text-muted">—</td>
                    <td className="px-4 py-1.5 text-right text-muted">—</td>
                    <td className="px-4 py-1.5 text-right text-muted">—</td>
                    <td className="px-4 py-1.5 text-right text-muted">—</td>
                    <td className="px-4 py-1.5 text-right text-muted">—</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* O tamanho do buraco, dito de frente: é o que falta para "o que funciona" responder melhor. */}
          <div className="px-4 py-2.5 border-t border-outline/10 flex flex-wrap gap-x-5 gap-y-1 text-xs">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted self-center">o que falta medir</span>
            <span className="text-on-surface-variant">
              <strong className="text-on-surface tabular-nums">{semCausa}</strong> de {totalPecas} peças sem causa registrada
              <span className="text-muted"> (gancho ou formato — sem isso não há "por que funcionou")</span>
            </span>
            <span className="text-on-surface-variant">
              <strong className="text-on-surface tabular-nums">{semSegunda}</strong> sem a segunda leitura em 7 dias
              <span className="text-muted"> (sem ela, comparar peça de julho com a de ontem compara idade)</span>
            </span>
          </div>

          <div className="px-4 py-2.5 border-t border-outline/10 flex flex-wrap gap-x-5 gap-y-1 text-xs text-on-surface-variant">
            <span className="font-mono text-[9px] uppercase tracking-widest text-muted self-center">IA do MKT</span>
            {ia == null ? (
              <span className="text-muted">Carregando…</span>
            ) : ia === 'sem_acesso' ? (
              <span className="text-muted">Teto e gasto só aparecem para admin do MKT — não é custo zero.</span>
            ) : (
              <>
                <span>{ia.pausado ? <strong className="text-warning">IA pausada</strong> : <strong className="text-success">IA ligada</strong>}</span>
                <span>Mês: <strong className="text-on-surface tabular-nums">{usd(ia.gasto_mes)}</strong> de {usd(ia.teto_mensal)}</span>
                <span>Hoje: <strong className="text-on-surface tabular-nums">{usd(ia.gasto_dia)}</strong> de {usd(ia.teto_diario)}</span>
              </>
            )}
          </div>
        </>
      )}
    </section>
  );
}
