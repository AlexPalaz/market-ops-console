import type { DataIndex } from "../dataIndex";
import type { ComputedKpis, Period, Scope, SeriesRow, Totals } from "../types";

/** Rows matching every defined id in the scope, optionally for one period. */
export function filterRows(index: DataIndex, scope: Scope, period?: Period): SeriesRow[] {
  let rows: readonly SeriesRow[];
  if (scope.marketId) {
    rows = index.rowsByMarket.get(scope.marketId) ?? [];
  } else if (scope.regionId) {
    const ids = new Set((index.marketsByRegion.get(scope.regionId) ?? []).map((m) => m.id));
    rows = index.rows.filter((r) => ids.has(r.marketId));
  } else {
    rows = index.rows;
  }
  return rows.filter(
    (r) =>
      (scope.productId === undefined || r.productId === scope.productId) &&
      (period === undefined || r.period === period),
  );
}

export function sumRows(rows: readonly SeriesRow[]): Totals {
  const t: Totals = { actual: 0, forecast: 0, priorYear: 0, units: 0 };
  for (const r of rows) {
    t.actual += r.actual;
    t.forecast += r.forecast;
    t.priorYear += r.priorYear;
    t.units += r.units;
  }
  return t;
}

/** Percent points, rounded to 1 decimal, or null when the denominator is 0. */
export function ratioPct(numerator: number, denominator: number): number | null {
  if (denominator === 0) return null;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * KPIs from totals. Growth and attainment are ratios of summed revenue, never
 * averages of per-market percentages.
 */
export function kpisFromTotals(t: Totals): ComputedKpis {
  const growth = t.priorYear === 0 ? null : ratioPct(t.actual - t.priorYear, t.priorYear);
  return {
    ...t,
    revenue: t.actual,
    growthPct: growth,
    forecastAttainmentPct: ratioPct(t.actual, t.forecast),
    variance: t.actual - t.forecast,
    variancePct: t.forecast === 0 ? null : ratioPct(t.actual - t.forecast, t.forecast),
  };
}

/** KPIs for a scope at a period, recomputed from the series. */
export function scopeKpis(index: DataIndex, scope: Scope, period: Period): ComputedKpis {
  return kpisFromTotals(sumRows(filterRows(index, scope, period)));
}

/** Previous period in `meta.periods`, or null at the start of the horizon. */
export function previousPeriod(index: DataIndex, period: Period): Period | null {
  const i = index.periodIndex.get(period);
  if (i === undefined || i === 0) return null;
  return index.periods[i - 1] ?? null;
}
