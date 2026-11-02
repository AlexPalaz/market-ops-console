import { describe, expect, it } from "vitest";
import { dataIndex as index } from "@/data";
import { heatmapMatrix, radarData, timeSeries } from "@/domain/selectors";

describe("timeSeries", () => {
  it("returns 24 points in chronological order", () => {
    const pts = timeSeries(index, { marketId: "de" });
    expect(pts).toHaveLength(24);
    expect(pts[0]?.period).toBe("2024-06");
    expect(pts[23]?.period).toBe("2026-05");
    expect(pts[23]?.actual).toBe(1676586);
  });
  it("shows the Germany March 2026 dip", () => {
    const pts = timeSeries(index, { marketId: "de" });
    const feb = pts.find((p) => p.period === "2026-02")!;
    const mar = pts.find((p) => p.period === "2026-03")!;
    expect(mar.actual / feb.actual).toBeLessThan(0.8);
  });
});

describe("heatmapMatrix", () => {
  it("is markets x periods with a symmetric bound (YoY growth by default)", () => {
    const m = heatmapMatrix(index, {});
    expect(m.metric).toBe("growthPct");
    expect(m.rows).toHaveLength(13);
    expect(m.rows[0]?.cells).toHaveLength(24);
    expect(m.absMax).toBeGreaterThan(0);
    const de = m.rows.find((r) => r.marketId === "de")!;
    const mar = de.cells.find((c) => c.period === "2026-03")!;
    expect(mar.value).toBe(-31.0);
    expect(Math.abs(mar.value!)).toBeLessThanOrEqual(m.absMax);
  });
  it("exposes variance vs forecast, where the March re-baselined forecast hides the dip", () => {
    const m = heatmapMatrix(index, {}, "variancePct");
    const de = m.rows.find((r) => r.marketId === "de")!;
    expect(de.cells.find((c) => c.period === "2026-03")!.value).toBe(-7.8);
    expect(de.cells.find((c) => c.period === "2026-02")!.value).toBe(-8.9);
  });
  it("narrows to a region", () => {
    expect(heatmapMatrix(index, { regionId: "na" }).rows.map((r) => r.marketId)).toEqual([
      "us",
      "ca",
    ]);
  });
});

describe("radarData", () => {
  it("normalises each axis to 0..1 across the compared set", () => {
    const r = radarData(index, ["de", "cn", "us"], "2026-05");
    expect(r.series).toHaveLength(3);
    for (const s of r.series) {
      for (const axis of r.axes) {
        const v = s.normalized[axis];
        if (v !== null) {
          expect(v).toBeGreaterThanOrEqual(0);
          expect(v).toBeLessThanOrEqual(1);
        }
      }
    }
    const cn = r.series.find((s) => s.entity.id === "cn")!;
    expect(cn.normalized.revenue).toBe(1);
    expect(cn.normalized.growthPct).toBe(1);
  });
  it("leaves sharePct null for regions and ignores unknown ids", () => {
    const r = radarData(index, ["eu", "apac", "nope"], "2026-05");
    expect(r.series).toHaveLength(2);
    expect(r.series[0]?.raw.sharePct).toBeNull();
    expect(r.extents.sharePct).toBeNull();
  });
});
