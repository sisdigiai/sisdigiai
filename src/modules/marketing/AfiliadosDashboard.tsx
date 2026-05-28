import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, X, Save, ExternalLink, MessageCircle, Copy, Check, DollarSign, Trophy, Award, Loader2, Link as LinkIcon, Receipt } from 'lucide-react';
import { marketingStore } from '../../lib/marketingStore';

type DashRow = Awaited<ReturnType<typeof marketingStore.listAffiliatesDashboard>>[number];
type Stats = NonNullable<Awaited<ReturnType<typeof marketingStore.getAffiliatesStats>>>;
type Leader = Awaited<ReturnType<typeof marketingStore.getAffiliateLeaderboard>>[number];
type Payout = Awaited<ReturnType<typeof marketingStore.listAffiliatePayouts>>[number];

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B', active: '#10B981', top: '#FFD700',
  inactive: '#6B7280', banned: '#EF4444',
};
const STATUS_LABEL: Record<string, string> = {
  pending: 'Pendente', active: 'Ativo', top: '🥇 Top',
  inactive: 'Inativo', banned: 'Banido',
};
const TIER_COLOR: Record<string, string> = {
  bronze: '#CD7F32', prata: '#C0C0C0', ouro: '#FFD700',
};

function brl(cents: number | null | undefined) {
  if (cents == null) return 'R$ 0,00';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function dateBR(iso: string | null | undefined) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function AfiliadosDashboard() {
  const [rows, setRows] = useState<DashRow[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [leaderboard, setLeaderboard] = useState<Leader[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [payoutFor, setPayoutFor] = useState<DashRow | null>(null);
  const [showLeaderboard, setShowLeaderboard] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [r, s, l] = await Promise.all([
      marketingStore.listAffiliatesDashboard(),
      marketingStore.getAffiliatesStats(),
      marketingStore.getAffiliateLeaderboard(),
    ]);
    setRows(r);
    setStats(s);
    setLeaderboard(l);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => rows.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search && !`${a.full_name} ${a.email} ${a.hotmart_code ?? ''}`.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [rows, statusFilter, search]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold">Programa de Afiliados — Ativo</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            CRM dos parceiros + link único Hotmart + cálculo de comissão automático + registro de pagamentos.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowLeaderboard(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-[#F59E0B]/40 text-[#F59E0B] hover:bg-[#F59E0B]/10">
            <Award className="w-4 h-4" /> Leaderboard
          </button>
          <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#F59E0B] text-[#0A0F1E] font-medium hover:bg-[#F59E0B]/90">
            <Plus className="w-4 h-4" /> Novo afiliado
          </button>
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-outline/10 hover:bg-surface-highest">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {stats && (
        <>
          <div className="grid grid-cols-4 gap-3 mb-3">
            <StatCard label="Afiliados" value={String(stats.total_affiliates)} color="#06B6D4" />
            <StatCard label="Com vendas" value={String(stats.with_sales)} color="#10B981" />
            <StatCard label="Vendas totais" value={String(stats.sales_total)} color="#8B5CF6" />
            <StatCard label="Receita gerada" value={brl(stats.commission_total_cents * 100 / 30)} color="#F59E0B" />
          </div>
          <div className="grid grid-cols-3 gap-3 mb-6">
            <StatCard label="Comissão acumulada" value={brl(stats.commission_total_cents)} color="#F59E0B" icon={<DollarSign className="w-3.5 h-3.5" />} />
            <StatCard label="Já pago" value={brl(stats.commission_paid_cents)} color="#10B981" icon={<Check className="w-3.5 h-3.5" />} />
            <StatCard label="A pagar (saldo devido)" value={brl(stats.commission_due_total_cents)} color={stats.commission_due_total_cents > 0 ? '#EF4444' : '#6B7280'} icon={<Receipt className="w-3.5 h-3.5" />} />
          </div>
        </>
      )}

      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-muted" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome / email / código Hotmart..."
            className="flex-1 bg-surface-low border border-outline/10 px-3 py-1.5 text-sm focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-surface-low border border-outline/10 px-3 py-1.5 text-sm">
          <option value="all">Todos status</option>
          {Object.entries(STATUS_LABEL).map(([v,l]) => <option key={v} value={v}>{l}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-low border border-outline/10 p-12 text-center text-muted">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">{rows.length === 0 ? 'Nenhum afiliado ainda. Clica em "Novo afiliado" pra começar.' : 'Nenhum match.'}</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <AffiliateCard
              key={a.id}
              a={a}
              onRequestPayout={() => setPayoutFor(a)}
              onChanged={refresh}
            />
          ))}
        </div>
      )}

      {showNewForm && <NewAffiliateModal onClose={() => setShowNewForm(false)} onSaved={refresh} />}
      {payoutFor && <PayoutModal affiliate={payoutFor} onClose={() => setPayoutFor(null)} onSaved={refresh} />}
      {showLeaderboard && <LeaderboardModal leaders={leaderboard} onClose={() => setShowLeaderboard(false)} />}
    </div>
  );
}

function AffiliateCard({ a, onRequestPayout, onChanged }: { a: DashRow; onRequestPayout: () => void; onChanged: () => void }) {
  const [link, setLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [loadingLink, setLoadingLink] = useState(false);

  const handleCopyLink = async () => {
    if (!a.hotmart_code) {
      alert('Esse afiliado não tem código Hotmart cadastrado. Edita o cadastro e adiciona o código primeiro.');
      return;
    }
    setLoadingLink(true);
    const l = link ?? await marketingStore.getAffiliateHotmartLink(a.id);
    setLoadingLink(false);
    if (!l) { alert('Erro ao gerar link.'); return; }
    setLink(l);
    navigator.clipboard.writeText(l);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-surface-low border border-outline/10 p-4 border-l-4"
      style={{ borderLeftColor: STATUS_COLOR[a.status] }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="font-semibold">{a.full_name}</span>
            <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5"
              style={{ background: `${TIER_COLOR[a.tier]}30`, color: TIER_COLOR[a.tier] }}>
              {a.tier}
            </span>
            <span className="text-xs text-muted">·</span>
            <span className="text-xs text-on-surface-variant">{a.email}</span>
            {a.whatsapp && <span className="text-xs text-[#25D366]">· {a.whatsapp}</span>}
          </div>
          <div className="text-[10px] text-muted flex flex-wrap gap-2">
            {a.hotmart_code ? (
              <span>Hotmart code: <code className="text-[#F59E0B]">{a.hotmart_code}</code></span>
            ) : (
              <span className="text-[#F59E0B]">⚠ Sem código Hotmart</span>
            )}
            <span>· Tier: <b>{a.tier}</b></span>
            <span>· Cadastrado em {dateBR(a.joined_at)}</span>
            {a.first_sale_at && <span>· 1ª venda {dateBR(a.first_sale_at)}</span>}
            {a.last_sale_at && <span>· última {dateBR(a.last_sale_at)}</span>}
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 shrink-0"
          style={{ background: `${STATUS_COLOR[a.status]}20`, color: STATUS_COLOR[a.status] }}>
          {STATUS_LABEL[a.status]}
        </span>
      </div>

      <div className="grid grid-cols-4 gap-2 mt-3 mb-3">
        <MiniStat label="Vendas" value={String(a.total_sales ?? 0)} color="#06B6D4" />
        <MiniStat label="Comissão total" value={brl(a.total_commission_cents)} color="#F59E0B" />
        <MiniStat label="Já pago" value={brl(a.commission_paid_total_cents)} color="#10B981" />
        <MiniStat label="A pagar" value={brl(a.commission_due_cents)} color={a.commission_due_cents > 0 ? '#EF4444' : '#6B7280'} />
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-outline/10 flex-wrap">
        <button onClick={handleCopyLink} disabled={loadingLink}
          className="flex items-center gap-1 text-xs bg-[#F59E0B] text-[#0A0F1E] font-medium px-3 py-1.5 hover:bg-[#F59E0B]/90 disabled:opacity-50">
          {loadingLink ? <Loader2 className="w-3 h-3 animate-spin" /> : copied ? <Check className="w-3 h-3" /> : <LinkIcon className="w-3 h-3" />}
          {copied ? 'Link copiado!' : 'Copiar link Hotmart'}
        </button>
        {a.whatsapp && (
          <a href={`https://wa.me/${a.whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
            className="flex items-center gap-1 text-xs bg-[#25D366]/20 text-[#25D366] px-3 py-1.5 hover:bg-[#25D366]/30">
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </a>
        )}
        {a.commission_due_cents > 0 && (
          <button onClick={onRequestPayout}
            className="flex items-center gap-1 text-xs border border-[#10B981]/40 text-[#10B981] px-3 py-1.5 hover:bg-[#10B981]/10">
            <DollarSign className="w-3 h-3" /> Registrar pagamento
          </button>
        )}
        {a.payouts_count > 0 && (
          <span className="text-[10px] text-muted">{a.payouts_count} pagamentos · último {dateBR(a.last_payout_at)}</span>
        )}
      </div>
    </div>
  );
}

function NewAffiliateModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    full_name: '', email: '', whatsapp: '', instagram_handle: '',
    city: '', state: '', tier: 'bronze', hotmart_code: '', notes: ''
  });
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!form.full_name || !form.email) { alert('Nome e email são obrigatórios.'); return; }
    setBusy(true);
    const id = await marketingStore.createAffiliate({
      full_name: form.full_name, email: form.email,
      whatsapp: form.whatsapp || undefined,
      instagram_handle: form.instagram_handle || undefined,
      city: form.city || undefined,
      state: form.state || undefined,
      tier: form.tier as any,
      notes: form.notes || undefined,
    });
    if (id && form.hotmart_code) {
      await marketingStore.updateAffiliate(id, { hotmart_code: form.hotmart_code } as any);
    }
    setBusy(false);
    if (id) { onSaved(); onClose(); } else alert('Erro.');
  };

  return (
    <Modal title="Novo afiliado" onClose={onClose}>
      <div className="space-y-3">
        <Input label="Nome completo *" v={form.full_name} on={v => setForm({ ...form, full_name: v })} />
        <Input label="Email *" v={form.email} on={v => setForm({ ...form, email: v })} type="email" />
        <Input label="Código de afiliado Hotmart" v={form.hotmart_code} on={v => setForm({ ...form, hotmart_code: v })}
          placeholder="Ex: tatymelloOSI (pega no painel Hotmart do afiliado)" />
        <div className="grid grid-cols-2 gap-3">
          <Input label="WhatsApp" v={form.whatsapp} on={v => setForm({ ...form, whatsapp: v })} placeholder="+55 11 99999-0000" />
          <Input label="Instagram" v={form.instagram_handle} on={v => setForm({ ...form, instagram_handle: v })} placeholder="@handle" />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <Input label="Cidade" v={form.city} on={v => setForm({ ...form, city: v })} />
          <Input label="UF" v={form.state} on={v => setForm({ ...form, state: v.toUpperCase() })} max={2} />
          <div>
            <label className="text-xs text-on-surface-variant block mb-1">Tier inicial</label>
            <select value={form.tier} onChange={e => setForm({ ...form, tier: e.target.value })} className={inputCls}>
              <option value="bronze">Bronze</option>
              <option value="prata">Prata</option>
              <option value="ouro">Ouro</option>
            </select>
          </div>
        </div>
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Notas</label>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2} className={inputCls} />
        </div>
      </div>
      <div className="flex items-center gap-2 mt-5">
        <button onClick={handleSave} disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0A0F1E] font-medium hover:bg-[#F59E0B]/90 text-sm disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Cadastrar
        </button>
        <button onClick={onClose} className="px-4 py-2 border border-outline/10 text-on-surface-variant hover:bg-surface-highest text-sm">Cancelar</button>
      </div>
    </Modal>
  );
}

function PayoutModal({ affiliate, onClose, onSaved }: { affiliate: DashRow; onClose: () => void; onSaved: () => void }) {
  const due = affiliate.commission_due_cents;
  const [amount, setAmount] = useState((due / 100).toFixed(2));
  const [method, setMethod] = useState('pix');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [payouts, setPayouts] = useState<Payout[]>([]);

  useEffect(() => {
    (async () => {
      setPayouts(await marketingStore.listAffiliatePayouts(affiliate.id));
    })();
  }, [affiliate.id]);

  const handleSave = async () => {
    const cents = Math.round(parseFloat(amount.replace(',','.')) * 100);
    if (!cents || cents <= 0) { alert('Valor inválido.'); return; }
    setBusy(true);
    const id = await marketingStore.registerPayout({
      affiliate_id: affiliate.id, amount_cents: cents, method,
      reference: reference || undefined, notes: notes || undefined,
    });
    setBusy(false);
    if (id) { onSaved(); onClose(); } else alert('Erro.');
  };

  return (
    <Modal title={`Pagamento — ${affiliate.full_name}`} onClose={onClose}>
      <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 rounded p-3 mb-4">
        <div className="text-[10px] uppercase tracking-widest font-bold text-[#F59E0B] mb-1">Saldo devido</div>
        <div className="text-2xl font-bold text-[#F59E0B]">{brl(due)}</div>
      </div>
      <div className="space-y-3">
        <Input label="Valor a pagar (R$)" v={amount} on={setAmount} placeholder="Ex: 850,00" />
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Método</label>
          <select value={method} onChange={e => setMethod(e.target.value)} className={inputCls}>
            <option value="pix">PIX</option>
            <option value="transfer">Transferência bancária</option>
            <option value="hotmart">Pagamento via Hotmart</option>
            <option value="manual">Outro / manual</option>
          </select>
        </div>
        <Input label="Referência (comprovante, recibo, ID PIX)" v={reference} on={setReference} />
        <div>
          <label className="text-xs text-on-surface-variant block mb-1">Notas</label>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} className={inputCls} />
        </div>
      </div>

      {payouts.length > 0 && (
        <div className="mt-4 pt-4 border-t border-outline/10">
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">Histórico ({payouts.length})</div>
          <div className="space-y-1 max-h-40 overflow-y-auto">
            {payouts.map(p => (
              <div key={p.id} className="flex items-center justify-between text-xs bg-surface-low px-2 py-1.5">
                <span>{dateBR(p.payout_date)} · {p.method.toUpperCase()}</span>
                <span className="font-semibold text-[#10B981]">{brl(p.amount_cents)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mt-5">
        <button onClick={handleSave} disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-[#10B981] text-[#0A0F1E] font-medium hover:bg-[#10B981]/90 text-sm disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <DollarSign className="w-4 h-4" />} Registrar pagamento
        </button>
        <button onClick={onClose} className="px-4 py-2 border border-outline/10 text-on-surface-variant hover:bg-surface-highest text-sm">Cancelar</button>
      </div>
    </Modal>
  );
}

function LeaderboardModal({ leaders, onClose }: { leaders: Leader[]; onClose: () => void }) {
  return (
    <Modal title="🏆 Leaderboard de Afiliados" onClose={onClose}>
      {leaders.length === 0 ? (
        <div className="text-center py-8 text-muted text-sm">
          Nenhum afiliado com vendas ainda. Quando entrarem vendas Hotmart vinculadas a afiliado, aparecem aqui.
        </div>
      ) : (
        <div className="space-y-2">
          {leaders.map(l => (
            <div key={l.id} className="flex items-center gap-3 bg-surface-low border border-outline/10 p-3">
              <div className="text-2xl font-bold text-muted w-8 text-center">#{l.rank}</div>
              <div className="flex-1 min-w-0">
                <div className="font-semibold">{l.full_name}</div>
                <div className="text-[10px] text-muted">{l.email} · código <code className="text-[#F59E0B]">{l.hotmart_code}</code></div>
              </div>
              <div className="text-right">
                <div className="text-base font-semibold text-[#F59E0B]">{brl(l.total_commission_cents)}</div>
                <div className="text-[10px] text-muted">{l.total_sales} vendas</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-lowest" />
      <div className="relative bg-surface-container border border-outline/10 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F59E0B]/50 text-on-surface placeholder:text-muted';

function Input({ label, v, on, type='text', placeholder, max }: { label: string; v: string; on: (v: string) => void; type?: string; placeholder?: string; max?: number }) {
  return (
    <div>
      <label className="text-xs text-on-surface-variant block mb-1">{label}</label>
      <input type={type} value={v} onChange={e => on(e.target.value)} placeholder={placeholder} maxLength={max} className={inputCls} />
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-surface-low border border-outline/10 p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-muted mb-1">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}

function MiniStat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-low border border-outline/10 px-2 py-1.5">
      <div className="text-[9px] uppercase tracking-widest font-bold text-muted">{label}</div>
      <div className="text-sm font-semibold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}
