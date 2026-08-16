import { aggregate } from "./aggregators";
import type { PivotConfig, PivotRow, ValueDef } from "./types";

export interface ChartPoint {
  name: string;
  [series: string]: string | number;
}

/**
 * Builds chart series from the same rows the grid uses:
 * first row field = category axis, first column field = series split.
 */
export function buildChartData(rows: PivotRow[], config: PivotConfig): {
  data: ChartPoint[];
  series: string[];
} {
  const value: ValueDef | undefined = config.values[0];
  if (!value) return { data: [], series: [] };
  const rowField = config.rows[0];
  const colField = config.cols[0];

  const categories = rowField
    ? [...new Set(rows.map((r) => String(r[rowField] ?? "")))].sort()
    : ["All"];
  const series = colField
    ? [...new Set(rows.map((r) => String(r[colField] ?? "")))].sort()
    : [value.caption ?? value.field];

  const data = categories.map((category) => {
    const inCategory = rowField
      ? rows.filter((r) => String(r[rowField] ?? "") === category)
      : rows;
    const point: ChartPoint = { name: category };
    for (const s of series) {
      const subset = colField ? inCategory.filter((r) => String(r[colField] ?? "") === s) : inCategory;
      point[s] = aggregate(value.aggregator, subset, value.field) ?? 0;
    }
    return point;
  });

  return { data, series };
}

export interface DrillSelection {
  rowField?: string | undefined;
  rowValue?: string | undefined;
  colField?: string | undefined;
  colValue?: string | undefined;
}

/** Records behind a single cell — the drill-through data set. */
export function drillThroughRows(rows: PivotRow[], selection: DrillSelection): PivotRow[] {
  return rows.filter((r) => {
    if (selection.rowField && String(r[selection.rowField] ?? "") !== selection.rowValue) return false;
    if (selection.colField && String(r[selection.colField] ?? "") !== selection.colValue) return false;
    return true;
  });
}

/** Grand total for one value definition, used by "% of grand total". */
export function grandTotal(rows: PivotRow[], value: ValueDef): number | null {
  const total = aggregate(value.aggregator, rows, value.field, value.type);
  return typeof total === "number" ? total : null;
}


export function applyDisplayMode(
  raw: number | null,
  ctx: { grand: number | null; rowTotal: number | null; colTotal: number | null; running: number },
  mode: ValueDef["displayMode"],
): number | null {
  if (raw === null) return null;
  switch (mode) {
    case "percentOfGrandTotal":
      return ctx.grand ? (raw / ctx.grand) * 100 : null;
    case "percentOfRowTotal":
      return ctx.rowTotal ? (raw / ctx.rowTotal) * 100 : null;
    case "percentOfColumnTotal":
      return ctx.colTotal ? (raw / ctx.colTotal) * 100 : null;
    case "runningTotal":
      return ctx.running;
    case "index":
      return ctx.grand && ctx.rowTotal && ctx.colTotal
        ? (raw * ctx.grand) / (ctx.rowTotal * ctx.colTotal)
        : null;
    default:
      return raw;
  }
}
