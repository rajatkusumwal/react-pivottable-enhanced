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
  export const naturalSort: (a: unknown, b: unknown) => number;
}

declare module "react-pivottable/pivottable.css";

