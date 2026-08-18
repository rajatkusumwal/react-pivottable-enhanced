import { X } from "lucide-react";
import type { PivotStrings } from "../locales";
import type { FieldDef, PivotConfig, PivotRow } from "../types";
import { FieldListPanel } from "./FieldListPanel";

export interface FieldListDialogProps {
  open: boolean;
  strings: PivotStrings;
  fields: FieldDef[];
  rows: PivotRow[];
  config: PivotConfig;
  readOnly: boolean;
  onChange: (patch: Partial<PivotConfig>) => void;
  onClose: () => void;
}

/** commercial pivot tables. popup field list, opened from the toolbar "Fields" button. */
export function FieldListDialog({
  open,
  strings,
  fields,
  rows,
  config,
  readOnly,
  onChange,
  onClose,
}: FieldListDialogProps) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-start justify-center bg-foreground/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label={strings.fields}
        data-testid="field-list-dialog"
        className="max-h-full w-full max-w-5xl overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">{strings.fields}</h2>
          <button type="button" aria-label={strings.close} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>
        <div className="p-3">
          <FieldListPanel
            layout="dialog"
            strings={strings}
            fields={fields}
            rows={rows}
            config={config}
            readOnly={readOnly}
            onChange={onChange}
          />
        </div>
        <footer className="flex justify-end gap-2 border-t border-border px-4 py-2.5">
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            onClick={onClose}
          >
            Apply
          </button>
        </footer>
      </div>
    </div>
  );
}
