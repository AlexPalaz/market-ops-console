import { formatCurrency, formatPercent } from "@/domain/format";
import type { MetricKey } from "@/domain/types";

export type ScaleKind = "sequential" | "diverging";

export interface MetricMeta {
  key: MetricKey;
  label: string;
  shortLabel: string;
  /** Format a value in the metric's own unit. */
  format: (v: number | null) => string;
  kind: ScaleKind;
  /** Neutral point for diverging scales (0 for growth, 100 for attainment). */
  center?: number;
  /** Only meaningful at market level (synthetic in the dataset). */
  marketOnly?: boolean;
}

export const METRICS: Record<MetricKey, MetricMeta> = {
  revenue: {
    key: "revenue",
    label: "Revenue",
    shortLabel: "Revenue",
    format: (v) => (v === null ? "—" : formatCurrency(v)),
    kind: "sequential",
  },
  growthPct: {
    key: "growthPct",
    label: "Growth, year on year",
    shortLabel: "Growth YoY",
    format: (v) => formatPercent(v, { signed: true }),
    kind: "diverging",
    center: 0,
  },
  forecastAttainmentPct: {
    key: "forecastAttainmentPct",
    label: "Forecast attainment",
    shortLabel: "Attainment",
    format: (v) => formatPercent(v, { digits: 1 }),
    kind: "diverging",
    center: 100,
  },
  sharePct: {
    key: "sharePct",
    label: "Market share",
    shortLabel: "Share",
    format: (v) => formatPercent(v, { digits: 1 }),
    kind: "sequential",
    marketOnly: true,
  },
};

export interface ColorScale {
  kind: ScaleKind;
  min: number;
  max: number;
  center: number;
  /** CSS colour for a value; uses design tokens via color-mix so it themes. */
  color: (v: number | null) => string;
  /** 0..1 position on the legend gradient for a value. */
  position: (v: number) => number;
  /** CSS gradient string for a legend bar. */
  gradient: string;
}

/**
 * Builds a colour scale from design tokens. Diverging scales are symmetric
 * around `center` so equal distances above and below read with equal weight.
 */
export function makeColorScale(values: readonly (number | null)[], meta: MetricMeta): ColorScale {
  const nums = values.filter((v): v is number => v !== null && Number.isFinite(v));
  const min = nums.length ? Math.min(...nums) : 0;
  const max = nums.length ? Math.max(...nums) : 1;

  if (meta.kind === "diverging") {
    const center = meta.center ?? 0;
    const half = Math.max(Math.abs(min - center), Math.abs(max - center), 1e-9);
    return {
      kind: "diverging",
      min: center - half,
      max: center + half,
      center,
      color: (v) => {
        if (v === null) return "var(--no-data)";
        const t = Math.max(-1, Math.min(1, (v - center) / half));
        const pct = Math.round(Math.abs(t) * 100);
        return t < 0
          ? `color-mix(in oklch, var(--div-neg) ${pct}%, var(--div-mid))`
          : `color-mix(in oklch, var(--div-pos) ${pct}%, var(--div-mid))`;
      },
      position: (v) => Math.max(0, Math.min(1, ((v - center) / half + 1) / 2)),
      gradient: "linear-gradient(to right, var(--div-neg), var(--div-mid), var(--div-pos))",
    };
  }

  const span = Math.max(max - min, 1e-9);
  return {
    kind: "sequential",
    min,
    max,
    center: min,
    color: (v) => {
      if (v === null) return "var(--no-data)";
      const t = Math.max(0, Math.min(1, (v - min) / span));
      return `color-mix(in oklch, var(--seq-high) ${Math.round(t * 100)}%, var(--seq-low))`;
    },
    position: (v) => Math.max(0, Math.min(1, (v - min) / span)),
    gradient: "linear-gradient(to right, var(--seq-low), var(--seq-high))",
  };
}
