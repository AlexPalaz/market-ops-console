"use client";

import { useMemo } from "react";
import { CrosshairIcon, DatabaseIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useData } from "@/data/DataProvider";
import { formatCurrency, formatPercent, formatPeriod } from "@/domain/format";
import { resolveCitation, scopeLabel, type ResolvedCitation } from "@/domain/selectors";
import type { Citation } from "@/domain/types";

/**
 * The authoritative half of an answer: every citation resolved against
 * data.json, with the verified numbers for that scope and period. Styled as
 * data (card surface), not as AI output.
 */
export function EvidencePanel({
  citations,
  onFollow,
}: {
  citations: Citation[];
  onFollow: (c: ResolvedCitation) => void;
}) {
  const index = useData();
  const resolved = useMemo(
    () => citations.map((c) => resolveCitation(index, c)),
    [index, citations],
  );

  if (resolved.length === 0) {
    return (
      <p className="text-muted-foreground text-xs">
        <DatabaseIcon className="mr-1 inline size-3.5 align-text-bottom" aria-hidden />
        No dataset evidence attached to this answer.
      </p>
    );
  }

  return (
    <section aria-label="Evidence from the dataset" className="bg-card rounded-md border">
      <h4 className="flex items-center gap-1.5 border-b px-3 py-1.5 text-xs font-semibold">
        <DatabaseIcon className="size-3.5" aria-hidden />
        Evidence from the dataset
        <span className="text-muted-foreground font-normal">· verified figures, not generated</span>
      </h4>
      <ol className="divide-y">
        {resolved.map((r, i) => {
          const market = r.scope.marketId ? index.marketsById.get(r.scope.marketId) : undefined;
          return (
            <li key={`${i}-${r.label}`} className="flex items-start gap-2 px-3 py-2 text-xs">
              <span className="bg-muted mt-0.5 inline-flex size-4 shrink-0 items-center justify-center rounded-sm font-mono text-[10px]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-medium">
                  {r.label}
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · {scopeLabel(index, r.scope)} · {formatPeriod(r.period)}
                  </span>
                </p>
                {r.unresolved.length ? (
                  <p className="text-status-off-track mt-0.5 inline-flex items-center gap-1">
                    <TriangleAlertIcon className="size-3.5" aria-hidden />
                    Could not match {r.unresolved.join(", ")} in the dataset.
                  </p>
                ) : (
                  <p className="text-muted-foreground mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span>{formatCurrency(r.kpis.revenue)} revenue</span>
                    <span>{formatPercent(r.kpis.growthPct, { signed: true })} YoY</span>
                    <span>{formatPercent(r.kpis.forecastAttainmentPct)} of forecast</span>
                    {market ? <StatusBadge status={market.kpis.status} /> : null}
                  </p>
                )}
              </div>
              <Button
                variant="ghost"
                size="xs"
                onClick={() => onFollow(r)}
                aria-label={`Show ${r.label} on the dashboard`}
              >
                <CrosshairIcon aria-hidden />
                Show
              </Button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
