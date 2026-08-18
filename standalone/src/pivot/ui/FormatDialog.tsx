import { useState } from "react";
import { Plus, Trash2, X } from "lucide-react";
import type { PivotStrings } from "../locales";
import type {
  ConditionalFormatRule,
  ConditionOperator,
  FieldDef,
  NumberFormat,
  PivotConfig,
} from "../types";
import { ModalPortal } from "./ModalPortal";

export interface FormatDialogProps {
  open: boolean;
  strings: PivotStrings;
  config: PivotConfig;
  fields: FieldDef[];
  readOnly: boolean;
  onChange: (patch: Partial<PivotConfig>) => void;
  onClose: () => void;
  /** Opens straight on one of the tabs (used by the context menu). */
  initialTab?: FormatTab;
}

export type FormatTab = "number" | "conditional" | "export";

const OPERATORS: { value: ConditionOperator; label: string }[] = [
  { value: "gt", label: "greater than" },
  { value: "gte", label: "greater or equal" },
  { value: "lt", label: "less than" },
  { value: "lte", label: "less or equal" },
  { value: "eq", label: "equal to" },
  { value: "neq", label: "not equal to" },
];

const input = "rounded border border-border bg-card px-2 py-1 text-xs";

/** commercial-style Format dialog: number formats, cell rules and export furniture. */
export function FormatDialog({
  open,
  strings,
  config,
  fields,
  readOnly,
  onChange,
  onClose,
  initialTab = "number",
}: FormatDialogProps) {
  const [tab, setTab] = useState<FormatTab>(initialTab);
  if (!open) return null;

  const patchFormat = (index: number, patch: Partial<NumberFormat>) => {
    const values = config.values.map((v, i) =>
      i === index ? { ...v, format: { ...(v.format ?? {}), ...patch } } : v,
    );
    onChange({ values });
  };

  const patchRule = (index: number, patch: Partial<ConditionalFormatRule>) =>
    onChange({
      conditionalFormats: config.conditionalFormats.map((r, i) =>
        i === index ? { ...r, ...patch } : r,
      ),
    });

  const addRule = () =>
    onChange({
      conditionalFormats: [
        ...config.conditionalFormats,
        {
          field: config.values[0]?.field ?? "",
          operator: "gt",
          value: 0,
          color: "#0f5132",
          background: "#d1e7dd",
        },
      ],
    });

  const removeRule = (index: number) =>
    onChange({ conditionalFormats: config.conditionalFormats.filter((_, i) => i !== index) });

  const tabButton = (id: FormatTab, label: string) => (
    <button
      key={id}
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={`rounded px-3 py-1.5 text-xs ${
        tab === id ? "bg-primary text-primary-foreground" : "bg-card text-foreground"
      }`}
    >
      {label}
    </button>
  );

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-start justify-center bg-foreground/40 p-4 sm:p-8">
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Format"
        data-testid="format-dialog"
        className="max-h-full w-full max-w-3xl overflow-y-auto rounded-xl border border-border bg-background shadow-xl"
      >
        <header className="flex items-center justify-between border-b border-border px-4 py-2.5">
          <h2 className="text-sm font-semibold">Format</h2>
          <button type="button" aria-label={strings.close} onClick={onClose}>
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </header>

        <div
          role="tablist"
          aria-label="Format sections"
          className="flex gap-1.5 border-b border-border px-4 py-2"
        >
          {tabButton("number", "Number formatting")}
          {tabButton("conditional", "Conditional formatting")}
          {tabButton("export", "Export header & footer")}
        </div>

        <div className="space-y-3 p-4">
          {tab === "number" && (
            <div data-testid="number-format-tab" className="space-y-3">
              {config.values.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Add a value first, then format it here.
                </p>
              )}
              {config.values.map((value, index) => {
                const format = value.format ?? {};
                const caption = value.caption ?? value.field;
                return (
                  <fieldset
                    key={`${value.field}-${index}`}
                    className="rounded-md border border-border p-3"
                  >
                    <legend className="px-1 text-xs font-semibold">{caption}</legend>
                    <div className="flex flex-wrap items-center gap-3">
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Decimals
                        <input
                          type="number"
                          min={0}
                          max={6}
                          disabled={readOnly}
                          aria-label={`Decimals for ${caption}`}
                          className={`${input} w-16`}
                          value={format.decimals ?? 2}
                          onChange={(e) => patchFormat(index, { decimals: Number(e.target.value) })}
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <input
                          type="checkbox"
                          disabled={readOnly}
                          aria-label={`Thousands separator for ${caption}`}
                          checked={format.thousandsSeparator ?? true}
                          onChange={(e) =>
                            patchFormat(index, { thousandsSeparator: e.target.checked })
                          }
                        />
                        Thousands separator
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Currency
                        <input
                          type="text"
                          disabled={readOnly}
                          placeholder="USD"
                          aria-label={`Currency for ${caption}`}
                          className={`${input} w-20`}
                          value={format.currency ?? ""}
                          onChange={(e) =>
                            patchFormat(index, { currency: e.target.value.toUpperCase() })
                          }
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Prefix
                        <input
                          type="text"
                          disabled={readOnly}
                          aria-label={`Prefix for ${caption}`}
                          className={`${input} w-16`}
                          value={format.prefix ?? ""}
                          onChange={(e) => patchFormat(index, { prefix: e.target.value })}
                        />
                      </label>
                      <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        Suffix
                        <input
                          type="text"
                          disabled={readOnly}
                          aria-label={`Suffix for ${caption}`}
                          className={`${input} w-16`}
                          value={format.suffix ?? ""}
                          onChange={(e) => patchFormat(index, { suffix: e.target.value })}
                        />
                      </label>
                    </div>
                  </fieldset>
                );
              })}
            </div>
          )}

          {tab === "conditional" && (
            <div data-testid="conditional-format-tab" className="space-y-2">
              <p className="text-xs text-muted-foreground">
                Colour cells whose value matches a rule. Rules apply top to bottom; the first match
                wins.
              </p>
              {config.conditionalFormats.map((rule, index) => (
                <div
                  key={index}
                  data-testid={`format-rule-${index}`}
                  className="flex flex-wrap items-center gap-2 rounded-md border border-border p-2"
                >
                  <select
                    aria-label={`Rule ${index + 1} field`}
                    disabled={readOnly}
                    className={input}
                    value={rule.field}
                    onChange={(e) => patchRule(index, { field: e.target.value })}
                  >
                    <option value="">All values</option>
                    {fields
                      .filter((f) => f.type === "number")
                      .map((f) => (
                        <option key={f.name} value={f.name}>
                          {f.caption ?? f.name}
                        </option>
                      ))}
                  </select>
                  <select
                    aria-label={`Rule ${index + 1} operator`}
                    disabled={readOnly}
                    className={input}
                    value={rule.operator}
                    onChange={(e) =>
                      patchRule(index, { operator: e.target.value as ConditionOperator })
                    }
                  >
                    {OPERATORS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    aria-label={`Rule ${index + 1} value`}
                    disabled={readOnly}
                    className={`${input} w-24`}
                    value={rule.value}
                    onChange={(e) => patchRule(index, { value: Number(e.target.value) })}
                  />
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    Text
                    <input
                      type="color"
                      aria-label={`Rule ${index + 1} text colour`}
                      disabled={readOnly}
                      value={rule.color}
                      onChange={(e) => patchRule(index, { color: e.target.value })}
                    />
                  </label>
                  <label className="flex items-center gap-1 text-xs text-muted-foreground">
                    Fill
                    <input
                      type="color"
                      aria-label={`Rule ${index + 1} background colour`}
                      disabled={readOnly}
                      value={rule.background}
                      onChange={(e) => patchRule(index, { background: e.target.value })}
                    />
                  </label>
                  <button
                    type="button"
                    aria-label={`Remove rule ${index + 1}`}
                    disabled={readOnly}
                    className="ml-auto text-muted-foreground hover:text-destructive"
                    onClick={() => removeRule(index)}
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              ))}
              <button
                type="button"
                disabled={readOnly}
                className="inline-flex items-center gap-1.5 rounded border border-border bg-card px-2.5 py-1 text-xs hover:bg-accent"
                onClick={addRule}
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                Add rule
              </button>
            </div>
          )}

          {tab === "export" && (
            <div data-testid="export-decoration-tab" className="space-y-3">
              <p className="text-xs text-muted-foreground">
                This text is printed above and below the table in every export and in the print
                view.
              </p>
              <label className="block text-xs text-muted-foreground">
                Header
                <textarea
                  aria-label="Export header"
                  disabled={readOnly}
                  rows={2}
                  className={`${input} mt-1 block w-full`}
                  value={config.exportHeader ?? ""}
                  onChange={(e) => onChange({ exportHeader: e.target.value })}
                />
              </label>
              <label className="block text-xs text-muted-foreground">
                Footer
                <textarea
                  aria-label="Export footer"
                  disabled={readOnly}
                  rows={2}
                  className={`${input} mt-1 block w-full`}
                  value={config.exportFooter ?? ""}
                  onChange={(e) => onChange({ exportFooter: e.target.value })}
                />
              </label>
            </div>
          )}
        </div>

        <footer className="flex justify-end border-t border-border px-4 py-2.5">
          <button
            type="button"
            className="rounded-md bg-primary px-3 py-1.5 text-xs text-primary-foreground"
            onClick={onClose}
          >
            Done
          </button>
        </footer>
      </div>
    </div>
    </ModalPortal>
  );
}
