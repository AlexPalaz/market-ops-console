import { CircleCheckIcon, TriangleAlertIcon, OctagonXIcon } from "lucide-react";
import type { Status } from "@/domain/types";
import { cn } from "@/lib/utils";

export const STATUS_META: Record<
  Status,
  { label: string; Icon: typeof CircleCheckIcon; className: string; dot: string }
> = {
  on_track: {
    label: "On track",
    Icon: CircleCheckIcon,
    className: "bg-status-on-track-soft text-status-on-track border-status-on-track/30",
    dot: "bg-status-on-track",
  },
  at_risk: {
    label: "At risk",
    Icon: TriangleAlertIcon,
    className: "bg-status-at-risk-soft text-status-at-risk border-status-at-risk/30",
    dot: "bg-status-at-risk",
  },
  off_track: {
    label: "Off track",
    Icon: OctagonXIcon,
    className: "bg-status-off-track-soft text-status-off-track border-status-off-track/30",
    dot: "bg-status-off-track",
  },
};

/** Status is always icon + text + colour, never colour alone. */
export function StatusBadge({ status, className }: { status: Status; className?: string }) {
  const { label, Icon, className: tone } = STATUS_META[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
