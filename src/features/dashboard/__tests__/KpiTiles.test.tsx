import { screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { KpiTiles } from "../components/KpiTiles";

describe("KpiTiles", () => {
  it("shows Germany's March 2026 figures recomputed from the series", () => {
    renderWithProviders(<KpiTiles scope={{ marketId: "de" }} period="2026-03" />);
    const list = screen.getByRole("list", { name: "Headline KPIs" });
    expect(list).toHaveTextContent("Revenue · Mar 2026");
    expect(list).toHaveTextContent("$1.2M");
    expect(list).toHaveTextContent("-31.0%");
    expect(list).toHaveTextContent("92.2%");
    expect(list).toHaveTextContent("5 of 5");
    expect(list).toHaveTextContent("2 off track · 3 at risk · 0 on track");
    expect(list).toHaveTextContent("-27.2%");
  });

  it("aggregates the portfolio at the latest period", () => {
    renderWithProviders(<KpiTiles scope={{}} period="2026-05" />);
    const list = screen.getByRole("list", { name: "Headline KPIs" });
    expect(list).toHaveTextContent("$22.9M");
    expect(list).toHaveTextContent("6 of 13");
  });
});
