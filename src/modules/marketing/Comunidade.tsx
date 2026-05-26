import { useEffect, useMemo, useState } from 'react';
import { Users, MessageCircle, Crown, RefreshCw, Search, Plus, Mail, ExternalLink, Loader2, CheckCircle2, Star } from 'lucide-react';
import { marketingStore } from '../../lib/marketingStore';

type Member = Awaited<ReturnType<typeof marketingStore.listCommunityMembers>>[number];
type Stats = NonNullable<Awaited<ReturnType<typeof marketingStore.getCommunityStats>>>;

const STATUS_COLOR: Record<string, string> = {
  active: '#10B981', vip: '#F59E0B', inactive: '#6B7280', blocked: '#EF4444', refunded: '#8B5CF6',
};
const STATUS_LABEL: Record<string, string> = {
  active: 'Ativo', vip: 'VIP', inactive: 'Inativo', blocked: 'Bloqueado', refunded: 'Reembolsado',
};
const TIER_COLOR: Record<string, string> = {
  bronze: '#CD7F32', prata: '#C0C0C0', ouro: '#FFD700', vip: '#FF1493',
};

function brl(cents: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function dateBR(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function Comunidade() {
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [tierFilter, setTierFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [m, s] = await Promise.all([
      marketingStore.listCommunityMembers(),
      marketingStore.getCommunityStats(),
    ]);
    setMembers(m);
    setStats(s);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() =>
    members.filter(m => {
      if (statusFilter !== 'all' && m.status !== statusFilter) return false;
      if (tierFilter !== 'all' && m.tier !== tierFilter) return false;
      if (search && !(`${m.full_name} ${m.email} ${m.city ?? ''} ${m.state ?? ''}`.toLowerCase().includes(search.toLowerCase()))) return false;
      return true;
    }), [members, statusFilter, tierFilter, search]);

  const handleAction = async (id: string, patch: Record<string, unknown>) => {
    setBusy(id);
    const ok = await marketingStore.updateCommunityMember(id, patch);
    setBusy(null);
    if (ok) refresh(); else alert('Erro.');
  };

  const handleSendWhats = (m: Member) => {
    if (!m.whatsapp) { alert('Esse membro não tem WhatsApp cadastrado.'); return; }
    const phone = m.whatsapp.replace(/\D/g, '');
    const msg = encodeURIComponent(`Oi ${m.full_name.split(' ')[0]}, aqui é da Ótica Sem Improviso. Tudo bem?`);
    window.open(`https://wa.me/${phone}?text=${msg}`, '_blank');
    handleAction(m.id, { mark_active: true });
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold">Comunidade OSI</h2>
          </div>
          <p className="text-xs text-white/40 mt-1">
            Membros vindos do Hotmart. Webhook cria automático cada compra aprovada.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#F59E0B] text-[#0A0F1E] font-medium rounded-lg hover:bg-[#F59E0B]/90">
            <Plus className="w-4 h-4" /> Adicionar manual
          </button>
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/10 rounded-lg hover:bg-white/5">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-3">
          <StatCard label="Total membros" value={String(stats.total)} color="#06B6D4" icon={<Users className="w-3.5 h-3.5" />} />
          <StatCard label="Ativos" value={String(stats.active)} color="#10B981" />
          <StatCard label="VIPs" value={String(stats.vip)} color="#F59E0B" icon={<Crown className="w-3.5 h-3.5" />} />
          <StatCard label="Novos 7d" value={String(stats.new_last_7d)} color="#8B5CF6" />
        </div>
      )}
      {stats && (
        <div className="grid grid-cols-4 gap-3 mb-6">
          <StatCard label="Ativos últimos 30d" value={String(stats.active_last_30d)} color="#10B981" />
          <StatCard label="Reembolsados" value={String(stats.refunded)} color="#8B5CF6" />
          <StatCard label="WhatsApp opt-in" value={`${stats.whatsapp_optin} / ${stats.total}`} color="#25D366" />
          <StatCard label="Email opt-in" value={`${stats.email_optin} / ${stats.total}`} color="#6366F1" />
        </div>
      )}

      {/* Filtros */}
      <div className="flex items-center gap-3 mb-4 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-white/40" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Nome / email / cidade..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none" />
        </div>
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
          <option value="all">Todos status</option>
          <option value="active">Ativo</option>
          <option value="vip">VIP</option>
          <option value="inactive">Inativo</option>
          <option value="refunded">Reembolsado</option>
          <option value="blocked">Bloqueado</option>
        </select>
        <select value={tierFilter} onChange={e => setTierFilter(e.target.value)} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm">
          <option value="all">Todos tiers</option>
          <option value="bronze">Bronze</option>
          <option value="prata">Prata</option>
          <option value="ouro">Ouro</option>
          <option value="vip">VIP</option>
        </select>
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40 text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white/5 border border-white/10 rounded-lg p-12 text-center text-white/40">
          <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            {members.length === 0 ? 'Nenhum membro ainda — a 1ª venda Hotmart cria o primeiro automaticamente.' : 'Nenhum match nos filtros.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(m => (
            <MemberCard
              key={m.id}
              m={m}
              busy={busy === m.id}
              onPromoteVip={() => handleAction(m.id, { status: 'vip', tier: 'vip' })}
              onSetActive={() => handleAction(m.id, { status: 'active', mark_active: true })}
              onSetInactive={() => handleAction(m.id, { status: 'inactive' })}
              onBlock={() => handleAction(m.id, { status: 'blocked' })}
              onSendWhats={() => handleSendWhats(m)}
            />
          ))}
        </div>
      )}

      {showAdd && <AddMemberModal onClose={() => setShowAdd(false)} onSaved={refresh} />}
    </div>
  );
}

function MemberCard({ m, busy, onPromoteVip, onSetActive, onSetInactive, onBlock, onSendWhats }: {
  m: Member; busy: boolean;
  onPromoteVip: () => void; onSetActive: () => void; onSetInactive: () => void;
  onBlock: () => void; onSendWhats: () => void;
}) {
  const isVip = m.status === 'vip';
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 border-l-4"
      style={{ borderLeftColor: STATUS_COLOR[m.status] }}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="font-semibold">{m.full_name}</span>
            {isVip && <Crown className="w-3.5 h-3.5 text-[#F59E0B]" />}
            <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 rounded"
              style={{ background: `${TIER_COLOR[m.tier]}30`, color: TIER_COLOR[m.tier] }}>
              {m.tier}
            </span>
            <span className="text-xs text-white/40">·</span>
            <span className="text-xs text-white/60">{m.email}</span>
            {m.whatsapp && <span className="text-xs text-[#25D366]">· {m.whatsapp}</span>}
          </div>
          <div className="text-[10px] text-white/30">
            Comprou em {dateBR(m.joined_at)}
            {m.hotmart_value_cents != null && ` · ${brl(m.hotmart_value_cents)}`}
            {m.pillar_code && <> · veio do pilar <b style={{ color: m.pillar_color ?? '#06B6D4' }}>{m.pillar_name}</b></>}
            {m.attributed_post_hook && <> · post: "{m.attributed_post_hook.slice(0, 40)}..."</>}
            {m.city && ` · ${m.city}/${m.state}`}
          </div>
        </div>
        <span className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 rounded shrink-0"
          style={{ background: `${STATUS_COLOR[m.status]}20`, color: STATUS_COLOR[m.status] }}>
          {STATUS_LABEL[m.status]}
        </span>
      </div>

      {m.notes && (
        <p className="text-[11px] text-white/40 mt-2 italic">{m.notes}</p>
      )}

      <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/5">
        {m.whatsapp && (
          <button onClick={onSendWhats} disabled={busy}
            className="flex items-center gap-1 text-xs bg-[#25D366]/20 text-[#25D366] px-3 py-1.5 rounded hover:bg-[#25D366]/30 disabled:opacity-50">
            <MessageCircle className="w-3 h-3" /> WhatsApp
          </button>
        )}
        {!isVip && (
          <button onClick={onPromoteVip} disabled={busy}
            className="flex items-center gap-1 text-xs border border-[#F59E0B]/40 text-[#F59E0B] px-3 py-1.5 rounded hover:bg-[#F59E0B]/10 disabled:opacity-50">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Crown className="w-3 h-3" />} VIP
          </button>
        )}
        {m.status === 'inactive' && (
          <button onClick={onSetActive} disabled={busy}
            className="flex items-center gap-1 text-xs border border-[#10B981]/40 text-[#10B981] px-3 py-1.5 rounded hover:bg-[#10B981]/10 disabled:opacity-50">
            <CheckCircle2 className="w-3 h-3" /> Reativar
          </button>
        )}
        {m.status === 'active' && (
          <button onClick={onSetInactive} disabled={busy}
            className="text-xs text-white/40 hover:text-white px-3 py-1.5">
            Marcar inativo
          </button>
        )}
      </div>
    </div>
  );
}

function AddMemberModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({ full_name: '', email: '', whatsapp: '', city: '', state: '', notes: '', whatsapp_consent: false });
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!form.full_name.trim() || !form.email.trim()) { alert('Nome e email obrigatórios.'); return; }
    setBusy(true);
    const id = await marketingStore.createCommunityMember(form);
    setBusy(false);
    if (id) { onSaved(); onClose(); } else alert('Erro.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/70" />
      <div className="relative bg-[#0F1729] border border-white/10 rounded-xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold mb-4">Adicionar membro manual</h3>
        <div className="space-y-3">
          <input value={form.full_name} onChange={e => setForm({ ...form, full_name: e.target.value })} placeholder="Nome completo *" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          <input value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="Email *" type="email" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          <input value={form.whatsapp} onChange={e => setForm({ ...form, whatsapp: e.target.value })} placeholder="WhatsApp +55 11 99999-0000" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          <div className="grid grid-cols-2 gap-2">
            <input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} placeholder="Cidade" className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
            <input value={form.state} onChange={e => setForm({ ...form, state: e.target.value.toUpperCase() })} placeholder="UF" maxLength={2} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          </div>
          <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Notas internas" rows={3} className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm" />
          <label className="flex items-center gap-2 text-xs text-white/70">
            <input type="checkbox" checked={form.whatsapp_consent} onChange={e => setForm({ ...form, whatsapp_consent: e.target.checked })} className="accent-[#F59E0B]" />
            Autorizou contato pelo WhatsApp
          </label>
        </div>
        <div className="flex items-center gap-2 mt-5">
          <button onClick={handleSave} disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-[#0A0F1E] font-medium rounded-lg hover:bg-[#F59E0B]/90 text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Adicionar
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-white/10 text-white/60 rounded-lg hover:bg-white/5 text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-3">
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-widest font-bold text-white/40 mb-1">
        {icon} {label}
      </div>
      <div className="text-lg font-semibold" style={{ color }}>{value}</div>
    </div>
  );
}
