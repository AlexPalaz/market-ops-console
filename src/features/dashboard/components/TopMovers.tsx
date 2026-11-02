"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useData } from "@/data/DataProvider";
import { formatCurrency, formatPercent } from "@/domain/format";
import { topMovers, type MarketSnapshot } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";

function MoverRow({ s, onSelect }: { s: MarketSnapshot; onSelect: (id: string) => void }) {
  const g = s.kpis.growthPct ?? 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(s.market.id)}
        className="hover:bg-muted focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left focus-visible:ring-3 focus-visible:outline-none"
      >
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-medium">{s.market.name}</span>
          <span className="text-muted-foreground block text-xs">
            {s.regionName} · {formatCurrency(s.kpis.revenue)}
          </span>
        </span>
        <span
          className={
            g >= 0
              ? "text-status-on-track text-sm font-semibold"
              : "text-status-off-track text-sm font-semibold"
          }
        >
          {formatPercent(g, { signed: true })}
        </span>
        <StatusBadge status={s.status} />
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
}: {
  scope: Scope;
  period: Period;
  onSelectMarket: (id: string) => void;
  n?: number;
}) {
  const index = useData();
  const { gainers, decliners } = useMemo(
    () => topMovers(index, scope, period, n),
    [index, scope, period, n],
  );

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Top movers, year on year</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        <div>
          <p className="text-muted-foreground mb-1 px-2 text-xs font-medium">Growing</p>
          {gainers.length ? (
            <ul className="space-y-0.5">
              {gainers.map((s) => (
                <MoverRow key={s.market.id} s={s} onSelect={onSelectMarket} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-2 text-xs">
              No market is growing in this period.
            </p>
          )}
        </div>
        <div>
          <p className="text-muted-foreground mb-1 px-2 text-xs font-medium">Declining</p>
          {decliners.length ? (
            <ul className="space-y-0.5">
              {decliners.map((s) => (
                <MoverRow key={s.market.id} s={s} onSelect={onSelectMarket} />
              ))}
            </ul>
          ) : (
            <p className="text-muted-foreground px-2 text-xs">
              No market is declining in this period.
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
