"use client";

import { useReportWebVitals } from "next/web-vitals";

/**
 * Client-side observability hook. Metrics go to the console in development
 * and, when NEXT_PUBLIC_VITALS_ENDPOINT is set, to that endpoint via
 * sendBeacon (fire-and-forget, survives page unload). Swap the sink for a
 * RUM vendor without touching the rest of the app.
 */
export function WebVitals() {
  useReportWebVitals((metric) => {
    const endpoint = process.env.NEXT_PUBLIC_VITALS_ENDPOINT;
    if (endpoint && typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon(
        endpoint,
        JSON.stringify({ ...metric, page: location.pathname, ts: Date.now() }),
      );
    } else if (process.env.NODE_ENV !== "production") {
      console.debug(`[web-vitals] ${metric.name}: ${Math.round(metric.value)} (${metric.rating})`);
    }
  });
  return null;
}
