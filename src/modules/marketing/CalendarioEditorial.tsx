import { useEffect, useMemo, useState } from 'react';
import { Calendar, CheckCircle2, Clock, ExternalLink, Filter, RefreshCw, X, Pencil, List, LayoutGrid, ChevronLeft, ChevronRight } from 'lucide-react';
import { marketingStore, type CalendarPost, type CalendarStatus, type ContentPillar, type Platform } from '../../lib/marketingStore';
import { PostDrawer } from './PostDrawer';

export function CalendarioEditorial() {
  const [posts, setPosts] = useState<CalendarPost[]>([]);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [platforms, setPlatforms] = useState<Platform[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [editing, setEditing] = useState<CalendarPost | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'month'>('month');
  const [monthCursor, setMonthCursor] = useState(() => {
    const d = new Date();
    d.setDate(1);
    return d;
  });

  const refresh = async () => {
    setLoading(true);
    const [postsData, pillarsData, platformsData] = await Promise.all([
      marketingStore.listCalendar(),
      marketingStore.listPillars(),
      marketingStore.listPlatforms(),
    ]);
    setPosts(postsData);
    setPillars(pillarsData);
    setPlatforms(platformsData);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return posts.filter((p) => {
      if (statusFilter !== 'all' && p.status !== statusFilter) return false;
      if (pillarFilter !== 'all' && p.pillar_code !== pillarFilter) return false;
      return true;
    });
  }, [posts, statusFilter, pillarFilter]);

  // Agrupa por data
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const p of filtered) {
      if (!map.has(p.scheduled_date)) map.set(p.scheduled_date, []);
      map.get(p.scheduled_date)!.push(p);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  const stats = useMemo(() => {
    return {
      planned: posts.filter((p) => p.status === 'planned').length,
      in_production: posts.filter((p) => p.status === 'in_production').length,
      ready: posts.filter((p) => p.status === 'ready').length,
      published: posts.filter((p) => p.status === 'published').length,
    };
  }, [posts]);

  const handleAdvanceStatus = async (post: CalendarPost) => {
    // Trava de marketing: publicar só pelo PostDrawer (com checklist R-011/R-013).
    // O avanço rápido para em "Pronto" e manda abrir o post pra publicar.
    const next: Record<CalendarStatus, CalendarStatus> = {
      planned: 'in_production',
      in_production: 'ready',
      ready: 'ready',
      published: 'published',
      cancelled: 'cancelled',
    };
    const newStatus = next[post.status];
    if (newStatus === post.status) {
      if (post.status === 'ready') alert('Para publicar, abra o post e confirme as travas de marketing.');
      return;
    }
    const ok = await marketingStore.updateCalendarPost(post.id, {
      status: newStatus,
      published_at: newStatus === 'published' ? new Date().toISOString() : post.published_at,
    });
    if (ok) await refresh();
  };

  return (
    <div className="p-8">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="text-sm text-white/60">
          {posts.length} postagens no calendário
        </div>

        <div className="flex-1" />

        {/* View toggle */}
        <div className="flex border border-white/10 rounded-lg overflow-hidden">
          <button
            onClick={() => setViewMode('month')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs ${viewMode === 'month' ? 'bg-[#06B6D4] text-[#0A0F1E] font-medium' : 'text-white/60 hover:bg-white/5'}`}
          >
            <LayoutGrid className="w-3.5 h-3.5" /> Mês
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1 px-3 py-1.5 text-xs ${viewMode === 'list' ? 'bg-[#06B6D4] text-[#0A0F1E] font-medium' : 'text-white/60 hover:bg-white/5'}`}
          >
            <List className="w-3.5 h-3.5" /> Lista
          </button>
        </div>

        <select
          value={pillarFilter}
          onChange={(e) => setPillarFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="all">Todos os pilares</option>
          {pillars.map((p) => (
            <option key={p.id} value={p.code}>
              {p.name}
            </option>
          ))}
        </select>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none"
        >
          <option value="all">Todos status</option>
          <option value="planned">Planejado</option>
          <option value="in_production">Em produção</option>
          <option value="ready">Pronto</option>
          <option value="published">Publicado</option>
          <option value="cancelled">Cancelado</option>
        </select>

        <button
          onClick={refresh}
          className="flex items-center gap-2 px-3 py-1.5 text-sm border border-white/10 rounded-lg hover:bg-white/5"
        >
          <RefreshCw className="w-4 h-4" />
          Atualizar
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <StatCard label="Planejados" value={stats.planned} color="#06B6D4" />
        <StatCard label="Em produção" value={stats.in_production} color="#F59E0B" />
        <StatCard label="Prontos" value={stats.ready} color="#8B5CF6" />
        <StatCard label="Publicados" value={stats.published} color="#10B981" />
      </div>

      {loading ? (
        <div className="text-center py-12 text-white/40 text-sm">Carregando calendário...</div>
      ) : byDate.length === 0 ? (
        <div className="text-center py-16 text-white/40">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm">
            Nenhuma postagem agendada ainda.
          </p>
          <p className="text-xs mt-2 text-white/30">
            Vá pra "Planejador" pra gerar uma agenda completa, ou "Banco de Ideias" pra agendar uma por vez.
          </p>
        </div>
      ) : viewMode === 'month' ? (
        <MonthView
          monthCursor={monthCursor}
          onMonthChange={setMonthCursor}
          posts={filtered}
          onEdit={setEditing}
        />
      ) : (
        <div className="space-y-6">
          {byDate.map(([date, items]) => (
            <DateGroup
              key={date}
              date={date}
              posts={items}
              onAdvance={handleAdvanceStatus}
              onEdit={setEditing}
            />
          ))}
        </div>
      )}

      {editing && (
        <PostDrawer
          post={editing}
          pillars={pillars}
          platforms={platforms}
          onClose={() => setEditing(null)}
          onSaved={refresh}
        />
      )}
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4">
      <div className="text-2xl font-semibold" style={{ color }}>
        {value}
      </div>
      <div className="text-xs text-white/40 mt-1">{label}</div>
    </div>
  );
}

function DateGroup({ date, posts, onAdvance, onEdit }: { date: string; posts: CalendarPost[]; onAdvance: (p: CalendarPost) => void; onEdit: (p: CalendarPost) => void }) {
  const formatted = useMemo(() => {
    const d = new Date(date + 'T00:00:00');
    const wday = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'][d.getDay()];
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${wday}, ${dd}/${mm}`;
  }, [date]);

  const isToday = date === new Date().toISOString().split('T')[0];
  const isPast = date < new Date().toISOString().split('T')[0];

  return (
    <div>
      <div className="flex items-center gap-2 mb-3">
        <Calendar className="w-4 h-4 text-white/40" />
        <h3 className="text-sm font-semibold uppercase tracking-widest text-white/70">
          {formatted}
        </h3>
        {isToday && (
          <span className="px-2 py-0.5 text-[10px] bg-[#06B6D4]/20 text-[#06B6D4] rounded-full font-bold uppercase">
            Hoje
          </span>
        )}
        {isPast && !isToday && (
          <span className="text-[10px] text-white/30 uppercase">Passado</span>
        )}
      </div>
      <div className="space-y-2">
        {posts.map((p) => (
          <PostCard key={p.id} post={p} onAdvance={onAdvance} onEdit={onEdit} />
        ))}
      </div>
    </div>
  );
}

function PostCard({ post, onAdvance, onEdit }: { post: CalendarPost; onAdvance: (p: CalendarPost) => void; onEdit: (p: CalendarPost) => void }) {
  const statusColors: Record<CalendarStatus, string> = {
    planned: '#06B6D4',
    in_production: '#F59E0B',
    ready: '#8B5CF6',
    published: '#10B981',
    cancelled: '#6B7280',
  };

  const statusLabels: Record<CalendarStatus, string> = {
    planned: 'Planejado',
    in_production: 'Em produção',
    ready: 'Pronto',
    published: 'Publicado',
    cancelled: 'Cancelado',
  };

  return (
    <div
      className="bg-white/5 border border-white/10 rounded-lg p-4 border-l-4"
      style={{ borderLeftColor: post.pillar_color ?? '#06B6D4' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {post.pillar_name && (
            <div
              className="text-[10px] uppercase tracking-widest font-bold mb-1"
              style={{ color: post.pillar_color ?? '#06B6D4' }}
            >
              {post.pillar_name}
            </div>
          )}
          <div className="text-sm font-medium mb-1">{post.hook ?? '(sem hook)'}</div>
          <div className="flex items-center gap-3 text-[11px] text-white/40">
            {post.content_type && <span>{post.content_type}</span>}
            {post.platform && <span>· {post.platform}</span>}
            {post.scheduled_time && (
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {post.scheduled_time}
              </span>
            )}
            {post.media_external_url && (
              <a
                href={post.media_external_url}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1 hover:text-white"
              >
                <ExternalLink className="w-3 h-3" />
                Mídia
              </a>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end gap-2">
          <span
            className="text-[10px] uppercase tracking-widest font-bold"
            style={{ color: statusColors[post.status] }}
          >
            {statusLabels[post.status]}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit(post)}
              className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white"
            >
              <Pencil className="w-3 h-3" />
              Editar
            </button>
            {post.status !== 'published' && post.status !== 'cancelled' && (
              <button
                onClick={() => onAdvance(post)}
                className="flex items-center gap-1 text-[11px] text-white/50 hover:text-white"
              >
                <CheckCircle2 className="w-3 h-3" />
                Avançar
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── MonthView: grid 7×N do mês com mini-cards por dia ───
const MONTH_NAMES = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
const WEEKDAY_NAMES = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

function MonthView({ monthCursor, onMonthChange, posts, onEdit }: {
  monthCursor: Date;
  onMonthChange: (d: Date) => void;
  posts: CalendarPost[];
  onEdit: (p: CalendarPost) => void;
}) {
  const year = monthCursor.getFullYear();
  const month = monthCursor.getMonth();

  // Gera 6 semanas (42 dias) começando no domingo da semana que contém o dia 1
  const cells = useMemo(() => {
    const first = new Date(year, month, 1);
    const firstDow = first.getDay();
    const start = new Date(year, month, 1 - firstDow);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [year, month]);

  const postsByDate = useMemo(() => {
    const map = new Map<string, CalendarPost[]>();
    for (const p of posts) {
      if (!map.has(p.scheduled_date)) map.set(p.scheduled_date, []);
      map.get(p.scheduled_date)!.push(p);
    }
    return map;
  }, [posts]);

  const today = new Date().toISOString().slice(0, 10);
  const totalPostsInMonth = cells
    .filter(d => d.getMonth() === month)
    .reduce((acc, d) => acc + (postsByDate.get(d.toISOString().slice(0, 10))?.length ?? 0), 0);

  const goPrev = () => onMonthChange(new Date(year, month - 1, 1));
  const goNext = () => onMonthChange(new Date(year, month + 1, 1));
  const goToday = () => { const d = new Date(); d.setDate(1); onMonthChange(d); };

  return (
    <div>
      {/* Header do mês */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h3 className="text-base font-semibold">
            {MONTH_NAMES[month]} {year}
          </h3>
          <span className="text-xs text-white/40">· {totalPostsInMonth} posts</span>
        </div>
        <div className="flex items-center gap-1">
          <button onClick={goPrev} className="p-1.5 hover:bg-white/5 rounded text-white/60 hover:text-white">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button onClick={goToday} className="px-2 py-1 text-xs text-white/60 hover:text-white border border-white/10 rounded hover:bg-white/5">
            Hoje
          </button>
          <button onClick={goNext} className="p-1.5 hover:bg-white/5 rounded text-white/60 hover:text-white">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Header dias da semana */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {WEEKDAY_NAMES.map(w => (
          <div key={w} className="text-[10px] uppercase tracking-widest font-bold text-white/30 text-center py-1">{w}</div>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          const iso = d.toISOString().slice(0, 10);
          const inMonth = d.getMonth() === month;
          const isToday = iso === today;
          const dayPosts = postsByDate.get(iso) ?? [];
          return (
            <div
              key={i}
              className={`min-h-[100px] border rounded p-1.5 ${
                inMonth ? 'bg-white/[0.03] border-white/10' : 'bg-transparent border-white/5 opacity-40'
              } ${isToday ? 'ring-1 ring-[#06B6D4]' : ''}`}
            >
              <div className={`text-[10px] mb-1 ${isToday ? 'text-[#06B6D4] font-bold' : 'text-white/40'}`}>
                {d.getDate()}
              </div>
              <div className="space-y-0.5">
                {dayPosts.slice(0, 4).map(p => (
                  <button
                    key={p.id}
                    onClick={() => onEdit(p)}
                    className="w-full text-left text-[10px] truncate px-1 py-0.5 rounded hover:brightness-125 transition-all"
                    style={{
                      background: `${p.pillar_color ?? '#06B6D4'}25`,
                      color: p.pillar_color ?? '#06B6D4',
                      borderLeft: `2px solid ${p.pillar_color ?? '#06B6D4'}`,
                    }}
                    title={`${p.content_type ?? 'post'}: ${p.hook ?? ''}`}
                  >
                    <span className="opacity-60 uppercase text-[8px] mr-1">{p.content_type?.slice(0, 4)}</span>
                    {p.hook?.slice(0, 40) ?? '(sem hook)'}
                  </button>
                ))}
                {dayPosts.length > 4 && (
                  <div className="text-[9px] text-white/40 px-1">+{dayPosts.length - 4} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
