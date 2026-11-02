import type { DataIndex } from "../dataIndex";
import type { Period } from "../types";
import { marketSnapshots, type MarketSnapshot } from "./markets";

/** Minimal alert shape the domain needs; the feature's Zod type satisfies it. */
export interface AlertRule {
  id: string;
  name: string;
  scope: "portfolio" | "region" | "market";
  targetId?: string;
  growthBelowPct?: number;
  attainmentBelowPct?: number;
  severity: "info" | "warning" | "critical";
  enabled: boolean;
}

export interface AlertHit {
  alert: AlertRule;
  snapshot: MarketSnapshot;
  reasons: string[];
}

/**
 * Evaluates enabled alerts against the dataset at `period`. A market is hit
 * when any configured threshold is breached. Returns hits grouped by market
 * and by alert so both the table badges and the alert list can use them.
 */
export function evaluateAlerts(
  index: DataIndex,
  alerts: readonly AlertRule[],
  period: Period,
): { byMarket: Map<string, AlertHit[]>; byAlert: Map<string, AlertHit[]> } {
  const byMarket = new Map<string, AlertHit[]>();
  const byAlert = new Map<string, AlertHit[]>();
  const all = marketSnapshots(index, {}, period);

  for (const alert of alerts) {
    if (!alert.enabled) continue;
    const scoped =
      alert.scope === "market"
        ? all.filter((s) => s.market.id === alert.targetId)
        : alert.scope === "region"
          ? all.filter((s) => s.market.regionId === alert.targetId)
          : all;

    for (const snapshot of scoped) {
      const reasons: string[] = [];
      const g = snapshot.kpis.growthPct;
      const a = snapshot.kpis.forecastAttainmentPct;
      if (alert.growthBelowPct !== undefined && g !== null && g < alert.growthBelowPct) {
        reasons.push(`growth ${g.toFixed(1)}% is below ${alert.growthBelowPct}%`);
      }
      if (alert.attainmentBelowPct !== undefined && a !== null && a < alert.attainmentBelowPct) {
        reasons.push(`attainment ${a.toFixed(1)}% is below ${alert.attainmentBelowPct}%`);
      }
      if (!reasons.length) continue;
      const hit: AlertHit = { alert, snapshot, reasons };
      byMarket.set(snapshot.market.id, [...(byMarket.get(snapshot.market.id) ?? []), hit]);
      byAlert.set(alert.id, [...(byAlert.get(alert.id) ?? []), hit]);
    }
  }
  return { byMarket, byAlert };
}
