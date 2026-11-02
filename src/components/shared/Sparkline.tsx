/** Tiny inline trend line in ink. Decorative: the figure next to it carries the value. */
export function Sparkline({
  values,
  width = 88,
  height = 24,
  className,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  className?: string;
  id?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const pts = values.map(
    (v, i) => [i * step, height - 2 - ((v - min) / span) * (height - 4)] as const,
  );
  const line = pts
    .map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1]!;
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={className}
    >
      <path
        d={line}
        fill="none"
        stroke="currentColor"
        strokeWidth={1.25}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      <circle cx={last[0]} cy={last[1]} r={2} fill="var(--signal)" />
    </svg>
  );
}
