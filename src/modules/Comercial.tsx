import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Briefcase, Pencil, X, Play, FileText, Search, Target, AlertTriangle, Clock } from 'lucide-react';
import PageHeader from '../components/PageHeader';
import { commercialStore, type CommercialLead, type LeadStage, type OutreachItem } from '../lib/commercialStore';
import { playbookStore, type Playbook } from '../lib/playbookStore';
import { meetingStore, type MeetingSession } from '../lib/meetingStore';
import { proposalStore, type Proposal } from '../lib/proposalStore';
import { roadmapStore, type RoadmapPhase } from '../lib/roadmapStore';
import MeetingRunner from './comercial/MeetingRunner';
import ProposalEditor from './comercial/ProposalEditor';
import { proposalFromMeeting } from './comercial/proposalGen';

// Funil real do banco: lead → contatado → conversa → demo → piloto → cliente/perdido
const STAGES: { key: LeadStage; label: string; color: string }[] = [
  { key: 'lead', label: 'Lead', color: 'var(--color-muted)' },
  { key: 'contatado', label: 'Contatado', color: 'var(--color-info)' },
  { key: 'conversa', label: 'Conversa', color: 'var(--color-secondary)' },
  { key: 'demo', label: 'Demo', color: 'var(--color-action)' },
  { key: 'piloto', label: 'Piloto', color: 'var(--color-warning)' },
  { key: 'cliente', label: 'Cliente', color: 'var(--color-success)' },
  { key: 'perdido', label: 'Perdido', color: 'var(--color-danger)' },
];

const COL_CAP = 8; // cards visíveis por coluna antes do "+N mais" (232 leads numa coluna só = inutilizável)

function diasParado(updatedAt?: string): number | null {
  if (!updatedAt) return null;
  return Math.floor((Date.now() - new Date(updatedAt).getTime()) / 86400000);
}

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
  const [busca, setBusca] = useState('');
  const [filtroProduto, setFiltroProduto] = useState<string>('todos');
  const [expandidas, setExpandidas] = useState<Set<LeadStage>>(new Set());
  const [faseAtual, setFaseAtual] = useState<RoadmapPhase | null>(null);
  const [outreach, setOutreach] = useState<OutreachItem[]>([]);

  const load = () => {
    commercialStore.list().then((rows) => { setLeads(rows); setLoading(false); });
    playbookStore.list().then(setPlaybooks);
    meetingStore.list().then(setMeetings);
    proposalStore.list().then(setProposals);
    commercialStore.listOutreach().then(setOutreach);
    roadmapStore.listPhases().then((ps) => setFaseAtual(ps.find((p) => !p.completed_at && p.started_at) ?? null));
  };
  useEffect(load, []);

  const visiveis = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return leads.filter((l) =>
      (filtroProduto === 'todos' || l.product === filtroProduto) &&
      (q === '' || l.company.toLowerCase().includes(q) || (l.name || '').toLowerCase().includes(q) || (l.source || '').toLowerCase().includes(q))
    );
  }, [leads, busca, filtroProduto]);

  const kpis = useMemo(() => {
    const byStage = (s: LeadStage) => leads.filter((l) => l.stage === s).length;
    const contatados = leads.filter((l) => l.stage !== 'lead' && l.stage !== 'perdido').length;
    const openValue = leads
      .filter((l) => l.stage !== 'perdido' && l.stage !== 'cliente')
      .reduce((sum, l) => sum + (l.value_brl || 0), 0);
    return { total: leads.length, contatados, emConversa: byStage('conversa') + byStage('demo'), pilotos: byStage('piloto'), clientes: byStage('cliente'), openValue };
  }, [leads]);

  // Painel de ação: o que precisa de atenção HOJE
  const acao = useMemo(() => {
    const hoje = new Date().toISOString().slice(0, 10);
    const followupsVencidos = meetings.filter((m) => m.follow_up_date && m.follow_up_date <= hoje && m.next_action);
    const trabalhados = leads.filter((l) => ['contatado', 'conversa', 'demo', 'piloto'].includes(l.stage));
    const parados = trabalhados
      .map((l) => ({ lead: l, dias: diasParado(l.updated_at) ?? 0 }))
      .filter((x) => x.dias >= 7)
      .sort((a, b) => b.dias - a.dias);
    const semNextStep = trabalhados.filter((l) => !l.next_step?.trim()).length;
    // Esteira de prospecção (outreach WhatsApp): agendados que passaram da data
    const outreachVencido = outreach.filter((o) => o.status === 'agendado' && o.scheduled_date < hoje);
    const outreachPorKind = outreachVencido.reduce<Record<string, number>>((acc, o) => {
      acc[o.kind] = (acc[o.kind] || 0) + 1;
      return acc;
    }, {});
    const outreachDatas = outreachVencido.length > 0
      ? { de: outreachVencido[0].scheduled_date, ate: outreachVencido[outreachVencido.length - 1].scheduled_date }
      : null;
    return { followupsVencidos, parados, semNextStep, outreachVencido, outreachPorKind, outreachDatas };
  }, [meetings, leads, outreach]);

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
          {/* Meta da fase — o Comercial existe pra cumprir o gate do Roadmap */}
          {faseAtual && (
            <div className="border border-secondary/40 bg-secondary-container/20 p-4 mb-5 flex items-start gap-3 flex-wrap">
              <Target className="w-4 h-4 text-secondary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <div className="font-mono text-[10px] uppercase tracking-widest text-secondary">Meta da Fase {faseAtual.phase_number} · {faseAtual.nome}</div>
                <div className="text-sm text-on-surface mt-0.5">{faseAtual.metrica_unica}</div>
              </div>
              <div className="flex items-center gap-4 shrink-0">
                <div className="text-center">
                  <div className="font-serif text-2xl font-semibold tabular-nums text-warning">{kpis.pilotos}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted">pilotos</div>
                </div>
                <div className="text-center">
                  <div className="font-serif text-2xl font-semibold tabular-nums text-success">{kpis.clientes}</div>
                  <div className="font-mono text-[9px] uppercase tracking-wider text-muted">clientes</div>
                </div>
              </div>
            </div>
          )}

          {/* Ação hoje — follow-ups vencidos + leads esfriando + esteira de prospecção parada */}
          {(acao.followupsVencidos.length > 0 || acao.parados.length > 0 || acao.semNextStep > 0 || acao.outreachVencido.length > 0) && (
            <div className="border border-warning/30 bg-warning/5 mb-5">
              <div className="px-4 py-2 border-b border-warning/20 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-warning" />
                <span className="font-mono text-[10px] uppercase tracking-widest text-warning">Ação hoje</span>
                {acao.semNextStep > 0 && <span className="ml-auto font-mono text-[10px] text-muted">{acao.semNextStep} trabalhado(s) sem próximo passo</span>}
              </div>
              <div className="divide-y divide-outline/10">
                {acao.outreachVencido.length > 0 && acao.outreachDatas && (
                  <div className="flex items-center gap-3 px-4 py-2 bg-danger/5">
                    <AlertTriangle className="w-3.5 h-3.5 text-danger shrink-0" />
                    <span className="text-sm text-on-surface flex-1">
                      Esteira de prospecção parada: <strong>{acao.outreachVencido.length} mensagens agendadas vencidas</strong>
                      {' '}({dt(acao.outreachDatas.de)} – {dt(acao.outreachDatas.ate)}) — {Object.entries(acao.outreachPorKind).map(([k, n]) => `${n} ${k.replace('_', ' ')}`).join(' · ')}
                    </span>
                    <span className="font-mono text-[9px] uppercase text-muted shrink-0">marketing.outreach_schedule</span>
                  </div>
                )}
                {acao.followupsVencidos.slice(0, 5).map((m) => (
                  <div key={m.id} className="flex items-center gap-3 px-4 py-2">
                    <span className="font-mono text-[10px] text-danger shrink-0">{dt(m.follow_up_date ?? undefined)}</span>
                    <span className="text-sm text-on-surface truncate flex-1">{m.lead_company ?? 'Avulsa'} — {m.next_action}</span>
                    <span className="font-mono text-[9px] uppercase text-muted shrink-0">follow-up vencido</span>
                  </div>
                ))}
                {acao.parados.slice(0, 5).map(({ lead, dias }) => (
                  <div key={lead.id} className="flex items-center gap-3 px-4 py-2">
                    <span className={`font-mono text-[10px] shrink-0 ${dias >= 14 ? 'text-danger' : 'text-warning'}`}>{dias}d parado</span>
                    <span className="text-sm text-on-surface truncate flex-1">{lead.company}{lead.next_step ? ` — → ${lead.next_step}` : ''}</span>
                    <button onClick={() => setEditing(lead)} className="font-mono text-[9px] uppercase text-secondary hover:underline shrink-0">retomar</button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* KPIs — o funil em números */}
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3 mb-5">
            {[
              { label: 'Base total', value: kpis.total },
              { label: 'Contatados', value: kpis.contatados },
              { label: 'Conversa + demo', value: kpis.emConversa },
              { label: 'Pilotos', value: kpis.pilotos },
              { label: 'Clientes', value: kpis.clientes },
              { label: 'Valor em aberto', value: brl(kpis.openValue) },
            ].map((k) => (
              <div key={k.label} className="border border-outline/10 bg-surface-low p-3">
                <div className="text-[10px] font-mono uppercase tracking-widest text-muted">{k.label}</div>
                <div className="text-xl font-semibold tabular-nums text-on-surface mt-1">{k.value}</div>
              </div>
            ))}
          </div>

          {/* Busca + filtro por produto */}
          <div className="flex flex-wrap items-center gap-3 mb-5">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-2.5 top-2" />
              <input
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Buscar ótica, contato ou origem…"
                className="bg-surface-container border border-outline/15 pl-8 pr-3 py-1.5 text-sm text-on-surface w-64 focus:outline-none focus:border-secondary/40"
              />
            </div>
            <div className="flex gap-1">
              {['todos', ...PRODUCTS].map((p) => (
                <button key={p} onClick={() => setFiltroProduto(p)} className={`px-2.5 py-1 text-xs font-medium capitalize transition-colors ${filtroProduto === p ? 'bg-secondary-container/40 text-on-surface border border-secondary/40' : 'bg-surface-high text-muted hover:text-on-surface'}`}>
                  {p}
                </button>
              ))}
            </div>
            {busca && <span className="font-mono text-[10px] text-muted">{visiveis.length} resultado(s)</span>}
          </div>

          {loading ? (
            <div className="text-sm text-muted">Carregando pipeline…</div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3">
              {STAGES.map((stage) => {
                const all = visiveis.filter((l) => l.stage === stage.key);
                const aberta = expandidas.has(stage.key) || busca !== '';
                const items = aberta ? all : all.slice(0, COL_CAP);
                return (
                  <div key={stage.key} className="border border-outline/10 bg-surface-low/50 min-h-[120px]">
                    <div className="flex items-center gap-2 px-3 py-2 border-b border-outline/10">
                      <span className="w-2 h-2" style={{ background: stage.color }} />
                      <span className="text-xs font-semibold text-on-surface">{stage.label}</span>
                      <span className="ml-auto text-[10px] font-mono text-muted tabular-nums">{all.length}</span>
                    </div>
                    <div className="p-2 space-y-2">
                      {all.length === 0 && <div className="text-[11px] text-muted italic px-1 py-2">—</div>}
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
                          {(() => {
                            const d = diasParado(lead.updated_at);
                            if (d != null && d >= 7 && !['lead', 'cliente', 'perdido'].includes(lead.stage)) {
                              return <div className={`text-[9px] font-mono uppercase tracking-wider ${d >= 14 ? 'text-danger' : 'text-warning'}`}>parado há {d}d</div>;
                            }
                            return null;
                          })()}
                          <select
                            value={lead.stage}
                            onChange={(e) => moveStage(lead, e.target.value as LeadStage)}
                            className="w-full text-[10px] bg-surface-high border border-outline/15 px-1.5 py-1 text-on-surface-variant mt-1"
                          >
                            {STAGES.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
                          </select>
                        </div>
                      ))}
                      {all.length > COL_CAP && !aberta && (
                        <button
                          onClick={() => setExpandidas((prev) => new Set(prev).add(stage.key))}
                          className="w-full text-[10px] font-mono uppercase tracking-wider text-secondary hover:bg-surface-high py-1.5 transition-colors"
                        >
                          + {all.length - COL_CAP} mais
                        </button>
                      )}
                      {aberta && all.length > COL_CAP && busca === '' && (
                        <button
                          onClick={() => setExpandidas((prev) => { const n = new Set(prev); n.delete(stage.key); return n; })}
                          className="w-full text-[10px] font-mono uppercase tracking-wider text-muted hover:bg-surface-high py-1.5 transition-colors"
                        >
                          recolher
                        </button>
                      )}
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
          <div className="bg-surface-container border border-outline/15 w-full max-w-lg p-5 space-y-3" onClick={(e) => e.stopPropagation()}>
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
        className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface focus:border-secondary/50 outline-none"
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
        className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface capitalize focus:border-secondary/50 outline-none"
      >
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </label>
  );
}
