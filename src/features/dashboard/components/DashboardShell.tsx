"use client";

import { useState } from "react";
import { MessageSquareTextIcon, PanelRightCloseIcon, PanelRightOpenIcon } from "lucide-react";
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

const HEADER_H = 49;

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

  const followCitation = (c: ResolvedCitation) => {
    focus(c.scope, c.period);
    setSheetOpen(false);
    document.getElementById("main")?.scrollIntoView({ block: "start", behavior: "auto" });
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header
        className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-20 border-b backdrop-blur"
        style={{ height: HEADER_H }}
      >
        <div className="mx-auto flex h-full w-full max-w-[1800px] flex-wrap items-center gap-x-4 gap-y-2 px-4">
          <div className="flex min-w-0 items-baseline gap-2">
            <span className="text-sm font-semibold tracking-tight">Market Ops Console</span>
            <span className="text-muted-foreground hidden text-xs sm:inline">
              Data as of {formatPeriodLong(index.latestPeriod)}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <PeriodSelect value={selection.period} onChange={setPeriod} />
            <ViewToggle value={selection.view} onChange={setView} />
            <Button
              variant="outline"
              size="sm"
              className="hidden lg:inline-flex"
              aria-pressed={panelOpen}
              onClick={() => setPanelOpen((v) => !v)}
            >
              {panelOpen ? <PanelRightCloseIcon aria-hidden /> : <PanelRightOpenIcon aria-hidden />}
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
                  <AssistantPanel onFollowCitation={followCitation} />
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

        {panelOpen ? (
          <aside className="hidden lg:block">
            <div
              className="sticky"
              style={{ top: HEADER_H + 16, height: `calc(100vh - ${HEADER_H + 32}px)` }}
            >
              <AssistantPanel onFollowCitation={followCitation} />
            </div>
          </aside>
        ) : null}
      </div>
    </div>
  );
}
