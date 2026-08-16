/**
 * In-memory mock of the Spring Boot + DuckDB pivot API.
 *
 * It implements every endpoint documented in README.md on top of the local
 * engine, so the whole grid (layouts, subtotals, grand-total position, row and
 * column drill, multi-column sort, filters, drill-through and inline editing)
 * can be exercised end-to-end against the REST contract without a server.
 *
 *   const api = createMockPivotApi({ rows: sampleData, fields: sampleFields });
 *   const engine = createBackendEngine({ baseUrl: "https://api.test", fetchImpl: api.fetch });
 */
import { applyCellEdit, type CellEditRequest } from "../editing";
import { applyFilters, uniqueMembers } from "../filters";
import { inferFields } from "../data-sources";
import type { FieldDef, PivotRow } from "../types";
import type { DrillThroughQuery, PivotQuery, PivotResult } from "../result";
import { buildLocalResult, localDrillThrough } from "./local";

export interface MockPivotApiOptions {
  rows: PivotRow[];
  fields?: FieldDef[];
  /** Dataset id served by default. */
  datasetId?: string;
}

export interface MockPivotApi {
  /** Drop-in replacement for `fetch`, pass it as `fetchImpl`. */
  fetch: typeof fetch;
  /** Every request the client made: { path, body }. */
  requests: { path: string; body: unknown }[];
  /** Current server-side records per dataset (inline edits are applied here). */
  datasets: Map<string, PivotRow[]>;
  reset(): void;
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export function createMockPivotApi(options: MockPivotApiOptions): MockPivotApi {
  const mainId = options.datasetId ?? "sales";
  const initial = options.rows.map((r) => ({ ...r }));
  const datasets = new Map<string, PivotRow[]>([[mainId, initial]]);
  const fields = options.fields ?? inferFields(options.rows);
  const requests: { path: string; body: unknown }[] = [];
  let uploads = 0;

  const rowsFor = (datasetId?: string) => datasets.get(datasetId ?? mainId) ?? [];

  const run = (query: PivotQuery): PivotResult => {
    const source = applyFilters(rowsFor(query.datasetId), query.filters ?? []);
    const paged =
      query.limit != null ? source.slice(query.offset ?? 0, (query.offset ?? 0) + query.limit) : source;
    const result = buildLocalResult(paged, query);
    return { ...result, meta: { source: "backend", queryId: `mock-${requests.length}` } };
  };

  const handler = async (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    const url = new URL(String(input), "https://mock.local");
    const path = url.pathname;
    const method = (init?.method ?? "GET").toUpperCase();
    const raw = init?.body;

    if (raw instanceof FormData) {
      uploads += 1;
      const id = `upload-${uploads}`;
      datasets.set(id, initial.map((r) => ({ ...r })));
      requests.push({ path, body: "multipart" });
      return json({ datasetId: id, rowCount: initial.length, fields });
    }

    const body = typeof raw === "string" && raw ? JSON.parse(raw) : {};
    requests.push({ path, body });

    if (path.endsWith("/fields") && method === "GET") {
      const datasetId = url.searchParams.get("datasetId") ?? undefined;
      if (datasetId && !datasets.has(datasetId)) return json({ message: "Unknown dataset" }, 404);
      return json({ fields });
    }

    if (path.endsWith("/query")) {
      try {
        return json(run(body as PivotQuery));
      } catch (error) {
        return json({ message: (error as Error).message }, 500);
      }
    }

    if (path.endsWith("/drillthrough")) {
      const request = body as DrillThroughQuery;
      const source = applyFilters(rowsFor(request.query?.datasetId), request.query?.filters ?? []);
      const { limit: _cap, ...uncapped } = request;
      const all = localDrillThrough(source, uncapped);
      const rows = localDrillThrough(source, request);
      return json({ rows, total: all.length });
    }

    // Remote dataset registration (S3 path / warehouse table / parquet file).
    if (path.endsWith("/datasets") && method === "POST") {
      const { uri } = body as { uri?: string };
      if (!uri) return json({ message: "uri is required" }, 400);
      uploads += 1;
      const id = `remote-${uploads}`;
      datasets.set(id, initial.map((r) => ({ ...r })));
      return json({ datasetId: id, rowCount: initial.length, fields });
    }

    if (path.endsWith("/members")) {
      const { field, search = "", limit = 200, datasetId } = body as {
        field: string;
        search?: string;
        limit?: number;
        datasetId?: string;
      };
      const all = uniqueMembers(rowsFor(datasetId), field).filter((m) =>
        m.toLowerCase().includes(String(search).toLowerCase()),
      );
      return json({ members: all.slice(0, limit), total: all.length });
    }

    if (path.endsWith("/edit")) {
      const { datasetId, ...request } = body as CellEditRequest & { datasetId?: string };
      const key = datasetId ?? mainId;
      const current = rowsFor(key);
      const outcome = applyCellEdit(current, request);
      if (!outcome.changed) return json({ changed: false, reason: outcome.reason }, 422);
      datasets.set(key, outcome.rows);
      return json({ changed: true, rowCount: outcome.rows.length });
    }

    return json({ message: `No mock handler for ${method} ${path}` }, 404);
  };

  return {
    fetch: ((input: RequestInfo | URL, init?: RequestInit) => handler(input, init)) as typeof fetch,
    requests,
    datasets,
    reset() {
      datasets.clear();
      datasets.set(mainId, initial.map((r) => ({ ...r })));
      requests.length = 0;
      uploads = 0;
    },
  };
}
