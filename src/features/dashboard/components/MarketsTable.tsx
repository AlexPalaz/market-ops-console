"use client";

import { useMemo, useState } from "react";
import { ArrowDownIcon, ArrowUpIcon, ArrowUpDownIcon } from "lucide-react";
import { Section } from "@/components/shared/Section";
import { StatusMark } from "@/components/shared/StatusMark";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { AlertBadge } from "@/features/alerts/components/AlertBadge";
import { useAlertHits } from "@/features/alerts/hooks/useAlertHits";
import { useData } from "@/data/DataProvider";
import { formatCurrencyExact, formatInteger, formatPercent, formatPeriod } from "@/domain/format";
import { marketSnapshots, type MarketSnapshot } from "@/domain/selectors";
import type { Period, Scope, Status } from "@/domain/types";
import { cn } from "@/lib/utils";

type SortKey =
  | "name"
  | "revenue"
  | "growthPct"
  | "forecastAttainmentPct"
  | "variance"
  | "sharePct"
  | "units"
  | "status";
type SortDir = "asc" | "desc";

const STATUS_ORDER: Record<Status, number> = { off_track: 0, at_risk: 1, on_track: 2 };

function sortValue(s: MarketSnapshot, key: SortKey): number | string {
  switch (key) {
    case "name":
      return s.market.name;
    case "revenue":
      return s.kpis.revenue;
    case "growthPct":
      return s.kpis.growthPct ?? Number.NEGATIVE_INFINITY;
    case "forecastAttainmentPct":
      return s.kpis.forecastAttainmentPct ?? Number.NEGATIVE_INFINITY;
    case "variance":
      return s.kpis.variance;
    case "sharePct":
      return s.sharePct;
    case "units":
      return s.kpis.units;
    case "status":
      return STATUS_ORDER[s.status];
  }
}

/**
 * Columns drop from the right as the container narrows (container queries on
 * the section), so the table never scrolls sideways: market, status, revenue,
 * growth and attainment always stay; variance, share and units return as
 * space allows. The accessible caption lists the full set.
 */
const COLUMNS: { key: SortKey; label: string; numeric?: boolean; cls?: string }[] = [
  { key: "name", label: "Market" },
  { key: "status", label: "Status" },
  { key: "revenue", label: "Revenue", numeric: true },
  { key: "growthPct", label: "Growth YoY", numeric: true },
  { key: "forecastAttainmentPct", label: "Attainment", numeric: true },
  { key: "variance", label: "Variance", numeric: true, cls: "hidden @2xl:table-cell" },
  { key: "sharePct", label: "Share", numeric: true, cls: "hidden @3xl:table-cell" },
  { key: "units", label: "Units", numeric: true, cls: "hidden @4xl:table-cell" },
];
const COL = Object.fromEntries(COLUMNS.map((c) => [c.key, c.cls ?? ""])) as Record<SortKey, string>;

/**
 * Dense, sortable, filterable table of every market in scope. This is the
 * authoritative view: every number here is read or summed from data.json.
 */
export function MarketsTable({
  scope,
  period,
  selectedMarketId,
  onSelectMarket,
  index: sectionIndex,
}: {
  scope: Scope;
  period: Period;
  selectedMarketId?: string;
  onSelectMarket: (id: string) => void;
  index?: string;
}) {
  const index = useData();
  const [sortKey, setSortKey] = useState<SortKey>("revenue");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [statusFilter, setStatusFilter] = useState<Status[]>([]);
  const alertHits = useAlertHits(period);

  const rows = useMemo(() => {
    const all = marketSnapshots(index, scope, period);
    const filtered = statusFilter.length ? all.filter((s) => statusFilter.includes(s.status)) : all;
    return [...filtered].sort((a, b) => {
      const av = sortValue(a, sortKey);
      const bv = sortValue(b, sortKey);
      const cmp =
        typeof av === "string" && typeof bv === "string"
          ? av.localeCompare(bv)
          : Number(av) - Number(bv);
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [index, scope, period, sortKey, sortDir, statusFilter]);

  const toggleSort = (key: SortKey) => {
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir(key === "name" || key === "status" ? "asc" : "desc");
    }
  };

  const productNote = scope.productId
    ? ` · ${index.productsById.get(scope.productId)?.name ?? ""} only`
    : "";

  return (
    <Section
      title="Markets"
      index={sectionIndex}
      description={`${formatPeriod(period)}${productNote}. Sorted by ${COLUMNS.find((c) => c.key === sortKey)?.label.toLowerCase()}, ${sortDir === "asc" ? "ascending" : "descending"}.`}
      minHeight={0}
      actions={
        <ToggleGroup
          type="multiple"
          size="sm"
          variant="default"
          value={statusFilter}
          onValueChange={(v) => setStatusFilter(v as Status[])}
          aria-label="Filter by status"
        >
          <ToggleGroupItem value="off_track">Off track</ToggleGroupItem>
          <ToggleGroupItem value="at_risk">At risk</ToggleGroupItem>
          <ToggleGroupItem value="on_track">On track</ToggleGroupItem>
        </ToggleGroup>
      }
    >
      <div className="@container">
        <Table>
          <TableCaption className="sr-only">
            Markets with revenue, growth, forecast attainment, variance, share and units for{" "}
            {formatPeriod(period)}
            {productNote}. Sorted by {sortKey}, {sortDir}.
          </TableCaption>
          <TableHeader>
            <TableRow>
              {COLUMNS.map((c) => {
                const active = c.key === sortKey;
                const Icon = active
                  ? sortDir === "asc"
                    ? ArrowUpIcon
                    : ArrowDownIcon
                  : ArrowUpDownIcon;
                return (
                  <TableHead
                    key={c.key}
                    aria-sort={active ? (sortDir === "asc" ? "ascending" : "descending") : "none"}
                    className={cn(c.numeric && "text-right", c.cls)}
                  >
                    <button
                      type="button"
                      onClick={() => toggleSort(c.key)}
                      className={cn(
                        "eyebrow hover:text-ink focus-visible:ring-ring inline-flex items-center gap-1 rounded-sm transition-colors focus-visible:ring-2 focus-visible:outline-none",
                        c.numeric && "flex-row-reverse",
                        active && "text-ink",
                      )}
                    >
                      {c.label}
                      <Icon
                        className={cn("size-3", !active && "opacity-40")}
                        aria-hidden
                        strokeWidth={1.75}
                      />
                    </button>
                  </TableHead>
                );
              })}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow>
                <TableCell colSpan={COLUMNS.length} className="text-ink-soft py-6 text-center">
                  No market matches the current filter.
                </TableCell>
              </TableRow>
            ) : (
              rows.map((s) => {
                const selected = s.market.id === selectedMarketId;
                return (
                  <TableRow
                    key={s.market.id}
                    data-state={selected ? "selected" : undefined}
                    className="cursor-pointer"
                    onClick={() => onSelectMarket(s.market.id)}
                  >
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="decoration-rule focus-visible:ring-ring rounded-sm text-left underline-offset-4 hover:underline focus-visible:ring-2 focus-visible:outline-none"
                        aria-current={selected ? "true" : undefined}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectMarket(s.market.id);
                        }}
                      >
                        {s.market.name}
                      </button>
                      <span className="text-ink-soft flex items-center gap-1.5 text-[11.5px]">
                        {s.regionName}
                        <AlertBadge hits={alertHits.byMarket.get(s.market.id)} />
                      </span>
                    </TableCell>
                    <TableCell>
                      <StatusMark status={s.status} size="sm" />
                    </TableCell>
                    <TableCell className="numeral text-right">
                      {formatCurrencyExact(s.kpis.revenue)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "numeral text-right",
                        (s.kpis.growthPct ?? 0) < 0
                          ? "text-status-off-track"
                          : "text-status-on-track",
                      )}
                    >
                      {formatPercent(s.kpis.growthPct, { signed: true })}
                    </TableCell>
                    <TableCell className="numeral text-right">
                      {formatPercent(s.kpis.forecastAttainmentPct)}
                    </TableCell>
                    <TableCell
                      className={cn(
                        "numeral text-right",
                        COL.variance,
                        s.kpis.variance < 0 && "text-status-off-track",
                      )}
                    >
                      {formatCurrencyExact(s.kpis.variance)}
                    </TableCell>
                    <TableCell className={cn("numeral text-right", COL.sharePct)}>
                      {scope.productId ? "—" : formatPercent(s.sharePct)}
                    </TableCell>
                    <TableCell className={cn("numeral text-right", COL.units)}>
                      {formatInteger(s.kpis.units)}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>
      {scope.productId ? (
        <p className="text-ink-soft mt-2 text-[12px]">
          Market share is only defined per market in the dataset, so it is hidden while a product
          filter is active.
        </p>
      ) : null}
    </Section>
  );
}
