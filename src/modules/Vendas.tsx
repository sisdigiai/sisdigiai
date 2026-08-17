import { useEffect, useMemo, useState } from 'react';
import { PlugZap, Unplug, CircleCheck, TrendingUp, RefreshCw, UserMinus, Package } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { vendasStore, janelas, porProduto, type VendaEvento, type Canal, type Resumo } from '../lib/vendasStore';

// Vendas dos produtos DIGIAI — Clearix, OSI, digiai, nexus, Lumina, easyidiomas,
// qualfoto, e futura assinatura do Limelight.
//
// NÃO é venda de varejo óptico: aquela vive no banco do Clearix, que este app não lê
// (ADR-0001 / R-009). Mello e Lancaster são base de autoridade de conteúdo, não fonte
// de receita aqui.
//
// A tela existe ANTES da primeira venda de propósito. No dia em que ela entrar, ninguém
// perceberia se não houvesse onde aparecer — foi esse silêncio que deixou a fila do MKT
// 11 dias travada e a coleta de audiência 39 dias parada.

const ESTADO_CANAL: Record<string, { Icone: typeof CircleCheck; cor: string; texto: string }> = {
  'ativo':            { Icone: CircleCheck, cor: 'text-success', texto: 'recebendo venda' },
  'ligado sem venda': { Icone: PlugZap,     cor: 'text-warning', texto: 'integrado, nenhuma venda ainda' },
  'sem integracao':   { Icone: Unplug,      cor: 'text-danger',  texto: 'sem integração — venda aqui não seria vista' },
};

function brl(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function Bloco({ Icone, rotulo, qtd, valor, cor, nota }: {
  Icone: typeof TrendingUp; rotulo: string; qtd: number; valor: number; cor: string; nota?: string;
}) {
  return (
    <div className="bg-surface-low p-4">
      <div className="flex items-center gap-1.5 mb-1">
        <Icone className={`w-3.5 h-3.5 ${cor}`} />
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{rotulo}</span>
      </div>
      <div className="font-serif text-2xl text-on-surface">{qtd}</div>
      <div className="font-mono text-[11px] text-on-surface-variant mt-0.5">{brl(valor)}</div>
      {nota && <div className="text-[10px] text-muted mt-1 leading-snug">{nota}</div>}
    </div>
  );
}

function Painel({ titulo, r }: { titulo: string; r: Resumo }) {
  return (
    <section className="mb-8">
      <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary mb-3">{titulo}</h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-outline border border-outline">
        <Bloco Icone={TrendingUp} rotulo="assinaturas novas" qtd={r.novas} valor={r.novas_valor}
               cor="text-success" nota="MRR novo — é crescimento" />
        <Bloco Icone={RefreshCw} rotulo="renovações" qtd={r.renovacoes} valor={r.renovacoes_valor}
               cor="text-muted" nota="caixa de MRR que já existia" />
        <Bloco Icone={UserMinus} rotulo="cancelamentos" qtd={r.cancelamentos} valor={r.cancelamentos_valor}
               cor="text-danger" nota="MRR saindo" />
        <Bloco Icone={Package} rotulo="avulsas" qtd={r.avulsas} valor={r.avulsas_valor}
               cor="text-on-surface-variant" nota="infoproduto, sem recorrência" />
      </div>
      <div className="border border-outline border-t-0 bg-surface-container px-4 py-3 flex items-baseline gap-3">
        <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">movimento líquido de recorrência</span>
        <span className={`font-serif text-lg ${r.liquido_recorrencia > 0 ? 'text-success' : r.liquido_recorrencia < 0 ? 'text-danger' : 'text-on-surface'}`}>
          {brl(r.liquido_recorrencia)}
        </span>
        <span className="text-[11px] text-muted">novas menos cancelamentos — renovação não entra</span>
      </div>
    </section>
  );
}

export default function Vendas() {
  const [eventos, setEventos] = useState<VendaEvento[]>([]);
  const [canais, setCanais] = useState<Canal[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    vendasStore.carregar()
      .then(({ eventos, canais }) => { setEventos(eventos); setCanais(canais); })
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  }, []);

  const j = useMemo(() => janelas(eventos), [eventos]);
  const produtos = useMemo(() => porProduto(eventos), [eventos]);
  const semVenda = eventos.length === 0;

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="DINHEIRO"
        title="Vendas"
        subtitle="Produtos da DIGIAI — Clearix, OSI, digiai, nexus, Lumina e o que vier. Varejo óptico não entra aqui: vive no banco do Clearix, que este painel não lê."
      />

      {carregando && <div className="font-mono text-xs uppercase tracking-widest text-muted">Carregando…</div>}
      {erro && <div className="border border-danger/40 bg-surface-container p-4 text-sm text-danger">{erro}</div>}

      {!carregando && !erro && (
        <>
          <section className="mb-8">
            <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary mb-3">Canais de venda</h2>
            <div className="border border-outline divide-y divide-outline">
              {canais.map((c) => {
                const e = ESTADO_CANAL[c.estado] ?? ESTADO_CANAL['sem integracao'];
                return (
                  <div key={c.canal} className="bg-surface-low px-4 py-3 flex items-start gap-3">
                    <e.Icone className={`w-4 h-4 mt-0.5 shrink-0 ${e.cor}`} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className="text-on-surface text-sm font-medium">{c.canal}</span>
                        <span className={`font-mono text-[10px] uppercase tracking-wider ${e.cor}`}>{e.texto}</span>
                      </div>
                      <p className="text-on-surface-variant text-sm mt-0.5">{c.cobre}</p>
                    </div>
                    <div className="text-right font-mono text-[11px] text-muted shrink-0">
                      {c.pagamentos_reais} venda(s)
                      {c.assinantes != null && <><br />{c.assinantes} assinante(s)</>}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>

          {semVenda && (
            <div className="border border-outline bg-surface-container p-5 mb-8">
              <div className="font-mono text-[11px] uppercase tracking-[0.16em] text-warning mb-2">
                nenhuma venda ainda
              </div>
              <p className="text-sm text-on-surface-variant leading-relaxed">
                Não é falha de leitura: não existe venda registrada. A primeira aparece aqui no
                dia em que entrar, separada em assinatura nova, renovação, cancelamento e avulsa.
              </p>
              <p className="text-sm text-muted leading-relaxed mt-2">
                A tela existe antes da primeira venda de propósito — sem ela, ninguém perceberia
                a primeira acontecer. E o <strong className="text-on-surface-variant">Hotmart está sem
                integração</strong>: venda do OSI hoje não seria vista por este painel, o que é
                diferente de não ter vendido.
              </p>
            </div>
          )}

          <Painel titulo="Hoje" r={j.hoje} />
          <Painel titulo="Últimos 7 dias" r={j.sete} />
          <Painel titulo="Mês corrente" r={j.mes} />

          {produtos.length > 0 && (
            <section>
              <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary mb-3">Por produto · histórico</h2>
              <div className="border border-outline overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-container">
                      {['produto', 'novas', 'renov.', 'cancel.', 'avulsas', 'líquido'].map((h) => (
                        <th key={h} className="text-left font-mono text-[10px] uppercase tracking-wider text-muted px-3 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-outline">
                    {produtos.map((p) => (
                      <tr key={p.chave} className="bg-surface-low">
                        <td className="px-3 py-2 text-on-surface whitespace-nowrap">{p.nome}</td>
                        <td className="px-3 py-2 text-on-surface-variant">{p.resumo.novas}</td>
                        <td className="px-3 py-2 text-on-surface-variant">{p.resumo.renovacoes}</td>
                        <td className="px-3 py-2 text-on-surface-variant">{p.resumo.cancelamentos}</td>
                        <td className="px-3 py-2 text-on-surface-variant">{p.resumo.avulsas}</td>
                        <td className="px-3 py-2 font-mono text-[12px] whitespace-nowrap">{brl(p.resumo.liquido_recorrencia)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          <p className="text-xs text-muted mt-10 leading-relaxed">
            Fonte: <code className="font-mono">public.v_vendas_eventos</code>, que devolve evento
            classificado em vez de total do dia. Somar renovação com assinatura nova faria um dia de
            20 renovações e nenhuma venda parecer excelente — e é por isso que os dois números nunca
            aparecem juntos aqui. Cancelamento usa data aproximada
            (<code className="font-mono">deleted_at</code> ou <code className="font-mono">updated_at</code>):
            não existe histórico de status de assinante.
          </p>
        </>
      )}
    </div>
  );
}
