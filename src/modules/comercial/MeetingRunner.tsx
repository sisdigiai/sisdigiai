import { useEffect, useMemo, useRef, useState } from 'react';
import { X, Play, Save, Video, Plus } from 'lucide-react';
import type { CommercialLead, LeadStage } from '../../lib/commercialStore';
import type { Playbook } from '../../lib/playbookStore';
import { meetingStore, type MeetingSession, type ActionItem } from '../../lib/meetingStore';
import PlaybookView from './PlaybookView';

const STAGES: { key: LeadStage; label: string }[] = [
  { key: 'lead', label: 'Lead' },
  { key: 'contatado', label: 'Contatado' },
  { key: 'conversa', label: 'Conversa' },
  { key: 'demo', label: 'Demo' },
  { key: 'piloto', label: 'Piloto' },
  { key: 'cliente', label: 'Cliente' },
  { key: 'perdido', label: 'Perdido' },
];
const PLANS = ['Essencial', 'Controle', 'Crescimento'];
const APPS = ['Vendas', 'Lab', 'Finance', 'Clínica', 'Marketing', 'Fidelidade', 'BI', 'AR'];

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

export default function MeetingRunner({
  lead,
  playbooks,
  onClose,
  onSaved,
}: {
  lead: CommercialLead | null;
  playbooks: Playbook[];
  onClose: () => void;
  onSaved: (session: MeetingSession) => void;
}) {
  const startedAt = useRef(new Date().toISOString());
  const [elapsed, setElapsed] = useState(0);
  const [running, setRunning] = useState(true);
  const [pbId, setPbId] = useState<string>(playbooks[0]?.id ?? '');

  const [pain, setPain] = useState('');
  const [objections, setObjections] = useState<string[]>([]);
  const [interestPlan, setInterestPlan] = useState('');
  const [interestApps, setInterestApps] = useState<string[]>([]);
  const [budgetSignal, setBudgetSignal] = useState('');
  const [quotes, setQuotes] = useState<string[]>([]);
  const [quoteInput, setQuoteInput] = useState('');
  const [actionItems, setActionItems] = useState<ActionItem[]>([]);
  const [actionInput, setActionInput] = useState('');
  const [outcome, setOutcome] = useState('');
  const [stage, setStage] = useState<LeadStage>((lead?.stage as LeadStage) ?? 'demo');
  const [nextAction, setNextAction] = useState('');
  const [followUp, setFollowUp] = useState('');
  const [effectiveness, setEffectiveness] = useState<number>(0);
  const [notes, setNotes] = useState('');
  const [meetUrl, setMeetUrl] = useState('');
  const [saving, setSaving] = useState(false);

  const playbook = useMemo(() => playbooks.find((p) => p.id === pbId) ?? playbooks[0], [playbooks, pbId]);

  useEffect(() => {
    if (!running) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [running]);

  const min = Math.floor(elapsed / 60);
  const currentBlock = (playbook?.agenda ?? []).find((b) => min >= b.from_min && min < b.to_min);

  const toggle = (v: string, list: string[], set: (l: string[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const addQuote = () => { if (quoteInput.trim()) { setQuotes([...quotes, quoteInput.trim()]); setQuoteInput(''); } };
  const addAction = () => { if (actionInput.trim()) { setActionItems([...actionItems, { text: actionInput.trim(), resolved: false }]); setActionInput(''); } };

  const save = async () => {
    setSaving(true);
    const session: MeetingSession = {
      lead_id: lead?.id ?? null,
      playbook_id: playbook?.id ?? null,
      title: playbook?.name ?? 'Reunião',
      started_at: startedAt.current,
      ended_at: new Date().toISOString(),
      duration_min: Math.max(1, Math.round(elapsed / 60)),
      pain_noted: pain,
      objections_raised: objections,
      interest_plan: interestPlan || null,
      interest_apps: interestApps,
      budget_signal: budgetSignal,
      quotes,
      action_items: actionItems,
      outcome,
      stage_changed_to: stage,
      next_action: nextAction,
      follow_up_date: followUp || null,
      effectiveness: effectiveness || null,
      notes,
      meet_url: meetUrl || null,
    };
    const saved = await meetingStore.log(session);
    setSaving(false);
    onSaved(saved ?? session);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline/15 w-full max-w-7xl h-[92vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center gap-3 px-5 py-3 border-b border-outline/10 shrink-0">
          <Play className="w-4 h-4 text-secondary" />
          <div className="min-w-0">
            <div className="text-sm font-bold text-on-surface truncate">
              Modo Reunião{lead ? ` · ${lead.company}` : ' · avulsa'}
            </div>
            <div className="text-[11px] text-muted">{playbook?.name}</div>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={() => { window.open('https://meet.new', '_blank', 'noopener'); }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs border border-outline/20 text-on-surface hover:bg-surface-high transition"
              title="Abre o Google Meet numa aba nova — cole o link no campo da sala"
            >
              <Video className="w-3.5 h-3.5 text-secondary" /> Criar Meet
            </button>
            <button
              onClick={() => setRunning((r) => !r)}
              className="text-2xl font-mono tabular-nums text-secondary hover:opacity-80"
              title={running ? 'Pausar' : 'Retomar'}
            >
              {mmss(elapsed)}
            </button>
            <button onClick={onClose} aria-label="Fechar" className="text-muted hover:text-on-surface"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {currentBlock && (
          <div className="px-5 py-2 bg-secondary/10 border-b border-outline/10 shrink-0">
            <span className="text-[10px] font-mono uppercase text-secondary">Bloco atual</span>
            <span className="text-sm font-medium text-on-surface ml-2">{currentBlock.bloco}</span>
            <span className="text-xs text-muted ml-1">— {currentBlock.foco}</span>
          </div>
        )}

        {/* Body: roteiro (left) + captura (right) */}
        <div className="flex-1 flex min-h-0">
          <div className="flex-1 overflow-y-auto p-5 border-r border-outline/10">
            {playbooks.length > 1 && (
              <select
                value={pbId}
                onChange={(e) => setPbId(e.target.value)}
                className="mb-4 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface"
              >
                {playbooks.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            )}
            {playbook ? <PlaybookView playbook={playbook} /> : <div className="text-sm text-muted">Nenhum playbook cadastrado.</div>}
          </div>

          {/* Captura */}
          <div className="w-[380px] shrink-0 overflow-y-auto p-5 space-y-4 bg-surface-low/60">
            <h4 className="text-[11px] font-mono uppercase tracking-widest text-muted">Registro da reunião</h4>

            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Sala (link do Meet)</span>
              <input value={meetUrl} onChange={(e) => setMeetUrl(e.target.value)} placeholder="cole o link do Meet aqui"
                className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface focus:border-secondary/50 outline-none" />
            </label>

            <Area label="Dor principal (anote o que ouvir)" value={pain} onChange={setPain} rows={3} />

            {(playbook?.objections ?? []).length > 0 && (
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Objeções levantadas</span>
                <div className="mt-1.5 space-y-1">
                  {playbook!.objections.map((o, i) => (
                    <label key={i} className="flex items-start gap-2 text-xs text-on-surface-variant cursor-pointer">
                      <input type="checkbox" checked={objections.includes(o.objecao)} onChange={() => toggle(o.objecao, objections, setObjections)} className="mt-0.5 accent-current" />
                      <span className="leading-snug">{o.objecao}</span>
                    </label>
                  ))}
                </div>
              </div>
            )}

            {/* Escolhas / sinais */}
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Plano de interesse</span>
              <select value={interestPlan} onChange={(e) => setInterestPlan(e.target.value)} className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface">
                <option value="">—</option>
                {PLANS.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </label>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Apps de interesse</span>
              <div className="flex flex-wrap gap-1 mt-1.5">
                {APPS.map((a) => (
                  <button key={a} onClick={() => toggle(a, interestApps, setInterestApps)}
                    className={`text-[11px] px-2 py-0.5 border ${interestApps.includes(a) ? 'bg-secondary text-on-secondary border-secondary' : 'border-outline/20 text-muted hover:text-on-surface'}`}>{a}</button>
                ))}
              </div>
            </div>
            <Line label="Sinal de orçamento" value={budgetSignal} onChange={setBudgetSignal} />

            {/* Citações */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Citações (o que foi dito)</span>
              <div className="flex gap-1 mt-1">
                <input value={quoteInput} onChange={(e) => setQuoteInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addQuote()} placeholder="frase do cliente…"
                  className="flex-1 bg-surface-high border border-outline/15 px-2 py-1.5 text-sm text-on-surface outline-none" />
                <button onClick={addQuote} className="px-2 border border-outline/20 text-secondary hover:bg-surface-high"><Plus className="w-4 h-4" /></button>
              </div>
              {quotes.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {quotes.map((q, i) => (
                    <li key={i} className="flex items-start gap-1.5 text-xs text-on-surface-variant">
                      <span className="text-secondary">“</span><span className="flex-1 leading-snug">{q}”</span>
                      <button onClick={() => setQuotes(quotes.filter((_, j) => j !== i))} className="text-muted hover:text-danger"><X className="w-3 h-3" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <Area label="Desfecho" value={outcome} onChange={setOutcome} rows={2} />

            {/* Análises a resolver */}
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Análises a resolver</span>
              <div className="flex gap-1 mt-1">
                <input value={actionInput} onChange={(e) => setActionInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addAction()} placeholder="pendência / análise…"
                  className="flex-1 bg-surface-high border border-outline/15 px-2 py-1.5 text-sm text-on-surface outline-none" />
                <button onClick={addAction} className="px-2 border border-outline/20 text-secondary hover:bg-surface-high"><Plus className="w-4 h-4" /></button>
              </div>
              {actionItems.length > 0 && (
                <ul className="mt-1.5 space-y-1">
                  {actionItems.map((it, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs">
                      <input type="checkbox" checked={it.resolved} onChange={() => setActionItems(actionItems.map((x, j) => j === i ? { ...x, resolved: !x.resolved } : x))} className="mt-0.5 accent-current" />
                      <span className={`flex-1 leading-snug ${it.resolved ? 'line-through text-muted' : 'text-on-surface-variant'}`}>{it.text}</span>
                      <button onClick={() => setActionItems(actionItems.filter((_, j) => j !== i))} className="text-muted hover:text-danger"><X className="w-3 h-3" /></button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Novo estágio do lead</span>
              <select value={stage} onChange={(e) => setStage(e.target.value as LeadStage)} className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface">
                {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
            </label>

            <Line label="Próximo passo" value={nextAction} onChange={setNextAction} />
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Data do follow-up</span>
              <input type="date" value={followUp} onChange={(e) => setFollowUp(e.target.value)} className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface" />
            </label>

            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Efetividade do playbook</span>
              <div className="flex gap-1 mt-1.5">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} onClick={() => setEffectiveness(n)} className={`w-8 h-8 text-sm border ${effectiveness >= n ? 'bg-secondary text-on-secondary border-secondary' : 'border-outline/20 text-muted hover:text-on-surface'}`}>{n}</button>
                ))}
              </div>
            </div>

            <Area label="Notas" value={notes} onChange={setNotes} rows={2} />

            <button onClick={save} disabled={saving} className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 text-sm font-medium bg-secondary text-on-secondary hover:opacity-90 disabled:opacity-40">
              <Save className="w-4 h-4" /> {saving ? 'Salvando…' : 'Encerrar e registrar'}
            </button>
            {lead && <p className="text-[10px] text-muted text-center">Atualiza o estágio e o próximo passo do lead. Depois você gera a proposta na aba Reuniões.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function Area({ label, value, onChange, rows }: { label: string; value: string; onChange: (v: string) => void; rows: number }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} rows={rows} className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface focus:border-secondary/50 outline-none resize-none" />
    </label>
  );
}

function Line({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</span>
      <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface focus:border-secondary/50 outline-none" />
    </label>
  );
}
