import { describe, expect, it } from "vitest";
import { dataIndex as index } from "@/data";
import {
  filterRows,
  kpisFromTotals,
  previousPeriod,
  ratioPct,
  scopeKpis,
  sumRows,
} from "@/domain/selectors";

describe("filterRows", () => {
  it("narrows by region, market, product and period", () => {
    expect(filterRows(index, {})).toHaveLength(1560);
    expect(filterRows(index, { regionId: "eu" })).toHaveLength(5 * 5 * 24);
    expect(filterRows(index, { marketId: "de" })).toHaveLength(5 * 24);
    expect(filterRows(index, { marketId: "de", productId: "veltrix" })).toHaveLength(24);
    expect(filterRows(index, { marketId: "de" }, "2026-05")).toHaveLength(5);
  });
});

describe("scopeKpis", () => {
  it("matches the precomputed market KPIs at latestPeriod (within rounding)", () => {
    const de = scopeKpis(index, { marketId: "de" }, "2026-05");
    expect(de.revenue).toBe(1676586);
    expect(de.growthPct).toBe(-9.7);
    // data.json says 92.0; the sum-based ratio is 92.2. Documented in README.
    expect(de.forecastAttainmentPct).toBeCloseTo(92.0, 0);
    expect(de.variance).toBeLessThan(0);

    const us = scopeKpis(index, { marketId: "us" }, "2026-05");
    expect(us.growthPct).toBe(10.0);
    expect(us.forecastAttainmentPct).toBeCloseTo(100.5, 0);
  });

  it("aggregates the portfolio from the series, not from per-market percentages", () => {
    const all = scopeKpis(index, {}, "2026-05");
    expect(all.revenue).toBe(22850419);
    expect(all.growthPct).not.toBeNull();
    expect(all.forecastAttainmentPct).not.toBeNull();
  });

  it("returns null ratios when the denominator is zero", () => {
    expect(ratioPct(5, 0)).toBeNull();
    const k = kpisFromTotals({ actual: 10, forecast: 0, priorYear: 0, units: 0 });
    expect(k.growthPct).toBeNull();
    expect(k.forecastAttainmentPct).toBeNull();
    expect(k.variancePct).toBeNull();
    expect(k.variance).toBe(10);
  });
});

describe("sumRows / previousPeriod", () => {
  it("sums an empty list to zeros", () => {
    expect(sumRows([])).toEqual({ actual: 0, forecast: 0, priorYear: 0, units: 0 });
  });
  it("walks meta.periods", () => {
    expect(previousPeriod(index, "2026-05")).toBe("2026-04");
    expect(previousPeriod(index, "2024-06")).toBeNull();
    expect(previousPeriod(index, "1999-01")).toBeNull();
  });
});
