import { screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { MarketsTable } from "../components/MarketsTable";

beforeEach(() => {
  vi.spyOn(globalThis, "fetch").mockResolvedValue(Response.json([]));
});

describe("MarketsTable", () => {
  it("lists markets in scope, sorts, filters and reports selection", async () => {
    const onSelect = vi.fn();
    renderWithProviders(
      <MarketsTable
        scope={{ regionId: "eu" }}
        period="2026-05"
        selectedMarketId="de"
        onSelectMarket={onSelect}
      />,
    );
    const rows = () => within(screen.getByRole("table")).getAllByRole("row").slice(1);
    expect(rows()).toHaveLength(5);
    // Default sort: revenue desc.
    expect(rows()[0]).toHaveTextContent("United Kingdom");
    expect(screen.getByRole("button", { name: "Germany" })).toHaveAttribute("aria-current", "true");

    await userEvent.click(screen.getByRole("button", { name: /Growth YoY/ }));
    expect(rows()[0]).toHaveTextContent("France");
    await userEvent.click(screen.getByRole("button", { name: /Growth YoY/ }));
    expect(rows()[0]).toHaveTextContent("Germany");

    await userEvent.click(screen.getByRole("button", { name: "Off track", pressed: false }));
    expect(rows()).toHaveLength(2);

    await userEvent.click(screen.getByRole("button", { name: "Spain" }));
    expect(onSelect).toHaveBeenCalledWith("es");
  });
});
