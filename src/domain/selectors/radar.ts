import type { DataIndex } from "../dataIndex";
import type { Period } from "../types";
import { scopeKpis } from "./aggregate";

export type RadarAxis = "revenue" | "growthPct" | "forecastAttainmentPct" | "sharePct" | "units";

export const RADAR_AXES: readonly RadarAxis[] = [
  "revenue",
  "growthPct",
  "forecastAttainmentPct",
  "sharePct",
  "units",
] as const;

/** An entity that can be compared: a region or a market id. */
export interface RadarEntity {
  id: string;
  name: string;
  kind: "region" | "market";
}

export interface RadarSeries {
  entity: RadarEntity;
  raw: Record<RadarAxis, number | null>;
  /** min-max normalised to 0..1 across the compared set; null when raw is null. */
  normalized: Record<RadarAxis, number | null>;
}

export interface RadarData {
  axes: readonly RadarAxis[];
  series: RadarSeries[];
  /** Per-axis extent used for normalisation, exposed for the UI's explanation. */
  extents: Record<RadarAxis, { min: number; max: number } | null>;
}

export function resolveRadarEntity(index: DataIndex, id: string): RadarEntity | null {
  const market = index.marketsById.get(id);
  if (market) return { id, name: market.name, kind: "market" };
  const region = index.regionsById.get(id);
  if (region) return { id, name: region.name, kind: "region" };
  return null;
}

/**
 * Compares entities across KPIs. Metrics have different units, so each axis is
 * min-max normalised over the compared set; raw values are kept for tooltips
 * and the accessible table. `sharePct` is synthetic and only defined for
 * markets, so it is null for regions.
 */
export function radarData(index: DataIndex, ids: readonly string[], period: Period): RadarData {
  const entities = ids
    .map((id) => resolveRadarEntity(index, id))
    .filter((e): e is RadarEntity => e !== null);

  const rawSeries = entities.map((entity) => {
    const scope = entity.kind === "market" ? { marketId: entity.id } : { regionId: entity.id };
    const k = scopeKpis(index, scope, period);
    const raw: Record<RadarAxis, number | null> = {
      revenue: k.revenue,
      growthPct: k.growthPct,
      forecastAttainmentPct: k.forecastAttainmentPct,
      sharePct:
        entity.kind === "market" ? (index.marketsById.get(entity.id)?.kpis.sharePct ?? null) : null,
      units: k.units,
    };
    return { entity, raw };
  });

  const extents = {} as RadarData["extents"];
  for (const axis of RADAR_AXES) {
    const values = rawSeries.map((s) => s.raw[axis]).filter((v): v is number => v !== null);
    extents[axis] =
      values.length === 0 ? null : { min: Math.min(...values), max: Math.max(...values) };
  }

  const series: RadarSeries[] = rawSeries.map(({ entity, raw }) => {
    const normalized = {} as Record<RadarAxis, number | null>;
    for (const axis of RADAR_AXES) {
      const v = raw[axis];
      const ext = extents[axis];
      if (v === null || ext === null) normalized[axis] = null;
      else if (ext.max === ext.min) normalized[axis] = 1;
      else normalized[axis] = (v - ext.min) / (ext.max - ext.min);
    }
    return { entity, raw, normalized };
  });

  return { axes: RADAR_AXES, series, extents };
}
