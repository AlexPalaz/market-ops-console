import { describe, expect, it } from "vitest";
import { dataIndex as index } from "@/data";
import { evaluateAlerts, type AlertRule } from "@/domain/selectors";
import { alertInputSchema } from "../schemas/alertSchema";

const base = {
  name: "Rule",
  scope: "portfolio" as const,
  severity: "warning" as const,
  enabled: true,
};

describe("alertInputSchema", () => {
  it("accepts a valid alert and coerces numeric strings from inputs", () => {
    const r = alertInputSchema.safeParse({ ...base, growthBelowPct: "0", attainmentBelowPct: "" });
    expect(r.success).toBe(true);
    if (r.success) {
      expect(r.data.growthBelowPct).toBe(0);
      expect(r.data.attainmentBelowPct).toBeUndefined();
    }
  });

  it("requires at least one threshold", () => {
    const r = alertInputSchema.safeParse({ ...base });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues[0]?.path).toEqual(["growthBelowPct"]);
  });

  it("requires a target for region and market scopes", () => {
    const r = alertInputSchema.safeParse({ ...base, scope: "market", growthBelowPct: 0 });
    expect(r.success).toBe(false);
    if (!r.success) expect(r.error.issues.map((i) => String(i.path[0]))).toContain("targetId");
  });

  it("bounds thresholds and name length", () => {
    expect(alertInputSchema.safeParse({ ...base, growthBelowPct: 500 }).success).toBe(false);
    expect(alertInputSchema.safeParse({ ...base, name: "ab", growthBelowPct: 0 }).success).toBe(
      false,
    );
    expect(alertInputSchema.safeParse({ ...base, growthBelowPct: "abc" }).success).toBe(false);
  });
});

describe("evaluateAlerts", () => {
  const shrinking: AlertRule = { id: "a1", ...base, growthBelowPct: 0 };
  const euPlan: AlertRule = {
    id: "a2",
    ...base,
    scope: "region",
    targetId: "eu",
    attainmentBelowPct: 95,
  };

  it("flags markets breaching a portfolio-wide growth threshold", () => {
    const { byMarket, byAlert } = evaluateAlerts(index, [shrinking], "2026-05");
    expect([...byMarket.keys()].sort()).toEqual(["de", "es"]);
    expect(byAlert.get("a1")).toHaveLength(2);
    expect(byMarket.get("de")?.[0]?.reasons[0]).toContain("growth -9.7% is below 0%");
  });

  it("scopes a region rule to that region", () => {
    const { byMarket } = evaluateAlerts(index, [euPlan], "2026-05");
    expect([...byMarket.keys()].sort()).toEqual(["de", "gb", "it"]);
  });

  it("ignores disabled rules and merges hits per market", () => {
    const { byMarket } = evaluateAlerts(
      index,
      [shrinking, euPlan, { ...euPlan, id: "off", enabled: false }],
      "2026-05",
    );
    expect(byMarket.get("de")).toHaveLength(2);
    expect(byMarket.get("es")).toHaveLength(1);
  });

  it("evaluates at the selected period", () => {
    const { byMarket } = evaluateAlerts(index, [shrinking], "2026-03");
    expect(byMarket.has("de")).toBe(true);
  });
});
