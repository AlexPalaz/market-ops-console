"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

/** Route-level error boundary: last line of defence for the whole page. */
export default function RouteError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-center gap-3 p-6 text-center">
      <h1 className="text-lg font-semibold">Something went wrong</h1>
      <p className="text-muted-foreground text-sm">
        The console hit an unexpected error. Reloading usually fixes it; if it keeps happening, the
        URL may point at a state we could not render.
      </p>
      {error.digest ? (
        <p className="text-muted-foreground font-mono text-xs">ref {error.digest}</p>
      ) : null}
      <div className="flex gap-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="outline" asChild>
          <Link href="/">Reset view</Link>
        </Button>
      </div>
    </main>
  );
}
