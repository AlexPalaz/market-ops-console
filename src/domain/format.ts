/**
 * Formatting for a multi-market audience. A single locale is used on purpose
 * so that every user of a shared link sees the same numbers; the locale is a
 * parameter so it can be made a user preference later.
 */
const DEFAULT_LOCALE = "en-US";

export interface FormatOptions {
  locale?: string;
  currency?: string;
}

/** 1234567 -> "$1.2M"; 950 -> "$950" */
export function formatCurrency(value: number, opts: FormatOptions = {}): string {
  const { locale = DEFAULT_LOCALE, currency = "USD" } = opts;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    notation: "compact",
    minimumFractionDigits: 0,
    maximumFractionDigits: 1,
  }).format(value);
}

/** Full precision currency for tables and tooltips: "$1,676,586" */
export function formatCurrencyExact(value: number, opts: FormatOptions = {}): string {
  const { locale = DEFAULT_LOCALE, currency = "USD" } = opts;
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(value);
}

/** 1234567 -> "1.2M" */
export function formatCompact(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(
    value,
  );
}

/** 5443 -> "5,443" */
export function formatInteger(value: number, locale = DEFAULT_LOCALE): string {
  return new Intl.NumberFormat(locale, { maximumFractionDigits: 0 }).format(value);
}

/**
 * Formats a value already expressed in percent points.
 * 10 -> "10.0%", -9.7 with signed -> "-9.7%", 10 with signed -> "+10.0%".
 */
export function formatPercent(
  value: number | null | undefined,
  opts: { signed?: boolean; digits?: number; locale?: string } = {},
): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  const { signed = false, digits = 1, locale = DEFAULT_LOCALE } = opts;
  return new Intl.NumberFormat(locale, {
    style: "percent",
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
    signDisplay: signed ? "exceptZero" : "auto",
  }).format(value / 100);
}

/** "2026-03" -> "Mar 2026" */
export function formatPeriod(period: string, locale = DEFAULT_LOCALE): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat(locale, {
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}

/** "2026-03" -> "March 2026" */
export function formatPeriodLong(period: string, locale = DEFAULT_LOCALE): string {
  const [y, m] = period.split("-").map(Number);
  if (!y || !m) return period;
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(y, m - 1, 1)));
}
