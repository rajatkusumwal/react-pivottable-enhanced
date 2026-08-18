/**
 * Backend pivot engine — talks to a Spring Boot + DuckDB service over REST.
 *
 * The service owns grouping, subtotals, filtering and paging; the browser only
 * renders the returned `PivotResult`. See README.md for the full API contract.
 */
import { MEMBER_PAGE_SIZE } from "../constants";
import type { CellEditRequest } from "../editing";
import type { FieldDef, PivotRow } from "../types";
import type { DrillThroughQuery, PivotEngineAdapter, PivotQuery, PivotResult } from "../result";
import { createLocalEngine } from "./local";

export interface BackendEngineOptions {
  /** e.g. "https://analytics.example.com" — endpoints are appended to it. */
  baseUrl: string;
  /** Dataset the queries run against. */
  datasetId?: string;
  /** Extra headers, typically Authorization. */
  headers?: Record<string, string>;
  fetchImpl?: typeof fetch;
  paths?: Partial<
    Record<"query" | "drillthrough" | "fields" | "members" | "datasets" | "edit", string>
  >;
}

const defaultPaths = {
  query: "/api/pivot/query",
  drillthrough: "/api/pivot/drillthrough",
  fields: "/api/pivot/fields",
  members: "/api/pivot/members",
  datasets: "/api/pivot/datasets",
  edit: "/api/pivot/edit",
};

export class PivotBackendError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PivotBackendError";
  }
}

export function createBackendClient(options: BackendEngineOptions) {
  const paths = { ...defaultPaths, ...options.paths };
  const doFetch = options.fetchImpl ?? fetch;
  const base = options.baseUrl.replace(/\/$/, "");

  async function call<T>(path: string, init: RequestInit): Promise<T> {
    const res = await doFetch(`${base}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(options.headers ?? {}),
        ...(init.headers ?? {}),
      },
    });
    if (!res.ok) {
      const text = await res.text().catch(() => "");
      throw new PivotBackendError(text || `Request failed (${res.status})`, res.status);
    }
    return (await res.json()) as T;
  }

  return {
    paths,
    query: (body: PivotQuery) =>
      call<PivotResult>(paths.query, {
        method: "POST",
        body: JSON.stringify({ ...body, datasetId: body.datasetId ?? options.datasetId }),
      }),
    drillThrough: (body: DrillThroughQuery) =>
      call<{ rows: PivotRow[] }>(paths.drillthrough, {
        method: "POST",
        body: JSON.stringify({
          ...body,
          query: { ...body.query, datasetId: body.query.datasetId ?? options.datasetId },
        }),
      }),
    fields: (datasetId = options.datasetId) =>
      call<{ fields: FieldDef[] }>(
        `${paths.fields}${datasetId ? `?datasetId=${encodeURIComponent(datasetId)}` : ""}`,
        { method: "GET" },
      ),
    members: (
      field: string,
      search = "",
      limit = MEMBER_PAGE_SIZE,
      datasetId = options.datasetId,
    ) =>
      call<{ members: string[]; total: number }>(paths.members, {
        method: "POST",
        body: JSON.stringify({ field, search, limit, datasetId }),
      }),
    /** Writes an inline cell edit back to the server-side dataset. */
    applyEdit: (request: CellEditRequest & { datasetId?: string }) =>
      call<{ changed: boolean; rowCount?: number; reason?: string }>(paths.edit, {
        method: "POST",
        body: JSON.stringify({ ...request, datasetId: request.datasetId ?? options.datasetId }),
      }),
    /** Uploads a CSV/JSON file and returns the dataset handle to query against. */
    upload: async (file: File) => {
      const form = new FormData();
      form.append("file", file);
      const res = await doFetch(`${base}${paths.datasets}`, {
        method: "POST",
        body: form,
        headers: options.headers ?? {},
      });
      if (!res.ok) {
        throw new PivotBackendError(await res.text().catch(() => "Upload failed"), res.status);
      }
      return (await res.json()) as { datasetId: string; rowCount: number; fields: FieldDef[] };
    },
  };
}

export function createBackendEngine(options: BackendEngineOptions): PivotEngineAdapter {
  const client = createBackendClient(options);
  return {
    id: "backend",
    query: async (request) => {
      const result = await client.query(request);
      return { ...result, meta: { ...result.meta, source: "backend" } };
    },
    drillThrough: async (request) => (await client.drillThrough(request)).rows,
  };
}

/**
 * Hybrid engine: aggregates in the browser while the dataset is small and hands
 * everything above `threshold` records over to the backend service.
 */
export function createHybridEngine(
  options: BackendEngineOptions & { threshold?: number },
): PivotEngineAdapter {
  const local = createLocalEngine();
  const backend = createBackendEngine(options);
  const threshold = options.threshold ?? 50_000;
  const pick = (rows: PivotRow[], request: PivotQuery) =>
    request.datasetId || rows.length > threshold ? backend : local;
  return {
    id: "hybrid",
    query: (request, rows) => pick(rows, request).query(request, rows),
    drillThrough: (request, rows) => pick(rows, request.query).drillThrough(request, rows),
  };
}
