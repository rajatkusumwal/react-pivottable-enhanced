/**
 * Backend failure paths.
 *
 * The happy contract lives in `backend.test.ts`; this file covers what happens
 * when the service misbehaves — HTTP errors, dropped connections, timeouts and
 * payloads that do not look like a `PivotResult`. The rule the component relies
 * on: every failure surfaces as a rejected promise, never as a half-built grid.
 */
import { describe, expect, it, vi } from "vitest";
import {
  PivotBackendError,
  createBackendClient,
  createBackendEngine,
  createHybridEngine,
} from "./backend";
import type { PivotQuery } from "../result";
import type { PivotRow } from "../types";

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

const rows: PivotRow[] = [{ region: "North", category: "Bikes", revenue: 100 }];

const fetchReturning = (response: Response | Promise<Response>) =>
  vi.fn(() => Promise.resolve(response)) as unknown as typeof fetch;

const fetchRejecting = (error: Error) =>
  vi.fn(() => Promise.reject(error)) as unknown as typeof fetch;

describe("backend HTTP errors", () => {
  it("raises PivotBackendError with the status and server message on 500", async () => {
    const client = createBackendClient({
      baseUrl: "https://analytics.test",
      fetchImpl: fetchReturning(new Response("duckdb: out of memory", { status: 500 })),
    });
    await expect(client.query(query())).rejects.toMatchObject({
      name: "PivotBackendError",
      status: 500,
      message: "duckdb: out of memory",
    });
  });

  it("falls back to a generic message when the error body is empty", async () => {
    const client = createBackendClient({
      baseUrl: "https://analytics.test",
      fetchImpl: fetchReturning(new Response("", { status: 503 })),
    });
    await expect(client.query(query())).rejects.toThrow("Request failed (503)");
  });

  it("reports 401 so the host app can re-authenticate instead of retrying", async () => {
    const client = createBackendClient({
      baseUrl: "https://analytics.test",
      headers: { Authorization: "Bearer expired" },
      fetchImpl: fetchReturning(new Response("token expired", { status: 401 })),
    });
    const error = await client.fields().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PivotBackendError);
    expect((error as PivotBackendError).status).toBe(401);
  });

  it("surfaces upload failures with the server status", async () => {
    const client = createBackendClient({
      baseUrl: "https://analytics.test",
      fetchImpl: fetchReturning(new Response("file too large", { status: 413 })),
    });
    const file = new File(["a,b\n1,2"], "data.csv", { type: "text/csv" });
    await expect(client.upload(file)).rejects.toMatchObject({ status: 413 });
  });
});

describe("backend transport failures", () => {
  it("propagates a dropped connection", async () => {
    const client = createBackendClient({
      baseUrl: "https://analytics.test",
      fetchImpl: fetchRejecting(new TypeError("Failed to fetch")),
    });
    await expect(client.query(query())).rejects.toThrow("Failed to fetch");
  });

  it("propagates an aborted (timed out) request", async () => {
    const abort = new DOMException("The operation was aborted.", "AbortError");
    const client = createBackendClient({
      baseUrl: "https://analytics.test",
      fetchImpl: fetchRejecting(abort as unknown as Error),
    });
    await expect(client.drillThrough({ query: query(), rowKey: [], colKey: [] })).rejects.toThrow(
      /aborted/i,
    );
  });

  it("rejects when the body is not valid JSON", async () => {
    const client = createBackendClient({
      baseUrl: "https://analytics.test",
      fetchImpl: fetchReturning(
        new Response("<html>gateway timeout</html>", {
          status: 200,
          headers: { "Content-Type": "text/html" },
        }),
      ),
    });
    await expect(client.query(query())).rejects.toThrow();
  });
});

describe("engines under failure", () => {
  it("does not silently swallow a backend error inside the engine adapter", async () => {
    const engine = createBackendEngine({
      baseUrl: "https://analytics.test",
      fetchImpl: fetchReturning(new Response("boom", { status: 500 })),
    });
    await expect(engine.query(query(), rows)).rejects.toMatchObject({ status: 500 });
  });

  it("returns a malformed payload untouched rather than guessing at a shape", async () => {
    // The engine only tags `meta.source`; validating the payload is the host
    // app's job, so a wrong shape must not be papered over with defaults.
    const engine = createBackendEngine({
      baseUrl: "https://analytics.test",
      fetchImpl: fetchReturning(
        new Response(JSON.stringify({ nonsense: true }), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }),
      ),
    });
    const result = await engine.query(query(), rows);
    expect(result.rowHeaders).toBeUndefined();
    expect(result.meta?.source).toBe("backend");
  });

  it("keeps small datasets local even when the backend is down", async () => {
    const fetchImpl = fetchRejecting(new TypeError("Failed to fetch"));
    const engine = createHybridEngine({
      baseUrl: "https://analytics.test",
      threshold: 10_000,
      fetchImpl,
    });
    const result = await engine.query(query(), rows);
    expect(result.rowHeaders.length).toBeGreaterThan(0);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("still fails loudly for large datasets when the backend is down", async () => {
    const engine = createHybridEngine({
      baseUrl: "https://analytics.test",
      threshold: 0,
      fetchImpl: fetchRejecting(new TypeError("Failed to fetch")),
    });
    await expect(engine.query(query(), rows)).rejects.toThrow("Failed to fetch");
  });
});
