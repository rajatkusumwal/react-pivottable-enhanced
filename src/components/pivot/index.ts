/**
 * Pivot Studio — a drop-in pivot table UI built on the two open-source
 * engines (react-pivottable and orb.js) with a shared feature layer.
 *
 *   import { PivotStudio, sampleData, sampleFields } from "@/components/pivot";
 */
export { PivotStudio } from "./PivotStudio";
export type { PivotStudioProps, PivotEngine } from "./PivotStudio";

export { ReactPivottablePanel, createAggregatorBridge } from "./engines/ReactPivottablePanel";
export { OrbPanel, buildOrbGrid, collectLeaves } from "./engines/OrbPanel";

export { PivotToolbar } from "./ui/PivotToolbar";
export { PivotSidebar } from "./ui/PivotSidebar";
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
