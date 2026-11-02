"use client";

import { AlertsPanel } from "@/features/alerts/components/AlertsPanel";
import { HeatmapChart } from "../charts/HeatmapChart";
import { MarketsMapLazy } from "../charts/MarketsMapLazy";
import { RadarCompareChart } from "../charts/RadarCompareChart";
import { TimeSeriesChart } from "../charts/TimeSeriesChart";
import type { DashboardSelectionApi } from "../hooks/useDashboardSelection";
import { KpiTiles } from "./KpiTiles";
import { MarketsTable } from "./MarketsTable";
import { ProductBreakdown } from "./ProductBreakdown";

/** Every metric, every drill path, dense tables. */
export function AnalystView({ api }: { api: DashboardSelectionApi }) {
  const { selection, selectMarket, selectProduct, setMetric, setPeriod, setCompare, focus } = api;
  const { scope, period, metric, compare } = selection;

  return (
    <div className="grid gap-4 lg:grid-cols-12">
      <div className="lg:col-span-12">
        <KpiTiles scope={scope} period={period} compact />
      </div>
      <div className="lg:col-span-6">
        <MarketsMapLazy
          scope={scope}
          period={period}
          metric={metric}
          onMetricChange={setMetric}
          onSelectMarket={selectMarket}
        />
      </div>
      <div className="lg:col-span-6">
        <TimeSeriesChart scope={scope} period={period} onSelectPeriod={setPeriod} />
      </div>
      <div className="lg:col-span-12">
        <HeatmapChart
          scope={scope}
          period={period}
          onSelectCell={(marketId, p) => focus({ marketId, productId: scope.productId }, p)}
        />
      </div>
      <div className="lg:col-span-7">
        <MarketsTable
          scope={scope}
          period={period}
          selectedMarketId={scope.marketId}
          onSelectMarket={selectMarket}
        />
      </div>
      <div className="lg:col-span-5">
        <RadarCompareChart
          scope={scope}
          period={period}
          compare={compare}
          onCompareChange={setCompare}
        />
      </div>
      <div className="lg:col-span-7">
        <ProductBreakdown scope={scope} period={period} onSelectProduct={selectProduct} />
      </div>
      <div className="lg:col-span-5">
        <AlertsPanel period={period} onSelectMarket={selectMarket} />
      </div>
    </div>
  );
}
