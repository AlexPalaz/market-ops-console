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
 * Health, risks and priorities at a glance. Two independent columns (not grid
 * rows) so cards of different heights stack without leaving gaps.
 */
export function ExecView({ api }: { api: DashboardSelectionApi }) {
  const { selection, selectMarket, selectProduct, setMetric, setPeriod, focus } = api;
  const { scope, period, metric } = selection;

  return (
    <div className="flex flex-col gap-4">
      <KpiTiles scope={scope} period={period} />
      <div className="grid gap-4 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <MarketsMapLazy
            scope={scope}
            period={period}
            metric={metric}
            onMetricChange={setMetric}
            onSelectMarket={selectMarket}
          />
          <TimeSeriesChart scope={scope} period={period} onSelectPeriod={setPeriod} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <RiskList
            scope={scope}
            period={period}
            onSelectMarket={selectMarket}
            onSelectPeriod={(marketId, p) => focus({ marketId, productId: scope.productId }, p)}
          />
          <TopMovers scope={scope} period={period} onSelectMarket={selectMarket} />
          <AlertsPanel period={period} onSelectMarket={selectMarket} compact />
          <ProductBreakdown scope={scope} period={period} onSelectProduct={selectProduct} />
        </div>
      </div>
    </div>
  );
}
