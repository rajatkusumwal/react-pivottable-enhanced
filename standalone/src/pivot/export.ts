/** Export & print helpers shared by every engine. */
import type { PivotCellValue, PivotResult } from "./result";
import type { PivotRow } from "./types";
import { formatNumber } from "./format";
import { csvOptions, formatCsvNumber, type CsvOptions } from "./csv";

/** Optional page furniture printed above/below the table on export & print. */
export interface ExportDecoration {
  /** Text shown above the table (supports \n for several lines). */
  header?: string | undefined;
  /** Text shown below the table. */
  footer?: string | undefined;
}

/** Builds an export matrix straight from a PivotResult (no DOM needed). */
export function matrixFromResult(
  result: PivotResult,
  locale = "en",
  title = "Pivot table",
  decoration: ExportDecoration = {},
): ExportMatrix {
  const measures = result.measures ?? [result.measure];
  const corner = result.rowFields.join(" / ") || result.measure.caption;
  const head = result.colHeaderRows.map((level, i) => [
    i === 0 ? corner : "",
    ...level.flatMap((n) => [n.label, ...Array<string>(Math.max(0, n.span - 1)).fill("")]),
    i === 0 ? "Total" : "",
  ]);
  if (!head.length) head.push([corner, ...measures.map((m) => m.caption), "Total"]);

  const fmt = (v: PivotCellValue, measureIndex = 0) => {
    if (v === null || v === undefined) return "";
    if (typeof v === "string") return v;
    return formatNumber(v, measures[measureIndex]?.format ?? result.measure.format, locale);
  };
  const measureAt = (leafIndex: number) => result.measureIndexByLeaf?.[leafIndex] ?? 0;

  const body = result.rowHeaders.map((header, r) => [
    `${"  ".repeat(header.depth)}${header.label}`,
    ...(result.cells[r] ?? []).map((v, c) => fmt(v, measureAt(c))),
    fmt(result.rowTotals[r] ?? null),
  ]);
  body.push([
    "Grand Total",
    ...result.colTotals.map((v, c) => fmt(v, measureAt(c))),
    fmt(result.grandTotal),
  ]);
  return {
    title,
    head,
    body,
    ...(decoration.header ? { header: decoration.header } : {}),
    ...(decoration.footer ? { footer: decoration.footer } : {}),
  };
}

/** Builds an export matrix from raw records — used by the drill-through view. */
export function matrixFromRows(
  rows: PivotRow[],
  title = "Drill-through",
  decoration: ExportDecoration = {},
): ExportMatrix {
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  return {
    title,
    head: [columns],
    body: rows.map((row) => columns.map((c) => String(row[c] ?? ""))),
    ...(decoration.header ? { header: decoration.header } : {}),
    ...(decoration.footer ? { footer: decoration.footer } : {}),
  };
}


export interface ExportMatrix extends ExportDecoration {
  title: string;
  /** Header rows (may be more than one for nested columns). */
  head: string[][];
  body: string[][];
}


/** Reads a rendered <table> into a plain matrix so any engine can be exported. */
export function matrixFromTable(table: HTMLTableElement, title = "Pivot table"): ExportMatrix {
  const read = (rows: HTMLCollectionOf<HTMLTableRowElement>) =>
    Array.from(rows).map((tr) =>
      Array.from(tr.cells).flatMap((cell) => {
        const span = cell.colSpan > 1 ? cell.colSpan : 1;
        const text = (cell.textContent ?? "").trim();
        return [text, ...Array<string>(span - 1).fill("")];
      }),
    );
  const head = table.tHead ? read(table.tHead.rows) : [];
  const body = Array.from(table.tBodies).flatMap((tb) => read(tb.rows));
  return { title, head, body };
}

const escapeCsv = (v: string, delimiter: string) =>
  new RegExp(`["\n\r${delimiter === "\t" ? "\\t" : delimiter.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}]`).test(v)
    ? `"${v.replace(/"/g, '""')}"`
    : v;

/** Header / footer lines as single-cell rows so text formats keep them. */
const decorationRows = (text: string | undefined) =>
  text ? text.split("\n").map((line) => [line]) : [];

/**
 * Serialises the matrix as CSV in the given dialect. Numeric-looking cells are
 * re-written with the chosen decimal and thousands marks so Excel in any locale
 * reads them as numbers.
 */
export function toCsv(matrix: ExportMatrix, options: string | Partial<CsvOptions> = ","): string {
  const dialect = csvOptions(options);
  const cell = (v: string) => {
    const num = /^[+-]?\d+(\.\d+)?$/.test(v.trim()) ? Number(v.trim()) : null;
    return escapeCsv(num !== null ? formatCsvNumber(num, dialect) : v, dialect.delimiter);
  };
  return [
    ...decorationRows(matrix.header),
    ...matrix.head,
    ...matrix.body,
    ...decorationRows(matrix.footer),
  ]
    .map((row) => row.map(cell).join(dialect.delimiter))
    .join("\n");
}

export function toTsv(matrix: ExportMatrix): string {
  return [
    ...decorationRows(matrix.header),
    ...matrix.head,
    ...matrix.body,
    ...decorationRows(matrix.footer),
  ]
    .map((row) => row.join("\t"))
    .join("\n");
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

const htmlLines = (text: string | undefined) =>
  (text ?? "")
    .split("\n")
    .map((line) => escapeHtml(line))
    .join("<br>");

export function toHtml(matrix: ExportMatrix): string {
  const head = matrix.head
    .map((r) => `<tr>${r.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`)
    .join("");
  const body = matrix.body
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  const header = matrix.header
    ? `<header class="pivot-export-header">${htmlLines(matrix.header)}</header>`
    : "";
  const footer = matrix.footer
    ? `<footer class="pivot-export-footer">${htmlLines(matrix.footer)}</footer>`
    : "";
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    matrix.title,
  )}</title><style>body{font-family:system-ui,sans-serif;padding:24px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px;text-align:right}th{background:#f1f4f9}td:first-child,th:first-child{text-align:left}.pivot-export-header,.pivot-export-footer{color:#475069;font-size:12px;margin:8px 0;white-space:pre-line}</style></head><body>${header}<h1>${escapeHtml(
    matrix.title,
  )}</h1><table><thead>${head}</thead><tbody>${body}</tbody></table>${footer}</body></html>`;
}


export function toJson(matrix: ExportMatrix): string {
  return JSON.stringify(matrix, null, 2);
}

export function downloadFile(filename: string, content: string, mime: string) {
  const blob = new Blob([content], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export type ExportFormat = "csv" | "tsv" | "excel" | "html" | "json";

export function exportMatrix(
  matrix: ExportMatrix,
  format: ExportFormat,
  csv?: string | Partial<CsvOptions>,
) {
  const base = matrix.title.replace(/\s+/g, "-").toLowerCase();
  switch (format) {
    case "csv":
      return downloadFile(`${base}.csv`, toCsv(matrix, csv ?? ","), "text/csv");
    case "tsv":
      return downloadFile(`${base}.tsv`, toTsv(matrix), "text/tab-separated-values");
    case "excel":
      // Excel opens HTML tables saved with an .xls extension, keeping the layout.
      return downloadFile(`${base}.xls`, toHtml(matrix), "application/vnd.ms-excel");
    case "html":
      return downloadFile(`${base}.html`, toHtml(matrix), "text/html");
    case "json":
      return downloadFile(`${base}.json`, toJson(matrix), "application/json");
  }
}

/** Opens the print dialog — users pick "Save as PDF" there. */
export function printMatrix(matrix: ExportMatrix) {
  const win = window.open("", "_blank", "width=1024,height=768");
  if (!win) return false;
  win.document.write(toHtml(matrix));
  win.document.close();
  win.focus();
  win.print();
  return true;
}

export async function copyMatrix(matrix: ExportMatrix): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(toTsv(matrix));
    return true;
  } catch {
    return false;
  }
}
