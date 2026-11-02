"use client";

import { useId, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { ErrorBoundary } from "./ErrorBoundary";

export interface SectionProps {
  title: string;
  /** Two-digit running number shown as an eyebrow, e.g. "02". */
  index?: string;
  /** One sentence explaining what the block shows and how to read it. */
  description?: string;
  /** Controls rendered in the header (metric pickers, toggles). */
  actions?: ReactNode;
  children: ReactNode;
  /**
   * The accessible equivalent: a real <table> with the same data. When given,
   * a "Table" toggle is rendered and the table is also exposed to assistive
   * tech while the chart is shown. The chart is never aria-hidden.
   */
  table?: ReactNode;
  /** Short text summary for screen readers. */
  summary?: string;
  /** Fixed height for the content area so toggling views causes no layout shift. */
  minHeight?: number;
  /** Stretch to the parent's height and let the content fill it. */
  fill?: boolean;
  /** Draw the ink rule above the header (default) or not, for nested use. */
  rule?: boolean;
  className?: string;
}

/**
 * The editorial block that replaces the card: an ink rule, a numbered eyebrow,
 * a title and a description, then content directly on the paper.
 */
export function Section({
  title,
  index,
  description,
  actions,
  children,
  table,
  summary,
  minHeight = 280,
  fill = false,
  rule = true,
  className,
}: SectionProps) {
  const [showTable, setShowTable] = useState(false);
  const headingId = useId();
  const descId = useId();

  return (
    <section
      className={cn(
        "flex flex-col gap-3",
        rule && "border-ink border-t pt-3",
        fill && "h-full",
        className,
      )}
      role="group"
      aria-labelledby={headingId}
      aria-describedby={description ? descId : undefined}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h2
            id={headingId}
            className="text-ink flex items-baseline gap-2 text-[15px] leading-tight font-medium"
          >
            {index ? (
              <span className="eyebrow numeral font-mono" aria-hidden>
                {index}
              </span>
            ) : null}
            {title}
          </h2>
          {description ? (
            <p id={descId} className="text-ink-soft mt-1 max-w-prose text-[12.5px]">
              {description}
            </p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {actions}
          {table ? (
            <button
              type="button"
              aria-pressed={showTable}
              aria-label={showTable ? "View as chart" : "View as table"}
              onClick={() => setShowTable((v) => !v)}
              className="eyebrow hover:text-ink focus-visible:ring-ring aria-pressed:text-signal-ink rounded-sm px-1 py-0.5 transition-colors focus-visible:ring-2 focus-visible:outline-none"
            >
              {showTable ? "Chart" : "Table"}
            </button>
          ) : null}
        </div>
      </header>
      <div className={cn("relative", fill && "flex min-h-0 flex-1 flex-col")}>
        {summary ? <p className="sr-only">{summary}</p> : null}
        <div
          style={{ minHeight }}
          className={cn("relative", fill && "flex min-h-0 flex-1 flex-col")}
        >
          <ErrorBoundary label={title}>
            {showTable && table ? (
              <div className="overflow-auto">{table}</div>
            ) : (
              <>
                <div className={cn(fill && "min-h-0 flex-1")}>{children}</div>
                {table ? (
                  <div className="sr-only [&_[data-slot=table-container]]:overflow-visible">
                    {table}
                  </div>
                ) : null}
              </>
            )}
          </ErrorBoundary>
        </div>
      </div>
    </section>
  );
}
