import type { DataIndex } from "../dataIndex";
import type { Anomaly, ComputedKpis, Market, MetricKey, Period, Scope, Status } from "../types";
import { scopeKpis } from "./aggregate";
import { marketsInScope } from "./scope";

export interface MarketSnapshot {
  market: Market;
  regionName: string;
  period: Period;
  kpis: ComputedKpis;
  /** From data.json; not derivable from the series. */
  status: Status;
  /** From data.json; synthetic, market level only. */
  sharePct: number;
  anomalies: Anomaly[];
}

export function marketSnapshot(
  index: DataIndex,
  marketId: string,
  period: Period,
  productId?: string,
): MarketSnapshot | null {
  const market = index.marketsById.get(marketId);
  if (!market) return null;
  return {
    market,
    regionName: index.regionsById.get(market.regionId)?.name ?? market.regionId,
    period,
    kpis: scopeKpis(index, { marketId, productId }, period),
    status: market.kpis.status,
    sharePct: market.kpis.sharePct,
    anomalies: market.kpis.anomalies,
  };
}

/** Snapshots for every market under the scope's region (or all), at `period`. */
export function marketSnapshots(index: DataIndex, scope: Scope, period: Period): MarketSnapshot[] {
  const base: Scope = { regionId: scope.regionId };
  return marketsInScope(index, base)
    .map((m) => marketSnapshot(index, m.id, period, scope.productId))
    .filter((s): s is MarketSnapshot => s !== null);
}

/** Value of a metric for a snapshot; null when not computable. */
export function metricValue(snapshot: MarketSnapshot, key: MetricKey): number | null {
  switch (key) {
    case "revenue":
      return snapshot.kpis.revenue;
    case "growthPct":
      return snapshot.kpis.growthPct;
    case "forecastAttainmentPct":
      return snapshot.kpis.forecastAttainmentPct;
    case "sharePct":
      return snapshot.sharePct;
  }
}

export interface StatusCounts {
  on_track: number;
  at_risk: number;
  off_track: number;
  /** at_risk + off_track */
  needsAttention: number;
  total: number;
}

export function statusCounts(index: DataIndex, scope: Scope = {}): StatusCounts {
  const counts: StatusCounts = {
    on_track: 0,
    at_risk: 0,
    off_track: 0,
    needsAttention: 0,
    total: 0,
  };
  for (const m of marketsInScope(index, { regionId: scope.regionId })) {
    counts[m.kpis.status] += 1;
    counts.total += 1;
  }
  counts.needsAttention = counts.at_risk + counts.off_track;
  return counts;
}

export interface Movers {
  gainers: MarketSnapshot[];
  decliners: MarketSnapshot[];
}

/** Top markets by YoY growth at `period`, both directions. */
export function topMovers(index: DataIndex, scope: Scope, period: Period, n = 3): Movers {
  const withGrowth = marketSnapshots(index, scope, period).filter((s) => s.kpis.growthPct !== null);
  const sorted = [...withGrowth].sort((a, b) => (b.kpis.growthPct ?? 0) - (a.kpis.growthPct ?? 0));
  return {
    gainers: sorted.slice(0, n).filter((s) => (s.kpis.growthPct ?? 0) > 0),
    decliners: sorted
      .slice(-n)
      .reverse()
      .filter((s) => (s.kpis.growthPct ?? 0) < 0),
  };
}

export interface AnomalyHit extends Anomaly {
  market: Market;
}

export function anomaliesInScope(index: DataIndex, scope: Scope): AnomalyHit[] {
  return marketsInScope(index, scope).flatMap((market) =>
    market.kpis.anomalies.map((a) => ({ ...a, market })),
  );
}

/** Markets whose status is not on_track, worst first. */
export function marketsAtRisk(index: DataIndex, scope: Scope, period: Period): MarketSnapshot[] {
  const order: Record<Status, number> = { off_track: 0, at_risk: 1, on_track: 2 };
  return marketSnapshots(index, scope, period)
    .filter((s) => s.status !== "on_track")
    .sort((a, b) => order[a.status] - order[b.status] || a.kpis.revenue - b.kpis.revenue);
}
