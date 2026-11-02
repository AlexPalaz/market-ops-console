"use client";

import { useState } from "react";
import { MessageSquareTextIcon, PanelRightCloseIcon } from "lucide-react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { StatusMark } from "@/components/shared/StatusMark";
import { ThemeToggle } from "@/components/shared/ThemeToggle";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { useData } from "@/data/DataProvider";
import { formatPeriodLong } from "@/domain/format";
import { scopeLabel, type ResolvedCitation } from "@/domain/selectors";
import { AssistantPanel } from "@/features/assistant/components/AssistantPanel";
import { cn } from "@/lib/utils";
import { useDashboardSelection } from "../hooks/useDashboardSelection";
import { AnalystView } from "./AnalystView";
import { ExecView } from "./ExecView";
import { PeriodSelect } from "./PeriodSelect";
import { ScopeBreadcrumbs } from "./ScopeBreadcrumbs";
import { ViewToggle } from "./ViewToggle";

const HEADER_H = 56;

/**
 * Application shell: a hairline header with the wordmark, audience tabs,
 * period and theme; the page title with its breadcrumb; the workspace; the
 * assistant as a side surface (desktop) or sheet (mobile).
 */
export function DashboardShell() {
  const index = useData();
  const api = useDashboardSelection();
  const { selection, goTo, setPeriod, setView, focus } = api;
  const [panelOpen, setPanelOpen] = useState(true);
  const [sheetOpen, setSheetOpen] = useState(false);
  const selectedMarket = selection.scope.marketId
    ? index.marketsById.get(selection.scope.marketId)
    : undefined;

  const followCitation = (c: ResolvedCitation) => {
    focus(c.scope, c.period);
    setSheetOpen(false);
    document.getElementById("main")?.scrollIntoView({ block: "start", behavior: "auto" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="border-rule bg-paper/92 supports-[backdrop-filter]:bg-paper/85 sticky top-0 z-20 border-b backdrop-blur"
        style={{ minHeight: HEADER_H }}
      >
        <div className="mx-auto flex min-h-[inherit] w-full max-w-[1680px] flex-wrap items-center gap-x-6 gap-y-2 px-6 xl:px-8">
          <div className="flex min-w-0 items-baseline gap-2.5">
            <span className="display text-ink text-[21px] leading-none font-medium tracking-tight">
              Market Ops
            </span>
            <span className="eyebrow">Console</span>
            <span className="eyebrow ml-2 hidden items-center gap-1.5 sm:inline-flex">
              <span className="bg-status-on-track size-1.5 rounded-full" aria-hidden />
              Data as of {formatPeriodLong(index.latestPeriod)}
            </span>
          </div>
          <div className="flex w-full flex-wrap items-center gap-x-5 gap-y-2 sm:ml-auto sm:w-auto">
            <ViewToggle value={selection.view} onChange={setView} />
            <PeriodSelect value={selection.period} onChange={setPeriod} />
            <ThemeToggle />
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              aria-pressed={panelOpen}
              onClick={() => setPanelOpen((v) => !v)}
            >
              {panelOpen ? (
                <PanelRightCloseIcon aria-hidden strokeWidth={1.75} />
              ) : (
                <span className="bg-signal size-2 rounded-sm" aria-hidden />
              )}
              Assistant
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <MessageSquareTextIcon aria-hidden strokeWidth={1.75} />
                  Assistant
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-full p-2 sm:max-w-md">
                <SheetTitle className="sr-only">Assistant</SheetTitle>
                <div className="h-full pt-8">
                  <ErrorBoundary label="The assistant">
                    <AssistantPanel onFollowCitation={followCitation} />
                  </ErrorBoundary>
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>
      </header>

      <div
        className={cn(
          "mx-auto grid w-full max-w-[1680px] flex-1 gap-8 px-6 py-6 xl:px-8",
          panelOpen && "lg:grid-cols-[minmax(0,1fr)_400px]",
        )}
      >
        <main id="main" className="min-w-0">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
            <div>
              <ScopeBreadcrumbs scope={selection.scope} onNavigate={goTo} />
              <div className="mt-2 flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <h1 className="display text-ink text-[40px] leading-none font-medium tracking-tight">
                  {scopeLabel(index, selection.scope)}
                </h1>
                {selectedMarket ? (
                  <>
                    <span className="eyebrow numeral">{selectedMarket.iso3}</span>
                    <StatusMark status={selectedMarket.kpis.status} />
                  </>
                ) : null}
              </div>
            </div>
            <p className="eyebrow numeral">
              {selection.view === "exec" ? "Executive overview" : "Analyst deep-dive"} ·{" "}
              {formatPeriodLong(selection.period)}
            </p>
          </div>

          <ErrorBoundary label="The dashboard">
            {selection.view === "exec" ? <ExecView api={api} /> : <AnalystView api={api} />}
          </ErrorBoundary>
        </main>

        {panelOpen ? (
          <aside className="hidden lg:block">
            <div
              className="sticky"
              style={{ top: HEADER_H + 24, height: `calc(100vh - ${HEADER_H + 48}px)` }}
            >
              <ErrorBoundary label="The assistant">
                <AssistantPanel onFollowCitation={followCitation} />
              </ErrorBoundary>
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
