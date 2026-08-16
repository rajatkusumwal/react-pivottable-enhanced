declare module "react-pivottable/PivotTableUI" {
  import type { ComponentType } from "react";
  const PivotTableUI: ComponentType<Record<string, unknown>>;
  export default PivotTableUI;
}

declare module "react-pivottable/PivotTable" {
  import type { ComponentType } from "react";
  const PivotTable: ComponentType<Record<string, unknown>>;
  export default PivotTable;
}

declare module "react-pivottable/TableRenderers" {
  import type { ComponentType } from "react";
  const TableRenderers: Record<string, ComponentType<Record<string, unknown>>>;
  export default TableRenderers;
}

declare module "react-pivottable/Utilities" {
  export const aggregators: Record<string, (...args: unknown[]) => unknown>;
  export const numberFormat: (opts?: Record<string, unknown>) => (value: number) => string;
  export const sortAs: (order: string[]) => (a: string, b: string) => number;
}

declare module "react-pivottable/pivottable.css";

declare module "orb/src/js/orb.pgrid.js" {
  export interface OrbDimension {
    id: number;
    value: string | number | null;
    isRoot: boolean;
    isLeaf: boolean;
    depth: number;
    values: (string | number)[];
    subdimvals: Record<string, OrbDimension>;
    field?: { name: string; caption?: string };
    getRowIndexes(): number[];
  }
  export interface OrbAxe {
    root: OrbDimension;
    dimensionsCount: number;
    fields: { name: string; caption?: string }[];
    dimensionsByDepth: Record<number, OrbDimension[]>;
  }
  export class pgrid {
    constructor(config: Record<string, unknown>);
    rows: OrbAxe;
    columns: OrbAxe;
    filteredDataSource: Record<string, unknown>[];
    getData(datafield: string, rowdim: OrbDimension, coldim: OrbDimension): number | null;
    getFieldValues(field: string): (string | number)[];
  }
}
