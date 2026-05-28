import { useEffect, useMemo, useState } from 'react';
import { Trophy, Plus, RefreshCw, Calendar, Users, Award, Flag, Loader2, X, Hash, ExternalLink, CheckCircle2, MessageCircle } from 'lucide-react';
import { marketingStore } from '../../lib/marketingStore';

type Challenge = Awaited<ReturnType<typeof marketingStore.listChallenges>>[number];
type Participation = Awaited<ReturnType<typeof marketingStore.getChallengeLeaderboard>>[number];
type Stats = NonNullable<Awaited<ReturnType<typeof marketingStore.getChallengesStats>>>;

const MOVEMENT_NAMES: Record<number, string> = {
  1: 'Sair do automático',
  2: 'Ler melhor o cliente',
  3: 'Indicar com segurança',
  4: 'Sustentar valor sem desconto',
  5: 'Continuar venda no WhatsApp',
};

const MOVEMENT_COLOR: Record<number, string> = {
  1: '#adcebd', 2: '#8B5CF6', 3: '#10B981', 4: '#F59E0B', 5: '#EC4899',
};

const STATUS_COLOR: Record<string, string> = {
  draft: '#6B7280', active: '#10B981', closed: '#adcebd', cancelled: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  draft: 'Rascunho', active: 'Ativo', closed: 'Encerrado', cancelled: 'Cancelado',
};

const PART_STATUS_COLOR: Record<string, string> = {
  registered: '#6B7280', submitted: '#F59E0B', winner: '#FFD700', runner_up: '#C0C0C0', disqualified: '#EF4444',
};
const PART_STATUS_LABEL: Record<string, string> = {
  registered: 'Inscrito', submitted: 'Submeteu prova', winner: '🥇 Vencedor', runner_up: '🥈 Top 3', disqualified: 'Desclassificado',
};

function brl(cents: number | null) {
  if (cents == null) return '—';
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}
function dateBR(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
}

export function Desafios() {
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showNew, setShowNew] = useState(false);
  const [openChallenge, setOpenChallenge] = useState<Challenge | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [c, s] = await Promise.all([marketingStore.listChallenges(), marketingStore.getChallengesStats()]);
    setChallenges(c);
    setStats(s);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(() =>
    challenges.filter(c => statusFilter === 'all' || c.status === statusFilter), [challenges, statusFilter]);

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <Trophy className="w-5 h-5 text-[#F59E0B]" />
            <h2 className="text-lg font-semibold">Desafios mensais (gamificação)</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Lança desafio por Movimento (1-5), vendedores submetem prova, ranking dispara mecânica viral.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-3 py-1.5 text-sm bg-[#F59E0B] text-surface font-medium hover:bg-[#F59E0B]/90">
            <Plus className="w-4 h-4" /> Novo desafio
          </button>
          <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-outline/10 hover:bg-surface-highest">
            <RefreshCw className="w-4 h-4" /> Atualizar
          </button>
        </div>
      </div>

      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {(['active','draft','closed','cancelled'] as const).map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`bg-surface-low border p-3 text-left ${statusFilter === s ? 'border-outline/30 ring-1 ring-outline/30' : 'border-outline/10 hover:bg-surface-highest'}`}>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted">{STATUS_LABEL[s]}</div>
              <div className="text-2xl font-semibold mt-1" style={{ color: STATUS_COLOR[s] }}>{stats[s] ?? 0}</div>
            </button>
          ))}
          <div className="bg-surface-low border border-outline/10 p-3">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted">Vencedores totais</div>
            <div className="text-2xl font-semibold mt-1 text-[#F59E0B]">{stats.total_winners}</div>
          </div>
        </div>
      )}

      <div className="flex items-center gap-2 mb-4">
        <button onClick={() => setStatusFilter('all')}
          className={`text-xs px-3 py-1 rounded-full border ${statusFilter === 'all' ? 'border-outline/30 text-on-surface' : 'border-outline/10 text-on-surface-variant hover:border-outline/30'}`}>
          Ver todos
        </button>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-low border border-outline/10 p-12 text-center text-muted">
          <Trophy className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum desafio ainda. Clica em "Novo desafio" pra lançar o primeiro.</p>
          <p className="text-xs mt-2 text-muted">
            Sugestão: "Desafio Movimento 3 — aplica indicação com segurança essa semana e me conta o que vendeu"
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3">
          {filtered.map(c => (
            <ChallengeCard key={c.id} c={c} onOpen={() => setOpenChallenge(c)} />
          ))}
        </div>
      )}

      {showNew && <NewChallengeModal onClose={() => setShowNew(false)} onSaved={refresh} />}
      {openChallenge && (
        <ChallengeDetailDrawer
          challenge={openChallenge}
          onClose={() => setOpenChallenge(null)}
          onChanged={() => { refresh(); }}
        />
      )}
    </div>
  );
}

function ChallengeCard({ c, onOpen }: { c: Challenge; onOpen: () => void }) {
  const movement = c.movement ?? 0;
  const movColor = MOVEMENT_COLOR[movement] ?? '#adcebd';
  return (
    <button onClick={onOpen}
      className="bg-surface-low border border-outline/10 p-4 text-left hover:bg-surface-highest border-l-4"
      style={{ borderLeftColor: STATUS_COLOR[c.status] }}>
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {c.movement && (
            <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5"
              style={{ background: `${movColor}25`, color: movColor }}>
              Movimento {c.movement}
            </span>
          )}
          <span className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: STATUS_COLOR[c.status] }}>
            {STATUS_LABEL[c.status]}
          </span>
        </div>
        {c.hashtag && (
          <span className="text-[10px] text-muted flex items-center gap-0.5">
            <Hash className="w-3 h-3" /> {c.hashtag}
          </span>
        )}
      </div>
      <h3 className="font-semibold mb-1">{c.name}</h3>
      {c.movement && <p className="text-[11px] text-muted mb-2">{MOVEMENT_NAMES[c.movement]}</p>}
      {c.description && <p className="text-xs text-on-surface-variant line-clamp-2 mb-3">{c.description}</p>}

      <div className="flex items-center gap-3 text-[11px] text-muted">
        {(c.start_date || c.end_date) && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {dateBR(c.start_date)} → {dateBR(c.end_date)}
          </span>
        )}
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> {c.participants_count} inscritos
        </span>
        {c.submissions_count > 0 && (
          <span className="flex items-center gap-1 text-[#F59E0B]">
            <Award className="w-3 h-3" /> {c.submissions_count} provas
          </span>
        )}
        {c.winners_count > 0 && <span className="text-[#FFD700]">🏆 {c.winners_count}</span>}
      </div>
    </button>
  );
}

function NewChallengeModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: '', description: '', movement: 1,
    start_date: new Date().toISOString().slice(0,10),
    end_date: new Date(Date.now() + 7 * 86400000).toISOString().slice(0,10),
    status: 'draft', prize_description: '', rules: '', hashtag: ''
  });
  const [busy, setBusy] = useState(false);

  const handleSave = async () => {
    if (!form.name.trim()) { alert('Nome do desafio é obrigatório.'); return; }
    setBusy(true);
    const id = await marketingStore.createChallenge(form);
    setBusy(false);
    if (id) { onSaved(); onClose(); } else alert('Erro.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-lowest" />
      <div className="relative bg-surface-container border border-outline/10 p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Novo desafio</h3>
          <button onClick={onClose} className="p-1 text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
        </div>
        <div className="space-y-3">
          <Field label="Nome do desafio *">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})}
              placeholder='Ex: "Aplica o Movimento 3 essa semana"' className={inputCls} />
          </Field>
          <Field label="Movimento do método (1-5)">
            <select value={form.movement} onChange={e => setForm({...form, movement: parseInt(e.target.value)})} className={inputCls}>
              {[1,2,3,4,5].map(m => <option key={m} value={m}>Movimento {m} — {MOVEMENT_NAMES[m]}</option>)}
            </select>
          </Field>
          <Field label="Descrição">
            <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3}
              placeholder="Conta o que o vendedor precisa fazer pra participar..." className={inputCls} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Início">
              <input type="date" value={form.start_date} onChange={e => setForm({...form, start_date: e.target.value})} className={inputCls} />
            </Field>
            <Field label="Fim">
              <input type="date" value={form.end_date} onChange={e => setForm({...form, end_date: e.target.value})} className={inputCls} />
            </Field>
          </div>
          <Field label="Hashtag (opcional)">
            <input value={form.hashtag} onChange={e => setForm({...form, hashtag: e.target.value.replace('#','')})}
              placeholder='Ex: DesafioMovimento3OSI' className={inputCls} />
          </Field>
          <Field label="Prêmio">
            <input value={form.prize_description} onChange={e => setForm({...form, prize_description: e.target.value})}
              placeholder="Ex: Mentoria 30min com Taty + repost no @oticasemimproviso" className={inputCls} />
          </Field>
          <Field label="Regras">
            <textarea value={form.rules} onChange={e => setForm({...form, rules: e.target.value})} rows={2}
              placeholder="Como vai ser julgado, prazos, critérios" className={inputCls} />
          </Field>
          <Field label="Status inicial">
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className={inputCls}>
              <option value="draft">Rascunho (não anunciado)</option>
              <option value="active">Ativo (já pode receber inscrições)</option>
            </select>
          </Field>
        </div>
        <div className="flex items-center gap-2 mt-5">
          <button onClick={handleSave} disabled={busy} className="flex items-center gap-2 px-4 py-2 bg-[#F59E0B] text-surface font-medium hover:bg-[#F59E0B]/90 text-sm disabled:opacity-50">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Criar
          </button>
          <button onClick={onClose} className="px-4 py-2 border border-outline/10 text-on-surface-variant hover:bg-surface-highest text-sm">Cancelar</button>
        </div>
      </div>
    </div>
  );
}

function ChallengeDetailDrawer({ challenge, onClose, onChanged }: { challenge: Challenge; onClose: () => void; onChanged: () => void }) {
  const [participations, setParticipations] = useState<Participation[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const p = await marketingStore.getChallengeLeaderboard(challenge.id);
    setParticipations(p);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, [challenge.id]);

  const handleActivate = async () => {
    setBusy(true);
    const ok = await marketingStore.updateChallenge(challenge.id, { status: 'active' });
    setBusy(false);
    if (ok) { onChanged(); }
  };

  const handleFinalize = async () => {
    if (!confirm(`Finalizar o desafio?\nVai ranquear todas as submissões por score (decrescente, desempate pela ordem de submissão).\nTop 1 = winner, top 2-3 = runner_up.\nDesafio será marcado como ENCERRADO.\n\nConfirma?`)) return;
    setBusy(true);
    const r = await marketingStore.finalizeChallenge(challenge.id);
    setBusy(false);
    if (r) { alert(`Finalizado: ${r.ranked} participantes ranqueados.`); onChanged(); refresh(); }
    else alert('Erro.');
  };

  const handleSetScore = async (id: string) => {
    const score = prompt('Score (decimal, ex: 8.5):');
    if (score == null) return;
    setBusy(true);
    await marketingStore.updateParticipation(id, { score });
    setBusy(false);
    refresh();
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-surface-lowest" />
      <div className="relative ml-auto w-full max-w-3xl h-full bg-surface-container border-l border-outline/10 overflow-y-auto" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 z-10 bg-surface-container border-b border-outline/10 px-6 py-4 flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: MOVEMENT_COLOR[challenge.movement ?? 1] }}>
              Movimento {challenge.movement} — {MOVEMENT_NAMES[challenge.movement ?? 1]}
            </div>
            <h2 className="text-lg font-semibold mt-1">{challenge.name}</h2>
            <p className="text-xs text-muted mt-0.5">
              {dateBR(challenge.start_date)} → {dateBR(challenge.end_date)} · {challenge.participants_count} inscritos · {challenge.submissions_count} provas
            </p>
          </div>
          <div className="flex items-center gap-2">
            {challenge.status === 'draft' && (
              <button onClick={handleActivate} disabled={busy} className="flex items-center gap-1 px-3 py-2 bg-[#10B981] text-surface font-medium text-sm disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Flag className="w-4 h-4" />} Ativar
              </button>
            )}
            {challenge.status === 'active' && (
              <button onClick={handleFinalize} disabled={busy} className="flex items-center gap-1 px-3 py-2 bg-[#F59E0B] text-surface font-medium text-sm disabled:opacity-50">
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trophy className="w-4 h-4" />} Finalizar
              </button>
            )}
            <button onClick={onClose} className="p-2 text-on-surface-variant hover:text-on-surface"><X className="w-5 h-5" /></button>
          </div>
        </div>

        <div className="p-6 space-y-5">
          {challenge.description && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-1">Descrição</div>
              <p className="text-sm text-on-surface whitespace-pre-wrap">{challenge.description}</p>
            </div>
          )}
          {challenge.prize_description && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-1 flex items-center gap-1">
                <Award className="w-3 h-3 text-[#F59E0B]" /> Prêmio
              </div>
              <p className="text-sm text-on-surface">{challenge.prize_description}</p>
            </div>
          )}
          {challenge.rules && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-1">Regras</div>
              <p className="text-sm text-on-surface whitespace-pre-wrap">{challenge.rules}</p>
            </div>
          )}
          {challenge.hashtag && (
            <div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-1">Hashtag oficial</div>
              <code className="text-sm text-[#F59E0B] bg-surface-lowest px-2 py-1">#{challenge.hashtag}</code>
            </div>
          )}

          <div>
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">
              Leaderboard ({participations.length})
            </div>
            {loading ? (
              <div className="text-xs text-muted">Carregando...</div>
            ) : participations.length === 0 ? (
              <div className="bg-surface-low border border-outline/10 p-4 text-xs text-muted text-center">
                Nenhum inscrito ainda.
              </div>
            ) : (
              <div className="space-y-2">
                {participations.map((p, i) => (
                  <div key={p.id} className="bg-surface-low border border-outline/10 p-3 border-l-4"
                    style={{ borderLeftColor: PART_STATUS_COLOR[p.status] }}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          {p.ranking && <span className="text-lg font-bold text-muted">#{p.ranking}</span>}
                          <span className="font-semibold">{p.participant_name}</span>
                          {(p.city || p.state) && <span className="text-[11px] text-muted">· {[p.city, p.state].filter(Boolean).join('/')}</span>}
                          <span className="text-[10px] uppercase tracking-widest font-bold px-1.5 py-0.5 shrink-0"
                            style={{ background: `${PART_STATUS_COLOR[p.status]}30`, color: PART_STATUS_COLOR[p.status] }}>
                            {PART_STATUS_LABEL[p.status]}
                          </span>
                        </div>
                        {p.submission_text && (
                          <p className="text-xs text-on-surface-variant mt-1 whitespace-pre-wrap">{p.submission_text}</p>
                        )}
                        {p.submission_url && (
                          <a href={p.submission_url} target="_blank" rel="noreferrer" className="text-[11px] text-secondary hover:text-on-surface flex items-center gap-1 mt-1">
                            <ExternalLink className="w-3 h-3" /> Prova
                          </a>
                        )}
                        <div className="text-[10px] text-muted mt-1 flex gap-3">
                          <span>Inscrito em {dateBR(p.joined_at)}</span>
                          {p.sales_amount_cents != null && <span>Venda: {brl(p.sales_amount_cents)}</span>}
                          {p.score != null && <span className="text-[#F59E0B]">Score: {p.score}</span>}
                        </div>
                      </div>
                      <div className="flex flex-col gap-1 shrink-0">
                        {p.status === 'submitted' && p.score == null && (
                          <button onClick={() => handleSetScore(p.id)} className="text-[11px] text-secondary hover:text-on-surface">
                            Atribuir score
                          </button>
                        )}
                        {p.participant_whatsapp && (
                          <a href={`https://wa.me/${p.participant_whatsapp.replace(/\D/g,'')}`} target="_blank" rel="noreferrer"
                            className="text-[11px] text-[#25D366] flex items-center gap-1">
                            <MessageCircle className="w-3 h-3" /> WhatsApp
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

const inputCls = 'w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none focus:border-[#F59E0B]/50 text-on-surface placeholder:text-muted';
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-on-surface-variant block mb-1">{label}</label>
      {children}
    </div>
  );
}
