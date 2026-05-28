import { useEffect, useMemo, useState } from 'react';
import { Wand2, Eye, Calendar, Loader2, Trash2, CheckCircle2, AlertCircle, Layers } from 'lucide-react';
import { marketingStore, type Platform } from '../../lib/marketingStore';

type Preview = NonNullable<Awaited<ReturnType<typeof marketingStore.bulkSchedule>>>;

function nextMonday(): string {
  const d = new Date();
  const day = d.getDay();
  const diff = day === 0 ? 1 : day === 1 ? 0 : (8 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function phaseLabel(week: number): string {
  if (week <= 8) return 'Fase 1: atrair (dor/conversa/valor)';
  if (week <= 16) return 'Fase 2: engajar (valor/método/conversa)';
  return 'Fase 3: converter (autoridade/método/oferta)';
}

export function Planejador() {
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [startDate, setStartDate] = useState<string>(nextMonday());
  const [weeks, setWeeks] = useState(12);
  const [perWeek, setPerWeek] = useState(5);
  const [selectedChannels, setSelectedChannels] = useState<string[]>([]);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmation, setConfirmation] = useState<string | null>(null);
  const [scheduledStats, setScheduledStats] = useState<{ scheduled: number; planned: number; available: number } | null>(null);

  useEffect(() => {
    (async () => {
      const ps = await marketingStore.listPlatforms();
      setPlatforms(ps);
      setSelectedChannels(ps.filter(p => p.is_active).map(p => p.code));
      refreshStats();
    })();
  }, []);

  const refreshStats = async () => {
    const [ideas, calendar] = await Promise.all([
      marketingStore.listIdeas(),
      marketingStore.listCalendar(),
    ]);
    setScheduledStats({
      scheduled: ideas.filter(i => i.status === 'scheduled').length,
      available: ideas.filter(i => i.status === 'available').length,
      planned: calendar.filter(c => c.status === 'planned').length,
    });
  };

  const totalPosts = useMemo(() => weeks * perWeek, [weeks, perWeek]);
  const canSchedule = scheduledStats && scheduledStats.available >= totalPosts;

  const toggleChannel = (code: string) => {
    setSelectedChannels(
      selectedChannels.includes(code)
        ? selectedChannels.filter(c => c !== code)
        : [...selectedChannels, code]
    );
  };

  const handlePreview = async () => {
    setBusy(true);
    setPreview(null);
    const r = await marketingStore.bulkSchedule({
      startDate, weeks, perWeek,
      channels: selectedChannels,
      dryRun: true,
    });
    setBusy(false);
    if (r) setPreview(r);
    else alert('Erro ao gerar preview — veja console.');
  };

  const handleSchedule = async () => {
    if (!confirm(`Gerar agenda real: ${totalPosts} posts entre ${startDate} e ${preview?.last_date ?? '?'}.\nIdeias serão marcadas como "scheduled" e posts entram no calendário.\nDá pra desfazer com "Limpar agenda".\n\nConfirma?`)) return;
    setBusy(true);
    const r = await marketingStore.bulkSchedule({
      startDate, weeks, perWeek,
      channels: selectedChannels,
      dryRun: false,
    });
    setBusy(false);
    if (r) {
      setConfirmation(`✓ ${r.posts_created} posts agendados de ${r.first_date} até ${r.last_date}.`);
      setPreview(null);
      refreshStats();
      setTimeout(() => setConfirmation(null), 6000);
    } else { alert('Erro ao gerar agenda — veja console.'); }
  };

  const handleClear = async () => {
    if (!confirm('LIMPAR todos os posts "planejados" (não publicados) e devolver as ideias pro banco?\nIsso NÃO mexe em posts em produção/prontos/publicados.\n\nConfirma?')) return;
    setBusy(true);
    const r = await marketingStore.unschedulePlanned();
    setBusy(false);
    if (r) {
      setConfirmation(`✓ Limpou ${r.posts_deleted} posts. ${r.ideas_freed} ideias voltaram pro banco.`);
      setPreview(null);
      refreshStats();
      setTimeout(() => setConfirmation(null), 6000);
    } else { alert('Erro ao limpar — veja console.'); }
  };

  return (
    <div className="p-8 max-w-5xl">
      <div className="flex items-center gap-2 mb-2">
        <Wand2 className="w-5 h-5 text-[#8B5CF6]" />
        <h2 className="text-lg font-semibold">Planejador de agenda</h2>
      </div>
      <p className="text-xs text-muted mb-6">
        Distribui as ideias do banco em N semanas no calendário, seguindo a estratégia OSI Fase 1→2→3.
        Cada post nasce com todas as plataformas pré-selecionadas (estratégia "inundação orgânica").
      </p>

      {/* Stats atuais */}
      {scheduledStats && (
        <div className="grid grid-cols-3 gap-3 mb-6">
          <StatCard label="Ideias disponíveis" value={String(scheduledStats.available)} color="#10B981" />
          <StatCard label="Ideias já agendadas" value={String(scheduledStats.scheduled)} color="#06B6D4" />
          <StatCard label="Posts planejados (não publicados)" value={String(scheduledStats.planned)} color="#F59E0B" />
        </div>
      )}

      {/* Form */}
      <div className="bg-surface-low border border-outline/10 p-5 mb-6 space-y-4">
        <h3 className="text-[10px] uppercase tracking-widest font-bold text-muted">Configuração</h3>

        <div className="grid grid-cols-3 gap-3">
          <Field label="Data inicial (segunda-feira)">
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className={inputCls} />
          </Field>
          <Field label={`Semanas: ${weeks}`}>
            <input type="range" min={4} max={24} value={weeks}
              onChange={e => setWeeks(parseInt(e.target.value))}
              className="w-full accent-[#8B5CF6]" />
            <div className="text-[10px] text-muted mt-1">{phaseLabel(weeks)}</div>
          </Field>
          <Field label={`Posts por semana: ${perWeek}`}>
            <input type="range" min={3} max={7} value={perWeek}
              onChange={e => setPerWeek(parseInt(e.target.value))}
              className="w-full accent-[#8B5CF6]" />
            <div className="text-[10px] text-muted mt-1">{perWeek}×/sem · {totalPosts} posts no total</div>
          </Field>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">
            Canais ativos ({selectedChannels.length})
            <span className="text-muted normal-case ml-2">— cada post vai pra todos esses canais</span>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {platforms.map(p => {
              const checked = selectedChannels.includes(p.code);
              return (
                <label key={p.code}
                  className={`flex items-center gap-2 px-3 py-2 border cursor-pointer text-xs
                    ${checked ? 'border-[#8B5CF6]/50 bg-[#8B5CF6]/10' : 'border-outline/10 hover:border-outline/30'}`}>
                  <input type="checkbox" checked={checked} onChange={() => toggleChannel(p.code)} className="accent-[#8B5CF6]" />
                  <span style={{ color: p.color ?? '#fff' }}>{p.name}</span>
                </label>
              );
            })}
          </div>
        </div>
      </div>

      {/* Aviso quando faltam ideias */}
      {!canSchedule && scheduledStats && totalPosts > 0 && (
        <div className="bg-[#F59E0B]/10 border border-[#F59E0B]/30 p-3 mb-4 text-xs text-[#F59E0B] flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>
            Você quer agendar <b>{totalPosts}</b> posts mas só tem <b>{scheduledStats.available}</b> ideias disponíveis.
            O planejador agenda só o que conseguir. Reduza semanas ou limpe agenda anterior pra liberar ideias.
          </span>
        </div>
      )}

      {/* Botões */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={handlePreview} disabled={busy || selectedChannels.length === 0}
          className="flex items-center gap-2 px-4 py-2 border border-outline/10 text-sm hover:bg-surface-highest disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Eye className="w-4 h-4" />}
          Visualizar prévia
        </button>
        <button onClick={handleSchedule} disabled={busy || !preview || selectedChannels.length === 0}
          className="flex items-center gap-2 px-4 py-2 bg-[#8B5CF6] text-white font-medium hover:bg-[#8B5CF6]/90 text-sm disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Calendar className="w-4 h-4" />}
          Gerar agenda real
        </button>
        <div className="flex-1" />
        {(scheduledStats?.planned ?? 0) > 0 && (
          <button onClick={handleClear} disabled={busy}
            className="flex items-center gap-2 px-3 py-2 border border-red-500/30 text-red-300 text-sm hover:bg-red-500/10 disabled:opacity-50">
            <Trash2 className="w-3.5 h-3.5" /> Limpar agenda
          </button>
        )}
      </div>

      {confirmation && (
        <div className="bg-[#10B981]/10 border border-[#10B981]/30 p-3 mb-6 text-sm text-[#10B981] flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" /> {confirmation}
        </div>
      )}

      {/* Preview */}
      {preview && (
        <div className="bg-surface-low border border-outline/10 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#8B5CF6]" /> Prévia da agenda
            </h3>
            <span className="text-xs text-on-surface-variant">
              {preview.posts_created} posts · {preview.first_date} → {preview.last_date} · {preview.channels_count} canais
            </span>
          </div>

          {/* Distribuição por pilar */}
          <div className="mb-4">
            <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">Distribuição por pilar</div>
            <div className="flex flex-wrap gap-2">
              {Object.entries(preview.by_pillar).map(([code, count]) => (
                <span key={code} className="text-xs bg-surface-low border border-outline/10 px-2 py-1">
                  <b>{code}</b> · {count}
                </span>
              ))}
            </div>
          </div>

          {/* Lista enxuta dos primeiros 30 */}
          <div className="text-[10px] uppercase tracking-widest font-bold text-muted mb-2">
            Primeiros 30 posts (de {preview.posts_created})
          </div>
          <div className="max-h-96 overflow-y-auto space-y-1">
            {(preview.preview ?? []).slice(0, 30).map((p, i) => (
              <div key={i} className="flex items-center gap-3 text-xs py-1 px-2 hover:bg-surface-highest">
                <span className="text-muted w-20 font-mono">{p.date}</span>
                <span className="bg-surface-low px-1.5 py-0.5 text-[10px] uppercase font-bold text-on-surface-variant w-20 text-center">{p.content_type}</span>
                <span className="flex-1 text-on-surface truncate">{p.hook}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

const inputCls = 'w-full bg-surface-low border border-outline/10 px-3 py-2 text-sm focus:outline-none focus:border-[#8B5CF6]/50 text-on-surface';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-on-surface-variant block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="bg-surface-low border border-outline/10 p-3">
      <div className="text-[10px] uppercase tracking-widest font-bold text-muted">{label}</div>
      <div className="text-2xl font-semibold mt-1" style={{ color }}>{value}</div>
    </div>
  );
}
