import { describe, expect, it } from "vitest";
import { dataset, fixtures, dataIndex } from "@/data";
import { streamEventSchema, periodSchema } from "@/domain/schemas";

describe("dataset schema", () => {
  it("validates the starter pack data.json", () => {
    expect(dataset.regions).toHaveLength(4);
    expect(dataset.products).toHaveLength(5);
    expect(dataset.markets).toHaveLength(13);
    expect(dataset.series).toHaveLength(13 * 5 * 24);
    expect(dataset.meta.latestPeriod).toBe("2026-05");
  });

  it("validates the starter pack fixtures.json", () => {
    expect(fixtures.fixtures.map((f) => f.id)).toEqual([
      "at-risk",
      "germany-dip",
      "apac-vs-europe",
      "forecast-miss",
      "next-year",
      "summary-long",
      "error",
    ]);
    expect(fixtures.default.kind).toBe("low_confidence");
  });

  it("builds an index with every market reachable by id and region", () => {
    expect(dataIndex.marketsById.get("de")?.regionId).toBe("eu");
    expect(dataIndex.marketsByRegion.get("eu")?.map((m) => m.id)).toEqual([
      "de",
      "gb",
      "fr",
      "it",
      "es",
    ]);
    expect(dataIndex.rowsByMarket.get("de")).toHaveLength(5 * 24);
    expect(dataIndex.periodIndex.get("2024-06")).toBe(0);
  });
});

describe("period schema", () => {
  it("accepts YYYY-MM and rejects anything else", () => {
    expect(periodSchema.safeParse("2026-03").success).toBe(true);
    expect(periodSchema.safeParse("2026-13").success).toBe(false);
    expect(periodSchema.safeParse("2026-3").success).toBe(false);
    expect(periodSchema.safeParse("03-2026").success).toBe(false);
  });
});

describe("stream event schema (CONTRACT.md)", () => {
  it("parses token, done and error events", () => {
    expect(streamEventSchema.parse({ type: "token", value: "Three " })).toEqual({
      type: "token",
      value: "Three ",
    });
    expect(
      streamEventSchema.parse({
        type: "done",
        kind: "normal",
        citations: [{ marketId: "de", period: "2026-03", label: "Germany, March dip" }],
        confidence: "high",
      }).type,
    ).toBe("done");
    expect(streamEventSchema.parse({ type: "error", message: "boom" }).type).toBe("error");
  });

  it("rejects unknown event types and malformed payloads", () => {
    expect(streamEventSchema.safeParse({ type: "chunk", value: "x" }).success).toBe(false);
    expect(
      streamEventSchema.safeParse({
        type: "done",
        kind: "maybe",
        citations: [],
        confidence: "high",
      }).success,
    ).toBe(false);
    expect(streamEventSchema.safeParse({ type: "token" }).success).toBe(false);
  });
});
