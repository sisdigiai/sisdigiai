import type { CopyStatus } from '../../lib/copyStore';
import { STATUS_LABELS } from '../../lib/copyStore';

const statusStyles: Record<CopyStatus, string> = {
  pendente: 'border-outline/10 bg-surface-low text-on-surface-variant',
  criado: 'border-secondary/40 bg-secondary/15 text-secondary',
  aprovado: 'border-emerald-400/30 bg-emerald-400/10 text-emerald-300',
};

const statusOrder: CopyStatus[] = ['pendente', 'criado', 'aprovado'];

type Props = {
  status: CopyStatus;
  onChange: (status: CopyStatus) => void;
};

export default function StatusSelector({ status, onChange }: Props) {
  const cycle = () => {
    const idx = statusOrder.indexOf(status);
    const next = statusOrder[(idx + 1) % statusOrder.length];
    onChange(next);
  };

  return (
    <button
      onClick={cycle}
      className={`text-xs font-bold px-2.5 py-1 border transition-colors cursor-pointer ${statusStyles[status]}`}
      title={`Clique para mudar status (atual: ${STATUS_LABELS[status]})`}
    >
      {STATUS_LABELS[status]}
    </button>
  );
}
