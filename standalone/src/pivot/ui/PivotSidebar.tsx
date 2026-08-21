import type { PivotStrings } from "../locales";
import type { FieldDef, PivotConfig, PivotRow } from "../types";
import { FieldListPanel } from "./FieldListPanel";

export interface PivotSidebarProps {
  strings: PivotStrings;
  fields: FieldDef[];
  rows: PivotRow[];
  config: PivotConfig;
  readOnly: boolean;
  onChange: (patch: Partial<PivotConfig>) => void;
}

/**
 * Docked version of the field list (kept for hosts that prefer a permanent
 * panel over a advanced pivot table's popup). Same drag & drop behaviour.
 */
export function PivotSidebar(props: PivotSidebarProps) {
  return (
    <aside className="w-full shrink-0 lg:w-72" aria-label={props.strings.fields}>
      <FieldListPanel {...props} layout="sidebar" />
    </aside>
  );
}
