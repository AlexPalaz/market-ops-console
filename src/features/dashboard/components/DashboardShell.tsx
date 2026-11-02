"use client";

import { useData } from "@/data/DataProvider";
import { formatPeriodLong } from "@/domain/format";
import { scopeLabel } from "@/domain/selectors";
import { useDashboardSelection } from "../hooks/useDashboardSelection";
import { AnalystView } from "./AnalystView";
import { ExecView } from "./ExecView";
import { PeriodSelect } from "./PeriodSelect";
import { ScopeBreadcrumbs } from "./ScopeBreadcrumbs";
import { ViewToggle } from "./ViewToggle";

/**
 * Application shell: header with audience view and period, the drill path,
 * and the workspace. The assistant panel arrives in Phase 4.
 */
export function DashboardShell() {
  const index = useData();
  const api = useDashboardSelection();
  const { selection, goTo, setPeriod, setView } = api;

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

        {selection.view === "exec" ? <ExecView api={api} /> : <AnalystView api={api} />}
      </main>
    </div>
  );
}
