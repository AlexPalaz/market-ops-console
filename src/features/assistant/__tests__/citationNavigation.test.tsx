import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { useDashboardSelection } from "@/features/dashboard/hooks/useDashboardSelection";
import { renderWithProviders } from "@/test/utils";
import { EvidencePanel } from "../components/EvidencePanel";

/** Minimal harness: the real selection hook wired to the real evidence panel. */
function Harness() {
  const { selection, focus } = useDashboardSelection();
  return (
    <div>
      <p data-testid="scope">{JSON.stringify(selection.scope)}</p>
      <p data-testid="period">{selection.period}</p>
      <EvidencePanel
        citations={[
          { regionId: "apac", period: "2026-05", label: "APAC, latest period" },
          { marketId: "de", period: "2026-03", label: "Germany, March dip" },
        ]}
        onFollow={(c) => focus(c.scope, c.period)}
      />
    </div>
  );
}

describe("citation → dashboard", () => {
  it("following a citation focuses the dashboard scope and period through the URL", async () => {
    const onUrlUpdate = vi.fn();
    renderWithProviders(<Harness />, { searchParams: "?view=analyst", onUrlUpdate });
    expect(screen.getByTestId("scope")).toHaveTextContent("{}");

    await userEvent.click(
      screen.getByRole("button", { name: "Show Germany, March dip on the dashboard" }),
    );
    expect(screen.getByTestId("scope")).toHaveTextContent('{"regionId":"eu","marketId":"de"}');
    expect(screen.getByTestId("period")).toHaveTextContent("2026-03");
    const url = (onUrlUpdate.mock.calls.at(-1)?.[0] as { searchParams: URLSearchParams })
      .searchParams;
    expect(url.get("market")).toBe("de");
    expect(url.get("period")).toBe("2026-03");
    expect(url.get("view")).toBe("analyst");

    await userEvent.click(
      screen.getByRole("button", { name: "Show APAC, latest period on the dashboard" }),
    );
    expect(screen.getByTestId("scope")).toHaveTextContent('{"regionId":"apac"}');
    expect(screen.getByTestId("period")).toHaveTextContent("2026-05");
  });
});
