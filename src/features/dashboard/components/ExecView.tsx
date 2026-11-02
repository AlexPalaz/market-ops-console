"use client";

import { AlertsPanel } from "@/features/alerts/components/AlertsPanel";
import { MarketsMapLazy } from "../charts/MarketsMapLazy";
import { TimeSeriesChart } from "../charts/TimeSeriesChart";
import type { DashboardSelectionApi } from "../hooks/useDashboardSelection";
import { KpiTiles } from "./KpiTiles";
import { ProductBreakdown } from "./ProductBreakdown";
import { RiskList } from "./RiskList";
import { TopMovers } from "./TopMovers";

/** Health, risks and priorities at a glance. Few numbers, strong hierarchy. */
export function ExecView({ api }: { api: DashboardSelectionApi }) {
  const { selection, selectMarket, selectProduct, setMetric, setPeriod, focus } = api;
  const { scope, period, metric } = selection;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <KpiTiles scope={scope} period={period} />
      </div>
      <div className="lg:col-span-7">
        <MarketsMapLazy
          scope={scope}
          period={period}
          metric={metric}
          onMetricChange={setMetric}
          onSelectMarket={selectMarket}
        />
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
      </div>
      <div className="lg:col-span-7">
        <TimeSeriesChart scope={scope} period={period} onSelectPeriod={setPeriod} />
      </div>
      <div className="lg:col-span-5">
        <ProductBreakdown scope={scope} period={period} onSelectProduct={selectProduct} />
      </div>
    </div>
  );
}
