"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** d3-geo and the world topology only load in the browser, on demand. */
export const MarketsMapLazy = dynamic(() => import("./MarketsMap").then((m) => m.MarketsMap), {
  ssr: false,
  loading: () => (
    <Skeleton className="aspect-[960/470] w-full" role="status" aria-label="Loading map" />
  ),
});
