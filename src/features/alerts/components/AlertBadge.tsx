import { BellRingIcon } from "lucide-react";
import type { AlertHit } from "@/domain/selectors";

/** Small inline marker for a market with triggered alerts. */
export function AlertBadge({ hits }: { hits: AlertHit[] | undefined }) {
  if (!hits?.length) return null;
  const title = hits.map((h) => `${h.alert.name}: ${h.reasons.join("; ")}`).join("\n");
  return (
    <span
      className="border-status-off-track/30 bg-status-off-track-soft text-status-off-track inline-flex items-center gap-0.5 rounded-md border px-1 py-0.5 text-[10px] font-medium"
      title={title}
      aria-label={`${hits.length} alert${hits.length > 1 ? "s" : ""} triggered`}
    >
      <BellRingIcon className="size-3" aria-hidden />
      {hits.length}
    </span>
  );
}
