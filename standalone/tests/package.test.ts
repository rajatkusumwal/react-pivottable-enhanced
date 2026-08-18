/**
 * The pivot source lives in standalone/src/pivot and is the only copy in the
 * repo. These tests guard the package's public surface: every documented name
 * must resolve from the entry point and behave.
 */
import { describe, expect, it } from "vitest";
import * as pkg from "../src/index";
import { existsSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "..", "..");
const packageSource = join(repoRoot, "standalone", "src", "pivot");

describe("package layout", () => {
  it("keeps the pivot source and theme inside the package", () => {
    for (const file of ["index.ts", "PivotStudio.tsx", "types.ts", "result.ts"]) {
      expect(existsSync(join(packageSource, file)), file).toBe(true);
    }
    expect(existsSync(join(repoRoot, "standalone", "src", "pivot-theme.css"))).toBe(true);
  });

  it("no longer keeps a second copy under src/components", () => {
    expect(existsSync(join(repoRoot, "src", "components", "pivot"))).toBe(false);
  });
});

// The names an integrating app is documented to use in README.md.
const documentedExports = [
  "PivotStudio",
  "PivotGrid",
  "PivotChart",
  "PivotToolbar",
  "PivotSidebar",
  "createLocalEngine",
  "createBackendEngine",
  "createHybridEngine",
  "createBackendClient",
  "createCustomEngine",
  "createServerAggregationEngine",
  "createMockPivotApi",
  "createDefaultConfig",
  "defaultTheme",
  "sampleData",
  "sampleFields",
  "sampleCsv",
  "buildReportUrl",
  "readReportFromUrl",
  "exportMatrix",
  "parseCsv",
  "inferFields",
  "emptyResult",
  "keyOf",
];

describe("package entry point", () => {
  it("exports every documented name", () => {
    for (const name of documentedExports) {
      expect(pkg, `missing export: ${name}`).toHaveProperty(name);
    }
  });

  it("exports no undefined bindings", () => {
    const broken = Object.entries(pkg)
      .filter(([, value]) => value === undefined)
      .map(([name]) => name);
    expect(broken).toEqual([]);
  });

  it("exposes PivotStudio as a component", () => {
    expect(typeof pkg.PivotStudio).toBe("function");
  });

  it("produces a usable default config", () => {
    const config = pkg.createDefaultConfig({ rows: ["region"] });
    expect(config.rows).toEqual(["region"]);
    expect(config.layout).toBe("compact");
    expect(Array.isArray(config.values)).toBe(true);
  });

  it("computes a result from sample data through the local engine", async () => {
    const engine = pkg.createLocalEngine();
    const config = pkg.createDefaultConfig({
      rows: ["region"],
      cols: ["category"],
      values: [{ field: "revenue", aggregator: "sum" }],
    });
    const result = await engine.query(queryFrom(config), pkg.sampleData);
    expect(result.rowHeaders.length).toBeGreaterThan(0);
    expect(result.meta.source).toBe("local");
  });

  it("survives an empty dataset without throwing", async () => {
    const engine = pkg.createLocalEngine();
    const config = pkg.createDefaultConfig({
      rows: ["region"],
      cols: ["category"],
      values: [{ field: "revenue", aggregator: "sum" }],
    });
    const result = await engine.query(queryFrom(config), []);
    expect(result.cells).toBeDefined();
    expect(result.sourceCount).toBe(0);
  });
});

function queryFrom(config: pkg.PivotConfig): pkg.PivotQuery {
  return {
    rows: config.rows,
    cols: config.cols,
    values: config.values,
    filters: config.filters,
    showSubTotals: true,
    showGrandTotals: true,
    layout: "compact",
    collapsed: [],
    locale: "en",
  };
}
