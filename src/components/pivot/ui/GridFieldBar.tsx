import { Filter, SlidersHorizontal, X } from "lucide-react";
import { useState } from "react";
import { aggregatorLabels } from "../aggregators";
import { moveField } from "../dnd";
import type { PivotStrings } from "../locales";
import type { FilterDef, PivotConfig, PivotRow } from "../types";
import { MemberFilterPopover } from "./MemberFilterPopover";

export interface GridFieldBarProps {
  strings: PivotStrings;
  config: PivotConfig;
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
  rows,
  readOnly,
  onChange,
  onOpenFields,
}: GridFieldBarProps) {
  const [openFilter, setOpenFilter] = useState<string | null>(null);

  const group = (label: string, children: React.ReactNode) => (
    <div className="flex items-center gap-1.5">
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
        )}

      {config.cols.length > 0 &&
        group(
          strings.columns,
          config.cols.map((name) => (
            <span key={name} className={chip}>
              <span className="truncate">{name}</span>
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
            <span key={name} className={chip}>
              <span className="truncate">{name}</span>
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
            <span key={`${v.field}-${i}`} className={chip}>
              <span className="truncate">
                {aggregatorLabels[v.aggregator] ?? v.aggregator} of {v.caption ?? v.field}
              </span>
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
