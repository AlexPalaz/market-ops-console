import { screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { renderWithProviders } from "@/test/utils";
import { AlertForm } from "../components/AlertForm";

describe("AlertForm", () => {
  it("blocks an empty submit with field-level errors tied to inputs", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<AlertForm onSubmit={onSubmit} />);
    await userEvent.click(screen.getByRole("button", { name: "Save alert" }));

    const name = screen.getByLabelText("Alert name");
    await waitFor(() => expect(name).toHaveAttribute("aria-invalid", "true"));
    expect(name).toHaveAccessibleDescription(/at least 3 characters/);
    expect(screen.getByLabelText("Growth YoY is below (%)")).toHaveAccessibleDescription(
      /at least one threshold/,
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits typed, coerced values when valid", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<AlertForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Alert name"), "Shrinking markets");
    await userEvent.type(screen.getByLabelText("Growth YoY is below (%)"), "2.5");
    await userEvent.click(screen.getByRole("button", { name: "Save alert" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0]?.[0]).toMatchObject({
      name: "Shrinking markets",
      scope: "portfolio",
      growthBelowPct: 2.5,
      attainmentBelowPct: undefined,
      severity: "warning",
      enabled: true,
    });
  });

  it("rejects out-of-range thresholds", async () => {
    const onSubmit = vi.fn();
    renderWithProviders(<AlertForm onSubmit={onSubmit} />);
    await userEvent.type(screen.getByLabelText("Alert name"), "Too high");
    await userEvent.type(screen.getByLabelText("Forecast attainment is below (%)"), "500");
    await userEvent.click(screen.getByRole("button", { name: "Save alert" }));
    await waitFor(() =>
      expect(screen.getByLabelText("Forecast attainment is below (%)")).toHaveAccessibleDescription(
        /cannot exceed 200%/,
      ),
    );
    expect(onSubmit).not.toHaveBeenCalled();
  });
});
