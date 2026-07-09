import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Briefcase, Pencil, X, Play, FileText } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { commercialStore, type CommercialLead, type LeadStage } from '../lib/commercialStore';
import { playbookStore, type Playbook } from '../lib/playbookStore';
import { meetingStore, type MeetingSession } from '../lib/meetingStore';
import { proposalStore, type Proposal } from '../lib/proposalStore';
import MeetingRunner from './comercial/MeetingRunner';
import ProposalEditor from './comercial/ProposalEditor';
import { proposalFromMeeting } from './comercial/proposalGen';

const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'lead', label: 'Lead', color: '#6b7280' },
  { key: 'contato', label: 'Contato', color: '#3b82f6' },
  { key: 'demo', label: 'Demo', color: '#8b5cf6' },
  { key: 'piloto', label: 'Piloto', color: '#f59e0b' },
  { key: 'cliente', label: 'Cliente', color: '#10b981' },
  { key: 'perdido', label: 'Perdido', color: '#ef4444' },
];

const PRODUCTS = ['clearix', 'osi', 'academy', 'outro'];

const emptyLead = (): CommercialLead => ({
  name: '', company: '', product: 'clearix', stage: 'lead',
  source: '', contact: '', value_brl: null, owner: '', next_step: '', notes: '',
});

const brl = (v: number | null) =>
  v != null ? `R$ ${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '—';

const dt = (s?: string) => (s ? new Date(s).toLocaleDateString('pt-BR') : '—');

export default function Comercial() {
  const [leads, setLeads] = useState<CommercialLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<CommercialLead | null>(null);
  const [tab, setTab] = useState<'pipeline' | 'reunioes' | 'propostas'>('pipeline');
  const [playbooks, setPlaybooks] = useState<Playbook[]>([]);
  const [meetings, setMeetings] = useState<MeetingSession[]>([]);
  const [proposals, setProposals] = useState<Proposal[]>([]);
  const [runner, setRunner] = useState<{ lead: CommercialLead | null } | null>(null);
  const [proposalEditor, setProposalEditor] = useState<{ proposal: Proposal; lead: CommercialLead | null } | null>(null);

  const load = () => {
    commercialStore.list().then((rows) => { setLeads(rows); setLoading(false); });
    playbookStore.list().then(setPlaybooks);
    meetingStore.list().then(setMeetings);
    proposalStore.list().then(setProposals);
  };
  useEffect(load, []);

  const kpis = useMemo(() => {
    const byStage = (s: LeadStage) => leads.filter((l) => l.stage === s).length;
    const openValue = leads
      .filter((l) => l.stage !== 'perdido' && l.stage !== 'cliente')
      .reduce((sum, l) => sum + (l.value_brl || 0), 0);
    return { total: leads.length, pilotos: byStage('piloto'), clientes: byStage('cliente'), openValue };
  }, [leads]);

  const save = async () => {
    if (!editing || !editing.company.trim()) return;
    await commercialStore.upsert(editing);
    setEditing(null);
    load();
  };

  const moveStage = async (lead: CommercialLead, stage: LeadStage) => {
    await commercialStore.upsert({ ...lead, stage });
    load();
  };

  const remove = async (id?: string) => {
    if (!id) return;
    await commercialStore.remove(id);
    load();
  };

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <PageHeader
        eyebrow="Operacional · pipeline"
        title="Comercial"
        subtitle="Pipeline de aquisição — leads, demos, pilotos e clientes do ecossistema. Foco atual: 3-5 óticas piloto do Clearix."
      >
        <div className="mt-4 flex items-center gap-2">
          <button onClick={() => setEditing(emptyLead())} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-secondary text-on-secondary hover:opacity-90 transition">
            <Plus className="w-4 h-4" /> Novo lead
          </button>
          <button onClick={() => setRunner({ lead: null })} className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium border border-outline/20 text-on-surface hover:bg-surface-low transition">
            <Play className="w-4 h-4 text-secondary" /> Iniciar reunião
          </button>
        </div>
      </PageHeader>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-outline/10 mb-6">
        {([['pipeline', 'Pipeline'], ['reunioes', `Reuniões (${meetings.length})`], ['propostas', `Propostas (${proposals.length})`]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`px-3 py-2 text-sm -mb-px border-b-2 transition ${tab === k ? 'border-secondary text-on-surface font-medium' : 'border-transparent text-muted hover:text-on-surface'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'pipeline' && (
        <>
          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Total no pipeline', value: kpis.total },
              { label: 'Pilotos ativos', value: kpis.pilotos },
              { label: 'Clientes', value: kpis.clientes },
              { label: 'Valor em aberto', value: brl(kpis.openValue) },
            ].map((k) => (
              <div key={k.label} className="border border-outline/10 bg-surface-low p-4">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{k.label}</div>
                <div className="text-xl font-semibold tabular-nums text-on-surface mt-1">{k.value}</div>
              </div>
            ))}
          </div>

          {loading ? (
            <div className="text-sm text-muted">Carregando pipeline…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
              {STAGES.map((stage) => {
                const items = leads.filter((l) => l.stage === stage.key);
                return (
                  <div key={stage.key} className="border border-outline/10 bg-surface-low/50 min-h-[120px]">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-outline/10">
                      <span className="w-2 h-2" style={{ background: stage.color }} />
                      <span className="text-xs font-semibold text-on-surface">{stage.label}</span>
                      <span className="ml-auto text-[10px] font-mono text-muted tabular-nums">{items.length}</span>
                    </div>
                    <div className="p-2 space-y-2">
                      {items.length === 0 && <div className="text-[11px] text-muted italic px-1 py-2">—</div>}
                      {items.map((lead) => (
                        <div key={lead.id} className="border border-outline/10 bg-surface-low p-2.5 space-y-1.5 group">
                          <div className="flex items-start justify-between gap-1">
                            <span className="text-sm font-medium text-on-surface leading-tight">{lead.company}</span>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition">
                              <button onClick={() => setRunner({ lead })} aria-label="Iniciar reunião" title="Iniciar reunião" className="text-muted hover:text-secondary">
                                <Play className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setProposalEditor({ proposal: proposalFromMeeting(null, lead), lead })} aria-label="Gerar proposta" title="Gerar proposta" className="text-muted hover:text-secondary">
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => setEditing(lead)} aria-label="Editar" className="text-muted hover:text-on-surface">
                                <Pencil className="w-3.5 h-3.5" />
                              </button>
                              <button onClick={() => remove(lead.id)} aria-label="Excluir" className="text-muted hover:text-danger">
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                          {lead.name && <div className="text-[11px] text-on-surface-variant">{lead.name}</div>}
                          <div className="flex items-center gap-2 flex-wrap">
                            {lead.product && (
                              <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-surface-high text-muted">{lead.product}</span>
                            )}
                            {lead.value_brl != null && (
                              <span className="text-[10px] font-mono tabular-nums text-on-surface-variant">{brl(lead.value_brl)}</span>
                            )}
                          </div>
                          {lead.next_step && <div className="text-[10px] text-muted leading-snug">→ {lead.next_step}</div>}
                          <select
                            value={lead.stage}
                            onChange={(e) => moveStage(lead, e.target.value as LeadStage)}
                            className="w-full text-[10px] bg-surface-high border border-outline/10 px-1.5 py-1 text-on-surface-variant mt-1"
                          >
                            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {tab === 'reunioes' && (
        <div className="space-y-2">
          {meetings.length === 0 ? (
            <div className="text-sm text-muted">Nenhuma reunião registrada ainda. Clique em <span className="text-on-surface">Iniciar reunião</span> num lead pra rodar o playbook e registrar o desfecho.</div>
          ) : (
            meetings.map((m) => (
              <div key={m.id} className="border border-outline/10 bg-surface-low p-3 flex flex-wrap items-start gap-x-4 gap-y-1">
                <span className="text-[11px] font-mono tabular-nums text-muted w-20">{dt(m.started_at)}</span>
                <div className="min-w-0 flex-1">
                  <span className="text-sm font-medium text-on-surface">{m.lead_company ?? 'Avulsa'}</span>
                  {m.playbook_name && <span className="text-[11px] text-muted ml-2">{m.playbook_name}</span>}
                  {m.pain_noted && <div className="text-xs text-on-surface-variant mt-0.5">Dor: {m.pain_noted}</div>}
                  {m.outcome && <div className="text-xs text-muted mt-0.5">{m.outcome}</div>}
                  {m.next_action && <div className="text-[11px] text-secondary mt-0.5">→ {m.next_action}{m.follow_up_date ? ` (${dt(m.follow_up_date)})` : ''}</div>}
                  {(m.interest_plan || (m.interest_apps?.length ?? 0) > 0) && (
                    <div className="text-[10px] text-muted mt-0.5">Interesse: {m.interest_plan ?? ''}{m.interest_apps?.length ? ` · ${m.interest_apps.join(', ')}` : ''}</div>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {m.stage_changed_to && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-surface-high text-muted">{m.stage_changed_to}</span>}
                  {m.effectiveness ? <span className="text-[10px] font-mono text-warning">{'★'.repeat(m.effectiveness)}</span> : null}
                  <button onClick={() => { const l = leads.find((x) => x.id === m.lead_id) ?? null; setProposalEditor({ proposal: proposalFromMeeting(m, l), lead: l }); }} title="Gerar proposta" className="text-muted hover:text-secondary"><FileText className="w-3.5 h-3.5" /></button>
                  <button onClick={async () => { if (m.id) { await meetingStore.remove(m.id); load(); } }} aria-label="Excluir" className="text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {tab === 'propostas' && (
        <div className="space-y-2">
          {proposals.length === 0 ? (
            <div className="text-sm text-muted">Nenhuma proposta ainda. Gere uma a partir de um lead (ícone de documento no card) ou de uma reunião.</div>
          ) : proposals.map((pr) => (
            <div key={pr.id} className="border border-outline/10 bg-surface-low p-3 flex flex-wrap items-center gap-x-4 gap-y-1">
              <div className="min-w-0 flex-1">
                <span className="text-sm font-medium text-on-surface">{pr.title}</span>
                <span className="text-[11px] text-muted ml-2">{pr.lead_company ?? '—'}</span>
                <div className="text-xs text-on-surface-variant mt-0.5">{pr.plan} · R$ {pr.monthly_price?.toLocaleString('pt-BR')}/mês · {pr.discount_pct}% off · {pr.trial_days}d teste</div>
              </div>
              <span className={`text-[9px] font-mono uppercase px-1.5 py-0.5 ${pr.status === 'enviada' ? 'bg-success/15 text-success' : 'bg-surface-high text-muted'}`}>{pr.status}{pr.sent_via ? ` · ${pr.sent_via}` : ''}</span>
              <button onClick={() => setProposalEditor({ proposal: pr, lead: leads.find((l) => l.id === pr.lead_id) ?? null })} title="Abrir" className="text-muted hover:text-on-surface"><FileText className="w-3.5 h-3.5" /></button>
              <button onClick={async () => { if (pr.id) { await proposalStore.remove(pr.id); load(); } }} title="Excluir" className="text-muted hover:text-danger"><Trash2 className="w-3.5 h-3.5" /></button>
            </div>
          ))}
        </div>
      )}

      {/* Runner de reunião */}
      {runner && (
        <MeetingRunner
          lead={runner.lead}
          playbooks={playbooks}
          onClose={() => setRunner(null)}
          onSaved={load}
        />
      )}

      {/* Editor de proposta */}
      {proposalEditor && (
        <ProposalEditor
          initial={proposalEditor.proposal}
          lead={proposalEditor.lead}
          onClose={() => setProposalEditor(null)}
          onSaved={load}
        />
      )}

      {/* Form modal */}
      {editing && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setEditing(null)}>
          <div className="bg-surface-low border border-outline/20 w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-on-surface flex items-center gap-2">
                <Briefcase className="w-4 h-4 text-secondary" /> {editing.id ? 'Editar lead' : 'Novo lead'}
              </h3>
              <button onClick={() => setEditing(null)} aria-label="Fechar" className="text-muted hover:text-on-surface"><X className="w-4 h-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="Empresa / ótica *" value={editing.company} onChange={(v) => setEditing({ ...editing, company: v })} />
              <Field label="Contato (pessoa)" value={editing.name} onChange={(v) => setEditing({ ...editing, name: v })} />
              <SelectField label="Produto" value={editing.product} options={PRODUCTS} onChange={(v) => setEditing({ ...editing, product: v })} />
              <SelectField label="Estágio" value={editing.stage} options={STAGES.map((s) => s.key)} onChange={(v) => setEditing({ ...editing, stage: v as LeadStage })} />
              <Field label="WhatsApp / e-mail" value={editing.contact} onChange={(v) => setEditing({ ...editing, contact: v })} />
              <Field label="Origem" value={editing.source} onChange={(v) => setEditing({ ...editing, source: v })} />
              <Field label="Valor (R$)" value={editing.value_brl != null ? String(editing.value_brl) : ''} onChange={(v) => setEditing({ ...editing, value_brl: v ? Number(v.replace(',', '.')) : null })} />
              <Field label="Responsável" value={editing.owner} onChange={(v) => setEditing({ ...editing, owner: v })} />
            </div>
            <Field label="Próximo passo" value={editing.next_step} onChange={(v) => setEditing({ ...editing, next_step: v })} />
            <Field label="Notas" value={editing.notes} onChange={(v) => setEditing({ ...editing, notes: v })} />
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={() => setEditing(null)} className="px-3 py-2 text-sm text-muted hover:text-on-surface">Cancelar</button>
              <button onClick={save} disabled={!editing.company.trim()} className="px-4 py-2 text-sm font-medium bg-secondary text-on-secondary hover:opacity-90 disabled:opacity-40">Salvar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-surface-high border border-outline/10 px-2.5 py-1.5 text-sm text-on-surface focus:border-secondary/50 outline-none"
      />
    </label>
  );
}

function SelectField({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="text-[10px] font-mono uppercase tracking-widest text-muted">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full mt-1 bg-surface-high border border-outline/10 px-2.5 py-1.5 text-sm text-on-surface capitalize focus:border-secondary/50 outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
