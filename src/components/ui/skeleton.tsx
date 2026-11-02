import { cn } from "cn";

/** Warm muted block, 4px radius, slow pulse. */
function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      className={cn("bg-muted animate-pulse rounded-md [animation-duration:1.6s]", className)}
      {...props}
    />
  );
}

export { Skeleton };
