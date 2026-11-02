import type { DataIndex } from "../dataIndex";
import type { Period, Scope } from "../types";
import { filterRows } from "./aggregate";

export interface TimeSeriesPoint {
  period: Period;
  actual: number;
  forecast: number;
  priorYear: number;
  units: number;
}

/** One point per period in `meta.periods` order. Periods without rows yield zeros. */
export function timeSeries(index: DataIndex, scope: Scope): TimeSeriesPoint[] {
  const byPeriod = new Map<Period, TimeSeriesPoint>(
    index.periods.map((p) => [p, { period: p, actual: 0, forecast: 0, priorYear: 0, units: 0 }]),
  );
  for (const r of filterRows(index, scope)) {
    const pt = byPeriod.get(r.period);
    if (!pt) continue;
    pt.actual += r.actual;
    pt.forecast += r.forecast;
    pt.priorYear += r.priorYear;
    pt.units += r.units;
  }
  return index.periods.map((p) => byPeriod.get(p)!);
}
