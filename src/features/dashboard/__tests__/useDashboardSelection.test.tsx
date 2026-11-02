import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Providers } from "@/test/utils";
import { useDashboardSelection } from "../hooks/useDashboardSelection";

function setup(searchParams = "") {
  const onUrlUpdate = vi.fn();
  const hook = renderHook(() => useDashboardSelection(), {
    wrapper: ({ children }) => (
      <Providers searchParams={searchParams} onUrlUpdate={onUrlUpdate}>
        {children}
      </Providers>
    ),
  });
  const lastUrl = () => {
    const call = onUrlUpdate.mock.calls.at(-1)?.[0] as
      { searchParams: URLSearchParams } | undefined;
    return call ? call.searchParams.toString() : "";
  };
  return { ...hook, onUrlUpdate, lastUrl };
}

describe("useDashboardSelection", () => {
  it("reads a coherent selection from the URL and ignores invalid params", () => {
    const { result } = setup(
      "?view=analyst&region=na&market=de&period=2031-01&metric=bogus&compare=de,nope",
    );
    expect(result.current.selection).toEqual({
      view: "analyst",
      scope: { regionId: "eu", marketId: "de" },
      period: "2026-05",
      metric: "revenue",
      compare: ["de"],
    });
  });

  it("selecting a market writes its region too, and clearing keeps the region", async () => {
    const { result, lastUrl } = setup();
    await act(async () => result.current.selectMarket("br"));
    await waitFor(() => expect(lastUrl()).toBe("region=latam&market=br"));
    await act(async () => result.current.selectMarket(null));
    await waitFor(() => expect(lastUrl()).toBe("region=latam"));
  });

  it("focus writes scope and period in one update and omits the latest period", async () => {
    const { result, lastUrl, onUrlUpdate } = setup();
    await act(async () => result.current.focus({ marketId: "de" }, "2026-03"));
    await waitFor(() => expect(lastUrl()).toBe("region=eu&market=de&period=2026-03"));
    const before = onUrlUpdate.mock.calls.length;
    await act(async () => result.current.setPeriod("2026-05"));
    await waitFor(() => expect(lastUrl()).toBe("region=eu&market=de"));
    expect(onUrlUpdate.mock.calls.length).toBe(before + 1);
  });

  it("uses push history for drills and replace for presentation changes", async () => {
    const { result, onUrlUpdate } = setup();
    await act(async () => result.current.selectRegion("eu"));
    await waitFor(() => expect(onUrlUpdate).toHaveBeenCalled());
    expect(
      (onUrlUpdate.mock.calls.at(-1)?.[0] as { options: { history: string } }).options.history,
    ).toBe("push");
    const n = onUrlUpdate.mock.calls.length;
    await act(async () => result.current.setView("analyst"));
    await waitFor(() => expect(onUrlUpdate.mock.calls.length).toBe(n + 1));
    expect(
      (onUrlUpdate.mock.calls.at(-1)?.[0] as { options: { history: string } }).options.history,
    ).toBe("replace");
  });

  it("toggles compare ids and caps them at six", async () => {
    const { result, lastUrl } = setup("?compare=de,cn");
    await act(async () => result.current.toggleCompare("cn"));
    await waitFor(() => expect(lastUrl()).toBe("compare=de"));
    await act(async () => result.current.setCompare(["us", "ca", "de", "gb", "fr", "it", "es"]));
    expect(result.current.selection.compare).toHaveLength(6);
  });
});
