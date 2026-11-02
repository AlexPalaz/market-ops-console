"use client";

import { useMemo } from "react";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Sparkline } from "@/components/shared/Sparkline";
import { useData } from "@/data/DataProvider";
import { formatCurrency, formatPercent, formatPeriod } from "@/domain/format";
import { previousPeriod, scopeKpis, statusCounts, timeSeries } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";
import { cn } from "@/lib/utils";

function Delta({ value, unit }: { value: number | null; unit: "pt" | "pct" }) {
  if (value === null) return <span className="text-muted-foreground">—</span>;
  const Icon = value > 0 ? ArrowUpRightIcon : value < 0 ? ArrowDownRightIcon : MinusIcon;
  const tone =
    value > 0
      ? "text-status-on-track"
      : value < 0
        ? "text-status-off-track"
        : "text-muted-foreground";
  const text =
    unit === "pt"
      ? `${value > 0 ? "+" : ""}${value.toFixed(1)} pt`
      : formatPercent(value, { signed: true });
  return (
    <span className={cn("inline-flex items-center gap-0.5 text-xs font-medium", tone)}>
      <Icon className="size-3.5" aria-hidden />
      {text}
    </span>
  );
}

interface TileProps {
  label: string;
  value: string;
  hint?: React.ReactNode;
  trend?: readonly number[];
  tone?: string;
  compact?: boolean;
}

function Tile({ label, value, hint, trend, tone, compact }: TileProps) {
  return (
    <Card className={cn("gap-1 px-4", compact ? "py-2.5" : "py-3")}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-muted-foreground text-xs font-medium">{label}</p>
        {trend ? <Sparkline values={trend} className="text-muted-foreground/70" /> : null}
      </div>
      <p className={cn("font-semibold tracking-tight", compact ? "text-xl" : "text-2xl", tone)}>
        {value}
      </p>
      {hint ? <div className="text-muted-foreground text-xs">{hint}</div> : null}
    </Card>
  );
}

/**
 * Headline KPIs for the current scope and period. Growth and attainment are
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
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4" role="list" aria-label="Headline KPIs">
      <div role="listitem">
        <Tile
          compact={compact}
          label={`Revenue · ${formatPeriod(period)}`}
          value={formatCurrency(now.revenue)}
          trend={trend}
          hint={
            <span className="inline-flex items-center gap-1">
              <Delta value={momPct} unit="pct" />
              <span>vs {prevPeriod ? formatPeriod(prevPeriod) : "n/a"}</span>
            </span>
          }
        />
      </div>
      <div role="listitem">
        <Tile
          compact={compact}
          label="Growth, year on year"
          value={formatPercent(now.growthPct, { signed: true })}
          tone={now.growthPct !== null && now.growthPct < 0 ? "text-status-off-track" : undefined}
          hint={
            <span className="inline-flex items-center gap-1">
              <Delta value={growthDelta} unit="pt" />
              <span>vs previous month</span>
            </span>
          }
        />
      </div>
      <div role="listitem">
        <Tile
          compact={compact}
          label="Forecast attainment"
          value={formatPercent(now.forecastAttainmentPct)}
          tone={
            now.forecastAttainmentPct !== null && now.forecastAttainmentPct < 95
              ? "text-status-off-track"
              : undefined
          }
          hint={
            <span className="inline-flex items-center gap-1">
              <Delta value={attainmentDelta} unit="pt" />
              <span>· variance {formatCurrency(now.variance)}</span>
            </span>
          }
        />
      </div>
      <div role="listitem">
        <Tile
          compact={compact}
          label="Markets needing attention"
          value={`${counts.needsAttention} of ${counts.total}`}
          tone={attentionTone}
          hint={`${counts.off_track} off track · ${counts.at_risk} at risk · ${counts.on_track} on track`}
        />
      </div>
    </div>
  );
}
