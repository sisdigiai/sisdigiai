import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ExternalLink, ShieldAlert, CircleCheck, CircleSlash, CircleHelp, Search } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import {
  inventarioStore, familiaDe, FAMILIAS_ORDEM, foiConferido, blocosDe, notaOriginal,
  type ContaServico,
} from '../lib/inventarioStore';

// Inventário — o quadro de disjuntores da empresa.
//
// Existe porque o levantamento das 9 BMs, dos projetos Supabase, das zonas
// Cloudflare e das credenciais só valia enquanto alguém lembrasse de olhar o
// banco. Inventário sem tela vira foto velha: foi assim que o inventário
// anterior passou a contar 12 contas de anúncio onde existem 5.
//
// Leitura pura de `public.v_ops_contas_servicos` (R-032 — a tabela é do MKT).

const ICONE_STATUS: Record<string, { Icone: typeof CircleCheck; cor: string; rotulo: string }> = {
  ok:           { Icone: CircleCheck, cor: 'text-success', rotulo: 'ok' },
  pausado:      { Icone: CircleSlash, cor: 'text-warning', rotulo: 'pausado' },
  quebrado:     { Icone: ShieldAlert, cor: 'text-danger',  rotulo: 'quebrado' },
  desconhecido: { Icone: CircleHelp,  cor: 'text-muted',   rotulo: 'desconhecido' },
};

function statusDe(s: string | null) {
  return ICONE_STATUS[s ?? 'desconhecido'] ?? ICONE_STATUS.desconhecido;
}

function moeda(v: number | null, m: string | null): string | null {
  if (v == null || v === 0) return null;
  return `${m ?? 'R$'} ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default function Inventario() {
  const [itens, setItens] = useState<ContaServico[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [familia, setFamilia] = useState<string>('todas');
  const [busca, setBusca] = useState('');
  const [aberto, setAberto] = useState<Set<string>>(new Set());

  useEffect(() => {
    inventarioStore.listar()
      .then(setItens)
      .catch((e) => setErro(e instanceof Error ? e.message : String(e)))
      .finally(() => setCarregando(false));
  }, []);

  // O 4º quadro NÃO é custo. `custo_mensal` está vazio em todas as linhas — o custo
  // de infraestrutura vive em `finance.infra_costs`, e um quadro que nunca preenche
  // é ruído, não informação. O que importa aqui é o tamanho da lacuna de verificação.
  const placar = useMemo(() => {
    const conferidos = itens.filter(foiConferido).length;
    const problema = itens.filter((i) => i.status === 'quebrado' || i.status === 'pausado').length;
    return { total: itens.length, conferidos, problema, pendentes: itens.length - conferidos };
  }, [itens]);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return itens.filter((i) => {
      if (familia !== 'todas' && familiaDe(i.servico).chave !== familia) return false;
      if (!q) return true;
      return `${i.identificador} ${i.servico} ${i.conta_dona ?? ''} ${i.ultimo_detalhe ?? ''}`.toLowerCase().includes(q);
    });
  }, [itens, familia, busca]);

  const grupos = useMemo(() => {
    return FAMILIAS_ORDEM
      .map((f) => ({ ...f, itens: visiveis.filter((i) => familiaDe(i.servico).chave === f.chave) }))
      .filter((g) => g.itens.length > 0);
  }, [visiveis]);

  const alternar = (id: string) => {
    setAberto((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id); else n.add(id);
      return n;
    });
  };

  return (
    <div className="max-w-5xl">
      <PageHeader
        eyebrow="EMPRESA"
        title="Inventário"
        subtitle={
          <>
            Tudo que a empresa tem em contas, plataformas e credenciais — e o estado
            real de cada item, conferido na plataforma, não no que a gente lembrava.
          </>
        }
      />

      {carregando && (
        <div className="font-mono text-xs uppercase tracking-widest text-muted">Carregando inventário…</div>
      )}

      {erro && (
        <div className="border border-danger/40 bg-surface-container p-4 text-sm text-danger">
          {erro}
        </div>
      )}

      {!carregando && !erro && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-outline border border-outline mb-8">
            {[
              { rotulo: 'itens', valor: String(placar.total) },
              { rotulo: 'conferidos', valor: `${placar.conferidos}/${placar.total}` },
              { rotulo: 'com problema', valor: String(placar.problema) },
              { rotulo: 'falta conferir', valor: String(placar.pendentes) },
            ].map((c) => (
              <div key={c.rotulo} className="bg-surface-low p-4">
                <div className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted mb-1">{c.rotulo}</div>
                <div className="font-serif text-2xl text-on-surface">{c.valor}</div>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center gap-2 mb-6">
            {[{ chave: 'todas', label: 'Todas' }, ...FAMILIAS_ORDEM].map((f) => (
              <button
                key={f.chave}
                onClick={() => setFamilia(f.chave)}
                className={`font-mono text-[11px] uppercase tracking-[0.14em] px-3 py-1.5 border transition-colors ${
                  familia === f.chave
                    ? 'border-on-surface text-on-surface'
                    : 'border-outline text-muted hover:text-on-surface-variant'
                }`}
              >
                {f.label}
              </button>
            ))}
            <div className="relative ml-auto">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="buscar"
                className="bg-surface-low border border-outline pl-8 pr-3 py-1.5 text-sm text-on-surface placeholder:text-muted focus:outline-none focus:border-on-surface-variant"
              />
            </div>
          </div>

          {grupos.length === 0 && (
            <div className="text-sm text-on-surface-variant">Nenhum item para este filtro.</div>
          )}

          <div className="space-y-10">
            {grupos.map((g) => (
              <section key={g.chave}>
                <h2 className="font-mono text-[11px] uppercase tracking-[0.2em] text-secondary mb-3">
                  {g.label} <span className="text-muted">· {g.itens.length}</span>
                </h2>
                <div className="border border-outline divide-y divide-outline">
                  {g.itens.map((i) => {
                    const st = statusDe(i.status);
                    const blocos = blocosDe(i);
                    const nota = notaOriginal(i);
                    const expandido = aberto.has(i.id);
                    const temDetalhe = blocos.length > 0 || !!nota;
                    return (
                      <div key={i.id} className="bg-surface-low">
                        <button
                          onClick={() => temDetalhe && alternar(i.id)}
                          className={`w-full text-left px-4 py-3 flex items-start gap-3 ${temDetalhe ? 'hover:bg-surface-container' : 'cursor-default'}`}
                        >
                          <st.Icone className={`w-4 h-4 mt-0.5 shrink-0 ${st.cor}`} aria-label={st.rotulo} />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-baseline gap-2 flex-wrap">
                              <span className="text-on-surface text-sm font-medium break-all">{i.identificador}</span>
                              <span className="font-mono text-[10px] uppercase tracking-wider text-muted">{i.servico}</span>
                              {!foiConferido(i) && (
                                <span className="font-mono text-[10px] uppercase tracking-wider text-warning border border-warning/50 px-1.5 py-0.5">
                                  não conferido
                                </span>
                              )}
                            </div>
                            {i.ultimo_detalhe && (
                              <p className="text-on-surface-variant text-sm mt-1 leading-snug">{i.ultimo_detalhe}</p>
                            )}
                            {moeda(i.custo_mensal, i.moeda) && (
                              <span className="font-mono text-[11px] text-muted mt-1 inline-block">
                                {moeda(i.custo_mensal, i.moeda)}/mês
                              </span>
                            )}
                          </div>
                          {temDetalhe && (
                            <ChevronDown className={`w-4 h-4 shrink-0 text-muted transition-transform ${expandido ? 'rotate-180' : ''}`} />
                          )}
                        </button>

                        {expandido && (
                          <div className="px-4 pb-4 pl-11 space-y-4">
                            {nota && (
                              <p className="text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">{nota}</p>
                            )}
                            {blocos.map((b) => (
                              <div key={b.titulo}>
                                <div className="font-mono text-[10px] uppercase tracking-[0.16em] text-secondary mb-1">{b.titulo}</div>
                                <p className="text-sm text-on-surface-variant whitespace-pre-line leading-relaxed">{b.texto}</p>
                              </div>
                            ))}
                            {i.url_painel && (
                              <a
                                href={i.url_painel}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-on-surface-variant hover:text-on-surface"
                              >
                                abrir painel <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>

          <p className="text-xs text-muted mt-10 leading-relaxed">
            A verdade destes dados vive em <code className="font-mono">ops.contas_servicos</code>, tabela do
            app DIGIAI MKT. Esta tela é leitura — quando falta um ativo aqui, vai despacho
            para o dono da tabela em vez de escrita direta.
          </p>
        </>
      )}
    </div>
  );
}
