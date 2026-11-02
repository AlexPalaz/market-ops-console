"use client";

import dynamic from "next/dynamic";
import { Skeleton } from "@/components/ui/skeleton";

/** d3-geo and the world topology only load in the browser, on demand. */
export const MarketsMapLazy = dynamic(() => import("./MarketsMap").then((m) => m.MarketsMap), {
  ssr: false,
  loading: () => <Skeleton className="h-[480px] w-full rounded-xl" aria-label="Loading map" />,
});
