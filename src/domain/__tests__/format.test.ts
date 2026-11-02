import { describe, expect, it } from "vitest";
import {
  formatCompact,
  formatCurrency,
  formatCurrencyExact,
  formatPercent,
  formatPeriod,
  formatPeriodLong,
} from "@/domain/format";

describe("format", () => {
  it("formats currency compactly and exactly", () => {
    expect(formatCurrency(1676586)).toBe("$1.7M");
    expect(formatCurrency(950)).toBe("$950");
    expect(formatCurrencyExact(1676586)).toBe("$1,676,586");
    expect(formatCurrency(1234, { currency: "EUR" })).toBe("€1.2K");
  });
  it("formats compact numbers", () => {
    expect(formatCompact(1234567)).toBe("1.2M");
  });
  it("formats percent points with optional sign and null safety", () => {
    expect(formatPercent(10)).toBe("10.0%");
    expect(formatPercent(10, { signed: true })).toBe("+10.0%");
    expect(formatPercent(-9.7, { signed: true })).toBe("-9.7%");
    expect(formatPercent(0, { signed: true })).toBe("0.0%");
    expect(formatPercent(null)).toBe("—");
  });
  it("formats periods", () => {
    expect(formatPeriod("2026-03")).toBe("Mar 2026");
    expect(formatPeriodLong("2026-03")).toBe("March 2026");
    expect(formatPeriod("garbage")).toBe("garbage");
  });
});
