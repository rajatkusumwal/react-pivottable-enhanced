import type { AggregatorName, PivotRow, PivotValue } from "./types";

export type AggregatorFn = (rows: PivotRow[], field: string) => number | null;

const nums = (rows: PivotRow[], field: string): number[] =>
  rows.map((r) => Number(r[field])).filter((n) => Number.isFinite(n));

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

/** Register a custom aggregation function usable by both engines. */
export function registerAggregator(name: string, fn: AggregatorFn, label = name) {
  aggregators[name] = fn;
  aggregatorLabels[name] = label;
}

export function aggregate(
  name: AggregatorName,
  rows: PivotRow[],
  field: string,
): number | null {
  const fn = aggregators[name] ?? aggregators["sum"];
  if (!rows.length || !fn) return null;
  return fn(rows, field);
}
