import { useMemo, useState } from "react";
import { uniqueMembers } from "../filters";
import { MEMBER_LIST_LIMIT } from "../constants";
import type { PivotStrings } from "../locales";
import type { FilterDef, PivotRow } from "../types";

export interface MemberFilterPopoverProps {
  field: string;
  label: string;
  rows: PivotRow[];
  strings: PivotStrings;
  current?: Extract<FilterDef, { kind: "values" }>;
  onApply: (members: string[]) => void;
  onClose: () => void;
}

/** Flexmonster's member checklist: search, select all, tick the values to keep. */
export function MemberFilterPopover({
  field,
  label,
  rows,
  strings,
  current,
  onApply,
  onClose,
}: MemberFilterPopoverProps) {
  const all = useMemo(() => uniqueMembers(rows, field).slice(0, MEMBER_LIST_LIMIT), [rows, field]);
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<string[]>(current?.members.length ? current.members : all);

  const shown = all.filter((m) => m.toLowerCase().includes(query.toLowerCase()));
  const allChecked = checked.length === all.length;

  return (
    <div
      role="dialog"
      aria-label={`Filter ${label}`}
      data-testid={`member-filter-${field}`}
      className="absolute z-30 mt-1 w-60 rounded-md border border-border bg-popover p-2 shadow-lg"
    >
      <input
        className="w-full rounded border border-border bg-background px-2 py-1 text-xs"
        placeholder={`${strings.search}…`}
        aria-label={`Search ${label} values`}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <label className="mt-2 flex items-center gap-2 text-xs font-medium">
        <input
          type="checkbox"
          checked={allChecked}
          aria-label="Select all"
          onChange={(e) => setChecked(e.target.checked ? all : [])}
        />
        Select all
      </label>
      <ul className="mt-1 max-h-44 space-y-0.5 overflow-y-auto pr-1">
        {shown.map((m) => (
          <li key={m}>
            <label className="flex items-center gap-2 text-xs">
              <input
                type="checkbox"
                checked={checked.includes(m)}
                aria-label={m}
                onChange={(e) =>
                  setChecked((prev) =>
                    e.target.checked ? [...prev, m] : prev.filter((x) => x !== m),
                  )
                }
              />
              <span className="truncate">{m}</span>
            </label>
          </li>
        ))}
      </ul>
      <div className="mt-2 flex justify-end gap-1.5">
        <button
          type="button"
          className="rounded border border-border px-2 py-1 text-xs"
          onClick={onClose}
        >
          {strings.close}
        </button>
        <button
          type="button"
          className="rounded bg-primary px-2 py-1 text-xs text-primary-foreground"
          onClick={() => onApply(allChecked ? [] : checked)}
        >
          OK
        </button>
      </div>
    </div>
  );
}
