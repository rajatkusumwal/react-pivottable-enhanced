/**
 * Pivot Studio — a drop-in, Flexmonster-like pivot table UI.
 *
 * Aggregation runs in the browser by default and can be moved to a backend
 * service (Spring Boot + DuckDB) by passing a different engine adapter.
 *
 *   import { PivotStudio, sampleData, sampleFields } from "@/components/pivot";
 */
export { PivotStudio } from "./PivotStudio";
export type { PivotStudioProps } from "./PivotStudio";

export { createLocalEngine, buildLocalResult, localDrillThrough, measureOf } from "./engines/local";
export { createBackendClient } from "./engines/backend";
export { createBackendEngine, createHybridEngine } from "./engines/backend";
export type { BackendEngineOptions } from "./engines/backend";
export { keyOf, emptyResult, KEY_SEP } from "./result";
export type {
  PivotEngineAdapter,
  PivotQuery,
  PivotResult,
  PivotMeasure,
  PivotLayout,
  PivotSort,
  HeaderNode,
  DrillThroughQuery,
} from "./result";

export { PivotGrid } from "./ui/PivotGrid";
export type { SelectionStats } from "./ui/PivotGrid";
export { DataSourceBar, suggestConfig } from "./ui/DataSourceBar";
export type { UploadedDataset } from "./ui/DataSourceBar";

export { PivotToolbar } from "./ui/PivotToolbar";
export { PivotSidebar } from "./ui/PivotSidebar";
export { FieldListPanel } from "./ui/FieldListPanel";
export { FieldListDialog } from "./ui/FieldListDialog";
export { GridFieldBar } from "./ui/GridFieldBar";
export { FieldChip } from "./ui/FieldChip";
export { DropArea } from "./ui/DropArea";
export { MemberFilterPopover } from "./ui/MemberFilterPopover";
export { FilterEditor } from "./ui/FilterEditor";
export { areaOfField, moveField, removeField, reorderField, pivotAreas } from "./dnd";
export type { PivotArea } from "./dnd";
export { PivotChart } from "./ui/PivotChart";
export { DrillThroughDialog } from "./ui/DrillThroughDialog";

export { aggregators, aggregatorLabels, aggregate, registerAggregator } from "./aggregators";
export type { AggregatorFn } from "./aggregators";
export { applyFilters, matchesCondition, uniqueMembers } from "./filters";
export {
  applyCalculatedFields,
  evaluateFormula,
  validateFormula,
  tokenize,
  toRpn,
} from "./calculated";
export { buildChartData, drillThroughRows, applyDisplayMode, grandTotal } from "./analysis";
export type { ChartPoint, DrillSelection } from "./analysis";
export {
  exportMatrix,
  matrixFromTable,
  matrixFromResult,
  printMatrix,
  copyMatrix,
  toCsv,
  toTsv,
  toHtml,
  toJson,
  downloadFile,
} from "./export";
export type { ExportFormat, ExportMatrix } from "./export";
export { secureRows, visibleFields, can, defaultPermissions } from "./security";
export { formatNumber, formatPercent } from "./format";
export { locales, getLocale } from "./locales";
export type { PivotStrings } from "./locales";
export {
  parseCsv,
  inferFields,
  loadCsvUrl,
  loadJsonUrl,
  readFileAsRows,
} from "./data-sources";
export { sampleData, sampleFields, sampleCsv, generateSalesData } from "./sample-data";
export { createDefaultConfig, defaultTheme } from "./types";
export type {
  PivotConfig,
  PivotRow,
  PivotValue,
  FieldDef,
  FieldType,
  ValueDef,
  ValueDisplayMode,
  AggregatorName,
  FilterDef,
  ConditionOperator,
  CalculatedField,
  ConditionalFormatRule,
  NumberFormat,
  Permissions,
  PivotTheme,
  ChartType,
} from "./types";
