/**
 * Custom data source API — plug any backend into Pivot Studio.
 *
 * Implement as much of `CustomDataSource` as your service supports:
 *
 *  - `query`         → the backend aggregates (SQL/DuckDB/OLAP/GraphQL/gRPC-web)
 *  - `aggregate`     → the backend returns partial aggregates as plain records
 *  - `fetchRows`     → the backend only returns records; the browser aggregates
 *
 * Everything else (fields, members, drill-through, edits) is optional and falls
 * back to a sensible local behaviour.
 */
import type { FieldDef, PivotRow } from "../types";
import type {
  DrillThroughQuery,
  PivotEngineAdapter,
  PivotQuery,
  PivotResult,
} from "../result";
import { buildLocalResult, localDrillThrough } from "./local";

export interface CustomDataSource {
  /** Identifier shown in diagnostics, e.g. "graphql" or "snowflake". */
  id?: string;
  /** Field metadata, when the backend can describe the dataset. */
  getFields?: () => Promise<FieldDef[]>;
  /** Full server-side aggregation: returns a ready-to-render PivotResult. */
  query?: (request: PivotQuery) => Promise<PivotResult>;
  /**
   * Partial server-side aggregation: return already-grouped records (one per
   * row/column member combination). The browser only lays them out.
   */
  aggregate?: (request: PivotQuery) => Promise<PivotRow[]>;
  /** Raw records; used when the backend cannot aggregate. */
  fetchRows?: (request: PivotQuery) => Promise<PivotRow[]>;
  /** Records behind one cell. Falls back to local filtering of `fetchRows`. */
  drillThrough?: (request: DrillThroughQuery) => Promise<PivotRow[]>;
  /** Distinct members of a field, for the filter popovers. */
  getMembers?: (field: string, search?: string) => Promise<string[]>;
}

/** Wraps any custom data source in the engine contract PivotStudio expects. */
export function createCustomEngine(source: CustomDataSource): PivotEngineAdapter {
  const id = source.id ?? "custom";
  if (!source.query && !source.aggregate && !source.fetchRows) {
    throw new Error("A custom data source needs at least one of query, aggregate or fetchRows");
  }

  const rowsFor = async (request: PivotQuery, fallback: PivotRow[]) => {
    if (source.aggregate) return source.aggregate(request);
    if (source.fetchRows) return source.fetchRows(request);
    return fallback;
  };

  return {
    id,
    query: async (request, rows) => {
      if (source.query) {
        const result = await source.query(request);
        return { ...result, meta: { ...result.meta, source: "backend", queryId: id } };
      }
      const data = await rowsFor(request, rows);
      const result = buildLocalResult(data, request);
      return { ...result, meta: { source: "backend", queryId: id } };
    },
    drillThrough: async (request, rows) => {
      if (source.drillThrough) return source.drillThrough(request);
      const data = await rowsFor(request.query, rows);
      return localDrillThrough(data, request);
    },
  };
}
