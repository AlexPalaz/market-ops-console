import { Suspense } from "react";
import { DashboardShell } from "@/features/dashboard/components/DashboardShell";

/**
 * Rendered on demand so a shared deep link (?market=de&period=2026-03) comes
 * back from the server already drilled in, instead of a Suspense fallback
 * that the client then replaces. The dataset is bundled, so the cost is one
 * cheap render per request.
 */
export const dynamic = "force-dynamic";

export default function HomePage() {
  return (
    <Suspense fallback={null}>
      <DashboardShell />
    </Suspense>
  );
}
