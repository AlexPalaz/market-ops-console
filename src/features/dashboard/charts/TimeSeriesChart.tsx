"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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
import { useData } from "@/data/DataProvider";
import {
  formatCompact,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
  formatPeriod,
} from "@/domain/format";
import {
  anomaliesInScope,
  ratioPct,
  scopeLabel,
  timeSeries,
  type TimeSeriesPoint,
} from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { useHoverStore } from "../state/hoverStore";
import { chart, ChartLegend, ChartTooltipBox, LineSwatch, tick } from "./theme";

const SERIES = [
  { key: "actual", label: "Actual", color: chart.series.actual, dash: undefined, width: 2 },
  { key: "forecast", label: "Forecast", color: chart.series.forecast, dash: "5 4", width: 1.5 },
  { key: "priorYear", label: "Prior year", color: chart.series.prior, dash: "1.5 3", width: 1.5 },
] as const;

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | string;
}

function SeriesTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadItem[];
  label?: string | number;
}) {
  if (!active || !payload?.length) return null;
  const byKey = new Map(payload.map((p) => [String(p.dataKey), Number(p.value)]));
  const actual = byKey.get("actual") ?? 0;
  const forecast = byKey.get("forecast") ?? 0;
  const prior = byKey.get("priorYear") ?? 0;
  return (
    <ChartTooltipBox
      title={formatPeriod(String(label))}
      rows={SERIES.map((s) => ({
        label: s.label,
        value: formatCurrencyExact(byKey.get(s.key) ?? 0),
        swatch: <LineSwatch color={s.color} dash={s.dash} />,
      }))}
      footer={`vs forecast ${formatPercent(ratioPct(actual - forecast, forecast), { signed: true })} · YoY ${formatPercent(ratioPct(actual - prior, prior), { signed: true })}`}
    />
  );
}

/**
 * Actual vs forecast vs prior year for the selected scope. The selected month
 * is a signal rule; a month hovered in the heat map shows as an ink rule.
 * Clicking a point selects that period for the whole dashboard.
 */
export function TimeSeriesChart({
  scope,
  period,
  onSelectPeriod,
  fill = false,
  index: sectionIndex,
}: {
  scope: Scope;
  period: Period;
  onSelectPeriod: (p: Period) => void;
  fill?: boolean;
  index?: string;
}) {
  const index = useData();
  const reduceMotion = usePrefersReducedMotion();
  const hoverPeriod = useHoverStore((s) => s.period);
  const setHover = useHoverStore((s) => s.setHover);
  const clearHover = useHoverStore((s) => s.clear);
  const data = useMemo(() => timeSeries(index, scope), [index, scope]);
  const anomalies = useMemo(
    () => (scope.marketId ? anomaliesInScope(index, { marketId: scope.marketId }) : []),
    [index, scope.marketId],
  );
  const label = scopeLabel(index, scope);
  const first = data[0];
  const last = data[data.length - 1];

  const summary =
    first && last
      ? `${label}: actual revenue moved from ${formatCurrency(first.actual)} in ${formatPeriod(first.period)} to ${formatCurrency(last.actual)} in ${formatPeriod(last.period)}. Latest month is ${formatPercent(ratioPct(last.actual - last.forecast, last.forecast), { signed: true })} versus forecast.`
      : undefined;

  return (
    <Section
      title="Actual vs forecast vs prior year"
      index={sectionIndex}
      description={`${label}, monthly revenue over the 24-month horizon. Click a month to select it.`}
      summary={summary}
      minHeight={300}
      fill={fill}
      table={<SeriesTable data={data} label={label} />}
    >
      <div className={fill ? "flex h-full min-h-[300px] flex-col" : undefined}>
        <ChartLegend
          className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-1"
          items={SERIES.map((s) => ({
            label: s.label,
            swatch: <LineSwatch color={s.color} dash={s.dash} />,
          }))}
        />
        <div className={fill ? "min-h-0 flex-1" : undefined}>
          <ResponsiveContainer width="100%" height={fill ? "100%" : 280}>
            <LineChart
              data={data}
              margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
              onClick={(state) => {
                const p = state?.activeLabel;
                if (typeof p === "string" && index.periodIndex.has(p)) onSelectPeriod(p);
              }}
              onMouseMove={(state) => {
                const p = state?.activeLabel;
                if (typeof p === "string") setHover(p, null);
              }}
              onMouseLeave={clearHover}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid stroke={chart.rule} vertical={false} />
              <XAxis
                dataKey="period"
                tickFormatter={(p: string) => formatPeriod(p)}
                tick={tick}
                tickLine={false}
                axisLine={{ stroke: chart.rule }}
                minTickGap={28}
              />
              <YAxis
                tickFormatter={(v: number) => formatCompact(v)}
                tick={tick}
                tickLine={false}
                axisLine={false}
                width={44}
              />
              <Tooltip
                content={<SeriesTooltip />}
                cursor={{ stroke: chart.inkSoft, strokeDasharray: "2 3" }}
                isAnimationActive={false}
              />
              {hoverPeriod && hoverPeriod !== period ? (
                <ReferenceLine
                  x={hoverPeriod}
                  stroke={chart.ink}
                  strokeDasharray="2 3"
                  strokeOpacity={0.6}
                />
              ) : null}
              <ReferenceLine
                x={period}
                stroke={chart.signal}
                strokeWidth={1.5}
                label={{
                  value: formatPeriod(period),
                  position: "insideTopLeft",
                  fontSize: 10.5,
                  fontFamily: chart.mono,
                  fill: chart.signal,
                }}
              />
              {SERIES.map((s) => (
                <Line
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={s.label}
                  stroke={s.color}
                  strokeWidth={s.width}
                  strokeDasharray={s.dash}
                  dot={false}
                  activeDot={{ r: 3.5, stroke: chart.paper, strokeWidth: 1.5 }}
                  isAnimationActive={!reduceMotion}
                  animationDuration={600}
                />
              ))}
              {anomalies.map((a) => {
                const pt = data.find((d) => d.period === a.period);
                if (!pt) return null;
                return (
                  <ReferenceDot
                    key={`${a.market.id}-${a.period}`}
                    x={a.period}
                    y={pt.actual}
                    r={5}
                    fill={chart.paper}
                    stroke={chart.signal}
                    strokeWidth={2}
                    label={{
                      value: a.type,
                      position: "bottom",
                      fontSize: 10.5,
                      fontFamily: chart.mono,
                      fill: chart.signal,
                    }}
                  />
                );
              })}
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </Section>
  );
}

function SeriesTable({ data, label }: { data: TimeSeriesPoint[]; label: string }) {
  return (
    <Table>
      <TableCaption>Monthly revenue for {label}: actual, forecast and prior year.</TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Month</TableHead>
          <TableHead className="text-right">Actual</TableHead>
          <TableHead className="text-right">Forecast</TableHead>
          <TableHead className="text-right">Prior year</TableHead>
          <TableHead className="text-right">vs forecast</TableHead>
          <TableHead className="text-right">YoY</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {data.map((d) => (
          <TableRow key={d.period}>
            <TableCell className="numeral">{formatPeriod(d.period)}</TableCell>
            <TableCell className="numeral text-right">{formatCurrencyExact(d.actual)}</TableCell>
            <TableCell className="numeral text-right">{formatCurrencyExact(d.forecast)}</TableCell>
            <TableCell className="numeral text-right">{formatCurrencyExact(d.priorYear)}</TableCell>
            <TableCell className="numeral text-right">
              {formatPercent(ratioPct(d.actual - d.forecast, d.forecast), { signed: true })}
            </TableCell>
            <TableCell className="numeral text-right">
              {formatPercent(ratioPct(d.actual - d.priorYear, d.priorYear), { signed: true })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
