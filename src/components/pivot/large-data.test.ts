/**
 * Custom data source API + large-dataset (server-side aggregation) tests.
 * Everything runs against the in-memory mock API — no backend service needed.
 */
import { describe, expect, it, vi } from "vitest";
import { createCustomEngine, type CustomDataSource } from "./engines/custom";
import {
  OFFLOAD_ROW_THRESHOLD,
  createServerAggregationEngine,
  registerRemoteDataset,
  shouldOffload,
  streamCsvRows,
} from "./engines/large-data";
import { createMockPivotApi } from "./engines/mock-api";
import { buildLocalResult } from "./engines/local";
import type { PivotQuery } from "./result";
import type { PivotRow } from "./types";

const rows: PivotRow[] = [
  { region: "North", category: "Bikes", revenue: 100 },
  { region: "South", category: "Bikes", revenue: 300 },
  { region: "North", category: "Cars", revenue: 50 },
];

const query = (partial: Partial<PivotQuery> = {}): PivotQuery => ({
  rows: ["region"],
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

describe("custom data source API", () => {
  it("uses a fully server-side query when the source provides one", async () => {
    const source: CustomDataSource = {
      id: "graphql",
      query: vi.fn(async (request) => buildLocalResult(rows, request)),
    };
    const engine = createCustomEngine(source);
    const result = await engine.query(query(), []);
    expect(source.query).toHaveBeenCalledOnce();
    expect(result.meta?.source).toBe("backend");
    expect(result.meta?.queryId).toBe("graphql");
    expect(result.grandTotal).toBe(450);
  });

  it("lays out pre-aggregated records returned by the backend", async () => {
    const aggregate = vi.fn(async () => rows);
    const engine = createCustomEngine({ id: "duckdb", aggregate });
    const result = await engine.query(query(), []);
    expect(aggregate).toHaveBeenCalledOnce();
    expect(result.grandTotal).toBe(450);
  });

  it("falls back to raw records plus browser aggregation", async () => {
    const engine = createCustomEngine({ fetchRows: async () => rows });
    const result = await engine.query(query(), []);
    expect(result.rowHeaders.length).toBeGreaterThanOrEqual(2);
    expect(result.grandTotal).toBe(450);
  });

  it("drills through with the source implementation, or locally", async () => {
    const custom = createCustomEngine({
      fetchRows: async () => rows,
      drillThrough: async () => [rows[0] as PivotRow],
    });
    const drill = { query: query(), rowKey: ["North"], colKey: ["Bikes"] };
    expect(await custom.drillThrough(drill, [])).toHaveLength(1);

    const local = createCustomEngine({ fetchRows: async () => rows });
    const records = await local.drillThrough(drill, []);
    expect(records).toEqual([rows[0]]);
  });

  it("rejects a source with no way to fetch data", () => {
    expect(() => createCustomEngine({ id: "empty" })).toThrow(/at least one/);
  });
});

describe("server-side aggregation of large datasets", () => {
  const api = () => createMockPivotApi({ rows, datasetId: "sales" });

  it("asks the service for a windowed result and never sees the records", async () => {
    const mock = api();
    const engine = createServerAggregationEngine({
      baseUrl: "https://api.test",
      fetchImpl: mock.fetch,
      pageSize: 1_000,
    });
    const result = await engine.query(query(), []);
    const sent = mock.requests[0]?.body as PivotQuery;
    expect(sent.limit).toBe(1_000);
    expect(sent.offset).toBe(0);
    expect(result.meta?.source).toBe("backend");
    expect(result.grandTotal).toBe(450);
  });

  it("honours an explicit page window", async () => {
    const mock = api();
    const engine = createServerAggregationEngine({
      baseUrl: "https://api.test",
      fetchImpl: mock.fetch,
    });
    await engine.query(query({ limit: 2, offset: 1 }), []);
    const sent = mock.requests[0]?.body as PivotQuery;
    expect(sent).toMatchObject({ limit: 2, offset: 1 });
  });

  it("caps drill-through rows requested from the service", async () => {
    const mock = api();
    const engine = createServerAggregationEngine({
      baseUrl: "https://api.test",
      fetchImpl: mock.fetch,
    });
    const records = await engine.drillThrough(
      { query: query(), rowKey: ["North"], colKey: ["Bikes"] },
      [],
    );
    expect(records).toHaveLength(1);
    expect((mock.requests[0]?.body as { limit: number }).limit).toBe(1_000);
  });

  it("registers a 1GB+ remote dataset instead of uploading it", async () => {
    const mock = api();
    const meta = await registerRemoteDataset({
      baseUrl: "https://api.test",
      fetchImpl: mock.fetch,
      uri: "s3://warehouse/sales-2024.parquet",
      format: "parquet",
    });
    expect(meta.datasetId).toBe("remote-1");
    expect(meta.rowCount).toBe(rows.length);
  });
});

describe("offload decision", () => {
  it("keeps small data in the browser", () => {
    expect(shouldOffload({ rowCount: 5_000 })).toMatchObject({ offload: false, reason: "none" });
  });
  it("offloads by row count", () => {
    expect(shouldOffload({ rowCount: OFFLOAD_ROW_THRESHOLD + 1 }).reason).toBe("rows");
  });
  it("offloads a 1GB file by size", () => {
    const decision = shouldOffload({ rowCount: 10, byteSize: 1024 ** 3 });
    expect(decision).toMatchObject({ offload: true, reason: "bytes" });
  });
});

describe("streaming huge CSV files", () => {
  const csvText = (n: number) =>
    ["region;revenue", ...Array.from({ length: n }, (_, i) => `R${i % 3};1.${i % 9}${i % 9}`)].join(
      "\n",
    );

  it("emits batches without holding the whole file", async () => {
    const batches: number[] = [];
    const summary = await streamCsvRows(
      (async function* () {
        const text = csvText(25);
        for (let i = 0; i < text.length; i += 7) yield text.slice(i, i + 7);
      })(),
      (rowsBatch) => {
        batches.push(rowsBatch.length);
        return undefined;
      },
      { csv: { delimiter: ";", decimalSeparator: "," }, batchSize: 10 },
    );
    expect(summary.rowCount).toBe(25);
    expect(summary.columns).toEqual(["region", "revenue"]);
    expect(batches).toEqual([10, 10, 5]);
  });

  it("parses values with the given dialect", async () => {
    const seen: PivotRow[] = [];
    await streamCsvRows(["region;revenue\nNorth;1.234,50\n"], (batch) => {
      seen.push(...batch);
    }, {
      csv: { delimiter: ";", decimalSeparator: ",", thousandsSeparator: "." },
    });
    expect(seen[0]).toEqual({ region: "North", revenue: 1234.5 });
  });

  it("stops early at maxRows so a 1GB file can be sampled", async () => {
    const summary = await streamCsvRows([csvText(5_000)], () => {}, {
      csv: { delimiter: ";", decimalSeparator: "," },
      maxRows: 100,
    });
    expect(summary.rowCount).toBe(100);
  });

  it("reads from a Blob stream", async () => {
    const seen: PivotRow[] = [];
    await streamCsvRows(
      new Blob([csvText(3)], { type: "text/csv" }),
      (batch) => {
        seen.push(...batch);
      },
      { csv: { delimiter: ";", decimalSeparator: "," } },
    );
    expect(seen).toHaveLength(3);
  });
});
