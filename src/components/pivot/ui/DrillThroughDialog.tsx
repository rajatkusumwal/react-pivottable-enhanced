import { X } from "lucide-react";
import type { PivotStrings } from "../locales";
import type { PivotRow } from "../types";

export interface DrillThroughDialogProps {
  open: boolean;
  title: string;
  rows: PivotRow[];
  strings: PivotStrings;
  onClose: () => void;
}

export function DrillThroughDialog({ open, title, rows, strings, onClose }: DrillThroughDialogProps) {
  if (!open) return null;
  const columns = [...new Set(rows.flatMap((r) => Object.keys(r)))];
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
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <div>
            <h2 className="text-sm font-semibold">{title}</h2>
            <p className="text-xs text-muted-foreground">
              {rows.length} {strings.records}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label={strings.close}>
            <X className="h-5 w-5" aria-hidden="true" />
          </button>
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
