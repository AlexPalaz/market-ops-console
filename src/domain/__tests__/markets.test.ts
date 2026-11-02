import { describe, expect, it } from "vitest";
import { dataIndex as index } from "@/data";
import {
  anomaliesInScope,
  marketSnapshots,
  marketsAtRisk,
  metricValue,
  statusCounts,
  topMovers,
} from "@/domain/selectors";

describe("statusCounts", () => {
  it("counts statuses from data.json", () => {
    expect(statusCounts(index)).toEqual({
      on_track: 7,
      at_risk: 4,
      off_track: 2,
      needsAttention: 6,
      total: 13,
    });
    expect(statusCounts(index, { regionId: "eu" })).toMatchObject({
      off_track: 2,
      at_risk: 3,
      total: 5,
    });
  });
});

describe("topMovers", () => {
  it("ranks by YoY growth at the period", () => {
    const { gainers, decliners } = topMovers(index, {}, "2026-05", 3);
    expect(gainers[0]?.market.id).toBe("cn");
    expect(gainers[0]?.kpis.growthPct).toBe(18.2);
    expect(decliners[0]?.market.id).toBe("de");
    expect(decliners.every((s) => (s.kpis.growthPct ?? 0) < 0)).toBe(true);
  });
});

describe("marketSnapshots / metricValue", () => {
  it("exposes status and share from data.json and computed KPIs from series", () => {
    const snaps = marketSnapshots(index, { regionId: "latam" }, "2026-05");
    expect(snaps.map((s) => s.market.id)).toEqual(["br", "mx"]);
    const br = snaps[0]!;
    expect(br.status).toBe("at_risk");
    expect(metricValue(br, "sharePct")).toBe(15.0);
    expect(metricValue(br, "growthPct")).toBe(2.0);
    expect(metricValue(br, "revenue")).toBe(1115100);
  });
});

describe("anomalies / at risk", () => {
  it("finds the Germany March 2026 dip", () => {
    const hits = anomaliesInScope(index, {});
    expect(hits).toHaveLength(1);
    expect(hits[0]).toMatchObject({ period: "2026-03", type: "dip", market: { id: "de" } });
  });
  it("lists off_track before at_risk", () => {
    const risk = marketsAtRisk(index, {}, "2026-05");
    expect(risk.map((s) => s.status).slice(0, 2)).toEqual(["off_track", "off_track"]);
    expect(risk).toHaveLength(6);
  });
});
