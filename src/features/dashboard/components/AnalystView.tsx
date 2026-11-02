"use client";

import { AlertsPanel } from "@/features/alerts/components/AlertsPanel";
import { HeatmapChart } from "../charts/HeatmapChart";
import { MarketsMapLazy } from "../charts/MarketsMapLazy";
import {
  RadarCompareChartLazy as RadarCompareChart,
  TimeSeriesChartLazy as TimeSeriesChart,
} from "../charts/lazy";
import type { DashboardSelectionApi } from "../hooks/useDashboardSelection";
import { KpiTiles } from "./KpiTiles";
import { MarketsTable } from "./MarketsTable";
import { ProductBreakdown } from "./ProductBreakdown";

/** Every metric, every drill path, dense tables. */
export function AnalystView({ api }: { api: DashboardSelectionApi }) {
  const { selection, selectMarket, selectProduct, setMetric, setPeriod, setCompare, focus } = api;
  const { scope, period, metric, compare } = selection;

  return (
    <div className="flex flex-col gap-4">
      <KpiTiles scope={scope} period={period} compact />
      <div className="grid gap-4 lg:grid-cols-12 [&>*]:min-w-0">
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
          <TimeSeriesChart scope={scope} period={period} onSelectPeriod={setPeriod} fill />
        </div>
      </div>
      <HeatmapChart
        scope={scope}
        period={period}
        onSelectCell={(marketId, p) => focus({ marketId, productId: scope.productId }, p)}
      />
      <div className="grid gap-4 lg:grid-cols-12 [&>*]:min-w-0">
        <div className="flex flex-col gap-4 lg:col-span-7">
          <MarketsTable
            scope={scope}
            period={period}
            selectedMarketId={scope.marketId}
            onSelectMarket={selectMarket}
          />
          <ProductBreakdown scope={scope} period={period} onSelectProduct={selectProduct} />
        </div>
        <div className="flex flex-col gap-4 lg:col-span-5">
          <RadarCompareChart
            scope={scope}
            period={period}
            compare={compare}
            onCompareChange={setCompare}
          />
          <AlertsPanel period={period} onSelectMarket={selectMarket} />
        </div>
      </div>
    </div>
  );
}
