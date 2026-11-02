import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/** Eyebrow-style badge: small caps text, hairline, coloured dot via variant. */
const badgeVariants = cva(
  "inline-flex h-5 w-fit shrink-0 items-center gap-1.5 rounded-sm border px-1.5 text-[10.5px] font-semibold tracking-[0.06em] whitespace-nowrap uppercase transition-colors before:size-1.5 before:shrink-0 before:rounded-full before:content-[''] [&>svg]:size-3",
  {
    variants: {
      variant: {
        default: "border-ink bg-ink text-paper before:hidden",
        secondary: "border-rule bg-muted text-ink before:hidden",
        outline: "border-rule bg-transparent text-ink before:bg-ink-soft",
        destructive:
          "border-status-off-track/40 bg-transparent text-ink before:bg-status-off-track",
        warning: "border-status-at-risk/40 bg-transparent text-ink before:bg-status-at-risk",
        success: "border-status-on-track/40 bg-transparent text-ink before:bg-status-on-track",
        ghost: "border-transparent bg-transparent text-ink-soft before:hidden",
        link: "border-transparent bg-transparent text-signal-ink underline-offset-4 before:hidden hover:underline",
      },
    },
    defaultVariants: { variant: "outline" },
  },
);

function Badge({
  className,
  variant = "outline",
  asChild = false,
  ...props
}: React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants };
