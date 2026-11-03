"use client";

import dynamic from "next/dynamic";
import { Section } from "@/components/shared/Section";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * d3-geo and the world topology only load in the browser, on demand. The
 * placeholder mirrors the loaded section (same chrome, same minimum height)
 * so the blocks below do not move when the chunk arrives after first paint.
 */
export const MarketsMapLazy = dynamic(() => import("./MarketsMap").then((m) => m.MarketsMap), {
  ssr: false,
  loading: () => (
    <Section
      title="Markets map"
      index="02"
      description="Countries coloured by revenue for the period. Click a market to drill in."
      minHeight={420}
      actions={<Skeleton className="h-7 w-[10.5rem]" aria-hidden />}
    >
      <Skeleton className="aspect-[960/470] w-full" role="status" aria-label="Loading map" />
    </Section>
  ),
});
