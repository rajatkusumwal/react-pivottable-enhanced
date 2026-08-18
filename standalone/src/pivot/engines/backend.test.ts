/**
 * Backend integration tests against a mocked REST API.
 *
 * No Spring Boot / DuckDB service is needed: `fetchImpl` is replaced with a mock
 * that asserts the request contract documented in README.md and replies with
 * canned `PivotResult` payloads.
 */
import { describe, expect, it, vi } from "vitest";
import {
  PivotBackendError,
  createBackendClient,
  createBackendEngine,
  createHybridEngine,
} from "./backend";
import { buildLocalResult } from "./local";
import type { PivotQuery, PivotResult } from "../result";
import type { PivotRow } from "../types";

const rows: PivotRow[] = [
  { region: "North", category: "Bikes", revenue: 100 },
  { region: "South", category: "Bikes", revenue: 300 },
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

/** Canned server response — shaped exactly like the local engine output. */
const serverResult = (): PivotResult => ({
  ...buildLocalResult(rows, query()),
  meta: { source: "backend", queryId: "q-1" },
});

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

const mockFetch = (handler: (url: string, init: RequestInit) => Response | Promise<Response>) =>
  vi.fn((input: RequestInfo | URL, init?: RequestInit) =>
    Promise.resolve(handler(String(input), init ?? {})),
  ) as unknown as typeof fetch;

describe("backend client contract", () => {
  it("POSTs the query to /api/pivot/query with auth headers and the dataset id", async () => {
    const calls: { url: string; init: RequestInit }[] = [];
    const fetchImpl = mockFetch((url, init) => {
      calls.push({ url, init });
      return jsonResponse(serverResult());
    });
    const client = createBackendClient({
      baseUrl: "https://analytics.example.com/",
      datasetId: "sales-2026",
      headers: { Authorization: "Bearer token" },
      fetchImpl,
    });

    const result = await client.query(query());

    expect(calls).toHaveLength(1);
    expect(calls[0]!.url).toBe("https://analytics.example.com/api/pivot/query");
    expect(calls[0]!.init.method).toBe("POST");
    const headers = calls[0]!.init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
    expect(headers["Authorization"]).toBe("Bearer token");
    const body = JSON.parse(String(calls[0]!.init.body));
    expect(body).toMatchObject({
      rows: ["region"],
      cols: ["category"],
      values: [{ field: "revenue", aggregator: "sum" }],
      showSubTotals: true,
      showGrandTotals: true,
      layout: "compact",
      datasetId: "sales-2026",
    });
    expect(result.grandTotal).toBe(400);
  });

  it("lets an explicit datasetId on the query win", async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = mockFetch((_url, init) => {
      body = JSON.parse(String(init.body));
      return jsonResponse(serverResult());
    });
    const client = createBackendClient({
      baseUrl: "https://api.test",
      datasetId: "default",
      fetchImpl,
    });
    await client.query(query({ datasetId: "override" }));
    expect(body["datasetId"]).toBe("override");
  });

  it("POSTs drill-through requests and returns the raw records", async () => {
    let url = "";
    let body: Record<string, unknown> = {};
    const fetchImpl = mockFetch((u, init) => {
      url = u;
      body = JSON.parse(String(init.body));
      return jsonResponse({ rows });
    });
    const client = createBackendClient({ baseUrl: "https://api.test", datasetId: "ds", fetchImpl });

    const records = await client.drillThrough({
      rowKey: ["North"],
      colKey: ["Bikes"],
      query: query(),
      limit: 50,
    });

    expect(url).toBe("https://api.test/api/pivot/drillthrough");
    expect(body["rowKey"]).toEqual(["North"]);
    expect((body["query"] as Record<string, unknown>)["datasetId"]).toBe("ds");
    expect(records.rows).toHaveLength(2);
  });

  it("GETs the field metadata with the dataset id in the query string", async () => {
    let url = "";
    const fetchImpl = mockFetch((u) => {
      url = u;
      return jsonResponse({ fields: [{ name: "revenue", caption: "Revenue", type: "number" }] });
    });
    const client = createBackendClient({
      baseUrl: "https://api.test",
      datasetId: "a b",
      fetchImpl,
    });
    const { fields } = await client.fields();
    expect(url).toBe("https://api.test/api/pivot/fields?datasetId=a%20b");
    expect(fields[0]!.name).toBe("revenue");
  });

  it("POSTs member lookups for the filter popover", async () => {
    let body: Record<string, unknown> = {};
    const fetchImpl = mockFetch((_u, init) => {
      body = JSON.parse(String(init.body));
      return jsonResponse({ members: ["North", "South"], total: 2 });
    });
    const client = createBackendClient({ baseUrl: "https://api.test", fetchImpl });
    const res = await client.members("region", "or", 10);
    expect(body).toMatchObject({ field: "region", search: "or", limit: 10 });
    expect(res.members).toEqual(["North", "South"]);
  });

  it("uploads a file as multipart form data and returns the dataset handle", async () => {
    let init: RequestInit = {};
    let url = "";
    const fetchImpl = mockFetch((u, i) => {
      url = u;
      init = i;
      return jsonResponse({ datasetId: "ds-9", rowCount: 2, fields: [] });
    });
    const client = createBackendClient({ baseUrl: "https://api.test", fetchImpl });
    const file = new File(["region,revenue\nNorth,1\n"], "sales.csv", { type: "text/csv" });

    const res = await client.upload(file);

    expect(url).toBe("https://api.test/api/pivot/datasets");
    expect(init.body).toBeInstanceOf(FormData);
    expect((init.body as FormData).get("file")).toBeInstanceOf(File);
    // No JSON content-type: the browser sets the multipart boundary itself.
    expect((init.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
    expect(res.datasetId).toBe("ds-9");
  });

  it("honours custom endpoint paths", async () => {
    let url = "";
    const fetchImpl = mockFetch((u) => {
      url = u;
      return jsonResponse(serverResult());
    });
    const client = createBackendClient({
      baseUrl: "https://api.test",
      paths: { query: "/v2/pivot" },
      fetchImpl,
    });
    await client.query(query());
    expect(url).toBe("https://api.test/v2/pivot");
  });
});

describe("backend error handling", () => {
  it("throws PivotBackendError with the status and server message", async () => {
    const fetchImpl = mockFetch(() => new Response("dataset not found", { status: 404 }));
    const client = createBackendClient({ baseUrl: "https://api.test", fetchImpl });
    await expect(client.query(query())).rejects.toMatchObject({
      name: "PivotBackendError",
      status: 404,
      message: "dataset not found",
    });
  });

  it("falls back to a generic message when the body is empty", async () => {
    const fetchImpl = mockFetch(() => new Response("", { status: 500 }));
    const client = createBackendClient({ baseUrl: "https://api.test", fetchImpl });
    const error = await client.query(query()).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PivotBackendError);
    expect((error as PivotBackendError).message).toContain("500");
  });

  it("surfaces upload failures", async () => {
    const fetchImpl = mockFetch(() => new Response("file too large", { status: 413 }));
    const client = createBackendClient({ baseUrl: "https://api.test", fetchImpl });
    const file = new File(["x"], "big.csv", { type: "text/csv" });
    await expect(client.upload(file)).rejects.toMatchObject({ status: 413 });
  });
});

describe("backend engine adapter", () => {
  it("marks results as coming from the backend", async () => {
    const fetchImpl = mockFetch(() =>
      jsonResponse({ ...serverResult(), meta: { source: "local" } }),
    );
    const engine = createBackendEngine({ baseUrl: "https://api.test", fetchImpl });
    const result = await engine.query(query(), []);
    expect(result.meta.source).toBe("backend");
    expect(result.rowHeaders.length).toBeGreaterThan(0);
  });

  it("returns drill-through rows through the adapter", async () => {
    const fetchImpl = mockFetch(() => jsonResponse({ rows }));
    const engine = createBackendEngine({ baseUrl: "https://api.test", fetchImpl });
    const records = await engine.drillThrough(
      { rowKey: ["North"], colKey: ["Bikes"], query: query() },
      [],
    );
    expect(records).toHaveLength(2);
  });
});

describe("hybrid engine routing", () => {
  it("aggregates in the browser for small datasets", async () => {
    const fetchImpl = mockFetch(() => jsonResponse(serverResult()));
    const engine = createHybridEngine({ baseUrl: "https://api.test", threshold: 10, fetchImpl });
    const result = await engine.query(query(), rows);
    expect(result.meta.source).toBe("local");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("delegates to the backend once the row threshold is passed", async () => {
    const fetchImpl = mockFetch(() => jsonResponse(serverResult()));
    const engine = createHybridEngine({ baseUrl: "https://api.test", threshold: 1, fetchImpl });
    const result = await engine.query(query(), rows);
    expect(result.meta.source).toBe("backend");
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("always delegates when the data lives in a backend dataset", async () => {
    const fetchImpl = mockFetch(() => jsonResponse(serverResult()));
    const engine = createHybridEngine({
      baseUrl: "https://api.test",
      threshold: 1_000_000,
      fetchImpl,
    });
    await engine.query(query({ datasetId: "ds-1" }), []);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("routes drill-through the same way as the query", async () => {
    const fetchImpl = mockFetch(() => jsonResponse({ rows }));
    const engine = createHybridEngine({ baseUrl: "https://api.test", threshold: 1, fetchImpl });
    const records = await engine.drillThrough(
      { rowKey: ["North"], colKey: ["Bikes"], query: query() },
      rows,
    );
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(records).toHaveLength(2);
  });
});
