import { useState } from 'react';
import { X, Save, Send, MessageCircle, RefreshCw, FileText } from 'lucide-react';
import type { CommercialLead } from '../../lib/commercialStore';
import { proposalStore, type Proposal } from '../../lib/proposalStore';
import { PLAN_PRICE, buildBody, whatsappLink, mailtoLink } from './proposalGen';

const PLANS = ['Essencial', 'Controle', 'Crescimento'];

export default function ProposalEditor({
  initial,
  lead,
  onClose,
  onSaved,
}: {
  initial: Proposal;
  lead: CommercialLead | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [p, setP] = useState<Proposal>(initial);
  const [busy, setBusy] = useState(false);

  const set = (patch: Partial<Proposal>) => setP((prev) => ({ ...prev, ...patch }));
  const setPlan = (plan: string) => set({ plan, monthly_price: PLAN_PRICE[plan] ?? p.monthly_price });
  const regen = () => set({ body: buildBody(p, lead, null) });

  const save = async (): Promise<string | undefined> => {
    setBusy(true);
    const id = await proposalStore.upsert(p);
    setBusy(false);
    return id;
  };

  const send = async (via: 'whatsapp' | 'email') => {
    setBusy(true);
    const id = await proposalStore.upsert(p);
    const link = via === 'whatsapp'
      ? whatsappLink(p.body ?? '', lead?.contact)
      : mailtoLink(p.body ?? '', p.title ?? 'Proposta Clearix', lead?.contact);
    window.open(link, '_blank', 'noopener');
    if (id) await proposalStore.markSent(id, via);
    setBusy(false);
    onSaved();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4">
      <div className="bg-surface-container border border-outline/15 w-full max-w-4xl h-[88vh] flex flex-col">
        <div className="flex items-center gap-3 px-5 py-3 border-b border-outline/10 shrink-0">
          <FileText className="w-4 h-4 text-secondary" />
          <div className="text-sm font-bold text-on-surface">Proposta {lead ? `· ${lead.company}` : ''}</div>
          {p.status && <span className="text-[9px] font-mono uppercase px-1.5 py-0.5 bg-surface-high text-muted">{p.status}</span>}
          <button onClick={onClose} aria-label="Fechar" className="ml-auto text-muted hover:text-on-surface"><X className="w-5 h-5" /></button>
        </div>

        <div className="flex-1 flex min-h-0">
          {/* Form */}
          <div className="w-[300px] shrink-0 overflow-y-auto p-5 space-y-3 border-r border-outline/10">
            <Line label="Título" value={p.title ?? ''} onChange={(v) => set({ title: v })} />
            <label className="block">
              <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Plano</span>
              <select value={p.plan ?? ''} onChange={(e) => setPlan(e.target.value)} className="w-full mt-1 bg-surface-high border border-outline/15 px-2.5 py-1.5 text-sm text-on-surface">
                {PLANS.map((pl) => <option key={pl} value={pl}>{pl}</option>)}
              </select>
            </label>
            <Line label="Preço/mês (R$)" value={p.monthly_price != null ? String(p.monthly_price) : ''} onChange={(v) => set({ monthly_price: v ? Number(v.replace(',', '.')) : null })} />
            <div className="grid grid-cols-2 gap-2">
              <Line label="Desconto %" value={p.discount_pct != null ? String(p.discount_pct) : ''} onChange={(v) => set({ discount_pct: v ? Number(v) : null })} />
              <Line label="Teste (dias)" value={p.trial_days != null ? String(p.trial_days) : ''} onChange={(v) => set({ trial_days: v ? Number(v) : null })} />
            </div>
            <Line label="Setup" value={p.setup_note ?? ''} onChange={(v) => set({ setup_note: v })} />
            <button onClick={regen} className="w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs border border-outline/20 text-on-surface hover:bg-surface-high">
              <RefreshCw className="w-3.5 h-3.5 text-secondary" /> Regerar texto a partir dos campos
            </button>
          </div>

          {/* Corpo / preview editável */}
          <div className="flex-1 overflow-y-auto p-5 flex flex-col">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted mb-1.5">Texto da proposta (editável)</span>
            <textarea
              value={p.body ?? ''}
              onChange={(e) => set({ body: e.target.value })}
              className="flex-1 min-h-[300px] bg-surface-high border border-outline/15 px-3 py-2.5 text-sm text-on-surface leading-relaxed focus:border-secondary/50 outline-none resize-none whitespace-pre-wrap"
            />
          </div>
        </div>

        {/* Ações */}
        <div className="flex items-center gap-2 px-5 py-3 border-t border-outline/10 shrink-0">
          <button onClick={async () => { await save(); onSaved(); }} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm border border-outline/20 text-on-surface hover:bg-surface-high disabled:opacity-40">
            <Save className="w-4 h-4" /> Salvar rascunho
          </button>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={() => send('whatsapp')} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-success text-on-action hover:opacity-90 disabled:opacity-40">
              <MessageCircle className="w-4 h-4" /> Enviar no WhatsApp
            </button>
            <button onClick={() => send('email')} disabled={busy} className="inline-flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-secondary text-on-secondary hover:opacity-90 disabled:opacity-40">
              <Send className="w-4 h-4" /> Enviar por e-mail
            </button>
          </div>
        </div>
        <p className="text-[10px] text-muted px-5 pb-2 -mt-1">Enviar abre o WhatsApp/e-mail pré-preenchido (você dá o último clique) e marca a proposta como enviada.</p>
      </div>
    </div>
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
