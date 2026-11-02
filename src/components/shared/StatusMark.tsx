import { CircleCheckIcon, TriangleAlertIcon, OctagonXIcon } from "lucide-react";
import type { Status } from "@/domain/types";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<
  Status,
  { label: string; Icon: typeof CircleCheckIcon; dot: string; className: string }
> = {
  on_track: {
    label: "On track",
    Icon: CircleCheckIcon,
    dot: "bg-status-on-track",
    className: "text-status-on-track",
  },
  at_risk: {
    label: "At risk",
    Icon: TriangleAlertIcon,
    dot: "bg-status-at-risk",
    className: "text-status-at-risk",
  },
  off_track: {
    label: "Off track",
    Icon: OctagonXIcon,
    dot: "bg-status-off-track",
    className: "text-status-off-track",
  },
};

/**
 * Status as a coloured dot plus ink text. Colour carries no information on
 * its own: the label is always present and the icon is exposed to screen
 * readers only, which keeps the text at full contrast on any background.
 */
export function StatusMark({
  status,
  size = "default",
  className,
}: {
  status: Status;
  size?: "default" | "sm";
  className?: string;
}) {
  const { label, Icon, dot } = STATUS_META[status];
  return (
    <span
      className={cn(
        "text-ink inline-flex items-center gap-1.5 font-medium whitespace-nowrap",
        size === "sm" ? "text-[12px]" : "text-[12.5px]",
        className,
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", dot)} aria-hidden />
      <Icon className="sr-only" aria-hidden />
      {label}
    </span>
  );
}
