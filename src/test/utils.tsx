import { render, type RenderOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { NuqsTestingAdapter, type OnUrlUpdateFunction } from "nuqs/adapters/testing";
import type { ReactElement, ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

export interface ProvidersOptions {
  searchParams?: string;
  onUrlUpdate?: OnUrlUpdateFunction;
  queryClient?: QueryClient;
}

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: Infinity }, mutations: { retry: false } },
  });
}

export function Providers({
  children,
  searchParams = "",
  onUrlUpdate,
  queryClient,
}: ProvidersOptions & { children: ReactNode }) {
  const qc = queryClient ?? createTestQueryClient();
  return (
    <NuqsTestingAdapter
      searchParams={searchParams}
      onUrlUpdate={onUrlUpdate}
      hasMemory
      rateLimitFactor={0}
    >
      <QueryClientProvider client={qc}>
        <TooltipProvider>{children}</TooltipProvider>
      </QueryClientProvider>
    </NuqsTestingAdapter>
  );
}

export function renderWithProviders(
  ui: ReactElement,
  opts: ProvidersOptions & Omit<RenderOptions, "wrapper"> = {},
) {
  const { searchParams, onUrlUpdate, queryClient, ...renderOpts } = opts;
  return render(ui, {
    wrapper: ({ children }) => (
      <Providers searchParams={searchParams} onUrlUpdate={onUrlUpdate} queryClient={queryClient}>
        {children}
      </Providers>
    ),
    ...renderOpts,
  });
}
