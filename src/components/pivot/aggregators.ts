import type { AggregatorName, FieldType, PivotRow, PivotValue } from "./types";

/** A cell can hold a number (numeric measures) or text (string/date/time measures). */
export type PivotCellValue = number | string | null;

export type AggregatorFn = (rows: PivotRow[], field: string) => PivotCellValue;

const nums = (rows: PivotRow[], field: string): number[] =>
  rows.map((r) => Number(r[field])).filter((n) => Number.isFinite(n));

/** Non-empty raw values as text, used by string / date / time measures. */
const texts = (rows: PivotRow[], field: string): string[] =>
  rows
    .map((r) => r[field])
    .filter((v: PivotValue) => v !== null && v !== undefined && v !== "")
    .map((v) => String(v));

function toNumberish(v: PivotValue): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

const varianceOf = (rows: PivotRow[], field: string): number | null => {
  const v = nums(rows, field);
  if (v.length < 2) return null;
  const m = v.reduce((a, b) => a + b, 0) / v.length;
  return v.reduce((a, b) => a + (b - m) ** 2, 0) / (v.length - 1);
};

export const aggregators: Record<string, AggregatorFn> = {
  sum: (rows, f) => nums(rows, f).reduce((a, b) => a + b, 0),
  count: (rows) => rows.length,
  distinctCount: (rows, f) => new Set(rows.map((r) => String(r[f]))).size,
  average: (rows, f) => {
    const v = nums(rows, f);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  },
  median: (rows, f) => {
    const v = nums(rows, f).sort((a, b) => a - b);
    if (!v.length) return null;
    const mid = Math.floor(v.length / 2);
    if (v.length % 2) return v[mid] ?? null;
    return ((v[mid - 1] ?? 0) + (v[mid] ?? 0)) / 2;
  },
  min: (rows, f) => {
    const v = nums(rows, f);
    return v.length ? Math.min(...v) : null;
  },
  max: (rows, f) => {
    const v = nums(rows, f);
    return v.length ? Math.max(...v) : null;
  },
  product: (rows, f) => {
    const v = nums(rows, f);
    return v.length ? v.reduce((a, b) => a * b, 1) : null;
  },
  variance: varianceOf,
  stdDev: (rows, f) => {
    const variance = varianceOf(rows, f);
    return variance === null ? null : Math.sqrt(variance);
  },
  first: (rows, f) => (rows.length ? toNumberish(rows[0]?.[f]) : null),
  last: (rows, f) => (rows.length ? toNumberish(rows[rows.length - 1]?.[f]) : null),
};

/**
 * Aggregations that also make sense for string, date and time measures.
 * ISO dates ("2024-03-01") and clock times ("09:30") compare correctly as text.
 */
export const textAggregators: Record<string, AggregatorFn> = {
  count: (rows) => rows.length,
  distinctCount: (rows, f) => new Set(rows.map((r) => String(r[f]))).size,
  min: (rows, f) => {
    const v = texts(rows, f).sort();
    return v.length ? (v[0] as string) : null;
  },
  max: (rows, f) => {
    const v = texts(rows, f).sort();
    return v.length ? (v[v.length - 1] as string) : null;
  },
  first: (rows, f) => texts(rows, f)[0] ?? null,
  last: (rows, f) => texts(rows, f).at(-1) ?? null,
};

export const aggregatorLabels: Record<string, string> = {
  sum: "Sum",
  count: "Count",
  distinctCount: "Distinct count",
  average: "Average",
  median: "Median",
  min: "Minimum",
  max: "Maximum",
  product: "Product",
  variance: "Variance",
  stdDev: "Standard deviation",
  first: "First",
  last: "Last",
};

/**
 * Aggregations offered for a field of the given type (drives the measure menus).
 * `allowed` restricts the list further, e.g. a field defined with
 * `aggregators: ["average", "min", "max"]` never offers Sum.
 */
export function aggregatorsForType(
  type: FieldType | undefined,
  allowed?: AggregatorName[] | undefined,
): AggregatorName[] {
  const all: AggregatorName[] =
    !type || type === "number" ? Object.keys(aggregators) : Object.keys(textAggregators);
  if (!allowed?.length) return all;
  const restricted = all.filter((name) => allowed.includes(name));
  return restricted.length ? restricted : all;
}

/** Register a custom aggregation function usable by both engines. */
export function registerAggregator(name: string, fn: AggregatorFn, label = name) {
  aggregators[name] = fn;
  aggregatorLabels[name] = label;
}

/**
 * Aggregates `field` over `rows`.
 *
 * `type` makes string / date / time measures work: those only support
 * count, distinct count, min, max, first and last, and return text.
 */
export function aggregate(
  name: AggregatorName,
  rows: PivotRow[],
  field: string,
  type: FieldType | undefined = "number",
): PivotCellValue {
  if (!rows.length) return null;
  if (type && type !== "number") {
    const custom = aggregators[name];
    const fn = textAggregators[name] ?? (custom && !(name in aggregators) ? custom : undefined);
    return fn ? fn(rows, field) : (textAggregators["count"] as AggregatorFn)(rows, field);
  }
  const fn = aggregators[name] ?? aggregators["sum"];
  return fn ? fn(rows, field) : null;
}
