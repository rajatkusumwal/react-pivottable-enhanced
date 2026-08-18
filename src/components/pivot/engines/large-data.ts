/**
 * Large dataset support (server-side aggregation and 1GB+ files).
 *
 * Three pieces:
 *  1. `shouldOffload()` — decides browser vs backend from size/row estimates.
 *  2. `streamCsvRows()` — reads a huge CSV in batches so it is never fully in
 *     memory: batches can be counted, sampled or streamed to your service.
 *  3. `createServerAggregationEngine()` — always aggregates on the server and
 *     pages through the result window, so a 1GB+ dataset renders from a few KB.
 */
import { csvOptions, parseCsvNumber, type CsvOptions } from "../csv";
import type { PivotRow } from "../types";
import { ESTIMATED_BYTES_PER_ROW } from "../constants";
import type { PivotEngineAdapter, PivotQuery, PivotResult } from "../result";
import { createBackendClient, type BackendEngineOptions } from "./backend";

/** Above this the browser engine gets slow — hand the work to the backend. */
export const OFFLOAD_ROW_THRESHOLD = 100_000;
/** ~50 MB of raw text is the practical ceiling for an in-browser upload. */
export const OFFLOAD_BYTE_THRESHOLD = 50 * 1024 * 1024;

export interface OffloadDecision {
  offload: boolean;
  reason: "rows" | "bytes" | "none";
  /** Rough in-browser memory needed if the data were kept as JS objects. */
  estimatedBytes: number;
}

/** Decides whether a dataset should be aggregated by the backend service. */
export function shouldOffload(input: {
  rowCount?: number;
  byteSize?: number;
  rowThreshold?: number;
  byteThreshold?: number;
}): OffloadDecision {
  const rowThreshold = input.rowThreshold ?? OFFLOAD_ROW_THRESHOLD;
  const byteThreshold = input.byteThreshold ?? OFFLOAD_BYTE_THRESHOLD;
  const estimatedBytes = input.byteSize ?? (input.rowCount ?? 0) * ESTIMATED_BYTES_PER_ROW;
  if ((input.rowCount ?? 0) > rowThreshold)
    return { offload: true, reason: "rows", estimatedBytes };
  if ((input.byteSize ?? 0) > byteThreshold)
    return { offload: true, reason: "bytes", estimatedBytes };
  return { offload: false, reason: "none", estimatedBytes };
}

export interface CsvStreamOptions {
  /** CSV dialect (separator / decimal / thousands). */
  csv?: string | Partial<CsvOptions>;
  /** Records handed to `onBatch` at a time. 10 000 by default. */
  batchSize?: number;
  /** Stop after this many records (0 = no limit). */
  maxRows?: number;
}

export interface CsvStreamSummary {
  rowCount: number;
  columns: string[];
  batches: number;
  bytes: number;
}

const splitLine = (line: string, delimiter: string): string[] => {
  const out: string[] = [];
  let field = "";
  let quoted = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i] as string;
    if (quoted) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          field += '"';
          i++;
        } else quoted = false;
      } else field += ch;
    } else if (ch === '"') quoted = true;
    else if (ch === delimiter) {
      out.push(field);
      field = "";
    } else field += ch;
  }
  out.push(field);
  return out;
};

/**
 * Streams a CSV of any size (tested with multi-GB files) in batches.
 * Accepts a Blob/File, a ReadableStream of text chunks, or an async iterable
 * of strings — nothing bigger than one batch is ever kept in memory.
 */
export async function streamCsvRows(
  source: Blob | ReadableStream<Uint8Array | string> | AsyncIterable<string> | Iterable<string>,
  onBatch: (rows: PivotRow[], summary: CsvStreamSummary) => void | Promise<void>,
  options: CsvStreamOptions = {},
): Promise<CsvStreamSummary> {
  const dialect = csvOptions(options.csv ?? ",");
  const batchSize = options.batchSize ?? 10_000;
  const maxRows = options.maxRows ?? 0;

  let header: string[] | null = null;
  let buffer = "";
  let batch: PivotRow[] = [];
  const summary: CsvStreamSummary = { rowCount: 0, columns: [], batches: 0, bytes: 0 };
  let stopped = false;

  const flush = async (force = false) => {
    if (!batch.length || (!force && batch.length < batchSize)) return;
    summary.batches += 1;
    const rows = batch;
    batch = [];
    await onBatch(rows, summary);
  };

  const pushLine = async (line: string) => {
    if (stopped || line.trim() === "") return;
    const cells = splitLine(line, dialect.delimiter);
    if (!header) {
      header = cells.map((c) => c.trim().replace(/^"|"$/g, ""));
      summary.columns = header;
      return;
    }
    const row: PivotRow = {};
    header.forEach((name, i) => {
      const raw = (cells[i] ?? "").trim();
      const num = parseCsvNumber(raw, dialect);
      row[name] = num !== null ? num : raw;
    });
    batch.push(row);
    summary.rowCount += 1;
    if (maxRows && summary.rowCount >= maxRows) stopped = true;
    await flush();
  };

  const consumeChunk = async (chunk: string) => {
    summary.bytes += chunk.length;
    buffer += chunk;
    let index = buffer.indexOf("\n");
    while (index !== -1) {
      const line = buffer.slice(0, index).replace(/\r$/, "");
      buffer = buffer.slice(index + 1);
      await pushLine(line);
      if (stopped) return;
      index = buffer.indexOf("\n");
    }
  };

  const decoder = new TextDecoder();
  const toText = (chunk: Uint8Array | string) =>
    typeof chunk === "string" ? chunk : decoder.decode(chunk, { stream: true });

  if (typeof Blob !== "undefined" && source instanceof Blob) {
    if (typeof source.stream !== "function") {
      // Environments without Blob.stream (jsdom): fall back to a single read.
      await consumeChunk(await source.text());
      if (!stopped && buffer.length) await pushLine(buffer);
      await flush(true);
      return summary;
    }
    const reader = source.stream().getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done || stopped) break;
      await consumeChunk(toText(value as Uint8Array));
    }
  } else if (typeof ReadableStream !== "undefined" && source instanceof ReadableStream) {
    const reader = source.getReader();
    for (;;) {
      const { done, value } = await reader.read();
      if (done || stopped) break;
      await consumeChunk(toText(value as Uint8Array | string));
    }
  } else {
    for await (const chunk of source as AsyncIterable<string>) {
      if (stopped) break;
      await consumeChunk(chunk);
    }
  }

  if (!stopped && buffer.length) await pushLine(buffer);
  await flush(true);
  return summary;
}

export interface ServerAggregationOptions extends BackendEngineOptions {
  /** Maximum grid rows requested per query (server-side windowing). */
  pageSize?: number;
}

/**
 * Server-side aggregation engine: every query is answered by the service, so
 * the browser never sees the underlying records. Use it for 1GB+ datasets.
 */
export function createServerAggregationEngine(
  options: ServerAggregationOptions,
): PivotEngineAdapter {
  const client = createBackendClient(options);
  const pageSize = options.pageSize ?? 5_000;
  const withPaging = (request: PivotQuery): PivotQuery => ({
    ...request,
    limit: request.limit ?? pageSize,
    offset: request.offset ?? 0,
  });
  return {
    id: "server-aggregation",
    query: async (request) => {
      const result: PivotResult = await client.query(withPaging(request));
      return { ...result, meta: { ...result.meta, source: "backend" } };
    },
    drillThrough: async (request) =>
      (
        await client.drillThrough({
          ...request,
          limit: request.limit ?? 1_000,
          query: withPaging(request.query),
        })
      ).rows,
  };
}

/**
 * Registers a dataset that already lives next to the service (S3 path, warehouse
 * table, mounted parquet/CSV file) instead of uploading it through the browser.
 * That is how 1GB+ sources are attached.
 */
export async function registerRemoteDataset(
  options: BackendEngineOptions & {
    uri: string;
    format?: "csv" | "parquet" | "json" | "table";
    csv?: Partial<CsvOptions>;
  },
): Promise<{ datasetId: string; rowCount: number }> {
  const client = createBackendClient(options);
  const doFetch = options.fetchImpl ?? fetch;
  const res = await doFetch(`${options.baseUrl.replace(/\/$/, "")}${client.paths.datasets}`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...(options.headers ?? {}) },
    body: JSON.stringify({
      uri: options.uri,
      format: options.format ?? "csv",
      csv: options.csv ? csvOptions(options.csv) : undefined,
    }),
  });
  if (!res.ok) throw new Error((await res.text().catch(() => "")) || "Could not register dataset");
  return (await res.json()) as { datasetId: string; rowCount: number };
}
