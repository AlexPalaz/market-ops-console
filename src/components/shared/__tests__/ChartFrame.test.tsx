import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ChartFrame } from "../ChartFrame";

describe("ChartFrame", () => {
  it("labels the group, exposes the table to screen readers and toggles to it", async () => {
    render(
      <ChartFrame
        title="Revenue trend"
        description="Monthly revenue"
        summary="Revenue rose 10%."
        table={
          <table>
            <caption>Revenue table</caption>
            <tbody>
              <tr>
                <td>1</td>
              </tr>
            </tbody>
          </table>
        }
      >
        <svg data-testid="chart" />
      </ChartFrame>,
    );
    const group = screen.getByRole("group", { name: "Revenue trend" });
    expect(group).toHaveAccessibleDescription("Monthly revenue");
    expect(screen.getByText("Revenue rose 10%.")).toHaveClass("sr-only");
    // Chart visible and in the accessibility tree; table available to assistive tech too.
    expect(screen.getByTestId("chart").closest("[aria-hidden]")).toBeNull();
    expect(screen.getByText("Revenue table").closest(".sr-only")).not.toBeNull();

    await userEvent.click(screen.getByRole("button", { name: "View as table" }));
    expect(screen.queryByTestId("chart")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "View as chart" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("renders no toggle when there is no table", () => {
    render(
      <ChartFrame title="Plain">
        <div>chart</div>
      </ChartFrame>,
    );
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
  });
});
