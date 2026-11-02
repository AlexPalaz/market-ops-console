"use client";

import { AlertsPanel } from "@/features/alerts/components/AlertsPanel";
import { MarketsMapLazy } from "../charts/MarketsMapLazy";
import { TimeSeriesChartLazy as TimeSeriesChart } from "../charts/lazy";
import type { DashboardSelectionApi } from "../hooks/useDashboardSelection";
import { KpiTiles } from "./KpiTiles";
import { ProductBreakdown } from "./ProductBreakdown";
import { RiskList } from "./RiskList";
import { TopMovers } from "./TopMovers";

/**
 * Health, risks and priorities at a glance. Two independent columns divided by
 * a hairline; sections stack with their own ink rules.
 */
export function ExecView({ api }: { api: DashboardSelectionApi }) {
  const { selection, selectMarket, selectProduct, setMetric, setPeriod, focus } = api;
  const { scope, period, metric } = selection;

  return (
    <div className="flex flex-col gap-8">
      <KpiTiles scope={scope} period={period} />
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-0 [&>*]:min-w-0">
        <div className="flex flex-col gap-8 lg:col-span-7 lg:pr-8">
          <MarketsMapLazy
            index="02"
            scope={scope}
            period={period}
            metric={metric}
            onMetricChange={setMetric}
            onSelectMarket={selectMarket}
          />
          <TimeSeriesChart index="03" scope={scope} period={period} onSelectPeriod={setPeriod} />
        </div>
        <div className="lg:border-rule flex flex-col gap-8 lg:col-span-5 lg:border-l lg:pl-8">
          <RiskList
            index="04"
            scope={scope}
            period={period}
            onSelectMarket={selectMarket}
            onSelectPeriod={(marketId, p) => focus({ marketId, productId: scope.productId }, p)}
          />
          <TopMovers index="05" scope={scope} period={period} onSelectMarket={selectMarket} />
          <AlertsPanel index="06" period={period} onSelectMarket={selectMarket} compact />
          <ProductBreakdown
            index="07"
            scope={scope}
            period={period}
            onSelectProduct={selectProduct}
          />
        </div>
      </div>
    </div>
  );
}
