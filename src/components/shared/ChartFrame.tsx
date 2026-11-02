"use client";

import { useId, useState, type ReactNode } from "react";
import { TableIcon, BarChart3Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export interface ChartFrameProps {
  title: string;
  /** One sentence explaining what the chart shows and how to read it. */
  description?: string;
  /** Controls rendered in the header (metric pickers, toggles). */
  actions?: ReactNode;
  /** The visual chart. */
  children: ReactNode;
  /**
   * The accessible equivalent: a real <table> (or list) with the same data.
   * When provided, a "View as table" toggle is rendered and the table is also
   * available to screen readers while the chart is shown.
   */
  table?: ReactNode;
  /** Short text summary for screen readers, announced with the chart. */
  summary?: string;
  /** Fixed height for the chart area so switching views causes no layout shift. */
  minHeight?: number;
  className?: string;
}

/**
 * Every visualisation in the console lives inside a ChartFrame. It gives each
 * chart a heading, a description, a screen-reader summary and a toggle to the
 * tabular equivalent, so no information is conveyed by the picture alone.
 */
export function ChartFrame({
  title,
  description,
  actions,
  children,
  table,
  summary,
  minHeight = 280,
  className,
}: ChartFrameProps) {
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();
  const descId = useId();

  return (
    <Card
      className={cn("flex flex-col gap-3", className)}
      role="group"
      aria-labelledby={headingId}
      aria-describedby={description ? descId : undefined}
    >
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <CardTitle id={headingId} className="text-sm font-semibold">
            {title}
          </CardTitle>
          {description ? (
            <p id={descId} className="text-muted-foreground mt-0.5 text-xs">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {actions}
          {table ? (
            <Button
              variant="outline"
              size="sm"
              aria-pressed={showTable}
              onClick={() => setShowTable((v) => !v)}
            >
              {showTable ? <BarChart3Icon aria-hidden /> : <TableIcon aria-hidden />}
              {showTable ? "View as chart" : "View as table"}
            </Button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="flex-1">
        {summary ? <p className="sr-only">{summary}</p> : null}
        <div style={{ minHeight }} className="relative">
          {showTable && table ? (
            <div className="overflow-auto">{table}</div>
          ) : (
            <>
              <div aria-hidden={table ? true : undefined}>{children}</div>
              {table ? <div className="sr-only">{table}</div> : null}
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
