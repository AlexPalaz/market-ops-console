"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Recharts is the largest dependency in the console (~165 KB gzipped). The
 * charts that use it load on demand so the initial bundle stays lean; the
 * tiles, map and tables render first, then the charts fill in.
 */
const chartSkeleton = (height: number) => (
  <Skeleton
    className="w-full rounded-xl"
    style={{ height }}
    role="status"
    aria-label="Loading chart"
  />
);

export const TimeSeriesChartLazy = dynamic(
  () => import("./TimeSeriesChart").then((m) => m.TimeSeriesChart),
  {
    ssr: false,
    loading: () => chartSkeleton(380),
  },
);

export const RadarCompareChartLazy = dynamic(
  () => import("./RadarCompareChart").then((m) => m.RadarCompareChart),
  { ssr: false, loading: () => chartSkeleton(460) },
);
