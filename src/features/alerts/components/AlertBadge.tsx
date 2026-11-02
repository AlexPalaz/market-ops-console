import { BellIcon } from "lucide-react";
import type { AlertHit } from "@/domain/selectors";

/** Small inline marker for a market with triggered alerts: thin bell + count in mono. */
export function AlertBadge({ hits }: { hits: AlertHit[] | undefined }) {
  if (!hits?.length) return null;
  const title = hits.map((h) => `${h.alert.name}: ${h.reasons.join("; ")}`).join("\n");
  return (
    <span
      className="numeral border-status-off-track/40 text-ink inline-flex items-center gap-0.5 rounded-sm border px-1 text-[10.5px] leading-4"
      title={title}
      aria-label={`${hits.length} alert${hits.length > 1 ? "s" : ""} triggered`}
    >
      <BellIcon className="text-status-off-track size-2.5" aria-hidden strokeWidth={2} />
      {hits.length}
    </span>
  );
}
