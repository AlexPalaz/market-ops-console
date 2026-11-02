import { expect, test } from "@playwright/test";

test.describe("Market Ops Console", () => {
  test("drill down, ask the assistant, follow a citation back into the dashboard", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Portfolio");
    await expect(page.getByRole("list", { name: "Headline KPIs" })).toContainText("6 of 13");

    // 1. Drill into a market from the map (keyboard-reachable button).
    const germany = page.getByRole("button", { name: /^Germany,/ });
    await expect(germany).toBeVisible();
    await germany.click();
    await expect(page).toHaveURL(/region=eu/);
    await expect(page).toHaveURL(/market=de/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Germany");

    // 2. Up to the region through the breadcrumb: charts and KPIs follow.
    await page
      .getByRole("navigation", { name: "Drill path" })
      .getByRole("button", { name: "Europe" })
      .click();
    await expect(page).not.toHaveURL(/market=/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Europe");
    await expect(page.getByRole("list", { name: "Headline KPIs" })).toContainText("5 of 5");
    await expect(
      page.getByRole("group", { name: "Actual vs forecast vs prior year" }),
    ).toContainText("Europe, monthly revenue");

    // 3. Ask a supported question and watch it stream.
    await page
      .getByLabel("Ask about the portfolio")
      .fill("Why did Germany's revenue dip in March 2026?");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Generating…")).toBeVisible();
    await expect(page.getByRole("button", { name: "Stop generating" })).toBeVisible();
    await expect(page.getByText("High confidence", { exact: true })).toBeVisible({
      timeout: 20_000,
    });

    // 4. Citations resolved against the dataset.
    const evidence = page.getByRole("region", { name: "Evidence from the dataset" });
    await expect(evidence).toContainText("Germany, Mar 2026 (largest dip)");
    await expect(evidence).toContainText("-31.0% YoY");

    // 5. Follow one: the dashboard focuses that market and period.
    await evidence
      .getByRole("button", { name: "Show Germany, Mar 2026 (largest dip) on the dashboard" })
      .click();
    await expect(page).toHaveURL(/market=de/);
    await expect(page).toHaveURL(/period=2026-03/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Germany");
    await expect(page.getByRole("list", { name: "Headline KPIs" })).toContainText(
      "Revenue · Mar 2026",
    );
    await expect(page.getByRole("list", { name: "Headline KPIs" })).toContainText("-31.0%");

    // 6. Browser back restores the previous drill state.
    await page.goBack();
    await expect(page).not.toHaveURL(/market=/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Europe");
  });

  test("stop generation keeps the partial answer; abstain and error states render", async ({
    page,
  }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Full summary" }).click();
    await expect(page.getByText("Generating…")).toBeVisible();
    await page.waitForTimeout(800);
    await page.getByRole("button", { name: "Stop generating" }).click();
    await expect(page.getByText(/Stopped by you/)).toBeVisible();
    const article = page.getByRole("article").last();
    await expect(article).toContainText("Here's the portfolio");
    await expect(article).not.toContainText("In short");

    await page.getByRole("button", { name: "Next year?" }).click();
    await expect(page.getByText(/Can't be answered from this dataset/)).toBeVisible({
      timeout: 15_000,
    });

    await page.getByRole("button", { name: "Simulate error" }).click();
    await expect(
      page.getByRole("alert").filter({ hasText: "Simulated upstream failure" }),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "Retry" })).toBeVisible();
  });

  test("deep link renders the analyst view server-side and keyboard reaches the map", async ({
    page,
  }) => {
    await page.goto("/?view=analyst&region=eu&market=de&period=2026-03");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Germany");
    await expect(page.getByRole("grid", { name: /heat map/ })).toBeVisible();
    await expect(page.getByRole("gridcell", { name: "Germany, Mar 2026: -31.0%" })).toHaveAttribute(
      "aria-selected",
      "true",
    );

    // Heat map: arrow keys move focus, Enter selects.
    await page.getByRole("gridcell", { name: /^Germany, Jun 2024/ }).focus();
    await page.keyboard.press("ArrowRight");
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/market=gb/);
    await expect(page).toHaveURL(/period=2024-07/);

    // Map: a market is a focusable button.
    const spain = page.getByRole("button", { name: /^Spain,/ });
    await spain.focus();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/market=es/);

    // Every chart offers a table.
    const tableButtons = page.getByRole("button", { name: "View as table" });
    expect(await tableButtons.count()).toBeGreaterThanOrEqual(4);
    await tableButtons.first().click();
    await expect(page.getByRole("button", { name: "View as chart" })).toBeVisible();
  });

  test("alert form validates, saves optimistically and rolls back on failure", async ({ page }) => {
    await page.goto("/?view=analyst");
    await page.getByRole("button", { name: "New alert" }).click();
    const dialog = page.getByRole("dialog", { name: "New alert" });
    await dialog.getByRole("button", { name: "Save alert" }).click();
    await expect(dialog.getByLabel("Alert name")).toHaveAttribute("aria-invalid", "true");

    await dialog.getByLabel("Alert name").fill("fail e2e rollback");
    await dialog.getByLabel("Growth YoY is below (%)").fill("5");
    await dialog.getByRole("button", { name: "Save alert" }).click();

    await expect(page.getByText("saving…")).toBeVisible();
    await expect(page.getByText("fail e2e rollback")).toBeVisible();
    await expect(page.getByText("Alert not saved")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText("fail e2e rollback")).toHaveCount(0);
  });

  test("works at phone width with the assistant in a sheet", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Portfolio");
    const hasHorizontalScroll = await page.evaluate(
      () => document.documentElement.scrollWidth > window.innerWidth + 1,
    );
    expect(hasHorizontalScroll).toBe(false);
    await page.getByRole("button", { name: "Assistant" }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("dialog").getByLabel("Ask about the portfolio")).toBeVisible();
  });
});
