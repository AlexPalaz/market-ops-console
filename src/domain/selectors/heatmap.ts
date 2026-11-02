import type { DataIndex } from "../dataIndex";
import type { Period, Scope } from "../types";
import { ratioPct } from "./aggregate";
import { marketsInScope } from "./scope";
import { timeSeries } from "./timeseries";

export type HeatmapMetric = "variancePct" | "growthPct";

export interface HeatmapCell {
  marketId: string;
  period: Period;
  /** Percent points, or null when not computable. */
  value: number | null;
}

export interface HeatmapRow {
  marketId: string;
  marketName: string;
  cells: HeatmapCell[];
}

export interface HeatmapMatrix {
  metric: HeatmapMetric;
  periods: readonly Period[];
  rows: HeatmapRow[];
  /** Symmetric bound for a diverging scale centred on 0. */
  absMax: number;
}

/**
 * Markets x periods. `growthPct` = (actual - priorYear) / priorYear,
 * `variancePct` = (actual - forecast) / forecast, both from summed revenue.
 *
 * YoY growth is the default because the dataset's deliberate story (Germany's
 * March 2026 dip) is invisible against forecast: the forecast for that month
 * was re-baselined downwards, so attainment looks normal while revenue fell.
 */
export function heatmapMatrix(
  index: DataIndex,
  scope: Scope,
  metric: HeatmapMetric = "growthPct",
): HeatmapMatrix {
  let absMax = 0;
  const rows: HeatmapRow[] = marketsInScope(index, { regionId: scope.regionId }).map((market) => {
    const series = timeSeries(index, { marketId: market.id, productId: scope.productId });
    const cells = series.map<HeatmapCell>((pt) => {
      const value =
        metric === "variancePct"
          ? ratioPct(pt.actual - pt.forecast, pt.forecast)
          : ratioPct(pt.actual - pt.priorYear, pt.priorYear);
      if (value !== null) absMax = Math.max(absMax, Math.abs(value));
      return { marketId: market.id, period: pt.period, value };
    });
    return { marketId: market.id, marketName: market.name, cells };
  });
  return { metric, periods: index.periods, rows, absMax };
}
