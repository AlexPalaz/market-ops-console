"use client";

import { Component, type ErrorInfo, type ReactNode } from "react";
import { RotateCcwIcon, TriangleAlertIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  /** Short name of the area, used in the fallback message. */
  label: string;
  children: ReactNode;
  onError?: (error: Error, info: ErrorInfo) => void;
}

interface State {
  error: Error | null;
}

/**
 * Isolates a failing area (one chart, the assistant panel) so the rest of the
 * console keeps working. Reset re-mounts the children.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
    if (process.env.NODE_ENV !== "production")
      console.error(`[${this.props.label}]`, error, info.componentStack);
  }

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div
        role="alert"
        className="border-destructive/40 bg-destructive/5 flex h-full min-h-32 flex-col items-center justify-center gap-2 rounded-md border p-4 text-center text-sm"
      >
        <TriangleAlertIcon className="text-destructive size-5" aria-hidden />
        <p className="font-medium">{this.props.label} could not be displayed.</p>
        <p className="text-muted-foreground text-xs">{this.state.error.message}</p>
        <Button size="sm" variant="outline" onClick={() => this.setState({ error: null })}>
          <RotateCcwIcon aria-hidden />
          Try again
        </Button>
      </div>
    );
  }
}
