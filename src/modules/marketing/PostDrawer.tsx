import { useEffect, useMemo, useState } from 'react';
import { X, Plus, Trash2, ExternalLink, Save, Loader2, Sparkles, Package, Check, DollarSign, Copy, Link as LinkIcon, Wand2, ShieldCheck } from 'lucide-react';
import { marketingStore, type CalendarPost, type CalendarStatus, type ContentPillar, type Platform, type CalendarArt } from '../../lib/marketingStore';
import { PromptGeneratorModal } from './PromptGeneratorModal';
import { ProduzirPostWizard } from './ProduzirPostWizard';

const HOTMART_BASE = 'https://go.hotmart.com/B105515825L?dp=1';

function brl(cents: number) {
  return (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function buildHotmartUrl(post: CalendarPost): string {
  const platform = (post.platforms?.[0] ?? post.platform ?? 'organic').toLowerCase().replace(/[^a-z0-9]/g, '');
  const pillarCode = post.pillar_code ?? 'sem-pilar';
  const params = new URLSearchParams({
    utm_source: 'osi',
    utm_medium: platform,
    utm_campaign: pillarCode,
    utm_content: `post:${post.id}`,
  });
  return `${HOTMART_BASE}&${params.toString()}`;
}

interface Props {
  post: CalendarPost;
  pillars: ContentPillar[];
  platforms: Platform[];
  onClose: () => void;
  onSaved: () => void;
}

const STATUS_OPTIONS: { value: CalendarStatus; label: string; color: string }[] = [
  { value: 'planned', label: 'Planejado', color: '#06B6D4' },
  { value: 'in_production', label: 'Em produção', color: '#F59E0B' },
  { value: 'ready', label: 'Pronto', color: '#8B5CF6' },
  { value: 'published', label: 'Publicado', color: '#10B981' },
  { value: 'cancelled', label: 'Cancelado', color: '#6B7280' },
];

const ART_TYPES = ['cover', 'story', 'reel', 'carrossel', 'video', 'thumb', 'outro'];
const TOOLS_SUGGESTIONS = ['Canva', 'CapCut', 'Photoshop', 'Figma', 'After Effects', 'Inshot', 'IA (Midjourney)', 'IA (DALL-E)', 'IA (Gemini)'];

export function PostDrawer({ post, pillars, platforms, onClose, onSaved }: Props) {
  const [draft, setDraft] = useState<CalendarPost>(post);
  const [saving, setSaving] = useState(false);
  const [showPromptsModal, setShowPromptsModal] = useState(false);
  const [showWizard, setShowWizard] = useState(false);
  const [promotedMaterialId, setPromotedMaterialId] = useState<string | null>(null);
  const [promoting, setPromoting] = useState(false);
  const [sales, setSales] = useState<Awaited<ReturnType<typeof marketingStore.getPostSales>>>(null);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [gateOpen, setGateOpen] = useState(false);
  const [gate, setGate] = useState({ humano: false, optin: false, cta: false, template: false });

  useEffect(() => { setDraft(post); }, [post.id]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const [promoId, salesData] = await Promise.all([
        marketingStore.getPostPromotion(post.id),
        marketingStore.getPostSales(post.id),
      ]);
      if (!cancelled) {
        setPromotedMaterialId(promoId);
        setSales(salesData);
      }
    })();
    return () => { cancelled = true; };
  }, [post.id]);

  const hotmartUrl = useMemo(() => buildHotmartUrl(draft), [draft.id, draft.platforms, draft.platform, draft.pillar_code]);

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(hotmartUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  const handlePromote = async () => {
    if (!confirm('Promover este post para a biblioteca de Materiais (afiliados)?\nO copy, hook, artes e plataformas serão copiados.')) return;
    setPromoting(true);
    const r = await marketingStore.promotePostToMaterial(post.id);
    setPromoting(false);
    if (!r) { alert('Erro ao promover — veja console.'); return; }
    setPromotedMaterialId(r.materialId);
    if (r.alreadyPromoted) alert('Este post já tinha sido promovido. Material existente recuperado.');
    else alert('Promovido! Disponível em Marketing → Materiais (afiliados).');
  };

  const update = (patch: Partial<CalendarPost>) => setDraft({ ...draft, ...patch });

  const togglePlatform = (code: string) => {
    const current = draft.platforms ?? [];
    update({ platforms: current.includes(code) ? current.filter(p => p !== code) : [...current, code] });
  };

  const addArt = () => update({ arts: [...(draft.arts ?? []), { type: 'cover', format: '1080x1080', url: '', label: '' }] });
  const updateArt = (idx: number, patch: Partial<CalendarArt>) => {
    const arts = [...(draft.arts ?? [])];
    arts[idx] = { ...arts[idx], ...patch };
    update({ arts });
  };
  const removeArt = (idx: number) => update({ arts: (draft.arts ?? []).filter((_, i) => i !== idx) });

  const gatePassed = gate.humano && gate.optin && gate.cta && gate.template;
  const handleSave = async () => {
    // Trava dura (R-011/R-013): publicar exige checklist confirmado.
    if (draft.status === 'published' && !gatePassed) { setGateOpen(true); return; }
    setSaving(true);
    const patch: Partial<CalendarPost> = {
      scheduled_date: draft.scheduled_date,
      scheduled_time: draft.scheduled_time,
      pillar_id: draft.pillar_id,
      platforms: draft.platforms ?? [],
      content_type: draft.content_type,
      hook: draft.hook,
      copy_full: draft.copy_full,
      posting_brief: draft.posting_brief,
      cta: draft.cta,
      hashtags: draft.hashtags ?? [],
      arts: draft.arts ?? [],
      media_external_url: draft.media_external_url,
      tools_used: draft.tools_used ?? [],
      responsible_producer: draft.responsible_producer,
      responsible_publisher: draft.responsible_publisher,
      status: draft.status,
      published_url: draft.published_url,
      reach: draft.reach,
      likes: draft.likes,
      comments: draft.comments,
      shares: draft.shares,
      saves: draft.saves,
      link_clicks: draft.link_clicks,
      conversions: draft.conversions,
      notes: draft.notes,
    };
    const ok = await marketingStore.updateCalendarPost(post.id, patch);
    setSaving(false);
    if (ok) { onSaved(); onClose(); } else { alert('Erro ao salvar — veja console.'); }
  };

  return (
    <div className="fixed inset-0 z-50 flex" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div className="relative ml-auto w-full max-w-3xl h-full bg-[#0F1729] border-l border-white/10 overflow-y-auto" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 z-10 bg-[#0F1729] border-b border-white/10 px-6 py-4 flex items-center justify-between">
          <div className="flex-1">
            <div className="text-[10px] uppercase tracking-widest font-bold" style={{ color: draft.pillar_color ?? '#06B6D4' }}>
              {draft.pillar_name ?? 'Sem pilar'}
            </div>
            <h2 className="text-lg font-semibold mt-1">{draft.hook ?? 'Sem hook'}</h2>
            <p className="text-xs text-white/40 mt-0.5">{draft.scheduled_date}</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWizard(true)}
              className="flex items-center gap-2 px-3 py-2 bg-[#10B981] text-[#0A0F1E] font-medium rounded-lg hover:bg-[#10B981]/90 text-sm"
              title="Wizard 4 steps: roteiro / capa / voz / vídeo. Salva tudo no banco."
            >
              <Wand2 className="w-4 h-4" />
              Produzir post
            </button>
            <button
              onClick={() => setShowPromptsModal(true)}
              className="flex items-center gap-2 px-3 py-2 border border-[#06B6D4]/40 text-[#06B6D4] rounded-lg hover:bg-[#06B6D4]/10 text-sm"
              title="Gerar prompt avulso (sem o wizard)"
            >
              <Sparkles className="w-4 h-4" />
              Prompts IA
            </button>
            <button
              onClick={handlePromote}
              disabled={promoting}
              title={promotedMaterialId ? 'Já promovido — clique pra abrir' : 'Promover este post como material para afiliados'}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm disabled:opacity-50 ${promotedMaterialId ? 'border-[#10B981]/40 text-[#10B981] hover:bg-[#10B981]/10' : 'border-[#8B5CF6]/40 text-[#8B5CF6] hover:bg-[#8B5CF6]/10'}`}
            >
              {promoting ? <Loader2 className="w-4 h-4 animate-spin" /> : promotedMaterialId ? <Check className="w-4 h-4" /> : <Package className="w-4 h-4" />}
              {promotedMaterialId ? 'Já é material' : 'Virar material afiliado'}
            </button>
            <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-[#06B6D4] text-[#0A0F1E] font-medium rounded-lg hover:bg-[#06B6D4]/90 text-sm disabled:opacity-50">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Salvar
            </button>
            <button onClick={onClose} className="p-2 text-white/60 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
        </div>

        {/* Body */}
        <div className="p-6 space-y-6">

          {/* Status pipeline */}
          <Section title="Status">
            <div className="flex flex-wrap gap-2">
              {STATUS_OPTIONS.map(s => (
                <button
                  key={s.value}
                  onClick={() => update({ status: s.value })}
                  className={`px-3 py-1.5 text-xs font-bold uppercase tracking-widest rounded ${draft.status === s.value ? 'text-[#0A0F1E]' : 'text-white/40 hover:text-white/70 border border-white/10'}`}
                  style={draft.status === s.value ? { background: s.color } : {}}
                >
                  {s.label}
                </button>
              ))}
            </div>
            {draft.status === 'published' && !gatePassed && (
              <p className="text-[11px] text-amber-300/80 mt-2">⚠ Publicar exige confirmar as travas de marketing ao salvar.</p>
            )}
          </Section>

          {gateOpen && (
            <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 p-4" onClick={(e) => { e.stopPropagation(); setGateOpen(false); }}>
              <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-[#0F1729] p-6 space-y-4" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                  <h3 className="font-bold text-base">Travas de marketing — confirmar antes de publicar</h3>
                </div>
                <p className="text-xs text-white/50">Marcar como <b className="text-white/80">Publicado</b> exige confirmar as travas (R-011 / R-013). AI não publica sozinha.</p>
                <div className="space-y-2">
                  {([
                    ['humano', 'Revisado e aprovado por humano (R-011)'],
                    ['optin', 'Base com opt-in / consentimento LGPD (R-013)'],
                    ['cta', 'CTA pro Clearix presente no conteúdo'],
                    ['template', 'Categoria / template correto (se WhatsApp ativo)'],
                  ] as const).map(([k, label]) => (
                    <label key={k} className="flex items-start gap-2 text-sm text-white/75 cursor-pointer">
                      <input type="checkbox" checked={gate[k]} onChange={e => setGate(g => ({ ...g, [k]: e.target.checked }))} className="mt-0.5" />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button onClick={() => setGateOpen(false)} className="px-3 py-2 text-sm text-white/50 hover:text-white">Cancelar</button>
                  <button
                    disabled={!gatePassed}
                    onClick={() => { setGateOpen(false); handleSave(); }}
                    className="px-4 py-2 text-sm font-medium rounded-lg bg-[#10B981] text-[#0A0F1E] disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    Confirmar e publicar
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Data + tempo + pilar + tipo */}
          <Section title="Quando + categorização">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Data">
                <input type="date" value={draft.scheduled_date} onChange={e => update({ scheduled_date: e.target.value })} className={inputCls} />
              </Field>
              <Field label="Horário">
                <input type="time" value={draft.scheduled_time ?? ''} onChange={e => update({ scheduled_time: e.target.value || null })} className={inputCls} />
              </Field>
              <Field label="Pilar">
                <select value={draft.pillar_id ?? ''} onChange={e => update({ pillar_id: e.target.value || null })} className={inputCls}>
                  <option value="">(sem pilar)</option>
                  {pillars.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="Tipo de conteúdo">
                <input value={draft.content_type ?? ''} onChange={e => update({ content_type: e.target.value || null })} placeholder="reel / carrossel / post / story" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Plataformas + adaptador por canal */}
          <Section title={`Onde postar (${(draft.platforms ?? []).length} de ${platforms.length} canais)`}>
            <div className="grid grid-cols-3 gap-2">
              {platforms.map(p => {
                const checked = (draft.platforms ?? []).includes(p.code);
                return (
                  <label key={p.code} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer text-xs ${checked ? 'border-[#06B6D4]/50 bg-[#06B6D4]/10' : 'border-white/10 hover:border-white/20'}`}>
                    <input type="checkbox" checked={checked} onChange={() => togglePlatform(p.code)} className="accent-[#06B6D4]" />
                    <span style={{ color: p.color ?? '#fff' }}>{p.name}</span>
                  </label>
                );
              })}
            </div>
            {(draft.platforms ?? []).length > 1 && (
              <div className="mt-3 bg-[#8B5CF6]/5 border border-[#8B5CF6]/20 rounded p-2 text-[11px] text-white/70 flex items-start gap-2">
                <Sparkles className="w-3.5 h-3.5 text-[#8B5CF6] shrink-0 mt-0.5" />
                <span>
                  <strong className="text-[#8B5CF6]">Estratégia inundação:</strong> esse post vai em {(draft.platforms ?? []).length} canais.
                  Use "Gerar prompts IA" no topo pra criar a copy adaptada de cada formato (feed/reel/story/carrossel/email/etc) com mesmo nucleus.
                </span>
              </div>
            )}
          </Section>

          {/* Link Hotmart com UTM + Vendas atribuídas */}
          <Section title="Link de venda Hotmart (com UTM)">
            <div className="bg-black/30 border border-white/10 rounded-lg p-3">
              <div className="flex items-center gap-2 mb-2">
                <LinkIcon className="w-3.5 h-3.5 text-[#06B6D4]" />
                <span className="text-[10px] uppercase tracking-widest font-bold text-white/40">URL pronta pra colar na bio/stories/post</span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-[11px] text-white/70 bg-black/40 border border-white/10 rounded px-2 py-1.5 font-mono break-all">{hotmartUrl}</code>
                <button
                  onClick={handleCopyUrl}
                  className="flex items-center gap-1 text-[11px] bg-[#06B6D4] text-[#0A0F1E] font-medium px-3 py-1.5 rounded hover:bg-[#06B6D4]/90 shrink-0"
                >
                  {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedUrl ? 'Copiado!' : 'Copiar'}
                </button>
              </div>
              <p className="text-[10px] text-white/30 mt-2">
                UTMs: source=osi · medium={(draft.platforms?.[0] ?? draft.platform ?? 'organic').toLowerCase()} · campaign={draft.pillar_code ?? 'sem-pilar'} · content=post:{draft.id.slice(0, 8)}…
              </p>
            </div>

            {/* Vendas atribuídas */}
            {sales && sales.sales_count > 0 ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                <StatPill label="Vendas" value={String(sales.sales_count)} color="#10B981" icon={<DollarSign className="w-3 h-3" />} />
                <StatPill label="Receita" value={brl(sales.revenue_cents)} color="#10B981" />
                <StatPill label="Comissão" value={brl(sales.commission_cents)} color="#06B6D4" />
                {sales.refunds_count > 0 && (
                  <StatPill label="Reembolsos" value={String(sales.refunds_count)} color="#F59E0B" />
                )}
                {sales.chargebacks_count > 0 && (
                  <StatPill label="Chargebacks" value={String(sales.chargebacks_count)} color="#EF4444" />
                )}
                {sales.affiliate_sales_count > 0 && (
                  <StatPill label="Via afiliado" value={String(sales.affiliate_sales_count)} color="#8B5CF6" />
                )}
              </div>
            ) : (
              <p className="text-[11px] text-white/30 mt-2">
                Nenhuma venda atribuída a este post ainda. Vendas que entrarem pela URL acima aparecem aqui automaticamente.
              </p>
            )}
          </Section>

          {/* Brief criativo */}
          <Section title="Brief inicial (ideia criativa para quem produz)">
            <textarea value={draft.posting_brief ?? ''} onChange={e => update({ posting_brief: e.target.value || null })} rows={3} placeholder="Descreva a ideia, ângulo, referências, tom..." className={inputCls} />
          </Section>

          {/* Copy completa */}
          <Section title="Copy final (pronta pra colar)">
            <div className="space-y-2">
              <Field label="Hook (gancho)">
                <input value={draft.hook ?? ''} onChange={e => update({ hook: e.target.value || null })} className={inputCls} />
              </Field>
              <Field label="Copy completa">
                <textarea value={draft.copy_full ?? ''} onChange={e => update({ copy_full: e.target.value || null })} rows={6} placeholder="Texto pronto para colar no Instagram/Facebook/TikTok..." className={inputCls + ' font-mono text-xs'} />
              </Field>
              <Field label="CTA">
                <input value={draft.cta ?? ''} onChange={e => update({ cta: e.target.value || null })} className={inputCls} />
              </Field>
              <Field label="Hashtags (separadas por espaço, sem #)">
                <input value={(draft.hashtags ?? []).join(' ')} onChange={e => update({ hashtags: e.target.value.split(/\s+/).filter(Boolean) })} placeholder="otica vendas balcao" className={inputCls} />
              </Field>
            </div>
          </Section>

          {/* Artes (links externos) */}
          <Section title="Artes (links externos — Canva, Drive, etc.)">
            <div className="space-y-2">
              {(draft.arts ?? []).map((art, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-lg p-2">
                  <select value={art.type} onChange={e => updateArt(idx, { type: e.target.value })} className="bg-transparent text-xs border border-white/10 rounded px-2 py-1">
                    {ART_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                  <input value={art.format ?? ''} onChange={e => updateArt(idx, { format: e.target.value })} placeholder="1080x1080" className="bg-transparent text-xs border border-white/10 rounded px-2 py-1 w-24" />
                  <input value={art.url} onChange={e => updateArt(idx, { url: e.target.value })} placeholder="https://canva.com/..." className="flex-1 bg-transparent text-xs border border-white/10 rounded px-2 py-1" />
                  {art.url && <a href={art.url} target="_blank" rel="noreferrer" className="text-white/40 hover:text-white"><ExternalLink className="w-3.5 h-3.5" /></a>}
                  <button onClick={() => removeArt(idx)} className="text-white/40 hover:text-red-400"><Trash2 className="w-3.5 h-3.5" /></button>
                </div>
              ))}
              <button onClick={addArt} className="flex items-center gap-1 text-xs text-[#06B6D4] hover:text-white">
                <Plus className="w-3.5 h-3.5" /> Adicionar arte
              </button>
            </div>
          </Section>

          {/* Responsáveis + ferramentas */}
          <Section title="Quem produz + ferramentas">
            <div className="grid grid-cols-2 gap-3">
              <Field label="Responsável produção">
                <input value={draft.responsible_producer ?? ''} onChange={e => update({ responsible_producer: e.target.value || null })} className={inputCls} />
              </Field>
              <Field label="Responsável publicação">
                <input value={draft.responsible_publisher ?? ''} onChange={e => update({ responsible_publisher: e.target.value || null })} className={inputCls} />
              </Field>
            </div>
            <Field label="Ferramentas (separadas por vírgula)">
              <input value={(draft.tools_used ?? []).join(', ')} onChange={e => update({ tools_used: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })} placeholder="Canva, CapCut" className={inputCls + ' mt-2'} />
            </Field>
            <p className="text-[11px] text-white/30 mt-1">Sugestões: {TOOLS_SUGGESTIONS.join(' · ')}</p>
          </Section>

          {/* Pós-publicação */}
          {draft.status === 'published' && (
            <Section title="Performance (após publicar)">
              <Field label="URL do post publicado">
                <input value={draft.published_url ?? ''} onChange={e => update({ published_url: e.target.value || null })} placeholder="https://instagram.com/p/..." className={inputCls} />
              </Field>
              <div className="grid grid-cols-4 gap-2 mt-3">
                {[
                  ['reach', 'Reach'], ['likes', 'Likes'], ['comments', 'Comentários'], ['shares', 'Shares'],
                  ['saves', 'Salvos'], ['link_clicks', 'Cliques link'], ['conversions', 'Conversões'], ['impressions', 'Impressões'],
                ].map(([k, label]) => (
                  <Field key={k} label={label}>
                    <input type="number" value={(draft as any)[k] ?? ''} onChange={e => update({ [k]: e.target.value === '' ? null : parseInt(e.target.value, 10) } as any)} className={inputCls} />
                  </Field>
                ))}
              </div>
            </Section>
          )}

          {/* Notas */}
          <Section title="Notas internas">
            <textarea value={draft.notes ?? ''} onChange={e => update({ notes: e.target.value || null })} rows={2} className={inputCls} />
          </Section>

        </div>
      </div>

      {showPromptsModal && (
        <PromptGeneratorModal
          source={{ kind: 'post', post: draft }}
          onClose={() => setShowPromptsModal(false)}
        />
      )}

      {showWizard && (
        <ProduzirPostWizard
          post={draft}
          onClose={() => setShowWizard(false)}
          onChanged={() => { onSaved(); }}
        />
      )}
    </div>
  );
}

const inputCls = 'w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#06B6D4]/50 text-white placeholder:text-white/30';

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-widest font-bold text-white/40 mb-2">{title}</div>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-white/50 block mb-1">{label}</label>
      {children}
    </div>
  );
}

function StatPill({ label, value, color, icon }: { label: string; value: string; color: string; icon?: React.ReactNode }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded px-2 py-1.5">
      <div className="flex items-center gap-1 text-[9px] uppercase tracking-widest font-bold text-white/40">
        {icon} {label}
      </div>
      <div className="text-sm font-semibold mt-0.5" style={{ color }}>{value}</div>
    </div>
  );
}
