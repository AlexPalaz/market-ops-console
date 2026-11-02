"use client";

import { useMemo } from "react";
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Section } from "@/components/shared/Section";
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
import { chart, ChartLegend, ChartTooltipBox } from "./theme";

const AXIS_LABEL: Record<RadarAxis, string> = {
  revenue: "Revenue",
  growthPct: "Growth YoY",
  forecastAttainmentPct: "Attainment",
  sharePct: "Share",
  units: "Units",
};

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

/** Sensible defaults when the URL has no `compare`. */
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
  index?: string;
}) {
  const index = useData();
  const reduceMotion = usePrefersReducedMotion();
  const ids = compare.length ? compare : defaultCompare(index, scope);
  const data = useMemo(() => radarData(index, ids, period), [index, ids, period]);

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
    <Section
      title="Compare across KPIs"
      index={sectionIndex}
      description="Each axis is scaled 0–100 between the lowest and highest value among the compared entities, so shapes are comparable even though units differ. Share is only defined for markets."
      summary={summary}
      minHeight={360}
      table={<RadarTable data={data} period={period} />}
    >
      <ToggleGroup
        type="multiple"
        size="sm"
        variant="outline"
        value={ids}
        onValueChange={(v) => onCompareChange(v.slice(0, MAX_COMPARE))}
        aria-label="Entities to compare"
        className="mb-3"
      >
        {candidates.map((c) => (
          <ToggleGroupItem
            key={c.id}
            value={c.id}
            disabled={!ids.includes(c.id) && ids.length >= MAX_COMPARE}
            className="text-[12px]"
          >
            {c.name}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
      {data.series.length === 0 ? (
        <p className="text-ink-soft py-10 text-center text-[13px]">
          Pick at least one region or market to compare.
        </p>
      ) : (
        <>
          <ResponsiveContainer width="100%" height={300}>
            <RadarChart data={chartData} outerRadius="74%">
              <PolarGrid stroke={chart.rule} />
              <PolarAngleAxis
                dataKey="axis"
                tick={{ fontSize: 10.5, fill: chart.inkSoft, fontFamily: chart.sans }}
              />
              <PolarRadiusAxis angle={90} domain={[0, 100]} tick={false} axisLine={false} />
              <Tooltip
                isAnimationActive={false}
                content={({ active, payload, label }) => {
                  if (!active || !payload?.length) return null;
                  const axis = data.axes.find((a) => AXIS_LABEL[a] === label);
                  return (
                    <ChartTooltipBox
                      title={String(label)}
                      rows={data.series.map((s, i) => ({
                        label: s.entity.name,
                        value: axis ? formatAxis(axis, s.raw[axis]) : "—",
                        swatch: (
                          <span
                            className="inline-block size-2 rounded-sm"
                            style={{ background: chart.cat[i % chart.cat.length] }}
                            aria-hidden
                          />
                        ),
                      }))}
                    />
                  );
                }}
              />
              {data.series.map((s, i) => (
                <Radar
                  key={s.entity.id}
                  name={s.entity.name}
                  dataKey={s.entity.id}
                  stroke={chart.cat[i % chart.cat.length]}
                  fill={chart.cat[i % chart.cat.length]}
                  fillOpacity={0.08}
                  strokeWidth={1.5}
                  dot={{ r: 2.5, strokeWidth: 0 }}
                  isAnimationActive={!reduceMotion}
                  animationDuration={600}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
          <ChartLegend
            className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1"
            items={data.series.map((s, i) => ({
              label: s.entity.name,
              swatch: (
                <span
                  className="inline-block size-2 rounded-sm"
                  style={{ background: chart.cat[i % chart.cat.length] }}
                />
              ),
            }))}
          />
        </>
      )}
    </Section>
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
              {s.entity.name} <span className="text-ink-soft text-[11px]">({s.entity.kind})</span>
            </TableCell>
            {data.axes.map((a) => (
              <TableCell key={a} className="numeral text-right">
                {formatAxis(a, s.raw[a])}
                {s.normalized[a] !== null ? (
                  <span className="text-ink-soft block text-[11px]">
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
