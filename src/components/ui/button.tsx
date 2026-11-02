import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { Slot } from "radix-ui";

/**
 * Editorial buttons: 4px radius, ink fill for the default action, the signal
 * colour reserved for the one call to action on a surface, hairline outline
 * for secondary actions.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-1.5 rounded-md border text-[13px] font-medium whitespace-nowrap transition-colors duration-150 outline-none select-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:pointer-events-none disabled:opacity-45 aria-invalid:border-destructive [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-3.5",
  {
    variants: {
      variant: {
        default: "border-ink bg-ink text-paper hover:bg-ink/85",
        signal: "border-signal bg-signal text-paper hover:bg-signal/90",
        outline:
          "border-rule bg-transparent text-ink hover:border-ink/40 hover:bg-muted/60 aria-pressed:border-ink aria-pressed:bg-muted aria-expanded:bg-muted",
        secondary: "border-transparent bg-muted text-ink hover:bg-accent",
        ghost:
          "border-transparent bg-transparent text-ink hover:bg-muted/70 aria-expanded:bg-muted",
        destructive:
          "border-transparent bg-transparent text-destructive hover:bg-status-off-track-soft",
        link: "border-transparent bg-transparent text-signal-ink underline-offset-4 hover:underline",
      },
      size: {
        default: "h-8 px-3",
        xs: "h-6 px-2 text-[12px] [&_svg:not([class*='size-'])]:size-3",
        sm: "h-7 px-2.5 text-[12.5px]",
        lg: "h-9 px-3.5",
        icon: "size-8",
        "icon-xs": "size-6 [&_svg:not([class*='size-'])]:size-3",
        "icon-sm": "size-7",
        "icon-lg": "size-9",
      },
    },
    defaultVariants: { variant: "default", size: "default" },
  },
);

function Button({
  className,
  variant = "default",
  size = "default",
  asChild = false,
  ...props
}: React.ComponentProps<"button"> & VariantProps<typeof buttonVariants> & { asChild?: boolean }) {
  const Comp = asChild ? Slot.Root : "button";
  return (
    <Comp
      data-slot="button"
      data-variant={variant}
      data-size={size}
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  );
}

export { Button, buttonVariants };
