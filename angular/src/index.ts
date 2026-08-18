/**
 * Public entry point for react-pivottable-enhanced-angular.
 *
 *   import { PivotStudioComponent } from "react-pivottable-enhanced-angular";
 *   import "react-pivottable-enhanced/styles.css";
 */
export { PivotStudioComponent } from "./pivot-studio.component";
export type { UploadHandler } from "./pivot-studio.component";
export { PivotStudioModule } from "./pivot-studio.module";
export { createPivotMount } from "./react-mount";
export type { PivotMount } from "./react-mount";

// Types and helpers come from the React package so apps import from one place.
export type {
  FieldDef,
  Permissions,
  PivotConfig,
  PivotEngineAdapter,
  PivotResult,
  PivotRow,
} from "react-pivottable-enhanced";
export {
  createBackendEngine,
  createLocalEngine,
  inferFields,
  sampleData,
  sampleFields,
} from "react-pivottable-enhanced";
