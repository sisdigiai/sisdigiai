import { useEffect, useMemo, useState } from 'react';
import { Plus, RefreshCw, Search, X, Save, ExternalLink, Mail, MessageCircle, Instagram as InstagramIcon } from 'lucide-react';
import { marketingStore, type Affiliate, type AffiliateStatus, type AffiliateTier } from '../../lib/marketingStore';

const STATUS_OPTIONS: { value: AffiliateStatus; label: string; color: string }[] = [
  { value: 'pending', label: 'Pendente', color: '#F59E0B' },
  { value: 'active', label: 'Ativo', color: '#10B981' },
  { value: 'top', label: 'Top', color: '#8B5CF6' },
  { value: 'inactive', label: 'Inativo', color: '#6B7280' },
  { value: 'banned', label: 'Banido', color: '#EF4444' },
];

const TIER_OPTIONS: { value: AffiliateTier; label: string; color: string }[] = [
  { value: 'bronze', label: 'Bronze', color: '#A16207' },
  { value: 'prata', label: 'Prata', color: '#94A3B8' },
  { value: 'ouro', label: 'Ouro', color: '#FCD34D' },
];

export function Afiliados() {
  const [list, setList] = useState<Affiliate[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNewForm, setShowNewForm] = useState(false);
  const [editing, setEditing] = useState<Affiliate | null>(null);

  const refresh = async () => {
    setLoading(true);
    setList(await marketingStore.listAffiliates());
    setLoading(false);
  };
  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() => list.filter(a => {
    if (statusFilter !== 'all' && a.status !== statusFilter) return false;
    if (search && !a.full_name.toLowerCase().includes(search.toLowerCase()) && !a.email.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  }), [list, search, statusFilter]);

  const stats = useMemo(() => ({
    total: list.length,
    pending: list.filter(a => a.status === 'pending').length,
    active: list.filter(a => a.status === 'active' || a.status === 'top').length,
    sales: list.reduce((s, a) => s + (a.total_sales ?? 0), 0),
    commission: list.reduce((s, a) => s + (a.total_commission_cents ?? 0), 0) / 100,
  }), [list]);

  return (
    <div className="p-8">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-white/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar nome ou email..." className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#06B6D4]/50" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
          <option value="all">Todos status</option>
          {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
        </select>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/10 rounded-lg hover:bg-white/5">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
        <button onClick={() => setShowNewForm(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#06B6D4] text-[#0A0F1E] rounded-lg hover:bg-[#06B6D4]/90 font-medium">
          <Plus className="w-4 h-4" /> Novo afiliado
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-5 gap-3 mb-6">
        <StatCard label="Total" value={stats.total} color="#06B6D4" />
        <StatCard label="Pendentes" value={stats.pending} color="#F59E0B" />
        <StatCard label="Ativos" value={stats.active} color="#10B981" />
        <StatCard label="Vendas" value={stats.sales} color="#8B5CF6" />
        <StatCard label={`Comissão (R$)`} value={stats.commission.toFixed(2)} color="#FCD34D" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/40">
          <p className="text-sm mb-2">Nenhum afiliado ainda.</p>
          <button onClick={() => setShowNewForm(true)} className="text-xs text-[#06B6D4] hover:text-white">Cadastrar o primeiro</button>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(a => (
            <AffiliateRow key={a.id} affiliate={a} onClick={() => setEditing(a)} />
          ))}
        </div>
      )}

      {(showNewForm || editing) && (
        <AffiliateForm
          affiliate={editing}
          onClose={() => { setShowNewForm(false); setEditing(null); }}
          onSaved={() => { setShowNewForm(false); setEditing(null); refresh(); }}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number | string; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="text-2xl font-semibold" style={{ color }}>{value}</div>
      <div className="text-[11px] text-white/40 mt-1">{label}</div>
    </div>
  );
}

function AffiliateRow({ affiliate, onClick }: { affiliate: Affiliate; onClick: () => void }) {
  const status = STATUS_OPTIONS.find(s => s.value === affiliate.status);
  const tier = TIER_OPTIONS.find(t => t.value === affiliate.tier);
  return (
    <button onClick={onClick} className="w-full text-left bg-white/5 border border-white/10 rounded-lg p-4 hover:bg-white/[0.07] transition-colors">
      <div className="flex items-center gap-4">
        <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center font-semibold text-sm">{affiliate.full_name.charAt(0).toUpperCase()}</div>
        <div className="flex-1 min-w-0">
          <div className="font-medium">{affiliate.full_name}</div>
          <div className="text-xs text-white/40 flex items-center gap-3 mt-0.5">
            <span><Mail className="w-3 h-3 inline mr-1" />{affiliate.email}</span>
            {affiliate.whatsapp && <span><MessageCircle className="w-3 h-3 inline mr-1" />{affiliate.whatsapp}</span>}
            {affiliate.instagram_handle && <span><InstagramIcon className="w-3 h-3 inline mr-1" />@{affiliate.instagram_handle}</span>}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-white/60">{affiliate.total_sales} vendas · R$ {((affiliate.total_commission_cents ?? 0) / 100).toFixed(2)}</div>
          <div className="flex items-center gap-2 mt-1 justify-end">
            {tier && <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: tier.color }}>{tier.label}</span>}
            {status && <span className="text-[10px] uppercase tracking-widest font-bold" style={{ color: status.color }}>{status.label}</span>}
          </div>
        </div>
      </div>
    </button>
  );
}

function AffiliateForm({ affiliate, onClose, onSaved }: { affiliate: Affiliate | null; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState<Partial<Affiliate>>(affiliate ?? { status: 'pending', tier: 'bronze' });
  const [saving, setSaving] = useState(false);

  const update = (patch: Partial<Affiliate>) => setDraft({ ...draft, ...patch });

  const handleSave = async () => {
    if (!draft.full_name || !draft.email) { alert('Nome e email são obrigatórios.'); return; }
    setSaving(true);
    let ok = false;
    if (affiliate) {
      ok = await marketingStore.updateAffiliate(affiliate.id, draft);
    } else {
      const id = await marketingStore.createAffiliate(draft as any);
      ok = !!id;
    }
    setSaving(false);
    if (ok) onSaved(); else alert('Erro ao salvar — veja console.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div className="bg-[#0F1729] border border-white/10 rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-[#0F1729] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <h3 className="font-semibold">{affiliate ? 'Editar afiliado' : 'Novo afiliado'}</h3>
          <div className="flex items-center gap-2">
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-1.5 bg-[#06B6D4] text-[#0A0F1E] font-medium rounded-lg hover:bg-[#06B6D4]/90 text-sm disabled:opacity-50">
              <Save className="w-4 h-4" /> Salvar
            </button>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Nome *"><input value={draft.full_name ?? ''} onChange={e => update({ full_name: e.target.value })} className={inputCls} /></Field>
            <Field label="Email *"><input type="email" value={draft.email ?? ''} onChange={e => update({ email: e.target.value })} className={inputCls} /></Field>
            <Field label="WhatsApp"><input value={draft.whatsapp ?? ''} onChange={e => update({ whatsapp: e.target.value || null })} className={inputCls} /></Field>
            <Field label="Instagram (sem @)"><input value={draft.instagram_handle ?? ''} onChange={e => update({ instagram_handle: e.target.value || null })} className={inputCls} /></Field>
            <Field label="Cidade"><input value={draft.city ?? ''} onChange={e => update({ city: e.target.value || null })} className={inputCls} /></Field>
            <Field label="Estado"><input value={draft.state ?? ''} onChange={e => update({ state: e.target.value || null })} className={inputCls} /></Field>
            <Field label="Status">
              <select value={draft.status ?? 'pending'} onChange={e => update({ status: e.target.value })} className={inputCls}>
                {STATUS_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </Field>
            <Field label="Tier">
              <select value={draft.tier ?? 'bronze'} onChange={e => update({ tier: e.target.value })} className={inputCls}>
                {TIER_OPTIONS.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </Field>
          </div>
          <Field label="Link Hotmart (afiliado)"><input value={draft.affiliate_link_hotmart ?? ''} onChange={e => update({ affiliate_link_hotmart: e.target.value || null })} placeholder="https://go.hotmart.com/..." className={inputCls} /></Field>
          <Field label="Link Kiwify (afiliado)"><input value={draft.affiliate_link_kiwify ?? ''} onChange={e => update({ affiliate_link_kiwify: e.target.value || null })} placeholder="https://pay.kiwify.com.br/..." className={inputCls} /></Field>
          {affiliate && (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Total de vendas"><input type="number" value={draft.total_sales ?? 0} onChange={e => update({ total_sales: parseInt(e.target.value, 10) || 0 })} className={inputCls} /></Field>
              <Field label="Comissão acumulada (centavos)"><input type="number" value={draft.total_commission_cents ?? 0} onChange={e => update({ total_commission_cents: parseInt(e.target.value, 10) || 0 })} className={inputCls} /></Field>
            </div>
          )}
          <Field label="Notas"><textarea value={draft.notes ?? ''} onChange={e => update({ notes: e.target.value || null })} rows={3} className={inputCls} /></Field>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#06B6D4]/50 text-white placeholder:text-white/30';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-white/50 block mb-1">{label}</label>
      {children}
    </div>
  );
}
