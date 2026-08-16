/** Export & print helpers shared by both engines. */

export interface ExportMatrix {
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

const escapeCsv = (v: string) => (/[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v);

export function toCsv(matrix: ExportMatrix, delimiter = ","): string {
  return [...matrix.head, ...matrix.body]
    .map((row) => row.map(escapeCsv).join(delimiter))
    .join("\n");
}

export function toTsv(matrix: ExportMatrix): string {
  return [...matrix.head, ...matrix.body].map((row) => row.join("\t")).join("\n");
}

const escapeHtml = (v: string) =>
  v.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

export function toHtml(matrix: ExportMatrix): string {
  const head = matrix.head
    .map((r) => `<tr>${r.map((c) => `<th>${escapeHtml(c)}</th>`).join("")}</tr>`)
    .join("");
  const body = matrix.body
    .map((r) => `<tr>${r.map((c) => `<td>${escapeHtml(c)}</td>`).join("")}</tr>`)
    .join("");
  return `<!doctype html><html><head><meta charset="utf-8"><title>${escapeHtml(
    matrix.title,
  )}</title><style>body{font-family:system-ui,sans-serif;padding:24px}table{border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px 10px;font-size:13px;text-align:right}th{background:#f1f4f9}td:first-child,th:first-child{text-align:left}</style></head><body><h1>${escapeHtml(
    matrix.title,
  )}</h1><table><thead>${head}</thead><tbody>${body}</tbody></table></body></html>`;
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

export function exportMatrix(matrix: ExportMatrix, format: ExportFormat) {
  const base = matrix.title.replace(/\s+/g, "-").toLowerCase();
  switch (format) {
    case "csv":
      return downloadFile(`${base}.csv`, toCsv(matrix), "text/csv");
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
