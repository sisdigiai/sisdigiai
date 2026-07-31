/**
 * Semana — scorecard semanal com metas + ritual de revisão (2026-07-30).
 * A peça que faltava vs. mercado (EOS/Traction): números com META e DONO,
 * e um ritual de 20 minutos que roda a semana em sequência.
 * Leitura: v_ops_scorecard · escrita: fn_scorecard_set (is_staff).
 */
import { useEffect, useMemo, useState } from 'react';
import { CalendarCheck, CheckCircle2, ChevronRight, Target, XCircle } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { supabase } from '../lib/supabase';
import { roadmapStore } from '../lib/roadmapStore';
import { backlogStore } from '../lib/backlogStore';
import type { ModuleId } from '../components/Sidebar';

interface ScoreRow {
  metric_id: string; slug: string; label: string; owner: string;
  target: number; direction: '>=' | '<='; unit: string | null; hint: string | null;
  sort_order: number; week_start: string | null; value: number | null; note: string | null;
}

interface Metrica {
  slug: string; label: string; owner: string; target: number;
  direction: '>=' | '<='; unit: string | null; hint: string | null;
  atual: number | null; anterior: number | null;
}

// Segunda-feira da semana de `d`, em YYYY-MM-DD (fuso local)
function mondayOf(d: Date): string {
  const x = new Date(d);
  const day = (x.getDay() + 6) % 7; // 0 = segunda
  x.setDate(x.getDate() - day);
  return `${x.getFullYear()}-${String(x.getMonth() + 1).padStart(2, '0')}-${String(x.getDate()).padStart(2, '0')}`;
}

function bateMeta(m: Metrica): boolean | null {
  if (m.atual == null) return null;
  return m.direction === '>=' ? m.atual >= m.target : m.atual <= m.target;
}

export default function Semana({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  const semana = useMemo(() => mondayOf(new Date()), []);
  const semanaAnterior = useMemo(() => {
    const d = new Date(semana + 'T12:00:00');
    d.setDate(d.getDate() - 7);
    return mondayOf(d);
  }, [semana]);

  const [metricas, setMetricas] = useState<Metrica[]>([]);
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [salvando, setSalvando] = useState<string | null>(null);
  const [ritual, setRitual] = useState<{ fase: number | null; atrasadas: number; p12: number; demosNovos: number } | null>(null);

  const carregar = async () => {
    const { data } = await supabase.from('v_ops_scorecard').select('*');
    const rows = (data ?? []) as ScoreRow[];
    const porSlug = new Map<string, Metrica>();
    for (const r of rows) {
      if (!porSlug.has(r.slug)) {
        porSlug.set(r.slug, {
          slug: r.slug, label: r.label, owner: r.owner, target: Number(r.target),
          direction: r.direction, unit: r.unit, hint: r.hint, atual: null, anterior: null,
        });
      }
      const m = porSlug.get(r.slug)!;
      if (r.week_start === semana) m.atual = r.value == null ? null : Number(r.value);
      if (r.week_start === semanaAnterior) m.anterior = r.value == null ? null : Number(r.value);
    }
    setMetricas([...porSlug.values()]);
  };

  useEffect(() => {
    carregar();
    (async () => {
      const hoje = new Date().toISOString().slice(0, 10);
      const [fases, tarefas, backlog, demos] = await Promise.all([
        roadmapStore.listPhases().catch(() => []),
        roadmapStore.listTasks().catch(() => []),
        backlogStore.list().catch(() => []),
        supabase.from('v_marketing_landing_leads').select('id', { count: 'exact', head: true }).eq('status', 'novo').then(r => r.count ?? 0, () => 0),
      ]);
      const fase = fases.find((f: { started_at: string | null; completed_at: string | null; phase_number: number }) => f.started_at && !f.completed_at)?.phase_number ?? null;
      const atrasadas = tarefas.filter(t => !t.completed_at && t.target_date && t.target_date < hoje).length;
      const p12 = backlog.filter(b => (b.status === 'pending' || b.status === 'in_progress' || b.status === 'blocked') && b.priority <= 2).length;
      setRitual({ fase, atrasadas, p12, demosNovos: demos });
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const salvar = async (slug: string) => {
    const raw = drafts[slug];
    if (raw == null || raw.trim() === '') return;
    const valor = Number(raw.replace(',', '.'));
    if (Number.isNaN(valor)) return;
    setSalvando(slug);
    try {
      const { error } = await supabase.rpc('fn_scorecard_set', { p_slug: slug, p_week_start: semana, p_value: valor });
      if (!error) {
        setDrafts(d => ({ ...d, [slug]: '' }));
        await carregar();
      }
    } finally {
      setSalvando(null);
    }
  };

  const verdes = metricas.filter(m => bateMeta(m) === true).length;
  const preenchidas = metricas.filter(m => m.atual != null).length;
  const fmtSemana = new Date(semana + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });

  const estacoes = ritual ? [
    { label: 'Roadmap — fase e atrasos', valor: `Fase ${ritual.fase ?? '—'} · ${ritual.atrasadas} tarefa(s) atrasada(s)`, alerta: ritual.atrasadas > 0, modulo: 'trilha' as ModuleId },
    { label: 'Backlog — críticos abertos (P1/P2)', valor: `${ritual.p12} item(ns)`, alerta: ritual.p12 > 0, modulo: 'backlog' as ModuleId },
    { label: 'Comercial — leads de demo sem resposta', valor: `${ritual.demosNovos} novo(s)`, alerta: ritual.demosNovos > 0, modulo: 'comercial' as ModuleId },
  ] : [];

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <PageHeader
        eyebrow="Cadência"
        title="Semana"
        subtitle={`Semana de ${fmtSemana} · scorecard ${preenchidas}/${metricas.length} preenchido · ${verdes} verde(s)`}
      />

      {/* Scorecard com metas */}
      <div className="border border-outline/10 bg-surface-low">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-outline/10">
          <Target className="w-4 h-4 text-secondary" />
          <span className="text-xs font-mono uppercase tracking-widest text-muted">Scorecard da semana · meta × real</span>
          <span className="ml-auto text-[10px] font-mono text-muted">nº que não bate meta 2 semanas seguidas = conversa séria</span>
        </div>
        <div className="divide-y divide-outline/10">
          {metricas.map(m => {
            const ok = bateMeta(m);
            return (
              <div key={m.slug} className="px-5 py-3 grid grid-cols-[1fr_auto_auto_auto] items-center gap-4">
                <div>
                  <div className="text-sm text-on-surface">{m.label}</div>
                  <div className="text-[11px] text-muted">{m.hint} · dono: {m.owner} · semana passada: <span className="tabular-nums">{m.anterior ?? '—'}</span></div>
                </div>
                <div className="text-right">
                  <div className="text-[10px] font-mono uppercase text-muted">meta</div>
                  <div className="text-sm tabular-nums text-on-surface-variant">{m.direction === '<=' ? '≤ ' : '≥ '}{m.target}{m.unit === '%' ? '%' : ''}</div>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text" inputMode="decimal"
                    value={drafts[m.slug] ?? ''}
                    onChange={e => setDrafts(d => ({ ...d, [m.slug]: e.target.value }))}
                    onKeyDown={e => { if (e.key === 'Enter') salvar(m.slug); }}
                    placeholder={m.atual != null ? String(m.atual) : '—'}
                    className="w-20 bg-surface-lowest border border-outline/20 px-2 py-1.5 text-sm text-right tabular-nums text-on-surface focus:border-action/60 outline-none"
                  />
                  <button
                    onClick={() => salvar(m.slug)}
                    disabled={salvando === m.slug || !(drafts[m.slug] ?? '').trim()}
                    className="text-[11px] font-mono uppercase px-2 py-1.5 border border-outline/20 text-on-surface-variant hover:border-action/50 disabled:opacity-40 transition-colors"
                  >
                    {salvando === m.slug ? '...' : 'ok'}
                  </button>
                </div>
                <div className="w-8 text-center">
                  {ok === true && <CheckCircle2 className="w-5 h-5 text-success inline" />}
                  {ok === false && <XCircle className="w-5 h-5 text-danger inline" />}
                  {ok === null && <span className="text-muted text-sm">—</span>}
                </div>
              </div>
            );
          })}
          {metricas.length === 0 && (
            <div className="px-5 py-6 text-sm text-muted">Carregando métricas…</div>
          )}
        </div>
      </div>

      {/* Ritual de revisão — 20 minutos, na ordem */}
      <div className="border border-outline/10 bg-surface-low">
        <div className="flex items-center gap-2 px-5 py-3 border-b border-outline/10">
          <CalendarCheck className="w-4 h-4 text-secondary" />
          <span className="text-xs font-mono uppercase tracking-widest text-muted">Ritual de revisão · roda a semana em 20 min</span>
        </div>
        <div className="divide-y divide-outline/10">
          <div className="px-5 py-3 flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted w-5">1.</span>
            <span className="text-sm text-on-surface flex-1">Preencher o scorecard acima — número real, sem enfeite</span>
            <span className="text-[11px] font-mono text-muted tabular-nums">{preenchidas}/{metricas.length}</span>
          </div>
          {estacoes.map((e, i) => (
            <button
              key={e.label}
              onClick={() => onNavigate?.(e.modulo)}
              className="w-full px-5 py-3 flex items-center gap-3 text-left hover:bg-surface transition-colors"
            >
              <span className="font-mono text-[11px] text-muted w-5">{i + 2}.</span>
              <span className="text-sm text-on-surface flex-1">{e.label}</span>
              <span className={`text-[11px] font-mono tabular-nums ${e.alerta ? 'text-warning' : 'text-muted'}`}>{e.valor}</span>
              <ChevronRight className="w-4 h-4 text-muted" />
            </button>
          ))}
          <div className="px-5 py-3 flex items-center gap-3">
            <span className="font-mono text-[11px] text-muted w-5">5.</span>
            <span className="text-sm text-on-surface flex-1">Escolher a prioridade única da próxima semana e registrar em Decisões se mudar algo estrutural</span>
            <button onClick={() => onNavigate?.('decisoes')} className="text-[11px] font-mono text-secondary hover:underline">Decisões →</button>
          </div>
        </div>
      </div>

      <p className="text-[11px] font-mono text-muted">
        Padrão EOS/Traction adaptado: poucas métricas, com meta e dono, revisadas toda semana. Métricas editáveis em ops.scorecard_metrics.
      </p>
    </div>
  );
}
