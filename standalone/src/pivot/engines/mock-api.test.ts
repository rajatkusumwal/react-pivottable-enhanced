/**
 * Grid features over the REST contract.
 *
 * Every grid capability the UI exposes is issued as a `PivotQuery` against the
 * mock API and asserted on the returned `PivotResult`, proving the grid is fully
 * drivable by a backend service (Spring Boot + DuckDB) with no local data.
 */
import { describe, expect, it, beforeEach } from "vitest";
import { createMockPivotApi } from "./mock-api";
import { createBackendClient, createBackendEngine } from "./backend";
import { keyOf, type PivotQuery, type PivotResult } from "../result";
import type { PivotRow } from "../types";

const rows: PivotRow[] = [
  { region: "North", country: "USA", category: "Bikes", year: "2024", revenue: 100, units: 2 },
  { region: "North", country: "USA", category: "Cars", year: "2025", revenue: 300, units: 1 },
  { region: "North", country: "Canada", category: "Bikes", year: "2024", revenue: 50, units: 5 },
  { region: "South", country: "Brazil", category: "Bikes", year: "2025", revenue: 200, units: 4 },
  { region: "South", country: "Brazil", category: "Cars", year: "2024", revenue: 400, units: 3 },
];

const api = createMockPivotApi({ rows, datasetId: "sales" });
const client = createBackendClient({
  baseUrl: "https://api.test",
  fetchImpl: api.fetch,
  datasetId: "sales",
});
const engine = createBackendEngine({
  baseUrl: "https://api.test",
  fetchImpl: api.fetch,
  datasetId: "sales",
});

const query = (partial: Partial<PivotQuery> = {}): PivotQuery => ({
  rows: ["region", "country"],
  cols: ["category"],
  values: [{ field: "revenue", aggregator: "sum" }],
  filters: [],
  showSubTotals: true,
  showGrandTotals: true,
  layout: "compact",
  collapsed: [],
  locale: "en",
  ...partial,
});

const ask = (partial: Partial<PivotQuery> = {}): Promise<PivotResult> =>
  engine.query(query(partial), []);

const labels = (result: PivotResult) => result.rowHeaders.map((h) => h.label);
const kinds = (result: PivotResult) => result.rowHeaders.map((h) => h.kind);

beforeEach(() => api.reset());

describe("grid layouts over the API", () => {
  it("returns a compact hierarchy", async () => {
    const result = await ask({ layout: "compact" });
    expect(result.meta.source).toBe("backend");
    expect(labels(result)).toContain("North");
    expect(labels(result)).toContain("USA");
  });

  it("returns the classic form with one column per row field", async () => {
    const result = await ask({ layout: "classic" });
    expect(result.rowFields).toEqual(["region", "country"]);
  });

  it("returns a flat form without subtotal rows", async () => {
    const result = await ask({ layout: "flat" });
    expect(kinds(result)).not.toContain("subtotal");
  });
});

describe("totals over the API", () => {
  it("includes subtotals and drops them when switched off", async () => {
    expect(kinds(await ask({ showSubTotals: true }))).toContain("subtotal");
    expect(kinds(await ask({ showSubTotals: false }))).not.toContain("subtotal");
  });

  it("includes a grand total row and drops it when switched off", async () => {
    expect(kinds(await ask({ showGrandTotals: true }))).toContain("grand");
    expect(kinds(await ask({ showGrandTotals: false }))).not.toContain("grand");
  });

  it("honours the grand totals position", async () => {
    const top = await ask({ grandTotalsPosition: "top" });
    const bottom = await ask({ grandTotalsPosition: "bottom" });
    expect(top.rowHeaders[0]?.kind).toBe("grand");
    expect(bottom.rowHeaders.at(-1)?.kind).toBe("grand");
  });

  it("computes the grand total from the whole dataset", async () => {
    const result = await ask();
    expect(result.grandTotal).toBe(1050);
  });
});

describe("drill up and down over the API", () => {
  it("hides children of a collapsed row member", async () => {
    const result = await ask({ collapsed: [keyOf(["North"])] });
    expect(labels(result)).toContain("North");
    expect(labels(result)).not.toContain("USA");
  });

  it("aggregates a collapsed column member into one leaf", async () => {
    const expanded = await ask({ cols: ["year", "category"] });
    const collapsed = await ask({ cols: ["year", "category"], collapsedCols: [keyOf(["2024"])] });
    expect(collapsed.colLeaves.length).toBeLessThan(expanded.colLeaves.length);
  });

  it("sends the collapsed paths in the request body", async () => {
    await ask({ collapsed: [keyOf(["North"])], collapsedCols: [keyOf(["Bikes"])] });
    const last = api.requests.at(-1)?.body as PivotQuery;
    expect(last.collapsed).toEqual([keyOf(["North"])]);
    expect(last.collapsedCols).toEqual([keyOf(["Bikes"])]);
  });
});

describe("sorting and filtering over the API", () => {
  it("sorts row members", async () => {
    const desc = await ask({
      layout: "flat",
      rows: ["region"],
      sort: { by: "rows", direction: "desc" },
    });
    expect(labels(desc)[0]).toBe("South");
  });

  it("passes a multi-column sort chain for the flat layout", async () => {
    const sorts = [
      { by: 0 as const, direction: "desc" as const },
      { by: "rows" as const, direction: "asc" as const },
    ];
    await ask({ layout: "flat", sorts });
    expect((api.requests.at(-1)?.body as PivotQuery).sorts).toEqual(sorts);
  });

  it("applies filters server-side", async () => {
    const result = await ask({
      filters: [{ kind: "values", field: "region", mode: "include", members: ["North"] }],
    });
    expect(labels(result)).not.toContain("South");
    expect(result.grandTotal).toBe(450);
  });

  it("applies date conditional filters server-side", async () => {
    const dated: PivotRow[] = [
      { region: "North", category: "Bikes", orderDate: "2024-01-05", revenue: 100 },
      { region: "North", category: "Bikes", orderDate: "2024-02-10", revenue: 200 },
      { region: "South", category: "Bikes", orderDate: "2024-03-20", revenue: 300 },
    ];
    const dateApi = createMockPivotApi({ rows: dated, datasetId: "dates" });
    const dateEngine = createBackendEngine({
      baseUrl: "https://api.test",
      fetchImpl: dateApi.fetch,
      datasetId: "dates",
    });
    const dateClient = createBackendClient({
      baseUrl: "https://api.test",
      fetchImpl: dateApi.fetch,
      datasetId: "dates",
    });
    const filters = [
      {
        kind: "condition" as const,
        field: "orderDate",
        operator: "gte" as const,
        value: "2024-02-01",
        valueType: "date" as const,
      },
    ];
    const result = await dateEngine.query(query({ rows: ["region"], filters }), []);
    expect(result.grandTotal).toBe(500);
    expect((dateApi.requests.at(-1)?.body as PivotQuery).filters).toEqual(filters);

    const range = await dateEngine.query(
      query({
        rows: ["region"],
        filters: [
          {
            kind: "condition",
            field: "orderDate",
            operator: "between",
            value: "2024-01-01",
            value2: "2024-02-28",
            valueType: "date",
          },
        ],
      }),
      [],
    );
    expect(range.grandTotal).toBe(300);

    const drill = await dateClient.drillThrough({
      query: query({ rows: ["region"], filters }),
      rowKey: ["North"],
      colKey: [],
    });
    expect(drill.rows).toHaveLength(1);
    expect(drill.rows[0]?.["orderDate"]).toBe("2024-02-10");
  });

  it("applies time conditional filters server-side", async () => {
    const timed: PivotRow[] = [
      { region: "North", category: "Bikes", orderTime: "08:15", revenue: 100 },
      { region: "North", category: "Bikes", orderTime: "12:00", revenue: 200 },
      { region: "South", category: "Bikes", orderTime: "19:45", revenue: 300 },
    ];
    const timeApi = createMockPivotApi({ rows: timed, datasetId: "times" });
    const timeEngine = createBackendEngine({
      baseUrl: "https://api.test",
      fetchImpl: timeApi.fetch,
      datasetId: "times",
    });
    const filters = [
      {
        kind: "condition" as const,
        field: "orderTime",
        operator: "between" as const,
        value: "09:00",
        value2: "17:00",
        valueType: "time" as const,
      },
    ];
    const result = await timeEngine.query(query({ rows: ["region"], filters }), []);
    expect(result.grandTotal).toBe(200);
    expect((timeApi.requests.at(-1)?.body as PivotQuery).filters).toEqual(filters);

    const after = await timeEngine.query(
      query({
        rows: ["region"],
        filters: [
          {
            kind: "condition",
            field: "orderTime",
            operator: "gte",
            value: "12:00",
            valueType: "time",
          },
        ],
      }),
      [],
    );
    expect(after.grandTotal).toBe(500);
  });

  it("applies subquery filters server-side", async () => {
    // North totals 450, South totals 600.
    const filters = [
      {
        kind: "subquery" as const,
        field: "region",
        measure: "revenue",
        aggregator: "sum" as const,
        operator: "gt" as const,
        value: 500,
      },
    ];
    const result = await ask({ rows: ["region"], filters });
    expect(labels(result)).toContain("South");
    expect(labels(result)).not.toContain("North");
    expect(result.grandTotal).toBe(600);
    expect((api.requests.at(-1)?.body as PivotQuery).filters).toEqual(filters);
  });

  it("pages results with limit and offset", async () => {
    const first = await ask({ layout: "flat", rows: ["country"], limit: 2, offset: 0 });
    const second = await ask({ layout: "flat", rows: ["country"], limit: 2, offset: 3 });
    expect(first.sourceCount).toBe(2);
    expect(second.sourceCount).toBe(2);
  });
});

describe("measures and drill-through over the API", () => {
  it("switches aggregator and measure", async () => {
    const result = await ask({ values: [{ field: "units", aggregator: "average" }] });
    expect(result.measure).toMatchObject({ field: "units", aggregator: "average" });
  });

  it("returns the records behind a cell", async () => {
    const records = await engine.drillThrough(
      { rowKey: ["North", "USA"], colKey: ["Bikes"], query: query() },
      [],
    );
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ country: "USA", revenue: 100 });
  });
});

describe("field list, members and datasets over the API", () => {
  it("loads field metadata", async () => {
    const { fields } = await client.fields();
    expect(fields.map((f) => f.name)).toEqual(
      expect.arrayContaining(["region", "country", "category", "revenue"]),
    );
  });

  it("searches members for the filter popover", async () => {
    const result = await client.members("country", "a", 10);
    expect(result.members).toEqual(expect.arrayContaining(["Canada", "Brazil"]));
    expect(result.total).toBe(result.members.length);
  });

  it("uploads a dataset and queries it by id", async () => {
    const handle = await client.upload(new File(["a,b\n1,2"], "data.csv", { type: "text/csv" }));
    expect(handle.rowCount).toBe(rows.length);
    const result = await engine.query(query({ datasetId: handle.datasetId }), []);
    expect(result.grandTotal).toBe(1050);
  });

  it("reports an unknown dataset as an error", async () => {
    await expect(client.fields("nope")).rejects.toMatchObject({ status: 404 });
  });
});

describe("inline editing over the API", () => {
  it("writes an edited cell back to the server dataset", async () => {
    const response = await client.applyEdit({
      rowFields: ["region", "country"],
      colFields: ["category"],
      rowKey: ["North", "USA"],
      colKey: ["Bikes"],
      field: "revenue",
      aggregator: "sum",
      value: 500,
    });
    expect(response.changed).toBe(true);
    const result = await ask();
    expect(result.grandTotal).toBe(1450);
  });

  it("rejects an edit on a non-editable aggregator", async () => {
    await expect(
      client.applyEdit({
        rowFields: ["region"],
        colFields: [],
        rowKey: ["North"],
        colKey: [],
        field: "revenue",
        aggregator: "count",
        value: 5,
      }),
    ).rejects.toMatchObject({ status: 422 });
  });
});
