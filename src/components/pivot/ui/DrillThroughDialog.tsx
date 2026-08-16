import { Copy, Download, Printer, X } from "lucide-react";
import type { PivotStrings } from "../locales";
import type { PivotRow } from "../types";
import { copyMatrix, exportMatrix, matrixFromRows, printMatrix } from "../export";
import type { ExportDecoration, ExportFormat } from "../export";

export interface DrillThroughDialogProps {
  open: boolean;
  title: string;
  rows: PivotRow[];
  strings: PivotStrings;
  onClose: () => void;
  /** Enables the export / print / copy controls in the drill-through view. */
  canExport?: boolean;
  /** Header & footer printed on the drill-through export. */
  decoration?: ExportDecoration;
  onStatus?: (message: string) => void;
}

const btn =
  "inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-xs text-foreground hover:bg-accent disabled:opacity-50";

export function DrillThroughDialog({
  open,
  title,
  rows,
  strings,
  onClose,
  canExport = true,
  decoration = {},
  onStatus,
}: DrillThroughDialogProps) {
  if (!open) return null;
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const matrix = () => matrixFromRows(rows, `${title || "Drill-through"}`, decoration);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/40 p-4"
      role="dialog"
      aria-modal="true"
      aria-label={strings.drillThrough}
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-card shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} {strings.records}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            {canExport && (
              <>
                <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Download className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="sr-only">Export the drill-through view</span>
                  <select
                    aria-label="Export the drill-through view"
                    disabled={!rows.length}
                    value=""
                    className="rounded border border-border bg-card px-2 py-1 text-xs"
                    onChange={(e) => {
                      if (!e.target.value) return;
                      exportMatrix(matrix(), e.target.value as ExportFormat);
                      onStatus?.(`Drill-through exported: ${e.target.value.toUpperCase()}`);
                      e.target.value = "";
                    }}
                  >
                    <option value="">{strings.export}…</option>
                    <option value="excel">Excel (.xls)</option>
                    <option value="csv">CSV</option>
                    <option value="tsv">TSV</option>
                    <option value="html">HTML</option>
                    <option value="json">JSON</option>
                  </select>
                </label>
                <button
                  type="button"
                  className={btn}
                  disabled={!rows.length}
                  onClick={() => printMatrix(matrix())}
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  {strings.print}
                </button>
                <button
                  type="button"
                  className={btn}
                  disabled={!rows.length}
                  onClick={async () => {
                    if (await copyMatrix(matrix())) onStatus?.("Drill-through copied");
                  }}
                >
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  Copy
                </button>
              </>
            )}
            <button type="button" onClick={onClose} aria-label={strings.close}>
              <X className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </header>
        <div className="overflow-auto">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">{strings.noData}</p>
          ) : (
            <table className="w-full border-collapse text-xs" data-testid="drill-through-table">
              <thead className="sticky top-0 bg-secondary">
                <tr>
                  {columns.map((c) => (
                    <th key={c} className="border-b border-border px-3 py-2 text-left font-semibold">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.slice(0, 500).map((row, i) => (
                  <tr key={i} className={i % 2 ? "bg-secondary/40" : ""}>
                    {columns.map((c) => (
                      <td key={c} className="border-b border-border px-3 py-1.5">
                        {String(row[c] ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
