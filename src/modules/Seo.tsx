import { useEffect, useMemo, useState } from 'react';
import { ExternalLink, TriangleAlert, ArrowUpRight, ArrowDownRight, Minus } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { seoStore, DIAGNOSTICOS, type SeoEstado } from '../lib/seoStore';

// SEO — busca orgânica dos três sites da empresa.
//
// Existe porque os números do Search Console estavam sendo lidos no navegador e
// contados de boca. Sem tela, "o SEO está morto" e "o SEO está invisível" viram a
// mesma frase — e são problemas diferentes, com consertos diferentes e custos
// diferentes. A tela força a distinção.
//
// Leitura de `public.v_seo_estado`. O diagnóstico vem do banco, não daqui.

const TOM: Record<string, string> = {
  ruim: 'text-danger',
  atencao: 'text-warning',
  bom: 'text-success',
  neutro: 'text-muted',
};

function num(v: number | null): string {
  return v == null ? '—' : v.toLocaleString('pt-BR');
}

/** Posição menor é melhor: a seta tem que inverter, senão a tela mente. */
function Delta({ atual, antes, menorMelhor = false }: { atual: number | null; antes: number | null; menorMelhor?: boolean }) {
  if (atual == null || antes == null) return null;
  const d = atual - antes;
  if (d === 0) return <Minus className="w-3 h-3 inline text-muted" aria-label="sem variação" />;
  const melhorou = menorMelhor ? d < 0 : d > 0;
  const Icone = d > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className={`inline-flex items-center gap-0.5 font-mono text-[11px] ${melhorou ? 'text-success' : 'text-danger'}`}>
      <Icone className="w-3 h-3" />
      {Math.abs(d).toLocaleString('pt-BR')}
    </span>
  );
}

export default function Seo() {
  const [sites, setSites] = useState<SeoEstado[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    seoStore.estado()
      .then(setSites)
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  }, []);

  const totais = useMemo(() => ({
    cliques: sites.reduce((s, x) => s + (x.cliques ?? 0), 0),
    impressoes: sites.reduce((s, x) => s + (x.impressoes ?? 0), 0),
    paginas: sites.reduce((s, x) => s + (x.paginas_sitemap ?? 0), 0),
    frios: sites.filter((x) => x.sitemap_frio).length,
  }), [sites]);

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="PRODUTOS"
        title="SEO"
        subtitle="Busca orgânica dos três sites. Cada um tem um problema diferente — e confundi-los é o jeito mais rápido de gastar esforço no lugar errado."
      />

      {carregando && <div className="font-mono text-xs uppercase tracking-widest text-muted">Carregando…</div>}
      {erro && <div className="border border-danger/40 bg-surface-container p-4 text-sm text-danger">{erro}</div>}

      {!carregando && !erro && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-outline border border-outline mb-8">
            {[
              { r: 'cliques', v: num(totais.cliques) },
              { r: 'impressões', v: num(totais.impressoes) },
              { r: 'páginas no sitemap', v: num(totais.paginas) },
              { r: 'sitemaps frios', v: String(totais.frios) },
            ].map((c) => (
              <div key={c.r} className="bg-surface-low p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-1">{c.r}</div>
                <div className="font-serif text-2xl text-on-surface">{c.v}</div>
              </div>
            ))}
          </div>

          {totais.cliques < 20 && (
            <div className="border border-outline bg-surface-container p-4 mb-8 text-sm text-on-surface-variant leading-relaxed">
              <strong className="text-on-surface">Leitura honesta do canal:</strong> {num(totais.cliques)} cliques
              somando os três sites. O SEO está tecnicamente saudável — os sitemaps são lidos, as
              propriedades estão verificadas — e ainda não entrega. Isso é normal em pré-lançamento:
              é <em>cold start</em>, não otimização. Serve de linha de base para medir depois, não
              de motivo para mexer em tudo agora.
            </div>
          )}

          <div className="space-y-4">
            {sites.map((s) => {
              const d = DIAGNOSTICOS[s.diagnostico] ?? DIAGNOSTICOS['sem medicao'];
              return (
                <section key={s.site} className="border border-outline bg-surface-low">
                  <div className="p-5">
                    <div className="flex items-start justify-between gap-4 flex-wrap">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 shrink-0" style={{ background: s.color ?? 'currentColor' }} />
                          <h2 className="font-serif text-xl text-on-surface">{s.label}</h2>
                        </div>
                        <a
                          href={`https://${s.site}`}
                          target="_blank"
                          rel="noreferrer"
                          className="font-mono text-[11px] text-muted hover:text-on-surface-variant inline-flex items-center gap-1 mt-1"
                        >
                          {s.site} <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono text-[11px] uppercase tracking-[0.14em] ${TOM[d.tom]}`}>
                          {d.rotulo}
                        </div>
                        {s.medido_em && (
                          <div className="font-mono text-[10px] text-muted mt-0.5">
                            medido {new Date(s.medido_em + 'T12:00:00').toLocaleDateString('pt-BR')} · janela {s.janela}
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mt-5">
                      {[
                        { r: 'páginas', v: num(s.paginas_sitemap) },
                        { r: 'cliques', v: num(s.cliques), delta: <Delta atual={s.cliques} antes={s.cliques_antes} /> },
                        { r: 'impressões', v: num(s.impressoes), delta: <Delta atual={s.impressoes} antes={s.impressoes_antes} /> },
                        { r: 'posição', v: s.posicao_media != null ? s.posicao_media.toFixed(1).replace('.', ',') : '—', delta: <Delta atual={s.posicao_media} antes={s.posicao_antes} menorMelhor /> },
                        { r: 'CTR', v: s.ctr != null ? `${s.ctr.toFixed(2).replace('.', ',')}%` : '—' },
                      ].map((m) => (
                        <div key={m.r}>
                          <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted mb-1">{m.r}</div>
                          <div className="text-on-surface text-lg font-medium">
                            {m.v} {m.delta}
                          </div>
                        </div>
                      ))}
                    </div>

                    <div className="mt-5 pt-4 border-t border-outline">
                      <p className="text-sm text-on-surface-variant leading-relaxed">
                        <strong className="text-on-surface">{d.oque}</strong> {d.acao}
                      </p>
                      {s.obs && (
                        <p className="text-sm text-muted mt-2 leading-relaxed">{s.obs}</p>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 mt-4 font-mono text-[10px] uppercase tracking-wider text-muted">
                      {s.sitemap_lido_em && (
                        <span className={s.sitemap_frio ? 'text-warning' : ''}>
                          {s.sitemap_frio && <TriangleAlert className="w-3 h-3 inline mr-1" />}
                          sitemap lido há {s.dias_desde_leitura} {s.dias_desde_leitura === 1 ? 'dia' : 'dias'}
                        </span>
                      )}
                      {s.gsc_property && <span>search console ok</span>}
                      {s.tem_bing && <span>bing ok</span>}
                      {s.tem_cloudflare && <span>cloudflare ok</span>}
                      {s.github_repo && <span>{s.github_repo}</span>}
                    </div>
                  </div>
                </section>
              );
            })}
          </div>

          <p className="text-xs text-muted mt-10 leading-relaxed">
            Configuração em <code className="font-mono">company.seo_sites</code>, medições em{' '}
            <code className="font-mono">company.seo_medicoes</code>. Cada leitura do Search Console
            grava uma linha nova em vez de sobrescrever — sem histórico não existe a pergunta
            &ldquo;melhorou?&rdquo;, e sem ela o número não decide nada.
          </p>
        </>
      )}
    </div>
  );
}
