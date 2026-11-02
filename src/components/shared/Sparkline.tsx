/** Tiny inline trend line. Decorative: the figure next to it carries the value. */
export function Sparkline({
  values,
  width = 96,
  height = 28,
  className,
}: {
  values: readonly number[];
  width?: number;
  height?: number;
  className?: string;
}) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const step = width / (values.length - 1);
  const d = values
    .map(
      (v, i) =>
        `${i === 0 ? "M" : "L"}${(i * step).toFixed(1)},${(height - 2 - ((v - min) / span) * (height - 4)).toFixed(1)}`,
    )
    .join(" ");
  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      aria-hidden
      className={className}
    >
      <path d={d} fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinejoin="round" />
    </svg>
  );
}
