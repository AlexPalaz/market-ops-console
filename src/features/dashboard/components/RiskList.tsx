"use client";

import { useMemo } from "react";
import { Section } from "@/components/shared/Section";
import { StatusMark } from "@/components/shared/StatusMark";
import { AlertBadge } from "@/features/alerts/components/AlertBadge";
import { useAlertHits } from "@/features/alerts/hooks/useAlertHits";
import { useData } from "@/data/DataProvider";
import { formatPercent, formatPeriod } from "@/domain/format";
import { anomaliesInScope, marketsAtRisk } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";

const rowClass =
  "group flex w-full items-center gap-3 border-b border-rule py-2.5 text-left transition-colors hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none last:border-b-0";

/** Markets flagged at risk or off track, plus anomaly markers from the dataset. */
export function RiskList({
  scope,
  period,
  onSelectMarket,
  onSelectPeriod,
  index: sectionIndex,
}: {
  scope: Scope;
  period: Period;
  onSelectMarket: (id: string) => void;
  onSelectPeriod: (marketId: string, period: Period) => void;
  index?: string;
}) {
  const index = useData();
  const risks = useMemo(() => marketsAtRisk(index, scope, period), [index, scope, period]);
  const anomalies = useMemo(() => anomaliesInScope(index, scope), [index, scope]);
  const alertHits = useAlertHits(period);

  return (
    <Section title="Needs attention" index={sectionIndex} minHeight={0}>
      {risks.length ? (
        <ul>
          {risks.map((s) => (
            <li key={s.market.id}>
              <button
                type="button"
                onClick={() => onSelectMarket(s.market.id)}
                className={rowClass}
              >
                <span className="min-w-0 flex-1">
                  <span className="text-ink flex items-center gap-2 text-[13.5px] font-medium">
                    <span className="group-hover:decoration-rule truncate group-hover:underline group-hover:underline-offset-4">
                      {s.market.name}
                    </span>
                    <AlertBadge hits={alertHits.byMarket.get(s.market.id)} />
                  </span>
                  <span className="numeral text-ink-soft block text-[12px]">
                    {formatPercent(s.kpis.growthPct, { signed: true })} YoY ·{" "}
                    {formatPercent(s.kpis.forecastAttainmentPct)} of forecast
                  </span>
                </span>
                <StatusMark status={s.status} />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-ink-soft py-2 text-[12.5px]">Every market in scope is on track.</p>
      )}

      {anomalies.length ? (
        <div className="mt-4">
          <p className="eyebrow mb-1">Anomaly markers</p>
          <ul>
            {anomalies.map((a) => (
              <li key={`${a.market.id}-${a.period}-${a.type}`}>
                <button
                  type="button"
                  onClick={() => onSelectPeriod(a.market.id, a.period)}
                  className={rowClass}
                >
                  <span className="bg-signal mt-0.5 size-2 shrink-0 rounded-full" aria-hidden />
                  <span className="min-w-0">
                    <span className="text-ink block text-[13.5px] font-medium">
                      {a.market.name} · <span className="numeral">{formatPeriod(a.period)}</span> ·{" "}
                      {a.type}
                    </span>
                    <span className="text-ink-soft block text-[12px]">{a.note}</span>
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </Section>
  );
}
