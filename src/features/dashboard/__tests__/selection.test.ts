import { describe, expect, it } from "vitest";
import { dataIndex as index } from "@/data";
import { normalizeSelection, selectionToRaw, type RawSelection } from "../state/selection";

const base: RawSelection = {
  view: "exec",
  region: null,
  market: null,
  product: null,
  period: null,
  metric: "revenue",
  compare: [],
};

describe("normalizeSelection", () => {
  it("defaults to portfolio at latestPeriod", () => {
    expect(normalizeSelection(index, base)).toEqual({
      view: "exec",
      scope: {},
      period: "2026-05",
      metric: "revenue",
      compare: [],
    });
  });

  it("makes a market imply its region and drops conflicting or unknown ids", () => {
    const s = normalizeSelection(index, { ...base, region: "na", market: "de", product: "bogus" });
    expect(s.scope).toEqual({ regionId: "eu", marketId: "de" });
  });

  it("falls back to latestPeriod for a period outside the horizon", () => {
    expect(normalizeSelection(index, { ...base, period: "2031-01" }).period).toBe("2026-05");
    expect(normalizeSelection(index, { ...base, period: "2026-03" }).period).toBe("2026-03");
  });

  it("keeps only known compare ids, de-duplicated, capped at 6", () => {
    const s = normalizeSelection(index, {
      ...base,
      compare: ["de", "eu", "de", "nope", "cn", "us", "jp", "in", "au", "br"],
    });
    expect(s.compare).toEqual(["de", "eu", "cn", "us", "jp", "in"]);
  });
});

describe("selectionToRaw", () => {
  it("omits defaults so URLs stay short", () => {
    expect(
      selectionToRaw(index, { scope: { regionId: "eu", marketId: "de" }, period: "2026-05" }),
    ).toEqual({
      region: "eu",
      market: "de",
      product: null,
      period: null,
    });
    expect(selectionToRaw(index, { period: "2026-03", view: "analyst" })).toEqual({
      period: "2026-03",
      view: "analyst",
    });
  });

  it("round-trips through normalizeSelection", () => {
    const sel = normalizeSelection(index, {
      ...base,
      view: "analyst",
      market: "br",
      product: "calyx",
      period: "2025-01",
      metric: "growthPct",
      compare: ["br", "mx"],
    });
    const raw = { ...base, ...selectionToRaw(index, sel) };
    expect(normalizeSelection(index, raw)).toEqual(sel);
  });
});
