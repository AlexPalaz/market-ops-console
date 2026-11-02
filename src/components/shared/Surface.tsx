import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** A contained panel: hairline ink border on the surface colour. Used sparingly. */
export function Surface({
  className,
  children,
  ...props
}: React.ComponentProps<"div"> & { children?: ReactNode }) {
  return (
    <div
      className={cn("border-ink/15 bg-surface text-ink rounded-lg border", className)}
      {...props}
    >
      {children}
    </div>
  );
}
