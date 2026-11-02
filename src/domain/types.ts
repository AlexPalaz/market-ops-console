/**
 * Domain types for the Market Operations console.
 *
 * Everything here mirrors the shapes documented in the starter pack's
 * CONTRACT.md. Nothing is invented: ids, KPI names and event names are the
 * ones used by data.json, fixtures.json and the SSE contract.
 */

/** A month in `YYYY-MM` form, e.g. "2026-03". Validated by `periodSchema`. */
export type Period = string;

export type Status = "on_track" | "at_risk" | "off_track";

export interface Region {
  id: string;
  name: string;
}

export interface Product {
  id: string;
  name: string;
}

export interface Anomaly {
  period: Period;
  type: string;
  note: string;
}

/** Precomputed KPIs for a market at `meta.latestPeriod` (from data.json). */
export interface MarketKpis {
  revenue: number;
  growthPct: number;
  /** Synthetic market share. Only meaningful at market level; never aggregate it. */
  sharePct: number;
  forecastAttainmentPct: number;
  status: Status;
  anomalies: Anomaly[];
}

export interface Market {
  id: string;
  name: string;
  iso3: string;
  iso2: string;
  regionId: string;
  kpis: MarketKpis;
}

/** One row of the fact table: market x product x month. */
export interface SeriesRow {
  marketId: string;
  productId: string;
  period: Period;
  actual: number;
  forecast: number;
  units: number;
  priorYear: number;
}

export interface Meta {
  currency: string;
  periods: Period[];
  latestPeriod: Period;
  generatedAt: string;
}

export interface Dataset {
  meta: Meta;
  regions: Region[];
  products: Product[];
  markets: Market[];
  series: SeriesRow[];
}

/* ------------------------------------------------------------------ */
/* Selection model                                                     */
/* ------------------------------------------------------------------ */

export type Level = "portfolio" | "region" | "market" | "product";

/**
 * The hierarchy position the dashboard is looking at. Any combination of the
 * three ids is a valid filter over the series; the deepest defined id gives
 * the `Level`. A market implies its region.
 */
export interface Scope {
  regionId?: string;
  marketId?: string;
  productId?: string;
}

/** KPI keys the user can colour the map / sort tables by. */
export type MetricKey = "revenue" | "growthPct" | "forecastAttainmentPct" | "sharePct";

export const METRIC_KEYS: readonly MetricKey[] = [
  "revenue",
  "growthPct",
  "forecastAttainmentPct",
  "sharePct",
] as const;

export type ViewMode = "exec" | "analyst";

/* ------------------------------------------------------------------ */
/* Derived values                                                      */
/* ------------------------------------------------------------------ */

export interface Totals {
  actual: number;
  forecast: number;
  priorYear: number;
  units: number;
}

/** KPIs recomputed from `series` for any scope and period. */
export interface ComputedKpis extends Totals {
  revenue: number;
  /** Year-on-year growth in percent points, or null when priorYear is 0. */
  growthPct: number | null;
  /** actual / forecast in percent points, or null when forecast is 0. */
  forecastAttainmentPct: number | null;
  /** actual - forecast (absolute). */
  variance: number;
  /** (actual - forecast) / forecast in percent points, or null when forecast is 0. */
  variancePct: number | null;
}

/* ------------------------------------------------------------------ */
/* Assistant: streaming contract (CONTRACT.md)                         */
/* ------------------------------------------------------------------ */

export type AnswerKind = "normal" | "low_confidence" | "abstain" | "error";
export type Confidence = "high" | "medium" | "low";

export interface Citation {
  marketId?: string;
  regionId?: string;
  productId?: string;
  period?: Period;
  label?: string;
}

export type StreamEvent =
  | { type: "token"; value: string }
  | { type: "done"; kind: AnswerKind; citations: Citation[]; confidence: Confidence }
  | { type: "error"; message: string };

export interface Fixture {
  id: string;
  keywords?: string[];
  kind: AnswerKind;
  answer: { text: string; citations: Citation[]; confidence: Confidence };
  error?: string;
}

export interface Fixtures {
  note?: string;
  default: Fixture;
  fixtures: Fixture[];
}
