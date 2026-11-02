"use client";

import { useData } from "@/data/DataProvider";
import { formatPeriodLong } from "@/domain/format";
import { scopeLabel } from "@/domain/selectors";
import { useDashboardSelection } from "../hooks/useDashboardSelection";
import { PeriodSelect } from "./PeriodSelect";
import { ScopeBreadcrumbs } from "./ScopeBreadcrumbs";
import { ViewToggle } from "./ViewToggle";
import { ChartFrame } from "@/components/shared/ChartFrame";

/**
 * Application shell: header with audience view and period, the drill path,
 * and the workspace grid. Phase 2 renders the frame only; charts arrive in
 * Phase 3 and the assistant panel in Phase 4.
 */
export function DashboardShell() {
  const index = useData();
  const { selection, goTo, setPeriod, setView } = useDashboardSelection();

  const placeholder = (
    <div className="text-muted-foreground flex h-full min-h-[inherit] items-center justify-center rounded-md border border-dashed text-xs">
      Not implemented yet
    </div>
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 border-b backdrop-blur">
        <div className="mx-auto flex w-full max-w-[1600px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2.5">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight">Market Ops Console</span>
            <span className="text-muted-foreground hidden text-xs sm:inline">
              Data as of {formatPeriodLong(index.latestPeriod)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <PeriodSelect value={selection.period} onChange={setPeriod} />
            <ViewToggle value={selection.view} onChange={setView} />
          </div>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-[1600px] flex-1 px-4 py-4">
        <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
          <div>
            <ScopeBreadcrumbs scope={selection.scope} onNavigate={goTo} />
            <h1 className="mt-1 text-xl font-semibold tracking-tight">
              {scopeLabel(index, selection.scope)}
            </h1>
          </div>
          <p className="text-muted-foreground text-xs">
            {selection.view === "exec" ? "Executive overview" : "Analyst deep-dive"} ·{" "}
            {formatPeriodLong(selection.period)}
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-12">
          <section aria-label="Overview" className="lg:col-span-12">
            <ChartFrame title="Portfolio health" minHeight={96}>
              {placeholder}
            </ChartFrame>
          </section>
          <section aria-label="Map" className="lg:col-span-7">
            <ChartFrame title="Markets map" minHeight={360}>
              {placeholder}
            </ChartFrame>
          </section>
          <section aria-label="Time series" className="lg:col-span-5">
            <ChartFrame title="Actual vs forecast vs prior year" minHeight={360}>
              {placeholder}
            </ChartFrame>
          </section>
        </div>
      </main>
    </div>
  );
}
