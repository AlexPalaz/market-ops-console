"use client";

import { useMemo } from "react";
import { Section } from "@/components/shared/Section";
import { StatusMark } from "@/components/shared/StatusMark";
import { useData } from "@/data/DataProvider";
import { formatCurrency, formatPercent } from "@/domain/format";
import { topMovers, type MarketSnapshot } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";
import { cn } from "@/lib/utils";

function MoverRow({ s, onSelect }: { s: MarketSnapshot; onSelect: (id: string) => void }) {
  const g = s.kpis.growthPct ?? 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(s.market.id)}
        className="group border-rule hover:bg-muted/50 focus-visible:bg-muted/50 flex w-full items-center gap-3 border-b py-2.5 text-left transition-colors last:border-b-0 focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="text-ink group-hover:decoration-rule block truncate text-[13.5px] font-medium group-hover:underline group-hover:underline-offset-4">
            {s.market.name}
          </span>
          <span className="numeral text-ink-soft block text-[12px]">
            {s.regionName} · {formatCurrency(s.kpis.revenue)}
          </span>
        </span>
        <span
          className={cn(
            "numeral text-[13.5px] font-medium",
            g >= 0 ? "text-status-on-track" : "text-status-off-track",
          )}
        >
          {formatPercent(g, { signed: true })}
        </span>
        <StatusMark status={s.status} size="sm" className="w-[5.5rem] justify-end" />
      </button>
    </li>
  );
}

/** Biggest year-on-year gainers and decliners under the current scope. */
export function TopMovers({
  scope,
  period,
  onSelectMarket,
  n = 3,
  index: sectionIndex,
}: {
  scope: Scope;
  period: Period;
  onSelectMarket: (id: string) => void;
  n?: number;
  index?: string;
}) {
  const index = useData();
  const { gainers, decliners } = useMemo(
    () => topMovers(index, scope, period, n),
    [index, scope, period, n],
  );

  return (
    <Section title="Top movers, year on year" index={sectionIndex} minHeight={0}>
      <div className="@container grid gap-x-8 gap-y-4 @lg:grid-cols-2">
        <div>
          <p className="eyebrow mb-1">Growing</p>
          {gainers.length ? (
            <ul>
              {gainers.map((s) => (
                <MoverRow key={s.market.id} s={s} onSelect={onSelectMarket} />
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft py-2 text-[12.5px]">No market is growing in this period.</p>
          )}
        </div>
        <div>
          <p className="eyebrow mb-1">Declining</p>
          {decliners.length ? (
            <ul>
              {decliners.map((s) => (
                <MoverRow key={s.market.id} s={s} onSelect={onSelectMarket} />
              ))}
            </ul>
          ) : (
            <p className="text-ink-soft py-2 text-[12.5px]">
              No market is declining in this period.
            </p>
          )}
        </div>
      </div>
    </Section>
  );
}
