import type { Dataset, Market, Period, Product, Region, SeriesRow } from "./types";

/**
 * Read-optimised view of the dataset. Built once; every selector takes it as
 * its first argument so the domain layer stays pure and testable.
 */
export interface DataIndex {
  dataset: Dataset;
  meta: Dataset["meta"];
  periods: readonly Period[];
  latestPeriod: Period;
  periodIndex: ReadonlyMap<Period, number>;
  regions: readonly Region[];
  products: readonly Product[];
  markets: readonly Market[];
  regionsById: ReadonlyMap<string, Region>;
  productsById: ReadonlyMap<string, Product>;
  marketsById: ReadonlyMap<string, Market>;
  marketsByRegion: ReadonlyMap<string, readonly Market[]>;
  rows: readonly SeriesRow[];
  rowsByMarket: ReadonlyMap<string, readonly SeriesRow[]>;
}

export class DataIntegrityError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DataIntegrityError";
  }
}

/** Builds the index and checks referential integrity of ids and periods. */
export function createDataIndex(dataset: Dataset): DataIndex {
  const regionsById = new Map(dataset.regions.map((r) => [r.id, r]));
  const productsById = new Map(dataset.products.map((p) => [p.id, p]));
  const marketsById = new Map(dataset.markets.map((m) => [m.id, m]));
  const periodIndex = new Map(dataset.meta.periods.map((p, i) => [p, i]));

  if (!periodIndex.has(dataset.meta.latestPeriod)) {
    throw new DataIntegrityError(
      `latestPeriod ${dataset.meta.latestPeriod} is not in meta.periods`,
    );
  }

  const marketsByRegion = new Map<string, Market[]>();
  for (const market of dataset.markets) {
    if (!regionsById.has(market.regionId)) {
      throw new DataIntegrityError(
        `Market ${market.id} references unknown region ${market.regionId}`,
      );
    }
    const list = marketsByRegion.get(market.regionId) ?? [];
    list.push(market);
    marketsByRegion.set(market.regionId, list);
  }

  const rowsByMarket = new Map<string, SeriesRow[]>();
  for (const row of dataset.series) {
    if (!marketsById.has(row.marketId)) {
      throw new DataIntegrityError(`Series row references unknown market ${row.marketId}`);
    }
    if (!productsById.has(row.productId)) {
      throw new DataIntegrityError(`Series row references unknown product ${row.productId}`);
    }
    if (!periodIndex.has(row.period)) {
      throw new DataIntegrityError(`Series row references unknown period ${row.period}`);
    }
    const list = rowsByMarket.get(row.marketId) ?? [];
    list.push(row);
    rowsByMarket.set(row.marketId, list);
  }

  return {
    dataset,
    meta: dataset.meta,
    periods: dataset.meta.periods,
    latestPeriod: dataset.meta.latestPeriod,
    periodIndex,
    regions: dataset.regions,
    products: dataset.products,
    markets: dataset.markets,
    regionsById,
    productsById,
    marketsById,
    marketsByRegion,
    rows: dataset.series,
    rowsByMarket,
  };
}
