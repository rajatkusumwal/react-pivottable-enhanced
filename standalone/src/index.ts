/**
 * Public entry point for the standalone package.
 *
 * Everything the pivot table exposes lives in ./pivot (copied from the demo
 * app with `npm run sync`), so consumers only ever import from here:
 *
 *   import { PivotStudio, sampleData, sampleFields } from "inhouse-grid-monster";
 *   import "inhouse-grid-monster/styles.css";
 */
export * from "./pivot";
