"use client";

import { useMemo } from "react";
import { Section } from "@/components/shared/Section";
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
 * Products inside the current scope (portfolio, region or market), with an
 * ink revenue bar for quick scanning. Clicking a product drills into it.
 */
export function ProductBreakdown({
  scope,
  period,
  onSelectProduct,
  index: sectionIndex,
}: {
  scope: Scope;
  period: Period;
  onSelectProduct: (productId: string | null) => void;
  index?: string;
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
    <Section
      title="Products"
      index={sectionIndex}
      description={`${scopeLabel(index, base)} · ${formatPeriod(period)}. Click a product to drill into it.`}
      minHeight={0}
    >
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
                data-state={selected ? "selected" : undefined}
                className="cursor-pointer"
                onClick={() => onSelectProduct(selected ? null : product.id)}
              >
                <TableCell className={cn("font-medium", selected && "pl-2")}>
                  <button
                    type="button"
                    aria-pressed={selected}
                    className="decoration-rule focus-visible:ring-ring rounded-sm text-left underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectProduct(selected ? null : product.id);
                    }}
                  >
                    {product.name}
                  </button>
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-3">
                    <div className="bg-muted h-1.5 flex-1" aria-hidden>
                      <div
                        className="bg-ink h-1.5"
                        style={{ width: `${(kpis.revenue / max) * 100}%` }}
                      />
                    </div>
                    <span
                      className="numeral w-24 text-right text-[12.5px]"
                      title={formatCurrencyExact(kpis.revenue)}
                    >
                      {formatCurrency(kpis.revenue)}{" "}
                      <span className="text-ink-soft">{share.toFixed(0)}%</span>
                    </span>
                  </div>
                </TableCell>
                <TableCell
                  className={cn(
                    "numeral text-right",
                    (kpis.growthPct ?? 0) < 0 ? "text-status-off-track" : "text-status-on-track",
                  )}
                >
                  {formatPercent(kpis.growthPct, { signed: true })}
                </TableCell>
                <TableCell className="numeral text-right">
                  {formatPercent(kpis.forecastAttainmentPct)}
                </TableCell>
                <TableCell className="numeral text-right">{formatInteger(kpis.units)}</TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Section>
  );
}
