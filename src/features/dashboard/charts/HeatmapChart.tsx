"use client";

import { useId, useMemo, useRef, useState, type KeyboardEvent } from "react";
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
import { formatPercent, formatPeriod } from "@/domain/format";
import { heatmapMatrix, type HeatmapMetric } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";
import { makeColorScale, METRICS } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { useHoverStore } from "../state/hoverStore";
import { RampLegend } from "./theme";

const CELL = 24;
const GAP = 2;
const LABEL_W = 112;
const HEADER_H = 40;

const METRIC_LABEL: Record<HeatmapMetric, string> = {
  growthPct: "Growth, year on year",
  variancePct: "Variance vs forecast",
};

/**
 * Markets × months on a diverging scale centred on zero. Cells are grid cells:
 * arrow keys move, Enter/Space selects the market and month for the whole
 * dashboard. Hover is shared with the time series through the hover store.
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
  index?: string;
}) {
  const index = useData();
  const [metric, setMetric] = useState<HeatmapMetric>("growthPct");
  const svgRef = useRef<SVGSVGElement>(null);
  const titleId = useId();
  const hoverPeriod = useHoverStore((s) => s.period);
  const hoverMarket = useHoverStore((s) => s.marketId);
  const setHover = useHoverStore((s) => s.setHover);
  const clearHover = useHoverStore((s) => s.clear);

  const matrix = useMemo(() => heatmapMatrix(index, scope, metric), [index, scope, metric]);
  const scale = useMemo(
    () =>
      makeColorScale(
        matrix.rows.flatMap((r) => r.cells.map((c) => c.value)),
        { ...METRICS.growthPct, kind: "diverging", center: 0 },
      ),
    [matrix],
  );

  const width = LABEL_W + matrix.periods.length * CELL;
  const height = HEADER_H + matrix.rows.length * CELL;
  const fmt = (v: number | null) => formatPercent(v, { signed: true });

  const hovered =
    hoverPeriod && hoverMarket
      ? matrix.rows
          .find((r) => r.marketId === hoverMarket)
          ?.cells.find((c) => c.period === hoverPeriod)
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

  const colX = (c: number) => LABEL_W + c * CELL + CELL / 2;
  const rowY = (r: number) => HEADER_H + r * CELL + CELL / 2;

  return (
    <Section
      title="Markets × months"
      index={sectionIndex}
      description={`${METRIC_LABEL[metric]} per market and month, red below zero and green above. Click or press Enter on a cell to focus that market and month.`}
      summary={summary}
      minHeight={height + 40}
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
          onMouseLeave={clearHover}
          className="max-w-full select-none"
        >
          <title id={titleId}>{`${METRIC_LABEL[metric]} heat map`}</title>
          <g role="row" aria-rowindex={1}>
            {matrix.periods.map((p, c) => {
              const [y, m] = p.split("-");
              const showYear = m === "01" || c === 0;
              const active = p === period;
              const hot = p === hoverPeriod;
              return (
                <text
                  key={p}
                  role="columnheader"
                  x={colX(c)}
                  y={HEADER_H - 8}
                  textAnchor="middle"
                  fontSize={10.5}
                  fontFamily="var(--font-geist-mono)"
                  fill={active || hot ? "var(--ink)" : "var(--ink-soft)"}
                  fontWeight={active ? 600 : 400}
                  textDecoration={hot ? "underline" : undefined}
                >
                  {showYear ? (
                    <>
                      <tspan x={colX(c)} dy={-13} fontSize={10} fill="var(--ink-soft)">
                        {y}
                      </tspan>
                      <tspan x={colX(c)} dy={13}>
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
          {matrix.rows.map((row, r) => {
            const rowActive = row.marketId === scope.marketId;
            const rowHot = row.marketId === hoverMarket;
            return (
              <g key={row.marketId} role="row" aria-rowindex={r + 2}>
                <text
                  role="rowheader"
                  x={LABEL_W - 10}
                  y={rowY(r)}
                  textAnchor="end"
                  dominantBaseline="middle"
                  fontSize={11}
                  fontFamily="var(--font-sans)"
                  fill={rowActive || rowHot ? "var(--ink)" : "var(--ink-soft)"}
                  fontWeight={rowActive ? 600 : 400}
                >
                  {row.marketName}
                </text>
                {row.cells.map((cell, c) => {
                  const selected = cell.marketId === scope.marketId && cell.period === period;
                  const isHover = hoverMarket === cell.marketId && hoverPeriod === cell.period;
                  const inCross =
                    !isHover && (hoverMarket === cell.marketId || hoverPeriod === cell.period);
                  return (
                    <rect
                      key={cell.period}
                      role="gridcell"
                      tabIndex={r === 0 && c === 0 ? 0 : -1}
                      data-r={r}
                      data-c={c}
                      aria-label={`${row.marketName}, ${formatPeriod(cell.period)}: ${fmt(cell.value)}`}
                      aria-selected={selected || undefined}
                      x={LABEL_W + c * CELL + GAP / 2}
                      y={HEADER_H + r * CELL + GAP / 2}
                      width={CELL - GAP}
                      height={CELL - GAP}
                      rx={2}
                      fill={cell.value === null ? "var(--no-data)" : scale.color(cell.value)}
                      fillOpacity={hoverMarket || hoverPeriod ? (isHover || inCross ? 1 : 0.6) : 1}
                      stroke={selected ? "var(--signal)" : isHover ? "var(--ink)" : "transparent"}
                      strokeWidth={selected ? 2 : 1.5}
                      className="focus-visible:stroke-ink cursor-pointer transition-[fill-opacity] duration-150 outline-none focus-visible:stroke-[2px]"
                      onMouseEnter={() => setHover(cell.period, cell.marketId)}
                      onFocus={() => setHover(cell.period, cell.marketId)}
                      onClick={() => onSelectCell(cell.marketId, cell.period)}
                    />
                  );
                })}
              </g>
            );
          })}
        </svg>
      </div>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <RampLegend
          gradient={scale.gradient}
          min={fmt(scale.min)}
          max={fmt(scale.max)}
          extra={
            <span
              className="text-ink-soft inline-flex items-center gap-1.5 text-[11px]"
              aria-hidden
            >
              <span
                className="inline-block size-2.5 rounded-sm"
                style={{ background: "var(--no-data)" }}
              />
              no data
            </span>
          }
        />
        <p
          className={cn("numeral min-h-5 text-[12px]", !hovered && "text-ink-soft")}
          aria-live="polite"
        >
          {hovered && hoverMarket && hoverPeriod
            ? `${matrix.rows.find((r) => r.marketId === hoverMarket)?.marketName} · ${formatPeriod(hoverPeriod)} · ${fmt(hovered.value)}`
            : "Hover or focus a cell for its value"}
        </p>
      </div>
    </Section>
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
              <TableCell key={c.period} className="numeral text-right">
                {fmt(c.value)}
              </TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
