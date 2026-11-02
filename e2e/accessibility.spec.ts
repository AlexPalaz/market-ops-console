import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const SERIOUS = new Set(["serious", "critical"]);

async function audit(page: import("@playwright/test").Page) {
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const blocking = results.violations.filter((v) => SERIOUS.has(v.impact ?? ""));
  return blocking.map(
    (v) =>
      `${v.id} (${v.impact}): ${v.help} — ${v.nodes.length} nodes, e.g. ${v.nodes[0]?.target.join(" ")}`,
  );
}

test.describe("accessibility (axe, WCAG 2.1 AA, serious+critical)", () => {
  test("executive view", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /^Germany,/ })).toBeVisible();
    expect(await audit(page)).toEqual([]);
  });

  test("analyst view drilled into a market", async ({ page }) => {
    await page.goto("/?view=analyst&region=eu&market=de&period=2026-03");
    await expect(page.getByRole("grid", { name: /heat map/ })).toBeVisible();
    expect(await audit(page)).toEqual([]);
  });

  test("assistant with a finished answer", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("button", { name: "Markets at risk" }).click();
    await expect(page.getByText("High confidence", { exact: true })).toBeVisible({
      timeout: 20_000,
    });
    expect(await audit(page)).toEqual([]);
  });

  test("dark theme: executive and analyst views", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "dark" });
    await page.goto("/?region=eu&market=de&period=2026-03");
    await expect(page.getByRole("button", { name: /^Germany,/ })).toBeVisible();
    expect(await audit(page)).toEqual([]);
    await page.goto("/?view=analyst&region=apac");
    await expect(page.getByRole("grid", { name: /heat map/ })).toBeVisible();
    expect(await audit(page)).toEqual([]);
  });

  test("reduced motion is respected", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Portfolio");
    const duration = await page.evaluate(
      () => getComputedStyle(document.querySelector("[data-slot=button]")!).transitionDuration,
    );
    expect(["0.01ms", "1e-05s"]).toContain(duration);
  });
});
