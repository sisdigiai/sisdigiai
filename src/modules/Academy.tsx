import { useEffect, useState } from 'react';
import {
  BookOpen, ExternalLink, CheckSquare, Square, Flag, FileText,
  Layers, HelpCircle, RefreshCw, Info,
} from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { TravasBanner } from './TravasMarketing';
import {
  academyStore,
  type AcademyWorkspace,
  type AcademyProductStatus,
  type AcademyQuestionStatus,
} from '../lib/academyStore';

// Módulo SOMENTE LEITURA por decisão do dono (2026-07-12): a produção dos
// produtos Academy e as travas de execução moram no DIGIAI MKT.
// Aqui é a ficha informativa — espelho do banco (academy.*), sem edição.

const productStatusLabel: Record<AcademyProductStatus, string> = {
  draft: 'Draft', planned: 'Planejado', in_production: 'Em produção',
  ready_for_sale: 'Pronto para venda', live: 'Ao vivo', archived: 'Arquivado',
};

const questionStatusMeta: Record<AcademyQuestionStatus, { label: string; cls: string }> = {
  open:     { label: 'Aberta',    cls: 'border-warning/40 text-warning bg-warning/10' },
  deciding: { label: 'Decidindo', cls: 'border-secondary/40 text-secondary bg-secondary/10' },
  blocked:  { label: 'Bloqueada', cls: 'border-danger/40 text-danger bg-danger/10' },
  done:     { label: 'Resolvida', cls: 'border-success/40 text-success bg-success/10' },
};

function brl(v: number | null): string {
  return v == null ? '—' : `R$ ${v.toFixed(2).replace('.', ',')}`;
}

function Item({ label, value }: { label: string; value?: string | number | null }) {
  const str = value == null || value === '' ? '—' : String(value);
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted mb-0.5">{label}</div>
      <div className="text-sm text-on-surface leading-snug">{str}</div>
    </div>
  );
}

function Bloco({ titulo, count, children }: { titulo: string; count?: number; children: React.ReactNode }) {
  return (
    <div className="border border-outline/15 bg-surface-container">
      <div className="px-5 py-3 border-b border-outline/10 flex items-center justify-between">
        <span className="font-mono text-[10px] uppercase tracking-widest text-secondary">{titulo}</span>
        {count != null && <span className="font-mono text-[10px] text-muted tabular-nums">{count}</span>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

export default function Academy() {
  const [ws, setWs] = useState<AcademyWorkspace | null>(null);
  const [loading, setLoading] = useState(true);

  const load = () => {
    setLoading(true);
    academyStore.getWorkspace().then((w) => { setWs(w); setLoading(false); });
  };
  useEffect(load, []);

  if (loading || !ws) {
    return (
      <div className="max-w-7xl mx-auto p-8">
        <div className="text-sm text-muted">Carregando Academy…</div>
      </div>
    );
  }

  const p = ws.product;
  const checklistDone = ws.checklist.filter((c) => c.done).length;
  const questoesAbertas = ws.questions.filter((q) => q.status !== 'done').length;
  const cenarioRecomendado = ws.scenarios.find((s) => s.status === 'recommended');

  return (
    <div className="max-w-7xl mx-auto p-8">
      <PageHeader
        eyebrow="Educação"
        title="Academy"
        subtitle="Ficha informativa dos produtos digitais do Academy — espelho do banco, somente leitura."
        actions={
          <button onClick={load} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Recarregar">
            <RefreshCw size={16} />
          </button>
        }
      />

      <div className="space-y-5">
        <TravasBanner />

        {/* Onde se edita */}
        <div className="border border-outline/15 bg-surface-lowest p-3 flex items-start gap-2.5 text-[12px] text-on-surface-variant">
          <Info className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
          <span>
            Este módulo é <strong className="text-on-surface">somente leitura</strong>. A produção de conteúdo, as artes e as travas de
            execução moram no <a href="https://mkt.digiai.app.br" target="_blank" rel="noreferrer" className="text-secondary hover:underline">DIGIAI MKT</a>;
            os dados do produto vivem no banco (<span className="font-mono">academy.*</span>) e são atualizados por lá ou por agente.
          </span>
        </div>

        {/* Ficha do produto */}
        <div className="border border-outline/15 bg-surface-container p-6">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <div className="font-serif text-2xl font-semibold text-on-surface">{p.product_name}</div>
              <div className="text-[13px] text-muted mt-1">{p.subtitle}</div>
            </div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-success/40 text-success bg-success/10">{productStatusLabel[p.status]}</span>
              <span className="font-mono text-[10px] uppercase tracking-wider px-2 py-1 border border-outline/20 text-on-surface-variant">{p.offer_type.replace('_', ' ')}</span>
              <span className="font-serif text-xl font-semibold text-on-surface tabular-nums">{brl(p.price_brl)}</span>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 mt-5">
            <Item label="Promessa" value={p.promise} />
            <Item label="Foco atual" value={p.current_focus} />
            <Item label="Público primário" value={p.primary_audience} />
            <Item label="Entrega (core)" value={p.core_delivery} />
            <Item label="CTA principal" value={p.main_cta} />
            <Item label="Condição de lançamento" value={p.launch_condition} />
            <Item label="Modo de entrega" value={`${p.delivery_mode || '—'}${p.delivery_provider ? ` · ${p.delivery_provider}` : ''}${p.access_duration_days ? ` · ${p.access_duration_days} dias de acesso` : ''}`} />
            <div className="flex items-end gap-4">
              {p.sales_page_url && (
                <a href={p.sales_page_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline">
                  <ExternalLink className="w-3 h-3" /> Landing
                </a>
              )}
              {p.checkout_url && (
                <a href={p.checkout_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 text-xs text-secondary hover:underline">
                  <ExternalLink className="w-3 h-3" /> Checkout
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          {/* Checklist */}
          <Bloco titulo={`Checklist operacional · ${checklistDone}/${ws.checklist.length}`}>
            <div className="space-y-2.5">
              {[...ws.checklist].sort((a, b) => a.sort_order - b.sort_order).map((c) => (
                <div key={c.id} className="flex items-start gap-2.5">
                  {c.done ? <CheckSquare className="w-4 h-4 text-success shrink-0 mt-0.5" /> : <Square className="w-4 h-4 text-muted shrink-0 mt-0.5" />}
                  <div className="min-w-0 flex-1">
                    <div className={`text-sm ${c.done ? 'text-on-surface-variant' : 'text-on-surface'}`}>{c.title}</div>
                    {c.notes && <div className="text-[11px] text-muted leading-snug whitespace-pre-line">{c.notes}</div>}
                  </div>
                  <span className="font-mono text-[9px] uppercase text-muted shrink-0">{c.area}</span>
                </div>
              ))}
            </div>
          </Bloco>

          {/* Questões */}
          <Bloco titulo={`Questões e decisões · ${questoesAbertas} aberta(s)`}>
            <div className="space-y-3">
              {[...ws.questions].sort((a, b) => a.sort_order - b.sort_order).map((q) => {
                const meta = questionStatusMeta[q.status];
                return (
                  <div key={q.id} className="flex items-start gap-2.5">
                    <HelpCircle className="w-4 h-4 text-muted shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm text-on-surface">{q.title}</span>
                        <span className={`font-mono text-[9px] uppercase tracking-wider px-1.5 py-0.5 border ${meta.cls}`}>{meta.label}</span>
                      </div>
                      {q.next_step && q.status !== 'done' && <div className="text-[11px] text-secondary mt-0.5">→ {q.next_step}</div>}
                      {q.notes && <div className="text-[11px] text-muted leading-snug mt-0.5 whitespace-pre-line">{q.notes}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </Bloco>
        </div>

        {/* Cenários */}
        <Bloco titulo="Cenários de venda e entrega" count={ws.scenarios.length}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {ws.scenarios.map((s) => (
              <div key={s.id} className={`border p-4 ${s.status === 'recommended' ? 'border-success/40 bg-success/5' : 'border-outline/10 bg-surface-lowest'}`}>
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <Layers className="w-3.5 h-3.5 text-secondary" />
                  <span className="text-sm font-medium text-on-surface">{s.name}</span>
                  {s.status === 'recommended' && <span className="font-mono text-[9px] uppercase px-1.5 py-0.5 bg-success/15 text-success flex items-center gap-1"><Flag className="w-2.5 h-2.5" /> recomendado</span>}
                </div>
                {s.summary && <div className="text-[12px] text-on-surface-variant leading-snug">{s.summary}</div>}
                <div className="text-[11px] text-muted mt-1.5">{[s.landing, s.checkout, s.delivery].filter(Boolean).join(' → ')}</div>
              </div>
            ))}
          </div>
          {cenarioRecomendado == null && ws.scenarios.length > 0 && (
            <div className="text-[11px] text-muted mt-3">Nenhum cenário marcado como recomendado no banco.</div>
          )}
        </Bloco>

        {/* Assets + registros de criação */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
          <Bloco titulo="Assets do produto" count={ws.assets.length}>
            {ws.assets.length === 0 ? <div className="text-sm text-muted italic">Nenhum asset registrado.</div> : (
              <div className="space-y-2">
                {ws.assets.map((a) => (
                  <div key={a.id} className="flex items-center gap-2.5">
                    <FileText className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="text-sm text-on-surface truncate">{a.title}</span>
                    {a.is_primary && <span className="font-mono text-[9px] uppercase px-1.5 bg-secondary/15 text-secondary shrink-0">primário</span>}
                    <span className="ml-auto font-mono text-[10px] text-muted shrink-0">{a.asset_type} · {a.status}</span>
                    {a.file_url && <a href={a.file_url} target="_blank" rel="noreferrer" className="text-secondary shrink-0" title="Abrir"><ExternalLink className="w-3 h-3" /></a>}
                  </div>
                ))}
              </div>
            )}
          </Bloco>

          <Bloco titulo="Registros de criação" count={ws.creation_records.length}>
            {ws.creation_records.length === 0 ? <div className="text-sm text-muted italic">Nenhum registro.</div> : (
              <div className="space-y-2">
                {ws.creation_records.map((r) => (
                  <div key={r.id} className="flex items-center gap-2.5">
                    <BookOpen className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="text-sm text-on-surface truncate">{r.title}</span>
                    <span className="ml-auto font-mono text-[10px] text-muted shrink-0">{r.record_type} · {r.status}</span>
                    {r.external_url && <a href={r.external_url} target="_blank" rel="noreferrer" className="text-secondary shrink-0" title="Abrir"><ExternalLink className="w-3 h-3" /></a>}
                  </div>
                ))}
              </div>
            )}
          </Bloco>
        </div>

        {p.notes && (
          <Bloco titulo="Notas do produto">
            <div className="text-[13px] text-on-surface-variant leading-relaxed whitespace-pre-line">{p.notes}</div>
          </Bloco>
        )}

        <div className="text-[11px] text-muted">
          Fonte: <span className="font-mono">academy.products</span> + assets/cenários/questões/checklist (vivo) · atualizado em {new Date(ws.updated_at).toLocaleString('pt-BR')}.
        </div>
      </div>
    </div>
  );
}
