/**
 * Shared, engine-agnostic types for the pivot components.
 * The same config drives the local engine and the REST backend engine, so an
 * app can move aggregation server-side without changing its state.
 */
import type { PivotLayout, PivotSort } from "./result";

export type PivotValue = string | number | boolean | null | undefined;
export type PivotRow = Record<string, PivotValue>;

export type FieldType = "string" | "number" | "date" | "time";

export interface FieldDef {
  /** Key in the source rows. */
  name: string;
  /** Human friendly label shown in the UI. */
  caption?: string;
  type: FieldType;
  /** Optional grouping in the field list. */
  folder?: string;
  /** Hierarchy this field is a level of, e.g. "Geography". */
  hierarchy?: string;
  /** 1-based level inside `hierarchy` (Region = 1, Country = 2, …). */
  level?: number;
  /**
   * Restricts the aggregations offered for this field in the measure menus,
   * e.g. `["average", "min", "max"]` for a unit-price column.
   */
  aggregators?: AggregatorName[];
  /**
   * Marks the field as a KPI coming from the data source: the grid shows a
   * status indicator against the goal and the field list groups it under KPIs.
   */
  kpi?: KpiDef;
}




export type AggregatorName =
  | "sum"
  | "count"
  | "distinctCount"
  | "average"
  | "median"
  | "min"
  | "max"
  | "product"
  | "stdDev"
  | "variance"
  | "first"
  | "last"
  | (string & {});

/** Post-aggregation display transforms (Flexmonster "show values as"). */
export type ValueDisplayMode =
  | "raw"
  | "percentOfGrandTotal"
  | "percentOfRowTotal"
  | "percentOfColumnTotal"
  | "percentOfParentRowTotal"
  | "percentOfParentColumnTotal"
  | "differenceOfRow"
  | "differenceOfColumn"
  | "percentDifferenceOfRow"
  | "percentDifferenceOfColumn"
  | "runningTotalOfRow"
  | "runningTotalOfColumn"
  /** Alias of `runningTotalOfRow`, kept for older reports. */
  | "runningTotal"
  | "index";


export interface NumberFormat {
  decimals?: number;
  thousandsSeparator?: boolean;
  prefix?: string;
  suffix?: string;
  currency?: string;
}

export interface ValueDef {
  field: string;
  aggregator: AggregatorName;
  caption?: string;
  format?: NumberFormat;
  displayMode?: ValueDisplayMode;
  /**
   * Field type of the measure. String, date and time measures only support
   * count / distinct count / min / max / first / last and render as text.
   */
  type?: FieldType;
}


export type ConditionOperator =
  | "gt"
  | "gte"
  | "lt"
  | "lte"
  | "eq"
  | "neq"
  | "between"
  | "contains"
  | "notContains"
  | "beginsWith"
  | "endsWith";

/**
 * How a conditional filter compares its operand. "auto" (the default) infers dates
 * when both sides parse as dates, otherwise falls back to number/text comparison.
 */
export type ConditionValueType = "auto" | "number" | "text" | "date" | "time";

export type FilterDef =
  | {
      kind: "values";
      field: string;
      mode: "include" | "exclude";
      members: string[];
    }
  | {
      kind: "condition";
      field: string;
      operator: ConditionOperator;
      value: string | number;
      value2?: string | number;
      /**
       * Comparison mode; defaults to "auto". Use "date" for date fields and
       * "time" for clock-time fields ("HH:mm[:ss]").
       */
      valueType?: ConditionValueType;
    }
  | {
      /**
       * Server-side subquery filter: keeps only the members of `field` whose
       * nested aggregate of `measure` satisfies the condition. Maps to a SQL
       * `WHERE field IN (SELECT … GROUP BY … HAVING …)` on the backend.
       */
      kind: "subquery";
      field: string;
      measure: string;
      aggregator: AggregatorName;
      operator: ConditionOperator;
      value: number;
      value2?: number;
    }
  | {
      kind: "top";
      field: string;
      measure: string;
      aggregator: AggregatorName;
      direction: "top" | "bottom";
      count: number;
    };

export interface CalculatedField {
  name: string;
  /**
   * Row scope: "[revenue] - [cost]" evaluated per record before aggregation.
   * Aggregate scope: "[revenue] / grandTotal([revenue]) * 100" evaluated per
   * grid cell, after aggregation, with access to the report totals.
   */
  formula: string;
  caption?: string;
  format?: NumberFormat;
  /** Defaults to "row". */
  scope?: "row" | "aggregate";
  /**
   * Aggregate scope only — how `[field]` references are aggregated for the
   * cell, its totals and its parent totals. Defaults to "sum".
   */
  aggregator?: AggregatorName;
}

/** KPI metadata declared on a field by the data source. */
export interface KpiDef {
  /** Goal field name (aggregated the same way) or a fixed number. */
  goal: string | number;
  /** "higher" (default) means above goal is good. */
  direction?: "higher" | "lower";
  /** Ratio below which the KPI is "at risk" instead of "on target". 0.9 by default. */
  warningAt?: number;
  caption?: string;
}

export type KpiState = "onTarget" | "atRisk" | "below";

export interface KpiStatus {
  state: KpiState;
  /** value / goal (inverted for "lower is better"). */
  ratio: number | null;
  goal: number | null;
}


export interface ConditionalFormatRule {
  field: string;
  operator: ConditionOperator;
  value: number;
  /** CSS colour token or literal. */
  color: string;
  background: string;
}

export interface PivotTheme {
  accent: string;
  headerBackground: string;
  border: string;
  stripe: boolean;
  density: "compact" | "comfortable";
  fontSize: number;
}

export type ChartType = "bar" | "stackedBar" | "line" | "area" | "pie";

export interface Permissions {
  /** Only these fields may be used (when provided). */
  allowedFields?: string[];
  /** These fields are always hidden, even if allowed above. */
  deniedFields?: string[];
  /** Hide values behind •••• for these fields. */
  maskedFields?: string[];
  /** Row level security — return false to hide the record. */
  rowFilter?: (row: PivotRow) => boolean;
  allowExport?: boolean;
  allowDrillThrough?: boolean;
  /** Disables field list / toolbar edits. */
  readOnly?: boolean;
}

export interface PivotConfig {
  rows: string[];
  cols: string[];
  values: ValueDef[];
  filters: FilterDef[];
  calculated: CalculatedField[];
  conditionalFormats: ConditionalFormatRule[];
  showGrandTotals: boolean;
  /** Grand total row above or below the members. */
  grandTotalsPosition: "top" | "bottom";
  /** Grand total column on the right of every row. */
  showRowTotals: boolean;
  showSubTotals: boolean;
  expandAll: boolean;
  layout: PivotLayout;
  /** Collapsed row member paths (joined with \u0000). */
  collapsed: string[];
  /** Collapsed column member paths (joined with \u0000). */
  collapsedCols: string[];
  sort?: PivotSort | undefined;
  /** Multi-column sort used by the flat layout (shift-click a sort control). */
  sorts?: PivotSort[] | undefined;
  showFieldCaptions: boolean;
  /** Per-report renames for row/column fields, keyed by field name. */
  fieldCaptions?: Record<string, string>;
  showSpreadsheetHeaders: boolean;
  repeatMemberLabels: boolean;
  showSortingControls: boolean;
  /** Show the "Report filters" strip above the grid. */
  showReportFilterArea: boolean;
  /** Show member filter controls above the chart. */
  showChartFilters: boolean;
  /** Show the Σ icon next to measures in the field list and field bar. */
  showAggregationIcon: boolean;

  /** Allow dragging fields between areas; when false only the menus work. */
  dragAndDrop: boolean;
  /** Allow typing a new value straight into a grid cell (writes back to data). */
  editing: boolean;
  /** Text printed above the table on export and print (\n for several lines). */
  exportHeader?: string;
  /** Text printed below the table on export and print. */
  exportFooter?: string;
  locale: string;
  theme: PivotTheme;
  chart: { visible: boolean; type: ChartType };
}


export const defaultTheme: PivotTheme = {
  accent: "#2f6feb",
  headerBackground: "#f1f4f9",
  border: "#dfe4ec",
  stripe: true,
  density: "comfortable",
  fontSize: 13,
};

export function createDefaultConfig(partial: Partial<PivotConfig> = {}): PivotConfig {
  return {
    rows: [],
    cols: [],
    values: [],
    filters: [],
    calculated: [],
    conditionalFormats: [],
    showGrandTotals: true,
    grandTotalsPosition: "bottom",
    showRowTotals: true,
    showSubTotals: true,
    expandAll: true,
    layout: "compact",
    collapsed: [],
    collapsedCols: [],
    showFieldCaptions: true,
    fieldCaptions: {},
    showSpreadsheetHeaders: false,
    repeatMemberLabels: false,
    showSortingControls: true,
    showReportFilterArea: true,
    showChartFilters: true,
    showAggregationIcon: true,

    dragAndDrop: true,
    editing: false,
    locale: "en",
    theme: defaultTheme,
    chart: { visible: false, type: "bar" },
    ...partial,
  };
}
