/**
 * The package barrel is the whole public API. If a file is renamed in the app
 * but the barrel is not, consumers get a broken import — these tests catch it
 * before publish.
 */
import { describe, expect, it } from "vitest";
import * as pkg from "../src/index";

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
    const config = pkg.createDefaultConfig(pkg.sampleFields);
    expect(config.fields.length).toBe(pkg.sampleFields.length);
    expect(Array.isArray(config.rows)).toBe(true);
  });

  it("computes a result from sample data through the local engine", async () => {
    const engine = pkg.createLocalEngine(pkg.sampleData);
    const config = pkg.createDefaultConfig(pkg.sampleFields);
    const result = await engine.query({
      rows: config.rows,
      columns: config.columns,
      measures: config.values.map((value) => ({ field: value.field, aggregator: value.aggregator })),
      filters: [],
      sorts: [],
      layout: "compact",
    });
    expect(result.rowHeaders.length).toBeGreaterThan(0);
  });

  it("survives an empty dataset without throwing", async () => {
    const engine = pkg.createLocalEngine([]);
    const result = await engine.query({
      rows: [],
      columns: [],
      measures: [],
      filters: [],
      sorts: [],
      layout: "compact",
    });
    expect(result.cells).toBeDefined();
  });
});
