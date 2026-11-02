"use client";

import { useMemo } from "react";
import { Sparkline } from "@/components/shared/Sparkline";
import { useData } from "@/data/DataProvider";
import { formatCurrency, formatPercent, formatPeriod } from "@/domain/format";
import { previousPeriod, scopeKpis, statusCounts, timeSeries } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";
import { useCountUp } from "@/hooks/useCountUp";
import { cn } from "@/lib/utils";

/** Signed delta in mono with a typographic arrow. Colour never carries it alone. */
function Delta({
  value,
  unit,
  suffix,
}: {
  value: number | null;
  unit: "pt" | "pct";
  suffix?: string;
}) {
  if (value === null) return <span className="text-ink-soft">—</span>;
  const glyph = value > 0 ? "↗" : value < 0 ? "↘" : "→";
  const tone =
    value > 0 ? "text-status-on-track" : value < 0 ? "text-status-off-track" : "text-ink-soft";
  const text =
    unit === "pt"
      ? `${value > 0 ? "+" : ""}${value.toFixed(1)} pt`
      : formatPercent(value, { signed: true });
  return (
    <span className="numeral inline-flex items-baseline gap-1.5 text-[12.5px]">
      <span className={cn("font-medium", tone)}>
        <span aria-hidden>{glyph} </span>
        {text}
      </span>
      {suffix ? <span className="text-ink-soft">{suffix}</span> : null}
    </span>
  );
}

interface CellProps {
  index: string;
  label: string;
  /** Either a static string or a number with its formatter (animated on change). */
  value: string | { n: number | null; format: (v: number | null) => string };
  hint?: React.ReactNode;
  trend?: readonly number[];
  tone?: string;
  compact?: boolean;
}

function Cell({ index, label, value, hint, trend, tone, compact }: CellProps) {
  const animated = useCountUp(typeof value === "string" ? null : value.n);
  const text = typeof value === "string" ? value : value.format(animated);
  return (
    <div
      role="listitem"
      className={cn(
        "xl:border-rule flex min-w-0 flex-col gap-2 py-4 xl:border-l xl:pl-6 xl:first:border-l-0 xl:first:pl-0",
        compact && "py-3",
      )}
    >
      <p className="eyebrow flex items-baseline gap-2">
        <span className="numeral" aria-hidden>
          {index}
        </span>
        {label}
      </p>
      <div className="flex items-end justify-between gap-3">
        <p
          className={cn(
            "display text-ink leading-none font-medium",
            compact ? "text-[26px]" : "text-[32px]",
            tone,
          )}
        >
          {text}
        </p>
        {trend ? <Sparkline values={trend} className="text-ink mb-0.5 shrink-0" /> : null}
      </div>
      {hint ? <div className="text-ink-soft text-[12.5px]">{hint}</div> : null}
    </div>
  );
}

/**
 * Headline KPIs as one strip divided by hairlines. Growth and attainment are
 * ratios of summed revenue (see domain/selectors/aggregate), never averages of
 * market percentages. Deltas compare with the previous month.
 */
export function KpiTiles({
  scope,
  period,
  compact = false,
}: {
  scope: Scope;
  period: Period;
  compact?: boolean;
}) {
  const index = useData();
  const model = useMemo(() => {
    const now = scopeKpis(index, scope, period);
    const prevPeriod = previousPeriod(index, period);
    const prev = prevPeriod ? scopeKpis(index, scope, prevPeriod) : null;
    const series = timeSeries(index, scope);
    const upTo = index.periodIndex.get(period) ?? series.length - 1;
    const trend = series.slice(Math.max(0, upTo - 11), upTo + 1).map((p) => p.actual);
    const counts = statusCounts(index, scope);
    return { now, prev, prevPeriod, trend, counts };
  }, [index, scope, period]);

  const { now, prev, prevPeriod, trend, counts } = model;
  const momPct =
    prev && prev.revenue !== 0
      ? Math.round(((now.revenue - prev.revenue) / prev.revenue) * 1000) / 10
      : null;
  const attainmentDelta =
    prev && prev.forecastAttainmentPct !== null && now.forecastAttainmentPct !== null
      ? Math.round((now.forecastAttainmentPct - prev.forecastAttainmentPct) * 10) / 10
      : null;
  const growthDelta =
    prev && prev.growthPct !== null && now.growthPct !== null
      ? Math.round((now.growthPct - prev.growthPct) * 10) / 10
      : null;

  const attentionTone =
    counts.off_track > 0
      ? "text-status-off-track"
      : counts.at_risk > 0
        ? "text-status-at-risk"
        : "text-status-on-track";

  return (
    <div
      className="border-ink grid grid-cols-1 border-t sm:grid-cols-2 xl:grid-cols-4"
      role="list"
      aria-label="Headline KPIs"
    >
      <Cell
        index="01"
        compact={compact}
        label={`Revenue · ${formatPeriod(period)}`}
        value={{ n: now.revenue, format: (v) => formatCurrency(v ?? 0) }}
        trend={trend}
        hint={
          <Delta
            value={momPct}
            unit="pct"
            suffix={`vs ${prevPeriod ? formatPeriod(prevPeriod) : "n/a"}`}
          />
        }
      />
      <Cell
        index="02"
        compact={compact}
        label="Growth, year on year"
        value={{ n: now.growthPct, format: (v) => formatPercent(v, { signed: true }) }}
        tone={now.growthPct !== null && now.growthPct < 0 ? "text-status-off-track" : undefined}
        hint={<Delta value={growthDelta} unit="pt" suffix="vs previous month" />}
      />
      <Cell
        index="03"
        compact={compact}
        label="Forecast attainment"
        value={{ n: now.forecastAttainmentPct, format: (v) => formatPercent(v) }}
        tone={
          now.forecastAttainmentPct !== null && now.forecastAttainmentPct < 95
            ? "text-status-off-track"
            : undefined
        }
        hint={
          <Delta
            value={attainmentDelta}
            unit="pt"
            suffix={`variance ${formatCurrency(now.variance)}`}
          />
        }
      />
      <Cell
        index="04"
        compact={compact}
        label="Markets needing attention"
        value={`${counts.needsAttention} of ${counts.total}`}
        tone={attentionTone}
        hint={
          <span className="numeral text-[12.5px]">
            {counts.off_track} off track · {counts.at_risk} at risk · {counts.on_track} on track
          </span>
        }
      />
    </div>
  );
}
