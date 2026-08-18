/**
 * The one test that proves the published package works: import the built
 * bundle the way an installing app would and render the pivot table.
 */
import { describe, expect, it, beforeAll } from "vitest";
import { render, screen, cleanup } from "@testing-library/react";
import { join } from "node:path";
import { buildPackage, distDir } from "./build-package";

type PackageModule = typeof import("../src/index");

let pkg: PackageModule;

describe("consuming the built package", () => {
  beforeAll(async () => {
    await buildPackage();
    pkg = (await import(/* @vite-ignore */ join(distDir, "index.js"))) as PackageModule;
  }, 300_000);

  it("exposes PivotStudio from dist/index.js", () => {
    expect(typeof pkg.PivotStudio).toBe("function");
  });

  it("renders the sample dataset into a grid", async () => {
    const { PivotStudio, sampleData, sampleFields } = pkg;
    render(<PivotStudio data={sampleData} fields={sampleFields} />);
    expect(await screen.findByRole("grid")).toBeInTheDocument();
    expect(document.querySelectorAll("[role='row']").length).toBeGreaterThan(1);
    cleanup();
  });

  it("renders with no data without crashing", async () => {
    const { PivotStudio } = pkg;
    render(<PivotStudio data={[]} fields={[]} />);
    expect(await screen.findByRole("grid")).toBeInTheDocument();
    cleanup();
  });

  it("computes aggregates through the exported local engine", async () => {
    const engine = pkg.createLocalEngine();
    const result = await engine.query(
      {
        rows: ["region"],
        cols: [],
        values: [{ field: "revenue", aggregator: "sum" }],
        filters: [],
        showSubTotals: true,
        showGrandTotals: true,
        layout: "compact",
        collapsed: [],
        locale: "en",
      },
      pkg.sampleData,
    );
    expect(result.rowHeaders.length).toBeGreaterThan(0);
    expect(result.grandTotal).not.toBeNull();
  });
});
