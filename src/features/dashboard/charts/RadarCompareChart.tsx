"use client";

import { useMemo } from "react";
import {
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { ChartFrame } from "@/components/shared/ChartFrame";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useData } from "@/data/DataProvider";
import { formatCompact, formatCurrency, formatPercent, formatPeriod } from "@/domain/format";
import { radarData, type RadarAxis, type RadarData } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";

const AXIS_LABEL: Record<RadarAxis, string> = {
  revenue: "Revenue",
  growthPct: "Growth YoY",
  forecastAttainmentPct: "Attainment",
  sharePct: "Share",
  units: "Units",
};

const CAT_COLORS = [
  "var(--cat-1)",
  "var(--cat-2)",
  "var(--cat-3)",
  "var(--cat-4)",
  "var(--cat-5)",
  "var(--cat-6)",
];
const MAX_COMPARE = 6;

function formatAxis(axis: RadarAxis, v: number | null): string {
  if (v === null) return "—";
  switch (axis) {
    case "revenue":
      return formatCurrency(v);
    case "units":
      return formatCompact(v);
    case "growthPct":
      return formatPercent(v, { signed: true });
    default:
      return formatPercent(v);
  }
}

/**
 * Picks sensible defaults when the URL has no `compare`: the markets of the
 * current region (or the market's siblings), or the four regions at portfolio
 * level.
 */
export function defaultCompare(index: ReturnType<typeof useData>, scope: Scope): string[] {
  if (scope.marketId) {
    const market = index.marketsById.get(scope.marketId);
    const siblings = (index.marketsByRegion.get(market?.regionId ?? "") ?? []).map((m) => m.id);
    return [scope.marketId, ...siblings.filter((id) => id !== scope.marketId)].slice(
      0,
      MAX_COMPARE,
    );
  }
  if (scope.regionId)
    return (index.marketsByRegion.get(scope.regionId) ?? []).map((m) => m.id).slice(0, MAX_COMPARE);
  return index.regions.map((r) => r.id);
}

/**
 * Compares regions or markets across KPIs. Each axis is min-max normalised
 * across the compared set because the metrics have different units; raw
 * values are in the tooltip and the table.
 */
export function RadarCompareChart({
  scope,
  period,
  compare,
  onCompareChange,
  index: sectionIndex,
}: {
  scope: Scope;
  period: Period;
  compare: string[];
  onCompareChange: (ids: string[]) => void;
  /** Section number shown as an eyebrow. */
  index?: string;
}) {
  const index = useData();
  const reduceMotion = usePrefersReducedMotion();
  const ids = compare.length ? compare : defaultCompare(index, scope);
  const data = useMemo(() => radarData(index, ids, period), [index, ids, period]);

  // Candidate chips: regions at portfolio level, otherwise the region's markets
  // plus the regions themselves so mixed comparisons remain possible.
  const candidates = useMemo(() => {
    const regionId = scope.regionId;
    const markets = regionId ? (index.marketsByRegion.get(regionId) ?? []) : index.markets;
    return [
      ...index.regions.map((r) => ({ id: r.id, name: r.name, kind: "region" as const })),
      ...markets.map((m) => ({ id: m.id, name: m.name, kind: "market" as const })),
    ];
  }, [index, scope.regionId]);

  const chartData = data.axes.map((axis) => {
    const row: Record<string, string | number | null> = { axis: AXIS_LABEL[axis] };
    for (const s of data.series)
      row[s.entity.id] = s.normalized[axis] === null ? null : Math.round(s.normalized[axis]! * 100);
    return row;
  });

  const summary = `${data.series.map((s) => s.entity.name).join(", ")} compared on ${data.axes.map((a) => AXIS_LABEL[a]).join(", ")} for ${formatPeriod(period)}. Values are scaled 0 to 100 between the lowest and highest of the compared set.`;

  return (
    <ChartFrame
      index={sectionIndex}
      title="Compare across KPIs"
      description="Each axis is scaled 0–100 between the lowest and highest value among the compared entities, so shapes are comparable even though units differ. Share is only defined for markets."
      summary={summary}
      minHeight={340}
      table={<RadarTable data={data} period={period} />}
    >
      <div className="mb-2">
        <ToggleGroup
          type="multiple"
          size="sm"
          variant="outline"
          value={ids}
          onValueChange={(v) => onCompareChange(v.slice(0, MAX_COMPARE))}
          aria-label="Entities to compare"
          className="flex flex-wrap gap-1"
        >
          {candidates.map((c) => (
            <ToggleGroupItem
              key={c.id}
              value={c.id}
              disabled={!ids.includes(c.id) && ids.length >= MAX_COMPARE}
              className="text-xs"
            >
              {c.name}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>
      {data.series.length === 0 ? (
        <p className="text-muted-foreground py-10 text-center text-sm">
          Pick at least one region or market to compare.
        </p>
      ) : (
        <ResponsiveContainer width="100%" height={340}>
          <RadarChart data={chartData} outerRadius="72%">
            <PolarGrid stroke="var(--border)" />
            <PolarAngleAxis
              dataKey="axis"
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
            />
            <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload?.length) return null;
                const axis = data.axes.find((a) => AXIS_LABEL[a] === label);
                return (
                  <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
                    <p className="mb-1 font-medium">{String(label)}</p>
                    {data.series.map((s, i) => (
                      <p key={s.entity.id} className="flex items-center justify-between gap-4">
                        <span className="inline-flex items-center gap-1.5">
                          <span
                            className="inline-block size-2 rounded-full"
                            style={{ background: CAT_COLORS[i % CAT_COLORS.length] }}
                            aria-hidden
                          />
                          {s.entity.name}
                        </span>
                        <span className="font-medium">
                          {axis ? formatAxis(axis, s.raw[axis]) : "—"}
                        </span>
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {data.series.map((s, i) => (
              <Radar
                key={s.entity.id}
                name={s.entity.name}
                dataKey={s.entity.id}
                stroke={CAT_COLORS[i % CAT_COLORS.length]}
                fill={CAT_COLORS[i % CAT_COLORS.length]}
                fillOpacity={0.12}
                strokeWidth={2}
                dot={{ r: 3 }}
                isAnimationActive={!reduceMotion}
                animationDuration={700}
              />
            ))}
          </RadarChart>
        </ResponsiveContainer>
      )}
    </ChartFrame>
  );
}

function RadarTable({ data, period }: { data: RadarData; period: Period }) {
  return (
    <Table>
      <TableCaption>
        Raw KPI values for the compared entities in {formatPeriod(period)}. The chart scales each
        column 0–100 between its minimum and maximum.
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Entity</TableHead>
          {data.axes.map((a) => (
            <TableHead key={a} className="text-right">
              {AXIS_LABEL[a]}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.series.map((s) => (
          <TableRow key={s.entity.id}>
            <TableCell className="font-medium">
              {s.entity.name}{" "}
              <span className="text-muted-foreground text-xs">({s.entity.kind})</span>
            </TableCell>
            {data.axes.map((a) => (
              <TableCell key={a} className="text-right">
                {formatAxis(a, s.raw[a])}
                {s.normalized[a] !== null ? (
                  <span className="text-muted-foreground block text-xs">
                    scaled {Math.round(s.normalized[a]! * 100)}
                  </span>
                ) : null}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
