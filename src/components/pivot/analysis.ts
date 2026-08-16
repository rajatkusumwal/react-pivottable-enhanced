import { aggregate } from "./aggregators";
import type { PivotConfig, PivotRow, ValueDef } from "./types";

export interface ChartPoint {
  name: string;
  [series: string]: string | number;
}

export interface ChartData {
  data: ChartPoint[];
  /** Series actually plotted (hidden ones removed). */
  series: string[];
  /** Every series available at this drill level, including hidden ones. */
  allSeries: string[];
  /** Field currently on the category axis (undefined when there are no row fields). */
  categoryField?: string | undefined;
  /** Field currently splitting the series (undefined when there are no column fields). */
  seriesField?: string | undefined;
  /** True when the axis can be expanded one level deeper. */
  canDrillCategory: boolean;
  /** True when the legend can be expanded one level deeper. */
  canDrillSeries: boolean;
  /** Members already drilled into on the axis. */
  categoryPath: string[];
  /** Members already drilled into on the legend. */
  seriesPath: string[];
}

/**
 * Builds chart series from the same rows the grid uses.
 *
 * The axis walks `config.rows` and the legend walks `config.cols`, one level at
 * a time: `config.chart.drillRows` / `drillCols` hold the members already
 * expanded, so `["West"]` on the axis means "show the second row field, filtered
 * to West" — the Flexmonster drillable axis/legend behaviour.
 * `config.chart.hiddenSeries` removes series from the plot (legend filtering)
 * without changing the report.
 */
export function buildChartData(rows: PivotRow[], config: PivotConfig): ChartData {
  const value: ValueDef | undefined = config.values[0];
  const categoryPath = config.chart.drillRows ?? [];
  const seriesPath = config.chart.drillCols ?? [];
  const hidden = config.chart.hiddenSeries ?? [];
  const empty: ChartData = {
    data: [],
    series: [],
    allSeries: [],
    canDrillCategory: false,
    canDrillSeries: false,
    categoryPath,
    seriesPath,
  };
  if (!value) return empty;

  // Restrict the rows to the drill path on both axes.
  let scoped = rows;
  categoryPath.forEach((member, level) => {
    const field = config.rows[level];
    if (field) scoped = scoped.filter((r) => String(r[field] ?? "") === member);
  });
  seriesPath.forEach((member, level) => {
    const field = config.cols[level];
    if (field) scoped = scoped.filter((r) => String(r[field] ?? "") === member);
  });

  const rowField = config.rows[Math.min(categoryPath.length, Math.max(config.rows.length - 1, 0))];
  const colField = config.cols[Math.min(seriesPath.length, Math.max(config.cols.length - 1, 0))];

  const categories = rowField
    ? [...new Set(scoped.map((r) => String(r[rowField] ?? "")))].sort()
    : ["All"];
  const allSeries = colField
    ? [...new Set(scoped.map((r) => String(r[colField] ?? "")))].sort()
    : [value.caption ?? value.field];
  const series = allSeries.filter((s) => !hidden.includes(s));

  const data = categories.map((category) => {
    const inCategory = rowField
      ? scoped.filter((r) => String(r[rowField] ?? "") === category)
      : scoped;
    const point: ChartPoint = { name: category };
    for (const s of series) {
      const subset = colField ? inCategory.filter((r) => String(r[colField] ?? "") === s) : inCategory;
      point[s] = aggregate(value.aggregator, subset, value.field) ?? 0;
    }
    return point;
  });

  return {
    data,
    series,
    allSeries,
    categoryField: rowField,
    seriesField: colField,
    canDrillCategory: categoryPath.length < config.rows.length - 1,
    canDrillSeries: seriesPath.length < config.cols.length - 1,
    categoryPath,
    seriesPath,
  };
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


/** Everything a "show values as" transform can reference for one cell. */
export interface DisplayModeContext {
  /** Grand total of the measure over the whole report. */
  grand: number | null;
  /** Total of the current row (all columns). */
  rowTotal: number | null;
  /** Total of the current column (all rows). */
  colTotal: number | null;
  /** Total of the parent row group; falls back to the row total. */
  parentRowTotal?: number | null;
  /** Total of the parent column group; falls back to the column total. */
  parentColTotal?: number | null;
  /** Running total accumulated across the row (left to right). */
  running: number;
  /** Running total accumulated down the column (top to bottom). */
  runningColumn?: number;
  /** Raw value of the previous cell in the same row. */
  prevInRow?: number | null;
  /** Raw value of the cell above in the same column. */
  prevInColumn?: number | null;
}

const ratio = (a: number, b: number | null | undefined) => (b ? (a / b) * 100 : null);
const diff = (a: number, prev: number | null | undefined) =>
  prev === null || prev === undefined ? null : a - prev;
const pctDiff = (a: number, prev: number | null | undefined) =>
  prev === null || prev === undefined || prev === 0 ? null : ((a - prev) / prev) * 100;

export function applyDisplayMode(
  raw: number | null,
  ctx: DisplayModeContext,
  mode: ValueDef["displayMode"],
): number | null {
  if (raw === null) return null;
  switch (mode) {
    case "percentOfGrandTotal":
      return ratio(raw, ctx.grand);
    case "percentOfRowTotal":
      return ratio(raw, ctx.rowTotal);
    case "percentOfColumnTotal":
      return ratio(raw, ctx.colTotal);
    case "percentOfParentRowTotal":
      return ratio(raw, ctx.parentRowTotal ?? ctx.rowTotal);
    case "percentOfParentColumnTotal":
      return ratio(raw, ctx.parentColTotal ?? ctx.colTotal);
    case "differenceOfRow":
      return diff(raw, ctx.prevInRow);
    case "differenceOfColumn":
      return diff(raw, ctx.prevInColumn);
    case "percentDifferenceOfRow":
      return pctDiff(raw, ctx.prevInRow);
    case "percentDifferenceOfColumn":
      return pctDiff(raw, ctx.prevInColumn);
    case "runningTotal":
    case "runningTotalOfRow":
      return ctx.running;
    case "runningTotalOfColumn":
      return ctx.runningColumn ?? raw;
    case "index":
      return ctx.grand && ctx.rowTotal && ctx.colTotal
        ? (raw * ctx.grand) / (ctx.rowTotal * ctx.colTotal)
        : null;
    default:
      return raw;
  }
}

/** Human labels for the "show values as" menu. */
export const displayModeLabels: Record<string, string> = {
  raw: "Actual value",
  percentOfGrandTotal: "% of grand total",
  percentOfRowTotal: "% of row",
  percentOfColumnTotal: "% of column",
  percentOfParentRowTotal: "% of parent row total",
  percentOfParentColumnTotal: "% of parent column total",
  differenceOfRow: "Difference (row)",
  differenceOfColumn: "Difference (column)",
  percentDifferenceOfRow: "% difference (row)",
  percentDifferenceOfColumn: "% difference (column)",
  runningTotalOfRow: "Running total (row)",
  runningTotalOfColumn: "Running total (column)",
  index: "Index",
};

