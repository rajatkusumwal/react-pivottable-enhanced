/**
 * Performance guards for the local (browser) engine.
 *
 * These are regression alarms, not benchmarks: the budgets are deliberately
 * generous so a slow CI machine never fails the build, but an accidental
 * O(n^2) loop in aggregation or sorting will blow straight through them.
 */
import { describe, expect, it } from "vitest";
import { buildLocalResult, localDrillThrough } from "./engines/local";
import { applyFilters } from "./filters";
import type { PivotQuery } from "./result";
import type { PivotRow } from "./types";

/** Budgets in milliseconds — raise only with a measurement to justify it. */
const BUILD_100K_MS = 4000;
const FILTER_100K_MS = 1500;
const DRILLTHROUGH_100K_MS = 1500;

const REGIONS = ["North", "South", "East", "West"];
const CATEGORIES = ["Bikes", "Clothing", "Parts", "Accessories", "Service"];

function makeRows(count: number): PivotRow[] {
  const rows: PivotRow[] = new Array(count);
  for (let i = 0; i < count; i++) {
    rows[i] = {
      region: REGIONS[i % REGIONS.length] as string,
      city: `City ${i % 200}`,
      category: CATEGORIES[i % CATEGORIES.length] as string,
      revenue: (i % 997) + 1,
      units: (i % 13) + 1,
    };
  }
  return rows;
}

const query = (partial: Partial<PivotQuery> = {}): PivotQuery => ({
  rows: ["region", "city"],
  cols: ["category"],
  values: [
    { field: "revenue", aggregator: "sum" },
    { field: "units", aggregator: "average" },
  ],
  filters: [],
  showSubTotals: true,
  showGrandTotals: true,
  layout: "compact",
  collapsed: [],
  locale: "en",
  ...partial,
});

const timed = <T>(fn: () => T): { value: T; ms: number } => {
  const start = performance.now();
  const value = fn();
  return { value, ms: performance.now() - start };
};

describe("local engine performance", () => {
  const rows = makeRows(100_000);

  it(`aggregates 100k rows into a two-level pivot in under ${BUILD_100K_MS}ms`, () => {
    const { value, ms } = timed(() => buildLocalResult(rows, query()));
    expect(value.rowHeaders.length).toBeGreaterThan(0);
    expect(value.grandTotal).not.toBeNull();
    expect(ms).toBeLessThan(BUILD_100K_MS);
  });

  it(`filters 100k rows in under ${FILTER_100K_MS}ms`, () => {
    const { value, ms } = timed(() =>
      applyFilters(rows, [
        { kind: "values", field: "region", mode: "include", members: ["North"] },
      ]),
    );
    expect(value.length).toBe(25_000);
    expect(ms).toBeLessThan(FILTER_100K_MS);
  });

  it(`drills through a single cell of 100k rows in under ${DRILLTHROUGH_100K_MS}ms`, () => {
    const built = query();
    const { value, ms } = timed(() =>
      localDrillThrough(rows, {
        query: built,
        rowKey: ["North"],
        colKey: ["Bikes"],
        limit: 100,
      }),
    );
    expect(value.length).toBeLessThanOrEqual(100);
    expect(ms).toBeLessThan(DRILLTHROUGH_100K_MS);
  });

  it("scales roughly linearly: 100k rows cost well under 10x the 10k cost", () => {
    const small = makeRows(10_000);
    // Warm up so the JIT does not charge the first call for both runs.
    buildLocalResult(small, query());
    const a = timed(() => buildLocalResult(small, query())).ms;
    const b = timed(() => buildLocalResult(rows, query())).ms;
    expect(b).toBeLessThan(Math.max(a, 1) * 40);
  });
});
