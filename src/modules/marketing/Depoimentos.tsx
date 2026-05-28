import { useEffect, useMemo, useState } from 'react';
import { MessageSquareQuote, Check, X, Sparkles, RefreshCw, ExternalLink, Star, Loader2, Copy } from 'lucide-react';
import { marketingStore, type ContentPillar } from '../../lib/marketingStore';

type Testimonial = Awaited<ReturnType<typeof marketingStore.listTestimonials>>[number];
type Stats = NonNullable<Awaited<ReturnType<typeof marketingStore.getTestimonialsStats>>>;

const STATUS_COLOR: Record<string, string> = {
  pending: '#F59E0B',
  approved: '#10B981',
  used: '#06B6D4',
  rejected: '#6B7280',
  spam: '#EF4444',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'Aguardando revisão',
  approved: 'Aprovado (pronto pra virar conteúdo)',
  used: 'Já virou ideia',
  rejected: 'Rejeitado',
  spam: 'Spam',
};

function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

export function Depoimentos() {
  const [items, setItems] = useState<Testimonial[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('pending');
  const [busy, setBusy] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const refresh = async () => {
    setLoading(true);
    const [t, s, p] = await Promise.all([
      marketingStore.listTestimonials(),
      marketingStore.getTestimonialsStats(),
      marketingStore.listPillars(),
    ]);
    setItems(t);
    setStats(s);
    setPillars(p);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const filtered = useMemo(
    () => items.filter((i) => statusFilter === 'all' || i.status === statusFilter),
    [items, statusFilter]
  );

  const publicUrl = useMemo(() => `${window.location.origin}/osi/depoimento`, []);

  const handleReview = async (id: string, status: Testimonial['status']) => {
    setBusy(id);
    const ok = await marketingStore.reviewTestimonial(id, status as any);
    setBusy(null);
    if (ok) refresh();
    else alert('Erro ao revisar.');
  };

  const handlePromote = async (id: string) => {
    const autoridadePillar = pillars.find((p) => p.code === 'autoridade');
    if (!confirm(`Criar ideia no banco a partir desse depoimento?\nVai entrar no pilar "${autoridadePillar?.name ?? 'Bastidor e autoridade'}".`)) return;
    setBusy(id);
    const ideaId = await marketingStore.promoteTestimonialToIdea(id, autoridadePillar?.id);
    setBusy(null);
    if (ideaId) { alert('Pronto! Ideia criada no Banco de Ideias.'); refresh(); }
    else alert('Erro ao promover.');
  };

  const copyPublicUrl = () => {
    navigator.clipboard.writeText(publicUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquareQuote className="w-5 h-5 text-[#EC4899]" />
            <h2 className="text-lg font-semibold">Depoimentos de vendedores</h2>
          </div>
          <p className="text-xs text-muted mt-1">
            Histórias enviadas pelo form público. Revisa, aprova e promove a ideia pronta no banco.
          </p>
        </div>
        <button onClick={refresh} className="flex items-center gap-2 px-3 py-1.5 text-sm border border-outline/10 hover:bg-surface-highest">
          <RefreshCw className="w-4 h-4" /> Atualizar
        </button>
      </div>

      {/* Link público */}
      <div className="bg-[#EC4899]/5 border border-[#EC4899]/20 p-4 mb-6">
        <div className="text-[10px] uppercase tracking-widest font-bold text-[#EC4899] mb-2">URL pública pra divulgar</div>
        <div className="flex items-center gap-2">
          <code className="flex-1 text-xs text-on-surface bg-surface-lowest border border-outline/10 px-2 py-1.5 font-mono break-all">{publicUrl}</code>
          <a href={publicUrl} target="_blank" rel="noreferrer" className="text-on-surface-variant hover:text-on-surface p-2"><ExternalLink className="w-4 h-4" /></a>
          <button onClick={copyPublicUrl} className="flex items-center gap-1 text-xs bg-[#EC4899] text-white px-3 py-1.5 hover:bg-[#EC4899]/90 shrink-0">
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copiado!' : 'Copiar'}
          </button>
        </div>
        <p className="text-[10px] text-muted mt-2">
          Cola na bio, nos Stories, no email pós-compra do Hotmart. Vendedor preenche, você revisa aqui.
        </p>
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-5 gap-3 mb-6">
          {(['pending','approved','used','rejected','spam'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`bg-surface-low border p-3 text-left transition-colors ${statusFilter === s ? 'border-outline/30 ring-1 ring-outline/30' : 'border-outline/10 hover:bg-surface-highest'}`}
            >
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted">{STATUS_LABEL[s].split(' (')[0]}</div>
              <div className="text-2xl font-semibold mt-1" style={{ color: STATUS_COLOR[s] }}>{stats[s] ?? 0}</div>
            </button>
          ))}
        </div>
      )}

      {/* Filtro all */}
      <div className="flex items-center gap-2 mb-4">
        <button
          onClick={() => setStatusFilter('all')}
          className={`text-xs px-3 py-1 rounded-full border ${statusFilter === 'all' ? 'border-outline/30 text-on-surface' : 'border-outline/10 text-on-surface-variant hover:border-outline/30'}`}
        >
          Ver todos ({stats?.total ?? 0})
        </button>
        <div className="text-xs text-muted">
          Filtrando: <span className="text-on-surface">{statusFilter === 'all' ? 'todos' : STATUS_LABEL[statusFilter]}</span>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-12 text-muted text-sm">Carregando...</div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface-low border border-outline/10 p-12 text-center text-muted">
          <MessageSquareQuote className="w-10 h-10 mx-auto mb-3 opacity-30" />
          <p className="text-sm">Nenhum depoimento {statusFilter !== 'all' && `com status "${STATUS_LABEL[statusFilter]}"`}.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((t) => (
            <TestimonialCard
              key={t.id}
              t={t}
              busy={busy === t.id}
              onApprove={() => handleReview(t.id, 'approved')}
              onReject={() => handleReview(t.id, 'rejected')}
              onSpam={() => handleReview(t.id, 'spam')}
              onPromote={() => handlePromote(t.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TestimonialCard({ t, busy, onApprove, onReject, onSpam, onPromote }: {
  t: Testimonial;
  busy: boolean;
  onApprove: () => void;
  onReject: () => void;
  onSpam: () => void;
  onPromote: () => void;
}) {
  const date = new Date(t.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  return (
    <div className="bg-surface-low border border-outline/10 p-4 border-l-4" style={{ borderLeftColor: STATUS_COLOR[t.status] }}>
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-semibold">{t.full_name}</span>
            {t.optica_name && <span className="text-xs text-on-surface-variant">· {t.optica_name}</span>}
            {(t.city || t.state) && <span className="text-xs text-muted">· {[t.city, t.state].filter(Boolean).join('/')}</span>}
            {t.rating && (
              <span className="text-[#F59E0B] text-xs flex items-center gap-0.5">
                {Array.from({ length: t.rating }).map((_, i) => <Star key={i} className="w-3 h-3 fill-current" />)}
              </span>
            )}
          </div>
          <div className="text-[10px] text-muted">
            {date}
            {t.hotmart_transaction && ` · Hotmart: ${t.hotmart_transaction}`}
            {t.whatsapp && ` · WA: ${t.whatsapp}${t.whatsapp_consent ? ' (autorizou contato)' : ' (não autorizou contato)'}`}
            {t.sale_value_cents !== null && t.sale_value_cents !== undefined && ` · Venda: ${brl(t.sale_value_cents)}`}
          </div>
        </div>
        <span
          className="text-[10px] uppercase tracking-widest font-bold px-2 py-0.5 shrink-0"
          style={{ background: `${STATUS_COLOR[t.status]}20`, color: STATUS_COLOR[t.status] }}
        >
          {STATUS_LABEL[t.status]}
        </span>
      </div>

      {t.hook_applied && (
        <div className="text-[11px] text-on-surface-variant mb-2">
          <span className="text-muted">Hook aplicado:</span> {t.hook_applied}
        </div>
      )}

      <p className="text-sm text-on-surface mb-3 whitespace-pre-wrap">{t.story}</p>

      {t.photo_url && (
        <a href={t.photo_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[11px] text-secondary hover:text-on-surface mb-2">
          <ExternalLink className="w-3 h-3" /> Foto enviada
        </a>
      )}

      {t.promoted_idea_hook && (
        <div className="text-[11px] text-secondary mb-2">
          ✓ Já virou ideia: <em>{t.promoted_idea_hook}</em>
        </div>
      )}

      {t.reviewer_notes && (
        <div className="text-[11px] text-muted mb-2 italic">
          Notas: {t.reviewer_notes}
        </div>
      )}

      {/* Actions */}
      <div className="flex items-center gap-2 pt-2 border-t border-outline/10">
        {t.status === 'pending' && (
          <>
            <button onClick={onApprove} disabled={busy}
              className="flex items-center gap-1 text-xs bg-[#10B981] text-[#0A0F1E] font-medium px-3 py-1.5 hover:bg-[#10B981]/90 disabled:opacity-50">
              {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />} Aprovar
            </button>
            <button onClick={onReject} disabled={busy}
              className="flex items-center gap-1 text-xs border border-outline/10 text-on-surface-variant px-3 py-1.5 hover:bg-surface-highest disabled:opacity-50">
              <X className="w-3 h-3" /> Rejeitar
            </button>
            <button onClick={onSpam} disabled={busy}
              className="text-xs text-red-400/70 hover:text-red-400 px-2 py-1.5 disabled:opacity-50">
              Spam
            </button>
          </>
        )}
        {t.status === 'approved' && !t.promoted_idea_id && (
          <button onClick={onPromote} disabled={busy}
            className="flex items-center gap-1 text-xs bg-secondary text-surface font-medium px-3 py-1.5 hover:bg-secondary/90 disabled:opacity-50">
            {busy ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />} Promover a ideia
          </button>
        )}
        {(t.status === 'rejected' || t.status === 'spam') && (
          <button onClick={onApprove} disabled={busy}
            className="text-xs text-muted hover:text-on-surface px-3 py-1.5">
            Reabrir como pending
          </button>
        )}
      </div>
    </div>
  );
}
