import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, CheckSquare, Square, Flag, Award, AlertOctagon } from 'lucide-react';
import type { RoadmapTask, Track } from '../lib/roadmapStore';

const MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];
const DIAS_CURTOS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

const TRACK_COLOR: Record<Track, string> = {
  A: 'bg-fuchsia-500/20 text-fuchsia-300 border-fuchsia-500/40',
  B: 'bg-secondary-container/40 text-secondary border-secondary/40',
  C: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
};

const TRACK_DOT: Record<Track, string> = {
  A: 'bg-fuchsia-400',
  B: 'bg-secondary',
  C: 'bg-emerald-400',
};

function toISODate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function parseISODateLocal(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

type Props = {
  tasks: RoadmapTask[];
  onToggle: (task: RoadmapTask) => Promise<void> | void;
};

export default function RoadmapCalendar({ tasks, onToggle }: Props) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });
  const [selectedDate, setSelectedDate] = useState<string | null>(toISODate(new Date()));

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const todayISO = toISODate(new Date());

  const prevMonth = () => setCursor(new Date(year, month - 1, 1));
  const nextMonth = () => setCursor(new Date(year, month + 1, 1));
  const thisMonth = () => {
    const t = new Date();
    setCursor(new Date(t.getFullYear(), t.getMonth(), 1));
    setSelectedDate(toISODate(t));
  };

  // Tarefas por data
  const tasksByDate = useMemo(() => {
    const map = new Map<string, RoadmapTask[]>();
    for (const t of tasks) {
      if (!t.target_date) continue;
      const arr = map.get(t.target_date) ?? [];
      arr.push(t);
      map.set(t.target_date, arr);
    }
    return map;
  }, [tasks]);

  // 42 células (6 semanas × 7 dias)
  const cells = useMemo(() => {
    const firstDay = new Date(year, month, 1);
    const firstWeekday = firstDay.getDay();
    const start = new Date(year, month, 1 - firstWeekday);
    const arr: { date: string; dayNum: number; inMonth: boolean }[] = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      arr.push({ date: toISODate(d), dayNum: d.getDate(), inMonth: d.getMonth() === month });
    }
    return arr;
  }, [year, month]);

  // Stats do mês
  const monthStats = useMemo(() => {
    let total = 0, done = 0, overdue = 0;
    for (const [dateISO, arr] of tasksByDate) {
      const d = parseISODateLocal(dateISO);
      if (d.getFullYear() !== year || d.getMonth() !== month) continue;
      for (const t of arr) {
        total++;
        if (t.completed_at) done++;
        else if (dateISO < todayISO) overdue++;
      }
    }
    return { total, done, overdue };
  }, [tasksByDate, year, month, todayISO]);

  const selectedTasks = selectedDate ? (tasksByDate.get(selectedDate) ?? []) : [];
  const selectedDateObj = selectedDate ? parseISODateLocal(selectedDate) : null;

  return (
    <div className="space-y-5">
      {/* Header do mês */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">{MESES[month]} {year}</h2>
          <div className="text-xs text-on-surface-variant mt-1 flex items-center gap-3 flex-wrap">
            <span>{monthStats.total} tarefas</span>
            <span className="text-emerald-400">{monthStats.done} feitas</span>
            {monthStats.overdue > 0 && (
              <span className="text-red-400 flex items-center gap-1">
                <AlertOctagon size={12} /> {monthStats.overdue} atrasadas
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Mês anterior">
            <ChevronLeft size={18} />
          </button>
          <button onClick={thisMonth} className="px-3 py-1.5 text-xs bg-secondary-container/40 hover:bg-secondary-container/40 border border-secondary/40 text-secondary font-medium">
            Hoje
          </button>
          <button onClick={nextMonth} className="p-2 hover:bg-surface-highest text-on-surface-variant hover:text-on-surface" title="Próximo mês">
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Legenda de tracks */}
      <div className="flex items-center gap-4 text-xs text-on-surface-variant">
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${TRACK_DOT.A}`} /> Academy
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${TRACK_DOT.B}`} /> Clearix
        </div>
        <div className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${TRACK_DOT.C}`} /> Empresa
        </div>
      </div>

      {/* Cabeçalho dos dias da semana */}
      <div>
        <div className="grid grid-cols-7 gap-px bg-surface-low rounded-t-lg overflow-hidden">
          {DIAS_CURTOS.map((d) => (
            <div key={d} className="bg-surface text-center py-2 text-[10px] font-mono text-muted uppercase tracking-widest">
              {d}
            </div>
          ))}
        </div>

        {/* Grade do mês */}
        <div className="grid grid-cols-7 gap-px bg-surface-low rounded-b-lg overflow-hidden">
          {cells.map((cell, i) => {
            const tasksOfDay = tasksByDate.get(cell.date) ?? [];
            const isToday = cell.date === todayISO;
            const isSelected = cell.date === selectedDate;
            const hasOverdue = tasksOfDay.some((t) => !t.completed_at && cell.date < todayISO);
            const allDone = tasksOfDay.length > 0 && tasksOfDay.every((t) => t.completed_at);
            const hasMilestone = tasksOfDay.some((t) => t.category === 'milestone' || t.category === 'decision_gate');

            return (
              <button
                key={i}
                onClick={() => setSelectedDate(isSelected ? null : cell.date)}
                className={`relative bg-surface min-h-[84px] p-1.5 text-left transition-all hover:bg-surface-highest
                  ${!cell.inMonth ? 'opacity-25' : ''}
                  ${isSelected ? 'ring-2 ring-secondary ring-inset z-10' : ''}
                  ${hasOverdue ? 'bg-red-500/5' : ''}
                  ${allDone ? 'bg-emerald-500/5' : ''}
                `}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className={`text-xs font-mono ${isToday ? 'text-secondary font-bold bg-secondary/15 px-1.5 rounded' : 'text-on-surface-variant'}`}>
                    {cell.dayNum}
                  </span>
                  {hasMilestone && <Flag size={9} className="text-amber-400" />}
                </div>
                <div className="space-y-0.5">
                  {tasksOfDay.slice(0, 3).map((t) => {
                    const done = !!t.completed_at;
                    return (
                      <div
                        key={t.id}
                        className={`text-[9.5px] px-1 py-0.5 rounded border truncate flex items-center gap-1
                          ${TRACK_COLOR[t.track || 'C']}
                          ${done ? 'opacity-50 line-through' : ''}
                        `}
                        title={t.title}
                      >
                        {t.category === 'milestone' && <Award size={8} className="shrink-0" />}
                        {t.category === 'decision_gate' && <Flag size={8} className="shrink-0" />}
                        <span className="truncate">{t.title}</span>
                      </div>
                    );
                  })}
                  {tasksOfDay.length > 3 && (
                    <div className="text-[9.5px] text-muted pl-1">+ {tasksOfDay.length - 3} mais</div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Detalhe do dia selecionado */}
      {selectedDate && selectedDateObj && (
        <div className="bg-secondary/15 border border-secondary/40 p-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-sm font-semibold">
              {selectedDateObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              {selectedDate === todayISO && <span className="ml-2 text-xs text-secondary bg-secondary/15 px-2 py-0.5 rounded font-mono">HOJE</span>}
            </h3>
            {selectedTasks.length > 0 && (
              <span className="text-xs text-muted">
                {selectedTasks.filter((t) => t.completed_at).length}/{selectedTasks.length} tarefas feitas
              </span>
            )}
          </div>

          {selectedTasks.length === 0 ? (
            <div className="text-sm text-muted italic">Nenhuma tarefa agendada para este dia.</div>
          ) : (
            <div className="space-y-2">
              {selectedTasks.map((t) => {
                const done = !!t.completed_at;
                const overdue = !done && selectedDate < todayISO;
                return (
                  <div
                    key={t.id}
                    className={`flex items-start gap-3 p-2 transition-colors
                      ${overdue ? 'bg-red-500/5' : ''}
                      hover:bg-surface-highest
                    `}
                  >
                    <button
                      onClick={() => onToggle(t)}
                      className={`mt-0.5 shrink-0 transition-colors ${done ? 'text-emerald-400' : 'text-muted hover:text-on-surface-variant'}`}
                    >
                      {done ? <CheckSquare size={16} /> : <Square size={16} />}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-sm ${done ? 'text-muted line-through' : 'text-on-surface'}`}>
                          {t.title}
                        </span>
                        {t.track && (
                          <span className={`text-[9px] font-mono px-1.5 py-0.5 rounded border ${TRACK_COLOR[t.track]}`}>
                            Track {t.track}
                          </span>
                        )}
                        <span className="text-[10px] text-muted font-mono">Fase {t.phase_number}</span>
                        {t.category === 'milestone' && (
                          <span className="text-[9px] font-mono uppercase text-amber-400 bg-amber-500/10 px-1.5 rounded flex items-center gap-1">
                            <Award size={9} /> Marco
                          </span>
                        )}
                        {t.category === 'decision_gate' && (
                          <span className="text-[9px] font-mono uppercase text-emerald-400 bg-emerald-500/10 px-1.5 rounded flex items-center gap-1">
                            <Flag size={9} /> Gate
                          </span>
                        )}
                      </div>
                      {t.description && (
                        <div className="text-xs text-on-surface-variant mt-1">{t.description}</div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
