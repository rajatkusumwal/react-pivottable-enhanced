import { Filter, Pencil, Sigma, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { aggregatorLabels } from "../aggregators";
import { fieldCaption, renameFieldPatch, renameMeasurePatch } from "../captions";
import { moveField } from "../dnd";
import type { PivotStrings } from "../locales";
import type { FieldDef, FilterDef, PivotConfig, PivotRow } from "../types";
import { MemberFilterPopover } from "./MemberFilterPopover";

export interface GridFieldBarProps {
  strings: PivotStrings;
  config: PivotConfig;
  /** Field metadata, used for default labels. */
  fields?: FieldDef[];
  rows: PivotRow[];
  readOnly: boolean;
  onChange: (patch: Partial<PivotConfig>) => void;
  onOpenFields: () => void;
}

const chip =
  "inline-flex max-w-56 items-center gap-1 rounded border border-border bg-card px-2 py-0.5 text-xs";

/** The strip of active fields shown above the grid, like Flexmonster's field bar. */
export function GridFieldBar({
  strings,
  config,
  fields = [],
  rows,
  readOnly,
  onChange,
  onOpenFields,
}: GridFieldBarProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);
  /** Chip currently being renamed: "field:<name>" or "measure:<index>". */
  const [renaming, setRenaming] = useState<string | null>(null);
  const [draft, setDraft] = useState("");

  const captions = config.fieldCaptions ?? {};
  const labelOf = (name: string) => fieldCaption(name, fields, captions);

  const startRename = (id: string, current: string) => {
    if (readOnly) return;
    setRenaming(id);
    setDraft(current);
  };

  const commit = (apply: (caption: string) => void) => {
    apply(draft);
    setRenaming(null);
  };

  /** Inline editor shown in place of the chip label while renaming. */
  const renameInput = (label: string, apply: (caption: string) => void) => (
    <input
      autoFocus
      aria-label={`Rename ${label}`}
      className="w-28 rounded border border-border bg-background px-1 text-xs"
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => commit(apply)}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit(apply);
        if (e.key === "Escape") setRenaming(null);
      }}
    />
  );

  const renameButton = (id: string, label: string, current: string) => (
    <button
      type="button"
      aria-label={`Rename ${label}`}
      disabled={readOnly}
      onClick={() => startRename(id, current)}
    >
      <Pencil className="h-3 w-3" aria-hidden="true" />
    </button>
  );

  const group = (label: string, children: React.ReactNode, testId?: string) => (
    <div className="flex items-center gap-1.5" {...(testId ? { "data-testid": testId } : {})}>
      <span className="text-[11px] font-semibold uppercase text-muted-foreground">{label}</span>
      {children}
    </div>
  );

  const remove = (name: string) => onChange(moveField(config, name, "fields"));

  return (
    <div
      data-testid="grid-field-bar"
      className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-md border border-border bg-surface px-2 py-1.5"
    >
      {config.showReportFilterArea &&
        config.filters.length > 0 &&
        group(
          "Report filters",
          config.filters.map((f, i) => (
            <span key={`${f.field}-${i}`} className="relative">
              <span className={chip}>
                <span className="truncate">{f.field}</span>
                {f.kind === "values" && (
                  <button
                    type="button"
                    aria-label={`Filter ${f.field}`}
                    disabled={readOnly}
                    onClick={() => setOpenFilter(openFilter === f.field ? null : f.field)}
                  >
                    <Filter className="h-3 w-3" aria-hidden="true" />
                  </button>
                )}
                <button
                  type="button"
                  aria-label={`Remove ${f.field}`}
                  disabled={readOnly}
                  onClick={() => remove(f.field)}
                >
                  <X className="h-3 w-3" aria-hidden="true" />
                </button>
              </span>
              {openFilter === f.field && f.kind === "values" && (
                <MemberFilterPopover
                  field={f.field}
                  label={f.field}
                  rows={rows}
                  strings={strings}
                  current={f}
                  onApply={(members) => {
                    onChange({
                      filters: config.filters.map((x, j) =>
                        j === i ? ({ ...f, members } as FilterDef) : x,
                      ),
                    });
                    setOpenFilter(null);
                  }}
                  onClose={() => setOpenFilter(null)}
                />
              )}
            </span>
          )),
          "report-filter-area",
        )}

      {config.cols.length > 0 &&
        group(
          strings.columns,
          config.cols.map((name) => (
            <span key={name} className={chip} onDoubleClick={() => startRename(`field:${name}`, labelOf(name))}>
              {renaming === `field:${name}` ? (
                renameInput(name, (c) => onChange(renameFieldPatch(config, name, c)))
              ) : (
                <>
                  <span className="truncate">{labelOf(name)}</span>
                  {renameButton(`field:${name}`, name, labelOf(name))}
                </>
              )}
              <button type="button" aria-label={`Remove ${name}`} disabled={readOnly} onClick={() => remove(name)}>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )),
        )}

      {config.rows.length > 0 &&
        group(
          strings.rows,
          config.rows.map((name) => (
            <span key={name} className={chip} onDoubleClick={() => startRename(`field:${name}`, labelOf(name))}>
              {renaming === `field:${name}` ? (
                renameInput(name, (c) => onChange(renameFieldPatch(config, name, c)))
              ) : (
                <>
                  <span className="truncate">{labelOf(name)}</span>
                  {renameButton(`field:${name}`, name, labelOf(name))}
                </>
              )}
              <button type="button" aria-label={`Remove ${name}`} disabled={readOnly} onClick={() => remove(name)}>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )),
        )}

      {config.values.length > 0 &&
        group(
          "Measures",
          config.values.map((v, i) => (
            <span
              key={`${v.field}-${i}`}
              className={chip}
              onDoubleClick={() => startRename(`measure:${i}`, v.caption ?? labelOf(v.field))}
            >
              {config.showAggregationIcon && (
                <Sigma data-testid="sigma-icon" className="h-3 w-3 shrink-0 text-primary" aria-hidden="true" />
              )}
              {renaming === `measure:${i}` ? (
                renameInput(v.field, (c) => onChange(renameMeasurePatch(config, i, c)))
              ) : (
                <>
                  <span className="truncate">
                    {v.caption
                      ? v.caption
                      : `${aggregatorLabels[v.aggregator] ?? v.aggregator} of ${labelOf(v.field)}`}
                  </span>
                  {renameButton(`measure:${i}`, v.field, v.caption ?? labelOf(v.field))}
                </>
              )}
              <button
                type="button"
                aria-label={`Remove ${v.field}`}
                disabled={readOnly}
                onClick={() => onChange({ values: config.values.filter((_, j) => j !== i) })}
              >
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </span>
          )),
        )}

      <button
        type="button"
        className="ml-auto inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-1 text-xs font-medium hover:bg-accent"
        onClick={onOpenFields}
      >
        <SlidersHorizontal className="h-3.5 w-3.5" aria-hidden="true" />
        {strings.fields}
      </button>
    </div>
  );
}
