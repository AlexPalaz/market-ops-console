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
    <div className="flex flex-col gap-8">
      <KpiTiles scope={scope} period={period} compact />
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-0 [&>*]:min-w-0">
        <div className="lg:col-span-6 lg:pr-8">
          <MarketsMapLazy
            index="02"
            scope={scope}
            period={period}
            metric={metric}
            onMetricChange={setMetric}
            onSelectMarket={selectMarket}
          />
        </div>
        <div className="lg:border-rule lg:col-span-6 lg:border-l lg:pl-8">
          <TimeSeriesChart
            index="03"
            scope={scope}
            period={period}
            onSelectPeriod={setPeriod}
            fill
          />
        </div>
      </div>
      <HeatmapChart
        index="04"
        scope={scope}
        period={period}
        onSelectCell={(marketId, p) => focus({ marketId, productId: scope.productId }, p)}
      />
      <div className="grid gap-8 lg:grid-cols-12 lg:gap-0 [&>*]:min-w-0">
        <div className="flex flex-col gap-8 lg:col-span-7 lg:pr-8">
          <MarketsTable
            index="05"
            scope={scope}
            period={period}
            selectedMarketId={scope.marketId}
            onSelectMarket={selectMarket}
          />
          <ProductBreakdown
            index="06"
            scope={scope}
            period={period}
            onSelectProduct={selectProduct}
          />
        </div>
        <div className="lg:border-rule flex flex-col gap-8 lg:col-span-5 lg:border-l lg:pl-8">
          <RadarCompareChart
            index="07"
            scope={scope}
            period={period}
            compare={compare}
            onCompareChange={setCompare}
          />
          <AlertsPanel index="08" period={period} onSelectMarket={selectMarket} />
        </div>
      </div>
    </div>
  );
}
