"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
import { formatPercent, formatPeriod } from "@/domain/format";
import { heatmapMatrix, type HeatmapMetric } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";
import { makeColorScale, METRICS } from "@/lib/metrics";
import { cn } from "@/lib/utils";

const CELL_W = 30;
const CELL_H = 22;
const LABEL_W = 110;
const HEADER_H = 40;

const METRIC_LABEL: Record<HeatmapMetric, string> = {
  growthPct: "Growth, year on year",
  variancePct: "Variance vs forecast",
};

/**
 * Markets x periods heat map on a diverging scale centred on zero. Cells are
 * focusable grid cells: arrow keys move, Enter/Space selects the market and
 * period for the whole dashboard.
 */
export function HeatmapChart({
  scope,
  period,
  onSelectCell,
  index: sectionIndex,
}: {
  scope: Scope;
  period: Period;
  onSelectCell: (marketId: string, period: Period) => void;
  /** Section number shown as an eyebrow. */
  index?: string;
}) {
  const index = useData();
  const [metric, setMetric] = useState<HeatmapMetric>("growthPct");
  const [hover, setHover] = useState<{ marketId: string; period: Period } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();

  const matrix = useMemo(() => heatmapMatrix(index, scope, metric), [index, scope, metric]);
  const scale = useMemo(
    () =>
      makeColorScale(
        matrix.rows.flatMap((r) => r.cells.map((c) => c.value)),
        { ...METRICS.growthPct, kind: "diverging", center: 0 },
      ),
    [matrix],
  );

  const width = LABEL_W + matrix.periods.length * CELL_W;
  const height = HEADER_H + matrix.rows.length * CELL_H;
  const fmt = (v: number | null) => formatPercent(v, { signed: true });

  const hovered = hover
    ? matrix.rows
        .find((r) => r.marketId === hover.marketId)
        ?.cells.find((c) => c.period === hover.period)
    : undefined;

  const onKeyDown = (e: KeyboardEvent<SVGSVGElement>) => {
    const target = e.target as SVGElement;
    const r = Number(target.dataset.r);
    const c = Number(target.dataset.c);
    if (Number.isNaN(r) || Number.isNaN(c)) return;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [-1, 0],
      ArrowDown: [1, 0],
      ArrowLeft: [0, -1],
      ArrowRight: [0, 1],
    };
    const mv = moves[e.key];
    if (mv) {
      e.preventDefault();
      const nr = Math.max(0, Math.min(matrix.rows.length - 1, r + mv[0]));
      const nc = Math.max(0, Math.min(matrix.periods.length - 1, c + mv[1]));
      svgRef.current?.querySelector<SVGElement>(`[data-r="${nr}"][data-c="${nc}"]`)?.focus();
    }
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      const row = matrix.rows[r];
      const p = matrix.periods[c];
      if (row && p) onSelectCell(row.marketId, p);
    }
  };

  const extremes = useMemo(() => {
    let lo: { name: string; period: Period; value: number } | null = null;
    let hi: { name: string; period: Period; value: number } | null = null;
    for (const row of matrix.rows)
      for (const cell of row.cells) {
        if (cell.value === null) continue;
        if (!lo || cell.value < lo.value)
          lo = { name: row.marketName, period: cell.period, value: cell.value };
        if (!hi || cell.value > hi.value)
          hi = { name: row.marketName, period: cell.period, value: cell.value };
      }
    return { lo, hi };
  }, [matrix]);

  const summary =
    extremes.lo && extremes.hi
      ? `${METRIC_LABEL[metric]} across ${matrix.rows.length} markets and ${matrix.periods.length} months. Lowest: ${extremes.lo.name} in ${formatPeriod(extremes.lo.period)} at ${fmt(extremes.lo.value)}. Highest: ${extremes.hi.name} in ${formatPeriod(extremes.hi.period)} at ${fmt(extremes.hi.value)}.`
      : undefined;

  return (
    <ChartFrame
      index={sectionIndex}
      title="Markets × months"
      description={`${METRIC_LABEL[metric]} per market and month, red below zero and green above. Click or press Enter on a cell to focus that market and month.`}
      summary={summary}
      minHeight={height + 48}
      actions={
        <ToggleGroup
          type="single"
          size="sm"
          variant="outline"
          value={metric}
          onValueChange={(v) => {
            if (v === "growthPct" || v === "variancePct") setMetric(v);
          }}
          aria-label="Heat map metric"
        >
          <ToggleGroupItem value="growthPct">Growth YoY</ToggleGroupItem>
          <ToggleGroupItem value="variancePct">vs forecast</ToggleGroupItem>
        </ToggleGroup>
      }
      table={<HeatmapTable matrix={matrix} metricLabel={METRIC_LABEL[metric]} fmt={fmt} />}
    >
      <div className="overflow-x-auto">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          width={width}
          height={height}
          role="grid"
          aria-labelledby={titleId}
          aria-rowcount={matrix.rows.length + 1}
          aria-colcount={matrix.periods.length}
          onKeyDown={onKeyDown}
          onMouseLeave={() => setHover(null)}
          className="max-w-full select-none"
        >
          <title id={titleId}>{`${METRIC_LABEL[metric]} heat map`}</title>
          <defs>
            <pattern
              id="heatmap-nodata"
              width="6"
              height="6"
              patternUnits="userSpaceOnUse"
              patternTransform="rotate(45)"
            >
              <line x1="0" y1="0" x2="0" y2="6" stroke="var(--no-data)" strokeWidth="2" />
            </pattern>
          </defs>
          <g role="row" aria-rowindex={1}>
            {matrix.periods.map((p, c) => {
              const [y, m] = p.split("-");
              const showYear = m === "01" || c === 0;
              return (
                <text
                  key={p}
                  role="columnheader"
                  x={LABEL_W + c * CELL_W + CELL_W / 2}
                  y={HEADER_H - 8}
                  textAnchor="middle"
                  fontSize={10}
                  fill={p === period ? "var(--foreground)" : "var(--muted-foreground)"}
                  fontWeight={p === period ? 600 : 400}
                >
                  {showYear ? (
                    <>
                      <tspan x={LABEL_W + c * CELL_W + CELL_W / 2} dy={-12}>
                        {y}
                      </tspan>
                      <tspan x={LABEL_W + c * CELL_W + CELL_W / 2} dy={12}>
                        {formatPeriod(p).slice(0, 3)}
                      </tspan>
                    </>
                  ) : (
                    formatPeriod(p).slice(0, 3)
                  )}
                </text>
              );
            })}
          </g>
          {matrix.rows.map((row, r) => (
            <g key={row.marketId} role="row" aria-rowindex={r + 2}>
              <text
                role="rowheader"
                x={LABEL_W - 8}
                y={HEADER_H + r * CELL_H + CELL_H / 2}
                textAnchor="end"
                dominantBaseline="middle"
                fontSize={11}
                fill={
                  row.marketId === scope.marketId ? "var(--foreground)" : "var(--muted-foreground)"
                }
                fontWeight={row.marketId === scope.marketId ? 600 : 400}
              >
                {row.marketName}
              </text>
              {row.cells.map((cell, c) => {
                const selected = cell.marketId === scope.marketId && cell.period === period;
                const isHover = hover?.marketId === cell.marketId && hover.period === cell.period;
                return (
                  <rect
                    key={cell.period}
                    role="gridcell"
                    tabIndex={r === 0 && c === 0 ? 0 : -1}
                    data-r={r}
                    data-c={c}
                    aria-label={`${row.marketName}, ${formatPeriod(cell.period)}: ${fmt(cell.value)}`}
                    aria-selected={selected || undefined}
                    x={LABEL_W + c * CELL_W + 1}
                    y={HEADER_H + r * CELL_H + 1}
                    width={CELL_W - 2}
                    height={CELL_H - 2}
                    rx={2}
                    fill={cell.value === null ? "url(#heatmap-nodata)" : scale.color(cell.value)}
                    stroke={
                      selected ? "var(--foreground)" : isHover ? "var(--ring)" : "transparent"
                    }
                    strokeWidth={selected ? 2 : 1.5}
                    className="focus-visible:stroke-ring cursor-pointer outline-none focus-visible:stroke-[2px]"
                    onMouseEnter={() => setHover({ marketId: cell.marketId, period: cell.period })}
                    onFocus={() => setHover({ marketId: cell.marketId, period: cell.period })}
                    onClick={() => onSelectCell(cell.marketId, cell.period)}
                  />
                );
              })}
            </g>
          ))}
        </svg>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="text-muted-foreground">{fmt(scale.min)}</span>
          <span
            className="h-2.5 w-32 rounded-sm border"
            style={{ background: scale.gradient }}
            aria-hidden
          />
          <span className="text-muted-foreground">{fmt(scale.max)}</span>
          <span className="text-muted-foreground ml-2 inline-flex items-center gap-1">
            <span
              className="inline-block size-3 rounded-sm border"
              style={{
                background:
                  "repeating-linear-gradient(45deg, var(--no-data) 0 2px, transparent 2px 5px)",
              }}
              aria-hidden
            />
            no data
          </span>
        </div>
        <p
          className={cn("min-h-4 font-medium", !hovered && "text-muted-foreground")}
          aria-live="polite"
        >
          {hovered && hover
            ? `${matrix.rows.find((r) => r.marketId === hover.marketId)?.marketName}, ${formatPeriod(hover.period)}: ${fmt(hovered.value)}`
            : "Hover or focus a cell for its value"}
        </p>
      </div>
    </ChartFrame>
  );
}

function HeatmapTable({
  matrix,
  metricLabel,
  fmt,
}: {
  matrix: ReturnType<typeof heatmapMatrix>;
  metricLabel: string;
  fmt: (v: number | null) => string;
}) {
  return (
    <Table>
      <TableCaption>{metricLabel} by market and month, in percent.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Market</TableHead>
          {matrix.periods.map((p) => (
            <TableHead key={p} className="text-right whitespace-nowrap">
              {formatPeriod(p)}
            </TableHead>
          ))}
        </TableRow>
      </TableHeader>
      <TableBody>
        {matrix.rows.map((row) => (
          <TableRow key={row.marketId}>
            <TableCell className="font-medium whitespace-nowrap">{row.marketName}</TableCell>
            {row.cells.map((c) => (
              <TableCell key={c.period} className="text-right">
                {fmt(c.value)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
