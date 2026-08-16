import { getLocale } from "./locales";
import type { NumberFormat } from "./types";

export function formatNumber(
  value: number | null | undefined,
  format: NumberFormat | undefined,
  locale: string,
): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return "";
  const { numberLocale } = getLocale(locale);
  const decimals = format?.decimals ?? 2;
  const options: Intl.NumberFormatOptions = {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: format?.thousandsSeparator ?? true,
  };
  if (format?.currency) {
    options.style = "currency";
    options.currency = format.currency;
  }
  const text = new Intl.NumberFormat(numberLocale, options).format(value);
  return `${format?.prefix ?? ""}${text}${format?.suffix ?? ""}`;
}

export function formatPercent(value: number | null, locale: string, decimals = 1): string {
  if (value === null || !Number.isFinite(value)) return "";
  return new Intl.NumberFormat(getLocale(locale).numberLocale, {
    style: "percent",
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}
