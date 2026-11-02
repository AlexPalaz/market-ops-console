"use client";

import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Toggle as TogglePrimitive } from "radix-ui";

/**
 * Two toggle styles:
 * - `default`: text with a 2px signal underline when on (tabs, filters).
 * - `outline`: hairline chip that fills with ink when on (compare sets, metric pickers).
 */
const toggleVariants = cva(
  "inline-flex items-center justify-center gap-1 whitespace-nowrap font-medium transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default:
          "relative rounded-none border-b-2 border-transparent bg-transparent text-ink-soft hover:text-ink data-[state=on]:border-signal data-[state=on]:text-ink aria-pressed:border-signal aria-pressed:text-ink",
        outline:
          "rounded-md border border-rule bg-transparent text-ink hover:border-ink/40 data-[state=on]:border-ink data-[state=on]:bg-ink data-[state=on]:text-paper aria-pressed:border-ink aria-pressed:bg-ink aria-pressed:text-paper",
      },
      size: {
        default: "h-8 px-2.5 text-[13px]",
        sm: "h-7 px-2 text-[12.5px]",
        lg: "h-9 px-3 text-[13.5px]",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Toggle({
  className,
  variant = "default",
  size = "default",
  ...props
}: React.ComponentProps<typeof TogglePrimitive.Root> & VariantProps<typeof toggleVariants>) {
  return (
    <TogglePrimitive.Root
      data-slot="toggle"
      className={cn(toggleVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Toggle, toggleVariants };
