import { useMemo, useState } from "react";
import { ArrowDown, ArrowUp, Columns3, Copy, Download, Printer, X } from "lucide-react";
import type { PivotStrings } from "../locales";
import type { PivotRow } from "../types";
import { applyDrillSlice, drillColumns } from "../analysis";
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
  /** Columns of the configured slice; undefined = show every field in the records, [] = show none. */
  fields?: string[] | undefined;
  /** Persists a change made with the drill-through field list. */
  onFieldsChange?: ((fields: string[] | undefined) => void) | undefined;
  /** Row cap applied when the records were fetched. */
  maxRows?: number;
  /** Total number of matching records before the cap (when the engine reports it). */
  total?: number;
  /** Initial column sorting. */
  sort?: { field: string; dir: "asc" | "desc" } | undefined;
  onSortChange?: (sort: { field: string; dir: "asc" | "desc" } | undefined) => void;
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
  fields,
  onFieldsChange,
  maxRows,
  total,
  sort,
  onSortChange,
}: DrillThroughDialogProps) {
  const [localSort, setLocalSort] = useState(sort);
  const [fieldsOpen, setFieldsOpen] = useState(false);
  const [search, setSearch] = useState("");

  const allColumns = useMemo(() => drillColumns(rows), [rows]);
  const columns = useMemo(() => {
    if (fields === undefined) return allColumns;
    if (fields.length === 0) return [];
    return fields.filter((f) => allColumns.includes(f));
  }, [fields, allColumns]);
  const visible = useMemo(
    () => applyDrillSlice(rows, { fields: columns, sort: localSort }),
    [rows, columns, localSort],
  );

  if (!open) return null;

  const matrix = () => matrixFromRows(visible, `${title || "Drill-through"}`, decoration);

  const toggleSort = (field: string) => {
    const next: { field: string; dir: "asc" | "desc" } | undefined =
      localSort?.field !== field
        ? { field, dir: "asc" }
        : localSort.dir === "asc"
          ? { field, dir: "desc" }
          : undefined;
    setLocalSort(next);
    onSortChange?.(next);
  };

  const toggleField = (field: string) => {
    const current = columns;
    const next = current.includes(field)
      ? current.filter((f) => f !== field)
      : [...allColumns.filter((f) => current.includes(f) || f === field)];
    onFieldsChange?.(next.length === allColumns.length ? undefined : next);
  };

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
              {typeof total === "number" && total > rows.length ? ` of ${total}` : ""}
              {typeof maxRows === "number" && rows.length >= maxRows
                ? ` · limited to ${maxRows}`
                : ""}
              {` · ${columns.length} of ${allColumns.length} columns`}
            </p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="relative">
              <button
                type="button"
                className={btn}
                aria-expanded={fieldsOpen}
                onClick={() => setFieldsOpen((v) => !v)}
              >
                <Columns3 className="h-3.5 w-3.5" aria-hidden="true" />
                Columns
              </button>
              {fieldsOpen && (
                <div
                  className="absolute right-0 z-10 mt-1 w-64 rounded-lg border border-border bg-card p-2 shadow-lg"
                  aria-label="Drill-through field list"
                  role="group"
                >
                  <input
                    className="mb-2 w-full rounded border border-border bg-background px-2 py-1 text-xs"
                    placeholder={`${strings.search}…`}
                    aria-label="Search drill-through fields"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                  <div className="mb-2 flex gap-2 text-xs">
                    <button
                      type="button"
                      className="underline disabled:no-underline disabled:opacity-50"
                      disabled={!onFieldsChange || columns.length === allColumns.length}
                      onClick={() => onFieldsChange?.(undefined)}
                    >
                      Select all
                    </button>
                    <button
                      type="button"
                      className="underline disabled:no-underline disabled:opacity-50"
                      disabled={!onFieldsChange || columns.length === 0}
                      onClick={() => onFieldsChange?.([])}
                    >
                      Deselect all
                    </button>
                  </div>
                  <ul className="max-h-56 space-y-1 overflow-auto">
                    {allColumns
                      .filter((c) => c.toLowerCase().includes(search.toLowerCase()))
                      .map((c) => (
                        <li key={c}>
                          <label className="flex items-center gap-2 text-xs">
                            <input
                              type="checkbox"
                              checked={columns.includes(c)}
                              disabled={!onFieldsChange}
                              onChange={() => toggleField(c)}
                            />
                            {c}
                          </label>
                        </li>
                      ))}
                  </ul>
                </div>
              )}
            </div>
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
                    <th key={c} className="border-b border-border px-0 py-0 text-left font-semibold">
                      <button
                        type="button"
                        className="flex w-full items-center gap-1 px-3 py-2 text-left hover:bg-accent"
                        aria-label={`Sort by ${c}`}
                        onClick={() => toggleSort(c)}
                      >
                        {c}
                        {localSort?.field === c &&
                          (localSort.dir === "asc" ? (
                            <ArrowUp className="h-3 w-3" aria-hidden="true" />
                          ) : (
                            <ArrowDown className="h-3 w-3" aria-hidden="true" />
                          ))}
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visible.map((row, i) => (
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
