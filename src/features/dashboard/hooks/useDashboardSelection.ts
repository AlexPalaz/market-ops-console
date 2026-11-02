"use client";

import { useCallback, useMemo } from "react";
import { useQueryStates } from "nuqs";
import { useData } from "@/data/DataProvider";
import type { MetricKey, Period, Scope, ViewMode } from "@/domain/types";
import {
  normalizeSelection,
  selectionParsers,
  selectionToRaw,
  type DashboardSelection,
} from "../state/selection";

export interface DashboardSelectionApi {
  selection: DashboardSelection;
  /** Drill to a scope (push: back/forward restores the previous level). */
  goTo: (scope: Scope) => void;
  selectRegion: (regionId: string | null) => void;
  selectMarket: (marketId: string | null) => void;
  selectProduct: (productId: string | null) => void;
  setPeriod: (period: Period) => void;
  setMetric: (metric: MetricKey) => void;
  setView: (view: ViewMode) => void;
  setCompare: (ids: string[]) => void;
  toggleCompare: (id: string) => void;
  reset: () => void;
}

/**
 * The one selection model for the whole dashboard. Reads and writes the URL
 * through nuqs; every consumer sees the same normalised selection.
 *
 * Navigation (scope, period) uses `history: "push"` so the browser's back
 * button walks back up the drill path. Presentation choices (view, metric,
 * compare) use `replace` to keep history meaningful.
 */
export function useDashboardSelection(): DashboardSelectionApi {
  const index = useData();
  const [raw, setRaw] = useQueryStates(selectionParsers);

  const selection = useMemo(() => normalizeSelection(index, raw), [index, raw]);

  const push = useCallback(
    (partial: Partial<DashboardSelection>) =>
      setRaw(selectionToRaw(index, partial), { history: "push", scroll: false }),
    [index, setRaw],
  );
  const replace = useCallback(
    (partial: Partial<DashboardSelection>) =>
      setRaw(selectionToRaw(index, partial), { history: "replace", scroll: false }),
    [index, setRaw],
  );

  const goTo = useCallback((scope: Scope) => push({ scope }), [push]);

  const selectRegion = useCallback(
    (regionId: string | null) =>
      push({ scope: { regionId: regionId ?? undefined, productId: selection.scope.productId } }),
    [push, selection.scope.productId],
  );

  const selectMarket = useCallback(
    (marketId: string | null) => {
      if (marketId === null) {
        push({
          scope: { regionId: selection.scope.regionId, productId: selection.scope.productId },
        });
        return;
      }
      const market = index.marketsById.get(marketId);
      push({
        scope: {
          regionId: market?.regionId ?? selection.scope.regionId,
          marketId,
          productId: selection.scope.productId,
        },
      });
    },
    [index, push, selection.scope.productId, selection.scope.regionId],
  );

  const selectProduct = useCallback(
    (productId: string | null) =>
      push({ scope: { ...selection.scope, productId: productId ?? undefined } }),
    [push, selection.scope],
  );

  const setPeriod = useCallback((period: Period) => push({ period }), [push]);
  const setMetric = useCallback((metric: MetricKey) => replace({ metric }), [replace]);
  const setView = useCallback((view: ViewMode) => replace({ view }), [replace]);
  const setCompare = useCallback((ids: string[]) => replace({ compare: ids }), [replace]);
  const toggleCompare = useCallback(
    (id: string) => {
      const has = selection.compare.includes(id);
      replace({
        compare: has ? selection.compare.filter((x) => x !== id) : [...selection.compare, id],
      });
    },
    [replace, selection.compare],
  );
  const reset = useCallback(
    () => push({ scope: {}, period: index.latestPeriod, compare: [] }),
    [index.latestPeriod, push],
  );

  return {
    selection,
    goTo,
    selectRegion,
    selectMarket,
    selectProduct,
    setPeriod,
    setMetric,
    setView,
    setCompare,
    toggleCompare,
    reset,
  };
}
