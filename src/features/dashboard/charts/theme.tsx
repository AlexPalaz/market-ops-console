"use client";

import type { ReactNode } from "react";

/**
 * One place for chart chrome so every visualisation reads the same tokens.
 * Colours are CSS variables: SVG presentation attributes and Recharts style
 * props both resolve `var()`, so the charts follow the theme without JS.
 */
export const chart = {
  ink: "var(--ink)",
  inkSoft: "var(--ink-soft)",
  rule: "var(--rule)",
  paper: "var(--paper)",
  surface: "var(--surface)",
  signal: "var(--signal)",
  signalSoft: "var(--signal-soft)",
  series: {
    actual: "var(--series-actual)",
    forecast: "var(--series-forecast)",
    prior: "var(--series-prior)",
  },
  cat: [
    "var(--cat-1)",
    "var(--cat-2)",
    "var(--cat-3)",
    "var(--cat-4)",
    "var(--cat-5)",
    "var(--cat-6)",
  ],
  mono: "var(--font-geist-mono)",
  sans: "var(--font-sans)",
} as const;

/** Axis tick style: mono, 11px, soft ink. */
export const tick = { fontSize: 11, fill: chart.inkSoft, fontFamily: chart.mono } as const;

/** Ink tooltip box with paper text; rows are label/value pairs in mono. */
export function ChartTooltipBox({
  title,
  rows,
  footer,
}: {
  title: ReactNode;
  rows: { label: ReactNode; value: ReactNode; swatch?: ReactNode }[];
  footer?: ReactNode;
}) {
  return (
    <div className="bg-ink text-paper min-w-44 rounded-md px-3 py-2 text-[12px] shadow-[0_8px_24px_-12px_oklch(0_0_0/0.5)]">
      <p className="eyebrow text-paper/70 mb-1.5">{title}</p>
      {rows.map((r, i) => (
        <p key={i} className="flex items-center justify-between gap-4 leading-5">
          <span className="text-paper/80 inline-flex items-center gap-1.5">
            {r.swatch}
            {r.label}
          </span>
          <span className="numeral font-medium">{r.value}</span>
        </p>
      ))}
      {footer ? (
        <p className="numeral border-paper/15 text-paper/70 mt-1.5 border-t pt-1.5 text-[11px]">
          {footer}
        </p>
      ) : null}
    </div>
  );
}

/** A short line sample for legends: solid, dashed or dotted. */
export function LineSwatch({ color, dash }: { color: string; dash?: string }) {
  return (
    <svg width="18" height="6" aria-hidden className="shrink-0">
      <line x1="0" y1="3" x2="18" y2="3" stroke={color} strokeWidth="2" strokeDasharray={dash} />
    </svg>
  );
}

/** Legend as an eyebrow list; used instead of Recharts' default legend. */
export function ChartLegend({
  items,
  className,
}: {
  items: { label: string; swatch: ReactNode }[];
  className?: string;
}) {
  return (
    <ul className={className ?? "flex flex-wrap items-center gap-x-4 gap-y-1"} aria-hidden>
      {items.map((it) => (
        <li
          key={it.label}
          className="eyebrow inline-flex items-center gap-1.5 tracking-normal normal-case"
        >
          {it.swatch}
          {it.label}
        </li>
      ))}
    </ul>
  );
}

/** Colour ramp legend with mono endpoints. */
export function RampLegend({
  gradient,
  min,
  max,
  extra,
}: {
  gradient: string;
  min: string;
  max: string;
  extra?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <div className="flex items-center gap-2">
        <span className="numeral text-ink-soft text-[11px]">{min}</span>
        <span className="h-1.5 w-28 rounded-sm" style={{ background: gradient }} aria-hidden />
        <span className="numeral text-ink-soft text-[11px]">{max}</span>
      </div>
      {extra}
    </div>
  );
}
