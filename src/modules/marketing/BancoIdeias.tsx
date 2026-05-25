import { useEffect, useMemo, useState } from 'react';
import { Calendar, Filter, Lightbulb, RefreshCw, Search } from 'lucide-react';
import { marketingStore, type ContentIdea, type ContentPillar } from '../../lib/marketingStore';

export function BancoIdeias() {
  const [ideas, setIdeas] = useState<ContentIdea[]>([]);
  const [pillars, setPillars] = useState<ContentPillar[]>([]);
  const [loading, setLoading] = useState(true);
  const [pillarFilter, setPillarFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [scheduling, setScheduling] = useState<{ idea: ContentIdea; date: string } | null>(null);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  const refresh = async () => {
    setLoading(true);
    const [ideasData, pillarsData] = await Promise.all([
      marketingStore.listIdeas(),
      marketingStore.listPillars(),
    ]);
    setIdeas(ideasData);
    setPillars(pillarsData);
    setLoading(false);
  };

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    return ideas.filter((i) => {
      if (pillarFilter !== 'all' && i.pillar_code !== pillarFilter) return false;
      if (statusFilter !== 'all' && i.status !== statusFilter) return false;
      if (search && !i.hook.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [ideas, pillarFilter, statusFilter, search]);

  const handleSchedule = async () => {
    if (!scheduling) return;
    const post = await marketingStore.scheduleIdea(scheduling.idea.id, scheduling.date);
    if (post) {
      setSavedAt(Date.now());
      setScheduling(null);
      await refresh();
    } else {
      alert('Erro ao agendar. Veja o console.');
    }
  };

  const stats = useMemo(() => {
    const total = ideas.length;
    const available = ideas.filter((i) => i.status === 'available').length;
    const scheduled = ideas.filter((i) => i.status === 'scheduled').length;
    const used = ideas.filter((i) => i.status === 'used').length;
    return { total, available, scheduled, used };
  }, [ideas]);

  return (
    <div className="p-8">
      {/* Toolbar */}
      <div className="flex items-center gap-4 mb-6 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <Search className="w-4 h-4 text-white/40" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar no hook..."
            className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:border-[#06B6D4]/50"
          />
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
          <option value="available">Disponíveis</option>
          <option value="scheduled">Agendadas</option>
          <option value="used">Já usadas</option>
          <option value="archived">Arquivadas</option>
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
        <StatCard label="Total no banco" value={stats.total} color="#06B6D4" />
        <StatCard label="Disponíveis" value={stats.available} color="#10B981" />
        <StatCard label="Agendadas" value={stats.scheduled} color="#F59E0B" />
        <StatCard label="Já usadas" value={stats.used} color="#8B5CF6" />
      </div>

      {savedAt && (
        <div className="mb-4 px-4 py-2 bg-green-500/10 border border-green-500/30 rounded-lg text-sm text-green-300">
          Agendamento salvo no calendário ✓
        </div>
      )}

      {loading ? (
        <div className="text-center py-12 text-white/40 text-sm">Carregando ideias...</div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-12 text-white/40 text-sm">
          Nenhuma ideia encontrada com esses filtros.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((idea) => (
            <IdeaCard
              key={idea.id}
              idea={idea}
              onSchedule={(date) => setScheduling({ idea, date })}
            />
          ))}
        </div>
      )}

      {/* Modal de agendamento */}
      {scheduling && (
        <div
          className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4"
          onClick={() => setScheduling(null)}
        >
          <div
            className="bg-[#0F1729] border border-white/10 rounded-xl p-6 max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="font-semibold mb-1">Agendar postagem</h3>
            <p className="text-xs text-white/40 mb-4">{scheduling.idea.hook}</p>

            <label className="text-xs text-white/60 block mb-1">Data</label>
            <input
              type="date"
              value={scheduling.date}
              onChange={(e) => setScheduling({ ...scheduling, date: e.target.value })}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#06B6D4]/50 mb-4"
            />

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setScheduling(null)}
                className="px-4 py-2 text-sm text-white/60 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleSchedule}
                className="px-4 py-2 text-sm bg-[#06B6D4] text-[#0A0F1E] font-medium rounded-lg hover:bg-[#06B6D4]/90"
              >
                Agendar
              </button>
            </div>
          </div>
        </div>
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

function IdeaCard({ idea, onSchedule }: { idea: ContentIdea; onSchedule: (date: string) => void }) {
  const tomorrow = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().split('T')[0];
  }, []);

  const statusColors: Record<string, string> = {
    available: '#10B981',
    scheduled: '#F59E0B',
    used: '#8B5CF6',
    archived: '#6B7280',
  };

  return (
    <div className="bg-white/5 border border-white/10 rounded-lg p-4 flex flex-col">
      {/* Pillar tag */}
      {idea.pillar_name && (
        <div
          className="text-[10px] uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5"
          style={{ color: idea.pillar_color ?? '#06B6D4' }}
        >
          <span className="w-1.5 h-1.5 rounded-full" style={{ background: idea.pillar_color ?? '#06B6D4' }} />
          {idea.pillar_name}
        </div>
      )}

      {/* Hook */}
      <div className="text-sm font-medium mb-3 flex-1">{idea.hook}</div>

      {/* Metadata */}
      <div className="flex items-center gap-2 text-[11px] text-white/40 mb-3">
        {idea.suggested_format && (
          <span className="px-1.5 py-0.5 bg-white/5 rounded">{idea.suggested_format}</span>
        )}
        {idea.target_audience && (
          <span className="px-1.5 py-0.5 bg-white/5 rounded truncate">{idea.target_audience}</span>
        )}
      </div>

      {/* Footer: status + action */}
      <div className="flex items-center justify-between border-t border-white/5 pt-3">
        <span
          className="text-[10px] uppercase tracking-widest font-bold"
          style={{ color: statusColors[idea.status] }}
        >
          {idea.status}
          {idea.used_count > 0 && <span className="ml-1 text-white/30">({idea.used_count}x)</span>}
        </span>
        {idea.status === 'available' && (
          <button
            onClick={() => onSchedule(tomorrow)}
            className="flex items-center gap-1 text-xs text-[#06B6D4] hover:text-white"
          >
            <Calendar className="w-3 h-3" />
            Agendar
          </button>
        )}
      </div>
    </div>
  );
}
