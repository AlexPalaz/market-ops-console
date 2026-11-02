import { describe, expect, it } from "vitest";
import { dataIndex as index, fixtures } from "@/data";
import { resolveCitation } from "@/domain/selectors";

describe("resolveCitation", () => {
  it("resolves every citation in fixtures.json against data.json", () => {
    const all = [fixtures.default, ...fixtures.fixtures].flatMap((f) => f.answer.citations);
    expect(all.length).toBeGreaterThan(10);
    for (const c of all) {
      const r = resolveCitation(index, c);
      expect(r.unresolved, JSON.stringify(c)).toEqual([]);
    }
  });

  it("maps a market citation to its region and the cited period", () => {
    const r = resolveCitation(index, {
      marketId: "de",
      period: "2026-03",
      label: "Germany, March dip",
    });
    expect(r.scope).toEqual({ regionId: "eu", marketId: "de" });
    expect(r.period).toBe("2026-03");
    expect(r.label).toBe("Germany, March dip");
    expect(r.kpis.variancePct).toBeLessThan(0);
  });

  it("reports unknown ids instead of inventing them", () => {
    const r = resolveCitation(index, { marketId: "zz", period: "2031-01" });
    expect(r.unresolved).toEqual(["market:zz", "period:2031-01"]);
    expect(r.scope).toEqual({});
    expect(r.period).toBe("2026-05");
    expect(r.label).toBe("Portfolio");
  });
});
