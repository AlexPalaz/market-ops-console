import {
  createParser,
  parseAsArrayOf,
  parseAsString,
  parseAsStringLiteral,
  type inferParserType,
} from "nuqs";
import type { DataIndex } from "@/domain/dataIndex";
import { normalizeScope } from "@/domain/selectors";
import {
  METRIC_KEYS,
  type MetricKey,
  type Period,
  type Scope,
  type ViewMode,
} from "@/domain/types";

/**
 * URL schema for the dashboard. The URL is the single source of truth for
 * everything shareable; nothing here is mirrored into a store.
 *
 *   ?view=analyst&region=eu&market=de&product=veltrix&period=2026-03
 *    &metric=growthPct&compare=de,cn,us
 */
const VIEW_MODES = ["exec", "analyst"] as const satisfies readonly ViewMode[];

const periodParser = createParser<Period>({
  parse: (v) => (/^\d{4}-(0[1-9]|1[0-2])$/.test(v) ? v : null),
  serialize: (v) => v,
});

export const selectionParsers = {
  view: parseAsStringLiteral(VIEW_MODES).withDefault("exec"),
  region: parseAsString,
  market: parseAsString,
  product: parseAsString,
  period: periodParser,
  metric: parseAsStringLiteral(METRIC_KEYS).withDefault("revenue"),
  compare: parseAsArrayOf(parseAsString, ",").withDefault([]),
};

/** Raw URL values after parsing (ids not yet checked against the dataset). */
export type RawSelection = inferParserType<typeof selectionParsers>;

/** The coherent, dataset-validated selection every component consumes. */
export interface DashboardSelection {
  view: ViewMode;
  scope: Scope;
  period: Period;
  metric: MetricKey;
  /** Region or market ids to compare on the radar; unknown ids dropped. */
  compare: string[];
}

/**
 * Turns raw URL values into a coherent selection:
 * - ids are checked against the dataset, a market implies its region;
 * - an unknown period falls back to latestPeriod;
 * - compare keeps only known region/market ids, de-duplicated, max 6.
 */
export function normalizeSelection(index: DataIndex, raw: RawSelection): DashboardSelection {
  const scope = normalizeScope(index, {
    regionId: raw.region ?? undefined,
    marketId: raw.market ?? undefined,
    productId: raw.product ?? undefined,
  });
  const period = raw.period && index.periodIndex.has(raw.period) ? raw.period : index.latestPeriod;
  const compare = Array.from(
    new Set(raw.compare.filter((id) => index.marketsById.has(id) || index.regionsById.has(id))),
  ).slice(0, 6);
  return { view: raw.view, scope, period, metric: raw.metric, compare };
}

/** Inverse of normalizeSelection for building links. Defaults are omitted. */
export function selectionToRaw(
  index: DataIndex,
  sel: Partial<DashboardSelection>,
): Partial<RawSelection> {
  const raw: Partial<RawSelection> = {};
  if (sel.view !== undefined) raw.view = sel.view;
  if (sel.scope !== undefined) {
    raw.region = sel.scope.regionId ?? null;
    raw.market = sel.scope.marketId ?? null;
    raw.product = sel.scope.productId ?? null;
  }
  if (sel.period !== undefined) raw.period = sel.period === index.latestPeriod ? null : sel.period;
  if (sel.metric !== undefined) raw.metric = sel.metric;
  if (sel.compare !== undefined) raw.compare = sel.compare;
  return raw;
}
