import { useEffect, useMemo, useState } from 'react';
import { Radio, ArrowUpRight } from 'lucide-react';
import { marketingStore, type CalendarPost, type SocialUpdate } from '../lib/marketingStore';
import { CONTAS_SOCIAIS } from '../modules/marketing/Redes';
import type { ModuleId } from './Sidebar';

// Pulso de Publicações — torna a operação social das 3 camadas (pessoal · DIGIAI
// · OSI) visível no centro de comando. Lê o calendário editorial
// (v_marketing_calendar) + o log eterno de atualizações (Redes). O log pode estar
// indisponível se a migration 041 não estiver aplicada — degrada com elegância.

type Camada = 'pessoal' | 'digiai' | 'osi';

const CAMADAS: { id: Camada; label: string; sub: string }[] = [
  { id: 'pessoal', label: 'Pessoal',  sub: 'Gilberto · build in public' },
  { id: 'digiai',  label: 'DIGIAI',   sub: 'Institucional' },
  { id: 'osi',     label: 'OSI',      sub: 'Ótica Sem Improviso' },
];

const CAMADA_POR_CONTA = new Map<string, Camada>(
  CONTAS_SOCIAIS.map((c) => [c.code, c.camada as Camada]),
);

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

// Segunda-feira da semana corrente (ISO).
function weekStartIso(): string {
  const d = new Date();
  const offset = (d.getDay() + 6) % 7; // domingo=0 → 6, segunda=1 → 0
  d.setDate(d.getDate() - offset);
  return d.toISOString().slice(0, 10);
}

export default function PulsoPublicacoes({ onNavigate }: { onNavigate?: (id: ModuleId) => void }) {
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [updates, setUpdates] = useState<SocialUpdate[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const [calendar, log] = await Promise.all([
        marketingStore.listCalendar(),
        marketingStore.listSocialUpdates(),
      ]);
      if (!alive) return;
      setPosts(calendar);
      setUpdates(log);
      setLoading(false);
    })();
    return () => { alive = false; };
  }, []);

  const today = todayIso();
  const weekStart = weekStartIso();

  // Log real (publicado de fato) por camada — hoje e na semana.
  const porCamada = useMemo(() => {
    const base: Record<Camada, { hoje: number; semana: number }> = {
      pessoal: { hoje: 0, semana: 0 },
      digiai: { hoje: 0, semana: 0 },
      osi: { hoje: 0, semana: 0 },
    };
    if (!updates) return base;
    for (const u of updates) {
      if (u.update_type !== 'post') continue;
      const camada = CAMADA_POR_CONTA.get(u.account_code);
      if (!camada) continue;
      if (u.happened_on >= weekStart && u.happened_on <= today) base[camada].semana++;
      if (u.happened_on === today) base[camada].hoje++;
    }
    return base;
  }, [updates, today, weekStart]);

  // Pipeline do calendário editorial (planejado → publicado).
  const calStats = useMemo(() => {
    const hoje = posts.filter((p) => p.scheduled_date === today);
    const semana = posts.filter((p) => p.scheduled_date >= weekStart && p.scheduled_date <= weekEndIso());
    return {
      hojeTotal: hoje.length,
      hojePublicados: hoje.filter((p) => p.status === 'published').length,
      hojePendentes: hoje.filter((p) => p.status !== 'published' && p.status !== 'cancelled').length,
      semanaTotal: semana.filter((p) => p.status !== 'cancelled').length,
      semanaPublicados: semana.filter((p) => p.status === 'published').length,
    };
  }, [posts, today, weekStart]);

  return (
    <div className="bg-surface-low border border-outline/10 p-5">
      <div className="flex items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <Radio className="w-5 h-5 text-secondary" />
          <h2 className="font-serif text-lg font-semibold text-on-surface">Pulso de Publicações</h2>
          <span className="text-[11px] font-mono text-muted ml-1">3 camadas · hoje &amp; semana</span>
        </div>
        <button
          onClick={() => onNavigate?.('marketing')}
          className="flex items-center gap-1 text-[11px] font-mono uppercase tracking-widest text-muted hover:text-secondary transition-colors"
        >
          Calendário <ArrowUpRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {loading ? (
        <div className="text-sm text-muted py-4">Carregando pulso...</div>
      ) : (
        <>
          {/* 3 camadas — publicações registradas no log */}
          <div className="grid grid-cols-3 gap-3">
            {CAMADAS.map((c) => {
              const stat = porCamada[c.id];
              const target: ModuleId = c.id === 'osi' ? 'marketing' : 'marketing-redes';
              return (
                <button
                  key={c.id}
                  onClick={() => onNavigate?.(target)}
                  className="text-left bg-surface border border-outline/10 p-3 transition-all hover:border-secondary/40"
                >
                  <div className="text-[10px] font-mono uppercase tracking-widest text-secondary">{c.label}</div>
                  <div className="text-2xl font-serif font-bold text-on-surface mt-1">
                    {stat.semana}
                    <span className="text-xs font-sans font-normal text-muted ml-1">na semana</span>
                  </div>
                  <div className="text-[11px] text-muted mt-0.5">
                    {stat.hoje > 0 ? `${stat.hoje} hoje` : 'nada hoje'} · {c.sub}
                  </div>
                </button>
              );
            })}
          </div>

          {updates === null && (
            <div className="mt-3 text-[11px] text-amber-300/90 bg-amber-500/[0.06] border border-amber-500/20 px-3 py-2">
              Log de publicações indisponível (migration 041 pendente) — números por camada zerados. O pipeline do calendário abaixo segue valendo.
            </div>
          )}

          {/* Pipeline do calendário editorial */}
          <div className="mt-4 pt-4 border-t border-outline/10 flex flex-wrap items-center gap-x-6 gap-y-1 text-sm">
            <span className="text-[10px] font-mono uppercase tracking-widest text-muted">Calendário editorial</span>
            <span className="text-on-surface-variant">
              Hoje: <b className="text-on-surface">{calStats.hojeTotal}</b>
              {calStats.hojeTotal > 0 && (
                <span className="text-muted"> ({calStats.hojePublicados} publicados · {calStats.hojePendentes} a fazer)</span>
              )}
            </span>
            <span className="text-on-surface-variant">
              Semana: <b className="text-on-surface">{calStats.semanaTotal}</b> agendados
              <span className="text-muted"> · {calStats.semanaPublicados} publicados</span>
            </span>
          </div>
        </>
      )}
    </div>
  );
}

// Domingo da semana corrente (ISO) — fim da janela semanal.
function weekEndIso(): string {
  const d = new Date();
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset + 6);
  return d.toISOString().slice(0, 10);
}
