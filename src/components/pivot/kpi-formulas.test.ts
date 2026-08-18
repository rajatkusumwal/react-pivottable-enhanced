import { describe, expect, it } from "vitest";
import { applyCalculatedFields, evaluateWithContext, validateFormula } from "./calculated";
import { computeKpiStatus, kpisFromFields } from "./kpi";
import { buildLocalResult } from "./engines/local";
import { createBackendEngine } from "./engines/backend";
import { createMockPivotApi } from "./engines/mock-api";
import type { PivotQuery } from "./result";
import type { FieldDef, PivotRow } from "./types";

const rows: PivotRow[] = [
  { region: "North", quarter: "Q1", revenue: 100, target: 80 },
  { region: "North", quarter: "Q2", revenue: 100, target: 200 },
  { region: "South", quarter: "Q1", revenue: 200, target: 205 },
  { region: "South", quarter: "Q2", revenue: 600, target: 400 },
];

const baseQuery = (patch: Partial<PivotQuery> = {}): PivotQuery => ({
  rows: ["region"],
  cols: ["quarter"],
  values: [{ field: "revenue", aggregator: "sum" }],
  filters: [],
  showSubTotals: true,
  showGrandTotals: true,
  layout: "compact",
  collapsed: [],
  locale: "en",
  ...patch,
});

describe("grand-total-aware formulas", () => {
  const shareQuery = baseQuery({
    values: [{ field: "share", aggregator: "sum", caption: "Share %" }],
    calculated: [
      { name: "share", formula: "[revenue] / grandTotal([revenue]) * 100", scope: "aggregate" },
    ],
  });

  it("evaluates a share of the grand total per cell", () => {
    const result = buildLocalResult(rows, shareQuery);
    // North / Q1 is 100 of 1000 total.
    expect(result.cells[0]?.[0]).toBeCloseTo(10);
    // The grand total cell is the whole report -> 100%.
    expect(result.grandTotals[0]).toBeCloseTo(100);
  });

  it("marks the measure as calculated in the result contract", () => {
    expect(buildLocalResult(rows, shareQuery).measures[0]?.calculated).toBe(true);
  });

  it("resolves rowTotal() and columnTotal() against the current cell", () => {
    const result = buildLocalResult(
      rows,
      baseQuery({
        values: [{ field: "ofRow", aggregator: "sum" }],
        calculated: [
          { name: "ofRow", formula: "[revenue] / rowTotal([revenue]) * 100", scope: "aggregate" },
        ],
      }),
    );
    // North: 100 of 200 in Q1.
    expect(result.cells[0]?.[0]).toBeCloseTo(50);

    const byColumn = buildLocalResult(
      rows,
      baseQuery({
        values: [{ field: "ofCol", aggregator: "sum" }],
        calculated: [
          {
            name: "ofCol",
            formula: "[revenue] / columnTotal([revenue]) * 100",
            scope: "aggregate",
          },
        ],
      }),
    );
    // Q1 column totals 300, North contributes 100.
    expect(byColumn.cells[0]?.[0]).toBeCloseTo(33.3333, 3);
  });

  it("resolves parentRowTotal() one level up the row hierarchy", () => {
    const result = buildLocalResult(
      rows,
      baseQuery({
        rows: ["region", "quarter"],
        cols: ["quarter"],
        values: [{ field: "ofParent", aggregator: "sum" }],
        calculated: [
          {
            name: "ofParent",
            formula: "[revenue] / parentRowTotal([revenue]) * 100",
            scope: "aggregate",
          },
        ],
      }),
    );
    const northQ1 = result.rowHeaders.findIndex(
      (h) => h.key.join("/") === "North/Q1" && h.kind === "member",
    );
    // North/Q1 is 100 of the 200 its parent (North) makes.
    expect(result.rowTotalsByMeasure[northQ1]?.[0]).toBeCloseTo(50);
  });

  it("honours the formula aggregator", () => {
    const result = buildLocalResult(
      rows,
      baseQuery({
        values: [{ field: "avgShare", aggregator: "sum" }],
        calculated: [
          {
            name: "avgShare",
            formula: "[revenue] - grandTotal([revenue])",
            scope: "aggregate",
            aggregator: "average",
          },
        ],
      }),
    );
    // North's Q1 average is 100, the report average is 250.
    expect(result.cells[0]?.[0]).toBeCloseTo(-150);
  });

  it("keeps row-scope formulas on the records and skips aggregate ones", () => {
    const out = applyCalculatedFields(rows, [
      { name: "gap", formula: "[revenue] - [target]" },
      { name: "share", formula: "[revenue] / grandTotal([revenue])", scope: "aggregate" },
    ]);
    expect(out[0]?.["gap"]).toBe(20);
    expect(out[0]?.["share"]).toBeUndefined();
  });

  it("rejects total functions without a field reference and unknown functions", () => {
    expect(() => evaluateWithContext("grandTotal(1)", { value: () => 1 })).toThrow(/\[field\]/);
    expect(validateFormula("nope([revenue])")).toMatch(/Unknown function/);
    expect(validateFormula("[revenue] / grandTotal([revenue])")).toBeNull();
  });
});

describe("KPIs from the data source", () => {
  const fields: FieldDef[] = [
    { name: "region", type: "string" },
    { name: "target", type: "number" },
    {
      name: "revenue",
      type: "number",
      kpi: { goal: "target", direction: "higher", warningAt: 0.9 },
    },
  ];
  const kpis = kpisFromFields(fields);

  it("collects KPI metadata from the field list", () => {
    expect(kpis["revenue"]?.goal).toBe("target");
    expect(kpis["target"]).toBeUndefined();
  });

  it("grades every cell against the goal measure", () => {
    const result = buildLocalResult(rows, baseQuery({ kpis }));
    const status = (label: string) =>
      result.kpiRowTotals[result.rowHeaders.findIndex((h) => h.label === label)]?.[0];
    // North 200 vs 280 -> 0.71, South 800 vs 605 -> above goal.
    expect(status("North")?.state).toBe("below");
    expect(status("South")?.state).toBe("onTarget");
    expect(status("North")?.goal).toBe(280);
  });

  it("flags the at-risk band just under the goal", () => {
    expect(computeKpiStatus(95, 100, { goal: "t" })?.state).toBe("atRisk");
    expect(computeKpiStatus(50, 100, { goal: "t" })?.state).toBe("below");
    expect(computeKpiStatus(120, 100, { goal: "t" })?.state).toBe("onTarget");
  });

  it("supports lower-is-better KPIs and fixed numeric goals", () => {
    expect(computeKpiStatus(80, 100, { goal: 100, direction: "lower" })?.state).toBe("onTarget");
    const result = buildLocalResult(rows, baseQuery({ kpis: { revenue: { goal: 250 } } }));
    expect(result.kpiStatuses[0]?.[0]?.goal).toBe(250);
  });

  it("returns no status when the measure is not a KPI", () => {
    const result = buildLocalResult(rows, baseQuery());
    expect(result.kpiStatuses[0]?.[0]).toBeNull();
    expect(result.kpiRowTotals[0]?.[0]).toBeNull();
  });
});

describe("REST contract", () => {
  it("sends formulas and KPI metadata to the service and renders what comes back", async () => {
    const api = createMockPivotApi({ rows, datasetId: "sales" });
    const engine = createBackendEngine({ baseUrl: "https://api.test", fetchImpl: api.fetch });
    const result = await engine.query(
      baseQuery({
        values: [
          { field: "revenue", aggregator: "sum" },
          { field: "share", aggregator: "sum" },
        ],
        calculated: [
          { name: "share", formula: "[revenue] / grandTotal([revenue]) * 100", scope: "aggregate" },
        ],
        kpis: { revenue: { goal: "target" } },
        datasetId: "sales",
      }),
      rows,
    );
    const sent = api.requests.at(-1)?.body as PivotQuery;
    expect(sent.calculated?.[0]?.scope).toBe("aggregate");
    expect(sent.kpis?.["revenue"]?.goal).toBe("target");
    expect(result.meta.source).toBe("backend");
    // North / Q1 is 100 of the 1000 grand total.
    expect(result.cells[0]?.[1]).toBeCloseTo(10);
    expect(result.kpiRowTotals[0]?.[0]?.state).toBe("below");
  });
});
