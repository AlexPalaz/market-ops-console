import type { Confidence } from "@/domain/types";
import { cn } from "@/lib/utils";

const META: Record<Confidence, { label: string; dot: string }> = {
  high: { label: "High confidence", dot: "bg-status-on-track" },
  medium: { label: "Medium confidence", dot: "bg-status-at-risk" },
  low: { label: "Low confidence", dot: "bg-status-off-track" },
};

/**
 * Three documented levels as an eyebrow with a coloured dot. No percentage:
 * the contract does not carry one and inventing precision would mislead.
 */
export function ConfidenceBadge({
  confidence,
  className,
}: {
  confidence: Confidence;
  className?: string;
}) {
  const { label, dot } = META[confidence];
  return (
    <span className={cn("eyebrow text-ink inline-flex items-center gap-1.5", className)}>
      <span className={cn("size-1.5 rounded-full", dot)} aria-hidden />
      {label}
    </span>
  );
}
