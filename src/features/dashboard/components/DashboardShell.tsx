"use client";

import { useState } from "react";
import {
  ActivityIcon,
  MessageSquareTextIcon,
  PanelRightCloseIcon,
  SparklesIcon,
} from "lucide-react";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { StatusBadge } from "@/components/shared/StatusBadge";
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

const HEADER_H = 52;

/**
 * Application shell: header with audience view and period, the drill path,
 * the workspace, and the assistant as a side panel (desktop) or sheet (mobile).
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
        className="bg-background/90 supports-[backdrop-filter]:bg-background/75 sticky top-0 z-20 border-b backdrop-blur"
        style={{ minHeight: HEADER_H }}
      >
        <div
          aria-hidden
          className="from-primary h-0.5 w-full bg-gradient-to-r via-[oklch(0.65_0.15_200)] to-[oklch(0.7_0.17_320)]"
        />
        <div className="mx-auto flex min-h-[inherit] w-full max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4 py-1.5">
          <div className="flex min-w-0 items-center gap-2.5">
            <span
              aria-hidden
              className="bg-primary text-primary-foreground flex size-7 items-center justify-center rounded-lg shadow-sm"
            >
              <ActivityIcon className="size-4" />
            </span>
            <span className="text-sm font-semibold tracking-tight">Market Ops Console</span>
            <span className="bg-card text-muted-foreground hidden items-center gap-1.5 rounded-full border px-2 py-0.5 text-[11px] sm:inline-flex">
              <span className="bg-status-on-track size-1.5 rounded-full" aria-hidden />
              Data as of {formatPeriodLong(index.latestPeriod)}
            </span>
          </div>
          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            <PeriodSelect value={selection.period} onChange={setPeriod} />
            <ViewToggle value={selection.view} onChange={setView} />
            <ThemeToggle />
            <Button
              variant={panelOpen ? "outline" : "default"}
              size="sm"
              className="hidden lg:inline-flex"
              aria-pressed={panelOpen}
              onClick={() => setPanelOpen((v) => !v)}
            >
              {panelOpen ? <PanelRightCloseIcon aria-hidden /> : <SparklesIcon aria-hidden />}
              Assistant
            </Button>
            <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="lg:hidden">
                  <MessageSquareTextIcon aria-hidden />
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
          "mx-auto grid w-full max-w-[1800px] flex-1 gap-4 px-4 py-4",
          panelOpen && "lg:grid-cols-[minmax(0,1fr)_400px]",
        )}
      >
        <main id="main" className="min-w-0">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
            <div>
              <ScopeBreadcrumbs scope={selection.scope} onNavigate={goTo} />
              <div className="mt-1 flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-semibold tracking-tight">
                  {scopeLabel(index, selection.scope)}
                </h1>
                {selectedMarket ? (
                  <>
                    <span className="numeral bg-card text-muted-foreground rounded-md border px-1.5 py-0.5 text-[11px]">
                      {selectedMarket.iso3}
                    </span>
                    <StatusBadge status={selectedMarket.kpis.status} />
                  </>
                ) : null}
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-xs">
              <span className="bg-card text-muted-foreground rounded-full border px-2 py-0.5">
                {selection.view === "exec" ? "Executive overview" : "Analyst deep-dive"}
              </span>
              <span className="numeral bg-card text-muted-foreground rounded-full border px-2 py-0.5">
                {formatPeriodLong(selection.period)}
              </span>
            </div>
          </div>

          <ErrorBoundary label="The dashboard">
            {selection.view === "exec" ? <ExecView api={api} /> : <AnalystView api={api} />}
          </ErrorBoundary>
        </main>

        {panelOpen ? (
          <aside className="hidden lg:block">
            <div
              className="sticky"
              style={{ top: HEADER_H + 16, height: `calc(100vh - ${HEADER_H + 32}px)` }}
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
