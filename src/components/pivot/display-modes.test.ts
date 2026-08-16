import { describe, expect, it } from "vitest";
import { applyDisplayMode, displayModeLabels } from "./analysis";
import { aggregatorsForType } from "./aggregators";
import { buildLocalResult } from "./engines/local";
import { createDefaultConfig } from "./types";
import type { PivotRow, ValueDisplayMode } from "./types";
import type { PivotQuery } from "./result";

/**
 * Two regions with two countries each and two quarters, so every "parent"
 * and neighbour-based display mode has something meaningful to reference.
 */
const rows: PivotRow[] = [
  { region: "North", country: "UK", quarter: "Q1", revenue: 100 },
  { region: "North", country: "UK", quarter: "Q2", revenue: 300 },
  { region: "North", country: "IE", quarter: "Q1", revenue: 100 },
  { region: "North", country: "IE", quarter: "Q2", revenue: 100 },
  { region: "South", country: "ES", quarter: "Q1", revenue: 200 },
  { region: "South", country: "ES", quarter: "Q2", revenue: 200 },
];

const queryWith = (mode: ValueDisplayMode, over: Partial<PivotQuery> = {}): PivotQuery => {
  const config = createDefaultConfig({
    rows: ["region", "country"],
    cols: ["quarter"],
    values: [{ field: "revenue", aggregator: "sum", displayMode: mode }],
    showSubTotals: false,
    showGrandTotals: false,
  });
  return {
    rows: config.rows,
    cols: config.cols,
    values: config.values,
    filters: [],
    showSubTotals: config.showSubTotals,
    showGrandTotals: config.showGrandTotals,
    grandTotalsPosition: config.grandTotalsPosition,
    layout: config.layout,
    collapsed: [],
    collapsedCols: [],
    ...over,
  } as PivotQuery;
};

/** Row index of a member path in the built result. */
const rowOf = (labels: string[], result: ReturnType<typeof buildLocalResult>) =>
  result.rowHeaders.findIndex((h) => h.key.join("/") === labels.join("/"));

describe("show values as — parent totals", () => {
  it("expresses a cell as a percent of its parent row total", () => {
    const result = buildLocalResult(rows, queryWith("percentOfParentRowTotal"));
    const uk = rowOf(["North", "UK"], result);
    // UK Q1 = 100, parent (North) Q1 = 200 → 50%
    expect(result.cells[uk]?.[0]).toBe(50);
    const es = rowOf(["South", "ES"], result);
    expect(result.cells[es]?.[0]).toBe(100);
  });

  it("expresses a cell as a percent of its parent column total", () => {
    const result = buildLocalResult(
      rows,
      queryWith("percentOfParentColumnTotal", { cols: ["region", "quarter"] }),
    );
    const uk = rowOf(["North", "UK"], result);
    // First leaf column is North/Q1; its parent column group is North (all quarters).
    expect(result.cells[uk]?.[0]).toBeCloseTo(25, 5);
  });

  it("falls back to the plain row/column total when there is no parent level", () => {
    const result = buildLocalResult(rows, queryWith("percentOfParentRowTotal", { rows: ["region"] }));
    const north = rowOf(["North"], result);
    // North Q1 = 200 of North total 600
    expect(result.cells[north]?.[0]).toBeCloseTo(33.33, 1);
  });
});

describe("show values as — differences and running totals", () => {
  it("shows the difference against the previous column", () => {
    const result = buildLocalResult(rows, queryWith("differenceOfRow"));
    const uk = rowOf(["North", "UK"], result);
    expect(result.cells[uk]?.[0]).toBeNull(); // no previous column
    expect(result.cells[uk]?.[1]).toBe(200); // 300 - 100
  });

  it("shows the percent difference against the previous column", () => {
    const result = buildLocalResult(rows, queryWith("percentDifferenceOfRow"));
    const uk = rowOf(["North", "UK"], result);
    expect(result.cells[uk]?.[1]).toBe(200); // (300-100)/100
  });

  it("shows the difference and percent difference against the row above", () => {
    // A single row field keeps the comparison between sibling members.
    const diff = buildLocalResult(rows, queryWith("differenceOfColumn", { rows: ["country"] }));
    const pct = buildLocalResult(rows, queryWith("percentDifferenceOfColumn", { rows: ["country"] }));
    // Members sort as ES, IE, UK.
    expect(diff.cells[0]?.[0]).toBeNull(); // first row has nothing above it
    // IE Q2 = 100 against ES Q2 = 200
    expect(diff.cells[1]?.[1]).toBe(-100);
    expect(pct.cells[1]?.[1]).toBeCloseTo(-50, 5);
  });

  it("accumulates a running total down the column across sibling rows", () => {
    const result = buildLocalResult(rows, queryWith("runningTotalOfColumn", { rows: ["country"] }));
    expect(result.cells[0]?.[0]).toBe(200); // ES Q1
    expect(result.cells[1]?.[0]).toBe(300); // + IE Q1
    expect(result.cells[2]?.[0]).toBe(400); // + UK Q1
  });

  it("accumulates running totals across a row and down a column", () => {
    const acrossRow = buildLocalResult(rows, queryWith("runningTotalOfRow"));
    const downColumn = buildLocalResult(rows, queryWith("runningTotalOfColumn"));
    const uk = rowOf(["North", "UK"], acrossRow);
    expect(acrossRow.cells[uk]?.[0]).toBe(100);
    expect(acrossRow.cells[uk]?.[1]).toBe(400); // 100 + 300

    // Parent rows take part: North (200), IE (100), UK (100).
    expect(downColumn.cells[rowOf(["North", "UK"], downColumn)]?.[0]).toBe(400);

  });

  it("keeps runningTotal working as an alias of the row running total", () => {
    const alias = buildLocalResult(rows, queryWith("runningTotal"));
    const explicit = buildLocalResult(rows, queryWith("runningTotalOfRow"));
    expect(alias.cells).toEqual(explicit.cells);
  });

  it("computes the index", () => {
    const result = buildLocalResult(rows, queryWith("index"));
    const uk = rowOf(["North", "UK"], result);
    // (100 * 1000) / (400 * 400)
    expect(result.cells[uk]?.[0]).toBeCloseTo((100 * 1000) / (400 * 400), 5);
  });

  it("returns null when a reference total is missing or zero", () => {
    const ctx = { grand: 0, rowTotal: 0, colTotal: 0, running: 0, prevInRow: 0 };
    expect(applyDisplayMode(10, ctx, "percentOfGrandTotal")).toBeNull();
    expect(applyDisplayMode(10, ctx, "percentDifferenceOfRow")).toBeNull();
    expect(applyDisplayMode(null, ctx, "differenceOfRow")).toBeNull();
  });

  it("labels every supported mode for the menu", () => {
    expect(Object.keys(displayModeLabels)).toEqual(
      expect.arrayContaining([
        "percentOfParentRowTotal",
        "percentOfParentColumnTotal",
        "differenceOfRow",
        "differenceOfColumn",
        "percentDifferenceOfRow",
        "percentDifferenceOfColumn",
        "runningTotalOfRow",
        "runningTotalOfColumn",
        "index",
      ]),
    );
  });
});

describe("restricted aggregations", () => {
  it("only offers the aggregations a field allows", () => {
    expect(aggregatorsForType("number", ["average", "min", "max"])).toEqual([
      "average",
      "min",
      "max",
    ]);
  });

  it("ignores an allow-list that matches nothing for the field type", () => {
    expect(aggregatorsForType("string", ["sum"])).toContain("count");
  });

  it("keeps the full list when no restriction is given", () => {
    expect(aggregatorsForType("number")).toContain("sum");
  });
});
