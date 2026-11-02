import { ShieldCheckIcon, ShieldQuestionIcon, ShieldAlertIcon } from "lucide-react";
import type { Confidence } from "@/domain/types";
import { cn } from "@/lib/utils";

const META: Record<Confidence, { label: string; Icon: typeof ShieldCheckIcon; className: string }> =
  {
    high: {
      label: "High confidence",
      Icon: ShieldCheckIcon,
      className: "text-status-on-track border-status-on-track/40 bg-status-on-track-soft",
    },
    medium: {
      label: "Medium confidence",
      Icon: ShieldQuestionIcon,
      className: "text-status-at-risk border-status-at-risk/40 bg-status-at-risk-soft",
    },
    low: {
      label: "Low confidence",
      Icon: ShieldAlertIcon,
      className: "text-status-off-track border-status-off-track/40 bg-status-off-track-soft",
    },
  };

/**
 * Three documented levels, shown as a labelled badge. No percentage: the
 * contract does not carry one and inventing precision would mislead.
 */
export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const { label, Icon, className } = META[confidence];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      {label}
    </span>
  );
}
