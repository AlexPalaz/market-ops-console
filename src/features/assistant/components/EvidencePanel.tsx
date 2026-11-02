"use client";

import { useMemo } from "react";
import { StatusMark } from "@/components/shared/StatusMark";
import { useData } from "@/data/DataProvider";
import { formatCurrency, formatPercent, formatPeriod } from "@/domain/format";
import { resolveCitation, scopeLabel, type ResolvedCitation } from "@/domain/selectors";
import type { Citation } from "@/domain/types";

/**
 * The authoritative half of an answer: every citation resolved against
 * data.json, with the verified numbers for that scope and period. Set as a
 * numbered list with hairlines and mono figures: data, not prose.
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
    return <p className="eyebrow mt-3">No dataset evidence attached to this answer.</p>;
  }

  return (
    <section aria-label="Evidence from the dataset" className="border-ink mt-3 border-t">
      <h4 className="eyebrow flex items-baseline justify-between gap-3 py-2">
        <span>Evidence from the dataset</span>
        <span className="text-ink-soft font-normal tracking-normal normal-case">
          verified, not generated
        </span>
      </h4>
      <ol>
        {resolved.map((r, i) => {
          const market = r.scope.marketId ? index.marketsById.get(r.scope.marketId) : undefined;
          return (
            <li
              key={`${i}-${r.label}`}
              className="border-rule flex items-start gap-3 border-t py-2.5"
            >
              <span className="numeral text-ink-soft mt-0.5 w-4 shrink-0 text-[11px]" aria-hidden>
                {String(i + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-ink text-[13px] font-medium">
                  {r.label}
                  <span className="numeral text-ink-soft font-normal">
                    {" "}
                    · {scopeLabel(index, r.scope)} · {formatPeriod(r.period)}
                  </span>
                </p>
                {r.unresolved.length ? (
                  <p className="eyebrow text-status-off-track mt-1 tracking-normal normal-case">
                    Could not match {r.unresolved.join(", ")} in the dataset.
                  </p>
                ) : (
                  <p className="numeral text-ink-soft mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[12px]">
                    <span>{formatCurrency(r.kpis.revenue)}</span>
                    <span>{formatPercent(r.kpis.growthPct, { signed: true })} YoY</span>
                    <span>{formatPercent(r.kpis.forecastAttainmentPct)} of forecast</span>
                    {market ? <StatusMark status={market.kpis.status} size="sm" /> : null}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => onFollow(r)}
                aria-label={`Show ${r.label} on the dashboard`}
                className="eyebrow text-signal-ink hover:text-ink focus-visible:ring-ring shrink-0 rounded-sm px-1 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
              >
                Show →
              </button>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
