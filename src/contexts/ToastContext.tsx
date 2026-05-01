import { createContext, useContext, useState, useCallback, ReactNode, useEffect } from 'react';
import { CheckCircle2, AlertCircle, Info, X, Zap } from 'lucide-react';

type ToastKind = 'info' | 'success' | 'warning' | 'realtime';

type Toast = {
  id: string;
  kind: ToastKind;
  title: string;
  description?: string;
  duration?: number;
};

type ToastContextValue = {
  show: (toast: Omit<Toast, 'id'>) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

const icons: Record<ToastKind, React.ReactNode> = {
  info: <Info size={18} className="text-[#06B6D4]" />,
  success: <CheckCircle2 size={18} className="text-emerald-400" />,
  warning: <AlertCircle size={18} className="text-amber-400" />,
  realtime: <Zap size={18} className="text-fuchsia-400" />,
};

const colors: Record<ToastKind, string> = {
  info: 'border-[#06B6D4]/30 bg-[#06B6D4]/5',
  success: 'border-emerald-500/30 bg-emerald-500/5',
  warning: 'border-amber-500/30 bg-amber-500/5',
  realtime: 'border-fuchsia-500/30 bg-fuchsia-500/5',
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const show = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = crypto.randomUUID();
    const duration = toast.duration ?? 4000;
    setToasts((prev) => [...prev, { ...toast, id }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ show }}>
      {children}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`rounded-xl border backdrop-blur p-3 shadow-lg flex items-start gap-3 animate-slide-in ${colors[t.kind]}`}
            style={{ animation: 'slideIn 0.25s ease-out' }}
          >
            <div className="mt-0.5 shrink-0">{icons[t.kind]}</div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium text-white">{t.title}</div>
              {t.description && <div className="text-xs text-white/60 mt-0.5">{t.description}</div>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              className="text-white/30 hover:text-white/70 shrink-0"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

// Hook para auto-ativar toasts em mudanças realtime
export function useRealtimeToasts() {
  const { show } = useToast();

  useEffect(() => {
    // lazy import to avoid circular
    import('../lib/realtimeStore').then(({ realtimeStore }) => {
      const unsub = realtimeStore.subscribe((event) => {
        const tableLabel: Record<string, string> = {
          roadmap_tasks: 'Roadmap',
          roadmap_phases: 'Roadmap',
          decisions: 'Decisões',
          backlog_items: 'Backlog',
        };
        const actionLabel: Record<string, string> = {
          INSERT: 'criou',
          UPDATE: 'atualizou',
          DELETE: 'removeu',
        };
        const title = event.new?.title || event.old?.title || 'item';
        const action = actionLabel[event.eventType] || event.eventType.toLowerCase();
        const module = tableLabel[event.table] || event.table;
        show({
          kind: 'realtime',
          title: `${module}: ${action}`,
          description: String(title).slice(0, 80),
          duration: 3500,
        });
      });
      return () => unsub();
    });
  }, [show]);
}
