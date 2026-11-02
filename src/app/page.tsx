import { Suspense } from "react";
import { DashboardShell } from "@/features/dashboard/components/DashboardShell";

export default function HomePage() {
  // useSearchParams (via nuqs) needs a Suspense boundary on a static page.
  return (
    <Suspense fallback={null}>
      <DashboardShell />
    </Suspense>
  );
}
