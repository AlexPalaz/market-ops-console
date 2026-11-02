"use client";

import { useMemo } from "react";
import { ActivityIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/StatusBadge";
import { useData } from "@/data/DataProvider";
import { formatPercent, formatPeriod } from "@/domain/format";
import { anomaliesInScope, marketsAtRisk } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";

/** Markets flagged at risk or off track, plus anomaly markers from the dataset. */
export function RiskList({
  scope,
  period,
  onSelectMarket,
  onSelectPeriod,
}: {
  scope: Scope;
  period: Period;
  onSelectMarket: (id: string) => void;
  onSelectPeriod: (marketId: string, period: Period) => void;
}) {
  const index = useData();
  const risks = useMemo(() => marketsAtRisk(index, scope, period), [index, scope, period]);
  const anomalies = useMemo(() => anomaliesInScope(index, scope), [index, scope]);

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">Needs attention</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {risks.length ? (
          <ul className="space-y-0.5">
            {risks.map((s) => (
              <li key={s.market.id}>
                <button
                  type="button"
                  onClick={() => onSelectMarket(s.market.id)}
                  className="hover:bg-muted focus-visible:ring-ring/50 flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left focus-visible:ring-3 focus-visible:outline-none"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{s.market.name}</span>
                    <span className="text-muted-foreground block text-xs">
                      {formatPercent(s.kpis.growthPct, { signed: true })} YoY · attainment{" "}
                      {formatPercent(s.kpis.forecastAttainmentPct)}
                    </span>
                  </span>
                  <StatusBadge status={s.status} />
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground px-2 text-xs">Every market in scope is on track.</p>
        )}

        {anomalies.length ? (
          <div>
            <p className="text-muted-foreground mb-1 px-2 text-xs font-medium">Anomaly markers</p>
            <ul className="space-y-0.5">
              {anomalies.map((a) => (
                <li key={`${a.market.id}-${a.period}-${a.type}`}>
                  <button
                    type="button"
                    onClick={() => onSelectPeriod(a.market.id, a.period)}
                    className="hover:bg-muted focus-visible:ring-ring/50 flex w-full items-start gap-2 rounded-md px-2 py-1.5 text-left focus-visible:ring-3 focus-visible:outline-none"
                  >
                    <ActivityIcon
                      className="text-status-off-track mt-0.5 size-4 shrink-0"
                      aria-hidden
                    />
                    <span className="min-w-0">
                      <span className="block text-sm font-medium">
                        {a.market.name} · {formatPeriod(a.period)} · {a.type}
                      </span>
                      <span className="text-muted-foreground block text-xs">{a.note}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
