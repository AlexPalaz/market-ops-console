import * as React from "react";
import { cn } from "cn";

/** Hairline field, 4px radius, signal border on focus, no glow. */
function Input({ className, type, ...props }: React.ComponentProps<"input">) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(
        "border-rule text-ink placeholder:text-ink-soft/80 hover:border-ink/40 focus-visible:border-signal focus-visible:ring-ring/40 aria-invalid:border-destructive aria-invalid:focus-visible:ring-destructive/30 h-8 w-full min-w-0 rounded-md border bg-transparent px-2.5 py-1 text-[13.5px] transition-colors outline-none file:inline-flex file:h-6 file:border-0 file:bg-transparent file:text-sm file:font-medium focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-45",
        className,
      )}
      {...props}
    />
  );
}

export { Input };
