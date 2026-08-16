/**
 * Engine-agnostic pivot result.
 *
 * Every engine (the local react-pivottable engine or a remote Spring Boot +
 * DuckDB service) produces this exact shape, and `PivotGrid` only knows how to
 * render it. That is what makes the aggregation side swappable.
 */
import type { PivotCellValue } from "./aggregators";
import type {
  AggregatorName,
  FieldType,
  FilterDef,
  NumberFormat,
  PivotRow,
  ValueDef,
} from "./types";

export type { PivotCellValue };

export type HeaderKind = "member" | "subtotal" | "grand";

export interface HeaderNode {
  /** Member path from the outermost field inwards, e.g. ["North", "Bikes"]. */
  key: string[];
  /** Text shown in the header cell. */
  label: string;
  /** 0-based nesting level. */
  depth: number;
  kind: HeaderKind;
  /** True when the node has children that could be expanded. */
  expandable: boolean;
  /** True when its children are currently visible. */
  expanded: boolean;
  /** Number of leaf columns underneath (column headers only). */
  span: number;
  /** Vertical span for collapsed column members (column headers only). */
  rowSpan?: number;
}

export interface PivotMeasure {
  field: string;
  caption: string;
  aggregator: AggregatorName;
  format?: NumberFormat | undefined;
  /** Type of the measured field; non-number measures render as text. */
  type?: FieldType | undefined;
}

export interface PivotResult {
  rowFields: string[];
  colFields: string[];
  /** First measure — kept for single-measure consumers. */
  measure: PivotMeasure;
  /** Every measure, in report order. Leaf columns repeat per measure. */
  measures: PivotMeasure[];
  /** Grid rows in display order (members, subtotals and the grand total row). */
  rowHeaders: HeaderNode[];
  /** Column header rows, one array per level (plus a measure row when > 1). */
  colHeaderRows: HeaderNode[][];
  /** Leaf columns, aligned with every `cells[i]`. */
  colLeaves: HeaderNode[];
  /** Measure index behind each leaf column. */
  measureIndexByLeaf: number[];
  /** cells[rowIndex][colIndex] */
  cells: PivotCellValue[][];
  /** Row grand totals for the first measure. */
  rowTotals: (number | null)[];
  /** rowTotalsByMeasure[rowIndex][measureIndex] */
  rowTotalsByMeasure: PivotCellValue[][];
  colTotals: PivotCellValue[];
  grandTotal: number | null;
  /** Grand total per measure. */
  grandTotals: PivotCellValue[];
  /** Records behind the result — used for local drill-through and windowing info. */
  sourceCount: number;
  meta: { source: "local" | "backend"; queryId?: string };
}


export type PivotLayout = "compact" | "classic" | "flat";

export interface PivotSort {
  /** "rows" sorts row members, a number sorts by that leaf column's values. */
  by: "rows" | number;
  direction: "asc" | "desc";
}

export interface PivotQuery {
  rows: string[];
  cols: string[];
  values: ValueDef[];
  filters: FilterDef[];
  showSubTotals: boolean;
  showGrandTotals: boolean;
  /** Where the grand total row sits. Defaults to "bottom". */
  grandTotalsPosition?: "top" | "bottom";
  layout: PivotLayout;
  /** Collapsed row member paths, joined with "\u0000". */
  collapsed: string[];
  /** Collapsed column member paths, joined with "\u0000". */
  collapsedCols?: string[];
  sort?: PivotSort | undefined;
  /** Multi-column sort for the flat layout; takes precedence over `sort`. */
  sorts?: PivotSort[] | undefined;
  locale: string;
  /** Backend paging. */
  limit?: number;
  offset?: number;
  /** Backend dataset handle returned by the upload endpoint. */
  datasetId?: string | undefined;
}

export interface DrillThroughQuery {
  rowKey: string[];
  colKey: string[];
  query: PivotQuery;
  limit?: number;
}

/** Contract implemented by the local engine and by the REST backend engine. */
export interface PivotEngineAdapter {
  id: string;
  query(request: PivotQuery, rows: PivotRow[]): Promise<PivotResult>;
  drillThrough(request: DrillThroughQuery, rows: PivotRow[]): Promise<PivotRow[]>;
}

export const KEY_SEP = "\u0000";
export const keyOf = (path: string[]) => path.join(KEY_SEP);

export function emptyResult(measure: PivotMeasure): PivotResult {
  return {
    rowFields: [],
    colFields: [],
    measure,
    measures: [measure],
    rowHeaders: [],
    colHeaderRows: [],
    colLeaves: [],
    measureIndexByLeaf: [],
    cells: [],
    rowTotals: [],
    rowTotalsByMeasure: [],
    colTotals: [],
    grandTotal: null,
    grandTotals: [],
    sourceCount: 0,
    meta: { source: "local" },
  };
}

