import { useState } from "react";
import { Filter } from "lucide-react";
import { describeFilter } from "../filters";
import type { PivotStrings } from "../locales";
import type { FilterDef, PivotConfig, PivotRow } from "../types";
import { MemberFilterPopover } from "./MemberFilterPopover";

export interface ChartFilterBarProps {
  strings: PivotStrings;
  config: PivotConfig;
  rows: PivotRow[];
  readOnly: boolean;
  onChange: (patch: Partial<PivotConfig>) => void;
}

/**
 * Flexmonster-style filter controls on the chart: one button per charted field
 * that opens the member checklist and writes a report filter back into the config.
 */
export function ChartFilterBar({ strings, config, rows, readOnly, onChange }: ChartFilterBarProps) {
  const [open, setOpen] = useState<string | null>(null);
  const fields = [...config.rows, ...config.cols];
  if (!fields.length) return null;

  const filterFor = (field: string) =>
    config.filters.find((f) => f.kind === "values" && f.field === field) as
      | Extract<FilterDef, { kind: "values" }>
      | undefined;

  const apply = (field: string, members: string[]) => {
    const existing = config.filters.findIndex((f) => f.kind === "values" && f.field === field);
    const next: FilterDef = { kind: "values", field, mode: "include", members };
    onChange({
      filters:
        existing >= 0
          ? config.filters.map((f, i) => (i === existing ? next : f))
          : [...config.filters, next],
    });
    setOpen(null);
  };

  return (
    <div
      data-testid="chart-filter-bar"
      className="mb-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground"
    >
      <span className="font-medium">{strings.filters}:</span>
      {fields.map((field) => {
        const current = filterFor(field);
        return (
          <span key={field} className="relative">
            <button
              type="button"
              aria-label={`Filter chart by ${field}`}
              disabled={readOnly}
              className="inline-flex items-center gap-1 rounded border border-border bg-card px-2 py-0.5 hover:bg-accent disabled:opacity-50"
              onClick={() => setOpen(open === field ? null : field)}
            >
              <Filter className="h-3 w-3" aria-hidden="true" />
              {field}
              {current && current.members.length > 0 && ` (${current.members.length})`}
            </button>
            {open === field && (
              <MemberFilterPopover
                field={field}
                label={field}
                rows={rows}
                strings={strings}
                {...(current ? { current } : {})}
                onApply={(members) => apply(field, members)}
                onClose={() => setOpen(null)}
              />
            )}
          </span>
        );
      })}
      {config.filters.length > 0 && (
        <span className="truncate" data-testid="chart-filter-summary">
          {config.filters.map(describeFilter).join(" · ")}
        </span>
      )}
    </div>
  );
}
