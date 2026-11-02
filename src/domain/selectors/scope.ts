import type { DataIndex } from "../dataIndex";
import type { Level, Scope } from "../types";

/** Deepest defined id wins. */
export function levelOf(scope: Scope): Level {
  if (scope.productId) return "product";
  if (scope.marketId) return "market";
  if (scope.regionId) return "region";
  return "portfolio";
}

/**
 * Makes a scope coherent with the hierarchy:
 * - unknown ids are dropped;
 * - a market implies its region (and overrides a conflicting one);
 * - a product id is kept only if it exists.
 */
export function normalizeScope(index: DataIndex, scope: Scope): Scope {
  const out: Scope = {};
  const market = scope.marketId ? index.marketsById.get(scope.marketId) : undefined;
  if (market) {
    out.regionId = market.regionId;
    out.marketId = market.id;
  } else if (scope.regionId && index.regionsById.has(scope.regionId)) {
    out.regionId = scope.regionId;
  }
  if (scope.productId && index.productsById.has(scope.productId)) {
    out.productId = scope.productId;
  }
  return out;
}

export interface ScopeCrumb {
  level: Level;
  id?: string;
  label: string;
  scope: Scope;
}

/** Breadcrumb trail from portfolio down to the current scope. */
export function scopeBreadcrumbs(index: DataIndex, scope: Scope): ScopeCrumb[] {
  const crumbs: ScopeCrumb[] = [{ level: "portfolio", label: "Portfolio", scope: {} }];
  if (scope.regionId) {
    const region = index.regionsById.get(scope.regionId);
    if (region) {
      crumbs.push({
        level: "region",
        id: region.id,
        label: region.name,
        scope: { regionId: region.id },
      });
    }
  }
  if (scope.marketId) {
    const market = index.marketsById.get(scope.marketId);
    if (market) {
      crumbs.push({
        level: "market",
        id: market.id,
        label: market.name,
        scope: { regionId: market.regionId, marketId: market.id },
      });
    }
  }
  if (scope.productId) {
    const product = index.productsById.get(scope.productId);
    if (product) {
      crumbs.push({ level: "product", id: product.id, label: product.name, scope: { ...scope } });
    }
  }
  return crumbs;
}

/** Human label for the scope, e.g. "Germany · Veltrix" or "Portfolio". */
export function scopeLabel(index: DataIndex, scope: Scope): string {
  const parts: string[] = [];
  if (scope.marketId) parts.push(index.marketsById.get(scope.marketId)?.name ?? scope.marketId);
  else if (scope.regionId)
    parts.push(index.regionsById.get(scope.regionId)?.name ?? scope.regionId);
  else parts.push("Portfolio");
  if (scope.productId) parts.push(index.productsById.get(scope.productId)?.name ?? scope.productId);
  return parts.join(" · ");
}

/** Markets visible under a scope (all markets, a region's markets, or the one market). */
export function marketsInScope(index: DataIndex, scope: Scope) {
  if (scope.marketId) {
    const m = index.marketsById.get(scope.marketId);
    return m ? [m] : [];
  }
  if (scope.regionId) return index.marketsByRegion.get(scope.regionId) ?? [];
  return index.markets;
}
