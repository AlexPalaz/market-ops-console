"use client";

import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useData } from "@/data/DataProvider";
import {
  formatCurrency,
  formatCurrencyExact,
  formatInteger,
  formatPercent,
  formatPeriod,
} from "@/domain/format";
import { scopeKpis, scopeLabel } from "@/domain/selectors";
import type { Period, Scope } from "@/domain/types";
import { cn } from "@/lib/utils";

/**
 * Products inside the current scope (portfolio, region or market), with a
 * revenue bar for quick scanning. Clicking a product drills into it.
 */
export function ProductBreakdown({
  scope,
  period,
  onSelectProduct,
}: {
  scope: Scope;
  period: Period;
  onSelectProduct: (productId: string | null) => void;
}) {
  const index = useData();
  const base: Scope = { regionId: scope.regionId, marketId: scope.marketId };
  const rows = useMemo(
    () =>
      index.products
        .map((p) => ({ product: p, kpis: scopeKpis(index, { ...base, productId: p.id }, period) }))
        .sort((a, b) => b.kpis.revenue - a.kpis.revenue),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [index, scope.regionId, scope.marketId, period],
  );
  const max = Math.max(...rows.map((r) => r.kpis.revenue), 1);
  const total = rows.reduce((s, r) => s + r.kpis.revenue, 0);

  return (
    <Card className="gap-2">
      <CardHeader>
        <CardTitle className="text-sm font-semibold">
          Products · {scopeLabel(index, base)} · {formatPeriod(period)}
        </CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableCaption className="sr-only">
            Revenue, growth, attainment and units by product for {scopeLabel(index, base)} in{" "}
            {formatPeriod(period)}.
          </TableCaption>
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead className="w-[40%]">Revenue</TableHead>
              <TableHead className="text-right">Growth YoY</TableHead>
              <TableHead className="text-right">Attainment</TableHead>
              <TableHead className="text-right">Units</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(({ product, kpis }) => {
              const selected = scope.productId === product.id;
              const share = total ? (kpis.revenue / total) * 100 : 0;
              return (
                <TableRow
                  key={product.id}
                  className={cn(
                    "hover:bg-muted/60 cursor-pointer transition-colors",
                    selected && "bg-accent/60 shadow-[inset_3px_0_0_var(--primary)]",
                  )}
                  onClick={() => onSelectProduct(selected ? null : product.id)}
                >
                  <TableCell className="font-medium">
                    <button
                      type="button"
                      aria-pressed={selected}
                      className="focus-visible:ring-ring/50 rounded-sm text-left underline-offset-2 hover:underline focus-visible:ring-3 focus-visible:outline-none"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectProduct(selected ? null : product.id);
                      }}
                    >
                      {product.name}
                    </button>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="bg-muted h-2 flex-1 rounded-full" aria-hidden>
                        <div
                          className="from-primary h-2 rounded-full bg-gradient-to-r to-[oklch(0.62_0.15_220)]"
                          style={{ width: `${(kpis.revenue / max) * 100}%` }}
                        />
                      </div>
                      <span
                        className="w-20 text-right text-xs"
                        title={formatCurrencyExact(kpis.revenue)}
                      >
                        {formatCurrency(kpis.revenue)}{" "}
                        <span className="text-muted-foreground">({share.toFixed(0)}%)</span>
                      </span>
                    </div>
                  </TableCell>
                  <TableCell
                    className={cn(
                      "text-right",
                      (kpis.growthPct ?? 0) < 0 ? "text-status-off-track" : "text-status-on-track",
                    )}
                  >
                    {formatPercent(kpis.growthPct, { signed: true })}
                  </TableCell>
                  <TableCell className="text-right">
                    {formatPercent(kpis.forecastAttainmentPct)}
                  </TableCell>
                  <TableCell className="text-right">{formatInteger(kpis.units)}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
