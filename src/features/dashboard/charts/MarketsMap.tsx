"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { ChartFrame } from "@/components/shared/ChartFrame";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useData } from "@/data/DataProvider";
import { formatCurrency, formatPercent, formatPeriod } from "@/domain/format";
import { marketSnapshots, metricValue, type MarketSnapshot } from "@/domain/selectors";
import type { MetricKey, Period, Scope } from "@/domain/types";
import { ISO_NUMERIC_TO_ALPHA3 } from "@/lib/iso";
import { makeColorScale, METRICS } from "@/lib/metrics";
import { MetricSelect } from "../components/MetricSelect";

const W = 960;
const H = 470;

type CountryFeature = Feature<Geometry, { name: string }> & { id: string | number };

interface MapGeometry {
  features: CountryFeature[];
  path: (f: CountryFeature) => string;
}

/** Loads and projects the 110m world topology once per page. */
function useWorldGeometry(): MapGeometry | null {
  const [geo, setGeo] = useState<MapGeometry | null>(null);
  useEffect(() => {
    let cancelled = false;
    import("world-atlas/countries-110m.json").then((mod) => {
      if (cancelled) return;
      const topo = mod.default as unknown as Topology<{
        countries: GeometryCollection<{ name: string }>;
      }>;
      const fc = feature(topo, topo.objects.countries) as FeatureCollection<
        Geometry,
        { name: string }
      >;
      const features = fc.features as CountryFeature[];
      const projection = geoNaturalEarth1().fitExtent(
        [
          [8, 8],
          [W - 8, H - 8],
        ],
        fc,
      );
      const pathGen = geoPath(projection);
      setGeo({ features, path: (f) => pathGen(f) ?? "" });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return geo;
}

/**
 * Choropleth of the markets coloured by the selected KPI. Market countries are
 * keyboard-focusable buttons; the rest of the world is drawn as "no data".
 * Status is encoded with stroke style and is spelled out in the label and the
 * table, so colour is never the only signal.
 */
export function MarketsMap({
  scope,
  period,
  metric,
  onMetricChange,
  onSelectMarket,
}: {
  scope: Scope;
  period: Period;
  metric: MetricKey;
  onMetricChange: (m: MetricKey) => void;
  onSelectMarket: (id: string) => void;
}) {
  const index = useData();
  const geo = useWorldGeometry();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const titleId = useId();

  // Colour every market in the region (or all) so the map keeps context
  // while the dashboard is drilled into one market.
  const snapshots = useMemo(
    () => marketSnapshots(index, { regionId: scope.regionId, productId: scope.productId }, period),
    [index, scope.regionId, scope.productId, period],
  );
  const meta = METRICS[metric];
  const effectiveMetric = meta.marketOnly && scope.productId ? METRICS.revenue : meta;
  const byIso3 = useMemo(() => new Map(snapshots.map((s) => [s.market.iso3, s])), [snapshots]);
  const scale = useMemo(
    () =>
      makeColorScale(
        snapshots.map((s) => metricValue(s, effectiveMetric.key)),
        effectiveMetric,
      ),
    [snapshots, effectiveMetric],
  );

  const detail: MarketSnapshot | undefined =
    (hoverId ? snapshots.find((s) => s.market.id === hoverId) : undefined) ??
    (scope.marketId ? snapshots.find((s) => s.market.id === scope.marketId) : undefined);

  const onKey = (e: KeyboardEvent<SVGPathElement>, id: string) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSelectMarket(id);
    }
  };

  const ranked = [...snapshots].sort(
    (a, b) =>
      (metricValue(b, effectiveMetric.key) ?? -Infinity) -
      (metricValue(a, effectiveMetric.key) ?? -Infinity),
  );
  const summary = ranked.length
    ? `${effectiveMetric.label} by market for ${formatPeriod(period)}. Highest: ${ranked[0]!.market.name} at ${effectiveMetric.format(metricValue(ranked[0]!, effectiveMetric.key))}. Lowest: ${ranked[ranked.length - 1]!.market.name} at ${effectiveMetric.format(metricValue(ranked[ranked.length - 1]!, effectiveMetric.key))}.`
    : undefined;

  return (
    <ChartFrame
      title="Markets map"
      description={`Countries coloured by ${effectiveMetric.label.toLowerCase()} for ${formatPeriod(period)}. Click a market to drill in.`}
      summary={summary}
      minHeight={420}
      actions={<MetricSelect value={metric} onChange={onMetricChange} />}
      table={
        <MapTable
          snapshots={ranked}
          metric={effectiveMetric.key}
          period={period}
          onSelectMarket={onSelectMarket}
        />
      }
    >
      {geo === null ? (
        <Skeleton className="h-[360px] w-full" role="status" aria-label="Loading map" />
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="bg-map-ocean h-auto w-full rounded-lg"
          role="group"
          aria-labelledby={titleId}
          onMouseLeave={() => setHoverId(null)}
        >
          <title
            id={titleId}
          >{`World map of markets coloured by ${effectiveMetric.label.toLowerCase()}`}</title>
          {/* Non-market countries first so market strokes draw on top. */}
          {geo.features.map((f, i) => {
            const iso3 = ISO_NUMERIC_TO_ALPHA3[String(f.id).padStart(3, "0")];
            const snap = iso3 ? byIso3.get(iso3) : undefined;
            if (snap) return null;
            return (
              <path
                key={f.id ?? `f-${i}`}
                d={geo.path(f)}
                fill="var(--map-land)"
                stroke="var(--map-land-stroke)"
                strokeWidth={0.6}
                aria-hidden
              />
            );
          })}
          {geo.features.map((f) => {
            const iso3 = ISO_NUMERIC_TO_ALPHA3[String(f.id).padStart(3, "0")];
            const snap = iso3 ? byIso3.get(iso3) : undefined;
            if (!snap) return null;
            const id = snap.market.id;
            const selected = id === scope.marketId;
            const hovered = id === hoverId;
            const value = metricValue(snap, effectiveMetric.key);
            const dimmed = scope.marketId !== undefined && !selected && !hovered;
            const dash =
              snap.status === "off_track" ? "1 0" : snap.status === "at_risk" ? "4 3" : undefined;
            return (
              <path
                key={id}
                d={geo.path(f)}
                role="button"
                tabIndex={0}
                aria-label={`${snap.market.name}, ${effectiveMetric.label.toLowerCase()} ${effectiveMetric.format(value)}, ${snap.status.replace("_", " ")}`}
                aria-pressed={selected}
                fill={scale.color(value)}
                fillOpacity={dimmed ? 0.55 : 1}
                stroke={
                  selected || hovered
                    ? "var(--foreground)"
                    : snap.status === "on_track"
                      ? "var(--background)"
                      : "var(--status-off-track)"
                }
                strokeWidth={
                  selected ? 2.5 : hovered ? 2 : snap.status === "on_track" ? 0.75 : 1.75
                }
                strokeDasharray={selected || hovered ? undefined : dash}
                strokeLinejoin="round"
                className="focus-visible:stroke-ring cursor-pointer transition-[fill-opacity] outline-none focus-visible:stroke-[3px]"
                onMouseEnter={() => setHoverId(id)}
                onFocus={() => setHoverId(id)}
                onBlur={() => setHoverId(null)}
                onClick={() => onSelectMarket(id)}
                onKeyDown={(e) => onKey(e, id)}
              />
            );
          })}
        </svg>
      )}

      <div className="mt-2 flex flex-wrap items-start justify-between gap-3 text-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">{effectiveMetric.format(scale.min)}</span>
            <span
              className="h-2.5 w-32 rounded-sm border"
              style={{ background: scale.gradient }}
              aria-hidden
            />
            <span className="text-muted-foreground">{effectiveMetric.format(scale.max)}</span>
          </div>
          <div className="text-muted-foreground flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <svg width="18" height="8" aria-hidden>
                <line
                  x1="0"
                  y1="4"
                  x2="18"
                  y2="4"
                  stroke="var(--status-off-track)"
                  strokeWidth="2"
                />
              </svg>
              off track
            </span>
            <span className="inline-flex items-center gap-1">
              <svg width="18" height="8" aria-hidden>
                <line
                  x1="0"
                  y1="4"
                  x2="18"
                  y2="4"
                  stroke="var(--status-off-track)"
                  strokeWidth="2"
                  strokeDasharray="4 3"
                />
              </svg>
              at risk
            </span>
            <span className="inline-flex items-center gap-1">
              <span
                className="inline-block size-3 rounded-sm border"
                style={{ background: "var(--map-land)" }}
                aria-hidden
              />
              not a market
            </span>
          </div>
        </div>
        <div
          className="bg-card min-h-10 min-w-[14rem] rounded-lg border px-3 py-1.5 shadow-sm"
          aria-live="polite"
        >
          {detail ? (
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="font-medium">
                  {detail.market.name}{" "}
                  <span className="text-muted-foreground font-normal">· {detail.regionName}</span>
                </p>
                <p className="text-muted-foreground">
                  {formatCurrency(detail.kpis.revenue)} ·{" "}
                  {formatPercent(detail.kpis.growthPct, { signed: true })} YoY ·{" "}
                  {formatPercent(detail.kpis.forecastAttainmentPct)} of forecast
                </p>
              </div>
              <StatusBadge status={detail.status} />
            </div>
          ) : (
            <p className="text-muted-foreground">Hover or focus a market for details</p>
          )}
        </div>
      </div>
      {effectiveMetric.key !== metric ? (
        <p className="text-muted-foreground mt-1 text-xs">
          Market share is not defined per product; showing revenue instead.
        </p>
      ) : null}
    </ChartFrame>
  );
}

function MapTable({
  snapshots,
  metric,
  period,
  onSelectMarket,
}: {
  snapshots: MarketSnapshot[];
  metric: MetricKey;
  period: Period;
  onSelectMarket: (id: string) => void;
}) {
  const meta = METRICS[metric];
  return (
    <Table>
      <TableCaption>
        Markets ranked by {meta.label.toLowerCase()} for {formatPeriod(period)}, with status.
      </TableCaption>
      <TableHeader>
        <TableRow>
          <TableHead>Market</TableHead>
          <TableHead>Region</TableHead>
          <TableHead className="text-right">{meta.shortLabel}</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {snapshots.map((s) => (
          <TableRow key={s.market.id}>
            <TableCell>
              <button
                type="button"
                className="font-medium underline-offset-2 hover:underline"
                onClick={() => onSelectMarket(s.market.id)}
              >
                {s.market.name}
              </button>
            </TableCell>
            <TableCell>{s.regionName}</TableCell>
            <TableCell className="text-right">{meta.format(metricValue(s, metric))}</TableCell>
            <TableCell>
              <StatusBadge status={s.status} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
