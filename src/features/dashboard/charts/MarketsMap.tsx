"use client";

import { useEffect, useId, useMemo, useState, type KeyboardEvent } from "react";
import { geoGraticule10, geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { Topology, GeometryCollection } from "topojson-specification";
import type { Feature, FeatureCollection, Geometry } from "geojson";
import { Section } from "@/components/shared/Section";
import { StatusMark } from "@/components/shared/StatusMark";
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
import { marketSnapshots, metricValue, regionOf, type MarketSnapshot } from "@/domain/selectors";
import type { MetricKey, Period, Scope } from "@/domain/types";
import { usePrefersReducedMotion } from "@/hooks/usePrefersReducedMotion";
import { ISO_NUMERIC_TO_ALPHA3 } from "@/lib/iso";
import { makeColorScale, METRICS } from "@/lib/metrics";
import { cn } from "@/lib/utils";
import { MetricSelect } from "../components/MetricSelect";
import { RampLegend } from "./theme";

const W = 960;
const H = 470;
const MAX_ZOOM = 5;

type CountryFeature = Feature<Geometry, { name: string }> & { id?: string | number };

interface MapGeometry {
  features: CountryFeature[];
  path: (f: Feature<Geometry> | { type: "Sphere" }) => string;
  centroid: (f: CountryFeature) => [number, number];
  bounds: (fc: FeatureCollection) => [[number, number], [number, number]];
  graticule: string;
  sphere: string;
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
      const projection = geoNaturalEarth1().fitExtent(
        [
          [6, 6],
          [W - 6, H - 6],
        ],
        { type: "Sphere" },
      );
      const pathGen = geoPath(projection);
      setGeo({
        features: fc.features as CountryFeature[],
        path: (f) => pathGen(f as never) ?? "",
        centroid: (f) => pathGen.centroid(f) as [number, number],
        bounds: (c) => pathGen.bounds(c) as [[number, number], [number, number]],
        graticule: pathGen(geoGraticule10()) ?? "",
        sphere: pathGen({ type: "Sphere" }) ?? "",
      });
    });
    return () => {
      cancelled = true;
    };
  }, []);
  return geo;
}

/** Zoom transform that frames the given features, capped so small countries stay legible. */
function frame(
  geo: MapGeometry,
  features: CountryFeature[],
): { k: number; tx: number; ty: number } {
  if (!features.length) return { k: 1, tx: 0, ty: 0 };
  const [[x0, y0], [x1, y1]] = geo.bounds({ type: "FeatureCollection", features });
  const dx = Math.max(x1 - x0, 1);
  const dy = Math.max(y1 - y0, 1);
  const k = Math.min(MAX_ZOOM, 0.75 / Math.max(dx / W, dy / H));
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  return { k, tx: W / 2 - k * cx, ty: H / 2 - k * cy };
}

/**
 * Choropleth of the markets coloured by the selected KPI, on a Natural Earth
 * projection with a faint graticule. The view frames the selected region or
 * market; the selected market gets a signal outline and a callout. Countries
 * that are markets are keyboard-focusable buttons; status is encoded by the
 * stroke and spelled out in the label and the table.
 */
export function MarketsMap({
  scope,
  period,
  metric,
  onMetricChange,
  onSelectMarket,
  index: sectionIndex,
}: {
  scope: Scope;
  period: Period;
  metric: MetricKey;
  onMetricChange: (m: MetricKey) => void;
  onSelectMarket: (id: string) => void;
  index?: string;
}) {
  const index = useData();
  const geo = useWorldGeometry();
  const reduceMotion = usePrefersReducedMotion();
  const [hoverId, setHoverId] = useState<string | null>(null);
  const titleId = useId();

  const regionId = regionOf(index, scope);
  const snapshots = useMemo(
    () => marketSnapshots(index, { regionId, productId: scope.productId }, period),
    [index, regionId, scope.productId, period],
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

  // Features split once per geometry load: markets in scope, other markets, everything else.
  const classified = useMemo(() => {
    if (!geo) return null;
    const inScope: { f: CountryFeature; snap: MarketSnapshot }[] = [];
    const rest: CountryFeature[] = [];
    for (const f of geo.features) {
      const iso3 = ISO_NUMERIC_TO_ALPHA3[String(f.id ?? "").padStart(3, "0")];
      const snap = iso3 ? byIso3.get(iso3) : undefined;
      if (snap) inScope.push({ f, snap });
      else rest.push(f);
    }
    return { inScope, rest };
  }, [geo, byIso3]);

  const view = useMemo(() => {
    if (!geo || !classified) return { k: 1, tx: 0, ty: 0 };
    if (scope.marketId) {
      const one = classified.inScope
        .filter((x) => x.snap.market.id === scope.marketId)
        .map((x) => x.f);
      return frame(geo, one);
    }
    if (regionId)
      return frame(
        geo,
        classified.inScope.map((x) => x.f),
      );
    return { k: 1, tx: 0, ty: 0 };
  }, [geo, classified, scope.marketId, regionId]);

  const detail: MarketSnapshot | undefined =
    (hoverId ? snapshots.find((s) => s.market.id === hoverId) : undefined) ??
    (scope.marketId ? snapshots.find((s) => s.market.id === scope.marketId) : undefined);

  const selected = classified?.inScope.find((x) => x.snap.market.id === scope.marketId);
  const callout = selected && geo ? geo.centroid(selected.f) : null;

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

  const transition = reduceMotion ? undefined : "transform 420ms cubic-bezier(0.2, 0.7, 0.2, 1)";

  return (
    <Section
      title="Markets map"
      index={sectionIndex}
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
      {geo === null || classified === null ? (
        <Skeleton className="aspect-[960/470] w-full" role="status" aria-label="Loading map" />
      ) : (
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="h-auto w-full overflow-hidden"
          role="group"
          aria-labelledby={titleId}
          onMouseLeave={() => setHoverId(null)}
        >
          <title
            id={titleId}
          >{`World map of markets coloured by ${effectiveMetric.label.toLowerCase()}`}</title>
          <g
            transform={`translate(${view.tx} ${view.ty}) scale(${view.k})`}
            style={{ transition, transformOrigin: "0 0" }}
          >
            <path
              d={geo.sphere}
              fill="var(--map-ocean)"
              stroke="var(--rule)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
            <path
              d={geo.graticule}
              fill="none"
              stroke="var(--rule)"
              strokeOpacity={0.55}
              strokeWidth={0.5}
              vectorEffect="non-scaling-stroke"
            />
            {classified.rest.map((f, i) => (
              <path
                key={f.id ?? `f-${i}`}
                d={geo.path(f)}
                fill="var(--map-land)"
                stroke="var(--map-land-stroke)"
                strokeWidth={0.6}
                vectorEffect="non-scaling-stroke"
                aria-hidden
              />
            ))}
            {classified.inScope.map(({ f, snap }) => {
              const id = snap.market.id;
              const isSelected = id === scope.marketId;
              const hovered = id === hoverId;
              const value = metricValue(snap, effectiveMetric.key);
              const dimmed = scope.marketId !== undefined && !isSelected && !hovered;
              const statusStroke =
                snap.status === "on_track" ? "var(--map-land-stroke)" : "var(--status-off-track)";
              const dash = snap.status === "at_risk" ? "4 3" : undefined;
              return (
                <path
                  key={id}
                  d={geo.path(f)}
                  role="button"
                  tabIndex={0}
                  aria-label={`${snap.market.name}, ${effectiveMetric.label.toLowerCase()} ${effectiveMetric.format(value)}, ${snap.status.replace("_", " ")}`}
                  aria-pressed={isSelected}
                  fill={scale.color(value)}
                  fillOpacity={dimmed ? 0.45 : 1}
                  stroke={isSelected ? "var(--signal)" : hovered ? "var(--ink)" : statusStroke}
                  strokeWidth={
                    isSelected ? 2.25 : hovered ? 1.5 : snap.status === "on_track" ? 0.6 : 1.5
                  }
                  strokeDasharray={isSelected || hovered ? undefined : dash}
                  strokeLinejoin="round"
                  vectorEffect="non-scaling-stroke"
                  className="focus-visible:stroke-signal cursor-pointer transition-[fill-opacity] duration-150 outline-none focus-visible:stroke-[3px]"
                  onMouseEnter={() => setHoverId(id)}
                  onFocus={() => setHoverId(id)}
                  onBlur={() => setHoverId(null)}
                  onClick={() => onSelectMarket(id)}
                  onKeyDown={(e) => onKey(e, id)}
                />
              );
            })}
          </g>
          {callout && selected ? (
            <Callout
              x={view.tx + view.k * callout[0]}
              y={view.ty + view.k * callout[1]}
              name={selected.snap.market.name}
              value={effectiveMetric.format(metricValue(selected.snap, effectiveMetric.key))}
              transition={transition}
            />
          ) : null}
        </svg>
      )}

      <div className="mt-3 flex flex-wrap items-start justify-between gap-x-6 gap-y-2">
        <RampLegend
          gradient={scale.gradient}
          min={effectiveMetric.format(scale.min)}
          max={effectiveMetric.format(scale.max)}
          extra={
            <ul
              className="text-ink-soft flex flex-wrap items-center gap-x-3 text-[11px]"
              aria-hidden
            >
              <li className="inline-flex items-center gap-1.5">
                <svg width="16" height="6">
                  <line
                    x1="0"
                    y1="3"
                    x2="16"
                    y2="3"
                    stroke="var(--status-off-track)"
                    strokeWidth="1.5"
                  />
                </svg>
                off track
              </li>
              <li className="inline-flex items-center gap-1.5">
                <svg width="16" height="6">
                  <line
                    x1="0"
                    y1="3"
                    x2="16"
                    y2="3"
                    stroke="var(--status-off-track)"
                    strokeWidth="1.5"
                    strokeDasharray="4 3"
                  />
                </svg>
                at risk
              </li>
              <li className="inline-flex items-center gap-1.5">
                <span
                  className="inline-block size-2.5 rounded-sm"
                  style={{ background: "var(--map-land)" }}
                />
                not a market
              </li>
            </ul>
          }
        />
        <p
          className={cn("numeral min-h-5 text-[12px]", !detail && "text-ink-soft")}
          aria-live="polite"
        >
          {detail ? (
            <span className="inline-flex flex-wrap items-center gap-x-2">
              <span className="text-ink font-sans font-medium">{detail.market.name}</span>
              <span className="text-ink-soft">{detail.regionName}</span>
              <span>{formatCurrency(detail.kpis.revenue)}</span>
              <span>{formatPercent(detail.kpis.growthPct, { signed: true })} YoY</span>
              <span>{formatPercent(detail.kpis.forecastAttainmentPct)} of forecast</span>
              <StatusMark status={detail.status} size="sm" />
            </span>
          ) : (
            "Hover or focus a market for details"
          )}
        </p>
      </div>
      {effectiveMetric.key !== metric ? (
        <p className="text-ink-soft mt-1 text-[12px]">
          Market share is not defined per product; showing revenue instead.
        </p>
      ) : null}
    </Section>
  );
}

/** Ink label with a leader line, anchored to the selected market's centroid. Screen coordinates, so it never scales. */
function Callout({
  x,
  y,
  name,
  value,
  transition,
}: {
  x: number;
  y: number;
  name: string;
  value: string;
  transition?: string;
}) {
  const left = x > W * 0.62;
  const dx = left ? -56 : 56;
  const dy = -44;
  const padX = 12;
  const w = padX * 2 + Math.max(name.length * 8.6, value.length * 8.2);
  const h = 46;
  const bx = left ? x + dx - w : x + dx;
  const by = y + dy - h / 2;
  return (
    <g style={{ transition: transition?.replace("transform", "opacity") }} aria-hidden>
      <line
        x1={x}
        y1={y}
        x2={left ? bx + w : bx}
        y2={y + dy}
        stroke="var(--ink)"
        strokeWidth={1.25}
      />
      <circle cx={x} cy={y} r={3.5} fill="var(--signal)" stroke="var(--paper)" strokeWidth={1.5} />
      <rect x={bx} y={by} width={w} height={h} rx={4} fill="var(--ink)" />
      <text
        x={bx + padX}
        y={by + 19}
        fontFamily="var(--font-sans)"
        fontSize={15}
        fontWeight={600}
        fill="var(--paper)"
      >
        {name}
      </text>
      <text
        x={bx + padX}
        y={by + 37}
        fontFamily="var(--font-geist-mono)"
        fontSize={13.5}
        fill="var(--paper)"
        fillOpacity={0.8}
      >
        {value}
      </text>
    </g>
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
                className="decoration-rule font-medium underline-offset-4 hover:underline"
                onClick={() => onSelectMarket(s.market.id)}
              >
                {s.market.name}
              </button>
            </TableCell>
            <TableCell>{s.regionName}</TableCell>
            <TableCell className="numeral text-right">
              {meta.format(metricValue(s, metric))}
            </TableCell>
            <TableCell>
              <StatusMark status={s.status} size="sm" />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
