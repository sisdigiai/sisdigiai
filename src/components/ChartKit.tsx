/**
 * Kit de analytics DIGIAI House — sparklines e deltas para KPIs.
 * Só desenha com dados reais: série < 2 pontos → nada renderiza.
 */

export function deltaPct(series: number[]): number | null {
  if (series.length < 2) return null;
  const prev = series[series.length - 2], last = series[series.length - 1];
  if (!Number.isFinite(prev) || prev === 0) return null;
  return ((last - prev) / Math.abs(prev)) * 100;
}

export function Sparkline({ data, width = 88, height = 26, stroke = 'var(--color-action)' }: {
  data: number[]; width?: number; height?: number; stroke?: string;
}) {
  if (data.length < 2) return null;
  const min = Math.min(...data), max = Math.max(...data), span = max - min || 1;
  const pts = data.map((v, i) => `${((i / (data.length - 1)) * (width - 4) + 2).toFixed(1)},${(height - 3 - ((v - min) / span) * (height - 6)).toFixed(1)}`);
  const last = pts[pts.length - 1].split(',');
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden className="shrink-0">
      <polyline points={pts.join(' ')} fill="none" stroke={stroke} strokeWidth="1.5" />
      <rect x={Number(last[0]) - 2} y={Number(last[1]) - 2} width="4" height="4" fill={stroke} />
    </svg>
  );
}

export function DeltaBadge({ pct, invert = false, suffix = 'vs mês anterior' }: {
  pct: number | null; invert?: boolean; suffix?: string;
}) {
  if (pct === null) return null;
  const up = pct >= 0;
  const good = invert ? !up : up;
  return (
    <span className={`font-mono text-[10px] ${good ? 'text-success' : 'text-danger'}`}>
      {up ? '▲' : '▼'} {Math.abs(pct).toFixed(1).replace('.', ',')}% <span className="text-muted">{suffix}</span>
    </span>
  );
}
