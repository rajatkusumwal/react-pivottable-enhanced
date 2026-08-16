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
export { createMockPivotApi } from "./engines/mock-api";
export type { MockPivotApi, MockPivotApiOptions } from "./engines/mock-api";
export { applyCellEdit, isEditableAggregator } from "./editing";
export type { CellEditRequest, CellEditResult } from "./editing";
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
export {
  fieldCaption,
  measureCaption,
  renameFieldPatch,
  renameMeasurePatch,
  renameResultFields,
} from "./captions";
export { areaOfField, moveField, removeField, reorderField, pivotAreas } from "./dnd";
export type { PivotArea } from "./dnd";
export { PivotChart } from "./ui/PivotChart";
export { DrillThroughDialog } from "./ui/DrillThroughDialog";
export { FormatDialog } from "./ui/FormatDialog";
export type { FormatTab } from "./ui/FormatDialog";
export { GridContextMenu } from "./ui/GridContextMenu";
export type { ContextMenuItem } from "./ui/GridContextMenu";
export {
  encodeReport,
  decodeReport,
  buildReportUrl,
  readReportFromUrl,
  REPORT_PARAM,
} from "./report-link";


export { aggregators, aggregatorLabels, aggregate, registerAggregator } from "./aggregators";
export type { AggregatorFn } from "./aggregators";
export { applyFilters, matchesCondition, uniqueMembers } from "./filters";
export {
  applyCalculatedFields,
  evaluateFormula,
  evaluateWithContext,
  validateFormula,
  isAggregateField,
  tokenize,
  toRpn,
  TOTAL_FUNCTIONS,
} from "./calculated";
export type { FormulaContext, TotalScope } from "./calculated";
export { computeKpiStatus, kpisFromFields, KPI_LABELS, KPI_ICONS } from "./kpi";
export { buildChartData, drillThroughRows, applyDisplayMode, grandTotal } from "./analysis";
export type { ChartPoint, DrillSelection } from "./analysis";
export {
  exportMatrix,
  matrixFromTable,
  matrixFromResult,
  matrixFromRows,
  printMatrix,
  copyMatrix,
  toCsv,
  toTsv,
  toHtml,
  toJson,
  downloadFile,
} from "./export";
export type { ExportFormat, ExportMatrix, ExportDecoration } from "./export";

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
export { sampleData, sampleFields, sampleCsv, sampleHierarchies, generateSalesData } from "./sample-data";
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
  KpiDef,
  KpiState,
  KpiStatus,
  ConditionalFormatRule,
  NumberFormat,
  Permissions,
  PivotTheme,
  ChartType,
} from "./types";
