import { act, renderHook, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createTestQueryClient, Providers, renderWithProviders } from "@/test/utils";
import { AlertsPanel } from "../components/AlertsPanel";
import { ALERTS_KEY, useAlerts, useCreateAlert } from "../hooks/useAlerts";
import type { Alert } from "../schemas/alertSchema";

vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() }, Toaster: () => null }));
import { toast } from "sonner";

const seed: Alert[] = [
  {
    id: "a1",
    createdAt: "2026-01-01",
    name: "Any market shrinking",
    scope: "portfolio",
    growthBelowPct: 0,
    severity: "critical",
    enabled: true,
  },
];

/** Stateful fetch mock: a tiny in-memory API. Writes resolve or fail after `delay`. */
function mockApi(write: { status: number }, delay = 30) {
  const db: Alert[] = seed.map((a) => ({ ...a }));
  return vi.spyOn(globalThis, "fetch").mockImplementation(async (input, init) => {
    const method = init?.method ?? "GET";
    if (method === "GET") return Response.json(db);
    await new Promise((r) => setTimeout(r, delay));
    if (write.status >= 400)
      return Response.json({ error: "Simulated persistence failure" }, { status: write.status });
    const body = JSON.parse(String(init?.body)) as Partial<Alert>;
    const last = String(input).split("/").pop();
    if (method === "POST") {
      const created = { ...body, id: "new-id", createdAt: "2026-02-02" } as Alert;
      db.push(created);
      return Response.json(created, { status: 201 });
    }
    const i = db.findIndex((a) => a.id === last);
    db[i] = { ...db[i]!, ...body };
    return Response.json(db[i]);
  });
}

beforeEach(() => vi.mocked(toast.error).mockClear());

describe("optimistic alert mutations", () => {
  it("create: shows the new alert immediately, then rolls back and toasts on failure", async () => {
    mockApi({ status: 500 }, 300);
    const qc = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Providers queryClient={qc}>{children}</Providers>
    );
    const { result } = renderHook(() => ({ list: useAlerts(), create: useCreateAlert() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));

    act(() => {
      result.current.create.mutate({
        name: "fail me",
        scope: "portfolio",
        growthBelowPct: 5,
        severity: "info",
        enabled: true,
      });
    });
    await waitFor(() => expect(qc.getQueryData<Alert[]>(ALERTS_KEY)).toHaveLength(2));
    expect(qc.getQueryData<Alert[]>(ALERTS_KEY)?.[1]?.id).toMatch(/^optimistic-/);

    await waitFor(() => expect(result.current.create.isError).toBe(true));
    await waitFor(() => expect(qc.getQueryData<Alert[]>(ALERTS_KEY)).toHaveLength(1));
    expect(toast.error).toHaveBeenCalledWith(
      "Alert not saved",
      expect.objectContaining({ description: "Simulated persistence failure" }),
    );
  });

  it("create: replaces the optimistic row with the saved one on success", async () => {
    mockApi({ status: 201 }, 300);
    const qc = createTestQueryClient();
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <Providers queryClient={qc}>{children}</Providers>
    );
    const { result } = renderHook(() => ({ list: useAlerts(), create: useCreateAlert() }), {
      wrapper,
    });
    await waitFor(() => expect(result.current.list.data).toHaveLength(1));
    act(() => {
      result.current.create.mutate({
        name: "Watch LATAM",
        scope: "region",
        targetId: "latam",
        attainmentBelowPct: 100,
        severity: "warning",
        enabled: true,
      });
    });
    await waitFor(() =>
      expect(
        qc.getQueryData<Alert[]>(ALERTS_KEY)?.some((a) => a.id.startsWith("optimistic-")),
      ).toBe(true),
    );
    await waitFor(() => expect(result.current.create.isSuccess).toBe(true));
    await waitFor(() =>
      expect(qc.getQueryData<Alert[]>(ALERTS_KEY)?.map((a) => a.id)).toEqual(["a1", "new-id"]),
    );
    expect(qc.isFetching()).toBeGreaterThanOrEqual(0);
  });

  it("panel toggle: flips immediately and restores on failure", async () => {
    mockApi({ status: 500 }, 200);
    renderWithProviders(<AlertsPanel period="2026-05" onSelectMarket={vi.fn()} />);
    const toggle = await screen.findByRole("switch", { name: "Disable Any market shrinking" });
    expect(toggle).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText(/1 rule triggered/)).toBeInTheDocument();

    await userEvent.click(toggle);
    expect(screen.getByRole("switch", { name: "Enable Any market shrinking" })).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(screen.getByText(/No rule is triggered/)).toBeInTheDocument();

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith("Change not saved", expect.anything()),
    );
    await waitFor(() =>
      expect(screen.getByRole("switch", { name: "Disable Any market shrinking" })).toHaveAttribute(
        "aria-checked",
        "true",
      ),
    );
    expect(screen.getByText(/1 rule triggered/)).toBeInTheDocument();
  });
});
