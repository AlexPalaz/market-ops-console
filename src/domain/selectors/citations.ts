import type { DataIndex } from "../dataIndex";
import type { Citation, ComputedKpis, Period, Scope } from "../types";
import { scopeKpis } from "./aggregate";
import { scopeLabel } from "./scope";

export interface ResolvedCitation {
  citation: Citation;
  /** Scope the dashboard should focus on when the citation is followed. */
  scope: Scope;
  /** Period the dashboard should select; defaults to latestPeriod. */
  period: Period;
  /** Label from the fixture if present, else derived from the dataset. */
  label: string;
  /** Verified metrics read from the dataset for the cited scope and period. */
  kpis: ComputedKpis;
  /** Ids that did not resolve against the dataset, if any. */
  unresolved: string[];
}

/**
 * Maps a citation from the stream onto the dataset. Unknown ids are reported
 * rather than silently dropped so the UI can flag an evidence gap.
 */
export function resolveCitation(index: DataIndex, citation: Citation): ResolvedCitation {
  const unresolved: string[] = [];
  const scope: Scope = {};

  if (citation.marketId) {
    const m = index.marketsById.get(citation.marketId);
    if (m) {
      scope.marketId = m.id;
      scope.regionId = m.regionId;
    } else unresolved.push(`market:${citation.marketId}`);
  }
  if (citation.regionId && !scope.regionId) {
    if (index.regionsById.has(citation.regionId)) scope.regionId = citation.regionId;
    else unresolved.push(`region:${citation.regionId}`);
  }
  if (citation.productId) {
    if (index.productsById.has(citation.productId)) scope.productId = citation.productId;
    else unresolved.push(`product:${citation.productId}`);
  }

  let period: Period = index.latestPeriod;
  if (citation.period) {
    if (index.periodIndex.has(citation.period)) period = citation.period;
    else unresolved.push(`period:${citation.period}`);
  }

  return {
    citation,
    scope,
    period,
    label: citation.label ?? scopeLabel(index, scope),
    kpis: scopeKpis(index, scope, period),
    unresolved,
  };
}
