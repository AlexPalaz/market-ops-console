"use client";

import { useMemo } from "react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
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

const SERIES = [
  { key: "actual", label: "Actual", color: "var(--series-actual)", dash: undefined, width: 2.25 },
  { key: "forecast", label: "Forecast", color: "var(--series-forecast)", dash: "6 4", width: 1.75 },
  { key: "priorYear", label: "Prior year", color: "var(--series-prior)", dash: "2 3", width: 1.75 },
] as const;

interface TooltipPayloadItem {
  dataKey?: string | number;
  value?: number | string;
  color?: string;
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
    <div className="bg-popover text-popover-foreground rounded-md border px-3 py-2 text-xs shadow-md">
      <p className="mb-1 font-medium">{formatPeriod(String(label))}</p>
      {SERIES.map((s) => (
        <p key={s.key} className="flex items-center justify-between gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="inline-block h-0.5 w-3" style={{ background: s.color }} aria-hidden />
            {s.label}
          </span>
          <span className="font-medium">{formatCurrencyExact(byKey.get(s.key) ?? 0)}</span>
        </p>
      ))}
      <p className="text-muted-foreground mt-1 border-t pt-1">
        vs forecast {formatPercent(ratioPct(actual - forecast, forecast), { signed: true })} · YoY{" "}
        {formatPercent(ratioPct(actual - prior, prior), { signed: true })}
      </p>
    </div>
  );
}

/**
 * Actual vs forecast vs prior year for the selected scope, with the selected
 * period marked and anomaly markers from the dataset. Clicking a point selects
 * that period for the whole dashboard.
 */
export function TimeSeriesChart({
  scope,
  period,
  onSelectPeriod,
  fill = false,
}: {
  scope: Scope;
  period: Period;
  onSelectPeriod: (p: Period) => void;
  /** Fill the parent row instead of a fixed 300px chart. */
  fill?: boolean;
}) {
  const index = useData();
  const reduceMotion = usePrefersReducedMotion();
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
    <ChartFrame
      title="Actual vs forecast vs prior year"
      description={`${label}, monthly revenue over the 24-month horizon. Click a month to select it.`}
      summary={summary}
      minHeight={300}
      fill={fill}
      table={<SeriesTable data={data} label={label} />}
    >
      <div className={fill ? "h-full min-h-[300px]" : undefined}>
        <ResponsiveContainer width="100%" height={fill ? "100%" : 300}>
          <LineChart
            data={data}
            margin={{ top: 12, right: 12, left: 4, bottom: 0 }}
            onClick={(state) => {
              const p = state?.activeLabel;
              if (typeof p === "string" && index.periodIndex.has(p)) onSelectPeriod(p);
            }}
            style={{ cursor: "pointer" }}
          >
            <CartesianGrid strokeDasharray="2 4" stroke="var(--border)" vertical={false} />
            <XAxis
              dataKey="period"
              tickFormatter={(p: string) => formatPeriod(p)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={{ stroke: "var(--border)" }}
              minTickGap={24}
            />
            <YAxis
              tickFormatter={(v: number) => formatCompact(v)}
              tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
              tickLine={false}
              axisLine={false}
              width={48}
            />
            <Tooltip
              content={<SeriesTooltip />}
              cursor={{ stroke: "var(--ring)", strokeDasharray: "3 3" }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="plainline"
              wrapperStyle={{ fontSize: 12, paddingBottom: 8 }}
            />
            <ReferenceLine
              x={period}
              stroke="var(--foreground)"
              strokeOpacity={0.35}
              strokeWidth={1.5}
              label={{
                value: formatPeriod(period),
                position: "insideTopLeft",
                fontSize: 10,
                fill: "var(--muted-foreground)",
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
                activeDot={{ r: 4 }}
                isAnimationActive={!reduceMotion}
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
                  r={6}
                  fill="var(--status-off-track)"
                  stroke="var(--background)"
                  strokeWidth={2}
                  label={{
                    value: a.type,
                    position: "bottom",
                    fontSize: 10,
                    fill: "var(--status-off-track)",
                  }}
                />
              );
            })}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </ChartFrame>
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
            <TableCell>{formatPeriod(d.period)}</TableCell>
            <TableCell className="text-right">{formatCurrencyExact(d.actual)}</TableCell>
            <TableCell className="text-right">{formatCurrencyExact(d.forecast)}</TableCell>
            <TableCell className="text-right">{formatCurrencyExact(d.priorYear)}</TableCell>
            <TableCell className="text-right">
              {formatPercent(ratioPct(d.actual - d.forecast, d.forecast), { signed: true })}
            </TableCell>
            <TableCell className="text-right">
              {formatPercent(ratioPct(d.actual - d.priorYear, d.priorYear), { signed: true })}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
