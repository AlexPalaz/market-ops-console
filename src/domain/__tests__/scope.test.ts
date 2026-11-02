import { describe, expect, it } from "vitest";
import { dataIndex as index } from "@/data";
import { levelOf, normalizeScope, scopeBreadcrumbs, scopeLabel } from "@/domain/selectors";

describe("scope", () => {
  it("derives the level from the deepest id", () => {
    expect(levelOf({})).toBe("portfolio");
    expect(levelOf({ regionId: "eu" })).toBe("region");
    expect(levelOf({ regionId: "eu", marketId: "de" })).toBe("market");
    expect(levelOf({ marketId: "de", productId: "veltrix" })).toBe("product");
  });

  it("keeps a scope coherent with the hierarchy", () => {
    expect(normalizeScope(index, { marketId: "de" })).toEqual({ regionId: "eu", marketId: "de" });
    expect(normalizeScope(index, { regionId: "na", marketId: "de" })).toEqual({
      regionId: "eu",
      marketId: "de",
    });
    expect(
      normalizeScope(index, { regionId: "nope", marketId: "nope", productId: "nope" }),
    ).toEqual({});
    expect(normalizeScope(index, { productId: "calyx" })).toEqual({ productId: "calyx" });
  });

  it("builds breadcrumbs and labels", () => {
    const crumbs = scopeBreadcrumbs(index, {
      regionId: "eu",
      marketId: "de",
      productId: "veltrix",
    });
    expect(crumbs.map((c) => c.label)).toEqual(["Portfolio", "Europe", "Germany", "Veltrix"]);
    expect(crumbs[1]?.scope).toEqual({ regionId: "eu" });
    expect(scopeLabel(index, { marketId: "de", productId: "veltrix" })).toBe("Germany · Veltrix");
    expect(scopeLabel(index, {})).toBe("Portfolio");
  });
});
